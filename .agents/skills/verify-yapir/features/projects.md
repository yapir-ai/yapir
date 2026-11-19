# Projects

An Organization Admin creates, deletes and restores a project; an Organization Admin or Project Admin edits its name, instructions and CI repository. The projects list, the project pages and the CLI show the same state.

## Sub-features

- `project-create`: create a project from the UI or the CLI.
- `project-edit`: change the name, instructions and CI repository on the **Settings** page.
- `project-delete`: delete a project. The list hides it until **Show deleted** is on.
- `project-restore`: restore a deleted project from its overview or **Settings** page, or the CLI.

## How to get to it (user POV)

- Sidebar **Projects** (`<url>/projects`), then **Create project**: `<url>/projects/create`.
- A project row in the list (`<url>/projects/<id>`), then sidebar **Settings**: `<url>/projects/<id>/settings`.
- `yapir project list|info|create|update|delete|restore`.

## Driving it with bun instance

Preconditions:

- Baseline. No project named `Release train`.

- **Open the form.** Run `bun instance browser $R goto <url>/projects`, then `bun instance browser $R click 'role=link[name="Create project"]'`. The heading `Create project` shows, with the textboxes `Name` and `Instructions`.
- **Create.** Run `bun instance browser $R fill 'role=textbox[name="Name"]' "Release train"`, `bun instance browser $R fill 'role=textbox[name="Instructions"]' "Answer in English."` and `bun instance browser $R click 'role=button[name="Create project"]'`. The page URL becomes `<url>/projects/<id>/repositories` and the toast `Project created` shows. Keep `<id>`.
- **Read back.** Run `$C project info <id>`. Exit code `0`, with `"name":"Release train"` and `"instructions":"Answer in English."`.
- **Edit.** Run `bun instance browser $R goto <url>/projects/<id>/settings`, `bun instance browser $R fill 'role=textbox[name="Name"]' "Release train 2"`, `bun instance browser $R click 'role=tab[name="Edit"]'`, `bun instance browser $R fill 'role=textbox[name="Instructions"]' "Answer in French."`, then `bun instance browser $R click 'role=button[name="Save project"]'`. The `Form actions` region with `Unsaved changes` goes away and the toast `Project updated` shows. `project info <id>` gives `"name":"Release train 2"` and `"instructions":"Answer in French."`.
- **Delete.** Run `bun instance browser $R click 'role=button[name="Delete project"]'`, then `bun instance browser $R click 'role=button[name="Confirm deletion?"]'`. The page URL becomes `<url>/projects`, the toast `Project deleted` shows and the list no longer shows `Release train 2`. `project info <id>` gives a non-null `deletedAt`.
- **Show deleted.** Run `bun instance browser $R click 'role=button[name="Show deleted"]'`. The row `Release train 2` shows with the badge `Deleted`.
- **Restore.** Run `bun instance browser $R click 'role=link[name="Release train 2"]'`, then `bun instance browser $R click 'role=button[name="Restore project"]'`. The heading loses its `Deleted` badge and the toast `Project restored` shows. `project info <id>` gives `"deletedAt":null`.
- **CLI entry.** Run `$C project create --data '{"name":"CLI project"}'`. Status `201 Created` and the new project on stdout. Then `project update <id> --data '{"instructions":"From CLI"}'` gives `200 OK`, `project delete <id>` gives `204 No Content`, and `project restore <id>` gives `200 OK` with `"deletedAt":null`.
- **Proof.** Run `bun instance browser $R goto <url>/projects`, `bun instance browser $R snapshot --filename=projects/list.md` and `bun instance browser $R screenshot --filename=projects/list.png`, then `$C project list > /tmp/yapir-instances/$R/evidence/projects/list.json`. Both show `Release train 2` and `CLI project`.

## Gotchas

- On **Settings**, a non-empty `Instructions` field opens on the `Preview` tab. Click `role=tab[name="Edit"]` before filling `Instructions`.
- The **CI repository** select shows on **Settings** only after the project has at least one repository. Linking the first repository sets it automatically.
- The **Settings** form saves only on **Save project**. Leaving through an in-app link opens the `Discard unsaved changes?` dialog; a `goto` opens a `beforeunload` dialog (`bun instance browser $R dialog-accept`).
- The project switcher of the sidebar keeps the name of a deleted project. Assert on the list in `main`, not on the whole snapshot.
- **Delete project** asks a second click on **Confirm deletion?** in place (not in a dialog), and resets on blur.
- For an Organization Admin, `project list` also returns the deleted projects, with their `deletedAt`. Assert on `deletedAt`, not on the presence of the item.
- A restore keeps the automations of the project deleted.
- The **Repositories** page, where creation lands, offers no repository without a Git host Connection. See [automations](./automations.md).
