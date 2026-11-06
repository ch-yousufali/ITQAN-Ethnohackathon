import type { Metadata } from "next";
import { IS_DEMO } from "@/lib/api/http";
import { Kicker, PrimaryLink, TextLink, reveal } from "../ui";

export const metadata: Metadata = {
  title: "About",
  description: "Why EthnoSynergy AI exists, who it is for, and the rules it follows.",
};

const RULES = [
  { title: "Every finding has a source", text: "If a claim can't be traced to where it came from, we don't show it." },
  { title: "Evidence is labelled", text: "Measured, Curated, Inferred and Predicted evidence are always kept visibly apart." },
  { title: "Gaps are disclosed", text: "Missing molecular data and analysis coverage are shown, not hidden." },
  { title: "Predictions aren't proof", text: "A computational prediction is never presented as experimentally proven synergy." },
  { title: "No medical claims", text: "We make no unsupported claims about efficacy or treatment." },
  { title: "People review uncertainty", text: "Researchers can review and correct uncertain OCR and plant identifications." },
  { title: "Data is never made up", text: "We don't fabricate scientific data, and we clearly mark sample data as sample data." },
];

const heading = "font-display text-[clamp(36px,4.5vw,60px)] leading-[1.08]";
const body = "text-[17px] leading-relaxed";

function Numbered({ number, kicker, title, children }: { number: string; kicker: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <div data-reveal="line" className="h-px origin-left bg-ochre/40" />
      <div className="grid gap-6 py-16 lg:grid-cols-2 lg:gap-20 lg:py-24">
        <div>
          <Kicker number={number}>{kicker}</Kicker>
          <h2 data-reveal="heading" className={`mt-4 ${heading}`}>{title}</h2>
        </div>
        <div {...reveal(1)} className="max-w-xl space-y-5 lg:mt-[33px]">{children}</div>
      </div>
    </section>
  );
}

export default function AboutPage() {
  return (
    <>
      <section className="bg-forest px-4 pt-32 pb-20 text-parchment sm:px-8 lg:px-[60px] lg:pt-40 lg:pb-28">
        <Kicker tone="citron">About</Kicker>
        <h1 data-reveal="heading" className="mt-5 max-w-5xl font-display text-[clamp(52px,7.5vw,110px)] leading-[1.02]">
          Old knowledge deserves careful evidence.
        </h1>
        <p {...reveal(2)} className="mt-8 max-w-2xl text-[18px] leading-relaxed text-parchment/90">
          EthnoSynergy AI is a research platform that links ancient herbal formulas to modern molecular science. It
          shows which plant compounds may work together, and how strong the evidence is.
        </p>
      </section>

      <div className="px-4 sm:px-8 lg:px-[60px]">
        <Numbered number="01" kicker="Why it exists" title="Two records that rarely meet.">
          <p className={body}>
            Traditional formulas combine several plants, and they often survive only in old manuscripts. Modern
            knowledge about plant compounds lives in scientific databases. A researcher who wants to connect the two
            has to do it by hand, one plant at a time.
          </p>
          <p className={body}>
            We built one place for that journey, so the question of why a formula combines certain plants can be
            explored with evidence you can check.
          </p>
        </Numbered>

        <Numbered number="02" kicker="Who it's for" title="Researchers asking “why these plants together?”">
          <p className={body}>
            It&apos;s for researchers studying traditional formulations and the molecules behind them. They can upload
            a formulation, verify its ingredients, explore its molecular relationships and inspect the evidence, all in
            one application.
          </p>
        </Numbered>

        <section>
          <div data-reveal="line" className="h-px origin-left bg-ochre/40" />
          <div className="pt-16 lg:pt-24" />
          <Kicker number="03">Our rules</Kicker>
          <h2 data-reveal="heading" className={`mt-4 mb-12 max-w-4xl ${heading}`}>Seven rules the platform doesn&apos;t bend.</h2>
          <ol className="grid gap-x-16 md:grid-cols-2">
            {RULES.map((rule, i) => (
              <li key={rule.title} {...reveal(i % 2)} className="flex items-baseline gap-5 border-b border-dotted border-ochre/50 py-5">
                <span aria-hidden className="font-display text-3xl leading-none text-vermillion">{i + 1}</span>
                <div>
                  <h3 className="font-display text-2xl leading-tight">{rule.title}</h3>
                  <p className="mt-1.5 text-[16px] leading-relaxed">{rule.text}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="pb-16 lg:pb-24" />
        </section>

        <Numbered number="04" kicker="What it isn't" title="Not medical advice, and not proof.">
          <p className={body}>
            The relationships shown here are candidates for investigation. They don&apos;t establish synergy, efficacy
            or safety. Please don&apos;t use anything on this platform to make decisions about treatment.
          </p>
        </Numbered>

        {IS_DEMO && (
          <Numbered number="05" kicker="Where it stands" title="This build runs on sample data.">
            <p className={body}>
              No research backend is connected yet, so everything in the dashboard is fictional sample data, not
              scientific results. It&apos;s there to show how the platform works.
            </p>
          </Numbered>
        )}
      </div>

      <section className="bg-cream px-4 py-20 text-center sm:px-8 lg:py-28">
        <h2 data-reveal="heading" className="mx-auto max-w-4xl font-display text-[clamp(40px,6vw,84px)] leading-[1.05]">See it for yourself.</h2>
        <div {...reveal(1)} className="mt-8 flex flex-wrap items-center justify-center gap-6">
          <PrimaryLink href="/dashboard">Open dashboard</PrimaryLink>
          <TextLink href="/#how-it-works">How it works</TextLink>
        </div>
      </section>
    </>
  );
}
