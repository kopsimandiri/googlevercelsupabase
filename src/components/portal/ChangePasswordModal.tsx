import React, { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, ShieldCheck, KeyRound, X, AlertCircle } from 'lucide-react';
import { Button } from '../common/Button';
import { useNotification } from '../../context/NotificationContext';
import { memberService } from '../../services/memberService';

interface ChangePasswordModalProps {
  memberNo: string;
  memberName: string;
  username?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  memberNo,
  memberName,
  username,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useNotification();
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!newPassword.trim()) {
      setErrorMessage('Silakan masukkan password baru.');
      return;
    }

    if (newPassword.trim().length < 4) {
      setErrorMessage('Password baru minimal 4 karakter.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi password baru tidak cocok. Periksa kembali.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Target identifier: member_no, id, or username
      const targetId = memberNo || username || '';
      
      const result = await memberService.updateMemberPassword(targetId, newPassword.trim());

      if (result.success) {
        setIsSuccess(true);
        showToast(
          'Password anggota berhasil diperbarui dan disimpan ke tabel public.members (kolom legacy_password_hash).',
          'success',
          'Ganti Password Berhasil'
        );

        if (onSuccess) {
          onSuccess();
        }

        setTimeout(() => {
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error changing member password:', err);
      setErrorMessage(err.message || 'Gagal mengubah password. Silakan coba lagi.');
      showToast(err.message || 'Gagal mengubah password.', 'error', 'Gagal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="change-password-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        id="change-password-modal-card"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-stone-200/90 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-800 text-white p-5 sm:p-6 relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-400 text-emerald-950 rounded-xl shadow-md">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-serif text-amber-300">
                  Ganti Password Anggota
                </h3>
                <p className="text-xs text-emerald-100 font-mono mt-0.5">
                  NRA: <span className="font-bold text-white">{memberNo}</span> ({memberName})
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-800/80 transition-colors"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {isSuccess ? (
            <div className="py-6 text-center space-y-3 animate-fade-in">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-stone-900">
                Password Berhasil Diperbarui!
              </h4>
              <p className="text-xs text-stone-600 max-w-xs mx-auto">
                Tersimpan langsung pada tabel <code className="px-1.5 py-0.5 bg-stone-100 rounded text-emerald-800 font-mono font-bold">public.members</code> kolom <code className="px-1.5 py-0.5 bg-stone-100 rounded text-emerald-800 font-mono font-bold">legacy_password_hash</code>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Info target DB */}
              <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Database Target: </span>
                  Tersimpan di tabel <span className="font-mono font-bold text-emerald-950">public.members</span> kolom <span className="font-mono font-bold text-emerald-950">legacy_password_hash</span>.
                </div>
              </div>

              {/* Password Lama (Opsional) */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Password Saat Ini (Opsional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showOld ? 'text' : 'password'}
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Masukkan password saat ini jika ada"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Password Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showNew ? 'text' : 'password'}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ketik password baru Anda"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Konfirmasi Password Baru */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 block">
                  Ulangi Password Baru <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <KeyRound className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru persis sama"
                    className="w-full pl-9 pr-10 py-2.5 text-xs sm:text-sm rounded-xl border border-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 flex items-center justify-end gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Batal
                </Button>
                <Button
                  id="btn-submit-change-password"
                  type="submit"
                  variant="primary"
                  size="md"
                  isLoading={isLoading}
                  leftIcon={<KeyRound className="w-4 h-4" />}
                >
                  Simpan Password Baru
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
