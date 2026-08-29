import React from 'react';

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rectangular',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded-md',
    rectangular: 'rounded-none',
    circular: 'rounded-full',
    rounded: 'rounded-2xl',
  };

  const inlineStyle: React.CSSProperties = {
    ...style,
    width: width !== undefined ? width : undefined,
    height: height !== undefined ? height : undefined,
  };

  return (
    <div
      className={`animate-pulse bg-stone-200/80 ${variantStyles[variant]} ${className}`}
      style={inlineStyle}
      {...props}
    />
  );
};

export const CardSkeleton: React.FC<{ rows?: number }> = ({ rows = 3 }) => {
  return (
    <div className="p-6 bg-white rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton variant="rounded" width="40%" height={24} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
      <div className="space-y-2.5 pt-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${85 - i * 15}%`} height={16} />
        ))}
      </div>
    </div>
  );
};

export const TableSkeleton: React.FC<{ columns?: number; rows?: number }> = ({
  columns = 5,
  rows = 5,
}) => {
  return (
    <div className="w-full bg-white rounded-2xl border border-stone-200/80 overflow-hidden shadow-xs">
      {/* Header skeleton */}
      <div className="bg-stone-100/70 px-4 py-3.5 border-b border-stone-200 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={16} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y divide-stone-100">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="px-4 py-3.5 flex gap-4 items-center">
            {Array.from({ length: columns }).map((_, c) => (
              <Skeleton key={c} variant="text" width={`${90 / columns}%`} height={14} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
