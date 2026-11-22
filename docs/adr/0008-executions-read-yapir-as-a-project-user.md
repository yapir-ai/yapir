# Executions read Yapir as a Project User of their project

An agent can audit Yapir and recommend changes, such as an agent that reads its own past executions, or one that reads the corrections of the operators. It must read the tasks, their transcripts and the configuration that produced them. Each read operation filters with `currentUser`, and an execution has no user.

The capabilities `yapir.tasks.read` and `yapir.configuration.read` give an execution the List operations of the API as tools. At each tool call, the operation gets an execution reader in place of the user, from `executionReader` in `src/server/lib/auth/execution-reader.ts`. The reader reads as a Project User of the execution's project, and it cannot write. A scoped grant also narrows the ID filters of the input to the automation, its agent and the agent's skills. The Assistant reads with the same tools, as the user. The tools are in `src/server/lib/yapir/yapir-read-tools.ts`.

## Considered options

- Resolve a reader from the execution token in the request container. The reader then exists on every route before Yapir checks a grant, and one request cannot hold a scoped grant and an unscoped grant.
- Put the scope of the automation in the reader. Each user read then changes, and the agent and skill operations get a filter that is empty for every user.
- Write separate queries for the tools, as the GitHub tools do. Their access rule can then differ from what a Project User reads.

## Consequences

- The project filter of each List operation is the limit of an execution. A wrong scoped filter can show other items of the project, never items of another project.
- A scoped filter keeps only the requested IDs that it allows. A request for an ID outside the scope returns no item.
- An unscoped configuration read reaches all the agents and skills of the organization, as a Project User reads them.
- A transcript is untrusted content, see [ADR 0003](0003-yapir-records-execution-transcripts.md). An execution with an unscoped `yapir.tasks.read` and a write capability can publish what other agents read, or follow instructions that a transcript contains.
