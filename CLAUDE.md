# CLAUDE.md

Entry point for this repo. Read this before anything else.

---

## What this is

A specification package for a system that builds Shopify landing pages for **Firstday**, a children's vitamin brand, at volume.

Content lives in a Google Sheet. A Vercel app turns a selection of claims into a page outline, generates copy, and exports a payload. Firstday's Shopify theme already renders pages from page metafields, so there is no render layer to build.

It is a spec package, not a codebase. There are two working prototypes under `build/` and nothing else.

---

## Read in this order

1. `00-assumptions.md` — everything invented and still unanswered
2. `01-system-overview.md` — concepts
3. `02-end-to-end-flow.md` — **the run.** Every step, who owns it, what it never does, how it fails
4. `07-section-audit.md` — what the two real templates actually contain
5. Then whichever step you are working on

Do not skip `02`. Every other document describes one step in isolation and assumes you know where it sits.

---

## Hard constraints

**Stack is fixed.** Google Sheets as the database. Apps Script as the API. Vercel for the app and any serverless functions. No database, no CMS, no admin app.

**Scope is two page archetypes.** `standard` and `listicle_a`. Both exist in the theme. Do not add a third.

**Phase order is not negotiable.**

| Phase | Build | Gate |
|---|---|---|
| 1 | Sheet, Apps Script, outline builder | Ten outlines you can honestly rank |
| 2 | Copy generation, review screen, export | Four pages live, built by hand from exports |
| 3 | The metaobject and page writer | Not started. Parked |

Phase 3 is parked. Do not build it. Do not build toward it beyond keeping the export format targeting real metafield keys.

---

## Rules

**Never invent a section name.** Every section is a real `type` from Firstday's theme. `temp-replo-hero`, `temp-listicle-img-txt-block`, `accordion-block`, and so on. If you need one that is not in `07-section-audit.md`, stop and ask.

**Never invent a metafield key.** Same rule. The real keys are listed in `07-section-audit.md`.

**Check `00-assumptions.md` before relying on anything.** Forty three items in this package were invented rather than sourced. Many are now resolved, several are still open. An entry marked `open` is a guess, not a decision.

**Copy rules for anything user facing.** No hyphens, dashes, semicolons, or colons. Short paragraphs. Descriptive subheadings. Concrete language over adjectives.

---

## What is already built

| Path | State |
|---|---|
| `build/apps-script-repository.gs` | Works. Serves eight sheet tabs as JSON, plus a health check that writes problems to a `health` tab |
| `build/outline-builder.html` | Works. Standalone HTML, deployable as a Vercel static file. Runs on bundled demo data, or the live sheet once `ENDPOINT` is set |

Both are prototypes. The builder's demo data uses invented section names, marked with a comment in the file. It also assumes free section composition, which the two real templates disproved.

---

## The next task

Rebuild `build/outline-builder.html` against `04-outline-logic.md`.

The prototype still assumes free section composition with layout rotation, which the two real templates disproved. The spec is now correct and the code is not.

The output shape it should produce is at the end of `04-outline-logic.md`. Slots keyed by real metafield name, each carrying a kind, bound claim or objection ids, an asset, and an empty copy object.

Three things in `04` are still open and marked as such. Ordering strategy for numbered slots, what happens to unfilled slots, and whether the `standard` field lists match the real metaobject definitions. Do not resolve them by guessing.

---

## Known bugs in Firstday's templates

Found while reading them. Not this project's job to fix, but worth reporting.

Two H1s on the listicle page. The `rich-text` heading is `h1` and the closing `temp-replo-hero` on `last_module` is also `h1`. On the standard lander that same module is `h2`.

Every listicle block sets `right_video` to `...listicle_block_N.value.image.value`. The video field points at the image.
