# Deploy a Yapir instance

One Cloudflare Worker serves the frontend and the API of a Yapir instance. An instance can also run in a container: see [Run in a container](#run-in-a-container). Users sign in with Better Auth through an OIDC provider. Git hosts and Jira authenticate their webhooks with signatures. A PostgreSQL database stores the data, and Hyperdrive manages the runtime connections to it. An R2 bucket stores the harness state of each Task.

Each instance has its own values: domain, database, OIDC client, admin emails and Connections. You choose them. `wrangler.jsonc` has the configuration that all instances share: add the values of your instance to it. Set the local values in `.env`.

## One-time setup

### PostgreSQL

1. Create an empty PostgreSQL database. Hyperdrive must reach it: through a public endpoint with TLS, or through a Cloudflare Tunnel for a private database.
2. Create a Hyperdrive configuration for the database, with query caching disabled (`--caching-disabled`). Yapir must read its own writes.
3. Set the Hyperdrive ID in `hyperdrive`.

The Worker gets the database credentials from Hyperdrive. Do not set `DATABASE_URL` on the Worker.

The Worker applies the migrations, through Hyperdrive. Thus only Hyperdrive must reach the database. `POST /api/migrations` applies the migrations of the deployed version. The `MIGRATION_TOKEN` secret authenticates this request. Each deployment sets a new token.

The migrations start from an empty database. PostgreSQL 18 is not necessary: Drizzle generates the UUIDv7 IDs. For a schema change, run `bun db:generate`. The next deployment applies the migration.

### Cloudflare resources

1. Use a Cloudflare account with Workers Paid and R2. Set its ID in `account_id`.
2. Set `name`, the name of the Worker.
3. Create an R2 bucket, and set it in `r2_buckets`.
4. Set the custom domain in `routes`, such as `[{ "pattern": "<hostname>", "custom_domain": true }]`, and `SERVER_URL` to `https://<hostname>`. Browsers and runners use `SERVER_URL`.

Wrangler creates the Worker, the assets and the custom domain.

The Worker writes the harness state to R2 through the `STATE_BUCKET` binding. You do not configure an R2 token or an S3 credential. Local development uses the local R2 bucket of Wrangler.

Optional: to give the instance a fixed IP, set the `FIXED_IP` binding in `vpc_networks` on a Cloudflare Tunnel, and `FIXED_IP_ADDRESS` to the IPv4 address of the tunnel's host. MCP servers with `fixedIp` then receive their requests from this address. The host must reach them over IPv4. The deploy token needs a Connectivity Directory permission.

### Worker secrets

Set each secret before the first deployment, with `bunx wrangler secret put NAME --name <Worker>`. `wrangler deploy` keeps them:

- `ENCRYPTION_KEY`: 32 random bytes in base64 (`openssl rand -base64 32`). It encrypts the API keys of the model providers and the secrets of the Connections. If you change it, Yapir cannot read them.
- `BETTER_AUTH_SECRET`: 32 random bytes in base64 (`openssl rand -base64 32`). It signs the session cookies. If you change it, all users are signed out.
- `OIDC_CLIENT_SECRET`: the client secret of the OIDC client. See [Sign-in](#sign-in).

### Runner image

The deploy workflow, `.github/workflows/deploy.yml`, pushes the runner image to GHCR, tagged with the version of the build. The [GitHub Actions](../src/content/execution-environments/github-actions.md) and [GitLab CI](../src/content/execution-environments/gitlab-ci.md) execution environments run the image that Yapir gives in each dispatch. The `RUNNER_IMAGE` Worker variable sets this image. Deploy the Worker after the push, with `RUNNER_IMAGE` set to the image of the same version. After the first push, make the package public. Jobs then pull it without credentials.

### Sign-in

Better Auth uses one generic OAuth provider, `oidc`. Each instance, local ones included, has its own OIDC client.

1. At the identity provider, create an OIDC client for the instance.
2. Set the redirect URL to `<SERVER_URL>/api/auth/callback/oidc`.
3. Set the scopes `openid`, `email` and `profile`. Enable PKCE.
4. To show the pictures of users, make the provider give the `picture` claim in the `profile` scope. Without it, Yapir shows generated avatars.
5. Set the client ID and the discovery URL in `vars`, and set the client secret as a Worker secret. The discovery URL ends with `/.well-known/openid-configuration`.

Yapir creates a user at the first sign-in, as an Organization User. Each sign-in copies the name and picture from the identity provider. `ORGANIZATION_ADMIN_EMAILS` lists the designated Organization Admins. A sign-in with one of these emails grants the Organization Admin role. The Users page cannot demote these users.

Do not put the domain behind an authenticating proxy, such as a Cloudflare Access self-hosted application. These routes are public:

- The frontend. It redirects a visitor without a session to the identity provider.
- `/api/health`.
- `/api/openapi.json`, the OpenAPI document, and `/api/docs`, its API reference.
- `/api/content`, the content index, and `/api/content/<path>`, the documents of `src/content/`.
- `/api/auth/`, the Better Auth routes.

The other API routes require a Better Auth session, or an API key of the user in the `x-api-key` header. These routes are exceptions:

- `/api/webhooks/`: the Git host and Jira webhooks require a valid signature.
- `/api/runner/`: the runner routes require a claim ID, with the CI job's OIDC token for the CI execution environments, or an execution token.

Locally, open an instance with the sign-in link that `bun instance up` prints. See [Local development](local-development.md).

### Connections

GitHub, GitLab and Jira are optional Connections. An Organization Admin configures them on the **Connections** page. This page tells what to create at each service: see [src/content/connections/](../src/content/connections/). Use a different GitHub App and Jira webhook for each instance, because each one points to the webhook URL of its instance. Yapir installs its own GitLab webhook.

Without a Connection, Yapir does not offer the events, capabilities or execution environment of its service. Its webhook under `/api/webhooks/` responds 404. Schedule triggers, manual executions and the Yapir execution environment work without a Connection.

Agents reach Git only through the proxy of Yapir. The GitHub and GitLab tokens stay in the server. Automations with the push capability can create, update or delete only `yapir/*` branches. The proxy refuses other branches, the default branch and tags.

Protect the default branch of each repository of a project:

- GitHub: add a ruleset with **Require a pull request before merging**, **Block force pushes** and **Restrict deletions**. Do not give the App a bypass. Yapir does not configure rulesets. Rulesets control force pushes on `yapir/*` branches.
- GitHub: rulesets on private repositories need a paid GitHub plan. On the Free plan, agents can force-push `yapir/*` branches of private repositories.
- GitLab: keep the default branch protected. GitLab protects it by default.

## Deploy and verify

### Deploy

Deploy with a `CLOUDFLARE_API_TOKEN` that has **Workers Scripts: Edit**, **Containers: Edit** and **Workers R2 Storage: Edit** on the account, and **Workers Routes: Edit** and **Zone: Read** on the zone of the custom domain:

```sh
bun check
bun run build
token=$(openssl rand -hex 32)
echo "MIGRATION_TOKEN=$token" > <secrets file>
bun run deploy --var "RUNNER_IMAGE:ghcr.io/yapir-ai/runner:<version>" --secrets-file <secrets file>
curl -X POST -H "Authorization: Bearer $token" <SERVER_URL>/api/migrations
```

Migrations run after the deployment: until they are applied, the new version runs on the previous schema.

The deploy workflow runs on each push to `main`, and on each release. After the push of the runner image, its `instances` job starts the deployment of the instances of the Yapir team, from the repository that holds their configuration. In a fork, replace this job with your deployment.

### Post-deploy checks

1. Open the frontend without a session. Make sure that it redirects to the identity provider, and back after sign-in. A designated admin shows as Organization Admin on the Users page.
2. Send an API request without a session, such as `GET /api/agents`. Make sure that the response is `401` `UNAUTHENTICATED`.
3. Send an unsigned webhook. Make sure that the signature check rejects it.
4. Import the repositories into the empty database. For GitHub, redeliver the `installation.created` event, or the repository-added event, of the App in **Advanced → Recent Deliveries**.
5. Add a model provider. Create a Project and link its repositories. Create an Agent and an Automation in this Project. Trigger a real Git host event. Make sure that the clone, the harness and the model and tool calls work.
6. After the execution succeeds, trigger another event. Make sure that its execution continues the same Session, with the conversation history.

## Run in a container

The image of `Dockerfile` runs the instance as a Bun process, `src/server/bun.ts`. The process serves the frontend and the API, runs the cron every minute and applies the migrations when it starts. You can run more than one container: each minute of the cron runs once, and the migrations run one at a time. On `SIGTERM`, the process completes the requests and the work in progress, then stops.

1. Build the client, then the image:

   ```sh
   bunx vite build
   docker build -t yapir .
   ```

2. Create a PostgreSQL database, and an S3 bucket for the harness state of the Tasks.
3. Set the environment variables of the container:
   - `DATABASE_URL`: the connection string of the database.
   - `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID` and `S3_SECRET_ACCESS_KEY`: the bucket, as the [S3 client of Bun](https://bun.com/docs/runtime/s3) reads them.
   - The variables and secrets of the Worker, except `MIGRATION_TOKEN`: see `apiEnvSchema` in `src/server/lib/env.ts`.
4. Expose port `3000`, or set another port with `PORT`.

## Release

The version of a build is the output of `git describe --tags --match 'v*' --always`: `v0.2.0` on a release tag, `v0.2.0-3-gabc1234` three commits after it. The application shows it below the user menu, with a link to the changelog, `src/content/changelog.md`.

The `Release` workflow, `.github/workflows/release.yml`, releases the head of `main`. Start it manually, for example with `gh workflow run release.yml`. It calculates the version and the notes of this version from the Conventional Commits, and adds the notes to the changelog. Then it pushes the tag and runs the deploy workflow on it.

## Publish the CLI

The `@yapir-ai/cli` npm package provides the `yapir` command. The `Publish CLI` workflow, `.github/workflows/cli-publish.yml`, publishes `cli/` when you push a `cli-v*` tag. It uses npm trusted publishing: the npm settings of the package trust this workflow, with `npm publish` allowed. No npm token is stored.

1. Increase `version` in `cli/package.json`.
2. Push a `cli-v<version>` tag.
