---
description: How an Organization Admin connects a Jira Cloud site to Yapir, with the service account and webhook to create.
---

1. In **admin.atlassian.com → Directory → Service accounts**, create a service account with the **User** role on the site. Give it access to the projects.
2. Create its API token with these scopes:
   - `read:jira-work`: read issues and comments.
   - `write:jira-work`: comment and assign.
   - `read:jira-user`: find its own account.
3. As a Jira admin, create a webhook in **Jira settings → System → WebHooks**. Set the URL to `{{origin}}/api/webhooks/jira` and set a secret.
4. Select **Issue created**, **Issue updated** and **Comment created**.
