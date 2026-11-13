---
name: grill-for-ready
description: Sharpen a slice of work until it is ready to delegate for implementation.
disable-model-invocation: true
---

Call the Skill tool with "/grilling", then run the session with this objective:

**Build a shared implementation design concrete enough that another developer would produce substantially the agreed solution, according to the user's merge criteria.**

Ground the interview in the existing code, project conventions, and the conversation. Establish what already exists and what change the user wants. Treat issues and plans according to their stated authority.

Constrain the design tree to decisions where a reasonable implementation could diverge from the user's intent: scope, behavior, responsibility boundaries, data ownership, contracts, consequential technical choices, and expressed implementation preferences.

Settle the target flow and its conditions, then work out the mechanisms needed to realize it and their assembly in the existing code. Do the design work before asking the user to review it. Build and refine one coherent plan across the conversation; choosing a technology does not settle how it integrates.

Present coherent parts of that design, connected to the target flow, using the smallest concrete artifact that makes them reviewable: target DX, a seam, domain models and relationships, a flow, technologies, or their assembly in code. These are examples, not a checklist. DX examples should show realistic use of the proposed design, not just a named factory or isolated signature. Incorporate implementation guidance volunteered by the user as constraints; challenge it when concrete evidence reveals a conflict.

Use established conventions to accelerate the interview: they settle choices without another approval round. Apply trivial details silently, and reference an existing pattern briefly only when needed to understand the design. Focus discussion on meaningful gaps and departures from those conventions.

Keep each exchange short and focused on one coherent part of the plan, with only the necessary artifact and recommendation. This overrides grilling's whole-frontier batching: retain the other open decisions for later turns. Avoid repeated recaps and disconnected micro-decisions. A precise choice in one area does not require equal detail everywhere else.

As answers arrive, update only what they affect. Keep agreed constraints, unconfirmed recommendations, and implementation discretion distinct.

The slice is ready when the user has understood and accepted the overall assembly and the consequential choices not already settled by conventions. Walk the target flow through the proposed implementation: another developer should be able to reproduce its main structure, contracts, and behavior without inventing the path. Remaining discretion must not materially change the agreed solution.

End with a concise, self-contained delegation brief: intended outcome, agreed constraints, relevant code references, and remaining implementation discretion. Implementation begins when the user requests it.
