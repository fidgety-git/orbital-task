# Orbital — Product Engineering Take-Home

Welcome! This is a take-home assessment for a Product Engineering role at Orbital.

You've been given a working baseline application: a document Q&A tool for commercial real estate lawyers. Users upload legal documents (leases, title reports, environmental assessments) and ask questions about them. The AI assistant answers questions grounded in the document content.

The app works, but it has limitations. Your job is to extend it.

---

## Setup

### Prerequisites
- Docker and Docker Compose
- just (command runner) — install via `brew install just` or `cargo install just`

That's it. Everything else runs inside containers.

### Getting Started

1. Clone this repository

2. Run the setup command:
```
just setup
```
   This copies `.env.example` to `.env` and builds the Docker images.

3. Add your Anthropic API key to `.env`:
```
ANTHROPIC_API_KEY=your_key_here
```
   We've provided an API key in the task email. You can also use your own.

4. Start everything:
```
just dev
```
   This starts PostgreSQL, the FastAPI backend (port 8000), and the React frontend (port 5173).
   Database migrations run automatically when the backend starts — no separate step needed.

5. Open http://localhost:5173 in your browser.

Your local `backend/src/` and `frontend/src/` directories are mounted into the containers —
edit files normally on your machine and changes hot-reload automatically.

### Sample Documents

We've included sample legal documents in `sample-docs/` for testing.

### Project Structure

- `frontend/` — React frontend (Vite + Tailwind + shadcn/Radix UI)
- `backend/` — FastAPI backend (Python 3.12 + SQLAlchemy + PydanticAI)
- `alembic/` — Database migrations
- `data/` — Product analytics and customer feedback (for Part 2)
- `sample-docs/` — Sample PDF documents for testing

### Useful Commands

- `just dev` — Start full stack (Postgres + backend + frontend)
- `just stop` — Stop all services
- `just reset` — Stop everything and clear database
- `just check` — Run all linters and type checks
- `just fmt` — Format all code
- `just test` — Run backend (pytest) and frontend (vitest) tests
- `just eval-citations` — Run the citation/trust golden-set evaluation
- `just db-init` — Run database migrations
- `just db-shell` — Open a psql shell
- `just shell-backend` — Shell into backend container
- `just logs-backend` — Tail backend logs

---

## Citation & trust evaluation

Assistant answers include inline citations and a trust banner (`high`, `partial`, `unverified`, or `not_found`). The golden-set eval checks that citation parsing, excerpt verification, and trust scoring behave correctly **without calling the LLM** — each case feeds a simulated assistant response and mock document text through the same backend pipeline used in production.

### Golden set

Cases live in [`evals/citations-trust.json`](evals/citations-trust.json):

- **`documents`** — three mock PDFs (commercial lease, title report, environmental assessment) with page-marked extracted text
- **`cases`** — 22 scenarios covering exact matches, fuzzy paraphrase, page fallback, multi-document answers, fabricated excerpts, missing/malformed citation blocks, and abstention phrasing

Each case specifies:

| Field | Purpose |
|-------|---------|
| `document_refs` | Which mock documents are “uploaded” for the case |
| `response` | Simulated LLM output, including an optional `<citations>` JSON block |
| `expected.trust_level` | Expected trust score |
| `expected.verified_count` / `citation_count` | How many citations verify vs. total parsed |
| `expected.citations` | Optional per-citation checks (filename, resolved page, `verified`) |

### Running the eval

```bash
just eval-citations
```

This runs `backend/tests/test_citations_eval.py`, which parametrizes over every case in the golden set. **All 22 cases must pass** — failures print the mismatched field (trust level, counts, or citation details).

The eval is also included when you run `just test`.

### Adding cases

Copy an existing entry in `evals/citations-trust.json`, give it a unique `id`, and adjust `response` / `expected`. Re-run `just eval-citations` to confirm the new case passes.
