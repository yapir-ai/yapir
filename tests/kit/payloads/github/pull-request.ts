import type { EmitterWebhookEvent } from "@octokit/webhooks";

type PullRequestOpenedPayload =
  EmitterWebhookEvent<"pull_request.opened">["payload"];

// A pull_request.opened delivery that GitHub sent, with fictitious names and IDs.
export function pullRequestOpenedPayload(
  override?: Partial<PullRequestOpenedPayload>
): PullRequestOpenedPayload {
  return {
    action: "opened",
    number: 202,
    pull_request: {
      url: "https://api.github.com/repos/octo-org/octo-repo/pulls/202",
      id: 9005,
      node_id: "N_0001",
      html_url: "https://github.com/octo-org/octo-repo/pull/202",
      diff_url: "https://github.com/octo-org/octo-repo/pull/202.diff",
      patch_url: "https://github.com/octo-org/octo-repo/pull/202.patch",
      issue_url: "https://api.github.com/repos/octo-org/octo-repo/issues/202",
      number: 202,
      state: "open",
      locked: false,
      title: "Add the release notes",
      user: {
        login: "octo-app[bot]",
        id: 9004,
        node_id: "N_0002",
        avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/octo-app%5Bbot%5D",
        html_url: "https://github.com/apps/octo-app",
        followers_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/followers",
        following_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/following{/other_user}",
        gists_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/subscriptions",
        organizations_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/orgs",
        repos_url: "https://api.github.com/users/octo-app%5Bbot%5D/repos",
        events_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/received_events",
        type: "Bot",
        user_view_type: "public",
        site_admin: false,
      },
      body: "Adds the release notes.",
      created_at: "2026-10-29T11:28:39Z",
      updated_at: "2026-10-29T11:28:39Z",
      closed_at: null,
      merged_at: null,
      merge_commit_sha: null,
      assignees: [],
      requested_reviewers: [],
      requested_teams: [],
      labels: [],
      milestone: null,
      draft: false,
      commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/202/commits",
      review_comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/202/comments",
      review_comment_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/comments{/number}",
      comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/202/comments",
      statuses_url:
        "https://api.github.com/repos/octo-org/octo-repo/statuses/4a55f39a6f5dd6ffd80493e1d9da9015444e6c9a",
      head: {
        label: "octo-org:release-notes",
        ref: "release-notes",
        sha: "4a55f39a6f5dd6ffd80493e1d9da9015444e6c9a",
        user: {
          login: "octo-org",
          id: 9003,
          node_id: "N_0003",
          avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/octo-org",
          html_url: "https://github.com/octo-org",
          followers_url: "https://api.github.com/users/octo-org/followers",
          following_url:
            "https://api.github.com/users/octo-org/following{/other_user}",
          gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
          subscriptions_url:
            "https://api.github.com/users/octo-org/subscriptions",
          organizations_url: "https://api.github.com/users/octo-org/orgs",
          repos_url: "https://api.github.com/users/octo-org/repos",
          events_url: "https://api.github.com/users/octo-org/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/octo-org/received_events",
          type: "Organization",
          user_view_type: "public",
          site_admin: false,
        },
        repo: {
          id: 9001,
          node_id: "N_0004",
          name: "octo-repo",
          full_name: "octo-org/octo-repo",
          private: true,
          owner: {
            login: "octo-org",
            id: 9003,
            node_id: "N_0003",
            avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
            gravatar_id: "",
            url: "https://api.github.com/users/octo-org",
            html_url: "https://github.com/octo-org",
            followers_url: "https://api.github.com/users/octo-org/followers",
            following_url:
              "https://api.github.com/users/octo-org/following{/other_user}",
            gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
            starred_url:
              "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
            subscriptions_url:
              "https://api.github.com/users/octo-org/subscriptions",
            organizations_url: "https://api.github.com/users/octo-org/orgs",
            repos_url: "https://api.github.com/users/octo-org/repos",
            events_url:
              "https://api.github.com/users/octo-org/events{/privacy}",
            received_events_url:
              "https://api.github.com/users/octo-org/received_events",
            type: "Organization",
            user_view_type: "public",
            site_admin: false,
          },
          html_url: "https://github.com/octo-org/octo-repo",
          description: null,
          fork: false,
          url: "https://api.github.com/repos/octo-org/octo-repo",
          forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
          keys_url:
            "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
          collaborators_url:
            "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
          teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
          hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
          issue_events_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
          events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
          assignees_url:
            "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
          branches_url:
            "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
          tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
          blobs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
          git_tags_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
          git_refs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
          trees_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
          statuses_url:
            "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
          languages_url:
            "https://api.github.com/repos/octo-org/octo-repo/languages",
          stargazers_url:
            "https://api.github.com/repos/octo-org/octo-repo/stargazers",
          contributors_url:
            "https://api.github.com/repos/octo-org/octo-repo/contributors",
          subscribers_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscribers",
          subscription_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscription",
          commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
          git_commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
          comments_url:
            "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
          issue_comment_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
          contents_url:
            "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
          compare_url:
            "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
          merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
          archive_url:
            "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
          downloads_url:
            "https://api.github.com/repos/octo-org/octo-repo/downloads",
          issues_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
          pulls_url:
            "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
          milestones_url:
            "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
          notifications_url:
            "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
          labels_url:
            "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
          releases_url:
            "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
          deployments_url:
            "https://api.github.com/repos/octo-org/octo-repo/deployments",
          created_at: "2024-12-13T12:01:46Z",
          updated_at: "2026-10-26T13:53:44Z",
          pushed_at: "2026-10-29T11:28:35Z",
          git_url: "git://github.com/octo-org/octo-repo.git",
          ssh_url: "git@github.com:octo-org/octo-repo.git",
          clone_url: "https://github.com/octo-org/octo-repo.git",
          svn_url: "https://github.com/octo-org/octo-repo",
          homepage: null,
          size: 35,
          stargazers_count: 0,
          watchers_count: 0,
          language: "Java",
          has_issues: true,
          has_projects: true,
          // oxlint-disable-next-line typescript/no-deprecated GitHub still sends it, and the Octokit type requires it.
          has_downloads: false,
          has_wiki: false,
          has_pages: false,
          has_discussions: false,
          forks_count: 0,
          mirror_url: null,
          archived: false,
          disabled: false,
          open_issues_count: 6,
          license: null,
          allow_forking: false,
          is_template: false,
          web_commit_signoff_required: false,
          topics: [],
          visibility: "private",
          forks: 0,
          open_issues: 6,
          watchers: 0,
          default_branch: "main",
          allow_squash_merge: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_auto_merge: false,
          delete_branch_on_merge: false,
          allow_update_branch: false,
          squash_merge_commit_message: "COMMIT_MESSAGES",
          squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
          merge_commit_message: "PR_TITLE",
          merge_commit_title: "MERGE_MESSAGE",
        },
      },
      base: {
        label: "octo-org:main",
        ref: "main",
        sha: "ee3f405ec6ada2a153c46be6415a5620d589ebde",
        user: {
          login: "octo-org",
          id: 9003,
          node_id: "N_0003",
          avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/octo-org",
          html_url: "https://github.com/octo-org",
          followers_url: "https://api.github.com/users/octo-org/followers",
          following_url:
            "https://api.github.com/users/octo-org/following{/other_user}",
          gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
          subscriptions_url:
            "https://api.github.com/users/octo-org/subscriptions",
          organizations_url: "https://api.github.com/users/octo-org/orgs",
          repos_url: "https://api.github.com/users/octo-org/repos",
          events_url: "https://api.github.com/users/octo-org/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/octo-org/received_events",
          type: "Organization",
          user_view_type: "public",
          site_admin: false,
        },
        repo: {
          id: 9001,
          node_id: "N_0004",
          name: "octo-repo",
          full_name: "octo-org/octo-repo",
          private: true,
          owner: {
            login: "octo-org",
            id: 9003,
            node_id: "N_0003",
            avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
            gravatar_id: "",
            url: "https://api.github.com/users/octo-org",
            html_url: "https://github.com/octo-org",
            followers_url: "https://api.github.com/users/octo-org/followers",
            following_url:
              "https://api.github.com/users/octo-org/following{/other_user}",
            gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
            starred_url:
              "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
            subscriptions_url:
              "https://api.github.com/users/octo-org/subscriptions",
            organizations_url: "https://api.github.com/users/octo-org/orgs",
            repos_url: "https://api.github.com/users/octo-org/repos",
            events_url:
              "https://api.github.com/users/octo-org/events{/privacy}",
            received_events_url:
              "https://api.github.com/users/octo-org/received_events",
            type: "Organization",
            user_view_type: "public",
            site_admin: false,
          },
          html_url: "https://github.com/octo-org/octo-repo",
          description: null,
          fork: false,
          url: "https://api.github.com/repos/octo-org/octo-repo",
          forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
          keys_url:
            "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
          collaborators_url:
            "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
          teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
          hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
          issue_events_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
          events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
          assignees_url:
            "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
          branches_url:
            "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
          tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
          blobs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
          git_tags_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
          git_refs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
          trees_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
          statuses_url:
            "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
          languages_url:
            "https://api.github.com/repos/octo-org/octo-repo/languages",
          stargazers_url:
            "https://api.github.com/repos/octo-org/octo-repo/stargazers",
          contributors_url:
            "https://api.github.com/repos/octo-org/octo-repo/contributors",
          subscribers_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscribers",
          subscription_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscription",
          commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
          git_commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
          comments_url:
            "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
          issue_comment_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
          contents_url:
            "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
          compare_url:
            "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
          merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
          archive_url:
            "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
          downloads_url:
            "https://api.github.com/repos/octo-org/octo-repo/downloads",
          issues_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
          pulls_url:
            "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
          milestones_url:
            "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
          notifications_url:
            "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
          labels_url:
            "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
          releases_url:
            "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
          deployments_url:
            "https://api.github.com/repos/octo-org/octo-repo/deployments",
          created_at: "2024-12-13T12:01:46Z",
          updated_at: "2026-10-26T13:53:44Z",
          pushed_at: "2026-10-29T11:28:35Z",
          git_url: "git://github.com/octo-org/octo-repo.git",
          ssh_url: "git@github.com:octo-org/octo-repo.git",
          clone_url: "https://github.com/octo-org/octo-repo.git",
          svn_url: "https://github.com/octo-org/octo-repo",
          homepage: null,
          size: 35,
          stargazers_count: 0,
          watchers_count: 0,
          language: "Java",
          has_issues: true,
          has_projects: true,
          // oxlint-disable-next-line typescript/no-deprecated GitHub still sends it, and the Octokit type requires it.
          has_downloads: false,
          has_wiki: false,
          has_pages: false,
          has_discussions: false,
          forks_count: 0,
          mirror_url: null,
          archived: false,
          disabled: false,
          open_issues_count: 6,
          license: null,
          allow_forking: false,
          is_template: false,
          web_commit_signoff_required: false,
          topics: [],
          visibility: "private",
          forks: 0,
          open_issues: 6,
          watchers: 0,
          default_branch: "main",
          allow_squash_merge: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_auto_merge: false,
          delete_branch_on_merge: false,
          allow_update_branch: false,
          squash_merge_commit_message: "COMMIT_MESSAGES",
          squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
          merge_commit_message: "PR_TITLE",
          merge_commit_title: "MERGE_MESSAGE",
        },
      },
      _links: {
        self: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202",
        },
        html: { href: "https://github.com/octo-org/octo-repo/pull/202" },
        issue: {
          href: "https://api.github.com/repos/octo-org/octo-repo/issues/202",
        },
        comments: {
          href: "https://api.github.com/repos/octo-org/octo-repo/issues/202/comments",
        },
        review_comments: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202/comments",
        },
        review_comment: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/comments{/number}",
        },
        commits: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202/commits",
        },
        statuses: {
          href: "https://api.github.com/repos/octo-org/octo-repo/statuses/4a55f39a6f5dd6ffd80493e1d9da9015444e6c9a",
        },
      },
      author_association: "NONE",
      auto_merge: null,
      assignee: null,
      active_lock_reason: null,
      merged: false,
      mergeable: null,
      rebaseable: null,
      mergeable_state: "unknown",
      merged_by: null,
      comments: 0,
      review_comments: 0,
      maintainer_can_modify: false,
      commits: 1,
      additions: 3,
      deletions: 0,
      changed_files: 1,
    },
    repository: {
      id: 9001,
      node_id: "N_0004",
      name: "octo-repo",
      full_name: "octo-org/octo-repo",
      private: true,
      owner: {
        login: "octo-org",
        id: 9003,
        node_id: "N_0003",
        avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/octo-org",
        html_url: "https://github.com/octo-org",
        followers_url: "https://api.github.com/users/octo-org/followers",
        following_url:
          "https://api.github.com/users/octo-org/following{/other_user}",
        gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/octo-org/subscriptions",
        organizations_url: "https://api.github.com/users/octo-org/orgs",
        repos_url: "https://api.github.com/users/octo-org/repos",
        events_url: "https://api.github.com/users/octo-org/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/octo-org/received_events",
        type: "Organization",
        user_view_type: "public",
        site_admin: false,
      },
      html_url: "https://github.com/octo-org/octo-repo",
      description: null,
      fork: false,
      url: "https://api.github.com/repos/octo-org/octo-repo",
      forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
      keys_url: "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
      collaborators_url:
        "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
      teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
      hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
      issue_events_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
      events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
      assignees_url:
        "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
      branches_url:
        "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
      tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
      blobs_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
      git_tags_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
      git_refs_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
      trees_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
      statuses_url:
        "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
      languages_url:
        "https://api.github.com/repos/octo-org/octo-repo/languages",
      stargazers_url:
        "https://api.github.com/repos/octo-org/octo-repo/stargazers",
      contributors_url:
        "https://api.github.com/repos/octo-org/octo-repo/contributors",
      subscribers_url:
        "https://api.github.com/repos/octo-org/octo-repo/subscribers",
      subscription_url:
        "https://api.github.com/repos/octo-org/octo-repo/subscription",
      commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
      git_commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
      comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
      issue_comment_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
      contents_url:
        "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
      compare_url:
        "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
      merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
      archive_url:
        "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
      downloads_url:
        "https://api.github.com/repos/octo-org/octo-repo/downloads",
      issues_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
      pulls_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
      milestones_url:
        "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
      notifications_url:
        "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
      labels_url:
        "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
      releases_url:
        "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
      deployments_url:
        "https://api.github.com/repos/octo-org/octo-repo/deployments",
      created_at: "2024-12-13T12:01:46Z",
      updated_at: "2026-10-26T13:53:44Z",
      pushed_at: "2026-10-29T11:28:35Z",
      git_url: "git://github.com/octo-org/octo-repo.git",
      ssh_url: "git@github.com:octo-org/octo-repo.git",
      clone_url: "https://github.com/octo-org/octo-repo.git",
      svn_url: "https://github.com/octo-org/octo-repo",
      homepage: null,
      size: 35,
      stargazers_count: 0,
      watchers_count: 0,
      language: "Java",
      has_issues: true,
      has_projects: true,
      has_downloads: false,
      has_wiki: false,
      has_pages: false,
      has_discussions: false,
      forks_count: 0,
      mirror_url: null,
      archived: false,
      disabled: false,
      open_issues_count: 6,
      license: null,
      allow_forking: false,
      is_template: false,
      web_commit_signoff_required: false,
      topics: [],
      visibility: "private",
      forks: 0,
      open_issues: 6,
      watchers: 0,
      default_branch: "main",
      custom_properties: {},
    },
    organization: {
      login: "octo-org",
      id: 9003,
      node_id: "N_0003",
      url: "https://api.github.com/orgs/octo-org",
      repos_url: "https://api.github.com/orgs/octo-org/repos",
      events_url: "https://api.github.com/orgs/octo-org/events",
      hooks_url: "https://api.github.com/orgs/octo-org/hooks",
      issues_url: "https://api.github.com/orgs/octo-org/issues",
      members_url: "https://api.github.com/orgs/octo-org/members{/member}",
      public_members_url:
        "https://api.github.com/orgs/octo-org/public_members{/member}",
      avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
      description: null,
    },
    sender: {
      login: "octo-app[bot]",
      id: 9004,
      node_id: "N_0002",
      avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/octo-app%5Bbot%5D",
      html_url: "https://github.com/apps/octo-app",
      followers_url: "https://api.github.com/users/octo-app%5Bbot%5D/followers",
      following_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/following{/other_user}",
      gists_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/subscriptions",
      organizations_url: "https://api.github.com/users/octo-app%5Bbot%5D/orgs",
      repos_url: "https://api.github.com/users/octo-app%5Bbot%5D/repos",
      events_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/received_events",
      type: "Bot",
      user_view_type: "public",
      site_admin: false,
    },
    installation: {
      id: 9002,
      node_id: "N_0005",
    },
    ...override,
  };
}

type PullRequestSynchronizePayload =
  EmitterWebhookEvent<"pull_request.synchronize">["payload"];

// A pull_request.synchronize delivery of the same pull request.
export function pullRequestSynchronizePayload(
  override?: Partial<PullRequestSynchronizePayload>
): PullRequestSynchronizePayload {
  return {
    action: "synchronize",
    number: 202,
    pull_request: {
      url: "https://api.github.com/repos/octo-org/octo-repo/pulls/202",
      id: 9005,
      node_id: "N_0001",
      html_url: "https://github.com/octo-org/octo-repo/pull/202",
      diff_url: "https://github.com/octo-org/octo-repo/pull/202.diff",
      patch_url: "https://github.com/octo-org/octo-repo/pull/202.patch",
      issue_url: "https://api.github.com/repos/octo-org/octo-repo/issues/202",
      number: 202,
      state: "open",
      locked: false,
      title: "Add the release notes",
      user: {
        login: "octo-app[bot]",
        id: 9004,
        node_id: "N_0002",
        avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/octo-app%5Bbot%5D",
        html_url: "https://github.com/apps/octo-app",
        followers_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/followers",
        following_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/following{/other_user}",
        gists_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/subscriptions",
        organizations_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/orgs",
        repos_url: "https://api.github.com/users/octo-app%5Bbot%5D/repos",
        events_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/octo-app%5Bbot%5D/received_events",
        type: "Bot",
        user_view_type: "public",
        site_admin: false,
      },
      body: "Adds the release notes.",
      created_at: "2026-10-29T11:28:39Z",
      updated_at: "2026-10-29T11:30:49Z",
      closed_at: null,
      merged_at: null,
      merge_commit_sha: "62dce06f46735ccbea3ebd888983b1e377958fe4",
      assignees: [],
      requested_reviewers: [],
      requested_teams: [],
      labels: [],
      milestone: null,
      draft: false,
      commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/202/commits",
      review_comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/202/comments",
      review_comment_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls/comments{/number}",
      comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/202/comments",
      statuses_url:
        "https://api.github.com/repos/octo-org/octo-repo/statuses/2bfa0f710fecfd72b1096f9fe5e3b23401bd5dc2",
      head: {
        label: "octo-org:release-notes",
        ref: "release-notes",
        sha: "2bfa0f710fecfd72b1096f9fe5e3b23401bd5dc2",
        user: {
          login: "octo-org",
          id: 9003,
          node_id: "N_0003",
          avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/octo-org",
          html_url: "https://github.com/octo-org",
          followers_url: "https://api.github.com/users/octo-org/followers",
          following_url:
            "https://api.github.com/users/octo-org/following{/other_user}",
          gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
          subscriptions_url:
            "https://api.github.com/users/octo-org/subscriptions",
          organizations_url: "https://api.github.com/users/octo-org/orgs",
          repos_url: "https://api.github.com/users/octo-org/repos",
          events_url: "https://api.github.com/users/octo-org/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/octo-org/received_events",
          type: "Organization",
          user_view_type: "public",
          site_admin: false,
        },
        repo: {
          id: 9001,
          node_id: "N_0004",
          name: "octo-repo",
          full_name: "octo-org/octo-repo",
          private: true,
          owner: {
            login: "octo-org",
            id: 9003,
            node_id: "N_0003",
            avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
            gravatar_id: "",
            url: "https://api.github.com/users/octo-org",
            html_url: "https://github.com/octo-org",
            followers_url: "https://api.github.com/users/octo-org/followers",
            following_url:
              "https://api.github.com/users/octo-org/following{/other_user}",
            gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
            starred_url:
              "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
            subscriptions_url:
              "https://api.github.com/users/octo-org/subscriptions",
            organizations_url: "https://api.github.com/users/octo-org/orgs",
            repos_url: "https://api.github.com/users/octo-org/repos",
            events_url:
              "https://api.github.com/users/octo-org/events{/privacy}",
            received_events_url:
              "https://api.github.com/users/octo-org/received_events",
            type: "Organization",
            user_view_type: "public",
            site_admin: false,
          },
          html_url: "https://github.com/octo-org/octo-repo",
          description: null,
          fork: false,
          url: "https://api.github.com/repos/octo-org/octo-repo",
          forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
          keys_url:
            "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
          collaborators_url:
            "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
          teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
          hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
          issue_events_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
          events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
          assignees_url:
            "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
          branches_url:
            "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
          tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
          blobs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
          git_tags_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
          git_refs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
          trees_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
          statuses_url:
            "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
          languages_url:
            "https://api.github.com/repos/octo-org/octo-repo/languages",
          stargazers_url:
            "https://api.github.com/repos/octo-org/octo-repo/stargazers",
          contributors_url:
            "https://api.github.com/repos/octo-org/octo-repo/contributors",
          subscribers_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscribers",
          subscription_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscription",
          commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
          git_commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
          comments_url:
            "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
          issue_comment_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
          contents_url:
            "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
          compare_url:
            "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
          merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
          archive_url:
            "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
          downloads_url:
            "https://api.github.com/repos/octo-org/octo-repo/downloads",
          issues_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
          pulls_url:
            "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
          milestones_url:
            "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
          notifications_url:
            "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
          labels_url:
            "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
          releases_url:
            "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
          deployments_url:
            "https://api.github.com/repos/octo-org/octo-repo/deployments",
          created_at: "2024-12-13T12:01:46Z",
          updated_at: "2026-10-26T13:53:44Z",
          pushed_at: "2026-10-29T11:30:48Z",
          git_url: "git://github.com/octo-org/octo-repo.git",
          ssh_url: "git@github.com:octo-org/octo-repo.git",
          clone_url: "https://github.com/octo-org/octo-repo.git",
          svn_url: "https://github.com/octo-org/octo-repo",
          homepage: null,
          size: 35,
          stargazers_count: 0,
          watchers_count: 0,
          language: "Java",
          has_issues: true,
          has_projects: true,
          has_downloads: false,
          has_wiki: false,
          has_pages: false,
          has_discussions: false,
          forks_count: 0,
          mirror_url: null,
          archived: false,
          disabled: false,
          open_issues_count: 6,
          license: null,
          allow_forking: false,
          is_template: false,
          web_commit_signoff_required: false,
          topics: [],
          visibility: "private",
          forks: 0,
          open_issues: 6,
          watchers: 0,
          default_branch: "main",
          allow_squash_merge: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_auto_merge: false,
          delete_branch_on_merge: false,
          allow_update_branch: false,
          squash_merge_commit_message: "COMMIT_MESSAGES",
          squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
          merge_commit_message: "PR_TITLE",
          merge_commit_title: "MERGE_MESSAGE",
        },
      },
      base: {
        label: "octo-org:main",
        ref: "main",
        sha: "ee3f405ec6ada2a153c46be6415a5620d589ebde",
        user: {
          login: "octo-org",
          id: 9003,
          node_id: "N_0003",
          avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
          gravatar_id: "",
          url: "https://api.github.com/users/octo-org",
          html_url: "https://github.com/octo-org",
          followers_url: "https://api.github.com/users/octo-org/followers",
          following_url:
            "https://api.github.com/users/octo-org/following{/other_user}",
          gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
          starred_url:
            "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
          subscriptions_url:
            "https://api.github.com/users/octo-org/subscriptions",
          organizations_url: "https://api.github.com/users/octo-org/orgs",
          repos_url: "https://api.github.com/users/octo-org/repos",
          events_url: "https://api.github.com/users/octo-org/events{/privacy}",
          received_events_url:
            "https://api.github.com/users/octo-org/received_events",
          type: "Organization",
          user_view_type: "public",
          site_admin: false,
        },
        repo: {
          id: 9001,
          node_id: "N_0004",
          name: "octo-repo",
          full_name: "octo-org/octo-repo",
          private: true,
          owner: {
            login: "octo-org",
            id: 9003,
            node_id: "N_0003",
            avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
            gravatar_id: "",
            url: "https://api.github.com/users/octo-org",
            html_url: "https://github.com/octo-org",
            followers_url: "https://api.github.com/users/octo-org/followers",
            following_url:
              "https://api.github.com/users/octo-org/following{/other_user}",
            gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
            starred_url:
              "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
            subscriptions_url:
              "https://api.github.com/users/octo-org/subscriptions",
            organizations_url: "https://api.github.com/users/octo-org/orgs",
            repos_url: "https://api.github.com/users/octo-org/repos",
            events_url:
              "https://api.github.com/users/octo-org/events{/privacy}",
            received_events_url:
              "https://api.github.com/users/octo-org/received_events",
            type: "Organization",
            user_view_type: "public",
            site_admin: false,
          },
          html_url: "https://github.com/octo-org/octo-repo",
          description: null,
          fork: false,
          url: "https://api.github.com/repos/octo-org/octo-repo",
          forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
          keys_url:
            "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
          collaborators_url:
            "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
          teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
          hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
          issue_events_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
          events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
          assignees_url:
            "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
          branches_url:
            "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
          tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
          blobs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
          git_tags_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
          git_refs_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
          trees_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
          statuses_url:
            "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
          languages_url:
            "https://api.github.com/repos/octo-org/octo-repo/languages",
          stargazers_url:
            "https://api.github.com/repos/octo-org/octo-repo/stargazers",
          contributors_url:
            "https://api.github.com/repos/octo-org/octo-repo/contributors",
          subscribers_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscribers",
          subscription_url:
            "https://api.github.com/repos/octo-org/octo-repo/subscription",
          commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
          git_commits_url:
            "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
          comments_url:
            "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
          issue_comment_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
          contents_url:
            "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
          compare_url:
            "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
          merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
          archive_url:
            "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
          downloads_url:
            "https://api.github.com/repos/octo-org/octo-repo/downloads",
          issues_url:
            "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
          pulls_url:
            "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
          milestones_url:
            "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
          notifications_url:
            "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
          labels_url:
            "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
          releases_url:
            "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
          deployments_url:
            "https://api.github.com/repos/octo-org/octo-repo/deployments",
          created_at: "2024-12-13T12:01:46Z",
          updated_at: "2026-10-26T13:53:44Z",
          pushed_at: "2026-10-29T11:30:48Z",
          git_url: "git://github.com/octo-org/octo-repo.git",
          ssh_url: "git@github.com:octo-org/octo-repo.git",
          clone_url: "https://github.com/octo-org/octo-repo.git",
          svn_url: "https://github.com/octo-org/octo-repo",
          homepage: null,
          size: 35,
          stargazers_count: 0,
          watchers_count: 0,
          language: "Java",
          has_issues: true,
          has_projects: true,
          has_downloads: false,
          has_wiki: false,
          has_pages: false,
          has_discussions: false,
          forks_count: 0,
          mirror_url: null,
          archived: false,
          disabled: false,
          open_issues_count: 6,
          license: null,
          allow_forking: false,
          is_template: false,
          web_commit_signoff_required: false,
          topics: [],
          visibility: "private",
          forks: 0,
          open_issues: 6,
          watchers: 0,
          default_branch: "main",
          allow_squash_merge: true,
          allow_merge_commit: true,
          allow_rebase_merge: true,
          allow_auto_merge: false,
          delete_branch_on_merge: false,
          allow_update_branch: false,
          squash_merge_commit_message: "COMMIT_MESSAGES",
          squash_merge_commit_title: "COMMIT_OR_PR_TITLE",
          merge_commit_message: "PR_TITLE",
          merge_commit_title: "MERGE_MESSAGE",
        },
      },
      _links: {
        self: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202",
        },
        html: { href: "https://github.com/octo-org/octo-repo/pull/202" },
        issue: {
          href: "https://api.github.com/repos/octo-org/octo-repo/issues/202",
        },
        comments: {
          href: "https://api.github.com/repos/octo-org/octo-repo/issues/202/comments",
        },
        review_comments: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202/comments",
        },
        review_comment: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/comments{/number}",
        },
        commits: {
          href: "https://api.github.com/repos/octo-org/octo-repo/pulls/202/commits",
        },
        statuses: {
          href: "https://api.github.com/repos/octo-org/octo-repo/statuses/2bfa0f710fecfd72b1096f9fe5e3b23401bd5dc2",
        },
      },
      author_association: "NONE",
      auto_merge: null,
      assignee: null,
      active_lock_reason: null,
      merged: false,
      mergeable: null,
      rebaseable: null,
      mergeable_state: "unknown",
      merged_by: null,
      comments: 3,
      review_comments: 3,
      maintainer_can_modify: false,
      commits: 4,
      additions: 3,
      deletions: 0,
      changed_files: 1,
    },
    before: "ce20fc4cc890d306efc2811f90d7ac823fb5c799",
    after: "2bfa0f710fecfd72b1096f9fe5e3b23401bd5dc2",
    repository: {
      id: 9001,
      node_id: "N_0004",
      name: "octo-repo",
      full_name: "octo-org/octo-repo",
      private: true,
      owner: {
        login: "octo-org",
        id: 9003,
        node_id: "N_0003",
        avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
        gravatar_id: "",
        url: "https://api.github.com/users/octo-org",
        html_url: "https://github.com/octo-org",
        followers_url: "https://api.github.com/users/octo-org/followers",
        following_url:
          "https://api.github.com/users/octo-org/following{/other_user}",
        gists_url: "https://api.github.com/users/octo-org/gists{/gist_id}",
        starred_url:
          "https://api.github.com/users/octo-org/starred{/owner}{/repo}",
        subscriptions_url:
          "https://api.github.com/users/octo-org/subscriptions",
        organizations_url: "https://api.github.com/users/octo-org/orgs",
        repos_url: "https://api.github.com/users/octo-org/repos",
        events_url: "https://api.github.com/users/octo-org/events{/privacy}",
        received_events_url:
          "https://api.github.com/users/octo-org/received_events",
        type: "Organization",
        user_view_type: "public",
        site_admin: false,
      },
      html_url: "https://github.com/octo-org/octo-repo",
      description: null,
      fork: false,
      url: "https://api.github.com/repos/octo-org/octo-repo",
      forks_url: "https://api.github.com/repos/octo-org/octo-repo/forks",
      keys_url: "https://api.github.com/repos/octo-org/octo-repo/keys{/key_id}",
      collaborators_url:
        "https://api.github.com/repos/octo-org/octo-repo/collaborators{/collaborator}",
      teams_url: "https://api.github.com/repos/octo-org/octo-repo/teams",
      hooks_url: "https://api.github.com/repos/octo-org/octo-repo/hooks",
      issue_events_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/events{/number}",
      events_url: "https://api.github.com/repos/octo-org/octo-repo/events",
      assignees_url:
        "https://api.github.com/repos/octo-org/octo-repo/assignees{/user}",
      branches_url:
        "https://api.github.com/repos/octo-org/octo-repo/branches{/branch}",
      tags_url: "https://api.github.com/repos/octo-org/octo-repo/tags",
      blobs_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/blobs{/sha}",
      git_tags_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/tags{/sha}",
      git_refs_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/refs{/sha}",
      trees_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/trees{/sha}",
      statuses_url:
        "https://api.github.com/repos/octo-org/octo-repo/statuses/{sha}",
      languages_url:
        "https://api.github.com/repos/octo-org/octo-repo/languages",
      stargazers_url:
        "https://api.github.com/repos/octo-org/octo-repo/stargazers",
      contributors_url:
        "https://api.github.com/repos/octo-org/octo-repo/contributors",
      subscribers_url:
        "https://api.github.com/repos/octo-org/octo-repo/subscribers",
      subscription_url:
        "https://api.github.com/repos/octo-org/octo-repo/subscription",
      commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/commits{/sha}",
      git_commits_url:
        "https://api.github.com/repos/octo-org/octo-repo/git/commits{/sha}",
      comments_url:
        "https://api.github.com/repos/octo-org/octo-repo/comments{/number}",
      issue_comment_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues/comments{/number}",
      contents_url:
        "https://api.github.com/repos/octo-org/octo-repo/contents/{+path}",
      compare_url:
        "https://api.github.com/repos/octo-org/octo-repo/compare/{base}...{head}",
      merges_url: "https://api.github.com/repos/octo-org/octo-repo/merges",
      archive_url:
        "https://api.github.com/repos/octo-org/octo-repo/{archive_format}{/ref}",
      downloads_url:
        "https://api.github.com/repos/octo-org/octo-repo/downloads",
      issues_url:
        "https://api.github.com/repos/octo-org/octo-repo/issues{/number}",
      pulls_url:
        "https://api.github.com/repos/octo-org/octo-repo/pulls{/number}",
      milestones_url:
        "https://api.github.com/repos/octo-org/octo-repo/milestones{/number}",
      notifications_url:
        "https://api.github.com/repos/octo-org/octo-repo/notifications{?since,all,participating}",
      labels_url:
        "https://api.github.com/repos/octo-org/octo-repo/labels{/name}",
      releases_url:
        "https://api.github.com/repos/octo-org/octo-repo/releases{/id}",
      deployments_url:
        "https://api.github.com/repos/octo-org/octo-repo/deployments",
      created_at: "2024-12-13T12:01:46Z",
      updated_at: "2026-10-26T13:53:44Z",
      pushed_at: "2026-10-29T11:30:48Z",
      git_url: "git://github.com/octo-org/octo-repo.git",
      ssh_url: "git@github.com:octo-org/octo-repo.git",
      clone_url: "https://github.com/octo-org/octo-repo.git",
      svn_url: "https://github.com/octo-org/octo-repo",
      homepage: null,
      size: 35,
      stargazers_count: 0,
      watchers_count: 0,
      language: "Java",
      has_issues: true,
      has_projects: true,
      has_downloads: false,
      has_wiki: false,
      has_pages: false,
      has_discussions: false,
      forks_count: 0,
      mirror_url: null,
      archived: false,
      disabled: false,
      open_issues_count: 6,
      license: null,
      allow_forking: false,
      is_template: false,
      web_commit_signoff_required: false,
      topics: [],
      visibility: "private",
      forks: 0,
      open_issues: 6,
      watchers: 0,
      default_branch: "main",
      custom_properties: {},
    },
    organization: {
      login: "octo-org",
      id: 9003,
      node_id: "N_0003",
      url: "https://api.github.com/orgs/octo-org",
      repos_url: "https://api.github.com/orgs/octo-org/repos",
      events_url: "https://api.github.com/orgs/octo-org/events",
      hooks_url: "https://api.github.com/orgs/octo-org/hooks",
      issues_url: "https://api.github.com/orgs/octo-org/issues",
      members_url: "https://api.github.com/orgs/octo-org/members{/member}",
      public_members_url:
        "https://api.github.com/orgs/octo-org/public_members{/member}",
      avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
      description: null,
    },
    sender: {
      login: "octo-app[bot]",
      id: 9004,
      node_id: "N_0002",
      avatar_url: "https://avatars.githubusercontent.com/u/9003?v=4",
      gravatar_id: "",
      url: "https://api.github.com/users/octo-app%5Bbot%5D",
      html_url: "https://github.com/apps/octo-app",
      followers_url: "https://api.github.com/users/octo-app%5Bbot%5D/followers",
      following_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/following{/other_user}",
      gists_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/gists{/gist_id}",
      starred_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/starred{/owner}{/repo}",
      subscriptions_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/subscriptions",
      organizations_url: "https://api.github.com/users/octo-app%5Bbot%5D/orgs",
      repos_url: "https://api.github.com/users/octo-app%5Bbot%5D/repos",
      events_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/events{/privacy}",
      received_events_url:
        "https://api.github.com/users/octo-app%5Bbot%5D/received_events",
      type: "Bot",
      user_view_type: "public",
      site_admin: false,
    },
    installation: {
      id: 9002,
      node_id: "N_0005",
    },
    ...override,
  };
}
