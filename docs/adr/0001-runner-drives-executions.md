# Runners drive executions inside their environment

Yapir does not drive execution environments or harnesses step by step. It dispatches an execution to a runner started by an interchangeable dispatcher, such as a Cloudflare Container or a CI job. The runner claims the execution, pulls the task's events, drives the harness locally, and keeps harness state through its environment's own storage. Yapir keeps only the execution state, its lease, and short-lived credentials. [ADR 0003](0003-yapir-records-execution-transcripts.md) adds the transcript. Remotely managing the lifecycles of sandboxes, harness servers, and checkpoints made crashes and recovery the dominant source of complexity, and tied execution to a single hosting provider.

## Consequences

- [ADR 0002](0002-runner-keeps-the-execution-token.md) replaces this consequence. The runner runs as an unprivileged user, without the environment's variables. Everything else inside the execution environment is reachable by the agent. The execution token is therefore scoped to the execution and revoked when it ends. Git and model provider calls go through server proxies authenticated by the execution token: Git credentials and model provider API keys stay in the server. The proxies restrict Git to the task's repository and model calls to the agent's model provider.
- Dispatch is at-least-once and claim is exactly-once, so dispatchers do not need to be idempotent.
- Workspace contents that were not pushed may be lost between executions. The repository remains the source of truth.
