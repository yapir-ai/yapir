import type { RepositorySelect } from "@server/lib/db/schema";
import type { EffectService } from "@server/lib/effects/effect.service";
import type { ResourcePresentation } from "@server/lib/events/event-definition";
import { requireRepository } from "@server/lib/tasks/task.service";
import type {
  AssociationScope,
  TaskService,
} from "@server/lib/tasks/task.service";
import { repositoryInput, tool } from "@server/lib/tools/capability-definition";
import type {
  ToolCallContext,
  ToolContext,
} from "@server/lib/tools/capability-definition";
import { z } from "zod";

import {
  gitlabIidReference,
  gitlabReference,
  gitlabResourcePresentation,
  gitlabUserSchema,
} from "./gitlab-event";
import type { GitlabService } from "./gitlab.service";

const discussionFields = {
  id: z.number(),
  iid: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  state: z.string(),
  web_url: z.string(),
  author: gitlabUserSchema,
  assignees: z.array(gitlabUserSchema),
  labels: z.array(z.string()),
  created_at: z.string(),
  updated_at: z.string(),
  closed_at: z.string().nullable(),
};

const issueSchema = z.object({
  ...discussionFields,
  confidential: z.boolean(),
});

const mergeRequestSchema = z.object({
  ...discussionFields,
  draft: z.boolean(),
  source_branch: z.string(),
  target_branch: z.string(),
  sha: z.string().nullable(),
  detailed_merge_status: z.string().optional(),
  reviewers: z.array(gitlabUserSchema).optional(),
  merged_at: z.string().nullable(),
  diff_refs: z
    .object({
      base_sha: z.string(),
      head_sha: z.string(),
      start_sha: z.string(),
    })
    .nullish(),
});

const noteSchema = z.object({
  id: z.number(),
  body: z.string(),
  author: gitlabUserSchema,
  system: z.boolean(),
  type: z.string().nullable(),
  position: z.json().optional(),
  resolvable: z.boolean().optional(),
  resolved: z.boolean().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

const discussionSchema = z.object({
  id: z.string(),
  individual_note: z.boolean(),
  notes: z.array(noteSchema),
});

const diffSchema = z.object({
  old_path: z.string(),
  new_path: z.string(),
  diff: z.string(),
  new_file: z.boolean(),
  renamed_file: z.boolean(),
  deleted_file: z.boolean(),
});

const draftNoteSchema = z.object({
  id: z.number(),
  note: z.string(),
  commit_id: z.string().nullable(),
  discussion_id: z.string().nullable(),
  position: z.json().optional(),
});

const iid = z.number().int().positive();

// Its hex SHA keeps the request in the merge request's path.
const discussionId = z.string().regex(/^[0-9a-f]{40}$/u);

const page = {
  page: z.number().int().positive().optional(),
  per_page: z.number().int().min(1).max(100).optional(),
};

const date = z.iso.datetime({ offset: true }).optional();

const listFilters = {
  labels: z.string().optional().describe("Comma-separated label names"),
  search: z.string().optional(),
  author_username: z.string().optional(),
  assignee_username: z.string().optional(),
  created_after: date,
  created_before: date,
  updated_after: date,
  updated_before: date,
  sort: z.enum(["asc", "desc"]).optional(),
  ...page,
};

export function gitlabTools({
  gitlabService,
  taskService,
  effectService,
}: {
  gitlabService: GitlabService;
  taskService: TaskService;
  effectService: EffectService;
}) {
  const { request } = gitlabService;

  const apiPath = (repository: RepositorySelect) =>
    `/projects/${repository.externalId}`;

  const reference = (
    repository: RepositorySelect,
    kind: "issue" | "merge_request",
    number: number
  ) => gitlabIidReference(repository.host, kind, repository.externalId, number);

  async function requireIid(
    context: ToolCallContext,
    repository: RepositorySelect,
    kind: "issue" | "merge_request",
    number: number,
    scope: AssociationScope
  ) {
    return await taskService.requireScoped(
      context,
      reference(repository, kind, number),
      scope,
      async () => {
        // An unscoped call can reach a resource without association.
        const resource = await request(
          `${apiPath(repository)}/${kind}s/${number}`,
          issueSchema.pick({ iid: true, title: true, web_url: true })
        );

        return gitlabResourcePresentation(kind, resource, resource.web_url);
      }
    );
  }

  async function list<T extends z.ZodType>(
    context: ToolCallContext,
    repository: RepositorySelect,
    kind: "issue" | "merge_request",
    schema: T,
    query: Record<string, string | number | undefined>
  ) {
    const path = `${apiPath(repository)}/${kind}s`;

    if (context.unscoped) {
      return await request(path, z.array(schema), { query });
    }

    const ids = await taskService.associatedExternalIds(
      context.task,
      gitlabReference(repository.host, kind, "")
    );

    const iids = [...ids].flatMap((id) => {
      const [projectId, number] = id.split("#");

      return projectId === repository.externalId ? [Number(number)] : [];
    });

    return iids.length === 0
      ? []
      : await request(path, z.array(schema), { query: { ...query, iids } });
  }

  async function recordNote(
    context: ToolContext,
    repository: RepositorySelect,
    presentation: ResourcePresentation,
    note: { id: number }
  ) {
    await effectService.record(
      gitlabReference(repository.host, "note", note.id),
      { ...presentation, url: `${presentation.url}#note_${note.id}` },
      context
    );
  }

  async function postNote(
    context: ToolCallContext,
    repository: RepositorySelect,
    kind: "issue" | "merge_request",
    number: number,
    path: string,
    body: string
  ) {
    const presentation = await requireIid(
      context,
      repository,
      kind,
      number,
      "task"
    );

    const note = await request(
      `${apiPath(repository)}/${kind}s/${number}${path}/notes`,
      noteSchema,
      {
        method: "POST",
        body: { body: effectService.withHeader(body, context) },
      }
    );

    await recordNote(context, repository, presentation, note);

    return note;
  }

  const issuesShow = tool({
    name: "gitlab_issues_show",
    description:
      "Get an issue of a repository, as GitLab's GET /projects/:id/issues/:issue_iid.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_iid: iid,
    }),
    async execute({ repository: repositoryPath, issue_iid }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(context, repository, "issue", issue_iid, "automation");

      return await request(
        `${apiPath(repository)}/issues/${issue_iid}`,
        issueSchema
      );
    },
  });

  const issuesList = tool({
    name: "gitlab_issues_list",
    description:
      "List the issues of a repository, as GitLab's GET /projects/:id/issues.",
    inputSchema: z.object({
      repository: repositoryInput,
      state: z.enum(["opened", "closed", "all"]).optional(),
      order_by: z
        .enum(["created_at", "updated_at", "due_date", "priority", "title"])
        .optional(),
      ...listFilters,
    }),
    execute: async ({ repository: repositoryPath, ...query }, context) =>
      await list(
        context,
        requireRepository(context, repositoryPath),
        "issue",
        issueSchema,
        query
      ),
  });

  const issueNotesList = tool({
    name: "gitlab_issue_notes_list",
    description:
      "List the notes of an issue, as GitLab's GET /projects/:id/issues/:issue_iid/notes. Yapir agents' notes start with their name in bold.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_iid: iid,
      sort: z.enum(["asc", "desc"]).optional(),
      order_by: z.enum(["created_at", "updated_at"]).optional(),
      ...page,
    }),
    async execute(
      { repository: repositoryPath, issue_iid, ...query },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(context, repository, "issue", issue_iid, "automation");

      return await request(
        `${apiPath(repository)}/issues/${issue_iid}/notes`,
        z.array(noteSchema),
        { query }
      );
    },
  });

  const mergeRequestsShow = tool({
    name: "gitlab_merge_requests_show",
    description:
      "Get a merge request of a repository, with its diff_refs, as GitLab's GET /projects/:id/merge_requests/:merge_request_iid.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
    }),
    async execute({ repository: repositoryPath, merge_request_iid }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "automation"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}`,
        mergeRequestSchema
      );
    },
  });

  const mergeRequestsList = tool({
    name: "gitlab_merge_requests_list",
    description:
      "List the merge requests of a repository, as GitLab's GET /projects/:id/merge_requests.",
    inputSchema: z.object({
      repository: repositoryInput,
      state: z.enum(["opened", "closed", "locked", "merged", "all"]).optional(),
      reviewer_username: z.string().optional(),
      source_branch: z.string().optional(),
      target_branch: z.string().optional(),
      merged_after: date,
      merged_before: date,
      order_by: z
        .enum(["created_at", "updated_at", "merged_at", "title"])
        .optional(),
      ...listFilters,
    }),
    execute: async ({ repository: repositoryPath, ...query }, context) =>
      await list(
        context,
        requireRepository(context, repositoryPath),
        "merge_request",
        mergeRequestSchema,
        query
      ),
  });

  const mergeRequestsDiffs = tool({
    name: "gitlab_merge_requests_diffs",
    description:
      "List the file diffs of a merge request, as GitLab's GET /projects/:id/merge_requests/:merge_request_iid/diffs.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      ...page,
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, ...query },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "automation"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}/diffs`,
        z.array(diffSchema),
        { query }
      );
    },
  });

  const mergeRequestDiscussionsList = tool({
    name: "gitlab_merge_request_discussions_list",
    description:
      "List the discussions of a merge request, diff threads included, as GitLab's GET /projects/:id/merge_requests/:merge_request_iid/discussions. Yapir agents' notes start with their name in bold.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      ...page,
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, ...query },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "automation"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}/discussions`,
        z.array(discussionSchema),
        { query }
      );
    },
  });

  const issueNotesCreate = tool({
    name: "gitlab_issue_notes_create",
    description:
      "Comment on an issue, as GitLab's POST /projects/:id/issues/:issue_iid/notes.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_iid: iid,
      body: z.string().min(1),
    }),
    execute: async ({ repository: repositoryPath, issue_iid, body }, context) =>
      await postNote(
        context,
        requireRepository(context, repositoryPath),
        "issue",
        issue_iid,
        "",
        body
      ),
  });

  // Yapir's bot by default: the agent does not know its user ID.
  async function assigneeIds(assignee_ids?: number[]) {
    return (
      assignee_ids ?? [
        (await request("/user", gitlabUserSchema.pick({ id: true }))).id,
      ]
    );
  }

  const issuesEdit = tool({
    name: "gitlab_issues_edit",
    description:
      "Set the assignees of an issue, Yapir's bot by default, as GitLab's PUT /projects/:id/issues/:issue_iid with assignee_ids.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_iid: iid,
      assignee_ids: z.array(z.number().int().positive()).optional(),
    }),
    async execute(
      { repository: repositoryPath, issue_iid, assignee_ids },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(context, repository, "issue", issue_iid, "task");

      return await request(
        `${apiPath(repository)}/issues/${issue_iid}`,
        issueSchema,
        {
          method: "PUT",
          body: { assignee_ids: await assigneeIds(assignee_ids) },
        }
      );
    },
  });

  const mergeRequestsEdit = tool({
    name: "gitlab_merge_requests_edit",
    description:
      "Set the assignees of a merge request, Yapir's bot by default, as GitLab's PUT /projects/:id/merge_requests/:merge_request_iid with assignee_ids.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      assignee_ids: z.array(z.number().int().positive()).optional(),
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, assignee_ids },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "task"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}`,
        mergeRequestSchema,
        {
          method: "PUT",
          body: { assignee_ids: await assigneeIds(assignee_ids) },
        }
      );
    },
  });

  const issuesCreate = tool({
    name: "gitlab_issues_create",
    description:
      "Open an issue, as GitLab's POST /projects/:id/issues. The issue becomes associated with this task.",
    inputSchema: z.object({
      repository: repositoryInput,
      title: z.string().min(1),
      description: z.string().optional(),
      labels: z.string().optional().describe("Comma-separated label names"),
      confidential: z.boolean().optional(),
    }),
    async execute({ repository: repositoryPath, ...body }, context) {
      const repository = requireRepository(context, repositoryPath);

      const data = await request(`${apiPath(repository)}/issues`, issueSchema, {
        method: "POST",
        body,
      });

      const resource = reference(repository, "issue", data.iid);

      const presentation = gitlabResourcePresentation(
        "issue",
        data,
        data.web_url
      );

      await taskService.associate(context.task, resource, presentation);
      await effectService.record(resource, presentation, context);

      return data;
    },
  });

  const issuesUpdate = tool({
    name: "gitlab_issues_update",
    description:
      "Update an issue, as GitLab's PUT /projects/:id/issues/:issue_iid. Labels replace the current ones.",
    inputSchema: z.object({
      repository: repositoryInput,
      issue_iid: iid,
      title: z.string().min(1).optional(),
      description: z.string().optional(),
      labels: z.string().optional().describe("Comma-separated label names"),
      state_event: z.enum(["close", "reopen"]).optional(),
      confidential: z.boolean().optional(),
    }),
    async execute({ repository: repositoryPath, issue_iid, ...body }, context) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(context, repository, "issue", issue_iid, "task");

      return await request(
        `${apiPath(repository)}/issues/${issue_iid}`,
        issueSchema,
        { method: "PUT", body }
      );
    },
  });

  const mergeRequestsCreate = tool({
    name: "gitlab_merge_requests_create",
    description:
      "Open a merge request from a pushed branch, as GitLab's POST /projects/:id/merge_requests. Prefix the title with Draft: for a draft. The merge request becomes associated with this task.",
    inputSchema: z.object({
      repository: repositoryInput,
      source_branch: z.string().min(1),
      target_branch: z.string().min(1),
      title: z.string().min(1),
      description: z.string().optional(),
    }),
    async execute({ repository: repositoryPath, ...body }, context) {
      const repository = requireRepository(context, repositoryPath);

      const data = await request(
        `${apiPath(repository)}/merge_requests`,
        mergeRequestSchema,
        { method: "POST", body }
      );

      const resource = reference(repository, "merge_request", data.iid);

      const presentation = gitlabResourcePresentation(
        "merge_request",
        data,
        data.web_url
      );

      await taskService.associate(context.task, resource, presentation);
      await effectService.record(resource, presentation, context);

      return data;
    },
  });

  const mergeRequestApprovalsApprove = tool({
    name: "gitlab_merge_request_approvals_approve",
    description:
      "Approve a merge request at the commit you inspected, as GitLab's POST /projects/:id/merge_requests/:merge_request_iid/approve.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      sha: z.string().regex(/^[a-f0-9]{40}$/u),
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, sha },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "task"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}/approve`,
        z.object({
          approved_by: z.array(z.object({ user: gitlabUserSchema })),
        }),
        { method: "POST", body: { sha } }
      );
    },
  });

  const mergeRequestDraftNotesCreate = tool({
    name: "gitlab_merge_request_draft_notes_create",
    description:
      "Add a pending note to your review of a merge request, as GitLab's POST /projects/:id/merge_requests/:merge_request_iid/draft_notes. A position on a line of the diff opens a diff thread, as in GitLab's discussions API; take its SHAs from the merge request's diff_refs.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      note: z.string().min(1),
      in_reply_to_discussion_id: z.string().optional(),
      position: z
        .object({
          position_type: z.literal("text"),
          base_sha: z.string(),
          start_sha: z.string(),
          head_sha: z.string(),
          old_path: z.string().optional(),
          new_path: z.string(),
          old_line: z.number().int().positive().optional(),
          new_line: z.number().int().positive().optional(),
        })
        .optional(),
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, note, ...body },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "task"
      );

      return await request(
        `${apiPath(repository)}/merge_requests/${merge_request_iid}/draft_notes`,
        draftNoteSchema,
        {
          method: "POST",
          body: { ...body, note: effectService.withHeader(note, context) },
        }
      );
    },
  });

  const mergeRequestDraftNotesBulkPublish = tool({
    name: "gitlab_merge_request_draft_notes_bulk_publish",
    description:
      "Publish your pending review notes of a merge request, as GitLab's POST /projects/:id/merge_requests/:merge_request_iid/draft_notes/bulk_publish. note adds your review's summary, and reviewer_state sets its state.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      note: z.string().min(1).optional(),
      reviewer_state: z.enum(["reviewed", "requested_changes"]).optional(),
    }),
    async execute(
      { repository: repositoryPath, merge_request_iid, note, reviewer_state },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);

      const presentation = await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "task"
      );

      const path = `${apiPath(repository)}/merge_requests/${merge_request_iid}`;

      const drafts = await request(
        `${path}/draft_notes`,
        z.array(draftNoteSchema)
      );

      const summary = note && effectService.withHeader(note, context);

      await request(`${path}/draft_notes/bulk_publish`, z.null(), {
        method: "POST",
        body: { note: summary, reviewer_state },
      });
      // The published notes are effects: they are identified by their bodies.
      const bodies = new Set([...drafts.map((draft) => draft.note), summary]);

      const notes = await request(`${path}/notes`, z.array(noteSchema), {
        query: { sort: "desc", per_page: 100 },
      });

      const published = notes.filter(
        ({ body, system }) => !system && bodies.has(body)
      );

      for (const publishedNote of published) {
        await recordNote(context, repository, presentation, publishedNote);
      }

      return { published: published.length };
    },
  });

  const mergeRequestDiscussionsResolve = tool({
    name: "gitlab_merge_request_discussions_resolve",
    description:
      "Resolve a diff thread that you opened, once its finding is fixed, as GitLab's PUT /projects/:id/merge_requests/:merge_request_iid/discussions/:discussion_id with resolved.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      discussion_id: discussionId,
      resolved: z.boolean().default(true),
    }),
    async execute(
      {
        repository: repositoryPath,
        merge_request_iid,
        discussion_id,
        resolved,
      },
      context
    ) {
      const repository = requireRepository(context, repositoryPath);
      await requireIid(
        context,
        repository,
        "merge_request",
        merge_request_iid,
        "task"
      );
      const path = `${apiPath(repository)}/merge_requests/${merge_request_iid}/discussions/${discussion_id}`;
      const discussion = await request(path, discussionSchema);
      await effectService.requireThreadAuthor(
        gitlabReference(repository.host, "note", discussion.notes[0]!.id),
        context
      );

      return await request(path, discussionSchema, {
        method: "PUT",
        body: { resolved },
      });
    },
  });

  const mergeRequestNotesCreate = tool({
    name: "gitlab_merge_request_notes_create",
    description:
      "Post a general comment on a merge request, as GitLab's POST /projects/:id/merge_requests/:merge_request_iid/notes.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      body: z.string().min(1),
    }),
    execute: async (
      { repository: repositoryPath, merge_request_iid, body },
      context
    ) =>
      await postNote(
        context,
        requireRepository(context, repositoryPath),
        "merge_request",
        merge_request_iid,
        "",
        body
      ),
  });

  const mergeRequestDiscussionsAddNote = tool({
    name: "gitlab_merge_request_discussions_add_note",
    description:
      "Reply in a discussion thread of a merge request, as GitLab's POST /projects/:id/merge_requests/:merge_request_iid/discussions/:discussion_id/notes.",
    inputSchema: z.object({
      repository: repositoryInput,
      merge_request_iid: iid,
      discussion_id: discussionId,
      body: z.string().min(1),
    }),
    execute: async (
      { repository: repositoryPath, merge_request_iid, discussion_id, body },
      context
    ) =>
      await postNote(
        context,
        requireRepository(context, repositoryPath),
        "merge_request",
        merge_request_iid,
        `/discussions/${discussion_id}`,
        body
      ),
  });

  return {
    issuesShow,
    issuesList,
    issueNotesList,
    mergeRequestsShow,
    mergeRequestsList,
    mergeRequestsDiffs,
    mergeRequestDiscussionsList,
    issueNotesCreate,
    issuesEdit,
    issuesCreate,
    issuesUpdate,
    mergeRequestsEdit,
    mergeRequestsCreate,
    mergeRequestApprovalsApprove,
    mergeRequestDraftNotesCreate,
    mergeRequestDraftNotesBulkPublish,
    mergeRequestDiscussionsResolve,
    mergeRequestNotesCreate,
    mergeRequestDiscussionsAddNote,
  };
}
