export const effectKinds = new Map<
  string,
  { label: string; action?: string; group?: "changeRequest" | "comment" }
>([
  // A GitHub pull request is an issue of its repository.
  [
    "issue",
    { label: "Pull request", action: "Opened", group: "changeRequest" },
  ],
  ["pull_request", { label: "Pull request", action: "Opened" }],
  [
    "merge_request",
    { label: "Merge request", action: "Opened", group: "changeRequest" },
  ],
  ["review", { label: "Review", action: "Reviewed" }],
  [
    "review_comment",
    { label: "Review comment", action: "Replied on", group: "comment" },
  ],
  [
    "issue_comment",
    { label: "Comment", action: "Commented on", group: "comment" },
  ],
  ["note", { label: "Comment", action: "Commented on", group: "comment" }],
  ["comment", { label: "Comment", action: "Commented on", group: "comment" }],
  ["changelog", { label: "Assignment" }],
  ["commit", { label: "Commit", action: "Pushed to" }],
]);

function kindsOf(group: "changeRequest" | "comment") {
  return [...effectKinds].flatMap(([name, kind]) =>
    kind.group === group ? [name] : []
  );
}

export const changeRequestKinds = kindsOf("changeRequest");

export const commentKinds = kindsOf("comment");
