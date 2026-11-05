"use client";

import { createColumnHelper } from "@tanstack/react-table";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnalysisStatus } from "@/components/analysis-status";
import { DataTable, tableKit, type Columns } from "@/components/data-table";
import { EmptyState, QueryView } from "@/components/states";
import { ButtonLink, PageHeader, formatDate, formatPercent } from "@/components/ui";
import { useAnalyses } from "@/lib/api";
import type { Analysis } from "@/lib/api/schemas";

const col = createColumnHelper<typeof tableKit, Analysis>();

const columns: Columns<Analysis> = [
  col.accessor("formulation_name", {
    header: "Formulation",
    sortFn: "text",
    cell: (c) => (
      <>
        <Link href={`/findings?analysis=${c.row.original.id}`} onClick={(e) => e.stopPropagation()} className="font-medium hover:text-leaf">
          {c.getValue()}
        </Link>
        {/* The status, date and findings columns are hidden on phones. */}
        <span className="mt-1 block text-[13px] text-muted md:hidden">
          {formatDate(c.row.original.started_at)} · {c.row.original.findings_count} finding{c.row.original.findings_count === 1 ? "" : "s"}
        </span>
        <span className="mt-1.5 block md:hidden"><AnalysisStatus status={c.row.original.status} /></span>
      </>
    ),
  }),
  col.accessor("status", { header: "Status", sortFn: "text", cell: (c) => <AnalysisStatus status={c.getValue()} /> }),
  col.accessor("started_at", {
    header: "Date",
    sortFn: "datetime",
    cell: (c) => <span className="whitespace-nowrap text-body">{formatDate(c.getValue())}</span>,
  }),
  col.accessor((a) => a.coverage?.ratio ?? -1, {
    id: "coverage",
    header: "Coverage",
    cell: (c) => {
      const coverage = c.row.original.coverage;
      return (
        <span className="text-body tabular-nums">
          {coverage ? formatPercent(coverage.ratio) : <span className="text-muted">Not available</span>}
          {coverage && coverage.warnings.length > 0 && (
            <span className="ml-1.5 text-[13px] text-warn">
              {coverage.warnings.length} warning{coverage.warnings.length === 1 ? "" : "s"}
            </span>
          )}
        </span>
      );
    },
  }),
  col.accessor("findings_count", { header: "Findings", cell: (c) => <span className="text-body tabular-nums">{c.getValue()}</span> }),
];

export function AnalysesView() {
  const router = useRouter();
  const query = useAnalyses();
  return (
    <>
      <PageHeader title="Analysis history" description="Previous analysis runs. Select one to reopen its findings." />
      <QueryView query={query}>
        {(data) =>
          data.length === 0 ? (
            <EmptyState title="No analyses yet" action={<ButtonLink href="/formulations">Choose a formulation</ButtonLink>}>
              Analyses you run on a formulation are kept here.
            </EmptyState>
          ) : (
            <DataTable
              caption="Previous analysis runs"
              columns={columns}
              data={data}
              initialSort={[{ id: "started_at", desc: true }]}
              hideOnMobile={["status", "started_at", "findings_count"]}
              onRowClick={(a) => router.push(`/findings?analysis=${a.id}`)}
            />
          )
        }
      </QueryView>
    </>
  );
}
