# Yapir records the transcript of each execution

The harness keeps the session in its environment's storage, which Yapir cannot read: the sandbox's backup, a CI cache or a removed CI job. Users could not see what an agent did, only its effects. The agent now sends each message of the session to Yapir, through the runner's proxy, as an AI SDK UI message. Each harness adapter maps its own stream to this format.

This revises [ADR 0001](0001-runner-drives-executions.md): Yapir keeps the transcript in addition to the execution state, its lease, and short-lived credentials.

## Consequences

- The transcript is best effort. A message that Yapir does not record does not fail the execution. The agent sends the messages of a turn before it pulls the next events, because a turn end without pending events ends the execution.
- The agent writes the transcript. Its content is untrusted, as the content of an effect is.
- The transcript can contain what the agent read, such as code and command outputs. Users who read a task read its transcript.
- After each turn, the agent also sends its harness's session, as the harness stores it. Yapir keeps the latest one of each task in R2, so that a user can continue the session on their machine.
