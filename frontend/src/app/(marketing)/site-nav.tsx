"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { LinkArrow, drawnUnderline } from "./ui";

const LINKS = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#glossary", label: "Glossary" },
  { href: "/#evidence", label: "Evidence" },
  { href: "/about", label: "About" },
];

const linkClass = "font-label text-[11px] tracking-[0.2em] text-parchment uppercase transition-colors hover:text-citron";

export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 backdrop-blur-sm transition-colors duration-300 [&_:focus-visible]:outline-citron ${
        scrolled || open ? "bg-forest" : "bg-forest/85"
      }`}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-[60px]">
        <Logo />

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {LINKS.map((link) => (
            <Link key={link.href} href={link.href} className={`${linkClass} ${drawnUnderline}`}>
              {link.label}
            </Link>
          ))}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-citron px-4 py-2 font-label text-[11px] tracking-[0.2em] text-ink uppercase transition-colors hover:bg-citron-dark"
          >
            Dashboard
            <LinkArrow />
          </Link>
        </nav>

        <div className="flex items-center gap-3 lg:hidden">
          <Link
            href="/dashboard"
            className="bg-citron px-2.5 py-2 font-label text-[10px] tracking-[0.08em] whitespace-nowrap text-ink uppercase sm:px-3 sm:text-[11px] sm:tracking-[0.15em]"
          >
            Dashboard
          </Link>
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            aria-controls="site-menu"
            className="cursor-pointer py-2 font-label text-[10px] tracking-[0.08em] text-parchment uppercase sm:text-[11px] sm:tracking-[0.2em]"
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)] lg:hidden ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div inert={!open} className="min-h-0 overflow-hidden">
          <nav id="site-menu" aria-label="Main" className="border-t border-parchment/15 px-4 py-2 sm:px-8">
            {LINKS.map((link) => (
              <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className={`${linkClass} block py-3`}>
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
