# Model providers

An Organization Admin adds a model provider from the catalog of models.dev, edits its settings or rotates its API key, and deletes or restores it. The catalog fills the name and the base URL, and the admin gives the API key. Agents and the Assistant then use its models.

## Sub-features

- `provider-catalog`: the **Provider** combobox lists and filters the catalog.
- `provider-create`: add a provider with an API key.
- `provider-key-hidden`: Yapir never returns the API key.
- `provider-edit`: update the name, base URL or API key on the provider page.
- `provider-delete`: soft-delete a provider when no active agent or default uses it.
- `provider-restore`: restore a deleted provider after turning **Show deleted** on.

## How to get to it (user POV)

- Sidebar **Organization**, then **Model providers** (`<url>/model-providers`), then **Add model provider**: `<url>/model-providers/create`.
- A provider row in the list: `<url>/model-providers/<id>`.
- `yapir model-provider list|info|create|update|delete|restore` and `yapir provider-catalog list`.

## Driving it with bun instance

Preconditions:

- Baseline. The machine reaches `https://models.dev/api.json`. No model provider named `Anthropic`.

- **Open the form.** Run `bun instance browser $R goto <url>/model-providers`, then `bun instance browser $R click 'role=link[name="Add model provider"]'`. The heading `Add model provider` shows, with the combobox `Provider` and the textboxes `Name`, `Base URL` and `API key`.
- **Pick from the catalog.** Run `bun instance browser $R click 'role=combobox[name="Provider"]'`, `bun instance browser $R type "Anthropic"`, then `bun instance browser $R click 'role=option[name=/^Anthropic$/]'`. The textbox `Name` holds `Anthropic` and `Base URL` holds `https://api.anthropic.com/v1`.
- **Add.** Run `bun instance browser $R fill 'role=textbox[name="API key"]' "sk-ant-verify-placeholder"`, then `bun instance browser $R click 'role=button[name="Add model provider"]'`. The page URL becomes `<url>/model-providers/<id>` and the toast `Model provider created` shows. Keep `<id>`.
- **Read back.** Run `$C model-provider info <id>`. It gives `"name":"Anthropic"`, `"catalogId":"anthropic"`, `"baseUrl":"https://api.anthropic.com/v1"`, `"deletedAt":null`, and no `apiKey` field.
- **Edit, delete and restore.** Fill `Name` with `"Anthropic renamed"` and click `role=button[name="Save model provider"]`; `model-provider info <id>` gives `"name":"Anthropic renamed"`. Click `role=button[name="Delete model provider"]`, then `role=button[name="Confirm deletion?"]`; URL becomes `<url>/model-providers` and `deletedAt` is non-null. Click `role=button[name="Show deleted"]`, open `role=link[name="Anthropic renamed"]` and click `role=button[name="Restore model provider"]`; `deletedAt` returns to `null`.
- **Proof.** Run `bun instance browser $R snapshot --filename=model-providers/detail.md`, `bun instance browser $R screenshot --filename=model-providers/detail.png` and `$C model-provider list > /tmp/yapir-instances/$R/evidence/model-providers/list.json`.

## Gotchas

- Yapir does not check the API key at creation. A placeholder key proves the creation only. A model call, from an agent or the Assistant, needs a real key that the user gives.
- `fill` on the `Provider` combobox does not filter it: click it, then `type`. Use an exact regex such as `name=/^Anthropic$/` so substring matches do not hit another provider.
- Deleting a provider referenced by an active agent or by organization Defaults fails with `409 MODEL_PROVIDER_IN_USE`.
- `model-provider list` also returns deleted providers, with default `limit=10`. Read back a specific provider with `model-provider info <id>`.
