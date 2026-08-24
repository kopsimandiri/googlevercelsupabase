import React from 'react';

export interface KopsimLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'hero';
  className?: string;
  badgeBackground?: boolean;
  showText?: boolean;
  textClassName?: string;
  subTextClassName?: string;
  variant?: 'light' | 'dark' | 'gold';
  alignment?: 'horizontal' | 'vertical';
}

const SIZE_MAP = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-12 h-12',
  xl: 'w-16 h-16',
  '2xl': 'w-24 h-24',
  hero: 'w-32 h-32 sm:w-40 sm:h-40 md:w-44 md:h-44',
};

const BADGE_PADDING_MAP = {
  xs: 'p-0.5',
  sm: 'p-0.5',
  md: 'p-1',
  lg: 'p-1',
  xl: 'p-1.5',
  '2xl': 'p-2',
  hero: 'p-2.5 sm:p-3',
};

export const KopsimLogo: React.FC<KopsimLogoProps> = ({
  size = 'md',
  className = '',
  badgeBackground = false,
  showText = false,
  textClassName = '',
  subTextClassName = '',
  variant = 'light',
  alignment = 'horizontal',
}) => {
  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;
  const paddingClass = BADGE_PADDING_MAP[size] || BADGE_PADDING_MAP.md;

  const circularImageContainer = (
    <div
      className={`relative ${sizeClass} aspect-square rounded-full overflow-hidden flex items-center justify-center shrink-0 select-none ${
        badgeBackground
          ? `bg-white ${paddingClass} shadow-md border-2 border-amber-400/80 ring-2 ring-emerald-950/15`
          : 'rounded-full'
      }`}
    >
      <img
        src="/assets/logo-kopsim.png"
        alt="Logo Resmi Koperasi Syarikat Islam Mandiri"
        className="w-full h-full object-contain rounded-full aspect-square block pointer-events-none"
        loading="eager"
      />
    </div>
  );

  if (!showText) {
    return (
      <div className={`inline-flex items-center justify-center ${className}`} id="kopsim-official-logo">
        {circularImageContainer}
      </div>
    );
  }

  return (
    <div
      className={`inline-flex ${
        alignment === 'vertical' ? 'flex-col items-center text-center gap-2' : 'items-center gap-3 text-left'
      } ${className}`}
      id="kopsim-official-logo-with-text"
    >
      {circularImageContainer}

      <div className="flex flex-col">
        <span
          className={`font-serif font-bold tracking-wider leading-tight ${
            textClassName ||
            (variant === 'light'
              ? 'text-white text-sm sm:text-base'
              : variant === 'gold'
              ? 'text-accent-gold text-sm sm:text-base'
              : 'text-text-dark text-sm sm:text-base')
          }`}
        >
          KOPSIM <span className="text-accent-gold">MANDIRI</span>
        </span>
        <span
          className={`text-[10px] tracking-wider uppercase font-medium mt-0.5 ${
            subTextClassName ||
            (variant === 'light'
              ? 'text-emerald-200/90'
              : variant === 'gold'
              ? 'text-accent-gold-dark'
              : 'text-text-muted')
          }`}
        >
          Koperasi Syarikat Islam Mandiri
        </span>
      </div>
    </div>
  );
};
