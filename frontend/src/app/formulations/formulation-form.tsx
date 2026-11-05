"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { Notice } from "@/components/evidence";
import { Select } from "@/components/select";
import { Button, ButtonLink, Field, Input, Panel, Textarea } from "@/components/ui";
import { usePlants, useSaveFormulation } from "@/lib/api";
import type { Formulation, FormulationInput } from "@/lib/api/schemas";

const schema = z.object({
  name: z.string().trim().min(2, "Enter a name for this formulation."),
  tradition: z.string().trim().min(1, "Enter the medical tradition."),
  period: z.string().trim().min(1, "Enter the historical period."),
  description: z.string().trim(),
  source_note: z.string().trim(),
  ingredients: z
    .array(
      z.object({
        traditional_name: z.string().trim().min(1, "Enter the traditional name."),
        plant_id: z.string(),
        part_used: z.string().trim(),
        quantity: z.string().trim(),
      }),
    )
    .min(1, "Add at least one ingredient."),
});
type Values = z.infer<typeof schema>;

const blank = { traditional_name: "", plant_id: "", part_used: "", quantity: "" };

function toValues(f?: Formulation): Values {
  if (!f) return { name: "", tradition: "", period: "", description: "", source_note: "", ingredients: [blank] };
  return {
    name: f.name,
    tradition: f.tradition,
    period: f.period,
    description: f.description ?? "",
    source_note: f.source_note ?? "",
    ingredients: f.ingredients.map((i) => ({
      traditional_name: i.traditional_name,
      plant_id: i.plant_id ?? "",
      part_used: i.part_used ?? "",
      quantity: i.quantity ?? "",
    })),
  };
}

function toInput(v: Values): FormulationInput {
  return {
    name: v.name,
    tradition: v.tradition,
    period: v.period,
    description: v.description || null,
    source_note: v.source_note || null,
    ingredients: v.ingredients.map((i) => ({
      traditional_name: i.traditional_name,
      plant_id: i.plant_id || null,
      part_used: i.part_used || null,
      quantity: i.quantity || null,
    })),
  };
}

export function FormulationForm({ formulation }: { formulation?: Formulation }) {
  const router = useRouter();
  const save = useSaveFormulation(formulation?.id);
  const plants = usePlants();
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: toValues(formulation) });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "ingredients" });
  const { errors, isSubmitting } = form.formState;
  const plantOptions = [
    { value: "", label: "Unidentified" },
    ...(plants.data ?? []).map((p) => ({ value: p.id, label: p.botanical_name, botanical: true })),
  ];

  const onSubmit = form.handleSubmit(async (values) => {
    const saved = await save.mutateAsync(toInput(values)).catch(() => null);
    if (saved) router.push(`/formulations/${saved.id}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="max-w-3xl space-y-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Name" htmlFor="name" error={errors.name?.message}>
            <Input id="name" aria-invalid={!!errors.name} {...form.register("name")} />
          </Field>
        </div>
        <Field label="Tradition" htmlFor="tradition" error={errors.tradition?.message}>
          <Input id="tradition" aria-invalid={!!errors.tradition} {...form.register("tradition")} />
        </Field>
        <Field label="Historical period" htmlFor="period" error={errors.period?.message}>
          <Input id="period" aria-invalid={!!errors.period} {...form.register("period")} />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Description" htmlFor="description" hint="Optional. Describe the preparation, without claims of medical efficacy.">
            <Textarea id="description" rows={3} {...form.register("description")} />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Historical source" htmlFor="source_note" hint="Optional. The text, folio or collection this comes from.">
            <Input id="source_note" {...form.register("source_note")} />
          </Field>
        </div>
      </div>

      <fieldset>
        <legend className="text-base font-semibold tracking-tight">Ingredients</legend>
        <p className="mt-1 mb-4 text-sm text-muted">
          Leave the botanical identification empty if unknown. It will be reported as missing data, not guessed.
        </p>
        <div className="space-y-3">
          {fields.map((field, i) => {
            const e = errors.ingredients?.[i];
            return (
              <Panel key={field.id} className="p-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Traditional name" htmlFor={`ing-${i}-name`} error={e?.traditional_name?.message}>
                    <Input id={`ing-${i}-name`} aria-invalid={!!e?.traditional_name} {...form.register(`ingredients.${i}.traditional_name`)} />
                  </Field>
                  <Field label="Botanical identification" htmlFor={`ing-${i}-plant`}>
                    <Controller
                      control={form.control}
                      name={`ingredients.${i}.plant_id`}
                      render={({ field: f }) => (
                        <Select
                          id={`ing-${i}-plant`}
                          value={f.value}
                          onChange={f.onChange}
                          onBlur={f.onBlur}
                          options={plantOptions}
                          placeholder={plants.isError ? "Plants unavailable" : "Loading plants…"}
                        />
                      )}
                    />
                  </Field>
                  <Field label="Part used" htmlFor={`ing-${i}-part`}>
                    <Input id={`ing-${i}-part`} {...form.register(`ingredients.${i}.part_used`)} />
                  </Field>
                  <Field label="Quantity" htmlFor={`ing-${i}-qty`}>
                    <Input id={`ing-${i}-qty`} {...form.register(`ingredients.${i}.quantity`)} />
                  </Field>
                </div>
                {fields.length > 1 && (
                  <Button variant="ghost" className="mt-2 -ml-2" onClick={() => remove(i)}>
                    <Trash2 className="size-4" aria-hidden />
                    Remove ingredient
                  </Button>
                )}
              </Panel>
            );
          })}
        </div>
        {errors.ingredients?.root?.message && (
          <p role="alert" className="mt-2 text-[13px] text-danger">{errors.ingredients.root.message}</p>
        )}
        <Button variant="secondary" className="mt-3" onClick={() => append(blank)}>
          <Plus className="size-4" aria-hidden />
          Add ingredient
        </Button>
      </fieldset>

      {save.isError && <Notice title="Could not save">{save.error.message}</Notice>}

      <div className="flex gap-2 border-t border-line pt-6">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : formulation ? "Save changes" : "Create formulation"}
        </Button>
        <ButtonLink variant="ghost" href={formulation ? `/formulations/${formulation.id}` : "/formulations"}>
          Cancel
        </ButtonLink>
      </div>
    </form>
  );
}
