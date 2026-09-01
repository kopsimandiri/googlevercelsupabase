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
  publicUrl?: string;
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
 * and returns both the storage path and the permanent publicUrl.
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

  // Ensure clean path without leading slashes
  let cleanPath = storagePath.trim().replace(/^\/+/, '');
  if (cleanPath.startsWith(`${BUKTI_TRANSFER_BUCKET}/`)) {
    cleanPath = cleanPath.replace(new RegExp(`^${BUKTI_TRANSFER_BUCKET}/+`), '');
  }

  try {
    const { data, error } = await client.storage
      .from(BUKTI_TRANSFER_BUCKET)
      .upload(cleanPath, fileBlob, {
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

    const savedPath = data?.path || cleanPath;

    // STEP 2.1: Always get public URL for Public Bucket
    const { data: pubData } = client.storage.from(BUKTI_TRANSFER_BUCKET).getPublicUrl(savedPath);
    const publicUrl = pubData?.publicUrl || '';

    return {
      success: true,
      path: savedPath,
      publicUrl,
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
  if (!storagePath || storagePath.startsWith('data:') || storagePath.startsWith('blob:')) {
    return { success: true };
  }

  const client = getSupabaseClient();
  if (!client) {
    return { success: false, error: 'Supabase client tidak tersedia.' };
  }

  const cleanPath = extractStoragePath(storagePath) || storagePath;

  try {
    const { error } = await client.storage.from(BUKTI_TRANSFER_BUCKET).remove([cleanPath]);
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
 * Extracts pure storage path from any filelink format:
 * - Direct path: "2026/08/TRX-001.webp"
 * - Signed URL: "https://...supabase.co/storage/v1/object/sign/bukti_transfer/2026/08/TRX-001.webp?token=..."
 * - Public URL: "https://...supabase.co/storage/v1/object/public/bukti_transfer/2026/08/TRX-001.webp"
 */
export function extractStoragePath(rawLinkOrUrl?: string | null): string | null {
  if (!rawLinkOrUrl) return null;
  const trimmed = rawLinkOrUrl.trim();
  if (!trimmed) return null;

  // If already a data URI or local asset
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  try {
    // If it's a URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      const urlObj = new URL(trimmed);
      let pathname = urlObj.pathname; // e.g. /storage/v1/object/public/bukti_transfer/2026/08/TRX-001.webp
      
      // Remove query parameters (?token=...)
      // Match pattern /storage/v1/object/(public|sign|authenticated)/bukti_transfer/(.*)
      const storageMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\/(.*)/);
      if (storageMatch && storageMatch[2]) {
        return decodeURIComponent(storageMatch[2]);
      }

      // If generic path ending with bucket
      const bucketIdx = pathname.indexOf(`/${BUKTI_TRANSFER_BUCKET}/`);
      if (bucketIdx !== -1) {
        return decodeURIComponent(pathname.substring(bucketIdx + BUKTI_TRANSFER_BUCKET.length + 2));
      }

      return trimmed;
    }
  } catch {
    // If URL parsing fails, treat as path
  }

  // Remove leading slashes and bucket prefix if any
  let clean = trimmed.replace(/^\/+/, '');
  if (clean.startsWith(`${BUKTI_TRANSFER_BUCKET}/`)) {
    clean = clean.replace(new RegExp(`^${BUKTI_TRANSFER_BUCKET}/+`), '');
  }
  return clean;
}

/**
 * Resolves consistent Public URL from any storage reference (path, legacy signed URL, or public URL).
 */
export function getPublicProofUrl(storagePathOrUrl?: string | null): string {
  if (!storagePathOrUrl) return '';
  const trimmed = storagePathOrUrl.trim();
  if (!trimmed) return '';

  // Return immediately if data URI or local asset
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // If already a valid public Supabase URL without sign/token
  if (
    trimmed.startsWith('https://') &&
    trimmed.includes('/storage/v1/object/public/') &&
    !trimmed.includes('?token=')
  ) {
    return trimmed;
  }

  const client = getSupabaseClient();
  const path = extractStoragePath(trimmed);
  if (!path) return '';

  if (client) {
    const { data } = client.storage.from(BUKTI_TRANSFER_BUCKET).getPublicUrl(path);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback direct URL builder if client is loading
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${BUKTI_TRANSFER_BUCKET}/${path}`;
  }

  return trimmed;
}

/**
 * Checks if a file path or URL points to an image format.
 */
export function isImageFile(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const clean = urlOrPath.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.svg') ||
    clean.startsWith('data:image/')
  );
}

/**
 * Checks if a file path or URL points to a PDF document.
 */
export function isPdfFile(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const clean = urlOrPath.split('?')[0].toLowerCase();
  return clean.endsWith('.pdf') || clean.startsWith('data:application/pdf');
}

/**
 * Legacy compatibility alias that returns the public URL.
 */
export async function getSignedProofUrl(storagePath: string): Promise<string | null> {
  const url = getPublicProofUrl(storagePath);
  return url || null;
}
