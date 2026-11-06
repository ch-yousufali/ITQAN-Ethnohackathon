"use client";

import { useEffect, useRef, useState } from "react";

/** Renders a 2D structure from SMILES. Never invents one: unparseable input shows a notice. */
export function Structure({ smiles, name }: { smiles: string | null; name: string }) {
  const svg = useRef<SVGSVGElement>(null);
  const [failedFor, setFailedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!smiles) return;
    let cancelled = false;
    const fail = () => {
      if (!cancelled) setFailedFor(smiles);
    };
    import("smiles-drawer")
      .then(({ default: SmilesDrawer }) => {
        if (cancelled || !svg.current) return;
        const drawer = new SmilesDrawer.SvgDrawer({ width: 240, height: 180 });
        SmilesDrawer.parse(
          smiles,
          (tree: unknown) => {
            if (!cancelled && svg.current) drawer.draw(tree, svg.current, "light");
          },
          fail,
        );
      })
      .catch(fail);
    return () => {
      cancelled = true;
    };
  }, [smiles]);

  if (!smiles || failedFor === smiles) {
    return (
      <div className="grid h-44 w-full place-items-center rounded-lg border border-dashed border-line-strong px-4 text-center text-[13px] text-muted sm:w-60">
        {smiles ? "Structure could not be rendered" : "Structure not available"}
      </div>
    );
  }
  return (
    <figure className="w-full sm:w-60">
      <svg ref={svg} role="img" aria-label={`2D structure of ${name}`} className="h-44 w-full rounded-lg border border-line bg-surface" />
    </figure>
  );
}
