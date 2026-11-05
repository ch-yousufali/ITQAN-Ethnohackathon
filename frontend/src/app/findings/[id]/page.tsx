import type { Metadata } from "next";
import { FindingDetailView } from "./view";

export const metadata: Metadata = { title: "Finding" };

export default function Page() {
  return <FindingDetailView />;
}
