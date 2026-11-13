# Frontend conventions

## Routes and data

- Validate path params and search params with Zod at the route boundary (`params.parse`, `validateSearch`). Define frontend-specific search schemas in the web resource layer, reusing API field schemas where appropriate. Put search params used by the loader in `loaderDeps`.
- Read API resources through TanStack DB collections defined in `lib/<domain>/<resource>.collection.ts` with `collection(id, options)` from `lib/db/collection.ts`. The helper supplies QueryClient and the resource query key. Share one collection per resource/business scope across lists, details, breadcrumbs and selects.
- For primary data, await `dbClient.preloadLiveQuery(options)` in the route loader and use the same options with `useLiveSuspenseQuery` in the component. Put reusable queries in `<resource>.queries.ts`. Define them with `query((q) => ...)` from `lib/db/query.ts` to infer types and let DbClient resolve collection descriptors.
- Load Agents, Projects, Repositories and finite integration catalogs completely. Load Automations completely within a project-scoped collection (`automationsCollection(projectId)`); reads across projects load them on demand by ID (`accessibleAutomationsCollection`). Filter, sort and paginate these eager collections locally; Tasks and Executions load on demand. Keep Query keys and invalidation inside the collection layer. Router's `defaultPreloadStaleTime` stays `0`; resource collections use TanStack Query's freshness and refetch defaults, except execution lists, which refetch every 15 s to follow running executions.
- Compose resource relations with live queries. API DTOs expose resource fields and foreign IDs; collection queryFns and mutation handlers call the typed Hono client with `parseResponse`. Infer response types from the client.
- On-demand collections honor requested filters, ordering and windows, including windows larger than the API page cap; reject unsupported predicates and index ordering fields. Previous/Next advances the offset by `limit`: request `limit + 1` rows and display `limit`. Keep pickers bounded and searchable too.
- API Lists use separate `sort` (resource field) and `order` (`asc`/`desc`) parameters. Tasks sort by the latest Execution's start, falling back to creation for Tasks without an Execution; use ID descending as the tie-breaker.
- The URL owns shareable filters, sorting and pagination; DB owns resource state; React state owns local UI state.

## Forms and mutations

- Use TanStack Form through the shared `app-form` integration and native `createFormHook`. Validate with Zod; reuse the operation's request schema when it matches the form's values.
- Shared field components own value/change/blur wiring, labels, accessibility and validation error presentation. Show validation errors on blur and submit; revalidate on change so corrected errors disappear immediately. Keep this behavior in the shared form integration.
- Use collection `insert`, `update` and `delete` with their default optimistic behavior; mutation handlers own HTTP persistence and publication of confirmed data. Create awaits persistence before it navigates. Delete navigates immediately.
- Use permanent UUIDv7 IDs for inserts. Publish server responses through collection write utilities; the adapter updates eager caches and revalidates on-demand requests. Keep Delete pending through navigation so removal does not flash the Info page's not-found state.
- Choose Create/Update form sharing locally. Prefer readable, inferred types and some duplication over a shared form with awkward props or modes.
- Editor and create forms group their fields in `FormSection`s: a heading, and at most one short sentence of help beside the fields. Give a field a description only where its domain is not obvious. Create forms end with a `FormFooter` holding `form.FormError` and the `SubmitButton`.
- Configuration editors are one form with a `form.SaveBar`, labeled with verb and object ("Save agent"). It appears once a value changes, and offers Discard. A successful submit resets the form to the saved values. `form.Form` submits on ⌘/Ctrl+Enter when a value changed, and asks for a confirmation before a navigation discards unsaved edits. Pickers update the form directly; closing preserves selections. New triggers start with a `false` CEL expression, or an empty cron pattern for schedules.
- Machine text inputs, such as CEL, cron or host lists, use `field.CodeField`, with an example.
- Editor pages end with a danger zone: `SoftDeleteZone` names the consequences of the delete.
- Write-only secrets are fields of the editor's form: empty keeps the current value, with a `••••••••` placeholder. An update carrying only a secret changes no collection item: these resources update through a `PATCH` helper of their collection module, which publishes the response.
- Immediate actions, such as Delete, Restore or a switch, persist outside the form.
- A failed submit shows the problem's detail in `form.FormError`, above the submit button. The `SaveBar` holds it. A failed action outside a form shows it in a toast: `toastFailure` for a collection transaction, `toastError` for another request.
- Keep pending presentation minimal for now; add dedicated loaders when requested. Field validation remains visible.

## UI and composition

- Target desktop layouts for application compositions; preserve the responsive defaults of installed shadcn primitives.
- Install and update shadcn primitives and theme through its CLI using the repository's `components.json`. Keep generated defaults vanilla; obtain user agreement before customizing them or introducing lookalikes.
- Pages and layouts compose styled components. Their classes describe layout: flex/grid, spacing, alignment, sizing. Colors, typography, borders and visual states belong in `components/ui`; variations go through component variants.
- Each page is a `Page` with a `PageHeader`. Lists and tables use `width="wide"`; forms and reading surfaces keep the default narrow width.
- Colors come from the theme tokens of `main.css`. A status uses `Status` and its tones (`success`, `warning`, `info`, `destructive`, `muted`), with an icon and a label. An Execution state is `ExecutionState`; a date is `RelativeTime`. Machine text, such as an ID, a model, a URL or a key, is `Code`.
- Reuse inherited primitive styling instead of restating it at call sites. Use the shared styled Link for text links. For button-styled links, apply `buttonVariants` to a router Link; Base UI Button enforces button semantics even with `render`.
- A displayed reference to another resource opens it. A select or picker has an `OpenLink` beside it, in a `ButtonGroup`. A read-only display links the resource to its page. An `Item` row links through its `ItemLink`; other links of the row stay clickable above it. A table row stays one link.
- Keep generic compositions in `components/` and domain-specific compositions in `lib/<domain>/`. Extract a component for a clear responsibility or actual reuse, rather than splitting every piece of JSX.
- Keep the application shell and sidebar compositions in `lib/shell`; `components/ui` is the design system. The primary sidebar holds the navigation of the open project, or of the last one opened, under the project switcher. A route with other contextual navigation, such as the Assistant, provides it through `staticData.sidebar`: a second sidebar beside the primary one, which then collapses to icons.
- The header holds the breadcrumbs and the global controls. The Assistant opens in a dock on the right of every page, from the header or with ⌘J.
- Navigation pages live in `lib/shell/navigation.ts`, shared by the sidebar, the command palette and the shortcuts: `g` then a letter for a page, `p` then a letter for a page of the project in the sidebar. A command palette item that opens a page is a link.
- Declare every keyboard shortcut in `lib/shell/app-hotkeys.ts` with TanStack Hotkeys `defineAppHotkeys`, and register it with `useHotkey` where its action lives. Show it with `Shortcut` in tooltips, menus and the command palette. List searches use `ListSearch` (`/`); the primary create link of a list page uses `CreateLink` (`c`).
- A resource list is a `Table` with one `TableRowLink` per row, a `ListToolbar` (search, filters, "Show deleted"), and `ListPagination` (`components/list-controls.tsx`). A list without rows composes the shadcn `Empty` parts: `ListNoResults` when a filter applies, a first-use state otherwise. A route that fails shows `RouteError`.
- Declare breadcrumbs in route `staticData.breadcrumb` and render them once in the shell. Dynamic labels use a component reading the route's typed data; pages do not render their own breadcrumbs.
- All text is written in english. No french, no i18n
- components/ui should be considered a generic "design system" library. If you need to create component related to domain A. Put them in lib/a
