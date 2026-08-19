# 00. Assumptions Register

Everything in this package that was invented rather than sourced from Alex, the theme, the analytics, or the existing sheet.

**Nothing on this list should be treated as a decision.** Each entry is a placeholder that needs confirming, replacing, or deleting.

Status values are `open` for unanswered, `confirmed` once checked, `replaced` once real data is in.

---

## Cross cutting

| # | Assumption | Where | Status |
|---|---|---|---|
| 1 | ~~The example product is a multivitamin~~ **Firstday.** Vitamin example rows are illustration only and should be replaced with real Firstday products | All docs | replaced |
| 2 | The sheet is read through an Apps Script JSON endpoint. Original ask was a published CSV. This was changed without asking | `02`, `build/` | open |
| 3 | ~~No existing claims or objections repository~~ **One exists.** Real headers are `Applies To`, `Applies To`, `Claim`, `Status / Grade`, `Notes`, `Source`. The eight tab schema must map onto this, not replace it | `02` | open, blocking |
| 4 | One person operates the builder. No roles, permissions, or multi user state | `05` | open |
| 5 | ~~Page volume is in the tens~~ **Unknown.** Confirms phase 3 stays deferred until hand publishing becomes the bottleneck | `README`, `07` | confirmed |
| 5a | ~~Four awareness stages~~ **Five.** Cold and unaware was missing. Corrected in `01`, `02`, and the builder. No arc serves it yet | `01`, `02`, `build/` | replaced |

---

## Arcs and narrative

| # | Assumption | Where | Status |
|---|---|---|---|
| 6 | ~~Five arcs exist~~ **Scoped to two archetypes that exist in the theme.** `standard` and `listicle_a`. The other three were invented and are removed | `01`, `02` | replaced |
| 7 | ~~All awareness stages need their own arc~~ **With two archetypes, awareness no longer selects structure.** It shapes copy tone and claim eligibility only | `01`, `05` | replaced |
| 8 | Every arc's step sequence, role names, role intents, and tone notes | `02`, `build/` | open |
| 9 | `order_strategy` values. Still open, but now only applies to which claim lands in which numbered listicle slot | `03` | open |
| 10 | ~~`cap_behavior` has two values~~ **Moot.** The cap is the number of defined metafield keys. Five for `listicle_a` | `03` | replaced |
| 11 | ~~Invented section caps of 8, 10, 12~~ **Set by the template, not chosen** | `02` | replaced |
| 12 | Listicles need a minimum of three items. Still invented. The template defines five slots but says nothing about a floor | `02`, `03` | open |

---

## Claims and objections schema

| # | Assumption | Where | Status |
|---|---|---|---|
| 13 | Claim scope is a three value enum of `reason`, `spec`, `detail` | `01`, `02` | open |
| 14 | Strength and severity are 1 to 5 integer scales | `02` | open |
| 15 | Objection categories are price, efficacy, trust, effort, risk | `02` | open |
| 16 | Claims carry separate feature, benefit, and emotion columns | `02` | open |
| 17 | Proof needs a source and a review date, and 12 months is the staleness threshold | `02`, `build/` | open |
| 18 | Every product needs at least four reason claims | `build/` health check | open |
| 19 | Only one claim per product should be rated 5 | `build/` health check | open |

---

## Outline logic

| # | Assumption | Where | Status |
|---|---|---|---|
| 20 | Never the same layout twice in a row, applied globally across the page | `03` | open |
| 21 | Asset fallback order is claim asset, then product plus orientation match, then flag | `03` | open |
| 22 | Which validation rules are errors and which are warnings | `03` | open |
| 23 | The hero claim leaves the pool and never reappears later on the page | `03` | open |
| 24 | Pinning a hero claim is a feature anyone wants | `03`, `05` | open |

---

## Section library

| # | Assumption | Where | Status |
|---|---|---|---|
| 25 | ~~Every `lp_` section name~~ **Replaced with real Firstday section names.** See `06` | All docs, `build/` | replaced |
| 26 | Which layouts require media and which crops they want | `06`, `build/` | partly answered in `06`, crops still open |
| 27 | ~~The theme supports `@theme` blocks~~ **Sections use their own block types plus repeaters.** No `@theme` usage seen | `06` | replaced |
| 28 | ~~Landing pages use a dedicated template~~ **They do, and it is already metafield driven.** Content comes from `page.metafields.custom.*` | `06`, `07` | replaced |
| 28a | ~~One section per repeated claim~~ **Wrong for this theme.** Four sections repeat internally through metafield repeaters. The prototype does not implement this | `03`, `06`, `build/` | replaced, needs rebuild |
| 28b | ~~Section type identifies a section~~ **Wrong.** `temp-replo-hero` and `accordion-block` each appear twice bound to different metafield keys. Outline output needs section type plus metafield key plus role | `03`, `06` | replaced, needs rebuild |
| 28c | ~~Whether metafield definitions are fixed per template or addable per page~~ **Archetype scoped and numbered.** `listicle_a_listicle_block_1` through `_5`. Item caps equal the number of defined keys | `06`, `07` | replaced |
| 28d | ~~Whether the five hardcoded sections can be made metafield bindable~~ **The listicle block already is.** It was simply unbound in archetype A. Trust section, feature split, and offer blocks remain hardcoded | `06` | partly replaced |
| 28e | ~~Whether pages are built by toggling one master template~~ **No.** Two templates share almost no section order. Each archetype is its own composed template | `03`, `06` | replaced |
| 28f | ~~The hero holds the H1~~ **Depends on archetype.** Advertorial uses `page.title` as h1 and the closing module is also h1, which is two H1s on one page | `06` | replaced, bug found |
| 28g | Generated copy must preserve existing shortcodes such as `[month]` and `[product_ingredients]` rather than stripping or inventing them | `04`, `06` | open |
| 28h | Content lives in four scopes. Native page fields, page metafields, product metafields, and shop metaobjects. The advertorial hero uses native page fields | `06`, `07` | open |
| 28i | ~~Whether more archetypes exist~~ **Scoped to two on purpose.** Add more later from teardowns | `01`, `06` | closed by decision |
| 28j | Whether `homepage-trust-section` and the other copy pasted hardcoded sections should ever vary per page, or be treated as chrome | `06` | open |
| 28k | The numbered block keys are metaobject references, not inline values. Publishing creates new metaobject entries and links them. Reusing an entry across pages would make one edit rewrite both | `07` | noted, design constraint |

---

## Generation

| # | Assumption | Where | Status |
|---|---|---|---|
| 29 | Every word count budget per section type. Entirely invented | `04` | open |
| 30 | One API call per section rather than per page | `04` | open |
| 31 | Copy blocks should be cached by input hash | `04` | open |
| 32 | A page level dedupe pass is needed | `04` | open |
| 33 | Which model, and whether cost per page matters | `04` | open |
| 34 | Human review before publish is wanted at all | `04` | open |

---

## Interface

| # | Assumption | Where | Status |
|---|---|---|---|
| 35 | Three pane layout with the page preview in the centre | `05` | open |
| 36 | Pane widths of 340 and 316, breakpoints at 1120 and 760 | `05` | open |
| 37 | Which elements collapse and on what trigger | `05` | open |
| 38 | Desktop first. Nobody builds pages on a phone | `05` | open |
| 39 | Wireframe preview is more useful than a text outline | `05` | open |
| 40 | No drag to reorder. Deliberate, but it is still a choice made without asking | `03`, `05` | open |

---

## Publishing

| # | Assumption | Where | Status |
|---|---|---|---|
| 41 | Metafield namespace and key `lp.content` | `07` | open |
| 42 | Both theme native and data driven paths are wanted | `07` | open |
| 43 | Section level analytics will be instrumented | `07` | open |

---

## How to use this file

Work top down. Entries 1 through 5 change the shape of everything below them, so answering those first will delete or rewrite whole blocks of this list.

Mark each one as it resolves. When the register is empty the package describes a real system rather than a plausible one.
