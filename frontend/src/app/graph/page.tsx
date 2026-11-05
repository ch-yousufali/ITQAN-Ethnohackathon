import type { Metadata } from "next";
import { GraphView } from "./view";

export const metadata: Metadata = { title: "Knowledge graph" };

export default function Page() {
  return <GraphView />;
}
