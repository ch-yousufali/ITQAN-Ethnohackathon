"use client";

import { useEffect, useRef, useState } from "react";
import ForceGraph3D, { type ForceGraphMethods } from "react-force-graph-3d";
import SpriteText from "three-spritetext";
import { EVIDENCE_META } from "@/components/evidence";
import type { Graph, GraphLink, GraphNode, GraphNodeType } from "@/lib/api/schemas";
import { NODE_COLORS } from "./node-colors";

const NODE_SIZE: Record<GraphNodeType, number> = { formulation: 9, plant: 6, compound: 4, target: 5, pathway: 4 };

type SimNode = GraphNode & { x?: number; y?: number; z?: number };
type SimLink = Omit<GraphLink, "source" | "target"> & { source: string | SimNode; target: string | SimNode };

const nodeId = (end: string | SimNode) => (typeof end === "string" ? end : end.id);

export default function GraphCanvas({
  graph,
  selectedId,
  onSelectNode,
  onSelectLink,
}: {
  graph: Graph;
  selectedId: string | null;
  onSelectNode: (id: string | null) => void;
  onSelectLink: (id: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const fg = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(undefined);
  const [size, setSize] = useState({ width: 0, height: 0 });

  // The force simulation mutates its input, so hand it copies.
  const [data, setData] = useState<{ nodes: SimNode[]; links: SimLink[] }>({ nodes: [], links: [] });
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- re-seed the simulation when the graph prop changes
    setData({ nodes: graph.nodes.map((n) => ({ ...n })), links: graph.links.map((l) => ({ ...l })) });
  }, [graph]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  // Tighten the layout, and pull unconnected clusters in so they don't shrink the view.
  useEffect(() => {
    const graphRef = fg.current;
    if (!graphRef) return;
    graphRef.d3Force("charge")?.strength(-70);
    graphRef.d3Force("link")?.distance(28);
    graphRef.d3Force("gravity", (alpha: number) => {
      for (const n of data.nodes as (SimNode & { vx?: number; vy?: number; vz?: number })[]) {
        n.vx = (n.vx ?? 0) - (n.x ?? 0) * 0.12 * alpha;
        n.vy = (n.vy ?? 0) - (n.y ?? 0) * 0.12 * alpha;
        n.vz = (n.vz ?? 0) - (n.z ?? 0) * 0.12 * alpha;
      }
    });
    graphRef.d3ReheatSimulation();
  }, [data, size.width > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fly to the selected node.
  useEffect(() => {
    if (!selectedId || !fg.current) return;
    const n = data.nodes.find((x) => x.id === selectedId);
    if (!n || n.x === undefined || n.y === undefined || n.z === undefined) return;
    const ratio = 1 + 170 / Math.max(Math.hypot(n.x, n.y, n.z), 1);
    fg.current.cameraPosition({ x: n.x * ratio, y: n.y * ratio, z: n.z * ratio }, { x: n.x, y: n.y, z: n.z }, 600);
  }, [selectedId, data]);

  const linked = new Set<string>();
  if (selectedId) {
    for (const l of data.links) {
      const s = nodeId(l.source);
      const t = nodeId(l.target);
      if (s === selectedId) linked.add(t);
      if (t === selectedId) linked.add(s);
    }
    linked.add(selectedId);
  }
  const dimmed = (id: string) => selectedId !== null && !linked.has(id);

  return (
    <div ref={host} className="absolute inset-0">
      {size.width > 0 && (
        <ForceGraph3D<SimNode, SimLink>
          ref={fg}
          width={size.width}
          height={size.height}
          graphData={data}
          backgroundColor="#ffffff"
          showNavInfo={false}
          nodeId="id"
          nodeLabel={() => ""}
          nodeVal={(n) => NODE_SIZE[n.type]}
          nodeRelSize={2}
          nodeOpacity={0.95}
          nodeResolution={16}
          nodeColor={(n) => (dimmed(n.id) ? "#e6e8e0" : NODE_COLORS[n.type])}
          nodeThreeObjectExtend
          nodeThreeObject={(n) => {
            const label = new SpriteText(n.label);
            label.color = dimmed(n.id) ? "#c5c9bd" : "#1b2620";
            label.textHeight = n.id === selectedId ? 5.5 : 4.5;
            label.fontFace = "Inter, sans-serif";
            label.fontWeight = n.id === selectedId ? "600" : "400";
            label.position.y = -(Math.sqrt(NODE_SIZE[n.type]) * 2 + 6);
            return label;
          }}
          linkColor={(l) =>
            dimmed(nodeId(l.source)) || dimmed(nodeId(l.target)) ? "#eef0e9" : l.category ? EVIDENCE_META[l.category].hex : "#c3c8bb"
          }
          linkWidth={(l) => (l.category ? 0.9 : 0.4)}
          linkOpacity={0.85}
          linkDirectionalArrowLength={2.5}
          linkDirectionalArrowRelPos={0.92}
          onNodeClick={(n) => onSelectNode(n.id)}
          onLinkClick={(l) => onSelectLink(l.id)}
          onBackgroundClick={() => onSelectNode(null)}
          cooldownTicks={120}
          onEngineStop={() => {
            if (!selectedId) fg.current?.zoomToFit(500, 40);
          }}
        />
      )}
    </div>
  );
}
