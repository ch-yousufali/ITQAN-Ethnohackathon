/**
 * The frontend's view of the API contract. Every response is parsed against
 * these schemas, so a contract mismatch surfaces as a visible error instead of
 * as silently wrong science. Human-readable version: docs/API_CONTRACT.md.
 */
import { z } from "zod";

export const EVIDENCE_CATEGORIES = ["MEASURED", "CURATED", "INFERRED", "PREDICTED"] as const;
export const evidenceCategory = z.enum(EVIDENCE_CATEGORIES);
export type EvidenceCategory = z.infer<typeof evidenceCategory>;

export const sourceRef = z.object({
  id: z.string(),
  database: z.string(),
  accession: z.string(),
  title: z.string().nullable(),
  year: z.number().nullable(),
  url: z.string().nullable(),
});
export type SourceRef = z.infer<typeof sourceRef>;

/* ---------- Formulations ---------- */

export const identificationStatus = z.enum(["confirmed", "corrected", "uncertain", "unmapped"]);
export type IdentificationStatus = z.infer<typeof identificationStatus>;

export const formulationIngredient = z.object({
  id: z.string(),
  traditional_name: z.string(),
  plant_id: z.string().nullable(),
  botanical_name: z.string().nullable(),
  part_used: z.string().nullable(),
  quantity: z.string().nullable(),
  status: identificationStatus,
});
export type FormulationIngredient = z.infer<typeof formulationIngredient>;

export const formulation = z.object({
  id: z.string(),
  name: z.string(),
  tradition: z.string(),
  period: z.string(),
  description: z.string().nullable(),
  source_note: z.string().nullable(),
  manuscript_id: z.string().nullable(),
  ingredients: z.array(formulationIngredient),
  updated_at: z.string(),
});
export type Formulation = z.infer<typeof formulation>;

export type FormulationInput = {
  name: string;
  tradition: string;
  period: string;
  description: string | null;
  source_note: string | null;
  ingredients: {
    traditional_name: string;
    plant_id: string | null;
    part_used: string | null;
    quantity: string | null;
  }[];
};

/* ---------- Manuscripts & OCR ---------- */

export const identifiedIngredient = z.object({
  id: z.string(),
  traditional_name: z.string(),
  plant_id: z.string().nullable(),
  botanical_name: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  status: identificationStatus,
  rationale: z.string().nullable(),
  candidates: z.array(
    z.object({
      plant_id: z.string(),
      botanical_name: z.string(),
      confidence: z.number().min(0).max(1).nullable(),
    }),
  ),
});
export type IdentifiedIngredient = z.infer<typeof identifiedIngredient>;

export const manuscript = z.object({
  id: z.string(),
  filename: z.string(),
  content_type: z.string(),
  preview_url: z.string().nullable(),
  status: z.enum(["processing", "review", "confirmed", "failed"]),
  error: z.string().nullable(),
  uploaded_at: z.string(),
  ocr_text: z.string().nullable(),
  ocr_confidence: z.number().min(0).max(1).nullable(),
  ingredients: z.array(identifiedIngredient),
  formulation_id: z.string().nullable(),
});
export type Manuscript = z.infer<typeof manuscript>;

export type ManuscriptPatch = {
  ocr_text?: string;
  ingredients?: Pick<IdentifiedIngredient, "id" | "plant_id" | "status" | "traditional_name">[];
};

/* ---------- Plants & compounds ---------- */

export const compoundSummary = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string().nullable(),
  target_count: z.number(),
});
export type CompoundSummary = z.infer<typeof compoundSummary>;

export const plant = z.object({
  id: z.string(),
  botanical_name: z.string(),
  family: z.string().nullable(),
  common_names: z.array(z.string()),
  traditional_names: z.array(z.string()),
  parts_used: z.array(z.string()),
  description: z.string().nullable(),
  references: z.array(sourceRef),
  compounds: z.array(compoundSummary),
});
export type Plant = z.infer<typeof plant>;

export const compound = z.object({
  id: z.string(),
  name: z.string(),
  formula: z.string().nullable(),
  molecular_weight: z.number().nullable(),
  smiles: z.string().nullable(),
  plant_ids: z.array(z.string()),
  references: z.array(sourceRef),
  targets: z.array(
    z.object({
      id: z.string(),
      symbol: z.string(),
      name: z.string(),
      action: z.string().nullable(),
      category: evidenceCategory,
      sources: z.array(sourceRef),
    }),
  ),
});
export type Compound = z.infer<typeof compound>;

/* ---------- Analyses & findings ---------- */

export const coverage = z.object({
  ingredients_total: z.number(),
  ingredients_mapped: z.number(),
  plants_with_compounds: z.number(),
  compounds_total: z.number(),
  compounds_with_targets: z.number(),
  /** Share of ingredients with usable molecular data, 0..1. */
  ratio: z.number().min(0).max(1),
  warnings: z.array(z.string()),
});
export type Coverage = z.infer<typeof coverage>;

export const analysis = z.object({
  id: z.string(),
  formulation_id: z.string(),
  formulation_name: z.string(),
  status: z.enum(["queued", "running", "completed", "failed"]),
  error: z.string().nullable(),
  started_at: z.string(),
  completed_at: z.string().nullable(),
  coverage: coverage.nullable(),
  findings_count: z.number(),
});
export type Analysis = z.infer<typeof analysis>;

export const evidenceItem = z.object({
  id: z.string(),
  category: evidenceCategory,
  statement: z.string(),
  subject: z.string(),
  method: z.string().nullable(),
  value: z.string().nullable(),
  confidence: z.number().min(0).max(1).nullable(),
  sources: z.array(sourceRef),
});
export type EvidenceItem = z.infer<typeof evidenceItem>;

const findingCompound = z.object({
  id: z.string(),
  name: z.string(),
  plant_id: z.string(),
  botanical_name: z.string(),
});

export const finding = z.object({
  id: z.string(),
  analysis_id: z.string(),
  rank: z.number(),
  score: z.number(),
  compound_a: findingCompound,
  compound_b: findingCompound,
  target: z.object({ id: z.string(), symbol: z.string(), name: z.string() }),
  pathways: z.array(z.string()),
  interaction_type: z.string(),
  /** The weakest evidence category supporting this finding. */
  category: evidenceCategory,
  confidence: z.number().min(0).max(1).nullable(),
  evidence: z.array(evidenceItem),
  missing_data: z.array(z.string()),
});
export type Finding = z.infer<typeof finding>;

export const interpretation = z.object({
  summary: z.string(),
  model: z.string(),
  generated_at: z.string(),
  caveats: z.array(z.string()),
});
export type Interpretation = z.infer<typeof interpretation>;

/* ---------- Knowledge graph ---------- */

export const NODE_TYPES = ["formulation", "plant", "compound", "target", "pathway"] as const;
export const graphNodeType = z.enum(NODE_TYPES);
export type GraphNodeType = z.infer<typeof graphNodeType>;

export const graphNode = z.object({
  id: z.string(),
  type: graphNodeType,
  label: z.string(),
  /** In-app route for this entity, when it has one. */
  href: z.string().nullable(),
});
export type GraphNode = z.infer<typeof graphNode>;

export const graphLink = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  relation: z.string(),
  category: evidenceCategory.nullable(),
  sources: z.array(sourceRef),
});
export type GraphLink = z.infer<typeof graphLink>;

export const graph = z.object({ nodes: z.array(graphNode), links: z.array(graphLink) });
export type Graph = z.infer<typeof graph>;
