import { useState, useEffect, useCallback } from 'react';
import { ActivePage } from '../types/navigation';

export interface RouteMapping {
  path: string;
  page: ActivePage;
  tab?: string;
  boundary: 'PUBLIC' | 'MEMBER_PORTAL' | 'ADMIN';
  requiresAuth?: boolean;
  requiredRoles?: ('ADMIN' | 'DIRECTOR' | 'ANGGOTA')[];
}

export const ROUTE_DEFINITIONS: RouteMapping[] = [
  // PUBLIC
  { path: '/', page: 'HOME', boundary: 'PUBLIC' },
  { path: '/tentang', page: 'TEAM', boundary: 'PUBLIC' },
  { path: '/sejarah', page: 'HISTORY', boundary: 'PUBLIC' },
  { path: '/berita', page: 'NEWS_LIST', boundary: 'PUBLIC' },
  { path: '/proyek', page: 'PORTOFOLIO', boundary: 'PUBLIC' },
  { path: '/berkas', page: 'FILES', boundary: 'PUBLIC' },

  // MEMBER PORTAL
  { path: '/portal/login', page: 'HOME', boundary: 'MEMBER_PORTAL' },
  { path: '/portal/dashboard', page: 'MEMBER_PORTAL', boundary: 'MEMBER_PORTAL', requiresAuth: true, tab: 'dashboard' },
  { path: '/portal/profile', page: 'MEMBER_PORTAL', boundary: 'MEMBER_PORTAL', requiresAuth: true, tab: 'profile' },
  { path: '/portal/simpanan', page: 'SIMPANAN', boundary: 'MEMBER_PORTAL', requiresAuth: true, tab: 'simpanan' },
  { path: '/portal/kta', page: 'MEMBER_PORTAL', boundary: 'MEMBER_PORTAL', requiresAuth: true, tab: 'kta' },

  // ADMIN / MANAGEMENT
  { path: '/admin', page: 'REPORTS_DASHBOARD', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/dashboard', page: 'REPORTS_DASHBOARD', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/members', page: 'MEMBERSHIP', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/transactions', page: 'TRANSACTIONS', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/finance', page: 'FINANCE', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/reports', page: 'REPORTS_KEUANGAN', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/reports/membership', page: 'REPORTS_KEANGGOTAAN', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/reports/project', page: 'REPORTS_PROJECT', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/projects', page: 'PROJECT', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/audit', page: 'DATABASE_AUDIT', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
  { path: '/admin/news', page: 'NEWS_ADMIN', boundary: 'ADMIN', requiresAuth: true, requiredRoles: ['ADMIN', 'DIRECTOR'] },
];

export function pageToPath(page: ActivePage, subTab?: string): string {
  switch (page) {
    case 'HOME':
      return '/';
    case 'TEAM':
      return '/tentang';
    case 'HISTORY':
      return '/sejarah';
    case 'NEWS_LIST':
    case 'NEWS_DETAIL':
      return '/berita';
    case 'PORTOFOLIO':
      return '/proyek';
    case 'FILES':
      return '/berkas';
    case 'MEMBER_PORTAL':
      return subTab ? `/portal/${subTab}` : '/portal/dashboard';
    case 'SIMPANAN':
      return '/portal/simpanan';
    case 'REPORTS_DASHBOARD':
      return '/admin';
    case 'MEMBERSHIP':
      return '/admin/members';
    case 'TRANSACTIONS':
      return '/admin/transactions';
    case 'FINANCE':
      return '/admin/finance';
    case 'REPORTS_KEUANGAN':
      return '/admin/reports';
    case 'REPORTS_KEANGGOTAAN':
      return '/admin/reports/membership';
    case 'REPORTS_PROJECT':
      return '/admin/reports/project';
    case 'PROJECT':
      return '/admin/projects';
    case 'DATABASE_AUDIT':
      return '/admin/audit';
    case 'NEWS_ADMIN':
      return '/admin/news';
    default:
      return '/';
  }
}

export function pathToPage(currentPath: string): { page: ActivePage; tab?: string; boundary: 'PUBLIC' | 'MEMBER_PORTAL' | 'ADMIN' } {
  // Normalize path from hash or pathname
  let normalized = currentPath.trim();
  if (normalized.startsWith('#')) {
    normalized = normalized.substring(1);
  }
  if (!normalized || normalized === '') {
    normalized = '/';
  }

  const match = ROUTE_DEFINITIONS.find((r) => r.path === normalized);
  if (match) {
    return { page: match.page, tab: match.tab, boundary: match.boundary };
  }

  // Prefix matching
  if (normalized.startsWith('/admin')) {
    return { page: 'REPORTS_DASHBOARD', boundary: 'ADMIN' };
  }
  if (normalized.startsWith('/portal')) {
    return { page: 'MEMBER_PORTAL', boundary: 'MEMBER_PORTAL' };
  }

  return { page: 'HOME', boundary: 'PUBLIC' };
}

export function useAppRouter() {
  const getInitialPath = (): string => {
    if (typeof window !== 'undefined') {
      if (window.location.hash) {
        return window.location.hash.substring(1);
      }
      if (window.location.pathname && window.location.pathname !== '/') {
        return window.location.pathname;
      }
    }
    return '/';
  };

  const [currentPath, setCurrentPath] = useState<string>(getInitialPath());

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.hash ? window.location.hash.substring(1) : window.location.pathname;
      setCurrentPath(path || '/');
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('hashchange', handlePopState);
    };
  }, []);

  const navigate = useCallback((target: ActivePage | string, subTab?: string) => {
    let targetPath = '';
    if (typeof target === 'string' && target.startsWith('/')) {
      targetPath = target;
    } else {
      targetPath = pageToPath(target as ActivePage, subTab);
    }

    setCurrentPath(targetPath);
    if (typeof window !== 'undefined') {
      window.location.hash = targetPath;
    }
  }, []);

  const routeInfo = pathToPage(currentPath);

  return {
    currentPath,
    activePage: routeInfo.page,
    activeTab: routeInfo.tab,
    boundary: routeInfo.boundary,
    navigate,
  };
}
