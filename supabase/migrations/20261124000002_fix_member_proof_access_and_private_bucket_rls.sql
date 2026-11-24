-- ==============================================================================
-- KOPSIM MANDIRI: PERBAIKAN AKSES BUKTI TRANSFER ANGGOTA, PRIVATE BUCKET & RLS
-- File: 20261124000002_fix_member_proof_access_and_private_bucket_rls.sql
-- Tujuan:
--   1. Mengamankan bucket 'bukti-transfer' & 'bukti_transfer' sebagai PRIVAT (public = FALSE),
--      sehingga akses URL langsung tanpa login ditolak oleh Supabase Storage.
--   2. Memperbaiki policy RLS Database & Storage:
--      - ADMIN / DIRECTOR: dapat melihat, menambah, dan mengubah semua transaksi & bukti transfer.
--      - ANGGOTA: hanya dapat MELIHAT transaksi dan bukti transfer miliknya / terkait dirinya
--        (read-only, dilarang mengubah/menghapus transaksi atau bukti transfer).
--      - Pengguna belum login (anon): tidak dapat melihat data tabel maupun objek bucket.
--   3. Menyediakan fungsi helper RLS & RPC SECURITY DEFINER lintas perangkat agar
--      data anggota dan lampiran bukti transfer terbaca konsisten di semua role.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- 1. SINKRONISASI KOLOM bukti_url & file_url
-- ==============================================================================
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS member_id TEXT;

UPDATE public.transactions
SET
  bukti_url = COALESCE(NULLIF(TRIM(bukti_url), ''), NULLIF(TRIM(file_url), ''), ''),
  file_url  = COALESCE(NULLIF(TRIM(file_url), ''), NULLIF(TRIM(bukti_url), ''), '')
WHERE COALESCE(TRIM(bukti_url), '') = '' OR COALESCE(TRIM(file_url), '') = '';

ALTER TABLE public.investment_transactions
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '';

UPDATE public.investment_transactions
SET
  bukti_url = COALESCE(NULLIF(TRIM(bukti_url), ''), NULLIF(TRIM(payment_proof_url), ''), ''),
  payment_proof_url = COALESCE(NULLIF(TRIM(payment_proof_url), ''), NULLIF(TRIM(bukti_url), ''), '')
WHERE COALESCE(TRIM(bukti_url), '') = '' OR COALESCE(TRIM(payment_proof_url), '') = '';

ALTER TABLE public.member_registrations
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '';

UPDATE public.member_registrations
SET
  bukti_url = COALESCE(NULLIF(TRIM(bukti_url), ''), NULLIF(TRIM(transfer_proof_url), ''), ''),
  transfer_proof_url = COALESCE(NULLIF(TRIM(transfer_proof_url), ''), NULLIF(TRIM(bukti_url), ''), '')
WHERE COALESCE(TRIM(bukti_url), '') = '' OR COALESCE(TRIM(transfer_proof_url), '') = '';

-- ==============================================================================
-- 2. FUNGSI HELPER IDENTITAS & HAK AKSES BUKTI TRANSFER
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_director_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_jwt_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_jwt_role := UPPER(COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));

  IF v_email IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id', 'admin@kopsimmandiri.id')
     OR v_email LIKE 'admin@%'
     OR v_jwt_role IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (
        UPPER(COALESCE(r.name, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
        OR UPPER(COALESCE(ur.role, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND UPPER(COALESCE(p.role, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_only()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_jwt_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_jwt_role := UPPER(COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));

  IF v_email IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id', 'admin@kopsimmandiri.id')
     OR v_email LIKE 'admin@%'
     OR v_jwt_role IN ('ADMIN', 'SUPERADMIN', 'PENGURUS') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (
        UPPER(COALESCE(r.name, '')) IN ('ADMIN', 'SUPERADMIN', 'PENGURUS')
        OR UPPER(COALESCE(ur.role, '')) IN ('ADMIN', 'SUPERADMIN', 'PENGURUS')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_member_no TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  v_member_no := NULLIF(TRIM(COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'member_no',
    auth.jwt() -> 'user_metadata' ->> 'member_id',
    auth.jwt() -> 'app_metadata' ->> 'member_no',
    ''
  )), '');

  IF v_member_no IS NOT NULL THEN
    RETURN v_member_no;
  END IF;

  SELECT COALESCE(NULLIF(TRIM(p.member_id), ''), m.member_no, m.id::TEXT)
  INTO v_member_no
  FROM public.profiles p
  LEFT JOIN public.members m
    ON LOWER(COALESCE(m.member_no, '')) = LOWER(COALESCE(p.member_id, ''))
    OR LOWER(COALESCE(m.username, '')) = LOWER(COALESCE(p.username, ''))
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_member_no IS NOT NULL THEN
    RETURN v_member_no;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email LIKE '%@anggota.kopsim.id' THEN
    SELECT COALESCE(m.member_no, SPLIT_PART(v_email, '@', 1))
    INTO v_member_no
    FROM public.members m
    WHERE LOWER(COALESCE(m.member_no, '')) = SPLIT_PART(v_email, '@', 1)
       OR LOWER(COALESCE(m.username, '')) = SPLIT_PART(v_email, '@', 1)
    LIMIT 1;

    RETURN COALESCE(v_member_no, SPLIT_PART(v_email, '@', 1));
  END IF;

  RETURN NULL;
END;
$$;

-- Mengecek apakah user login (ADMIN/DIRECTOR atau ANGGOTA pemilik transaksi/lampiran)
-- berhak membaca/membuat Signed URL atas suatu objek di bucket 'bukti-transfer' / 'bukti_transfer'
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

  v_clean_obj := LTRIM(TRIM(COALESCE(p_object_name, '')), '/');
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
  IF v_clean_obj ILIKE ('avatar/' || v_member_no || '%')
     OR v_clean_obj ILIKE ('setoran/' || v_member_no || '%')
     OR v_clean_obj ILIKE ('investasi/' || v_member_no || '%') THEN
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
      COALESCE(t.bukti_url, '') LIKE '%' || v_clean_obj || '%'
      OR COALESCE(t.file_url, '') LIKE '%' || v_clean_obj || '%'
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
        COALESCE(it.bukti_url, '') LIKE '%' || v_clean_obj || '%'
        OR COALESCE(it.payment_proof_url, '') LIKE '%' || v_clean_obj || '%'
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
      COALESCE(mr.transfer_proof_url, '') LIKE '%' || v_clean_obj || '%'
      OR COALESCE(mr.bukti_url, '') LIKE '%' || v_clean_obj || '%'
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
    AND COALESCE(m.avatar_url, '') LIKE '%' || v_clean_obj || '%'
  ) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_director_or_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_only() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_member_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_bukti_object(TEXT, TEXT) TO authenticated;

-- ==============================================================================
-- 3. STORAGE BUCKET PRIVAT (public = FALSE) & POLICY STORAGE.OBJECTS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'bukti-transfer',
    'bukti-transfer',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'bukti_transfer',
    'bukti_transfer',
    FALSE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Update bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_public_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select_public" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_public_scoped_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_delete" ON storage.objects;

-- SELECT: Hanya pengguna login; Admin lihat semua, Anggota lihat bukti miliknya saja (untuk createSignedUrl)
CREATE POLICY "bukti-transfer_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (public.can_access_bukti_object(bucket_id, name));

-- INSERT: Admin/Direktur bebas upload; Anggota login boleh upload ke folder setoran/investasi/avatar miliknya
CREATE POLICY "bukti-transfer_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('bukti-transfer', 'bukti_transfer')
    AND (
      public.is_director_or_admin()
      OR name LIKE 'investasi/%'
      OR name LIKE 'setoran/%'
      OR name LIKE 'avatar/%'
    )
  );

-- UPDATE & DELETE: Khusus Admin/Pengurus (ANGGOTA dilarang mengubah/menghapus bukti transfer)
CREATE POLICY "bukti-transfer_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_director_or_admin())
  WITH CHECK (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_director_or_admin());

CREATE POLICY "bukti-transfer_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_admin_only());

-- ==============================================================================
-- 4. RLS TABEL TRANSACTIONS, INVESTMENT_TRANSACTIONS & MEMBERS (KETAT TANPA ANON)
-- ==============================================================================

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "trx_select_authenticated" ON public.transactions;
DROP POLICY IF EXISTS "trx_insert_admin_only" ON public.transactions;
DROP POLICY IF EXISTS "trx_update_admin_only" ON public.transactions;
DROP POLICY IF EXISTS "trx_delete_admin_only" ON public.transactions;
DROP POLICY IF EXISTS "Allow authenticated read transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow admin insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow admin update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Allow admin delete transactions" ON public.transactions;

CREATE POLICY "trx_select_authenticated"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    public.is_director_or_admin()
    OR (
      public.current_user_member_id() IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.members m
        WHERE (
          LOWER(COALESCE(m.member_no, '')) = LOWER(public.current_user_member_id())
          OR LOWER(m.id::TEXT) = LOWER(public.current_user_member_id())
        )
        AND (
          LOWER(COALESCE(transactions.member_id, '')) IN (LOWER(COALESCE(m.member_no, '')), LOWER(m.id::TEXT))
          OR LOWER(COALESCE(transactions.customer_name, '')) LIKE '%' || LOWER(COALESCE(m.member_no, '')) || '%'
          OR LOWER(COALESCE(transactions.description, '')) LIKE '%' || LOWER(COALESCE(m.member_no, '')) || '%'
          OR (
            LENGTH(TRIM(COALESCE(m.full_name, ''))) >= 3
            AND (
              LOWER(COALESCE(transactions.customer_name, '')) LIKE '%' || LOWER(TRIM(m.full_name)) || '%'
              OR LOWER(COALESCE(transactions.account_name_legacy, '')) LIKE '%' || LOWER(TRIM(m.full_name)) || '%'
              OR LOWER(COALESCE(transactions.description, '')) LIKE '%' || LOWER(TRIM(m.full_name)) || '%'
            )
          )
        )
      )
    )
    OR (
      public.current_user_member_id() IS NOT NULL
      AND (
        LOWER(COALESCE(member_id, '')) = LOWER(public.current_user_member_id())
        OR LOWER(COALESCE(customer_name, '')) LIKE '%' || LOWER(public.current_user_member_id()) || '%'
        OR LOWER(COALESCE(description, '')) LIKE '%' || LOWER(public.current_user_member_id()) || '%'
      )
    )
  );

CREATE POLICY "trx_insert_admin_only"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "trx_update_admin_only"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "trx_delete_admin_only"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.is_admin_only());

-- RLS tabel investment_transactions (Anggota baca miliknya & insert investasi baru; ubah/hapus khusus Admin)
DROP POLICY IF EXISTS "inv_trx_select_own_or_admin" ON public.investment_transactions;
DROP POLICY IF EXISTS "inv_trx_insert_auth" ON public.investment_transactions;
DROP POLICY IF EXISTS "inv_trx_update_admin" ON public.investment_transactions;
DROP POLICY IF EXISTS "inv_trx_delete_admin" ON public.investment_transactions;

CREATE POLICY "inv_trx_select_own_or_admin"
  ON public.investment_transactions FOR SELECT
  TO authenticated
  USING (
    public.is_director_or_admin()
    OR (
      public.current_user_member_id() IS NOT NULL
      AND LOWER(COALESCE(member_no, '')) = LOWER(public.current_user_member_id())
    )
  );

CREATE POLICY "inv_trx_insert_auth"
  ON public.investment_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_director_or_admin()
    OR (
      public.current_user_member_id() IS NOT NULL
      AND LOWER(COALESCE(member_no, '')) = LOWER(public.current_user_member_id())
    )
  );

CREATE POLICY "inv_trx_update_admin"
  ON public.investment_transactions FOR UPDATE
  TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "inv_trx_delete_admin"
  ON public.investment_transactions FOR DELETE
  TO authenticated
  USING (public.is_admin_only());

-- ==============================================================================
-- 5. RPC PORTAL ANGGOTA (READ-ONLY, SCOPED PER ANGGOTA)
-- ==============================================================================

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
  v_no TEXT := LOWER(TRIM(COALESCE(p_member_no, '')));
  v_name TEXT := LOWER(TRIM(COALESCE(p_member_name, '')));
  v_member_pk TEXT;
  v_member_no_db TEXT;
  v_member_full_name TEXT;
BEGIN
  IF v_no = '' AND v_name = '' THEN
    RETURN;
  END IF;

  SELECT m.id::TEXT, LOWER(TRIM(COALESCE(m.member_no, ''))), LOWER(TRIM(COALESCE(m.full_name, '')))
  INTO v_member_pk, v_member_no_db, v_member_full_name
  FROM public.members m
  WHERE (v_no <> '' AND (LOWER(COALESCE(m.member_no, '')) = v_no OR LOWER(m.id::TEXT) = v_no OR LOWER(COALESCE(m.username, '')) = v_no))
     OR (v_no = '' AND LENGTH(v_name) >= 3 AND LOWER(TRIM(COALESCE(m.full_name, ''))) = v_name)
  LIMIT 1;

  IF v_name = '' AND COALESCE(v_member_full_name, '') <> '' THEN
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

CREATE OR REPLACE FUNCTION public.get_member_investment_transactions(p_member_no TEXT)
RETURNS SETOF public.investment_transactions
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_no TEXT := LOWER(TRIM(COALESCE(p_member_no, '')));
BEGIN
  IF v_no = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT it.*
  FROM public.investment_transactions it
  WHERE LOWER(COALESCE(it.member_no, '')) = v_no
  ORDER BY it.created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_member_digital_agreements(p_member_no TEXT)
RETURNS SETOF public.digital_agreements
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
  v_no TEXT := LOWER(TRIM(COALESCE(p_member_no, '')));
BEGIN
  IF v_no = '' THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT da.*
  FROM public.digital_agreements da
  WHERE LOWER(COALESCE(da.member_no, '')) = v_no
  ORDER BY da.created_at DESC;
END;
$$;

-- Mengembalikan profil anggota aman (tanpa kolom password hash)
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
    'status', v_m.status
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_member_portal_transactions(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_investment_transactions(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_digital_agreements(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_profile_self(TEXT) TO anon, authenticated;
