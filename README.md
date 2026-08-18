# Landing Page Outline Builder

A writer picks the traffic, the products, the claims and the purchase worries. The app returns an ordered outline of one H1 and a series of H2s, with a note under each heading saying what that section has to do. A section whose type repeats blocks also carries H3 items.

The outline is the deliverable. There is no body copy generation, no publishing, and no accounts.

## Stack

- Next.js 15, App Router, TypeScript, deployed on Vercel
- Tailwind for layout, plus `app/globals.css` for the type and colour tokens
- Postgres (Vercel Postgres / Neon) with Drizzle for saved outlines
- Anthropic SDK, server side only. The key never reaches the browser
- Access control is Vercel deployment protection. There is no auth code

## Environment

```
SHEET_ID           # Google Sheet holding the nine tabs. Read only. Preferred.
SHEET_CSV_URL      # One published tab, the original layout. Used only when SHEET_ID is unset.
ANTHROPIC_API_KEY  # server side only
DATABASE_URL       # Postgres. POSTGRES_URL is read too, see below.
```

Copy `.env.example` to `.env.local` and fill it in.

`SHEET_ID` wins when both are set. With neither, the app runs on the built in framework and offers the paste box.

## Running it locally

```bash
npm install
npm run db:push      # or psql -f drizzle/0000_outlines.sql
npm run dev
```

`DATABASE_URL` can point at a local Postgres, a Neon dev branch or a Supabase project. Without it the app still runs: the index page and the outline page explain that saved outlines are unavailable rather than crashing, and everything except saving works.

### Which variable holds the address

Nothing sets `DATABASE_URL` by itself. The Vercel Postgres and Supabase integrations both write `POSTGRES_URL`, so a deployment that looks correctly configured in the dashboard would report no database at all if that were the only name read. Four names are tried in order, first usable one wins:

```
DATABASE_URL  POSTGRES_URL  POSTGRES_PRISMA_URL  POSTGRES_URL_NON_POOLING
```

A value that is not a postgres address is skipped rather than handed to the driver, and the interface says which variable was wrong.

### When the database is there but the query fails

The address being right is only half of it. A fresh database has no tables, because creating one and migrating it are separate steps, so the first thing to try is:

```bash
npm run db:push      # or psql "$DATABASE_URL" -f drizzle/0000_outlines.sql
```

`db:push` reads the same four variable names the app does, so it works on a deployment that only has `POSTGRES_URL`. On a hosted database with no local setup, pasting `drizzle/0000_outlines.sql` into the provider's SQL editor does the same job. The migration is `CREATE TABLE IF NOT EXISTS`, so running it twice is safe.

The interface names the cause rather than repeating "check the database address" at everything. A missing table, a database that does not exist, a refused user or password, a host that cannot be found, a refused connection, no connection slots left, and both directions of TLS failure each get their own sentence and their own next step. The raw driver error goes to the server log as `[db] ... failed`, which is where to look when the sentence says only to check the address.

One wrinkle worth knowing if you touch that code: Drizzle wraps the driver error, so the SQLSTATE is on `error.cause` rather than on the error itself. Reading only the outer error sends every failure to the generic sentence.

**`SUPABASE_URL` is not a database address.** It holds the REST endpoint (`https://<project>.supabase.co`), not a connection string, so it is never used here. The Supabase connection string is in the dashboard under **Project settings > Database > Connection string**. Take the **transaction pooler** one on port 6543 for serverless, which this app is already set up for: it opens one connection with `prepare: false`, which that pooler requires.

For a sheet, either point at a real one or serve the bundled sample:

```bash
cd sample && python3 -m http.server 8931
# SHEET_CSV_URL=http://127.0.0.1:8931/repository.csv
```

`sample/tabs/` holds the nine tab version of the same content. Every tab there reproduces the built in framework exactly, so it doubles as the template to copy into a real sheet. `tests/framework-tabs.test.ts` asserts that, which keeps the sample honest as the code changes.

```bash
npm test          # domain unit tests
npm run typecheck
npm run build
```

## The sheet

One Google Sheet holds everything a marketer edits. The app reads it and never writes to it.

There are two layouts. The **nine tab** layout is the one to use: it holds the content *and* the editorial framework, so the awareness stages, the spines, the section jobs and the late tag list are all editable without a deploy. The **single tab** layout came first, holds content only, and is still read when `SHEET_ID` is unset.

### The nine tab layout

Set `SHEET_ID` to the id in the address bar, or paste the whole address and the app will pull the id out of it:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit#gid=0
SHEET_ID=<SHEET_ID>
```

The sheet must be shared as **anyone with the link can view**. No publishing step is needed, because tabs are addressed by name rather than by `gid`:

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/gviz/tq?tqx=out:csv&sheet=Awareness
```

Tab names are exact and case sensitive. Three hold content, six hold the framework:

| tab | holds | required |
| --- | ----- | -------- |
| `Products` | one row per product | yes |
| `Claims` | one row per claim | yes |
| `Worries` | one row per purchase worry | yes |
| `Awareness` | the traffic stages, each with its lead and the spine it picks | no |
| `Spines` | the argument shapes | no |
| `Slots` | the ordered sections inside each spine | no |
| `Goals` | the page goals and the close job each implies | no |
| `Sections` | the roles and jobs of the sections the mechanism inserts | no |
| `Settings` | single values, currently the late tag list | no |

**Every framework tab is optional.** A missing one falls back to the built in value for that slice alone, and step one says which slices came from the sheet and which are built in. A sheet with only the three content tabs is a perfectly normal setup and reports no problems.

#### Columns, tab by tab

`Products`

| column | required | meaning |
| ------ | -------- | ------- |
| `handle` | yes | The id. Referenced by the `product` column on claims and worries. |
| `label` | yes | The short line on the pill. |
| `detail` | no | Supporting line under the label. |

`Claims` and `Worries`

| column | required | meaning |
| ------ | -------- | ------- |
| `id` | no | Used verbatim when present. Leave it blank and an id is derived from the label. See below. |
| `product` | no | The handle it belongs to. Blank or `*` means every product. |
| `label` | yes | The claim, or the worry in customer voice. |
| `answer` | no | Worries only. The reassurance we own. `detail` is accepted as the older name. |
| `detail` | no | Claims only. The supporting spec. |
| `tags` | no | Worries only. Comma separated. Picks the default insert position for a worry given its own section. |

`Awareness`

| column | required | meaning |
| ------ | -------- | ------- |
| `id` | yes | Stored in saved outlines, so keep it stable. |
| `label` | yes | What the writer picks from. |
| `lead` | yes | The lead instruction handed to the prompt. |
| `why` | no | The reason shown under the picker. |
| `spine` | yes | The `id` of a row in `Spines`. |

`Spines`

| column | required | meaning |
| ------ | -------- | ------- |
| `id` | yes | Referenced by `Awareness.spine` and `Slots.spine`. |
| `name` | yes | The full name shown in the override picker. |
| `note` | no | One line on when to reach for it. |

`Slots`

| column | required | meaning |
| ------ | -------- | ------- |
| `spine` | yes | The `id` of a row in `Spines`. |
| `key` | yes | Unique within that spine. Two rows sharing one would collapse two sections into one. |
| `position` | no | Sorts the slots. Rows with no position keep their sheet order. |
| `role` | yes | The section role shown on the slab. |
| `job` | no | What that section has to do. |

`Goals`

| column | required | meaning |
| ------ | -------- | ------- |
| `id` | yes | Stored in saved outlines. |
| `label` | yes | What the writer picks from. |
| `close job` | yes | What the close section has to do under this goal. |

`Sections`

| column | required | meaning |
| ------ | -------- | ------- |
| `id` | yes | One of `proof`, `offer`, `faq`, `close`, `own.early`, `own.late`. All six must be present. |
| `role` | yes | The role shown on the slab. |
| `job` | no | What it has to do. The close is deliberately blank, because the goal supplies its job. |

`Settings`

| column | required | meaning |
| ------ | -------- | ------- |
| `key` | yes | Currently only `late tags`. |
| `value` | yes | For `late tags`, a comma separated list. A worry carrying one of these tags lands after the offer rather than before it. |

#### When the sheet is wrong

The framework is checked before it is used. A framework that would build a broken outline is rejected **whole** rather than half applied, the built in one takes over, and step one lists what to fix. The checks are:

- a stage pointing at a spine no row defines
- a spine with no slots
- two slots in one spine sharing a key
- a repeated `id` within a tab
- a `Sections` tab missing one of the six required ids
- a row missing a required column, named by its row number

The rejection is whole because a half applied framework is harder to reason about than a known one. One consequence is worth stating plainly: **a `Spines` tab replaces the whole list, so it has to come with an `Awareness` tab that points into it.** Filling in `Spines` alone leaves the built in stages pointing at spines the sheet no longer has, and the whole thing falls back with a message naming the stage.

### The single tab layout

Used when `SHEET_CSV_URL` is set and `SHEET_ID` is not. It holds products, claims and worries in one flat table with a `type` column, and the framework is always the built in one.

#### Getting the `SHEET_CSV_URL`

In the sheet: **File > Share > Publish to web**. In the first dropdown pick the **single tab** that holds the rows, not "Entire document" — CSV is only offered for one tab. In the second dropdown pick **Comma separated values (.csv)**, then **Publish**. Copy the address it gives you:

```
https://docs.google.com/spreadsheets/d/e/2PACX-1vAbC.../pub?gid=0&single=true&output=csv
```

Three things trip people up:

- **That `/d/e/2PACX-...` id is not the id in your address bar.** Publishing mints a separate id. Copy the address out of the publish dialog rather than building one by hand.
- **Publishing is not the same as sharing.** A sheet set to "anyone with the link can view" is still unpublished, and `output=csv` returns an error page until you publish. That is the failure the 502 message points at.
- **`gid` selects the tab.** The publish dialog fills in the right one. If you later move the rows to a different tab, republish.

The export form is a working alternative and needs no publishing, only "anyone with the link can view":

```
https://docs.google.com/spreadsheets/d/<SHEET_ID>/export?format=csv&gid=<TAB_GID>
```

Either way the address ends up in `SHEET_CSV_URL`. Both redirect, and the route follows redirects.

**On staleness:** Google caches its own published CSV for a few minutes, and this app caches for five on top of that. "Refresh the sheet" clears the app's cache but not Google's, so a very fresh edit can take a couple of minutes to appear. That is Google, not this app.

#### Columns

| column    | required     | meaning |
| --------- | ------------ | ------- |
| `type`    | yes          | `product`, `claim` or `worry`. `objection` is accepted as an alias for `worry`. |
| `product` | for products | On a product row this is the handle and acts as the id. On a claim or worry row it is the handle it belongs to. Blank or `*` means every product. |
| `label`   | yes          | The short line on the pill. For a worry, the worry in customer voice. |
| `detail`  | no           | Supporting spec for a claim. For a worry, the reassurance we own. |
| `tags`    | no           | Comma separated. Only used to pick the default insert position for a worry that gets its own section. |

The header row must be the first row of the published tab, and the five names above must appear in it. Header names are trimmed and lowercased, so ` Type ` is fine. Extra columns are ignored, as are rows whose `type` is empty or unrecognised, so a notes column or a spacer row does no harm.

Cells may contain commas. A `tags` cell holding more than one tag, or a `detail` cell holding a sentence with a comma, comes out of Google quoted (`"price, shipping"`) and papaparse reads it back correctly. Nothing needs escaping by hand in the sheet.

### The repository route

`GET /api/repository` fetches every tab, parses with papaparse, validates with zod and returns `{ source, layout, sheet, products, claims, worries, framework, sources, problems }`. `sources` says where each framework slice came from, and `problems` is what to fix.

Cached for five minutes; `?fresh=1` bypasses it, which is what "Refresh the sheet" uses. On failure it returns 502 with a message naming the likely cause, and the UI offers a paste box that parses pasted CSV client side into the same shape. A paste supplies content only and leaves the framework alone.

A 502 still carries `framework` and `sources`, so a dead content tab does not also cost the writer their spines.

### Ids are derived, not positional

Claim and worry ids are built from type, product scope and label (`claim.brass.pull.ages.instead.of.chipping`). Inserting a row above them in the sheet does not orphan every saved outline below it.

Renaming a `label` does orphan that row, because the id was built from the label. It shows in the UI as a struck pill rather than crashing or being silently dropped. **Fill in the optional `id` column to avoid that**: an id given in the sheet is used verbatim, so the label becomes free to reword. Worth doing before a sheet has saved outlines pointing into it, since adding an id later changes the id and orphans the old one exactly as a rename would.

## Where the logic lives

`lib/outline/` is pure functions. No React, no fetch, unit tested.

| file                 | what it owns |
| -------------------- | ------------ |
| `framework.ts`       | The `Framework` type and the built in defaults, which are what a sheet tab overrides. |
| `awareness.ts`       | The five built in stages. Each carries the lead and the reason for it, plus the spine it picks. |
| `spines.ts`          | Six built in spines, each an ordered list of slots with a role and a job. |
| `goals.ts`           | The four built in page goals and the close job each one implies. |
| `placement.ts`       | Which slots a worry may sit in, and assign / unassign. The late tag list it consults comes from the framework. |
| `structure.ts`       | `buildStructure` assembles the ordered sections. |
| `order.ts`           | Reconciling a stored manual order against a changed section set. |
| `drift.ts`           | How many sections drifted since the last heading pass. |
| `scrub.ts`           | Enforces the punctuation rule on anything a writer reads. |
| `markdown.ts`        | Copy as markdown, with heading levels intact. |
| `brief.ts`           | What a saved outline stores, and the JSON block the prompt receives. |
| `headings-reply.ts`  | Turning a model reply into headings, or `null` so the caller retries. |

`lib/repository/` reads the sheet.

| file                 | what it owns |
| -------------------- | ------------ |
| `sheet.ts`           | The tab names, which layout is in force, and the address of each tab. |
| `csv.ts`             | Reading rows and naming columns, tolerant of header case and spacing. |
| `parse.ts`           | The content tabs, and the id rule. |
| `framework-tabs.ts`  | The framework tabs, the cross checks, and the fallback. |

The framework is threaded through the domain functions as an optional last argument defaulting to the built in one, so every pure function stays callable without a sheet and the existing tests keep working as written.

Two behaviours are worth knowing because they are judgement calls, not consequences of the spec:

**A worry pointing at a slot the current spine does not have is unplaced, not lost.** Override the spine after placing worries and those worries reappear in the tray instead of vanishing with a stale assignment.

**A new section splices in after the section it follows in the base order, not at an absolute index.** Drag the close up the page, then give a worry its own section, and the new section lands after the spine slots where it belongs rather than in the middle of them.

## Heading generation

`POST /api/headings` takes the brief plus the assembled structure and returns `[{ id, heading, note }]`.

Server side, Anthropic SDK, model `claude-sonnet-4-6`, `max_tokens` 1500. The prompt lives in `lib/prompts/headings.md` and is read with `fs.readFile` at request time, so a writer can edit it without touching component code. `{{BRIEF}}` is where the brief JSON is injected.

The reply is validated with zod and retried once on a parse failure. On a second failure the route returns 200 with `{ headings: [], error }` and the UI keeps showing the structure with role placeholders. A failed heading pass never wipes the outline.

The punctuation rule (no hyphens, dashes, semicolons or colons in any heading or note) is stated in the prompt **and** enforced on the way out by `scrub`. The prompt is the instruction; the scrub is the guarantee.

## Saved outlines

One table. `brief` stores ids, never labels, so a sheet edit flows through.

Stage, goal and spine ids are stored exactly as chosen, even when the framework currently in force has no such id. The server has not read the sheet when a brief is loaded, so coercing there would quietly rewrite a sheet defined stage to a built in default on every save. The fallback happens at render time instead, where it is reversible: fix the sheet and the outline points at the right stage again.

```
outlines
  id          text primary key
  name        text not null
  brief       jsonb not null
  headings    jsonb not null
  created_at  timestamptz not null default now()
  updated_at  timestamptz not null default now()
```

`GET /api/outlines`, `POST /api/outlines`, `PUT /api/outlines/[id]`, `DELETE /api/outlines/[id]`.

## Screens

- `/` a list of saved outlines with name and date, and a button to start a new one
- `/outline/new` and `/outline/[id]` two columns on desktop, stacked on mobile, right column sticky

The left column is a sequence of six numbered steps: repository status, what the page is about, products, claims, worries in play, traffic and goal. The right column is the section stack, which renders as soon as one product and one claim are picked and does not wait for the heading pass.

Sections can be dragged with a pointer or moved with the arrow keys from the focused drag handle, which announces each move to a live region.

### The heading rule

One page, one H1, and it belongs to the hero rather than to whatever sits at position zero. Every other section is exactly one H2. H3s are not sections at all: they come from a section type that repeats items, which is what a feature grid or an FAQ accordion does.

Two consequences worth knowing:

- **The hero is pinned first and cannot be moved.** Nothing can be dropped above it, and the keyboard path stops at the second position. Before this rule, dragging the close to the top made the close the H1.
- **A stored order that puts something else first is healed on read.** `reconcileOrder` lifts the hero back to the front, so an outline saved before the rule existed opens correctly rather than carrying a second H1.

`lib/outline/heading-rule.ts` holds the whole invariant and `checkHeadingRule` reports what breaks it, including items on a section type that takes none, an item count outside the type's range, and an item heading that would render as a blank H3.

### Section types

Every section carries a `typeId` naming which Shopify section renders it, and each type declares its content slots and how many items it repeats. Items are the only source of an H3.

The list is keyed to **metaobject definition handles** rather than to theme section files. A definition is a stable contract of a handle and typed field keys, which is what the app fills; a theme section file is a rendering detail that changes whenever a designer touches it. Keying to definitions is also what makes writing to Shopify later a mutation rather than a migration.

`lib/outline/section-types.ts` holds the defaults, and `TYPE_BY_ROLE` picks a sensible type per argument beat. **The list is in code for now**, with a `Section types` sheet tab as the next step so the handles can match a real store without a deploy. The current handles (`lp_hero`, `lp_feature_grid` and so on) are placeholders to be replaced with real ones.

## Design notes

The tokens are in `:root` in `app/globals.css` and registered with Tailwind through `@theme inline`, so `bg-paper`, `text-muted` and `font-display` work as utilities.

The signature is the highlighter. A selected pill and an attached worry chip get `--mark` as a marker stripe rather than a fill, so selection reads as editing a page. Nothing else in the interface uses that yellow.

Interface copy follows the same house rules as the headings: no hyphens, dashes, semicolons or colons in any label, hint, button or empty state. Sentence case, active voice, a button says what happens. Errors say what went wrong and how to fix it. Empty states say what to do next. `tests/house-style.test.ts` holds the domain strings to that rule.

## Decisions worth revisiting

- The awareness stage to spine mapping is a default. Any writer can override it, and overriding never changes the lead text.
- Own section worries default to a position based on tags. Money and risk after the price, everything else before it. Manual reordering exists because that default will sometimes be wrong.
- One worry belongs to one section. Repeating a reassurance in two places is a real tactic and this model forbids it.
- The first selected claim becomes the lead claim. There is no explicit lead picker.
- The sheet is read only from the app. That keeps a single source of truth and costs the writer a context switch to add a claim.
- The framework tabs hold the editorial layer only. Assembly order, the prompt and the punctuation scrub stay in code, because they are mechanism rather than opinion and a sheet edit could break an outline in ways a writer could not diagnose.
- A framework that fails a cross check is rejected whole rather than in part. The alternative, applying the good tabs and falling back on the bad ones, produces combinations nobody chose.
