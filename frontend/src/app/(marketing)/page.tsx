import Link from "next/link";
import { EVIDENCE_META, EvidenceGlyph } from "@/components/evidence";
import type { EvidenceCategory } from "@/lib/api/schemas";
import { Glossary } from "./glossary";
import { KnowledgeMap } from "./knowledge-map";
import { PlantToMolecule } from "./plant-to-molecule";
import { Steps } from "./steps";
import { Kicker, LinkArrow, PrimaryLink, TextLink, reveal } from "./ui";

const titleSize = "font-display text-[clamp(60px,7.5vw,110px)] leading-[1.02]";

const COMMITMENTS = [
  { value: "4", text: "evidence categories, each clearly labelled" },
  { value: "1+", text: "traceable source behind every finding" },
  { value: "0", text: "predictions presented as proven" },
];

const EVIDENCE_PLAIN: Record<EvidenceCategory, { means: string; read: string }> = {
  MEASURED: { means: "Someone tested this in an experiment.", read: "The strongest kind of evidence here." },
  CURATED: { means: "A curated scientific database records this.", read: "Follow the reference to see the original source." },
  INFERRED: { means: "Worked out indirectly from other data.", read: "A reasoned lead. Nobody tested it directly." },
  PREDICTED: { means: "A computer model suggests this.", read: "An idea to test. Not experimentally verified." },
};

const SCREENS = [
  { href: "/formulations", name: "Formulations", text: "Browse, search, create and edit traditional formulas, filtered by tradition and period." },
  { href: "/manuscripts", name: "Manuscripts", text: "Upload a scanned page, review the extracted text and correct the plant names." },
  { href: "/plants", name: "Plants & compounds", text: "See each plant's compounds, chemical structures, targets and database references." },
  { href: "/findings", name: "Findings", text: "Compare ranked candidate relationships, filtered by evidence and interaction type." },
  { href: "/graph", name: "Knowledge graph", text: "Search, zoom and click through the connections from formula to pathway." },
  { href: "/analyses", name: "History", text: "Reopen past analyses and check their status, date, coverage and findings count." },
];

export default function LandingPage() {
  return (
    <>
      {/* Hero: two panels meeting at a seam, with the title running across it. */}
      <section className="relative overflow-hidden lg:h-svh lg:min-h-[720px] [&_:focus-visible]:outline-offset-4">
        <div className="grid lg:h-full lg:grid-cols-2">
          <div className="flex animate-wipe-left flex-col justify-between gap-10 bg-forest px-4 pt-28 pb-12 text-parchment sm:px-8 lg:px-[60px] lg:pb-14 [&_:focus-visible]:outline-citron">
            <Kicker tone="citron">The historical record</Kicker>
            <h1 className={`${titleSize} lg:hidden`}>Ancient formulas, modern molecules.</h1>
            <div>
              <p className="max-w-md text-[17px] leading-relaxed">
                EthnoSynergy AI is a research platform that links traditional multi-herb formulas to modern molecular
                science.
              </p>
              <div className="mt-6 flex min-h-11 flex-wrap items-center gap-6">
                <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
                <TextLink onDark arrow="down" href="#how-it-works">How it works</TextLink>
              </div>
            </div>
          </div>

          <div className="flex animate-wipe-right flex-col justify-between gap-10 bg-parchment px-4 pt-12 pb-12 sm:px-8 lg:px-[60px] lg:pt-28 lg:pb-14">
            <Kicker>The molecular record</Kicker>
            <div>
              <p className="max-w-md text-[17px] leading-relaxed">
                It shows which plant compounds may act on the same biological targets, and how strong the evidence is
                for each link.
              </p>
              <p className="mt-6 flex min-h-11 items-center font-label text-[11px] leading-relaxed tracking-[0.15em] text-ochre uppercase">
                For research use only. Not medical advice.
              </p>
            </div>
          </div>
        </div>

        {/* Two copies of the title, each clipped to its own panel so the colour flips at the seam. */}
        <div className="pointer-events-none absolute inset-0 hidden items-center lg:flex">
          <div className="relative w-full animate-title-in text-center">
            <h1 className={`${titleSize} text-parchment [clip-path:inset(-20%_50%_-20%_0)]`}>
              Ancient formulas,
              <br />
              modern molecules.
            </h1>
            <p aria-hidden className={`${titleSize} absolute inset-0 text-ink [clip-path:inset(-20%_0_-20%_50%)]`}>
              Ancient formulas,
              <br />
              modern molecules.
            </p>
          </div>
        </div>
      </section>

      {/* 01 The problem */}
      <section aria-labelledby="problem-heading" className="bg-cream px-4 py-20 sm:px-8 lg:px-[60px] lg:py-28">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.2fr] lg:gap-20">
          <div {...reveal()} className="lg:sticky lg:top-24 lg:self-start">
            <PlantToMolecule />
          </div>
          <div>
            <Kicker number="01">The problem</Kicker>
            <h2 id="problem-heading" data-reveal="heading" className="mt-4 font-display text-[clamp(40px,5.5vw,76px)] leading-[1.05]">
              An old recipe names plants. It doesn&apos;t name molecules.
            </h2>
            <p {...reveal(1)} className="mt-8 max-w-xl text-[17px] leading-relaxed first-letter:float-left first-letter:mr-3 first-letter:font-display first-letter:text-[72px] first-letter:leading-[0.85] first-letter:text-vermillion">
              Traditional medicine systems recorded recipes that combine several plants. Today, those recipes are
              scattered across old manuscripts, and what we know about each plant&apos;s chemistry sits in separate
              scientific databases. Connecting the two by hand is slow, and it&apos;s easy to lose track of what is
              actually known and what is only a guess.
            </p>
            <p {...reveal(2)} className="mt-5 max-w-xl text-[17px] leading-relaxed">
              EthnoSynergy AI brings them together. It helps a researcher go from a page in a manuscript to the
              compounds in each plant, then to the places where compounds from different plants may meet.
            </p>
            <blockquote {...reveal(1)} className="mt-10 max-w-xl border-l-[3px] border-vermillion pl-6 font-serif text-[clamp(24px,3vw,34px)] leading-snug italic">
              We don&apos;t claim that these formulas work. We show what the evidence does and doesn&apos;t say, so
              researchers can decide what to investigate next.
            </blockquote>
            <dl className="mt-14 grid gap-8 sm:grid-cols-3">
              {COMMITMENTS.map((item, i) => (
                <div key={item.text} {...reveal(i)} className="border-t border-ochre/40 pt-4">
                  <dt className="font-display text-7xl leading-none text-forest">{item.value}</dt>
                  <dd className="mt-3 text-[15px] leading-snug">{item.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <Steps />

      {/* 03 Glossary */}
      <section id="glossary" aria-labelledby="glossary-heading" className="scroll-mt-16 px-4 py-20 sm:px-8 lg:px-[60px] lg:py-28">
        <Kicker number="03">Glossary</Kicker>
        <h2 id="glossary-heading" data-reveal="heading" className="mt-4 mb-4 font-display text-[clamp(40px,5.5vw,76px)] leading-[1.05]">
          What these things actually are.
        </h2>
        <p {...reveal(1)} className="mb-12 max-w-xl text-[17px] leading-relaxed">
          You don&apos;t need to be a pharmacologist to follow along. Here is every term the platform uses, in plain
          words.
        </p>
        <Glossary />
      </section>

      {/* 04 Evidence */}
      <section id="evidence" aria-labelledby="evidence-heading" className="scroll-mt-16 bg-cream px-4 py-20 sm:px-8 lg:px-[60px] lg:py-28">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker number="04">Evidence</Kicker>
            <h2 id="evidence-heading" data-reveal="heading" className="mt-4 font-display text-[clamp(40px,5.5vw,76px)] leading-[1.05]">
              Not all evidence is equal, so we label it.
            </h2>
          </div>
          <p {...reveal(1)} className="max-w-xl text-[17px] leading-relaxed lg:mt-[33px]">
            Every piece of evidence belongs to one of four categories. A finding is only as strong as its weakest
            evidence, so it takes that category as its label. A finding with an unsourced item isn&apos;t shown at all.
          </p>
        </div>

        {/* A table on wide screens. On phones each row stacks, so nothing needs sideways scrolling. */}
        <div className="mt-14">
          <table className="w-full border-collapse text-left max-md:block">
            <thead {...reveal()} className="max-md:sr-only">
              <tr className="border-b border-ochre font-label text-[11px] tracking-[0.2em] text-ochre uppercase">
                <th scope="col" className="py-3 pr-6 font-normal">Category</th>
                <th scope="col" className="py-3 pr-6 font-normal">What it means</th>
                <th scope="col" className="py-3 font-normal">How to read it</th>
              </tr>
            </thead>
            <tbody className="max-md:block">
              {(Object.keys(EVIDENCE_META) as EvidenceCategory[]).map((category, i) => {
                const meta = EVIDENCE_META[category];
                return (
                  <tr key={category} {...reveal(i)} className="border-b border-dotted border-ochre/50 align-baseline max-md:block max-md:py-5">
                    <th scope="row" className={`py-5 pr-6 font-normal max-md:block max-md:p-0 ${meta.text}`}>
                      <span className="flex items-center gap-2.5 font-display text-3xl">
                        <EvidenceGlyph category={category} />
                        {meta.label}
                      </span>
                    </th>
                    <td className="py-5 pr-6 text-[16px] leading-relaxed max-md:block max-md:p-0 max-md:pt-2">{EVIDENCE_PLAIN[category].means}</td>
                    <td className="py-5 text-[16px] leading-relaxed max-md:block max-md:p-0 max-md:pt-1 max-md:text-[15px]">{EVIDENCE_PLAIN[category].read}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* 05 Knowledge graph */}
      <section aria-labelledby="graph-heading" className="bg-forest px-4 py-20 text-parchment sm:px-8 lg:px-[60px] lg:py-28 [&_:focus-visible]:outline-citron">
        <div className="grid gap-6 lg:grid-cols-2 lg:gap-20">
          <div>
            <Kicker number="05" tone="citron">Knowledge graph</Kicker>
            <h2 id="graph-heading" data-reveal="heading" className="mt-4 font-display text-[clamp(40px,5.5vw,76px)] leading-[1.05]">
              See the whole formula at once.
            </h2>
          </div>
          <div {...reveal(1)} className="max-w-xl lg:mt-[33px]">
            <p className="text-[17px] leading-relaxed">
              The graph connects formulations, plants, compounds, targets and pathways in one picture. When compounds
              from two different plants reach the same target, that&apos;s a candidate worth a closer look.
            </p>
            <div className="mt-6">
              <TextLink onDark arrow="right" href="/graph">Open the graph</TextLink>
            </div>
          </div>
        </div>
        <div className="mt-14">
          <KnowledgeMap />
        </div>
      </section>

      {/* 06 What's inside */}
      <section aria-labelledby="inside-heading" className="px-4 py-20 sm:px-8 lg:px-[60px] lg:py-28">
        <Kicker number="06">What&apos;s inside</Kicker>
        <h2 id="inside-heading" data-reveal="heading" className="mt-4 mb-12 font-display text-[clamp(40px,5.5vw,76px)] leading-[1.05]">
          One place for the whole research journey.
        </h2>
        <ul className="grid gap-px border border-ochre/40 bg-ochre/40 sm:grid-cols-2 lg:grid-cols-3">
          {SCREENS.map((screen, i) => (
            <li key={screen.href} {...reveal(i)} className="bg-parchment">
              <Link href={screen.href} className="group flex h-full flex-col p-7 transition-colors duration-500 hover:bg-cream">
                <span className="font-display text-3xl">{screen.name}</span>
                <span className="mt-3 flex-1 text-[15px] leading-relaxed">{screen.text}</span>
                <span className="mt-6 inline-flex items-center gap-2 font-label text-[11px] tracking-[0.2em] text-vermillion uppercase transition-[translate] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] group-hover:translate-x-1.5">Open <LinkArrow /></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* Closing call to action */}
      <section aria-labelledby="start-heading" className="bg-cream px-4 py-20 text-center sm:px-8 lg:py-28">
        <h2 id="start-heading" data-reveal="heading" className="mx-auto max-w-4xl font-display text-[clamp(40px,6vw,84px)] leading-[1.05]">
          Start with the research.
        </h2>
        <p {...reveal(1)} className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed">
          The dashboard is your starting point for formulations, manuscripts, analyses and findings.
        </p>
        <div {...reveal(2)} className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
          <TextLink href="/about">About the project</TextLink>
        </div>
      </section>
    </>
  );
}
