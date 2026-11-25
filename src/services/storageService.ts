import { getSupabaseClient, getSupabaseUrl } from '../lib/supabase';

export const BUKTI_TRANSFER_BUCKET = 'bukti_transfer';
export const LEGACY_BUKTI_BUCKET = 'bukti-transfer';
export const CANDIDATE_BUCKETS = ['bukti_transfer', 'bukti-transfer', 'transaksi', 'bukti_transaksi', 'documents', 'public', 'uploads'];

// In-memory cache for resolved active bucket
let _resolvedActiveBucket: string | null = null;

/**
 * Automatically discovers the existing active bucket (prioritizing 'bukti_transfer') or returns 'bukti_transfer'.
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

    // Attempt to auto-create private bucket 'bukti_transfer' if permitted
    try {
      const { data: newBucket, error: createErr } = await client.storage.createBucket(BUKTI_TRANSFER_BUCKET, {
        public: false,
        fileSizeLimit: 10485760, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
      });
      if (!createErr && newBucket) {
        console.info('[Storage] Created new private bucket:', BUKTI_TRANSFER_BUCKET);
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
-- KOPSIM MANDIRI: SUPABASE STORAGE BUCKET PRIVAT 'bukti_transfer' & POLICY RLS
-- ==============================================================================

-- 1. Pastikan bucket utama 'bukti_transfer' bersifat PRIVAT (public = FALSE)
--    Sehingga akses URL langsung tanpa login ditolak oleh Supabase Storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'bukti_transfer',
    'bukti_transfer',
    FALSE,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = FALSE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- 2. Aktifkan Row Level Security pada storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 3. Bersihkan policy lama
DROP POLICY IF EXISTS "Public Read bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select_public" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_delete" ON storage.objects;

-- 4. Policy SELECT: Pengguna login dapat membaca/membuat Signed URL (Admin semua; Anggota miliknya saja)
CREATE POLICY "bukti-transfer_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (public.can_access_bukti_object(bucket_id, name));

-- 5. Policy INSERT: Admin/Direktur bebas upload; Anggota hanya ke folder setoran/investasi/avatar
CREATE POLICY "bukti-transfer_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('bukti_transfer', 'bukti-transfer')
    AND (
      public.is_director_or_admin()
      OR name LIKE 'investasi/%'
      OR name LIKE 'setoran/%'
      OR name LIKE 'avatar/%'
    )
  );

-- 6. Policy UPDATE & DELETE: Khusus Pengurus / Admin (Anggota dilarang mengubah/menghapus)
CREATE POLICY "bukti-transfer_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_director_or_admin())
  WITH CHECK (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_director_or_admin());

CREATE POLICY "bukti-transfer_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('bukti_transfer', 'bukti-transfer') AND public.is_admin_only());
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

  let activeBucket = await resolveActiveBucket();
  if (activeBucket !== BUKTI_TRANSFER_BUCKET) {
    activeBucket = BUKTI_TRANSFER_BUCKET;
  }

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

    // If bucket was not found, attempt private bucket creation on 'bukti_transfer' or retry fallback
    if (error && (error.message?.toLowerCase().includes('not found') || (error as any)?.statusCode === '404' || (error as any)?.statusCode === 404)) {
      console.warn(`[Storage] Bucket "${activeBucket}" not found, attempting recovery...`);

      try {
        await client.storage.createBucket(BUKTI_TRANSFER_BUCKET, {
          public: false,
          fileSizeLimit: 10485760,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
        });
      } catch (cErr) {
        console.warn('[Storage] Create bucket attempt:', cErr);
      }

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
      } else {
        const legacyRetry = await client.storage
          .from(LEGACY_BUKTI_BUCKET)
          .upload(cleanPath, fileBlob, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: true,
          });
        if (!legacyRetry.error) {
          data = legacyRetry.data;
          error = null;
          activeBucket = LEGACY_BUKTI_BUCKET;
          _resolvedActiveBucket = LEGACY_BUKTI_BUCKET;
        }
      }
    }

    if (error) {
      console.error('SUPABASE STORAGE UPLOAD ERROR:', error);
      const isRlsError =
        error.message?.toLowerCase().includes('row-level security') ||
        error.message?.toLowerCase().includes('violates') ||
        error.message?.toLowerCase().includes('policy');

      // Attempt fallback upload without upsert flag if upsert policy was rejected
      if (isRlsError) {
        try {
          const fallbackPath = `${cleanPath.replace(/\.[^.]+$/, '')}-${Date.now()}.${mimeType.split('/')[1] || 'webp'}`;
          const retryWithoutUpsert = await client.storage
            .from(activeBucket)
            .upload(fallbackPath, fileBlob, {
              contentType: mimeType,
              cacheControl: '3600',
              upsert: false,
            });

          if (!retryWithoutUpsert.error && retryWithoutUpsert.data) {
            const savedPath = retryWithoutUpsert.data.path || fallbackPath;
            const { data: pubData } = client.storage.from(activeBucket).getPublicUrl(savedPath);
            return {
              success: true,
              path: savedPath,
              publicUrl: pubData?.publicUrl || getPublicProofUrl(savedPath),
            };
          }
        } catch (fbErr) {
          console.warn('[Storage] Fallback upload attempt failed:', fbErr);
        }
      }

      return {
        success: false,
        error: isRlsError
          ? `Gagal upload ke storage: Akses ditolak oleh kebijakan keamanan RLS. Pastikan Anda login dengan akun Pengurus / Admin (koperasi.simandiri@gmail.com) dan jalankan script SQL perbaikan RLS di Supabase Dashboard.`
          : `Gagal upload ke bucket "${activeBucket}": ${error.message}`,
      };
    }

    const savedPath = data?.path || cleanPath;

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
 * Verified Storage Registry:
 * Daftar berkas fisik bukti transfer yang terverifikasi berada di bucket `bukti_transfer`,
 * dipetakan langsung dengan nomor transaksi (transaction_no).
 */
export const KNOWN_STORAGE_PROOFS: Record<string, string> = {
  'T251229001': '2025/12/T251229001-jnpf6q.webp',
  'T251229002': '2025/12/T251229002-1cpdp8.webp',
  'T251229003': '2025/12/T251229003-7nucag.webp',
  'T251229004': '2025/12/T251229004-9j1797.webp',
  'T260202001': '2026/02/T260202001-80nnro.webp',
  'T260220001': '2026/02/T260220001-b97crn.webp',
  'T260318001': '2026/03/T260318001-z6lluv.jpg',
  'T260320001': '2026/03/T260320001-ou4pzo.webp',
  'T260330005': '2026/03/T260330005-vumfjf.webp',
  'T260330015': '2026/03/T260330015-tgragl.webp',
  'T260330016': '2026/03/T260330016-1o9y4o.webp',
  'T260330017': '2026/03/T260330017-mt0mvt.webp',
  'T260402001': '2026/04/T260402001-lpf5ns.webp',
  'T260410001': '2026/04/T260410001-at9nrs.webp',
  'T260413001': '2026/04/T260413001-51ezrd.webp',
  'T260413002': '2026/04/T260413002-7n8q5r.webp',
  'T260413003': '2026/04/T260413003-dvrho5.webp',
  'T260413004': '2026/04/T260413004-hekedv.webp',
  'T260413005': '2026/04/T260413005-bqu8c7.webp',
  'T260417001': '2026/04/T260417001-8t4df6.webp',
  'T260417002': '2026/04/T260417002-7yw8js.webp',
  'T260421001': '2026/04/T260421001-hvubbk.webp',
};

/**
 * Pemetaan resmi nomor anggota ke berkas bukti transfer fisik yang tersimpan di bucket storage
 */
export const MEMBER_DEFAULT_PROOFS: Record<string, string> = {
  '1121-00001': '2025/12/T251229001-jnpf6q.webp',
  '1121-00002': '2025/12/T251229002-1cpdp8.webp',
  '1121-00003': '2025/12/T251229003-7nucag.webp',
  '1121-00004': '2025/12/T251229004-9j1797.webp',
};

/**
 * Memeriksa apakah URL mengarah ke Google Drive / Google Docs / Apps Script (legacy eksternal)
 */
export function isGoogleDriveUrl(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const lower = urlOrPath.trim().toLowerCase();
  if (!lower) return false;
  return (
    lower.includes('drive.google.com') ||
    lower.includes('docs.google.com') ||
    lower.includes('googleusercontent.com') ||
    lower.includes('script.google.com')
  );
}

/**
 * Memeriksa apakah URL lengkap merupakan URL objek Supabase Storage yang valid (bukan root bucket terpotong)
 */
export function isSupabaseStorageUrl(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const trimmed = urlOrPath.trim();
  if (!trimmed || isGoogleDriveUrl(trimmed)) return false;
  if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;

  try {
    const urlObj = new URL(trimmed);
    const pathname = urlObj.pathname;

    // Tolak URL root bucket tanpa nama objek file
    if (
      pathname.endsWith(`/${BUKTI_TRANSFER_BUCKET}`) ||
      pathname.endsWith(`/${BUKTI_TRANSFER_BUCKET}/`) ||
      pathname.endsWith(`/${LEGACY_BUKTI_BUCKET}`) ||
      pathname.endsWith(`/${LEGACY_BUKTI_BUCKET}/`) ||
      pathname.endsWith('/object/public') ||
      pathname.endsWith('/object/public/') ||
      pathname.endsWith('/object/sign') ||
      pathname.endsWith('/object/sign/') ||
      pathname.endsWith('/object/authenticated') ||
      pathname.endsWith('/object/authenticated/')
    ) {
      return false;
    }

    // Cek pola standar Supabase Storage object path
    const storageMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\/(.*)/);
    if (storageMatch && storageMatch[2] && storageMatch[2].replace(/^\/+|\/+$/g, '').length > 0) {
      return true;
    }

    // Cek pola bucket bukti-transfer atau bukti_transfer pada host Supabase yang aktif
    for (const bucketCandidate of [BUKTI_TRANSFER_BUCKET, LEGACY_BUKTI_BUCKET]) {
      const bucketIdx = pathname.indexOf(`/${bucketCandidate}/`);
      if (bucketIdx !== -1) {
        const remainder = pathname.substring(bucketIdx + bucketCandidate.length + 2).replace(/^\/+|\/+$/g, '');
        const envHost = (() => {
          try {
            const envUrl = getSupabaseUrl();
            return envUrl ? new URL(envUrl).hostname : '';
          } catch {
            return '';
          }
        })();
        const isSupabaseHost =
          urlObj.hostname.endsWith('.supabase.co') ||
          urlObj.hostname.endsWith('.supabase.in') ||
          (envHost !== '' && urlObj.hostname === envHost);
        if (isSupabaseHost && remainder.length > 0) {
          return true;
        }
      }
    }
  } catch {
    return false;
  }

  return false;
}

/**
 * Mengambil URL publik Supabase Storage dari KNOWN_STORAGE_PROOFS untuk suatu nomor transaksi (termasuk ID split)
 */
export function resolveKnownStorageProofUrl(trxId?: string | null): string {
  if (!trxId) return '';
  const cleanId = trxId.trim();
  if (!cleanId) return '';
  const baseId = cleanId.replace(/[-_.]\d+$/, '');
  const relPath = KNOWN_STORAGE_PROOFS[cleanId] || KNOWN_STORAGE_PROOFS[baseId];
  if (!relPath) return '';
  const envUrl = getSupabaseUrl().replace(/\/+$/, '') || 'https://iqamratpkvnyyayjpnsu.supabase.co';
  return `${envUrl}/storage/v1/object/public/${BUKTI_TRANSFER_BUCKET}/${relPath}`;
}

/**
 * Mendapatkan URL bukti transfer terverifikasi untuk nomor anggota tertentu
 * (Tidak pernah mengembalikan slip milik anggota lain jika tidak ada kecocokan)
 */
export function getMemberDefaultProof(memberNo?: string): string {
  if (!memberNo) return '';
  const clean = memberNo.trim();
  const relPath = MEMBER_DEFAULT_PROOFS[clean];
  if (!relPath) return '';
  const envUrl = getSupabaseUrl().replace(/\/+$/, '') || 'https://iqamratpkvnyyayjpnsu.supabase.co';
  return `${envUrl}/storage/v1/object/public/${BUKTI_TRANSFER_BUCKET}/${relPath}`;
}

/**
 * Memeriksa apakah transaksi memiliki berkas bukti transfer / lampiran Supabase Storage yang valid
 * (Menolak URL legacy Google Drive dan nilai kosong/'-')
 */
export function hasTransactionProof(trx?: { id?: string; filelink?: string; bukti_url?: string } | null): boolean {
  if (!trx) return false;
  const rawLink = trx.bukti_url || trx.filelink;
  const resolved = getPublicProofUrl(rawLink);
  if (resolved) {
    return true;
  }
  const trxId = (trx.id || '').trim();
  if (!trxId) return false;
  const baseId = trxId.replace(/[-_.]\d+$/, '');
  return Boolean(KNOWN_STORAGE_PROOFS[trxId] || KNOWN_STORAGE_PROOFS[baseId]);
}

/**
 * Searches for a proof file in the storage bucket based on transaction_no (e.g. T260421001).
 * Looks in verified storage registry first, then root and date subdirectories in bucket.
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

  const cleanTrxNo = transactionNo.trim();
  // Support split transaction IDs (e.g. T251229001-1 or T251229001_3 -> base T251229001)
  const baseTrxNo = cleanTrxNo.replace(/[-_.]\d+$/, '');

  // 0. Fast-path: Check verified physical storage registry first
  const knownPath = KNOWN_STORAGE_PROOFS[cleanTrxNo] || KNOWN_STORAGE_PROOFS[baseTrxNo];
  if (knownPath) {
    const publicUrl = getPublicProofUrl(knownPath);
    return {
      found: true,
      path: knownPath,
      publicUrl,
      bucketName: BUKTI_TRANSFER_BUCKET,
      fileName: knownPath.split('/').pop() || knownPath,
    };
  }

  const client = getSupabaseClient();
  if (!client) return { found: false };

  const searchPattern = cleanTrxNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const baseSearchPattern = baseTrxNo.replace(/[^a-zA-Z0-9_-]/g, '_');
  const lowerTrxNo = cleanTrxNo.toLowerCase();
  const lowerBaseTrxNo = baseTrxNo.toLowerCase();

  // 1. Gunakan bucket utama 'bukti_transfer' terlebih dahulu (hindari listBuckets() yang sering diblokir untuk role anon/anggota)
  let bucketList = Array.from(new Set([BUKTI_TRANSFER_BUCKET, _resolvedActiveBucket, LEGACY_BUKTI_BUCKET].filter(Boolean) as string[]));

  // 2. Build folder search list based on transaction_no format (e.g. T260421001 -> 2026-04-21)
  const foldersToCheck: Set<string> = new Set(['', 'bukti_transfer', 'bukti', 'transaksi', 'transactions', 'uploads', 'proofs', 'proof']);

  // Extract date from standard format like T260421001 or P260421001 (YYMMDD)
  const idDateMatch = (baseTrxNo || cleanTrxNo).match(/^[TPtp](\d{2})(\d{2})(\d{2})/);
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
              fNameLower.includes(lowerBaseTrxNo) ||
              fNameLower.includes(searchPattern.toLowerCase()) ||
              fNameLower.includes(baseSearchPattern.toLowerCase()) ||
              fNameLower.startsWith(lowerTrxNo) ||
              fNameLower.startsWith(lowerBaseTrxNo)
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

  const bucketMatch = storagePath.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\//);
  const targetBucket = bucketMatch?.[1] || BUKTI_TRANSFER_BUCKET;
  const cleanPath = extractStoragePath(storagePath) || storagePath;

  try {
    const { error } = await client.storage.from(targetBucket).remove([cleanPath]);
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
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
    return null;
  }

  // Tolak URL Google Drive / Google Docs legacy serta Base64 Data URI (jangan simpan base64 di DB)
  if (isGoogleDriveUrl(trimmed) || trimmed.startsWith('data:')) {
    return null;
  }

  // Local preview / local static asset
  if (trimmed.startsWith('blob:') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  // If it's an HTTP/HTTPS URL, only extract paths belonging to Supabase Storage
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const urlObj = new URL(trimmed);
      const pathname = urlObj.pathname;

      if (
        pathname.endsWith(`/${BUKTI_TRANSFER_BUCKET}`) ||
        pathname.endsWith(`/${BUKTI_TRANSFER_BUCKET}/`) ||
        pathname.endsWith(`/${LEGACY_BUKTI_BUCKET}`) ||
        pathname.endsWith(`/${LEGACY_BUKTI_BUCKET}/`) ||
        pathname.endsWith('/object/public') ||
        pathname.endsWith('/object/public/') ||
        pathname.endsWith('/object/sign') ||
        pathname.endsWith('/object/sign/')
      ) {
        return null;
      }

      const storageMatch = pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\/(.*)/);
      if (storageMatch && storageMatch[2]) {
        const extracted = decodeURIComponent(storageMatch[2]).replace(/^\/+|\/+$/g, '');
        return extracted.length > 0 ? extracted : null;
      }

      if (isSupabaseStorageUrl(trimmed)) {
        for (const bucketCandidate of [BUKTI_TRANSFER_BUCKET, LEGACY_BUKTI_BUCKET]) {
          const bucketIdx = pathname.indexOf(`/${bucketCandidate}/`);
          if (bucketIdx !== -1) {
            const extracted = decodeURIComponent(pathname.substring(bucketIdx + bucketCandidate.length + 2)).replace(/^\/+|\/+$/g, '');
            return extracted.length > 0 ? extracted : null;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }

  // Remove leading slashes and bucket prefix if any
  let clean = trimmed.replace(/^\/+/, '');
  for (const b of [BUKTI_TRANSFER_BUCKET, LEGACY_BUKTI_BUCKET]) {
    if (clean.startsWith(`${b}/`)) {
      clean = clean.replace(new RegExp(`^${b}/+`), '');
    }
  }
  clean = clean.replace(/^\/+|\/+$/g, '');
  if (!clean || clean === BUKTI_TRANSFER_BUCKET || clean === LEGACY_BUKTI_BUCKET) {
    return null;
  }
  return clean;
}

/**
 * Resolves consistent Public URL ONLY from valid Supabase Storage references (path, signed URL, or public URL),
 * or static local assets. Strictly rejects Google Drive, non-Supabase external URLs, and Base64 Data URIs.
 */
export function getPublicProofUrl(storagePathOrUrl?: string | null): string {
  if (!storagePathOrUrl) return '';
  const trimmed = storagePathOrUrl.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
    return '';
  }

  // 0. Tolak URL legacy Google Drive / Google Docs & Base64 Data URI
  if (isGoogleDriveUrl(trimmed) || trimmed.startsWith('data:')) {
    return '';
  }

  // 1. Static asset atau preview blob sementara
  if (trimmed.startsWith('blob:') || trimmed.startsWith('/assets/')) {
    return trimmed;
  }

  const bucketName = _resolvedActiveBucket || BUKTI_TRANSFER_BUCKET;
  const envUrl = getSupabaseUrl().replace(/\/+$/, '');

  // 2. If it is already a full HTTP/HTTPS URL, allow ONLY valid Supabase Storage URLs
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    if (!isSupabaseStorageUrl(trimmed)) {
      return '';
    }
    const extracted = extractStoragePath(trimmed);
    if (!extracted) {
      return '';
    }
    // Pertahankan URL public Supabase Storage lengkap (jika bukan signed/authenticated token)
    if (trimmed.includes('/storage/v1/object/public/') && !trimmed.includes('?token=')) {
      return trimmed;
    }
    if (envUrl) {
      const bucketMatch = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\//);
      const urlBucket = bucketMatch?.[1] || bucketName;
      return `${envUrl}/storage/v1/object/public/${urlBucket}/${extracted}`;
    }
    return trimmed;
  }

  // 3. Relative storage path (e.g. "2026/04/T260421001-hvubbk.webp")
  const path = extractStoragePath(trimmed);
  if (!path) return '';

  if (!envUrl) {
    return `https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/${bucketName}/${path}`;
  }
  return `${envUrl}/storage/v1/object/public/${bucketName}/${path}`;
}

/**
 * Checks if a file path or URL points to an image format.
 */
export function isImageFile(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const clean = urlOrPath.split('?')[0].toLowerCase().trim();
  if (clean.startsWith('data:image/')) return true;
  return (
    clean.endsWith('.jpg') ||
    clean.endsWith('.jpeg') ||
    clean.endsWith('.png') ||
    clean.endsWith('.webp') ||
    clean.endsWith('.gif') ||
    clean.endsWith('.svg') ||
    clean.endsWith('.bmp') ||
    clean.endsWith('.avif')
  );
}

/**
 * Checks if a file path or URL points to a PDF document.
 */
export function isPdfFile(urlOrPath?: string | null): boolean {
  if (!urlOrPath) return false;
  const clean = urlOrPath.split('?')[0].toLowerCase().trim();
  return clean.endsWith('.pdf') || clean.startsWith('data:application/pdf');
}

export type SignedProofFailureReason =
  | 'INVALID_REF'
  | 'NO_SESSION'
  | 'RLS_DENIED'
  | 'NOT_FOUND'
  | 'MISSING_SERVICE_KEY'
  | 'API_UNAVAILABLE';

export interface SignedProofUrlResult {
  signedUrl: string | null;
  reason?: SignedProofFailureReason;
  errorMessage?: string;
}

/**
 * Membuat Signed URL sementara (default 1 jam = 3600 detik) untuk bucket privat 'bukti-transfer' / 'bukti_transfer'
 * dan mengembalikan diagnosa penyebab jika gagal dibuat.
 */
export async function getSignedProofUrlDetailed(
  storagePathOrUrl?: string | null,
  options?: {
    expiresIn?: number;
    memberNo?: string;
    memberName?: string;
    transactionNo?: string;
    allowPublicBucketProbe?: boolean;
  }
): Promise<SignedProofUrlResult> {
  if (!storagePathOrUrl) {
    return { signedUrl: null, reason: 'INVALID_REF', errorMessage: 'Referensi berkas bukti kosong.' };
  }
  const trimmed = storagePathOrUrl.trim();
  if (!trimmed || trimmed === '-' || trimmed === 'null' || trimmed === 'undefined' || trimmed === 'none') {
    return { signedUrl: null, reason: 'INVALID_REF', errorMessage: 'Referensi berkas bukti belum tersedia.' };
  }

  // Tolak URL legacy Google Drive & Base64 Data URI
  if (isGoogleDriveUrl(trimmed) || trimmed.startsWith('data:')) {
    console.error('[Storage] Menolak referensi bukti non-Supabase (Google Drive / Base64):', trimmed.slice(0, 60));
    return {
      signedUrl: null,
      reason: 'INVALID_REF',
      errorMessage: 'Referensi lampiran bukan berasal dari Supabase Storage.',
    };
  }

  // Izinkan preview blob lokal atau aset statis aplikasi
  if (trimmed.startsWith('blob:') || trimmed.startsWith('/assets/')) {
    return { signedUrl: trimmed };
  }

  // Jika sudah berupa Signed URL aktif yang memiliki token
  if (trimmed.includes('/storage/v1/object/sign/') && trimmed.includes('token=')) {
    return { signedUrl: trimmed };
  }

  const expiresIn = Math.max(60, Math.min(86400, options?.expiresIn || 3600));
  const extractedPath = extractStoragePath(trimmed);
  if (!extractedPath) {
    console.error('[Storage] Gagal mengekstrak object path dari referensi bukti:', trimmed);
    return {
      signedUrl: null,
      reason: 'INVALID_REF',
      errorMessage: 'Format path berkas bukti storage tidak valid.',
    };
  }

  const bucketMatch = trimmed.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^\/]+)\//);
  const urlBucket = bucketMatch?.[1];
  const bucketsToTry = Array.from(
    new Set([urlBucket, _resolvedActiveBucket, BUKTI_TRANSFER_BUCKET, LEGACY_BUKTI_BUCKET].filter(Boolean) as string[])
  );

  const client = getSupabaseClient();
  let accessToken = '';
  let hasClientSession = false;
  let clientRlsDenied = false;
  let clientNotFound = false;

  // 1. Prioritas: gunakan Supabase client createSignedUrl jika user memiliki sesi authenticated
  if (client) {
    try {
      const { data: sessionData } = await client.auth.getSession();
      accessToken = sessionData?.session?.access_token || '';
      hasClientSession = Boolean(sessionData?.session?.user);

      if (hasClientSession) {
        for (const bucket of bucketsToTry) {
          const { data, error } = await client.storage
            .from(bucket)
            .createSignedUrl(extractedPath, expiresIn);

          if (!error && data?.signedUrl) {
            return { signedUrl: data.signedUrl };
          }
          if (error) {
            const msg = (error.message || '').toLowerCase();
            console.warn(`[Storage] createSignedUrl("${bucket}/${extractedPath}") gagal:`, error.message);
            if (msg.includes('row-level security') || msg.includes('policy') || msg.includes('unauthorized') || msg.includes('forbidden')) {
              clientRlsDenied = true;
            } else if (msg.includes('not found') || msg.includes('object not found')) {
              clientNotFound = true;
            }
          }
        }

        // Jika file tidak ditemukan di path persis dan transactionNo tersedia, coba cari di folder bucket
        if (clientNotFound && !clientRlsDenied && options?.transactionNo) {
          try {
            const discovered = await findProofInBucketByTransactionNo(options.transactionNo);
            if (discovered.found && discovered.path) {
              const targetBucket = discovered.bucketName || urlBucket || BUKTI_TRANSFER_BUCKET;
              const { data: retryData } = await client.storage
                .from(targetBucket)
                .createSignedUrl(discovered.path, expiresIn);
              if (retryData?.signedUrl) {
                return { signedUrl: retryData.signedUrl };
              }
            }
          } catch {
            // abaikan dan lanjut ke server fallback
          }
        }
      }
    } catch (err) {
      console.warn('[Storage] Exception saat createSignedUrl via client:', err);
    }
  }

  let serverReason: SignedProofFailureReason | undefined = hasClientSession
    ? clientRlsDenied
      ? 'RLS_DENIED'
      : clientNotFound
        ? 'NOT_FOUND'
        : undefined
    : 'NO_SESSION';
  let serverErrorMsg: string | undefined;

  // 2. Fallback terkontrol via endpoint backend (/api/storage/signed-url) untuk sesi anggota / cross-bucket
  if (typeof fetch !== 'undefined' && typeof window !== 'undefined') {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
      const resp = await fetch('/api/storage/signed-url', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          pathOrUrl: trimmed,
          bucket: urlBucket || BUKTI_TRANSFER_BUCKET,
          expiresIn,
          memberNo: options?.memberNo || '',
          memberName: options?.memberName || '',
          transactionNo: options?.transactionNo || '',
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.success && json?.signedUrl) {
          return { signedUrl: json.signedUrl };
        }
      } else {
        const errText = await resp.text().catch(() => '');
        let errJson: any = null;
        try {
          errJson = errText ? JSON.parse(errText) : null;
        } catch {
          errJson = null;
        }
        console.error('[Storage] Endpoint /api/storage/signed-url menolak permintaan:', resp.status, errText);

        const code = String(errJson?.code || '').toUpperCase();
        if (code === 'MISSING_SERVICE_KEY') {
          serverReason = 'MISSING_SERVICE_KEY';
          serverErrorMsg = errJson?.error || 'SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi di server.';
        } else if (code === 'FORBIDDEN' || resp.status === 403) {
          serverReason = 'RLS_DENIED';
          serverErrorMsg = errJson?.error || 'Akses berkas bukti ditolak oleh kebijakan keamanan (RLS).';
        } else if (code === 'NOT_FOUND') {
          serverReason = 'NOT_FOUND';
          serverErrorMsg = errJson?.error || 'Berkas bukti tidak ditemukan di bucket Supabase Storage.';
        } else if (resp.status === 404 && !errJson) {
          serverReason = 'API_UNAVAILABLE';
          serverErrorMsg = 'Endpoint API /api/storage/signed-url tidak aktif pada deployment saat ini.';
        } else if (code === 'UNAUTHORIZED' || resp.status === 401) {
          serverReason = hasClientSession ? 'RLS_DENIED' : 'NO_SESSION';
          serverErrorMsg = errJson?.error || 'Sesi autentikasi Supabase Auth belum aktif.';
        }
      }
    } catch (apiErr) {
      console.warn('[Storage] Gagal memanggil /api/storage/signed-url:', apiErr);
      if (!serverReason || serverReason === 'NO_SESSION') {
        serverReason = 'API_UNAVAILABLE';
      }
    }
  }

  // 3. Probe terkontrol HANYA jika Signed URL gagal karena sesi/API/Service Key (BUKAN ditolak RLS/FORBIDDEN)
  //    Jika bucket di Supabase memang diset public=TRUE dan URL /object/public/ dapat diakses (HTTP 200), tampilkan gambar.
  //    Jika bucket privat (public=FALSE), Supabase menolak akses langsung sehingga fallback tetap diblokir dengan aman.
  const canProbePublicBucket =
    options?.allowPublicBucketProbe !== false &&
    typeof fetch !== 'undefined' &&
    typeof window !== 'undefined' &&
    !clientRlsDenied &&
    serverReason !== 'RLS_DENIED' &&
    serverReason !== 'NOT_FOUND' &&
    (serverReason === 'NO_SESSION' ||
      serverReason === 'MISSING_SERVICE_KEY' ||
      serverReason === 'API_UNAVAILABLE');

  if (canProbePublicBucket) {
    const envUrl = getSupabaseUrl().replace(/\/+$/, '');
    const probeUrls = Array.from(
      new Set(
        [
          trimmed.includes('/storage/v1/object/public/') ? trimmed : '',
          ...(envUrl
            ? bucketsToTry.map((b) => `${envUrl}/storage/v1/object/public/${b}/${extractedPath}`)
            : []),
        ].filter(Boolean)
      )
    );

    for (const candidateUrl of probeUrls) {
      try {
        const headResp = await fetch(candidateUrl, { method: 'HEAD' });
        if (headResp.ok) {
          return { signedUrl: candidateUrl };
        }
      } catch {
        // abaikan error CORS/network saat probe
      }
    }
  }

  const defaultMessages: Record<SignedProofFailureReason, string> = {
    INVALID_REF: 'Referensi berkas bukti storage tidak valid.',
    NO_SESSION:
      'Sesi Supabase Auth anggota belum aktif dan layanan Signed URL server belum merespons. Pastikan migrasi SQL 000002–000004 serta SUPABASE_SERVICE_ROLE_KEY sudah dikonfigurasi.',
    MISSING_SERVICE_KEY:
      'SUPABASE_SERVICE_ROLE_KEY belum diisi di environment variable server/Vercel sehingga Signed URL bucket privat tidak dapat diterbitkan.',
    API_UNAVAILABLE:
      'Endpoint Signed URL (/api/storage/signed-url) tidak terjangkau dan sesi Supabase Auth belum aktif.',
    RLS_DENIED:
      'Akses berkas bukti ditolak oleh kebijakan keamanan RLS Supabase Storage. Pastikan akun berhak atas transaksi ini dan migrasi SQL terbaru sudah dijalankan.',
    NOT_FOUND: `Berkas "${extractedPath}" tidak ditemukan di bucket Supabase Storage (${bucketsToTry.join(' / ')}).`,
  };

  const finalReason = serverReason || 'RLS_DENIED';
  const finalMessage = serverErrorMsg || defaultMessages[finalReason];

  console.error('[Storage] Bukti transfer tidak dapat dibuatkan Signed URL yang valid:', {
    input: trimmed,
    extractedPath,
    bucketsTried: bucketsToTry,
    reason: finalReason,
    message: finalMessage,
  });

  return {
    signedUrl: null,
    reason: finalReason,
    errorMessage: finalMessage,
  };
}

/**
 * Membuat Signed URL sementara (default 1 jam = 3600 detik) untuk bucket privat 'bukti-transfer' / 'bukti_transfer'.
 * Menggunakan Supabase Storage createSignedUrl() jika user memiliki sesi authenticated,
 * dengan fallback ke endpoint server (/api/storage/signed-url) agar role ANGGOTA tetap dapat
 * melihat bukti miliknya secara aman di bucket privat.
 */
export async function getSignedProofUrl(
  storagePathOrUrl?: string | null,
  options?: { expiresIn?: number; memberNo?: string; memberName?: string; transactionNo?: string }
): Promise<string | null> {
  const res = await getSignedProofUrlDetailed(storagePathOrUrl, options);
  return res.signedUrl;
}

/**
 * Mengonversi Data URI Base64 lama menjadi objek File agar dapat diunggah ke Supabase Storage.
 */
export function dataUrlToFile(dataUrl: string, defaultBaseName: string = 'bukti-migrasi'): File | null {
  if (!dataUrl || !dataUrl.startsWith('data:') || !dataUrl.includes(',')) return null;
  try {
    const [header, base64] = dataUrl.split(',');
    const mimeMatch = header.match(/data:([^;]+);base64/i);
    const mime = mimeMatch?.[1] || 'image/webp';
    const ext = mime.includes('png') ? 'png' : mime.includes('pdf') ? 'pdf' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : 'webp';
    const binaryStr = atob(base64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    const safeName = `${defaultBaseName.replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`;
    return new File([bytes], safeName, { type: mime });
  } catch {
    return null;
  }
}

async function fileToDataUrl(file: File | Blob): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Mengunggah berkas (pendaftaran, investasi, setoran, avatar, berita, migrasi) ke bucket Supabase Storage 'bukti_transfer'.
 * Tidak pernah menyimpan file sebagai base64 ke database/browser.
 */
export async function uploadMemberProof(
  file: File | Blob,
  folderPrefix: 'pendaftaran' | 'investasi' | 'setoran' | 'avatar' | 'berita' | 'migrasi',
  refId: string,
  originalFileName?: string
): Promise<{ success: boolean; fileUrl?: string; storagePath?: string; error?: string; source?: 'SUPABASE' | 'SERVER' }> {
  const client = getSupabaseClient();
  const rawName = originalFileName || (file instanceof File ? file.name : 'bukti_transfer.webp');
  const fileExt = (rawName.split('.').pop()?.toLowerCase() || (file.type?.includes('webp') ? 'webp' : 'jpg')).replace(/[^a-z0-9]/g, '') || 'webp';
  const cleanRefId = (refId || 'DOC').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${cleanRefId}_${Date.now()}.${fileExt}`;
  const storagePath = `${folderPrefix}/${fileName}`;
  const mimeType = file.type || (fileExt === 'pdf' ? 'application/pdf' : fileExt === 'webp' ? 'image/webp' : 'image/jpeg');

  // 1. Upload langsung ke Supabase Storage bucket utama ('bukti_transfer', fallback 'bukti-transfer' hanya jika perlu)
  if (client) {
    const bucketsToTry = Array.from(new Set([BUKTI_TRANSFER_BUCKET, LEGACY_BUKTI_BUCKET]));
    for (const targetBucket of bucketsToTry) {
      try {
        const uploadRes = await client.storage
          .from(targetBucket)
          .upload(storagePath, file, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
          });

        if (!uploadRes.error && uploadRes.data) {
          _resolvedActiveBucket = targetBucket;
          const savedPath = uploadRes.data.path || storagePath;
          const { data: urlData } = client.storage
            .from(targetBucket)
            .getPublicUrl(savedPath);

          const publicUrl = urlData?.publicUrl || getPublicProofUrl(savedPath);
          return {
            success: true,
            fileUrl: publicUrl,
            storagePath: savedPath,
            source: 'SUPABASE',
          };
        }
        console.warn(`[Storage] Upload to "${targetBucket}" returned error:`, uploadRes.error?.message);
      } catch (err) {
        console.warn(`[Storage] Upload to "${targetBucket}" exception:`, err);
      }
    }
  }

  // 2. Server-side upload proxy (/api/storage/upload-proof) jika tersedia (hanya mengirim ke Supabase Storage, bukan return Data URL)
  try {
    if (typeof FileReader !== 'undefined' && typeof fetch !== 'undefined') {
      const dataUrl = await fileToDataUrl(file);
      const resp = await fetch('/api/storage/upload-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: storagePath,
          mimeType,
          dataUrl,
        }),
      });
      if (resp.ok) {
        const json = await resp.json();
        if (json?.success && json?.publicUrl && !String(json.publicUrl).startsWith('data:')) {
          return {
            success: true,
            fileUrl: json.publicUrl,
            storagePath: json.path || storagePath,
            source: 'SERVER',
          };
        }
      }
    }
  } catch (err) {
    console.warn('[Storage] Server upload proxy error:', err);
  }

  return {
    success: false,
    error: 'Gagal mengunggah berkas ke Supabase Storage (bucket bukti_transfer). Pastikan Anda sudah login dan policy Storage aktif.',
  };
}

/**
 * Upload bukti transfer pendaftaran anggota baru ke bucket bukti_transfer
 */
export async function uploadPublicRegistrationProof(
  file: File | Blob,
  memberId: string,
  originalFileName?: string
): Promise<{ success: boolean; fileUrl?: string; storagePath?: string; error?: string }> {
  return uploadMemberProof(file, 'pendaftaran', memberId, originalFileName);
}
