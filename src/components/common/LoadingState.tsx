import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  subMessage?: string;
  size?: 'sm' | 'md' | 'lg';
  fullHeight?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Memuat Data KOPSIM...',
  subMessage = 'Mohon tunggu sejenak sementara data diverifikasi',
  size = 'md',
  fullHeight = false,
}) => {
  const spinnerSizes = {
    sm: 'w-6 h-6',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  };

  return (
    <div
      id="kopsim-loading-state"
      className={`flex flex-col items-center justify-center text-center p-8 bg-white/70 backdrop-blur-xs rounded-xl border border-stone-200/80 ${
        fullHeight ? 'min-h-[400px]' : 'py-12'
      }`}
    >
      <div className="relative flex items-center justify-center mb-4">
        <div className="absolute w-14 h-14 rounded-full bg-emerald-100/60 animate-ping" />
        <Loader2 className={`${spinnerSizes[size]} text-emerald-800 animate-spin relative z-10`} />
      </div>
      <h3 className="text-base font-semibold text-stone-900 mb-1">{message}</h3>
      {subMessage && <p className="text-xs text-stone-500 max-w-sm">{subMessage}</p>}
    </div>
  );
};
