import type { Metadata } from "next";
import { PlantDetailView } from "./view";

export const metadata: Metadata = { title: "Plant" };

export default function Page() {
  return <PlantDetailView />;
}
