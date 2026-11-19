# Connections

An Organization Admin connects Yapir to GitHub, GitLab and Jira. A Git host Connection imports the repositories that its credentials reach, and installs the webhook of Yapir on them. Its secrets are never returned.

## Sub-features

- `connection-create`: create a Connection from the UI or the CLI.
- `connection-secrets-hidden`: `connection list` and `connection info` return no token, private key or webhook secret.
- `connection-gitlab-sync`: a GitLab Connection lists the non-archived projects where its token has at least Maintainer access (`min_access_level=40`), installs the webhook of Yapir on each one and imports them.
- `connection-github-import`: the `installation.created` delivery of the GitHub App imports the repositories of the installation.

## How to get to it (user POV)

- Sidebar **Organization**, then **Connections** (`<url>/connections`), then a service (`<url>/connections/<type>`; `/connections/gitlab` has **Sync projects**).
- `yapir connection create|list|info|update|delete`, `yapir gitlab sync` and `yapir repository list`.

## Driving it with bun instance

Preconditions:

- The seed. `up` creates the Connections through the API, then imports the GitHub repositories with a signed delivery.
- `P=/tmp/yapir-instances/$R/evidence/connections`, created with `mkdir -p $P`.

- **List and info.** Run `$C connection list | tee $P/list.json` and `$C connection info <type>` for `github`, `gitlab` and `jira`. Three items: `github` (`appId`, `installationId`), `gitlab` (`url`) and `jira` (`cloudId`, `url`). None returns any secret field.
- **GitLab webhook and manual sync.** Run `bun instance requests $R gitlab | tee $P/gitlab-requests.txt`. It shows the calls of `POST /api/connections` to the GitLab API, on `https://gitlab.com`, or on the porthole source `yapir-<id>-gitlab` with `--capture gitlab`: the project list, the hooks of each project, then `PUT …/projects/<id>/hooks/<hookId>` or `POST …/projects/<id>/hooks`, with a `2xx` status. The instance sets `WEBHOOK_URL` to `PORTHOLE_URL`, so the hook URL is `<PORTHOLE_URL>/api/webhooks/gitlab`. Run `$C gitlab sync` (or click **Sync projects** on `/connections/gitlab`): status `204 No Content`.
- **Hook bodies.** On an instance started with `--capture gitlab`, run `bun instance io $R gitlab --bodies`. The response of `GET …/hooks` gives the `url` of the hook.
- **Repositories.** Run `$C repository list --limit 100 | tee $P/repositories.json`. It gives the `path` and the `provider` of the repositories of the Connections.
- **UI proof.** Run `bun instance browser $R goto <url>/connections`, then `bun instance browser $R snapshot --filename=connections/list.md` and `bun instance browser $R screenshot --filename=connections/list.png`.

## Gotchas

- The hook on porthole is shared: every instance and the main checkout install the same hook, signed with the same token. `down` leaves it in place. Never delete it.
- To prove the delivery of a GitLab event, replay one that porthole received: see [events](./events.md).
- Never prove `connection-create` from the UI with real GitLab credentials: the UI does not expose `webhookSigningToken`, so it generates a new random `whsec_…` token and overwrites the shared GitLab webhook on porthole. To prove `connection-create` safely from the UI, start with `--no-seed` (or delete the seeded Connection first) and create a GitHub or Jira Connection with placeholder credentials (neither makes outbound API calls at creation).
- Do not combine `--no-seed` with `--capture gitlab`: `scripts/instance.ts` reads the GitLab upstream URL from the seed.
- `repository list` defaults to `limit=10`. Pass `--limit 100` so accounts with more than 10 repositories are not truncated.
- `requests` reads the traces of every instance of the checkout, and keeps the ones that a request of this instance caused. It can list a call twice.
- `io --bodies` prints the bodies as porthole stores them. They can hold secrets: the GitHub installation tokens, and the signing token of the GitLab hook. Do not paste these outputs in a PR or a chat.
