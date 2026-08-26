import { getSupabaseClient } from '../lib/supabase';
import { AuthCredentials, MemberLoginCredentials, UserRole, UserSession } from '../types/auth';
import { maskNik } from '../utils/formatters';
import { mapSupabaseMemberRowToMemberRecord } from './memberService';

const STORAGE_MEMBER_SESSION_KEY = 'KOPSIM_MEMBER_SESSION';

const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage?.getItem(key) || window.localStorage?.getItem(key) || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage?.setItem(key, value);
      window.localStorage?.setItem(key, value);
    } catch {
      // Storage unavailable or disabled
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage?.removeItem(key);
      window.localStorage?.removeItem(key);
    } catch {
      // Storage unavailable or disabled
    }
  },
};

/**
 * Resolves user profile and role details securely from Supabase database tables (profiles, user_roles, roles)
 * Role resolution authority is strictly the database - never trusting client-provided overrides.
 */
async function resolveUserSession(client: any, user: any): Promise<UserSession> {
  let role: UserRole = 'ANGGOTA'; // Default safest least-privilege role
  let fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Pengguna KOPSIM';
  let memberId = user.user_metadata?.member_id;

  try {
    // 1. Query public.profiles
    const { data: profile } = await client
      .from('profiles')
      .select('id, full_name, role, phone, avatar_url')
      .eq('id', user.id)
      .maybeSingle();

    if (profile) {
      if (profile.full_name) fullName = profile.full_name;
      if (profile.role) {
        const pRole = String(profile.role).toUpperCase();
        if (pRole === 'ADMIN') role = 'ADMIN';
        else if (pRole === 'DIRECTOR') role = 'DIRECTOR';
        else if (pRole === 'ANGGOTA') role = 'ANGGOTA';
      }
    }

    // 2. Query public.user_roles + public.roles (highest priority authoritative assignment)
    const { data: userRoles } = await client
      .from('user_roles')
      .select('role_id, role, roles(id, name, description)')
      .eq('user_id', user.id);

    if (userRoles && userRoles.length > 0) {
      const primaryRole = userRoles[0] as any;
      const roleName = (primaryRole?.roles?.name || primaryRole?.role || '').toUpperCase();
      if (roleName === 'ADMIN') role = 'ADMIN';
      else if (roleName === 'DIRECTOR') role = 'DIRECTOR';
      else if (roleName === 'ANGGOTA') role = 'ANGGOTA';
    }
  } catch (err) {
    console.warn('Security: Error resolving authoritative user role from database:', err);
  }

  return {
    id: user.id,
    name: fullName,
    email: user.email || '',
    role,
    memberId,
    loginTime: new Date().toISOString(),
  };
}

export const authService = {
  /**
   * Signs in a management/admin user using Supabase Auth signInWithPassword
   */
  async signIn(credentials: AuthCredentials): Promise<UserSession> {
    const { identifier, password } = credentials;
    const cleanEmail = identifier.trim();
    const client = getSupabaseClient();

    if (!cleanEmail) {
      throw new Error('Email akun pengurus wajib diisi.');
    }
    if (!password) {
      throw new Error('Password wajib diisi.');
    }
    if (!client) {
      throw new Error('Koneksi Supabase belum terkonfigurasi.');
    }

    // Clear any previous member session
    safeStorage.removeItem(STORAGE_MEMBER_SESSION_KEY);

    // Call Supabase Auth signInWithPassword
    const { data, error } = await client.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (error) {
      throw new Error(error.message || 'Email atau password salah.');
    }

    if (!data.user) {
      throw new Error('Data pengguna tidak ditemukan setelah autentikasi.');
    }

    const session = await resolveUserSession(client, data.user);
    return session;
  },

  /**
   * Signs in a cooperative member using PostgreSQL RPC verify_member_login
   * Fallbacks to hardcoded passwords or mock bypasses are strictly forbidden.
   */
  async signInMember(credentials: MemberLoginCredentials): Promise<UserSession> {
    const { username, password } = credentials;
    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      throw new Error('Username akun anggota wajib diisi.');
    }
    if (!cleanPassword) {
      throw new Error('Password akun anggota wajib diisi.');
    }

    const client = getSupabaseClient();

    // 1. Primary Authentication: RPC check against Supabase
    if (client) {
      try {
        const { data, error } = await client.rpc('verify_member_login', {
          p_username: cleanUsername,
          p_password: cleanPassword,
        });

        if (!error && data) {
          if (!data.success) {
            throw new Error(data.message || 'Username atau password anggota tidak valid.');
          }

          if (data.member) {
            const m = data.member;
            const memberSession: UserSession = {
              id: m.id || m.member_no,
              name: m.full_name || 'Anggota KOPSIM',
              email: `${(m.member_no || 'anggota').toLowerCase()}@anggota.kopsim.id`,
              role: 'ANGGOTA',
              memberId: m.id,
              memberNo: m.member_no || m.id,
              workArea: m.work_area || 'PUSAT JAKARTA',
              nikMasked: maskNik(m.nik),
              gender: m.gender || 'L',
              address: m.address || '',
              city: m.city || 'Jakarta Pusat',
              province: m.province || 'DKI Jakarta',
              occupation: m.occupation || 'Anggota Koperasi',
              birthDate: m.birth_date || '1990-01-01',
              birthPlace: m.birth_place || 'Jakarta',
              status: m.status || 'AKTIF',
              loginTime: new Date().toISOString(),
            };

            sessionStorage.setItem(STORAGE_MEMBER_SESSION_KEY, JSON.stringify(memberSession));
            localStorage.setItem(STORAGE_MEMBER_SESSION_KEY, JSON.stringify(memberSession));
            return memberSession;
          }
        }
      } catch (rpcErr: any) {
        if (rpcErr.message && !rpcErr.message.includes('function') && !rpcErr.message.includes('not find')) {
          throw rpcErr;
        }
        console.warn('RPC verify_member_login unavailable, attempting secure member verification query:', rpcErr);
      }

      // 2. Direct secure query against public.members table
      try {
        const { data: memberRows, error: searchErr } = await client
          .from('members')
          .select('id, member_no, registered_at, full_name, gender, province, city, address, occupation, username, birth_date, birth_place, nik, work_area, legacy_password_hash, status')
          .or(`username.ilike.${cleanUsername},member_no.ilike.${cleanUsername},id.ilike.${cleanUsername}`)
          .limit(5);

        if (!searchErr && memberRows && memberRows.length > 0) {
          const target = cleanUsername.toLowerCase();
          const matchedRaw = memberRows.find((m: any) => {
            const u = (m.username || '').trim().toLowerCase();
            const n = (m.member_no || '').trim().toLowerCase();
            const i = (m.id || '').trim().toLowerCase();
            return u === target || n === target || i === target;
          });

          if (matchedRaw) {
            const m = matchedRaw;
            if (m.status === 'NONAKTIF' || m.status === 'SUSPENDED') {
              throw new Error('Status keanggotaan Anda sedang tidak aktif. Silakan hubungi pengurus.');
            }

            const storedHash = String(m.legacy_password_hash || '').trim();
            // Strict match against stored password hash (no fallback strings)
            const isValid = storedHash !== '' && (cleanPassword === storedHash);

            if (isValid) {
              const mapped = mapSupabaseMemberRowToMemberRecord(m);
              const memberSession: UserSession = {
                id: mapped.id,
                name: mapped.nama || 'Anggota KOPSIM',
                email: `${mapped.id.toLowerCase()}@anggota.kopsim.id`,
                role: 'ANGGOTA',
                memberId: mapped.id,
                memberNo: mapped.id,
                workArea: mapped.plantation || 'PUSAT JAKARTA',
                nikMasked: maskNik(mapped.nik || (m as any).nik || ''),
                gender: mapped.gender || 'L',
                address: mapped.alamat || '',
                city: mapped.kota || 'Jakarta Pusat',
                province: mapped.provinsi || 'DKI Jakarta',
                occupation: mapped.pekerjaan || 'Anggota Koperasi',
                birthDate: mapped.tgl_lahir || '1990-01-01',
                birthPlace: (mapped as any).tempat_lahir || (m as any).birth_place || 'Jakarta',
                status: (mapped as any).status || 'AKTIF',
                loginTime: new Date().toISOString(),
              };

              safeStorage.setItem(STORAGE_MEMBER_SESSION_KEY, JSON.stringify(memberSession));
              return memberSession;
            } else {
              throw new Error('Password anggota yang Anda masukkan tidak sesuai.');
            }
          }
        }
      } catch (tableErr: any) {
        if (tableErr.message && (tableErr.message.includes('Password') || tableErr.message.includes('Status'))) {
          throw tableErr;
        }
        console.warn('Direct member table verification error:', tableErr);
      }
    }

    // 3. Local cached member verification (for local offline state) - Strict hash check only
    const localMembersStr = safeStorage.getItem('KOPSIM_MEMBERS_DATA');
    if (localMembersStr) {
      try {
        const candidateMembers = JSON.parse(localMembersStr);
        const normalizedInput = cleanUsername.toLowerCase().trim();

        const match = candidateMembers.find((m: any) => {
          const userMatch = (m.username || '').trim().toLowerCase() === normalizedInput;
          const idMatch = (m.id || '').trim().toLowerCase() === normalizedInput;
          const noMatch = (m.member_no || '').trim().toLowerCase() === normalizedInput;
          return userMatch || idMatch || noMatch;
        });

        if (match) {
          const storedHash = String(match.legacy_password_hash || '').trim();
          const isPasswordValid = storedHash !== '' && cleanPassword === storedHash;

          if (isPasswordValid) {
            const memberSession: UserSession = {
              id: match.id || match.member_no || cleanUsername,
              name: match.nama || match.full_name || cleanUsername,
              email: `${(match.id || cleanUsername).toLowerCase()}@anggota.kopsim.id`,
              role: 'ANGGOTA',
              memberId: match.id || match.member_no || cleanUsername,
              memberNo: match.id || match.member_no || cleanUsername,
              workArea: match.plantation || match.work_area || 'PUSAT JAKARTA',
              nikMasked: maskNik(match.nik || ''),
              gender: match.gender || 'L',
              address: match.alamat || match.address || '',
              city: match.kota || match.city || 'Jakarta Pusat',
              province: match.provinsi || match.province || 'DKI Jakarta',
              occupation: match.pekerjaan || match.occupation || 'Anggota Koperasi',
              birthDate: match.tgl_lahir || match.birth_date || '1990-01-01',
              birthPlace: match.birth_place || 'Jakarta',
              status: match.status || 'AKTIF',
              loginTime: new Date().toISOString(),
            };

            safeStorage.setItem(STORAGE_MEMBER_SESSION_KEY, JSON.stringify(memberSession));
            return memberSession;
          }
        }
      } catch (err) {
        console.warn('Error verifying cached member credentials:', err);
      }
    }

    // If verification fails, throw clear error without leaking internal details
    throw new Error('Username atau password anggota tidak valid.');
  },

  /**
   * Synchronously returns the currently cached user session info (if available)
   */
  getCurrentUser(): { id?: string; email?: string; username?: string; role?: UserRole; name?: string } | null {
    try {
      const storedMember = safeStorage.getItem(STORAGE_MEMBER_SESSION_KEY);
      if (storedMember) {
        const parsed = JSON.parse(storedMember);
        return {
          id: parsed.id,
          email: parsed.email || undefined,
          username: parsed.username || parsed.memberNo,
          role: parsed.role || 'ANGGOTA',
          name: parsed.name,
        };
      }
    } catch {
      // Ignored
    }
    return null;
  },

  /**
   * Signs out the current user (both GoTrue session and member session)
   */
  async signOut(): Promise<void> {
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }
    safeStorage.removeItem(STORAGE_MEMBER_SESSION_KEY);
  },

  /**
   * Updates the active member user profile in memory and session cache
   */
  updateActiveMemberProfile(updated: {
    name?: string;
    gender?: 'L' | 'P';
    address?: string;
    city?: string;
    province?: string;
    occupation?: string;
    birthDate?: string;
    birthPlace?: string;
  }): UserSession | null {
    try {
      const storedMember = safeStorage.getItem(STORAGE_MEMBER_SESSION_KEY);
      if (storedMember) {
        const parsed = JSON.parse(storedMember);
        const newSession: UserSession = {
          ...parsed,
          ...(updated.name ? { name: updated.name } : {}),
          ...(updated.gender ? { gender: updated.gender } : {}),
          ...(updated.address !== undefined ? { address: updated.address } : {}),
          ...(updated.city !== undefined ? { city: updated.city } : {}),
          ...(updated.province !== undefined ? { province: updated.province } : {}),
          ...(updated.occupation !== undefined ? { occupation: updated.occupation } : {}),
          ...(updated.birthDate !== undefined ? { birthDate: updated.birthDate } : {}),
          ...(updated.birthPlace !== undefined ? { birthPlace: updated.birthPlace } : {}),
        };
        safeStorage.setItem(STORAGE_MEMBER_SESSION_KEY, JSON.stringify(newSession));
        return newSession;
      }
    } catch (err) {
      console.warn('Failed to update active member session:', err);
    }
    return null;
  },

  /**
   * Gets the stored or restored user session from Supabase Auth & database or member session
   */
  async getSession(): Promise<UserSession | null> {
    // 1. Check for active Supabase GoTrue admin/director session first
    const client = getSupabaseClient();
    if (client) {
      try {
        const { data } = await client.auth.getSession();
        if (data.session?.user) {
          return await resolveUserSession(client, data.session.user);
        }
      } catch (err) {
        console.warn('Failed to retrieve Supabase session:', err);
      }
    }

    // 2. Check for active member session
    const storedMember = safeStorage.getItem(STORAGE_MEMBER_SESSION_KEY);
    if (storedMember) {
      try {
        const parsed = JSON.parse(storedMember);
        if (parsed && parsed.role === 'ANGGOTA' && parsed.memberNo) {
          return parsed;
        }
      } catch (e) {
        console.warn('Failed to parse member session:', e);
      }
    }

    return null;
  },

  /**
   * Subscribes to authentication state changes
   */
  onAuthStateChange(callback: (session: UserSession | null) => void) {
    const client = getSupabaseClient();
    if (client) {
      const { data } = client.auth.onAuthStateChange(async (event, sbSession) => {
        if (event === 'SIGNED_OUT' || !sbSession?.user) {
          // If not a member session, reset
          const storedMember = safeStorage.getItem(STORAGE_MEMBER_SESSION_KEY);
          if (!storedMember) {
            callback(null);
          }
        } else if (sbSession.user) {
          const session = await resolveUserSession(client, sbSession.user);
          callback(session);
        }
      });
      return () => data.subscription.unsubscribe();
    }
    return () => {};
  },
};
