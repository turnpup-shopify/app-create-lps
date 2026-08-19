# 02. End to End Flow

What actually happens, in order, from opening the app to a live page.

Every other document in this package describes one step in isolation. This one is the run.

---

## The shape of it

```
  SETUP (once)          PER PAGE                          PARKED
  ─────────────         ────────────────────────────      ──────────
  sheet filled     →    1. choose archetype
  script deployed  →    2. select claims
  archetypes filled →   3. outline builds
                        4. copy generates
                        5. page pass runs
                        6. human reviews
                        7. export                    →    8. publish
```

Steps 1 through 7 are phase 1 and 2. Step 8 is parked.

---

## Who owns each step

| Step | Human | Machine |
|---|---|---|
| 1. Choose | Picks archetype, product, controlling idea | Filters what is selectable |
| 2. Select | Checks claims and objections | Validates, warns, blocks |
| 3. Outline | Reads it, adjusts selection | Assigns claims to slots |
| 4. Generate | Waits | Writes copy per slot |
| 5. Page pass | Waits | Removes repetition |
| 6. Review | Approves, regenerates, fixes claims | Shows copy beside its source |
| 7. Export | Copies into Shopify | Formats the payload |
| 8. Publish | Nothing | Creates entries and page |

The human decisions are all in steps 1, 2, and 6. Everything else runs.

---

## Step 0. Setup, once

**Preconditions before anyone can build a page.**

The sheet has claims and objections filled with ids, ranking, awareness tagging, and objection linkage. The Apps Script web app is deployed and its `/exec` URL is in the builder config. The archetype definitions list which metafield keys each archetype fills.

**Expected behavior.** The builder loads the sheet on open and shows a live badge. If the sheet is unreachable it falls back to bundled demo data and says so rather than failing silently.

**Owns.** Nothing per page. This is config.

---

## Step 1. Choose the archetype

**Input.** Product, archetype, awareness stage, controlling idea sentence.

**Expected behavior.**

The archetype determines which slots exist for the rest of the run. Picking `listicle_a` means five numbered blocks plus the shared keys. Picking `standard` means the hero, benefits, science tabs, and the rest.

Awareness does not change structure. It filters which claims are selectable and it is passed to generation as tone context.

The controlling idea prints as the page thesis and feeds the hero overlap check.

**Never does.** Choose the archetype for you. Two options, both real, the choice is yours.

**Failure modes.** None. Every combination is valid at this step.

---

## Step 2. Select content

**Input.** Checked claims and objections.

**Expected behavior.**

Claims filter twice. First by product, then by awareness stage. Ineligible claims are hidden behind a counter with the reason, not dimmed in place.

For `listicle_a` the counter reads against the five available slots. For `standard` it reads strength order.

Objections start collapsed, since claims are the primary work.

**Never does.** Silently drop a claim that does not fit. Everything removed says why.

**Failure modes.**

| Condition | Level | Behavior |
|---|---|---|
| Zero claims | error | Blocks generation |
| More claims than slots | error | Names how many to uncheck |
| Objection checked with no answering claim | warning | Names the claim that would answer it |
| Objection sections outnumber reason sections | warning | Page argues more than it sells |
| Controlling idea shares no words with the hero claim | warning | One of the two is wrong |

Errors block. Warnings do not.

---

## Step 3. The outline builds

**Input.** Everything from steps 1 and 2.

**Expected behavior.**

Deterministic. Same inputs produce the same outline every time, which is what makes a bad page debuggable from the sheet.

Claims sort by strength. The strongest binds to the hero or to slot one. The rest fill the remaining numbered slots in order. Objections sort by severity and fill objection slots.

Assets resolve in order. The claim's own asset, then a product and orientation match, then a flag. Never a placeholder.

**Output.** An archetype name, a map of metafield keys to bound claim ids, and empty copy objects. No sentences anywhere.

**Never does.** Reorder sections. Order belongs to the template.

**What the user sees.** The page drawn as wireframe blocks, with flags above it and an inspector on the right showing each slot's job, tone note, bound claim, and image status.

---

## Step 4. Copy generates

**Input.** One request per slot, not one per page.

**Expected behavior.**

Each call receives the controlling idea, the slot's job and tone note, the full claim rows including proof and emotion, the previous slot's headline so it does not echo, and the voice rules.

Results cache by input hash. A claim already written for this slot type at this awareness stage in this voice returns from cache rather than regenerating with new phrasing.

In a mature library only the hero and the close regenerate per page, since those depend on the controlling idea.

**Never does.** Introduce a fact not in the source rows. Reference other sections. Strip existing shortcodes like `[month]` or `[product_ingredients]`. Choose a CTA destination, since those are fixed in the template.

**Failure modes.** A single slot can fail and be retried without touching the others. That is the whole reason for one call per slot.

---

## Step 5. The page pass

**Input.** Every generated slot in order.

**Expected behavior.**

Two jobs only. Flag any phrase, statistic, or idea appearing in more than one slot and rewrite the weaker instance, where weaker means the lower claim strength. Then check each slot against the controlling idea and flag drift.

**Never does.** Restructure the page, change which claims are bound, or add content.

**Why it is not optional.** Slots written independently repeat each other and open with the same sentence shape. The per slot generator has no memory across calls and cannot see it.

---

## Step 6. Human review

**Expected behavior.**

Each slot's copy renders **beside the claim rows it came from**. That single layout choice does most of the quality work, because a weak line is immediately either bad copy or a bad claim underneath it.

Three actions per slot. Approve. Regenerate. Edit the source claim.

**The third one is the point.** It is usually the claim, and fixing the claim fixes every future page that binds it.

Approved copy is never regenerated automatically.

---

## Step 7. Export

**Expected behavior.**

Two outputs from the same data.

A readable brief for pasting into Shopify by hand, which is how phase 2 ships pages.

A JSON payload keyed to the real metafield keys, which becomes the phase 3 input unchanged.

```json
{
  "archetype": "listicle_a",
  "page": { "title": "...", "content": "..." },
  "metafields": {
    "listicle_a_listicle_block_1": { "badge_text": "...", "heading": "...", "body_text": "...", "cta_label": "...", "image": "..." },
    "last_module": { "header": "...", "body": "...", "cta_copy": "..." }
  },
  "source_refs": { "listicle_a_listicle_block_1": ["cl_02"] }
}
```

`source_refs` is carried even though nothing reads it yet. It is what lets a claim edit find affected pages later, and what lets performance data trace back to the library.

**Phase 2 stops here.** Hand building four pages from these briefs is the check that the archetype vocabulary is right before anything is automated against it.

---

## Step 8. Publish, parked

**Expected behavior when built.**

Create one metaobject entry per numbered block, create the page with the archetype's template suffix and the native title and content, then link the page metafields to the new entries.

**The constraint that matters.** Those numbered keys hold metaobject references, not values. Publishing creates new entries. Reusing an existing entry across two pages means editing one silently rewrites the other.

**Never does.** Overwrite a live page because a claim changed in the sheet. Stale pages are listed for review and regenerated as a batch.

---

## What persists between runs

| Thing | Where | Survives |
|---|---|---|
| Claims, objections, assets | The sheet | Everything |
| Archetype definitions | The sheet | Everything |
| Cached copy blocks | Wherever generation caches | Across pages |
| A page in progress | Nowhere yet | Nothing. The builder is stateless |
| Published page content | Shopify metaobjects | Until regenerated |

The builder being stateless is fine for phase 1 and a problem by phase 2, when a page takes long enough to build that losing it matters.

---

## The failure that matters most

An objection at severity 4 or above with no claim answering it.

The system surfaces it at step 2 as a warning with the specific claim that would fix it. That means customers have a doubt and the marketing has no response.

Finding those is worth more than any page this produces.
