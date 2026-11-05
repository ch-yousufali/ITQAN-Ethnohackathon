"use client";

import { ChevronDown } from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { EvidenceBadge, Notice, SourceList } from "@/components/evidence";
import { EmptyState, QueryView } from "@/components/states";
import { Structure } from "@/components/structure";
import { Botanical, Meta, PageHeader, Panel, Section } from "@/components/ui";
import { useCompound, usePlant } from "@/lib/api";

function CompoundDetail({ compoundId }: { compoundId: string }) {
  const query = useCompound(compoundId);
  return (
    <div className="border-t border-line p-4 sm:p-5">
      <QueryView query={query} rows={2}>
        {(c) => (
          <div className="flex flex-col gap-6 lg:flex-row">
            <Structure key={c.smiles} smiles={c.smiles} name={c.name} />
            <div className="min-w-0 flex-1 space-y-5">
              <dl className="grid grid-cols-2 gap-4">
                <Meta label="Formula">{c.formula ?? <span className="text-muted">Not available</span>}</Meta>
                <Meta label="Molecular weight">
                  {c.molecular_weight !== null ? `${c.molecular_weight} g/mol` : <span className="text-muted">Not available</span>}
                </Meta>
                {c.smiles && (
                  <div className="col-span-2">
                    <dt className="text-[13px] text-muted">SMILES</dt>
                    <dd className="mt-0.5 font-mono text-[13px] break-all text-ink">{c.smiles}</dd>
                  </div>
                )}
              </dl>

              <div>
                <h3 className="text-sm font-semibold">Biological targets</h3>
                {c.targets.length === 0 ? (
                  <p className="mt-1 text-sm text-warn">No known targets on record. This reflects missing data, not proven inactivity.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-line">
                    {c.targets.map((t) => (
                      <li key={t.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium">{t.symbol}</span>
                          <span className="text-[13px] text-muted">{t.name}{t.action ? ` · ${t.action}` : ""}</span>
                          <EvidenceBadge category={t.category} />
                        </div>
                        <div className="mt-1"><SourceList sources={t.sources} /></div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <h3 className="text-sm font-semibold">Compound references</h3>
                <div className="mt-1"><SourceList sources={c.references} /></div>
              </div>
            </div>
          </div>
        )}
      </QueryView>
    </div>
  );
}

export function PlantDetailView() {
  const { id } = useParams<{ id: string }>();
  const initial = useSearchParams().get("compound");
  const query = usePlant(id);
  const [open, setOpen] = useState<string | null>(initial);

  return (
    <QueryView query={query}>
      {(p) => (
        <>
          <PageHeader
            back={{ href: "/plants", label: "Plants" }}
            title={<Botanical className="font-medium">{p.botanical_name}</Botanical>}
            description={p.description ?? undefined}
          />

          <dl className="mb-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
            <Meta label="Family">{p.family ?? <span className="text-muted">Not recorded</span>}</Meta>
            <Meta label="Common names">{p.common_names.join(", ") || <span className="text-muted">Not recorded</span>}</Meta>
            <Meta label="Traditional names">{p.traditional_names.join(", ") || <span className="text-muted">Not recorded</span>}</Meta>
            <Meta label="Parts used">{p.parts_used.join(", ") || <span className="text-muted">Not recorded</span>}</Meta>
          </dl>

          <Section title="Associated compounds" description="Select a compound to see its structure, targets and references.">
            {p.compounds.length === 0 ? (
              <EmptyState title="No compound data available">
                No phytochemical records exist for this plant in the connected sources. This does not mean it contains no active compounds.
              </EmptyState>
            ) : (
              <Panel className="divide-y divide-line">
                {p.compounds.map((c) => {
                  const expanded = open === c.id;
                  return (
                    <div key={c.id}>
                      <button
                        type="button"
                        aria-expanded={expanded}
                        onClick={() => setOpen(expanded ? null : c.id)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-paper sm:px-5"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{c.name}</span>
                          <span className="block text-[13px] text-muted tabular-nums">
                            {c.formula ?? "Formula not available"} · {c.target_count} target{c.target_count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${expanded ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      {expanded && <CompoundDetail compoundId={c.id} />}
                    </div>
                  );
                })}
              </Panel>
            )}
          </Section>

          <Section title="Scientific references" className="mb-0">
            {p.references.length === 0 ? (
              <Notice>No botanical reference is on record for this plant, so these details are unverified.</Notice>
            ) : (
              <SourceList sources={p.references} />
            )}
          </Section>
        </>
      )}
    </QueryView>
  );
}
