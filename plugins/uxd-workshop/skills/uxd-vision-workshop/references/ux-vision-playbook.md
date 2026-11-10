# UX Vision Playbook

A flexible guide for designers to create UX vision prototypes that show how new capabilities can be incorporated into great product experiences — grounded in real user problems, aspirational but near-term, and shareable as interactive prototypes. It offers a recommended route and activities to use where they help; start from the work you already have.

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
- Preserve the team's evidence and decisions in the artifacts that inform the narrative and prototype. A paired As-Is and To-Be journey map is the recommended shared format when the team needs to map the experience.
- Focus on a 6-12 month horizon — aspirational but achievable
- Address specific user pain points, showing which are evidence-backed and which remain hypotheses
- Demonstrate how new capabilities (AI, automation, integrations, etc.) create tangible value
- Be shareable via a URL so stakeholders can experience it directly

This is not a spec, a wireframe, or a redesign. It's a **narrative brought to life in an interactive prototype** that shows how a real user's experience transforms when the product delivers on its potential.

---

## What Helps

You can begin with a product area, a problem hypothesis, research, a concept, or existing design artifacts. You do not need every item below before you start:

- **Evidence:** Use available interviews, support tickets, analytics, or observations. If evidence is missing, label what you know as a hypothesis and keep research gaps visible.
- **Partners:** PM, engineering, research, and product partners can add strategic and feasibility context. Involve them where their input will help; their availability is not a prerequisite for making progress.
- **Skills:** The playbook references skills for problem framing, research discovery, journey mapping, narrative, prototyping, evaluation, and review. Use whichever capabilities are available and useful. The playbook can also be followed manually.
- **Target workspace:** When extending a product, use its prototype workspace and follow its setup, branch, route, feature flag, and validation conventions. Use standalone mode for early exploration when no target workspace is available.
- **Time:** The full recommended route is estimated at about 5–8 working days. A focused path may take less time; exploration and iteration may take more.

---

## The Process

The five phases below form a recommended route, not a required sequence. Start from the designer's current situation and the outcome they want. Reuse equivalent work, skip activities that will not help, and return to earlier questions when new information changes the direction. Some activities can happen in parallel.

### Working with the UX Vision Orchestrator

After installing the UX Vision plugin, start a normal conversation about your vision work. There is no slash command to invoke; the `uxd-vision-orchestrator` agent activates from the context of the request.

Start with this prompt and fill in whatever you know:

> I'm working on a UX vision for [product area or user problem]. I want to get to a shareable vision prototype. I already have [research, brief, map, concept, prototype, or other artifacts]. I still need help with [open question or next outcome]. My constraints are [time, workspace, collaborators, or other constraints]. Help me choose a useful next step and explain what it will produce.

You can also ask for a specific task directly, for example: “I already have a brief and journey map. Help me turn them into a clickable vision prototype.” The orchestrator should use the context you provide rather than restart the playbook.

The `uxd-vision-orchestrator` agent helps choose a useful next move based on the project context. It may suggest one to three actions, explaining what each would produce and why it may help. You can accept, change, skip, or revisit a suggestion.

The orchestrator treats skills as capabilities, not required stages. It keeps evidence, assumptions, decisions, and open questions visible as work moves between artifacts. It can also help prepare a partner conversation or async review; collaboration can improve the work but does not block progress.

Use the route below when you want step-by-step guidance. The destination remains a grounded, coherent, shareable vision prototype; the route can change to fit the project.

### Phase 1: Vision Brief — Define the Problem Space

**Skill:** `uxd-problem-brief-create`

**When it helps:** Use this activity when the problem, target user, evidence, or scope is still unclear. If an existing brief or equivalent framing already covers these points, carry it forward and fill only material gaps.

**What you'll do:** Agree on the problem, who experiences it, what evidence supports it, why it matters, the desired outcome, and the scope. For vision work, also capture future capabilities and the time horizon as separate context for provisional As-Is and To-Be map starters, not as part of the problem statement.

**Useful outputs when framing the problem:**
- A problem statement tied to available user evidence, with hypotheses and evidence gaps clearly labeled
- A description of the target user and their current experience
- Stakeholders who need to align on the problem and what they care about
- For vision work, two provisional Journey map starters—As-Is and To-Be—each using the playbook's map lanes as rows and 3–5 matched `S#` journey stages as columns
- Preliminary, stage-by-stage research coverage and gap notes in the starters' **Evidence & assumptions** lanes, based on relevant findings from `uxd-research-insights`

When the team needs product integration details, inspect the identified workspace separately. The brief may include a separate, optional Project Context section for verified details; leave unknown fields open and keep implementation context out of the problem statement.

**Typical effort when selected:** 1-2 days, including time for partner input when available

**Common mistakes:**
- Starting too broad ("reimagine the whole platform") — pick one user journey
- Skipping the "current state" — the vision is only powerful if people feel the contrast with today
- Defining capabilities abstractly ("add AI") instead of concretely ("use AI to auto-classify incoming tickets based on historical patterns")

#### Workshop Activity: Value Proposition Canvas

Miro template: [Value Proposition Canvas](https://miro.com/app/board/uXjVHyUtR8A=/?moveToWidget=3458764680752123318&cot=14)

Use this collaborative session when it will help connect user needs to product opportunities. Run it with a PM or engineering partner when available, or work through it solo or asynchronously and label assumptions.

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

**If you continue to a journey map:** The top pain-reliever connections suggest future capabilities to explore. Keep the problem statement focused on the current user condition; the jobs-to-be-done help define the target user, and unaddressed gaps help set scope. When a paired map will help, draft separate provisional As-Is and To-Be Journey starters in the brief using the playbook's lanes and matching 3–5 `S#` stages. Use `uxd-research-insights` findings for preliminary coverage and `Research gap:` questions by stage in the **Evidence & assumptions** lane. Mark unsupported claims as assumptions. Revisit these notes if the team completes the journey map.

---

### Phase 2: Vision Journey Map — Map the Current and Future Experience

**Skill:** `uxd-canvas-create` (from the `uxd-design` plugin)

**When it helps:** Use this activity when the team needs a shared view of the current and future journey, or when existing maps do not capture the decisions needed for the prototype. If an equivalent reviewed paired map exists, use it. If it is incomplete, update only the missing parts.

**What you'll do:** Turn the available brief, evidence, and provisional As-Is and To-Be map starters into a journey map. When creating a new map, start from one Miro board with matching **As-Is** and **To-Be** frames. The designer can edit and confirm it solo or with partners; AI can seed and synthesize the map without presenting assumptions as findings.

**Useful outputs when mapping:**
- One actor, one scenario, and the same journey phases in both frames
- User actions, touchpoints, screens or artifacts, mindsets, emotions, pain points, evidence, assumptions, and support opportunities
- A To-Be path grounded in realistic capabilities and the agreed time horizon
- 3-5 prototype screens marked directly in the To-Be **Screens & Artifacts** row, with reference patterns and open questions
- A research coverage and gaps summary, recorded on the board and in the written handoff
- A Miro board URL or equivalent shared map artifact when one is created; carry it into later work when useful

**Typical effort when selected:** 90–120 minutes, plus time for the research coverage check

**Before the session:**
- Bring whatever problem framing and evidence are available: a brief, research, tickets, analytics, or observations.
- If the brief does not include a time horizon or enabling capabilities, agree on them as separate future-state context; keep them out of the problem statement.
- If creating a map, ask `uxd-canvas-create` for a vision journey map using its paired As-Is/To-Be template. Create one Miro board with two matching frames and keep the Miro board as the shared source for the map.
- Bring the brief's separate As-Is and To-Be map-shaped Journey starters and retain their matching `S#` stage columns and order. If the brief lacks them, have `uxd-canvas-create` draft a concise outline from the available evidence before seeding the board; mark assumptions and leave unsupported future claims open.

#### Connect Miro MCP to Codex

If you are using Codex and want it to read and edit the Miro board directly, connect Miro's hosted MCP server. Direct Miro access is optional; use the supported export or canvas handoff when it is unavailable:

1. In a terminal, add the Miro MCP server:
   ```bash
   codex mcp add miro --url https://mcp.miro.com
   ```
2. Open the authorization link Codex provides, sign in to Miro, and approve the requested access to read and write boards.
3. Start a new Codex chat or restart Codex so it loads the Miro MCP tools.
4. Check the connection:
   ```bash
   codex mcp list
   ```
   The list should show `miro` as enabled.

The server is added to your global Codex configuration. Treat the authorization link as private; do not share it because it is specific to your sign-in flow.

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

1. **Set the context (10 min).** Review the available problem framing and evidence. Define the actor, scenario, desired outcome, scope, time horizon, and capabilities that matter for this map. Name readiness as committed, being explored, or aspirational.
2. **Seed the As-Is (10 min).** Ask AI to draft only from available context and evidence. Tag sourced notes `[E#]` and hypotheses `[A#]`; add links or a compact source key.
3. **Refine the As-Is (20 min).** The designer, with partners when available, corrects the stages, actions, touchpoints, screens, needs, emotions, and pain points. Use specific moments from the user's work, not generic labels.
4. **Choose opportunities (15 min).** Connect the most important pains to opportunities. Select the few the To-Be should address; identify evidence gaps that need validation.
5. **Refine the To-Be (25 min).** Keep the same actor, scenario, and phases. Describe the user's actions, product response, proposed screens, and support. Leave unresolved or new friction visible.
6. **Compare the frames (10 min).** Walk each stage from As-Is to To-Be. Check that the future response addresses a mapped pain and remains credible for the horizon.
7. **Mark prototype screens and annotate the handoff (15 min).** Identify the 3-5 screens that carry the story. In the To-Be **Screens & Artifacts** row, label each screen `[P1]` through `[P5]` and retain its journey stage and `S#` labels. Reuse the same `[P#]` when one screen spans multiple stages. On the screen's existing map note, add a relevant product screen or pattern to reference and any open questions. The Actions, Touchpoints, and Mindsets & Needs rows already hold the related journey context. Detailed component mapping happens in Phase 4, once the target workspace and design system are known.
8. **Check research coverage and gaps (15-20 min).** Use findings already gathered through `uxd-research-insights`. If none were gathered and the skill is available and authorized, look for relevant existing findings. Compare the research with mapped As-Is pains and needs and the To-Be assumptions and opportunities. Mark each as supported, partially supported, or not found; preserve sources and `[E#]` links. Treat unsupported claims as `[A#]` assumptions and list focused questions that further research could answer. Record the same concise summary both in a clearly labeled Miro area and `.artifacts/journey-map-research-check.md` (or `.artifacts/{ID}/journey-map-research-check.md`). Do not treat missing search results as proof that research does not exist, launch new research automatically, or block the workflow.

**If you continue to a storyboard or prototype:** Carry forward the reviewed map, screen markers, research coverage summary, and gaps. When an equivalent reviewed paired map already exists, do not repeat the workshop; check its evidence coverage if needed. Give the map and relevant brief to the narrative capability for a storyboard draft, or directly to prototype creation when that best fits the work.

**Common mistakes:**
- Filling the As-Is with AI-generated assumptions instead of the available evidence
- Mapping a future state that removes every pain without showing how the product helps
- Changing the actor or journey phases between the two frames
- Treating every sticky note as a separate prototype screen

---

### Phase 3: Vision Narrative — Craft the Story

**Skill:** `uxd-experience-narrative-create`

**When it helps:** Use this activity when the experience needs a clearer story or when the team needs to align on the future journey before prototyping. Reuse or refine an existing storyboard or narrative when it already communicates the experience.

**What you'll do:** Use available problem context and journey artifacts to create an editable To-Be storyboard in Miro. Keep the storyboard simple: a setup followed by concise story cards in stage order, with one blank screen/artifact drop zone directly beneath each card for designers to add screens or sketches. The drop-zone row is part of the storyboard only; never add it to the As-Is or To-Be journey maps. The designer can edit the storyboard alone or with partners, then use the same skill again to write final narrative prose and a prototype handoff. If the team already has an agreed story, carry it forward and fill only missing details.

**Useful outputs when shaping the narrative:**
- A named user and concrete scene grounded in the available problem context and evidence
- When a map exists, As-Is beats that retain its actions, touchpoints, screens, pains, and evidence
- A To-Be storyboard frame, seeded from available context and edited by the designer or collaborators in Miro
- A clear change and To-Be beats drawn from the edited storyboard and mapped support opportunities
- A 3-5 screen breakdown and prototype handoff linked to the Miro board

**Typical effort when selected:** About 1 day, including team edits when useful

**How to use it:** When creating a story from scratch, give `uxd-experience-narrative-create` the relevant brief and edited map or Miro URL. If it can read the board, it uses both maps to draft a To-Be storyboard grounded in As-Is pains and needs. After you review the draft, it can add a separate frame to the same board; it does not change either map. If direct Miro writing is unavailable, it returns a storyboard for manual transfer. Edit the storyboard with partners when useful, then use the skill again to finalize the prose and screen breakdown. If an agreed storyboard or narrative already exists, provide it and ask only for the synthesis or refinement you need. The skill preserves `[E#]` and `[A#]` markers and surfaces material conflicts.

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

**If you continue to a prototype:** Give `uxd-prototype-create` the relevant artifacts that exist: the Miro URL or map export, storyboard, final narrative, and problem context. The map supplies structured journey and evidence details; the storyboard and narrative carry the agreed story. Do not create duplicate artifacts just to satisfy a handoff.

---

### Phase 4: Vision Prototype — Build It

**Skill:** `uxd-prototype-create` (from the `uxd-prototype` plugin)

**When it helps:** Use this activity when a future experience needs to become tangible and shareable. Prototype creation can start from a clear request, concept, brief, Figma design, or existing artifacts; provide maps, storyboards, and narrative when available and useful.

**What you'll do:** Build or refine an interactive prototype that demonstrates the target experience. In an existing product workspace, provide that workspace so the prototype follows its actual shell, design system, navigation, and code conventions.

**Key outputs:**
- A working prototype in the target product's design system (standalone HTML or integrated into an existing codebase)
- When those artifacts exist, screens that follow the agreed story and preserve the To-Be map's stages and touchpoints
- Realistic sample data and content (not lorem ipsum)
- Interactive elements that demonstrate the key capability moments
- Structured prototype artifacts (changeset, metadata, summary) for downstream evaluation

**Typical effort when selected:** 2–3 days, depending on the scope and target workspace

**How to use it:**
When the skill asks "What are we prototyping?", provide the most relevant context you have. A Miro board and final narrative are useful when available; a direct description, brief, or Figma design can also be a starting point. Preserve known journey steps, touchpoints, evidence, assumptions, and support opportunities in the prototype decisions.

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
- Skipping design decisions — use `human` mode when the designer wants to make the design choices deliberately, rather than accepting defaults

#### Workshop Activity: Component Mapping Session

Miro template: [Component Mapping Session](https://miro.com/app/board/uXjVHyUtR8A=/?moveToWidget=3458764680752242192&cot=14)

Use this quick working session when component choices or information architecture need a shared review before the build. It can be done solo or with a PM; it is optional when the prototype skill can proceed from the existing context.

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

**When it helps:** Review is recommended before a stakeholder share, especially when the vision will inform product decisions. Choose the level of review that fits the stakes: a solo pass can find obvious gaps; a partner walkthrough can add another perspective.

**What you'll do:** Check whether the prototype and story are coherent with available problem framing, evidence, maps, storyboard, and product principles. Recommend refinements for the designer to select. This review assesses the proposed experience; it does not measure downstream alignment, roadmap decisions, or adoption. Apply selected changes and review again when another iteration is useful.

**Key outputs:**
- A quality assessment of narrative clarity, problem grounding, the change demonstrated, outcome, feasibility, and visual credibility
- A prioritized list of specific recommendations for the prototype skill to apply after the designer selects them
- A presentation plan: who sees it, in what context, and what questions to anticipate
- Updated design history, when the target project already maintains one

**Typical effort when selected:** About 1 day, depending on the review and iteration needed

**Review criteria:**
Use the `uxd-experience-review` scorecard:

- **Narrative clarity:** Can someone outside the work follow the story, and does the before/after contrast land?
- **Problem grounding:** Does the prototype show the condition in the brief, supported by its evidence?
- **Change demonstrated:** Is there a moment where the user experiences the capability, rather than seeing only a feature label?
- **Outcome:** Does the after state deliver the desired outcome from the brief?
- **Feasibility:** Could a product team see a path to what is shown within the stated time horizon?
- **Visual credibility:** Does it look like the target product? Judge against its design system, theming, and neighboring screens.

As a cross-check alongside the six ratings, assess internal coherence across the brief, paired maps, edited storyboard, narrative, and prototype. Confirm the prototype carries the intended To-Be stages, touchpoints, screens, pains, and support opportunities; represent research findings, assumptions, and gaps accurately; and consider supplied product principles when available. Explain deliberate differences. The review assesses the proposed experience and does not claim to measure stakeholder alignment, roadmap decisions, adoption, or other downstream impact.

When prototype code changed, follow the target repository's documented lint and build commands if available. If the project maintains a design log, record the review outcome and decisions in its established location; do not create a new logging convention.

**Common mistakes:**
- Sharing without a review — a short quality pass can catch gaps that distract from the vision
- Reviewing alone when another perspective is available — ask a designer, PM, or engineer to walk through it when useful
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
No. Partner input can add strategic, technical, and organizational context, especially when framing the problem or judging feasibility. If partners are unavailable, keep moving with available evidence, label assumptions, and note the decisions that would benefit from their input.

**What if I don't know what capabilities are coming?**
Look at available roadmap or strategy information, and ask a PM or engineering partner when possible. If there is no signal yet, treat possible capabilities as hypotheses, keep them visible as assumptions, and use the work to identify what the team needs to learn.

**How polished does the prototype need to be?**
Polished enough that stakeholders focus on the experience, not execution defects. Use the target product's design system and realistic content; data quality matters more than pixel perfection.

**What if leadership doesn't engage with it?**
Start small. Share it with a design peer, PM, or immediate team first. Build momentum from the inside out. The best visions spread because people who see them want to show others.

**Do I need to know the target codebase well?**
You don't need to be an expert, but you should be able to follow its setup instructions, navigate the app, and find similar pages. Check the current branch's documented scripts, route registration, feature flags, and component patterns before planning implementation details.

**What if I don't have a target prototype workspace?**
The brief, narrative, and workshop activities can still be completed. Use standalone mode for early prototype exploration, and defer product-specific routes, components, and implementation decisions until a target workspace is chosen.

**What happens to my vision after the review?**
Keep the vision in an isolated branch or workspace, following the target project's normal review, merge, and sharing process. If the project has an established design history, record the decisions there. The vision can then serve as a reference point for roadmap discussions, sprint planning, and future design work.

---

## Skill Reference

The `uxd-vision-orchestrator` agent helps adapt the route to the designer's context. The skills below are capabilities it or the designer can use where they help; they do not define a required order. For the local plugin, invoke its workflow skills as `/ux-visiontype-playbook:uxd-problem-brief-create`, `/ux-visiontype-playbook:uxd-experience-narrative-create`, and `/ux-visiontype-playbook:uxd-experience-review`. When using the upstream `uxd-workshop` plugin, use that plugin's namespace instead.

| Skill | Phase | What It Does | Source |
|-------|-------|-------------|--------|
| Optional research lookup | Pre-work | Retrieves evidence or participant quotes when an approved source and lookup skill are available | Optional; use supplied evidence otherwise |
| `uxd-problem-brief-create` | 1. Define | Frames the current problem, affected person, evidence, desired outcome, and scope | `uxd-workshop` plugin |
| `uxd-canvas-create` | 2. Map | Creates a paired As-Is/To-Be vision journey map and checks research coverage and gaps | `uxd-design` plugin |
| `uxd-experience-narrative-create` | 3. Story | Drafts a Miro-editable To-Be storyboard, then turns the edited board into final prose and a screen breakdown | `uxd-workshop` plugin |
| `uxd-prototype-create` | 4. Build | Creates an interactive prototype from the available problem context, designs, maps, storyboard, and narrative | `uxd-prototype` plugin |
| `uxd-prototype-evaluate` | Optional validation | Evaluates a prototype against a Jira story's acceptance criteria and usability | `uxd-prototype` plugin; requires Jira context and a reachable prototype or workspace |
| `uxd-experience-review` | 5. Review | Checks coherence with available problem framing, evidence, design artifacts, and supplied product principles; prepares a stakeholder demo | `uxd-workshop` plugin |

When the designer follows the full recommended route, the brief frames the problem, the paired map makes the current and future journey visible, and the map-completion check records research coverage and gaps. The narrative skill can draft an editable storyboard in Miro and then finalize the prose. Prototype creation uses whichever of these artifacts are available and relevant. Experience review checks coherence and fit when a review is useful; selected refinements can be applied and reviewed again. Optional ticket-based evaluation is a separate check when a Jira story exists.

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
