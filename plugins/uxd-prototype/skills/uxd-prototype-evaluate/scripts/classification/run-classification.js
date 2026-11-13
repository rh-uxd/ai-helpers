'use strict';

// Shared deterministic classification. It neither writes files nor verifies ACs.
const { BACKEND_KEYWORDS, UI_EVIDENCE_KEYWORDS } = require('./classify-ac-tier');

const SUBJECTIVE_KEYWORDS = [
  'user-friendly', 'user friendly', 'intuitive', 'clear hierarchy',
  'appropriate language', 'natural language', 'easy to understand',
  'readable', 'usable', 'discoverable', 'well received',
];
const DESIGN_REVIEW_KEYWORDS = [
  'design exploration', 'iterated on', 'team feedback', 'technical feasibility',
  'figma file', 'annotations and specifications', 'competitive analysis',
  'designer review', 'stakeholder feedback', 'user research',
];
const EXTERNAL_REFERENCE_KEYWORDS = [
  'align with', 'match ', 'consistent with', 'according to', 'conform to',
  'other product', 'other platform', 'other platforms', 'external design',
];

function includesAny(text, keywords) {
  return keywords.some(keyword => text.includes(keyword));
}

function classifyCriterion(ac, forcedOverride) {
  // Both runners use these same triage rules, in this order. Each caller
  // should not have to guess how UI, backend and judgment-heavy ACs fit together.
  const text = String(ac.text || ac.criterion_text || '').trim();
  const normalized = text.toLowerCase();
  const references = Array.isArray(ac.references) ? ac.references.filter(Boolean) : [];

  if (forcedOverride) {
    return {
      tier: forcedOverride.forced_tier,
      verdict: 'NOT_RUN',
      rationale: forcedOverride.reason || forcedOverride.reasoning || 'Confirmed UI surface.',
      humanAction: '',
      reasonCode: 'forced-ui-override',
    };
  }

  if (includesAny(normalized, SUBJECTIVE_KEYWORDS)) {
    return {
      tier: 'T4', verdict: 'NOT_RUN', rationale: '',
      humanAction: `Review this qualitative criterion: ${text}`,
      reasonCode: 'subjective-design-judgment',
    };
  }

  if (includesAny(normalized, DESIGN_REVIEW_KEYWORDS)) {
    return {
      tier: 'T4', verdict: 'NOT_RUN', rationale: '',
      humanAction: `Confirm the design-process deliverable outside the prototype: ${text}`,
      reasonCode: 'design-process-evidence',
    };
  }

  if (includesAny(normalized, EXTERNAL_REFERENCE_KEYWORDS) && references.length > 0) {
    return {
      tier: 'T2', verdict: 'NOT_RUN', rationale: '', humanAction: '',
      reasonCode: 'external-reference-required',
    };
  }

  const hasBackendSignal = includesAny(normalized, BACKEND_KEYWORDS);
  const hasUISignal = includesAny(normalized, UI_EVIDENCE_KEYWORDS);
  if (hasBackendSignal && !hasUISignal) {
    return {
      tier: 'T3', verdict: 'NOT_RUN',
      rationale: 'Backend-only — no UI component to evaluate. Noted for engineering.',
      humanAction: '', reasonCode: 'backend-only',
    };
  }

  return {
    tier: 'T1', verdict: 'NOT_RUN', rationale: '', humanAction: '',
    reasonCode: 'prototype-verifiable',
  };
}

module.exports = { classifyCriterion };
