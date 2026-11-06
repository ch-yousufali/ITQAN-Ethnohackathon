import { ArrowDown, ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

/** Props that ease an element in on scroll. `i` staggers it after its neighbours. */
export function reveal(i = 0) {
  return { "data-reveal": "", style: { "--i": i } as CSSProperties };
}

/** The classes for a link whose underline draws from left to right on hover. */
export const drawnUnderline =
  "relative after:absolute after:inset-x-0 after:-bottom-1 after:h-px after:origin-left after:scale-x-0 after:bg-current after:transition-[scale] after:duration-500 after:ease-[cubic-bezier(0.2,0.8,0.2,1)] hover:after:scale-x-100";

/** An icon, not a text character: fonts place arrow characters at their own height, off-centre from capitals. */
export function LinkArrow({ down = false }: { down?: boolean }) {
  const Icon = down ? ArrowDown : ArrowRight;
  return <Icon className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />;
}

/** Small uppercase label above a heading. `number` gives each section its place in the page. */
export function Kicker({ number, children, tone = "vermillion" }: { number?: string; children: ReactNode; tone?: "vermillion" | "citron" }) {
  return (
    <p data-reveal="" className={`font-label text-[11px] tracking-[0.25em] uppercase ${tone === "citron" ? "text-citron" : "text-vermillion"}`}>
      {number && <span className="mr-3">{number}</span>}
      {children}
    </p>
  );
}

export function PrimaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2.5 bg-citron px-6 py-3 font-label text-[11px] tracking-[0.2em] text-ink uppercase transition-[background-color,scale] duration-300 hover:bg-citron-dark active:scale-[0.98]"
    >
      {children}
      <LinkArrow />
    </Link>
  );
}

/** Text link. `onDark` is for forest backgrounds. */
export function TextLink({ href, children, onDark = false, arrow }: { href: string; children: ReactNode; onDark?: boolean; arrow?: "right" | "down" }) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 border-b pb-0.5 font-label text-[11px] tracking-[0.2em] uppercase transition-colors duration-300 ${
        onDark
          ? "border-parchment/50 text-parchment hover:border-citron hover:text-citron"
          : "border-forest text-forest hover:border-vermillion hover:text-vermillion"
      }`}
    >
      {children}
      {arrow && <LinkArrow down={arrow === "down"} />}
    </Link>
  );
}

/** A label and value on one dotted row, as in a specimen record. */
export function RecordRow({ label, children, onDark = false }: { label: string; children: ReactNode; onDark?: boolean }) {
  return (
    <div className={`grid items-baseline gap-1 border-b border-dotted py-3 sm:grid-cols-[9rem_1fr] sm:gap-4 ${onDark ? "border-citron/30" : "border-ochre/40"}`}>
      <dt className={`font-label text-[11px] tracking-[0.15em] uppercase ${onDark ? "text-citron" : "text-ochre"}`}>{label}</dt>
      <dd className={`text-[15px] leading-relaxed ${onDark ? "text-parchment" : "text-ink"}`}>{children}</dd>
    </div>
  );
}
