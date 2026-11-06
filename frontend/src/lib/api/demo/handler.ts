/**
 * An in-browser stand-in for the backend, used only in demo mode. It answers
 * the same routes as docs/API_CONTRACT.md, so responses still pass through the
 * real client and schema validation.
 */
import type {
  Analysis,
  Compound,
  Coverage,
  EvidenceCategory,
  Finding,
  Formulation,
  FormulationInput,
  Graph,
  Manuscript,
  ManuscriptPatch,
} from "../schemas";
import { EVIDENCE_CATEGORIES } from "../schemas";
import {
  COMPOUNDS,
  DEMO_OCR_TEXT,
  PLANTS,
  TARGETS,
  demoIngredients,
  seedFormulations,
  seedManuscripts,
} from "./fixtures";

type Db = {
  formulations: Formulation[];
  manuscripts: Manuscript[];
  analyses: Analysis[];
  findings: Finding[];
};

const STORAGE_KEY = "ethnosynergy-demo-db-v1";
const WORK_MS = 2500;
const uid = () => Math.random().toString(36).slice(2, 10);
const now = () => new Date().toISOString();

function weakest(a: EvidenceCategory, b: EvidenceCategory): EvidenceCategory {
  return EVIDENCE_CATEGORIES.indexOf(a) > EVIDENCE_CATEGORIES.indexOf(b) ? a : b;
}

function computeCoverage(f: Formulation): Coverage {
  const plantIds = [...new Set(f.ingredients.flatMap((i) => (i.plant_id ? [i.plant_id] : [])))];
  const withCompounds = plantIds.filter((id) => COMPOUNDS.some((c) => c.plant_ids.includes(id)));
  const compounds = COMPOUNDS.filter((c) => c.plant_ids.some((id) => plantIds.includes(id)));
  const withTargets = compounds.filter((c) => c.links.length > 0);
  const unmapped = f.ingredients.filter((i) => !i.plant_id);
  const noData = plantIds.filter((id) => !withCompounds.includes(id));

  const warnings: string[] = [];
  for (const i of unmapped) warnings.push(`“${i.traditional_name}” has no botanical identification and was excluded.`);
  for (const id of noData) {
    const name = PLANTS.find((p) => p.id === id)?.botanical_name;
    warnings.push(`No compound data is available for ${name}.`);
  }
  const noTargets = compounds.length - withTargets.length;
  if (noTargets > 0) {
    warnings.push(`${noTargets} ${noTargets === 1 ? "compound has" : "compounds have"} no known biological targets.`);
  }

  return {
    ingredients_total: f.ingredients.length,
    ingredients_mapped: f.ingredients.length - unmapped.length,
    plants_with_compounds: withCompounds.length,
    compounds_total: compounds.length,
    compounds_with_targets: withTargets.length,
    ratio: f.ingredients.length ? withCompounds.length / f.ingredients.length : 0,
    warnings,
  };
}

/** Derives sample findings: compounds from different plants that share a target. */
function computeFindings(f: Formulation, analysisId: string, coverage: Coverage): Finding[] {
  const plantIds = new Set(f.ingredients.flatMap((i) => (i.plant_id ? [i.plant_id] : [])));
  const compounds = COMPOUNDS.filter((c) => c.plant_ids.some((id) => plantIds.has(id)));
  const found: Omit<Finding, "rank">[] = [];

  compounds.forEach((a, i) => {
    for (const b of compounds.slice(i + 1)) {
      if (a.plant_ids[0] === b.plant_ids[0]) continue;
      for (const la of a.links) {
        const lb = b.links.find((l) => l.target === la.target);
        const target = TARGETS.find((t) => t.id === la.target);
        if (!lb || !target) continue;
        const category = weakest(la.category, lb.category);
        const confidence = Math.min(la.confidence, lb.confidence);
        const weight = 1 - EVIDENCE_CATEGORIES.indexOf(category) * 0.2;
        const side = (c: typeof a, l: typeof la) => ({
          id: `${analysisId}-${c.id}-${l.target}`,
          category: l.category,
          statement: `Sample statement: ${c.name} ${l.action} ${target.symbol}.`,
          subject: c.name,
          method: l.method,
          value: l.value,
          confidence: l.confidence,
          sources: l.sources,
        });
        const plantOf = (c: typeof a) => {
          const p = PLANTS.find((x) => x.id === c.plant_ids[0]);
          return { id: c.id, name: c.name, plant_id: c.plant_ids[0], botanical_name: p?.botanical_name ?? "Unknown" };
        };
        found.push({
          id: `${analysisId}-${a.id}-${b.id}-${target.id}`,
          analysis_id: analysisId,
          score: Math.round(confidence * weight * 100) / 100,
          compound_a: plantOf(a),
          compound_b: plantOf(b),
          target: { id: target.id, symbol: target.symbol, name: target.name },
          pathways: target.pathways,
          interaction_type: la.action === lb.action ? "Same reported action" : "Different reported actions",
          category,
          confidence,
          evidence: [side(a, la), side(b, lb)],
          missing_data: coverage.warnings,
        });
      }
    }
  });

  return found.sort((x, y) => y.score - x.score).map((x, i) => ({ ...x, rank: i + 1 }));
}

function seed(): Db {
  const db: Db = { formulations: seedFormulations, manuscripts: seedManuscripts, analyses: [], findings: [] };
  const completed = (id: string, f: Formulation, started: string, done: string) => {
    const coverage = computeCoverage(f);
    const findings = computeFindings(f, id, coverage);
    db.findings.push(...findings);
    db.analyses.push({
      id,
      formulation_id: f.id,
      formulation_name: f.name,
      status: "completed",
      error: null,
      started_at: started,
      completed_at: done,
      coverage,
      findings_count: findings.length,
    });
  };
  completed("a1", seedFormulations[0], "2026-10-29T08:00:00Z", "2026-10-29T08:06:00Z");
  completed("a2", seedFormulations[1], "2026-10-15T12:00:00Z", "2026-10-15T12:03:00Z");
  db.analyses.push({
    id: "a3",
    formulation_id: "f3",
    formulation_name: seedFormulations[2].name,
    status: "failed",
    error: "Sample failure: the demo molecular data source was unavailable.",
    started_at: "2026-10-01T09:00:00Z",
    completed_at: "2026-10-01T09:01:00Z",
    coverage: null,
    findings_count: 0,
  });
  return db;
}

function load(): Db {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Db;
  } catch {
    // Storage may be unavailable; fall back to fresh seed data.
  }
  return seed();
}

let db: Db | null = null;

function getDb(): Db {
  if (db) return db;
  db = load();
  // Timers do not survive a reload, so resume anything that was in progress.
  for (const a of db.analyses) if (a.status === "running") setTimeout(() => finishAnalysis(a.id), WORK_MS);
  for (const m of db.manuscripts) if (m.status === "processing") setTimeout(() => finishManuscript(m.id), WORK_MS);
  return db;
}

function save() {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // Demo state simply will not survive a reload.
  }
}

function finishAnalysis(id: string) {
  const data = getDb();
  const run = data.analyses.find((x) => x.id === id);
  const f = data.formulations.find((x) => x.id === run?.formulation_id);
  if (!f) return;
  const coverage = computeCoverage(f);
  const findings = computeFindings(f, id, coverage);
  data.findings.push(...findings);
  data.analyses = data.analyses.map((x) =>
    x.id === id ? { ...x, status: "completed", completed_at: now(), coverage, findings_count: findings.length } : x,
  );
  save();
}

function finishManuscript(id: string) {
  const data = getDb();
  data.manuscripts = data.manuscripts.map((x) =>
    x.id === id ? { ...x, status: "review", ocr_text: DEMO_OCR_TEXT, ocr_confidence: 0.72, ingredients: demoIngredients() } : x,
  );
  save();
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const notFound = (what: string) => json({ message: `${what} not found.` }, 404);

function toIngredients(input: FormulationInput["ingredients"]): Formulation["ingredients"] {
  return input.map((i) => ({
    id: uid(),
    traditional_name: i.traditional_name,
    plant_id: i.plant_id,
    botanical_name: PLANTS.find((p) => p.id === i.plant_id)?.botanical_name ?? null,
    part_used: i.part_used,
    quantity: i.quantity,
    status: i.plant_id ? "confirmed" : "unmapped",
  }));
}

function compoundView(c: (typeof COMPOUNDS)[number]): Compound {
  const { links, ...rest } = c;
  return {
    ...rest,
    targets: links.map((l) => {
      const t = TARGETS.find((x) => x.id === l.target);
      return {
        id: l.target,
        symbol: t?.symbol ?? l.target,
        name: t?.name ?? "",
        action: l.action,
        category: l.category,
        sources: l.sources,
      };
    }),
  };
}

function buildGraph(formulations: Formulation[]): Graph {
  const nodes = new Map<string, Graph["nodes"][number]>();
  const links = new Map<string, Graph["links"][number]>();
  const link = (source: string, target: string, relation: string, category: EvidenceCategory | null, sources: Graph["links"][number]["sources"]) => {
    const id = `${source}->${target}`;
    links.set(id, { id, source, target, relation, category, sources });
  };

  for (const f of formulations) {
    nodes.set(f.id, { id: f.id, type: "formulation", label: f.name, href: `/formulations/${f.id}` });
    for (const i of f.ingredients) {
      const p = PLANTS.find((x) => x.id === i.plant_id);
      if (!p) continue;
      nodes.set(p.id, { id: p.id, type: "plant", label: p.botanical_name, href: `/plants/${p.id}` });
      link(f.id, p.id, "contains", null, []);
      for (const c of COMPOUNDS.filter((x) => x.plant_ids.includes(p.id))) {
        nodes.set(c.id, { id: c.id, type: "compound", label: c.name, href: `/compounds/${c.id}` });
        link(p.id, c.id, "contains compound", null, c.references);
        for (const l of c.links) {
          const t = TARGETS.find((x) => x.id === l.target);
          if (!t) continue;
          nodes.set(t.id, { id: t.id, type: "target", label: t.symbol, href: null });
          link(c.id, t.id, l.action, l.category, l.sources);
          for (const name of t.pathways) {
            const pid = `pw-${name}`;
            nodes.set(pid, { id: pid, type: "pathway", label: name, href: null });
            link(t.id, pid, "participates in", null, [
              { id: `src-${pid}`, database: "Demo Reference Set", accession: `DEMO-${pid.toUpperCase().replaceAll(" ", "-")}`, title: "[Fictional reference] Sample pathway record", year: null, url: null },
            ]);
          }
        }
      }
    }
  }
  return { nodes: [...nodes.values()], links: [...links.values()] };
}

async function route(method: string, url: URL, init: RequestInit): Promise<Response> {
  const data = getDb();
  const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const body = () => JSON.parse(String(init.body ?? "{}"));
  const key = `${method} /${seg[0] ?? ""}${seg[1] ? "/:id" : ""}${seg[2] ? `/${seg[2]}` : ""}`;

  switch (key) {
    case "GET /formulations":
      return json(data.formulations);
    case "POST /formulations": {
      const input = body() as FormulationInput;
      const f: Formulation = { ...input, id: uid(), manuscript_id: null, ingredients: toIngredients(input.ingredients), updated_at: now() };
      data.formulations = [f, ...data.formulations];
      save();
      return json(f, 201);
    }
    case "GET /formulations/:id": {
      const f = data.formulations.find((x) => x.id === seg[1]);
      return f ? json(f) : notFound("Formulation");
    }
    case "PUT /formulations/:id": {
      const f = data.formulations.find((x) => x.id === seg[1]);
      if (!f) return notFound("Formulation");
      const input = body() as FormulationInput;
      const next: Formulation = { ...f, ...input, ingredients: toIngredients(input.ingredients), updated_at: now() };
      data.formulations = data.formulations.map((x) => (x.id === f.id ? next : x));
      save();
      return json(next);
    }
    case "POST /formulations/:id/analyses": {
      const f = data.formulations.find((x) => x.id === seg[1]);
      if (!f) return notFound("Formulation");
      const id = uid();
      const a: Analysis = { id, formulation_id: f.id, formulation_name: f.name, status: "running", error: null, started_at: now(), completed_at: null, coverage: null, findings_count: 0 };
      data.analyses = [a, ...data.analyses];
      save();
      setTimeout(() => finishAnalysis(id), WORK_MS);
      return json(a, 201);
    }

    case "GET /manuscripts":
      return json(data.manuscripts);
    case "POST /manuscripts": {
      const file = (init.body as FormData).get("file") as File;
      const id = uid();
      const m: Manuscript = {
        id,
        filename: file.name,
        content_type: file.type,
        preview_url: URL.createObjectURL(file),
        status: "processing",
        error: null,
        uploaded_at: now(),
        ocr_text: null,
        ocr_confidence: null,
        ingredients: [],
        formulation_id: null,
      };
      data.manuscripts = [m, ...data.manuscripts];
      save();
      setTimeout(() => finishManuscript(id), WORK_MS);
      return json(m, 201);
    }
    case "GET /manuscripts/:id": {
      const m = data.manuscripts.find((x) => x.id === seg[1]);
      return m ? json(m) : notFound("Manuscript");
    }
    case "PATCH /manuscripts/:id": {
      const m = data.manuscripts.find((x) => x.id === seg[1]);
      if (!m) return notFound("Manuscript");
      const patch = body() as ManuscriptPatch;
      const next: Manuscript = {
        ...m,
        ocr_text: patch.ocr_text ?? m.ocr_text,
        ingredients: patch.ingredients
          ? patch.ingredients.map((p) => {
              const prior = m.ingredients.find((i) => i.id === p.id);
              return {
                id: p.id,
                traditional_name: p.traditional_name,
                plant_id: p.plant_id,
                botanical_name: PLANTS.find((x) => x.id === p.plant_id)?.botanical_name ?? null,
                status: p.status,
                confidence: prior?.confidence ?? null,
                rationale: prior?.rationale ?? null,
                candidates: prior?.candidates ?? [],
              };
            })
          : m.ingredients,
      };
      data.manuscripts = data.manuscripts.map((x) => (x.id === m.id ? next : x));
      save();
      return json(next);
    }
    case "POST /manuscripts/:id/confirm": {
      const m = data.manuscripts.find((x) => x.id === seg[1]);
      if (!m) return notFound("Manuscript");
      if (m.ingredients.some((i) => i.status === "uncertain")) {
        return json({ message: "Resolve every uncertain identification first." }, 409);
      }
      const input = body() as { name: string; tradition: string; period: string };
      const f: Formulation = {
        ...input,
        id: uid(),
        description: null,
        source_note: `Created from uploaded manuscript ${m.filename}.`,
        manuscript_id: m.id,
        updated_at: now(),
        ingredients: m.ingredients.map((i) => ({
          id: uid(),
          traditional_name: i.traditional_name,
          plant_id: i.plant_id,
          botanical_name: i.botanical_name,
          part_used: null,
          quantity: null,
          status: i.status,
        })),
      };
      data.formulations = [f, ...data.formulations];
      data.manuscripts = data.manuscripts.map((x) => (x.id === m.id ? { ...x, status: "confirmed", formulation_id: f.id } : x));
      save();
      return json(f, 201);
    }

    case "GET /plants":
      return json(PLANTS);
    case "GET /plants/:id": {
      const p = PLANTS.find((x) => x.id === seg[1]);
      return p ? json(p) : notFound("Plant");
    }
    case "GET /compounds/:id": {
      const c = COMPOUNDS.find((x) => x.id === seg[1]);
      return c ? json(compoundView(c)) : notFound("Compound");
    }

    case "GET /analyses":
      return json(data.analyses);
    case "GET /analyses/:id/findings":
      return json(data.findings.filter((x) => x.analysis_id === seg[1]));
    case "GET /findings/:id": {
      const f = data.findings.find((x) => x.id === seg[1]);
      return f ? json(f) : notFound("Finding");
    }
    case "POST /findings/:id/interpretation": {
      const f = data.findings.find((x) => x.id === seg[1]);
      if (!f) return notFound("Finding");
      return json({
        summary: `[Demo text, not generated by a model] ${f.compound_a.name} and ${f.compound_b.name} are both linked to ${f.target.symbol} in the fictional sample data. The weakest supporting evidence is ${f.category}.`,
        model: "Demo placeholder (no AI model was called)",
        generated_at: now(),
        caveats: ["A shared target does not establish synergy.", "This text describes fictional sample data."],
      });
    }

    case "GET /graph": {
      const analysisId = url.searchParams.get("analysis_id");
      const a = data.analyses.find((x) => x.id === analysisId);
      const scope = a ? data.formulations.filter((f) => f.id === a.formulation_id) : data.formulations;
      return json(buildGraph(scope));
    }
    default:
      return json({ message: `No demo route for ${method} ${url.pathname}.` }, 404);
  }
}

export async function demoFetch(path: string, init: RequestInit): Promise<Response> {
  await new Promise((resolve) => setTimeout(resolve, 200));
  return route(init.method ?? "GET", new URL(path, "http://demo.local"), init);
}
