# Landing Page Outline Builder

A writer picks the traffic, the products, the claims and the purchase worries. The app returns an ordered outline of one H1 and a series of H2s, with a note under each heading saying what that section has to do.

The outline is the deliverable. There is no body copy generation, no publishing, and no accounts.

## Stack

- Next.js 15, App Router, TypeScript, deployed on Vercel
- Tailwind for layout, plus `app/globals.css` for the type and colour tokens
- Postgres (Vercel Postgres / Neon) with Drizzle for saved outlines
- Anthropic SDK, server side only. The key never reaches the browser
- Access control is Vercel deployment protection. There is no auth code

## Environment

```
SHEET_CSV_URL      # Google Sheet published to the web as CSV. Read only.
ANTHROPIC_API_KEY  # server side only
DATABASE_URL       # Postgres
```

Copy `.env.example` to `.env.local` and fill it in.

## Running it locally

```bash
npm install
npm run db:push      # or psql -f drizzle/0000_outlines.sql
npm run dev
```

`DATABASE_URL` can point at a local Postgres or a Neon dev branch. Without it the app still runs: the index page and the outline page explain that saved outlines are unavailable rather than crashing.

For a sheet, either publish a real one or serve the bundled sample:

```bash
cd sample && python3 -m http.server 8931
# SHEET_CSV_URL=http://127.0.0.1:8931/repository.csv
```

```bash
npm test          # domain unit tests
npm run typecheck
npm run build
```

## The repository sheet

One Google Sheet holds everything a marketer edits. The app reads it and never writes to it.

### Getting the `SHEET_CSV_URL`

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

### Columns

| column    | required     | meaning |
| --------- | ------------ | ------- |
| `type`    | yes          | `product`, `claim` or `worry`. `objection` is accepted as an alias for `worry`. |
| `product` | for products | On a product row this is the handle and acts as the id. On a claim or worry row it is the handle it belongs to. Blank or `*` means every product. |
| `label`   | yes          | The short line on the pill. For a worry, the worry in customer voice. |
| `detail`  | no           | Supporting spec for a claim. For a worry, the reassurance we own. |
| `tags`    | no           | Comma separated. Only used to pick the default insert position for a worry that gets its own section. |

The header row must be the first row of the published tab, and the five names above must appear in it. Header names are trimmed and lowercased, so ` Type ` is fine. Extra columns are ignored, as are rows whose `type` is empty or unrecognised, so a notes column or a spacer row does no harm.

Cells may contain commas. A `tags` cell holding more than one tag, or a `detail` cell holding a sentence with a comma, comes out of Google quoted (`"price, shipping"`) and papaparse reads it back correctly. Nothing needs escaping by hand in the sheet.

`GET /api/repository` fetches, parses with papaparse, validates with zod and returns `{ products, claims, worries }`. Cached for five minutes; `?fresh=1` bypasses it. On failure it returns 502 with a message naming the likely cause and the sheet address, and the UI offers a paste box that parses pasted CSV client side into the same shape.

### Ids are derived, not positional

Claim and worry ids are built from type, product scope and label (`claim.brass.pull.ages.instead.of.chipping`). Inserting a row above them in the sheet does not orphan every saved outline below it. Renaming a `label` does orphan that row, which shows in the UI as a struck pill rather than crashing or being silently dropped.

## Where the logic lives

`lib/outline/` is pure functions. No React, no fetch, unit tested.

| file                 | what it owns |
| -------------------- | ------------ |
| `awareness.ts`       | The five stages. Each carries the lead and the reason for it, plus the spine it picks. |
| `spines.ts`          | Six spines, each an ordered list of slots with a role and a job. |
| `goals.ts`           | The four page goals and the close job each one implies. |
| `placement.ts`       | The late tag list, which slots a worry may sit in, and assign / unassign. |
| `structure.ts`       | `buildStructure` assembles the ordered sections. |
| `order.ts`           | Reconciling a stored manual order against a changed section set. |
| `drift.ts`           | How many sections drifted since the last heading pass. |
| `scrub.ts`           | Enforces the punctuation rule on anything a writer reads. |
| `markdown.ts`        | Copy as markdown, with heading levels intact. |
| `brief.ts`           | What a saved outline stores, and the JSON block the prompt receives. |
| `headings-reply.ts`  | Turning a model reply into headings, or `null` so the caller retries. |

Two behaviours are worth knowing because they are judgement calls, not consequences of the spec:

**A worry pointing at a slot the current spine does not have is unplaced, not lost.** Override the spine after placing worries and those worries reappear in the tray instead of vanishing with a stale assignment.

**A new section splices in after the section it follows in the base order, not at an absolute index.** Drag the close to the top, then give a worry its own section, and the new section lands after the spine slots where it belongs rather than in the middle of them.

## Heading generation

`POST /api/headings` takes the brief plus the assembled structure and returns `[{ id, heading, note }]`.

Server side, Anthropic SDK, model `claude-sonnet-4-6`, `max_tokens` 1500. The prompt lives in `lib/prompts/headings.md` and is read with `fs.readFile` at request time, so a writer can edit it without touching component code. `{{BRIEF}}` is where the brief JSON is injected.

The reply is validated with zod and retried once on a parse failure. On a second failure the route returns 200 with `{ headings: [], error }` and the UI keeps showing the structure with role placeholders. A failed heading pass never wipes the outline.

The punctuation rule (no hyphens, dashes, semicolons or colons in any heading or note) is stated in the prompt **and** enforced on the way out by `scrub`. The prompt is the instruction; the scrub is the guarantee.

## Saved outlines

One table. `brief` stores ids, never labels, so a sheet edit flows through.

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

Sections can be dragged with a pointer or moved with the arrow keys from the focused drag handle, which announces each move to a live region. Position zero is always the H1.

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
