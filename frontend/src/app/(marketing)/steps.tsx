"use client";

import { useEffect, useRef, useState } from "react";
import { Kicker, RecordRow, reveal } from "./ui";

const STEPS = [
  {
    name: "Add a formula",
    summary: "Start from a scanned manuscript, or type a formulation in by hand.",
    provide: "A manuscript image or PDF, or the formulation's details.",
    system: "Reads the page using OCR and AI image understanding.",
    get: "The extracted text, ready for you to check.",
    where: "Manuscripts, Formulations",
  },
  {
    name: "Verify the plants",
    summary: "Old texts use old names. Each one is matched to a modern botanical name, and you have the final say.",
    provide: "Your corrections to any uncertain match.",
    system: "Matches traditional ingredient names to botanical names, and flags the ones it isn't sure about.",
    get: "A confirmed ingredient list.",
    where: "Manuscripts",
  },
  {
    name: "Explore the chemistry",
    summary: "See what is known about each plant: its compounds, their structures and what they act on.",
    provide: "A plant or compound you want to look at.",
    system: "Collects compounds, structures, biological targets and database references, where available.",
    get: "One record for each plant and compound, with links to the original databases.",
    where: "Plants",
  },
  {
    name: "Run an analysis",
    summary: "Compare compounds from different plants to find where they meet in the body's molecular machinery.",
    provide: "A formulation with confirmed ingredients.",
    system: "Looks for shared biological targets and pathways, then ranks the candidate relationships.",
    get: "Ranked candidates, plus a report of which data was missing.",
    where: "Formulations, History",
  },
  {
    name: "Inspect the evidence",
    summary: "Open any finding to see exactly what supports it, and how strong that support is.",
    provide: "A finding you want to check.",
    system: "Shows the relationship, its evidence category, its sources and its confidence.",
    get: "A claim you can trace back to its source, or decide not to trust.",
    where: "Findings, Graph",
  },
];

function pad(i: number) {
  return String(i + 1).padStart(2, "0");
}

function StepRecord({ step }: { step: (typeof STEPS)[number] }) {
  return (
    <dl className="border-t border-dotted border-citron/30">
      <RecordRow onDark label="You provide">{step.provide}</RecordRow>
      <RecordRow onDark label="The platform">{step.system}</RecordRow>
      <RecordRow onDark label="You get">{step.get}</RecordRow>
      <RecordRow onDark label="Open in">{step.where}</RecordRow>
    </dl>
  );
}

const heading = "Five steps, from old page to traceable evidence.";

/**
 * On wide screens the section stays pinned and scrolling moves through the steps.
 * Narrow screens get a plain list, which also serves screen readers on wide screens,
 * since the pinned version only shows one step at a time.
 */
export function Steps() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const el = track.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const progress = -rect.top / Math.max(rect.height - window.innerHeight, 1);
      setActive(Math.min(Math.max(Math.floor(progress * STEPS.length), 0), STEPS.length - 1));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  const step = STEPS[active];

  return (
    <section id="how-it-works" aria-labelledby="how-heading" className="scroll-mt-16 bg-forest text-parchment">
      <div className="px-4 py-20 sm:px-8 lg:sr-only">
        <Kicker number="02" tone="citron">How it works</Kicker>
        <h2 id="how-heading" data-reveal="heading" className="mt-4 font-display text-[clamp(36px,6vw,48px)] leading-[1.1]">{heading}</h2>
        <ol className="mt-12 space-y-14">
          {STEPS.map((s, i) => (
            <li key={s.name} {...reveal()}>
              <p aria-hidden className="font-display text-7xl leading-none text-citron">{pad(i)}</p>
              <h3 className="mt-3 font-display text-3xl">{s.name}</h3>
              <p className="mt-2 mb-5 text-[16px] leading-relaxed text-parchment/85">{s.summary}</p>
              <StepRecord step={s} />
            </li>
          ))}
        </ol>
      </div>

      <div ref={track} aria-hidden className="hidden lg:block" style={{ height: `${STEPS.length * 80}vh` }}>
        <div className="sticky top-0 flex h-svh min-h-[640px] flex-col overflow-hidden px-[60px] pt-24 pb-8">
          <div className="flex items-end justify-between gap-10">
            <div>
              <Kicker number="02" tone="citron">How it works</Kicker>
              <p data-reveal="heading" className="mt-3 font-display text-[clamp(28px,3vw,42px)] leading-tight">{heading}</p>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-2 items-center gap-16">
            <div key={step.name} className="animate-rise">
              <p className="font-display text-[min(26vh,16vw)] leading-[0.95] text-citron">{pad(active)}</p>
              <p className="mt-2 font-display text-[clamp(32px,4vw,52px)] leading-tight">{step.name}</p>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-parchment/85">{step.summary}</p>
            </div>
            <div key={`${step.name}-record`} className="animate-rise">
              <StepRecord step={step} />
            </div>
          </div>

          <ol className="grid grid-cols-5 gap-3">
            {STEPS.map((s, i) => (
              <li
                key={s.name}
                className={`relative border-t-2 border-parchment/20 pt-2 font-label text-[10px] tracking-[0.12em] uppercase transition-colors duration-500 ${
                  i === active ? "text-citron" : "text-parchment/60"
                }`}
              >
                {/* The line draws across as each step is reached, and retracts on the way back. */}
                <span
                  className={`absolute inset-x-0 -top-0.5 h-0.5 origin-left bg-citron transition-[scale] duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${
                    i <= active ? "scale-x-100" : "scale-x-0"
                  }`}
                />
                {pad(i)} {s.name}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
