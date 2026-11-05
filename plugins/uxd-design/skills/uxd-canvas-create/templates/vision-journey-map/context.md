# Vision journey map

Start from `canvas.json` in this folder. Use it after a problem brief when a team is exploring a future experience. The board contains two matching journey frames: **As-Is** on the left and **To-Be** on the right. Keep the same actor, scenario, and phase sequence in both.

The Miro board is the canonical shared workspace when the team chooses Miro. A local `canvas.json` is optional; when saved beside a Miro board, treat it as a snapshot and preserve the board URL and widget ids.

## How to fill it

- **One actor and one scenario.** Carry the target user, situation, desired outcome, and scope from the brief into the shared context at the top. A second actor or scenario needs another map.
- **Start from the brief's Journey starters.** Treat its separate As-Is and To-Be map-shaped tables as a provisional first draft, not an approved design. Carry the playbook's map lanes and matching `S#` stage columns into the corresponding frames; invite the designer and partners to correct, add, remove, or reorder details. If the brief has no starter, draft only what its evidence and capability context support and mark gaps as open questions.
- **Use matching phases.** Match stage columns to the brief's `S#` labels and stage names. Keep names and order the same in both frames. Remove unused starter columns, or add matching S4/S5 columns, only as the scenario requires.
- **Build the As-Is from evidence.** Use research, support cases, analytics, and observation from the brief. Do not fill evidence gaps with invented behavior. Mark unverified claims `[A#]` and label sourced claims `[E#]`; include source links or a short source key in the Evidence lane.
- **Co-create with the team.** AI seeds notes from the brief's As-Is and To-Be map starters and available sources. Designers and partners correct, add, and prioritize notes on the board. Treat the As-Is map as a hypothesis where evidence is thin, and the To-Be as a hypothesis until the team reviews it.
- **Derive the To-Be from the As-Is.** Keep the actor, scenario, phases, and source table step labels aligned. Change the actions, touchpoints, screens, emotions, needs, and support response where the future experience changes. Keep unresolved or new friction visible; do not imply every pain disappears.
- **Make notes actionable.** Use one step or thought per note. Touchpoints can be product surfaces, other tools, people, documents, or channels. In To-Be, name proposed screens, their key content, and what the user does there. The Support & Opportunities lane records the response that helps the user.
- **Number the journey.** Prefix action notes with stable step labels such as `S1`, `S2`, and `S3`, in left-to-right order. Reuse a label for the corresponding moment in To-Be; mark a genuinely new or removed step clearly. The narrative and prototype handoffs preserve these labels even when steps share a screen.
- **Keep the map scannable.** The lanes are Actions, Touchpoints, Screens & Artifacts, Mindsets & Needs, Emotions, Pain & Friction, Evidence & Assumptions, and Support & Opportunities. Split dense notes into multiple stickies.
- **Use color as a backup cue.** Keep the lane labels and `[E#]` / `[A#]` markers; color alone does not communicate evidence status.
- **Reading order** is shared brief context, then As-Is left to right, then To-Be left to right; read each phase from actions down through opportunities.
- Replace every starter prompt before calling the map ready. Use the horizon and capabilities from the brief when present. If the problem brief intentionally omits them, ask the designer for the target horizon and enabling capabilities as separate To-Be context; record readiness as committed, being explored, or aspirational without changing the problem statement.

## Handoff

When the team has edited the Miro board, preserve its URL. Pass the board to `uxd-experience-narrative-create` to draft the final prose and screen breakdown, then pass both the board and narrative to `uxd-prototype-create`. The board preserves the detailed steps, touchpoints, screens, pains, evidence, assumptions, and support opportunities; the narrative carries the readable story.
