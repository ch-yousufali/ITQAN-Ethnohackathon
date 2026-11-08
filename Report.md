# Frontend Progress Report

**Date:** 6 November 2026

I went through your list and checked each point against the code on `main`. Some of it was already there, so I changed the plan in those places and explain why below. The frontend now works in demo mode and is ready to connect to a backend. These changes are not committed yet.

## What I finished

**1. Compound page (`/compounds/[id]`)**
This was the biggest gap on your list, so I did it first. It shows the structure, formula, molecular weight, SMILES, targets, references and source plants. The plant page already had this content inside an expandable row, so I moved it into a shared component instead of writing it twice. Finding details, the plant page and the demo graph now link to the new page.

**2. Evidence in the findings table**
You were right that the table never showed it. Each finding now has a row under it with the evidence category, statement, value and sources. I kept it visible on phones because the evidence is the main thing people need to trust a finding. Findings with an unsourced evidence item are still hidden.

**3. Pagination instead of search and filters**
Formulations already has search, plus tradition and period filters. What it was missing was pagination, because 1,035 rows would all render at once. So I added pagination to all tables: 25 rows per page, and a new search, filter or sort goes back to page 1.

**4. Back button on every page**
I added this because moving around the site wasn't easy. It takes you to the page you actually came from, so a compound opened from a finding goes back to that finding, not to Plants. If someone opens a page directly from a link, it goes to the parent page instead. It's built into the shared layout, so error and not-found pages get it too. The Overview page only shows it if there's a page to go back to.

## What I did not do yet, and why

| Item | Why | What I need |
| --- | --- | --- |
| Warmer palette | You said you'd send the exact CSS, so I don't want to guess it | Your CSS |
| Fraunces headings | It's part of the design pass, and I'll update the PRD because it currently says Inter | Your CSS first, so I can do the design in one go |
| Botanical SVGs | The colours should match the final palette | Your CSS |
| Dashboard redesign | The hero, stats, recent lists and quick actions already exist. They look plain, so this is a restyle and not a rebuild | Your CSS |
| Server-side pagination | The API shape has to be agreed first | A decision with the backend developer |
| Real plant data in demo mode | It wasn't on your list, so compound pages still show "Demo compound A1" | Your decision (question 3) |
| Findings list on the compound page | The API contract has no endpoint for it | A new endpoint, if you want this |
| Assay method and value on the compound page | The contract only has these on findings | A contract change, if you want this |

## Where the code was different from your list

| Your point | What I found | What I did |
| --- | --- | --- |
| No page uses `useCompound` or `smiles-drawer` | The plant page uses both, but there was no compound page of its own | Built the page |
| Dashboard needs a hero, stats, recent lists and quick actions | All of them already exist | Moved this to the design pass |
| 1,035 formulations with no way to find anything | Search and filters exist, and `main` only has 3 demo formulations | Added pagination |
| Findings table doesn't show evidence | Correct | Added it |

So I expect this to take less than the 4-5 days you estimated, though I still have to see how long the design pass takes.

## Questions for you

1. **Where do the 1,035 rows come from?** They aren't in this repo, and the search you mentioned as missing is already on `main`. Are you looking at another build or backend?
2. **Can you send the CSS?** The design pass is waiting on it.
3. **Do you want real plant data in the demo?** I've checked a Trikatu set (black pepper, long pepper, ginger) against PubChem and PubMed, but I haven't added it. The Sanskrit plant names still need checking.

## What has to be done on the backend

The backend isn't in this repo yet. This is what's needed, in the order I'd do it.

**1. Agree the API contract.** `docs/API_CONTRACT.md` is still only my proposal. If any field changes, `frontend/src/lib/api/schemas.ts` has to change with it.

**2. Build the endpoints in this order,** so each step unlocks a working screen:

| Order | Endpoints | What it unlocks |
| --- | --- | --- |
| 1 | `GET /plants`, `GET /plants/:id`, `GET /compounds/:id` | Plants and compound pages |
| 2 | `GET`, `POST /formulations`, `GET`, `PUT /formulations/:id` | Formulations and dashboard lists |
| 3 | `POST /formulations/:id/analyses`, `GET /analyses`, `GET /analyses/:id/findings`, `GET /findings/:id` | Findings, history and dashboard stats |
| 4 | `GET /graph?analysis_id=` | Knowledge graph |
| 5 | `GET`, `POST /manuscripts`, `GET`, `PATCH /manuscripts/:id`, `POST /manuscripts/:id/confirm` | Manuscript upload, OCR and review |
| 6 | `POST /findings/:id/interpretation` | AI interpretation |

**3. Follow these response rules.** The frontend checks every response, so these matter:

- **One bad row blocks the whole list.** For example, `tradition` and `period` must be strings, so one formulation with `period: null` makes the whole Formulations screen show an error. We should decide early if these can be null, because older records may not have them.
- Use `snake_case` JSON and ISO 8601 dates. Extra fields are fine.
- Send `null` for missing values, not placeholders.
- Send errors with the right HTTP status and `{ "message": "..." }`. Users see that message.
- Every evidence item needs at least one real source, or the finding is hidden.
- `Finding.category` must be the weakest evidence category.
- Completed analyses should return `coverage`, with gaps listed in `warnings`.
- Generated text must not claim proven synergy or medical efficacy, because it's shown as received.
- Return `uncertain` instead of guessing a plant, and answer `/confirm` with 409 while any are left.
- Analyses and manuscripts should return straight away with `running` or `processing`. The frontend polls until they finish.

**4. Allow CORS.** The browser calls the API directly, so it must allow `GET`, `POST`, `PUT`, `PATCH` and `OPTIONS`, the `Content-Type` and `Accept` headers, and our origins (`http://localhost:3000` and the deployed URL).

**5. Decide how large lists work.** Right now the API returns the full list and the browser handles search and pages. I'd measure this with the real data first. If it's too slow, I'd suggest the shape below, which would also need changes on my side:

```
GET /formulations?page=1&page_size=25&search=&tradition=&period=
→ { "items": [...], "total": 1035, "page": 1, "page_size": 25 }
```

**Still open:**
- Should `findings_count` leave out findings with no source?
- What are the upload limits? The frontend allows PNG, JPEG, TIFF, WebP and PDF up to 25 MB for now.
- Do we need login or per-user data? The PRD doesn't cover it.

## How I'll connect the backend

If the API follows the contract, no frontend code has to change.

1. Create `frontend/.env.local` with the API address, including any prefix like `/v1`:

   ```bash
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/v1
   ```

2. Restart the frontend with `npm run dev`.
3. Check that the yellow "Demo mode" banner is gone.
4. Go through the screens in the endpoint order above.
5. For deployment, set the same variable **before building**. It gets built into the app, so changing it later needs a rebuild.

If something goes wrong:

| What shows up | Likely cause | What to do |
| --- | --- | --- |
| "Could not reach the research API" | Wrong URL, API not running, or CORS | Check the URL, then CORS and the browser console |
| "The API response did not match the expected format" | Response differs from `schemas.ts` | The browser console logs `Contract mismatch on <path>` with the fields |
| "The research API returned an error (500)" | Backend error with no `message` | Check the backend logs |
| "The research API is not configured" | Production build without the URL | Set the variable and rebuild |
| Findings are hidden | Evidence has no sources | Return at least one source per evidence item |

## How I tested it

Type checks, lint and the production build all pass. I also ran the app in headless Chrome:

| Test | Checks | Result |
| --- | --- | --- |
| Temporary mock backend with 1,035 formulations | 19 | All passed |
| Demo mode, including phone width | 7 | All passed |
| Back button on every page, including browser back and forward | 31 | All passed |

- **Mock backend:** I ran this before adding the back button and didn't repeat it. It was also a temporary script, so a real backend could still show problems.
- **Not tested against an API yet:** manuscript upload and OCR, creating and editing formulations, starting an analysis, AI interpretation and the graph.
- **No automated tests:** the repo still has no test suite, and these checks aren't in it.
- **One back button edge case:** if someone goes back and then uses the browser's forward button to return to a page they'd visited twice, the button can skip to the parent page. It doesn't break anything.
