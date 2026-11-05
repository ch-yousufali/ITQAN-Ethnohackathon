"use client";

import { useParams } from "next/navigation";
import { QueryView } from "@/components/states";
import { PageHeader } from "@/components/ui";
import { useFormulation } from "@/lib/api";
import { FormulationForm } from "../../formulation-form";

export function EditFormulationView() {
  const { id } = useParams<{ id: string }>();
  const query = useFormulation(id);
  return (
    <QueryView query={query}>
      {(f) => (
        <>
          <PageHeader back={{ href: `/formulations/${f.id}`, label: f.name }} title="Edit formulation" />
          <FormulationForm key={f.updated_at} formulation={f} />
        </>
      )}
    </QueryView>
  );
}
