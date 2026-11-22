## Code Style

- Make clean code and simple code. Do not over-engineer, stay KISS
- Code should be read as it executes. Keep orchestration at one level of abstraction. Express meaningful steps as named functions, with implementation details inside those functions. Do not make 35 micro functions/methods...
- Reuse code, dont repeat yourself
- Always aim to have a single source of truth
- Infer types as much as possible, but use explicit types to model a contract.
- Never make temporary stuff. Prefer not doing anything.
- Do not be defensive, don't overcheck, don't try catch etc... without a good (the user telling to) reason.
- Keep most things vanilla until there is a real need. Default behavior from libraries, framework etc... Should be kept, unless explicitly told otherwise.
- Keep implementations minimal within clear responsibility boundaries. A distinct responsibility with an established contract deserves its own type and implementation (that might be inferred), even with a single caller.
- Embrace the language, tools, framework and libraries before reinventing the wheel.
- If the current implementation does not fit the new needs, rework it first.
- Add code, configuration, or special handling only when the user requested the behavior or it is necessary to make the requested behavior work. Leave unrequested edge cases to the existing behavior. A conceivable case is not a requirement.
- Do not write code comments unless the user asks for them. Put the trade-offs in the PR body.

## Backend conventions

- Use the operation vocabulary Create, Info (by ID), List (offset/limit pagination), Update, Delete.
- Give Create and Update their own request DTOs, even when their fields currently match.
- Soft-deletable resources mark `deletedAt` and restore via `POST /:id/restore`.
- Delete is idempotent: deleting an absent resource succeeds with 204. Do not add an existence check, transaction, or explicit lock just to distinguish missing resources.
- Create an entity-oriented service only when multiple operations already share the same behavior. Grouping SDK calls or anticipating future reuse is not sufficient.
- Define HTTP request schemas with Zod in the resource's DTO files and validate them at the route boundary with `validator` from `hono-openapi`. Operations receive validated data; business validation stays in the operation.
- The OpenAPI document, `GET /api/openapi.json`, documents the API. It is generated from the authenticated routes: validators, `describeRoute` summaries and Zod descriptions. It is the single source of truth for the API reference, rendered by Scalar at `GET /api/docs`, and for the CLI, which derives its commands, flags and help from it.
- Represent expected business failures with Hono `HTTPException`, typed application error codes, and JSON responses. Introduce the shared error factory with its first real use; routes do not catch and rethrow these errors.
- Automated tests live in `tests/`. Read `tests/AGENTS.md` before you write, change or run one.

## Linting and formatting

- After making code changes, run `bun fix`.
- Before finishing, run `bun check`.
- Fix actionable lint and formatting issues. If a rule would require contorting otherwise clear, idiomatic code, treat that diagnostic as non-blocking and report the rule, location, and proposed resolution for arbitration. Keep the rule configuration unchanged pending arbitration.

## User

- The user will mostly interact in French, and so will you. But do not use French words for things we usually say in english (factory, breadcrumbs, state...)
- When the user gives examples, focus on the sense, not the exact prose. Quoted UI copy, names and prompts are examples of the intent: write the final wording yourself, unless the user tells you to use it as is.
- Concise and efficient answers. asd-ste100 inspiration.
- When the user says "vanilla". It means do nothing special, remove any customisation/workarounds etc...
  - It's a way to differentiate "don't do it" vs "do nothing".
  - "Should I add a refetch ?" -> "no refetch" could mean "config: {refetch: false}", or "config: {}". Vanilla explicits the later.
  - The resulting code should be just like we never talked about it.

## Project

- The dev environment is deployed on Cloudflare; the project is not in production. Breaking API and schema changes are allowed. For deployment, secrets or database setup, read `docs/deployment.md`.
- When a change adds or alters a user happy path, update `src/content/onboarding.md`, the guide a user's coding agent follows to set up Yapir.
- Design execution features for CI execution environments, such as GitLab CI and GitHub Actions. Yapir's own sandboxes will probably be removed: do not add support for them unless the user asks.
- When a change needs an operation that your access allows, such as a secret, a database change, a deploy or a verification, do it. Then report only what the user must do.
- `yapir-ai/ops`, checked out at `~/Projects/yapir-ops`, holds the configuration of the team instances, dev and takima, and the values of the development host. Read its `AGENTS.md` before you act on one of them.

## Local environment

- Run Yapir in a disposable instance: `bun instance up`. The skill `verify-yapir` tells how to drive it, and what to give the user when they ask to launch the app. Stop only the instances that you started, with `bun instance down <id>`. See `docs/local-development.md`.
- Run each smoke test and end-to-end scenario in a subagent, with a self-contained brief. Report its result.
- porthole records the webhooks of the local GitHub App, GitLab project and Jira site, in the sources `github`, `gitlab` and `jira`. `bun instance webhook` replays one to an instance. Read `http://127.0.0.1:5200/llms.txt` for the rest of its API.

## Documentation

- `src/content/` holds the documents Yapir ships: the glossary and the guides for users, their coding agents and the Assistant. The instance serves them at `/api/content`. Each one starts with a frontmatter `description`, which the index shows.
- `docs/` holds the documentation for contributors and operators.
- Write every document in ASD-STE100 Simplified Technical English, in the Google developer documentation style.
- Keep each document minimal: only what its reader needs to act. The code is the source of truth: point to it instead of restating it. Leave out session details and investigation history.

## Access

You got access to :

- gh cli
- wrangler cli
- yapir cli
- glab cli
- cf cli, for Cloudflare Access and Zero Trust. Wrangler cannot change them.
- a cloudflared tunnel to porthole, see `docs/local-development.md`

When using a technology for the first time, or a part of it that we've not used before. Fetch the relative documentation. Do not rely on your training knowledge.

## Codex sub-agents

Spawn Codex sub-agents with `model: "gpt-6.1-sol"`, `reasoning_effort: "high"`, and `fork_turns: "none"`. Each sub-agent starts with a fresh conversation context; provide a self-contained task brief containing only the context needed for its assignment.

## Agent skills

### Commmit

Use conventional commit, for both commits and PR titles as they are squashed and used as resulting commit.

When your environment creates a worktree and its branch for you, commit and push on that branch. Do not create or rename a branch: the environment then cannot clean up the worktree.

### Domain docs

This repository uses a single-context domain-doc layout. See `docs/agents/domain.md`.

### pstack

During a pstack run, pstack skills and their per-role model choices take precedence over the repository skills, such as `review` or `simplify`.
