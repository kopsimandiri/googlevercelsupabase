import { getSupabaseClient } from '../lib/supabase';

export const BUKTI_TRANSFER_BUCKET = 'bukti_transfer';

export const STORAGE_BUKTI_TRANSFER_SQL_DDL = `-- ==============================================================================
-- KOPSIM MANDIRI: BUKTI_TRANSFER STORAGE BUCKET & RLS POLICIES
-- Description: Configures private bucket 'bukti_transfer' and strictly restricts
--              upload (INSERT), modification (UPDATE), and deletion (DELETE)
--              to authenticated users with ADMIN role.
--              DIRECTOR, ANGGOTA, and Anonymous users are strictly DENIED upload.
-- ==============================================================================

-- 1. Pastikan bucket privat 'bukti_transfer' terdaftar di storage.buckets
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

-- 2. Aktifkan Row Level Security pada storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 3. STORAGE RLS POLICIES FOR 'bukti_transfer'
-- ==============================================================================

-- A. INSERT: HANYA ADMIN YANG BOLEH UPLOAD
DROP POLICY IF EXISTS "bukti_transfer_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated uploads to bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert" ON storage.objects;

CREATE POLICY "bukti_transfer_admin_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'bukti_transfer' AND
    public.is_admin()
  );

-- B. UPDATE: HANYA ADMIN YANG BOLEH MEMPERBARUI FILE
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

-- C. DELETE: HANYA ADMIN YANG BOLEH MENGHAPUS FILE (Rollback & Cleanup)
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

-- D. SELECT: ADMIN & DIREKSI BISA MELIHAT BUKTI (Signed URLs / Audit)
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
`;

export interface ProofOptimizationResult {
  file: Blob | File;
  extension: string;
  mimeType: string;
  originalSize: number;
  optimizedSize: number;
  previewUrl: string;
}

export interface StorageUploadResult {
  success: boolean;
  path?: string;
  error?: string;
}

/**
 * Validates and optimizes transaction proof image before uploading to Supabase Storage.
 * Accepts: image/jpeg, image/png, image/webp.
 * Compresses / resizes if the image exceeds recommended limits while keeping text legible.
 */
export async function validateAndOptimizeProofImage(file: File): Promise<ProofOptimizationResult> {
  const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!allowedMimeTypes.includes(file.type.toLowerCase())) {
    throw new Error(
      `Format file "${file.type || file.name}" tidak didukung. Harap pilih gambar dengan format JPG, PNG, atau WebP.`
    );
  }

  // Max initial file size check (10MB)
  const MAX_INPUT_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_INPUT_SIZE) {
    throw new Error(`Ukuran file terlalu besar (${(file.size / (1024 * 1024)).toFixed(2)} MB). Batas maksimal input adalah 10 MB.`);
  }

  // Helper to get extension
  const getCleanExt = (mime: string, name: string): string => {
    if (mime.includes('webp')) return 'webp';
    if (mime.includes('png')) return 'png';
    if (mime.includes('jpeg') || mime.includes('jpg')) return 'jpg';
    const ext = name.split('.').pop()?.toLowerCase();
    return ext && ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? ext : 'jpg';
  };

  // If already compact (< 1MB), check if compression is needed
  const needsCompression = file.size > 1024 * 1024; // > 1MB

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar. Pastikan file tidak rusak.'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Format data gambar tidak valid atau korup.'));
      img.onload = () => {
        try {
          const maxDimension = 1920; // 1080p - 2K max for sharp receipts
          let width = img.width;
          let height = img.height;

          // Downscale if dimensions exceed 1920px
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          // If no resize is needed and file is already under 1MB, we can use original or WebP convert
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // Fallback to original file
            const previewUrl = URL.createObjectURL(file);
            resolve({
              file,
              extension: getCleanExt(file.type, file.name),
              mimeType: file.type || 'image/jpeg',
              originalSize: file.size,
              optimizedSize: file.size,
              previewUrl,
            });
            return;
          }

          // Draw image to canvas with white background (to avoid transparent PNG dark backgrounds)
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Output to WebP if supported by browser, else JPEG
          const outputMime = 'image/webp';
          const quality = 0.85; // High enough to keep receipt text sharp

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                const previewUrl = URL.createObjectURL(file);
                resolve({
                  file,
                  extension: getCleanExt(file.type, file.name),
                  mimeType: file.type || 'image/jpeg',
                  originalSize: file.size,
                  optimizedSize: file.size,
                  previewUrl,
                });
                return;
              }

              // If the optimized blob is larger than original file and original didn't need resize, keep original
              if (!needsCompression && blob.size >= file.size) {
                const previewUrl = URL.createObjectURL(file);
                resolve({
                  file,
                  extension: getCleanExt(file.type, file.name),
                  mimeType: file.type || 'image/jpeg',
                  originalSize: file.size,
                  optimizedSize: file.size,
                  previewUrl,
                });
              } else {
                const previewUrl = URL.createObjectURL(blob);
                resolve({
                  file: blob,
                  extension: 'webp',
                  mimeType: outputMime,
                  originalSize: file.size,
                  optimizedSize: blob.size,
                  previewUrl,
                });
              }
            },
            outputMime,
            quality
          );
        } catch (err: any) {
          reject(new Error(`Gagal mengoptimasi gambar bukti: ${err?.message || err}`));
        }
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Generates structured storage path according to rule:
 * YYYY/MM/<transaction_no>-<unique-id>.<extension>
 * Example: "2026/08/TRX-260831-00001-a8f72.webp"
 */
export function generateStorageProofPath(
  transactionNo: string,
  extension: string,
  transactionDate?: string
): string {
  const now = transactionDate ? new Date(transactionDate) : new Date();
  const validDate = isNaN(now.getTime()) ? new Date() : now;

  const yyyy = validDate.getFullYear();
  const mm = String(validDate.getMonth() + 1).padStart(2, '0');

  // Sanitize transaction number (strip slashes or special chars)
  const cleanTrxNo = (transactionNo || `TRX-${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, '_');

  // Generate 6-char random alphanumeric unique suffix
  const uniqueId = Math.random().toString(36).substring(2, 8);
  const cleanExt = extension.replace(/^\./, '').toLowerCase() || 'webp';

  return `${yyyy}/${mm}/${cleanTrxNo}-${uniqueId}.${cleanExt}`;
}

/**
 * Uploads optimized proof blob to Supabase Storage bucket 'bukti_transfer'
 */
export async function uploadTransactionProof(
  fileBlob: Blob | File,
  storagePath: string,
  mimeType: string = 'image/webp'
): Promise<StorageUploadResult> {
  const client = getSupabaseClient();
  if (!client) {
    return {
      success: false,
      error: 'Supabase client belum terhubung. Pastikan koneksi dan kredensial Supabase sudah aktif.',
    };
  }

  try {
    const { data, error } = await client.storage
      .from(BUKTI_TRANSFER_BUCKET)
      .upload(storagePath, fileBlob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      console.error('SUPABASE STORAGE UPLOAD ERROR:', error);
      const isRlsError = error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('violates');
      return {
        success: false,
        error: isRlsError
          ? `Gagal upload ke bucket "${BUKTI_TRANSFER_BUCKET}": new row violates row-level security policy (Akses Ditolak: Hanya pengguna dengan hak ADMIN yang diizinkan mengunggah bukti transaksi).`
          : `Gagal upload ke bucket "${BUKTI_TRANSFER_BUCKET}": ${error.message}`,
      };
    }

    return {
      success: true,
      path: data?.path || storagePath,
    };
  } catch (err: any) {
    console.error('STORAGE UPLOAD EXCEPTION:', err);
    return {
      success: false,
      error: err?.message || 'Terjadi kesalahan jaringan saat mengunggah file bukti.',
    };
  }
}

/**
 * Rollback helper: deletes an uploaded object from storage if transaction database insertion fails.
 */
export async function deleteTransactionProof(storagePath: string): Promise<{ success: boolean; error?: string }> {
  if (!storagePath || storagePath.startsWith('http://') || storagePath.startsWith('https://') || storagePath.startsWith('data:')) {
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client tidak tersedia.' };
  }

  try {
    const { error } = await client.storage.from(BUKTI_TRANSFER_BUCKET).remove([storagePath]);
    if (error) {
      console.warn('Gagal menghapus file storage (rollback):', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    console.warn('Exception saat rollback storage:', err);
    return { success: false, error: err?.message || String(err) };
  }
}

/**
 * Creates a temporary signed URL for private bucket objects so they can be viewed safely.
 * Returns null or direct URL if already a full link.
 */
export async function getSignedProofUrl(storagePath: string, expiresInSeconds: number = 3600): Promise<string | null> {
  if (!storagePath) return null;

  const trimmed = storagePath.trim();
  if (!trimmed) return null;

  // If already a full URL or data URI, return as-is
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/assets/') ||
    trimmed.startsWith('blob:')
  ) {
    return trimmed;
  }

  const client = getSupabaseClient();
  if (!client) return null;

  // Clean path: remove leading slashes and optional bucket name prefix
  let cleanPath = trimmed.replace(/^\/+/, '');
  if (cleanPath.startsWith(`${BUKTI_TRANSFER_BUCKET}/`)) {
    cleanPath = cleanPath.replace(new RegExp(`^${BUKTI_TRANSFER_BUCKET}/+`), '');
  }

  try {
    const { data, error } = await client.storage
      .from(BUKTI_TRANSFER_BUCKET)
      .createSignedUrl(cleanPath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      // Fallback: try getPublicUrl in case bucket is public or signed URL fails
      const { data: pubData } = client.storage.from(BUKTI_TRANSFER_BUCKET).getPublicUrl(cleanPath);
      if (pubData?.publicUrl) {
        return pubData.publicUrl;
      }
      console.warn('Gagal membuat signed URL bukti transfer:', error?.message);
      return null;
    }

    return data.signedUrl;
  } catch (err) {
    console.warn('Exception createSignedUrl:', err);
    try {
      const { data: pubData } = client.storage.from(BUKTI_TRANSFER_BUCKET).getPublicUrl(cleanPath);
      return pubData?.publicUrl || null;
    } catch {
      return null;
    }
  }
}
