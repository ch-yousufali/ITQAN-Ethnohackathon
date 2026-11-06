import Link from "next/link";
import { IS_DEMO } from "@/lib/api/http";
import { drawnUnderline, reveal } from "@/app/(marketing)/ui";

const COLUMNS = [
  {
    title: "Learn",
    links: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#glossary", label: "Glossary" },
      { href: "/#evidence", label: "Evidence" },
      { href: "/about", label: "About" },
    ],
  },
  {
    title: "Research",
    links: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/formulations", label: "Formulations" },
      { href: "/manuscripts", label: "Manuscripts" },
      { href: "/plants", label: "Plants" },
    ],
  },
  {
    title: "Results",
    links: [
      { href: "/findings", label: "Findings" },
      { href: "/graph", label: "Graph" },
      { href: "/analyses", label: "History" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="bg-forest px-4 pt-16 pb-8 text-parchment sm:px-8 lg:px-[60px] [&_:focus-visible]:outline-citron">
      <div className="grid gap-10 sm:grid-cols-3 lg:grid-cols-[2fr_1fr_1fr_1fr]">
        <div {...reveal()} className="sm:col-span-3 lg:col-span-1">
          <p className="font-display text-[clamp(36px,4.5vw,64px)] leading-none">EthnoSynergy AI</p>
          <p className="mt-4 max-w-sm text-[15px] leading-relaxed text-parchment/80">
            Linking ancient herbal formulas to modern molecular science.
          </p>
        </div>
        {COLUMNS.map((column, i) => (
          <div key={column.title} {...reveal(i + 1)}>
            <h2 className="font-label text-[11px] tracking-[0.25em] text-citron uppercase">{column.title}</h2>
            <ul className="mt-4 space-y-2.5">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className={`inline-block text-[15px] text-parchment/85 hover:text-citron ${drawnUnderline}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div data-reveal="line" className="mt-14 h-px origin-left bg-parchment/15" />
      <div {...reveal(1)} className="space-y-2 pt-6 text-[13px] leading-relaxed text-parchment/70">
        <p>
          For research use only. Molecular relationships shown here are candidates for investigation. They do not
          establish synergy, efficacy or safety, and are not medical advice.
        </p>
        {IS_DEMO && <p>This build runs in demo mode, so the research pages show fictional sample data.</p>}
      </div>
    </footer>
  );
}
