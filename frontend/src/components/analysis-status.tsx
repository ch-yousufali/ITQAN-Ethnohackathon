import type { Analysis } from "@/lib/api/schemas";

const STYLES: Record<Analysis["status"], { label: string; className: string }> = {
  queued: { label: "Queued", className: "bg-subtle text-body" },
  running: { label: "Running", className: "bg-subtle text-body" },
  completed: { label: "Completed", className: "bg-leaf-soft text-leaf-dark" },
  failed: { label: "Failed", className: "bg-danger-soft text-danger" },
};

export function AnalysisStatus({ status }: { status: Analysis["status"] }) {
  const s = STYLES[status];
  return <span className={`inline-block shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${s.className}`}>{s.label}</span>;
}
