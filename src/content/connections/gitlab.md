---
description: How an Organization Admin connects a GitLab instance to Yapir, with the token to create.
---

1. Create a token with the `api` scope: a service account token, or a group or project access token. GitLab 19.0 or later.
2. Give its user the **Maintainer** role in the GitLab projects of your Yapir projects, for example on their group. To approve, the user must be an eligible approver. For GitLab CI, the user must be allowed to merge into the default branch.
3. Make sure that the GitLab instance can send requests to `{{origin}}`.
4. Connect GitLab. Yapir installs its webhook on each project where the user has the Maintainer role, and imports the project as a repository. Yapir does this again every 6 hours. To sync immediately, click **Sync projects**. Do this after you change the URL or the token, or give the role in a new project.
5. On the **Projects** page of Yapir, add the repositories to projects.
