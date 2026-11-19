# Agents

An Organization Admin creates an agent with a name, description, harness, model provider, model, optional effort, skills and instructions, then edits its settings and default triggers or capabilities, deletes it and restores it. Automations then run the agent.

## Sub-features

- `agent-create`: create an agent from the UI or the CLI.
- `agent-model`: the **Model** combobox filters the selected provider's catalog models by the selected **Harness**, and accepts any typed model ID.
- `agent-validation`: the form refuses empty instructions.
- `agent-edit`: update the fields, default triggers or capabilities on the agent page.
- `agent-delete`: soft-delete an agent when no active automation uses it.
- `agent-restore`: restore a deleted agent after turning **Show deleted** on.

## How to get to it (user POV)

- Sidebar **Library**, then **Agents** (`<url>/agents`), then **Create agent**: `<url>/agents/create`.
- An agent row in the list: `<url>/agents/<id>`.
- `yapir agent list|info|create|update|delete|restore`.

## Driving it with bun instance

Preconditions:

- The machine reaches `https://models.dev/api.json`.
- A model provider `Anthropic`: run the [model provider recipe](./model-providers.md) first.
- No agent named `Release reviewer`. The seed creates `OpenCode`, `Codex`, `Claude Code`, `Reviewer`, `Implementer` and `Housekeeper`.

- **Open the form.** Run `bun instance browser $R goto <url>/agents`, then `bun instance browser $R click 'role=link[name="Create agent"]'`. The heading `Create agent` shows. When Defaults are configured (such as with the seed), `Harness`, `Model provider`, `Model` and `Effort` start prefilled from Defaults.
- **Fill the general fields.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Release reviewer"` and `bun instance browser $R fill 'role=textbox[name="Description"]' "Reviews release pull requests."`.
- **Pick the model.** Run `bun instance browser $R click 'role=combobox[name="Model provider"]'` and `bun instance browser $R click 'role=option[name="Anthropic"]'`. Clear any prefilled model with `bun instance browser $R fill 'role=combobox[name="Model"]' ""`, then run `bun instance browser $R click 'role=combobox[name="Model"]'`, `bun instance browser $R type "Sonnet"`, snapshot to check the listed IDs, and click `role=option[name=/claude-sonnet-5-5$/]` (or a current Sonnet model ID).
- **Refuse empty instructions.** Run `bun instance browser $R click 'role=button[name="Create agent"]'`. The URL stays `<url>/agents/create`, the textbox `Instructions` is `[invalid]` and an alert says `Too small: expected string to have >=1 characters`.
- **Create.** Run `bun instance browser $R fill 'role=textbox[name="Instructions"]' "Review the change."`, then `bun instance browser $R click 'role=button[name="Create agent"]'`. The page URL becomes `<url>/agents/<id>` and the toast `Agent created` shows. Keep `<id>`.
- **Read back.** Run `$C agent info <id>`. It gives `"harness":"opencode"`, the selected `"model"`, the `modelProviderId` of `Anthropic`, `"description":"Reviews release pull requests."` and `"prompt":"Review the change."`.
- **Edit, delete and restore.** Fill `Name` with `"Release reviewer v2"` and click `role=button[name="Save agent"]`; `agent info <id>` gives `"name":"Release reviewer v2"`. Click `role=button[name="Delete agent"]`, then `role=button[name="Confirm deletion?"]`; URL becomes `<url>/agents` and `deletedAt` is non-null. Click `role=button[name="Show deleted"]`, open `role=link[name="Release reviewer v2"]` and click `role=button[name="Restore agent"]`; `deletedAt` returns to `null`.
- **Proof.** Run `bun instance browser $R snapshot --filename=agents/detail.md`, `bun instance browser $R screenshot --filename=agents/detail.png` and `$C agent list > /tmp/yapir-instances/$R/evidence/agents/list.json`.

## Gotchas

- Changing **Model provider** on `/agents/create` does not clear a prefilled **Model** from Defaults. Clear **Model** with `fill ""` before clicking and typing, or `type` appends to the default model ID.
- `fill` on the `Model` or `Effort` autocomplete does not open its option list: click it, then `type`.
- The model options come from models.dev and change over time. Select a model by its ID at the end of the option name, with a regex such as `name=/claude-sonnet-5-5$/`.
- Default triggers and capabilities are added on `/agents/<id>` after creation (or passed at creation via the API/CLI).
- The instructions are `prompt` in the API.
- Deleting an agent used by an active automation fails with `409 AGENT_IN_USE`; restoring an agent whose model provider is deleted fails with `409 MODEL_PROVIDER_DELETED`.
- An agent runs only in an automation. See [automations](./automations.md) and [executions](./executions.md).
