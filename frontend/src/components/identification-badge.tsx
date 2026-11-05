import type { IdentificationStatus } from "@/lib/api/schemas";

const STYLES: Record<IdentificationStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "bg-leaf-soft text-leaf-dark" },
  corrected: { label: "Corrected by reviewer", className: "bg-leaf-soft text-leaf-dark" },
  uncertain: { label: "Uncertain", className: "bg-warn-soft text-warn" },
  unmapped: { label: "Unidentified", className: "bg-subtle text-body" },
};

export function IdentificationBadge({ status }: { status: IdentificationStatus }) {
  const s = STYLES[status];
  return <span className={`inline-block whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}
