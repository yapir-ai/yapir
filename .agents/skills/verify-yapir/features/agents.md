# Agents

An Organization Admin creates an agent: a name, a harness, a model provider, a model of this provider and instructions. Automations then run the agent.

## Sub-features

- `agent-create`: create an agent from the UI or the CLI.
- `agent-model`: the **Model** combobox lists the models of the selected provider.
- `agent-validation`: the form refuses empty instructions.

## How to get to it (user POV)

- Sidebar **Library**, then **Agents**, then the create link: `<url>/agents/create`.
- `yapir agent create --data '<json>'`.

## Driving it with bun instance

Preconditions:

- A model provider `Anthropic`: run the [model provider recipe](./model-providers.md) first.
- No agent named `Release reviewer`. The seed creates `OpenCode`, `Codex`, `Claude Code`, `Reviewer`, `Implementer` and `Housekeeper`.

- **Open the form.** Run `bun instance browser $R goto <url>/agents/create`. The heading `Create agent` shows. The combobox `Harness` shows `OpenCode`.
- **Fill the general fields.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Release reviewer"`.
- **Pick the model.** Run `bun instance browser $R click 'role=combobox[name="Model provider"]'` and `bun instance browser $R click 'role=option[name="Anthropic"]'`, then `bun instance browser $R click 'role=combobox[name="Model"]'`, `bun instance browser $R type "Sonnet"` and `bun instance browser $R click 'role=option[name=/claude-sonnet-5-5$/]'`. The combobox `Model` shows `claude-sonnet-5-5`.
- **Refuse empty instructions.** Run `bun instance browser $R click 'role=button[name="Create agent"]'`. The URL stays `<url>/agents/create`, the textbox `Instructions` is `[invalid]` and an alert says `Too small: expected string to have >=1 characters`.
- **Create.** Run `bun instance browser $R fill 'role=textbox[name="Instructions"]' "Review the change."`, then `bun instance browser $R click 'role=button[name="Create agent"]'`. The page URL becomes `<url>/agents/<id>`.
- **Read back.** Run `$C agent info <id>`. It gives `"harness":"opencode"`, `"model":"claude-sonnet-5-5"`, the `modelProviderId` of `Anthropic` and `"prompt":"Review the change."`.
- **Proof.** Run `bun instance browser $R snapshot --filename=agents/detail.md`, `bun instance browser $R screenshot --filename=agents/detail.png` and `$C agent list > /tmp/yapir-instances/$R/evidence/agents/list.json`.

## Gotchas

- The model options come from models.dev and change over time. Select a model by its ID at the end of the option name, with a regex such as `name=/claude-sonnet-5-5$/`.
- The instructions are `prompt` in the API.
- An agent runs only in an automation. See [automations](./automations.md) and [executions](./executions.md).
