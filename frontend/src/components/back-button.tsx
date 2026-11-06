"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

const SECTIONS: Record<string, { list: string; item: string }> = {
  dashboard: { list: "Dashboard", item: "Dashboard" },
  formulations: { list: "Formulations", item: "Formulation" },
  manuscripts: { list: "Manuscripts", item: "Manuscript" },
  plants: { list: "Plants", item: "Plant" },
  compounds: { list: "Plants", item: "Compound" },
  findings: { list: "Findings", item: "Finding" },
  graph: { list: "Graph", item: "Graph" },
  analyses: { list: "History", item: "History" },
};

function labelFor(url: string) {
  const [section, id, action] = url.split("?")[0].split("/").filter(Boolean);
  if (!section) return "Home";
  const names = SECTIONS[section];
  if (!names) return "Previous page";
  if (id === "new") return "New formulation";
  if (action === "edit") return "Edit formulation";
  return id ? names.item : names.list;
}

/** Where to go when this page was opened directly, so there is no previous page in the app. */
function parentOf(pathname: string) {
  if (pathname.startsWith("/compounds/")) return "/plants";
  return pathname.slice(0, pathname.lastIndexOf("/")) || "/dashboard";
}

/**
 * Returns to the page the user actually came from. A page opened directly, such
 * as from a shared link, links to its parent instead. The dashboard has no
 * parent, so it shows nothing until the user has somewhere to return to.
 */
export function BackButton() {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const url = query ? `${pathname}?${query}` : pathname;

  const [nav, setNav] = useState({ stack: [url], popped: false });

  // Fires for this button and for the browser's own back and forward buttons.
  // Next can render the new URL before this event arrives, which records a going-back
  // as a new page, so undo that here. If the event arrives first, the render below decides.
  useEffect(() => {
    const onPop = () => {
      const current = window.location.pathname + window.location.search;
      setNav(({ stack }) => {
        const rendered = stack[stack.length - 1] === current;
        if (rendered && stack[stack.length - 3] === current) return { stack: stack.slice(0, -2), popped: false };
        return { stack, popped: !rendered };
      });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  // Keeps the history in step with the URL during render, without an effect.
  if (nav.stack[nav.stack.length - 1] !== url) {
    const wentBack = nav.popped && nav.stack[nav.stack.length - 2] === url;
    setNav({ stack: wentBack ? nav.stack.slice(0, -1) : [...nav.stack, url], popped: false });
  }

  const className = "mb-4 inline-flex items-center gap-2 font-label text-[11px] tracking-[0.15em] text-muted uppercase hover:text-ink";
  const arrow = <ArrowLeft className="size-3.5 shrink-0" strokeWidth={1.5} aria-hidden />;
  const previous = nav.stack[nav.stack.length - 2];

  if (previous !== undefined) {
    return (
      <button type="button" onClick={() => router.back()} className={`${className} cursor-pointer`}>
        {arrow}
        {labelFor(previous)}
      </button>
    );
  }
  if (pathname === "/dashboard") return null;
  const parent = parentOf(pathname);
  return (
    <Link href={parent} className={className}>
      {arrow}
      {labelFor(parent)}
    </Link>
  );
}
