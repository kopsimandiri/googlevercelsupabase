import React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: React.ReactNode;
  cell?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  sortable?: boolean;
  className?: string;
}

export interface TableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string | number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSort?: (key: string) => void;
  density?: 'compact' | 'normal' | 'relaxed';
  striped?: boolean;
  hoverable?: boolean;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  id?: string;
}

export function Table<T>({
  columns,
  data,
  keyExtractor,
  sortBy,
  sortDirection = 'asc',
  onSort,
  density = 'normal',
  striped = false,
  hoverable = true,
  emptyState,
  isLoading = false,
  className = '',
  id,
}: TableProps<T>) {
  const densityPadding = {
    compact: 'py-2 px-3 text-xs',
    normal: 'py-3 px-4 text-xs sm:text-sm',
    relaxed: 'py-4 px-5 text-sm',
  };

  const alignClass = {
    left: 'text-left justify-start',
    center: 'text-center justify-center',
    right: 'text-right justify-end',
  };

  return (
    <div
      id={id}
      className={`w-full overflow-x-auto rounded-2xl border border-stone-200/80 bg-white shadow-xs ${className}`}
    >
      <table className="w-full text-left border-collapse">
        <thead className="bg-stone-100/90 text-stone-700 font-bold border-b border-stone-200 select-none">
          <tr>
            {columns.map((col) => {
              const isSorted = sortBy === col.key;
              return (
                <th
                  key={col.key}
                  style={{ width: col.width }}
                  className={`${densityPadding[density]} font-bold tracking-wider uppercase text-[11px] text-stone-600 ${col.className || ''}`}
                >
                  {col.sortable && onSort ? (
                    <button
                      type="button"
                      onClick={() => onSort(col.key)}
                      className={`flex items-center gap-1.5 hover:text-stone-900 transition-colors cursor-pointer ${
                        alignClass[col.align || 'left']
                      }`}
                    >
                      <span>{col.header}</span>
                      {isSorted ? (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3.5 h-3.5 text-emerald-700" />
                        ) : (
                          <ArrowDown className="w-3.5 h-3.5 text-emerald-700" />
                        )
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-stone-400 opacity-60" />
                      )}
                    </button>
                  ) : (
                    <div className={`flex items-center ${alignClass[col.align || 'left']}`}>
                      {col.header}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody className="divide-y divide-stone-100 text-stone-800">
          {isLoading ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-stone-500">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Memuat data tabel...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="py-12 text-center text-stone-500">
                {emptyState || <span className="text-xs font-medium">Tidak ada data yang tersedia</span>}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => {
              const isEven = rowIdx % 2 === 0;
              const rowKey = keyExtractor(row, rowIdx);

              return (
                <tr
                  key={rowKey}
                  className={`transition-colors ${
                    striped && !isEven ? 'bg-stone-50/60' : 'bg-white'
                  } ${hoverable ? 'hover:bg-emerald-50/40' : ''}`}
                >
                  {columns.map((col) => {
                    const content = col.cell
                      ? col.cell(row, rowIdx)
                      : (row as Record<string, any>)[col.key];

                    return (
                      <td
                        key={col.key}
                        className={`${densityPadding[density]} ${
                          col.align === 'right'
                            ? 'text-right'
                            : col.align === 'center'
                            ? 'text-center'
                            : 'text-left'
                        } ${col.className || ''}`}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
