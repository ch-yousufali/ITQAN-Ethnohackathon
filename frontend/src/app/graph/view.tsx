"use client";

import { Search, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Component, useMemo, useState, type ReactNode } from "react";
import { EVIDENCE_META, EvidenceBadge, Notice, SourceList } from "@/components/evidence";
import { EmptyState, LoadingState, QueryView } from "@/components/states";
import { Select } from "@/components/select";
import { Botanical, Button, Input, PageHeader, Panel, formatDate } from "@/components/ui";
import { useAnalyses, useGraph } from "@/lib/api";
import { EVIDENCE_CATEGORIES, NODE_TYPES, type EvidenceCategory, type Graph, type GraphLink, type GraphNodeType } from "@/lib/api/schemas";
import { NODE_COLORS } from "./node-colors";

// Three.js needs the browser, and is heavy enough to load only on this screen.
const GraphCanvas = dynamic(() => import("./graph-canvas"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center text-sm text-muted">Loading graph…</div>,
});

const TYPE_LABELS: Record<GraphNodeType, string> = {
  formulation: "Formulations",
  plant: "Plants",
  compound: "Compounds",
  target: "Targets",
  pathway: "Pathways",
};

class WebGlBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function LinkDetail({ link, graph }: { link: GraphLink; graph: Graph }) {
  const label = (id: string) => graph.nodes.find((n) => n.id === id)?.label ?? id;
  return (
    <div className="p-4">
      <p className="text-sm">
        <span className="font-medium">{label(link.source)}</span>
        <span className="text-muted"> {link.relation} </span>
        <span className="font-medium">{label(link.target)}</span>
      </p>
      {link.category && <div className="mt-2"><EvidenceBadge category={link.category} /></div>}
      {(link.category || link.sources.length > 0) && <div className="mt-2"><SourceList sources={link.sources} /></div>}
    </div>
  );
}

function Explorer({ graph }: { graph: Graph }) {
  const [hiddenTypes, setHiddenTypes] = useState<GraphNodeType[]>([]);
  const [hiddenEvidence, setHiddenEvidence] = useState<EvidenceCategory[]>([]);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedLink, setSelectedLink] = useState<string | null>(null);

  // Evidence claims without a source are withheld, the same as on the findings screen.
  const unsourced = useMemo(() => graph.links.filter((l) => l.category && l.sources.length === 0).length, [graph]);

  const visible = useMemo<Graph>(() => {
    const nodes = graph.nodes.filter((n) => !hiddenTypes.includes(n.type));
    const ids = new Set(nodes.map((n) => n.id));
    return {
      nodes,
      links: graph.links.filter(
        (l) =>
          ids.has(l.source) &&
          ids.has(l.target) &&
          !(l.category && (hiddenEvidence.includes(l.category) || l.sources.length === 0)),
      ),
    };
  }, [graph, hiddenTypes, hiddenEvidence]);

  const q = search.trim().toLowerCase();
  const matches = q ? visible.nodes.filter((n) => n.label.toLowerCase().includes(q)).slice(0, 8) : [];
  const node = visible.nodes.find((n) => n.id === selectedId) ?? null;
  const link = visible.links.find((l) => l.id === selectedLink) ?? null;
  const connections = node ? visible.links.filter((l) => l.source === node.id || l.target === node.id) : [];

  const selectNode = (id: string | null) => {
    setSelectedId(id);
    setSelectedLink(null);
  };
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const nodeList = (
    <Panel className="max-h-[32rem] divide-y divide-line overflow-auto">
      {visible.nodes.map((n) => (
        <button key={n.id} type="button" onClick={() => selectNode(n.id)} className="block w-full px-4 py-2.5 text-left text-sm hover:bg-paper">
          {n.label} <span className="text-[13px] text-muted">{n.type}</span>
        </button>
      ))}
    </Panel>
  );

  return (
    <div className="grid gap-5 lg:grid-cols-[17rem_1fr]">
      <aside className="order-2 space-y-5 lg:order-1">
        <div className="relative">
          <Search className="pointer-events-none absolute top-3 left-3 size-4 text-muted" aria-hidden />
          <Input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search nodes" aria-label="Search graph nodes" className="pl-9" />
          {q && (
            <div className="absolute top-full right-0 left-0 z-20 mt-1 rounded-lg border border-line bg-surface p-1 shadow-[0_8px_24px_rgb(27_38_32/0.1)]">
              {matches.length === 0 ? (
                <p className="px-2.5 py-1.5 text-[13px] text-muted">No matching nodes</p>
              ) : (
                matches.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      selectNode(n.id);
                      setSearch("");
                    }}
                    className="block min-h-9 w-full rounded-md px-2.5 py-1.5 text-left text-sm hover:bg-subtle"
                  >
                    {n.label} <span className="text-[13px] text-muted">{n.type}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <fieldset>
          <legend className="mb-3 font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">Show nodes</legend>
          <div className="space-y-1.5">
            {NODE_TYPES.map((t) => (
              <label key={t} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" className="size-4 accent-leaf" checked={!hiddenTypes.includes(t)} onChange={() => setHiddenTypes(toggle(hiddenTypes, t))} />
                <span aria-hidden className="size-2.5 rounded-full" style={{ background: NODE_COLORS[t] }} />
                {TYPE_LABELS[t]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="mb-3 font-label text-[11px] font-normal tracking-[0.15em] text-ochre uppercase">Show evidence links</legend>
          <div className="space-y-1.5">
            {EVIDENCE_CATEGORIES.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input type="checkbox" className="size-4 accent-leaf" checked={!hiddenEvidence.includes(c)} onChange={() => setHiddenEvidence(toggle(hiddenEvidence, c))} />
                <span aria-hidden className="h-0.5 w-3.5 rounded" style={{ background: EVIDENCE_META[c].hex }} />
                {EVIDENCE_META[c].label}
              </label>
            ))}
          </div>
        </fieldset>
      </aside>

      <div className="order-1 min-w-0 lg:order-2">
        {unsourced > 0 && (
          <div className="mb-4">
            <Notice>
              {unsourced} evidence relationship{unsourced === 1 ? " is" : "s are"} hidden because {unsourced === 1 ? "it has" : "they have"} no traceable source.
            </Notice>
          </div>
        )}
        <WebGlBoundary
          fallback={
            <div className="space-y-3">
              <Notice title="3D view unavailable">This browser could not start WebGL. Browse the graph as a list instead.</Notice>
              {nodeList}
            </div>
          }
        >
          <div className="relative h-[60vh] min-h-[26rem] overflow-hidden rounded-xl border border-line bg-surface lg:h-[40rem]">
            <GraphCanvas
              graph={visible}
              selectedId={selectedId}
              onSelectNode={selectNode}
              onSelectLink={(id) => {
                setSelectedLink(id);
                setSelectedId(null);
              }}
            />
            <p className="pointer-events-none absolute bottom-3 left-3 hidden rounded-md bg-surface/90 px-2 py-1 text-[13px] text-muted sm:block">
              Drag to rotate · Scroll to zoom · Click a node or link
            </p>
          </div>
        </WebGlBoundary>

        {(node || link) && (
          <Panel className="mt-4">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
              <div className="min-w-0">
                {node ? (
                  <>
                    <p className="text-[13px] text-muted capitalize">{node.type}</p>
                    <p className="text-sm font-medium">
                      {node.type === "plant" ? <Botanical>{node.label}</Botanical> : node.label}
                    </p>
                  </>
                ) : (
                  <p className="text-sm font-medium">Relationship</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {node?.href && (
                  <Link href={node.href} className="px-2 text-sm font-medium text-leaf hover:underline">Open record</Link>
                )}
                <Button variant="ghost" className="!min-h-8 !px-2" aria-label="Close details" onClick={() => { selectNode(null); }}>
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            </div>
            {link && <LinkDetail link={link} graph={graph} />}
            {node &&
              (connections.length === 0 ? (
                <p className="p-4 text-sm text-muted">No visible relationships.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {connections.map((l) => <li key={l.id}><LinkDetail link={l} graph={graph} /></li>)}
                </ul>
              ))}
          </Panel>
        )}
      </div>
    </div>
  );
}

export function GraphView() {
  const router = useRouter();
  const analysisId = useSearchParams().get("analysis");
  const query = useGraph(analysisId);
  const analyses = useAnalyses();
  const completed = analyses.data?.filter((a) => a.status === "completed") ?? [];

  return (
    <>
      <PageHeader
        title="Knowledge graph"
        description="How formulations, plants, compounds, targets and pathways connect. A connection is a recorded relationship, not a demonstrated combined effect."
        actions={
          <Select
            aria-label="Graph scope"
            className="w-full sm:w-80"
            value={analysisId ?? ""}
            onChange={(next) => router.push(next ? `/graph?analysis=${next}` : "/graph")}
            options={[
              { value: "", label: "All formulations" },
              ...completed.map((a) => ({ value: a.id, label: a.formulation_name, detail: formatDate(a.started_at) })),
            ]}
          />
        }
      />
      {query.isPending ? (
        <LoadingState />
      ) : (
        <QueryView query={query}>
          {(graph) =>
            graph.nodes.length === 0 ? (
              <EmptyState title="Nothing to graph yet">Add a formulation with identified ingredients to see its relationships.</EmptyState>
            ) : (
              <Explorer key={analysisId ?? "all"} graph={graph} />
            )
          }
        </QueryView>
      )}
    </>
  );
}
