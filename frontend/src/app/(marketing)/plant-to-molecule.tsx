"use client";

import { useEffect, useRef, type CSSProperties } from "react";

/** A six-sided ring with its points at the top and bottom. */
function hexagon(cx: number, cy: number, r: number) {
  const points = Array.from({ length: 6 }, (_, i) => {
    const angle = ((-90 + 60 * i) * Math.PI) / 180;
    return `${(cx + r * Math.cos(angle)).toFixed(1)} ${(cy + r * Math.sin(angle)).toFixed(1)}`;
  });
  return `M${points.join("L")}Z`;
}

const LINES = [
  // Stem, then a leaf and its centre line, three times over.
  "M210 600C205 480 220 360 210 230",
  "M208 500C150 490 100 440 80 390C140 395 195 440 208 500Z",
  "M208 500C160 465 120 425 80 390",
  "M213 420C270 410 325 360 345 305C285 312 225 355 213 420Z",
  "M213 420C260 385 305 345 345 305",
  "M212 330C165 320 125 285 105 240C155 245 200 280 212 330Z",
  "M212 330C175 300 140 270 105 240",
  // Molecule: two joined rings and their bonds.
  "M210 230V207",
  hexagon(210, 165, 42),
  hexagon(282.75, 165, 42),
  "M173.6 144L140 124",
  "M210 123V88",
  "M319.1 144L352 124",
];

const ATOMS = [
  [140, 124],
  [210, 88],
  [352, 124],
];

const drawn = { strokeDashoffset: "calc(1 - var(--draw))" } as CSSProperties;
const atomsIn = { opacity: "calc((var(--draw) - 0.85) * 7)" } as CSSProperties;

/** Draws itself while the section scrolls by. On phones, or with reduced motion, it is simply shown whole. */
export function PlantToMolecule() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const figure = ref.current;
    const section = figure?.closest("section");
    if (!figure || !section) return;
    if (!window.matchMedia("(min-width: 1024px) and (prefers-reduced-motion: no-preference)").matches) return;

    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = section.getBoundingClientRect();
      const height = window.innerHeight;
      const progress = (height * 0.7 - rect.top) / Math.max(rect.height - height * 0.3, 1);
      figure.style.setProperty("--draw", String(Math.min(Math.max(progress, 0), 1)));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <figure ref={ref} style={{ "--draw": 1 } as CSSProperties}>
      <svg viewBox="40 60 340 560" role="img" aria-label="A plant drawn in line, whose stem ends in a molecular ring structure" className="mx-auto h-[min(68vh,560px)] w-auto max-w-full">
        <g fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-forest">
          {LINES.map((d) => (
            <path key={d} d={d} pathLength={1} strokeDasharray="1" style={drawn} />
          ))}
        </g>
        <g className="fill-vermillion" style={atomsIn}>
          {ATOMS.map(([cx, cy]) => (
            <circle key={cx} cx={cx} cy={cy} r="7" />
          ))}
        </g>
      </svg>
      <figcaption className="mt-3 text-center font-label text-[11px] tracking-[0.15em] text-ochre uppercase">
        Fig. 1: From plant to molecule. A sketch, not a real structure.
      </figcaption>
    </figure>
  );
}
