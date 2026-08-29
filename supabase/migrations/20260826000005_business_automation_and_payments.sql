-- ==============================================================================
-- KOPSIM MANDIRI: PHASE 7 - BUSINESS FEATURES, AUTOMATION & PAYMENT GATEWAY
-- Migration: 20260826000005_business_automation_and_payments.sql
-- Description: Notification jobs, Payment gateway states, Loan applications,
--              Automated posting, Idempotency, and Audit integrations.
-- ==============================================================================

-- 1. NOTIFICATION JOBS TABLE
-- Stores asynchronous notification events with retries, provider dispatch, and delivery tracking
CREATE TABLE IF NOT EXISTS public.notification_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(100) NOT NULL, -- e.g. TRANSACTION_SUCCESS, SAVINGS_DEPOSIT, LOAN_APPROVED, PAYMENT_RECEIVED, SECURITY_ALERT
  recipient VARCHAR(255) NOT NULL, -- phone number (+62...) or email or member_id
  recipient_name VARCHAR(150),
  channel VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP', -- WHATSAPP, EMAIL, IN_APP, PUSH
  provider VARCHAR(50) NOT NULL DEFAULT 'WHATSAPP_SIMULATOR', -- WHATSAPP_FONNTE, SENDGRID, RESEND, INTERNAL
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, SENT, FAILED, CANCELLED
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  idempotency_key VARCHAR(255) UNIQUE,
  sent_at TIMESTAMPTZ,
  error TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Constraints & Indexes for notification_jobs
CREATE INDEX IF NOT EXISTS idx_notif_status_created ON public.notification_jobs(status, created_at);
CREATE INDEX IF NOT EXISTS idx_notif_recipient ON public.notification_jobs(recipient);
CREATE INDEX IF NOT EXISTS idx_notif_idempotency ON public.notification_jobs(idempotency_key);

-- 2. IN-APP NOTIFICATIONS TABLE (For member & admin user inbox)
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(100) NOT NULL, -- member_id or auth user id
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'TRANSACTION', -- TRANSACTION, SAVINGS, LOAN, SECURITY, SYSTEM
  action_url TEXT,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notif_user ON public.user_notifications(user_id, is_read, created_at DESC);

-- 3. PAYMENT REQUESTS & GATEWAY TRANSACTIONS TABLE
-- Complete payment state machine with webhook signature, idempotency, and posting protection
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id VARCHAR(100) UNIQUE NOT NULL, -- e.g. INV-KOPSIM-202608-0001
  idempotency_key VARCHAR(255) UNIQUE NOT NULL,
  member_id VARCHAR(50),
  member_name VARCHAR(150),
  amount NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  fee NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  total_amount NUMERIC(15,2) NOT NULL CHECK (total_amount > 0),
  payment_type VARCHAR(50) NOT NULL DEFAULT 'QRIS', -- QRIS, VIRTUAL_ACCOUNT, BANK_TRANSFER, EWALLET
  payment_channel VARCHAR(50) NOT NULL DEFAULT 'QRIS_STATIC', -- BSI_VA, MANDIRI_VA, BCA_VA, QRIS_DYNAMIC
  va_number VARCHAR(100),
  qr_string TEXT,
  payment_url TEXT,
  description TEXT,
  category VARCHAR(100) NOT NULL DEFAULT 'SIMPANAN_WAJIB', -- SIMPANAN_POKOK, SIMPANAN_WAJIB, SIMPANAN_MANASUKA, ANGSURAN_PEMBIAYAAN, MODAL_PROYEK
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'EXPIRED', 'REFUNDED', 'POSTED')),
  expiry_time TIMESTAMPTZ NOT NULL,
  paid_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  posted_transaction_id VARCHAR(100),
  webhook_received_at TIMESTAMPTZ,
  webhook_attempts INT NOT NULL DEFAULT 0,
  webhook_signature TEXT,
  raw_webhook_payload JSONB,
  settlement_status VARCHAR(50) NOT NULL DEFAULT 'UNSETTLED' CHECK (settlement_status IN ('UNSETTLED', 'SETTLED', 'DISCREPANCY')),
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_order_id ON public.payment_requests(order_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON public.payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_payment_member ON public.payment_requests(member_id);
CREATE INDEX IF NOT EXISTS idx_payment_idempotency ON public.payment_requests(idempotency_key);

-- 4. LOAN & FINANCING APPLICATIONS TABLE (Simulasi & Pengajuan Pembiayaan Syariah)
CREATE TABLE IF NOT EXISTS public.loan_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no VARCHAR(100) UNIQUE NOT NULL, -- e.g. PB-202608-0001
  member_id VARCHAR(50) NOT NULL,
  member_name VARCHAR(150) NOT NULL,
  akad_type VARCHAR(50) NOT NULL DEFAULT 'MURABAHAH' CHECK (akad_type IN ('MURABAHAH', 'MUDHARABAH', 'MUSYARAKAH', 'IJARAH', 'QARDH')),
  peruntukan VARCHAR(100) NOT NULL, -- MODAL_KERJA_PERTANIAN, PENGADAAN_ALAT, MODAL_DAGANG, KONSUMTIF_SYARIAH, RENOVASI
  loan_amount NUMERIC(15,2) NOT NULL CHECK (loan_amount >= 500000),
  tenor_months INT NOT NULL CHECK (tenor_months >= 1 AND tenor_months <= 60),
  margin_rate_pa NUMERIC(5,2) NOT NULL DEFAULT 6.00 CHECK (margin_rate_pa >= 0),
  margin_amount NUMERIC(15,2) NOT NULL CHECK (margin_amount >= 0),
  total_payment NUMERIC(15,2) NOT NULL CHECK (total_payment >= loan_amount),
  monthly_installment NUMERIC(15,2) NOT NULL CHECK (monthly_installment > 0),
  monthly_principal NUMERIC(15,2) NOT NULL CHECK (monthly_principal > 0),
  monthly_margin NUMERIC(15,2) NOT NULL CHECK (monthly_margin >= 0),
  amortization_schedule JSONB DEFAULT '[]'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SIMULATED', 'SUBMITTED', 'UNDER_REVIEW', 'SURVEY', 'APPROVED', 'REJECTED', 'DISBURSED', 'COMPLETED')),
  collateral_type VARCHAR(100) DEFAULT 'BPKB / TANAH / KOPERASI_SAVINGS',
  collateral_detail TEXT,
  monthly_income NUMERIC(15,2) DEFAULT 0,
  dsr_percentage NUMERIC(5,2) DEFAULT 0, -- Debt Service Ratio
  approval_notes TEXT,
  reviewed_by VARCHAR(150),
  reviewed_at TIMESTAMPTZ,
  disbursed_at TIMESTAMPTZ,
  disbursed_transaction_id VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_loan_app_no ON public.loan_applications(application_no);
CREATE INDEX IF NOT EXISTS idx_loan_member ON public.loan_applications(member_id);
CREATE INDEX IF NOT EXISTS idx_loan_status ON public.loan_applications(status);

-- ==============================================================================
-- 5. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.notification_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_applications ENABLE ROW LEVEL SECURITY;

-- Notification Jobs: Only Service Role or Admins can read all; Members cannot read queue directly
CREATE POLICY "Admins can view and manage notification jobs"
  ON public.notification_jobs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

-- In-App Notifications: Members can read and update their own notifications
CREATE POLICY "Users can view their own in-app notifications"
  ON public.user_notifications
  FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    user_id = auth.uid()::text OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "Users can update read status on their own notifications"
  ON public.user_notifications
  FOR UPDATE
  TO authenticated
  USING (
    user_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    user_id = auth.uid()::text
  )
  WITH CHECK (
    user_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    user_id = auth.uid()::text
  );

-- Payment Requests: Members can view their own payments, Admins can view/manage all
CREATE POLICY "Members can view their own payment requests"
  ON public.payment_requests
  FOR SELECT
  TO authenticated
  USING (
    member_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "Members can initiate payment requests"
  ON public.payment_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "Admins can update payment requests"
  ON public.payment_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

-- Loan Applications: Members can view and submit their own; Admins can review all
CREATE POLICY "Members can view their own loan applications"
  ON public.loan_applications
  FOR SELECT
  TO authenticated
  USING (
    member_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "Members can submit loan applications"
  ON public.loan_applications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    member_id = (SELECT username FROM public.user_profiles WHERE id = auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "Admins can update loan applications"
  ON public.loan_applications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('ADMIN', 'SUPERADMIN', 'DEVELOPER')
    )
  );

-- ==============================================================================
-- 6. SERVER-AUTHORITATIVE RPC FUNCTIONS
-- ==============================================================================

-- Function 1: Server-Authoritative Loan Amortization Calculation
CREATE OR REPLACE FUNCTION public.fn_calculate_loan_amortization(
  p_loan_amount NUMERIC,
  p_tenor_months INT,
  p_margin_rate_pa NUMERIC DEFAULT 6.00,
  p_akad_type VARCHAR DEFAULT 'MURABAHAH'
)
RETURNS JSONB AS $$
DECLARE
  v_margin_amount NUMERIC(15,2);
  v_total_payment NUMERIC(15,2);
  v_monthly_principal NUMERIC(15,2);
  v_monthly_margin NUMERIC(15,2);
  v_monthly_installment NUMERIC(15,2);
  v_schedule JSONB := '[]'::jsonb;
  v_balance NUMERIC(15,2);
  v_month INT;
  v_cur_principal NUMERIC(15,2);
  v_cur_margin NUMERIC(15,2);
BEGIN
  IF p_loan_amount <= 0 OR p_tenor_months <= 0 THEN
    RAISE EXCEPTION 'Loan amount and tenor must be strictly positive';
  END IF;

  -- Islamic Murabahah Flat Margin calculation: (Plafon * Rate * (Tenor / 12))
  v_margin_amount := ROUND(p_loan_amount * (p_margin_rate_pa / 100.0) * (p_tenor_months / 12.0), 2);
  v_total_payment := p_loan_amount + v_margin_amount;
  
  v_monthly_principal := ROUND(p_loan_amount / p_tenor_months, 2);
  v_monthly_margin := ROUND(v_margin_amount / p_tenor_months, 2);
  v_monthly_installment := v_monthly_principal + v_monthly_margin;
  
  v_balance := p_loan_amount;

  FOR v_month IN 1..p_tenor_months LOOP
    IF v_month = p_tenor_months THEN
      -- Final month precision adjustment for zero balance
      v_cur_principal := v_balance;
      v_cur_margin := v_margin_amount - (v_monthly_margin * (p_tenor_months - 1));
      v_balance := 0;
    ELSE
      v_cur_principal := v_monthly_principal;
      v_cur_margin := v_monthly_margin;
      v_balance := v_balance - v_cur_principal;
    END IF;

    v_schedule := v_schedule || jsonb_build_object(
      'month', v_month,
      'principal_installment', v_cur_principal,
      'margin_installment', v_cur_margin,
      'total_installment', v_cur_principal + v_cur_margin,
      'remaining_principal', GREATEST(0, v_balance)
    );
  END LOOP;

  RETURN jsonb_build_object(
    'loan_amount', p_loan_amount,
    'tenor_months', p_tenor_months,
    'margin_rate_pa', p_margin_rate_pa,
    'akad_type', p_akad_type,
    'margin_amount', v_margin_amount,
    'total_payment', v_total_payment,
    'monthly_installment', v_monthly_installment,
    'monthly_principal', v_monthly_principal,
    'monthly_margin', v_monthly_margin,
    'schedule', v_schedule,
    'disclaimer', 'Simulasi ini bukan keputusan kredit final. Keputusan persetujuan tunduk pada analisis komite pembiayaan.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function 2: Server-Authoritative Webhook Handler & Transaction Auto-Poster
CREATE OR REPLACE FUNCTION public.fn_process_payment_webhook(
  p_order_id VARCHAR,
  p_signature TEXT,
  p_expected_signature TEXT,
  p_payload JSONB
)
RETURNS JSONB AS $$
DECLARE
  v_payment RECORD;
  v_trx_id VARCHAR(100);
  v_trx_no VARCHAR(100);
  v_member_name VARCHAR(150);
BEGIN
  -- 1. Validate signature
  IF p_signature IS NULL OR p_signature <> p_expected_signature THEN
    RAISE EXCEPTION 'Unauthorized Webhook: Invalid or tampered signature';
  END IF;

  -- 2. Lock and retrieve payment record
  SELECT * INTO v_payment
  FROM public.payment_requests
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found: %', p_order_id;
  END IF;

  -- 3. Idempotency Check: If already POSTED or PAID, do NOT post duplicates!
  IF v_payment.status IN ('PAID', 'POSTED') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_payment.status,
      'message', 'Payment already processed and posted (Idempotent replay)',
      'order_id', p_order_id,
      'posted_transaction_id', v_payment.posted_transaction_id
    );
  END IF;

  -- 4. Check if payment expired
  IF NOW() > v_payment.expiry_time THEN
    UPDATE public.payment_requests
    SET status = 'EXPIRED',
        webhook_received_at = NOW(),
        raw_webhook_payload = p_payload,
        updated_at = NOW()
    WHERE order_id = p_order_id;

    RETURN jsonb_build_object(
      'success', false,
      'status', 'EXPIRED',
      'message', 'Payment request has expired',
      'order_id', p_order_id
    );
  END IF;

  -- 5. Mark as PAID & generate official transaction in ledger
  v_member_name := COALESCE(v_payment.member_name, 'Anggota Koperasi');
  v_trx_id := 'TRX-PG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  v_trx_no := 'INV/KOPSIM/' || TO_CHAR(NOW(), 'YYYYMM') || '/' || SUBSTRING(p_order_id, 1, 8);

  -- Insert official transaction into public.transactions
  INSERT INTO public.transactions (
    id,
    date,
    category,
    amount,
    type,
    method,
    description,
    actor_name,
    is_posted,
    is_void,
    referral,
    plantation
  ) VALUES (
    v_trx_id,
    CURRENT_DATE,
    COALESCE(v_payment.category, 'Simpanan Wajib Anggota'),
    v_payment.amount,
    'MASUK',
    'Payment Gateway (' || v_payment.payment_channel || ')',
    'Setoran Pembayaran Online ' || p_order_id || ' - ' || v_member_name,
    'SYSTEM_GATEWAY',
    TRUE,
    FALSE,
    'KOPERASI',
    'PUSAT JAKARTA'
  );

  -- Update payment request to POSTED
  UPDATE public.payment_requests
  SET status = 'POSTED',
      paid_at = NOW(),
      posted_at = NOW(),
      posted_transaction_id = v_trx_id,
      webhook_received_at = NOW(),
      webhook_signature = p_signature,
      raw_webhook_payload = p_payload,
      settlement_status = 'SETTLED',
      settled_at = NOW(),
      updated_at = NOW()
  WHERE order_id = p_order_id;

  -- Enqueue notification job
  INSERT INTO public.notification_jobs (
    type,
    recipient,
    recipient_name,
    channel,
    provider,
    payload,
    status,
    idempotency_key
  ) VALUES (
    'PAYMENT_POSTED',
    COALESCE(v_payment.member_id, 'MEMBER'),
    v_member_name,
    'WHATSAPP',
    'WHATSAPP_FONNTE',
    jsonb_build_object(
      'order_id', p_order_id,
      'amount', v_payment.amount,
      'channel', v_payment.payment_channel,
      'transaction_id', v_trx_id,
      'member_name', v_member_name,
      'category', v_payment.category,
      'date', NOW()
    ),
    'PENDING',
    'notif-pay-' || p_order_id
  );

  -- Enqueue in-app user notification
  INSERT INTO public.user_notifications (
    user_id,
    title,
    message,
    category,
    metadata
  ) VALUES (
    COALESCE(v_payment.member_id, 'ALL'),
    'Pembayaran Online Berhasil Terposting',
    'Pembayaran ' || v_payment.category || ' sebesar Rp ' || TO_CHAR(v_payment.amount, 'FM999,999,999') || ' telah terverifikasi dan masuk ke pembukuan resmi.',
    'TRANSACTION',
    jsonb_build_object('order_id', p_order_id, 'transaction_id', v_trx_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'status', 'POSTED',
    'order_id', p_order_id,
    'transaction_id', v_trx_id,
    'amount', v_payment.amount,
    'member_name', v_member_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
