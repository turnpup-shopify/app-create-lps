# 01. System Overview

## The unit of scale

Three things are reusable across every page you will ever build.

**Claims.** A reason to believe. Written once, used on many pages.

**Layouts.** A way to arrange content on screen. Ten of them cover almost everything.

**Arcs.** An argument order. Five of them cover every awareness stage.

Nothing else is reusable. Pages are disposable. Copy is derived. Assets attach to claims, not to pages.

---

## What an arc is

**An arc is the argument order for a page. It says what job each position does, without saying what goes in it.**

Mechanically it is a named, ordered list of rhetorical roles, tied to one or more awareness stages, where each role declares which layouts can serve it and whether it repeats.

An arc is not a template. A template says section, section, section. An arc says convince, then prove, then remove the doubt. Layout is downstream of argument.

An arc contains no claims, no copy, and no fixed length. Repeatable roles expand to fit what you selected, so the same arc runs six sections on one page and eleven on another.

**The one line test.** An arc is what you would say to a copywriter before showing them the product.

> Open on the problem they already feel. Make it worse. Show why it happens. Then prove you fixed it, once per reason. Then take the price objection head on. Then let a customer say it instead of you. Then ask for the order.

That is `problem_first` read aloud.

---

## Awareness decides the arc

The most common argument on a marketing team is whether to lead with the problem, the pain, or the benefit. Nobody is right, because it depends on who is landing.

| Traffic | Awareness | Lead with |
|---|---|---|
| Broad prospecting, cold social | unaware | Not yet decided. See below |
| Search ad on a problem term | problem | The problem, in their words |
| Content or comparison search | solution | The alternative and the difference |
| Category or brand click | product | The outcome |
| Retargeting | most | The offer and the risk reversal |

**Cold and unaware has no arc yet.** It is the hardest stage and the one that cannot borrow from the others, because you cannot lead with a problem someone does not know they have. The builder lists the stage and correctly reports that no arc serves it. Deriving that arc is a teardown exercise, not a guess.

Awareness is not a guess for the other four. It comes from where the traffic originates. That makes it a dropdown, not a debate.

An arc can serve more than one stage. The listicle works for both problem aware and solution aware, so `awareness` on an arc is a list, and the interface gives you a second dropdown when more than one arc qualifies.

---

## The two archetypes

Scoped deliberately to what exists in the theme today. More can be added later, from teardowns rather than invention.

| Archetype | Template opens with | H1 comes from | Item slots |
|---|---|---|---|
| `standard` | `temp-replo-hero` | `section_temp_replo_hero.header` | none, sections are distinct |
| `listicle_a` | `rich-text` | `page.title` | `listicle_a_listicle_block_1` through `_5` |

They are not variants of each other. Different templates, different opening, different content scope.

**With only two archetypes, awareness stage stops driving structure.** You pick the archetype directly. Awareness still shapes copy tone and which claims are eligible, but it no longer selects the page shape. That collapses two dropdowns into one.

Revisit that only if a third archetype appears and the choice between them stops being obvious.

## How the permutations collapse

Five arcs. Say forty claims and fifteen objections across a catalogue.

The combinations are enormous, but every one of them is a valid page because the arc governs order and the validation rules govern coherence. You are not choosing from infinity. You are choosing an arc, then checking boxes.

That is the whole reason this system exists. It converts an open ended creative problem into a bounded selection problem.

---

## Claim scope

Not every true fact is a reason to buy. Three levels.

| scope | Definition | Example |
|---|---|---|
| `reason` | Answers why buy | Every batch tested by an outside lab |
| `spec` | Answers what is it | Vegan capsule shell |
| `detail` | Logistics and terms | Free shipping over forty dollars |

The listicle arc accepts `reason` only. Numbered items sit next to each other and a spec wearing a benefit costume is obvious at a glance.

Populating this column honestly usually reveals that half a claims list is specs. That is a useful finding and it is cheaper to learn from a sheet than from a published page.

---

## Two ordering strategies

**`strength_desc`.** Strongest claim to the hero, the rest in descending order. Correct for most arcs.

**`bookend`.** Strongest first, second strongest last, the rest in the middle. Correct for listicles, because front loading everything makes items four through seven read as filler.

---

## Two cap behaviors

**`drop_lowest`.** Over the section cap, drop the weakest droppable sections. Hero, mechanism, and close are never droppable, so a page can get thin but cannot lose its spine.

**`constrain_selection`.** Over the cap, refuse to build and tell the user to uncheck. Required for listicles, because the headline promises a number. Silently dropping a section would ship a page that lies.

---

## What the system does not decide

Copy quality.

The outline says position four proves the durability claim with a split layout. It says nothing about whether the headline lands. That is `05-generation-spec.md`, and it is the only part with no deterministic rules at all.

---

## Where arcs come from

Do not invent them from theory.

Collect twenty landing pages that convert, your own and other people's. Label each page by awareness stage based on where its traffic comes from. Then go section by section and write one verb phrase for what each section is doing to the reader. Ignore layout entirely on this pass.

Line up four pages from the same stage as columns of role labels. The common sequence is your arc. Where a page ran four sections doing the same job, that role is repeatable, and the spread across your sample gives you the min and max. Where every page had exactly one, it is not repeatable. Where every page kept a role, it is not droppable.

Then validate. Take a page you did **not** use to build the arc and try to describe it with only your role list. If every section maps, the arc holds. If you need a role you do not have, add it. If three roles never get used, the arc is overbuilt.

Theory gives you a fixed seven step outline with no repeat or drop data, which puts you straight back to a rigid template.
