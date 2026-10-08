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
- [ ] **A cross-functional partner.** At minimum, one PM or engineering lead who can spend 1-2 hours with you during the brief and narrative phases. Vision work done in isolation tends to miss strategic context.
- [ ] **The relevant skills are available.** Briefing, narrative, prototype creation, and experience review use `uxd-problem-brief-create`, `uxd-experience-narrative-create`, `uxd-prototype-create`, and `uxd-experience-review`. Prototype creation and ticket-based evaluation live in the `uxd-prototype` plugin.
- [ ] **A target prototype workspace, when integrating into a product.** Follow its setup instructions, supported branch and branching rules, route conventions, feature flags, and documented commands. Use standalone mode for early exploration when there is no target codebase.
- [ ] **~5-8 working days of effort** spread across the four phases (not necessarily consecutive).

---

## The Process

The process has four phases. Use the matching skills in sequence; this playbook supplies the shared vision context and workshop activities.

### Phase 1: Vision Brief — Define the Problem Space

**Skill:** `uxd-problem-brief-create`

**What you'll do:** Agree on the problem, who experiences it, what evidence supports it, why it matters, the desired outcome, and the scope. Discuss future capabilities and the time horizon as enabling context for the narrative, not as part of the problem statement.

**Key outputs:**
- A problem statement grounded in user evidence
- A description of the target user and their current experience
- Stakeholders who need to align on the problem and what they care about

When the team needs product integration details, inspect the identified workspace separately. Do not add an unverified feature area, route, flag, branch convention, or design-history path to the problem brief.

**How long:** 1-2 days (including the cross-functional conversation)

**Common mistakes:**
- Starting too broad ("reimagine the whole platform") — pick one user journey
- Skipping the "current state" — the vision is only powerful if people feel the contrast with today
- Defining capabilities abstractly ("add AI") instead of concretely ("use AI to auto-classify incoming tickets based on historical patterns")

#### Workshop Activity: Value Proposition Canvas

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

**Output → Vision Brief:** The top pain-reliever connections suggest which future capabilities to explore. Keep the problem statement focused on the current user condition; the jobs-to-be-done help define the target user, and unaddressed gaps help set scope.

---

### Phase 2: Vision Narrative — Craft the Story

**Skill:** `uxd-experience-narrative-create`

**What you'll do:** Write the story of a specific user going through the future experience. This is the script that the prototype will bring to life.

**Key outputs:**
- A named user persona with a concrete scenario (drawn from an existing persona in the target workspace when applicable; otherwise synthetic and labeled as such)
- A step-by-step narrative walking through their experience in the future state
- Moments of delight or transformation highlighted (where the new capability changes everything)
- Clear before/after contrast at key moments
- A screen breakdown table, with real routes when a target workspace is provided

The skill uses the brief to frame the scene, current-state beats, turning point, future-state beats, and payoff. It can use a matching persona or research finding when available. Pass `--workspace` only when you want the screen breakdown to include verified navigation paths.

**How long:** 1-2 days

**The narrative should answer these questions (from Julie Zhuo's North Star framework):**
- When would this person encounter this experience?
- What's happening in their work/life that brings them here?
- What was painful or broken before?
- How does the new experience change what they can do?
- What makes them want to come back?

**Common mistakes:**
- Writing a feature list disguised as a story — the narrative should follow a person, not describe an interface
- Being too vague — "the user easily finds what they need" is not a narrative; "Maria clicks the AI-suggested filter and immediately sees the three clusters she spent 45 minutes building manually last week" is
- Forgetting the emotional arc — good visions make people feel something

#### Workshop Activity: Vision Journey Map

Run this as a collaborative working session to brainstorm and structure the narrative before writing it. This is a custom format that combines journey mapping with story structure, so the map you create *is* the narrative outline.

**What it is:** A journey map laid out on a timeline with five story-structure stages. Unlike a standard journey map that documents what *is*, this one maps what *will be* — showing the user's future experience as a story with rising tension, a turning point, and resolution.

**The format:**

Draw a large horizontal canvas (whiteboard, Miro, or FigJam) with five columns and four rows:

|  | 1. Setup | 2. Rising Tension | 3. The Pivot | 4. New Experience | 5. Payoff |
|--|---------|-------------------|-------------|-------------------|-----------|
| **What happens** | The user encounters the situation that kicks off the journey | The current pain compounds — things are slow, manual, fragmented | The new capability intervenes — the experience fundamentally changes | The user moves through the transformed workflow | The user achieves the outcome and realizes the value |
| **User action** | *What the user does* | *What the user does* | *What the user does* | *What the user does* | *What the user does* |
| **System response** | *What the product shows or does* | *What the product shows or does* | *What the product shows or does (the new capability)* | *What the product shows or does* | *What the product shows or does* |
| **Feeling** | Neutral / task-oriented | Frustrated / overwhelmed / anxious | Surprised / relieved | Confident / empowered | Satisfied / excited |

**How to run it:**

1. **Set the stage (10 min).** Review the Value Proposition Canvas from Phase 1. Agree on the user, the primary job-to-be-done, and the top pain-reliever connection that the vision will demonstrate. Give the user a name.

2. **Map the "Before" columns together (20 min).** Fill in columns 1 (Setup) and 2 (Rising Tension) as a group. Use sticky notes. The goal is to make the current pain *vivid* — pull directly from research quotes, support ticket language, and known frustrations. Each sticky note should be one concrete moment, not an abstraction.

3. **Define the Pivot (15 min).** This is the most important column. As a group, brainstorm: What is the single moment where the new capability changes everything? What does the user do, and what does the system do in response? This should be a concrete interaction, not a concept. Vote on the strongest version.

4. **Map the "After" columns (20 min).** Fill in columns 4 (New Experience) and 5 (Payoff). Mirror the structure of the "Before" columns so the contrast is visceral. For each moment in the "Before," there should be a corresponding — and dramatically better — moment in the "After."

5. **Walk the wall (10 min).** One person reads the full journey aloud, column by column, as a story. Does it flow? Does the pivot land? Does the payoff feel earned? Adjust sticky notes based on discussion.

6. **Identify screens (10 min).** Mark which moments on the map represent distinct screens in the prototype. Typically: 1 screen for Setup, 1 for Rising Tension, 1-2 for the Pivot, and 1 for New Experience / Payoff.

**Time:** 90 min

**Output → Vision Narrative:** The completed journey map is the outline for the narrative document. Each column becomes a section. The screen markers become the screen breakdown table. When you run `uxd-experience-narrative-create`, use this map as the input.

---

### Phase 3: Vision Prototype — Build It

**Skill:** `uxd-prototype-create` (from the `uxd-prototype` plugin)

**What you'll do:** Use `uxd-prototype-create` to build an interactive prototype that brings the narrative to life. In an existing product workspace, provide that workspace so the prototype follows its actual shell, design system, navigation, and code conventions.

**Key outputs:**
- A working prototype in the target product's design system (standalone HTML or integrated into an existing codebase)
- Screens that follow the narrative sequence from Phase 2
- Realistic sample data and content (not lorem ipsum)
- Interactive elements that demonstrate the key capability moments
- Structured prototype artifacts (changeset, metadata, summary) for downstream evaluation

**How long:** 2-3 days

**How to use it:**
When the skill asks "What are we prototyping?", provide the vision narrative document from Phase 2. The screen breakdown table is especially useful — it gives the skill the concrete screens, key elements, and interactions to build.

When extending an existing product, pass its checked-out prototype repository with `--workspace <path>`. The skill analyzes the workspace before generating pages. Do not select standalone mode when the intent is to extend the product prototype.

Recommended settings for vision work:
- **Workspace:** the target product branch path (use `standalone` only for quick early exploration before integrating into the product repo)
- **Decisions:** `human` (walk through design decisions with the assistant; choose `skip` or `auto` when that better fits the work)
- **Depth:** `normal` (4-7 design decisions, when decisions are not skipped)

Before providing implementation context, inspect the current workspace for its route registration, feature-flag mechanism, component imports, and path aliases. Follow the conventions in the selected branch.

**After the initial build:** Use `uxd-prototype-evaluate` only when the vision is tied to a Jira story and the prototype is reachable or its workspace is available. It evaluates acceptance criteria and usability; it is not a substitute for the strategic experience review. Use `uxd-experience-review` for that review, then pass concrete improvement feedback to `uxd-prototype-create` when another iteration is needed.

**Common mistakes:**
- Building standalone when you should be in workspace mode — a vision that doesn't live in the real product shell loses credibility with stakeholders who know the product
- Under-investing in content — generic placeholder content kills the illusion. When the skill asks for context, provide realistic names, data, and scenarios from your research
- Building too many screens — focus on the 3-5 screens that tell the story, not an exhaustive application
- Skipping design decisions — use `human` mode when the team wants to make the design choices deliberately, rather than accepting defaults

#### Workshop Activity: Component Mapping Session

Run this as a quick working session before starting the build to bridge the narrative into a buildable spec. Can be done solo or with a PM to gut-check the information architecture.

**What it is:** A lightweight exercise where you take each screen from the Vision Journey Map's screen markers and map it to components and a rough layout, using existing product pages as reference patterns.

**Before you start:** Browse existing pages in the target workspace that are similar to what you're building. Use the repository's documented command to run the prototype, then note the page structure, component choices, and data patterns. Your vision screens should feel like a natural extension of the existing product.

**How to run it:**

1. **List the screens (5 min).** Write each screen from the journey map on a separate sheet or section of a whiteboard. Include the screen name, which narrative moment it corresponds to, what the user is doing on this screen, and its route when one has been confirmed in the target workspace.

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

### Phase 4: Vision Review — Evaluate and Refine

**Skill:** `uxd-experience-review`

**What you'll do:** Evaluate the prototype against quality criteria, identify gaps, and refine it before sharing with stakeholders.

**Key outputs:**
- A quality assessment of narrative clarity, problem grounding, the change demonstrated, outcome, feasibility, and visual credibility
- A list of specific improvements to make
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

When prototype code changed, follow the target repository's documented lint and build commands if available. If the project maintains a design log, record the review outcome and decisions in its established location; do not create a new logging convention.

**Common mistakes:**
- Skipping this phase — "it's just a prototype" is how mediocre visions get shared
- Reviewing alone — get at least one other person (designer, PM, or eng) to walk through it before the big reveal
- Not preparing for questions — stakeholders will ask "when can we build this?" and "what would it take?" Have an answer
- Skipping the repository's documented checks after implementation changes — execution defects can distract from the experience

#### Workshop Activity: Structured Design Critique

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

**Output → Vision Review:** The categorized feedback list feeds directly into the `uxd-experience-review` skill's improvement plan. Run the skill after the critique to formalize the scorecard, incorporate the feedback, and prepare the stakeholder presentation.

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
Yes, especially in Phase 1 (the brief). Vision work done in a design silo tends to miss strategic context and lose credibility. A 1-2 hour working session with a PM partner during the brief phase is the minimum.

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
Keep the vision on a feature branch in the prototype repo. After stakeholder review, follow the team's normal review and merge process. If the project has an established design history, record the decisions there. The vision can then serve as a reference point for roadmap discussions, sprint planning, and future design work.

---

## Skill Reference

The playbook is supported by these skills. Names below follow the repository's current `uxd-` naming convention:

| Skill | Phase | What It Does | Source |
|-------|-------|-------------|--------|
| Optional research lookup | Pre-work | Retrieves evidence or participant quotes when an approved source and lookup skill are available | Optional; use supplied evidence otherwise |
| `uxd-problem-brief-create` | 1. Define | Frames the current problem, affected person, evidence, desired outcome, and scope | `uxd-workshop` plugin |
| `uxd-experience-narrative-create` | 2. Story | Turns the brief into a before-and-after user journey and screen breakdown | `uxd-workshop` plugin |
| `uxd-prototype-create` | 3. Build | Creates an interactive prototype in a standalone output or target workspace | `uxd-prototype` plugin |
| `uxd-prototype-evaluate` | Optional validation | Evaluates a prototype against a Jira story's acceptance criteria and usability | `uxd-prototype` plugin; requires Jira context and a reachable prototype or workspace |
| `uxd-experience-review` | 4. Review | Judges whether the prototype carries the problem and prepares a stakeholder demo | `uxd-workshop` plugin |

The brief and narrative ground the work in evidence and make the future experience concrete. Prototype creation and experience review carry that story into a reviewable artifact. Optional ticket-based evaluation is a separate check when a Jira story exists. Each stage's output feeds the next.

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
