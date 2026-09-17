-- =========================================================
-- MIGRASI SINKRONISASI BUKTI TRANSFER (STORAGE BUKTI_TRANSFER)
-- Berdasarkan berkas fisik yang ada di Supabase Storage bucket 'bukti_transfer'
-- Disesuaikan dengan nomor transaksi (transaction_no / id)
-- Tanggal: 2026-09-17
-- =========================================================

-- 1. Pastikan kolom file_url ada di tabel transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'transactions' 
          AND column_name = 'file_url'
    ) THEN
        ALTER TABLE public.transactions ADD COLUMN file_url TEXT;
    END IF;
END $$;

-- 2. Update file_url untuk 22 nomor transaksi yang memiliki berkas fisik di bucket bukti_transfer
-- Format: https://<project-id>.supabase.co/storage/v1/object/public/bukti_transfer/{path}

-- Transaksi Desember 2025
UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229001-jnpf6q.webp',
    updated_at = NOW()
WHERE transaction_no = 'T251229001' OR id::text = 'T251229001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229002-1cpdp8.webp',
    updated_at = NOW()
WHERE transaction_no = 'T251229002' OR id::text = 'T251229002';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229003-7nucag.webp',
    updated_at = NOW()
WHERE transaction_no = 'T251229003' OR id::text = 'T251229003';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2025/12/T251229004-9j1797.webp',
    updated_at = NOW()
WHERE transaction_no = 'T251229004' OR id::text = 'T251229004';

-- Transaksi Februari 2026
UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260202001-80nnro.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260202001' OR id::text = 'T260202001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/02/T260220001-b97crn.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260220001' OR id::text = 'T260220001';

-- Transaksi Maret 2026
UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260318001-z6lluv.jpg',
    updated_at = NOW()
WHERE transaction_no = 'T260318001' OR id::text = 'T260318001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260320001-ou4pzo.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260320001' OR id::text = 'T260320001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330005-vumfjf.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260330005' OR id::text = 'T260330005';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330015-tgragl.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260330015' OR id::text = 'T260330015';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330016-1o9y4o.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260330016' OR id::text = 'T260330016';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/03/T260330017-mt0mvt.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260330017' OR id::text = 'T260330017';

-- Transaksi April 2026
UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260402001-lpf5ns.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260402001' OR id::text = 'T260402001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260410001-at9nrs.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260410001' OR id::text = 'T260410001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413001-51ezrd.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260413001' OR id::text = 'T260413001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413002-7n8q5r.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260413002' OR id::text = 'T260413002';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413003-dvrho5.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260413003' OR id::text = 'T260413003';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413004-hekedv.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260413004' OR id::text = 'T260413004';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260413005-bqu8c7.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260413005' OR id::text = 'T260413005';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417001-8t4df6.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260417001' OR id::text = 'T260417001';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260417002-7yw8js.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260417002' OR id::text = 'T260417002';

UPDATE public.transactions 
SET file_url = 'https://iqamratpkvnyyayjpnsu.supabase.co/storage/v1/object/public/bukti_transfer/2026/04/T260421001-hvubbk.webp',
    updated_at = NOW()
WHERE transaction_no = 'T260421001' OR id::text = 'T260421001';

-- 3. Verifikasi hasil pembaruan
SELECT 
    transaction_no, 
    date, 
    amount, 
    file_url,
    updated_at
FROM public.transactions
WHERE file_url IS NOT NULL AND file_url != ''
ORDER BY transaction_no ASC;
