# API Contract (proposed)

**Status: proposed by the frontend, not yet agreed with the backend.** Field names can change, but
tell the frontend so `frontend/src/lib/api/schemas.ts` can change with them. That file is the source
of truth: the frontend validates every response against it, and a response that does not match is
shown as an error, not displayed.

## Conventions

- JSON with `snake_case` fields. Timestamps are ISO 8601 strings.
- `NEXT_PUBLIC_API_BASE_URL` is prepended to every path. Allow CORS from the frontend's origin.
- Missing values are `null`. Please do not substitute placeholders or defaults for missing science.
- Errors use the matching HTTP status with `{ "message": "Readable explanation" }`. The message is
  shown to the user.
- Authentication is not covered yet. The PRD does not define it.

## Endpoints

| Method | Path | Body | Returns |
| --- | --- | --- | --- |
| GET | `/formulations` | | `Formulation[]` |
| POST | `/formulations` | `FormulationInput` | `Formulation` |
| GET | `/formulations/:id` | | `Formulation` |
| PUT | `/formulations/:id` | `FormulationInput` | `Formulation` |
| POST | `/formulations/:id/analyses` | | `Analysis` (starts a run) |
| GET | `/manuscripts` | | `Manuscript[]` |
| POST | `/manuscripts` | multipart, field `file` | `Manuscript` (`status: "processing"`) |
| GET | `/manuscripts/:id` | | `Manuscript` (polled while processing) |
| PATCH | `/manuscripts/:id` | `{ ocr_text?, ingredients? }` | `Manuscript` |
| POST | `/manuscripts/:id/confirm` | `{ name, tradition, period }` | `Formulation` (409 if any ingredient is `uncertain`) |
| GET | `/plants` | | `Plant[]` |
| GET | `/plants/:id` | | `Plant` |
| GET | `/compounds/:id` | | `Compound` |
| GET | `/analyses` | | `Analysis[]` (polled while any run is active) |
| GET | `/analyses/:id/findings` | | `Finding[]` |
| GET | `/findings/:id` | | `Finding` |
| POST | `/findings/:id/interpretation` | | `Interpretation` |
| GET | `/graph?analysis_id=` | parameter optional | `Graph` |

Search and filtering currently run in the browser, so list endpoints return full lists. If the data
gets large, we should agree on pagination and server-side filtering.

## Core types

```ts
type EvidenceCategory = "MEASURED" | "CURATED" | "INFERRED" | "PREDICTED";
type IdentificationStatus = "confirmed" | "corrected" | "uncertain" | "unmapped";

type SourceRef = {
  id: string; database: string; accession: string;
  title: string | null; year: number | null; url: string | null;
};

type FormulationInput = {
  name: string; tradition: string; period: string;
  description: string | null; source_note: string | null;
  ingredients: {
    traditional_name: string; plant_id: string | null;
    part_used: string | null; quantity: string | null;
  }[];
};

type Formulation = Omit<FormulationInput, "ingredients"> & {
  id: string; manuscript_id: string | null; updated_at: string;
  ingredients: {
    id: string; traditional_name: string; plant_id: string | null;
    botanical_name: string | null; part_used: string | null; quantity: string | null;
    status: IdentificationStatus;
  }[];
};

type Manuscript = {
  id: string; filename: string; content_type: string; preview_url: string | null;
  status: "processing" | "review" | "confirmed" | "failed"; error: string | null;
  uploaded_at: string; ocr_text: string | null;
  ocr_confidence: number | null; // 0..1
  formulation_id: string | null;
  ingredients: {
    id: string; traditional_name: string; plant_id: string | null;
    botanical_name: string | null; confidence: number | null;
    status: IdentificationStatus; rationale: string | null;
    candidates: { plant_id: string; botanical_name: string; confidence: number | null }[];
  }[];
};

type Plant = {
  id: string; botanical_name: string; family: string | null;
  common_names: string[]; traditional_names: string[]; parts_used: string[];
  description: string | null; references: SourceRef[];
  compounds: { id: string; name: string; formula: string | null; target_count: number }[];
};

type Compound = {
  id: string; name: string; formula: string | null; molecular_weight: number | null;
  smiles: string | null; // rendered as the 2D structure
  plant_ids: string[]; references: SourceRef[];
  targets: {
    id: string; symbol: string; name: string; action: string | null;
    category: EvidenceCategory; sources: SourceRef[];
  }[];
};

type Coverage = {
  ingredients_total: number; ingredients_mapped: number; plants_with_compounds: number;
  compounds_total: number; compounds_with_targets: number;
  ratio: number; // 0..1, share of ingredients with usable molecular data
  warnings: string[]; // shown verbatim
};

type Analysis = {
  id: string; formulation_id: string; formulation_name: string;
  status: "queued" | "running" | "completed" | "failed"; error: string | null;
  started_at: string; completed_at: string | null;
  coverage: Coverage | null; findings_count: number;
};

type Finding = {
  id: string; analysis_id: string; rank: number; score: number;
  compound_a: { id: string; name: string; plant_id: string; botanical_name: string };
  compound_b: { id: string; name: string; plant_id: string; botanical_name: string };
  target: { id: string; symbol: string; name: string };
  pathways: string[]; interaction_type: string;
  category: EvidenceCategory; // the WEAKEST category across `evidence`
  confidence: number | null; // 0..1
  evidence: {
    id: string; category: EvidenceCategory; statement: string; subject: string;
    method: string | null; value: string | null; confidence: number | null;
    sources: SourceRef[];
  }[];
  missing_data: string[]; // shown verbatim
};

type Interpretation = { summary: string; model: string; generated_at: string; caveats: string[] };

type Graph = {
  nodes: {
    id: string; type: "formulation" | "plant" | "compound" | "target" | "pathway";
    label: string;
    href: string | null; // in-app route, e.g. "/plants/p1"
  }[];
  links: {
    id: string; source: string; target: string; relation: string;
    category: EvidenceCategory | null; sources: SourceRef[];
  }[];
};
```

## Scientific requirements for the backend

The frontend enforces what it can, but these depend on the API:

1. **Sources:** every evidence item needs at least one real `SourceRef`. Findings without one are
   withheld from display.
2. **Weakest category:** `Finding.category` must be the weakest evidence category, so a finding with
   one measured and one predicted arm is `PREDICTED`.
3. **Coverage:** every completed analysis should return `coverage`, with gaps listed in `warnings`.
4. **Generated text:** `statement`, `summary` and `warnings` are displayed as received, so they must
   not claim proven synergy or medical efficacy.
5. **Uncertain identifications:** return `uncertain` rather than guessing, and reject confirmation
   (409) while any remain.

## Open questions

- Should `findings_count` exclude findings with no traceable source? The frontend currently shows
  the API's count in history, and the withheld count on the Findings screen.
- What upload limits apply? The frontend currently allows PNG, JPEG, TIFF, WebP and PDF up to 25 MB.
- Is authentication or per-user data needed?
