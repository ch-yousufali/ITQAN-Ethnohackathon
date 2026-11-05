import type { Metadata } from "next";
import { AnalysesView } from "./view";

export const metadata: Metadata = { title: "Analysis history" };

export default function Page() {
  return <AnalysesView />;
}
