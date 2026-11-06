import type { ReactNode } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "./site-nav";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-parchment text-ink">
      <SiteNav />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
