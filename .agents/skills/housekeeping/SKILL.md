---
name: housekeeping
description: Housekeeping pass. Finds one change that leaves the codebase better and simpler, and opens a small pull request.
disable-model-invocation: true
---

# Housekeeping

Each run ships at most one change, and that change leaves the codebase **better with less**. The code reads plainer, behaviour stays the same, and a reviewer approves it in five minutes. It removes weight: it takes out, merges, or straightens. It adds nothing new. A run that ships nothing because nothing met the bar is a good run.

## The intent

Judge a candidate by what it does to the codebase, not by which category it fits. These examples calibrate the judgement; they are not a checklist.

Changes in the spirit:

- deduplicating logic that exists in two places;
- removing an element that nothing uses;
- replacing a complex implementation detail with a simple, effective one;
- bringing code in line with a rule it breaks, from the project's documented standards (`CLAUDE.md`, `AGENTS.md`, coding standards).

Changes against the spirit: adding tests on unchanged code, adding try/catch, adding documentation. They add surface without making the code simpler. The code that is there must end up better, not more covered or more commented.

A good candidate usually shows these signals:

- The diff removes more than it adds. Conformance fixes are the exception: they can be neutral or add a little.
- The change has one theme and fits in one commit.
- A reviewer understands the change from the pull request description alone.

## Steps

Use the forge tools available to you (CLI, MCP...). If no tool supports a step, skip that step and say so in the report.

### 1. Start

The base branch is the integration branch (`develop` if it exists, else the default branch). Work in a new detached worktree from the up-to-date remote base branch. The branch is named once the candidate is chosen (step 4).

### 2. Read the ground

- Open pull requests: do not touch the files they change, to avoid conflicts.
- Closed, unmerged housekeeping pull requests: each one is a rejected idea. Read its description and skip that candidate.

Done when: you know which files are off-limits and which candidates were rejected.

### 3. Scout

List at least three candidates before you choose one. Look across the whole codebase: old code is where dead weight settles, and it is the most likely to need a cleanup.

Before you call something unused, search for it across `src/`, `scripts/`, `tests/`, `migrations/` and config. Check the ways code is reached without a direct call: Hono route mounting, file-based TanStack Router routes, awilix registration by name, `wrangler.jsonc` bindings and exported classes, Drizzle schema and migrations.

Choose the candidate with the most gain for the least review effort. If no candidate fits the intent, go to step 6 and send a "nothing to ship" report.

Done when: one candidate is chosen after you compared it with at least two others.

### 4. Apply

Create the branch `chore/housekeeping-<theme>`, where `<theme>` is a short kebab-case slug of the change (`chore/housekeeping-remove-unused-badge`). Keep the diff to the chosen theme. If you see an unrelated problem, put it in the report, not in the diff.

### 5. Verify

Run `bun check` and `bun run build`. When the change touches a user-facing path, verify it in an instance with the skill `verify-yapir`.

- If the change breaks the build, fix it or drop the change.
- If the build already fails on the base branch, report it and stop.

Then read the complete diff as the reviewer will read it.

Done when: the build is green, and the diff holds only the chosen theme.

### 6. Ship and report

Commit with the project's commit convention: `refactor:` for a simplification, `chore:` to remove config or a dependency. Push, then open the pull request on the base branch with `gh pr create`. The description, in the project's language:

```markdown
<One sentence: what is simplified.>

- Before / after: <the detail that makes the gain obvious.>
- Proof: <search showing nothing uses it, or the verification that covers the equivalence.>
```

Report to the user the pull request link, and any unrelated problem you saw.

On a "nothing to ship" run, remove the worktree and say so.
