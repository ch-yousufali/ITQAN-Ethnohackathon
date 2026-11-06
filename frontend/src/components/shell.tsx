"use client";

import { Menu, Sprout, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { IS_DEMO } from "@/lib/api/http";
import { BackButton } from "./back-button";

const NAV = [
  { href: "/", label: "Overview" },
  { href: "/formulations", label: "Formulations" },
  { href: "/manuscripts", label: "Manuscripts" },
  { href: "/plants", label: "Plants" },
  { href: "/findings", label: "Findings" },
  { href: "/graph", label: "Graph" },
  { href: "/analyses", label: "History" },
];

function isCurrent(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  // Tied to the path, so navigating closes the mobile menu without an effect.
  const open = openFor === pathname;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-paper/95 backdrop-blur-sm">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
            <span className="grid size-7 place-items-center rounded-lg bg-leaf text-white">
              <Sprout className="size-4" aria-hidden />
            </span>
            EthnoSynergy AI
          </Link>

          <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
            {NAV.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`rounded-lg px-3 py-2 text-sm transition-colors ${
                    current ? "bg-leaf-soft font-medium text-leaf-dark" : "text-body hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            type="button"
            onClick={() => setOpenFor(open ? null : pathname)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid size-10 place-items-center rounded-lg text-body hover:bg-subtle lg:hidden"
          >
            {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>
        </div>

        {open && (
          <nav id="mobile-nav" aria-label="Main" className="border-t border-line px-4 py-2 lg:hidden">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                className={`block rounded-lg px-3 py-2.5 text-sm ${
                  isCurrent(pathname, item.href) ? "bg-leaf-soft font-medium text-leaf-dark" : "text-body"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {IS_DEMO && (
        <aside aria-label="Demo mode notice" className="border-b border-warn-line bg-warn-soft px-4 py-2 text-center text-[13px] text-warn sm:px-8">
          <strong className="font-semibold">Demo mode.</strong> No backend is connected. Everything shown is
          fictional sample data, not scientific results.
        </aside>
      )}

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-8 sm:py-12">
        {/* Its own boundary, because reading the URL's query must not suspend the whole shell. */}
        <Suspense fallback={null}>
          <BackButton />
        </Suspense>
        {children}
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-6 text-[13px] leading-relaxed text-muted sm:px-8">
          For research use only. Molecular relationships shown here are candidates for investigation. They do
          not establish synergy, efficacy or safety, and are not medical advice.
        </div>
      </footer>
    </div>
  );
}
