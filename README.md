<div align="center">

# ITQAN

### إتقان

**AI that reads ancient polyherbal formulations and surfaces cross-plant molecular findings — every one traced to measured evidence, not prediction.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Python 3.11](https://img.shields.io/badge/python-3.11-blue.svg)](https://www.python.org/downloads/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)](https://nextjs.org/)
[![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16-blue.svg)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://docs.docker.com/compose/)

*Itqan (Arabic: إتقان) — "precision, mastery, excellence in execution."*

</div>

---

## The problem

Traditional polyherbal formulations — Ayurvedic, TCM, Unani, and dozens of regional pharmacopoeias — represent centuries of accumulated empirical knowledge. Yet almost none have been analyzed as molecular systems. Cross-referencing 18,000+ compounds against 50,000+ protein targets for 1,000+ formulations, by hand, is a job no human has time for.

The bottleneck isn't skepticism. It's legibility.

## The solution

**ITQAN** turns a formulation into a ranked, evidence-traced research brief in seconds:

```
Ancient recipe → Molecular graph → Cross-plant findings → Testable hypotheses
```

You give it a polyherbal formulation. It gives you back a list of compound pairs — from *different* plants — that hit the *same* biological target, each one accompanied by measured potency, shared-target counts, and an LLM-generated mechanistic hypothesis with three specific wet-lab experiments to test it.

**Every claim traces to a database row.** No black boxes, no unverified predictions, no wellness claims.

---

## What it produces

For **Kaphaketu rasa** (3 ingredients, 2 with target data):

- **491 findings** ranked by `score × √(shared_targets)`
- **66.7% coverage** — honestly reported, not hidden
- **Interpretation latency:** 1.6s per finding

Example finding:

| Field | Value |
|---|---|
| Compound A | Piperlonguminine (*Piper longum*) |
| Compound B | Shogaol (*Zingiber officinale*) |
| Shared target | TRPV1 (Vanilloid receptor) |
| Measured potency | 6.31 nM vs 290 nM |
| Evidence tier | `MEASURED` |

**LLM interpretation:**

> *"Both may act as ligands for the Vanilloid receptor, with Piperlonguminine potentially exhibiting higher affinity. **Testable predictions:** (1) Competitive binding assay to determine binding site overlap. (2) Calcium flux assay in TRPV1-transfected cells. (3) Cryo-EM structural modeling of both binding poses. **Limitations:** in vitro binding does not confirm in vivo receptor engagement."*

That's not a treatment claim. That's a research proposal.

---

## Screenshots

<!-- EDIT: add screenshots after frontend verification -->

| | |
|---|---|
| **Dashboard** — research workflow and recent activity | `docs/screenshots/dashboard.png` |
| **Findings list** — ranked candidates with coverage | `docs/screenshots/findings.png` |
| **Finding detail** — evidence chain and LLM interpretation | `docs/screenshots/finding-detail.png` |
| **Manuscript upload** — OCR pipeline | `docs/screenshots/manuscripts.png` |

---

## Quick start

### Prerequisites

- **Docker** and **Docker Compose**
- **Python 3.11+** (for local scripts, optional)
- **Node.js 20+** (for the frontend)
- **API keys** (both free tier):
  - Groq — https://console.groq.com/keys
  - Google Gemini — https://aistudio.google.com/apikey

### 1. Clone

```bash
git clone git@github.com:nazil561/ITQAN.git
cd ITQAN
```

### 2. Configure environment

```bash
cd backend
cp .env.example .env
```

Edit `.env` and set:

```env
GROQ_API_KEY=gsk_your_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Bring up the backend

```bash
docker compose up -d --build
docker compose exec api alembic upgrade head
```

Verify:

```bash
curl http://localhost:8000/health
# {"status":"ok"}
```

### 4. Load IMPPAT data

Download the six TSV files from [cb.imsc.res.in/imppat/download](https://cb.imsc.res.in/imppat/download) into `backend/data/raw/imppat/`:

| File | Size |
|---|---|
| `Plant_Information_IMPPAT.tsv` | 529 KB |
| `Chemical_Information_IMPPAT_Phytochemicals.tsv` | 9.5 MB |
| `IMPPAT_Phytochemical_Plant_Association.tsv` | 15 MB |
| `Target_IMPPAT_Phytochemicals.tsv` | 2.2 MB |
| `Bioactivity_IMPPAT_Phytochemicals.tsv` | 2.8 MB |
| `IMPPAT_PolyHerbalFormulations.tsv` | 4.8 MB |

Then load in order:

```bash
docker compose exec api python -m app.etl.run_loader imppat_plants /code/data/raw/imppat
docker compose exec api python -m app.etl.run_loader imppat_compounds /code/data/raw/imppat
docker compose exec api python -m app.etl.run_loader imppat_formulations /code/data/raw/imppat
docker compose exec api python -m app.etl.run_loader imppat_associations /code/data/raw/imppat
docker compose exec api python -m app.etl.run_loader imppat_targets /code/data/raw/imppat
docker compose exec api python -m app.etl.run_loader imppat_bioactivity /code/data/raw/imppat
docker compose exec api python -m app.etl.backfill_external_ids
```

### 5. Run an analysis

```bash
docker compose exec api python -m app.analysis.run --name "Kaphaketu"
```

### 6. Start the frontend

```bash
cd ../frontend
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1" > .env.local
echo "NEXT_PUBLIC_DEMO_MODE=" >> .env.local
npm run dev
```

Open **http://localhost:3000**.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Next.js 16 Frontend                    │
│         (React 19, TanStack Query, Tailwind CSS 4)            │
└────────────────────────────┬─────────────────────────────────┘
                             │ REST /api/v1
┌────────────────────────────▼─────────────────────────────────┐
│                       FastAPI Backend                         │
│  ┌──────────────┬──────────────┬──────────────┬────────────┐ │
│  │ Formulations │   Findings   │  Manuscripts │  Analyses  │ │
│  └──────────────┴──────────────┴──────────────┴────────────┘ │
└──┬───────────────────┬────────────────────┬───────────────────┘
   │                   │                    │
   ▼                   ▼                    ▼
┌──────────┐    ┌──────────────┐    ┌───────────────────────┐
│ Postgres │    │ Analysis     │    │ LLM Layer             │
│   16     │    │ Engine       │    │ ┌─────────────────┐   │
│          │    │              │    │ │ Groq Qwen 3.8   │   │
│ 4,154    │    │ Cross-plant  │    │ │ (interpretation,│   │
│ plants   │    │ shared-target│    │ │  extraction)    │   │
│ 18,304   │    │ detection    │    │ └─────────────────┘   │
│ compounds│    │              │    │ ┌─────────────────┐   │
│ 196,181  │    │ Permutation  │    │ │ Gemini 3.8      │   │
│ edges    │    │ controls     │    │ │ Flash (OCR)     │   │
│          │    │              │    │ └─────────────────┘   │
└──────────┘    └──────────────┘    └───────────────────────┘
```

### The evidence model

Every edge in the database carries two columns most projects skip:

| Column | Values | Purpose |
|---|---|---|
| `evidence_tier` | `MEASURED`, `CURATED`, `INFERRED`, `PREDICTED` | Prevents predicting from being conflated with measurement |
| `manifest_id` | UUID → `data_manifests.id` | Every row traces to the exact loader run that produced it |

**This is the difference between a database and a scientific record.**

---

## Data provenance

All data derives from **IMPPAT 3.0** (Institute of Mathematical Sciences, Chennai).

| Entity | Count |
|---|---|
| Plants | 4,154 |
| Plant aliases | 10,149 |
| Compounds | 18,304 |
| Plant-compound edges | 196,181 |
| Protein targets | 4,150 |
| Compound-target edges | 56,577 |
| ↳ with measured activity | 17,734 |
| Formulations | 1,035 |
| Formulation ingredients | 13,860 |
| Universal external IDs | 23,493 |

**Reference:** Mohanraj, K. et al. *IMPPAT 3.0 — An enhanced database of Indian medicinal plants, phytochemicals, and therapeutic uses.* (2024).

**License:** The IMPPAT dataset is distributed under the terms specified at [cb.imsc.res.in/imppat](https://cb.imsc.res.in/imppat/). It is **not** included in this repository — the loaders fetch it from source.

---

## Tech stack

### Backend
`Python 3.11` · `FastAPI` · `Pydantic v2` · `SQLAlchemy 2.0 async` · `PostgreSQL 16` · `asyncpg` · `Alembic` · `Celery + Redis` · `pandas` · `rapidfuzz` · `unidecode` · `httpx` · `Docker Compose`

### AI / LLM (all free tier)
| Model | Provider | Purpose |
|---|---|---|
| Qwen 3.8 27B | Groq | Finding interpretation, ingredient extraction |
| Gemini 3.8 Flash | Google | OCR (with 4-model fallback chain) |

### Frontend
`Next.js 16` · `React 19` · `TypeScript` · `Tailwind CSS 4` · `TanStack Query` · `TanStack Table` · `react-hook-form + Zod` · `react-force-graph-3d` · `smiles-drawer`

### Infrastructure
Docker Compose · GitHub · *(planned)* Neon + Render — **$0 monthly cost**

---

## API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service health check |
| `GET/POST` | `/api/v1/formulations` | List / create formulations |
| `GET/PUT/DELETE` | `/api/v1/formulations/{id}` | Read / update / delete |
| `GET` | `/api/v1/plants` | List all plants |
| `GET` | `/api/v1/plants/{id}` | Plant detail with compounds |
| `GET` | `/api/v1/compounds/{id}` | Compound detail with targets |
| `GET` | `/api/v1/analyses` | List analysis runs |
| `GET` | `/api/v1/analyses/{id}` | Analysis run detail |
| `POST` | `/api/v1/formulations/{id}/analyses` | Trigger new analysis |
| `GET` | `/api/v1/analyses/{id}/findings` | Findings for a run |
| `GET` | `/api/v1/findings/{id}` | Single finding detail |
| `POST` | `/api/v1/findings/{id}/interpretation` | Generate LLM interpretation |
| `POST` | `/api/v1/manuscripts` | Upload manuscript image |
| `GET` | `/api/v1/manuscripts` | List uploaded manuscripts |
| `GET` | `/api/v1/manuscripts/{id}` | Manuscript with OCR + ingredients |
| `PATCH` | `/api/v1/manuscripts/{id}` | Correct OCR text / ingredients |
| `POST` | `/api/v1/manuscripts/{id}/confirm` | Create formulation from manuscript |

Full OpenAPI docs available at `http://localhost:8000/docs` when the backend is running.

---

## Ethical guardrails

These are non-negotiable and enforced in code, not just in policy:

1. **No efficacy claims.** The LLM system prompt explicitly bans the words "treats," "cures," "prevents," and "is effective for." Every interpretation is framed as a testable hypothesis.
2. **No conflation of tiers.** A `PREDICTED` edge can never render as `MEASURED` in the UI. Different color, different badge, different data flow.
3. **Coverage honesty.** Every finding view shows what fraction of the formulation is actually analyzed. If coverage drops below 50%, an amber banner appears.
4. **Deterministic validation.** Every ingredient extracted by OCR is cross-checked against a 10,149-alias table. Hallucinated names are dropped, not silently accepted.
5. **Full provenance.** Every finding can be traced to specific database rows with source citations. No finding is ever surfaced without evidence.

**ITQAN is a research tool. It is not a medical device, not a treatment recommendation system, and not a substitute for clinical judgment.**

---

## Limitations (honest)

- **Ayurveda only, for now.** The schema is universal — TCMSP, KNApSAcK, and NPASS plug in without migrations — but only IMPPAT is currently loaded.
- **Compound coverage is partial.** Many traditional plants have few or no target annotations. Findings are only as good as the underlying data.
- **Compound identity deduplication is imperfect.** The same molecule appearing in two plants can be treated as two compounds if InChIKeys differ slightly.
- **Plant-part specificity is partially captured.** IMPPAT records which part (root, leaf, seed) each compound was isolated from, but the analysis engine currently aggregates across parts.
- **OCR accuracy on historical manuscripts is untested at scale.** Gemini Flash handles modern Devanagari well. Historical, degraded, or unusual scripts will require the planned fine-tuned model.
- **No pathway-level analysis yet.** Findings are target-level. KEGG/Reactome integration is planned for v2.

---

## Roadmap

**Immediate**
- [ ] Graph endpoint (`GET /graph?analysis_id={id}`) for the 3D knowledge graph
- [ ] Deploy to Neon + Render
- [ ] Warm palette + botanical illustration pass on frontend
- [ ] End-to-end browser verification of all screens

**Short term**
- [ ] TCMSP integration (Chinese tradition — schema already ready)
- [ ] ChEMBL bioactivity (IC50/Ki at scale)
- [ ] Dr. Duke's ethnobotany (populate `plant_uses`)
- [ ] API rate limits + key authentication

**Medium term**
- [ ] Fine-tuned OCR model (if Gemini proves insufficient on historical manuscripts)
- [ ] KEGG/Reactome pathway integration
- [ ] Open submission to AIIA-iCAINE Ayurveda AI Challenge

**Long term**
- [ ] First peer-reviewed publication
- [ ] Wet-lab partnership to validate top 10 findings
- [ ] Global expansion (Africa, South America, Southeast Asia)

---

## Contributing

This is a solo project with a small team. Contributions are welcome in three areas:

1. **Data sources** — loaders for TCMSP, KNApSAcK, NPASS, Dr. Duke's
2. **Pathway data** — KEGG/Reactome integration
3. **Frontend** — see [`docs/PRD.md`](docs/PRD.md) for the specification

Open an issue before a PR. Pull requests without a linked issue will be closed.

---

## Team

<!-- EDIT: fill in your name, role, and links -->

**Founder & Backend Engineer** — *your name* — [GitHub](https://github.com/nazil561) · [LinkedIn](https://linkedin.com/in/yourhandle)

**Frontend Engineer** — *teammate name* — [GitHub](https://github.com/teammate)

---

## Acknowledgements

- **IMPPAT 3.0** — Institute of Mathematical Sciences, Chennai — for releasing the structured Ayurvedic dataset
- **Stanford OVAL (Churro)** and **DharmaOCR** — for proving Sanskrit OCR is a solved problem at scale
- **Groq** and **Google AI Studio** — for free-tier API access that made this project buildable by a solo founder
- **Every pharmacologist who ever said "sounds interesting, but how would you test it?"** — that question shaped this entire architecture

---

## License

MIT — see [LICENSE](LICENSE) for details.

**Data attribution:** The IMPPAT 3.0 dataset is the property of its authors and is licensed under the terms specified at [cb.imsc.res.in/imppat](https://cb.imsc.res.in/imppat/). This repository does not redistribute IMPPAT data — the loaders fetch it from source at runtime.

---

<div align="center">

**ITQAN — إتقان**

*We don't guess. We don't hope. We prove.*

</div>
