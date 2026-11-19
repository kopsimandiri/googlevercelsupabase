-- ==============================================================================
-- KOPSIM MANDIRI: PEMBERSIHAN URL GOOGLE DRIVE LEGACY & SINKRONISASI SUPABASE STORAGE
-- Migration: 20260919000001_clean_legacy_gdrive_proof_urls.sql
-- Tujuan:
--   1. Memastikan baris split transaksi (mis. T251229001-1) terhubung ke berkas
--      Supabase Storage bucket 'bukti_transfer'.
--   2. Memetakan bukti transfer pendaftaran anggota awal (1121-00001 s.d. 1121-00004)
--      ke URL Supabase Storage 'bukti_transfer'.
--   3. Membersihkan seluruh sisa tautan Google Drive / Google Docs / Apps Script
--      dari kolom file_url, transfer_proof_url, dan payment_proof_url.
--   4. Memperkuat RPC get_member_registration_proof agar mengabaikan tautan non-Supabase.
-- ==============================================================================

-- 1. Sinkronkan ulang baris transaksi (termasuk sub-transaksi split "-1", "-2", dst.) ke Supabase Storage
WITH known_proofs (trx_prefix, storage_url) AS (
  VALUES
    ('T251229001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229001-jnpf6q.webp'),
    ('T251229002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229002-1cpdp8.webp'),
    ('T251229003', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229003-7nucag.webp'),
    ('T251229004', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229004-9j1797.webp'),
    ('T260202001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260202001-80nnro.webp'),
    ('T260220001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260220001-b97crn.webp'),
    ('T260318001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260318001-z6lluv.jpg'),
    ('T260320001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260320001-ou4pzo.webp'),
    ('T260330005', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330005-vumfjf.webp'),
    ('T260330015', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330015-tgragl.webp'),
    ('T260330016', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330016-1o9y4o.webp'),
    ('T260330017', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330017-mt0mvt.webp'),
    ('T260402001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260402001-lpf5ns.webp'),
    ('T260410001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260410001-at9nrs.webp'),
    ('T260413001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413001-51ezrd.webp'),
    ('T260413002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413002-7n8q5r.webp'),
    ('T260413003', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413003-dvrho5.webp'),
    ('T260413004', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413004-hekedv.webp'),
    ('T260413005', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413005-bqu8c7.webp'),
    ('T260417001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417001-8t4df6.webp'),
    ('T260417002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417002-7yw8js.webp'),
    ('T260421001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260421001-hvubbk.webp')
)
UPDATE public.transactions t
SET file_url = kp.storage_url,
    updated_at = NOW()
FROM known_proofs kp
WHERE (
  t.transaction_no = kp.trx_prefix
  OR t.transaction_no LIKE kp.trx_prefix || '-%'
  OR t.id::text = kp.trx_prefix
)
AND (
  COALESCE(t.file_url, '') = ''
  OR t.file_url NOT LIKE '%/storage/v1/object/%'
);

-- 2. Sinkronkan transfer_proof_url untuk anggota awal yang memiliki berkas terverifikasi di Supabase Storage
WITH member_proofs (member_no, storage_url) AS (
  VALUES
    ('1121-00001', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229001-jnpf6q.webp'),
    ('1121-00002', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229002-1cpdp8.webp'),
    ('1121-00003', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229003-7nucag.webp'),
    ('1121-00004', 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229004-9j1797.webp')
)
UPDATE public.member_registrations mr
SET transfer_proof_url = mp.storage_url
FROM member_proofs mp
WHERE LOWER(COALESCE(mr.member_no, '')) = LOWER(mp.member_no)
  AND (
    COALESCE(mr.transfer_proof_url, '') = ''
    OR mr.transfer_proof_url ILIKE '%drive.google.com%'
    OR mr.transfer_proof_url ILIKE '%docs.google.com%'
    OR mr.transfer_proof_url ILIKE '%googleusercontent.com%'
  );

-- 3. Bersihkan sisa tautan Google Drive / Google Docs pada tabel transactions, member_registrations, dan investment_transactions
UPDATE public.transactions
SET file_url = '',
    updated_at = NOW()
WHERE file_url ILIKE '%drive.google.com%'
   OR file_url ILIKE '%docs.google.com%'
   OR file_url ILIKE '%googleusercontent.com%'
   OR file_url ILIKE '%script.google.com%';

UPDATE public.member_registrations
SET transfer_proof_url = ''
WHERE transfer_proof_url ILIKE '%drive.google.com%'
   OR transfer_proof_url ILIKE '%docs.google.com%'
   OR transfer_proof_url ILIKE '%googleusercontent.com%'
   OR transfer_proof_url ILIKE '%script.google.com%';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'investment_transactions'
  ) THEN
    UPDATE public.investment_transactions
    SET payment_proof_url = '',
        updated_at = NOW()
    WHERE payment_proof_url ILIKE '%drive.google.com%'
       OR payment_proof_url ILIKE '%docs.google.com%'
       OR payment_proof_url ILIKE '%googleusercontent.com%'
       OR payment_proof_url ILIKE '%script.google.com%';
  END IF;
END $$;

-- 4. Perkuat RPC get_member_registration_proof agar hanya mengembalikan URL non-Google-Drive
CREATE OR REPLACE FUNCTION public.get_member_registration_proof(
  p_member_no text,
  p_member_name text DEFAULT ''
)
RETURNS text AS $$
DECLARE
  v_proof text;
  v_no text := LOWER(TRIM(COALESCE(p_member_no, '')));
  v_name text := LOWER(TRIM(COALESCE(p_member_name, '')));
BEGIN
  SELECT mr.transfer_proof_url INTO v_proof
  FROM public.member_registrations mr
  WHERE COALESCE(mr.transfer_proof_url, '') <> ''
    AND mr.transfer_proof_url NOT ILIKE '%drive.google.com%'
    AND mr.transfer_proof_url NOT ILIKE '%docs.google.com%'
    AND mr.transfer_proof_url NOT ILIKE '%googleusercontent.com%'
    AND mr.transfer_proof_url NOT ILIKE '%script.google.com%'
    AND (
      (v_no <> '' AND LOWER(COALESCE(mr.member_no, '')) = v_no)
      OR (LENGTH(v_name) >= 3 AND LOWER(TRIM(mr.full_name)) = v_name)
    )
  ORDER BY mr.submitted_at DESC NULLS LAST, mr.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_proof, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;
