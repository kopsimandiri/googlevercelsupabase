import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { Button } from '../common/Button';
import {
  Lock,
  Mail,
  User,
  AlertCircle,
  ArrowRight,
  X,
  ShieldCheck,
  CreditCard,
  Building,
} from 'lucide-react';
import { KopsimLogo } from '../common/KopsimLogo';

interface LoginFormProps {
  onSuccess?: (role: 'ADMIN' | 'DIRECTOR' | 'ANGGOTA') => void;
  onCancel?: () => void;
  isModal?: boolean;
  initialTab?: 'ANGGOTA' | 'PENGURUS';
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSuccess,
  onCancel,
  isModal = false,
  initialTab = 'ANGGOTA',
}) => {
  const { login, loginMember, isLoading, error, clearError } = useAuth();
  const { showToast } = useNotification();

  const [activeTab, setActiveTab] = useState<'ANGGOTA' | 'PENGURUS'>(initialTab);

  // Anggota Form State
  const [memberUsername, setMemberUsername] = useState<string>('');
  const [memberPassword, setMemberPassword] = useState<string>('');

  // Pengurus Form State
  const [adminEmail, setAdminEmail] = useState<string>('koperasi.simandiri@gmail.com');
  const [adminPassword, setAdminPassword] = useState<string>('');

  const handleTabChange = (tab: 'ANGGOTA' | 'PENGURUS') => {
    clearError();
    setActiveTab(tab);
  };

  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await loginMember({
      username: memberUsername,
      password: memberPassword,
    });

    if (success) {
      showToast('Selamat datang di Portal Khusus Anggota KOPSIM Mandiri.', 'success', 'Login Anggota Berhasil');
      if (onSuccess) onSuccess('ANGGOTA');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const success = await login({
      identifier: adminEmail,
      password: adminPassword,
    });

    if (success) {
      showToast('Autentikasi berhasil. Selamat datang di Portal Manajemen Internal.', 'success', 'Login Berhasil');
      if (onSuccess) onSuccess('ADMIN');
    }
  };

  return (
    <div
      id="kopsim-login-card"
      className="w-full max-w-md bg-white rounded-2xl border border-stone-200/90 shadow-2xl overflow-hidden p-6 sm:p-7 space-y-5 relative"
    >
      {isModal && onCancel && (
        <button
          id="btn-close-login-modal"
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-stone-700 rounded-lg transition-colors"
          aria-label="Tutup"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header & Official Logo */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <KopsimLogo size="lg" badgeBackground={true} />
        </div>
        <div>
          <h2 className="text-xl font-bold font-serif text-emerald-950 tracking-tight">
            PORTAL LAYANAN KOPSIM
          </h2>
          <p className="text-xs text-stone-500 font-medium">
            Koperasi Syarikat Islam Mandiri • Ekosistem Ekonomi Syariah
          </p>
        </div>
      </div>

      {/* Dual Tab Switcher */}
      <div className="flex p-1 bg-stone-100/90 rounded-xl border border-stone-200/80 gap-1 text-xs">
        <button
          id="tab-login-anggota"
          type="button"
          onClick={() => handleTabChange('ANGGOTA')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'ANGGOTA'
              ? 'bg-emerald-800 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Login Anggota</span>
        </button>

        <button
          id="tab-login-pengurus"
          type="button"
          onClick={() => handleTabChange('PENGURUS')}
          className={`flex-1 py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'PENGURUS'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/60'
          }`}
        >
          <Building className="w-3.5 h-3.5" />
          <span>Pengurus & Direksi</span>
        </button>
      </div>

      {/* Error State Banner */}
      {error && (
        <div
          id="login-error-alert"
          className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-rose-800 text-xs"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block text-rose-900">Gagal Masuk</span>
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* TAB 1: FORM LOGIN ANGGOTA */}
      {activeTab === 'ANGGOTA' ? (
        <form onSubmit={handleMemberSubmit} className="space-y-4" id="form-login-anggota">
          <div>
            <label
              htmlFor="member-username"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider"
            >
              Username Anggota
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <User className="w-4 h-4" />
              </div>
              <input
                id="member-username"
                type="text"
                required
                value={memberUsername}
                onChange={(e) => setMemberUsername(e.target.value)}
                placeholder="Masukkan username Anda"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all font-mono"
              />
            </div>
            <span className="text-[11px] text-stone-500 mt-1 block">
              Gunakan username akun Anda yang terdaftar pada sistem KOPSIM.
            </span>
          </div>

          <div>
            <label
              htmlFor="member-password"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider"
            >
              Password Anggota
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="member-password"
                type="password"
                required
                value={memberPassword}
                onChange={(e) => setMemberPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-700 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-50/80 border border-emerald-200/80 text-[11px] text-emerald-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Akses langsung ke saldo Simpanan Pokok/Wajib & Kartu Anggota (KTA).</span>
          </div>

          <Button
            id="btn-submit-member-login"
            type="submit"
            variant="primary"
            size="lg"
            className="w-full justify-center shadow-md font-bold bg-emerald-800 hover:bg-emerald-700 text-white"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Masuk Portal Anggota
          </Button>
        </form>
      ) : (
        /* TAB 2: FORM LOGIN PENGURUS & DIREKSI */
        <form onSubmit={handleAdminSubmit} className="space-y-4" id="form-login-pengurus">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider"
            >
              Email atau Username Pengurus
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="admin-email"
                type="text"
                required
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@kopsim.id atau admin"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-stone-700 mb-1.5 uppercase tracking-wider"
            >
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="admin-password"
                type="password"
                required
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-3.5 py-2.5 bg-stone-50/80 border border-stone-300 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-600 focus:bg-white transition-all font-mono"
              />
            </div>
          </div>

          <Button
            id="btn-submit-admin-login"
            type="submit"
            variant="gold"
            size="lg"
            className="w-full justify-center shadow-md font-bold"
            isLoading={isLoading}
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            Masuk Manajemen Internal
          </Button>
        </form>
      )}
    </div>
  );
};

