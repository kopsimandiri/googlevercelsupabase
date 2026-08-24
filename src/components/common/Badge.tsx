import React from 'react';

export type BadgeVariant =
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'neutral'
  | 'gold'
  | 'primary';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  className = '',
  id,
}) => {
  const variantStyles: Record<BadgeVariant, string> = {
    success: 'bg-primary-500/15 text-primary-900 border-primary-500/30 font-medium',
    danger: 'bg-rose-500/15 text-rose-800 border-rose-500/30 font-medium',
    warning: 'bg-status-warning/15 text-status-warning border-status-warning/30 font-medium',
    info: 'bg-sky-50 text-sky-800 border-sky-200 font-medium',
    neutral: 'bg-stone-100 text-text-muted border-stone-200 font-medium',
    gold: 'bg-accent-gold/15 text-accent-gold-dark border-accent-gold/30 font-semibold',
    primary: 'bg-primary-700 text-white border-primary-900 font-medium',
  };

  const sizeStyles = {
    sm: 'px-2.5 py-0.5 text-[10px]',
    md: 'px-3 py-1 text-xs',
  };

  return (
    <span
      id={id}
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border tracking-wide whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
};

