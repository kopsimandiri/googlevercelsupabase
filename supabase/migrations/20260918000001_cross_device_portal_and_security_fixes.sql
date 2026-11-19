-- ==============================================================================
-- KOPSIM MANDIRI: CROSS-DEVICE PORTAL PERSISTENCE, PROOF RESOLUTION & SECURITY HARDENING
-- Migration: 20260918000001_cross_device_portal_and_security_fixes.sql
-- Description:
--   1. Schema alignment (profiles.member_id, profiles.username, member_registrations.member_no,
--      members.avatar_url, transactions.file_url, default UUID generators on id if missing)
--   2. Bcrypt member password verification & hashing + self-service profile update RPCs
--   3. SECURITY DEFINER portal RPCs for cross-device transactions & registration proof lookup
--   4. Fix fn_process_payment_webhook column names to match public.transactions
--   5. Fix broken RLS policies referencing public.user_profiles -> public.profiles
--   6. Controlled storage upload policies for pendaftaran/, investasi/, setoran/, avatar/
--   7. Harden investment crowdfunding RLS policies (no unrestricted USING (true) mutations)
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. SCHEMA ALIGNMENT & SAFE DEFAULTS
-- ==============================================================================
DO $$
BEGIN
  -- public.profiles: tambahkan member_id & username agar current_user_member_id() dan RLS 000005 valid
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'member_id'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN member_id VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'username'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN username VARCHAR(100);
  END IF;

  -- public.member_registrations: tambahkan member_no agar tautan slip pendaftaran terikat ke NRA anggota
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_registrations' AND column_name = 'member_no'
  ) THEN
    ALTER TABLE public.member_registrations ADD COLUMN member_no VARCHAR(50);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'member_registrations' AND column_name = 'transfer_proof_url'
  ) THEN
    ALTER TABLE public.member_registrations ADD COLUMN transfer_proof_url TEXT DEFAULT '';
  END IF;

  -- public.members: pastikan avatar_url tersedia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'avatar_url'
  ) THEN
    ALTER TABLE public.members ADD COLUMN avatar_url TEXT DEFAULT '';
  END IF;

  -- public.transactions: pastikan file_url tersedia
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'file_url'
  ) THEN
    ALTER TABLE public.transactions ADD COLUMN file_url TEXT DEFAULT '';
  END IF;

  -- Pastikan kolom id pada members dan transactions memiliki DEFAULT jika belum ber-default
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'members' AND column_name = 'id' AND column_default IS NULL
  ) THEN
    ALTER TABLE public.members ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'id' AND column_default IS NULL
  ) THEN
    ALTER TABLE public.transactions ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_member_id ON public.profiles(member_id);
CREATE INDEX IF NOT EXISTS idx_member_reg_member_no ON public.member_registrations(member_no);
CREATE INDEX IF NOT EXISTS idx_transactions_customer_name ON public.transactions(customer_name);

-- ==============================================================================
-- 2. FIX current_user_member_id() AGAR ROBUST
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.current_user_member_id()
RETURNS text AS $$
DECLARE
  v_member_id text;
  v_email text;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(NULLIF(p.member_id, ''), NULLIF(p.username, ''))
  INTO v_member_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));

  SELECT COALESCE(m.member_no, m.id::text) INTO v_member_id
  FROM public.members m
  WHERE m.id::text = auth.uid()::text
     OR (v_email <> '' AND LOWER(m.username) = v_email)
  LIMIT 1;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 3. AUTH & CROSS-DEVICE PORTAL MEMBER RPCS (SECURITY DEFINER)
-- ==============================================================================

-- 3A. verify_member_login: dukung bcrypt crypt() & plaintext legacy, TANPA membocorkan password hash
CREATE OR REPLACE FUNCTION public.verify_member_login(p_username text, p_password text)
RETURNS json AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_clean_username text;
  v_clean_password text;
  v_proof_url text;
  v_matched boolean := false;
BEGIN
  v_clean_username := LOWER(TRIM(COALESCE(p_username, '')));
  v_clean_password := TRIM(COALESCE(p_password, ''));

  IF v_clean_username = '' OR v_clean_password = '' THEN
    RETURN json_build_object('success', false, 'message', 'Username dan password wajib diisi.');
  END IF;

  SELECT * INTO v_member
  FROM public.members
  WHERE LOWER(COALESCE(username, '')) = v_clean_username
     OR LOWER(COALESCE(member_no, '')) = v_clean_username
     OR LOWER(id::text) = v_clean_username
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Akun anggota dengan username tersebut tidak ditemukan.');
  END IF;

  IF UPPER(COALESCE(v_member.status, '')) IN ('NONAKTIF', 'SUSPENDED') THEN
    RETURN json_build_object('success', false, 'message', 'Status keanggotaan Anda sedang tidak aktif. Silakan hubungi pengurus.');
  END IF;

  IF COALESCE(v_member.legacy_password_hash, '') <> '' THEN
    IF v_member.legacy_password_hash = v_clean_password THEN
      v_matched := true;
    ELSIF v_member.legacy_password_hash LIKE '$2%' THEN
      v_matched := (v_member.legacy_password_hash = crypt(v_clean_password, v_member.legacy_password_hash));
    END IF;
  END IF;

  IF NOT v_matched THEN
    RETURN json_build_object('success', false, 'message', 'Password yang dimasukkan tidak sesuai.');
  END IF;

  -- Ambil tautan slip pendaftaran terbaru jika ada
  SELECT mr.transfer_proof_url INTO v_proof_url
  FROM public.member_registrations mr
  WHERE (COALESCE(mr.member_no, '') <> '' AND LOWER(mr.member_no) = LOWER(v_member.member_no))
     OR LOWER(TRIM(mr.full_name)) = LOWER(TRIM(v_member.full_name))
  ORDER BY mr.submitted_at DESC NULLS LAST, mr.created_at DESC
  LIMIT 1;

  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'id', v_member.id,
      'member_no', v_member.member_no,
      'registered_at', v_member.registered_at,
      'full_name', v_member.full_name,
      'gender', v_member.gender,
      'province', v_member.province,
      'city', v_member.city,
      'address', v_member.address,
      'occupation', v_member.occupation,
      'username', v_member.username,
      'birth_date', v_member.birth_date,
      'birth_place', v_member.birth_place,
      'nik', v_member.nik,
      'work_area', v_member.work_area,
      'avatar_url', COALESCE(v_member.avatar_url, ''),
      'transfer_proof_url', COALESCE(v_proof_url, ''),
      'status', v_member.status
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3B. change_member_password: wajib hash bcrypt & opsional verifikasi password lama
DROP FUNCTION IF EXISTS public.change_member_password(text, text);
CREATE OR REPLACE FUNCTION public.change_member_password(
  p_member_no text,
  p_new_password text,
  p_old_password text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_clean_pass text;
  v_clean_old text;
  v_member public.members%ROWTYPE;
BEGIN
  v_clean_pass := TRIM(COALESCE(p_new_password, ''));
  v_clean_old := TRIM(COALESCE(p_old_password, ''));

  IF LENGTH(v_clean_pass) < 6 THEN
    RETURN json_build_object('success', false, 'message', 'Password baru minimal 6 karakter.');
  END IF;

  SELECT * INTO v_member
  FROM public.members
  WHERE member_no = p_member_no OR id::text = p_member_no
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Data anggota tidak ditemukan.');
  END IF;

  IF v_clean_old <> '' AND COALESCE(v_member.legacy_password_hash, '') <> '' THEN
    IF NOT (
      v_member.legacy_password_hash = v_clean_old
      OR (v_member.legacy_password_hash LIKE '$2%' AND v_member.legacy_password_hash = crypt(v_clean_old, v_member.legacy_password_hash))
    ) THEN
      RETURN json_build_object('success', false, 'message', 'Password lama yang Anda masukkan tidak sesuai.');
    END IF;
  END IF;

  UPDATE public.members
  SET legacy_password_hash = crypt(v_clean_pass, gen_salt('bf')),
      updated_at = NOW()
  WHERE id = v_member.id;

  RETURN json_build_object('success', true, 'message', 'Password berhasil diperbarui dan dienkripsi.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3C. update_member_profile_self: agar anggota bisa memperbarui profil & foto lintas perangkat
CREATE OR REPLACE FUNCTION public.update_member_profile_self(
  p_member_no text,
  p_full_name text DEFAULT NULL,
  p_gender text DEFAULT NULL,
  p_birth_place text DEFAULT NULL,
  p_birth_date date DEFAULT NULL,
  p_occupation text DEFAULT NULL,
  p_address text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_province text DEFAULT NULL,
  p_avatar_url text DEFAULT NULL
)
RETURNS json AS $$
DECLARE
  v_updated public.members%ROWTYPE;
BEGIN
  UPDATE public.members
  SET full_name = COALESCE(NULLIF(TRIM(p_full_name), ''), full_name),
      gender = COALESCE(NULLIF(TRIM(p_gender), ''), gender),
      birth_place = COALESCE(NULLIF(TRIM(p_birth_place), ''), birth_place),
      birth_date = COALESCE(p_birth_date, birth_date),
      occupation = COALESCE(NULLIF(TRIM(p_occupation), ''), occupation),
      address = COALESCE(p_address, address),
      city = COALESCE(NULLIF(TRIM(p_city), ''), city),
      province = COALESCE(NULLIF(TRIM(p_province), ''), province),
      avatar_url = CASE WHEN p_avatar_url IS NOT NULL THEN p_avatar_url ELSE avatar_url END,
      updated_at = NOW()
  WHERE member_no = p_member_no OR id::text = p_member_no
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Data anggota tidak ditemukan.');
  END IF;

  RETURN json_build_object(
    'success', true,
    'member', json_build_object(
      'id', v_updated.id,
      'member_no', v_updated.member_no,
      'full_name', v_updated.full_name,
      'gender', v_updated.gender,
      'birth_place', v_updated.birth_place,
      'birth_date', v_updated.birth_date,
      'occupation', v_updated.occupation,
      'address', v_updated.address,
      'city', v_updated.city,
      'province', v_updated.province,
      'avatar_url', COALESCE(v_updated.avatar_url, '')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3D. get_member_portal_transactions: query transaksi + file_url lintas perangkat tanpa terblokir RLS anon
CREATE OR REPLACE FUNCTION public.get_member_portal_transactions(
  p_member_no text,
  p_member_name text DEFAULT ''
)
RETURNS SETOF public.transactions AS $$
DECLARE
  v_no text := LOWER(TRIM(COALESCE(p_member_no, '')));
  v_name text := LOWER(TRIM(COALESCE(p_member_name, '')));
  v_member_pk text;
BEGIN
  IF v_no = '' AND v_name = '' THEN
    RETURN;
  END IF;

  SELECT m.id::text INTO v_member_pk
  FROM public.members m
  WHERE LOWER(COALESCE(m.member_no, '')) = v_no
     OR LOWER(m.id::text) = v_no
  LIMIT 1;

  RETURN QUERY
  SELECT t.*
  FROM public.transactions t
  WHERE
    (v_no <> '' AND LOWER(COALESCE(t.member_id, '')) = v_no)
    OR (v_member_pk IS NOT NULL AND LOWER(COALESCE(t.member_id, '')) = LOWER(v_member_pk))
    OR (v_no <> '' AND LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_no || '%')
    OR (v_no <> '' AND LOWER(COALESCE(t.description, '')) LIKE '%' || v_no || '%')
    OR (
      LENGTH(v_name) >= 3 AND (
        LOWER(COALESCE(t.customer_name, '')) LIKE '%' || v_name || '%'
        OR LOWER(COALESCE(t.account_name_legacy, '')) LIKE '%' || v_name || '%'
        OR LOWER(COALESCE(t.description, '')) LIKE '%' || v_name || '%'
      )
    )
  ORDER BY t.transaction_date DESC, t.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 3E. get_member_registration_proof: ambil slip pendaftaran anggota dari member_registrations
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
    AND (
      (v_no <> '' AND LOWER(COALESCE(mr.member_no, '')) = v_no)
      OR (LENGTH(v_name) >= 3 AND LOWER(TRIM(mr.full_name)) = v_name)
    )
  ORDER BY mr.submitted_at DESC NULLS LAST, mr.created_at DESC
  LIMIT 1;

  RETURN COALESCE(v_proof, '');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION public.verify_member_login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.change_member_password(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_member_profile_self(text, text, text, text, date, text, text, text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_portal_transactions(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_member_registration_proof(text, text) TO anon, authenticated;

-- ==============================================================================
-- 4. FIX fn_process_payment_webhook KOLOM TRANSACTIONS
-- ==============================================================================
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
  v_member_pk VARCHAR(50);
BEGIN
  IF p_signature IS NULL OR p_signature <> p_expected_signature THEN
    RAISE EXCEPTION 'Unauthorized Webhook: Invalid or tampered signature';
  END IF;

  SELECT * INTO v_payment
  FROM public.payment_requests
  WHERE order_id = p_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment order not found: %', p_order_id;
  END IF;

  IF v_payment.status IN ('PAID', 'POSTED') THEN
    RETURN jsonb_build_object(
      'success', true,
      'status', v_payment.status,
      'message', 'Payment already processed and posted (Idempotent replay)',
      'order_id', p_order_id,
      'posted_transaction_id', v_payment.posted_transaction_id
    );
  END IF;

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

  v_member_name := COALESCE(v_payment.member_name, 'Anggota Koperasi');
  v_trx_id := 'TRX-PG-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || SUBSTRING(gen_random_uuid()::text, 1, 6);
  v_trx_no := 'PG-' || TO_CHAR(NOW(), 'YYMMDD') || '-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 5));

  -- Resolve member_id FK (members.id) secara aman
  SELECT m.id::text INTO v_member_pk
  FROM public.members m
  WHERE m.id::text = v_payment.member_id OR m.member_no = v_payment.member_id
  LIMIT 1;

  INSERT INTO public.transactions (
    id,
    transaction_no,
    transaction_date,
    referral_type,
    area_name,
    transaction_type,
    payment_method,
    amount,
    file_url,
    account_name_legacy,
    description,
    category_name,
    customer_name,
    member_id
  ) VALUES (
    v_trx_id,
    v_trx_no,
    CURRENT_DATE,
    'KOPERASI',
    'PUSAT JAKARTA',
    'MASUK',
    'Payment Gateway (' || v_payment.payment_channel || ')',
    v_payment.amount,
    '',
    v_member_name,
    'Setoran Pembayaran Online ' || p_order_id || ' - ' || v_member_name || ' (' || COALESCE(v_payment.member_id, '-') || ')',
    COALESCE(v_payment.category, 'Simpanan Wajib Anggota'),
    v_member_name,
    v_member_pk
  );

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

  INSERT INTO public.notification_jobs (
    type, recipient, recipient_name, channel, provider, payload, status, idempotency_key
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
  ) ON CONFLICT (idempotency_key) DO NOTHING;

  INSERT INTO public.user_notifications (
    user_id, title, message, category, metadata
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
    'transaction_no', v_trx_no,
    'amount', v_payment.amount,
    'member_name', v_member_name
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 5. FIX RLS 20260826000005 YANG MERUJUK TABEL NON-EKSISTEN public.user_profiles
-- ==============================================================================
DROP POLICY IF EXISTS "Admins can view and manage notification jobs" ON public.notification_jobs;
CREATE POLICY "Admins can view and manage notification jobs"
  ON public.notification_jobs FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Users can view their own in-app notifications" ON public.user_notifications;
CREATE POLICY "Users can view their own in-app notifications"
  ON public.user_notifications FOR SELECT TO authenticated
  USING (
    user_id = public.current_user_member_id()
    OR user_id = auth.uid()::text
    OR public.is_director_or_admin()
  );

DROP POLICY IF EXISTS "Users can update read status on their own notifications" ON public.user_notifications;
CREATE POLICY "Users can update read status on their own notifications"
  ON public.user_notifications FOR UPDATE TO authenticated
  USING (user_id = public.current_user_member_id() OR user_id = auth.uid()::text)
  WITH CHECK (user_id = public.current_user_member_id() OR user_id = auth.uid()::text);

DROP POLICY IF EXISTS "Members can view their own payment requests" ON public.payment_requests;
CREATE POLICY "Members can view their own payment requests"
  ON public.payment_requests FOR SELECT TO authenticated
  USING (member_id = public.current_user_member_id() OR public.is_director_or_admin());

DROP POLICY IF EXISTS "Members can initiate payment requests" ON public.payment_requests;
CREATE POLICY "Members can initiate payment requests"
  ON public.payment_requests FOR INSERT TO authenticated
  WITH CHECK (member_id = public.current_user_member_id() OR public.is_director_or_admin());

DROP POLICY IF EXISTS "Admins can update payment requests" ON public.payment_requests;
CREATE POLICY "Admins can update payment requests"
  ON public.payment_requests FOR UPDATE TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

DROP POLICY IF EXISTS "Members can view their own loan applications" ON public.loan_applications;
CREATE POLICY "Members can view their own loan applications"
  ON public.loan_applications FOR SELECT TO authenticated
  USING (member_id = public.current_user_member_id() OR public.is_director_or_admin());

DROP POLICY IF EXISTS "Members can submit loan applications" ON public.loan_applications;
CREATE POLICY "Members can submit loan applications"
  ON public.loan_applications FOR INSERT TO authenticated
  WITH CHECK (member_id = public.current_user_member_id() OR public.is_director_or_admin());

DROP POLICY IF EXISTS "Admins can update loan applications" ON public.loan_applications;
CREATE POLICY "Admins can update loan applications"
  ON public.loan_applications FOR UPDATE TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

-- ==============================================================================
-- 6. STORAGE RLS: IZINKAN UPLOAD TERKONTROL UNTUK PENDAFTARAN, INVESTASI, SETORAN & AVATAR
-- ==============================================================================
DROP POLICY IF EXISTS "bukti_transfer_public_scoped_insert" ON storage.objects;
CREATE POLICY "bukti_transfer_public_scoped_insert"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'bukti_transfer'
    AND (
      name LIKE 'pendaftaran/%'
      OR name LIKE 'investasi/%'
      OR name LIKE 'setoran/%'
      OR name LIKE 'avatar/%'
    )
  );

-- ==============================================================================
-- 7. HARDEN INVESTMENT CROWDFUNDING RLS (HAPUS USING (true) PADA MUTASI)
-- ==============================================================================
DROP POLICY IF EXISTS "Admin Full Access Investment Campaigns" ON public.project_investment_campaigns;
CREATE POLICY "Admin Full Access Investment Campaigns"
  ON public.project_investment_campaigns FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

DROP POLICY IF EXISTS "Admin Full Access Dividend Distributions" ON public.investment_dividend_distributions;
CREATE POLICY "Admin Full Access Dividend Distributions"
  ON public.investment_dividend_distributions FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

DROP POLICY IF EXISTS "Admin and Owners Update Investment Transactions" ON public.investment_transactions;
CREATE POLICY "Admin and Owners Update Investment Transactions"
  ON public.investment_transactions FOR UPDATE TO authenticated
  USING (public.is_director_or_admin() OR member_no = public.current_user_member_id())
  WITH CHECK (public.is_director_or_admin() OR member_no = public.current_user_member_id());
