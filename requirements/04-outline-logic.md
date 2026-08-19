# 04. Outline Logic

The rules that turn a selection into a filled slot manifest.

Grounded in the two Firstday templates read in `07-section-audit.md`. Anything still invented is marked.

---

## What changed from the first draft

The builder does not compose a page. The template already did that.

Section order, section types, and how many of each exist are all fixed by the archetype. There is no layout to choose, no rotation, no cap to enforce, and nothing to drop.

**The builder assigns content to slots.** That is the whole job.

---

## Slot kinds

Every slot in both templates is one of five kinds. The kind determines how content binds to it.

| Kind | Behavior | Example |
|---|---|---|
| `native` | Written to the Shopify page object, not a metafield | `page.title`, `page.content` |
| `single` | One key, one set of fields, takes one claim | `last_module`, `section_image_with_text` |
| `numbered` | N sibling keys, one claim each | `listicle_a_listicle_block_1` through `_5` |
| `repeater` | One key holding a list, takes many claims | `section_benefits.benefits`, `section_faq.list_of_faq_blocks` |
| `fixed` | Not content the builder writes | `main_product_for_purchase`, chrome sections |

This taxonomy is the core of the rewrite. `numbered` and `repeater` were previously conflated, and they behave differently.

---

## Archetype manifests

### `listicle_a`

| Slot | Kind | Fields | Takes |
|---|---|---|---|
| `page.title` | native | the H1 | controlling idea, with the item count |
| `page.content` | native | intro body | the setup, no claims |
| `custom.note` | single, optional | free text | a callout, optional |
| `metabject_author` | single | author_image, author_name, date_updated | byline, not claims |
| `listicle_a_listicle_block_1` .. `_5` | numbered | badge_text, heading, body_text, cta_label, cta_link, image | one claim each |
| `section_2_bts_2_accordtion` | repeater | header, subheader, image, `nutrient_deficiencies[]` of icon, header, body | objections |
| `timeline` | single | heading_line_1, heading_line_2, `timeline_1..3` of image, days_badge, headling, body | mechanism, three fixed steps |
| `last_module` | single | header, body, cta_copy, image | the close |
| `main_product_for_purchase` | fixed | product reference | set once |

### `standard`

| Slot | Kind | Fields | Takes |
|---|---|---|---|
| `section_temp_replo_hero` | single | header, body, cta_copy, image, mobile_image, rotating_badges, creator_image, creator_handle, creator_quote | the strongest claim |
| `rotating_marquee` | single | marquee_text_one, two, three, section_enabled | chrome, rarely varies |
| `section_statistics` | numbered | `stat_1..3` of icon, percentage, gray_subtext, black_text | three proof points |
| `section_2_bts_2_accordtion` | repeater | header, subheader, image, `nutrient_deficiencies[]` | the problem set |
| `section_science_tabs` | repeater | header, `tabs[]` of tab_header, tab_subheader, tab_intro, tab_body, image, video | mechanism |
| `section_image_with_text` | single | header, body, cta_text, image | one claim |
| `section_benefits` | repeater | header, body, button_label, button_cta, `benefits[]` of icon, header, body | claims |
| `section_bts_3_accodtion` | repeater | same shape as the other accordion | objections |
| `section_faq` | repeater | `list_of_faq_blocks[]` of question, answer | objections |
| `last_module` | single | header, body, cta_copy, image | the close |
| `main_product_for_purchase` | fixed | product reference | set once |

> **Field lists for `standard` are read off Liquid references, not off metaobject definitions.** They are what the theme consumes, which may be a subset of what each definition holds. Confirm against the store before writing.

---

## Inputs

| Input | Source | Judgment call |
|---|---|---|
| Product | Dropdown | No |
| Archetype | Dropdown, two options | Yes |
| Awareness stage | Dropdown, five values | No, comes from traffic source |
| Controlling idea | Free text, one sentence | Yes |
| Checked claims | Filtered pills | Yes |
| Checked objections | Filtered pills | Yes |

Awareness no longer selects structure. It filters which claims are eligible and it is passed to generation as tone context.

---

## Rules in execution order

### 1. Load the manifest

The archetype returns its slot list. Everything downstream is assignment into these slots.

### 2. Filter the library twice

By `product_id`, then by awareness stage where the claim's `awareness` list contains the selected value.

The second filter is the one people skip. Filtering at pill time prevents the mistake rather than catching it in review.

### 3. Rank

Claims descending by strength. Objections descending by severity. Ties break on id so results stay stable.

### 4. Assign to `numbered` slots

One claim per key, in rank order, starting at slot one.

For `listicle_a` this fills blocks one through five. For `standard` it fills the three stat cards.

> **Ordering strategy is still open.** Strongest first is the obvious default. Bookending the strongest and second strongest at either end reads better in a numbered list, but nothing in the templates settles it. Pick one, test it, do not treat it as decided.

### 5. Assign to `repeater` slots

The whole eligible list goes into one key as an array.

Claims to benefit repeaters. Objections to accordion and FAQ repeaters. Mechanism content to science tabs.

Repeaters have no declared cap in the template. That does not mean unlimited is good, only that nothing enforces a limit.

### 6. Assign to `single` slots

The strongest claim to the hero on `standard`. The close to `last_module`. One claim to `section_image_with_text`.

On `listicle_a` the hero is native, and it takes the controlling idea rather than a claim, because the page opens as an article rather than a pitch.

### 7. Resolve assets

In order. The bound claim's own `asset_id`, then a match on product plus orientation, then flag the slot.

Never reuse the same asset twice on one page. Never substitute a placeholder. A flagged slot the user has to fix beats a stock photo that ships.

### 8. Handle unfilled slots

> **Open.** If a listicle has three claims and five block keys, does the page render with two empty blocks, or do those two sections get disabled?
>
> Both are implementable. The templates show sections being disabled, so disabling is likely right, but it has not been confirmed.

---

## Validation

Errors block generation. Warnings do not.

| Level | Condition | Message intent |
|---|---|---|
| Error | Zero claims checked | Nothing to say |
| Error | More claims than the archetype has numbered slots | Name how many to uncheck |
| Warning | Fewer claims than numbered slots | Name how many slots will be empty or disabled |
| Warning | Objection checked, no selected claim lists it in `kills_objection` | Name the objection and the claim that would answer it |
| Warning | Objection slots hold more items than claim slots | The page argues more than it sells |
| Warning | A slot needs media and no asset resolved | Count the affected slots |
| Warning | Controlling idea shares no significant words with the hero content | One of the two is wrong |

The unanswered objection warning is the highest value output of this whole system. It means customers hold a doubt and the marketing has no response.

---

## Output shape

```json
{
  "archetype": "listicle_a",
  "product_id": "...",
  "awareness": "problem",
  "controlling_idea": "...",
  "page": { "title": null, "content": null },
  "slots": {
    "listicle_a_listicle_block_1": { "kind": "numbered", "claim_ids": ["cl_02"], "asset_id": "as_01", "copy": {} },
    "listicle_a_listicle_block_2": { "kind": "numbered", "claim_ids": ["cl_04"], "asset_id": "",      "copy": {} },
    "section_2_bts_2_accordtion":  { "kind": "repeater", "objection_ids": ["ob_01","ob_03"],           "copy": {} },
    "last_module":                 { "kind": "single",   "claim_ids": ["cl_01"], "asset_id": "as_02", "copy": {} }
  },
  "disabled": [],
  "flags": []
}
```

`copy` is empty. Generation fills it. `page.title` and `page.content` are null until generation writes them.

---

## Determinism

Same inputs produce the same outline every time.

That property is why a bad page can be debugged from the sheet, and why an archetype can be tested without random variation confounding the result.

Ties break on id. Nothing is shuffled. No randomness anywhere.

---

## Where the levers are

| To change | Edit |
|---|---|
| Which claim lands in slot one | `strength` on the claim |
| Which objections get answered first | `severity` |
| Which claims appear at all | `awareness` and `product_id` |
| Page shape | The archetype dropdown, or a new template |

Nothing here lives in code. The builder should be a few hundred lines and rarely change.

---

## What the builder deliberately does not do

**Reorder sections.** Order belongs to the template.

**Choose layouts.** There is no choice to make. Each slot has exactly one rendering.

**Compose new archetypes.** Adding one means building a template first, then a manifest.

**Edit copy.** That is the review screen after generation.

**Write chrome.** The trust section, clinician reviews, judge.me widgets, and UTM toast are identical on every page and are not the builder's business.
