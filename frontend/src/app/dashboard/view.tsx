"use client";

import { ArrowRight, Upload } from "lucide-react";
import Link from "next/link";
import { AnalysisStatus } from "@/components/analysis-status";
import { CoverageSummary, EvidenceLegend, Notice } from "@/components/evidence";
import { EmptyState, QueryView } from "@/components/states";
import { ButtonLink, Panel, Section, formatDate } from "@/components/ui";
import { useAnalyses, useFormulations, useManuscripts, usePlants } from "@/lib/api";

const WORKFLOW = [
  { title: "Upload", text: "Add a manuscript image or PDF.", href: "/manuscripts" },
  { title: "Verify", text: "Review OCR and plant identifications.", href: "/manuscripts" },
  { title: "Analyse", text: "Run molecular analysis on a formulation.", href: "/formulations" },
  { title: "Inspect", text: "Trace each finding to its evidence.", href: "/findings" },
];

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col px-5 py-4 sm:px-6 sm:py-5">
      <dt className="font-label text-[11px] tracking-[0.15em] text-ochre uppercase">{label}</dt>
      <dd className="mt-auto pt-2 font-display text-5xl leading-none tabular-nums sm:text-6xl">
        {value ?? <span className="text-line-strong">–</span>}
      </dd>
    </div>
  );
}

export function DashboardView() {
  const formulations = useFormulations();
  const manuscripts = useManuscripts();
  const analyses = useAnalyses();
  const plants = usePlants();

  const findingsTotal = analyses.data?.reduce((sum, a) => sum + a.findings_count, 0);
  const toReview = manuscripts.data?.filter((m) => m.status === "review") ?? [];
  const latest = analyses.data?.find((a) => a.status === "completed");

  return (
    <>
      <div className="mb-10 flex flex-col gap-6 sm:mb-12 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="max-w-3xl font-display text-[clamp(40px,5vw,72px)] leading-[1.05] text-balance">
            From ancient formulation to molecular evidence
          </h1>
          <p className="mt-3 max-w-xl text-[17px] leading-relaxed text-body">
            Digitise polyherbal manuscripts, verify their ingredients, and explore candidate molecular
            relationships with every claim traced to its source.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/manuscripts">
            <Upload className="size-4" aria-hidden />
            Upload manuscript
          </ButtonLink>
          <ButtonLink href="/formulations" variant="secondary">
            Explore formulations
          </ButtonLink>
        </div>
      </div>

      <Panel className="mb-10 sm:mb-12">
        <dl className="grid grid-cols-2 divide-line max-lg:[&>*:nth-child(n+3)]:border-t max-lg:[&>*:nth-child(n+3)]:border-line [&>*:nth-child(even)]:border-l [&>*:nth-child(even)]:border-line lg:grid-cols-4 lg:[&>*:not(:first-child)]:border-l lg:[&>*:not(:first-child)]:border-line">
          <Stat label="Formulations" value={formulations.data?.length} />
          <Stat label="Plants on record" value={plants.data?.length} />
          <Stat label="Analysis runs" value={analyses.data?.length} />
          <Stat label="Candidate findings" value={findingsTotal} />
        </dl>
      </Panel>

      {toReview.length > 0 && (
        <div className="mb-10 sm:mb-12">
          <Notice title="Awaiting your review">
            {toReview.length} manuscript{toReview.length === 1 ? " needs" : "s need"} OCR and ingredient
            verification.{" "}
            <Link href={`/manuscripts/${toReview[0].id}`} className="font-medium underline underline-offset-2">
              Review {toReview[0].filename}
            </Link>
          </Notice>
        </div>
      )}

      <div className="grid grid-cols-1 gap-x-10 lg:grid-cols-2">
        <Section
          title="Recent formulations"
          actions={<Link href="/formulations" className="font-label text-[11px] tracking-[0.15em] text-vermillion uppercase hover:underline">View all</Link>}
        >
          <QueryView query={formulations} rows={3}>
            {(data) =>
              data.length === 0 ? (
                <EmptyState title="No formulations yet">Upload a manuscript or add one by hand.</EmptyState>
              ) : (
                <Panel>
                  <ul className="divide-y divide-line">
                    {data.slice(0, 4).map((f) => (
                      <li key={f.id}>
                        <Link href={`/formulations/${f.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{f.name}</span>
                            <span className="block truncate text-[13px] text-muted">
                              {f.tradition} · {f.period}
                            </span>
                          </span>
                          <span className="shrink-0 text-[13px] text-muted tabular-nums">
                            {f.ingredients.length} ingredient{f.ingredients.length === 1 ? "" : "s"}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )
            }
          </QueryView>
        </Section>

        <Section
          title="Recent analyses"
          actions={<Link href="/analyses" className="font-label text-[11px] tracking-[0.15em] text-vermillion uppercase hover:underline">View all</Link>}
        >
          <QueryView query={analyses} rows={3}>
            {(data) =>
              data.length === 0 ? (
                <EmptyState title="No analyses yet">Run an analysis from any formulation.</EmptyState>
              ) : (
                <Panel>
                  <ul className="divide-y divide-line">
                    {data.slice(0, 4).map((a) => (
                      <li key={a.id}>
                        <Link href={`/findings?analysis=${a.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-paper">
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{a.formulation_name}</span>
                            <span className="block text-[13px] text-muted">
                              {formatDate(a.started_at)} · {a.findings_count} finding{a.findings_count === 1 ? "" : "s"}
                            </span>
                          </span>
                          <AnalysisStatus status={a.status} />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Panel>
              )
            }
          </QueryView>
        </Section>
      </div>

      {latest && (
        <Section title="Latest analysis coverage" description={latest.formulation_name}>
          <CoverageSummary coverage={latest.coverage} />
        </Section>
      )}

      <Section title="Research workflow">
        <ol className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW.map((step, i) => (
            <li key={step.title} className="bg-surface">
              <Link href={step.href} className="group block h-full p-5 hover:bg-paper">
                <span className="font-label text-[11px] tracking-[0.15em] text-ochre uppercase tabular-nums">Step {i + 1}</span>
                <span className="mt-2 flex items-center gap-1.5 font-display text-2xl">
                  {step.title}
                  <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                </span>
                <span className="mt-1 block text-[13px] leading-snug text-body">{step.text}</span>
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="How to read evidence" className="mb-0">
        <EvidenceLegend />
      </Section>
    </>
  );
}
