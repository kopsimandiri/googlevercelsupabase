import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

interface ErrorStateProps {
  title?: string;
  errorMessage?: string;
  onRetry?: () => void;
  idPrefix?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Gagal Memuat Informasi',
  errorMessage = 'Terjadi kendala jaringan atau kesalahan sistem saat menghubungi database.',
  onRetry,
  idPrefix = 'error-state',
}) => {
  return (
    <div
      id={`${idPrefix}-container`}
      className="flex flex-col items-center justify-center text-center p-8 bg-rose-50/50 rounded-xl border border-rose-200 my-4"
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 mb-3">
        <AlertOctagon className="w-6 h-6" />
      </div>
      <h4 className="text-base font-semibold text-rose-900 mb-1">{title}</h4>
      <p className="text-xs text-rose-700/80 max-w-md mb-4">{errorMessage}</p>
      {onRetry && (
        <button
          id={`${idPrefix}-retry-btn`}
          onClick={onRetry}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-rose-950 bg-white border border-rose-300 hover:bg-rose-100/60 rounded-lg shadow-xs transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Coba Lagi
        </button>
      )}
    </div>
  );
};
