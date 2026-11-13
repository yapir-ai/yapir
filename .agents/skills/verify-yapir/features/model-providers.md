# Model providers

An Organization Admin adds a model provider from the catalog of models.dev. The catalog fills the name and the base URL, and the admin gives the API key. Agents and the Assistant then use its models.

## Sub-features

- `provider-catalog`: the **Provider** combobox lists and filters the catalog.
- `provider-create`: add a provider with an API key.
- `provider-key-hidden`: Yapir never returns the API key.

## How to get to it (user POV)

- Sidebar **Organization**, then **Model providers**, then the create link: `<url>/model-providers/create`.
- `yapir model-provider create --data '<json>'`.

## Driving it with bun instance

Preconditions:

- Baseline. The machine reaches `https://models.dev/api.json`.

- **Open the form.** Run `bun instance browser $R goto <url>/model-providers/create`. The heading `Add model provider` shows, with the combobox `Provider` and the textboxes `Name`, `Base URL` and `API key`.
- **Pick from the catalog.** Run `bun instance browser $R click 'role=combobox[name="Provider"]'`, `bun instance browser $R type "Anthropic"`, then `bun instance browser $R click 'role=option[name="Anthropic"]'`. The textbox `Name` holds `Anthropic` and `Base URL` holds `https://api.anthropic.com/v1`.
- **Add.** Run `bun instance browser $R fill 'role=textbox[name="API key"]' "sk-ant-verify-placeholder"`, then `bun instance browser $R click 'role=button[name="Add model provider"]'`. The page URL becomes `<url>/model-providers/<id>`.
- **Read back.** Run `$C model-provider list`. The item `Anthropic` has `"catalogId":"anthropic"` and `"baseUrl":"https://api.anthropic.com/v1"`, and no API key field.
- **Proof.** Run `bun instance browser $R snapshot --filename=model-providers/detail.md`, `bun instance browser $R screenshot --filename=model-providers/detail.png` and `$C model-provider list > /tmp/yapir-instances/$R/evidence/model-providers/list.json`.

## Gotchas

- Yapir does not check the API key at creation. A placeholder key proves the creation only. A model call, from an agent or the Assistant, needs a real key that the user gives.
- `fill` on the `Provider` combobox does not filter it: click it, then `type`.
- The Provider listbox starts empty while the catalog loads. Snapshot again before you click an option.
