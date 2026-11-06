"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useState, type ReactNode } from "react";
import { drawnUnderline } from "@/app/(marketing)/ui";
import { IS_DEMO } from "@/lib/api/http";
import { BackButton } from "./back-button";
import { Logo } from "./logo";
import { SiteFooter } from "./site-footer";

/** These pages bring their own header and footer, from (marketing)/layout.tsx. */
const MARKETING_PATHS = ["/", "/about"];

const linkClass = "font-label text-[11px] tracking-[0.2em] uppercase";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/formulations", label: "Formulations" },
  { href: "/manuscripts", label: "Manuscripts" },
  { href: "/plants", label: "Plants" },
  { href: "/findings", label: "Findings" },
  { href: "/graph", label: "Graph" },
  { href: "/analyses", label: "History" },
];

function isCurrent(pathname: string, href: string) {
  return pathname.startsWith(href);
}

export function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  // Tied to the path, so navigating closes the mobile menu without an effect.
  const open = openFor === pathname;

  if (MARKETING_PATHS.includes(pathname)) return children;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 bg-forest [&_:focus-visible]:outline-citron">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-[60px]">
          <Logo />

          <nav aria-label="Main" className="hidden items-center gap-6 lg:flex xl:gap-8">
            {NAV.map((item) => {
              const current = isCurrent(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "page" : undefined}
                  className={`py-1.5 ${linkClass} ${drawnUnderline} ${current ? "text-citron after:scale-x-100" : "text-parchment hover:text-citron"}`}
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
            className="cursor-pointer py-2 font-label text-[10px] tracking-[0.08em] text-parchment uppercase sm:text-[11px] sm:tracking-[0.2em] lg:hidden"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>

        <div
          className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:hidden ${
            open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
          }`}
        >
          <div inert={!open} className="min-h-0 overflow-hidden">
            <nav id="mobile-nav" aria-label="Main" className="border-t border-parchment/15 px-4 py-2 sm:px-8">
              {NAV.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                  className={`block py-3 ${linkClass} ${isCurrent(pathname, item.href) ? "text-citron" : "text-parchment"}`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {IS_DEMO && (
        <aside aria-label="Demo mode notice" className="border-b border-warn-line bg-warn-soft px-4 py-2 text-[13px] text-warn sm:px-8 lg:px-[60px]">
          <strong className="font-medium">Demo mode.</strong> No backend is connected. Everything shown is
          fictional sample data, not scientific results.
        </aside>
      )}

      <main className="w-full flex-1 px-4 py-8 sm:px-8 sm:py-12 lg:px-[60px]">
        {/* Its own boundary, because reading the URL's query must not suspend the whole shell. */}
        <Suspense fallback={null}>
          <BackButton />
        </Suspense>
        {/* A new key on each route replays the entrance. */}
        <div key={pathname} className="animate-page-in">
          {children}
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
