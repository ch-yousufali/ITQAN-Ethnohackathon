"use client";

import { FlaskConical, Pencil } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AnalysisStatus } from "@/components/analysis-status";
import { Notice } from "@/components/evidence";
import { IdentificationBadge } from "@/components/identification-badge";
import { QueryView } from "@/components/states";
import { Botanical, Button, ButtonLink, Meta, PageHeader, Panel, Section, formatDate } from "@/components/ui";
import { useAnalyses, useFormulation, useRunAnalysis } from "@/lib/api";

export function FormulationDetailView() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const query = useFormulation(id);
  const analyses = useAnalyses();
  const run = useRunAnalysis();
  const runs = analyses.data?.filter((a) => a.formulation_id === id) ?? [];

  return (
    <QueryView query={query}>
      {(f) => {
        const gaps = f.ingredients.filter((i) => i.status === "unmapped" || i.status === "uncertain").length;
        return (
          <>
            <PageHeader
              title={f.name}
              description={f.description ?? undefined}
              actions={
                <>
                  <ButtonLink variant="secondary" href={`/formulations/${f.id}/edit`}>
                    <Pencil className="size-4" aria-hidden />
                    Edit
                  </ButtonLink>
                  <Button
                    disabled={run.isPending}
                    onClick={() => run.mutate(f.id, { onSuccess: (a) => router.push(`/findings?analysis=${a.id}`) })}
                  >
                    <FlaskConical className="size-4" aria-hidden />
                    {run.isPending ? "Starting…" : "Run analysis"}
                  </Button>
                </>
              }
            />

            {run.isError && (
              <div className="mb-6"><Notice title="Could not start the analysis">{run.error.message}</Notice></div>
            )}

            <dl className="mb-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
              <Meta label="Tradition">{f.tradition}</Meta>
              <Meta label="Historical period">{f.period}</Meta>
              <Meta label="Updated">{formatDate(f.updated_at)}</Meta>
              <Meta label="Historical source">
                {f.source_note ?? <span className="text-warn">Not recorded</span>}
              </Meta>
            </dl>

            {gaps > 0 && (
              <div className="mb-6">
                <Notice>
                  {gaps} ingredient{gaps === 1 ? " is" : "s are"} not confidently identified and will reduce
                  analysis coverage.
                </Notice>
              </div>
            )}

            <Section title="Ingredients">
              <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-line font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">
                      <th scope="col" className="px-4 py-3 font-medium">Traditional name</th>
                      <th scope="col" className="px-4 py-3 font-medium">Botanical name</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Part used</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium md:table-cell">Quantity</th>
                      <th scope="col" className="hidden px-4 py-3 font-medium sm:table-cell">Identification</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {f.ingredients.map((i) => (
                      <tr key={i.id}>
                        <td className="px-4 py-3.5">{i.traditional_name}</td>
                        <td className="px-4 py-3.5">
                          {i.plant_id && i.botanical_name ? (
                            <Link href={`/plants/${i.plant_id}`} className="hover:text-leaf">
                              <Botanical>{i.botanical_name}</Botanical>
                            </Link>
                          ) : (
                            <span className="text-muted">Unknown</span>
                          )}
                          <span className="mt-1.5 block sm:hidden"><IdentificationBadge status={i.status} /></span>
                        </td>
                        <td className="hidden px-4 py-3.5 text-body md:table-cell">{i.part_used ?? "–"}</td>
                        <td className="hidden px-4 py-3.5 text-body md:table-cell">{i.quantity ?? "–"}</td>
                        <td className="hidden px-4 py-3.5 sm:table-cell"><IdentificationBadge status={i.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section title="Analyses" className="mb-0">
              <QueryView query={analyses} rows={2}>
                {() =>
                  runs.length === 0 ? (
                    <p className="text-sm text-muted">No analysis has been run on this formulation yet.</p>
                  ) : (
                    <Panel>
                      <ul className="divide-y divide-line">
                        {runs.map((a) => (
                          <li key={a.id}>
                            <Link href={`/findings?analysis=${a.id}`} className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm hover:bg-paper">
                              <span>
                                {formatDate(a.started_at)}
                                <span className="text-muted"> · {a.findings_count} finding{a.findings_count === 1 ? "" : "s"}</span>
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
          </>
        );
      }}
    </QueryView>
  );
}
