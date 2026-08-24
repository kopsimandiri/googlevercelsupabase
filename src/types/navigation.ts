export type NavSection =
  | 'HOME'
  | 'MANAJEMEN'
  | 'MEMBERSHIP'
  | 'SIMPANAN'
  | 'TRANSACTIONS'
  | 'PROJECT'
  | 'FINANCE'
  | 'REPORTS'
  | 'FILES'
  | 'PORTOFOLIO'
  | 'HISTORY'
  | 'TEAM'
  | 'DATABASE_AUDIT';

export type ReportSubSection =
  | 'DASHBOARD'
  | 'KEUANGAN'
  | 'KEANGGOTAAN'
  | 'PROJECT';

export type ActivePage =
  | 'HOME'
  | 'MANAJEMEN'
  | 'MEMBERSHIP'
  | 'SIMPANAN'
  | 'TRANSACTIONS'
  | 'PROJECT'
  | 'FINANCE'
  | 'REPORTS_DASHBOARD'
  | 'REPORTS_KEUANGAN'
  | 'REPORTS_KEANGGOTAAN'
  | 'REPORTS_PROJECT'
  | 'FILES'
  | 'PORTOFOLIO'
  | 'HISTORY'
  | 'TEAM'
  | 'DATABASE_AUDIT'
  | 'MEMBER_PORTAL';

export type UserRole = 'ADMIN' | 'DIRECTOR' | 'ANGGOTA';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  memberNo?: string;
  memberId?: string;
  workArea?: string;
  nikMasked?: string;
  status?: string;
  areaJenis?: string;
  plantation?: string;
  avatarUrl?: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  title?: string;
  message: string;
  type: ToastType;
  duration?: number;
}
