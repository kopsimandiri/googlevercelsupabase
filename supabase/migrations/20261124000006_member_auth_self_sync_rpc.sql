-- ==============================================================================
-- KOPSIM MANDIRI: SINKRONISASI MANDIRI AUTH ANGGOTA (TANPA SERVICE_ROLE_KEY)
-- File: 20261124000006_member_auth_self_sync_rpc.sql
-- Tujuan:
--   1. Memastikan anggota yang kredensialnya sudah lolos verifikasi terhadap
--      tabel `public.members` tetap dapat memperoleh sesi JWT Supabase Auth
--      (`<member_no>@anggota.kopsim.id`) meskipun server tidak memiliki
--      `SUPABASE_SERVICE_ROLE_KEY` (misalnya pada lingkungan preview/serverless).
--   2. Keamanan:
--      - Memverifikasi username & password secara ketat terhadap `public.members`.
--      - HANYA mengonfirmasi/memperbarui akun bertipe `@anggota.kopsim.id`
--        dengan role tetap `'ANGGOTA'` (tidak pernah menyentuh akun ADMIN/DIRECTOR).
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.sync_verified_member_auth(
  p_username TEXT,
  p_password TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_clean_username TEXT := LOWER(TRIM(COALESCE(p_username, '')));
  v_clean_password TEXT := TRIM(COALESCE(p_password, ''));
  v_member public.members%ROWTYPE;
  v_member_no TEXT;
  v_email TEXT;
  v_auth_id UUID;
  v_password_valid BOOLEAN := FALSE;
BEGIN
  IF v_clean_username = '' OR v_clean_password = '' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Username dan password wajib diisi.');
  END IF;

  SELECT * INTO v_member
  FROM public.members
  WHERE LOWER(COALESCE(username, '')) = v_clean_username
     OR LOWER(COALESCE(member_no, '')) = v_clean_username
     OR LOWER(id::TEXT) = v_clean_username
     OR LOWER(COALESCE(nik, '')) = v_clean_username
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object('success', FALSE, 'message', 'Akun anggota tidak ditemukan.');
  END IF;

  IF v_member.status IN ('NONAKTIF', 'SUSPENDED') THEN
    RETURN json_build_object('success', FALSE, 'message', 'Status keanggotaan tidak aktif.');
  END IF;

  IF COALESCE(TRIM(v_member.legacy_password_hash), '') <> '' THEN
    IF v_member.legacy_password_hash = v_clean_password
       OR v_member.legacy_password_hash = crypt(v_clean_password, v_member.legacy_password_hash) THEN
      v_password_valid := TRUE;
    END IF;
  END IF;

  IF NOT v_password_valid THEN
    RETURN json_build_object('success', FALSE, 'message', 'Kredensial anggota tidak sesuai.');
  END IF;

  v_member_no := TRIM(COALESCE(NULLIF(v_member.member_no, ''), v_member.id::TEXT));
  v_email := LOWER(v_member_no) || '@anggota.kopsim.id';

  -- Keamanan mutlak: hanya izinkan sinkronisasi domain anggota
  IF v_email NOT LIKE '%@anggota.kopsim.id' THEN
    RETURN json_build_object('success', FALSE, 'message', 'Domain akun tidak diizinkan.');
  END IF;

  BEGIN
    SELECT u.id INTO v_auth_id
    FROM auth.users u
    WHERE LOWER(COALESCE(u.email, '')) = v_email
    LIMIT 1;

    IF v_auth_id IS NULL THEN
      RETURN json_build_object(
        'success', FALSE,
        'needs_signup', TRUE,
        'email', v_email,
        'member_no', v_member_no,
        'message', 'Akun Supabase Auth anggota belum terdaftar; silakan panggil auth.signUp terlebih dahulu.'
      );
    END IF;

    UPDATE auth.users
    SET
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      encrypted_password = crypt(v_clean_password, gen_salt('bf')),
      raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
        'role', 'ANGGOTA',
        'member_no', v_member_no,
        'member_id', v_member.id::TEXT,
        'full_name', COALESCE(v_member.full_name, '')
      ),
      raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object(
        'role', 'ANGGOTA',
        'member_no', v_member_no
      ),
      updated_at = NOW()
    WHERE id = v_auth_id;

    INSERT INTO public.profiles (id, full_name, role, member_id, username)
    VALUES (
      v_auth_id,
      COALESCE(v_member.full_name, 'Anggota KOPSIM'),
      'ANGGOTA',
      v_member_no,
      COALESCE(NULLIF(v_member.username, ''), v_member_no)
    )
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      role = 'ANGGOTA',
      member_id = EXCLUDED.member_id,
      username = EXCLUDED.username;

    RETURN json_build_object(
      'success', TRUE,
      'email', v_email,
      'member_no', v_member_no,
      'auth_id', v_auth_id
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object(
      'success', FALSE,
      'code', SQLSTATE,
      'message', SQLERRM
    );
  END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_verified_member_auth(TEXT, TEXT) TO anon, authenticated;
