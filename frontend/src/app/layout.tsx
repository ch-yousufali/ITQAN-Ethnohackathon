import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { Suspense } from "react";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { LoadingState } from "@/components/states";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: "EthnoSynergy AI", template: "%s · EthnoSynergy AI" },
  description: "Connecting ancient polyherbal formulations with modern molecular research.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>
          <Suspense fallback={null}>
            <Shell>
              <Suspense fallback={<LoadingState />}>{children}</Suspense>
            </Shell>
          </Suspense>
        </Providers>
      </body>
    </html>
  );
}
