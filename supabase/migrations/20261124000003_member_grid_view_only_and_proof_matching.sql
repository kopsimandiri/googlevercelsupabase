-- ==============================================================================
-- KOPSIM MANDIRI: NORMALISASI PATH BUKTI TRANSFER & ISOLASI RPC PORTAL ANGGOTA
-- File: 20261124000003_member_grid_view_only_and_proof_matching.sql
-- Tujuan:
--   1. Normalisasi %20 (spasi ter-encode) dan case-insensitive matching pada
--      fungsi RLS Storage `can_access_bukti_object` agar lampiran milik anggota
--      selalu lolos verifikasi Signed URL dengan aman.
--   2. Memperkaya `get_member_profile_self` dengan `transfer_proof_url` dari
--      tabel `member_registrations` agar fallback bukti pendaftaran konsisten
--      setelah reload halaman.
--   3. Memperketat `get_member_portal_transactions` agar user login non-admin
--      selalu terikat pada identitas anggota miliknya sendiri.
-- ==============================================================================

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
      OR (LENGTH(v_member_name) >= 3 AND (
        LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_member_name || '%'
        OR LOWER(COALESCE(t.account_name_legacy, '')) LIKE '%' || v_member_name || '%'
        OR LOWER(COALESCE(t.description, '')) LIKE '%' || v_member_name || '%'
      ))
    )
    AND (
      LOWER(REPLACE(COALESCE(t.bukti_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
      OR LOWER(REPLACE(COALESCE(t.file_url, ''), '%20', ' ')) LIKE '%' || v_clean_obj || '%'
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
      OR (LENGTH(v_member_name) >= 3 AND LOWER(TRIM(COALESCE(mr.full_name, ''))) = v_member_name)
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

-- Memperketat RPC get_member_portal_transactions agar anggota login selalu terkunci ke NRA miliknya
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
     OR (v_no = '' AND LENGTH(v_name) >= 3 AND LOWER(TRIM(COALESCE(m.full_name, ''))) = v_name)
  LIMIT 1;

  IF COALESCE(v_member_full_name, '') <> '' AND (v_name = '' OR (auth.uid() IS NOT NULL AND NOT public.is_director_or_admin())) THEN
    v_name := v_member_full_name;
  END IF;

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
      LENGTH(v_name) >= 3 AND (
        LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_name || '%'
        OR LOWER(COALESCE(t.account_name_legacy, '')) LIKE '%' || v_name || '%'
        OR LOWER(COALESCE(t.description, '')) LIKE '%' || v_name || '%'
      )
    )
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$;

-- Memperkaya get_member_profile_self dengan transfer_proof_url dari member_registrations
CREATE OR REPLACE FUNCTION public.get_member_profile_self(p_identifier TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_clean TEXT := LOWER(TRIM(COALESCE(p_identifier, '')));
  v_m public.members%ROWTYPE;
  v_reg_proof TEXT;
BEGIN
  IF v_clean = '' THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_m
  FROM public.members m
  WHERE LOWER(COALESCE(m.member_no, '')) = v_clean
     OR LOWER(m.id::TEXT) = v_clean
     OR LOWER(COALESCE(m.username, '')) = v_clean
     OR LOWER(TRIM(COALESCE(m.full_name, ''))) = v_clean
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(mr.transfer_proof_url), ''), NULLIF(TRIM(mr.bukti_url), ''), '')
  INTO v_reg_proof
  FROM public.member_registrations mr
  WHERE (COALESCE(v_m.member_no, '') <> '' AND LOWER(COALESCE(mr.member_no, '')) = LOWER(v_m.member_no))
     OR (LENGTH(TRIM(COALESCE(v_m.full_name, ''))) >= 3 AND LOWER(TRIM(COALESCE(mr.full_name, ''))) = LOWER(TRIM(v_m.full_name)))
  ORDER BY mr.submitted_at DESC NULLS LAST
  LIMIT 1;

  RETURN json_build_object(
    'id', v_m.id,
    'member_no', v_m.member_no,
    'registered_at', v_m.registered_at,
    'full_name', v_m.full_name,
    'gender', v_m.gender,
    'province', v_m.province,
    'city', v_m.city,
    'address', v_m.address,
    'occupation', v_m.occupation,
    'username', v_m.username,
    'birth_date', v_m.birth_date,
    'birth_place', v_m.birth_place,
    'nik', v_m.nik,
    'work_area', v_m.work_area,
    'avatar_url', COALESCE(v_m.avatar_url, ''),
    'transfer_proof_url', COALESCE(v_reg_proof, ''),
    'status', v_m.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.can_access_bukti_object(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_portal_transactions(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_profile_self(TEXT) TO anon, authenticated;
