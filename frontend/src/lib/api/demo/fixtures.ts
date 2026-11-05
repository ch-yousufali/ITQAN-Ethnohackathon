/**
 * DEMO DATA. Everything here is deliberately fictional: invented species,
 * compounds, targets and references. None of it describes real science, and
 * the names make that obvious so it can never be mistaken for a result.
 * This module is only reachable when NEXT_PUBLIC_DEMO_MODE=1.
 */
import type {
  Compound,
  EvidenceCategory,
  Formulation,
  Manuscript,
  Plant,
  SourceRef,
} from "../schemas";

const ref = (n: number, title: string): SourceRef => ({
  id: `src-${n}`,
  database: "Demo Reference Set",
  accession: `DEMO-${String(n).padStart(4, "0")}`,
  title: `[Fictional reference] ${title}`,
  year: null,
  url: null,
});

export type DemoTarget = { id: string; symbol: string; name: string; pathways: string[] };

export const TARGETS: DemoTarget[] = [
  { id: "t1", symbol: "DEMO-T1", name: "Demo target one", pathways: ["Demo pathway Alpha"] },
  { id: "t2", symbol: "DEMO-T2", name: "Demo target two", pathways: ["Demo pathway Alpha", "Demo pathway Beta"] },
  { id: "t3", symbol: "DEMO-T3", name: "Demo target three", pathways: ["Demo pathway Gamma"] },
];

type Link = {
  target: string;
  action: string;
  category: EvidenceCategory;
  confidence: number;
  method: string;
  value: string | null;
  sources: SourceRef[];
};

export type DemoCompound = Omit<Compound, "targets"> & { links: Link[] };

export const COMPOUNDS: DemoCompound[] = [
  {
    id: "c1",
    name: "Demo compound A1",
    formula: "C7H6O2",
    molecular_weight: null,
    smiles: "O=C(O)c1ccccc1",
    plant_ids: ["p1"],
    references: [ref(1, "Sample isolation record for compound A1")],
    links: [
      { target: "t1", action: "inhibits", category: "MEASURED", confidence: 0.9, method: "Sample in-vitro assay", value: "Placeholder value", sources: [ref(2, "Sample assay record A1 / T1")] },
      { target: "t3", action: "binds", category: "PREDICTED", confidence: 0.46, method: "Sample docking model", value: null, sources: [ref(3, "Sample docking run A1 / T3")] },
    ],
  },
  {
    id: "c2",
    name: "Demo compound A2",
    formula: "C6H6O",
    molecular_weight: null,
    smiles: "Oc1ccccc1",
    plant_ids: ["p1"],
    references: [ref(4, "Sample isolation record for compound A2")],
    links: [
      { target: "t2", action: "activates", category: "CURATED", confidence: 0.78, method: "Sample curated database entry", value: null, sources: [ref(5, "Sample curation record A2 / T2")] },
    ],
  },
  {
    id: "c3",
    name: "Demo compound B1",
    formula: "C9H8O2",
    molecular_weight: null,
    smiles: "O=C(O)C=Cc1ccccc1",
    plant_ids: ["p2"],
    references: [ref(6, "Sample isolation record for compound B1")],
    links: [
      { target: "t1", action: "inhibits", category: "CURATED", confidence: 0.74, method: "Sample curated database entry", value: null, sources: [ref(7, "Sample curation record B1 / T1")] },
      { target: "t2", action: "inhibits", category: "INFERRED", confidence: 0.55, method: "Sample pathway inference", value: null, sources: [ref(8, "Sample inference run B1 / T2")] },
    ],
  },
  {
    id: "c4",
    name: "Demo compound C1",
    formula: null,
    molecular_weight: null,
    smiles: null,
    plant_ids: ["p3"],
    references: [ref(9, "Sample isolation record for compound C1")],
    links: [
      { target: "t3", action: "binds", category: "PREDICTED", confidence: 0.38, method: "Sample docking model", value: null, sources: [ref(10, "Sample docking run C1 / T3")] },
      // Deliberately unsourced: shows how the UI withholds untraceable findings.
      { target: "t1", action: "inhibits", category: "INFERRED", confidence: 0.5, method: "Sample pathway inference", value: null, sources: [] },
    ],
  },
  {
    id: "c5",
    name: "Demo compound C2",
    formula: "C8H8O3",
    molecular_weight: null,
    smiles: null,
    plant_ids: ["p3"],
    references: [ref(11, "Sample isolation record for compound C2")],
    links: [],
  },
];

const plantBase = (
  id: string,
  botanical_name: string,
  traditional: string[],
  common: string,
  parts: string[],
  refNo: number | null,
): Plant => ({
  id,
  botanical_name,
  family: "Demonstraceae",
  common_names: [common],
  traditional_names: traditional,
  parts_used: parts,
  description: "Fictional species used only to demonstrate this interface. It does not exist.",
  references: refNo === null ? [] : [ref(refNo, `Sample botanical record for ${botanical_name}`)],
  compounds: COMPOUNDS.filter((c) => c.plant_ids.includes(id)).map((c) => ({
    id: c.id,
    name: c.name,
    formula: c.formula,
    target_count: c.links.length,
  })),
});

export const PLANTS: Plant[] = [
  plantBase("p1", "Exemplaria prima", ["Demo-name Alpha"], "Sample herb one", ["Fruit"], 20),
  plantBase("p2", "Exemplaria secunda", ["Demo-name Beta"], "Sample herb two", ["Root", "Bark"], 21),
  plantBase("p3", "Specimenia tertia", ["Demo-name Delta"], "Sample herb three", ["Leaf"], 22),
  plantBase("p4", "Specimenia quarta", ["Demo-name Beta (variant)"], "Sample herb four", ["Seed"], 23),
  plantBase("p5", "Illustrata quinta", ["Demo-name Epsilon"], "Sample herb five", ["Flower"], null),
];

const ingredient = (
  id: string,
  traditional_name: string,
  plant_id: string | null,
  part_used: string | null,
  quantity: string | null,
): Formulation["ingredients"][number] => ({
  id,
  traditional_name,
  plant_id,
  botanical_name: PLANTS.find((p) => p.id === plant_id)?.botanical_name ?? null,
  part_used,
  quantity,
  status: plant_id ? "confirmed" : "unmapped",
});

export const seedFormulations: Formulation[] = [
  {
    id: "f1",
    name: "Sample Formulation One",
    tradition: "Demo tradition A",
    period: "Sample period I",
    description: "Fictional three-herb preparation used to demonstrate the research workflow.",
    source_note: "No historical source. This is sample data.",
    manuscript_id: null,
    updated_at: "2026-10-28T09:30:00Z",
    ingredients: [
      ingredient("i1", "Demo-name Alpha", "p1", "Fruit", "1 part"),
      ingredient("i2", "Demo-name Beta", "p2", "Root", "1 part"),
      ingredient("i3", "Demo-name Delta", "p3", "Leaf", "2 parts"),
    ],
  },
  {
    id: "f2",
    name: "Sample Formulation Two",
    tradition: "Demo tradition B",
    period: "Sample period II",
    description: "Fictional preparation with incomplete molecular data, showing coverage warnings.",
    source_note: "No historical source. This is sample data.",
    manuscript_id: null,
    updated_at: "2026-10-14T15:10:00Z",
    ingredients: [
      ingredient("i4", "Demo-name Alpha", "p1", "Fruit", null),
      ingredient("i5", "Demo-name Epsilon", "p5", "Flower", null),
      ingredient("i6", "Demo-name Zeta", null, null, null),
    ],
  },
  {
    id: "f3",
    name: "Sample Formulation Three",
    tradition: "Demo tradition A",
    period: "Sample period II",
    description: null,
    source_note: null,
    manuscript_id: null,
    updated_at: "2026-09-30T11:00:00Z",
    ingredients: [ingredient("i7", "Demo-name Beta (variant)", "p4", "Seed", null)],
  },
];

export const DEMO_OCR_TEXT = `[DEMO OUTPUT: your file was not read. This is fixed sample text.]

Take of Demo-name Alpha, one part;
of Demo-name Beta, one part;
of Demo-name Gamma, a small measure.
Prepare as the sample tradition directs.`;

export function demoIngredients(): Manuscript["ingredients"] {
  return [
    {
      id: "m-i1",
      traditional_name: "Demo-name Alpha",
      plant_id: "p1",
      botanical_name: "Exemplaria prima",
      confidence: 0.94,
      status: "confirmed",
      rationale: "Sample rationale: exact match in the demo synonym list.",
      candidates: [{ plant_id: "p1", botanical_name: "Exemplaria prima", confidence: 0.94 }],
    },
    {
      id: "m-i2",
      traditional_name: "Demo-name Beta",
      plant_id: "p2",
      botanical_name: "Exemplaria secunda",
      confidence: 0.58,
      status: "uncertain",
      rationale: "Sample rationale: this name maps to two species in the demo synonym list.",
      candidates: [
        { plant_id: "p2", botanical_name: "Exemplaria secunda", confidence: 0.58 },
        { plant_id: "p4", botanical_name: "Specimenia quarta", confidence: 0.31 },
      ],
    },
    {
      id: "m-i3",
      traditional_name: "Demo-name Gamma",
      plant_id: null,
      botanical_name: null,
      confidence: null,
      status: "unmapped",
      rationale: "Sample rationale: no match in the demo synonym list.",
      candidates: [],
    },
  ];
}

export const seedManuscripts: Manuscript[] = [
  {
    id: "m1",
    filename: "sample-folio-12.png",
    content_type: "image/png",
    preview_url: null,
    status: "review",
    error: null,
    uploaded_at: "2026-11-02T10:12:00Z",
    ocr_text: DEMO_OCR_TEXT,
    ocr_confidence: 0.72,
    ingredients: demoIngredients(),
    formulation_id: null,
  },
];
