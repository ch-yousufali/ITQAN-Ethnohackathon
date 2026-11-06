import { ArrowRight } from "lucide-react";
import type { CSSProperties } from "react";

const COLUMNS = [
  { x: 70, label: "Formulation" },
  { x: 275, label: "Plants" },
  { x: 480, label: "Compounds" },
  { x: 685, label: "Targets" },
  { x: 890, label: "Pathways" },
];

type NodeId = "f" | "p1" | "p2" | "p3" | "c1" | "c2" | "c3" | "c4" | "t1" | "t2" | "t3" | "w1" | "w2";

const NODES: Record<NodeId, [x: number, y: number]> = {
  f: [70, 240],
  p1: [275, 120],
  p2: [275, 240],
  p3: [275, 360],
  c1: [480, 90],
  c2: [480, 190],
  c3: [480, 290],
  c4: [480, 390],
  t1: [685, 120],
  t2: [685, 240],
  t3: [685, 360],
  w1: [890, 170],
  w2: [890, 310],
};

const EDGES: [NodeId, NodeId][] = [
  ["f", "p1"],
  ["f", "p2"],
  ["f", "p3"],
  ["p1", "c2"],
  ["p2", "c3"],
  ["p3", "c4"],
  ["c1", "t1"],
  ["c4", "t3"],
  ["t1", "w1"],
  ["t2", "w1"],
  ["t2", "w2"],
  ["t3", "w2"],
];

/** The pattern the platform looks for: compounds from two different plants reaching one target. */
const HIGHLIGHT: [NodeId, NodeId][] = [
  ["p1", "c1"],
  ["c1", "t2"],
  ["p2", "c3"],
  ["c3", "t2"],
];

const LIT = new Set<NodeId>(HIGHLIGHT.flat());

const stagger = (i: number) => ({ "--i": i }) as CSSProperties;

export function KnowledgeMap() {
  return (
    <figure data-reveal="map">
      <div tabIndex={0} role="group" aria-label="Knowledge graph sketch, scrollable" className="overflow-x-auto">
        <svg
          viewBox="0 0 960 440"
          role="img"
          aria-label="A sketch of a knowledge graph. A formulation connects to plants, plants to compounds, compounds to targets, and targets to pathways. Compounds from two different plants are highlighted where they reach the same target."
          className="w-full min-w-[640px]"
        >
          {COLUMNS.map((col, i) => (
            <text key={col.label} x={col.x} y="24" textAnchor="middle" style={stagger(i * 2)} className="map-fade fill-parchment/80 font-label text-[12px] tracking-[0.15em] uppercase">
              {col.label}
            </text>
          ))}

          {/* Draws left to right: the plain connections first, then the highlighted path, then its labels. */}
          <g stroke="currentColor" strokeWidth="1" className="text-parchment/30">
            {EDGES.map(([a, b], i) => (
              <line key={`${a}${b}`} className="map-line" pathLength={1} style={stagger(i)} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
            ))}
          </g>
          <g stroke="currentColor" strokeWidth="2" className="text-citron">
            {HIGHLIGHT.map(([a, b], i) => (
              <line key={`${a}${b}`} className="map-line" pathLength={1} style={stagger(12 + i * 3)} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} />
            ))}
          </g>

          {(Object.keys(NODES) as NodeId[]).map((id, i) => (
            <circle
              key={id}
              cx={NODES[id][0]}
              cy={NODES[id][1]}
              r={id === "t2" ? 11 : 8}
              style={stagger(i)}
              className={`map-fade ${LIT.has(id) ? "fill-citron" : "fill-forest stroke-parchment/60"}`}
            />
          ))}
          <g className="map-fade" style={stagger(24)}>
            <circle cx={NODES.t2[0]} cy={NODES.t2[1]} r="20" fill="none" stroke="currentColor" strokeWidth="1" className="animate-pulse text-citron" />
            <text x={NODES.t2[0]} y={NODES.t2[1] + 42} textAnchor="middle" className="fill-citron font-label text-[12px] tracking-[0.1em] uppercase">
              Shared target
            </text>
            <text x={NODES.c1[0]} y={NODES.c1[1] - 18} textAnchor="middle" className="fill-citron font-label text-[12px]">Compound A</text>
            <text x={NODES.c3[0]} y={NODES.c3[1] + 28} textAnchor="middle" className="fill-citron font-label text-[12px]">Compound B</text>
          </g>
        </svg>
      </div>
      <p className="mt-3 flex items-center gap-2 font-label text-[11px] tracking-[0.15em] text-citron uppercase sm:hidden">
        Swipe to see targets and pathways
        <ArrowRight className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />
      </p>
      <figcaption className="mt-4 font-label text-[11px] tracking-[0.15em] text-parchment/70 uppercase">
        Fig. 2: A sketch of the structure, not real data.
      </figcaption>
    </figure>
  );
}
