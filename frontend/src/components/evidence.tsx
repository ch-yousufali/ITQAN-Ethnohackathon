import { AlertTriangle, ExternalLink } from "lucide-react";
import type { Coverage, EvidenceCategory, Finding, SourceRef } from "@/lib/api/schemas";
import { formatPercent } from "./ui";

export const EVIDENCE_META: Record<
  EvidenceCategory,
  { label: string; description: string; text: string; bg: string; hex: string; computational: boolean }
> = {
  MEASURED: {
    label: "Measured",
    description: "Determined experimentally",
    text: "text-measured",
    bg: "bg-measured-soft",
    hex: "#1d7a46",
    computational: false,
  },
  CURATED: {
    label: "Curated",
    description: "Recorded in a curated database",
    text: "text-curated",
    bg: "bg-curated-soft",
    hex: "#1f5fbf",
    computational: false,
  },
  INFERRED: {
    label: "Inferred",
    description: "Derived indirectly from other data",
    text: "text-inferred",
    bg: "bg-inferred-soft",
    hex: "#8a5000",
    computational: true,
  },
  PREDICTED: {
    label: "Predicted",
    description: "Computational prediction, not experimentally verified",
    text: "text-predicted",
    bg: "bg-predicted-soft",
    hex: "#6d3fc4",
    computational: true,
  },
};

/** A distinct shape per category, so meaning never depends on colour alone. */
export function EvidenceGlyph({ category }: { category: EvidenceCategory }) {
  const shape = {
    MEASURED: <circle cx="5" cy="5" r="4" fill="currentColor" />,
    CURATED: <rect x="1.5" y="1.5" width="7" height="7" rx="1" fill="currentColor" />,
    INFERRED: <path d="M5 1 9 5 5 9 1 5Z" fill="none" stroke="currentColor" strokeWidth="1.5" />,
    PREDICTED: <circle cx="5" cy="5" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="2 1.4" />,
  }[category];
  return (
    <svg viewBox="0 0 10 10" className="size-2.5 shrink-0" aria-hidden>
      {shape}
    </svg>
  );
}

export function EvidenceBadge({ category }: { category: EvidenceCategory }) {
  const meta = EVIDENCE_META[category];
  return (
    <span
      title={meta.description}
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-label text-[10px] tracking-[0.12em] ${meta.text} ${meta.bg}`}
    >
      <EvidenceGlyph category={category} />
      {category}
    </span>
  );
}

export function EvidenceLegend() {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
      {(Object.keys(EVIDENCE_META) as EvidenceCategory[]).map((c) => (
        <div key={c}>
          <dt>
            <EvidenceBadge category={c} />
          </dt>
          <dd className="mt-1 text-[13px] leading-snug text-muted">{EVIDENCE_META[c].description}</dd>
        </div>
      ))}
    </dl>
  );
}

export function SourceLink({ source }: { source: SourceRef }) {
  const label = `${source.database} · ${source.accession}`;
  return (
    <span className="text-[13px] leading-relaxed text-body">
      {source.url ? (
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 font-medium text-leaf underline-offset-2 hover:underline"
        >
          {label}
          <ExternalLink className="size-3" aria-hidden />
          <span className="sr-only">(opens in a new tab)</span>
        </a>
      ) : (
        <span className="font-medium text-ink">{label}</span>
      )}
      {source.title && <span className="text-muted"> · {source.title}</span>}
      {source.year && <span className="text-muted"> ({source.year})</span>}
    </span>
  );
}

export function SourceList({ sources }: { sources: SourceRef[] }) {
  if (sources.length === 0) {
    return <p className="text-[13px] text-warn">No source reference on record.</p>;
  }
  return (
    <ul className="space-y-1">
      {sources.map((s) => (
        <li key={s.id}>
          <SourceLink source={s} />
        </li>
      ))}
    </ul>
  );
}

export function Notice({
  title,
  children,
  tone = "warn",
}: {
  title?: string;
  children: React.ReactNode;
  tone?: "warn" | "neutral";
}) {
  const styles = tone === "warn" ? "border-warn-line bg-warn-soft text-warn" : "border-line bg-subtle text-body";
  return (
    <div className={`flex gap-2.5 rounded-lg border px-4 py-3 text-sm leading-relaxed ${styles}`}>
      <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden />
      <div className="min-w-0">
        {title && <p className="font-medium">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}

/** Coverage is always disclosed next to results (PRD rule 3). */
export function CoverageSummary({ coverage }: { coverage: Coverage | null }) {
  if (!coverage) {
    return (
      <Notice title="Coverage not reported">
        This analysis has no coverage information, so its completeness cannot be assessed.
      </Notice>
    );
  }
  const stats = [
    { label: "Ingredients identified", value: `${coverage.ingredients_mapped} of ${coverage.ingredients_total}` },
    { label: "Plants with compound data", value: `${coverage.plants_with_compounds}` },
    { label: "Compounds with known targets", value: `${coverage.compounds_with_targets} of ${coverage.compounds_total}` },
  ];
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-10">
        <div className="lg:w-56 lg:shrink-0">
          <p className="font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">Molecular data coverage</p>
          <p className="mt-2 font-display text-4xl leading-none tabular-nums">{formatPercent(coverage.ratio)}</p>
          <div
            role="meter"
            aria-label="Molecular data coverage"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(coverage.ratio * 100)}
            className="mt-3 h-1.5 overflow-hidden rounded-full bg-subtle"
          >
            <div className="h-full origin-left animate-grow rounded-full bg-leaf" style={{ width: `${coverage.ratio * 100}%` }} />
          </div>
        </div>
        <dl className="grid flex-1 gap-4 sm:grid-cols-3">
          {stats.map((s) => (
            <div key={s.label} className="flex flex-col">
              <dt className="font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">{s.label}</dt>
              {/* Pushed down, so values stay level when a label wraps. */}
              <dd className="mt-auto pt-2 font-display text-4xl leading-none tabular-nums">{s.value}</dd>
            </div>
          ))}
        </dl>
      </div>
      {coverage.warnings.length > 0 && (
        <div className="mt-5">
          <Notice title="Missing data">
            <ul className="list-disc space-y-0.5 pl-4">
              {coverage.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Notice>
        </div>
      )}
    </div>
  );
}

/** A finding is displayable only if every evidence item cites a source (PRD rule 1). */
export function isTraceable(finding: Finding) {
  return finding.evidence.length > 0 && finding.evidence.every((e) => e.sources.length > 0);
}

export function isComputationalOnly(finding: Finding) {
  return finding.evidence.every((e) => EVIDENCE_META[e.category].computational);
}
