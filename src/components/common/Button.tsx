import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'blue'
  | 'info'
  | 'purple'
  | 'amber'
  | 'warning'
  | 'gold'
  | 'outline'
  | 'danger'
  | 'ghost';
export type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const variantClasses: Record<ButtonVariant, string> = {
    primary:
      'bg-emerald-700 hover:bg-emerald-800 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-emerald-700 font-semibold transition-all border border-emerald-800',
    success:
      'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-emerald-600 font-semibold transition-all border border-emerald-700',
    blue:
      'bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-blue-600 font-semibold transition-all border border-blue-700',
    info:
      'bg-sky-600 hover:bg-sky-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-sky-600 font-semibold transition-all border border-sky-700',
    purple:
      'bg-purple-600 hover:bg-purple-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-purple-600 font-semibold transition-all border border-purple-700',
    amber:
      'bg-amber-500 hover:bg-amber-600 text-stone-950 shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-amber-500 font-bold transition-all border border-amber-600',
    warning:
      'bg-amber-600 hover:bg-amber-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-amber-600 font-semibold transition-all border border-amber-700',
    gold:
      'bg-amber-400 hover:bg-amber-500 text-stone-950 hover:text-black focus-visible:ring-amber-400 shadow-sm font-bold active:scale-[0.98] transition-all border border-amber-500',
    secondary:
      'bg-emerald-50 border border-emerald-200 text-emerald-900 hover:bg-emerald-100 hover:border-emerald-300 focus-visible:ring-emerald-600 font-semibold shadow-2xs transition-all',
    outline:
      'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50 hover:text-stone-900 hover:border-stone-300 focus-visible:ring-stone-400 font-medium shadow-2xs transition-all',
    danger:
      'bg-rose-600 hover:bg-rose-700 text-white shadow-sm hover:shadow active:scale-[0.98] focus-visible:ring-rose-600 font-semibold transition-all border border-rose-700',
    ghost:
      'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-300 font-medium transition-colors',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    xs: 'px-2.5 py-1 text-[11px] rounded-md gap-1',
    sm: 'px-3.5 py-1.5 text-xs rounded-lg gap-1.5',
    md: 'px-5 py-2.5 text-sm rounded-xl gap-2',
    lg: 'px-7 py-3.5 text-base rounded-xl gap-2.5',
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current shrink-0" />
      ) : (
        leftIcon && <span className="shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
    </button>
  );
};

