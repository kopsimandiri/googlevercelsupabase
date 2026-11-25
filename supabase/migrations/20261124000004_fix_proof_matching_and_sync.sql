-- ==============================================================================
-- KOPSIM MANDIRI: NORMALISASI NAMA & SINKRONISASI PATH BUKTI TRANSFER
-- File: 20261124000004_fix_proof_matching_and_sync.sql
-- Tujuan:
--   1. Menyediakan `public.normalize_person_name` agar perbedaan tanda baca/gelar
--      (mis. "Alvin Azhar, S.E., M.M." vs "ALVIN AZHAR SE,MM") tetap cocok akurat.
--   2. Memperbarui `public.can_access_bukti_object` agar selain mencocokkan kolom
--      `bukti_url`/`file_url`, juga mencocokkan nama berkas berbasis `transaction_no`
--      pada transaksi yang sah milik anggota tersebut.
--   3. Memastikan `file_url` dan `bukti_url` untuk daftar transaksi terverifikasi
--      (termasuk T260220001) tersinkron penuh pada tabel `public.transactions`.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.normalize_person_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REPLACE(LOWER(COALESCE(p_name, '')), '.', ''),
        '[,;:/\\-]+', ' ', 'g'
      ),
      '\s+', ' ', 'g'
    )
  );
$$;

-- Sinkronisasi file_url & bukti_url untuk transaksi yang sudah memiliki berkas di bucket 'bukti_transfer'
WITH known_proofs (trx_prefix, storage_url) AS (
  VALUES
    ('T251229001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229001-jnpf6q.webp'),
    ('T251229002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229002-1cpdp8.webp'),
    ('T251229003', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229003-7nucag.webp'),
    ('T251229004', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229004-9j1797.webp'),
    ('T260202001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260202001-80nnro.webp'),
    ('T260220001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260220001-b97crn.webp'),
    ('T260318001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260318001-z6lluv.jpg'),
    ('T260320001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260320001-ou4pzo.webp'),
    ('T260330005', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330005-vumfjf.webp'),
    ('T260330015', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330015-tgragl.webp'),
    ('T260330016', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330016-1o9y4o.webp'),
    ('T260330017', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330017-mt0mvt.webp'),
    ('T260402001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260402001-lpf5ns.webp'),
    ('T260410001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260410001-at9nrs.webp'),
    ('T260413001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413001-51ezrd.webp'),
    ('T260413002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413002-7n8q5r.webp'),
    ('T260413003', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413003-dvrho5.webp'),
    ('T260413004', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413004-hekedv.webp'),
    ('T260413005', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413005-bqu8c7.webp'),
    ('T260417001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417001-8t4df6.webp'),
    ('T260417002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417002-7yw8js.webp'),
    ('T260421001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260421001-hvubbk.webp')
)
UPDATE public.transactions t
SET
  file_url = COALESCE(NULLIF(TRIM(t.file_url), ''), kp.storage_url),
  bukti_url = COALESCE(NULLIF(TRIM(t.bukti_url), ''), NULLIF(TRIM(t.file_url), ''), kp.storage_url),
  updated_at = NOW()
FROM known_proofs kp
WHERE (
  UPPER(COALESCE(t.transaction_no, '')) = kp.trx_prefix
  OR UPPER(COALESCE(t.transaction_no, '')) LIKE kp.trx_prefix || '-%'
  OR UPPER(t.id::TEXT) = kp.trx_prefix
)
AND (
  COALESCE(TRIM(t.file_url), '') = ''
  OR COALESCE(TRIM(t.bukti_url), '') = ''
  OR t.file_url NOT LIKE '%/storage/v1/object/%'
);

CREATE OR REPLACE FUNCTION public.can_access_bukti_object(p_bucket_id TEXT, p_object_name TEXT)
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
  v_member_name TEXT;
  v_norm_name TEXT;
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

  SELECT m.id::TEXT, m.member_no, m.full_name
  INTO v_member_pk, v_member_no, v_member_name
  FROM public.members m
  WHERE LOWER(COALESCE(m.member_no, '')) = v_member_ref
     OR LOWER(m.id::TEXT) = v_member_ref
     OR LOWER(COALESCE(m.username, '')) = v_member_ref
  LIMIT 1;

  v_member_no := LOWER(TRIM(COALESCE(v_member_no, v_member_ref)));
  v_member_pk := LOWER(TRIM(COALESCE(v_member_pk, '')));
  v_member_name := LOWER(TRIM(COALESCE(v_member_name, '')));
  v_norm_name := public.normalize_person_name(v_member_name);

  -- Izinkan folder pribadi berdasarkan NRA/ID anggota
  IF v_clean_obj LIKE ('avatar/' || v_member_no || '%')
     OR v_clean_obj LIKE ('setoran/' || v_member_no || '%')
     OR v_clean_obj LIKE ('investasi/' || v_member_no || '%') THEN
    RETURN TRUE;
  END IF;

  -- Cocokkan objek dengan transaksi milik anggota pada tabel public.transactions
  IF EXISTS (
    SELECT 1
    FROM public.transactions t
    WHERE (
      LOWER(COALESCE(t.member_id, '')) IN (v_member_no, v_member_pk, v_member_ref)
      OR (v_member_no <> '' AND LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_member_no || '%')
      OR (v_member_no <> '' AND LOWER(COALESCE(t.description, '')) LIKE '%' || v_member_no || '%')
      OR (LENGTH(v_norm_name) >= 3 AND (
        public.normalize_person_name(t.customer_name) LIKE '%' || v_norm_name || '%'
        OR public.normalize_person_name(t.account_name_legacy) LIKE '%' || v_norm_name || '%'
        OR public.normalize_person_name(t.description) LIKE '%' || v_norm_name || '%'
        OR (LENGTH(public.normalize_person_name(t.account_name_legacy)) >= 5
            AND v_norm_name LIKE '%' || public.normalize_person_name(t.account_name_legacy) || '%')
      ))
    )
    AND (
      LOWER(REPLACE(COALESCE(t.bukti_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR LOWER(REPLACE(COALESCE(t.file_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR (
        LENGTH(TRIM(COALESCE(t.transaction_no, ''))) >= 6
        AND (
          v_clean_obj LIKE '%/' || LOWER(TRIM(t.transaction_no)) || '-%'
          OR v_clean_obj LIKE '%/' || LOWER(TRIM(t.transaction_no)) || '.%'
          OR v_clean_obj LIKE LOWER(TRIM(t.transaction_no)) || '-%'
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
    WHERE LOWER(COALESCE(it.member_no, '')) IN (v_member_no, v_member_pk, v_member_ref)
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
      OR (LENGTH(v_norm_name) >= 3 AND public.normalize_person_name(mr.full_name) = v_norm_name)
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
  v_member_pk TEXT;
  v_member_no_db TEXT;
  v_member_full_name TEXT;
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.is_director_or_admin() AND v_session_member <> '' THEN
    v_no := v_session_member;
  END IF;

  IF v_no = '' AND v_name = '' THEN
    RETURN;
  END IF;

  SELECT m.id::TEXT, LOWER(TRIM(COALESCE(m.member_no, ''))), LOWER(TRIM(COALESCE(m.full_name, '')))
  INTO v_member_pk, v_member_no_db, v_member_full_name
  FROM public.members m
  WHERE (v_no <> '' AND (LOWER(COALESCE(m.member_no, '')) = v_no OR LOWER(m.id::TEXT) = v_no OR LOWER(COALESCE(m.username, '')) = v_no))
     OR (v_no = '' AND LENGTH(v_name) >= 3 AND public.normalize_person_name(m.full_name) = public.normalize_person_name(v_name))
  LIMIT 1;

  IF COALESCE(v_member_full_name, '') <> '' AND (v_name = '' OR (auth.uid() IS NOT NULL AND NOT public.is_director_or_admin())) THEN
    v_name := v_member_full_name;
  END IF;

  v_norm_name := public.normalize_person_name(v_name);

  RETURN QUERY
  SELECT t.*
  FROM public.transactions t
  WHERE
    (v_no <> '' AND LOWER(COALESCE(t.member_id, '')) = v_no)
    OR (COALESCE(v_member_no_db, '') <> '' AND LOWER(COALESCE(t.member_id, '')) = v_member_no_db)
    OR (COALESCE(v_member_pk, '') <> '' AND LOWER(COALESCE(t.member_id, '')) = LOWER(v_member_pk))
    OR (v_no <> '' AND LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_no || '%')
    OR (v_no <> '' AND LOWER(COALESCE(t.account_name_legacy, '')) LIKE '%' || v_no || '%')
    OR (v_no <> '' AND LOWER(COALESCE(t.description, '')) LIKE '%' || v_no || '%')
    OR (COALESCE(v_member_no_db, '') <> '' AND (
      LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_member_no_db || '%'
      OR LOWER(COALESCE(t.description, '')) LIKE '%' || v_member_no_db || '%'
    ))
    OR (
      LENGTH(v_norm_name) >= 3 AND (
        public.normalize_person_name(t.customer_name) LIKE '%' || v_norm_name || '%'
        OR public.normalize_person_name(t.account_name_legacy) LIKE '%' || v_norm_name || '%'
        OR public.normalize_person_name(t.description) LIKE '%' || v_norm_name || '%'
        OR (LENGTH(public.normalize_person_name(t.account_name_legacy)) >= 5
            AND v_norm_name LIKE '%' || public.normalize_person_name(t.account_name_legacy) || '%')
      )
    )
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.normalize_person_name(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_bukti_object(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_portal_transactions(TEXT, TEXT) TO anon, authenticated;
