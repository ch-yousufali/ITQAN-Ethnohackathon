import type { Metadata } from "next";
import { PlantsView } from "./view";

export const metadata: Metadata = { title: "Plants" };

export default function Page() {
  return <PlantsView />;
}
