import React from 'react';
import { ShieldAlert, Lock, ArrowLeft, Home } from 'lucide-react';
import { Button } from './Button';

interface PermissionStateProps {
  title?: string;
  message?: string;
  requiredRole?: string;
  currentRole?: string;
  onBack?: () => void;
  onGoHome?: () => void;
  idPrefix?: string;
}

export const PermissionState: React.FC<PermissionStateProps> = ({
  title = 'Akses Terbatas',
  message = 'Anda tidak memiliki hak akses (otorisasi) untuk membuka modul atau halaman ini.',
  requiredRole = 'ADMIN / DIRECTOR',
  currentRole = 'ANGGOTA / PUBLIK',
  onBack,
  onGoHome,
  idPrefix = 'permission-state',
}) => {
  return (
    <div
      id={`${idPrefix}-container`}
      className="flex flex-col items-center justify-center text-center p-8 sm:p-12 bg-amber-50/60 rounded-2xl border border-amber-200 shadow-xs my-6 max-w-2xl mx-auto"
    >
      <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 mb-4 ring-8 ring-amber-50">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-200/80 text-amber-900 mb-3 border border-amber-300">
        <Lock className="w-3.5 h-3.5" /> 403 Forbidden Access
      </span>

      <h3 className="text-xl font-bold text-stone-900 mb-2">{title}</h3>
      <p className="text-sm text-stone-600 max-w-lg mb-6 leading-relaxed">{message}</p>

      <div className="w-full max-w-md bg-white/80 rounded-xl p-3.5 border border-amber-200/70 text-xs text-left mb-6 space-y-1.5">
        <div className="flex justify-between text-stone-600">
          <span>Peran Diperlukan:</span>
          <span className="font-semibold text-emerald-900">{requiredRole}</span>
        </div>
        <div className="flex justify-between text-stone-600">
          <span>Peran Pengguna Saat Ini:</span>
          <span className="font-semibold text-amber-800">{currentRole}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {onBack && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBack}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
          >
            Kembali
          </Button>
        )}
        {onGoHome && (
          <Button
            variant="primary"
            size="sm"
            onClick={onGoHome}
            leftIcon={<Home className="w-3.5 h-3.5" />}
          >
            Kembali ke Beranda
          </Button>
        )}
      </div>
    </div>
  );
};
