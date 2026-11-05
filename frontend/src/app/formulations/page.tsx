import type { Metadata } from "next";
import { FormulationsView } from "./view";

export const metadata: Metadata = { title: "Formulations" };

export default function Page() {
  return <FormulationsView />;
}
