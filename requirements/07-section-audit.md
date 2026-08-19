# 07. Firstday Section Audit

Built from a real Firstday landing page template JSON. Section names below are the actual `type` values in the theme.

Everything earlier in this package that used `lp_hero`, `lp_split`, `lp_grid`, `lp_stack`, `lp_numbered`, or `lp_compare` was invented. Those names are dead. Use the ones here.

---

## Two findings that change the plan

### 1. The pages are already metafield driven

Almost every section pulls its content from `page.metafields.custom.*` rather than from settings typed into the theme editor.

```
"headline": "{{ page.metafields.custom.section_temp_replo_hero.value.header.value }}"
"description": "{{ page.metafields.custom.section_temp_replo_hero.value.body | metafield_tag }}"
"hero_image": "{{ page.metafields.custom.section_temp_replo_hero.value.image.value }}"
```

**Phase 3 is mostly already built.** There is no render layer to write, no `lp.content` metafield to define, no case switch to build. Publishing a page means writing values into metafield keys that already exist and already render.

That reduces phase 3 from a project to a script, and it means the phase 2 export should target these exact keys rather than a format of our own.

### 2. Internal repeaters are the norm, not the exception

Four sections loop internally through a repeater rather than being duplicated per item.

```
"repeater": "{{ page.metafields.custom.section_benefits.value.benefits.value }}"
"repeater": "{{ page.metafields.custom.section_faq.value.list_of_faq_blocks.value }}"
"repeater": "{{ page.metafields.custom.section_science_tabs.value.tabs.value }}"
"repeater": "{{ ...section_2_bts_2_accordtion.value.nutrient_deficiencies.value }}"
```

The prototype builder assumes one section per claim. **On this theme the default is one section holding all claims.** That is the case I flagged as unimplemented, and it turns out to be the main case rather than an edge case.

This changes the outline output shape. A repeatable role serving `temp-benefits-split` emits one section carrying an array of claims, not four sections.

## Three more findings on a second pass

### 3. Pages are hand composed per archetype, not toggled

**This corrects an earlier reading of a single template.** With two templates in hand the picture is clear.

The `order` arrays share almost nothing. Different section instance ids, different composition, different opening. The standard lander opens with `temp-replo-hero`. The listicle advertorial opens with `rich-text` bound to `page.title` and `page.content`.

There is no master template being toggled. Each page archetype is its own composed template.

Disabled sections are leftovers from iteration, not a composition mechanism.

**What this means for the arc model.** An arc corresponds to a page archetype, and each archetype brings its own template and its own metafield namespace. The builder is not choosing section order inside a fixed set of slots. It is choosing an archetype, then filling that archetype's numbered slots.


### 4. The H1 and H2 convention is real and enforced in the theme

The opening hero sets `heading_level: h1`. The closing hero on `last_module` sets `heading_level: h2`. `image-with-text`, `timeline-section`, and `faq` all set `heading_tag: h2` while using an h1 size token.

So the original assumption that the hero holds the H1 and every later section starts with an H2 is not an assumption. It is how the theme is already built.

### 5. A shortcode convention already exists

Three runtime tokens appear in section content.

| Token | Where |
|---|---|
| `[month]` | `temp-sellout-notice` |
| `[product_ingredients]` | collapsible tab |
| `[subscription_details]` | collapsible tab |

Generated copy needs to know these exist so it neither strips them nor invents new ones.

### 6. Not all content is page scoped

The buy block pulls from the product, not the page.

```
{{ section.settings.product.metafields.custom.benefit_accordian.value }}
```

And the coupon comes from a shop level metaobject.

```
{{ metaobjects.global_coupon_code.productioncode.coupon_code.value }}
```

So a page has three content scopes, not one. Page metafields, product metafields, and global metaobjects. The generator only ever writes the first.

### 7. CTA destinations are fixed

Nearly every button in the template points at `#standalone-product-section`. The generator writes CTA label text only. It never picks a destination.

---


Same on every landing page. The builder should never place or reorder these.

| Section | Role |
|---|---|
| `temp-marquee` | Rotating announcement ticker |
| `custom-liquid` (FrontRow badge and sticker) | Trust widget |
| `temp-css` | Style injection |
| `main-page` | Disabled shell |
| `temp-sticky-footer-drawer` | Persistent CTA bar |

---

## The audit table

| Section | Content slots | Metafield key | Repeats internally | Needs media | Can serve |
|---|---|---|---|---|---|
| `temp-replo-hero` | header, body, cta_copy, image, mobile_image, rotating_badges, creator quote and handle and image, proof row, list items, social proof bar, testimonial | `section_temp_replo_hero`, also `last_module` | no | yes | any hook role, and close |
| `temp-listicle-img-txt-block` | badge, alt_number, heading, body, note, 4 highlights, button, image or video | none, hardcoded | no | yes | `list_item`, `prove_benefit` |
| `temp-stats` | header, subheader, 3 stat cards each icon and percentage and gray subtext and black text | `section_statistics` | yes, 3 fixed | icons only | `prove_benefit`, `social_proof` |
| `accordion-block` | header, subheader, image, CTA, guarantee text, repeater of icon and header and body | `section_2_bts_2_accordtion`, `section_bts_3_accodtion` | yes, unbounded | optional | `agitate`, `handle_objection`, `prove_benefit` |
| `temp-science-module` | header, repeater of tab_header and tab_subheader and tab_intro and tab_body and image and video | `section_science_tabs` | yes, unbounded | per tab | `mechanism` |
| `standalone-product` | product ref, coupon, tabs, purchase content | `main_product_for_purchase` | no | product media | `close` |
| `temp-sellout-notice` | text, month, button label, video | none, hardcoded | no | yes | urgency, supports `close` |
| `timeline-section` | 2 heading lines, 3 milestones each image and badge and title and body | `timeline` | yes, 3 fixed | yes | `mechanism`, expectation setting |
| `image-with-text` | heading, text, button, image, mobile image | `section_image_with_text` | no | yes | `prove_benefit`, `mechanism` |
| `temp-a-plus-cards` | panel select, headings, body, badges, footnote | none, hardcoded panels | no | yes | `prove_benefit` visual |
| `homepage-trust-section` | heading, callout, mixed blocks of image and image_quote and video and quote_only and stat | none, hardcoded blocks | yes, unbounded | yes | `social_proof` |
| `temp-benefits-split` | header, body, button, quote block, repeater of icon and header and body | `section_benefits` | yes, unbounded | icons only | `prove_benefit` |
| `pbfcm-comparison-table` | title, description, column labels, benefit_row blocks, images | none, hardcoded | yes, unbounded | yes | `the_table` |
| `frontrowmd-clinicians-reviews` | product id only | none | app driven | app driven | `social_proof` |
| `faq` | heading, repeater of question and answer | `section_faq` | yes, unbounded | no | `handle_objection`, FAQ |

---

## Role coverage

| Role | Sections available | Verdict |
|---|---|---|
| `hook` any variant | `temp-replo-hero` | **One only.** Every page opens identically in structure |
| `agitate` | `accordion-block` | One only |
| `mechanism` | `temp-science-module`, `timeline-section`, `image-with-text` | Healthy |
| `prove_benefit` | `temp-benefits-split`, `temp-stats`, `image-with-text`, `temp-listicle-img-txt-block`, `temp-a-plus-cards`, `accordion-block` | Healthy |
| `list_item` | `temp-listicle-img-txt-block` | One only, correct for listicles |
| `handle_objection` | `faq`, `accordion-block` | Two, acceptable |
| `social_proof` | `homepage-trust-section`, `frontrowmd-clinicians-reviews`, judge.me app, `temp-stats` | Healthy |
| `the_table` | `pbfcm-comparison-table` | One only, fine |
| `close` | `standalone-product`, `temp-replo-hero` as `last_module`, `temp-sellout-notice` | Healthy |

**One hook section is the real constraint.** Every arc opens with `temp-replo-hero`, so variety at the top of the page has to come from copy and imagery rather than layout.

That may be correct. The hero is heavily built and clearly the tested one. Worth knowing it is a constraint rather than discovering it later.

---

## The section type is not the role

The template proves this on its own. `temp-replo-hero` appears twice, once as the opening hook bound to `section_temp_replo_hero` with an h1, and once as the closing module bound to `last_module` with an h2.

`accordion-block` also appears twice, bound to two different metafield keys doing two different jobs.

So the outline output needs three values per section, not two.

```
section_type      temp-replo-hero
metafield_key     last_module
role              close
```

The metafield key is what actually distinguishes them.

---

## Metafield keys observed

| Key | Feeds |
|---|---|
| `rotating_marquee` | chrome |
| `section_temp_replo_hero` | opening hero |
| `section_statistics` | stat cards |
| `section_2_bts_2_accordtion` | first accordion |
| `section_bts_3_accodtion` | second accordion |
| `section_science_tabs` | science tabs |
| `main_product_for_purchase` | buy block |
| `timeline` | expectation timeline |
| `section_image_with_text` | image with text |
| `section_benefits` | benefits split |
| `section_faq` | FAQ |
| `last_module` | closing hero |

---

## Automation gaps

Five sections carry hardcoded settings rather than metafield bindings. They cannot be filled by a script as things stand.

| Section | What is hardcoded |
|---|---|
| `temp-listicle-img-txt-block` | Everything. Heading, body, image, button |
| `temp-a-plus-cards` | Panel content |
| `homepage-trust-section` | All blocks, quotes, stats |
| `pbfcm-comparison-table` | Title, rows, labels |
| `temp-sellout-notice` | Text and video |

The listicle block is the important one. A listicle arc is one of the five arcs, and its only eligible section is not metafield driven. Making that one bindable is likely the highest value theme work in the whole project.

---

## What still needs answering

Listed in `00-assumptions.md`. The three that block filling `arc_steps`.

Whether metafield definitions are fixed per template or can be added per page. This decides whether a role can appear three times or only as many times as there are keys.

Whether the unbounded repeaters have a practical cap.

Whether the hardcoded sections can be converted, and in what order.

---

# Archetype B. The listicle advertorial

A second template, structurally unrelated to the first. This is the listicle arc as it actually exists.

## Order

| # | Section | Bound to |
|---|---|---|
| 1 | `rich-text` | `page.title` as h1, `page.content` as body, plus `custom.note` |
| 2 | `temp-author` | `custom.metabject_author` |
| 3 | `temp-marquee` | disabled here |
| 4 | `temp-listicle-img-txt-block` | `listicle_a_listicle_block_1` |
| 5 | same | `listicle_a_listicle_block_2` |
| 6 | same | `listicle_a_listicle_block_3` |
| 7 | same | `listicle_a_listicle_block_4` |
| 8 | same | `listicle_a_listicle_block_5` |
| 9 | `custom-liquid` | path conditional, disabled |
| 10 | `image-with-text` | offer block, hardcoded, disabled |
| 11 | `pbfcm-feature-split` | subscribe and save, hardcoded, disabled |
| 12 | `rich-text` | final verdict, hardcoded, disabled |
| 13 | `standalone-product` | `main_product_for_purchase` |
| 14 | `timeline-section` | `timeline` |
| 15 | `accordion-block` | `section_2_bts_2_accordtion` |
| 16 | `frontrowmd-clinicians-reviews` | app |
| 17 | `homepage-trust-section` | hardcoded, identical block ids to archetype A |
| 18 | judge.me apps | app |
| 19 | `temp-replo-hero` | `last_module` |
| 20 | `image-with-text` | guarantee, hardcoded, disabled |
| 21 | `utm-toast-notification` | UTM discount toast |
| 22 | `temp-sticky-footer-drawer` | disabled |

## What this settles

**List items are numbered keys, not a repeater.** Five separate section instances, each bound to `listicle_a_listicle_block_N`. One section per item, which is the pattern the prototype already implements.

**So the item cap is the number of defined keys.** Five here. Not a range anyone chooses at build time. My invented three to eight was wrong in both directions.

**The listicle block is metafield bindable after all.** It was hardcoded in archetype A. Here every field is bound.

```
badge_text, heading, body_text, cta_label, cta_link, image
```

That removes the biggest automation gap I flagged.

**The `listicle_a` prefix is a namespace.** It reads as archetype scoped, and implies a `listicle_b` could exist. This is likely the answer to whether keys can be added per page. They appear to be created per archetype, numbered.

**Two hook patterns exist, not one.** The advertorial hero is native Shopify page fields, so the H1 and the intro are the page title and page body, not metafields. Anything writing this archetype writes `page.title` and `page.content` through `pageCreate` or `pageUpdate`, not `metafieldsSet`.

**Some keys are shared across archetypes.** `timeline`, `section_2_bts_2_accordtion`, `main_product_for_purchase`, and `last_module` appear in both. A page therefore holds one instance of each of those, whichever archetype it runs.

**Path conditional content exists.**

```liquid
{% if request.path contains '3-reasons-most-kids' %}
```

One template serving several URLs with per URL inserts. Worth knowing before assuming one template equals one page.

## Two things worth fixing while you are in there

**Two H1s on the listicle page.** The `rich-text` heading is `heading_tag: h1`, and the closing `temp-replo-hero` on `last_module` sets `heading_level: h1`. In archetype A that same closing module is h2.

**The video field points at the image.** Every listicle block sets `right_video` to `...listicle_block_N.value.image.value`. Almost certainly meant to be a video field.

## Boilerplate that travels

`homepage-trust-section` appears in both templates with **identical block ids** and identical quotes. It is copy pasted, not authored per page. Treat it as chrome unless someone intends to vary it.

`pbfcm-feature-split`, the offer `image-with-text`, and the guarantee `image-with-text` are similar. Hardcoded, reusable, currently disabled here.

## What the builder actually produces

Given archetypes rather than free composition, the outline output should be.

```
archetype        listicle_a
page.title       the H1
page.content     the intro
metafields
  listicle_a_listicle_block_1 .. _5
  timeline
  section_2_bts_2_accordtion
  last_module
  main_product_for_purchase
enabled sections  the optional ones to switch on
```

That is a much smaller and more tractable output than a section array with layout rotation.
