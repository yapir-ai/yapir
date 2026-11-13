---
description: How an Organization Admin connects GitHub to Yapir, with the GitHub App to create.
---

1. Create a GitHub App. Set the webhook URL to `{{origin}}/api/webhooks/github` and set a webhook secret.
2. Grant these repository permissions:
   - **Contents**: read to clone, write to push `yapir/*` branches.
   - **Issues** and **Pull requests**: read for events and tools, write to comment, review and open pull requests.
   - **Checks**: read for events.
   - **Actions**: write, only for the GitHub Actions execution environment.
   - Do not grant **Workflows**. Agents then cannot change `.github/workflows`.
3. Subscribe to **Check suite**, **Issues**, **Issue comment**, **Pull request**, **Pull request review**, **Pull request review comment**, **Push** and **Release**.
4. Generate a private key. Install the App only on the repositories of your projects.
5. After you connect, redeliver the installation event in **Advanced → Recent Deliveries**. Yapir then imports the repositories.
6. On the **Projects** page of Yapir, add the repositories to projects.
