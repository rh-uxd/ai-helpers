#!/usr/bin/env node
// classify-ac-tier.js — Pre-filter that guards against false T3 classifications.
// Reads extract-state.json and component-map.json (if exists) to check whether
// ACs with backend keywords actually have UI surfaces in the prototype.
//
// Usage: node classify-ac-tier.js .artifacts/<KEY>/
// Output: writes .artifacts/<KEY>/tier-overrides.json with forced-T1 entries
//
// The LLM classifier in eval-classify reads tier-overrides.json BEFORE classifying.
// Any AC listed there is locked to the specified tier regardless of keyword signals.

const { readFileSync, writeFileSync, existsSync } = require('fs');
const { join } = require('path');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node classify-ac-tier.js .artifacts/<KEY>/');
  process.exit(1);
}

const extractPath = join(artifactsDir, 'extract-state.json');
const componentMapPath = join(artifactsDir, 'component-map.json');
const outputPath = join(artifactsDir, 'tier-overrides.json');

const extractState = JSON.parse(readFileSync(extractPath, 'utf8'));
const hasComponentMap = existsSync(componentMapPath);
const componentMap = hasComponentMap ? JSON.parse(readFileSync(componentMapPath, 'utf8')) : null;

// Backend keywords that trigger false T3 when the AC actually has a UI surface
const BACKEND_KEYWORDS = [
  'validates', 'validation', 'rate limit', 'throttle',
  'rbac', 'permission', 'authorization', 'authenticate',
  'api', 'bff', 'backend', 'server-side',
  'database', 'cache', 'queue', 'webhook',
  'encryption', 'tls', 'certificate'
];

// UI-surface evidence that overrides backend keywords → force T1
const UI_EVIDENCE_KEYWORDS = [
  'error message', 'error state', 'validation message', 'red border',
  'disabled', 'hidden', 'visible', 'display', 'show', 'hide',
  'toast', 'alert', 'banner', 'notification', 'modal', 'dialog',
  'loading', 'spinner', 'progress', 'skeleton',
  'badge', 'label', 'icon', 'indicator', 'status',
  'column', 'row', 'table', 'list', 'card',
  'tooltip', 'popover', 'dropdown', 'toggle', 'button',
  'form', 'input', 'field', 'checkbox', 'radio'
];

const overrides = [];
const uiEnhancements = (extractState.feature_context?.ui_enhancements || '').toLowerCase();

for (const ac of extractState.ac_list || []) {
  const text = (ac.text || ac.criterion_text || '').toLowerCase();

  const hasBackendKeyword = BACKEND_KEYWORDS.some(kw => text.includes(kw));
  if (!hasBackendKeyword) continue; // no risk of false T3

  // Check 1: AC text itself mentions UI elements
  const hasUIKeywordInAC = UI_EVIDENCE_KEYWORDS.some(kw => text.includes(kw));

  // Check 2: feature_context.ui_enhancements references something this AC touches
  const hasUIEnhancement = uiEnhancements && BACKEND_KEYWORDS
    .filter(kw => text.includes(kw))
    .some(() => UI_EVIDENCE_KEYWORDS.some(uk => uiEnhancements.includes(uk)));

  // Check 3: component-map shows interactive elements related to this AC
  let hasComponentMapEvidence = false;
  if (componentMap?.ac_column_mapping?.[ac.criterion_id]) {
    hasComponentMapEvidence = true;
  }

  if (hasUIKeywordInAC || hasUIEnhancement || hasComponentMapEvidence) {
    overrides.push({
      criterion_id: ac.criterion_id,
      forced_tier: 'T1',
      reason: [
        hasUIKeywordInAC && 'AC text mentions UI elements',
        hasUIEnhancement && 'feature_context.ui_enhancements confirms UI surface',
        hasComponentMapEvidence && 'component-map.json maps this AC to a UI element'
      ].filter(Boolean).join('; ')
    });
  }
}

writeFileSync(outputPath, JSON.stringify(overrides, null, 2));
console.log(`Wrote ${overrides.length} tier override(s) to ${outputPath}`);
