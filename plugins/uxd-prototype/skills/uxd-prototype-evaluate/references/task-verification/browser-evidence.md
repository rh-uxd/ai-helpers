# Browser evidence for task walkthroughs

Apply these rules to every selected persona/task pair. The walkthrough contract
defines the bundle and result mapping; this guide covers observable browser work.

## Before navigation

- Use only a designer-approved browser and the reviewed starting state. Verify the
  served build matches the packet revision before recording observed outcomes.
- Keep each persona in an isolated browser session. Use source context to verify
  setup or identify evidence, not to reveal navigation answers to the persona.
- Do not install tools, start or reconfigure servers, seed browser storage, reset
  a project, or change fixtures automatically. Ask for approval when setup is
  required. A missing or unverified build is not a product failure.

## Navigate and verify visibility

- For a discoverability task, start at the reviewed entry point and navigate using
  controls visible to the persona. Direct navigation is appropriate only when
  entering by link or URL is itself the selected task.
- Target a control by its visible label and role where possible. Confirm it is
  visible and usable before acting; DOM presence, element count, or hidden text
  alone is not evidence that the user can see or use it.
- After an action, wait for the relevant visible content or state to settle. Do
  not treat a page shell, timeout, provider error, or unchanged screen as proof of
  success or failure. Record blocked or inconclusive attempts as uncertain.
- An empty view is evidence of what appeared. Do not force a project filter,
  preselect data, or supply navigation hints. Any assistance must have been
  explicitly selected and must be disclosed in the result.

## Capture and describe evidence

- Capture a screenshot and bounded visible facts from the same settled state.
  Keep the reviewed build, screen/state, capture time, and evidence reference with
  the capture. Every observed pair needs screenshot evidence.
- Capture meaningful changes: a destination, form, modal, visible result, or
  relevant failure. Avoid redundant captures, but do not infer failure merely
  because two images look alike; explain what the images do and do not establish.
- Describe what is visible, what action occurred, and its outcome in concise
  language. Never write private reasoning, a think-aloud transcript, or a claim
  about unseen backend behavior.
- If the browser or capture tool fails, preserve the tool limitation and stop
  rather than inventing a screenshot or attributing the failure to the prototype.

Evidence supports only the task and requirements it directly shows. A completed
task does not verify linked acceptance criteria; use an explicit verification step
for each selected criterion, and leave all others not tested.
