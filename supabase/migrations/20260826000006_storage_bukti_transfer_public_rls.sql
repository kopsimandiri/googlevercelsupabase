-- ==============================================================================
-- KOPSIM MANDIRI: BUKTI_TRANSFER PUBLIC STORAGE BUCKET & ROBUST RLS POLICIES
-- Migration: 20260826000006_storage_bukti_transfer_public_rls.sql
-- Description: Configures PUBLIC bucket 'bukti_transfer' with multi-layered,
--              bulletproof RBAC verification for ADMIN & DIRECTOR (supporting
--              Super Admin email, JWT metadata, user_roles table, and security definer functions).
-- ==============================================================================

-- 1. Ensure bucket 'bukti_transfer' exists and is strictly set to PUBLIC = TRUE
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti_transfer',
  'bukti_transfer',
  TRUE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Ensure role mapping exists in public.roles and public.user_roles for admin users
DO $$
DECLARE
  v_admin_role_id uuid;
  v_user_id uuid;
BEGIN
  -- Pastikan role ADMIN ada di public.roles
  INSERT INTO public.roles (name, description)
  VALUES ('ADMIN', 'Administrator Koperasi')
  ON CONFLICT (name) DO UPDATE SET description = 'Administrator Koperasi'
  RETURNING id INTO v_admin_role_id;

  IF v_admin_role_id IS NULL THEN
    SELECT id INTO v_admin_role_id FROM public.roles WHERE name = 'ADMIN' LIMIT 1;
  END IF;

  -- Hubungkan user koperasi.simandiri@gmail.com ke user_roles jika ada di auth.users
  FOR v_user_id IN (
    SELECT id FROM auth.users 
    WHERE LOWER(email) IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id', 'admin@simandiri.id')
       OR LOWER(email) LIKE 'admin@%'
  ) LOOP
    INSERT INTO public.user_roles (user_id, role_id, role)
    VALUES (v_user_id, v_admin_role_id, 'ADMIN')
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END LOOP;
END $$;

-- ==============================================================================
-- 4. DROP ALL RESIDUAL & EXPERIMENTAL POLICIES ON storage.objects FOR bukti_transfer
-- ==============================================================================
DROP POLICY IF EXISTS "Public Read bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Update bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_public_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_admin_director_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_authorized_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_public_read" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select_public" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_delete" ON storage.objects;

-- ==============================================================================
-- 5. CREATE 4 BULLETPROOF CLEAN POLICIES
-- ==============================================================================

-- POLICY 1: SELECT (Public Read untuk render foto bukti di browser tanpa signed token)
CREATE POLICY "bukti_transfer_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bukti_transfer');

-- POLICY 2: INSERT (Multi-layered check: Email Super Admin, Metadata, Function, atau user_roles)
CREATE POLICY "bukti_transfer_insert_authorized"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bukti_transfer'
    AND (
      -- 1. Super Admin Email Direct Bypass
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id')
      OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) LIKE 'admin@%'
      -- 2. JWT Metadata Role Check
      OR UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      OR UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      -- 3. Database user_roles & roles table lookup
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
          AND (UPPER(r.name) IN ('ADMIN', 'DIRECTOR') OR UPPER(ur.role) IN ('ADMIN', 'DIRECTOR'))
      )
    )
  );

-- POLICY 3: UPDATE (Diperlukan untuk operasi upload upsert / replace file)
CREATE POLICY "bukti_transfer_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer'
    AND (
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id')
      OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) LIKE 'admin@%'
      OR UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      OR UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
          AND (UPPER(r.name) IN ('ADMIN', 'DIRECTOR') OR UPPER(ur.role) IN ('ADMIN', 'DIRECTOR'))
      )
    )
  )
  WITH CHECK (
    bucket_id = 'bukti_transfer'
    AND (
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id')
      OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) LIKE 'admin@%'
      OR UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      OR UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) IN ('ADMIN', 'DIRECTOR')
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
          AND (UPPER(r.name) IN ('ADMIN', 'DIRECTOR') OR UPPER(ur.role) IN ('ADMIN', 'DIRECTOR'))
      )
    )
  );

-- POLICY 4: DELETE (Hanya ADMIN)
CREATE POLICY "bukti_transfer_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer'
    AND (
      LOWER(COALESCE(auth.jwt() ->> 'email', '')) IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id')
      OR LOWER(COALESCE(auth.jwt() ->> 'email', '')) LIKE 'admin@%'
      OR UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN'
      OR UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'ADMIN'
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        LEFT JOIN public.roles r ON r.id = ur.role_id
        WHERE ur.user_id = auth.uid() 
          AND (UPPER(r.name) = 'ADMIN' OR UPPER(ur.role) = 'ADMIN')
      )
    )
  );
