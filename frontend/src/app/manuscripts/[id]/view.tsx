"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Notice } from "@/components/evidence";
import { IdentificationBadge } from "@/components/identification-badge";
import { ErrorState, QueryView } from "@/components/states";
import { Botanical, Button, ButtonLink, Field, Input, PageHeader, Panel, Section, Textarea, formatPercent } from "@/components/ui";
import { Select } from "@/components/select";
import { useConfirmManuscript, useManuscript, usePlants, useUpdateManuscript } from "@/lib/api";
import type { IdentifiedIngredient, Manuscript } from "@/lib/api/schemas";

function Preview({ manuscript }: { manuscript: Manuscript }) {
  const [broken, setBroken] = useState(false);
  const { preview_url: url, content_type: type, filename } = manuscript;
  if (!url || broken) {
    return <p className="p-6 text-center text-sm text-muted">Preview not available for this file.</p>;
  }
  if (type === "application/pdf") {
    return <iframe src={url} title={`Preview of ${filename}`} className="h-[28rem] w-full rounded-lg" />;
  }
  return (
    // Source is a backend-provided or local blob URL, so next/image optimisation does not apply.
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt={`Scan of ${filename}`} onError={() => setBroken(true)} className="max-h-[28rem] w-full rounded-lg object-contain" />
  );
}

function OcrEditor({ manuscript, readOnly }: { manuscript: Manuscript; readOnly: boolean }) {
  const update = useUpdateManuscript(manuscript.id);
  const [text, setText] = useState(manuscript.ocr_text ?? "");
  const dirty = text !== (manuscript.ocr_text ?? "");
  return (
    <div>
      <label htmlFor="ocr" className="sr-only">Extracted text</label>
      <Textarea
        id="ocr"
        rows={12}
        value={text}
        readOnly={readOnly}
        onChange={(e) => setText(e.target.value)}
        className="font-serif text-[15px] leading-relaxed"
      />
      {!readOnly && (
        <div className="mt-2 flex items-center gap-3">
          <Button variant="secondary" disabled={!dirty || update.isPending} onClick={() => update.mutate({ ocr_text: text })}>
            {update.isPending ? "Saving…" : "Save text corrections"}
          </Button>
          {update.isSuccess && !dirty && <span className="text-[13px] text-leaf">Saved</span>}
          {update.isError && <span role="alert" className="text-[13px] text-danger">{update.error.message}</span>}
        </div>
      )}
    </div>
  );
}

function IngredientRow({
  item,
  disabled,
  onChange,
}: {
  item: IdentifiedIngredient;
  disabled: boolean;
  onChange: (next: { plant_id: string | null; status: IdentifiedIngredient["status"] }) => void;
}) {
  const plants = usePlants();
  const needsAttention = item.status === "uncertain" || item.status === "unmapped";
  return (
    <li className={`p-4 sm:p-5 ${item.status === "uncertain" ? "bg-warn-soft/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">{item.traditional_name}</p>
          <p className="mt-0.5 text-sm">
            {item.botanical_name ? <Botanical>{item.botanical_name}</Botanical> : <span className="text-muted">No botanical identification</span>}
            {item.confidence !== null && item.status !== "corrected" && (
              <span className="text-[13px] text-muted tabular-nums"> · {formatPercent(item.confidence)} confidence</span>
            )}
          </p>
        </div>
        <IdentificationBadge status={item.status} />
      </div>
      {item.rationale && <p className="mt-2 text-[13px] leading-relaxed text-muted">{item.rationale}</p>}

      {!disabled && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select
            aria-label={`Botanical identification for ${item.traditional_name}`}
            className="w-full sm:max-w-xs"
            value={item.plant_id ?? ""}
            onChange={(next) => {
              const plant_id = next || null;
              onChange({ plant_id, status: plant_id ? "corrected" : "unmapped" });
            }}
            options={[
              { value: "", label: "Leave unidentified" },
              ...item.candidates.map((c) => ({
                value: c.plant_id,
                label: c.botanical_name,
                botanical: true,
                group: "Suggested",
                detail: c.confidence !== null ? `${formatPercent(c.confidence)} confidence` : undefined,
              })),
              ...(plants.data ?? [])
                .filter((p) => !item.candidates.some((c) => c.plant_id === p.id))
                .map((p) => ({ value: p.id, label: p.botanical_name, botanical: true, group: "All plants" })),
            ]}
          />
          {needsAttention && item.status === "uncertain" && item.plant_id && (
            <Button variant="secondary" onClick={() => onChange({ plant_id: item.plant_id, status: "confirmed" })}>
              <Check className="size-4" aria-hidden />
              Accept suggestion
            </Button>
          )}
        </div>
      )}
    </li>
  );
}

const confirmSchema = z.object({
  name: z.string().trim().min(2, "Enter a name for this formulation."),
  tradition: z.string().trim().min(1, "Enter the medical tradition."),
  period: z.string().trim().min(1, "Enter the historical period."),
});

function ConfirmForm({ manuscript, blocked }: { manuscript: Manuscript; blocked: number }) {
  const router = useRouter();
  const confirm = useConfirmManuscript(manuscript.id);
  const form = useForm({
    resolver: zodResolver(confirmSchema),
    defaultValues: { name: "", tradition: "", period: "" },
  });
  const { errors } = form.formState;
  const unmapped = manuscript.ingredients.filter((i) => i.status === "unmapped").length;

  const onSubmit = form.handleSubmit(async (values) => {
    const f = await confirm.mutateAsync(values).catch(() => null);
    if (f) router.push(`/formulations/${f.id}`);
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {blocked > 0 && (
        <Notice>{blocked} uncertain identification{blocked === 1 ? "" : "s"} must be resolved before you can continue.</Notice>
      )}
      {blocked === 0 && unmapped > 0 && (
        <Notice>{unmapped} ingredient{unmapped === 1 ? " stays" : "s stay"} unidentified and will be reported as missing data in every analysis.</Notice>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Formulation name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" aria-invalid={!!errors.name} {...form.register("name")} />
        </Field>
        <Field label="Tradition" htmlFor="tradition" error={errors.tradition?.message}>
          <Input id="tradition" aria-invalid={!!errors.tradition} {...form.register("tradition")} />
        </Field>
        <Field label="Historical period" htmlFor="period" error={errors.period?.message}>
          <Input id="period" aria-invalid={!!errors.period} {...form.register("period")} />
        </Field>
      </div>
      {confirm.isError && <Notice title="Could not create the formulation">{confirm.error.message}</Notice>}
      <Button type="submit" disabled={blocked > 0 || confirm.isPending}>
        {confirm.isPending ? "Creating…" : "Confirm and create formulation"}
      </Button>
    </form>
  );
}

export function ManuscriptReviewView() {
  const { id } = useParams<{ id: string }>();
  const query = useManuscript(id);
  const update = useUpdateManuscript(id);
  const back = { href: "/manuscripts", label: "Manuscripts" };

  return (
    <QueryView query={query}>
      {(m) => {
        if (m.status === "processing") {
          return (
            <>
              <PageHeader back={back} title={m.filename} />
              <Panel className="px-6 py-14 text-center" role="status">
                <Loader2 className="mx-auto size-6 animate-spin text-leaf" aria-hidden />
                <p className="mt-3 text-sm font-medium">Extracting text and identifying ingredients</p>
                <p className="mt-1 text-[13px] text-muted">You can leave this page and come back later.</p>
              </Panel>
            </>
          );
        }
        if (m.status === "failed") {
          return (
            <>
              <PageHeader back={back} title={m.filename} />
              <ErrorState title="Processing failed" error={new Error(m.error ?? "Processing failed for this manuscript.")} />
            </>
          );
        }

        const confirmed = m.status === "confirmed";
        const uncertain = m.ingredients.filter((i) => i.status === "uncertain").length;
        const setIngredient = (itemId: string, next: { plant_id: string | null; status: IdentifiedIngredient["status"] }) =>
          update.mutate({
            ingredients: m.ingredients.map((i) => ({
              id: i.id,
              traditional_name: i.traditional_name,
              plant_id: i.id === itemId ? next.plant_id : i.plant_id,
              status: i.id === itemId ? next.status : i.status,
            })),
          });

        return (
          <>
            <PageHeader
              back={back}
              title={m.filename}
              description={confirmed ? "This manuscript has been reviewed." : "Check the extracted text, then verify each ingredient."}
              actions={
                confirmed && m.formulation_id ? (
                  <ButtonLink href={`/formulations/${m.formulation_id}`}>View formulation</ButtonLink>
                ) : undefined
              }
            />

            <Section
              title="Extracted text"
              description={`OCR confidence: ${formatPercent(m.ocr_confidence)}. Machine-read text can contain errors, so compare it with the source.`}
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <Panel className="flex items-center justify-center p-3">
                  <Preview manuscript={m} />
                </Panel>
                <OcrEditor manuscript={m} readOnly={confirmed} />
              </div>
            </Section>

            <Section
              title="Identified ingredients"
              description="Traditional names mapped to modern botanical names. These are suggestions until you verify them."
            >
              {m.ingredients.length === 0 ? (
                <p className="text-sm text-muted">No ingredients were identified in this text.</p>
              ) : (
                <Panel>
                  <ul className="divide-y divide-line" aria-busy={update.isPending}>
                    {m.ingredients.map((item) => (
                      <IngredientRow
                        key={item.id}
                        item={item}
                        disabled={confirmed}
                        onChange={(next) => setIngredient(item.id, next)}
                      />
                    ))}
                  </ul>
                </Panel>
              )}
              {update.isError && <div className="mt-3"><Notice title="Could not save">{update.error.message}</Notice></div>}
            </Section>

            {confirmed ? (
              m.formulation_id && (
                <p className="text-sm text-body">
                  Used by <Link href={`/formulations/${m.formulation_id}`} className="font-medium text-leaf hover:underline">this formulation</Link>.
                </p>
              )
            ) : (
              <Section title="Create formulation" className="mb-0">
                <ConfirmForm manuscript={m} blocked={uncertain} />
              </Section>
            )}
          </>
        );
      }}
    </QueryView>
  );
}
