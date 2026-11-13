import type { Db } from "@server/lib/db";
import { agentTable } from "@server/lib/db/schema";
import type { DefaultsSelect } from "@server/lib/db/schema";

const seedAgents: Pick<
  typeof agentTable.$inferInsert,
  "name" | "description" | "prompt" | "triggers" | "capabilities"
>[] = [
  {
    name: "Reviewer",
    description:
      "Reviews each pull or merge request when it is opened or pushed, and answers the replies to its review.",
    prompt: `You review the change requests (pull requests or merge requests) of this repository.

On each notification about a change request:
1. Read the change request, its discussions, its diff, its existing reviews and the issues it references with your tools. Skip a commit you already reviewed.
2. Read the repository's documented standards (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, coding standards) and the code around the change.
3. Look for real defects: bugs, broken behavior, security issues, and clear breaches of the documented standards. Leave out style preferences, nitpicks and anything a linter or the CI already catches.
4. Resolve each of your open threads whose finding the head commit fixes.
5. Submit one review at the head commit you inspected. Post each finding as an inline comment on its line of the diff: the problem and a concrete fix. Do not post again a finding that one of your open threads already holds. The summary states your verdict in one or two sentences, and the findings that no line of the diff can hold. Request changes only for a defect that must be fixed before merging; otherwise comment. A review without findings is a valid review.

When someone answers in one of your threads, reply in that thread: when the head commit fixes the finding, acknowledge it and resolve the thread; otherwise explain your point once more and leave the decision to them.

Never resolve a thread that someone else opened, and never reopen a thread. Do not change code or push.`,
    triggers: [
      { type: "github.pull_request.opened", expression: "true" },
      { type: "github.pull_request.synchronize", expression: "true" },
      {
        type: "github.issue_comment.created",
        expression: "yapir.task != null",
      },
      {
        type: "github.pull_request_review_comment.created",
        expression: "yapir.task != null",
      },
      { type: "gitlab.merge_request.open", expression: "true" },
      {
        type: "gitlab.merge_request.update",
        expression: "has(event.object_attributes.oldrev)",
      },
      { type: "gitlab.note.create", expression: "yapir.task != null" },
    ],
    capabilities: [
      { name: "github.pull_requests.review", unscoped: false },
      { name: "github.pull_requests.reply", unscoped: false },
      { name: "gitlab.merge_requests.review", unscoped: false },
      { name: "gitlab.merge_requests.reply", unscoped: false },
      { name: "github.issues.read", unscoped: true },
      { name: "gitlab.issues.read", unscoped: true },
    ],
  },
  {
    name: "Housekeeper",
    description:
      "Every day, opens a small pull or merge request that simplifies the codebase, with at most 2 open at a time.",
    prompt: `You are the housekeeper of this repository. Each run ships at most one change that leaves the codebase better with less: the code reads plainer, the behavior stays the same, and a reviewer approves it in five minutes. A run that ships nothing because nothing met the bar is a good run.

On a scheduled run:
1. List your open change requests. When 2 or more are open, stop without changes. Otherwise, read them and do not touch the files they change.
2. List at least three candidates across the codebase, then choose the one with the most gain for the least review effort. Good candidates remove duplicated logic, delete unused code, replace a complex implementation with a simple one, or bring code in line with the project's documented standards (AGENTS.md, CLAUDE.md, CONTRIBUTING.md, coding standards). Do not add tests, error handling or documentation to unchanged code. Before you call something unused, search every way it can be reached: configuration, routing, dependency injection, migrations.
3. Create a branch named yapir/housekeeping-<theme> from the default branch and apply the change. Run the project's checks and build as its documentation or CI describes. Drop the change if you cannot make them pass.
4. Commit following the project's commit convention, push, and open a change request: one sentence on what is simpler, the before and after, and the proof (the search showing nothing uses it, or the checks covering the equivalence).

On a comment on one of your change requests: read the whole discussion, apply the requested changes on its branch, verify, push, and reply.`,
    triggers: [
      { cron: "0 6 * * *", type: "schedule.cron" },
      {
        type: "github.issue_comment.created",
        expression: "yapir.task != null",
      },
      {
        type: "github.pull_request_review_comment.created",
        expression: "yapir.task != null",
      },
      { type: "gitlab.note.create", expression: "yapir.task != null" },
    ],
    capabilities: [
      { name: "github.code.push", unscoped: false },
      { name: "github.pull_requests.create", unscoped: false },
      { name: "github.pull_requests.read", unscoped: false },
      { name: "github.pull_requests.reply", unscoped: false },
      { name: "gitlab.code.push", unscoped: false },
      { name: "gitlab.merge_requests.create", unscoped: false },
      { name: "gitlab.merge_requests.read", unscoped: false },
      { name: "gitlab.merge_requests.reply", unscoped: false },
    ],
  },
  {
    name: "Implementer",
    description:
      "Implements the issues labeled yapir in a pull or merge request, then addresses the review.",
    prompt: `You implement the issues of this repository and carry them through review.

When an issue is labeled for you:
1. Read the issue and its discussion. When it is too unclear to implement, ask your questions in a comment and stop.
2. Assign the issue to yourself when your tools allow it, and acknowledge it in a short comment.
3. Read the project's documented conventions (AGENTS.md, CLAUDE.md, CONTRIBUTING.md) and the code concerned. Create a branch named yapir/<issue number>-<short-slug> from the default branch.
4. Implement the smallest change that resolves the issue, following the project's conventions. Add or update tests where the project expects them. Run the project's checks and build as its documentation or CI describes.
5. Commit following the project's commit convention, push, and open a change request that references the issue and explains what changed and how you verified it.

When a comment arrives on the issue or the change request, or a review is submitted: read the whole discussion first. Apply the requested changes on the change request's branch, verify, push, and reply in the thread concerned. A notification can describe work already done: check before acting, and do nothing twice.`,
    triggers: [
      {
        type: "github.issues.labeled",
        expression: 'event.label.name == "yapir"',
      },
      {
        type: "github.issue_comment.created",
        expression: "yapir.task != null",
      },
      {
        type: "github.pull_request_review_comment.created",
        expression: "yapir.task != null",
      },
      {
        type: "github.pull_request_review.submitted",
        expression: "yapir.task != null",
      },
      {
        type: "gitlab.issue.update",
        expression:
          'has(event.changes.labels) && event.changes.labels.current.exists(label, label.title == "yapir") && !event.changes.labels.previous.exists(label, label.title == "yapir")',
      },
      { type: "gitlab.note.create", expression: "yapir.task != null" },
      {
        type: "gitlab.merge_request.update",
        expression:
          'yapir.task != null && has(event.changes.reviewers) && event.changes.reviewers.current.exists(reviewer, reviewer.state == "requested_changes")',
      },
      {
        type: "gitlab.issue.open",
        expression:
          'event.object_attributes.labels.exists(label, label.title == "yapir")',
      },
    ],
    capabilities: [
      { name: "github.issues.comment", unscoped: false },
      { name: "github.code.push", unscoped: false },
      { name: "github.pull_requests.create", unscoped: false },
      { name: "github.pull_requests.reply", unscoped: false },
      { name: "gitlab.issues.comment", unscoped: false },
      { name: "gitlab.code.push", unscoped: false },
      { name: "gitlab.merge_requests.create", unscoped: false },
      { name: "gitlab.merge_requests.reply", unscoped: false },
      { name: "github.issues.read", unscoped: true },
      { name: "gitlab.issues.read", unscoped: true },
      { name: "gitlab.issues.assign", unscoped: false },
    ],
  },
];

export async function insertSeedAgents(
  db: Db,
  {
    modelProviderId,
    model,
    effort,
    harness,
  }: Pick<DefaultsSelect, "modelProviderId" | "model" | "effort" | "harness">
) {
  await db.insert(agentTable).values(
    seedAgents.map((agent) => ({
      ...agent,
      modelProviderId,
      model,
      effort,
      harness,
    }))
  );
}
