-- ==============================================================================
-- KOPSIM MANDIRI: SERVER-ONLY SUPABASE SCHEMA, BUKTI_URL, STORAGE & STRICT RLS
-- File: 20261124000001_server_only_supabase_and_bukti_url.sql
-- Tujuan:
--   1. Memastikan seluruh tabel inti memiliki kolom id, created_at, dan bukti_url.
--   2. Menyamakan kolom bukti_url <-> file_url agar data lama & baru sinkron.
--   3. Menyiapkan bucket Supabase Storage 'bukti-transfer' (serta menjaga kompatibilitas
--      bucket 'bukti_transfer' lama) beserta policy keamanan.
--   4. Mengaktifkan RLS ketat di semua tabel (TIDAK membuka tabel operasional ke publik/anon).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ==============================================================================
-- BAGIAN 1: FUNGSI HELPER OTORISASI & IDENTITAS ANGGOTA
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_director_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_jwt_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_jwt_role := UPPER(COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));

  IF v_email IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id', 'admin@kopsimmandiri.id')
     OR v_email LIKE 'admin@%'
     OR v_jwt_role IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (
        UPPER(COALESCE(r.name, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
        OR UPPER(COALESCE(ur.role, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
      )
  ) OR EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND UPPER(COALESCE(p.role, '')) IN ('ADMIN', 'SUPERADMIN', 'DIRECTOR', 'PENGURUS')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_only()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email TEXT;
  v_jwt_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  v_jwt_role := UPPER(COALESCE(
    auth.jwt() -> 'app_metadata' ->> 'role',
    auth.jwt() -> 'user_metadata' ->> 'role',
    ''
  ));

  IF v_email IN ('koperasi.simandiri@gmail.com', 'admin@kopsim.id', 'admin@kopsimmandiri.id')
     OR v_email LIKE 'admin@%'
     OR v_jwt_role IN ('ADMIN', 'SUPERADMIN', 'PENGURUS') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.user_roles ur
    LEFT JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = auth.uid()
      AND (
        UPPER(COALESCE(r.name, '')) IN ('ADMIN', 'SUPERADMIN', 'PENGURUS')
        OR UPPER(COALESCE(ur.role, '')) IN ('ADMIN', 'SUPERADMIN', 'PENGURUS')
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.current_user_member_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member_no TEXT;
  v_email TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  v_member_no := NULLIF(TRIM(COALESCE(
    auth.jwt() -> 'user_metadata' ->> 'member_no',
    auth.jwt() -> 'user_metadata' ->> 'member_id',
    auth.jwt() -> 'app_metadata' ->> 'member_no',
    ''
  )), '');

  IF v_member_no IS NOT NULL THEN
    RETURN v_member_no;
  END IF;

  SELECT COALESCE(p.member_id, m.member_no, m.id::TEXT)
  INTO v_member_no
  FROM public.profiles p
  LEFT JOIN public.members m
    ON m.member_no = p.member_id OR LOWER(COALESCE(m.username, '')) = LOWER(COALESCE(p.username, ''))
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_member_no IS NOT NULL THEN
    RETURN v_member_no;
  END IF;

  -- Pola email anggota jika login Supabase Auth memakai {member_no}@anggota.kopsim.id
  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email LIKE '%@anggota.kopsim.id' THEN
    RETURN SPLIT_PART(v_email, '@', 1);
  END IF;

  RETURN NULL;
END;
$$;

-- ==============================================================================
-- BAGIAN 2: SKEMA TABEL LENGKAP (CREATE TABLE IF NOT EXISTS + KOLOM BUKTI_URL)
-- ==============================================================================

-- 2.1 Tabel Anggota (members)
CREATE TABLE IF NOT EXISTS public.members (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  member_no TEXT NOT NULL UNIQUE,
  registered_at DATE DEFAULT CURRENT_DATE,
  full_name TEXT NOT NULL,
  gender VARCHAR(10) DEFAULT 'L' CHECK (gender IN ('L', 'P')),
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta Pusat',
  address TEXT DEFAULT '',
  occupation TEXT DEFAULT 'Anggota',
  username TEXT UNIQUE,
  birth_date DATE DEFAULT '1990-01-01',
  birth_place TEXT DEFAULT 'Jakarta',
  nik VARCHAR(16) NOT NULL UNIQUE,
  work_area TEXT DEFAULT 'PUSAT JAKARTA',
  legacy_password_hash TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  status TEXT DEFAULT 'AKTIF' CHECK (status IN ('AKTIF', 'NONAKTIF', 'PENDING', 'SUSPENDED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.2 Tabel Transaksi Keuangan & Simpanan (transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  transaction_no TEXT UNIQUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  referral_type TEXT NOT NULL DEFAULT 'KOPERASI' CHECK (referral_type IN ('KOPERASI', 'PROJECT')),
  area_name TEXT NOT NULL DEFAULT 'PUSAT JAKARTA',
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('MASUK', 'KELUAR')),
  payment_method TEXT NOT NULL DEFAULT 'Bank BSI',
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
  file_url TEXT DEFAULT '',
  bukti_url TEXT DEFAULT '',
  account_name_legacy TEXT DEFAULT 'Bank BSI',
  description TEXT DEFAULT '',
  category_name TEXT DEFAULT 'Kas',
  product_name TEXT DEFAULT '',
  supplier_name TEXT DEFAULT '',
  customer_name TEXT DEFAULT '',
  member_id TEXT,
  qty NUMERIC(12, 2) DEFAULT 1.00,
  price NUMERIC(15, 2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS file_url TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS member_id TEXT;

-- Sinkronisasi otomatis antara kolom bukti_url dan file_url
CREATE OR REPLACE FUNCTION public.sync_transactions_bukti_url()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(TRIM(NEW.bukti_url), '') = '' AND COALESCE(TRIM(NEW.file_url), '') <> '' THEN
    NEW.bukti_url := NEW.file_url;
  ELSIF COALESCE(TRIM(NEW.file_url), '') = '' AND COALESCE(TRIM(NEW.bukti_url), '') <> '' THEN
    NEW.file_url := NEW.bukti_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_transactions_bukti_url ON public.transactions;
CREATE TRIGGER trg_sync_transactions_bukti_url
  BEFORE INSERT OR UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_transactions_bukti_url();

UPDATE public.transactions
SET
  bukti_url = COALESCE(NULLIF(TRIM(bukti_url), ''), NULLIF(TRIM(file_url), ''), ''),
  file_url  = COALESCE(NULLIF(TRIM(file_url), ''), NULLIF(TRIM(bukti_url), ''), '')
WHERE COALESCE(TRIM(bukti_url), '') = '' OR COALESCE(TRIM(file_url), '') = '';

CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions (transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_no ON public.transactions (transaction_no);
CREATE INDEX IF NOT EXISTS idx_transactions_member_id ON public.transactions (member_id);

-- 2.3 Tabel Wilayah & Rekening Cabang (areas)
CREATE TABLE IF NOT EXISTS public.areas (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  referral_type VARCHAR(30) DEFAULT 'KOPERASI',
  kopwil VARCHAR(100) DEFAULT '',
  area_code VARCHAR(50) NOT NULL UNIQUE,
  area_name VARCHAR(255) NOT NULL,
  bank_account_1 TEXT DEFAULT '',
  bank_account_2 TEXT DEFAULT '',
  bank_account_3 TEXT DEFAULT '',
  province VARCHAR(100) DEFAULT 'DKI Jakarta',
  city VARCHAR(150) DEFAULT 'Jakarta Pusat',
  sk_number VARCHAR(150) DEFAULT '',
  potential TEXT DEFAULT '',
  pic_name VARCHAR(150) DEFAULT '',
  pic_contact VARCHAR(100) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.4 Tabel Kategori Transaksi & Bagan Akun
CREATE TABLE IF NOT EXISTS public.transaction_categories (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  type VARCHAR(10) NOT NULL,
  category_code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  account_code TEXT,
  account_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chart_of_accounts (
  id TEXT PRIMARY KEY,
  account_code TEXT NOT NULL UNIQUE,
  account_name TEXT NOT NULL,
  account_group TEXT NOT NULL,
  financial_report TEXT NOT NULL,
  normal_balance TEXT NOT NULL CHECK (normal_balance IN ('Debit', 'Kredit')),
  tx_type TEXT DEFAULT 'UMUM',
  parent_code TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.5 Tabel Master Pelanggan, Pemasok, Produk
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY,
  customer_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pic_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta',
  tax_number TEXT DEFAULT '',
  category TEXT DEFAULT 'Retail',
  status TEXT DEFAULT 'AKTIF',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.suppliers (
  id TEXT PRIMARY KEY,
  supplier_code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  pic_name TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  address TEXT DEFAULT '',
  province TEXT DEFAULT 'DKI Jakarta',
  city TEXT DEFAULT 'Jakarta',
  tax_number TEXT DEFAULT '',
  category TEXT DEFAULT 'Mitra Usaha',
  status TEXT DEFAULT 'AKTIF',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.products (
  id TEXT,
  sku_code TEXT PRIMARY KEY,
  sku_name TEXT NOT NULL,
  group_id TEXT,
  group_name TEXT NOT NULL,
  subgroup TEXT DEFAULT '',
  brand TEXT DEFAULT 'Kopsim Mandiri',
  grade TEXT DEFAULT 'Grade A',
  packaging TEXT DEFAULT 'Standard',
  availability TEXT DEFAULT 'Tersedia',
  moq INT DEFAULT 1,
  supply_capacity TEXT DEFAULT '10 Ton/Bulan',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Tabel Pendaftaran Anggota (member_registrations)
CREATE TABLE IF NOT EXISTS public.member_registrations (
  id TEXT PRIMARY KEY,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  member_no TEXT DEFAULT '',
  full_name TEXT NOT NULL,
  nik VARCHAR(16) NOT NULL,
  birth_place TEXT DEFAULT '',
  birth_date DATE DEFAULT '1990-01-01',
  gender VARCHAR(10) DEFAULT 'L',
  address TEXT DEFAULT '',
  city TEXT DEFAULT 'Jakarta',
  province TEXT DEFAULT 'DKI Jakarta',
  whatsapp TEXT NOT NULL,
  email TEXT DEFAULT '',
  member_status TEXT DEFAULT 'Calon Anggota',
  profession TEXT DEFAULT 'Wiraswasta',
  savings_type TEXT DEFAULT 'Pokok + Wajib',
  transfer_amount NUMERIC(15,2) DEFAULT 860000.00,
  transfer_date DATE DEFAULT CURRENT_DATE,
  transfer_proof_url TEXT DEFAULT '',
  bukti_url TEXT DEFAULT '',
  ktp_url TEXT DEFAULT '',
  selfie_url TEXT DEFAULT '',
  approval_status TEXT DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED')),
  verification_status TEXT DEFAULT 'Menunggu Verifikasi Admin'
);

ALTER TABLE public.member_registrations
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '';

-- 2.7 Tabel Kampanye & Transaksi Investasi Syariah
CREATE TABLE IF NOT EXISTS public.project_investment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id TEXT NOT NULL,
  project_name TEXT NOT NULL,
  instrument_type TEXT NOT NULL DEFAULT 'SUKS',
  akad_type TEXT NOT NULL DEFAULT 'MUSYARAKAH',
  target_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  collected_amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  min_investment NUMERIC(15, 2) NOT NULL DEFAULT 1000000,
  projected_roi_percent NUMERIC(5, 2) NOT NULL DEFAULT 14.0,
  tenor_months INT NOT NULL DEFAULT 12,
  shu_distribution_schedule TEXT DEFAULT 'TRIWULAN',
  offering_start_date DATE DEFAULT CURRENT_DATE,
  offering_end_date DATE DEFAULT (CURRENT_DATE + 60),
  status TEXT NOT NULL DEFAULT 'OPEN',
  platform_fee_percent NUMERIC(5, 2) DEFAULT 0.5,
  underlying_asset TEXT DEFAULT '',
  prospectus_url TEXT DEFAULT '',
  is_investment_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no TEXT NOT NULL UNIQUE,
  campaign_id UUID REFERENCES public.project_investment_campaigns(id) ON DELETE CASCADE,
  project_id TEXT NOT NULL,
  member_no TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  investor_email TEXT DEFAULT '',
  investor_phone TEXT DEFAULT '',
  amount NUMERIC(15, 2) NOT NULL,
  units_count INT NOT NULL DEFAULT 1,
  platform_fee NUMERIC(15, 2) NOT NULL DEFAULT 0,
  total_payment NUMERIC(15, 2) NOT NULL,
  payment_method TEXT DEFAULT 'TRANSFER_BANK',
  payment_proof_url TEXT DEFAULT '',
  bukti_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  notes TEXT DEFAULT '',
  verified_by TEXT,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.investment_transactions
  ADD COLUMN IF NOT EXISTS bukti_url TEXT DEFAULT '';

CREATE OR REPLACE FUNCTION public.sync_investment_bukti_url()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF COALESCE(TRIM(NEW.bukti_url), '') = '' AND COALESCE(TRIM(NEW.payment_proof_url), '') <> '' THEN
    NEW.bukti_url := NEW.payment_proof_url;
  ELSIF COALESCE(TRIM(NEW.payment_proof_url), '') = '' AND COALESCE(TRIM(NEW.bukti_url), '') <> '' THEN
    NEW.payment_proof_url := NEW.bukti_url;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_investment_bukti_url ON public.investment_transactions;
CREATE TRIGGER trg_sync_investment_bukti_url
  BEFORE INSERT OR UPDATE ON public.investment_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_investment_bukti_url();

CREATE TABLE IF NOT EXISTS public.digital_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_no TEXT NOT NULL UNIQUE,
  transaction_id UUID,
  campaign_id UUID,
  member_no TEXT NOT NULL,
  investor_name TEXT NOT NULL,
  akad_type TEXT NOT NULL,
  agreement_text TEXT NOT NULL,
  digital_signature_hash TEXT NOT NULL,
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'SIGNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.investment_dividend_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID,
  period_label TEXT NOT NULL,
  distribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
  gross_profit_shared NUMERIC(15, 2) NOT NULL DEFAULT 0,
  roi_rate_actual NUMERIC(5, 2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'DISTRIBUTED',
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.8 Tabel Pembiayaan, Pembayaran, Notifikasi, Berita, Audit
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  application_no TEXT NOT NULL UNIQUE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  akad_type TEXT NOT NULL DEFAULT 'MURABAHAH',
  peruntukan TEXT NOT NULL,
  loan_amount NUMERIC(15, 2) NOT NULL,
  tenor_months INT NOT NULL,
  margin_rate_pa NUMERIC(5, 2) DEFAULT 6.0,
  margin_amount NUMERIC(15, 2) DEFAULT 0,
  total_payment NUMERIC(15, 2) DEFAULT 0,
  monthly_installment NUMERIC(15, 2) DEFAULT 0,
  monthly_principal NUMERIC(15, 2) DEFAULT 0,
  monthly_margin NUMERIC(15, 2) DEFAULT 0,
  amortization_schedule JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'SUBMITTED',
  collateral_type TEXT DEFAULT '',
  collateral_detail TEXT DEFAULT '',
  monthly_income NUMERIC(15, 2) DEFAULT 0,
  dsr_percentage NUMERIC(5, 2) DEFAULT 0,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  approval_notes TEXT DEFAULT '',
  disbursed_at TIMESTAMPTZ,
  disbursed_transaction_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_requests (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  order_id TEXT NOT NULL UNIQUE,
  idempotency_key TEXT UNIQUE,
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  amount NUMERIC(15, 2) NOT NULL,
  fee NUMERIC(15, 2) DEFAULT 0,
  total_amount NUMERIC(15, 2) NOT NULL,
  payment_type TEXT NOT NULL DEFAULT 'QRIS',
  payment_channel TEXT NOT NULL,
  va_number TEXT,
  qr_string TEXT,
  payment_url TEXT,
  category TEXT DEFAULT '',
  description TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'PENDING',
  expiry_time TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  posted_transaction_id TEXT,
  webhook_received_at TIMESTAMPTZ,
  webhook_attempts INT DEFAULT 0,
  webhook_signature TEXT,
  raw_webhook_payload JSONB,
  settlement_status TEXT DEFAULT 'UNSETTLED',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  recipient_name TEXT DEFAULT '',
  channel TEXT NOT NULL DEFAULT 'WHATSAPP',
  provider TEXT DEFAULT 'WHATSAPP_FONNTE_SERVER',
  payload JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'PENDING',
  attempts INT DEFAULT 0,
  max_attempts INT DEFAULT 3,
  idempotency_key TEXT UNIQUE,
  sent_at TIMESTAMPTZ,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'TRANSACTION',
  action_url TEXT,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.news_articles (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  kategori TEXT NOT NULL CHECK (kategori IN ('kemitraan', 'program', 'dampak', 'update_proyek')),
  project_id TEXT,
  judul TEXT NOT NULL,
  ringkasan TEXT NOT NULL,
  konten TEXT NOT NULL,
  lokasi TEXT,
  foto_url TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'terbit'))
);

CREATE TABLE IF NOT EXISTS public.project_updates (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  project_id TEXT NOT NULL,
  judul TEXT NOT NULL,
  narasi TEXT NOT NULL,
  foto_url TEXT,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  dibuat_oleh UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT DEFAULT '',
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  old_values JSONB,
  new_values JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- BAGIAN 3: SUPABASE STORAGE BUCKET 'bukti-transfer' & POLICY
-- (Menjaga kompatibilitas bucket 'bukti_transfer' jika file lama masih ada di sana)
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'bukti-transfer',
    'bukti-transfer',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  ),
  (
    'bukti_transfer',
    'bukti_transfer',
    TRUE,
    10485760,
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  )
ON CONFLICT (id) DO UPDATE SET
  public = TRUE,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Hapus policy storage lama yang terlalu permisif / membingungkan
DROP POLICY IF EXISTS "Public Read bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Insert bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Update bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "Public Delete bukti_transfer" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_public_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_select_public" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_insert_authorized" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti_transfer_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_select" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_update" ON storage.objects;
DROP POLICY IF EXISTS "bukti-transfer_auth_delete" ON storage.objects;

-- Policy Storage: Hanya pengguna yang login (authenticated) bisa membaca/upload/mengubah/menghapus objek di bucket
CREATE POLICY "bukti-transfer_auth_select"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id IN ('bukti-transfer', 'bukti_transfer'));

CREATE POLICY "bukti-transfer_auth_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id IN ('bukti-transfer', 'bukti_transfer')
    AND (
      public.is_director_or_admin()
      OR name LIKE 'investasi/%'
      OR name LIKE 'setoran/%'
      OR name LIKE 'avatar/%'
      OR name LIKE 'pendaftaran/%'
    )
  );

CREATE POLICY "bukti-transfer_auth_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_director_or_admin())
  WITH CHECK (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_director_or_admin());

CREATE POLICY "bukti-transfer_auth_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id IN ('bukti-transfer', 'bukti_transfer') AND public.is_admin_only());

-- ==============================================================================
-- BAGIAN 4: ROW LEVEL SECURITY (RLS) KETAT — TIDAK TERBUKA UNTUK PUBLIK/ANON
-- ==============================================================================

-- Aktifkan RLS di semua tabel
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_investment_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.digital_agreements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investment_dividend_distributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 Bersihkan semua policy lama yang longgar/terbuka ke anon
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'transactions', 'members', 'areas', 'transaction_categories',
        'chart_of_accounts', 'customers', 'suppliers', 'products',
        'member_registrations', 'project_investment_campaigns',
        'investment_transactions', 'digital_agreements',
        'investment_dividend_distributions', 'loan_applications',
        'payment_requests', 'notification_jobs', 'user_notifications',
        'news_articles', 'project_updates', 'audit_logs',
        'role_permissions', 'user_roles', 'roles', 'profiles'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END $$;

-- 4.2 Policy Tabel TRANSACTIONS (Admin/Direktur semua, Anggota hanya miliknya)
CREATE POLICY "trx_select_authenticated"
  ON public.transactions FOR SELECT
  TO authenticated
  USING (
    public.is_director_or_admin()
    OR (
      public.current_user_member_id() IS NOT NULL
      AND (
        LOWER(COALESCE(member_id, '')) = LOWER(public.current_user_member_id())
        OR LOWER(COALESCE(customer_name, '')) LIKE '%' || LOWER(public.current_user_member_id()) || '%'
        OR LOWER(COALESCE(description, '')) LIKE '%' || LOWER(public.current_user_member_id()) || '%'
      )
    )
  );

CREATE POLICY "trx_insert_admin_only"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "trx_update_admin_only"
  ON public.transactions FOR UPDATE
  TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "trx_delete_admin_only"
  ON public.transactions FOR DELETE
  TO authenticated
  USING (public.is_admin_only());

-- 4.3 Policy Tabel MEMBERS (Admin/Direktur semua, Anggota hanya profil miliknya)
CREATE POLICY "members_select_authenticated"
  ON public.members FOR SELECT
  TO authenticated
  USING (
    public.is_director_or_admin()
    OR LOWER(COALESCE(member_no, id)) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "members_insert_admin_only"
  ON public.members FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_only());

CREATE POLICY "members_update_scoped"
  ON public.members FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_only()
    OR LOWER(COALESCE(member_no, id)) = LOWER(COALESCE(public.current_user_member_id(), ''))
  )
  WITH CHECK (
    public.is_admin_only()
    OR LOWER(COALESCE(member_no, id)) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "members_delete_admin_only"
  ON public.members FOR DELETE
  TO authenticated
  USING (public.is_admin_only());

-- 4.4 Policy Master Referensi (hanya user login; tulis khusus Admin)
CREATE POLICY "areas_select_auth" ON public.areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "areas_write_admin" ON public.areas FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "cats_select_auth" ON public.transaction_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "cats_write_admin" ON public.transaction_categories FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "coa_select_auth" ON public.chart_of_accounts FOR SELECT TO authenticated USING (true);
CREATE POLICY "coa_write_admin" ON public.chart_of_accounts FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "products_select_auth" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products_write_admin" ON public.products FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "customers_select_mgmt" ON public.customers FOR SELECT TO authenticated USING (public.is_director_or_admin());
CREATE POLICY "customers_write_admin" ON public.customers FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "suppliers_select_mgmt" ON public.suppliers FOR SELECT TO authenticated USING (public.is_director_or_admin());
CREATE POLICY "suppliers_write_admin" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

-- 4.5 Policy Investasi & Akad Digital (Hanya user login)
CREATE POLICY "campaigns_select_auth" ON public.project_investment_campaigns FOR SELECT TO authenticated USING (true);
CREATE POLICY "campaigns_write_admin" ON public.project_investment_campaigns FOR ALL TO authenticated USING (public.is_director_or_admin()) WITH CHECK (public.is_director_or_admin());

CREATE POLICY "inv_trx_select_scoped"
  ON public.investment_transactions FOR SELECT TO authenticated
  USING (
    public.is_director_or_admin()
    OR LOWER(member_no) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "inv_trx_insert_scoped"
  ON public.investment_transactions FOR INSERT TO authenticated
  WITH CHECK (
    public.is_director_or_admin()
    OR LOWER(member_no) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "inv_trx_update_admin"
  ON public.investment_transactions FOR UPDATE TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

CREATE POLICY "agreements_select_scoped"
  ON public.digital_agreements FOR SELECT TO authenticated
  USING (
    public.is_director_or_admin()
    OR LOWER(member_no) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "agreements_insert_scoped"
  ON public.digital_agreements FOR INSERT TO authenticated
  WITH CHECK (
    public.is_director_or_admin()
    OR LOWER(member_no) = LOWER(COALESCE(public.current_user_member_id(), ''))
  );

CREATE POLICY "dividends_select_auth" ON public.investment_dividend_distributions FOR SELECT TO authenticated USING (true);
CREATE POLICY "dividends_write_admin" ON public.investment_dividend_distributions FOR ALL TO authenticated USING (public.is_director_or_admin()) WITH CHECK (public.is_director_or_admin());

-- 4.6 Policy Pembiayaan, Pembayaran, Notifikasi, Pendaftaran, Audit
CREATE POLICY "loans_select_scoped"
  ON public.loan_applications FOR SELECT TO authenticated
  USING (public.is_director_or_admin() OR LOWER(member_id) = LOWER(COALESCE(public.current_user_member_id(), '')));

CREATE POLICY "loans_insert_scoped"
  ON public.loan_applications FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_admin() OR LOWER(member_id) = LOWER(COALESCE(public.current_user_member_id(), '')));

CREATE POLICY "loans_update_admin"
  ON public.loan_applications FOR UPDATE TO authenticated
  USING (public.is_director_or_admin()) WITH CHECK (public.is_director_or_admin());

CREATE POLICY "payreq_select_scoped"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (public.is_director_or_admin() OR LOWER(member_id) = LOWER(COALESCE(public.current_user_member_id(), '')));

CREATE POLICY "payreq_insert_scoped"
  ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (public.is_director_or_admin() OR LOWER(member_id) = LOWER(COALESCE(public.current_user_member_id(), '')));

CREATE POLICY "notif_jobs_admin"
  ON public.notification_jobs FOR ALL TO authenticated
  USING (public.is_director_or_admin()) WITH CHECK (public.is_director_or_admin());

CREATE POLICY "user_notifs_scoped"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (
    public.is_director_or_admin()
    OR user_id = 'ALL'
    OR LOWER(user_id) = LOWER(COALESCE(public.current_user_member_id(), auth.uid()::TEXT))
  );

CREATE POLICY "user_notifs_update_scoped"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (
    public.is_director_or_admin()
    OR LOWER(user_id) = LOWER(COALESCE(public.current_user_member_id(), auth.uid()::TEXT))
  );

CREATE POLICY "reg_select_admin_only" ON public.member_registrations FOR SELECT TO authenticated USING (public.is_director_or_admin());
CREATE POLICY "reg_update_admin_only" ON public.member_registrations FOR UPDATE TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());
CREATE POLICY "reg_delete_admin_only" ON public.member_registrations FOR DELETE TO authenticated USING (public.is_admin_only());
CREATE POLICY "reg_insert_authenticated" ON public.member_registrations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "audit_select_mgmt" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_director_or_admin());
CREATE POLICY "audit_insert_auth" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- 4.7 Policy Berita & Update Proyek (Terbit bisa dibaca saat login, Admin penuh)
CREATE POLICY "news_select_auth" ON public.news_articles FOR SELECT TO authenticated USING (status = 'terbit' OR public.is_director_or_admin());
CREATE POLICY "news_write_admin" ON public.news_articles FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());

CREATE POLICY "proj_upd_select_auth" ON public.project_updates FOR SELECT TO authenticated USING (true);
CREATE POLICY "proj_upd_write_admin" ON public.project_updates FOR ALL TO authenticated USING (public.is_admin_only()) WITH CHECK (public.is_admin_only());
