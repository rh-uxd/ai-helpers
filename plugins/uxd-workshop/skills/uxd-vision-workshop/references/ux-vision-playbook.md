# UX Vision Playbook

A step-by-step guide for designers to create UX vision prototypes that show how new capabilities can be incorporated into great product experiences — grounded in real user problems, aspirational but near-term, and shareable as interactive prototypes.

---

## Where You'll Work

When a vision extends an existing product, build it inside that product's prototype workspace rather than as a disconnected application. This helps ensure:

- Your vision lives inside the **real product shell** (masthead, sidebar, navigation) and looks like a natural part of the product
- You follow the workspace's existing conventions for its design system, framework, navigation, flags, and sample data
- Stakeholders see a vision that feels credible because it's built in the same environment as the rest of the product experience
- Your work can use the team's existing preview or deployment path to share it for reviews and presentations

The stage skills are general-purpose and do not assume a particular product, repository, framework, or deployment path. Inspect the workspace the user provides and follow the conventions that are actually present. If there is no target codebase, use standalone mode for early exploration.

---

## Why Vision Work Matters

Design teams that do vision work well gain three things that teams without it don't have:

**Alignment.** When leadership, PM, and engineering are debating abstract ideas in docs and slide decks, everyone imagines something different. A vision prototype forces a shared picture. People can react to something concrete instead of arguing about abstractions.

**Influence.** Designers who can articulate where the product *should go* — not just execute on what's been decided — operate at a strategic level. Vision work is how you earn a seat in the room where priorities are set.

**Direction.** Feature work without a vision becomes a collection of local optimizations. Each feature makes sense on its own, but the overall product experience drifts. A vision gives teams a reference point: does this sprint move us toward the future we showed, or away from it?

Vision work is not speculative. It's grounded in known user pain points, real capabilities the organization is investing in, and a realistic time horizon. The artifact you produce should make leadership say "yes, that's where we need to go" — not "that's a nice fantasy."

---

## What You'll Produce

The target artifact is an **interactive vision prototype** — a clickable, shareable web application that demonstrates a future-state product experience. It should:

- Use the product's existing design system so the experience looks and feels like the actual product
- Show a complete user journey (not isolated screens)
- Preserve the team's paired As-Is and To-Be journey map as source context for the narrative and prototype
- Focus on a 6-12 month horizon — aspirational but achievable
- Address specific, known user pain points
- Demonstrate how new capabilities (AI, automation, integrations, etc.) create tangible value
- Be shareable via a URL so stakeholders can experience it directly

This is not a spec, a wireframe, or a redesign. It's a **narrative brought to life in an interactive prototype** that shows how a real user's experience transforms when the product delivers on its potential.

---

## Prerequisites

Before starting, make sure you have:

- [ ] **A product area to focus on.** Pick an area you're responsible for that has known user pain points and upcoming capability investments.
- [ ] **Access to existing research.** User interviews, support tickets, analytics, journey maps — use what is available. A research lookup skill can help if one is installed and authorized for the source. If not, work from evidence the team provides and label gaps as assumptions.
- [ ] **A cross-functional partner.** At minimum, one PM or engineering lead who can spend 1-2 hours with you during the brief and journey-map phases. Vision work done in isolation tends to miss strategic context.
- [ ] **The relevant skills are available.** Briefing and narrative use `uxd-problem-brief-create` and `uxd-experience-narrative-create` from `uxd-workshop`; map authoring uses `uxd-canvas-create` from `uxd-design`; prototype creation and ticket-based evaluation use `uxd-prototype-create` and `uxd-prototype-evaluate` from `uxd-prototype`; strategic review uses `uxd-experience-review` from `uxd-workshop`.
- [ ] **A target prototype workspace, when integrating into a product.** Follow its setup instructions, supported branch and branching rules, route conventions, feature flags, and documented commands. Use standalone mode for early exploration when there is no target codebase.
- [ ] **~5-8 working days of effort** spread across the five phases (not necessarily consecutive).

---

## The Process

The process has five phases. Use the matching skills in sequence; this playbook supplies the shared vision context and workshop activities.

### Phase 1: Vision Brief — Define the Problem Space

**Skill:** `uxd-problem-brief-create`

**What you'll do:** Agree on the problem, who experiences it, what evidence supports it, why it matters, the desired outcome, and the scope. For vision work, also capture future capabilities and the time horizon as separate context for a provisional Journey starter, not as part of the problem statement.

**Key outputs:**
- A problem statement grounded in user evidence
- A description of the target user and their current experience
- Stakeholders who need to align on the problem and what they care about
- For vision work, a separate provisional Journey starter with 3–5 paired As-Is/To-Be stages, evidence tags, and labeled hypotheses

When the team needs product integration details, inspect the identified workspace separately. The brief may include a separate, optional Project Context section for verified details; leave unknown fields open and keep implementation context out of the problem statement.

**How long:** 1-2 days (including the cross-functional conversation)

**Common mistakes:**
- Starting too broad ("reimagine the whole platform") — pick one user journey
- Skipping the "current state" — the vision is only powerful if people feel the contrast with today
- Defining capabilities abstractly ("add AI") instead of concretely ("use AI to auto-classify incoming tickets based on historical patterns")

#### Workshop Activity: Value Proposition Canvas

Miro template: [Value Proposition Canvas](https://miro.com/app/board/uXjVHyUtR8A=/?moveToWidget=3458764680752123318&cot=14)

Run this as a collaborative session with your PM partner (and ideally an engineering lead) to ground the vision brief in customer reality before you start writing.

**What it is:** Alexander Osterwalder's [Value Proposition Canvas](https://www.strategyzer.com/resources/canvas-tools-guides/the-value-proposition-canvas) is a two-sided framework that maps who your customer is against what you're offering them. It consists of:

- **Customer Profile** (right side — fill this first):
  - **Jobs-to-be-done:** What is the user trying to accomplish? Include functional jobs (complete a task), social jobs (demonstrate competence to leadership), and emotional jobs (feel confident about the outcome).
  - **Pains:** What makes these jobs hard, slow, risky, or frustrating today? Be specific — pull from research, support tickets, and direct observation.
  - **Gains:** What would "great" look like? What outcomes does the user want beyond just getting the job done?

- **Value Map** (left side — fill this second):
  - **Products & services:** What new capabilities, features, or investments could address these jobs?
  - **Pain relievers:** How specifically does each capability eliminate or reduce a pain?
  - **Gain creators:** How specifically does each capability deliver a gain the user cares about?

**Before the workshop — surface existing research:**
If an approved research lookup skill is available, use it before the workshop to bring documented evidence into the room. Try questions like:
- "What do we know about [your target user role] from our UX research?"
- "Pull findings about [your product area] from the last 18 months"
- "Do we have any research on [the pain point you're exploring]?"

Print or share the findings so workshop participants can reference them directly when filling in the Customer Profile. Participant quotes from past studies are especially valuable for the "Pains" section.

**How to run it:**
1. Print or project the canvas template. Use sticky notes for each item.
2. Start with the Customer Profile. Spend 20-30 min filling in jobs, pains, and gains. Use research findings as the primary source. If you don't have research, flag assumptions explicitly — these become things to validate.
3. Switch to the Value Map. Spend 20-30 min mapping new capabilities to pains and gains. Draw lines connecting each pain reliever to the pain it addresses.
4. Identify gaps: pains with no reliever, gains with no creator. These are either out of scope for the vision or signal that you need to think bigger about what the capabilities enable.
5. Circle the top 3 pain-reliever connections. These are the core of your vision's value proposition.

**Time:** 60-90 min

**Output → Vision Brief:** The top pain-reliever connections suggest which future capabilities to explore. Keep the problem statement focused on the current user condition; the jobs-to-be-done help define the target user, and unaddressed gaps help set scope. For vision work, draft a short paired Journey starter as a separate, provisional section of the brief. It gives the mapping workshop a first pass without making the To-Be a decision.

---

### Phase 2: Vision Journey Map — Map the Current and Future Experience

**Skill:** `uxd-canvas-create` (from the `uxd-design` plugin)

**What you'll do:** Turn the brief's provisional Journey starter and available research into a collaborative journey map. Start from one Miro board with matching **As-Is** and **To-Be** frames. The team edits and confirms the map together; AI seeds and synthesizes it without presenting assumptions as findings.

**Key outputs:**
- One actor, one scenario, and the same journey phases in both frames
- User actions, touchpoints, screens or artifacts, mindsets, emotions, pain points, evidence, assumptions, and support opportunities
- A To-Be path grounded in realistic capabilities and the agreed time horizon
- The Miro board URL, which stays the shared source for the narrative and prototype steps

**How long:** 90-120 min, with follow-up time if the map surfaces evidence gaps

**Before the session:**
- Bring the approved problem brief and research, tickets, analytics, or observations that support it.
- If the brief does not include a time horizon or enabling capabilities, agree on them as separate future-state context; keep them out of the problem statement.
- Ask `uxd-canvas-create` for a vision journey map using its paired As-Is/To-Be template. Create one Miro board with two matching frames and keep the Miro board as the canonical workspace.
- Bring the brief's Journey starter and retain its `S#` labels. If the brief lacks one, have `uxd-canvas-create` draft a concise outline from the available evidence before seeding the board; mark assumptions and leave unsupported future claims open.

**The map structure:** Both frames use the same phases and rows. The shared actor, scenario, and future horizon sit above the frames.

| Row | As-Is frame | To-Be frame |
|-----|-------------|-------------|
| **Steps & actions** | What the person does today | What the person does in the future experience |
| **Touchpoints** | Current product surfaces, tools, people, documents, or channels | Future touchpoints, including any meaningful transition between them |
| **Screens & artifacts** | Current views or artifacts involved | Proposed screens, key content, and user actions |
| **Mindsets & needs** | What the person thinks, asks, or needs | What is clarified, enabled, or still uncertain |
| **Emotions** | Evidence-based or labeled assumed feelings | The intended emotional change, with assumptions labeled |
| **Pain & friction** | Current delay, effort, risk, or breakdown | Remaining friction and any new risk |
| **Evidence & assumptions** | `[E#]` sources and `[A#]` claims to validate | Keep the same source trail; mark future-state hypotheses as assumptions |
| **Support & opportunities** | Where a product or team could help | The concrete product or service response that helps |

**How to run it:**

1. **Set the context (10 min).** Review the brief. Agree on the actor, scenario, desired outcome, scope, time horizon, and capabilities. Name readiness as committed, being explored, or aspirational.
2. **Seed the As-Is (10 min).** Ask AI to draft only from the brief and available evidence. Tag sourced notes `[E#]` and hypotheses `[A#]`; add links or a compact source key.
3. **Co-create the As-Is (20 min).** Designers and partners correct the stages, actions, touchpoints, screens, needs, emotions, and pain points. Use specific moments from the user's work, not generic labels.
4. **Choose opportunities (15 min).** Connect the most important pains to opportunities. Select the few the To-Be should address; identify evidence gaps that need validation.
5. **Co-create the To-Be (25 min).** Keep the same actor, scenario, and phases. Describe the user's actions, product response, proposed screens, and support. Leave unresolved or new friction visible.
6. **Compare the frames (10 min).** Walk each stage from As-Is to To-Be. Check that the future response addresses a mapped pain and remains credible for the horizon.
7. **Mark prototype screens (10 min).** Identify the 3-5 screens that carry the story. Record the map stage and stable `S#` step labels for each; several ordered steps may share a screen.

**Output → Narrative and Prototype:** Keep the edited Miro URL. In Phase 3, pass the brief and board to `uxd-experience-narrative-create`. In Phase 4, pass the same board and the finished narrative to `uxd-prototype-create`.

**Common mistakes:**
- Filling the As-Is with AI-generated assumptions instead of the available evidence
- Mapping a future state that removes every pain without showing how the product helps
- Changing the actor or journey phases between the two frames
- Treating every sticky note as a separate prototype screen

---

### Phase 3: Vision Narrative — Craft the Story

**Skill:** `uxd-experience-narrative-create`

**What you'll do:** Turn the reviewed brief and paired journey map into a readable story. The map holds the team's detailed journey; the narrative makes the before-and-after experience easy to understand and share.

**Key outputs:**
- A named user and concrete scene grounded in the brief and map
- As-Is beats that retain the mapped actions, touchpoints, screens, pains, and evidence
- A clear change and To-Be beats drawn from the mapped support opportunities
- A 3-5 screen breakdown and prototype handoff linked to the Miro board

**How long:** About 1 day

**How to use it:** Give `uxd-experience-narrative-create` the brief and edited Miro URL. It reads the board directly and writes the final prose and screen breakdown. It preserves `[E#]` and `[A#]` markers, asks about material conflicts, and does not edit the board. If the Miro connection is unavailable, provide a JSON Canvas snapshot or export of both frames.

The narrative should answer these questions (from Julie Zhuo's North Star framework):
- When would this person encounter this experience?
- What's happening in their work or life that brings them here?
- What was painful or broken before?
- How does the new experience change what they can do?
- What makes them want to come back?

**Common mistakes:**
- Re-running the map workshop instead of synthesizing the agreed map
- Writing a feature list instead of following the person's actions and emotional arc
- Dropping touchpoints, evidence, assumptions, or support responses from the prototype handoff
- Inventing routes; include routes only after checking the target workspace

**Output → Prototype:** Review the narrative, then give `uxd-prototype-create` both the Miro URL and the final narrative. The map supplies the detailed journey context; the narrative supplies the readable story.

---

### Phase 4: Vision Prototype — Build It

**Skill:** `uxd-prototype-create` (from the `uxd-prototype` plugin)

**What you'll do:** Use `uxd-prototype-create` to build an interactive prototype from both the Miro journey map and finished narrative. In an existing product workspace, provide that workspace so the prototype follows its actual shell, design system, navigation, and code conventions.

**Key outputs:**
- A working prototype in the target product's design system (standalone HTML or integrated into an existing codebase)
- Screens that follow the narrative sequence from Phase 3 and preserve the To-Be map's stages and touchpoints from Phase 2
- Realistic sample data and content (not lorem ipsum)
- Interactive elements that demonstrate the key capability moments
- Structured prototype artifacts (changeset, metadata, summary) for downstream evaluation

**How long:** 2-3 days

**How to use it:**
When the skill asks "What are we prototyping?", provide the Miro board URL and the final narrative document from Phase 3. The board preserves the agreed journey steps, touchpoints, pains, evidence, assumptions, and support opportunities; the narrative provides the story and screen breakdown.

When extending an existing product, pass its checked-out workspace with `--workspace <path>`. The skill analyzes the workspace before generating pages. Do not select standalone mode when the intent is to extend the product experience.

Recommended settings for vision work:
- **Workspace:** the target product branch path (use `standalone` only for quick early exploration before integrating into the product repo)
- **Decisions:** `human` (choose together on a review page or in a chat walkthrough; choose `skip` or `auto` when that better fits the work)
- **Depth:** `normal` (typically supports 4–7 meaningful design decisions when genuine tradeoffs exist; do not force a count)

Before providing implementation context, inspect the current workspace for its route registration, feature-flag mechanism, component imports, and path aliases. Follow the conventions in the selected branch.

**After the initial build:** Use `uxd-prototype-evaluate` only when the vision is tied to a Jira story and the prototype is reachable or its workspace is available. It evaluates acceptance criteria and usability; it is not a substitute for the strategic experience review. Use `uxd-experience-review` for that review; the designer selects recommendations for `uxd-prototype-create` to apply when another iteration is needed.

**Common mistakes:**
- Building standalone when you should be in workspace mode — a vision that doesn't live in the real product shell loses credibility with stakeholders who know the product
- Under-investing in content — generic placeholder content kills the illusion. When the skill asks for context, provide realistic names, data, and scenarios from your research
- Building too many screens — focus on the 3-5 screens that tell the story, not an exhaustive application
- Skipping design decisions — use `human` mode when the team wants to make the design choices deliberately, rather than accepting defaults

#### Workshop Activity: Component Mapping Session

Miro template: [Component Mapping Session](https://miro.com/app/board/uXjVHyUtR8A=/?moveToWidget=3458764680752242192&cot=14)

Run this as a quick working session before starting the build to bridge the narrative into a buildable spec. Can be done solo or with a PM to gut-check the information architecture.

**What it is:** A lightweight exercise where you take each screen from the To-Be frame and narrative screen breakdown and map it to components and a rough layout, using existing product pages as reference patterns.

**Before you start:** Browse existing pages in the target workspace that are similar to what you're building. Use the repository's documented command to run the prototype, then note the page structure, component choices, and data patterns. Your vision screens should feel like a natural extension of the existing product.

**How to run it:**

1. **List the screens (5 min).** Write each screen from the To-Be frame and narrative on a separate sheet or section of a whiteboard. Include its journey stage, mapped `S#` step labels in order, touchpoints, what the user does, and its route when confirmed in the target workspace.

2. **Find the closest existing page (5 min per screen).** For each screen, identify an existing page that has a similar layout or purpose. "My screen is like the existing inventory page but with a recommendations panel" is a more useful starting point than designing from scratch.

3. **For each screen, answer three questions (10 min per screen):**
   - **What's the primary content?** A list of items? A detail view? A dashboard of metrics? An empty state? Use the target design system's components to express it.
   - **What's the key action?** What does the user do here? Click a button, scan a list, review a suggestion, make a decision? Identify the interaction pattern the product already uses.
   - **What's the "new capability" element?** If this screen shows the pivot or new experience, how does the capability manifest visually? An AI-suggested card, an alert with a recommendation, a before/after toggle, a confidence indicator? Sketch this element — even a rough box with a label.

3. **Sketch rough layouts (10 min per screen).** For each screen, draw a quick wireframe-level layout showing where the components sit. Use the product's existing shell and label the key regions and components using its design system.

4. **Note the data (5 min per screen).** For each screen, jot down the realistic sample data it needs: names or labels, quantities, statuses, dates, metrics. Use research and the Value Proposition Canvas, while following privacy rules. Shape the data and place it using the target project's existing conventions.

**Time:** 45-75 min (depending on number of screens)

**Output → Prototype Build:** When you use `uxd-prototype-create`, provide these layouts, reference pages, and data notes as part of the feature description. The more specific you are about components, reference patterns, and content, the better the initial build will be.

---

### Phase 5: Vision Review — Evaluate and Prepare Refinements

**Skill:** `uxd-experience-review`

**What you'll do:** Evaluate the prototype against quality criteria, identify gaps, and recommend refinements before sharing with stakeholders. The designer selects which changes to make; `uxd-prototype-create` applies those changes, then the updated experience is reviewed.

**Key outputs:**
- A quality assessment of narrative clarity, problem grounding, the change demonstrated, outcome, feasibility, and visual credibility
- A prioritized list of specific recommendations for the prototype skill to apply after the designer selects them
- A presentation plan: who sees it, in what context, and what questions to anticipate
- Updated design history, when the target project already maintains one

**How long:** 1 day

**Review criteria:**
Use the `uxd-experience-review` scorecard:

- **Narrative clarity:** Can someone outside the work follow the story, and does the before/after contrast land?
- **Problem grounding:** Does the prototype show the condition in the brief, supported by its evidence?
- **Change demonstrated:** Is there a moment where the user experiences the capability, rather than seeing only a feature label?
- **Outcome:** Does the after state deliver the desired outcome from the brief?
- **Feasibility:** Could a product team see a path to what is shown within the stated time horizon?
- **Visual credibility:** Does it look like the target product? Judge against its design system, theming, and neighboring screens.

As a cross-check alongside the six ratings, compare the prototype with the reviewed To-Be map: confirm it carries the intended stages, touchpoints, screens, and support opportunities, and explain any deliberate differences.

When prototype code changed, follow the target repository's documented lint and build commands if available. If the project maintains a design log, record the review outcome and decisions in its established location; do not create a new logging convention.

**Common mistakes:**
- Skipping this phase — "it's just a prototype" is how mediocre visions get shared
- Reviewing alone — get at least one other person (designer, PM, or eng) to walk through it before the big reveal
- Not preparing for questions — stakeholders will ask "when can we build this?" and "what would it take?" Have an answer
- Skipping the repository's documented checks after implementation changes — execution defects can distract from the experience

#### Workshop Activity: Structured Design Critique

Miro template: [Structured Design Critique](https://miro.com/app/board/uXjVHyUtR8A=/?moveToWidget=3458764680822307526&cot=14)

Run this as a review session with 2-6 participants (mixed design, PM, engineering) to evaluate the vision prototype before sharing it with leadership.

**What it is:** A structured critique format based on [Jakob Nielsen's design critique method](https://jakobnielsenphd.substack.com/p/design-crit). It separates walkthrough, individual review, and group discussion into distinct phases to prevent groupthink and ensure feedback is specific and actionable.

**Preparation (24 hours before the session):**
- Share the prototype URL and the vision brief with all participants
- Include 3-5 specific questions you want feedback on (e.g., "Does the pivot moment clearly demonstrate the new capability?" or "Would a target user recognize this workflow?")
- Ask participants to click through the prototype on their own before the session and come with initial reactions

**Session format:**

1. **Walkthrough (5-7 min).** The designer walks through the prototype following the narrative sequence. No interruptions. The goal is to establish shared context, not to solicit feedback yet.

2. **Silent individual review (7-10 min).** Each participant reviews the prototype independently and writes feedback on sticky notes (physical or digital — FigJam, Miro, or Figma comments). Use this format for each note:
   - **Screen:** Which screen does this apply to?
   - **Observation:** What did you notice? (Factual, not evaluative)
   - **Suggestion:** What would you change or explore? (Specific and actionable)

3. **Facilitated group discussion (15-20 min).** The facilitator reads out sticky notes, groups similar observations, and opens them for discussion. Work through the designer's specific questions in order. For each piece of feedback, push for specificity — "it feels off" becomes "the data table on screen 3 doesn't show the resolution time comparison that the narrative promised."

4. **Categorize and prioritize (5 min).** Sort all feedback into three buckets:
   - **Must fix:** Issues that would undermine the vision's impact with stakeholders
   - **Should fix:** Weaknesses that don't break the story but weaken it
   - **Explore later:** Ideas and enhancements for future iterations

**Time:** 45-60 min

**Output → Vision Review:** The categorized feedback feeds the `uxd-experience-review` recommendations. The designer selects changes for `uxd-prototype-create` to apply; review the updated experience and prepare the stakeholder presentation.

---

## Tips for Success

**Start with the story, not the screens.** The narrative is the foundation. If you can't tell a compelling story in words, the prototype won't save it.

**Use the contrast.** The most powerful visions show before and after. Make the current pain vivid so the future state feels transformative by comparison.

**Keep the scope ruthless.** One user, one journey, one set of new capabilities. You can always expand later. A focused vision that lands is worth more than a sprawling one that confuses.

**Make it feel real.** Use your actual product's design system and realistic data. Ground personas in research, while following the research-sharing rules for names and quotes; use a labeled synthetic identity when needed.

**Show, don't present.** When sharing the vision, let stakeholders click through the prototype themselves rather than watching you narrate screenshots. Interactive experiences create conviction that slide decks don't.

**Treat it as a living artifact.** The vision isn't a one-time deliverable. Reference it in sprint planning, design reviews, and roadmap discussions. Update it as the product evolves.

---

## Frequently Asked Questions

**How is this different from a regular prototype?**
A regular prototype tests a specific feature design for usability. A vision prototype tells the story of a transformed user experience. It's broader in scope, further in time horizon, and focused on value proposition rather than interaction details.

**Do I need PM or engineering involvement?**
Yes, especially during Phase 1 (the brief) and Phase 2 (the paired journey map). Vision work done in a design silo tends to miss strategic context and lose credibility. Plan for a 1-2 hour cross-functional working session across those phases.

**What if I don't know what capabilities are coming?**
Talk to your PM and engineering partners. Look at the roadmap. Read the org's strategy docs. If there's genuinely no signal about future capabilities, the vision exercise helps surface that gap — which is valuable in itself.

**How polished does the prototype need to be?**
Polished enough that stakeholders focus on the experience, not execution defects. Use the target product's design system and realistic content; data quality matters more than pixel perfection.

**What if leadership doesn't engage with it?**
Start small. Share it with your PM partner first. Then your immediate team. Build momentum from the inside out. The best visions spread because people who see them want to show others.

**Do I need to know the target codebase well?**
You don't need to be an expert, but you should be able to follow its setup instructions, navigate the app, and find similar pages. Check the current branch's documented scripts, route registration, feature flags, and component patterns before planning implementation details.

**What if I don't have a target prototype workspace?**
The brief, narrative, and workshop activities can still be completed. Use standalone mode for early prototype exploration, and defer product-specific routes, components, and implementation decisions until a target workspace is chosen.

**What happens to my vision after the review?**
Keep the vision in an isolated branch or workspace, following the target project's normal review, merge, and sharing process. If the project has an established design history, record the decisions there. The vision can then serve as a reference point for roadmap discussions, sprint planning, and future design work.

---

## Skill Reference

The playbook is supported by these skills. Names below follow the repository's current `uxd-` naming convention:

| Skill | Phase | What It Does | Source |
|-------|-------|-------------|--------|
| Optional research lookup | Pre-work | Retrieves evidence or participant quotes when an approved source and lookup skill are available | Optional; use supplied evidence otherwise |
| `uxd-problem-brief-create` | 1. Define | Frames the current problem, affected person, evidence, desired outcome, and scope | `uxd-workshop` plugin |
| `uxd-canvas-create` | 2. Map | Creates a paired As-Is/To-Be vision journey map on one Miro board | `uxd-design` plugin |
| `uxd-experience-narrative-create` | 3. Story | Turns the brief and reviewed map into final prose and a screen breakdown | `uxd-workshop` plugin |
| `uxd-prototype-create` | 4. Build | Creates an interactive prototype from the map and narrative | `uxd-prototype` plugin |
| `uxd-prototype-evaluate` | Optional validation | Evaluates a prototype against a Jira story's acceptance criteria and usability | `uxd-prototype` plugin; requires Jira context and a reachable prototype or workspace |
| `uxd-experience-review` | 5. Review | Judges whether the prototype carries the problem and prepares a stakeholder demo | `uxd-workshop` plugin |

The brief grounds the problem, the paired Miro map keeps the team's current and future journey visible, and the narrative turns that map into a story. Prototype creation receives both the board and prose; experience review recommends changes and prepares the result for stakeholders. The designer selects refinements for prototype creation to apply, then the updated experience is reviewed. Optional ticket-based evaluation is a separate check when a Jira story exists.

### Adapting to a target workspace

Use these checks when the vision will extend an existing product. The skills do not assume particular files or conventions; inspect the selected workspace first:

| Area | When to check | Guidance |
|------|--------------|----------|
| Workspace and branch | Before prototype creation | Use the team's supported branch and branch naming rules |
| Product area and prior decisions | Brief/review preparation | Review existing product-area maps and design history if the workspace maintains them |
| Routes and flags | Prototype planning | Inspect the actual route registry and flag mechanism before planning changes |
| Personas and research | Brief/narrative | Reuse a relevant source persona or documented finding when available; label synthetic users and assumptions |
| Components and data | Prototype creation | Match neighboring pages, the design system, and existing sample-data conventions |
| Post-change checks | After implementation changes | Run checks documented by the target repository, such as its lint and build commands |
| Preview environment | Prototype review | Use the current repository's documented start and preview process |
