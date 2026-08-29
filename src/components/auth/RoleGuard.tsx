import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { LogIn, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '../common/Button';
import { PermissionState } from '../common/PermissionState';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  fallback?: React.ReactNode;
  onRequestLogin?: () => void;
  onGoHome?: () => void;
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallback,
  onRequestLogin,
  onGoHome,
}) => {
  const { role, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    if (fallback) return <>{fallback}</>;

    return (
      <div
        id="auth-required-guard"
        className="max-w-md mx-auto my-8 p-6 sm:p-8 text-center bg-white rounded-2xl border border-stone-200 shadow-lg space-y-5"
      >
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full font-mono">
            PORTAL INTERNAL KOPSIM
          </span>
          <h3 className="text-xl font-bold text-stone-900 font-serif">
            Otorisasi Akses Diperlukan
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed max-w-sm mx-auto">
            Halaman sistem manajemen ini diperuntukkan khusus bagi anggota terdaftar, pengurus divisi, dan dewan direksi KOPSIM Mandiri.
          </p>
        </div>

        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-left text-xs space-y-2">
          <span className="font-bold text-stone-900 block">Tingkatan Hak Akses:</span>
          <div className="space-y-1.5 text-stone-600">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span><strong>ANGGOTA:</strong> Akses data simpanan pribadi & KTA digital</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span><strong>DIRECTOR:</strong> Monitoring dashboard eksekutif & 8 proyek</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span><strong>ADMIN:</strong> Kontrol penuh transaksi 20 kolom & buku besar</span>
            </div>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2.5">
          {onRequestLogin && (
            <Button
              id="btn-trigger-login-modal"
              variant="gold"
              size="md"
              onClick={onRequestLogin}
              className="w-full sm:w-auto"
              leftIcon={<LogIn className="w-4 h-4" />}
            >
              Masuk ke Sistem
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (fallback) return <>{fallback}</>;

    return (
      <PermissionState
        idPrefix="role-unauthorized-guard"
        title={`Akses Terbatas (${allowedRoles.join(' / ')})`}
        message={`Peran akun Anda saat ini adalah ${role}. Modul ini memerlukan hak otorisasi ${allowedRoles.join(' atau ')}.`}
        requiredRole={allowedRoles.join(' / ')}
        currentRole={role}
        onGoHome={onGoHome}
      />
    );
  }

  return <>{children}</>;
};

