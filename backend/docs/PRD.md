# EthnoSynergy AI — Frontend PRD

**Objective:** Build a scientific research platform that connects ancient polyherbal formulations with modern molecular research.

## 1. Main Screens

**1. Dashboard**
- Project overview and research statistics.
- Recent formulations and analyses.
- Buttons to upload a manuscript or explore formulations.

**2. Formulations**
- Browse and search traditional formulations.
- Filter by tradition and historical period.
- View formulation details and ingredients.
- Create or edit formulations.

**3. Manuscript Upload & OCR**
- Upload ancient manuscript images or PDFs.
- Extract text using OCR and AI image understanding.
- Display extracted text for review.
- Identify traditional ingredient names.
- Map ingredients to modern botanical names.
- Allow users to correct uncertain identifications.

**4. Plant & Phytochemical Explorer**
- Display botanical information.
- Show compounds associated with each plant.
- Display chemical structures and biological targets where available.
- Provide scientific database references.

**5. Molecular Findings**
- Display relationships between compounds from different plants.
- Show shared biological targets and pathways.
- Rank candidate molecular relationships.
- Filter by evidence category and interaction type.
- Display coverage and missing-data warnings.

**6. Finding Details**
- Show Compound A → Target ← Compound B.
- Display supporting scientific evidence.
- Show source references and confidence information.
- Separate measured evidence from computational predictions.

**7. Interactive Knowledge Graph**
- Connect formulations, plants, compounds, targets and pathways.
- Support zooming, searching, filtering and clicking nodes.
- Display relationship details and evidence sources.

**8. Analysis History**
- Display previous analysis runs.
- Show status, date, coverage and findings count.
- Allow users to reopen previous analyses.

## 2. Design Requirements

- Professional scientific research aesthetic.
- Off-white background with botanical green accents.
- Inter typography and serif botanical names.
- Clean tables and readable scientific information.
- Minimal animations.
- Responsive desktop and mobile layouts.
- No generic admin dashboard appearance.

Evidence colors:
- MEASURED: Green
- CURATED: Blue
- INFERRED: Amber
- PREDICTED: Violet

## 3. Technology Stack

- React / Next.js
- TypeScript
- Tailwind CSS
- TanStack Query
- TanStack Table
- React Hook Form + Zod
- Three.js / 3D Force Graph
- Fetch API

Follow the existing repository architecture instead of unnecessarily rebuilding it.

## 4. Backend Integration

Integrate with backend APIs for:

- Formulations.
- Manuscript upload and OCR.
- Ingredient identification.
- Plant information.
- Phytochemical compounds.
- Molecular analysis.
- Findings and evidence.
- AI interpretation.
- Analysis history.

Coordinate API contracts with the backend developer.

## 5. Non-Negotiable Rules

1. Every scientific finding must have a traceable source.
2. Clearly distinguish MEASURED, CURATED, INFERRED and PREDICTED evidence.
3. Always disclose missing molecular data and analysis coverage.
4. Never present computational predictions as experimentally proven synergy.
5. No unsupported medical efficacy or treatment claims.
6. Allow users to review and correct uncertain OCR and plant identification results.
7. Never fabricate scientific data.

## 6. Final Deliverables

- Complete responsive frontend.
- All eight screens.
- Manuscript upload and OCR review interface.
- Backend API integration.
- Molecular findings dashboard.
- Interactive knowledge graph.
- Evidence explorer.
- Analysis history.
- Error, loading and empty states.
- Clean source code and setup documentation.

**Definition of Done:** A researcher can upload an ancient polyherbal formulation, verify its ingredients, explore its molecular relationships, inspect scientific evidence and navigate the complete research journey through one application.
