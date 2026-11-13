# The runner keeps the execution token and proxies the agent

The runner process stays root and keeps the execution token. It starts the agent's work, from the clone to the harness, in a separate process as the unprivileged `agent` user. The agent reaches Yapir only through a proxy that the runner serves on `127.0.0.1`, and that proxy adds the token. When the agent had the token, anything that it printed or sent could leak the token outside the execution environment. Also, the runner could not send Yapir data that the agent cannot change.

This replaces the first consequence of [ADR 0001](0001-runner-drives-executions.md).

## Consequences

- The agent can still use the proxy during the execution: the token, not the access, stays out of its reach. The proxy forwards only the Git, model and MCP routes, and the transcript route of [ADR 0003](0003-yapir-records-execution-transcripts.md). The runner pulls the events for the agent, so it sees the turn end that ends the execution. The agent pulls at an interval, and each pull renews the lease. Failure reports come from the runner only: the agent gives its error to the proxy, and the runner reports the first error of the execution.
- The root runner must not run, read as configuration or write files that the agent controls, in `HOME` or the repository. It only gives these directories to `agent`, without following links. All other work in them runs in the agent's process.
- A claim from a CI job requires the job's OIDC token, which its forge signs: a reader of the dispatch payload cannot claim. Each dispatcher checks that the token comes from the job that it started, from the default branch's CI configuration. Yapir's sandboxes keep the claim ID alone: only the sandbox receives the payload.
