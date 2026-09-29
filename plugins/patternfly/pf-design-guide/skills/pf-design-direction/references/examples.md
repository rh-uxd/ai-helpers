# Few-shot examples

Use these only when the scenario is genuinely similar. The tree still decides
the target first.

## Example 1 — repeated non-critical modals

**Input prompt**

> Three existing edit flows use modals, even though they are low risk and tied
> to the current page context. What should we recommend for a new settings edit
> flow?

**Output recommendation shape**

```markdown
## Recommendation
- **PatternFly check:** The current product diverges from PatternFly here. Three comparable low-risk edit modals point to a repeated local pattern, but the PF target is still inline form or drawer for contextual editing.
- **Why it matters:** The site is consistent with itself, but it is still using a higher-interruption surface than PatternFly would normally recommend for this task.
- **Recommended delta:** keep the PF target visible, but call out the local modal convention and decide whether consistency or remediation matters more on this ticket
- **Next step:** Stage or update override candidate

Include the screenshot mock in chat if the page is runnable.
```

## Example 2 — guided multi-step selection

**Input prompt**

> A user needs to choose several languages and then review the result before
> submitting.

**Output recommendation shape**

```markdown
## Recommendation
- **PatternFly check:** No divergence found. PatternFly already supports this flow with Wizard plus Form.
- **Recommended delta:** use the PF target directly; no local override should be inferred
- **Next step:** Mock -> ticket (first pass)

Include the screenshot mock in chat if the page is runnable.
```

## Example 3 — feature showcase vs docs

**Input prompt**

> The page needs to help users discover available skills and try one from the
> catalog.

**Output recommendation shape**

```markdown
## Recommendation
- **PatternFly check:** The current product diverges from PatternFly here. A static docs-style page is doing a discovery job that fits a gallery or card grid better.
- **Why it matters:** Users are trying to browse and try capabilities, not read a reference page.
- **Recommended delta:** move the browse surface toward a filterable card gallery while reusing any existing hero
- **Next step:** Mock -> ticket (first pass)

Include the screenshot mock in chat if the page is runnable.
```

## Example 4 — net-new request CTA in an empty state

**Input prompt**

> This empty state includes a "Request access" action. PatternFly does not
> define our request function directly. Is this wrong or just new?

**Output recommendation shape**

```markdown
## Recommendation
- **PatternFly check:** No divergence found. This looks like a valid PatternFly extension if the empty state is only the entry point and the follow-on request flow uses the right form surface.
- **Recommended delta:** keep the empty-state CTA if it is only the entry point; move the follow-on request flow into the right PF form surface if needed
- **Next step:** Mock -> ticket (first pass)

Include the screenshot mock in chat if the page is runnable.
```
