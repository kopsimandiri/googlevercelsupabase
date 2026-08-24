import React from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'outline' | 'danger' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

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
      'bg-primary-700 text-white hover:bg-primary-900 focus-visible:ring-primary-700 shadow-sm active:bg-primary-950 font-semibold',
    secondary:
      'bg-emerald-50 border border-primary-700 text-primary-900 hover:bg-emerald-100 hover:text-primary-950 focus-visible:ring-primary-700 font-semibold shadow-xs',
    gold:
      'bg-accent-gold text-stone-950 hover:bg-accent-gold-dark hover:text-white focus-visible:ring-accent-gold shadow-sm font-bold active:bg-amber-800',
    outline:
      'bg-white text-stone-800 border border-stone-300 hover:bg-stone-100 hover:text-stone-950 hover:border-stone-400 focus-visible:ring-stone-400 font-medium shadow-xs',
    danger:
      'bg-rose-700 text-white hover:bg-rose-800 focus-visible:ring-rose-600 shadow-sm active:bg-rose-900 font-semibold',
    ghost:
      'bg-transparent text-stone-600 hover:bg-stone-100 hover:text-stone-900 focus-visible:ring-stone-300 font-medium',
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-4 py-2 text-xs rounded-lg gap-1.5',
    md: 'px-6 py-3 text-sm rounded-xl gap-2',
    lg: 'px-8 py-3.5 text-base rounded-xl gap-2.5',
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

