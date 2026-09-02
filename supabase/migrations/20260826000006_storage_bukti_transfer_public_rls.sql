-- ==============================================================================
-- KOPSIM MANDIRI: BUKTI_TRANSFER PUBLIC STORAGE BUCKET & CLEAN RLS POLICIES
-- Migration: 20260826000006_storage_bukti_transfer_public_rls.sql
-- Description: Configures PUBLIC bucket 'bukti_transfer' and strictly restricts
--              upload (INSERT) to ADMIN & DIRECTOR, and UPDATE/DELETE to ADMIN.
--              SELECT is open to PUBLIC for direct proof preview rendering.
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

-- ==============================================================================
-- 3. DROP ALL RESIDUAL & EXPERIMENTAL POLICIES ON storage.objects FOR bukti_transfer
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
-- 4. CREATE 4 FINAL CLEAN POLICIES (ONE PER COMMAND)
-- ==============================================================================

-- POLICY 1: SELECT (Public Read)
CREATE POLICY "bukti_transfer_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bukti_transfer');

-- POLICY 2: INSERT (Authorized: ADMIN & DIRECTOR)
CREATE POLICY "bukti_transfer_insert_authorized"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bukti_transfer'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name IN ('ADMIN', 'DIRECTOR')
    )
  );

-- POLICY 3: UPDATE (ADMIN Only)
CREATE POLICY "bukti_transfer_update_admin"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'ADMIN'
    )
  );

-- POLICY 4: DELETE (ADMIN Only)
CREATE POLICY "bukti_transfer_delete_admin"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer'
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid() AND r.name = 'ADMIN'
    )
  );
