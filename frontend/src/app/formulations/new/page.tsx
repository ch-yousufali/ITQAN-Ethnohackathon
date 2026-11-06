import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { FormulationForm } from "../formulation-form";

export const metadata: Metadata = { title: "New formulation" };

export default function Page() {
  return (
    <>
      <PageHeader title="New formulation" />
      <FormulationForm />
    </>
  );
}
