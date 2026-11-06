"use client";

import { createColumnHelper } from "@tanstack/react-table";
import { ArrowLeft, ArrowRight, Loader2, Network } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DataTable, tableKit, type Columns } from "@/components/data-table";
import { CoverageSummary, EVIDENCE_META, EvidenceBadge, Notice, SourceList, isTraceable } from "@/components/evidence";
import { EmptyState, ErrorState, QueryView } from "@/components/states";
import { Select } from "@/components/select";
import { Botanical, ButtonLink, PageHeader, Panel, Section, formatDate, formatPercent } from "@/components/ui";
import { useAnalyses, useFindings } from "@/lib/api";
import { EVIDENCE_CATEGORIES, type Analysis, type EvidenceCategory, type Finding } from "@/lib/api/schemas";

const col = createColumnHelper<typeof tableKit, Finding>();

const columns: Columns<Finding> = [
  col.accessor("rank", { header: "Rank", cell: (c) => <span className="text-body tabular-nums">{c.getValue()}</span> }),
  col.display({
    id: "relationship",
    header: "Candidate relationship",
    cell: (c) => {
      const f = c.row.original;
      return (
        <Link href={`/findings/${f.id}`} onClick={(e) => e.stopPropagation()} className="group block md:min-w-52">
          <span className="font-medium group-hover:text-leaf">
            {f.compound_a.name} <ArrowRight aria-label="acts on" className="inline size-3.5 align-[-2px] text-muted" strokeWidth={1.5} /> {f.target.symbol}{" "}
            <ArrowLeft aria-label="also acted on by" className="inline size-3.5 align-[-2px] text-muted" strokeWidth={1.5} /> {f.compound_b.name}
          </span>
          <span className="mt-0.5 block text-[13px] text-muted">
            <Botanical>{f.compound_a.botanical_name}</Botanical> · <Botanical>{f.compound_b.botanical_name}</Botanical>
          </span>
          {/* These columns are hidden on phones, but the evidence label must never be. */}
          <span className="mt-1.5 flex items-center gap-2 md:hidden">
            <span className="text-[13px] text-muted tabular-nums">Rank {f.rank}</span>
            <EvidenceBadge category={f.category} />
          </span>
        </Link>
      );
    },
  }),
  col.display({
    id: "pathways",
    header: "Shared pathways",
    cell: (c) => <span className="text-body">{c.row.original.pathways.join(", ") || "None recorded"}</span>,
  }),
  col.accessor("interaction_type", { header: "Interaction", sortFn: "text", cell: (c) => <span className="text-body">{c.getValue()}</span> }),
  col.accessor("category", {
    header: "Weakest evidence",
    sortFn: (a, b) => EVIDENCE_CATEGORIES.indexOf(a.original.category) - EVIDENCE_CATEGORIES.indexOf(b.original.category),
    cell: (c) => <EvidenceBadge category={c.getValue()} />,
  }),
  col.accessor("confidence", {
    header: "Confidence",
    cell: (c) => <span className="text-body tabular-nums">{formatPercent(c.getValue())}</span>,
  }),
];

function EvidenceSummary({ finding }: { finding: Finding }) {
  return (
    <ul aria-label={`Evidence for ${finding.compound_a.name} and ${finding.compound_b.name}`} className="space-y-3 rounded-lg bg-paper p-3">
      {finding.evidence.map((e) => (
        <li key={e.id}>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <EvidenceBadge category={e.category} />
            <span className="text-[13px] text-ink">{e.statement}</span>
            {e.value && <span className="text-[13px] text-muted">{e.value}</span>}
          </div>
          <div className="mt-1"><SourceList sources={e.sources} /></div>
        </li>
      ))}
    </ul>
  );
}

function FindingsTable({ analysis }: { analysis: Analysis }) {
  const router = useRouter();
  const query = useFindings(analysis.id);
  const [categories, setCategories] = useState<EvidenceCategory[]>([]);
  const [interaction, setInteraction] = useState("");

  const all = query.data;
  const traceable = useMemo(() => (all ?? []).filter(isTraceable), [all]);
  const interactions = useMemo(() => [...new Set(traceable.map((f) => f.interaction_type))].sort(), [traceable]);
  const rows = useMemo(
    () =>
      traceable.filter(
        (f) =>
          (categories.length === 0 || categories.includes(f.category)) &&
          (!interaction || f.interaction_type === interaction),
      ),
    [traceable, categories, interaction],
  );
  const withheld = (all?.length ?? 0) - traceable.length;

  return (
    <QueryView query={query}>
      {() => (
        <>
          {withheld > 0 && (
            <div className="mb-5">
              <Notice title={`${withheld} finding${withheld === 1 ? "" : "s"} withheld`}>
                {withheld === 1 ? "It lacks" : "They lack"} a traceable source for at least one evidence item, so {withheld === 1 ? "it is" : "they are"} not shown.
              </Notice>
            </div>
          )}

          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <fieldset className="flex flex-wrap items-center gap-2">
              <legend className="sr-only">Filter by evidence category</legend>
              {EVIDENCE_CATEGORIES.map((c) => {
                const active = categories.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setCategories(active ? categories.filter((x) => x !== c) : [...categories, c])}
                    className={`min-h-9 rounded-lg border px-3 text-[13px] font-medium transition-colors ${
                      active ? `border-current ${EVIDENCE_META[c].text} ${EVIDENCE_META[c].bg}` : "border-line-strong bg-surface text-body hover:bg-subtle"
                    }`}
                  >
                    {EVIDENCE_META[c].label}
                  </button>
                );
              })}
            </fieldset>
            <Select
              value={interaction}
              onChange={setInteraction}
              aria-label="Filter by interaction type"
              className="lg:w-64"
              options={[{ value: "", label: "All interaction types" }, ...interactions.map((i) => ({ value: i, label: i }))]}
            />
          </div>

          {traceable.length === 0 ? (
            <EmptyState title="No candidate relationships found">
              This analysis found no shared targets with traceable evidence. With incomplete coverage, this is not evidence that none exist.
            </EmptyState>
          ) : rows.length === 0 ? (
            <EmptyState title="No findings match these filters">Clear a filter to see more results.</EmptyState>
          ) : (
            <DataTable
              caption="Ranked candidate molecular relationships"
              columns={columns}
              data={rows}
              hideOnMobile={["rank", "category", "confidence"]}
              hideBelowDesktop={["pathways", "interaction_type"]}
              onRowClick={(f) => router.push(`/findings/${f.id}`)}
              renderDetail={(f) => <EvidenceSummary finding={f} />}
            />
          )}
        </>
      )}
    </QueryView>
  );
}

export function FindingsView() {
  const router = useRouter();
  const requested = useSearchParams().get("analysis");
  const query = useAnalyses();

  return (
    <QueryView query={query}>
      {(analyses) => {
        const current =
          analyses.find((a) => a.id === requested) ?? (requested ? null : analyses.find((a) => a.status === "completed") ?? analyses[0] ?? null);

        return (
          <>
            <PageHeader
              title="Molecular findings"
              description="Compounds from different plants that share biological targets or pathways, ranked for further investigation. These are research candidates, not proven synergy."
              actions={
                current?.status === "completed" ? (
                  <ButtonLink variant="secondary" href={`/graph?analysis=${current.id}`}>
                    <Network className="size-4" aria-hidden />
                    View in graph
                  </ButtonLink>
                ) : undefined
              }
            />

            {analyses.length === 0 ? (
              <EmptyState title="No analyses yet" action={<ButtonLink href="/formulations">Choose a formulation</ButtonLink>}>
                Run an analysis on a formulation to see molecular findings.
              </EmptyState>
            ) : !current ? (
              <ErrorState title="Analysis not found" error={new Error("That analysis could not be found. Choose another from History.")} />
            ) : (
              <>
                <div className="mb-10 max-w-md">
                  <label htmlFor="analysis" className="mb-2 block font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">Analysis</label>
                  <Select
                    id="analysis"
                    value={current.id}
                    onChange={(next) => router.push(`/findings?analysis=${next}`)}
                    options={analyses.map((a) => ({
                      value: a.id,
                      label: a.formulation_name,
                      detail: `${formatDate(a.started_at)} · ${a.status}`,
                    }))}
                  />
                </div>

                {current.status === "failed" ? (
                  <ErrorState title="Analysis failed" error={new Error(current.error ?? "This analysis failed.")} />
                ) : current.status !== "completed" ? (
                  <Panel className="px-6 py-14 text-center" role="status">
                    <Loader2 className="mx-auto size-6 animate-spin text-leaf" aria-hidden />
                    <p className="mt-3 text-sm font-medium">Analysis in progress</p>
                    <p className="mt-1 text-[13px] text-muted">Results appear here when it finishes.</p>
                  </Panel>
                ) : (
                  <>
                    <Section title="Coverage">
                      <CoverageSummary coverage={current.coverage} />
                    </Section>
                    <Section title="Ranked candidates" description="Each finding is labelled with its weakest supporting evidence." className="mb-0">
                      <FindingsTable key={current.id} analysis={current} />
                    </Section>
                  </>
                )}
              </>
            )}
          </>
        );
      }}
    </QueryView>
  );
}
