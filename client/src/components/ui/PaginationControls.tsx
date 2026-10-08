import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  pageSize?: number;
  total: number;
  onPageChange: (page: number) => void;
  itemLabel?: string;
}

export function PaginationControls({
  page,
  pageSize = 10,
  total,
  onPageChange,
  itemLabel = 'records',
}: PaginationControlsProps) {
  const pageCount = Math.ceil(total / pageSize);
  if (pageCount <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-border px-4 py-3 text-sm text-text-muted sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">Showing {start}–{end} of {total} {itemLabel}</p>
      <div className="flex items-center justify-between gap-3 sm:justify-end">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-border px-4 font-medium text-text-heading transition-colors hover:bg-tint disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          Previous
        </button>
        <span className="whitespace-nowrap" aria-label={`Page ${page} of ${pageCount}`}>
          Page {page} of {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          disabled={page >= pageCount}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-border px-4 font-medium text-text-heading transition-colors hover:bg-tint disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
