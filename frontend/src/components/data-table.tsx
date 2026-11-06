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
import { Fragment, useRef, useState, type ReactNode } from "react";
import { Button } from "./ui";

const PAGE_SIZE = 25;

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
  renderDetail,
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
  /** Full-width content under a row, at every screen size. It does not trigger onRowClick. */
  renderDetail?: (row: T) => ReactNode;
}) {
  "use no memo";
  const [sorting, setSorting] = useState<SortingState>(initialSort);
  // Tied to `data`, so a new search or filter returns to the first page without an effect.
  const [pageState, setPageState] = useState({ index: 0, data });
  const container = useRef<HTMLDivElement>(null);
  const table = useTable({
    features: tableKit,
    columns,
    data,
    state: { sorting },
    onSortingChange: (updater) => {
      setSorting(updater);
      setPageState({ index: 0, data });
    },
  });
  const hide = (id: string) =>
    hideBelowDesktop.includes(id) ? "hidden lg:table-cell" : hideOnMobile.includes(id) ? "hidden md:table-cell" : "";

  const rows = table.getRowModel().rows;
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const page = pageState.data === data ? Math.min(pageState.index, pageCount - 1) : 0;
  const firstRow = page * PAGE_SIZE;
  const visibleRows = rows.slice(firstRow, firstRow + PAGE_SIZE);
  const goTo = (index: number) => {
    setPageState({ index, data });
    container.current?.scrollIntoView({ block: "start" });
  };

  return (
    <div ref={container} className="scroll-mt-24">
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
                      className={`whitespace-nowrap px-4 py-3 align-middle font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase ${hide(header.column.id)}`}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={header.column.getToggleSortingHandler()}
                          className="inline-flex min-h-6 items-center gap-1 tracking-[inherit] uppercase hover:text-ink"
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
            {visibleRows.map((row) => (
              <Fragment key={row.id}>
                <tr
                  onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  className={`${renderDetail ? "" : "border-b border-line last:border-0"} ${onRowClick ? "cursor-pointer hover:bg-paper" : ""}`}
                >
                  {row.getAllCells().map((cell) => (
                    <td key={cell.id} className={`px-4 py-3.5 align-top ${hide(cell.column.id)}`}>
                      <table.FlexRender cell={cell} />
                    </td>
                  ))}
                </tr>
                {renderDetail && (
                  <tr className="border-b border-line last:border-0">
                    <td colSpan={columns.length} className="px-4 pb-4">
                      {renderDetail(row.original)}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {pageCount > 1 && (
        <nav aria-label="Table pages" className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="text-[13px] text-muted tabular-nums">
            Showing {(firstRow + 1).toLocaleString("en-GB")} to {(firstRow + visibleRows.length).toLocaleString("en-GB")} of {rows.length.toLocaleString("en-GB")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="secondary" disabled={page === 0} onClick={() => goTo(page - 1)}>Previous</Button>
            <span className="px-1 text-[13px] text-muted tabular-nums">Page {page + 1} of {pageCount}</span>
            <Button variant="secondary" disabled={page === pageCount - 1} onClick={() => goTo(page + 1)}>Next</Button>
          </div>
        </nav>
      )}
    </div>
  );
}
