import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from 'lucide-react';
import { PaginationControls } from './PaginationControls';
import {
 flexRender,
 getCoreRowModel,
 getPaginationRowModel,
 getSortedRowModel,
 SortingState,
 useReactTable,
} from '@tanstack/react-table';

export interface Column<T> {
 header: string;
 accessor: keyof T | ((row: T) => React.ReactNode);
 className?: string;
 sortable?: boolean;
}

export interface DataTableProps<T> {
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

export function DataTable<T>({ 
 columns, 
 data, 
 keyField, 
 selectable, 
 pageSize = 10, 
 onSelectionChange, 
 onRowClick, 
 emptyMessage = 'No data available', 
 caption = 'Results' 
}: DataTableProps<T>) {
 
 const [sorting, setSorting] = useState<SortingState>([]);
 const [rowSelection, setRowSelection] = useState({});

 const tanstackColumns = useMemo(() => {
 const cols: any[] = [];
 
 if (selectable) {
 cols.push({
 id: 'select',
 header: ({ table }: any) => (
 <input
 type="checkbox"
 checked={table.getIsAllPageRowsSelected()}
 onChange={table.getToggleAllPageRowsSelectedHandler()}
 className="h-4 w-4 rounded border-slate-border text-accent-500 "
 aria-label="Select all"
 />
 ),
 cell: ({ row }: any) => (
 <input
 type="checkbox"
 checked={row.getIsSelected()}
 onChange={row.getToggleSelectedHandler()}
 onClick={(e) => e.stopPropagation()}
 className="h-4 w-4 rounded border-slate-border text-accent-500 "
 aria-label="Select row"
 />
 ),
 enableSorting: false,
 enableHiding: false,
 });
 }

 columns.forEach((col, idx) => {
 cols.push({
 id: typeof col.accessor === 'string' ? col.accessor : `col_${idx}`,
 ...(typeof col.accessor === 'string' ? { accessorKey: col.accessor } : {
 accessorFn: (row: any) => row,
 }),
 header: ({ column }: any) => {
 if (!col.sortable || typeof col.accessor !== 'string') {
 return <div className={cn("text-xs font-semibold uppercase tracking-wider", col.className)}>{col.header}</div>;
 }
 return (
 <button
 onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
 className={cn(
 "-ml-3 flex h-8 items-center rounded-md px-3 text-xs font-semibold uppercase tracking-wider hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400 outline-none ",
 col.className
 )}
 >
 <span>{col.header}</span>
 {column.getIsSorted() === "desc" ? (
 <ArrowDownIcon className="ml-2 h-4 w-4" />
 ) : column.getIsSorted() === "asc" ? (
 <ArrowUpIcon className="ml-2 h-4 w-4" />
 ) : (
 <ChevronsUpDownIcon className="ml-2 h-4 w-4" />
 )}
 </button>
 );
 },
 cell: ({ row }: any) => {
 return (
 <div className={cn(col.className)}>
 {typeof col.accessor === 'function' 
 ? col.accessor(row.original) 
 : (row.original[col.accessor as keyof T] as React.ReactNode)}
 </div>
 );
 },
 enableSorting: !!col.sortable,
 });
 });

 return cols;
 }, [columns, selectable]);

 const table = useReactTable({
 data,
 columns: tanstackColumns,
 getCoreRowModel: getCoreRowModel(),
 getPaginationRowModel: getPaginationRowModel(),
 getSortedRowModel: getSortedRowModel(),
 onSortingChange: setSorting,
 onRowSelectionChange: setRowSelection,
 state: {
 sorting,
 rowSelection,
 },
 initialState: {
 pagination: {
 pageSize: pageSize,
 },
 },
 getRowId: (row: any, index: number) => String(row[keyField]) || String(index),
 });

 React.useEffect(() => {
 if (onSelectionChange) {
 const selectedRows = table.getSelectedRowModel().rows.map((r: any) => r.original);
 onSelectionChange(selectedRows);
 }
 }, [rowSelection, onSelectionChange, table]);

 const pageIndex = table.getState().pagination.pageIndex;
 return (
 <div className="rounded-xl border border-slate-border bg-white dark:bg-gray-900 overflow-hidden">
 <p className="border-b border-slate-border px-4 py-2 text-xs text-slate-500 dark:text-slate-400 sm:hidden">
 Scroll horizontally to see all columns.
 </p>
 <div className="w-full overflow-auto focus:outline-none dark:" tabIndex={0} role="region" aria-label={`${caption}. Scroll horizontally for more columns.`}>
 <table className="w-full min-w-[40rem] text-left text-sm">
 <caption className="sr-only">{caption}</caption>
 <thead>
 {table.getHeaderGroups().map((headerGroup: any) => (
 <tr key={headerGroup.id} className="border-b border-slate-border ">
 {headerGroup.headers.map((header: any) => (
 <th
 key={header.id}
 className={cn(
 "px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider align-middle whitespace-nowrap",
 header.id === 'select' ? "w-10" : ""
 )}
 >
 {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
 </th>
 ))}
 </tr>
 ))}
 </thead>
 <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
 {table.getRowModel().rows.length === 0 ? (
 <tr>
 <td
 colSpan={tanstackColumns.length}
 className="px-4 py-12 text-center text-slate-400"
 >
 {emptyMessage}
 </td>
 </tr>
 ) : (
 table.getRowModel().rows.map((row: any) => (
 <tr
 key={row.id}
 onClick={() => onRowClick?.(row.original as T)}
 className={cn(
 "hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors",
 onRowClick && "cursor-pointer",
 row.getIsSelected() && "bg-accent-50 dark:bg-accent-900/20"
 )}
 >
 {row.getVisibleCells().map((cell: any) => (
 <td key={cell.id} className={cn("px-4 py-3 align-middle whitespace-nowrap", cell.column.id === 'select' ? "w-10" : "")} onClick={cell.column.id === 'select' ? (e) => e.stopPropagation() : undefined}>
 {flexRender(cell.column.columnDef.cell, cell.getContext())}
 </td>
 ))}
 </tr>
 ))
 )}
 </tbody>
 </table>
 </div>

 {/* Pagination */}
 <PaginationControls
 page={pageIndex + 1}
 pageSize={pageSize}
 total={data.length}
 onPageChange={(nextPage) => table.setPageIndex(nextPage - 1)}
 itemLabel="results"
 />
 </div>
 );
}
