#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node ${CLAUDE_SKILL_DIR}/scripts/render-report.js <artifacts-dir>');
  console.error('  e.g. node ${CLAUDE_SKILL_DIR}/scripts/render-report.js .artifacts/PROJ-298/eval/');
  process.exit(1);
}

const { resolveProjectRoot, resolveKeyFromArtifactsDir } = require('./resolve-root');
const absArtifacts = path.resolve(artifactsDir);
const projectRoot = resolveProjectRoot();
const templatePath = path.join(__dirname, '..', 'templates', 'evaluation-report.html');

// ---------------------------------------------------------------------------
// Inline SVG icons (used in action cards and evidence flags)
// ---------------------------------------------------------------------------
const SVG_ICON = {
  timesCircle: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="vertical-align:-2px"><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8zm121.6 313.1c4.7 4.7 4.7 12.3 0 17L338 377.6c-4.7 4.7-12.3 4.7-17 0L256 312l-65.1 65.6c-4.7 4.7-12.3 4.7-17 0L134.4 338c-4.7-4.7-4.7-12.3 0-17l65.6-65-65.6-65.1c-4.7-4.7-4.7-12.3 0-17l39.6-39.6c4.7-4.7 12.3-4.7 17 0l65 65.7 65.1-65.6c4.7-4.7 12.3-4.7 17 0l39.6 39.6c4.7 4.7 4.7 12.3 0 17L312 256l65.6 65.1z"/></svg>',
  warning: '<svg viewBox="0 0 576 512" width="14" height="14" fill="currentColor" style="vertical-align:-2px"><path d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.952 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"/></svg>',
  warningSmall: '<svg viewBox="0 0 576 512" width="11" height="11" fill="currentColor" style="vertical-align:-1px"><path d="M569.517 440.013C587.975 472.007 564.806 512 527.94 512H48.054c-36.937 0-59.999-40.055-41.577-71.987L246.423 23.985c18.467-32.009 64.72-31.952 83.154 0l239.94 416.028zM288 354c-25.405 0-46 20.595-46 46s20.595 46 46 46 46-20.595 46-46-20.595-46-46-46zm-43.673-165.346l7.418 136c.347 6.364 5.609 11.346 11.982 11.346h48.546c6.373 0 11.635-4.982 11.982-11.346l7.418-136c.375-6.874-5.098-12.654-11.982-12.654h-63.383c-6.884 0-12.356 5.78-11.981 12.654z"/></svg>',
  search: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="vertical-align:-2px"><path d="M505 442.7L405.3 343c-4.5-4.5-10.6-7-17-7H372c27.6-35.3 44-79.7 44-128C416 93.1 322.9 0 208 0S0 93.1 0 208s93.1 208 208 208c48.3 0 92.7-16.4 128-44v16.3c0 6.4 2.5 12.5 7 17l99.7 99.7c9.4 9.4 24.6 9.4 33.9 0l28.3-28.3c9.4-9.4 9.4-24.6.1-34zM208 336c-70.7 0-128-57.2-128-128 0-70.7 57.2-128 128-128 70.7 0 128 57.2 128 128 0 70.7-57.2 128-128 128z"/></svg>',
  chartSearch: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="vertical-align:-2px"><path d="M332.8 320h17.1l6.4-6.4C378 291.3 392 262.2 392 228c0-70.7-57.3-128-128-128S136 157.3 136 228s57.3 128 128 128c34.2 0 65.3-13.4 88.4-35.2l6.4-6.4v-17.1L476.7 415c11 11 28.8 11 39.8 0 11-11 11-28.8 0-39.8L332.8 320zM264 336c-59.6 0-108-48.4-108-108S204.4 120 264 120s108 48.4 108 108-48.4 108-108 108zM168 456v32h288v-32H168zM168 392v32h288v-32H168z"/></svg>',
  checkCircle: '<svg viewBox="0 0 512 512" width="14" height="14" fill="currentColor" style="vertical-align:-2px;margin-right:4px"><path d="M504 256c0 136.967-111.033 248-248 248S8 392.967 8 256 119.033 8 256 8s248 111.033 248 248zM227.314 387.314l184-184c6.248-6.248 6.248-16.379 0-22.627l-22.627-22.627c-6.248-6.249-16.379-6.249-22.628 0L216 308.118l-70.059-70.059c-6.248-6.248-16.379-6.248-22.628 0l-22.627 22.627c-6.248 6.248-6.248 16.379 0 22.627l104 104c6.249 6.249 16.379 6.249 22.628.001z"/></svg>',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function numScore(v) {
  if (typeof v === 'number') return v;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function isScoredDimension(d) {
  const s = d.composite_score;
  return s !== null && s !== undefined && s !== 'N/A' && s !== 'n/a';
}

function normalizeUsabilityDimensions(ud) {
  if (!ud) return ud;
  if (!ud.personas_evaluated && ud.persona_selection && ud.persona_selection.selected) {
    ud.personas_evaluated = ud.persona_selection.selected;
  }

  const dimIdAliases = {
    'scalability_complexity': 'scalability_progressive_complexity',
    'system_status': 'system_status_trust',
    'system_status_visibility': 'system_status_trust',
    'system_status_observability': 'system_status_trust',
    'cross_persona_context': 'cross_persona_handoffs',
    'technical_abstraction_level': 'technical_abstraction',
  };
  const dimNames = {
    'workflow_continuity': 'Workflow Continuity & Integrity',
    'cross_persona_handoffs': 'Cross-Persona Context & Handoffs',
    'scalability_progressive_complexity': 'Scalability & Progressive Complexity',
    'system_status_trust': 'System Status, Observability & Trust',
    'technical_abstraction': 'Technical Abstraction & Signal-to-Noise',
    'mental_model_fidelity': 'Mental Model Fidelity',
    'accessibility_inclusion': 'Accessibility & Inclusion',
  };

  if (ud.dimensions) {
    for (const dim of ud.dimensions) {
      if (dim.id && dimIdAliases[dim.id]) dim.id = dimIdAliases[dim.id];
      if (!dim.name && dim.id) dim.name = dimNames[dim.id] || dim.id;
      if (dim.score !== undefined && dim.composite_score === undefined) dim.composite_score = dim.score;
      if (dim.scores && !dim.persona_scores) dim.persona_scores = dim.scores;
    }
  }
  if (ud.persona_overlays) {
    for (const overlay of ud.persona_overlays) {
      if (overlay.persona_id && !overlay.persona) overlay.persona = overlay.persona_id;
      if (overlay.persona && !overlay.persona_id) overlay.persona_id = overlay.persona;
    }
  }
  if (ud.think_aloud && ud.think_aloud.traces) {
    for (const trace of ud.think_aloud.traces) {
      if (trace.dimension_scores) {
        for (const [key, val] of Object.entries(trace.dimension_scores)) {
          const normalizedKey = dimIdAliases[key] || key;
          if (normalizedKey !== key) {
            trace.dimension_scores[normalizedKey] = val;
            delete trace.dimension_scores[key];
          }
          if (typeof trace.dimension_scores[normalizedKey] === 'number') {
            trace.dimension_scores[normalizedKey] = { score: trace.dimension_scores[normalizedKey], confidence: 'medium' };
          }
        }
      }
    }
  }
  return ud;
}

function normalizeJourneyLog(jl, artifactsDir) {
  if (!jl) return jl;
  if (!jl.depth) jl.depth = 'deep';
  if (!jl.evaluated_at) jl.evaluated_at = new Date().toISOString();
  if (Array.isArray(jl.journeys)) {
    for (const j of jl.journeys) {
      if (j.steps_expected == null && Array.isArray(j.steps)) j.steps_expected = j.steps.length;
      if (j.steps_expected == null) j.steps_expected = j.steps_completed || 0;
      if (j.steps_completed == null && Array.isArray(j.steps)) j.steps_completed = j.steps.filter(s => s.result === 'success').length;
      if (j.steps_completed == null) j.steps_completed = 0;
      if (!j.persona) j.persona = 'Evaluator';
      if (!j.source) j.source = j.ac_ids ? `Testing ${j.ac_ids.join(', ')}` : '';
      if (Array.isArray(j.steps)) {
        for (const s of j.steps) {
          if (s.screenshot && s.screenshot.startsWith('/') && artifactsDir) {
            const rel = path.relative(artifactsDir, s.screenshot);
            if (!rel.startsWith('..')) s.screenshot = rel;
          }
          if (!s.narration && s.result) s.narration = s.target || s.action || '';
        }
      }
    }
  }
  return jl;
}

// ---------------------------------------------------------------------------
// Schema normalization — handles all observed persona-results.json variants
// ---------------------------------------------------------------------------

function normalizePersonaResults(raw) {
  if (!raw) return [];
  let entries = Array.isArray(raw) ? raw : (raw.personas || []);

  return entries.map(entry => {
    const persona = entry.persona_id || entry.persona || 'unknown';
    const personaName = entry.persona_name || null;
    const taskIndex = entry.task_index ?? entry.task_idx ?? 1;
    const abandoned = entry.abandoned ?? (entry.outcome === 'abandoned') ?? false;

    let confusionEvents = entry.confusion_events;
    if (typeof confusionEvents === 'number') {
      confusionEvents = Array.from({ length: confusionEvents }, (_, i) => ({ step: i + 1 }));
    } else if (!Array.isArray(confusionEvents)) {
      confusionEvents = [];
    }

    const trace = (entry.trace || []).map(step => ({
      step: step.step,
      what_i_see: step.what_i_see || step.description || '',
      what_im_thinking: step.what_im_thinking || step.thought || '',
      action: step.action || '',
      target: step.target || '',
      confidence: step.confidence || 'medium',
      patience: step.patience ?? 100,
      screenshot: step.screenshot || '',
      evidence_for_acs: step.evidence_for_acs || [],
      confusion_event: step.confusion_event ?? false,
      dead_end: step.dead_end ?? false,
      result: step.result || undefined,
      narration: step.narration || undefined,
    }));

    return {
      persona,
      persona_id: persona,
      persona_name: personaName,
      task_index: taskIndex,
      task: entry.task || '',
      trace,
      screenshots: entry.screenshots || [],
      patience_start: entry.patience_start ?? 100,
      patience_end: entry.patience_end ?? 100,
      abandoned,
      outcome: entry.outcome || (abandoned ? 'abandoned' : 'completed'),
      would_complete: entry.would_complete ?? !abandoned,
      confusion_events: confusionEvents,
      dimension_scores: entry.dimension_scores || {},
    };
  });
}

function normalizeConsistencyReport(raw) {
  if (!raw) return null;
  if (raw.source_mode && Array.isArray(raw.violations)) return raw;

  const normalized = {
    source_mode: raw.source_mode || 'unknown',
    summary: raw.summary || '',
    violations: [],
    total_violations: 0,
  };

  if (Array.isArray(raw.violations)) {
    normalized.violations = raw.violations.map(v => ({
      guideline_id: v.guideline_id || v.id || '',
      guideline_title: v.guideline_title || v.title || v.guideline_id || '',
      severity: v.severity || 'warning',
      file: v.file || '',
      line: v.line || null,
      description: v.description || '',
      suggestion: v.suggestion || v.fix || '',
      pf_doc_url: v.pf_doc_url || '',
      category: v.category || '',
    }));
  } else if (raw.categories) {
    for (const [cat, items] of Object.entries(raw.categories)) {
      if (Array.isArray(items)) {
        for (const v of items) {
          normalized.violations.push({
            guideline_id: v.guideline_id || v.id || '',
            guideline_title: v.guideline_title || v.title || '',
            severity: v.severity || 'warning',
            file: v.file || '',
            line: v.line || null,
            description: v.description || '',
            suggestion: v.suggestion || v.fix || '',
            pf_doc_url: v.pf_doc_url || '',
            category: cat,
          });
        }
      }
    }
  }

  normalized.total_violations = normalized.violations.length;
  return normalized;
}

// ---------------------------------------------------------------------------
// Persona name map — single lookup used everywhere a persona is displayed
// ---------------------------------------------------------------------------

function buildPersonaNameMap(personaResults, journeyLog) {
  const nameMap = {};

  if (personaResults) {
    for (const pr of personaResults) {
      const id = pr.persona || pr.persona_id;
      if (id && pr.persona_name) nameMap[id] = pr.persona_name;
    }
  }

  if (journeyLog && journeyLog.usability_dimensions && journeyLog.usability_dimensions.persona_overlays) {
    for (const ov of journeyLog.usability_dimensions.persona_overlays) {
      const id = ov.persona || ov.persona_id;
      if (id && ov.persona_name && !nameMap[id]) nameMap[id] = ov.persona_name;
    }
  }

  // Also try persona YAML files for names and roles
  const contextDir = path.join(require('./resolve-root').resolveProjectRoot(), '.context', 'usability-testing', 'personas');
  if (journeyLog && journeyLog.usability_dimensions && journeyLog.usability_dimensions.personas_evaluated) {
    for (const pid of journeyLog.usability_dimensions.personas_evaluated) {
      if (!nameMap[pid]) {
        const yamlPath = path.join(contextDir, pid + '.yaml');
        const raw = readFileOr(yamlPath, '');
        const nameMatch = raw.match(/^name:\s*"?(.+?)"?\s*$/m);
        if (nameMatch) nameMap[pid] = nameMatch[1];
      }
    }
  }

  return nameMap;
}



function resolvePersonaName(nameMap, rawId) {
  if (!rawId) return 'Unknown';
  if (nameMap[rawId]) return nameMap[rawId];
  return rawId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function readFileOr(filePath, fallback) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch { return fallback; }
}

function readJsonOr(filePath, fallback) {
  const raw = readFileOr(filePath, null);
  if (!raw) return fallback;
  try { return JSON.parse(raw); } catch { return fallback; }
}

let _knownMRsCache;
function readKnownMRs() {
  if (_knownMRsCache) return _knownMRsCache;
  const overlayPath = path.join(__dirname, '..', 'config', 'product-overlay.yaml');
  const raw = readFileOr(overlayPath, '');
  const mrs = {};
  const match = raw.match(/known_mrs:\n((?:\s+\S+.*\n)*)/);
  if (match) {
    for (const line of match[1].split('\n')) {
      const m = line.match(/\s+(\S+):\s*(\d+)/);
      if (m) mrs[m[1]] = parseInt(m[2], 10);
    }
  }
  _knownMRsCache = mrs;
  return mrs;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderInlineMarkdown(escaped) {
  return escaped
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

function badgeHtml(verdict, acId) {
  const v = String(verdict).toUpperCase();
  const cls = v === 'PASS' ? 'badge-pass' : v === 'FAIL' ? 'badge-fail' : 'badge-flagged';
  if (v === 'FLAGGED' && acId) {
    return `<span class="badge ${cls}" style="cursor:pointer" onclick="openReviewPanel('${escapeHtml(acId)}')" title="Click to review">${v}</span>`;
  }
  return `<span class="badge ${cls}">${v}</span>`;
}

function extractPrototypeId() {
  return path.basename(absArtifacts);
}

function extractExpectedBehavior(criterionText) {
  if (!criterionText) return '';
  const thenMatch = criterionText.match(/,\s*then\s+(.+?)(?:,\s*measured\s+by\b.*)?$/i);
  if (thenMatch) {
    let behavior = thenMatch[1].replace(/,\s*$/, '').trim();
    behavior = behavior.charAt(0).toUpperCase() + behavior.slice(1);
    return behavior;
  }
  const whenMatch = criterionText.match(/,\s*when\s+(.+?)(?:,\s*measured\s+by\b.*)?$/i);
  if (whenMatch) {
    let behavior = whenMatch[1].replace(/,\s*$/, '').trim();
    behavior = behavior.charAt(0).toUpperCase() + behavior.slice(1);
    return behavior;
  }
  return criterionText.replace(/,?\s*measured\s+by\b.*$/i, '').trim();
}

function normalizeDelta(raw) {
  if (!raw) return null;

  const toPath = f => typeof f === 'string' ? f : (f && (f.path || f.file)) || String(f);
  const flatPaths = arr => (arr || []).map(toPath);

  const allFiles = flatPaths(raw.changed_files || raw.files_changed ||
    [...(raw.new_files || []), ...(raw.modified_files || [])]);

  const cats = raw.categories || {};
  const newPages = flatPaths(cats.new_pages);
  const routeNavChanges = flatPaths(cats.route_nav_changes);
  const featureFlagChanges = flatPaths(cats.feature_flag_changes);

  const newFiles = flatPaths(raw.new_files) || newPages;
  const modifiedFiles = flatPaths(raw.modified_files) ||
    allFiles.filter(f => !newPages.includes(f));

  return {
    mr_number: raw.mr_number || null,
    base_branch: raw.base_branch || '?',
    workspace: raw.workspace || null,
    total_files_changed: raw.total_files_changed || raw.stats?.files || raw.stats?.files_changed || allFiles.length,
    stats: {
      files_changed: raw.stats?.files_changed || raw.stats?.files || raw.total_files_changed || allFiles.length,
      insertions: raw.stats?.insertions || 0,
      deletions: raw.stats?.deletions || 0
    },
    changed_files: allFiles,
    new_files: newFiles,
    modified_files: modifiedFiles,
    route_changes: raw.route_changes ?? routeNavChanges.length > 0,
    nav_changes: raw.nav_changes ?? routeNavChanges.some(f => f.includes('AppLayout') || f.includes('nav')),
    feature_flag_changes: raw.feature_flag_changes ?? featureFlagChanges.length > 0,
    nav_warning: raw.nav_warning || (raw.navigation_gaps && raw.navigation_gaps.length ? raw.navigation_gaps[0] : ''),
    new_routes: flatPaths(raw.new_routes),
    summary: raw.summary || '',
    categories: cats
  };
}

// ---------------------------------------------------------------------------
// Parse CSV
// ---------------------------------------------------------------------------

// CSV schema: config/csv-schema.yaml — column names and order are enforced there
function parseCsv(raw) {
  if (!raw) return [];
  const lines = raw.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse Section 1 (Acceptance Criteria) — skip # headers
  let headers = null;
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      if (headers && trimmed.startsWith('# USABILITY') || trimmed.startsWith('# BASELINE')) break;
      continue;
    }
    if (!headers) {
      headers = parseCSVLine(trimmed);
      continue;
    }
    const vals = parseCSVLine(trimmed);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function parseCsvSection(raw, sectionName) {
  if (!raw) return [];
  const lines = raw.trim().split('\n');
  let inSection = false;
  let headers = null;
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      if (trimmed.toUpperCase().includes(sectionName.toUpperCase())) { inSection = true; headers = null; continue; }
      else if (inSection) break;
      continue;
    }
    if (!inSection || !trimmed) continue;
    if (!headers) { headers = parseCSVLine(trimmed); continue; }
    const vals = parseCSVLine(trimmed);
    const obj = {};
    headers.forEach((h, idx) => { obj[h] = vals[idx] || ''; });
    rows.push(obj);
  }
  return rows;
}

function buildFullCsv(csvRaw, journeyLog, passCount, failCount, flaggedCount, extractState) {
  let fullCsv = csvRaw.trim();

  // Append Section 2 (Usability Dimensions) if not already present and data exists
  if (!fullCsv.includes('# USABILITY DIMENSIONS')) {
    const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
    if (ud && ud.dimensions) {
      fullCsv += '\n\n# USABILITY DIMENSIONS\ndimension_id,dimension_name,score,confidence,evidence,persona_scores\n';
      for (const dim of ud.dimensions) {
        const pScores = dim.persona_scores ? JSON.stringify(dim.persona_scores).replace(/"/g, '""') : '';
        fullCsv += `${dim.id || ''},${escapeCSVField(dim.name || '')},${numScore(dim.composite_score)},${dim.confidence || 'medium'},${escapeCSVField(dim.evidence || '')},"${pScores}"\n`;
      }
    }
  }

  // Append Section 3 (Persona Insights) if not already present
  if (!fullCsv.includes('# PERSONA INSIGHTS')) {
    const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
    if (ud && ud.persona_overlays && ud.persona_overlays.length) {
      fullCsv += '\n\n# PERSONA INSIGHTS\npersona,task,patience_start,patience_end,abandoned,confusion_events,cli_escapes,key_friction\n';
      const piTasks = extractState ? (extractState.tasks_to_be_done || []) : [];
      for (const overlay of ud.persona_overlays) {
        const taskIdx = overlay.task_index;
        const taskDef = taskIdx ? piTasks[taskIdx - 1] : null;
        const taskLabel = taskDef ? taskDef.task : (taskIdx ? `Task ${taskIdx}` : '');
        const frictions = (overlay.confusion_events || []).map(e => e.trigger || '').filter(Boolean).slice(0, 3).join('; ');
        fullCsv += `${escapeCSVField(overlay.persona_name || overlay.persona)},${escapeCSVField(taskLabel)},${overlay.patience_start || 100},${overlay.patience_end || 100},${overlay.abandoned || false},${(overlay.confusion_events || []).length},${overlay.cli_escapes || 0},${escapeCSVField(frictions)}\n`;
      }
    }
  }

  // Append Section 4 (Baseline) if not already present
  if (!fullCsv.includes('# BASELINE')) {
    const total = passCount + failCount + flaggedCount;
    const passRate = total > 0 ? (passCount / total).toFixed(2) : '0';
    const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
    const usabilityComposite = ud ? (ud.overall_score || 0) : 0;
    const journeys = journeyLog ? journeyLog.journeys || [] : [];
    const journeyPassRate = journeys.length > 0 ? (journeys.filter(j => j.verdict === 'PASS').length / journeys.length).toFixed(2) : '0';

    // Build conclusion summary
    let conclusion = '';
    if (total > 0) {
      conclusion = `${passCount}/${total} criteria passed (${(passCount/total*100).toFixed(0)}%)`;
      if (failCount > 0) conclusion += `. ${failCount} failed`;
      if (flaggedCount > 0) conclusion += `. ${flaggedCount} need human review`;
    }

    fullCsv += '\n\n# BASELINE\nmetric,value,source\n';
    fullCsv += `total_criteria,${total},evaluation-report.csv\n`;
    fullCsv += `pass_count,${passCount},evaluation-report.csv\n`;
    fullCsv += `fail_count,${failCount},evaluation-report.csv\n`;
    fullCsv += `flagged_count,${flaggedCount},evaluation-report.csv\n`;
    fullCsv += `pass_rate,${passRate},computed\n`;
    fullCsv += `usability_composite,${usabilityComposite},journey-log.json\n`;
    fullCsv += `journey_pass_rate,${journeyPassRate},journey-log.json\n`;
    fullCsv += `conclusion,${escapeCSVField(conclusion)},computed\n`;

    // Add persona patience summaries
    if (ud && ud.persona_overlays) {
      for (const overlay of ud.persona_overlays) {
        const name = overlay.persona_name || overlay.persona;
        fullCsv += `patience_${(overlay.persona || '').replace(/[^a-z]/g, '_')},${overlay.patience_end || 100}%,persona-overlay\n`;
      }
    }
  }

  return fullCsv;
}

function buildSummaryJson() {
  const protoId = extractPrototypeId();
  const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const iterationLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
  const suggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), []);
  const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
  const csvRows = parseCsv(csvRaw);

  let passCount = 0, failCount = 0, flaggedCount = 0;
  for (const r of csvRows) {
    const v = (r.verdict || '').toUpperCase();
    if (v === 'PASS') passCount++;
    else if (v === 'FAIL') failCount++;
    else if (v === 'FLAGGED') flaggedCount++;
  }
  const total = passCount + failCount + flaggedCount;

  let status = 'needs-attention';
  if (total > 0 && failCount === 0 && flaggedCount === 0) status = 'pass';
  else if (failCount > 0) status = 'fail';

  const acVerdicts = csvRows.map(r => ({
    id: r.criterion_id || '',
    text: r.criterion_text || '',
    verdict: (r.verdict || '').toUpperCase(),
    tier: r.tier || '',
    rationale: r.rationale || '',
  }));

  const usability = {};
  if (ud) {
    usability.overall_score = typeof ud.overall_score === 'number' ? ud.overall_score : null;
    const scoredDims = (ud.dimensions || []).filter(d => isScoredDimension(d));
    usability.max_score = ud.max_score || (scoredDims.length > 0 ? scoredDims.length * 3 : 21);
    usability.personas_evaluated = ud.personas_evaluated || [];
    usability.dimensions = (ud.dimensions || []).map(d => ({
      id: d.id,
      name: d.name,
      composite_score: d.composite_score,
      persona_scores: d.persona_scores || d.scores || {},
    }));
  }

  const pendingSuggestions = Array.isArray(suggestions)
    ? suggestions.filter(s => !s.applied).length
    : 0;

  const iteration = {};
  if (iterationLog) {
    iteration.current = (iterationLog.iterations || []).length;
    iteration.max = iterationLog.max_iterations || null;
    iteration.exit_reason = iterationLog.exit_reason || null;
  }

  return {
    key: protoId,
    timestamp: (journeyLog && journeyLog.evaluated_at) || new Date().toISOString(),
    status,
    ac_verdicts: acVerdicts,
    counts: { pass: passCount, fail: failCount, flagged: flaggedCount, total },
    usability: Object.keys(usability).length ? usability : null,
    suggestions_pending: pendingSuggestions,
    iteration: Object.keys(iteration).length ? iteration : null,
  };
}

function escapeCSVField(str) {
  if (!str) return '';
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

const { parseCSVLine } = require('./csv-utils');

// ---------------------------------------------------------------------------
// Parse markdown sections
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// Encode screenshots
// ---------------------------------------------------------------------------

function loadScreenshots(screenshotsDir) {
  const map = {};
  if (!fs.existsSync(screenshotsDir)) return map;
  const files = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).sort();

  const journeyLogPath = path.join(path.dirname(screenshotsDir), 'journey-log.json');
  let journeyLogMtime = 0;
  try { journeyLogMtime = fs.statSync(journeyLogPath).mtimeMs; } catch {}

  let staleWarning = false;
  const hashToDataUri = new Map();
  let dedupSaved = 0;

  for (const file of files) {
    const filePath = path.join(screenshotsDir, file);
    if (journeyLogMtime > 0) {
      const ssMtime = fs.statSync(filePath).mtimeMs;
      if (ssMtime > journeyLogMtime + 60000) {
        staleWarning = true;
      }
    }
    const data = fs.readFileSync(filePath);
    const hash = require('crypto').createHash('md5').update(data).digest('hex');

    if (hashToDataUri.has(hash)) {
      map[file] = hashToDataUri.get(hash);
      dedupSaved++;
    } else {
      const dataUri = 'data:image/png;base64,' + data.toString('base64');
      hashToDataUri.set(hash, dataUri);
      map[file] = dataUri;
    }
  }

  if (staleWarning) {
    console.warn('  ⚠ WARNING: Screenshots appear newer than journey-log.json — journey analysis may not reflect current screenshots.');
  }
  if (dedupSaved > 0) {
    console.log(`  Screenshot dedup: ${files.length} files → ${hashToDataUri.size} unique images (${dedupSaved} duplicates reuse shared data URIs)`);
  }
  return map;
}

const _ssFileCache = new Map();
function getScreenshotDataUri(filePath) {
  if (_ssFileCache.has(filePath)) return _ssFileCache.get(filePath);
  if (!fs.existsSync(filePath)) { _ssFileCache.set(filePath, ''); return ''; }
  const data = fs.readFileSync(filePath);
  const hash = require('crypto').createHash('md5').update(data).digest('hex');
  for (const [, uri] of _ssFileCache) {
    if (uri && uri.includes(hash)) { _ssFileCache.set(filePath, uri); return uri; }
  }
  const uri = 'data:image/png;base64,' + data.toString('base64');
  _ssFileCache.set(filePath, uri);
  return uri;
}

// ---------------------------------------------------------------------------
// Build tokens
// ---------------------------------------------------------------------------

function buildDeltaHtml() {
  const deltaPath = path.join(absArtifacts, 'mr-delta.json');
  const delta = normalizeDelta(readJsonOr(deltaPath, null));
  if (!delta) return '<p class="muted small">No MR delta data available. Run with --workspace to enable.</p>';

  const addIcon = '<span class="delta-added" title="Added">+</span>';
  const modIcon = '<span class="delta-modified" title="Modified">~</span>';

  const protoId = extractPrototypeId();
  const mrNum = delta.mr_number || readKnownMRs()[protoId];
  const mrDiffUrl = mrNum ? `https://gitlab.cee.redhat.com/uxd/prototypes/rhoai/-/merge_requests/${mrNum}/diffs` : '';

  let html = `<p class="small"><strong>${delta.stats?.files_changed || delta.total_files_changed || 0} files changed</strong> against <code>${escapeHtml(delta.base_branch || '?')}</code>`;
  if (mrNum) html += ` · <a href="${mrDiffUrl}" target="_blank">View full diff on GitLab (MR !${mrNum})</a>`;
  html += `</p>`;

  // Show modified file list
  const allChanged = delta.changed_files || [...(delta.new_files || []), ...(delta.modified_files || [])];
  if (allChanged.length) {
    html += `<div class="delta-meta">`;
    const shortFiles = allChanged.slice(0, 5).map(f => f.replace('src/app/', '').replace('src/', ''));
    html += `<span class="small muted">${shortFiles.join(', ')}${allChanged.length > 5 ? ` +${allChanged.length - 5} more` : ''}</span>`;
    html += `</div>`;
  }

  // Navigation warning
  if (delta.nav_warning) {
    html += `<div class="delta-nav-warn">${escapeHtml(delta.nav_warning)}</div>`;
  }

  // File lists with icons
  const newFiles = delta.new_files || [];
  const modFiles = delta.modified_files || [];
  const changedFiles = delta.changed_files || [];

  html += `<div class="delta-files">`;

  if (newFiles.length || modFiles.length) {
    if (newFiles.length) {
      html += `<div class="delta-file-group"><h4>${addIcon} ${newFiles.length} Added</h4><ul class="delta-file-list">`;
      for (const f of newFiles.slice(0, 8)) {
        const short = f.replace('src/app/', '').replace('src/', '');
        html += `<li>${addIcon} <code>${escapeHtml(short)}</code></li>`;
      }
      if (newFiles.length > 8) html += `<li class="muted">+${newFiles.length - 8} more</li>`;
      html += `</ul></div>`;
    }
    if (modFiles.length) {
      const important = modFiles.filter(f => f.includes('AppLayout') || f.includes('routes') || f.includes('FeatureFlag'));
      const other = modFiles.filter(f => !important.includes(f));

      html += `<div class="delta-file-group"><h4>${modIcon} ${modFiles.length} Modified</h4><ul class="delta-file-list">`;
      for (const f of important) {
        const short = f.replace('src/app/', '').replace('src/', '');
        html += `<li>${modIcon} <code><strong>${escapeHtml(short)}</strong></code></li>`;
      }
      for (const f of other.slice(0, 5)) {
        const short = f.replace('src/app/', '').replace('src/', '');
        html += `<li>${modIcon} <code>${escapeHtml(short)}</code></li>`;
      }
      if (other.length > 5) html += `<li class="muted">+${other.length - 5} more</li>`;
      html += `</ul></div>`;
    }
  } else if (changedFiles.length) {
    html += `<div class="delta-file-group"><h4>${modIcon} ${changedFiles.length} Changed</h4><ul class="delta-file-list">`;
    for (const f of changedFiles.slice(0, 8)) {
      const short = f.replace('src/app/', '').replace('src/', '');
      const isImportant = f.includes('AppLayout') || f.includes('routes') || f.includes('FeatureFlag');
      html += `<li>${modIcon} <code${isImportant ? '><strong' : ''}>${escapeHtml(short)}${isImportant ? '</strong>' : ''}</code></li>`;
    }
    if (changedFiles.length > 8) html += `<li class="muted">+${changedFiles.length - 8} more</li>`;
    html += `</ul></div>`;
  }
  html += `</div>`;

  // New routes
  if (delta.new_routes && delta.new_routes.length) {
    html += `<p class="small muted mt1">New routes: ${delta.new_routes.map(r => '<code>' + escapeHtml(r) + '</code>').join(', ')}</p>`;
  }

  if (delta.summary) html += `<p class="small mt1">${escapeHtml(delta.summary)}</p>`;
  return html;
}

function buildPersonaSelectionHtml() {
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const rawPersonaResults = readJsonOr(path.join(absArtifacts, 'persona-results.json'), null);
  const personaNameMap = buildPersonaNameMap(normalizePersonaResults(rawPersonaResults), journeyLog);
  const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
  if (!ud || !ud.personas_evaluated || !ud.personas_evaluated.length) {
    return '<p class="muted small">No persona data available.</p>';
  }

  const selection = ud.persona_selection || (journeyLog && journeyLog.persona_selection);
  if (selection) {
    const audienceText = selection.target_audience_text;
    let html = '';
    if (audienceText) {
      html += `<p class="small"><strong>Target audience:</strong> ${escapeHtml(audienceText)}</p>`;
    } else {
      const personaNames = ud.personas_evaluated.map(p => resolvePersonaName(personaNameMap, p));
      html += `<p class="small"><strong>Personas evaluated:</strong> ${personaNames.map(n => escapeHtml(n)).join(', ')}</p>`;
    }
    if (selection.reasoning) {
      html += `<p class="small muted" style="margin:0.4rem 0"><strong>Why these personas:</strong> ${escapeHtml(selection.reasoning)}</p>`;
      if (selection.target_audience_source) html += `<p class="small muted">Source: ${escapeHtml(selection.target_audience_source)}</p>`;
      if (selection.considered_but_rejected && selection.considered_but_rejected.length) {
        html += `<p class="small muted" style="margin-top:0.5rem"><strong>Considered but not selected:</strong></p><ul class="small">`;
        for (const r of selection.considered_but_rejected) {
          html += `<li><code>${escapeHtml(r.persona_id || r.persona)}</code> — ${escapeHtml(r.reason)}</li>`;
        }
        html += `</ul>`;
      }
    }
    return html;
  }

  // No formal selection data — auto-generate from available persona and RFE context
  const personas = ud.personas_evaluated;
  let html = `<p class="small"><strong>Personas evaluated:</strong> ${personas.map(p => escapeHtml(resolvePersonaName(personaNameMap, p))).join(', ')}</p>`;

  // Attempt to infer reasoning from the persona IDs and any RFE snapshot
  const hasJunior = personas.some(p => p.includes('junior'));
  const hasSenior = personas.some(p => p.includes('senior'));
  const families = [...new Set(personas.map(p => p.replace(/-junior|-senior|-experienced/, '')))];

  let inferredReasoning = '';
  if (hasJunior && hasSenior) {
    inferredReasoning = `Junior + senior pair selected from the ${families.join('/')} persona family for maximum friction range.`;
  } else if (families.length > 1) {
    inferredReasoning = `Cross-domain selection: ${families.join(' + ')} personas to test different expertise levels.`;
  } else {
    inferredReasoning = `${families[0] || 'Unknown'} persona family selected based on RFE target audience.`;
  }

  html += `<p class="small"><strong>Inferred reasoning:</strong> ${escapeHtml(inferredReasoning)}</p>`;
  html += `<p class="small muted" style="margin-top:0.5rem;padding:0.4rem 0.6rem;background:rgba(240,171,0,0.06);border-radius:0.25rem">Full persona selection reasoning was not logged for this run. This is auto-generated from the evaluated personas list. To get full reasoning (target audience source, considered-but-rejected personas), ensure the eval writes <code>persona_selection</code> to journey-log.json before scoring (see SKILL.md Step 3b.1).</p>`;
  return html;
}

function getPersonaAvatar(pid) {
  const colorMap = {
    'deena-junior': '#e86e30',
    'deena-senior': '#c45a26',
    'alex-junior': '#6b5b95',
    'alex-senior': '#4a3d7a',
    'maude': '#8b6914',
    'paula': '#1a8cba',
    'sam': '#4a5568',
    'raj': '#b8860b',
  };
  const base = pid.replace(/-junior|-senior/, '');
  const color = colorMap[pid] || colorMap[base] || '#6b7280';
  const svg = `<svg viewBox="0 0 24 24" width="18" height="18" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>`;
  return { svg, color };
}

function buildPersonaWalkthroughsHtml() {
  const screenshotsDir = path.join(absArtifacts, 'screenshots');
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const extractState = readJsonOr(path.join(absArtifacts, 'extract-state.json'), null);
  const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
  const rawPersonaResults = readJsonOr(path.join(absArtifacts, 'persona-results.json'), null);
  const personaNameMap = buildPersonaNameMap(normalizePersonaResults(rawPersonaResults), journeyLog);

  if (!ud || !ud.personas_evaluated || !ud.personas_evaluated.length) {
    return '<p class="muted small">No persona walkthrough data. Phase B did not produce per-persona screenshots.</p>';
  }

  const contextDir = path.join(require('./resolve-root').resolveProjectRoot(), '.context', 'usability-testing', 'personas');
  const overlays = ud.persona_overlays || [];
  const thinkAloud = ud.think_aloud || {};
  const traces = thinkAloud.traces || [];

  let html = '';
  html += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:1rem;margin-top:1rem">`;

  for (const pid of ud.personas_evaluated) {
    const yamlPath = path.join(contextDir, pid + '.yaml');
    const raw = readFileOr(yamlPath, '');
    const nameMatch = raw.match(/^name:\s*"?(.+?)"?\s*$/m);
    const levelMatch = raw.match(/^experience_level:\s*(.+)$/m);
    const patienceMatch = raw.match(/^\s+patience:\s*(\w+)/m);
    const explorationMatch = raw.match(/^\s+exploration_tendency:\s*(\w+)/m);

    const name = nameMatch ? nameMatch[1] : resolvePersonaName(personaNameMap, pid);
    const level = levelMatch ? levelMatch[1].trim() : '';
    const patience = patienceMatch ? patienceMatch[1].trim() : '';
    const exploration = explorationMatch ? explorationMatch[1].trim() : '';
    const avatar = getPersonaAvatar(pid);

    const overlay = overlays.find(o => o.persona === pid) || {};
    const trace = traces.find(t => t.persona === pid) || {};
    const confusionCount = (overlay.confusion_events || []).length;
    const patienceEnd = overlay.patience_end || trace.patience_end || 100;
    const outcome = trace.outcome || (overlay.abandoned ? 'abandoned' : overlay.would_complete === false ? 'abandoned' : 'completed');
    const outcomeBadge = outcome === 'completed' ? 'badge-pass' : outcome === 'abandoned' ? 'badge-fail' : 'badge-flagged';

    const personaScreenshots = fs.existsSync(screenshotsDir)
      ? fs.readdirSync(screenshotsDir).filter(f => f.startsWith(`persona-${pid}-`) && f.endsWith('.png')).sort()
      : [];
    const stepCount = personaScreenshots.length;
    const taskCount = extractState ? (extractState.tasks_to_be_done || []).length : 1;

    const assistedCount = (overlay.confusion_events || []).filter(e => e.trigger && e.trigger.includes('assisted')).length;

    html += `<div class="card" style="cursor:pointer;transition:box-shadow 0.15s,border-color 0.15s" onclick="openEvidenceViewer()" onmouseover="this.style.borderColor='var(--link)'" onmouseout="this.style.borderColor=''">`;
    html += `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">`;
    html += `<div style="width:2.5rem;height:2.5rem;border-radius:50%;background:${avatar.color};display:flex;align-items:center;justify-content:center;flex-shrink:0">${avatar.svg}</div>`;
    html += `<div><h4 style="margin:0;font-size:0.9375rem">${escapeHtml(name)}</h4>`;
    html += `<span class="small muted">${escapeHtml(level)} · Patience: ${escapeHtml(patience)} · Exploration: ${escapeHtml(exploration)}</span></div>`;
    html += `</div>`;

    // Domain knowledge tags (compact)
    const knowledgeSection = raw.match(/domain_knowledge:\n((?:\s+\w+:.+\n?)+)/);
    if (knowledgeSection) {
      const entries = knowledgeSection[1].match(/^\s+(\w+):\s*(\w+)/gm);
      if (entries && entries.length) {
        html += `<div style="display:flex;flex-wrap:wrap;gap:0.25rem;margin-bottom:0.5rem">`;
        for (const entry of entries.slice(0, 6)) {
          const [, domain, lvl] = entry.trim().match(/(\w+):\s*(\w+)/) || [];
          if (!domain) continue;
          let tagStyle = 'background:var(--bg-secondary);color:var(--text-secondary)';
          if (['strong', 'competent', 'expert'].includes(lvl)) tagStyle = 'background:rgba(62,134,53,0.08);color:var(--success-text)';
          else if (lvl === 'none' || lvl === 'minimal') tagStyle = 'background:rgba(201,25,11,0.06);color:var(--danger-text)';
          html += `<span style="font-size:0.65rem;padding:0.1rem 0.4rem;border-radius:3px;${tagStyle}">${escapeHtml(domain)}: ${escapeHtml(lvl)}</span>`;
        }
        html += `</div>`;
      }
    }

    html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem;margin-bottom:0.75rem">`;
    html += `<div class="small"><strong>${taskCount}</strong> task${taskCount > 1 ? 's' : ''}, <strong>${stepCount}</strong> steps</div>`;

    // Patience with explanation
    const patienceColor = patienceEnd > 60 ? 'var(--status-success)' : patienceEnd > 30 ? 'var(--status-warning)' : 'var(--status-danger)';
    html += `<div class="small"><strong style="color:${patienceColor}">${patienceEnd}%</strong> patience</div>`;
    html += `<div class="small"><strong>${confusionCount}</strong> confusion events</div>`;
    html += `<div class="small"><strong>${assistedCount}</strong> assisted nav</div>`;
    html += `</div>`;

    // Explain low patience
    if (patienceEnd < 50) {
      const confEvents = overlay.confusion_events || [];
      let reason = '';
      if (confEvents.length > 0) {
        reason = confEvents[0].trigger || 'navigation difficulty';
      } else if (trace.narration_summary) {
        reason = trace.narration_summary.slice(0, 80);
      }
      if (reason) {
        html += `<p class="small" style="margin:0 0 0.5rem;color:${patienceColor};font-style:italic">Struggled with: ${escapeHtml(reason)}</p>`;
      }
    }

    html += `<div style="display:flex;justify-content:space-between;align-items:center">`;
    html += `<span class="badge ${outcomeBadge}">${escapeHtml(outcome)}</span>`;
    html += `<span class="small" style="color:var(--link);font-weight:400">View Walkthrough →</span>`;
    html += `</div>`;
    html += `</div>`;
  }

  html += `</div>`;
  return html;
}

function loadPersonaData(absArtifacts, screenshotsDir) {
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const extractState = readJsonOr(path.join(absArtifacts, 'extract-state.json'), null);
  const rawPersonaResults = readJsonOr(path.join(absArtifacts, 'persona-results.json'), null);
  const personaResults = normalizePersonaResults(rawPersonaResults);

  let ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
  if (!ud) ud = {};

  const personaNameMap = buildPersonaNameMap(personaResults, journeyLog);

  if (!ud.personas_evaluated && personaResults.length > 0) {
    ud.personas_evaluated = [...new Set(personaResults.map(r => r.persona).filter(Boolean))];
  }
  if (!ud.personas_evaluated && fs.existsSync(screenshotsDir)) {
    const ssFiles = fs.readdirSync(screenshotsDir).filter(f => f.startsWith('persona-') && f.endsWith('.png'));
    const pids = [...new Set(ssFiles.map(f => {
      const m = f.match(/^persona-(.+?)-task-/);
      return m ? m[1] : null;
    }).filter(Boolean))];
    if (pids.length > 0) ud.personas_evaluated = pids;
  }

  const tasksDefined = extractState ? (extractState.tasks_to_be_done || []) : [];
  const screenshotsByPersona = {};
  if (ud.personas_evaluated && fs.existsSync(screenshotsDir)) {
    const allFiles = fs.readdirSync(screenshotsDir).filter(f => f.endsWith('.png')).sort();
    for (const pid of ud.personas_evaluated) {
      screenshotsByPersona[pid] = allFiles.filter(f => f.startsWith(`persona-${pid}-`));
    }
  }
  return { personaResults, ud, tasksDefined, screenshotsByPersona, journeyLog, personaNameMap };
}

function buildPersonaWalkthroughData() {
  const screenshotsDir = path.join(absArtifacts, 'screenshots');
  const { personaResults, ud, tasksDefined, screenshotsByPersona, journeyLog, personaNameMap } = loadPersonaData(absArtifacts, screenshotsDir);
  const consistencyReport = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);

  if (!ud || !ud.personas_evaluated) return '{}';

  const overlays = ud.persona_overlays || [];
  const traces = (ud.think_aloud || {}).traces || [];
  const data = {};

  for (const pid of ud.personas_evaluated) {
    const overlay = overlays.find(o => o.persona === pid) || {};
    const trace = traces.find(t => t.persona === pid) || {};
    const confusionEvents = overlay.confusion_events || [];

    const personaEntries = personaResults ? personaResults.filter(r => (r.persona_id || r.persona) === pid) : [];

    const allPersonaScreenshots = screenshotsByPersona[pid] || [];

    const hasMultiTask = allPersonaScreenshots.some(f => f.match(/task-\d+-step/));

    // Build tasks array
    const tasks = [];

    const minTaskIdx = personaEntries.reduce((m, e) => Math.min(m, e.task_index != null ? e.task_index : 1), Infinity);
    const isZeroBased = minTaskIdx === 0;

    if (personaEntries.length > 0) {
      // Use structured persona-results.json data (preferred path)
      for (const entry of personaEntries) {
        const taskIdx = isZeroBased ? ((entry.task_index || 0) + 1) : (entry.task_index || 1);
        let screenshots = allPersonaScreenshots
          .filter(f => f.match(new RegExp(`task-${taskIdx}-step`)))
          .map(f => ({ file: f, step: parseInt((f.match(/step-(\d+)/) || [])[1] || '0', 10) }));
        if (screenshots.length === 0) {
          screenshots = allPersonaScreenshots
            .filter(f => f.match(new RegExp(`task-${taskIdx}\\b`)) && !f.match(/task-\d+-step/))
            .map(f => ({ file: f, step: 0 }));
        }

        const thinkaloudPath = path.join(absArtifacts, `usability-thinkaloud-${pid}-task-${taskIdx}.md`);
        let thinkaloudRaw = readFileOr(thinkaloudPath, '');
        if (!thinkaloudRaw && taskIdx === 1) {
          thinkaloudRaw = readFileOr(path.join(absArtifacts, `usability-thinkaloud-${pid}.md`), '');
        }

        let steps = parseThinkAloudSteps(thinkaloudRaw, screenshots, screenshotsDir, confusionEvents, consistencyReport);

        // Override patience values with persona-results.json trace data (more accurate than markdown parsing)
        if (steps.length > 0 && entry.trace && entry.trace.length > 0) {
          for (let si = 0; si < steps.length; si++) {
            const traceEntry = entry.trace[si];
            if (traceEntry && traceEntry.patience !== undefined) {
              steps[si].patience = String(traceEntry.patience);
            }
          }
        }

        // Build steps from trace data when no think-aloud MD produced steps
        if (steps.length === 0 && entry.trace && entry.trace.length > 0) {
          const screenshotStepIdx = entry.trace.findIndex(t => t.action === 'screenshot');
          for (let si = 0; si < entry.trace.length; si++) {
            const traceStep = entry.trace[si];
            let ssRef = '';
            const isScreenshotStep = si === screenshotStepIdx || (screenshotStepIdx === -1 && si === entry.trace.length - 1);
            if (isScreenshotStep && screenshots.length > 0) {
              ssRef = `screenshots/${screenshots[screenshots.length - 1].file}`;
            }
            steps.push({
              step: traceStep.step || si + 1,
              see: traceStep.what_i_see || traceStep.description || '',
              thinking: traceStep.thought || traceStep.what_im_thinking || '',
              trying: traceStep.action || '',
              confidence: traceStep.confidence || '',
              patience: String(traceStep.patience || 100),
              screenshot: ssRef,
              confusionEvents: []
            });
          }
        }

        const taskDef = tasksDefined[taskIdx - 1] || {};
        tasks.push({
          task: entry.task || taskDef.task || `Task ${taskIdx}`,
          covers_acs: taskDef.covers_acs || [],
          steps,
          outcome: entry.outcome || 'completed',
          patienceEnd: entry.patience_end || 100
        });
      }
    } else if (hasMultiTask) {
      // Group screenshots by task number
      const taskScreenshots = {};
      for (const f of allPersonaScreenshots) {
        const m = f.match(/task-(\d+)-step-(\d+)/);
        if (m) {
          const taskIdx = parseInt(m[1], 10);
          if (!taskScreenshots[taskIdx]) taskScreenshots[taskIdx] = [];
          taskScreenshots[taskIdx].push({ file: f, step: parseInt(m[2], 10) });
        }
      }

      // Load general think-aloud as fallback when task-specific files don't exist
      const generalTaPath = path.join(absArtifacts, `usability-thinkaloud-${pid}.md`);
      const generalTaRaw = readFileOr(generalTaPath, '');

      for (const [taskIdx, screenshots] of Object.entries(taskScreenshots)) {
        const thinkaloudPath = path.join(absArtifacts, `usability-thinkaloud-${pid}-task-${taskIdx}.md`);
        let thinkaloudRaw = readFileOr(thinkaloudPath, '');

        // Fall back to general think-aloud for task 1 if no task-specific file exists
        if (!thinkaloudRaw && generalTaRaw && parseInt(taskIdx) === 1) {
          thinkaloudRaw = generalTaRaw;
        }

        const taskDef = tasksDefined[parseInt(taskIdx) - 1] || {};

        let steps = parseThinkAloudSteps(thinkaloudRaw, screenshots, screenshotsDir, confusionEvents, consistencyReport);

        // If parsing produced no steps but we have screenshots, create minimal screenshot-only steps
        if (steps.length === 0 && screenshots.length > 0) {
          for (const ss of screenshots.sort((a, b) => a.step - b.step)) {
            steps.push({
              step: ss.step,
              see: '',
              think: '',
              tryAction: '',
              confidence: '',
              patience: '100',
              screenshot: `screenshots/${ss.file}`,
              confusion: []
            });
          }
        }

        tasks.push({
          task: taskDef.task || `Task ${taskIdx}`,
          covers_acs: taskDef.covers_acs || [],
          steps,
          outcome: thinkaloudRaw.includes('Abandoned') ? 'abandoned' : 'completed',
          patienceEnd: steps.length ? (parseInt(steps[steps.length - 1].patience) || 100) : 100
        });
      }
    } else {
      // Backward compatible: single task (old format persona-<id>-step-N.png)
      const thinkaloudPath = path.join(absArtifacts, `usability-thinkaloud-${pid}.md`);
      const thinkaloudRaw = readFileOr(thinkaloudPath, '');
      const screenshots = allPersonaScreenshots.map(f => {
        const m = f.match(/step-(\d+)/);
        return { file: f, step: m ? parseInt(m[1], 10) : 0 };
      });

      const steps = parseThinkAloudSteps(thinkaloudRaw, screenshots, screenshotsDir, confusionEvents, consistencyReport);
      const taskDef = tasksDefined[0] || {};

      tasks.push({
        task: taskDef.task || (journeyLog.journeys && journeyLog.journeys[0] ? journeyLog.journeys[0].title : 'Primary task'),
        covers_acs: taskDef.covers_acs || [],
        steps,
        outcome: trace.outcome || (overlay.abandoned ? 'abandoned' : 'completed'),
        patienceEnd: overlay.patience_end || trace.patience_end || 100
      });
    }

    const dimensions = {};
    if (ud.dimensions) {
      for (const dim of ud.dimensions) {
        if (dim.scores && dim.scores[pid]) {
          dimensions[dim.id] = { score: dim.scores[pid].score, name: dim.name, finding: dim.scores[pid].finding || '' };
        }
      }
    }

    const goals = [];
    if (journeyLog.journeys) {
      for (const j of journeyLog.journeys) {
        goals.push({ title: j.title, ac_ids: j.ac_ids || [] });
      }
    }

    data[pid] = { tasks, dimensions, goals };
  }

  return JSON.stringify(data);
}

function getPersonaMetadata(pid) {
  const personaDir = path.join(require('./resolve-root').resolveProjectRoot(), '.context', 'usability-testing', 'personas');
  const yamlPath = path.join(personaDir, `${pid}.yaml`);
  const meta = { role: '', experience: '', exploration: '', patience_level: '' };
  try {
    if (!fs.existsSync(yamlPath)) return meta;
    const raw = fs.readFileSync(yamlPath, 'utf8');
    const nameMatch = raw.match(/^name:\s*"?([^"\n]+)"?/m);
    if (nameMatch) meta.role = nameMatch[1].replace(/^[^-]+-\s*/, '').trim();
    const expMatch = raw.match(/^experience_level:\s*(\w+)/m);
    if (expMatch) meta.experience = expMatch[1];
    const archMatch = raw.match(/^rh_persona_archetype:\s*(.+)/m);
    if (archMatch) meta.archetype = archMatch[1].trim();
    if (raw.includes('exploration_tendency')) {
      const expl = raw.match(/exploration_tendency:\s*(\w+)/);
      if (expl) meta.exploration = expl[1].toLowerCase();
    } else if (raw.includes('proactively check') || raw.includes('drill down')) {
      meta.exploration = 'high';
    }
    if (raw.includes('does not abandon') || raw.includes('high patience')) {
      meta.patience_level = 'high';
    } else if (raw.includes('time_pressure: variable')) {
      meta.patience_level = 'medium';
    }
  } catch (e) { /* persona YAML not available */ }
  return meta;
}

function buildEvidenceViewerData() {
  const screenshotsDir = path.join(absArtifacts, 'screenshots');
  const { personaResults, ud, tasksDefined, screenshotsByPersona, personaNameMap } = loadPersonaData(absArtifacts, screenshotsDir);
  const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
  const csvRows = parseCsv(csvRaw);

  // --- personas ---
  const personas = {};

  if (ud && ud.personas_evaluated) {
    const overlays = ud.persona_overlays || [];

    for (const pid of ud.personas_evaluated) {
      const overlay = overlays.find(o => o.persona === pid) || {};
      const confusionEvents = overlay.confusion_events || [];
      const personaEntries = personaResults ? personaResults.filter(r => (r.persona_id || r.persona) === pid) : [];

      const allPersonaScreenshots = screenshotsByPersona[pid] || [];

      const displayName = resolvePersonaName(personaNameMap, pid);
      const tasks = [];

      const evMinTaskIdx = personaEntries.reduce((m, e) => Math.min(m, e.task_index != null ? e.task_index : 1), Infinity);
      const evIsZeroBased = evMinTaskIdx === 0;

      if (personaEntries.length > 0) {
        for (const entry of personaEntries) {
          const taskIdx = evIsZeroBased ? ((entry.task_index || 0) + 1) : (entry.task_index || 1);
          let ssFiles = allPersonaScreenshots
            .filter(f => f.match(new RegExp(`task-${taskIdx}-step`)))
            .map(f => ({ file: f, step: parseInt((f.match(/step-(\d+)/) || [])[1] || '0', 10) }));
          if (ssFiles.length === 0) {
            ssFiles = allPersonaScreenshots
              .filter(f => f.match(new RegExp(`task-${taskIdx}\\b`)) && !f.match(/task-\d+-step/))
              .map(f => ({ file: f, step: 0 }));
          }
          if (ssFiles.length === 0) {
            ssFiles = allPersonaScreenshots
              .filter(f => f.match(/step-\d+/) && !f.match(/task-\d+-step/))
              .map(f => ({ file: f, step: parseInt((f.match(/step-(\d+)/) || [])[1] || '0', 10) }));
          }

          const traceSteps = entry.trace || [];
          const steps = [];

          // Find which trace step has action=screenshot to attach the image there
          const screenshotStepIdx = traceSteps.findIndex(t => t.action === 'screenshot');

          for (let si = 0; si < traceSteps.length; si++) {
            const t = traceSteps[si];
            const stepNum = t.step || si + 1;
            let ssRef = '';

            // Attach screenshot to the screenshot-action step, or to the last step
            const isScreenshotStep = si === screenshotStepIdx || (screenshotStepIdx === -1 && si === traceSteps.length - 1);
            if (isScreenshotStep && ssFiles.length > 0) {
              ssRef = `screenshots/${ssFiles[ssFiles.length - 1].file}`;
            } else {
              const ssEntry = ssFiles.find(s => s.step === stepNum);
              if (ssEntry) ssRef = `screenshots/${ssEntry.file}`;
            }

            const stepConfusion = confusionEvents.filter(e => e.step === stepNum);

            const rawAction = t.action || '';
            const verbMatch = rawAction.match(/^(\w+(?:\s+\w+)?)\s+(.+)$/);
            const actionVerb = verbMatch ? verbMatch[1] : rawAction;
            const actionTarget = verbMatch ? verbMatch[2] : '';

            steps.push({
              step: stepNum,
              what_i_see: t.what_i_see || t.description || '',
              what_im_thinking: t.what_im_thinking || t.thought || '',
              action: rawAction,
              actionVerb,
              actionTarget,
              confidence: t.confidence || 'medium',
              patience: t.patience != null ? t.patience : 100,
              screenshot: ssRef,
              evidence_for_acs: t.evidence_for_acs || [],
              confusion_event: stepConfusion.length > 0 ? stepConfusion[0] : null
            });
          }

          const taskDef = tasksDefined[taskIdx - 1] || {};
          tasks.push({
            task: entry.task || taskDef.task || `Task ${taskIdx}`,
            covers_acs: taskDef.covers_acs || [],
            steps
          });
        }
      } else {
        const hasMultiTask = allPersonaScreenshots.some(f => f.match(/task-\d+-step/));

        if (hasMultiTask) {
          const taskScreenshots = {};
          for (const f of allPersonaScreenshots) {
            const m = f.match(/task-(\d+)-step-(\d+)/);
            if (m) {
              const ti = parseInt(m[1], 10);
              if (!taskScreenshots[ti]) taskScreenshots[ti] = [];
              taskScreenshots[ti].push({ file: f, step: parseInt(m[2], 10) });
            }
          }

          for (const [taskIdx, ssFiles] of Object.entries(taskScreenshots)) {
            const taskDef = tasksDefined[parseInt(taskIdx) - 1] || {};
            const steps = [];
            for (const ss of ssFiles.sort((a, b) => a.step - b.step)) {
              const stepConfusion = confusionEvents.filter(e => e.step === ss.step);
              steps.push({
                step: ss.step,
                what_i_see: '',
                what_im_thinking: '',
                action: '',
                confidence: 'medium',
                patience: 100,
                screenshot: `screenshots/${ss.file}`,
                evidence_for_acs: [],
                confusion_event: stepConfusion.length > 0 ? stepConfusion[0] : null
              });
            }
            tasks.push({
              task: taskDef.task || `Task ${taskIdx}`,
              covers_acs: taskDef.covers_acs || [],
              steps
            });
          }
        } else if (allPersonaScreenshots.length > 0) {
          const ssFiles = allPersonaScreenshots.map(f => {
            const m = f.match(/step-(\d+)/);
            return { file: f, step: m ? parseInt(m[1], 10) : 0 };
          });
          const taskDef = tasksDefined[0] || {};
          const steps = [];
          for (const ss of ssFiles.sort((a, b) => a.step - b.step)) {
            const stepConfusion = confusionEvents.filter(e => e.step === ss.step);
            steps.push({
              step: ss.step,
              what_i_see: '',
              what_im_thinking: '',
              action: '',
              confidence: 'medium',
              patience: 100,
              screenshot: `screenshots/${ss.file}`,
              evidence_for_acs: [],
              confusion_event: stepConfusion.length > 0 ? stepConfusion[0] : null
            });
          }
          tasks.push({
            task: taskDef.task || 'Primary task',
            covers_acs: taskDef.covers_acs || [],
            steps
          });
        }
      }

      personas[pid] = {
        name: displayName,
        tasks,
        ...getPersonaMetadata(pid)
      };
    }
  }

  // --- ac_list ---
  const acList = csvRows.map(r => ({
    id: r.criterion_id || '',
    text: r.criterion_text || '',
    verdict: (r.verdict || '').toUpperCase()
  }));

  // --- ac_to_steps ---
  const acToSteps = {};
  for (const ac of acList) {
    if (!ac.id) continue;
    const refs = [];

    for (const [pid, pData] of Object.entries(personas)) {
      for (let ti = 0; ti < pData.tasks.length; ti++) {
        const task = pData.tasks[ti];
        const hasStepLevelEvidence = task.steps.some(s => s.evidence_for_acs && s.evidence_for_acs.length > 0);

        if (hasStepLevelEvidence) {
          for (let si = 0; si < task.steps.length; si++) {
            if (task.steps[si].evidence_for_acs && task.steps[si].evidence_for_acs.includes(ac.id)) {
              refs.push({ persona: pid, task: ti, step: si });
            }
          }
        } else if (task.covers_acs && task.covers_acs.includes(ac.id)) {
          for (let si = 0; si < task.steps.length; si++) {
            refs.push({ persona: pid, task: ti, step: si });
          }
        }
      }
    }

    acToSteps[ac.id] = refs;
  }

  return { personas, ac_list: acList, ac_to_steps: acToSteps };
}

function parseThinkAloudSteps(thinkaloudRaw, screenshots, screenshotsDir, confusionEvents, consistencyReport) {
  const parsed = parseTaSteps(thinkaloudRaw);
  const steps = [];

  for (const p of parsed) {
    const stepNum = parseInt(p.num, 10);
    const ssEntry = screenshots.find(s => s.step === stepNum);
    const ssRef = ssEntry ? `screenshots/${ssEntry.file}` : '';
    const stepConfusion = confusionEvents.filter(e => e.step === stepNum);

    steps.push({
      step: stepNum,
      screenshot: ssRef,
      see: p.see.slice(0, 300),
      thinking: p.think.slice(0, 300),
      trying: (p.trying || '').slice(0, 200),
      confidence: p.confidence,
      patience: p.patience != null ? `${p.patience}%` : '',
      confusionEvents: stepConfusion,
      consistency: []
    });
  }
  return steps;
}

function buildCodeDeltasHtml() {
  const delta = normalizeDelta(readJsonOr(path.join(absArtifacts, 'mr-delta.json'), null));
  if (!delta) return '<p class="muted small">No MR delta data. Run with --workspace to enable code delta analysis.</p>';

  const protoId = extractPrototypeId();
  const mrNum = delta.mr_number || readKnownMRs()[protoId];
  const baseUrl = 'https://gitlab.cee.redhat.com/uxd/prototypes/rhoai/-/merge_requests';

  const workspaceDir = delta.workspace || path.join(absArtifacts, 'workspace');
  const canReadDiff = fs.existsSync(workspaceDir);

  function getFileDiff(filePath, maxLines) {
    if (!canReadDiff) return null;
    try {
      const diff = execSync(`git diff origin/3.5 HEAD -- "${filePath}" 2>/dev/null`, { cwd: workspaceDir, encoding: 'utf8', maxBuffer: 1024 * 100 });
      if (!diff) return null;
      const lines = diff.split('\n');
      return lines.slice(0, maxLines || 40).join('\n');
    } catch { return null; }
  }

  function renderDiffBlock(diff) {
    if (!diff) return '';
    let out = `<details><summary class="small muted">View diff</summary><div class="diff-block"><pre>`;
    for (const line of diff.split('\n')) {
      if (line.startsWith('@@')) {
        out += `<span class="diff-line diff-line-header">${escapeHtml(line)}</span>\n`;
      } else if (line.startsWith('+') && !line.startsWith('+++')) {
        out += `<span class="diff-line diff-line-add">${escapeHtml(line)}</span>\n`;
      } else if (line.startsWith('-') && !line.startsWith('---')) {
        out += `<span class="diff-line diff-line-del">${escapeHtml(line)}</span>\n`;
      } else if (/^(diff |index |---|[+]{3})/.test(line)) {
        // skip headers
      } else {
        out += `<span class="diff-line diff-line-context">${escapeHtml(line)}</span>\n`;
      }
    }
    out += `</pre></div></details>`;
    return out;
  }

  // Classify every file into a tier with metadata
  const newFiles = new Set(delta.new_files || []);
  const allFiles = [...(delta.new_files || []), ...(delta.modified_files || [])];
  const boilerplate = /\/(index|types|__tests__|\.test\.|\.spec\.|\.stories\.)(\.\w+)?$/;
  const rendered = new Set();

  function classify(f) {
    if (f.includes('AppLayout') || f.includes('Sidebar') || f.includes('Nav'))
      return { tier: 0, severity: 'critical', label: 'Navigation', reason: delta.nav_changes ? 'Sidebar nav updated' : 'Sidebar nav NOT updated — pages orphaned' };
    if (f.includes('routes'))
      return { tier: 1, severity: 'critical', label: 'Routing', reason: 'Route registration — controls which URLs exist' };
    if (f.includes('FeatureFlag'))
      return { tier: 2, severity: 'high', label: 'Feature Flags', reason: 'Controls runtime feature visibility' };
    if (f.match(/\/(pages|AIHub)\//) && !boilerplate.test(f) && newFiles.has(f))
      return { tier: 3, severity: 'medium', label: 'New Page', reason: null };
    if (f.match(/\/(pages|AIHub)\//) && !boilerplate.test(f))
      return { tier: 4, severity: 'low', label: 'Modified Page', reason: null };
    if (boilerplate.test(f))
      return { tier: 9, severity: 'skip', label: 'Boilerplate', reason: null };
    return { tier: 4, severity: 'low', label: 'Support', reason: null };
  }

  const classified = allFiles
    .map(f => ({ path: f, short: f.replace('src/app/', '').replace('src/', ''), isNew: newFiles.has(f), ...classify(f) }))
    .filter(f => f.severity !== 'skip')
    .sort((a, b) => a.tier - b.tier);

  // Deduplicate: group files from the same directory together
  const seen = new Set();
  const deduped = [];
  for (const f of classified) {
    const dir = f.path.replace(/\/[^/]+$/, '');
    const key = f.tier <= 2 ? f.path : dir;
    if (f.tier <= 2 || !seen.has(key)) {
      seen.add(key);
      deduped.push(f);
    }
  }

  let html = '';

  // Summary header
  const critCount = deduped.filter(f => f.severity === 'critical').length;
  const highCount = deduped.filter(f => f.severity === 'high').length;
  const newCount = (delta.new_files || []).filter(f => !boilerplate.test(f)).length;
  const modCount = (delta.modified_files || []).length;

  html += `<div class="delta-summary">`;
  html += `<div class="delta-summary-row">`;
  html += `<div class="delta-stat"><span class="delta-stat-n">${delta.total_files_changed || 0}</span><span class="delta-stat-l">Files</span></div>`;
  html += `<div class="delta-stat"><span class="delta-stat-n delta-added">${newCount}</span><span class="delta-stat-l">Added</span></div>`;
  html += `<div class="delta-stat"><span class="delta-stat-n delta-modified">${modCount}</span><span class="delta-stat-l">Modified</span></div>`;
  if (critCount) html += `<div class="delta-stat"><span class="delta-stat-n" style="color:var(--status-danger)">${critCount}</span><span class="delta-stat-l">Critical</span></div>`;
  html += `</div>`;
  html += `<p class="small muted" style="margin:0.5rem 0 0">Base: <code>${escapeHtml(delta.base_branch || '?')}</code>`;
  if (mrNum) html += ` · <a href="${baseUrl}/${mrNum}/diffs" target="_blank">View full diff (MR !${mrNum})</a>`;
  html += `</p>`;
  html += `</div>`;

  // Nav warning — prominent banner
  if (delta.nav_warning) {
    html += `<div class="delta-nav-warn"><strong>Navigation Gap</strong> ${escapeHtml(delta.nav_warning)}</div>`;
  }

  // Status indicators
  html += `<div class="delta-meta">`;
  html += `<span class="${delta.route_changes ? 'delta-added' : ''}">${delta.route_changes ? 'Yes' : 'No'} Routes</span>`;
  html += `<span class="${delta.nav_changes ? 'delta-added' : ''}" style="${!delta.nav_changes && delta.route_changes ? 'color:var(--danger-text)' : ''}">${delta.nav_changes ? 'Yes' : 'No'} Sidebar nav</span>`;
  html += `<span class="${delta.feature_flag_changes ? 'delta-modified' : ''}">${delta.feature_flag_changes ? 'Yes' : 'No'} Feature flags</span>`;
  html += `</div>`;

  // New routes
  if (delta.new_routes && delta.new_routes.length) {
    html += `<div class="delta-routes">`;
    for (const r of delta.new_routes) {
      html += `<code class="delta-route">${escapeHtml(r)}</code>`;
    }
    html += `</div>`;
  }

  // File list grouped by severity
  let currentSeverity = '';
  for (const f of deduped) {
    if (f.severity !== currentSeverity) {
      currentSeverity = f.severity;
      const heading = f.severity === 'critical' ? 'Critical — Score Impact'
        : f.severity === 'high' ? 'High — Runtime Impact'
        : f.severity === 'medium' ? 'New Feature Files'
        : 'Modified Support Files';
      html += `<h3 class="delta-group-heading">${heading}</h3>`;
    }

    const typeTag = f.isNew
      ? '<span class="delta-tag delta-tag-add">added</span>'
      : '<span class="delta-tag delta-tag-mod">modified</span>';
    const severityTag = f.severity === 'critical'
      ? '<span class="delta-tag delta-tag-critical">critical</span>'
      : f.severity === 'high'
      ? '<span class="delta-tag delta-tag-high">high</span>'
      : '';

    html += `<div class="delta-file-card delta-file-${f.severity}">`;
    html += `<div class="delta-file-head">`;
    html += `<code class="delta-file-name">${escapeHtml(f.short)}</code>`;
    html += `<span class="delta-tags">${typeTag}${severityTag}</span>`;
    html += `</div>`;

    if (f.reason) {
      const reasonClass = f.severity === 'critical' ? 'delta-file-reason-critical' : 'delta-file-reason';
      html += `<p class="${reasonClass}">${f.reason}</p>`;
    }

    // Score impact for critical files
    if (f.severity === 'critical') {
      let impact = '';
      if (f.path.includes('AppLayout') && !delta.nav_changes) {
        impact = 'Caps Workflow Continuity + Mental Model Fidelity at 1/3 for all personas';
      } else if (f.path.includes('routes') && !delta.nav_changes) {
        impact = 'Pages exist at URLs but unreachable without nav — nav-assisted only';
      } else if (f.path.includes('FeatureFlag')) {
        impact = 'May hide/show features depending on runtime flag state';
      }
      if (impact) {
        html += `<p class="delta-score-impact">${impact}</p>`;
      }
    }

    html += renderDiffBlock(getFileDiff(f.path, 40));
    html += `</div>`;
  }

  if (delta.summary) {
    html += `<p class="small muted mt1">${escapeHtml(delta.summary)}</p>`;
  }

  return html;
}

function buildHeroStatus(csvRows, passCount, failCount, flaggedCount, extractState, iterationLog) {
  const totalCount = passCount + failCount + flaggedCount;
  const passPercent = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0;

  const delta = normalizeDelta(readJsonOr(path.join(absArtifacts, 'mr-delta.json'), null));
  const filesChanged = delta ? (delta.total_files_changed || 0) : '—';
  const routeCount = delta && delta.new_routes ? delta.new_routes.length : 0;
  const iterCount = iterationLog && iterationLog.iterations ? iterationLog.iterations.length : 0;
  const totalFixed = iterationLog ? (iterationLog.total_criteria_fixed || 0) : 0;

  const hasProblems = failCount > 0 || flaggedCount > 0;
  const heroColor = hasProblems ? (failCount > 0 ? 'var(--status-danger)' : 'var(--status-warning)') : 'var(--status-success)';

  let html = '<section class="status-section">';

  html += `<div class="status-hero">`;
  html += `<div class="status-hero-value" style="color:${heroColor}">${passCount}/${totalCount}</div>`;
  html += '<div class="status-hero-label">acceptance criteria passing</div>';
  html += '<div class="status-bar">';
  html += `<div class="status-bar-fill" style="width:${passPercent}%;background:${heroColor}"></div>`;
  html += '</div>';

  const metaParts = [];
  if (filesChanged !== '—') {
    const evalAppliedFixes = totalFixed > 0;
    metaParts.push(`${filesChanged} ${evalAppliedFixes ? 'files changed' : 'files in branch'}`);
  }
  if (routeCount > 0) metaParts.push(`${routeCount} routes`);
  if (totalFixed > 0) metaParts.push(`${totalFixed} fix${totalFixed !== 1 ? 'es' : ''} applied`);
  else if (iterCount > 1) metaParts.push(`${iterCount} eval iterations`);
  if (metaParts.length) {
    html += `<div class="status-hero-meta">${metaParts.join(' · ')}</div>`;
  }

  // Inline problem callouts within the hero card
  if (failCount > 0) {
    const failItems = csvRows.filter(r => (r.verdict || '').toUpperCase() === 'FAIL');
    html += '<div class="status-hero-issues">';
    for (const f of failItems) {
      const acId = f.criterion_id || '?';
      const reason = (f.rationale || extractExpectedBehavior(f.criterion_text || '')).substring(0, 100);
      html += `<div class="status-hero-issue fail"><span class="status-hero-issue-icon">${SVG_ICON.timesCircle}</span> <strong>${escapeHtml(acId)}</strong> : ${escapeHtml(reason)}${reason.length >= 100 ? '...' : ''}</div>`;
    }
    html += '</div>';
  }
  if (flaggedCount > 0) {
    const flagItems = csvRows.filter(r => (r.verdict || '').toUpperCase() === 'FLAGGED');
    html += '<div class="status-hero-issues">';
    for (const f of flagItems) {
      const acId = f.criterion_id || '?';
      const action = (f.human_action || f.rationale || extractExpectedBehavior(f.criterion_text || '')).substring(0, 100);
      html += `<div class="status-hero-issue flag"><span class="status-hero-issue-icon">${SVG_ICON.warningSmall}</span> <strong>${escapeHtml(acId)}</strong> : ${escapeHtml(action)}${action.length >= 100 ? '...' : ''}</div>`;
    }
    html += '</div>';
  }
  html += '<div class="status-hero-legend" style="font-size:0.65rem;color:var(--text-secondary);margin-top:0.5rem;font-style:italic">AC = Acceptance Criteria (from Jira ticket)</div>';

  html += '</div>';

  // Action CTAs
  let primaryText, primaryAction;
  if (flaggedCount > 0) {
    primaryText = `Review ${flaggedCount} flagged item${flaggedCount !== 1 ? 's' : ''}`;
    primaryAction = "openReviewPanel()";
  } else if (failCount > 0) {
    primaryText = `View ${failCount} failure${failCount !== 1 ? 's' : ''}`;
    primaryAction = "scrollToSection('ac-results')";
  } else {
    primaryText = 'View conclusion';
    primaryAction = "scrollToSection('conclusion')";
  }

  html += '<div class="status-actions">';
  html += `<button class="status-cta-primary" onclick="${primaryAction}">${escapeHtml(primaryText)}</button>`;
  html += '<button class="status-cta-secondary" onclick="openEvidenceViewer()">View evidence</button>';
  html += '</div>';

  html += '</section>';
  return html;
}


function buildFlaggedDataArray(csvRows, journeyLog, screenshots) {
  const flagged = csvRows.filter(r => (r.verdict || '').toUpperCase() === 'FLAGGED');
  if (!flagged.length) return '[]';

  const journeys = journeyLog ? journeyLog.journeys || [] : [];
  const items = [];

  for (const item of flagged) {
    const acId = item.criterion_id || '';
    let screenshotSrc = '';
    for (const j of journeys) {
      if (j.ac_ids && j.ac_ids.includes(acId)) {
        const steps = j.steps || [];
        const lastStep = steps[steps.length - 1];
        if (lastStep && lastStep.screenshot) {
          const ssPath = path.join(absArtifacts, lastStep.screenshot);
          if (fs.existsSync(ssPath)) {
            screenshotSrc = `data:image/png;base64,${fs.readFileSync(ssPath).toString('base64')}`;
          }
          break;
        }
      }
    }

    items.push({
      id: acId,
      tier: item.tier || '',
      text: item.criterion_text || '',
      rationale: item.rationale || item.evidence || '',
      humanAction: item.human_action || '',
      screenshot: screenshotSrc
    });
  }

  return JSON.stringify(items);
}

function buildIterationTimelineHtml() {
  const iterLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
  if (!iterLog || !iterLog.iterations || !iterLog.iterations.length) return '';

  let html = '';

  for (let idx = 0; idx < iterLog.iterations.length; idx++) {
    const iter = iterLog.iterations[idx];
    const isFirst = idx === 0;
    const isLast = idx === iterLog.iterations.length - 1;
    const hasFails = iter.fail_count > 0;
    const cardClass = isLast ? 'iteration-card iteration-card-current' : 'iteration-card';

    html += `<div class="${cardClass}">`;
    html += `<div class="iter-card-header">`;
    html += `<div>`;
    if (isFirst && !isLast) {
      html += `<strong style="font-size:0.875rem">Original</strong>`;
      html += ` <span style="font-size:0.7rem;color:var(--text-secondary)">(MR baseline)</span>`;
    } else if (isLast && !isFirst) {
      html += `<strong style="font-size:0.875rem">Iteration ${iter.iteration - 1}</strong>`;
      html += ` <span style="font-size:0.7rem;color:var(--link)">(current)</span>`;
    } else if (isFirst && isLast) {
      html += `<strong style="font-size:0.875rem">Current</strong>`;
      html += ` <span style="font-size:0.7rem;color:var(--link)">(single run, no loop)</span>`;
    } else {
      html += `<strong style="font-size:0.875rem">Iteration ${iter.iteration - 1}</strong>`;
    }
    html += `<span class="iter-counts" style="margin-left:0.75rem">${iter.pass_count}P / ${iter.fail_count}F / ${iter.flagged_count}FL</span>`;
    if (iter.usability_score) {
      const iterScoreStr = String(iter.usability_score).replace(/\/\d+$/, '');
      html += `<span style="font-size:0.7rem;color:var(--text-secondary);margin-left:0.5rem">Usability: ${iterScoreStr}</span>`;
    }
    if (iter.iteration > 1) {
      const prev = iterLog.iterations[iter.iteration - 2];
      if (prev) {
        const delta = iter.pass_count - prev.pass_count;
        if (delta > 0) html += `<span class="iter-delta iter-delta-up">+${delta} fixed</span>`;
        else if (delta < 0) html += `<span class="iter-delta iter-delta-down">${delta} regressed</span>`;
      }
    }
    html += `</div>`;
    html += `</div>`;

    // Fail summary for non-final iterations
    if (hasFails && iter.details) {
      let failIds = [];
      if (Array.isArray(iter.details.fail_criteria)) {
        failIds = iter.details.fail_criteria;
      } else if (typeof iter.details === 'object') {
        failIds = Object.entries(iter.details)
          .filter(([, v]) => String(v).toUpperCase().startsWith('FAIL'))
          .map(([k]) => k);
      }
      if (failIds.length) {
        html += `<div class="iter-fail-summary">`;
        html += `<strong style="font-size:0.7rem;color:var(--status-danger)">FAILED:</strong> `;
        html += escapeHtml(failIds.join(', '));
        html += `</div>`;
      }
    }

    // Changes applied (for iterations after the first)
    const fixes = iter.changes_applied || iter.fixes_applied;
    if (fixes && fixes.length) {
      html += `<div class="iter-fixes-list">`;
      html += `<span style="font-size:0.7rem;font-weight:700;color:var(--status-success)">FIXED:</span>`;
      html += `<table style="margin:0.3rem 0 0;width:100%;font-size:0.8rem;border-collapse:collapse">`;
      for (const change of fixes) {
        const criterion = change.criterion || '';
        const file = change.file ? change.file.split('/').pop() : '';
        const desc = change.change || change.description || '';
        html += `<tr style="border-bottom:1px solid var(--border)">`;
        html += `<td style="padding:0.25rem 0.5rem 0.25rem 0;width:5rem;vertical-align:top">`;
        if (criterion) html += `<code style="font-size:0.7rem;color:var(--link);font-weight:700">${escapeHtml(criterion)}</code>`;
        html += `</td>`;
        html += `<td style="padding:0.25rem 0;font-size:0.8rem;color:var(--text)">${escapeHtml(desc.slice(0, 100))}${desc.length > 100 ? '...' : ''}</td>`;
        html += `<td style="padding:0.25rem 0 0.25rem 0.5rem;text-align:right;vertical-align:top"><code style="font-size:0.65rem;color:var(--text-secondary)">${escapeHtml(file)}</code></td>`;
        html += `</tr>`;
      }
      html += `</table></div>`;
    }

    // Root cause (before state — why things failed)
    if (iter.root_cause) {
      html += `<div style="margin-top:0.5rem;font-size:0.75rem;padding:0.5rem 0.75rem;background:rgba(201,25,11,0.04);border-radius:0.25rem">`;
      html += `<strong style="font-size:0.65rem;color:var(--status-danger)">ROOT CAUSE:</strong> `;
      html += `<span style="color:var(--text)">${escapeHtml(iter.root_cause)}</span>`;
      html += `</div>`;
    }

    // Flagged resolution (items determined unfixable in prototype scope)
    if (iter.flagged_resolution && Object.keys(iter.flagged_resolution).length) {
      html += `<div style="margin-top:0.5rem;font-size:0.75rem;padding:0.5rem 0.75rem;background:rgba(240,171,0,0.04);border-radius:0.25rem">`;
      html += `<strong style="font-size:0.65rem;color:var(--status-warning)">UNFIXABLE (out of scope):</strong>`;
      html += `<ul style="margin:0.25rem 0 0 1rem;padding:0;font-size:0.75rem;color:var(--text-secondary)">`;
      for (const [id, info] of Object.entries(iter.flagged_resolution)) {
        const reason = typeof info === 'string' ? info : (info.reason || '');
        html += `<li><code>${escapeHtml(id)}</code> — ${escapeHtml(reason)}</li>`;
      }
      html += `</ul></div>`;
    }

    // Verification (before/after)
    if (iter.verification) {
      html += `<div style="margin-top:0.5rem;font-size:0.75rem;padding:0.5rem 0.75rem;background:rgba(62,134,53,0.04);border-radius:0.25rem">`;
      for (const [key, val] of Object.entries(iter.verification)) {
        const label = key.replace(/_/g, ' ');
        html += `<div style="margin:0.15rem 0"><strong>${escapeHtml(label)}:</strong> ${escapeHtml(val)}</div>`;
      }
      html += `</div>`;
    }

    html += `</div>`;
  }

  // Loop summary
  const exitSuccess = iterLog.exit_reason === 'all_pass' || iterLog.exit_reason === 'all_fixable_pass' || iterLog.exit_reason === 'unfixable_flagged' || iterLog.exit_reason === 'all_fixable_resolved';
  const exitBg = exitSuccess ? 'rgba(62,134,53,0.04)' : 'var(--bg-secondary)';

  html += `<div style="margin-top:0.75rem;padding:0.75rem 1rem;background:${exitBg};border-radius:0.25rem;border:1px solid var(--border)">`;
  html += `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.35rem">`;
  html += `<span style="color:${exitSuccess ? 'var(--status-success)' : 'var(--text-secondary)'};font-size:1rem">${exitSuccess ? '&#x2713;' : '&#x25CF;'}</span>`;
  html += `<strong style="font-size:0.85rem">Loop complete</strong>`;
  html += `</div>`;

  // Summary of what was accomplished
  const totalFixes = iterLog.total_criteria_fixed || 0;
  const lastIter = iterLog.iterations[iterLog.iterations.length - 1];
  const firstIter = iterLog.iterations[0];
  html += `<p style="font-size:0.8rem;color:var(--text);margin:0 0 0.35rem">`;
  html += `<strong>${firstIter.pass_count}P → ${lastIter.pass_count}P</strong> over ${iterLog.iterations.length} iterations. `;
  if (totalFixes > 0) html += `${totalFixes} criteria fixed. `;
  html += `${lastIter.flagged_count || 0} items remain for human review.`;
  const firstUsab = firstIter.usability_score;
  const lastUsab = lastIter.usability_score;
  if (firstUsab && lastUsab && firstUsab !== lastUsab) {
    const fStr = String(firstUsab).replace(/\/\d+$/, '');
    const lStr = String(lastUsab).replace(/\/\d+$/, '');
    html += ` Usability: ${fStr} → ${lStr}.`;
  }
  html += `</p>`;

  // Exit reason detail
  html += `<p style="font-size:0.75rem;color:var(--text-secondary);margin:0 0 0.35rem">${escapeHtml(iterLog.exit_details || iterLog.exit_detail || iterLog.exit_reason)}</p>`;

  // Files changed
  if (iterLog.files_modified && iterLog.files_modified.length) {
    html += `<details style="margin:0.35rem 0 0"><summary style="font-size:0.7rem;color:var(--text-secondary);cursor:pointer">Files changed (${iterLog.files_modified.length})</summary>`;
    html += `<ul style="margin:0.25rem 0 0 1rem;font-size:0.7rem;color:var(--text-secondary)">`;
    for (const f of iterLog.files_modified) {
      html += `<li><code>${escapeHtml(f)}</code></li>`;
    }
    html += `</ul></details>`;
  }

  html += `</div>`;

  return html;
}


function buildBaselineComparison() {
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  const appliedFixes = fixLog ? (Array.isArray(fixLog) ? fixLog : fixLog.applied || []) : [];
  if (appliedFixes.length === 0) return '';

  const beforePath = path.join(absArtifacts, 'screenshots', 'baseline-before.png');
  const afterPath = path.join(absArtifacts, 'screenshots', 'baseline-after.png');
  if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) return '';
  const beforeB64 = fs.readFileSync(beforePath).toString('base64');
  const afterB64 = fs.readFileSync(afterPath).toString('base64');
  let html = `<div style="margin-bottom:1rem;padding:0.75rem;background:var(--bg-secondary);border-radius:0.5rem">`;
  html += `<strong class="small" style="color:var(--text);display:block;margin-bottom:0.5rem">Before / After Comparison</strong>`;
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:0.75rem">`;
  html += `<div style="text-align:center"><span class="small muted" style="display:block;margin-bottom:0.25rem">Before (pre-evaluation)</span><img src="data:image/png;base64,${beforeB64}" style="width:100%;border-radius:0.375rem;border:1px solid var(--border);cursor:pointer" onclick="openImageLightbox(this.src)"></div>`;
  html += `<div style="text-align:center"><span class="small muted" style="display:block;margin-bottom:0.25rem">After (post-evaluation)</span><img src="data:image/png;base64,${afterB64}" style="width:100%;border-radius:0.375rem;border:1px solid var(--border);cursor:pointer" onclick="openImageLightbox(this.src)"></div>`;
  html += `</div></div>`;
  return html;
}

function buildFixesAppliedHtml() {
  const suggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), []);
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);
  const fixLogEntries = fixLog ? (Array.isArray(fixLog) ? fixLog : fixLog.applied || []) : [];

  const allItems = Array.isArray(suggestions) && suggestions.length > 0
    ? suggestions
    : fixLogEntries;

  if (!allItems.length) {
    const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
    const hasFlagged = csvRaw.includes(',FLAGGED,');
    const hasFail = csvRaw.includes(',FAIL,');
    if (hasFlagged && !hasFail) {
      const flaggedCount = (csvRaw.match(/,FLAGGED,/g) || []).length;
      return `<p class="muted small">No automated fixes needed. ${flaggedCount} ${flaggedCount !== 1 ? 'criteria' : 'criterion'} flagged for human review.</p>`;
    } else if (hasFail) {
      return '<p class="muted small">Fix loop was not triggered. Some criteria still failing — review refinement suggestions.</p>';
    }
    return '<p class="muted small">All acceptance criteria passed without modification.</p>' + buildBaselineComparison();
  }

  const applied = allItems.filter(s => s.applied === true);
  const needsReview = allItems.filter(s => s.applied !== true);

  let html = buildBaselineComparison();

  if (applied.length > 0) {
    html += `<h4 style="margin:0 0 0.75rem;color:var(--status-success)">Fixed automatically (${applied.length})</h4>`;
    html += `<div style="display:flex;flex-direction:column;gap:0.75rem;margin-bottom:1.5rem">`;
    for (const fix of applied) {
      html += renderFixCard(fix, journeyLog, 'applied');
    }
    html += `</div>`;
  }

  if (needsReview.length > 0) {
    html += `<h4 style="margin:0 0 0.75rem;color:var(--status-warning)">Needs your review (${needsReview.length})</h4>`;
    html += `<div style="display:flex;flex-direction:column;gap:0.75rem">`;
    for (const item of needsReview) {
      html += renderFixCard(item, journeyLog, 'review');
    }
    html += `</div>`;
  }

  return html;
}

function renderFixCard(fix, journeyLog, mode) {
  const isApplied = mode === 'applied';
  const acId = fix.criterion_id || fix.ac_id || fix.guideline_id || '';
  const iteration = fix.applied_in_iteration || fix.iteration || null;
  const description = fix.description || fix.fix || fix.rationale || fix.change || fix.fix_action || '';
  const file = fix.file || fix.fix_file || '';
  const type = fix.type || 'unknown';
  const confidence = fix.confidence || '';

  const borderColor = isApplied ? 'var(--status-success)' : 'var(--status-warning)';
  const typeBadge = type === 'consistency'
    ? '<span class="badge" style="background:rgba(99,102,241,0.1);color:#6366f1;font-size:0.6rem">consistency</span>'
    : type === 'ac_failure'
      ? '<span class="badge badge-fail" style="font-size:0.75rem">AC Failure</span>'
      : type === 'ac_flagged'
        ? '<span class="badge badge-flagged" style="font-size:0.75rem">Flagged</span>'
        : '';

  let html = `<div class="card">`;

  if (acId) {
    const jIdx = findJourneyForAC(journeyLog, acId);
    const journeyTitle = (jIdx && journeyLog && journeyLog.journeys && journeyLog.journeys[jIdx - 1])
      ? journeyLog.journeys[jIdx - 1].title : '';
    html += `<div style="margin-bottom:0.5rem;display:flex;align-items:center;gap:0.5rem;flex-wrap:wrap">`;
    html += `<span style="color:var(--link);font-family:var(--font-mono);font-weight:700;font-size:0.875rem">${escapeHtml(acId)}</span>`;
    if (journeyTitle) html += `<span class="small muted">— ${escapeHtml(journeyTitle)}</span>`;
    html += typeBadge;
    if (isApplied && iteration) {
      html += `<span class="badge badge-pass" style="font-size:0.6rem">Fixed in iteration ${iteration}</span>`;
    }
    if (!isApplied && confidence) {
      html += `<span class="small muted">(confidence: ${escapeHtml(confidence)})</span>`;
    }
    html += `</div>`;
  }

  if (description) {
    html += `<p style="margin:0 0 0.5rem;font-size:0.875rem;line-height:1.5">${escapeHtml(description)}</p>`;
  }

  if (fix.criterion_text) {
    html += `<p class="small muted" style="margin:0 0 0.5rem"><strong>Criterion:</strong> ${escapeHtml(fix.criterion_text)}</p>`;
  }

  if (file) {
    html += `<code class="small" style="display:block;color:var(--link)">${escapeHtml(file)}${fix.line ? ':' + fix.line : ''}</code>`;
  }

  if (fix.pf_doc_url) {
    html += `<a href="${escapeHtml(fix.pf_doc_url)}" target="_blank" class="small" style="display:block;margin-top:0.25rem">PatternFly docs</a>`;
  }

  html += `</div>`;
  return html;
}


function findJourneyForAC(journeyLog, acId) {
  if (!journeyLog || !journeyLog.journeys) return null;
  for (let i = 0; i < journeyLog.journeys.length; i++) {
    const j = journeyLog.journeys[i];
    if (j.ac_ids && j.ac_ids.includes(acId)) return i + 1;
  }
  return null;
}


function buildSmartComplianceTab(reason) {
  let html = '';

  html += `<div class="card card-flat" style="margin:0 0 1.5rem">`;
  html += `<p style="font-weight:700;margin:0 0 0.25rem;color:var(--status-warning)">Automated Compliance Check Not Available</p>`;
  html += `<p class="small" style="margin:0">${escapeHtml(reason || 'consistency-checker not bootstrapped')}</p>`;
  html += `<p class="small muted" style="margin:0.5rem 0 0">To enable automated checks: set <code>CONSISTENCY_CHECKER_REPO</code> to a git URL containing <code>guidelines/</code> and <code>scripts/</code>, then run <code>bootstrap-consistency-checker.sh</code>.</p>`;
  html += `</div>`;

  const componentMap = readJsonOr(path.join(absArtifacts, 'component-map.json'), null);
  const journeyLog = readJsonOr(path.join(absArtifacts, 'journey-log.json'), null);

  html += `<h3 style="font-size:0.875rem;margin:1.25rem 0 0.35rem">Checks performed when enabled</h3>`;
  html += `<ul class="small muted" style="margin:0 0 1rem;padding-left:1.25rem;line-height:1.8">`;
  html += `<li>Hardcoded color values vs <code>--pf-t-*</code> design tokens</li>`;
  html += `<li>Custom spacing vs PatternFly spacing tokens</li>`;
  html += `<li>Icon imports, sizing, and accessibility labels</li>`;
  html += `<li>Deprecated PF class names and incorrect component nesting</li>`;
  html += `<li>Missing aria attributes, roles, and focus management</li>`;
  html += `<li>Typography vs PF type scale</li>`;
  html += `</ul>`;

  if (componentMap && componentMap.components && componentMap.components.length > 0) {
    html += `<h3 style="font-size:0.9375rem;margin:1.5rem 0 0.5rem">Detected PatternFly Components</h3>`;
    html += `<p class="small muted" style="margin:0 0 0.75rem">These PF components were identified in the prototype and would be checked for guideline compliance:</p>`;
    html += `<div style="display:flex;flex-wrap:wrap;gap:0.35rem;margin-bottom:1rem">`;
    const seen = new Set();
    for (const c of componentMap.components) {
      const name = c.component || c.name || c;
      if (seen.has(name)) continue;
      seen.add(name);
      html += `<span class="badge" style="background:rgba(0,102,204,0.08);color:var(--link);font-size:0.7rem;padding:0.2rem 0.5rem">${escapeHtml(String(name))}</span>`;
    }
    html += `</div>`;
  }

  if (journeyLog && journeyLog.journeys) {
    const screenshotCount = new Set();
    for (const j of journeyLog.journeys) {
      if (j.screenshots) j.screenshots.forEach(s => screenshotCount.add(s));
    }
    if (screenshotCount.size > 0) {
      html += `<div class="card card-compact" style="margin:1rem 0">`;
      html += `<p class="small" style="margin:0"><strong>${screenshotCount.size} screenshots captured</strong> during persona walkthroughs. `;
      html += `When enabled, the visual mode compares these against PF layout guidelines, spacing, and color usage.</p>`;
      html += `</div>`;
    }
  }

  return html;
}

function buildChangesTabHtml() {
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  const iterLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
  const evalState = readJsonOr(path.join(absArtifacts, 'eval-state.yaml'), null) ||
    (() => { const raw = readFileOr(path.join(absArtifacts, 'eval-state.yaml'), ''); const o = {}; raw.split('\n').forEach(l => { const m = l.match(/^(\w+):\s*(.+)/); if (m) o[m[1]] = m[2]; }); return o; })();
  const suggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), null);

  const applied = fixLog ? (Array.isArray(fixLog) ? fixLog.filter(f => f.applied !== false).length : (fixLog.applied ? fixLog.applied.length : 0)) : 0;
  const iters = iterLog && iterLog.iterations ? iterLog.iterations.length : 0;
  const exitReason = evalState.exit_reason || '';
  const isNoFix = exitReason === 'no_fix' || exitReason === 'no-fix';

  let html = '';

  if (isNoFix && !applied) {
    html += `<h2>Changes</h2>`;
    html += `<p class="small muted" style="margin:-0.5rem 0 1rem">This was a <strong>no-fix evaluation</strong> — the evaluator assessed the prototype as-is without applying changes.</p>`;

    html += `<div class="card" style="margin-bottom:1.5rem">`;
    html += `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.5rem">`;
    html += `<svg width="20" height="20" viewBox="0 0 512 512" fill="var(--link)"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM216 336h24V272H216c-13.3 0-24-10.7-24-24s10.7-24 24-24h48c13.3 0 24 10.7 24 24v88h8c13.3 0 24 10.7 24 24s-10.7 24-24 24H216c-13.3 0-24-10.7-24-24s10.7-24 24-24zm40-208a32 32 0 1 1 0 64 32 32 0 1 1 0-64z"/></svg>`;
    html += `<span style="font-weight:700;font-size:0.9375rem">Assessment-Only Mode</span>`;
    html += `</div>`;
    html += `<p class="small" style="margin:0">The evaluation ran with <code>--no-fix</code>: acceptance criteria were checked and usability walkthroughs were conducted, but no code modifications were made. `;
    html += `This mode is useful for baselining a prototype before iterative fixes, or for evaluating work-in-progress without altering the codebase.</p>`;
    html += `</div>`;

    if (Array.isArray(suggestions) && suggestions.length > 0) {
      html += `<h3 style="font-size:0.9375rem;margin:1.5rem 0 0.5rem">Suggested Fixes</h3>`;
      html += `<p class="small muted" style="margin:0 0 0.75rem">The evaluator identified ${suggestions.length} potential improvement${suggestions.length !== 1 ? 's' : ''} that could be applied in a fix run:</p>`;
      for (const s of suggestions) {
        const acId = s.ac_id || s.criterion_id || '';
        const desc = s.description || s.suggestion || s.fix || '';
        const sev = s.severity || s.priority || 'medium';
        const sevColor = sev === 'critical' || sev === 'high' ? 'var(--status-danger)' : sev === 'medium' ? 'var(--status-warning)' : 'var(--text-secondary)';
        html += `<div class="card card-compact" style="margin:0.4rem 0">`;
        if (acId) html += `<span class="badge badge-fail" style="margin-bottom:0.25rem;display:inline-block">${escapeHtml(acId)}</span> `;
        html += `<span class="small">${escapeHtml(desc)}</span>`;
        html += `</div>`;
      }
    }

    const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
    const failCount = (csvRaw.match(/,FAIL,/gi) || []).length;
    const passCount = (csvRaw.match(/,PASS,/gi) || []).length;
    if (failCount > 0) {
      html += `<div class="card card-compact" style="margin:1.5rem 0;background:rgba(201,25,11,0.04)">`;
      html += `<p class="small" style="margin:0"><strong>${failCount} criteria failed</strong> and ${passCount} passed. `;
      html += `Re-run without <code>--no-fix</code> to let the evaluator attempt automated fixes for the failing criteria.</p>`;
      html += `</div>`;
    }

    return html;
  }

  html += `<h2>Changes</h2>`;
  html += `<p class="small muted" style="margin:-0.5rem 0 1rem">What the evaluator changed during the fix loop.</p>`;
  html += buildFixHistoryNarrative();
  html += `<div id="findings-fixed" style="margin-bottom:1.5rem">`;
  html += buildFixesAppliedHtml();
  html += `</div>`;
  return html;
}

function buildConsistencyHtml() {
  const report = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);
  if (!report) return buildSmartComplianceTab();

  if (report.skipped) {
    return buildSmartComplianceTab(report.reason);
  }

  const summary = report.summary || {};
  const srcMode = report.source_mode;
  const violations = (srcMode && Array.isArray(srcMode.violations) && srcMode.violations.length > 0)
    ? srcMode.violations
    : (Array.isArray(report.findings) ? report.findings : []);
  let html = '';

  // Summary stats
  html += `<div class="consistency-summary">`;
  html += `<div class="consistency-stat"><span class="consistency-stat-n">${summary.total_guidelines_checked || 0}</span><span class="consistency-stat-l">Checked</span></div>`;
  if (summary.violations) html += `<div class="consistency-stat"><span class="consistency-stat-n" style="color:var(--status-danger)">${summary.violations}</span><span class="consistency-stat-l">Errors</span></div>`;
  if (summary.warnings) html += `<div class="consistency-stat"><span class="consistency-stat-n" style="color:var(--status-warning)">${summary.warnings}</span><span class="consistency-stat-l">Warnings</span></div>`;
  html += `<div class="consistency-stat"><span class="consistency-stat-n" style="color:var(--status-success)">${summary.passes || 0}</span><span class="consistency-stat-l">Passes</span></div>`;
  html += `</div>`;

  if (!violations.length) {
    html += `<p class="muted small">No violations found in MR-scoped files.</p>`;
    return html;
  }

  // ---- Quick Fixes (ranked by impact) ----
  const byGuideline = {};
  for (const v of violations) {
    const k = v.guideline_id;
    if (!byGuideline[k]) byGuideline[k] = { ...v, count: 0, files: new Set() };
    byGuideline[k].count++;
    byGuideline[k].files.add(v.file);
  }

  const quickFixes = Object.values(byGuideline)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  html += `<h3>Quick Fixes</h3>`;
  html += `<p class="small muted" style="margin:-0.25rem 0 0.5rem">Ranked by number of violations eliminated</p>`;

  for (const qf of quickFixes) {
    const sevTag = qf.severity === 'error'
      ? '<span class="delta-tag delta-tag-critical">error</span>'
      : '<span class="delta-tag delta-tag-high">warning</span>';

    html += `<div class="consistency-finding consistency-finding-${qf.severity === 'error' ? 'error' : 'warning'}">`;
    html += `<div class="consistency-finding-head">`;
    html += `<strong style="font-size:0.8125rem">${escapeHtml(qf.guideline_title)}</strong>`;
    html += `<span class="delta-tags">${sevTag}<span class="delta-tag delta-tag-mod">${qf.count} hits</span></span>`;
    html += `</div>`;
    if (qf.suggestion) {
      html += `<p class="consistency-suggestion">${escapeHtml(qf.suggestion)}`;
      if (qf.pf_doc_url) html += ` <a href="${escapeHtml(qf.pf_doc_url)}" target="_blank" style="font-size:0.7rem;margin-left:0.3rem">PatternFly docs &rarr;</a>`;
      html += `</p>`;
    }
    html += `<p class="consistency-guideline">${qf.files.size} file${qf.files.size > 1 ? 's' : ''}: ${[...qf.files].slice(0, 3).map(f => '<code>' + escapeHtml(f.replace('src/app/', '').replace('src/', '')) + '</code>').join(', ')}${qf.files.size > 3 ? ' +' + (qf.files.size - 3) + ' more' : ''}</p>`;
    html += `</div>`;
  }

  // ---- By Page/Component ----
  const byPage = {};
  for (const v of violations) {
    const dir = (v.file || '').replace(/\/[^/]+$/, '').replace('src/app/', '').replace('src/', '');
    const page = dir || 'root';
    if (!byPage[page]) byPage[page] = [];
    byPage[page].push(v);
  }

  const pages = Object.entries(byPage).sort((a, b) => b[1].length - a[1].length);

  html += `<h3 style="margin-top:1.5rem">By Page</h3>`;
  html += `<p class="small muted" style="margin:-0.25rem 0 0.5rem">Violations grouped by component area</p>`;

  for (const [page, pvs] of pages) {
    const errorCount = pvs.filter(v => v.severity === 'error').length;
    const warnCount = pvs.filter(v => v.severity === 'warning').length;
    const label = page.replace(/\//g, ' / ');
    const badge = errorCount
      ? `<span class="delta-tag delta-tag-critical">${errorCount} error${errorCount > 1 ? 's' : ''}</span>`
      : '';
    const warnBadge = warnCount
      ? `<span class="delta-tag delta-tag-high">${warnCount} warn</span>`
      : '';

    html += `<details><summary style="font-size:0.8125rem;font-weight:400;padding:0.4rem 0"><code>${escapeHtml(label)}</code> ${badge}${warnBadge}</summary>`;

    // Deduplicate by guideline within this page
    const seen = new Set();
    for (const v of pvs) {
      const k = v.guideline_id;
      if (seen.has(k)) continue;
      seen.add(k);

      const sameGuideline = pvs.filter(x => x.guideline_id === k);
      const sevCls = v.severity === 'error' ? 'consistency-finding-error' : 'consistency-finding-warning';

      html += `<div class="consistency-finding ${sevCls}" style="margin-left:0.5rem">`;
      html += `<div class="consistency-finding-head">`;
      html += `<span style="font-size:0.75rem;font-weight:400">${escapeHtml(v.guideline_title)}</span>`;
      html += `<span class="delta-tags"><span class="delta-tag delta-tag-mod">${sameGuideline.length} hit${sameGuideline.length > 1 ? 's' : ''}</span></span>`;
      html += `</div>`;
      if (v.suggestion) {
        html += `<p class="consistency-suggestion">${escapeHtml(v.suggestion)}`;
        if (v.pf_doc_url) html += ` <a href="${escapeHtml(v.pf_doc_url)}" target="_blank" style="font-size:0.7rem;margin-left:0.3rem">docs &rarr;</a>`;
        html += `</p>`;
      }
      // Show specific lines
      html += `<div class="consistency-files">`;
      for (const sv of sameGuideline.slice(0, 5)) {
        const short = (sv.file || '').replace('src/app/', '').replace('src/', '');
        html += `<div class="consistency-file-row"><code>${escapeHtml(short)}:${sv.line || '?'}</code></div>`;
      }
      if (sameGuideline.length > 5) html += `<div class="consistency-file-row muted">+${sameGuideline.length - 5} more</div>`;
      html += `</div>`;
      html += `</div>`;
    }

    html += `</details>`;
  }

  return html;
}




// ---------------------------------------------------------------------------
// Narrative builders for appendix tabs
// ---------------------------------------------------------------------------

function buildFixHistoryNarrative() {
  const fixLog = readJsonOr(path.join(absArtifacts, 'fix-log.json'), null);
  const iterLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
  const applied = fixLog ? (Array.isArray(fixLog) ? fixLog.filter(f => f.applied !== false).length : (fixLog.applied ? fixLog.applied.length : 0)) : 0;
  const iters = iterLog && iterLog.iterations ? iterLog.iterations.length : 0;
  if (!applied && !iters) return '';
  if (!applied) {
    const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
    const flaggedCount = (csvRaw.match(/,FLAGGED,/g) || []).length;
    if (flaggedCount > 0) {
      return `<p class="appendix-narrative">No code changes were applied. ${flaggedCount} ${flaggedCount !== 1 ? 'criteria require' : 'criterion requires'} human review.</p>`;
    }
    return `<p class="appendix-narrative">All acceptance criteria passed on first evaluation — no fix loop needed.</p>`;
  }
  return `<p class="appendix-narrative">The evaluator applied ${applied} fix${applied !== 1 ? 'es' : ''} across ${iters} iteration${iters !== 1 ? 's' : ''}.</p>`;
}

function buildComplianceNarrative() {
  const cr = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);
  if (!cr || cr.skipped) {
    return `<p class="appendix-narrative">Automated compliance checks are not yet configured for this prototype. The section below describes what would be checked and shows detected PF components.</p>`;
  }
  const violations = (cr.source_mode && cr.source_mode.violations) ? cr.source_mode.violations.length : 0;
  const checked = (cr.summary && cr.summary.total_guidelines_checked) ? cr.summary.total_guidelines_checked : 0;
  if (!violations) return `<p class="appendix-narrative">All ${checked} PatternFly guidelines checked — no violations found.</p>`;
  return `<p class="appendix-narrative">${violations} PatternFly guideline violation${violations !== 1 ? 's' : ''} found across ${checked} guidelines checked.</p>`;
}

// ---------------------------------------------------------------------------
// Tabbed Executive Summary (replaces old narrative summary)
// ---------------------------------------------------------------------------

function buildTabbedExecSummary() {
  const extractState = readJsonOr(path.join(absArtifacts, 'extract-state.json'), null);
  const mrDelta = normalizeDelta(readJsonOr(path.join(absArtifacts, 'mr-delta.json'), null));
  const iterationLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
  const outcomeContext = readJsonOr(path.join(absArtifacts, 'outcome-context.json'), null);
  const protoId = extractPrototypeId();

  const key = (extractState && extractState.key) || protoId;
  const isUsefulTitle = (v) => v && v !== 'eval' && v !== protoId && v.length > 3;
  const title = (extractState && (
    (isUsefulTitle(extractState.ticket_summary) && extractState.ticket_summary) ||
    (isUsefulTitle(extractState.title) && extractState.title) ||
    (isUsefulTitle(extractState.story_title) && extractState.story_title)
  )) || key;
  const acCount = (extractState && Array.isArray(extractState.ac_list)) ? extractState.ac_list.length : 0;
  const rfeKey = extractState ? extractState.rfe_key : null;
  const breadcrumb = (extractState && extractState.breadcrumb) || '';

  // --- Pipeline config (best-effort read) ---
  let pipelineConfig = null;
  const configPath = path.join(absArtifacts, 'pipeline-config.yaml');
  if (fs.existsSync(configPath)) {
    try {
      const raw = fs.readFileSync(configPath, 'utf8');
      pipelineConfig = {};
      for (const line of raw.split('\n')) {
        const m = line.match(/^(\w+):\s*(.+)/);
        if (m) pipelineConfig[m[1]] = m[2].trim();
      }
    } catch { /* ignore */ }
  }

  // === Build tab content panels ===
  const featureCtx = extractState && extractState.feature_context;

  // Tab 1: Overview (always shown)
  let overviewContent = '';
  if (featureCtx) {
    if (featureCtx.problem_statement) {
      let probText = featureCtx.problem_statement;
      const numberedMatch = probText.match(/^(.*?)\n\n(\d+\.\s)/s);
      if (numberedMatch) {
        const intro = numberedMatch[1].trim();
        const listPart = probText.slice(numberedMatch.index + numberedMatch[1].length).trim();
        const items = listPart.split(/\n?\d+\.\s+/).filter(Boolean);
        let probHtml = `<div class="exec-detail exec-problem"><strong>Problem:</strong> ${renderInlineMarkdown(escapeHtml(intro))}`;
        probHtml += `<ul style="margin:0.4rem 0 0 1rem;padding:0;line-height:1.5;font-size:0.8125rem">`;
        for (const item of items) probHtml += `<li style="margin-bottom:0.2rem">${renderInlineMarkdown(escapeHtml(item.trim()))}</li>`;
        probHtml += `</ul></div>`;
        overviewContent += probHtml;
      } else {
        overviewContent += `<div class="exec-detail exec-problem"><strong>Problem:</strong> ${renderInlineMarkdown(escapeHtml(probText))}</div>`;
      }
    }
    if (featureCtx.background) {
      const bgText = featureCtx.background;
      const bgItems = bgText.split(/\s*\*\s+/).filter(Boolean);
      if (bgItems.length > 1) {
        overviewContent += `<div class="exec-detail small" style="margin-top:0.5rem"><p style="margin:0 0 0.25rem;color:var(--text-secondary);font-weight:700">Background</p>`;
        overviewContent += `<ul style="margin:0;padding-left:1.25rem;color:var(--text-secondary);line-height:1.6;font-size:0.8125rem">`;
        for (const item of bgItems) overviewContent += `<li style="margin-bottom:0.2rem">${escapeHtml(item.trim())}</li>`;
        overviewContent += `</ul></div>`;
      } else {
        overviewContent += `<div class="exec-detail small" style="margin-top:0.5rem"><p style="margin:0;color:var(--text-secondary);line-height:1.6"><strong>Background:</strong> ${escapeHtml(bgText)}</p></div>`;
      }
    }
  } else if (outcomeContext && outcomeContext.problem_statement) {
    overviewContent += `<div class="exec-detail exec-problem">${escapeHtml(outcomeContext.problem_statement)}</div>`;
  }
  if (iterationLog) {
    const iters = (iterationLog.iterations || []).length;
    const exitReason = iterationLog.exit_reason || 'pending';
    overviewContent += `<ul class="exec-meta-list" style="margin:0.75rem 0 0 1rem;padding:0;list-style:disc;font-size:0.8125rem;color:var(--text-secondary);line-height:1.7;border-top:1px solid var(--border);padding-top:0.5rem">`;
    overviewContent += `<li><strong>${iters}</strong> iteration${iters !== 1 ? 's' : ''}</li>`;
    overviewContent += `<li>Exit: <strong>${escapeHtml(exitReason.replace(/_/g, ' '))}</strong></li>`;
    if (mrDelta) {
      const fixesApplied = iterationLog && (iterationLog.total_criteria_fixed || 0) > 0;
      const fileLabel = fixesApplied ? 'files changed' : 'files in branch';
      overviewContent += `<li><strong>${mrDelta.total_files_changed || 0}</strong> ${fileLabel}</li>`;
    }
    overviewContent += `</ul>`;
  }

  // Tab 2: User Stories (hidden if empty)
  let storiesContent = '';
  const hasStories = featureCtx && Array.isArray(featureCtx.user_stories) && featureCtx.user_stories.length > 0;
  if (hasStories) {
    storiesContent += `<ul style="margin:0.25rem 0 0 1rem;padding:0;line-height:1.6;font-size:0.875rem">`;
    for (const story of featureCtx.user_stories) {
      storiesContent += `<li style="margin-bottom:0.4rem">${escapeHtml(story)}</li>`;
    }
    storiesContent += `</ul>`;
  }

  // Tab 3: UI Enhancements (hidden if empty)
  let enhancementsContent = '';
  const hasEnhancements = featureCtx && featureCtx.ui_enhancements;
  if (hasEnhancements) {
    const raw = featureCtx.ui_enhancements;
    const paragraphs = raw.split(/\n\n+/).map(p => p.trim()).filter(Boolean);

    enhancementsContent += `<ul style="margin:0.25rem 0 0 1rem;padding:0;line-height:1.7;font-size:0.8125rem;color:var(--text-secondary)">`;
    for (const para of paragraphs) {
      const headerMatch = para.match(/^_([^_]+):?_\s*(.*)/s);
      if (headerMatch) {
        const heading = headerMatch[1].trim().replace(/:$/, '');
        const body = headerMatch[2].trim();
        enhancementsContent += `<li style="margin-bottom:0.35rem"><strong style="color:var(--text)">${escapeHtml(heading)}:</strong> ${renderInlineMarkdown(escapeHtml(body))}</li>`;
      } else {
        enhancementsContent += `<li style="margin-bottom:0.35rem">${renderInlineMarkdown(escapeHtml(para))}</li>`;
      }
    }
    enhancementsContent += `</ul>`;
  }

  // === Assemble tabbed panel ===
  let html = `<section class="exec-summary" data-tour="context">`;
  html += `<div class="exec-header">`;
  html += `<span class="exec-key">${escapeHtml(key)}</span>`;
  html += `<h2 class="exec-title">${escapeHtml(title)}</h2>`;
  html += `</div>`;

  html += `<div class="exec-tabs">`;
  html += `<button class="exec-tab active" onclick="switchExecTab('overview')">Overview</button>`;
  if (hasStories) html += `<button class="exec-tab" onclick="switchExecTab('stories')">User Stories <span class="muted" style="font-size:0.7rem">(${featureCtx.user_stories.length})</span></button>`;
  if (hasEnhancements) html += `<button class="exec-tab" onclick="switchExecTab('enhancements')">UI Enhancements</button>`;
  html += `</div>`;

  html += `<div class="exec-tab-content active" id="exec-overview">${overviewContent}</div>`;
  if (hasStories) html += `<div class="exec-tab-content" id="exec-stories">${storiesContent}</div>`;
  if (hasEnhancements) html += `<div class="exec-tab-content" id="exec-enhancements">${enhancementsContent}</div>`;

  html += `</section>`;

  return html;
}

function registerScreenshot(filename, narration, stepContext, screenshots, ssState) {
  const src = screenshots[filename];
  if (!src) return -1;
  const idx = ssState.nextIdx++;
  ssState.indexMap[filename] = idx;
  ssState.array.push({
    src, narration: narration || '', filename,
    step: stepContext || null
  });
  return idx;
}

function buildTokens(opts = {}) {
  const protoId = extractPrototypeId();
  const csvRaw = readFileOr(opts.csvPath || path.join(absArtifacts, 'evaluation-report.csv'), '');
  const journeyLog = readJsonOr(opts.journeyLogPath || path.join(absArtifacts, 'journey-log.json'), null);
  const extractState = readJsonOr(path.join(absArtifacts, 'extract-state.json'), null);
  const screenshotsDir = opts.screenshotsDir || path.join(absArtifacts, 'screenshots');
  const screenshots = loadScreenshots(screenshotsDir);

  // Normalize usability_dimensions fields (handle common LLM output variants)
  const ud = journeyLog ? normalizeUsabilityDimensions(journeyLog.usability_dimensions) : null;
  const rawPersonaResults = readJsonOr(path.join(absArtifacts, 'persona-results.json'), null);
  const personaNameMap = buildPersonaNameMap(
    normalizePersonaResults(rawPersonaResults),
    journeyLog
  );

  const csvRows = parseCsv(csvRaw);

  // Outcome context (needed by screenshot modal)
  const outcomeContext = readJsonOr(path.join(absArtifacts, 'outcome-context.json'), null);

  // Gather think-aloud files
  const taFiles = [];
  try {
    const allFiles = fs.readdirSync(absArtifacts);
    for (const f of allFiles) {
      if (f.startsWith('usability-thinkaloud-') && f.endsWith('.md')) {
        taFiles.push({ name: f, content: readFileOr(path.join(absArtifacts, f), '') });
      }
    }
  } catch {}

  // Counts
  let passCount = 0, failCount = 0, flaggedCount = 0;
  for (const r of csvRows) {
    const v = (r.verdict || '').toUpperCase();
    if (v === 'PASS') passCount++;
    else if (v === 'FAIL') failCount++;
    else if (v === 'FLAGGED') flaggedCount++;
  }

  // Journey info
  const journeys = journeyLog ? journeyLog.journeys || [] : [];
  const journeyPass = journeys.filter(j => j.verdict === 'PASS').length;
  const journeyTotal = journeys.length;

  // Usability
  const rawUsability = ud ? ud.overall_score : null;
  let usabilityScore = '—';
  let usabilityMaxScore = 21;
  if (rawUsability != null && rawUsability !== '—') {
    if (typeof rawUsability === 'string' && rawUsability.includes('/')) {
      const parts = rawUsability.split('/');
      usabilityScore = parts[0].trim();
      usabilityMaxScore = parseInt(parts[1], 10) || 21;
    } else {
      usabilityScore = String(typeof rawUsability === 'number' ? rawUsability : parseFloat(rawUsability) || 0);
    }
  }
  if (ud && ud.max_score) usabilityMaxScore = ud.max_score;
  else if (ud && ud.dimensions) {
    const scoredDims = ud.dimensions.filter(d => isScoredDimension(d));
    if (scoredDims.length > 0) usabilityMaxScore = scoredDims.length * 3;
  }

  // Metadata from JSON artifacts (no MD dependency)
  const isUseful = (v) => v && v !== 'eval' && v !== protoId && v.length > 3;
  const storyTitle = (extractState && (
    (isUseful(extractState.ticket_summary) && extractState.ticket_summary) ||
    (isUseful(extractState.title) && extractState.title) ||
    (isUseful(extractState.story_title) && extractState.story_title)
  )) || protoId;
  const depth = (extractState && extractState.depth) || (journeyLog && journeyLog.depth) || 'quick';
  const evalDateRaw = (journeyLog && journeyLog.evaluated_at) || '';
  const evalDate = evalDateRaw ? new Date(evalDateRaw).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  // Generate description from results
  let description = '';
  if (passCount + failCount + flaggedCount > 0) {
    description = `${storyTitle} — ${passCount} passed, ${failCount} failed, ${flaggedCount} flagged for review`;
  } else {
    description = storyTitle !== protoId ? `${storyTitle} — prototype evaluation` : `Evaluation of ${protoId}`;
  }

  const failedIds = csvRows
    .filter(r => (r.verdict || '').toUpperCase() === 'FAIL')
    .map(r => {
      const id = r.criterion_id || '?';
      const text = r.criterion_text || '';
      const short = text.length > 20 ? text.slice(0, 20).replace(/\s+\S*$/, '') : text;
      return short ? `${id} (${short})` : id;
    });
  const failPart = failedIds.length ? failedIds.join(', ') : `${failCount} fail`;
  const flagPart = flaggedCount ? `${flaggedCount} flagged for human review` : '';
  const gapsSummary = [failPart, flagPart].filter(Boolean).join(' · ');
  const journeySummary = `${journeyPass}/${journeyTotal} completed`;

  const jiraUrl = `https://issues.redhat.com/browse/${protoId}`;
  const prototypeUrl = journeyLog ? journeyLog.prototype_url || '#' : '#';

  // ---- AC Table Rows (split by source) ----
  const jiraRows = csvRows.filter(r => (r.source || '').toLowerCase() !== 'inferred');
  const inferredRows = csvRows.filter(r => (r.source || '').toLowerCase() === 'inferred');

  // Build consistency violations per-AC lookup for CSV column + table badges
  const cReport = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);
  const consistencyViolationIds = new Set();
  if (cReport) {
    const cViolations = (cReport.source_mode && Array.isArray(cReport.source_mode.violations) && cReport.source_mode.violations.length > 0)
      ? cReport.source_mode.violations
      : (Array.isArray(cReport.findings) ? cReport.findings : []);
    for (const v of cViolations) {
      consistencyViolationIds.add(v.guideline_id);
    }
  }
  const consistencyBadge = consistencyViolationIds.size
    ? ` <span class="sa-tag sa-error" style="font-size:0.55rem;vertical-align:middle" title="${consistencyViolationIds.size} design guideline violations found on prototype pages">${consistencyViolationIds.size} design issues</span>`
    : '';

  function buildAcRow(r) {
    const id = escapeHtml(r.criterion_id);
    const rawText = r.criterion_text || '';
    const evidenceText = r.rationale || r.evidence || '';

    const expectedBehavior = extractExpectedBehavior(rawText);
    const summary = expectedBehavior.length > 120
      ? expectedBehavior.slice(0, 120).replace(/\s+\S*$/, '') + '...'
      : expectedBehavior;
    const needsExpand = rawText.length > summary.length;

    let criterionHtml = `<span class="ac-summary">${escapeHtml(summary)}</span>`;
    if (needsExpand) {
      criterionHtml += `<details class="ac-details"><summary class="ac-expand">Expand</summary><p class="ac-full-text">${escapeHtml(rawText)}</p></details>`;
    }

    const verdict = badgeHtml(r.verdict, r.criterion_id);

    const evidenceRaw = r.evidence || '';
    const hasScreenshot = /screenshot/i.test(evidenceRaw) || /\.png/i.test(evidenceRaw) || /\.jpg/i.test(evidenceRaw);
    let evidenceHtml = `<a href="#" class="ac-view-link" onclick="openEvidenceViewer('${escapeHtml(r.criterion_id)}');return false">View evidence →</a>`;
    if (!hasScreenshot) {
      evidenceHtml += `<span style="display:inline-flex;align-items:center;gap:0.25rem;color:var(--status-warning);font-size:0.7rem;margin-left:0.5rem" title="No screenshot evidence linked for this criterion">${SVG_ICON.warningSmall} No visual evidence</span>`;
    }
    if (evidenceText) evidenceHtml += `<span class="ac-evidence-text">${escapeHtml(evidenceText)}</span>`;

    return `<tr><td><strong>${id}</strong></td><td>${criterionHtml}</td><td>${verdict}</td><td class="small">${evidenceHtml}</td></tr>`;
  }

  const acTableRowsJira = jiraRows.map(buildAcRow).join('\n');
  const acTableRowsInferred = inferredRows.map(buildAcRow).join('\n');

  const acJiraCount = jiraRows.length;

  // ---- Breadcrumb ----
  // Resolve Jira instance URL based on project key prefix
  function jiraUrlForKey(key) {
    if (!key) return '';
    if (key.startsWith('RHOAIUX-')) return `https://redhat.atlassian.net/browse/${key}`;
    return `https://issues.redhat.com/browse/${key}`;
  }

  // Render a breadcrumb link — validated links become anchors, unvalidated become plain text with tooltip
  function breadcrumbLink(key, url, label, validated) {
    const displayText = escapeHtml(label || key || '');
    if (validated === false || !url) {
      return `<span title="Link could not be verified" style="color:var(--text-secondary)">${displayText}</span>`;
    }
    return `<a href="${escapeHtml(url)}">${displayText}</a>`;
  }

  let breadcrumbHtml = '';
  if (journeyLog && journeyLog.breadcrumb) {
    const bc = journeyLog.breadcrumb;
    const parts = [];
    if (bc.rfe && bc.rfe.key) {
      const rfeUrl = bc.rfe.url || jiraUrlForKey(bc.rfe.key);
      parts.push(breadcrumbLink(bc.rfe.key, rfeUrl, bc.rfe.key + ' (RFE)', bc.rfe.validated !== false));
    }
    // Outcome link (between RFE and STRAT)
    const outcomeKey = outcomeContext && (outcomeContext.key || outcomeContext.outcome_key);
    if (outcomeKey) {
      parts.push(`<a href="${escapeHtml(jiraUrlForKey(outcomeKey))}">${escapeHtml(outcomeKey)} (Outcome)</a>`);
    }
    if (bc.strat && bc.strat.key) {
      const stratUrl = bc.strat.url || jiraUrlForKey(bc.strat.key);
      parts.push(breadcrumbLink(bc.strat.key, stratUrl, bc.strat.key + ' (STRAT)', bc.strat.validated !== false));
    }
    if (bc.mr) parts.push(`<a href="${escapeHtml(bc.mr.url)}">${escapeHtml(bc.mr.id)}</a>`);
    else if (bc.prototype) parts.push(`<a href="${escapeHtml(bc.prototype.url)}">${escapeHtml(bc.prototype.label)}</a>`);
    parts.push('Eval Report');
    breadcrumbHtml = parts.join('<span class="sep">→</span>');
  } else {
    const fallbackRfeKey = (extractState && extractState.rfe_key) || null;
    const parts = [];
    if (fallbackRfeKey) {
      parts.push(`<a href="${jiraUrlForKey(fallbackRfeKey)}">${fallbackRfeKey} (RFE)</a>`);
    }
    // Outcome in fallback breadcrumb
    const fallbackOutcomeKey = outcomeContext && (outcomeContext.key || outcomeContext.outcome_key);
    if (fallbackOutcomeKey) {
      parts.push(`<a href="${escapeHtml(jiraUrlForKey(fallbackOutcomeKey))}">${escapeHtml(fallbackOutcomeKey)} (Outcome)</a>`);
    }
    parts.push(`<a href="${escapeHtml(jiraUrlForKey(protoId) || jiraUrl)}">${escapeHtml(protoId)} (STRAT)</a>`);
    if (journeyLog && journeyLog.prototype_url) {
      parts.push(`<a href="${escapeHtml(journeyLog.prototype_url)}">Prototype</a>`);
    }
    parts.push('<strong>Eval Report</strong>');
    breadcrumbHtml = parts.join('<span class="sep"> → </span>');
  }

  // ---- Screenshot array for modal JS ----
  const ssState = { nextIdx: 0, indexMap: {}, array: [] };

  // ---- Consistency lookup for screenshot annotations ----
  const consistencyReport = readJsonOr(path.join(absArtifacts, 'consistency-report.json'), null);
  const consistencyByRoute = {};
  const consistencyByScreenshot = {};

  // Map visual findings by screenshot filename for modal display
  if (consistencyReport && consistencyReport.visual_mode && consistencyReport.visual_mode.findings) {
    for (const f of consistencyReport.visual_mode.findings) {
      if (f.verdict !== 'VIOLATION') continue;
      const ssKey = f.screenshot ? path.basename(f.screenshot) : null;
      if (!ssKey) continue;
      if (!consistencyByScreenshot[ssKey]) consistencyByScreenshot[ssKey] = [];
      consistencyByScreenshot[ssKey].push(f);
    }
  }

  const srcViolations = consistencyReport
    ? ((consistencyReport.source_mode && Array.isArray(consistencyReport.source_mode.violations) && consistencyReport.source_mode.violations.length > 0)
        ? consistencyReport.source_mode.violations
        : (Array.isArray(consistencyReport.findings) ? consistencyReport.findings : []))
    : [];
  if (srcViolations.length > 0) {
    const routeMap = {
      'AppLayout': '/',
      'AgentCatalog/AgentCatalog': '/ai-hub/agents/catalog',
      'AgentCatalog/AgentCatalogDetails': '/ai-hub/agents/catalog/:id',
      'AgentCatalog/AgentDeployments': '/ai-hub/agents/deployments',
      'Deployments/Deployments': '/ai-hub/models',
      'Deployments/RegisterExternalModel': '/ai-hub/models',
      'FeatureFlags': '/',
      'routes': '/',
      'ContextPanel': '/'
    };

    for (const v of srcViolations) {
      const file = v.file || '';
      for (const [pattern, route] of Object.entries(routeMap)) {
        if (file.includes(pattern)) {
          if (!consistencyByRoute[route]) consistencyByRoute[route] = [];
          const key = v.guideline_id + ':' + route;
          if (!consistencyByRoute[route].find(x => x._key === key)) {
            consistencyByRoute[route].push({ ...v, _key: key });
          }
          break;
        }
      }
    }
  }

  const globalShellFiles = new Set(['AppLayout', 'FeatureFlags', 'routes', 'ContextPanel']);
  const importLinePattern = /^(import |} from |export (interface|type|const) )/;

  function isGlobalShellViolation(v) {
    const f = v.file || '';
    return [...globalShellFiles].some(g => f.includes(g));
  }

  function isImportFalsePositive(v) {
    const desc = (v.description || '').trim();
    return importLinePattern.test(desc) || desc.endsWith(',') && desc.split(/\s+/).length <= 2;
  }

  function getConsistencyForStep(step, ssFilename) {
    const target = (step.target || '').toLowerCase();
    const pageViolations = [];
    const shellViolations = [];

    // Source-mode violations matched by route
    for (const [route, violations] of Object.entries(consistencyByRoute)) {
      if (target.includes(route) || (route === '/' && step.action === 'navigate' && target.includes('localhost'))) {
        for (const v of violations) {
          if (isImportFalsePositive(v)) continue;
          const bucket = isGlobalShellViolation(v) ? shellViolations : pageViolations;
          if (!bucket.find(m => m.guideline_id === v.guideline_id)) bucket.push(v);
        }
      }
    }

    // Visual-mode findings matched by screenshot filename
    if (ssFilename && consistencyByScreenshot[ssFilename]) {
      for (const f of consistencyByScreenshot[ssFilename]) {
        if (!pageViolations.find(m => m.guideline_id === f.guideline_id)) {
          pageViolations.push({
            guideline_id: f.guideline_id,
            guideline_title: f.guideline_title || f.guideline_id,
            category: f.category || '',
            severity: f.severity || 'warning',
            file: '',
            line: null,
            description: f.description || '',
            suggestion: f.suggestion || '',
            pf_doc_url: f.pf_doc_url || ''
          });
        }
      }
    }

    return { page: pageViolations, shell: shellViolations, all: [...pageViolations, ...shellViolations] };
  }

  // ---- Exploration persona reactions lookup ----
  const explorationReactions = {};
  const explorationData = journeyLog ? journeyLog.exploration || [] : [];
  for (const expl of explorationData) {
    for (const step of (expl.steps || [])) {
      if (step.screenshot && step.persona_reaction) {
        explorationReactions[path.basename(step.screenshot)] = {
          persona: expl.persona_name || expl.persona,
          reaction: step.persona_reaction
        };
      }
    }
  }

  // ---- Journey Blocks ----
  const journeyColors = ['#0066cc', '#3e8635', '#f0ab00', '#6753ac', '#009596', '#c9190b'];
  let journeyBlocksHtml = '';
  const pathRows = [];

  for (const journey of journeys) {
    const jIdx = journeys.indexOf(journey);
    const jColor = journeyColors[jIdx % journeyColors.length];
    const divider = journeyBlocksHtml ? '<div class="journey-divider"></div>' : '';
    let block = `${divider}<h3>${escapeHtml(journey.title)}</h3>`;
    // Extract AC reference for prominent badge display — prefer ac_ids array, fall back to parsing source
    let acLabels = [];
    if (Array.isArray(journey.ac_ids) && journey.ac_ids.length > 0) {
      acLabels = journey.ac_ids;
    } else {
      const acMatch = (journey.source || '').match(/(?:Inferred from |Story \d+ \+ )?(AC-\d+|NAV-\d+|HLR-\d+)/gi);
      if (acMatch) acLabels = acMatch.map(m => m.replace(/^(?:Inferred from |Story \d+ \+ )/i, ''));
    }
    const acBadge = acLabels.length > 0 ? acLabels.map(ac => `<span class="badge" style="background:rgba(0,102,204,0.1);color:#0066cc;margin-right:0.4rem">Testing ${escapeHtml(ac)}</span>`).join('') : '';
    block += `<p class="small muted" style="padding-left:calc(0.6rem + 4px)">${acBadge}<strong>Persona:</strong> ${escapeHtml(resolvePersonaName(personaNameMap, journey.persona))} · <strong>Source:</strong> ${escapeHtml(journey.source)} · <strong>Verdict:</strong> ${badgeHtml(journey.verdict)}</p>`;

    const steps = journey.steps || [];
    const renderedScreenshots = new Set();

    for (let si = 0; si < steps.length; si++) {
      const step = steps[si];

      // Find screenshot
      let ssFilename = step.screenshot ? path.basename(step.screenshot) : null;
      if (!ssFilename) {
        const jIdx = journeys.indexOf(journey) + 1;
        const candidates = [
          `journey-${jIdx}-step-${step.step}.png`,
          `journey-${jIdx}-step-${step.step}-FAIL.png`
        ];
        for (const c of candidates) {
          if (screenshots[c]) { ssFilename = c; break; }
        }
      }

      // Check if the NEXT step uses the same screenshot — if so, merge narrations
      let mergedSteps = [step];
      if (ssFilename) {
        while (si + 1 < steps.length) {
          const nextStep = steps[si + 1];
          const nextSs = nextStep.screenshot ? path.basename(nextStep.screenshot) : null;
          if (nextSs === ssFilename) {
            mergedSteps.push(nextStep);
            si++;
          } else break;
        }
      }

      // Render step headers (all merged steps) with patience meter
      block += `<div style="margin:1rem 0">`;
      for (const ms of mergedSteps) {
        block += `<p class="small"><strong>Step ${ms.step}</strong> — ${escapeHtml(ms.action)} → <code>${escapeHtml(ms.target)}</code> · ${badgeHtml(ms.result === 'success' ? 'PASS' : 'FAIL')}`;
        if (ms.timestamp_ms !== undefined) block += ` · <span class="mono muted">${ms.timestamp_ms}ms</span>`;
        // Inline patience meter — show if persona overlay has a confusion event at this step
        if (ud && ud.persona_overlays) {
          for (const ov of ud.persona_overlays) {
            const confEvent = (ov.confusion_events || []).find(e => e.step === ms.step || e.step === parseFloat(ms.step));
            if (confEvent) {
              const patienceAfter = Math.max(0, (ov.patience_start || 100) + (ov.confusion_events || []).filter(e => (e.step || 0) <= ms.step).reduce((sum, e) => sum + (e.patience_cost || 0), 0));
              const pColor = patienceAfter > 60 ? 'var(--status-success)' : patienceAfter > 30 ? 'var(--status-warning)' : 'var(--status-danger)';
              block += ` · <span style="display:inline-flex;align-items:center;gap:0.3rem;font-size:0.75rem;font-family:var(--font-mono)"><span style="width:80px;height:6px;background:#eaeaea;border-radius:3px;overflow:hidden;display:inline-block"><span style="height:100%;width:${patienceAfter}%;background:${pColor};display:block;border-radius:3px"></span></span> <span style="color:${pColor}">${confEvent.patience_cost}%</span></span>`;
              break;
            }
          }
        }
        block += `</p>`;
      }
      if (ssFilename && screenshots[ssFilename] && !renderedScreenshots.has(ssFilename)) {
        renderedScreenshots.add(ssFilename);
        const cResult = getConsistencyForStep(step, ssFilename);
        const reaction = explorationReactions[ssFilename];

        const overlays = ud ? (ud.persona_overlays || []) : [];
        const scoreImpacts = [];
        const seenDims = new Set();
        for (const ms of mergedSteps) {
          if (ms.action === 'navigate-assisted' || ms.url_fallback) {
            if (ud && ud.dimensions) {
              for (const d of ud.dimensions) {
                if (seenDims.has(d.name)) continue;
                for (const [pid, s] of Object.entries(d.scores)) {
                  if (s.assisted_nav_impact) {
                    seenDims.add(d.name);
                    scoreImpacts.push({ dim: d.name, score: d.composite_score || s.score, note: 'Capped by navigate-assisted at this step', persona: pid });
                    break;
                  }
                }
              }
            }
          }
          const stepOvs = overlays.filter(o => (o.confusion_events || []).some(e => e.step === ms.step || e.step === parseFloat(ms.step)));
          for (const ov of stepOvs) {
            const confEvent = (ov.confusion_events || []).find(e => e.step === ms.step || e.step === parseFloat(ms.step));
            if (confEvent && !seenDims.has('Patience:' + ov.persona)) {
              seenDims.add('Patience:' + ov.persona);
              // Compute cumulative patience at this step
              const priorCosts = (ov.confusion_events || []).filter(e => (e.step || 0) <= ms.step).reduce((sum, e) => sum + (e.patience_cost || 0), 0);
              const patienceAfter = Math.max(0, (ov.patience_start || 100) + priorCosts);
              scoreImpacts.push({ dim: 'Patience', score: null, note: `${ov.persona_name}: ${confEvent.trigger} (${confEvent.patience_cost}%)`, persona: ov.persona, patienceAfter });
            }
          }
        }

        const mergedNarrations = mergedSteps.map(ms => ms.narration).filter(Boolean).join(' ');

        const stepCtx = {
          stepNum: mergedSteps.map(ms => ms.step).join(', '),
          action: step.action || '',
          target: step.target || '',
          result: step.result || '',
          error: mergedSteps.map(ms => ms.error).filter(Boolean).join('; '),
          rootCause: mergedSteps.map(ms => ms.root_cause).filter(Boolean).join('; '),
          journeyTitle: journey.title,
          journeyIdx: jIdx,
          journeyColor: jColor,
          journeySource: journey.source || '',
          acIds: journey.ac_ids || [],
          persona: resolvePersonaName(personaNameMap, journey.persona),
          verdict: mergedSteps.some(ms => ms.result !== 'success') ? 'FAIL' : 'PASS',
          violations: cResult.page.map(cf => ({
            id: cf.guideline_id, title: cf.guideline_title || cf.guideline_id,
            severity: cf.severity, file: (cf.file || '').replace('src/app/', '').replace('src/', ''),
            line: cf.line, description: cf.description || '', suggestion: cf.suggestion || '', pfDocUrl: cf.pf_doc_url || '', category: cf.category || '', isShell: false
          })),
          shellViolations: cResult.shell.map(cf => ({
            id: cf.guideline_id, title: cf.guideline_title || cf.guideline_id,
            severity: cf.severity, file: (cf.file || '').replace('src/app/', '').replace('src/', ''),
            line: cf.line, description: cf.description || '', suggestion: cf.suggestion || '', pfDocUrl: cf.pf_doc_url || '', category: cf.category || '', isShell: true
          })),
          personaReaction: reaction ? { name: resolvePersonaName(personaNameMap, reaction.persona), text: reaction.reaction }
            : step.persona_reaction ? { name: resolvePersonaName(personaNameMap, journey.persona), text: step.persona_reaction }
            : null,
          scoreImpacts: scoreImpacts.slice(0, 5),
          outcomeContext: outcomeContext ? { key: outcomeContext.key || '', problem: (outcomeContext.problem_statement || '').slice(0, 200), criteria: (outcomeContext.acceptance_criteria || []).slice(0, 5) } : null,
          // Persona patience states at this step — filtered to overlays matching this journey
          personaPatience: (ud && ud.persona_overlays || [])
            .filter(ov => !ov.journey_id || ov.journey_id === journey.id)
            .map(ov => {
            const priorCosts = (ov.confusion_events || []).filter(e => (e.step || 0) <= (mergedSteps[mergedSteps.length - 1].step || 0)).reduce((sum, e) => sum + (e.patience_cost || 0), 0);
            const patienceNow = Math.max(0, (ov.patience_start || 100) + priorCosts);
            const confAtStep = (ov.confusion_events || []).find(e => mergedSteps.some(ms => e.step === ms.step || e.step === parseFloat(ms.step)));
            return { persona: ov.persona_name || ov.persona, patience: patienceNow, trigger: confAtStep ? confAtStep.trigger : null, cost: confAtStep ? confAtStep.patience_cost : null };
          }),
          // AC criterion texts for clickable badges
          acTexts: (journey.ac_ids || []).reduce((map, id) => {
            const row = [...jiraRows, ...inferredRows].find(r => r.criterion_id === id);
            if (row) map[id] = row.criterion_text || '';
            return map;
          }, {})
        };

        const idx = registerScreenshot(ssFilename, mergedNarrations, stepCtx, screenshots, ssState);
        if (idx >= 0) {
          block += `<div class="screenshot-card">`;
          block += `<div class="screenshot" data-idx="${idx}" onclick="openImageLightbox(this.querySelector('img').src)" style="cursor:pointer"><img loading="lazy" src="screenshots/${ssFilename}" alt="Step ${step.step}"></div>`;

          if (mergedNarrations) {
            block += `<div class="narration">${escapeHtml(mergedNarrations)}</div>`;
          }

          const allFindings = [...cResult.page, ...cResult.shell];
          if (allFindings.length) {
            block += `<div class="screenshot-annotations">`;
            for (const cf of cResult.page) {
              const sevCls = cf.severity === 'error' ? 'sa-error' : 'sa-warning';
              const detailId = `sa-detail-${journeys.indexOf(journey)}-${step.step}-${cf.guideline_id}`.replace(/[^a-zA-Z0-9-]/g, '-');
              block += `<div class="sa-item">`;
              block += `<button class="sa-tag ${sevCls}" onclick="document.getElementById('${detailId}').toggleAttribute('open')">${escapeHtml(cf.guideline_title || cf.guideline_id)}</button>`;
              block += `<details id="${detailId}" class="sa-detail"><summary style="display:none"></summary><div class="sa-detail-body">`;
              if (cf.file) block += `<div class="sa-location"><code>${escapeHtml((cf.file || '').replace('src/app/', '').replace('src/', '') + (cf.line ? ':' + cf.line : ''))}</code></div>`;
              if (cf.suggestion) block += `<p class="sa-fix"><strong>Fix:</strong> ${escapeHtml(cf.suggestion)}</p>`;
              if (cf.pf_doc_url) block += `<a href="${escapeHtml(cf.pf_doc_url)}" target="_blank" class="sa-doc-link">PatternFly documentation &rarr;</a>`;
              block += `</div></details></div>`;
            }
            if (cResult.shell.length) {
              block += `<details class="sa-shell-toggle"><summary class="small muted">${cResult.shell.length} global shell issue${cResult.shell.length > 1 ? 's' : ''} (AppLayout, nav, flags)</summary><div class="screenshot-annotations" style="border-top:none;padding-top:0">`;
              for (const cf of cResult.shell) {
                const sevCls = cf.severity === 'error' ? 'sa-error' : 'sa-warning';
                block += `<span class="sa-tag ${sevCls}" title="${escapeHtml(cf.suggestion || '')}">${escapeHtml(cf.guideline_title || cf.guideline_id)}</span>`;
              }
              block += `</div></details>`;
            }
            block += `</div>`;
          }

          if (reaction) {
            block += `<div class="screenshot-persona"><strong>${escapeHtml(reaction.persona)}:</strong> <em>${escapeHtml(reaction.reaction)}</em></div>`;
          }

          block += `</div>`;
        }
      } else if (!ssFilename || !screenshots[ssFilename]) {
        for (const ms of mergedSteps) {
          if (ms.narration) block += `<div class="narration">${escapeHtml(ms.narration)}</div>`;
        }
      }

      if (step.error) {
        block += `<div class="ta-callout ta-callout-confusion"><strong>Error:</strong> ${escapeHtml(step.error)}</div>`;
      }
      if (step.root_cause) {
        block += `<div class="ta-callout ta-callout-expected"><strong>Root cause:</strong> ${escapeHtml(step.root_cause)}</div>`;
      }

      block += `</div>`;
    }

    journeyBlocksHtml += block;

    const unassistedPass = steps.filter(s => s.result === 'success' && s.action !== 'navigate-assisted').length;
    const matchPct = journey.steps_expected > 0
      ? Math.round((unassistedPass / journey.steps_expected) * 100) + '%'
      : '—';
    const matchClass = unassistedPass === journey.steps_expected ? 'color:var(--status-success)' : unassistedPass === 0 ? 'color:var(--status-danger)' : 'color:var(--status-warning)';
    let drift = '—';
    if (journey.verdict !== 'PASS') {
      const failStep = steps.find(s => s.result !== 'success' && s.action !== 'navigate-assisted');
      if (failStep) {
        const reason = failStep.error ? failStep.error.substring(0, 60) : 'step failed';
        drift = `Step ${failStep.step}: ${reason}`;
      }
    }
    pathRows.push(`<tr><td>${escapeHtml(journey.title)}</td><td>${escapeHtml(resolvePersonaName(personaNameMap, journey.persona))}</td><td>${journey.steps_expected}</td><td>${unassistedPass}</td><td style="${matchClass};font-weight:400">${matchPct}</td><td class="small">${escapeHtml(drift)}</td></tr>`);
  }

  // ---- Append exploration as additional journey blocks ----
  if (explorationData.length) {
    journeyBlocksHtml += `<div class="journey-divider"></div>`;
    journeyBlocksHtml += `<h3 style="color:var(--text-secondary)">Exploration — beyond prescribed journeys</h3>`;
    journeyBlocksHtml += `<p class="small muted" style="margin:-0.25rem 0 1rem">Pages the persona visited after the prescribed AC journeys. Same browser session, same state.</p>`;

    for (const expl of explorationData) {
      const pName = escapeHtml(resolvePersonaName(personaNameMap, expl.persona));
      let block = `<p class="small"><strong>${pName}</strong> · ${escapeHtml(expl.goal || '')}</p>`;
      if (expl.prescribed_gap) {
        block += `<p class="small muted" style="margin:0 0 0.75rem">${escapeHtml(expl.prescribed_gap)}</p>`;
      }

      for (const step of (expl.steps || [])) {
        block += `<div style="margin:1rem 0">`;
        block += `<p class="small"><strong>Step ${step.step}</strong> — ${escapeHtml(step.action || '')} → <code>${escapeHtml(step.target || '')}</code> · ${badgeHtml(step.result === 'success' ? 'PASS' : 'FAIL')}</p>`;

        const ssFile = step.screenshot ? path.basename(step.screenshot) : null;
        if (ssFile && screenshots[ssFile]) {
          const exploCtx = {
            stepNum: step.step, action: step.action || '', target: step.target || '',
            result: step.result || '', error: '', rootCause: '',
            journeyTitle: 'Exploration', persona: pName, verdict: step.result === 'success' ? 'PASS' : 'FAIL',
            violations: getConsistencyForStep(step, ssFile).page.map(cf => ({
              id: cf.guideline_id, title: cf.guideline_title || cf.guideline_id,
              severity: cf.severity, file: (cf.file || '').replace('src/app/', '').replace('src/', ''),
              line: cf.line, description: cf.description || '', suggestion: cf.suggestion || '', pfDocUrl: cf.pf_doc_url || '', category: cf.category || ''
            })),
            shellViolations: getConsistencyForStep(step, ssFile).shell.map(cf => ({
              id: cf.guideline_id, title: cf.guideline_title || cf.guideline_id,
              severity: cf.severity, file: (cf.file || '').replace('src/app/', '').replace('src/', ''),
              line: cf.line, description: cf.description || '', suggestion: cf.suggestion || '', pfDocUrl: cf.pf_doc_url || '', category: cf.category || ''
            })),
            personaReaction: step.persona_reaction ? { name: pName, text: step.persona_reaction } : null,
            scoreImpacts: []
          };
          const idx = registerScreenshot(ssFile, step.narration || '', exploCtx, screenshots, ssState);
          if (idx >= 0) {
            block += `<div class="screenshot-card">`;
            block += `<div class="screenshot" data-idx="${idx}" onclick="openImageLightbox(this.querySelector('img').src)" style="cursor:pointer"><img loading="lazy" src="screenshots/${ssFile}" alt="Explore step ${step.step}"></div>`;
            if (step.narration) block += `<div class="narration">${escapeHtml(step.narration)}</div>`;
            if (step.persona_reaction) {
              block += `<div class="screenshot-persona"><strong>${pName}:</strong> <em>${escapeHtml(step.persona_reaction)}</em></div>`;
            }
            block += `</div>`;
          }
        } else {
          if (step.narration) block += `<div class="narration">${escapeHtml(step.narration)}</div>`;
          if (step.persona_reaction) {
            block += `<div class="screenshot-persona"><strong>${pName}:</strong> <em>${escapeHtml(step.persona_reaction)}</em></div>`;
          }
        }
        block += `</div>`;
      }
      journeyBlocksHtml += block;
    }
  }

  const pathLegend = `<details open class="path-legend"><summary class="small muted">What do these columns mean?</summary><div class="card card-compact" style="margin-top:0.5rem"><dl class="path-legend-dl">` +
    `<dt>Journey</dt><dd>A user goal derived from the Jira acceptance criteria (e.g., "Browse Agent Catalog" comes from AC-1).</dd>` +
    `<dt>Persona</dt><dd>The simulated user profile walking through this journey — their expertise level affects what friction they encounter.</dd>` +
    `<dt>Expected</dt><dd>How many UI steps the journey should take if the feature works correctly (click sidebar, click card, verify content, etc.).</dd>` +
    `<dt>Actual</dt><dd>How many steps completed successfully <strong>without URL workarounds</strong>. Steps that required direct URL navigation (navigate-assisted) are not counted — they mean the page exists but a real user can't find it.</dd>` +
    `<dt>Match</dt><dd>Actual / Expected as a percentage. <strong style="color:var(--status-success)">100%</strong> = the journey works end-to-end. <strong style="color:var(--status-warning)">50-99%</strong> = partially blocked. <strong style="color:var(--status-danger)">&lt;50%</strong> = mostly broken.</dd>` +
    `<dt>Drift Notes</dt><dd>Where the journey broke — the specific step and what went wrong (e.g., "sidebar nav missing" or "detail page content too sparse").</dd>` +
    `</dl></div></details>`;

  const pathComparisonTable = pathRows.length
    ? `<table class="tbl mb1"><thead><tr><th>Journey</th><th>Target Role</th><th>Expected</th><th>Actual</th><th>Match</th><th>Drift Notes</th></tr></thead><tbody>${pathRows.join('\n')}</tbody></table>${pathLegend}`
    : '';

  // ---- Usability Dimension Cards ----
  let usabilityTable = '';
  let patienceTracking = '';

  if (ud && ud.dimensions) {
    const personas = ud.personas_evaluated || [];
    const refSuggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), []);
    const sugByDim = {};
    if (Array.isArray(refSuggestions)) {
      for (const s of refSuggestions) {
        const key = (s.dimension || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
        if (!sugByDim[key]) sugByDim[key] = s;
      }
    }

    const scored = ud.dimensions.filter(d => d.composite_score !== 'N/A' && d.composite_score !== 'n/a' && d.composite_score !== null && d.composite_score !== undefined);
    const totalScore = scored.reduce((sum, d) => sum + numScore(d.composite_score), 0);
    const maxScore = scored.length * 3;
    const overallPct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const overallColor = overallPct >= 70 ? 'var(--status-success)' : overallPct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';

    let cards = '';
    cards += `<div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.25rem;padding:0.75rem 1rem;background:var(--bg-secondary);border:1px solid var(--border);border-radius:0.5rem">`;
    cards += `<div style="font-family:var(--font-heading);font-size:1.75rem;font-weight:700;color:${overallColor};line-height:1">${totalScore}/${maxScore}</div>`;
    cards += `<div style="flex:1;max-width:12rem"><div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${overallPct}%;height:100%;background:${overallColor};border-radius:3px"></div></div></div>`;
    cards += `<span class="small muted">across ${scored.length} dimensions</span>`;
    cards += `</div>`;

    for (const dim of ud.dimensions) {
      const isNA = dim.composite_score === 'N/A' || dim.composite_score === 'n/a' || dim.composite_score === null || dim.composite_score === undefined;
      const score = isNA ? 0 : numScore(dim.composite_score);
      const scoreLabel = isNA ? 'N/A' : `${score}/3`;
      const scoreColor = isNA ? 'var(--text-secondary)' : score >= 2.5 ? 'var(--status-success)' : score >= 1.5 ? 'var(--status-warning)' : 'var(--status-danger)';
      const scorePct = isNA ? 0 : Math.round((score / 3) * 100);
      const naNote = dim.note || dim.na_reason || 'Not evaluated for this prototype';
      const borderColor = isNA ? 'var(--border)' : scoreColor;

      const findings = [];
      for (const p of personas) {
        const s = dim.scores ? dim.scores[p] : null;
        if (s && s.finding) findings.push(s.finding);
      }
      const finding = findings[0] || (isNA ? naNote : '');

      const dimKey = (dim.name || '').toLowerCase().replace(/[^a-z0-9]/g, '_');
      const sug = sugByDim[dimKey];
      const improvement = sug ? (sug.suggested_fix || sug.problem || '') : '';

      cards += `<div style="border:1px solid var(--border);border-radius:0.5rem;padding:0.75rem 1rem;margin-bottom:0.5rem;box-shadow:var(--shadow-sm)${isNA ? ';opacity:0.55' : ''}">`;
      cards += `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:${finding ? '0.35rem' : '0'}">`;
      cards += `<span style="font-family:var(--font-heading);font-size:1.125rem;font-weight:700;color:${scoreColor};min-width:2.5rem">${scoreLabel}</span>`;
      if (!isNA) {
        cards += `<div style="width:3rem;height:4px;background:var(--border);border-radius:2px;overflow:hidden"><div style="width:${scorePct}%;height:100%;background:${scoreColor};border-radius:2px"></div></div>`;
      }
      cards += `<span style="font-weight:700;font-size:0.875rem;flex:1">${escapeHtml(dim.name)}</span>`;
      cards += `</div>`;
      if (finding) {
        cards += `<p style="font-size:0.8125rem;color:var(--text-secondary);line-height:1.5;margin:0">${escapeHtml(finding)}</p>`;
      }
      if (improvement) {
        cards += `<p style="font-size:0.8125rem;color:var(--link);line-height:1.5;margin:0.25rem 0 0"><svg width="12" height="12" viewBox="0 0 512 512" fill="var(--link)" style="vertical-align:-1px;margin-right:0.3rem"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zm-32-320v128c0 17.7 14.3 32 32 32s32-14.3 32-32V192c0-17.7-14.3-32-32-32s-32 14.3-32 32zm32-80a24 24 0 1 1 0-48 24 24 0 1 1 0 48z"/></svg>${escapeHtml(improvement)}</p>`;
      }
      cards += `</div>`;
    }

    usabilityTable = cards;

    // Patience tracking — heatmap + sparklines (Decision 12)
    const overlays = ud.persona_overlays || [];
    const tasksDef = extractState ? (extractState.tasks_to_be_done || []) : [];
    if (overlays.length) {
      // Build persona x task grid
      const personaIds = [...new Set(overlays.map(o => o.persona || o.persona_id).filter(Boolean))];
      const taskIds = [...new Set(overlays.map(o => o.task_index).filter(t => t != null))].sort((a, b) => a - b);

      const grid = {};
      for (const o of overlays) {
        const pid = o.persona || o.persona_id;
        const tid = o.task_index;
        if (!pid || tid == null) continue;
        if (!grid[pid]) grid[pid] = {};
        grid[pid][tid] = {
          patience_end: o.patience_end != null ? o.patience_end : 100,
          confusion_count: o.confusion_events ? o.confusion_events.length : 0,
          abandoned: !!o.abandoned
        };
      }

      function hmColor(val) {
        return val > 70 ? 'var(--status-success)' : val > 40 ? 'var(--status-warning)' : 'var(--status-danger)';
      }
      function hmBg(val) {
        return val > 70 ? 'rgba(62,134,53,0.1)' : val > 40 ? 'rgba(240,171,0,0.1)' : 'rgba(201,25,11,0.1)';
      }

      let heatmap = `<div class="patience-heatmap"><table class="tbl" style="font-size:0.8rem"><thead><tr><th>Persona</th>`;
      for (const tid of taskIds) {
        const tDef = tasksDef[tid - 1];
        const shortLabel = tDef ? (tDef.task.length > 20 ? tDef.task.substring(0, 20) + '...' : tDef.task) : `Task ${tid}`;
        heatmap += `<th style="text-align:center" title="${escapeHtml(tDef ? tDef.task : 'Task ' + tid)}">${escapeHtml(shortLabel)}</th>`;
      }
      heatmap += `<th style="text-align:center">Overall</th></tr></thead><tbody>`;

      for (const pid of personaIds) {
        const name = resolvePersonaName(personaNameMap, pid);
        const row = grid[pid] || {};
        const allVals = taskIds.map(t => row[t] ? row[t].patience_end : null).filter(v => v !== null);
        const overallP = allVals.length ? Math.round(allVals.reduce((a, b) => a + b, 0) / allVals.length) : 100;

        heatmap += `<tr><td style="font-weight:700">${escapeHtml(name)}</td>`;
        for (const tid of taskIds) {
          const cell = row[tid];
          if (cell) {
            const val = cell.patience_end;
            let cellContent = `<span style="font-weight:700;color:${hmColor(val)}">${val}%</span>`;
            if (cell.abandoned) cellContent += ` <span style="font-size:0.75rem;color:var(--status-danger);font-family:var(--font-mono)">X</span>`;
            if (cell.confusion_count > 0) cellContent += ` <span style="font-size:0.75rem;color:var(--status-warning);font-family:var(--font-mono)">${cell.confusion_count}</span>`;
            heatmap += `<td class="patience-hm-cell" style="text-align:center;background:${hmBg(val)}">${cellContent}</td>`;
          } else {
            heatmap += `<td style="text-align:center;color:var(--text-secondary)">—</td>`;
          }
        }
        heatmap += `<td class="patience-hm-cell" style="text-align:center;background:${hmBg(overallP)};font-weight:700;color:${hmColor(overallP)}">${overallP}%</td>`;
        heatmap += `</tr>`;
      }
      heatmap += `</tbody></table></div>`;

      // Sparklines for worst tasks (patience_end < 70%)
      const worstTasks = [];
      for (const tid of taskIds) {
        const vals = personaIds.map(p => grid[p] && grid[p][tid] ? grid[p][tid].patience_end : null).filter(v => v !== null);
        const avg = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : 100;
        if (avg < 70) worstTasks.push({ tid, avg, vals });
      }

      let sparklines = '';
      if (worstTasks.length) {
        sparklines = `<div style="margin-top:1rem"><h4 style="font-size:0.8rem;font-weight:700;color:var(--text);margin-bottom:0.5rem">Tasks needing attention</h4>`;
        for (const wt of worstTasks) {
          const tDef = tasksDef[wt.tid - 1];
          const label = tDef ? tDef.task : `Task ${wt.tid}`;
          sparklines += `<div class="patience-sparkline" style="margin-bottom:0.75rem">`;
          sparklines += `<div style="font-size:0.8rem;font-weight:400;color:var(--text);margin-bottom:0.3rem">${escapeHtml(label)} <span style="font-size:0.7rem;color:${hmColor(wt.avg)};font-weight:700">${wt.avg}% avg</span></div>`;
          sparklines += `<div style="display:flex;gap:2px;align-items:flex-end;height:28px">`;
          for (const val of wt.vals) {
            const h = Math.max(4, Math.round((val / 100) * 28));
            sparklines += `<div class="patience-spark-bar" style="width:${Math.max(12, Math.round(120 / wt.vals.length))}px;height:${h}px;background:${hmColor(val)};border-radius:2px 2px 0 0" title="${val}%"></div>`;
          }
          sparklines += `</div></div>`;
        }
        sparklines += `</div>`;
      }

      patienceTracking = `<div style="margin-top:1.5rem"><h3 style="margin-bottom:0.5rem">Patience Tracking</h3>${heatmap}${sparklines}</div>`;
    }
  }

  // ---- Think-Aloud Narratives ----
  let thinkAloudNarratives = '';
  if (ud && ud.think_aloud && ud.think_aloud.traces && ud.think_aloud.traces.length > 0) {
    thinkAloudNarratives = '<h2>Think-Aloud Narratives</h2>';

    const taTasks = extractState ? (extractState.tasks_to_be_done || []) : [];
    for (const trace of ud.think_aloud.traces) {
      const pName = escapeHtml(resolvePersonaName(personaNameMap, trace.persona));
      const outcome = escapeHtml(trace.outcome || '');
      const patience = trace.patience_end || 0;
      const patienceClass = patience > 60 ? 'ta-patience-high' : patience > 30 ? 'ta-patience-med' : 'ta-patience-low';
      const taTaskIdx = trace.task_index;
      const taTaskDef = taTaskIdx ? taTasks[taTaskIdx - 1] : null;
      const taTaskLabel = taTaskDef ? ` — Task ${taTaskIdx}: ${escapeHtml(taTaskDef.task)}` : (taTaskIdx ? ` — Task ${taTaskIdx}` : '');

      thinkAloudNarratives += `<details><summary>${pName}${taTaskLabel} — ${outcome}</summary>`;
      thinkAloudNarratives += `<p class="small muted">Patience: ${patience}% · Confusion: ${trace.confusion_events || 0} · CLI escapes: ${trace.cli_escapes || 0}</p>`;

      if (trace.response_strategies) {
        const rs = trace.response_strategies;
        thinkAloudNarratives += `<p class="small muted">Strategies: `;
        if (rs.guess_and_continue) thinkAloudNarratives += `<span class="ta-strategy ta-strategy-guess">${rs.guess_and_continue} guess</span> `;
        if (rs.help_seeking) thinkAloudNarratives += `<span class="ta-strategy ta-strategy-help">${rs.help_seeking} help</span> `;
        if (rs.abandon) thinkAloudNarratives += `<span class="ta-strategy ta-strategy-abandon">${rs.abandon} abandon</span> `;
        thinkAloudNarratives += `</p>`;
      }

      // Parse the think-aloud MD file for this persona+task if available
      const taFilePattern = taTaskIdx ? `${trace.persona}-task-${taTaskIdx}` : trace.persona;
      const taFile = taFiles.find(f => f.name.includes(taFilePattern)) || taFiles.find(f => f.name.includes(trace.persona));
      if (taFile && taFile.content) {
        const steps = parseTaSteps(taFile.content);
        for (const step of steps) {
          thinkAloudNarratives += renderTaStep(step);
        }
      }

      // Expected vs Actual
      if (trace.expected_vs_actual && trace.expected_vs_actual.length) {
        for (const ea of trace.expected_vs_actual) {
          thinkAloudNarratives += `<div class="ta-callout ta-callout-expected"><strong>Expected vs Actual (Step ${ea.step})</strong><br>Expected: ${escapeHtml(ea.expected)}<br>Actual: ${escapeHtml(ea.actual)}<br>Impact: ${escapeHtml(ea.impact)}</div>`;
        }
      }

      // Missing feedback
      if (trace.missing_feedback && trace.missing_feedback.length) {
        for (const mf of trace.missing_feedback) {
          thinkAloudNarratives += `<div class="ta-callout ta-callout-feedback"><strong>Missing Feedback (Step ${mf.step})</strong><br>${escapeHtml(mf.context)}</div>`;
        }
      }

      // Patience bar
      thinkAloudNarratives += `<div class="ta-patience ${patienceClass}"><span class="ta-patience-bar"><span class="ta-patience-fill" style="width:${patience}%"></span></span> ${patience}%</div>`;

      thinkAloudNarratives += `</details>`;
    }
  }

  // ---- Flagged HTML ----
  const flaggedRows = csvRows.filter(r => (r.verdict || '').toUpperCase() === 'FLAGGED');
  let flaggedHtml = '';
  if (flaggedRows.length) {
    let rows = '';
    let hasEmptyContext = false;
    for (const r of flaggedRows) {
      const rationale = r.rationale || '';
      const humanAction = r.human_action || '';
      if (!rationale && !humanAction) hasEmptyContext = true;
      const rationaleDisplay = rationale || '<span class="muted" style="font-style:italic">Review this criterion against the prototype directly</span>';
      const actionDisplay = humanAction || '<span class="muted" style="font-style:italic">Verify manually</span>';
      const expectedBehavior = extractExpectedBehavior(r.criterion_text || '');
      const shortText = expectedBehavior.length > 80
        ? escapeHtml(expectedBehavior.slice(0, 80)) + '&hellip;'
        : escapeHtml(expectedBehavior);
      rows += `<tr><td><strong>${escapeHtml(r.criterion_id)}</strong></td><td class="small">${shortText}</td><td>${escapeHtml(r.tier)}</td><td class="small">${rationaleDisplay}</td><td class="small">${actionDisplay}</td></tr>`;
      if ((r.criterion_text || '').length > 80) {
        rows += `<tr><td colspan="5" style="padding:0.25rem 1rem 0.75rem;background:var(--bg-secondary);border-top:none"><details><summary style="font-size:0.75rem;color:var(--link);cursor:pointer;font-weight:400">Full criterion</summary><p style="font-size:0.8125rem;line-height:1.6;color:var(--text);margin:0.5rem 0 0;white-space:pre-wrap">${escapeHtml(r.criterion_text)}</p></details></td></tr>`;
      }
    }
    let contextNote = '';
    if (hasEmptyContext) {
      contextNote = '<p style="font-size:0.75rem;color:var(--text-secondary);margin:0.75rem 0 0;font-style:italic">Flagged items could not be fully evaluated by the automated pipeline — they require human expertise to verify (e.g., comparing against an external reference, validating business logic, or confirming visual consistency with another system).</p>';
    }
    flaggedHtml = `<table class="tbl"><thead><tr><th>ID</th><th>Criterion</th><th>Tier</th><th>Why Flagged</th><th>Action Needed</th></tr></thead><tbody>${rows}</tbody></table>${contextNote}`;
  } else {
    flaggedHtml = '<p style="color:var(--status-success);font-size:0.875rem">&#10003; No items flagged for human review. All criteria were evaluable by the automated pipeline.</p>';
  }

  // ---- Methodology ----
  const methodologyFallback = `
    <p>Acceptance criteria are extracted from the Jira ticket and verified against the live prototype using Playwright (headless Chromium, 1920x900). Each AC gets a <strong>PASS</strong>, <strong>FAIL</strong>, or <strong>FLAGGED</strong> verdict with screenshot evidence. If criteria fail, the pipeline applies fixes and re-evaluates.</p>
    <p style="margin-top:0.5rem">Usability is scored by simulated personas who navigate the prototype independently, producing think-aloud traces and 7-dimension scores (0-3 each). Patience tracks frustration per task — confusion drains it, successful interactions recover it.</p>
  `;
  const methodologyHtml = methodologyFallback;

  // ---- Conclusion (generated from results) ----
  const personasEvaluated = ud ? (ud.personas_evaluated || []) : [];
  let conclusionHtml = '';
  if (passCount + failCount + flaggedCount > 0) {
    const total = passCount + failCount + flaggedCount;
    const passRate = Math.round((passCount / total) * 100);
    const iterLog = readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null);
    const iterations = iterLog ? (iterLog.iterations || []).length : 1;
    const fixCount = iterLog ? iterLog.total_criteria_fixed || 0 : 0;
    const concUsabilityRaw = ud ? ud.overall_score : null;
    const concMaxScore = (ud && ud.max_score) ? ud.max_score : (ud && ud.dimensions ? ud.dimensions.filter(d => isScoredDimension(d)).length * 3 || 21 : 21);
    const extractState = readJsonOr(path.join(absArtifacts, 'extract-state.json'), null);

    // Score bar with fraction (Decision 7: Fraction with Visual Bar)
    const barPct = Math.round((passCount / total) * 100);
    const barColor = barPct >= 70 ? 'var(--status-success)' : barPct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';

    conclusionHtml += `<div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1rem">`;
    conclusionHtml += `<div style="font-family:var(--font-heading);font-size:1.75rem;font-weight:700;color:${barColor};line-height:1">${passCount}/${total}</div>`;
    conclusionHtml += `<div style="flex:1;max-width:16rem"><div style="font-size:0.7rem;color:var(--text-secondary);font-family:var(--font-mono);margin-bottom:0.25rem">Criteria passing (${barPct}%)</div><div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${barPct}%;height:100%;background:${barColor};border-radius:3px;transition:width 0.4s ease"></div></div></div>`;
    if (concUsabilityRaw != null) {
      const scoreNum = typeof concUsabilityRaw === 'number' ? concUsabilityRaw : parseFloat(String(concUsabilityRaw));
      const usabilityPct = concMaxScore > 0 ? Math.round((scoreNum / concMaxScore) * 100) : 0;
      const usabilityBarColor = usabilityPct >= 70 ? 'var(--status-success)' : usabilityPct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
      conclusionHtml += `<div style="font-family:var(--font-heading);font-size:1.75rem;font-weight:700;color:${usabilityBarColor};line-height:1">${scoreNum}/${concMaxScore}</div>`;
      conclusionHtml += `<div style="flex:1;max-width:16rem"><div style="font-size:0.7rem;color:var(--text-secondary);font-family:var(--font-mono);margin-bottom:0.25rem">Usability score (${usabilityPct}%)</div><div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${usabilityPct}%;height:100%;background:${usabilityBarColor};border-radius:3px;transition:width 0.4s ease"></div></div></div>`;
    }
    conclusionHtml += `</div>`;

    conclusionHtml += `<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem">`;
    conclusionHtml += `Evaluated <strong style="color:var(--text)">${total} acceptance criteria</strong> from the Jira ticket`;
    if (extractState && extractState.rfe_key) conclusionHtml += ` (linked from RFE ${extractState.rfe_key})`;
    conclusionHtml += `.`;
    if (iterations > 1) conclusionHtml += ` Pipeline ran <strong style="color:var(--text)">${iterations} iterations</strong>, fixing ${fixCount} initially-failing criteria.`;
    conclusionHtml += `</p>`;

    // Decision 6: Contextual Action Cards — "What to do next"
    const actionCards = [];
    if (failCount > 0) {
      actionCards.push({ icon: SVG_ICON.timesCircle, color: 'var(--status-danger)', bg: 'rgba(201,25,11,0.06)', border: 'rgba(201,25,11,0.15)', label: `Fix ${failCount} failing criteria`, desc: 'Implementation attention needed before this prototype is reviewable.', link: '#ac-results' });
    }
    if (flaggedCount > 0) {
      actionCards.push({ icon: SVG_ICON.warning, color: 'var(--status-warning)', bg: 'rgba(240,171,0,0.06)', border: 'rgba(240,171,0,0.15)', label: `Review ${flaggedCount} flagged items`, desc: 'Human verification needed -- external references or backend logic.', link: '#flagged' });
    }
    const suggestions = readJsonOr(path.join(absArtifacts, 'refinement-suggestions.json'), []);
    const needsReview = Array.isArray(suggestions) ? suggestions.filter(s => !s.applied) : [];
    if (needsReview.length > 0) {
      actionCards.push({ icon: SVG_ICON.search, color: 'var(--link)', bg: 'rgba(0,102,204,0.04)', border: 'rgba(0,102,204,0.12)', label: `${needsReview.length} suggestions to review`, desc: 'Pipeline-generated fixes that need designer sign-off.', link: '#appendix-changes' });
    }
    if (concUsabilityRaw != null && ud && ud.dimensions) {
      const lowDims = ud.dimensions.filter(d => isScoredDimension(d) && numScore(d.composite_score) <= 1.5);
      if (lowDims.length) {
        actionCards.push({ icon: SVG_ICON.chartSearch, color: 'var(--link)', bg: 'rgba(0,102,204,0.04)', border: 'rgba(0,102,204,0.12)', label: `${lowDims.length} usability dimensions need attention`, desc: lowDims.map(d => d.name).join(', '), link: '#usability-dimensions' });
      }
    }

    if (actionCards.length) {
      conclusionHtml += `<div style="margin:1rem 0 1.25rem"><div style="font-size:0.7rem;font-weight:700;font-family:var(--font-mono);color:var(--text-secondary);margin-bottom:0.5rem">What to do next</div>`;
      conclusionHtml += `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:0.5rem">`;
      for (const card of actionCards) {
        conclusionHtml += `<a href="${card.link}" style="display:flex;align-items:flex-start;gap:0.6rem;padding:0.65rem 0.85rem;background:${card.bg};border:1px solid ${card.border};border-radius:0.5rem;text-decoration:none;transition:border-color 0.15s" onclick="if(this.getAttribute('href').startsWith('#appendix-')){switchAppendixTab(this.getAttribute('href').replace('#appendix-',''));return false}">`;
        conclusionHtml += `<span style="font-size:1rem;flex-shrink:0;margin-top:1px">${card.icon}</span>`;
        conclusionHtml += `<div><div style="font-size:0.8125rem;font-weight:700;color:${card.color}">${card.label}</div>`;
        conclusionHtml += `<div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.4;margin-top:0.1rem">${card.desc}</div></div></a>`;
      }
      conclusionHtml += `</div></div>`;
    } else {
      conclusionHtml += `<div style="margin:1rem 0;padding:0.65rem 0.85rem;background:rgba(62,134,53,0.06);border:1px solid rgba(62,134,53,0.15);border-radius:0.5rem">`;
      conclusionHtml += `<div style="font-size:0.8125rem;font-weight:700;color:var(--status-success)">${SVG_ICON.checkCircle} All clear — no actions needed</div>`;
      conclusionHtml += `<div style="font-size:0.75rem;color:var(--text-secondary);margin-top:0.1rem">All criteria pass and no items flagged for review.</div></div>`;
    }

    // Strengths & weaknesses grid
    if (concUsabilityRaw != null && ud.dimensions) {
      const lowDims = ud.dimensions.filter(d => isScoredDimension(d) && numScore(d.composite_score) <= 1.5);
      const highDims = ud.dimensions.filter(d => isScoredDimension(d) && numScore(d.composite_score) >= 2.5);
      if (lowDims.length || highDims.length) {
        conclusionHtml += `<div style="margin-top:0.75rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem">`;
        if (highDims.length) {
          conclusionHtml += `<div><p class="small" style="font-weight:700;color:var(--status-success);margin:0 0 0.25rem">Strengths</p>`;
          conclusionHtml += `<ul class="small" style="margin:0;padding-left:1rem">`;
          for (const d of highDims) {
            const finding = d.scores ? Object.values(d.scores).map(s => s.finding).filter(Boolean)[0] : '';
            conclusionHtml += `<li><strong>${escapeHtml(d.name)}</strong> (${d.composite_score}/3)`;
            if (finding) conclusionHtml += `<br><span class="muted" style="font-size:0.75rem">${escapeHtml(finding.slice(0, 120))}</span>`;
            conclusionHtml += `</li>`;
          }
          conclusionHtml += `</ul></div>`;
        }
        if (lowDims.length) {
          conclusionHtml += `<div><p class="small" style="font-weight:700;color:var(--status-danger);margin:0 0 0.25rem">Needs Improvement</p>`;
          conclusionHtml += `<ul class="small" style="margin:0;padding-left:1rem">`;
          for (const d of lowDims) {
            const finding = d.scores ? Object.values(d.scores).map(s => s.finding).filter(Boolean)[0] : '';
            conclusionHtml += `<li><strong>${escapeHtml(d.name)}</strong> (${d.composite_score}/3)`;
            if (finding) conclusionHtml += `<br><span class="muted" style="font-size:0.75rem">${escapeHtml(finding.slice(0, 120))}</span>`;
            conclusionHtml += `</li>`;
          }
          conclusionHtml += `</ul></div>`;
        }
        conclusionHtml += `</div>`;
      }

      if (personasEvaluated.length) {
        conclusionHtml += `<p class="small muted" style="margin-top:1rem">Usability tested with: ${personasEvaluated.map(p => resolvePersonaName(personaNameMap, p)).join(', ')}</p>`;
      }
    }
  } else if (ud && ud.dimensions) {
    const concUsabilityRaw = ud.overall_score;
    const concMaxScore = ud.max_score ? ud.max_score : ud.dimensions.filter(d => isScoredDimension(d)).length * 3 || 21;

    if (concUsabilityRaw != null) {
      const scoreNum = typeof concUsabilityRaw === 'number' ? concUsabilityRaw : parseFloat(String(concUsabilityRaw));
      const usabilityPct = concMaxScore > 0 ? Math.round((scoreNum / concMaxScore) * 100) : 0;
      const usabilityBarColor = usabilityPct >= 70 ? 'var(--status-success)' : usabilityPct >= 40 ? 'var(--status-warning)' : 'var(--status-danger)';
      conclusionHtml += `<div style="display:flex;align-items:center;gap:1.25rem;margin-bottom:1rem">`;
      conclusionHtml += `<div style="font-family:var(--font-heading);font-size:1.75rem;font-weight:700;color:${usabilityBarColor};line-height:1">${scoreNum}/${concMaxScore}</div>`;
      conclusionHtml += `<div style="flex:1;max-width:16rem"><div style="font-size:0.7rem;color:var(--text-secondary);font-family:var(--font-mono);margin-bottom:0.25rem">Usability score (${usabilityPct}%)</div><div style="height:6px;background:var(--border);border-radius:3px;overflow:hidden"><div style="width:${usabilityPct}%;height:100%;background:${usabilityBarColor};border-radius:3px;transition:width 0.4s ease"></div></div></div>`;
      conclusionHtml += `</div>`;
    }

    conclusionHtml += `<p style="font-size:0.875rem;color:var(--text-secondary);margin:0 0 0.75rem">AC verdicts not yet recorded. Usability evaluation completed with <strong style="color:var(--text)">${personasEvaluated.length} persona${personasEvaluated.length !== 1 ? 's' : ''}</strong>.</p>`;

    const lowDims = ud.dimensions.filter(d => isScoredDimension(d) && numScore(d.composite_score) <= 1.5);
    const highDims = ud.dimensions.filter(d => isScoredDimension(d) && numScore(d.composite_score) >= 2.5);
    if (lowDims.length || highDims.length) {
      conclusionHtml += `<div style="margin-top:0.75rem;display:grid;grid-template-columns:1fr 1fr;gap:1rem">`;
      if (highDims.length) {
        conclusionHtml += `<div><p class="small" style="font-weight:700;color:var(--status-success);margin:0 0 0.25rem">Strengths</p>`;
        conclusionHtml += `<ul class="small" style="margin:0;padding-left:1rem">`;
        for (const d of highDims) {
          const finding = d.scores ? Object.values(d.scores).map(s => s.finding).filter(Boolean)[0] : '';
          conclusionHtml += `<li><strong>${escapeHtml(d.name)}</strong> (${d.composite_score}/3)`;
          if (finding) conclusionHtml += `<br><span class="muted" style="font-size:0.75rem">${escapeHtml(finding.slice(0, 120))}</span>`;
          conclusionHtml += `</li>`;
        }
        conclusionHtml += `</ul></div>`;
      }
      if (lowDims.length) {
        conclusionHtml += `<div><p class="small" style="font-weight:700;color:var(--status-danger);margin:0 0 0.25rem">Needs improvement</p>`;
        conclusionHtml += `<ul class="small" style="margin:0;padding-left:1rem">`;
        for (const d of lowDims) {
          const finding = d.scores ? Object.values(d.scores).map(s => s.finding).filter(Boolean)[0] : '';
          conclusionHtml += `<li><strong>${escapeHtml(d.name)}</strong> (${d.composite_score}/3)`;
          if (finding) conclusionHtml += `<br><span class="muted" style="font-size:0.75rem">${escapeHtml(finding.slice(0, 120))}</span>`;
          conclusionHtml += `</li>`;
        }
        conclusionHtml += `</ul></div>`;
      }
      conclusionHtml += `</div>`;
    }

    if (personasEvaluated.length) {
      conclusionHtml += `<p class="small muted" style="margin-top:1rem">Usability tested with: ${personasEvaluated.map(p => resolvePersonaName(personaNameMap, p)).join(', ')}</p>`;
    }
  } else {
    conclusionHtml = '<p>No evaluation data available.</p>';
  }

  // ---- CSV data for download (full 3-section format) ----
  const fullCsv = buildFullCsv(csvRaw, journeyLog, passCount, failCount, flaggedCount, extractState);
  const csvDataEscaped = fullCsv.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');

  // Build link URLs
  const rfeKey = (extractState && extractState.rfe_key) || '';
  const rfeUrl = rfeKey ? `https://issues.redhat.com/browse/${rfeKey}` : jiraUrl;

  // Prototype URL — use the URL that was actually tested (local or hosted)
  const protoRepoUrl = (journeyLog && journeyLog.prototype_url)
    ? journeyLog.prototype_url
    : (extractState && extractState.breadcrumb && extractState.breadcrumb.prototype && extractState.breadcrumb.prototype.url)
      ? extractState.breadcrumb.prototype.url
      : 'http://localhost:8080';

  const gitlabBase = 'https://gitlab.cee.redhat.com/uxd/prototypes/rhoai';
  const mrNumber = readKnownMRs()[protoId];
  const mrUrl = mrNumber
    ? `${gitlabBase}/-/merge_requests/${mrNumber}`
    : `${gitlabBase}/-/merge_requests`;
  const protoDeployUrl = mrNumber
    ? `https://rhoai-5171de.pages.redhat.com/mr-${mrNumber}/`
    : prototypeUrl;

  const isTitleUseful = (v) => v && v !== 'eval' && v !== protoId && v.length > 3;
  const reportTitle = (extractState && (
    (isTitleUseful(extractState.ticket_summary) && extractState.ticket_summary) ||
    (isTitleUseful(extractState.title) && extractState.title) ||
    (isTitleUseful(extractState.story_title) && extractState.story_title)
  )) || (extractState && extractState.key) || protoId;

  return {
    '{{PROTOTYPE_ID}}': protoId,
    '{{REPORT_TITLE}}': reportTitle,
    '{{ARTIFACTS_PATH}}': absArtifacts,
    '{{JIRA_URL}}': jiraUrl,
    '{{RFE_URL}}': rfeUrl,
    '{{PROTOTYPE_REPO_URL}}': protoRepoUrl,
    '{{MR_URL}}': mrUrl,
    '{{STATUS_SECTION_HTML}}': buildHeroStatus(csvRows, passCount, failCount, flaggedCount, extractState, readJsonOr(path.join(absArtifacts, 'iteration-log.json'), null)),
    '{{AC_TABLE_ROWS_JIRA}}': acTableRowsJira,
    '{{AC_TABLE_ROWS_INFERRED}}': acTableRowsInferred,
    '{{AC_JIRA_COUNT}}': String(acJiraCount),
    '{{INFERRED_CHECKS_DISPLAY}}': inferredRows.length ? '' : 'display:none',
    '{{METHODOLOGY_HTML}}': methodologyHtml,
    '{{USABILITY_TABLE}}': usabilityTable,
    '{{PATIENCE_TRACKING}}': patienceTracking,
    '{{FLAGGED_HTML}}': flaggedHtml,
    '{{CONCLUSION_HTML}}': conclusionHtml,
    '{{CSV_DATA}}': csvDataEscaped,
    '{{FLAGGED_DATA}}': buildFlaggedDataArray(csvRows, journeyLog, screenshots),
    '{{PERSONA_SELECTION_HTML}}': buildPersonaSelectionHtml(),
    '{{PERSONA_WALKTHROUGHS_HTML}}': buildPersonaWalkthroughsHtml(),
    '{{PERSONA_WALKTHROUGH_DATA}}': buildPersonaWalkthroughData(),
    '{{EVIDENCE_VIEWER_DATA}}': JSON.stringify(buildEvidenceViewerData()),
    '{{FIXES_APPLIED_HTML}}': buildFixesAppliedHtml(),
    '{{CONSISTENCY_HTML}}': buildConsistencyHtml(),
    '{{CHANGES_TAB_HTML}}': buildChangesTabHtml(),
    '{{JOURNEYS_TAB_DISPLAY}}': (journeyLog && (journeyLog.journeys || []).length > 0) ? '' : 'display:none',
    '{{USABILITY_TAB_DISPLAY}}': (ud && ud.dimensions && ud.dimensions.length > 0) ? '' : 'display:none',
    '{{CHANGES_TAB_DISPLAY}}': '',
    '{{FIX_HISTORY_NARRATIVE}}': buildFixHistoryNarrative(),
    '{{COMPLIANCE_NARRATIVE}}': buildComplianceNarrative(),
    '{{OUTCOME_DISPLAY}}': outcomeContext ? '' : 'display:none',
    '{{OUTCOME_LINK_URL}}': outcomeContext ? jiraUrlForKey(outcomeContext.key || outcomeContext.outcome_key) : '',
    '{{EXEC_SUMMARY_HTML}}': buildTabbedExecSummary()
  };
}

// ---------------------------------------------------------------------------
// Parse think-aloud markdown into step objects
// ---------------------------------------------------------------------------

function parseTaSteps(md) {
  const steps = [];

  // Support two heading formats:
  // Format A: "### STEP 1 — Title" (markdown heading with dash separator)
  // Format B: "STEP 1:" (plain text, no heading)
  // Format C: "## STEP 1:" (h2 heading without dash separator)
  const formatA = /^###\s+STEP\s+(\d+)\s*[—–-]\s*(.+)$/gm;
  const formatB = /^STEP\s+(\d+):\s*$/gm;
  const formatC = /^##\s+STEP\s+(\d+):\s*$/gm;

  let match;
  const positions = [];
  const useFormatA = formatA.test(md);
  formatA.lastIndex = 0;
  const useFormatC = !useFormatA && formatC.test(md);
  formatC.lastIndex = 0;

  const regex = useFormatA ? formatA : (useFormatC ? formatC : formatB);
  while ((match = regex.exec(md)) !== null) {
    positions.push({
      index: match.index,
      num: match[1],
      title: useFormatA ? match[2] : '',
      fullMatch: match[0]
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index + positions[i].fullMatch.length;
    const end = i + 1 < positions.length ? positions[i + 1].index : md.length;
    const body = md.slice(start, end).trim();

    // Support both "**What I see**:" (bold) and "What I see:" (plain)
    const seeMatch = body.match(/\*?\*?What I see\*?\*?:\s*([\s\S]*?)(?=\n-?\s*\*?\*?What|\n###|\n---|\nSTEP|\n\n>|$)/i);
    const thinkMatch = body.match(/\*?\*?What I'm thinking\*?\*?:\s*([\s\S]*?)(?=\n-?\s*\*?\*?What|\n###|\n---|\nSTEP|\n\n>|$)/i);
    const tryMatch = body.match(/\*?\*?What I'll try\*?\*?:\s*([\s\S]*?)(?=\n-?\s*\*?\*?|\n###|\n---|\nSTEP|\n\n>|$)/i);
    const confMatch = body.match(/\*?\*?Confidence\*?\*?:\s*(.*)/i);
    const patMatch = body.match(/\*?\*?Patience\*?\*?:\s*(\d+)%/i);

    const confusions = [];
    const expectedActuals = [];
    const missingFeedback = [];
    const strategies = [];

    const confusionRegex = />\s*\*\*Confusion\*\*\s*[—–-]\s*([\s\S]*?)(?=\n>|\n\n|\n###|\n---|$)/g;
    let cm;
    while ((cm = confusionRegex.exec(body)) !== null) {
      confusions.push(cm[1].trim());
    }

    const eaRegex = />\s*\*\*Expected vs Actual\*\*\s*[—–-]\s*([\s\S]*?)(?=\n>|\n\n|\n###|\n---|$)/g;
    while ((cm = eaRegex.exec(body)) !== null) {
      expectedActuals.push(cm[1].trim());
    }

    const mfRegex = />\s*\*\*Missing feedback\*\*\s*[—–-]\s*([\s\S]*?)(?=\n>|\n\n|\n###|\n---|$)/g;
    while ((cm = mfRegex.exec(body)) !== null) {
      missingFeedback.push(cm[1].trim());
    }

    const stratRegex = /ta-strategy-(\w+)/g;
    while ((cm = stratRegex.exec(body)) !== null) {
      strategies.push(cm[1]);
    }

    steps.push({
      num: positions[i].num,
      title: positions[i].title,
      see: seeMatch ? seeMatch[1].trim() : '',
      think: thinkMatch ? thinkMatch[1].trim() : '',
      trying: tryMatch ? tryMatch[1].trim() : '',
      confidence: confMatch ? confMatch[1].replace(/<[^>]+>/g, '').trim().toLowerCase() : '',
      patience: patMatch ? parseInt(patMatch[1], 10) : null,
      confusions,
      expectedActuals,
      missingFeedback,
      strategies
    });
  }

  return steps;
}

function renderTaStep(step) {
  const pClass = step.patience !== null
    ? (step.patience > 60 ? 'ta-patience-high' : step.patience > 30 ? 'ta-patience-med' : 'ta-patience-low')
    : '';

  const confClass = step.confidence.includes('high') ? 'ta-confidence-high'
    : step.confidence.includes('none') ? 'ta-confidence-none'
    : 'ta-confidence-low';

  let html = `<div class="ta-step">`;
  html += `<div class="ta-step-head">Step ${step.num} — ${escapeHtml(step.title)}</div>`;

  // Interleaved timeline: See / Think / Action
  const hasTa = step.see || step.think || step.trying;
  if (hasTa) {
    html += `<div class="ta-timeline">`;
    if (step.see) {
      html += `<div class="ta-timeline-row"><span class="ta-timeline-dot ta-timeline-dot-see"></span><span class="ta-timeline-label ta-timeline-label-see">See</span><span class="ta-timeline-text">${escapeHtml(step.see.substring(0, 400))}${step.see.length > 400 ? '...' : ''}</span></div>`;
    }
    if (step.think) {
      html += `<div class="ta-timeline-row"><span class="ta-timeline-dot ta-timeline-dot-think"></span><span class="ta-timeline-label ta-timeline-label-think">Think</span><span class="ta-timeline-text">${escapeHtml(step.think.substring(0, 400))}${step.think.length > 400 ? '...' : ''}</span></div>`;
    }
    if (step.trying) {
      html += `<div class="ta-timeline-row"><span class="ta-timeline-dot ta-timeline-dot-action"></span><span class="ta-timeline-label ta-timeline-label-action">Action</span><span class="ta-timeline-text">${escapeHtml(step.trying.substring(0, 400))}${step.trying.length > 400 ? '...' : ''}</span></div>`;
    }
    html += `</div>`;
  }

  html += `<div style="display:flex;gap:1rem;align-items:center;margin-top:0.35rem">`;
  if (step.confidence) {
    html += `<span class="ta-confidence ${confClass}">${escapeHtml(step.confidence)}</span>`;
  }
  if (step.patience !== null) {
    html += `<span class="ta-patience ${pClass}"><span class="ta-patience-bar"><span class="ta-patience-fill" style="width:${step.patience}%"></span></span> ${step.patience}%</span>`;
  }
  html += `</div>`;

  for (const c of step.confusions) {
    const stratMatch = step.strategies.length ? step.strategies.shift() : '';
    html += `<div class="ta-callout ta-callout-confusion"><strong>Confusion</strong> — ${escapeHtml(c)}`;
    if (stratMatch) html += ` <span class="ta-strategy ta-strategy-${stratMatch}">${stratMatch}</span>`;
    html += `</div>`;
  }

  for (const ea of step.expectedActuals) {
    html += `<div class="ta-callout ta-callout-expected"><strong>Expected vs Actual</strong> — ${escapeHtml(ea)}</div>`;
  }

  for (const mf of step.missingFeedback) {
    html += `<div class="ta-callout ta-callout-feedback"><strong>Missing Feedback</strong> — ${escapeHtml(mf)}</div>`;
  }

  html += `</div>`;
  return html;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function renderTemplate(tokens) {
  let template = fs.readFileSync(templatePath, 'utf8');
  for (const [token, value] of Object.entries(tokens)) {
    template = template.split(token).join(value);
  }
  template = template.replace(/\{\{[A-Z_]+\}\}/g, '');
  return template;
}

function main() {
  if (!fs.existsSync(templatePath)) {
    console.error(`Template not found: ${templatePath}`);
    process.exit(1);
  }

  // Pre-normalize journey-log.json in place to fix common schema drift
  const jlPath = path.join(absArtifacts, 'journey-log.json');
  const jlRaw = readJsonOr(jlPath, null);
  if (jlRaw) {
    const normalized = normalizeJourneyLog(jlRaw, absArtifacts);
    if (normalized.usability_dimensions) {
      normalizeUsabilityDimensions(normalized.usability_dimensions);
    }
    fs.writeFileSync(jlPath, JSON.stringify(normalized, null, 2), 'utf8');
  }

  const tokens = buildTokens();
  const template = renderTemplate(tokens);

  const outPath = path.join(absArtifacts, 'evaluation-report.html');
  fs.writeFileSync(outPath, template, 'utf8');
  console.log(`✓ Report written to ${outPath}`);
  console.log(`  Size: ${(Buffer.byteLength(template) / 1024).toFixed(0)} KB`);

  // Write agent-readable summary JSON
  const summary = buildSummaryJson();
  const summaryPath = path.join(absArtifacts, 'evaluation-summary.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8');
  console.log(`  ✓ Summary: ${summaryPath}`);

  // Sanity check: verify hero stat in HTML matches CSV verdicts
  const csvRaw = readFileOr(path.join(absArtifacts, 'evaluation-report.csv'), '');
  const csvLines = csvRaw.split('\n').filter(l => l && !l.startsWith('#') && !l.startsWith('criterion_id') && !l.startsWith('dimension_id') && !l.startsWith('metric') && !l.startsWith('persona'));
  const csvPassCount = csvLines.filter(l => l.includes(',PASS,')).length;
  const csvFailCount = csvLines.filter(l => l.includes(',FAIL,')).length;
  const csvFlaggedCount = csvLines.filter(l => l.includes(',FLAGGED,')).length;
  const csvTotal = csvPassCount + csvFailCount + csvFlaggedCount;
  const heroMatch = template.match(/(\d+)\/(\d+)/);
  if (heroMatch && csvTotal > 0) {
    const htmlPass = parseInt(heroMatch[1], 10);
    const htmlTotal = parseInt(heroMatch[2], 10);
    if (htmlPass !== csvPassCount || htmlTotal !== csvTotal) {
      console.error(`  ⚠ SANITY CHECK: HTML hero shows ${htmlPass}/${htmlTotal} but CSV has ${csvPassCount}/${csvTotal} (${csvPassCount}P/${csvFailCount}F/${csvFlaggedCount}FL)`);
    }
  }

}

main();
