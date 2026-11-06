"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { CompoundDetail } from "@/components/compound-detail";
import { Notice, SourceList } from "@/components/evidence";
import { EmptyState, QueryView } from "@/components/states";
import { Botanical, Meta, PageHeader, Panel, Section } from "@/components/ui";
import { useCompound, usePlant } from "@/lib/api";

function ExpandedCompound({ compoundId }: { compoundId: string }) {
  const query = useCompound(compoundId);
  return (
    <div className="border-t border-line p-4 sm:p-5">
      <QueryView query={query} rows={2}>
        {(c) => (
          <>
            <CompoundDetail compound={c} />
            <Link href={`/compounds/${c.id}`} className="mt-4 inline-block text-sm font-medium text-leaf hover:underline">
              Open compound page
            </Link>
          </>
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
  // A compound is only fetched once it's first opened. It then stays mounted, so it can animate closed.
  const [opened, setOpened] = useState<string[]>(initial ? [initial] : []);

  return (
    <QueryView query={query}>
      {(p) => (
        <>
          <PageHeader
            title={<Botanical>{p.botanical_name}</Botanical>}
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
                        onClick={() => {
                          setOpen(expanded ? null : c.id);
                          if (!opened.includes(c.id)) setOpened([...opened, c.id]);
                        }}
                        className="flex w-full items-center justify-between gap-4 px-4 py-3.5 text-left hover:bg-paper sm:px-5"
                      >
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{c.name}</span>
                          <span className="block text-[13px] text-muted tabular-nums">
                            {c.formula ?? "Formula not available"} · {c.target_count} target{c.target_count === 1 ? "" : "s"}
                          </span>
                        </span>
                        <ChevronDown
                          className={`size-4 shrink-0 text-muted transition-transform delay-100 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${expanded ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </button>
                      <div
                        className={`grid transition-[grid-template-rows] delay-100 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                        }`}
                      >
                        <div inert={!expanded} className="min-h-0 overflow-hidden">
                          {opened.includes(c.id) && <ExpandedCompound compoundId={c.id} />}
                        </div>
                      </div>
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
