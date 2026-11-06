import type { Compound } from "@/lib/api/schemas";
import { EvidenceBadge, SourceList } from "./evidence";
import { Structure } from "./structure";
import { Meta } from "./ui";

/** A compound's structure, chemistry, targets and references. Missing values are stated, never filled in. */
export function CompoundDetail({ compound: c }: { compound: Compound }) {
  return (
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
  );
}
