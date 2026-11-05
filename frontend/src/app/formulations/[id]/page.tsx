import type { Metadata } from "next";
import { FormulationDetailView } from "./view";

export const metadata: Metadata = { title: "Formulation" };

export default function Page() {
  return <FormulationDetailView />;
}
