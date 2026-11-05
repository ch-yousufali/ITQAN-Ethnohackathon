import type { Metadata } from "next";
import { EditFormulationView } from "./view";

export const metadata: Metadata = { title: "Edit formulation" };

export default function Page() {
  return <EditFormulationView />;
}
