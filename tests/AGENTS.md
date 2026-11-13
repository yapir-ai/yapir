# Automated tests

The tests run against Yapir as a black box, with Playwright Test. `bun run test` starts an instance without the seed, runs the tests against it, then stops it. Add a path to run one file. Do not use `bun test`: it starts the test runner of Bun, not Playwright.

## Automated test or live verification

- An automated test replaces each external service with a simulator. It is deterministic and runs on each change.
- A live verification, with the skill `verify-yapir`, uses the real services: GitHub, GitLab, a real model. It validates Yapir and the simulators against them.

## The black box

- The SUT is the instance that `tests/kit/global-setup.ts` starts, with its own database. Dispatchers, runners and sandboxes are inside the box. Its Worker, `tests/kit/server.ts`, adds the routes that set the time of the server and run its cron.
- A test enters through one seam, the widest: the UI when the operation has one, else the API, a webhook or the cron.
- A test exits through the database, read by key, through the requests that simulators received, or through the screen.
- The Given is rows inserted in the database with the factories of `tests/kit/factories/`. Each test then fails only for its own operation.

## One file per entry

- Write one file per entry: an operation of the UI or the API, as `tests/<resource>/<resource>-<operation>.test.ts`, or a payload type of a webhook, as `tests/github/events/<payload>.test.ts`.
- Write one nominal test, and one parameterized test for the errors that its seam can produce.
- Add a test only for a different code path. Different data through the same path is the same test.
- Name each test after the behavior that a user sees.

## Fixtures

The fixtures of `tests/kit/test.ts` start only when a test names them:

- `db`: the test database, empty at the start of each test.
- `insert`: inserts the rows that a factory builds, and returns them. `insert(agentRow, { … })` inserts one row, `insert(automationRow, [{ … }, { … }])` several.
- `page`: a page signed in as an Organization Admin.
- `outsider`: an API context signed in as an Organization User who is a member of no Project.
- `clock`: fixes the time of the server at the start of the test. Read `clock.now`, move the time with `clock.set` and `clock.skip`, and run the cron at that time with `clock.tick`. A test without it sees the system time.
- `github`: `github.send(name, payload, deliveryId)` delivers a webhook, signed with the secret of the GitHub Connection of the Given.
- `oidc`: the identity provider of the instance. `oidc.requests()` lists the paths that it received since the start of the test, and `oidc.origin` is its URL.

## Factories

- One factory per table in `tests/kit/factories/`, with fixed values and one override object. Its `table` property names the table that `insert` writes.
- A relation is a required field: `automationRow({ agentId: agent.id, projectId: project.id })`. A factory never reads another factory.
- Give sibling values distinct defaults, so that a swapped field shows.
- A payload factory, in `tests/kit/payloads/`, is a delivery that the service sent, with fictitious names and IDs. It speaks the language of the service only, typed by its SDK. Its defaults match no row factory: the test links the payload to its rows, for example `repository: { id: Number(repository.externalId) }`.

## Assertions

- Compare whole objects. When a value is not deterministic, make the world deterministic: read a generated ID from the URL, the response or the database, build the expected object with it, and set the time with `clock`.
- Match a generated secret, and only a secret, with `expect.any(String)`.
- Do not rebuild the copy of a payload that the server keeps: it repeats the schema of the server. Match only its `type`, with `expect.objectContaining`.
- Build expected values from the rows and payloads in scope, inline. A helper that maps a row to what a page shows is a second implementation of the page.
- Find elements by role and accessible name, in the words of the screen: `getByRole`, `getByLabel`, `getByText`.
- Judge a region of the screen with `toMatchAriaSnapshot`. Write `/children: equal` where the exact list is the behavior.
- Assert the order that the page shows, only when the page sorts.
- Wait with matchers and `expect.poll`.

## Before you finish

- Falsify each new test once: change an expected value, read the failure, and restore the value.
