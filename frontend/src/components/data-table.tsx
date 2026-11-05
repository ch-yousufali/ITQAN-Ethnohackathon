"use client";

import {
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type ColumnDef,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

export const tableKit = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text, datetime: sortFn_datetime },
});

export type Columns<T extends RowData> = ColumnDef<typeof tableKit, T, any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

export function DataTable<T extends RowData>({
  columns,
  data,
  caption,
  initialSort = [],
  hideOnMobile = [],
  hideBelowDesktop = [],
  onRowClick,
}: {
  /** Must be stable: define at module scope or memoise. */
  columns: Columns<T>;
  data: T[];
  caption: string;
  initialSort?: SortingState;
  /** Column ids to drop below the sm breakpoint, keeping tables readable on phones. */
  hideOnMobile?: string[];
  /** Column ids to drop below the lg breakpoint, for wide tables on tablets. */
  hideBelowDesktop?: string[];
  onRowClick?: (row: T) => void;
}) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  const table = useTable({
    features: tableKit,
    columns,
    data,
    state: { sorting },
    onSortingChange: setSorting,
  });
  const hide = (id: string) =>
    hideBelowDesktop.includes(id) ? "hidden lg:table-cell" : hideOnMobile.includes(id) ? "hidden md:table-cell" : "";

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          {table.getHeaderGroups().map((group) => (
            <tr key={group.id} className="border-b border-line">
              {group.headers.map((header) => {
                const sortable = header.column.getCanSort();
                const dir = header.column.getIsSorted();
                return (
                  <th
                    key={header.id}
                    scope="col"
                    aria-sort={dir === "asc" ? "ascending" : dir === "desc" ? "descending" : undefined}
                    className={`whitespace-nowrap px-4 py-3 text-[13px] font-medium text-muted ${hide(header.column.id)}`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className="inline-flex min-h-6 items-center gap-1 hover:text-ink"
                      >
                        <table.FlexRender header={header} />
                        {dir === "asc" ? (
                          <ArrowUp className="size-3.5" aria-hidden />
                        ) : dir === "desc" ? (
                          <ArrowDown className="size-3.5" aria-hidden />
                        ) : (
                          <ChevronsUpDown className="size-3.5 opacity-40" aria-hidden />
                        )}
                      </button>
                    ) : (
                      <table.FlexRender header={header} />
                    )}
                  </th>
                );
              })}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={`border-b border-line last:border-0 ${onRowClick ? "cursor-pointer hover:bg-paper" : ""}`}
            >
              {row.getAllCells().map((cell) => (
                <td key={cell.id} className={`px-4 py-3.5 align-top ${hide(cell.column.id)}`}>
                  <table.FlexRender cell={cell} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
