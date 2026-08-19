# 03. Sheet Spec

Instructions for building the Google Sheet that feeds the landing page outline builder.

Worked example throughout is **Meridian Daily**, a third party tested daily multivitamin sold on subscription.

---

## What this sheet is

The sheet is the content library. It holds every fact, doubt, image, and story that could appear on any landing page, plus the rules for how a page gets structured.

It holds no pages. It holds no written copy. It holds no headlines.

A downstream builder reads this sheet, you pick a product and an awareness stage and check some boxes, and it produces a page outline. A generation step then writes the copy.

If a value would be the same on every page that used it, it belongs here. If it is specific to one page, it does not.

---

## The eight tabs

1. `products`
2. `claims`
3. `objections`
4. `assets`
5. `testimonials`
6. `arcs`
7. `arc_steps`
8. `voice`

Fill them in that order. Tabs 6 and 7 are config and only get built once.

---

## Tab 1. products

One row per product. Everything else filters off this.

| Column | Type | Required | Notes |
|---|---|---|---|
| product_id | slug | yes | Lowercase, underscores. Never changes |
| name | text | yes | Display name |
| url | path | yes | Shopify product URL |
| price | number | yes | Current price |
| category | slug | yes | Groups products for reuse |
| one_liner | text | yes | What it is in under ten words |

**Example row**

| product_id | name | url | price | category | one_liner |
|---|---|---|---|---|---|
| meridian_daily | Meridian Daily | /products/meridian-daily | 48 | multivitamin | Third party tested daily multivitamin |

---

## Tab 2. claims

The most important tab. One row per reason to believe.

| Column | Type | Required | Allowed values | What reads it |
|---|---|---|---|---|
| claim_id | slug | yes | | Referenced by outline |
| product_id | slug | yes | | Filters pills |
| scope | enum | yes | reason, spec, detail | Some arcs accept reason only |
| feature | text | yes | | What it is |
| benefit | text | yes | | What it does for them |
| emotion | text | yes | | What it means to them |
| proof | text | no | | The number or fact behind it |
| proof_source | text | if proof | | Where the number came from |
| proof_reviewed | date | if proof | YYYY-MM-DD | Blocks stale stats |
| kills_objection | list | no | objection_ids | Powers the unanswered doubt warning |
| awareness | list | yes | unaware, problem, solution, product, most | Filters pills by stage |
| strength | int | yes | 1 to 5 | Drives section order |
| asset_id | slug | no | | Preferred image |

**Example rows**

| claim_id | scope | feature | benefit | emotion | proof | strength | kills_objection | awareness |
|---|---|---|---|---|---|---|---|---|
| cl_01 | reason | Every batch tested by an outside lab | You know what is actually in the bottle | Stop wondering if you wasted your money | NSF certified, batch results published on every lot | 5 | ob_01, ob_03 | problem, solution, product |
| cl_02 | reason | Methylated B12 and folate | Absorbs without the conversion step | Works even if your body does not convert well | Roughly 40 percent of people carry an MTHFR variant | 5 | ob_02, ob_06 | solution, product |
| cl_03 | reason | Iron and calcium split into a morning and evening dose | Neither one blocks the other | The dose you take is the dose you get | Calcium reduces iron absorption when taken together | 4 | ob_06 | solution, product |
| cl_04 | reason | Two capsules instead of eight | You actually finish the bottle | No more shelf full of good intentions | | 4 | ob_04 | problem, solution |
| cl_05 | reason | No synthetic dyes, no titanium dioxide | Nothing in there doing nothing | | | 3 | ob_03 | solution, product |
| cl_06 | spec | Vegan capsule shell | | | | 2 | | product, most |
| cl_07 | spec | Sixty day supply per bottle | | | | 2 | | product, most |
| cl_08 | detail | Free shipping over forty dollars | | | | 1 | ob_07 | most |

**Rules for filling this tab**

- Write `feature` as a fact, never as a sentence you would publish. "Methylated B12 and folate" not "We use only the finest methylated B12."
- `benefit` answers so what. `emotion` answers what it means about them or their life.
- Leave `emotion` blank on specs and details. Only reasons carry emotion.
- `strength` is your honest ranking of what would make a stranger buy. Do not give everything a 4.
- Only one claim should be a 5 unless you genuinely have two of equal weight.
- `awareness` is where the claim works, not where you want to use it. A spec means nothing to someone who does not know they have a problem yet.

**Common mistakes**

- Marking specs as reasons. If it does not answer why buy, it is a spec.
- Leaving `kills_objection` blank. This column is what makes the builder able to warn you that a page raises a doubt it never answers.
- Claims with no proof and no emotion. Those are filler and will produce weak copy.

---

## Tab 3. objections

One row per reason someone does not buy.

| Column | Type | Required | Notes |
|---|---|---|---|
| objection_id | slug | yes | |
| product_id | slug | yes | |
| objection | text | yes | Written in customer voice |
| rebuttal | text | yes | The answer in one or two sentences |
| proof | text | no | What backs the answer |
| severity | int | yes | 1 to 5. Drives order |
| category | enum | yes | price, efficacy, trust, effort, risk |

**Example rows**

| objection_id | objection | rebuttal | severity | category |
|---|---|---|---|---|
| ob_01 | Multivitamins do not do anything, the studies say so | Most of those studies tested cheap synthetic forms at low doses. Form and dose are the whole argument | 5 | efficacy |
| ob_02 | I eat well enough, I do not need one | Diet quality is not the same as absorption. Genetics decide how much of what you eat actually converts | 4 | efficacy |
| ob_03 | Supplements are barely regulated so who knows what is in it | Every lot is tested by an outside lab and the results are published | 5 | trust |
| ob_04 | I never finish a bottle | Two capsules a day, not eight. Reorder timed to when you actually run out | 3 | effort |
| ob_05 | Costs more than the grocery store brand | Cheaper bottles use forms your body cannot use. Price per absorbed dose is the honest comparison | 4 | price |
| ob_06 | Everything is in one pill so it probably fights itself | Iron and calcium are split across two doses for exactly that reason | 3 | efficacy |
| ob_07 | I do not want to be locked into a subscription | Skip, pause, or cancel any time from a link in every email | 3 | risk |

**Rules for filling this tab**

- Write `objection` the way a customer would say it out loud. Not "price sensitivity" but "costs more than the grocery store brand."
- Pull real ones from support tickets, reviews, and cart abandonment replies. Do not invent them.
- `severity` is how often it kills the sale, not how annoying it is to answer.
- Every objection above severity 3 should have at least one claim listing it in `kills_objection`. If none does, you have a gap in the claims tab.

---

## Tab 4. assets

| Column | Type | Required | Allowed values |
|---|---|---|---|
| asset_id | slug | yes | |
| url | url | yes | Shopify CDN |
| type | enum | yes | image, video |
| orientation | enum | yes | vertical, horizontal, square |
| crops | list | yes | 4x5, 16x9, 1x1, 9x16 |
| subject | slug | yes | Free vocabulary, stay consistent |
| mood | slug | no | |
| proves_claim | slug | no | claim_id |
| product_id | slug | no | Blank means usable anywhere |

**Example rows**

| asset_id | type | orientation | crops | subject | proves_claim |
|---|---|---|---|---|---|
| as_01 | image | vertical | 4x5, 9x16 | lab_report_closeup | cl_01 |
| as_02 | image | horizontal | 16x9 | two_capsules_in_palm | cl_04 |
| as_03 | video | vertical | 9x16 | bottle_opening_loop | |
| as_04 | image | square | 1x1 | ingredient_panel | cl_05 |

**Rules**

- `crops` lists what actually exists, not what could be cropped. The builder matches on this.
- `proves_claim` is the single most useful column. When it is filled, the builder pairs image to argument automatically.
- Keep `subject` vocabulary tight. Ten terms, not fifty.

---

## Tab 5. testimonials

| Column | Type | Required | Notes |
|---|---|---|---|
| testimonial_id | slug | yes | |
| product_id | slug | yes | |
| quote | text | yes | Verbatim. Never rewrite |
| name | text | yes | First name plus initial |
| context | text | no | What makes them credible |
| kills_objection | list | no | objection_ids |
| source | text | yes | Where it came from |
| use_count | int | yes | Start at 0. Builder increments |

**Example row**

| testimonial_id | quote | name | context | kills_objection | source |
|---|---|---|---|---|---|
| tm_01 | First one I have ever actually finished a bottle of | Dana R. | Six months subscribed | ob_04 | Verified review |

**Rules**

- Never edit a quote. Trim with an ellipsis if you must, nothing more.
- `use_count` stops the same review appearing on forty pages.

---

## Tab 6. arcs

One row per arc. Config, not content. Built once.

| Column | Type | Allowed values | Notes |
|---|---|---|---|
| arc_id | slug | | |
| arc_name | text | | Shown in the dropdown |
| awareness | list | problem, solution, product, most | An arc can serve more than one stage |
| order_strategy | enum | strength_desc, bookend, sheet_order | How claims map to positions |
| cap_behavior | enum | drop_lowest, constrain_selection | What happens over the cap |
| max_sections | int | | Page ceiling |
| scope_filter | enum | blank, reason, spec | Restricts which claims are eligible |

**Example rows**

| arc_id | arc_name | awareness | order_strategy | cap_behavior | max_sections | scope_filter |
|---|---|---|---|---|---|---|
| problem_first | Problem first | problem | strength_desc | drop_lowest | 12 | |
| listicle | Listicle | problem, solution | bookend | constrain_selection | 10 | reason |
| comparison | Comparison | solution | strength_desc | drop_lowest | 10 | |
| benefit_first | Benefit first | product | strength_desc | drop_lowest | 12 | |
| objection_first | Objection first | most | strength_desc | drop_lowest | 8 | |

**Why the two odd values exist**

`bookend` puts the strongest claim first and the second strongest last, with the rest in the middle. Listicles read badly when every item after number two is weaker than the last.

`constrain_selection` caps how many claims you can check rather than trimming sections afterward. A listicle headline promises a number. Dropping a section after the fact makes the page lie.

---

## Tab 7. arc_steps

One row per position within an arc. Roughly forty rows total.

| Column | Type | Allowed values | Notes |
|---|---|---|---|
| arc_id | slug | | Links to tab 6 |
| position | int | | Sort order |
| role | slug | | Machine name |
| role_label | text | | Shown in the outline |
| role_intent | sentence | | Instruction to the copywriter |
| eligible_sections | list | | Layouts that can serve this role |
| repeat_on | enum | none, claim, objection | Whether it expands |
| min_count | int | | Hard floor |
| max_count | int | | Ceiling |
| droppable | bool | | Can the cap remove it |
| binds | enum | none, claim, top_claim, objection, testimonial, count | What content attaches |
| copy_target | list | | Slot names generation must fill |
| tone_note | sentence | | Voice instruction for this position |

**Example rows for `listicle`**

| position | role | role_label | role_intent | eligible_sections | repeat_on | min | max | droppable | binds | copy_target |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | hook_count | Hook with the count | Headline must contain the number of reasons | lp_hero | none | 1 | 1 | no | count | eyebrow, headline, subhead, cta |
| 2 | frame_stakes | Frame the stakes | Say why this matters now, in two sentences | lp_stack | none | 0 | 1 | yes | none | headline, body |
| 3 | list_item | List item | One numbered reason, self contained, no forward references | lp_numbered | claim | 3 | 8 | no | claim | headline, body |
| 4 | handle_objection | Handle the objection | Name the doubt in their words, then answer it plainly | lp_stack, lp_compare | objection | 0 | 2 | yes | objection | headline, body |
| 5 | social_proof | Social proof | Let a customer make the argument instead of you | lp_stack | none | 0 | 1 | yes | testimonial | headline, quote |
| 6 | close | Close | Restate the single idea and ask for the order | lp_stack | none | 1 | 1 | no | none | headline, body, cta |

**Example rows for `problem_first`**

| position | role | role_label | role_intent | eligible_sections | repeat_on | min | max | droppable | binds |
|---|---|---|---|---|---|---|---|---|---|
| 1 | hook_problem | Name the problem | Say the pain in their words before naming the product | lp_hero | none | 1 | 1 | no | top_claim |
| 2 | agitate | Agitate | Make the cost of ignoring it concrete and near term | lp_stack | none | 1 | 1 | yes | none |
| 3 | mechanism | Show the mechanism | Explain why the fix works, once, in plain terms | lp_split | none | 1 | 1 | no | claim |
| 4 | prove_benefit | Prove the benefit | One reason to believe, driven all the way home | lp_split, lp_grid, lp_stack | claim | 1 | 5 | yes | claim |
| 5 | handle_objection | Handle the objection | Name the doubt in their words, then answer it plainly | lp_stack, lp_compare | objection | 0 | 3 | yes | objection |
| 6 | social_proof | Social proof | Let a customer make the argument instead of you | lp_stack | none | 0 | 1 | yes | testimonial |
| 7 | close | Close | Restate the single idea and ask for the order | lp_stack | none | 1 | 1 | no | none |

**Rules for filling this tab**

- `role_intent` and `tone_note` are the only place in the whole system where the rhetorical job of a position is written in words. Generation reads them directly. Write them as instructions to a copywriter, not as labels.
- List two or three `eligible_sections` on any repeatable role. One value means four identical sections in a row.
- Never mark hero, mechanism, or close as droppable. The page can get thin but it cannot lose its spine.

**Do not invent these arcs from theory.** Pull twenty landing pages that convert, label every section by the job it does, group by awareness stage, and read the common sequence off the stacks. The repeat and drop columns only come from seeing real pages of different lengths do the same job.

---

## Tab 8. voice

| Column | Type | Allowed values |
|---|---|---|
| rule_id | slug | |
| brand | slug | |
| rule_type | enum | do, avoid, banned |
| rule | text | |
| example | text | |

**Example rows**

| rule_type | rule | example |
|---|---|---|
| banned | No hyphens, dashes, semicolons, or colons anywhere | Write two sentences instead |
| do | More periods, fewer commas | |
| do | Lead with what the reader gets, not what the product has | |
| avoid | Adjectives that carry no information | premium, revolutionary, cutting edge |
| avoid | Any health claim not backed by a proof row | |

---

## Fill order and effort

| Step | Tab | Effort |
|---|---|---|
| 1 | products | Minutes |
| 2 | objections | Two hours. Pull from real tickets and reviews |
| 3 | claims | Half a day. Hardest and highest value |
| 4 | voice | Thirty minutes |
| 5 | assets | Ongoing |
| 6 | testimonials | Ongoing |
| 7 | arcs and arc_steps | One day, once, from real page teardowns |

Objections before claims. Knowing what stops the sale tells you which claims you actually need.

---

## Definition of done

Run these checks before wiring the builder.

- Every objection at severity 4 or above appears in at least one claim's `kills_objection`
- At least four claims per product carry `scope = reason`
- No more than one claim per product has `strength = 5`
- Every claim with a `proof` value has a `proof_source` and a `proof_reviewed` date
- Every arc in tab 6 has rows in tab 7 covering position 1 through its last
- Every arc has at least one non droppable role at position 1 and one at the end
- Every repeatable role lists two or more `eligible_sections`
- No `role_intent` cell is blank

---

## What is deliberately not in this sheet

- Any page record, title, or URL handle
- The controlling idea sentence, which is typed per page
- Which claims are used on which page
- Section counts, which depend on what gets checked
- Any written headline or paragraph

Those are all produced downstream. If someone starts adding a headline column, the system has drifted.
