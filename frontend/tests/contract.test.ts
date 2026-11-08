/**
 * Contract test: fetch every read endpoint from a running API and parse it with the
 * exact Zod schemas the app uses. A failure here is what users would see as
 * "The API response did not match the expected format".
 *
 *   npm run test:contract                       # against http://localhost:8000/api/v1
 *   API_URL=https://… npm run test:contract     # against another backend
 */
import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { z } from "zod";
import * as s from "../src/lib/api/schemas.ts";

const API = (process.env.API_URL ?? "http://localhost:8000/api/v1").replace(/\/$/, "");

async function get<S extends z.ZodType>(path: string, schema: S): Promise<z.output<S>> {
  const res = await fetch(API + path);
  assert.equal(res.status, 200, `${path} returned ${res.status}`);
  const parsed = schema.safeParse(await res.json());
  if (!parsed.success) {
    const issues = parsed.error.issues.slice(0, 5).map((i) => `  ${i.path.join(".")}: ${i.message}`);
    assert.fail(`${path} does not match the frontend schema:\n${issues.join("\n")}`);
  }
  return parsed.data;
}

let formulations: s.Formulation[] = [];
let plants: s.Plant[] = [];
let analyses: s.Analysis[] = [];

describe("API contract", () => {
  before(async () => {
    [formulations, plants, analyses] = await Promise.all([
      get("/formulations", z.array(s.formulation)),
      get("/plants", z.array(s.plant)),
      get("/analyses", z.array(s.analysis)),
    ]);
  });

  test("lists are non-empty", () => {
    assert.ok(formulations.length > 0, "no formulations");
    assert.ok(plants.length > 0, "no plants");
  });

  test("formulation detail", async () => {
    await get(`/formulations/${formulations[0].id}`, s.formulation);
  });

  test("plant and compound detail", async () => {
    const p = plants.find((x) => x.compounds.length > 0);
    assert.ok(p, "no plant with compounds");
    await get(`/plants/${p.id}`, s.plant);
    const c = await get(`/compounds/${p.compounds[0].id}`, s.compound);
    assert.ok(c.plant_ids.includes(p.id));
  });

  test("plant compound ids are unique (React keys)", () => {
    for (const p of plants) {
      const ids = p.compounds.map((c) => c.id);
      assert.equal(new Set(ids).size, ids.length, `duplicate compounds on ${p.botanical_name}`);
    }
  });

  test("manuscripts", async () => {
    const list = await get("/manuscripts", z.array(s.manuscript));
    if (list[0]) await get(`/manuscripts/${list[0].id}`, s.manuscript);
  });

  test("completed analyses carry coverage", () => {
    for (const a of analyses.filter((x) => x.status === "completed")) {
      assert.ok(a.coverage, `analysis ${a.id} is completed but has no coverage`);
    }
  });

  test("findings, finding detail and graph", async (t) => {
    const run = analyses.find((a) => a.status === "completed" && a.findings_count > 0);
    if (!run) return t.skip("no completed analysis with findings");
    const findings = await get(`/analyses/${run.id}/findings`, z.array(s.finding));
    assert.equal(findings.length, run.findings_count);
    for (const f of findings) {
      assert.ok(f.evidence.every((e) => e.sources.length > 0), `finding ${f.id} has unsourced evidence`);
    }
    const detail = await get(`/findings/${findings[0].id}`, s.finding);
    assert.equal(detail.rank, findings[0].rank);

    for (const path of [`/graph?analysis_id=${run.id}`, "/graph"]) {
      const g = await get(path, s.graph);
      const ids = new Set(g.nodes.map((n) => n.id));
      assert.ok(g.nodes.length > 0, `${path} is empty`);
      assert.ok(g.links.every((l) => ids.has(l.source) && ids.has(l.target)), `${path} has dangling links`);
    }
  });
});
