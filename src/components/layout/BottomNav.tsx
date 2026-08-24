import React from 'react';
import { Home, Package, UserPlus, LayoutDashboard, LogIn, User } from 'lucide-react';
import { ActivePage } from '../../types/navigation';
import { useAuth } from '../../context/AuthContext';

interface BottomNavProps {
  activePage: ActivePage;
  onNavigate: (page: ActivePage) => void;
  onOpenRegister: () => void;
  onRequestLogin: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activePage,
  onNavigate,
  onOpenRegister,
  onRequestLogin,
}) => {
  const { isAuthenticated, user, role } = useAuth();

  const isInternalActive =
    activePage === 'REPORTS_DASHBOARD' ||
    activePage === 'MEMBERSHIP' ||
    activePage === 'SIMPANAN' ||
    activePage === 'TRANSACTIONS' ||
    activePage === 'FINANCE' ||
    activePage === 'PROJECT' ||
    activePage === 'REPORTS_KEUANGAN';

  return (
    <div
      id="kopsim-mobile-bottom-nav"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface border-t border-stone-200 px-2 py-1.5 flex items-center justify-around shadow-lg safe-area-bottom"
    >
      {/* 1. Beranda */}
      <button
        onClick={() => onNavigate('HOME')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          activePage === 'HOME' ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-primary-700'
        }`}
      >
        <Home className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight">Beranda</span>
      </button>

      {/* 2. Katalog Komoditas */}
      <button
        onClick={() => onNavigate('PORTOFOLIO')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          activePage === 'PORTOFOLIO' ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-primary-700'
        }`}
      >
        <Package className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight">Katalog</span>
      </button>

      {/* 3. Aksi Utama Tengah: Daftar (Saat ini) */}
      <button
        onClick={onOpenRegister}
        className="flex flex-col items-center justify-center p-1 rounded-xl bg-accent-gold hover:bg-accent-gold-dark text-white font-bold -mt-3 shadow-md border-2 border-surface min-w-[58px] transition-all"
      >
        <UserPlus className="w-4 h-4" />
        <span className="text-[9px] tracking-tight mt-0.5">Daftar</span>
      </button>

      {/* 4. Portal Internal */}
      <button
        onClick={() => onNavigate('REPORTS_DASHBOARD')}
        className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
          isInternalActive ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-primary-700'
        }`}
      >
        <LayoutDashboard className="w-4 h-4 mb-0.5" />
        <span className="text-[10px] tracking-tight">Internal</span>
      </button>

      {/* 5. Akun / Login */}
      {isAuthenticated ? (
        <button
          onClick={() => onNavigate('MEMBERSHIP')}
          className={`flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] transition-colors ${
            activePage === 'MEMBERSHIP' ? 'text-primary-700 font-bold' : 'text-text-muted hover:text-primary-700'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-primary-700 border border-accent-gold text-[8px] flex items-center justify-center font-bold text-white mb-0.5">
            {role[0]}
          </div>
          <span className="text-[10px] tracking-tight truncate max-w-[50px]">{user?.name?.split(' ')[0] || role}</span>
        </button>
      ) : (
        <button
          onClick={onRequestLogin}
          className="flex flex-col items-center justify-center p-1.5 rounded-lg min-w-[56px] text-text-muted hover:text-primary-700 transition-colors"
        >
          <LogIn className="w-4 h-4 mb-0.5" />
          <span className="text-[10px] tracking-tight">Masuk</span>
        </button>
      )}
    </div>
  );
};
