import type { Metadata } from "next";
import { CompoundDetailView } from "./view";

export const metadata: Metadata = { title: "Compound" };

export default function Page() {
  return <CompoundDetailView />;
}
