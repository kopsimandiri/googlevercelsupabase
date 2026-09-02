-- ==============================================================================
-- KOPSIM MANDIRI: BUKTI_TRANSFER STORAGE BUCKET & RLS POLICIES
-- Migration: 20260826000006_storage_bukti_transfer_rls.sql
-- Description: Configures private bucket 'bukti_transfer' and strictly restricts
--              upload (INSERT), modification (UPDATE), and deletion (DELETE)
--              to authenticated users with ADMIN role.
--              DIRECTOR, ANGGOTA, and Anonymous users are strictly DENIED upload.
-- ==============================================================================

-- 1. Ensure private bucket 'bukti_transfer' exists in storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti_transfer',
  'bukti_transfer',
  FALSE,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Ensure RLS is active on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. STORAGE RLS POLICIES FOR 'bukti_transfer'
-- ==============================================================================

-- A. INSERT: ONLY ADMIN CAN UPLOAD OBJECTS
DROP POLICY IF EXISTS "bukti_transfer_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;

CREATE POLICY "bukti_transfer_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bukti_transfer' AND
    public.is_admin()
  );

-- B. UPDATE: ONLY ADMIN CAN UPDATE OBJECTS
DROP POLICY IF EXISTS "bukti_transfer_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_update" ON storage.objects;

CREATE POLICY "bukti_transfer_admin_update"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer' AND
    public.is_admin()
  )
  WITH CHECK (
    bucket_id = 'bukti_transfer' AND
    public.is_admin()
  );

-- C. DELETE: ONLY ADMIN CAN DELETE OBJECTS (for rollback & cleanup)
DROP POLICY IF EXISTS "bukti_transfer_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_delete" ON storage.objects;

CREATE POLICY "bukti_transfer_admin_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer' AND
    public.is_admin()
  );

-- D. SELECT: ADMIN & DIRECTOR CAN VIEW OBJECTS (Signed URLs / Verification)
DROP POLICY IF EXISTS "bukti_transfer_admin_director_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select" ON storage.objects;

CREATE POLICY "bukti_transfer_admin_director_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'bukti_transfer' AND
    public.is_director_or_admin()
  );
