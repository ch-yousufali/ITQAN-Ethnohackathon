import type { Metadata } from "next";
import { Azeret_Mono, Gilda_Display, Inter, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { RevealObserver } from "@/components/reveal-observer";
import { Shell } from "@/components/shell";
import { LoadingState } from "@/components/states";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

const gilda = Gilda_Display({ variable: "--font-gilda", subsets: ["latin"], weight: "400" });
const azeret = Azeret_Mono({ variable: "--font-azeret", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "EthnoSynergy AI", template: "%s · EthnoSynergy AI" },
  description: "Connecting ancient polyherbal formulations with modern molecular research.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${inter.variable} ${sourceSerif.variable} ${gilda.variable} ${azeret.variable} h-full antialiased`}>
      <body className="min-h-full">
        {/* Without JavaScript nothing can mark reveals as shown, so show them outright. */}
        <noscript>
          <style>{"[data-reveal]{opacity:1!important;translate:none!important;scale:none!important;filter:none!important}"}</style>
        </noscript>
        <Providers>
          <Suspense fallback={null}>
            <Shell>
              <Suspense fallback={<LoadingState />}>{children}</Suspense>
            </Shell>
          </Suspense>
          <RevealObserver />
        </Providers>
      </body>
    </html>
  );
}
