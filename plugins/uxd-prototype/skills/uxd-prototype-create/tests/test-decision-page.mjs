// No browser, server, or packages needed: exercise the report's response behavior.
// Run: node plugins/uxd-prototype/skills/uxd-prototype-create/tests/test-decision-page.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const template = readFileSync(new URL('../references/decision-page-template.html', import.meta.url), 'utf8');
const script = template.match(/<script>\s*([\s\S]*?)<\/script>/)[1];
function setup({ deniedClipboard = false, acceptedCustom = false, acceptedOption = false } = {}) {
  const elements = new Map();
  let copied;
  const decisions = [
    { id: 'edit-context', title: 'Where should editing happen?' },
    { id: 'bulk-actions', title: 'Where should actions appear?' },
  ].map(decision => ({ ...decision, options: [{ id: 'A', title: 'Side panel' }, { id: 'B', title: 'Dedicated page' }] }));
  if (acceptedCustom) decisions[0].custom = { title: 'Inline editor', reasoning: 'Only one short field.' };
  const inputs = decisions.flatMap(decision => ['A', 'B'].map(value => ({
    dataset: { decision: decision.id }, value,
    checked: acceptedOption && decision.id === 'edit-context' && value === 'B',
    addEventListener(name, handler) { this[name] = handler; },
  })));
  for (const id of ['decision-data', 'choice-response', 'choice-progress', 'copy-status', 'copy-response']) {
    elements.set(id, { value: '', textContent: '', disabled: false,
      addEventListener(name, handler) { this[name] = handler; },
      focus() { this.focused = true; }, select() { this.selected = true; } });
  }
  elements.get('decision-data').textContent = JSON.stringify({ prototypeId: 'PROJ-298', decisions });
  runInNewContext(script, {
    document: { getElementById: id => elements.get(id), querySelectorAll: () => inputs },
    navigator: { clipboard: { async writeText(value) {
      if (deniedClipboard) throw new Error('Clipboard unavailable');
      copied = value;
    } } },
  });
  return {
    elements, inputs, response: () => elements.get('choice-response').value, copied: () => copied,
    choose(id, value) {
      inputs.filter(input => input.dataset.decision === id).forEach(input => { input.checked = input.value === value; });
      inputs.find(input => input.dataset.decision === id && input.value === value).change();
    },
  };
}

const page = setup();
assert.equal(page.elements.get('copy-response').disabled, true);
page.choose('edit-context', 'B');
assert.match(page.response(), /^My design choices for PROJ-298:/);
assert.match(page.response(), /1\. Where should editing happen\?\n   Option B — Dedicated page/);
assert.doesNotMatch(page.response(), /Where should actions appear/);
assert.equal(page.elements.get('choice-progress').textContent, '1 of 2 choices selected');
page.choose('bulk-actions', 'A');
assert.match(page.response(), /2\. Where should actions appear\?\n   Option A — Side panel/);
await page.elements.get('copy-response').click();
assert.equal(page.copied(), page.response());
assert.throws(() => JSON.parse(page.copied()));
page.choose('edit-context', 'A');
assert.match(page.response(), /1\. Where should editing happen\?\n   Option A — Side panel/);
assert.doesNotMatch(page.response(), /Option B/);
assert.equal(page.elements.get('copy-status').textContent, '');

const partial = setup();
partial.choose('bulk-actions', 'B');
assert.match(partial.response(), /2\. Where should actions appear/); // Original question number is stable.
assert.doesNotMatch(partial.response(), /1\./);

const fallback = setup({ deniedClipboard: true });
fallback.choose('bulk-actions', 'B');
await fallback.elements.get('copy-response').click();
assert.equal(fallback.elements.get('choice-response').focused, true);
assert.equal(fallback.elements.get('choice-response').selected, true);
assert.match(fallback.elements.get('copy-status').textContent, /Copy the highlighted text/);

const custom = setup({ acceptedCustom: true });
assert.match(custom.response(), /Inline editor/);
assert.match(custom.response(), /Custom — Inline editor\n   Reasoning — Only one short field\./);
await custom.elements.get('copy-response').click();
assert.equal(custom.copied(), custom.response());
custom.choose('edit-context', 'B');
assert.doesNotMatch(custom.response(), /Inline editor/);
assert.doesNotMatch(custom.response(), /Only one short field/);
assert.match(custom.response(), /Option B — Dedicated page/);
const accepted = setup({ acceptedOption: true });
assert.match(accepted.response(), /Option B — Dedicated page/);
assert.equal(setup().elements.get('copy-response').disabled, true);
console.log('Decision report behavior passed: readable partial/batch responses, copy/fallback, changed and custom choices.');
