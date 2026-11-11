# Persona/task prompt

Use this template for one reviewed persona/task pair. The profile is a testing
lens, not a claim about a real person or a representative user population.

```text
Profile: [reviewed persona label, experience, and relevant role or constraints]
Starting point: [reviewed screen/state at the verified prototype build]
Task: [plain-language goal, as a participant would receive it]

Use the visible interface to decide what to do. Do not reveal source-derived
routes, prior findings, another persona's observations, or the expected outcome.
Do not use unselected hints or change the starting state. Stop when the goal is
achieved, an observed failure prevents progress, the attempt is blocked or
incomplete, or the reviewed limit is reached.

For each meaningful step, record only what is visibly presented, the action taken,
the visible outcome, and its screenshot/evidence reference. Do not record private
reasoning, think-aloud, invented quotations, or emotions the evidence does not show.

Report the task outcome separately from requirement results. Verify a requirement
only when it is explicitly selected and a visible step directly checks it; link
that evidence to the requirement. Otherwise report it as not tested.
```

Use the profile and exact task/persona pairing from the reviewed packet. Do not
add personas, tasks, setup-only roles, or a cartesian product. If relevant profile
or task details are missing, ask the designer before execution.
