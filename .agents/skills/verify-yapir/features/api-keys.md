# API keys and CLI login

A user creates an API key in the UI, copies it with its CLI login command, and logs in the CLI with it. The key then acts as the user, until the user revokes it.

## Sub-features

- `api-key-create`: create a named key. The UI shows it once, with the login command.
- `api-key-login`: `yapir login --url <url> --key <key>` stores the instance.
- `api-key-revoke`: a revoked key gets `401` responses.

## How to get to it (user POV)

- The user menu at the bottom of the sidebar, then **API keys** (or shortcut `G K` / Command Palette `Mod+K`): `<url>/api-keys`.
- `yapir login`, then any `yapir` command.

## Driving it with bun instance

Preconditions:

- Baseline. The instance already has one key, `instance`, that `up` created for the CLI of the instance.

- **Open the page.** Run `bun instance browser $R click 'role=button[name=/^Instance Admin/]'`, then `bun instance browser $R click 'role=menuitem >> text=API keys'`. The page URL becomes `<url>/api-keys`, with the heading `API keys` and a table that has the row `instance`.
- **Create.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Laptop"`, then `bun instance browser $R click 'role=button[name="Create API key"]'`. The textbox `New API key` holds the key, and the textbox `Log in with the CLI` holds `npx @yapir-ai/cli login --url <url> --key <key>`. The table has the row `Laptop`.
- **Copy the key.** Run `key=$(bun instance browser $R --raw eval "el => el.value" 'role=textbox[name="New API key"]' | tr -d '"')`. `$key` holds the key, 64 letters.
- **Log in.** Run `$C login --url <url> --key "$key" --name laptop`. It prints `Logged in to laptop (<url>) as Instance Admin <admin@yapir.test>.`
- **Use the key.** Run `$C --instance laptop user list`. Status `200 OK`, with `admin@yapir.test`.
- **Revoke.** Run `bun instance browser $R click 'role=row[name=/Laptop/] >> role=button[name="Revoke"]'`. Yapir revokes it without a confirmation, and the row `Laptop` goes away. `$C --instance laptop user list` then exits with `1`, with status `401`.
- **Proof.** Snapshot and screenshot `<url>/api-keys` after each step to `api-keys/<step>.md` and `api-keys/<step>.png`, and keep the CLI outputs in `/tmp/yapir-instances/$R/evidence/api-keys/`.

## Gotchas

- The UI shows the key only after the creation. A reload hides it.
- Keep the `instance` key: the CLI of the instance uses it, and `doctor` checks it.
- The login command in the UI uses the published CLI, `npx @yapir-ai/cli`. The recipe runs the CLI of the checkout, which is the code under test.
- `$C login` without `--name` names the instance after the first label of the URL host (for `bun instance` URLs on the Docker bridge gateway such as `http://172.17.0.1:<port>`, that is `172` for every instance). Pass `--name`.
