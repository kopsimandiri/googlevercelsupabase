-- ============================================================================
-- MIGRATION: 20261125000008_fix_member_transactions_title_and_id_matching.sql
-- Tujuan:
--   Memperbaiki cakupan lookup riwayat transaksi pada Portal Anggota agar
--   seluruh baris transaksi sah milik anggota (seperti `imamghozali` dan
--   `alvinazhar`) tampil lengkap tanpa kebocoran antar-anggota:
--   1. Normalisasi gelar akademik/keagamaan Indonesia ("Alvin Azhar, S.E., M.M."
--      <-> "ALVIN AZHAR SE,MM" / "ALVIN AZHAR SE.MM" / "Alvin Azhar";
--      "Prof. Dr. H. Imam Ghozali" <-> "IMAM GHOZALI").
--   2. Dukungan `members.username` pada pencocokan `transactions.member_id` dan
--      kolom teks legacy.
--   3. Penanganan `transactions.member_id` berisi placeholder generik
--      ('MEMBER', 'ALL', 'NON-ANGGOTA', '-', '0') agar tetap dicocokkan melalui
--      NRA/nama dengan batas kata ketat (tidak ditolak sebagai anggota lain).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.normalize_person_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          REGEXP_REPLACE(
            REGEXP_REPLACE(
              REGEXP_REPLACE(
                REGEXP_REPLACE(
                  LOWER(COALESCE(p_name, '')),
                  '[.,;:/\\-]+', ' ', 'g'
                ),
                '\s+', ' ', 'g'
              ),
              '\ms\s+(e|h|t|p|d|pd|ag|ip|km|kom|sos|psi|si|tp|pt|pi|kep|ked|hut|kh)\M', 's\1', 'g'
            ),
            '\mm\s+(m|h|pd|si|ag|kom|ak|sc|ba|kes|hum|kn|ed|psi|kep|ked)\M', 'm\1', 'g'
          ),
          '\ma\s+md\M', 'amd', 'g'
        ),
        '\mph\s+d\M', 'phd', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.extract_core_person_name(p_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_norm TEXT := public.normalize_person_name(p_name);
  v_core TEXT;
BEGIN
  IF v_norm = '' THEN
    RETURN '';
  END IF;

  v_core := v_norm;

  WHILE v_core ~ '^(h|hj|dr|drs|dra|ir|prof|kh|ust|ustadz|ustadzah|bpk|bp|ibu)\s+\S' LOOP
    v_core := TRIM(REGEXP_REPLACE(v_core, '^(h|hj|dr|drs|dra|ir|prof|kh|ust|ustadz|ustadzah|bpk|bp|ibu)\s+', ''));
  END LOOP;

  WHILE v_core ~ '\S\s+(se|mm|semm|sh|mh|msi|mpd|spd|sag|skom|mkom|st|mt|ssos|sip|skm|mak|ma|msc|phd|imd|amd|ak|akt|ca|mba|ssi|stp|spt|apt|sp|spi|shut|skep|mkep|mked|sked|skh|drh|spsi|mpsi|llm|bsc|ba|med|lc)$' LOOP
    v_core := TRIM(REGEXP_REPLACE(v_core, '\s+(se|mm|semm|sh|mh|msi|mpd|spd|sag|skom|mkom|st|mt|ssos|sip|skm|mak|ma|msc|phd|imd|amd|ak|akt|ca|mba|ssi|stp|spt|apt|sp|spi|shut|skep|mkep|mked|sked|skh|drh|spsi|mpsi|llm|bsc|ba|med|lc)$', ''));
  END LOOP;

  IF COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(v_core, ' '), 1), 0) >= 2 OR LENGTH(v_core) >= 6 THEN
    RETURN v_core;
  END IF;

  RETURN v_norm;
END;
$$;

CREATE OR REPLACE FUNCTION public.is_placeholder_member_id(p_val TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(TRIM(COALESCE(p_val, ''))) IN (
    '', 'member', 'all', 'non-anggota', 'non anggota', 'umum', 'null', 'none', '-', '0', 'na', 'n/a'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_bukti_object(
  p_bucket_id TEXT,
  p_object_name TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_member_ref TEXT;
  v_member_pk TEXT;
  v_member_no TEXT;
  v_member_username TEXT;
  v_member_name TEXT;
  v_norm_name TEXT;
  v_core_name TEXT;
  v_escaped_name TEXT;
  v_escaped_core TEXT;
  v_escaped_no TEXT;
  v_escaped_username TEXT;
  v_clean_obj TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_bucket_id NOT IN ('bukti-transfer', 'bukti_transfer') THEN
    RETURN FALSE;
  END IF;

  IF public.is_director_or_admin() THEN
    RETURN TRUE;
  END IF;

  v_clean_obj := LOWER(REPLACE(LTRIM(TRIM(COALESCE(p_object_name, '')), '/'), '%20', ' '));
  IF v_clean_obj = '' THEN
    RETURN FALSE;
  END IF;

  v_member_ref := LOWER(TRIM(COALESCE(public.current_user_member_id(), '')));
  IF v_member_ref = '' THEN
    RETURN FALSE;
  END IF;

  SELECT m.id::TEXT, m.member_no, m.username, m.full_name
  INTO v_member_pk, v_member_no, v_member_username, v_member_name
  FROM public.members m
  WHERE LOWER(COALESCE(m.member_no, '')) = v_member_ref
     OR LOWER(m.id::TEXT) = v_member_ref
     OR LOWER(COALESCE(m.username, '')) = v_member_ref
  LIMIT 1;

  v_member_no := LOWER(TRIM(COALESCE(v_member_no, v_member_ref)));
  v_member_pk := LOWER(TRIM(COALESCE(v_member_pk, '')));
  v_member_username := LOWER(TRIM(COALESCE(v_member_username, '')));
  v_member_name := LOWER(TRIM(COALESCE(v_member_name, '')));
  v_norm_name := public.normalize_person_name(v_member_name);
  v_core_name := public.extract_core_person_name(v_member_name);
  v_escaped_name := public.escape_regex_literal(v_norm_name);
  v_escaped_core := public.escape_regex_literal(v_core_name);
  v_escaped_no := public.escape_regex_literal(v_member_no);
  v_escaped_username := public.escape_regex_literal(v_member_username);

  -- Izinkan folder pribadi berdasarkan NRA/ID anggota
  IF v_clean_obj LIKE ('avatar/' || v_member_no || '%')
     OR v_clean_obj LIKE ('setoran/' || v_member_no || '%')
     OR v_clean_obj LIKE ('investasi/' || v_member_no || '%') THEN
    RETURN TRUE;
  END IF;

  -- Cocokkan objek dengan transaksi milik anggota pada tabel public.transactions secara ketat
  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE (
      -- Kasus 1: member_id terisi nyata (bukan placeholder) -> WAJIB cocok dengan salah satu alias ID anggota
      (
        NOT public.is_placeholder_member_id(t.member_id)
        AND LOWER(TRIM(t.member_id)) IN (
          v_member_no,
          v_member_pk,
          v_member_ref,
          NULLIF(v_member_username, '')
        )
      )
      OR (
        -- Kasus 2: baris legacy (member_id kosong / placeholder) -> cocokkan NRA/username/nama inti
        public.is_placeholder_member_id(t.member_id)
        AND (
          (v_member_no <> '' AND LENGTH(v_member_no) >= 3 AND (
            LOWER(COALESCE(t.customer_name, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
            OR LOWER(COALESCE(t.account_name_legacy, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
            OR LOWER(COALESCE(t.description, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
          ))
          OR (v_member_username <> '' AND LENGTH(v_member_username) >= 4 AND (
            LOWER(COALESCE(t.customer_name, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
            OR LOWER(COALESCE(t.account_name_legacy, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
            OR LOWER(COALESCE(t.description, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
          ))
          OR (
            LENGTH(v_norm_name) >= 4 AND (
              public.normalize_person_name(t.customer_name) = v_norm_name
              OR public.extract_core_person_name(t.customer_name) = v_core_name
              OR (LENGTH(v_norm_name) >= 5 AND public.normalize_person_name(t.customer_name) ~ ('(^| )' || v_escaped_name || '( |$)'))
              OR (LENGTH(v_core_name) >= 5 AND public.normalize_person_name(t.customer_name) ~ ('(^| )' || v_escaped_core || '( |$)'))
              OR (
                public.normalize_person_name(t.account_name_legacy) NOT IN (
                  'dana project', 'kas umum koperasi', 'kas umum koperasi non anggota',
                  'bank bsi', 'bank mandiri', 'kas besar bank', 'kas besar',
                  'kas tunai kantor pusat', 'kas tunai', 'koperasi pusat', 'pusat jakarta'
                )
                AND (
                  public.normalize_person_name(t.account_name_legacy) = v_norm_name
                  OR public.extract_core_person_name(t.account_name_legacy) = v_core_name
                  OR (LENGTH(v_norm_name) >= 5 AND public.normalize_person_name(t.account_name_legacy) ~ ('(^| )' || v_escaped_name || '( |$)'))
                  OR (LENGTH(v_core_name) >= 5 AND public.normalize_person_name(t.account_name_legacy) ~ ('(^| )' || v_escaped_core || '( |$)'))
                  OR (
                    LENGTH(public.extract_core_person_name(t.account_name_legacy)) >= 5
                    AND (
                      COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(public.extract_core_person_name(t.account_name_legacy), ' '), 1), 0) >= 2
                      OR LENGTH(public.extract_core_person_name(t.account_name_legacy)) >= 6
                    )
                    AND v_core_name ~ ('(^| )' || public.escape_regex_literal(public.extract_core_person_name(t.account_name_legacy)) || '( |$)')
                  )
                )
              )
              OR (
                (LENGTH(v_norm_name) >= 6 OR COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(v_norm_name, ' '), 1), 0) >= 2)
                AND public.normalize_person_name(t.description) ~ ('(^| )' || v_escaped_name || '( |$)')
              )
              OR (
                (LENGTH(v_core_name) >= 6 OR COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(v_core_name, ' '), 1), 0) >= 2)
                AND public.normalize_person_name(t.description) ~ ('(^| )' || v_escaped_core || '( |$)')
              )
            )
          )
        )
      )
    )
    AND (
      LOWER(REPLACE(COALESCE(t.bukti_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR LOWER(REPLACE(COALESCE(t.file_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR (
        LENGTH(TRIM(COALESCE(t.transaction_no, ''))) >= 6
        AND (
          v_clean_obj LIKE '%/' || LOWER(TRIM(t.transaction_no)) || '-%'
          OR v_clean_obj LIKE '%/' || LOWER(TRIM(t.transaction_no)) || '_%'
          OR v_clean_obj LIKE '%/' || LOWER(TRIM(t.transaction_no)) || '.%'
          OR v_clean_obj LIKE LOWER(TRIM(t.transaction_no)) || '-%'
          OR v_clean_obj LIKE LOWER(TRIM(t.transaction_no)) || '_%'
          OR v_clean_obj LIKE LOWER(TRIM(t.transaction_no)) || '.%'
        )
      )
    )
  ) THEN
    RETURN TRUE;
  END IF;

  -- Cocokkan objek dengan transaksi investasi milik anggota
  IF EXISTS (
    SELECT 1
    FROM public.investment_transactions it
    WHERE LOWER(COALESCE(it.member_no, '')) IN (v_member_no, v_member_pk, v_member_ref, NULLIF(v_member_username, ''))
      AND (
        LOWER(REPLACE(COALESCE(it.bukti_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
        OR LOWER(REPLACE(COALESCE(it.payment_proof_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      )
  ) THEN
    RETURN TRUE;
  END IF;

  -- Cocokkan objek dengan slip pendaftaran atau avatar milik anggota
  IF EXISTS (
    SELECT 1
    FROM public.member_registrations mr
    WHERE (
      LOWER(COALESCE(mr.member_no, '')) IN (v_member_no, v_member_ref)
      OR (LENGTH(v_norm_name) >= 4 AND (
        public.normalize_person_name(mr.full_name) = v_norm_name
        OR public.extract_core_person_name(mr.full_name) = v_core_name
      ))
    )
    AND (
      LOWER(REPLACE(COALESCE(mr.transfer_proof_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR LOWER(REPLACE(COALESCE(mr.bukti_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
    )
  ) THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.members m
    WHERE (
      LOWER(COALESCE(m.member_no, '')) = v_member_no
      OR (v_member_pk <> '' AND LOWER(m.id::TEXT) = v_member_pk)
    )
    AND LOWER(REPLACE(COALESCE(m.avatar_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_portal_transactions(
  p_member_no TEXT,
  p_member_name TEXT DEFAULT ''
)
RETURNS SETOF public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_session_member TEXT := LOWER(TRIM(COALESCE(public.current_user_member_id(), '')));
  v_no TEXT := LOWER(TRIM(COALESCE(p_member_no, '')));
  v_name TEXT := LOWER(TRIM(COALESCE(p_member_name, '')));
  v_norm_name TEXT;
  v_core_name TEXT;
  v_escaped_name TEXT;
  v_escaped_core TEXT;
  v_escaped_no TEXT;
  v_escaped_no_db TEXT;
  v_escaped_username TEXT;
  v_member_pk TEXT;
  v_member_no_db TEXT;
  v_member_username TEXT;
  v_member_full_name TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_director_or_admin() AND v_session_member <> '' THEN
    v_no := v_session_member;
  END IF;

  IF v_no = '' AND v_name = '' THEN
    RETURN;
  END IF;

  SELECT
    m.id::TEXT,
    LOWER(TRIM(COALESCE(m.member_no, ''))),
    LOWER(TRIM(COALESCE(m.username, ''))),
    LOWER(TRIM(COALESCE(m.full_name, '')))
  INTO v_member_pk, v_member_no_db, v_member_username, v_member_full_name
  FROM public.members m
  WHERE (v_no <> '' AND (LOWER(COALESCE(m.member_no, '')) = v_no OR LOWER(m.id::TEXT) = v_no OR LOWER(COALESCE(m.username, '')) = v_no))
     OR (v_no = '' AND LENGTH(v_name) >= 4 AND (
          public.normalize_person_name(m.full_name) = public.normalize_person_name(v_name)
          OR public.extract_core_person_name(m.full_name) = public.extract_core_person_name(v_name)
        ))
  LIMIT 1;

  IF COALESCE(v_member_full_name, '') <> '' AND (v_name = '' OR (auth.uid() IS NOT NULL AND NOT public.is_director_or_admin())) THEN
    v_name := v_member_full_name;
  END IF;

  v_norm_name := public.normalize_person_name(v_name);
  v_core_name := public.extract_core_person_name(v_name);
  v_escaped_name := public.escape_regex_literal(v_norm_name);
  v_escaped_core := public.escape_regex_literal(v_core_name);
  v_escaped_no := public.escape_regex_literal(v_no);
  v_escaped_no_db := public.escape_regex_literal(COALESCE(v_member_no_db, ''));
  v_escaped_username := public.escape_regex_literal(COALESCE(v_member_username, ''));

  RETURN QUERY
  SELECT t.*
  FROM public.transactions t
  WHERE
    -- Kasus 1: member_id sudah terisi nyata di baris transaksi -> WAJIB milik anggota ini sendiri (NRA / PK / username)
    (
      NOT public.is_placeholder_member_id(t.member_id)
      AND (
        (v_no <> '' AND LOWER(TRIM(t.member_id)) = v_no)
        OR (COALESCE(v_member_no_db, '') <> '' AND LOWER(TRIM(t.member_id)) = v_member_no_db)
        OR (COALESCE(v_member_pk, '') <> '' AND LOWER(TRIM(t.member_id)) = LOWER(v_member_pk))
        OR (COALESCE(v_member_username, '') <> '' AND LOWER(TRIM(t.member_id)) = v_member_username)
      )
    )
    OR (
      -- Kasus 2: baris legacy (member_id masih NULL / kosong / placeholder) -> pencocokan ketat NRA/username/nama & nama inti
      public.is_placeholder_member_id(t.member_id)
      AND (
        (v_no <> '' AND LENGTH(v_no) >= 3 AND (
          LOWER(COALESCE(t.customer_name, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.account_name_legacy, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.description, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no || '([^a-z0-9]|$)')
        ))
        OR (COALESCE(v_member_no_db, '') <> '' AND LENGTH(v_member_no_db) >= 3 AND (
          LOWER(COALESCE(t.customer_name, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no_db || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.account_name_legacy, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no_db || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.description, '')) ~ ('(^|[^a-z0-9])' || v_escaped_no_db || '([^a-z0-9]|$)')
        ))
        OR (COALESCE(v_member_username, '') <> '' AND LENGTH(v_member_username) >= 4 AND (
          LOWER(COALESCE(t.customer_name, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.account_name_legacy, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
          OR LOWER(COALESCE(t.description, '')) ~ ('(^|[^a-z0-9])' || v_escaped_username || '([^a-z0-9]|$)')
        ))
        OR (
          LENGTH(v_norm_name) >= 4 AND (
            public.normalize_person_name(t.customer_name) = v_norm_name
            OR public.extract_core_person_name(t.customer_name) = v_core_name
            OR (LENGTH(v_norm_name) >= 5 AND public.normalize_person_name(t.customer_name) ~ ('(^| )' || v_escaped_name || '( |$)'))
            OR (LENGTH(v_core_name) >= 5 AND public.normalize_person_name(t.customer_name) ~ ('(^| )' || v_escaped_core || '( |$)'))
            OR (
              public.normalize_person_name(t.account_name_legacy) NOT IN (
                'dana project', 'kas umum koperasi', 'kas umum koperasi non anggota',
                'bank bsi', 'bank mandiri', 'kas besar bank', 'kas besar',
                'kas tunai kantor pusat', 'kas tunai', 'koperasi pusat', 'pusat jakarta'
              )
              AND (
                public.normalize_person_name(t.account_name_legacy) = v_norm_name
                OR public.extract_core_person_name(t.account_name_legacy) = v_core_name
                OR (LENGTH(v_norm_name) >= 5 AND public.normalize_person_name(t.account_name_legacy) ~ ('(^| )' || v_escaped_name || '( |$)'))
                OR (LENGTH(v_core_name) >= 5 AND public.normalize_person_name(t.account_name_legacy) ~ ('(^| )' || v_escaped_core || '( |$)'))
                OR (
                  LENGTH(public.extract_core_person_name(t.account_name_legacy)) >= 5
                  AND (
                    COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(public.extract_core_person_name(t.account_name_legacy), ' '), 1), 0) >= 2
                    OR LENGTH(public.extract_core_person_name(t.account_name_legacy)) >= 6
                  )
                  AND v_core_name ~ ('(^| )' || public.escape_regex_literal(public.extract_core_person_name(t.account_name_legacy)) || '( |$)')
                )
              )
            )
            OR (
              (LENGTH(v_norm_name) >= 6 OR COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(v_norm_name, ' '), 1), 0) >= 2)
              AND public.normalize_person_name(t.description) ~ ('(^| )' || v_escaped_name || '( |$)')
            )
            OR (
              (LENGTH(v_core_name) >= 6 OR COALESCE(ARRAY_LENGTH(STRING_TO_ARRAY(v_core_name, ' '), 1), 0) >= 2)
              AND public.normalize_person_name(t.description) ~ ('(^| )' || v_escaped_core || '( |$)')
            )
          )
        )
      )
    )
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_person_name(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.extract_core_person_name(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_placeholder_member_id(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_bukti_object(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_portal_transactions(TEXT, TEXT) TO anon, authenticated;
