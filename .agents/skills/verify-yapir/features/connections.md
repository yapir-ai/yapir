# Connections

An Organization Admin connects Yapir to GitHub, GitLab and Jira. A Git host Connection imports the repositories that its credentials reach, and installs the webhook of Yapir on them. Its secrets are never returned.

## Sub-features

- `connection-create`: create a Connection from the UI or the CLI.
- `connection-secrets-hidden`: `connection list` and `connection info` return no token, private key or webhook secret.
- `connection-gitlab-sync`: a GitLab Connection lists the projects of its token on GitLab, installs the webhook of Yapir on each one and imports them.
- `connection-github-import`: the `installation.created` delivery of the GitHub App imports the repositories of the installation.

## How to get to it (user POV)

- Sidebar **Organization**, then **Connections**: `<url>/connections`.
- `yapir connection create|list|info|update|delete`.

## Driving it with bun instance

Preconditions:

- The seed. `up` creates the Connections through the API, then imports the GitHub repositories with a signed delivery.
- `P=/tmp/yapir-instances/$R/evidence/connections`, created with `mkdir -p $P`.

- **List.** Run `$C connection list | tee $P/list.json`. Three items, of the types `github` (`appId`, `installationId`), `gitlab` (`url`) and `jira` (`cloudId`, `url`). The items have no secret field.
- **GitLab webhook.** Run `bun instance requests $R gitlab | tee $P/gitlab-requests.txt`. It shows the calls of `POST /api/connections` to the GitLab API, on `https://gitlab.com`, or on the porthole source `yapir-<id>-gitlab` with `--capture gitlab`: the project list, the hooks of each project, then `PUT …/projects/<id>/hooks/<hookId>` or `POST …/projects/<id>/hooks`, with a `2xx` status. The instance sets `WEBHOOK_URL` to `PORTHOLE_URL`, so the hook URL is `<PORTHOLE_URL>/api/webhooks/gitlab`.
- **Hook bodies.** On an instance started with `--capture gitlab`, run `bun instance io $R gitlab --bodies`. The response of `GET …/hooks` gives the `url` of the hook.
- **Repositories.** Run `$C repository list | tee $P/repositories.json`. It gives the `path` and the `provider` of the repositories of the Connections.
- **UI proof.** Run `bun instance browser $R goto <url>/connections`, then a snapshot and a screenshot to `connections/list`.

## Gotchas

- The hook on porthole is shared: every instance and the main checkout install the same hook, signed with the same token. `down` leaves it in place. Never delete it.
- To prove the delivery of a GitLab event, replay one that porthole received: see [events](./events.md).
- The seed is applied once, at `up`. To prove `connection-create` from the UI, start with `--no-seed`, or delete the seeded Connection first.
- `requests` reads the traces of every instance of the checkout, and keeps the ones that a request of this instance caused. It can list a call twice.
- `io --bodies` prints the bodies as porthole stores them. They can hold secrets: the GitHub installation tokens, and the signing token of the GitLab hook. Do not paste these outputs in a PR or a chat.
