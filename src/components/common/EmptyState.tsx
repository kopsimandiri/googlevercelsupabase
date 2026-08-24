import React from 'react';
import { FolderOpen, LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  actionText?: string;
  onAction?: () => void;
  idPrefix?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'Belum Ada Data',
  description = 'Data untuk bagian ini belum tersedia atau masih dalam proses sinkronisasi.',
  icon: Icon = FolderOpen,
  actionText,
  onAction,
  idPrefix = 'empty-state',
}) => {
  return (
    <div
      id={`${idPrefix}-container`}
      className="flex flex-col items-center justify-center text-center p-10 bg-white rounded-xl border border-dashed border-stone-300 my-4"
    >
      <div className="w-14 h-14 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 mb-3.5">
        <Icon className="w-7 h-7" />
      </div>
      <h4 className="text-base font-semibold text-stone-800 mb-1">{title}</h4>
      <p className="text-xs text-stone-500 max-w-md leading-relaxed mb-4">{description}</p>
      {actionText && onAction && (
        <button
          id={`${idPrefix}-action-btn`}
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-emerald-800 hover:bg-emerald-900 rounded-lg shadow-xs transition-colors"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
