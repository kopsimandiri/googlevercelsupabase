-- ==============================================================================
-- KOPSIM MANDIRI: PHASE 8 - SHARIA CROWDFUNDING & INVESTMENT MANAGEMENT (SCF)
-- Migration: 20260916000001_sharia_crowdfunding_investments.sql
-- Description: Tabel & Kebijakan RLS untuk Penggalangan Dana Syariah Terkait Proyek
--              (SUKS / Sukuk Musyarakah / Mudharabah / Wakalah bil Ujrah)
-- ==============================================================================

-- 1. TABEL: project_investment_campaigns (Kampanye Penawaran Efek Syariah per Proyek)
CREATE TABLE IF NOT EXISTS public.project_investment_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) NOT NULL, -- Kode Proyek Aktif (contoh: P01, P02, perikanan-ambon)
  project_name VARCHAR(150) NOT NULL,
  instrument_type VARCHAR(50) NOT NULL DEFAULT 'SUKS', -- 'SUKS', 'SUKUK', 'SAHAM'
  akad_type VARCHAR(50) NOT NULL DEFAULT 'MUSYARAKAH', -- 'MUSYARAKAH', 'MUDHARABAH', 'WAKALAH', 'MURABAHAH'
  target_amount NUMERIC(15,2) NOT NULL CHECK (target_amount > 0),
  collected_amount NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (collected_amount >= 0),
  min_investment NUMERIC(15,2) NOT NULL DEFAULT 1000000 CHECK (min_investment > 0),
  max_investment NUMERIC(15,2),
  projected_roi_percent NUMERIC(5,2) NOT NULL CHECK (projected_roi_percent >= 0),
  tenor_months INT NOT NULL CHECK (tenor_months > 0),
  shu_distribution_schedule VARCHAR(50) NOT NULL DEFAULT 'TRIWULAN', -- 'BULANAN', 'TRIWULAN', 'SEMESTER', 'TAHUNAN'
  offering_start_date DATE NOT NULL,
  offering_end_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'OPEN', -- 'DRAFT', 'COMING_SOON', 'OPEN', 'FUNDED', 'ACTIVE', 'COMPLETED', 'CLOSED'
  platform_fee_percent NUMERIC(5,2) NOT NULL DEFAULT 0.50,
  underlying_asset TEXT,
  prospectus_url TEXT,
  is_investment_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing kampanye investasi
CREATE INDEX IF NOT EXISTS idx_invest_campaign_project_id ON public.project_investment_campaigns(project_id);
CREATE INDEX IF NOT EXISTS idx_invest_campaign_status ON public.project_investment_campaigns(status);

-- 2. TABEL: investment_transactions (Pencatatan Transaksi & Lot Investasi Pemodal)
CREATE TABLE IF NOT EXISTS public.investment_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_no VARCHAR(100) UNIQUE NOT NULL, -- Contoh: INV-2026-09-001
  campaign_id UUID NOT NULL REFERENCES public.project_investment_campaigns(id) ON DELETE RESTRICT,
  project_id VARCHAR(50) NOT NULL,
  member_no VARCHAR(50) NOT NULL, -- Nomor Registrasi Anggota (NRA)
  investor_name VARCHAR(150) NOT NULL,
  investor_email VARCHAR(150),
  investor_phone VARCHAR(50),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  units_count INT NOT NULL DEFAULT 1 CHECK (units_count > 0),
  platform_fee NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (platform_fee >= 0),
  total_payment NUMERIC(15,2) NOT NULL CHECK (total_payment > 0),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'TRANSFER_BANK', -- 'TRANSFER_BANK', 'SIMPANAN_SUKARELA', 'VIRTUAL_ACCOUNT'
  payment_proof_url TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PAYMENT_CONFIRMED', 'APPROVED', 'ACTIVE', 'COMPLETED', 'REJECTED'
  notes TEXT,
  verified_by VARCHAR(100),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing transaksi investasi
CREATE INDEX IF NOT EXISTS idx_invest_trx_member ON public.investment_transactions(member_no);
CREATE INDEX IF NOT EXISTS idx_invest_trx_campaign ON public.investment_transactions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_invest_trx_status ON public.investment_transactions(status);

-- 3. TABEL: digital_agreements (Dokumen Akad Syariah Digital & Hash Tanda Tangan)
CREATE TABLE IF NOT EXISTS public.digital_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agreement_no VARCHAR(100) UNIQUE NOT NULL, -- Contoh: AKAD-MSY-2026-0001
  transaction_id UUID NOT NULL REFERENCES public.investment_transactions(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.project_investment_campaigns(id) ON DELETE RESTRICT,
  member_no VARCHAR(50) NOT NULL,
  investor_name VARCHAR(150) NOT NULL,
  akad_type VARCHAR(50) NOT NULL, -- 'MUSYARAKAH' (Koperasi-Anggota) atau 'WAKALAH' (Investor-Platform)
  agreement_text TEXT NOT NULL,
  digital_signature_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(50),
  signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(50) NOT NULL DEFAULT 'SIGNED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_agreements_trx ON public.digital_agreements(transaction_id);
CREATE INDEX IF NOT EXISTS idx_digital_agreements_member ON public.digital_agreements(member_no);

-- 4. TABEL: investment_dividend_distributions (Distribusi Bagi Hasil / Imbal Hasil Proyek)
CREATE TABLE IF NOT EXISTS public.investment_dividend_distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.project_investment_campaigns(id) ON DELETE CASCADE,
  period_label VARCHAR(100) NOT NULL, -- Contoh: 'Bagi Hasil Triwulan I - 2026'
  distribution_date DATE NOT NULL,
  gross_profit_shared NUMERIC(15,2) NOT NULL CHECK (gross_profit_shared >= 0),
  roi_rate_actual NUMERIC(5,2) NOT NULL CHECK (roi_rate_actual >= 0),
  status VARCHAR(50) NOT NULL DEFAULT 'PLANNED', -- 'PLANNED', 'DISTRIBUTED', 'CANCELLED'
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dividend_campaign ON public.investment_dividend_distributions(campaign_id);

-- ==============================================================================
-- KEBIJAKAN ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- A. RLS untuk project_investment_campaigns
ALTER TABLE public.project_investment_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Investment Campaigns" ON public.project_investment_campaigns;
CREATE POLICY "Public Read Investment Campaigns"
  ON public.project_investment_campaigns
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin Full Access Investment Campaigns" ON public.project_investment_campaigns;
CREATE POLICY "Admin Full Access Investment Campaigns"
  ON public.project_investment_campaigns
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- B. RLS untuk investment_transactions
ALTER TABLE public.investment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and Members Read Investment Transactions" ON public.investment_transactions;
CREATE POLICY "Public and Members Read Investment Transactions"
  ON public.investment_transactions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Members Insert Investment Transactions" ON public.investment_transactions;
CREATE POLICY "Members Insert Investment Transactions"
  ON public.investment_transactions
  FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin and Owners Update Investment Transactions" ON public.investment_transactions;
CREATE POLICY "Admin and Owners Update Investment Transactions"
  ON public.investment_transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- C. RLS untuk digital_agreements
ALTER TABLE public.digital_agreements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Digital Agreements" ON public.digital_agreements;
CREATE POLICY "Public Read Digital Agreements"
  ON public.digital_agreements
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Insert Digital Agreements" ON public.digital_agreements;
CREATE POLICY "Insert Digital Agreements"
  ON public.digital_agreements
  FOR INSERT
  WITH CHECK (true);

-- D. RLS untuk investment_dividend_distributions
ALTER TABLE public.investment_dividend_distributions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public Read Dividend Distributions" ON public.investment_dividend_distributions;
CREATE POLICY "Public Read Dividend Distributions"
  ON public.investment_dividend_distributions
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin Full Access Dividend Distributions" ON public.investment_dividend_distributions;
CREATE POLICY "Admin Full Access Dividend Distributions"
  ON public.investment_dividend_distributions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ==============================================================================
-- DATASET CONTOH (SEED DATA / INSERT INTO)
-- Kampanye Investasi Efek Syariah Berbasis 8 Unit Strategic Projects
-- ==============================================================================

INSERT INTO public.project_investment_campaigns (
  id,
  project_id,
  project_name,
  instrument_type,
  akad_type,
  target_amount,
  collected_amount,
  min_investment,
  projected_roi_percent,
  tenor_months,
  shu_distribution_schedule,
  offering_start_date,
  offering_end_date,
  status,
  platform_fee_percent,
  underlying_asset,
  prospectus_url,
  is_investment_enabled
) VALUES
(
  'c0000001-0000-0000-0000-000000000001',
  'P01',
  'KAMPUNG HAJI',
  'SUKS',
  'MUSYARAKAH',
  1500000000.00,
  1125000000.00, -- 75% terkumpul
  2500000.00,
  16.50,
  24,
  'TRIWULAN',
  CURRENT_DATE - INTERVAL '15 days',
  CURRENT_DATE + INTERVAL '45 days',
  'OPEN',
  0.50,
  'Kavling Tanah Terpadu Manasik & Fasilitas Hospitality Syariah Cianjur',
  '/assets/documents/prospektus-kampung-haji-2026.pdf',
  TRUE
),
(
  'c0000002-0000-0000-0000-000000000002',
  'P02',
  'TRADING IKAN',
  'SUKUK',
  'MUDHARABAH',
  750000000.00,
  615000000.00, -- 82% terkumpul
  1000000.00,
  15.00,
  12,
  'BULANAN',
  CURRENT_DATE - INTERVAL '20 days',
  CURRENT_DATE + INTERVAL '25 days',
  'OPEN',
  0.50,
  'Armada Cold Chain, Cold Storage 30 Ton & Kontrak Suplai Tuna Ekspor Maluku',
  '/assets/documents/prospektus-trading-ikan-2026.pdf',
  TRUE
),
(
  'c0000003-0000-0000-0000-000000000003',
  'P04',
  'PERTANIAN',
  'SUKUK',
  'MUSYARAKAH',
  500000000.00,
  500000000.00, -- 100% didanai
  1000000.00,
  14.00,
  12,
  'TRIWULAN',
  CURRENT_DATE - INTERVAL '60 days',
  CURRENT_DATE - INTERVAL '5 days',
  'FUNDED',
  0.50,
  'Sentra Pengolahan Gabah & Penggilingan Beras Organik Cianjur Mandiri',
  '/assets/documents/prospektus-pertanian-2026.pdf',
  TRUE
),
(
  'c0000004-0000-0000-0000-000000000004',
  'P03',
  'GARAM',
  'SUKS',
  'MURABAHAH',
  400000000.00,
  180000000.00, -- 45% terkumpul
  500000.00,
  13.50,
  12,
  'TRIWULAN',
  CURRENT_DATE - INTERVAL '10 days',
  CURRENT_DATE + INTERVAL '50 days',
  'OPEN',
  0.50,
  'Fasilitas Pencucian Garam Kristal NaCl > 97% & Gudang Kapasitas 500 Ton Indramayu',
  '/assets/documents/prospektus-garam-rakyat-2026.pdf',
  TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Contoh Riwayat Distribusi Bagi Hasil Sukuk Pertanian
INSERT INTO public.investment_dividend_distributions (
  id,
  campaign_id,
  period_label,
  distribution_date,
  gross_profit_shared,
  roi_rate_actual,
  status,
  notes
) VALUES (
  'd0000001-0000-0000-0000-000000000001',
  'c0000003-0000-0000-0000-000000000003',
  'Bagi Hasil Siklus Panen I - 2026',
  CURRENT_DATE - INTERVAL '10 days',
  17500000.00,
  3.50, -- Realisasi kuartal
  'DISTRIBUTED',
  'Distribusi dividen bagi hasil hasil panen padi organik Cianjur batch 1 ke saldo simpanan sukarela anggota.'
)
ON CONFLICT (id) DO NOTHING;
