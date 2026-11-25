-- ==============================================================================
-- KOPSIM MANDIRI: UNIFIKASI BUCKET STORAGE KE 'bukti_transfer'
-- File: 20261124000005_unify_bucket_bukti_transfer.sql
-- Tujuan:
--   1. Memastikan bucket utama 'bukti_transfer' terdaftar dan dikonfigurasi
--      sebagai bucket privat (public = FALSE) dengan batas 10 MB & MIME resmi.
--   2. Memastikan RLS storage.objects menjadikan 'bukti_transfer' sebagai bucket
--      utama penulisan (INSERT/UPDATE/DELETE) serta tetap mendukung pembacaan
--      (SELECT) objek lama pada 'bukti-transfer' apabila masih tersimpan.
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti_transfer',
  'bukti_transfer',
  FALSE,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Jika bucket legacy 'bukti-transfer' ada, pastikan tetap privat (jangan dibuka ke publik)
UPDATE storage.buckets
SET public = FALSE
WHERE id = 'bukti-transfer';

DROP POLICY IF EXISTS "bukti_transfer_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_auth_delete" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_delete" ON storage.objects;

-- SELECT: Admin/Direksi melihat semua; Anggota hanya melihat objek miliknya (termasuk legacy baca)
CREATE POLICY "bukti_transfer_auth_select"
ON storage.objects FOR SELECT TO authenticated
USING (public.can_access_bukti_object(bucket_id, name));

-- INSERT: Wajib masuk ke bucket utama 'bukti_transfer' oleh user terautentikasi
CREATE POLICY "bukti_transfer_auth_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'bukti_transfer'
  AND auth.uid() IS NOT NULL
  AND (
    public.is_director_or_admin()
    OR name LIKE ('avatar/' || COALESCE(public.current_user_member_id(), '__none__') || '%')
    OR name LIKE ('setoran/' || COALESCE(public.current_user_member_id(), '__none__') || '%')
    OR name LIKE ('investasi/' || COALESCE(public.current_user_member_id(), '__none__') || '%')
  )
);

-- UPDATE: Khusus Pengurus / Direksi / Admin
CREATE POLICY "bukti_transfer_auth_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_director_or_admin())
WITH CHECK (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_director_or_admin());

-- DELETE: Khusus Admin
CREATE POLICY "bukti_transfer_auth_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_admin_only());
