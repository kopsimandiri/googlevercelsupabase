import React from 'react';

interface CardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  id?: string;
  headerBorder?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  title,
  subtitle,
  action,
  className = '',
  id,
  headerBorder = true,
}) => {
  return (
    <div
      id={id}
      className={`bg-surface rounded-[var(--radius-card)] border border-stone-200/70 shadow-sm overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-5 ${
            headerBorder ? 'border-b border-stone-100' : ''
          }`}
        >
          <div>
            {typeof title === 'string' ? (
              <h3 className="text-base font-bold text-text-dark leading-tight">{title}</h3>
            ) : (
              title
            )}
            {subtitle && (
              <p className="text-sm text-text-muted mt-1 leading-relaxed">{subtitle}</p>
            )}
          </div>
          {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
};

