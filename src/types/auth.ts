export type UserRole = 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  memberId?: string;
  memberNo?: string;
  workArea?: string;
  nikMasked?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  occupation?: string;
  birthDate?: string;
  birthPlace?: string;
  status?: string;
  areaJenis?: string;
  plantation?: string;
  avatarUrl?: string;
  loginTime: string;
}

export interface AuthCredentials {
  identifier: string; // email, username, or member ID
  password: string;
}

export interface MemberLoginCredentials {
  username: string;
  password: string;
}

export interface AuthState {
  user: UserSession | null;
  isLoading: boolean;
  error: string | null;
}
