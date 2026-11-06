"use client";

import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { reveal } from "./ui";

const Species = ({ children }: { children: ReactNode }) => <em className="font-serif italic">{children}</em>;

const TERMS: { term: string; plain: string; example: ReactNode; where: string }[] = [
  {
    term: "Polyherbal formulation",
    plain: "A traditional recipe that combines several plants, rather than using just one.",
    example: <>Trikatu, a formula of black pepper, long pepper and ginger.</>,
    where: "Formulations",
  },
  {
    term: "Manuscript OCR",
    plain: "Software that reads a scanned page and turns it into text you can review and correct.",
    example: <>A photo of an old page becomes text you can check against the original.</>,
    where: "Manuscripts",
  },
  {
    term: "Botanical identification",
    plain: "Working out which plant an ingredient name refers to, using its modern scientific name.",
    example: <>“Ginger” becomes <Species>Zingiber officinale</Species>.</>,
    where: "Manuscripts",
  },
  {
    term: "Phytochemical compound",
    plain: "A chemical made by a plant. One plant can contain many of them.",
    example: <>Piperine, found in black pepper (<Species>Piper nigrum</Species>).</>,
    where: "Plants, compound pages",
  },
  {
    term: "Biological target",
    plain: "A molecule in the body, usually a protein, that a compound can act on.",
    example: <>An enzyme or a receptor on the surface of a cell.</>,
    where: "Compound pages, Findings",
  },
  {
    term: "Pathway",
    plain: "A chain of molecular steps that carries out a job inside a cell. Targets are links in these chains.",
    example: <>A signalling pathway passes a message from the cell surface to its nucleus.</>,
    where: "Findings, Graph",
  },
  {
    term: "Molecular finding",
    plain: "A candidate link between compounds from different plants. It is a lead to investigate, not proof that they work together.",
    example: <>Compound A <ArrowRight aria-label="acts on" className="inline size-4 align-[-2px]" strokeWidth={1.5} /> Target <ArrowLeft aria-label="also acted on by" className="inline size-4 align-[-2px]" strokeWidth={1.5} /> Compound B.</>,
    where: "Findings",
  },
  {
    term: "Coverage",
    plain: "How much of a formulation the analysis actually had molecular data for. It tells you what the results can't speak to.",
    example: <>An ingredient with no compound data is listed as a gap, so it isn&apos;t silently ignored.</>,
    where: "Findings, History",
  },
  {
    term: "Knowledge graph",
    plain: "A map of how things connect. Each dot is a plant, compound or target, and each line is a relationship.",
    example: <>Follow a line from a formulation, through a plant and compound, to a target.</>,
    where: "Graph",
  },
];

export function Glossary() {
  const [open, setOpen] = useState<string | null>(TERMS[0].term);

  return (
    <ul className="border-t border-ochre/40">
      {TERMS.map((item, i) => {
        const expanded = open === item.term;
        return (
          <li key={item.term} {...reveal(i)} className="border-b border-ochre/40">
            <h3>
              <button
                type="button"
                onClick={() => setOpen(expanded ? null : item.term)}
                aria-expanded={expanded}
                className="group flex w-full cursor-pointer items-center justify-between gap-6 py-5 text-left"
              >
                <span className="relative inline-block font-serif text-[clamp(24px,3.4vw,40px)] leading-tight italic transition-colors group-hover:text-vermillion">
                  {item.term}
                  {/* Same timing as the box below, so the line and the box move together in both directions. */}
                  <span
                    aria-hidden
                    className={`absolute inset-x-0 -bottom-1 h-px origin-left bg-current transition-[scale] delay-100 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:delay-0 ${
                      expanded ? "scale-x-100" : "scale-x-0"
                    }`}
                  />
                </span>
                <Plus
                  aria-hidden
                  strokeWidth={1.5}
                  className={`size-5 shrink-0 text-ochre transition-[rotate] delay-100 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] ${expanded ? "rotate-45" : ""}`}
                />
              </button>
            </h3>
            {/* Stays in the page when closed so its height can animate. `inert` hides it from keyboards and screen readers. */}
            <div
              className={`grid transition-[grid-template-rows] delay-100 duration-700 ease-[cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:delay-0 ${
                expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div inert={!expanded} className="min-h-0 overflow-hidden">
                <dl
                  className={`grid gap-6 pb-8 transition-[opacity,translate] ease-out motion-reduce:delay-0 md:grid-cols-3 md:gap-10 ${
                    expanded ? "translate-y-0 opacity-100 delay-300 duration-500" : "translate-y-2 opacity-0 duration-200"
                  }`}
                >
                  <div>
                    <dt className="font-label text-[11px] tracking-[0.2em] text-ochre uppercase">In plain words</dt>
                    <dd className="mt-2 text-[16px] leading-relaxed">{item.plain}</dd>
                  </div>
                  <div>
                    <dt className="font-label text-[11px] tracking-[0.2em] text-ochre uppercase">For example</dt>
                    <dd className="mt-2 text-[16px] leading-relaxed">{item.example}</dd>
                  </div>
                  <div>
                    <dt className="font-label text-[11px] tracking-[0.2em] text-ochre uppercase">Where you&apos;ll see it</dt>
                    <dd className="mt-2 text-[16px] leading-relaxed">{item.where}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
