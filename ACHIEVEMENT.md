# Coupa ERP Integration

## Problem Context

One of the most technically challenging projects I have led was the architecture and implementation of a major ERP integration between Omnea and Coupa. The goal was to let enterprise customers sync business-critical procurement and supplier data between their ERP and Omnea — including suppliers, purchase requisitions, and purchase orders.

Strategically, this work mattered for Omnea because it unlocked a higher-value enterprise customer segment and became a competitive requirement in procurement deals. It ultimately enabled customer deals worth approximately **£440K ARR** and opened access to a **£150M market segment**.

For the user, this integration was an essential fundamental block that we needed to get right and ensure their data is processed accurately, timely, and consistently.

## Complexity & Constraints

The difficulty came from both the external system and our own platform limitations.

- **Unreliable external API behaviour.** Coupa’s APIs and documentation were inconsistent and often unreliable. Some endpoints silently dropped data while still returning successful `200` responses. For example, when creating purchase requisitions, attachment payloads would disappear without actually adding the files with no validation or error from the API. Beyond that, the API introduced operational constraints: long-running sync jobs, rate limiting, workflows that could not be parallelised, inconsistent authentication patterns, and non-standard endpoint behaviour.
- **A mismatch with our workflow model.** Omnea’s procurement workflow assumed a relatively synchronous purchase order flow as this is what we had seen with other ERPs we integrate with. Coupa, by contrast, operates around an asynchronous purchase requisition → purchase order lifecycle. Supporting that properly required rethinking how we tracked state over time rather than treating each sync as a one-shot transaction.
- **Broader data model requirements.** We also found that some integrations required multi-level hierarchical data, not the simpler single-level models our platform previously supported. That expanded the architectural scope of the work and increased the pressure to build something reusable for future ERP integrations, not just a one-off Coupa adapter.

As the primary engineer leading architecture and implementation, I had to deliver against these constraints while keeping the integration correct for enterprise procurement use cases.

## Approach

I designed the integration around **resilience and correctness**.

- **Defensive verification for critical paths.** After identifying silent data loss early in development, I introduced follow-up `GET` validation for important operations — confirming that the external system had actually persisted data, rather than relying solely on success responses. For lower-risk inconsistencies, we documented known API limitations and handled them pragmatically to avoid unnecessary operational overhead.
- **Asynchronous reconciliation.** To support Coupa’s procurement lifecycle, I implemented scheduled polling and state-based workflow tracking to reconcile requisition and purchase order states over time. That let us handle eventual consistency and delayed downstream object creation while staying within rate limits and other API constraints. This has since unlocked additional value as the implementation has expanded to support polling on syncronous integrations for the purposes of confirming invoiced and paid amounts against each order, a feature many of our customers love.
- **A more flexible integration model.** I expanded the platform’s integration layer to support hierarchical parent–child reference data structures required by Coupa customers, which also increased its flexibility for future ERP support.
- **Trade-offs.** The main trade-off was operational cost versus confidence: extra read-back validation and polling added complexity and API usage, but they were necessary given Coupa’s behaviour. Where the business risk was lower, we consciously chose documentation and pragmatic handling over building heavy compensating logic for every API quirk.

## Impact

Commercially, the integration enabled enterprise deals worth approximately **£440K ARR** and helped Omnea compete in a much larger enterprise procurement segment (**£150M market segment**).

Operationally, it established a stronger enterprise integration capability within the platform and allowed Omnea to meet procurement integration expectations common in larger customer deals — turning what had been a competitive gap into something we could sell against.

## Reflection

One of the biggest lessons was about assumptions in enterprise integrations. Earlier in my career, I had mostly worked with modern APIs designed for engineers, where documentation and behaviour were generally reliable. This project showed that I could not assume external systems would behave as documented.

If I tackled it again, I would invest earlier in validation tooling, contract testing, and exploratory testing against real API behaviour — rather than relying heavily on documentation during design. That would surface silent failure modes sooner and reduce rework once integrations were in development.

The project also sharpened my view of what good API and integration design looks like from the consumer’s side. That perspective now directly influences how I design systems and developer-facing interfaces myself: clear contracts, observable failures, and behaviour that matches documentation matter because downstream teams cannot safely build on top of silent inconsistency.