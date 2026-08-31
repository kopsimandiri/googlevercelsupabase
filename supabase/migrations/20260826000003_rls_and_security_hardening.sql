-- ==============================================================================
-- KOPSIM MANDIRI: ROW LEVEL SECURITY (RLS) & SECURITY HARDENING
-- Migration: 20260826000003_rls_and_security_hardening.sql
-- Description: Enforces PostgreSQL as primary security boundary, granular RLS,
--              role resolution helpers, and tamper-proof permission enforcement.
-- ==============================================================================

-- 1. Enable pgcrypto for secure cryptographic hashing
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. SECURITY DEFINER HELPER FUNCTIONS FOR ROLE & IDENTITY RESOLUTION
-- ==============================================================================

-- Resolves the authoritative role of the currently authenticated user
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS text AS $$
DECLARE
  v_role text;
  v_email text;
BEGIN
  -- 1. Master Admin Priority Check (Direct Email & Admin Domain)
  v_email := LOWER(COALESCE(auth.jwt() ->> 'email', ''));
  IF v_email = 'koperasi.simandiri@gmail.com' OR
     v_email LIKE 'admin@%' OR
     UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'ADMIN' OR
     UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'ADMIN' THEN
    RETURN 'ADMIN';
  END IF;

  IF v_email LIKE '%direksi%' OR
     v_email LIKE '%direktur%' OR
     UPPER(COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '')) = 'DIRECTOR' OR
     UPPER(COALESCE(auth.jwt() -> 'user_metadata' ->> 'role', '')) = 'DIRECTOR' THEN
    RETURN 'DIRECTOR';
  END IF;

  -- 2. Check user_roles table joined with roles table
  SELECT UPPER(r.name) INTO v_role
  FROM public.user_roles ur
  JOIN public.roles r ON ur.role_id = r.id
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 3. Check direct role column in user_roles
  SELECT UPPER(ur.role) INTO v_role
  FROM public.user_roles ur
  WHERE ur.user_id = auth.uid()
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- 4. Check profiles table
  SELECT UPPER(p.role) INTO v_role
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_role IS NOT NULL THEN
    RETURN v_role;
  END IF;

  -- Default to ANGGOTA if authenticated, NULL if anon
  IF auth.uid() IS NOT NULL THEN
    RETURN 'ANGGOTA';
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Checks if the current user is an authorized ADMIN
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN (public.current_user_role() = 'ADMIN');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Checks if the current user is DIRECTOR or ADMIN
CREATE OR REPLACE FUNCTION public.is_director_or_admin()
RETURNS boolean AS $$
DECLARE
  v_role text;
BEGIN
  v_role := public.current_user_role();
  RETURN (v_role = 'ADMIN' OR v_role = 'DIRECTOR');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Resolves member_id associated with the authenticated user
CREATE OR REPLACE FUNCTION public.current_user_member_id()
RETURNS text AS $$
DECLARE
  v_member_id text;
BEGIN
  -- 1. Check profiles member_id
  SELECT p.member_id::text INTO v_member_id
  FROM public.profiles p
  WHERE p.id = auth.uid()
  LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    RETURN v_member_id;
  END IF;

  -- 2. Check if auth.uid directly matches members.id
  SELECT m.id INTO v_member_id
  FROM public.members m
  WHERE m.id = auth.uid()::text
  LIMIT 1;

  RETURN v_member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ==============================================================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
-- ==============================================================================

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.member_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.news_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 4. RLS POLICIES: MEMBERS (KEANGGOTAAN)
-- ==============================================================================
DROP POLICY IF EXISTS members_admin_all ON public.members;
CREATE POLICY members_admin_all ON public.members
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS members_director_select ON public.members;
CREATE POLICY members_director_select ON public.members
  FOR SELECT TO authenticated
  USING (public.is_director_or_admin());

DROP POLICY IF EXISTS members_self_select ON public.members;
CREATE POLICY members_self_select ON public.members
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'ANGGOTA' AND (
      id = public.current_user_member_id() OR
      member_no = public.current_user_member_id()
    )
  );

DROP POLICY IF EXISTS members_self_update ON public.members;
CREATE POLICY members_self_update ON public.members
  FOR UPDATE TO authenticated
  USING (
    public.current_user_role() = 'ANGGOTA' AND (
      id = public.current_user_member_id() OR
      member_no = public.current_user_member_id()
    )
  )
  WITH CHECK (
    public.current_user_role() = 'ANGGOTA' AND (
      id = public.current_user_member_id() OR
      member_no = public.current_user_member_id()
    )
  );

-- ==============================================================================
-- 5. RLS POLICIES: MEMBER REGISTRATIONS (PENDAFTARAN ANGGOTA)
-- ==============================================================================
DROP POLICY IF EXISTS member_reg_insert_public ON public.member_registrations;
CREATE POLICY member_reg_insert_public ON public.member_registrations
  FOR INSERT TO anon, authenticated
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS member_reg_admin_all ON public.member_registrations;
CREATE POLICY member_reg_admin_all ON public.member_registrations
  FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 6. RLS POLICIES: TRANSACTIONS (JURNAL KEUANGAN & BUKU BESAR)
-- ==============================================================================
DROP POLICY IF EXISTS transactions_admin_all ON public.transactions;
CREATE POLICY transactions_admin_all ON public.transactions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS transactions_director_select ON public.transactions;
CREATE POLICY transactions_director_select ON public.transactions
  FOR SELECT TO authenticated
  USING (public.is_director_or_admin());

DROP POLICY IF EXISTS transactions_member_select ON public.transactions;
CREATE POLICY transactions_member_select ON public.transactions
  FOR SELECT TO authenticated
  USING (
    public.current_user_role() = 'ANGGOTA' AND (
      member_id = public.current_user_member_id()
    )
  );

-- ==============================================================================
-- 7. RLS POLICIES: MASTER DATA (COA, CATEGORIES, AREAS, MITRA, PRODUCTS)
-- ==============================================================================
-- Chart of Accounts
DROP POLICY IF EXISTS coa_select_auth ON public.chart_of_accounts;
CREATE POLICY coa_select_auth ON public.chart_of_accounts
  FOR SELECT TO authenticated, anon
  USING (TRUE);

DROP POLICY IF EXISTS coa_admin_write ON public.chart_of_accounts;
CREATE POLICY coa_admin_write ON public.chart_of_accounts
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Transaction Categories
DROP POLICY IF EXISTS categories_select_auth ON public.transaction_categories;
CREATE POLICY categories_select_auth ON public.transaction_categories
  FOR SELECT TO authenticated, anon
  USING (TRUE);

DROP POLICY IF EXISTS categories_admin_write ON public.transaction_categories;
CREATE POLICY categories_admin_write ON public.transaction_categories
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Areas
DROP POLICY IF EXISTS areas_select_all ON public.areas;
CREATE POLICY areas_select_all ON public.areas
  FOR SELECT TO authenticated, anon
  USING (TRUE);

DROP POLICY IF EXISTS areas_admin_write ON public.areas;
CREATE POLICY areas_admin_write ON public.areas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Customers & Suppliers & Products
DROP POLICY IF EXISTS customers_select ON public.customers;
CREATE POLICY customers_select ON public.customers
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS customers_admin_write ON public.customers;
CREATE POLICY customers_admin_write ON public.customers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS suppliers_select ON public.suppliers;
CREATE POLICY suppliers_select ON public.suppliers
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS suppliers_admin_write ON public.suppliers;
CREATE POLICY suppliers_admin_write ON public.suppliers
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS products_select ON public.products;
CREATE POLICY products_select ON public.products
  FOR SELECT TO authenticated, anon
  USING (TRUE);

DROP POLICY IF EXISTS products_admin_write ON public.products;
CREATE POLICY products_admin_write ON public.products
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 8. RLS POLICIES: PROFILES, ROLES, USER_ROLES & PERMISSIONS
-- ==============================================================================
-- Profiles
DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS profiles_director_select ON public.profiles;
CREATE POLICY profiles_director_select ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_director_or_admin());

DROP POLICY IF EXISTS profiles_admin_all ON public.profiles;
CREATE POLICY profiles_admin_all ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Roles & User Roles
DROP POLICY IF EXISTS roles_select_all ON public.roles;
CREATE POLICY roles_select_all ON public.roles
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS roles_admin_all ON public.roles;
CREATE POLICY roles_admin_all ON public.roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS user_roles_self_select ON public.user_roles;
CREATE POLICY user_roles_self_select ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_roles_admin_all ON public.user_roles;
CREATE POLICY user_roles_admin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS role_permissions_select ON public.role_permissions;
CREATE POLICY role_permissions_select ON public.role_permissions
  FOR SELECT TO authenticated
  USING (TRUE);

DROP POLICY IF EXISTS role_permissions_admin_all ON public.role_permissions;
CREATE POLICY role_permissions_admin_all ON public.role_permissions
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ==============================================================================
-- 9. RLS POLICIES: NEWS ARTICLES & PROJECT UPDATES
-- ==============================================================================
DROP POLICY IF EXISTS news_articles_public_select ON public.news_articles;
CREATE POLICY news_articles_public_select ON public.news_articles
  FOR SELECT TO anon, authenticated
  USING (status = 'terbit' OR public.is_director_or_admin());

DROP POLICY IF EXISTS news_articles_admin_write ON public.news_articles;
CREATE POLICY news_articles_admin_write ON public.news_articles
  FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

DROP POLICY IF EXISTS project_updates_select ON public.project_updates;
CREATE POLICY project_updates_select ON public.project_updates
  FOR SELECT TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS project_updates_admin_write ON public.project_updates;
CREATE POLICY project_updates_admin_write ON public.project_updates
  FOR ALL TO authenticated
  USING (public.is_director_or_admin())
  WITH CHECK (public.is_director_or_admin());

-- ==============================================================================
-- 10. RLS POLICIES: AUDIT LOGS (IMMUTABLE LOGS)
-- ==============================================================================
DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated, anon
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS audit_logs_select_admin ON public.audit_logs;
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (public.is_director_or_admin());

-- (No UPDATE or DELETE policies: audit logs are strictly append-only)
