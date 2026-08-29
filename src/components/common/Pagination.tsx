import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems?: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  id?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
  id,
}) => {
  if (totalPages <= 1 && (!totalItems || totalItems <= pageSize)) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = totalItems ? Math.min(currentPage * pageSize, totalItems) : currentPage * pageSize;

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div
      id={id}
      className={`flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 bg-stone-50 border-t border-stone-200 text-xs text-stone-600 rounded-b-2xl ${className}`}
    >
      {/* Items info */}
      <div className="flex items-center gap-3">
        {totalItems !== undefined ? (
          <span>
            Menampilkan <strong className="font-semibold text-stone-900">{startItem}</strong> -{' '}
            <strong className="font-semibold text-stone-900">{endItem}</strong> dari{' '}
            <strong className="font-semibold text-stone-900">{totalItems}</strong> data
          </span>
        ) : (
          <span>
            Halaman <strong className="font-semibold text-stone-900">{currentPage}</strong> dari{' '}
            <strong className="font-semibold text-stone-900">{totalPages}</strong>
          </span>
        )}

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-stone-400">|</span>
            <span className="text-stone-500">Per hal:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Jumlah baris per halaman"
              className="bg-white border border-stone-300 rounded-lg px-2 py-1 text-xs font-semibold text-stone-800 focus:outline-hidden focus:border-emerald-700 cursor-pointer"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Nav Controls */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          aria-label="Halaman Pertama"
          className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          aria-label="Halaman Sebelumnya"
          className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-1 px-1">
          {getPageNumbers().map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-2 text-stone-400 font-mono">
                  ...
                </span>
              );
            }
            const isActive = p === currentPage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={isActive ? 'page' : undefined}
                className={`min-w-[30px] h-[30px] rounded-lg text-xs font-bold transition-colors ${
                  isActive
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-100'
                }`}
              >
                {p}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          aria-label="Halaman Berikutnya"
          className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          aria-label="Halaman Terakhir"
          className="p-1.5 rounded-lg border border-stone-200 bg-white text-stone-600 hover:bg-stone-100 hover:text-stone-900 disabled:opacity-40 disabled:pointer-events-none transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
