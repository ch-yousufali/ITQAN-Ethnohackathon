# EthnoSynergy AI: Frontend

Research interface connecting ancient polyherbal formulations with modern molecular research.
Requirements are in [`../docs/PRD.md`](../docs/PRD.md). The API this app expects is in
[`../docs/API_CONTRACT.md`](../docs/API_CONTRACT.md).

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, TanStack Query and Table,
React Hook Form with Zod, and 3D Force Graph (Three.js).

## Setup

Requires Node.js 20.9 or later.

```bash
npm install
npm run dev      # http://localhost:3000, in demo mode
```

| Command         | Purpose                  |
| --------------- | ------------------------ |
| `npm run dev`   | Development server       |
| `npm run build` | Production build         |
| `npm start`     | Serve the build          |
| `npm run lint`  | ESLint                   |

## Connecting the backend

Create `.env.local`:

```bash
NEXT_PUBLIC_API_BASE_URL=https://your-api.example.com/v1
```

Restart the server, and the app uses the real API. No code changes are needed. The API must allow
cross-origin requests from the frontend's origin.

## Demo mode

Until the backend exists, `npm run dev` uses an in-browser stand-in (`src/lib/api/demo/`).

- **All demo data is fictional**: invented species, compounds, targets and references, named so they
  cannot be mistaken for real science. A banner stays visible on every page.
- **Uploaded files are not read.** The OCR output is fixed sample text, and it says so.
- Changes last for the browser tab's session.
- Production builds exclude it. To deploy a demo on purpose, set `NEXT_PUBLIC_DEMO_MODE=1` at build
  time. `NEXT_PUBLIC_API_BASE_URL` always takes priority.

With neither variable set, production builds show a "not configured" error rather than any data.

## Structure

```
src/app/                  One folder per screen: page.tsx (metadata) + view.tsx (client UI)
src/components/
  evidence.tsx            Evidence badges, sources, coverage, traceability rules
  data-table.tsx          Sortable table (TanStack Table)
  states.tsx              Loading, error and empty states
  ui.tsx                  Buttons, fields, layout primitives
src/lib/api/
  schemas.ts              API contract as Zod schemas; every response is validated
  http.ts                 Fetch wrapper and error types
  index.ts                TanStack Query hooks
  demo/                   Demo-mode stand-in for the backend
```

## How the scientific rules are enforced

| PRD rule | Implementation |
| --- | --- |
| Traceable sources | `isTraceable()` withholds any finding with an unsourced evidence item and states how many. The graph does the same for evidence links. |
| Distinguish evidence types | `EvidenceBadge` uses colour and a distinct shape. Findings are labelled with their weakest evidence. |
| Disclose coverage | `CoverageSummary` appears beside results and in history. Empty results note that absence of data is not evidence of absence. |
| Predictions are not proof | Finding Details separates measured and curated evidence from inferred and predicted evidence, and always shows a synergy disclaimer. |
| No medical claims | The UI makes none, and a research-only notice appears on every page. Backend-supplied text is shown as received, so the API must uphold this too. |
| Correctable results | OCR text is editable. Formulations cannot be created until uncertain identifications are resolved. |
| No fabricated data | Responses failing validation are not displayed. Missing values show as "Not available", never as defaults. |
