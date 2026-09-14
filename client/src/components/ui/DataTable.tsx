import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
}

interface DataTableProps<T> {
  emptyMessage?: string;
  caption?: string;
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  selectable?: boolean;
  pageSize?: number;
  onSelectionChange?: (selected: T[]) => void;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({ columns, data, keyField, selectable, pageSize = 10, onSelectionChange, onRowClick, emptyMessage = 'No data available', caption = 'Results' }: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = startIdx + pageSize;
  const pageData = data.slice(startIdx, endIdx);

  const allOnPageSelected = pageData.length > 0 && pageData.every(row => selectedKeys.has(String(row[keyField])));

  const toggleAll = () => {
    const newKeys = new Set(selectedKeys);
    if (allOnPageSelected) {
      pageData.forEach(row => newKeys.delete(String(row[keyField])));
    } else {
      pageData.forEach(row => newKeys.add(String(row[keyField])));
    }
    setSelectedKeys(newKeys);
    onSelectionChange?.(data.filter(r => newKeys.has(String(r[keyField]))));
  };

  const toggleRow = (row: T) => {
    const key = String(row[keyField]);
    const newKeys = new Set(selectedKeys);
    if (newKeys.has(key)) newKeys.delete(key);
    else newKeys.add(key);
    setSelectedKeys(newKeys);
    onSelectionChange?.(data.filter(r => newKeys.has(String(r[keyField]))));
  };

  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-gray-900 overflow-hidden">
      <p className="border-b border-slate-100 px-4 py-2 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400 sm:hidden">
        Scroll horizontally to see all columns.
      </p>
      <div className="w-full overflow-auto focus:outline-none focus:ring-2 focus:ring-inset focus:ring-slate-300 dark:focus:ring-slate-600" tabIndex={0} role="region" aria-label={`${caption}. Scroll horizontally for more columns.`}>
        <table className="w-full text-sm text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-700">
              {selectable && (
                <th className="px-4 py-3 w-10">
                  <input
                    aria-label={`Select all rows on page ${currentPage}`}
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-accent-500 focus:ring-accent-400"
                  />
                </th>
              )}
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 dark:text-gray-500 uppercase tracking-wider",
                    col.className
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
            {pageData.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (selectable ? 1 : 0)}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageData.map((row, i) => {
                const key = String(row[keyField]) || String(i);
                const isSelected = selectedKeys.has(key);
                return (
                  <tr
                    key={key}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={cn(
                      "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
                      onRowClick && "cursor-pointer",
                      isSelected && "bg-accent-50 dark:bg-accent-900/20"
                    )}
                  >
                    {selectable && (
                      <td className="px-4 py-3 w-10" onClick={(e) => e.stopPropagation()}>
                        <input
                          aria-label={`Select row ${key}`}
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(row)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-accent-500 focus:ring-accent-400"
                        />
                      </td>
                    )}
                    {columns.map((col, j) => (
                      <td key={j} className={cn("px-4 py-3", col.className)}>
                        {typeof col.accessor === 'function'
                          ? col.accessor(row)
                          : (row[col.accessor] as React.ReactNode)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-700">
          <p className="text-sm text-gray-500 dark:text-gray-400 dark:text-gray-500">
            Show {startIdx + 1} to {Math.min(endIdx, data.length)} of {data.length} results
          </p>
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {pageNumbers.map((num, idx) =>
              num === '...' ? (
                <span key={`dots-${idx}`} className="px-1 text-gray-400 dark:text-gray-500">⋯</span>
              ) : (
                <button
                  key={num}
                  onClick={() => setCurrentPage(num)}
                  className={cn(
                    "h-8 w-8 flex items-center justify-center rounded-lg text-sm font-medium transition-colors",
                    currentPage === num
                      ? "bg-accent-500 text-white"
                      : "border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                  )}
                  aria-label={`Page ${num}`}
                  aria-current={currentPage === num ? 'page' : undefined}
                >
                  {num}
                </button>
              )
            )}
            <button
              aria-label="Next page"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 w-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
