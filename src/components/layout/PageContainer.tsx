import React from 'react';
import { motion } from 'motion/react';

interface PageContainerProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  breadcrumbs?: string[];
  actions?: React.ReactNode;
  idPrefix?: string;
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  title,
  subtitle,
  breadcrumbs = [],
  actions,
  idPrefix = 'page',
}) => {
  return (
    <motion.div
      id={`${idPrefix}-container`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6"
    >
      {/* Header Banner & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-stone-500 mb-1.5 font-medium">
              <span>KOPSIM</span>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  <span className="text-stone-300">/</span>
                  <span className={idx === breadcrumbs.length - 1 ? 'text-emerald-800 font-semibold' : ''}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold text-stone-900 font-serif tracking-tight flex items-center gap-2.5">
            <span className="w-2 h-6 rounded-full bg-amber-500 inline-block" />
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl leading-relaxed">
              {subtitle}
            </p>
          )}
        </div>

        {actions && (
          <div className="flex items-center gap-2.5 shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div>{children}</div>
    </motion.div>
  );
};
