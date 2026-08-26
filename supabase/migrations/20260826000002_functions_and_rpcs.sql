-- ==============================================================================
-- KOPSIM MANDIRI: STORED PROCEDURES, RPCS & TRIGGERS
-- Migration: 20260826000002_functions_and_rpcs.sql
-- Description: Stored procedures for transaction generation, member login, and audit
-- ==============================================================================

-- 1. Helper function: Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Pasang Trigger Updated At pada tabel yang memiliki kolom updated_at
DROP TRIGGER IF EXISTS trg_areas_updated_at ON public.areas;
CREATE TRIGGER trg_areas_updated_at BEFORE UPDATE ON public.areas
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_members_updated_at ON public.members;
CREATE TRIGGER trg_members_updated_at BEFORE UPDATE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON public.transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_coa_updated_at ON public.chart_of_accounts;
CREATE TRIGGER trg_coa_updated_at BEFORE UPDATE ON public.chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_customers_updated_at ON public.customers;
CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON public.customers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_suppliers_updated_at ON public.suppliers;
CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_products_updated_at ON public.products;
CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_trx_categories_updated_at ON public.transaction_categories;
CREATE TRIGGER trg_trx_categories_updated_at BEFORE UPDATE ON public.transaction_categories
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_news_articles_updated_at ON public.news_articles;
CREATE TRIGGER trg_news_articles_updated_at BEFORE UPDATE ON public.news_articles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

DROP TRIGGER IF EXISTS trg_project_updates_updated_at ON public.project_updates;
CREATE TRIGGER trg_project_updates_updated_at BEFORE UPDATE ON public.project_updates
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp();

-- ==============================================================================
-- 2. RPC: generate_transaction_id(tipe text, tanggal text)
-- Generates sequential transaction ID format: T{YYMMDD}{SEQ} or P{YYMMDD}{SEQ}
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.generate_transaction_id(tipe text, tanggal text DEFAULT NULL)
RETURNS text AS $$
DECLARE
  v_prefix char(1);
  v_date text;
  v_count integer;
  v_next_seq text;
BEGIN
  IF UPPER(tipe) = 'PROJECT' THEN
    v_prefix := 'P';
  ELSE
    v_prefix := 'T';
  END IF;

  IF tanggal IS NULL OR LENGTH(tanggal) < 10 THEN
    v_date := TO_CHAR(NOW(), 'YYMMDD');
  ELSE
    v_date := TO_CHAR(tanggal::DATE, 'YYMMDD');
  END IF;

  -- Hitung transaksi pada tanggal dan prefix bersangkutan
  SELECT COUNT(*) + 1 INTO v_count
  FROM public.transactions
  WHERE transaction_no LIKE v_prefix || v_date || '%';

  v_next_seq := LPAD(v_count::text, 3, '0');
  RETURN v_prefix || v_date || v_next_seq;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 3. RPC: verify_member_login(p_username text, p_password text)
-- Verifies member credentials and returns clean JSON session payload
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.verify_member_login(p_username text, p_password text)
RETURNS json AS $$
DECLARE
  v_member public.members%ROWTYPE;
  v_clean_username text;
  v_clean_password text;
BEGIN
  v_clean_username := LOWER(TRIM(p_username));
  v_clean_password := TRIM(p_password);

  IF v_clean_username = '' OR v_clean_password = '' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Username dan password wajib diisi.'
    );
  END IF;

  -- Cari anggota berdasarkan username, member_no, atau id
  SELECT * INTO v_member
  FROM public.members
  WHERE LOWER(username) = v_clean_username
     OR LOWER(member_no) = v_clean_username
     OR LOWER(id) = v_clean_username
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Akun anggota dengan username tersebut tidak ditemukan.'
    );
  END IF;

  IF v_member.status = 'NONAKTIF' OR v_member.status = 'SUSPENDED' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Status keanggotaan Anda sedang tidak aktif. Silakan hubungi pengurus.'
    );
  END IF;

  -- Verifikasi password hash atau fallback
  IF v_member.legacy_password_hash IS NOT NULL AND v_member.legacy_password_hash <> '' THEN
    IF v_member.legacy_password_hash = v_clean_password 
       OR v_member.legacy_password_hash = crypt(v_clean_password, v_member.legacy_password_hash) THEN
      RETURN json_build_object(
        'success', true,
        'member', row_to_json(v_member)
      );
    END IF;
  END IF;

  -- Jika belum cocok
  RETURN json_build_object(
    'success', false,
    'message', 'Password yang dimasukkan tidak sesuai.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==============================================================================
-- 4. RPC: change_member_password(p_member_no text, p_new_password text)
-- Securely updates member password hash
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.change_member_password(p_member_no text, p_new_password text)
RETURNS json AS $$
DECLARE
  v_clean_pass text;
BEGIN
  v_clean_pass := TRIM(p_new_password);
  IF LENGTH(v_clean_pass) < 4 THEN
    RETURN json_build_object('success', false, 'message', 'Password minimal 4 karakter.');
  END IF;

  UPDATE public.members
  SET legacy_password_hash = v_clean_pass,
      updated_at = NOW()
  WHERE member_no = p_member_no OR id = p_member_no;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Data anggota tidak ditemukan.');
  END IF;

  RETURN json_build_object('success', true, 'message', 'Password berhasil diperbarui.');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
