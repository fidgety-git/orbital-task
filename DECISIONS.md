# Feature Decision: Citations & Trust Levels

## Motivation

The goal is to reduce hallucinations and make uncertainty visible. In commercial real estate law, answers that sound plausible but are not based on data from the uploaded documents can undermine deals and the quality of advice — especially when the product presents every response with equal confidence.

## Why?

While building Part 1, I experienced the challenge firsthand: responses read as professional and authoritative, with no signal when the underlying fact was missing from the documents.

The 3-week beta data pointed to the same trust gap:

**From `customer_feedback.md`:**

- Partners described authoritative-sounding answers that are not in the document — including fabricated clause references — as “terrifying” on multi-million deals.
- One partner reported an associate stopping use after a hallucinated citation (“being confidently wrong is worse than being slow”).
- A partner said they would pay double for a product that signals uncertainty rather than inventing facts.
- An associate called section-specific citations “genuinely magic”; without them, they had to locate the source manually — “so what’s the point?”

**From `usage_events.csv`:**

- 302 AI responses across ~50 users; 49 (16%) recorded zero `sources_cited`.
- Thumbs-up feedback strongly correlated with cited answers: 75 of 77 followed a response with at least one source, versus only 2 on zero-citation responses.
- 32% of thumbs-down feedback events followed a zero-citation response.

The data flagged trust and hallucinations as the adoption risk and cited answers are far more likely to receive positive feedback.

## What?

Each assistant answer now carries **verified citations** and a **trust level** so users can see what is grounded in their documents before relying on it.

**How it works:**

1. **LLM output** — The model is prompted to end grounded answers with a structured `<citations>` JSON block (filename, page, excerpt, label). The block is stripped from the streamed text shown in chat; users see the prose only.
2. **Server-side verification** — The backend checks each citation against the conversation’s uploaded PDFs and marks whether the excerpt is actually present to verify the validity of the response.
3. **Trust scoring** — A banner reflects the outcome:
  - `high` — all citations verified
  - `partial` — some verified, some not, or the answer mixes grounded facts with “not found in documents” language
  - `unverified` — citations missing, empty, or none matched
  - `not_found` — the assistant abstained (information not in the uploaded documents)
4. **UI** — A trust banner sits above each assistant message. Verified citations appear as clickable chips (document + page); clicking opens the document viewer on that page with the excerpt highlighted. Unverified citations are shown but not clickable.

## Alternatives

Other improvements came up from the beta data, however none of them point to churn as strongly as confident wrong answers.

**Considered:**

- **Multi-document conversations** — users re-uploaded the same lease across chats. Worth fixing, but a workflow annoyance and personal preference rather than a strong reason to stop using the product.
- **Side-by-side clause comparison** — useful for cross-document review; depends on users believing the extracted text in the first place.
- **Report export** — reduces copy-paste; does not address fabricated or uncited answers.
- **In-viewer annotation / search** — quality-of-life improvements for manual review, not verification of AI output.

## Regression testing

Shipped alongside the feature: a 22-case golden set. Each case feeds a simulated LLM response and mock document text through citation parsing, excerpt matching, and trust scoring — without calling the model — so changes to verification logic or prompts can be regression-tested quickly.

An important next step improvement would be to create an evaluation dataset in a similar manner working directly with the LLM, so that prompt and model changes can be benchmarked before the change hits production. 

## Further improvements

With more time, we would:

- **Expand eval coverage** — grow the golden set with real production failure cases.
- **Measure trust in production** — track trust-level distribution and thumbs-down rates per trust level; iterate on prompt and verification thresholds from that data.
- **Turn answers into deliverables** — implement annotation, in-document highlighting, and document generation.

