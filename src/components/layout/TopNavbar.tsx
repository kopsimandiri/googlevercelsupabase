import React from 'react';
import {
  Menu,
  Shield,
  User,
  Bell,
  Database,
  LogIn,
  LogOut,
  Globe,
  Lock,
  UserPlus,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { isSupabaseConfigured } from '../../lib/supabase';
import { useNotification } from '../../context/NotificationContext';
import { UserRole } from '../../types/auth';
import { ActivePage } from '../../types/navigation';
import { KopsimLogo } from '../common/KopsimLogo';

interface TopNavbarProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onToggleSidebar: () => void;
  onRequestLogin: () => void;
  onOpenRegister: () => void;
}

export const TopNavbar: React.FC<TopNavbarProps> = ({
  activePage,
  onNavigate,
  onToggleSidebar,
  onRequestLogin,
  onOpenRegister,
}) => {
  const { user, role, isAuthenticated, logout, setRole } = useAuth();
  const { showToast } = useNotification();

  const isInternal =
    activePage === 'REPORTS_DASHBOARD' ||
    activePage === 'MEMBERSHIP' ||
    activePage === 'SIMPANAN' ||
    activePage === 'TRANSACTIONS' ||
    activePage === 'FINANCE' ||
    activePage === 'PROJECT' ||
    activePage === 'REPORTS_KEUANGAN' ||
    activePage === 'FILES' ||
    activePage === 'DATABASE_AUDIT' ||
    activePage === 'NEWS_ADMIN' ||
    activePage === 'MEMBER_PORTAL';

  const handleLogout = async () => {
    await logout();
    showToast('Anda telah keluar dari sesi KOPSIM.', 'info', 'Logout Berhasil');
    onNavigate('HOME');
  };

  return (
    <header
      id="kopsim-top-navbar"
      className="sticky top-0 z-30 flex items-center justify-between h-16 px-3 sm:px-5 md:px-6 bg-primary-900 text-white border-b border-primary-800 shadow-md"
    >
      {/* Left: Mobile Toggle & Official Brand Logo */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          id="btn-sidebar-toggle"
          onClick={onToggleSidebar}
          className="p-2 -ml-1 text-stone-200 hover:text-white hover:bg-primary-800 rounded-lg lg:hidden transition-colors"
          aria-label="Buka menu navigasi"
        >
          <Menu className="w-5 h-5" />
        </button>

        <button
          id="btn-brand-home"
          onClick={() => onNavigate('HOME')}
          className="flex items-center text-left focus:outline-hidden group"
        >
          <KopsimLogo
            size="md"
            badgeBackground={true}
            showText={true}
            variant="light"
            className="group-hover:opacity-95 transition-opacity"
          />
        </button>
      </div>

      {/* Middle: Explicit Portal Switcher Pill (Desktop) */}
      <div className="hidden lg:flex items-center bg-primary-950/70 p-1 rounded-xl border border-primary-800">
        <button
          onClick={() => onNavigate('HOME')}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            !isInternal
              ? 'bg-primary-700 text-white shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-primary-800/60'
          }`}
        >
          <Globe className="w-3.5 h-3.5 text-accent-gold" />
          <span>Portal Publik</span>
        </button>

        <button
          onClick={() => {
            if (!isAuthenticated) {
              onRequestLogin();
            } else if (role === 'ANGGOTA') {
              onNavigate('MEMBER_PORTAL');
            } else {
              onNavigate('REPORTS_DASHBOARD');
            }
          }}
          className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            isInternal
              ? 'bg-accent-gold text-white font-bold shadow-xs'
              : 'text-stone-300 hover:text-white hover:bg-primary-800/60'
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>{role === 'ANGGOTA' ? 'Portal Anggota' : 'Portal Internal'}</span>
          {!isAuthenticated && (
            <span className="text-[9px] bg-primary-950/80 text-accent-gold px-1.5 py-0.5 rounded font-mono">
              Login
            </span>
          )}
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Tombol Daftar Anggota (Jika di portal publik) */}
        {!isInternal && (
          <button
            onClick={onOpenRegister}
            className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-accent-gold hover:bg-accent-gold-dark text-white text-xs font-bold shadow-xs transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Daftar Anggota</span>
          </button>
        )}

        {/* Status Database / Supabase */}
        <div
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-primary-950/60 rounded-full border border-primary-800 text-[11px] text-stone-300"
          title="Status Sinkronisasi Supabase PostgreSQL"
        >
          <Database className="w-3 h-3 text-primary-500" />
          <span>{isSupabaseConfigured ? 'Cloud Synced' : 'Local Storage'}</span>
        </div>

        {/* Notification Bell with Badge */}
        <button
          id="btn-top-notifications"
          onClick={() => onNavigate('NOTIFICATIONS')}
          className="relative p-2 text-white hover:bg-primary-800 rounded-lg transition-colors"
          aria-label="Pusat Notifikasi"
          title="Buka Pusat Notifikasi"
        >
          <Bell className="w-5 h-5 text-white" />
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-status-warning text-white text-[9px] font-bold leading-none shadow-xs">
            2
          </span>
        </button>

        {/* If Authenticated: Role Switcher & User Profile */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2">
            {/* Quick Demo Role Selector */}
            <div className="hidden sm:flex items-center bg-primary-950/80 rounded-lg p-0.5 border border-primary-800 text-xs">
              {(['ADMIN', 'DIRECTOR', 'ANGGOTA'] as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-colors ${
                    role === r
                      ? 'bg-accent-gold text-white shadow-xs'
                      : 'text-stone-300 hover:text-white'
                  }`}
                  title={`Ganti peran uji coba ke ${r}`}
                >
                  {r}
                </button>
              ))}
            </div>

            {/* User Dropdown / Logout Button */}
            <div className="flex items-center gap-2 pl-2 border-l border-primary-800">
              <div className="hidden sm:block text-right">
                <span className="text-xs font-bold text-white block leading-tight truncate max-w-[120px]">
                  {user.name}
                </span>
                <span className="text-[9px] text-accent-gold font-mono block">
                  {role}
                </span>
              </div>

              <button
                id="top-logout-btn"
                onClick={handleLogout}
                className="p-1.5 text-stone-300 hover:text-white hover:bg-primary-800 rounded-lg transition-colors"
                title="Keluar Sesi"
                aria-label="Logout"
              >
                <LogOut className="w-4 h-4 text-rose-300" />
              </button>
            </div>
          </div>
        ) : (
          /* If Not Authenticated: Login Gateway Button */
          <button
            id="top-login-btn"
            onClick={onRequestLogin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-700 hover:bg-primary-500 text-white text-xs font-semibold border border-primary-600 shadow-xs transition-colors"
          >
            <LogIn className="w-3.5 h-3.5 text-accent-gold" />
            <span>Masuk Internal</span>
          </button>
        )}
      </div>
    </header>
  );
};
