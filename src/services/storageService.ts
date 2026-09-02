import { getSupabaseClient } from '../lib/supabase';

export const BUKTI_TRANSFER_BUCKET = 'bukti_transfer';
export const CANDIDATE_BUCKETS = ['bukti_transfer', 'bukti-transfer', 'transaksi', 'bukti_transaksi', 'documents', 'public', 'uploads'];

// In-memory cache for resolved active bucket
let _resolvedActiveBucket: string | null = null;

/**
 * Automatically discovers the existing active bucket or creates 'bukti_transfer' as public.
 */
export async function resolveActiveBucket(): Promise<string> {
  if (_resolvedActiveBucket) return _resolvedActiveBucket;

  const client = getSupabaseClient();
  if (!client) return BUKTI_TRANSFER_BUCKET;

  try {
    const { data: buckets, error } = await client.storage.listBuckets();
    if (!error && buckets && buckets.length > 0) {
      // 1. Check if 'bukti_transfer' exists
      const exactMatch = buckets.find((b) => b.name === BUKTI_TRANSFER_BUCKET || b.id === BUKTI_TRANSFER_BUCKET);
      if (exactMatch) {
        _resolvedActiveBucket = exactMatch.name;
        return exactMatch.name;
      }

      // 2. Check candidate names in order
      for (const cand of CANDIDATE_BUCKETS) {
        const match = buckets.find((b) => b.name.toLowerCase() === cand.toLowerCase() || b.id.toLowerCase() === cand.toLowerCase());
        if (match) {
          console.info(`[Storage] Active bucket resolved to: "${match.name}"`);
          _resolvedActiveBucket = match.name;
          return match.name;
        }
      }

      // 3. Check any bucket containing 'bukti' or 'transfer' or 'transaksi'
      const fuzzyMatch = buckets.find((b) => 
        b.name.toLowerCase().includes('bukti') || 
        b.name.toLowerCase().includes('transfer') || 
        b.name.toLowerCase().includes('transaksi')
      );
      if (fuzzyMatch) {
        console.info(`[Storage] Fuzzy matched bucket: "${fuzzyMatch.name}"`);
        _resolvedActiveBucket = fuzzyMatch.name;
        return fuzzyMatch.name;
      }

      // 4. If any public bucket exists, fallback to first public bucket
      const firstPublic = buckets.find((b) => b.public);
      if (firstPublic) {
        console.info(`[Storage] Fallback to public bucket: "${firstPublic.name}"`);
        _resolvedActiveBucket = firstPublic.name;
        return firstPublic.name;
      }
    }

    // Attempt to auto-create public bucket 'bukti_transfer' if permitted
    try {
      const { data: newBucket, error: createErr } = await client.storage.createBucket(BUKTI_TRANSFER_BUCKET, {
        public: true,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      });
      if (!createErr && newBucket) {
        console.info('[Storage] Created new public bucket:', BUKTI_TRANSFER_BUCKET);
        _resolvedActiveBucket = BUKTI_TRANSFER_BUCKET;
        return BUKTI_TRANSFER_BUCKET;
      }
    } catch {
      // Ignore createBucket failure if restricted by RLS
    }
  } catch (err) {
    console.warn('[Storage] Exception during resolveActiveBucket:', err);
  }

  _resolvedActiveBucket = BUKTI_TRANSFER_BUCKET;
  return BUKTI_TRANSFER_BUCKET;
}

export const STORAGE_BUKTI_TRANSFER_SQL_DDL = `-- ==============================================================================
-- KOPSIM MANDIRI: BUKTI_TRANSFER PUBLIC STORAGE BUCKET & RLS POLICIES
-- Migration: 20260826000006_storage_bukti_transfer_public_rls.sql
-- Description: Configures PUBLIC bucket 'bukti_transfer' and strictly restricts
--              upload (INSERT) to ADMIN & DIRECTOR, and UPDATE/DELETE to ADMIN.
--              SELECT is open to PUBLIC for direct proof preview rendering.
-- ==============================================================================

-- 1. Buat / Pastikan bucket 'bukti_transfer' berstatus PUBLIC
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bukti_transfer',
  'bukti_transfer',
  TRUE, -- PUBLIC BUCKET
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Aktifkan Row Level Security pada storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. DROP SEMUA POLICY LAMA (Bersihkan policy lama & eksperimental)
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

-- 4. POLICY 1: SELECT (Public Read untuk render langsung bukti transfer di UI)
CREATE POLICY "bukti_transfer_select_public"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'bukti_transfer');

-- 5. POLICY 2: INSERT (Hanya user terautentikasi dengan role ADMIN atau DIRECTOR)
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

-- 6. POLICY 3: UPDATE (Hanya ADMIN)
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

-- 7. POLICY 4: DELETE (Hanya ADMIN)
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
 * Uploads optimized proof blob to Supabase Storage bucket with auto-resolution and auto-creation fallback.
 * Returns both the storage path and the permanent publicUrl.
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

  // Defensive Check: Verifikasi sesi Supabase Auth aktif sebelum mengirim request ke Storage API
  try {
    const { data: sessionData, error: sessionErr } = await client.auth.getSession();
    if (sessionErr || !sessionData?.session?.user) {
      console.warn('[Storage] Upload rejected: Sesi Supabase Auth tidak aktif / null.');
      return {
        success: false,
        error: 'Sesi login Anda tidak valid untuk upload file, silakan login ulang',
      };
    }
  } catch (authCheckErr) {
    console.warn('[Storage] Auth session verification exception:', authCheckErr);
    return {
      success: false,
      error: 'Sesi login Anda tidak valid untuk upload file, silakan login ulang',
    };
  }

  const activeBucket = await resolveActiveBucket();

  // Ensure clean path without leading slashes or bucket prefix
  let cleanPath = storagePath.trim().replace(/^\/+/, '');
  if (cleanPath.startsWith(`${activeBucket}/`)) {
    cleanPath = cleanPath.replace(new RegExp(`^${activeBucket}/+`), '');
  }
  for (const b of CANDIDATE_BUCKETS) {
    if (cleanPath.startsWith(`${b}/`)) {
      cleanPath = cleanPath.replace(new RegExp(`^${b}/+`), '');
    }
  }

  try {
    let { data, error } = await client.storage
      .from(activeBucket)
      .upload(cleanPath, fileBlob, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: true,
      });

    // If bucket was not found, attempt auto-create or retry on candidate buckets
    if (error && (error.message?.toLowerCase().includes('not found') || (error as any)?.statusCode === '404' || (error as any)?.statusCode === 404)) {
      console.warn(`[Storage] Bucket "${activeBucket}" not found, attempting recovery...`);
      
      // Try to create the bucket 'bukti_transfer' as public
      try {
        await client.storage.createBucket(BUKTI_TRANSFER_BUCKET, {
          public: true,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        });
      } catch (cErr) {
        console.warn('[Storage] Create bucket attempt:', cErr);
      }

      // Retry upload on BUKTI_TRANSFER_BUCKET
      const retryRes = await client.storage
        .from(BUKTI_TRANSFER_BUCKET)
        .upload(cleanPath, fileBlob, {
          contentType: mimeType,
          cacheControl: '3600',
          upsert: true,
        });

      if (!retryRes.error) {
        data = retryRes.data;
        error = null;
        _resolvedActiveBucket = BUKTI_TRANSFER_BUCKET;
      }
    }

    if (error) {
      console.error('SUPABASE STORAGE UPLOAD ERROR:', error);
      const isRlsError = error.message?.toLowerCase().includes('row-level security') || error.message?.toLowerCase().includes('violates');
      return {
        success: false,
        error: isRlsError
          ? `Gagal upload ke storage: Akses ditolak oleh kebijakan keamanan RLS. Hubungi Administrator Koperasi.`
          : `Gagal upload ke bucket "${activeBucket}": ${error.message}`,
      };
    }

    const savedPath = data?.path || cleanPath;

    // STEP 2.1: Always get public URL for Public Bucket
    const { data: pubData } = client.storage.from(activeBucket).getPublicUrl(savedPath);
    const publicUrl = pubData?.publicUrl || getPublicProofUrl(savedPath);

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
 * Searches for a proof file in the storage bucket based on transaction_no (e.g. T260421001).
 * Looks in root, year/month subdirectories, parsed YYMMDD subfolders, and all storage buckets.
 */
export async function findProofInBucketByTransactionNo(
  transactionNo: string,
  transactionDate?: string
): Promise<{
  found: boolean;
  path?: string;
  publicUrl?: string;
  bucketName?: string;
  fileName?: string;
}> {
  if (!transactionNo) return { found: false };

  const client = getSupabaseClient();
  if (!client) return { found: false };

  const cleanTrxNo = transactionNo.trim();
  const searchPattern = cleanTrxNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const lowerTrxNo = cleanTrxNo.toLowerCase();

  // 1. Resolve all active and existing buckets in Supabase Storage
  let bucketList = Array.from(new Set([_resolvedActiveBucket || BUKTI_TRANSFER_BUCKET, ...CANDIDATE_BUCKETS]));
  try {
    const { data: remoteBuckets } = await client.storage.listBuckets();
    if (remoteBuckets && remoteBuckets.length > 0) {
      const names = remoteBuckets.map((b) => b.name);
      bucketList = Array.from(new Set([...bucketList, ...names]));
    }
  } catch {
    // Ignore listBuckets failure if restricted
  }

  // 2. Build folder search list based on transaction_no format (e.g. T260421001 -> 2026-04-21)
  const foldersToCheck: Set<string> = new Set(['', 'bukti_transfer', 'bukti', 'transaksi', 'transactions', 'uploads', 'proofs', 'proof']);

  // Extract date from standard format like T260421001 or P260421001 (YYMMDD)
  const idDateMatch = cleanTrxNo.match(/^[TPtp](\d{2})(\d{2})(\d{2})/);
  if (idDateMatch) {
    const yy = parseInt(idDateMatch[1], 10);
    const mm = idDateMatch[2];
    const dd = idDateMatch[3];
    const fullYear = `20${String(yy).padStart(2, '0')}`;
    foldersToCheck.add(`${fullYear}/${mm}`);
    foldersToCheck.add(`${fullYear}/${mm}/${dd}`);
    foldersToCheck.add(`${fullYear}-${mm}-${dd}`);
    foldersToCheck.add(`${fullYear}_${mm}`);
    foldersToCheck.add(fullYear);
  }

  // Also parse transactionDate if provided
  if (transactionDate) {
    const d = new Date(transactionDate);
    if (!isNaN(d.getTime())) {
      const yyyy = String(d.getFullYear());
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      foldersToCheck.add(`${yyyy}/${mm}`);
      foldersToCheck.add(`${yyyy}/${mm}/${dd}`);
      foldersToCheck.add(`${yyyy}-${mm}-${dd}`);
      foldersToCheck.add(yyyy);
    }
  }

  // Add current and recent years
  const currentYear = new Date().getFullYear();
  foldersToCheck.add(String(currentYear));
  for (let m = 1; m <= 12; m++) {
    foldersToCheck.add(`${currentYear}/${String(m).padStart(2, '0')}`);
  }

  for (const bucket of bucketList) {
    for (const folder of Array.from(foldersToCheck)) {
      try {
        // Attempt search with API search parameter first
        let { data: files, error } = await client.storage
          .from(bucket)
          .list(folder, {
            limit: 100,
            search: cleanTrxNo,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        // Fallback: If no match with search param, list directory directly and match in JS
        if (!error && (!files || files.length === 0)) {
          const listRes = await client.storage
            .from(bucket)
            .list(folder, {
              limit: 100,
              sortBy: { column: 'created_at', order: 'desc' },
            });
          if (!listRes.error && listRes.data) {
            files = listRes.data;
          }
        }

        if (!error && files && files.length > 0) {
          // Look for exact or substring match with transactionNo (e.g. T260421001.jpg, T260421001-xxx.webp)
          const match = files.find((f) => {
            const fNameLower = f.name.toLowerCase();
            return (
              fNameLower.includes(lowerTrxNo) ||
              fNameLower.includes(searchPattern.toLowerCase()) ||
              fNameLower.startsWith(lowerTrxNo)
            );
          });

          if (match) {
            const fullPath = folder ? `${folder}/${match.name}` : match.name;
            const { data: pubData } = client.storage.from(bucket).getPublicUrl(fullPath);
            const publicUrl = pubData?.publicUrl || '';

            console.info(`[Storage] Match found for ${transactionNo} at: ${bucket}/${fullPath}`);
            return {
              found: true,
              path: fullPath,
              publicUrl,
              bucketName: bucket,
              fileName: match.name,
            };
          }
        }
      } catch {
        // Skip inaccessible folder/bucket
      }
    }
  }

  return { found: false };
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
  const bucketName = _resolvedActiveBucket || BUKTI_TRANSFER_BUCKET;

  if (client) {
    const { data } = client.storage.from(bucketName).getPublicUrl(path);
    if (data?.publicUrl) {
      return data.publicUrl;
    }
  }

  // Fallback direct URL builder if client is loading
  const baseUrl = import.meta.env.VITE_SUPABASE_URL || '';
  if (baseUrl) {
    return `${baseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${bucketName}/${path}`;
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
