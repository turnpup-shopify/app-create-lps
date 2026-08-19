# Scalable Landing Page System

A specification package for building high quality Shopify landing pages at volume.

Worked example throughout is **Meridian Daily**, a third party tested daily multivitamin sold on subscription. Swap the product, keep the structure.

---

## The idea in one paragraph

You do not scale pages. You scale sections and claims.

A landing page is an ordered list of rhetorical roles, filled from a library of claims and objections, rendered through a small set of reusable layouts. Ten layouts and forty claims already produce more valid pages than you will ever ship. The variation that matters is which claims you load and in what order, and that is a selection problem, not a design problem.

---

## Stack

| Layer | Tool | Why |
|---|---|---|
| Content repository | Google Sheets | Already in use. Editable by anyone. No admin to build |
| Sheet API | Apps Script web app | One endpoint, no API keys in the client, already proven in this workflow |
| Builder app | Vercel | Already in use. Static plus serverless functions is all this needs |
| Copy generation | Vercel serverless function | Keeps the API key server side |
| Publishing | Manual until phase 3 | See phasing below |

No database. No CMS. No admin app. The sheet is the database and Vercel is the entire runtime.

---

## Phasing

**Build phase 1 completely before touching phase 2.** The whole point of phase 1 is finding out whether the outline logic and the claim library actually produce good pages. If they do not, no amount of integration work saves it, and integration is the most expensive part.

### Phase 1. Outline only

Vercel app plus Google Sheet. Nothing touches Shopify.

You pick a product, an awareness stage, an arc, and check claims. The app returns a page outline. You read it, judge it, and adjust the sheet.

Output is a screen. Nothing is published.

| Build | Spec |
|---|---|
| Sheet with all eight tabs | `03-sheet-spec.md` |
| Apps Script endpoint | `build/apps-script-repository.gs` |
| Section capability audit | `07-section-audit.md` |
| Outline builder on Vercel | `04-outline-logic.md`, `06-ui-spec.md` |

**Done when** you can generate ten outlines and honestly say which three are good and why. If every outline feels the same, the problem is the claims tab, and that is exactly the thing this phase exists to surface.

### Phase 2. Copy, still no Shopify

Add generation. Add an export.

The app now produces finished copy per section. You export it as a brief and build the page by hand in the Shopify theme editor, using sections from the audit.

Hand building is not a failure state here. It is a deliberate check. Building four pages by hand tells you whether the section vocabulary is right before you automate against it, and four pages is maybe two hours.

| Build | Spec |
|---|---|
| Generation function on Vercel | `05-generation-spec.md` |
| Review screen showing copy beside source claims | `05-generation-spec.md` |
| Export to markdown or JSON | Below |

**Done when** four pages are live, built by hand from exported briefs, and you would defend all four.

### Phase 3. Publishing

Only now. Metafields, the Admin API, the render template.

| Build | Spec |
|---|---|
| Everything | `08-publishing.md` |

**Do not start this until phase 2 is done.** Everything in `07` is written as a future state.

---

## The phase 2 export

A single JSON blob per page, plus a readable markdown version.

```
## Section 3 — Prove the benefit — image-with-text

Headline   Absorbs without the conversion step
Body       Roughly 40 percent of people carry a variant that
           blunts folate conversion. Methylated forms skip that
           step entirely.
Image      as_01 (4x5)
From       cl_02
```

Copy and paste into the theme editor. Ugly, and it works, and it costs nothing to build.

The JSON version is the same data and becomes the phase 3 payload unchanged. Design the export once, use it twice.

---

## Scope

**Two page archetypes, both of which exist in the theme today.**

| Archetype | What it is |
|---|---|
| `standard` | The `temp-replo-hero` lander |
| `listicle_a` | The advertorial with five numbered listicle blocks |

Everything else is deferred. No invented arcs, no third format, no comparison or objection archetype until one is built and torn down.

Because there are only two, **awareness stage no longer selects the page shape.** You pick the archetype. Awareness still shapes copy tone and which claims are eligible.

---

## Parked

Not being built yet. Revisit once the spec draft is settled.

| Item | Why it waits |
|---|---|
| Metaobject definitions for the `custom.*` keys | Needs pulling from the store. Not blocking the spec |
| The metaobject and page writer | Phase 3. Nothing to write until the outline and copy are proven |
| A third page archetype | Only from a teardown of a real page that converts |
| Making the hardcoded sections bindable | Trust section, feature split, offer blocks. Only if they need to vary per page |
| The two template bugs | Two H1s on the listicle page, and `right_video` pointing at the image field |

---

## Reading order

| File | What it covers | Phase |
|---|---|---|
| `00-assumptions.md` | Everything invented in this package and still needing an answer | Read first |
| `01-system-overview.md` | Concepts, archetypes, awareness stages | All |
| `02-end-to-end-flow.md` | **The run.** What happens at each step, who owns it, what it never does, how it fails | All |
| `03-sheet-spec.md` | Eight sheet tabs, columns, vitamin example rows | 1 |
| `04-outline-logic.md` | Deterministic rules turning selections into an outline | 1 |
| `06-ui-spec.md` | Panes, controls, progressive disclosure | 1 |
| `07-section-audit.md` | The two real Firstday templates, section by section | 1 |
| `05-generation-spec.md` | Prompt contract, output shape, page level pass | 2 |
| `08-publishing.md` | Metafields, Admin API, the writer | 3 |

Read `02` second. Everything after it describes one step in isolation and assumes you know where that step sits.

---|---|---|
| `00-assumptions.md` | Everything invented in this package and still needing an answer | Read first |
| `01-system-overview.md` | Concepts, arcs, awareness stages | All |
| `03-sheet-spec.md` | Eight sheet tabs, columns, vitamin example rows | 1 |
| `04-outline-logic.md` | Deterministic rules turning selections into an outline | 1 |
| `06-ui-spec.md` | Panes, controls, progressive disclosure | 1 |
| `07-section-audit.md` | Finding out what your theme already does | 1 |
| `05-generation-spec.md` | Prompt contract, output shape, page level pass | 2 |
| `08-publishing.md` | Metafields, Admin API, render template | 3 |

---

## What is already built

| File | State |
|---|---|
| `build/apps-script-repository.gs` | Working. Serves all eight tabs as JSON and runs a health check into a `health` tab |
| `build/outline-builder.html` | Working prototype. Bundled demo data, or live sheet once `ENDPOINT` is set. Deploy as a static file on Vercel |

Neither is production code. Both are complete enough to prove the logic.

---

## Placeholder warning

**Section names in this package are invented.** `lp_split`, `lp_grid`, `lp_hero` and the rest do not exist in your theme.

`07-section-audit.md` produces the real vocabulary. Until that audit is done, every section name in the specs and in the builder's demo data is a stand in, and `eligible_sections` in the sheet cannot be filled correctly.

The arcs are also examples. `01-system-overview.md` has the teardown method for deriving real ones from pages that convert. An agent handed this package will build against the example arcs unless told not to.

---

## The one rule that protects the system

**Behavior lives in the sheet, not in code.**

Reorder a page by changing a strength value. Change layout variety by editing `eligible_sections`. Change the entire narrative of every problem aware page by editing seven rows in `arc_steps`.

The builder is a few hundred lines and should almost never change. When a page comes out wrong, the fix is in the sheet. The first time someone adds a conditional for a special case, the system has started becoming unpredictable.
