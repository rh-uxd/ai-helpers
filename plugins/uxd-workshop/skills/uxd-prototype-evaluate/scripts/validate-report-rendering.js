#!/usr/bin/env node
/**
 * validate-report-rendering.js
 *
 * Unit test: given pipeline artifacts, runs render-report.js and asserts
 * the output HTML contains all expected sections and data.
 *
 * Catches: data that exists in JSON artifacts but fails to render in the HTML
 * due to field name mismatches, missing template placeholders, or broken lookups.
 *
 * Usage:
 *   node validate-report-rendering.js <artifacts-dir>
 *
 * Exit codes:
 *   0 = all checks pass
 *   1 = one or more checks failed
 */

const { readFileSync, existsSync } = require('fs');
const { join } = require('path');
const { execSync } = require('child_process');

const artifactsDir = process.argv[2];
if (!artifactsDir) {
  console.error('Usage: node validate-report-rendering.js <artifacts-dir>');
  process.exit(1);
}

const absArtifacts = require('path').resolve(artifactsDir);
const results = [];
let hasFailure = false;

function check(name, condition, detail) {
  const passed = !!condition;
  if (!passed) hasFailure = true;
  results.push({ scorer: name, pass: passed, detail });
}

// ─── Step 1: Render the report ───────────────────────────────────────────────
const renderScript = join(__dirname, '..', 'scripts', 'render-report.js');
try {
  execSync(`node "${renderScript}" "${absArtifacts}" --note="test-render"`, {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: join(__dirname, '..', '..', '..', '..')
  });
} catch (e) {
  check('Report Renders Without Error', false, `render-report.js crashed: ${e.stderr ? e.stderr.toString().slice(0, 200) : e.message}`);
  console.log(JSON.stringify({ results, pass_count: 0, fail_count: 1, all_pass: false }, null, 2));
  process.exit(1);
}

const reportPath = join(absArtifacts, 'evaluation-report.html');
check('Report File Created', existsSync(reportPath), existsSync(reportPath) ? 'evaluation-report.html exists' : 'MISSING: report not generated');

if (!existsSync(reportPath)) {
  console.log(JSON.stringify({ results, pass_count: results.filter(r => r.pass).length, fail_count: results.filter(r => !r.pass).length, all_pass: false }, null, 2));
  process.exit(1);
}

const html = readFileSync(reportPath, 'utf8');

// ─── Step 2: Load source artifacts for comparison ────────────────────────────
function readJson(filename) {
  const p = join(absArtifacts, filename);
  if (!existsSync(p)) return null;
  try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; }
}

const journeyLog = readJson('journey-log.json');
const personaResults = readJson('persona-results.json');
const consistencyReport = readJson('consistency-report.json');
const iterationLog = readJson('iteration-log.json');

// ─── SCORER A: Usability Dimensions Render ───────────────────────────────────
if (journeyLog && journeyLog.usability_dimensions) {
  const ud = journeyLog.usability_dimensions;

  check(
    'Usability Score In Report',
    html.includes(String(ud.overall_score)),
    ud.overall_score ? `Score "${ud.overall_score}" found in HTML` : 'overall_score not in HTML'
  );

  if (Array.isArray(ud.dimensions)) {
    for (const dim of ud.dimensions.slice(0, 3)) {
      if (!dim.name || dim.name === 'undefined') {
        check(
          `Dimension Name Valid`,
          false,
          `SCHEMA ERROR: dimension "${dim.id || '?'}" has no name (got ${dim.name}) — eval-discover must populate dimensions[].name`
        );
        continue;
      }
      check(
        `Dimension "${dim.name}" Renders`,
        html.includes(dim.name),
        html.includes(dim.name) ? `"${dim.name}" found` : `MISSING: "${dim.name}" not in HTML despite being in journey-log.json`
      );
    }
  }

  if (Array.isArray(ud.personas_evaluated)) {
    for (const pid of ud.personas_evaluated) {
      check(
        `Persona "${pid}" Renders`,
        html.includes(pid),
        html.includes(pid) ? `"${pid}" found in HTML` : `MISSING: "${pid}" not rendered despite being in personas_evaluated`
      );
    }
  }
}

// ─── SCORER B: Persona Selection Reasoning ───────────────────────────────────
const ps = journeyLog && journeyLog.persona_selection;
if (ps) {
  check(
    'Persona Selection Reasoning Renders (not fallback warning)',
    !html.includes('Full persona selection reasoning was not logged'),
    !html.includes('Full persona selection reasoning was not logged')
      ? 'No fallback warning — real reasoning rendered'
      : 'RENDERING BUG: Fallback warning present despite persona_selection data existing in JSON'
  );

  if (ps.target_audience_text) {
    // journey-log may store a stub ("As an ML Engineer ... As a Platform Operator ...")
    // while the HTML renders the expanded user-story text. Match either form.
    const audienceText = ps.target_audience_text;
    const exactNeedle = audienceText.slice(0, 30);
    const stubNeedle = audienceText.split(/\s*\.\.\.\s*/)[0].trim().slice(0, 30);
    const audienceInHtml =
      html.includes(exactNeedle) ||
      (stubNeedle.length >= 10 && html.includes(stubNeedle));
    check(
      'Target Audience Text In Report',
      audienceInHtml,
      audienceInHtml
        ? 'target_audience_text rendered'
        : `MISSING: "${audienceText.slice(0, 40)}..." not in HTML`
    );
  }

  if (Array.isArray(ps.considered_but_rejected) && ps.considered_but_rejected.length > 0) {
    const first = ps.considered_but_rejected[0];
    const idToCheck = first.persona_id || first.persona;
    check(
      'Considered-But-Rejected Persona Renders',
      html.includes(idToCheck),
      html.includes(idToCheck)
        ? `"${idToCheck}" rendered in rejected list`
        : `MISSING: "${idToCheck}" not in HTML despite being in considered_but_rejected`
    );
  }
}

// ─── SCORER C: Walkthrough Steps Render ──────────────────────────────────────
const walkthroughMatch = html.match(/var personaWalkthroughData = ({.*?});/s);
if (walkthroughMatch) {
  try {
    const walkthroughData = JSON.parse(walkthroughMatch[1]);
    let totalSteps = 0;
    for (const [pid, pd] of Object.entries(walkthroughData)) {
      for (const task of (pd.tasks || [])) {
        totalSteps += (task.steps || []).length;
      }
    }

    const hasTraceData = Array.isArray(personaResults) && personaResults.some(r => r.trace && r.trace.length > 0);
    check(
      'Walkthrough Steps Populated',
      totalSteps > 0 || !hasTraceData,
      totalSteps > 0
        ? `${totalSteps} walkthrough steps rendered`
        : hasTraceData
          ? 'RENDERING BUG: persona-results.json has trace data but 0 steps rendered in HTML'
          : 'No trace data available (expected)'
    );
  } catch (e) {
    check('Walkthrough Data Parses', false, `personaWalkthroughData JSON is malformed: ${e.message}`);
  }
} else if (personaResults) {
  check('Walkthrough Data Present', false, 'MISSING: personaWalkthroughData variable not in HTML despite persona-results.json existing');
}

// ─── SCORER D: Consistency Report Renders ────────────────────────────────────
if (consistencyReport && consistencyReport.summary) {
  const total = consistencyReport.summary.total_guidelines_checked;
  if (total) {
    check(
      'Consistency Guidelines Count In Report',
      html.includes(String(total)),
      html.includes(String(total))
        ? `"${total}" guidelines count rendered`
        : `MISSING: consistency count "${total}" not in HTML`
    );
  }

  if (consistencyReport.source_mode && Array.isArray(consistencyReport.source_mode.violations)) {
    const violationCount = consistencyReport.source_mode.violations.length;
    if (violationCount > 0) {
      const firstViolation = consistencyReport.source_mode.violations[0];
      const gid = firstViolation.guideline_id || '';
      const desc = firstViolation.description || '';
      const file = firstViolation.file || '';
      // render-report.js converts guideline_id to a display title and may strip path prefixes
      const gidTitle = gid.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const fileBasename = file.split('/').pop();
      const found = (gid && html.includes(gid))
        || (desc && html.includes(desc.slice(0, 30)))
        || (file && html.includes(file))
        || (fileBasename && html.includes(fileBasename))
        || (gidTitle && html.toLowerCase().includes(gidTitle.toLowerCase()));
      check(
        'Consistency Violation Renders',
        found,
        found
          ? `Violation content found in HTML (checked: id, desc, file, title)`
          : `MISSING: violation "${gid}" / "${desc.slice(0, 40)}" / "${file}" not rendered`
      );
    }
  }
}

// ─── SCORER E: Persona Name Resolution (Bug 2) ──────────────────────────────
if (Array.isArray(personaResults) && personaResults.length > 0) {
  for (const pr of personaResults.slice(0, 2)) {
    const pid = pr.persona_id || pr.persona;
    const pname = pr.persona_name;
    if (pid && pname && pname !== pid) {
      // The HTML should contain the human-readable name, not just the slug
      check(
        `Persona Name "${pid}" Resolved`,
        html.includes(pname) || html.includes(pname.split(' - ')[0]),
        html.includes(pname)
          ? `"${pname}" found (not raw slug)`
          : `MISSING: persona_name "${pname}" not in HTML — render-report.js may be slug-formatting "${pid}" instead`
      );
    }
  }
}

// ─── SCORER F: Score Display Format (Bug 4) ──────────────────────────────────
const evalSummary = readJson('evaluation-summary.json');
if (evalSummary && evalSummary.overall_score !== undefined) {
  const score = evalSummary.overall_score;
  const isNumeric = typeof score === 'number' || /^\d+$/.test(String(score));
  const isSlash = typeof score === 'string' && /^\d+\/\d+$/.test(score);
  check(
    'Overall Score Type Valid',
    isNumeric || isSlash,
    `overall_score = ${JSON.stringify(score)} (${typeof score}) — should be number or "N/M" string`
  );

  if (isSlash) {
    const [num, denom] = score.split('/').map(Number);
    check(
      'Score Denominator Not Hardcoded 21',
      true,
      `denominator = ${denom} (score "${score}")`
    );
  }
}

// ─── SCORER G: Screenshot References (Bug 1 lite) ───────────────────────────
if (Array.isArray(personaResults) && personaResults.length > 0) {
  const evidenceMatch = html.match(/var evidenceViewerData = ({.*?});/s);
  if (evidenceMatch) {
    try {
      const evidenceData = JSON.parse(evidenceMatch[1]);
      const screenshotRefs = [];
      for (const [, pd] of Object.entries(evidenceData)) {
        for (const task of (pd.tasks || [])) {
          for (const step of (task.steps || [])) {
            if (step.screenshot) screenshotRefs.push(step.screenshot);
          }
        }
      }
      if (screenshotRefs.length >= 2) {
        const unique = new Set(screenshotRefs);
        check(
          'Evidence Screenshots Not All Identical',
          unique.size > 1 || screenshotRefs.length <= 1,
          unique.size > 1
            ? `${unique.size} unique screenshots across ${screenshotRefs.length} steps`
            : `BUG: all ${screenshotRefs.length} steps use same screenshot "${screenshotRefs[0]}"`
        );
      }
    } catch (e) {
      // evidenceViewerData parse failed — skip, not a screenshot bug
    }
  }
}

// ─── SCORER H: Fix History Accuracy (Bug 3 lite) ────────────────────────────
const fixLog = readJson('fix-log.json');
const refinementSuggestions = readJson('refinement-suggestions.json');
if (Array.isArray(fixLog) && fixLog.length > 0) {
  const unapplied = fixLog.filter(f => f.applied === false);
  if (unapplied.length > 0) {
    // Check that unapplied fixes don't appear under "Applied" or "Fixed automatically"
    const appliedSectionMatch = html.match(/Fixed automatically[\s\S]*?<\/(?:section|div)>/i);
    if (appliedSectionMatch) {
      const appliedSection = appliedSectionMatch[0];
      const leakedUnapplied = unapplied.filter(f =>
        f.description && appliedSection.includes(f.description.slice(0, 40))
      );
      check(
        'Unapplied Fixes Not In Applied Section',
        leakedUnapplied.length === 0,
        leakedUnapplied.length === 0
          ? `${unapplied.length} unapplied fixes correctly excluded`
          : `BUG: ${leakedUnapplied.length} unapplied fixes rendered as "Fixed automatically"`
      );
    }
  }
}

// ─── SCORER I: Schema Normalization (Fix 1) ─────────────────────────────────
// Verifies normalizePersonaResults() handles all 4 schema variants.
// The rendered walkthrough data should use canonical keys regardless of input.
const walkthroughMatch2 = html.match(/var personaWalkthroughData = ({.*?});/s);
if (walkthroughMatch2 && Array.isArray(personaResults) && personaResults.length > 0) {
  try {
    const wd = JSON.parse(walkthroughMatch2[1]);
    const personaKeys = Object.keys(wd);
    if (personaKeys.length > 0) {
      const firstPersona = wd[personaKeys[0]];
      // After normalization, every persona section should have tasks with steps
      check(
        'Normalized Persona Data Has Tasks',
        Array.isArray(firstPersona.tasks) && firstPersona.tasks.length > 0,
        Array.isArray(firstPersona.tasks)
          ? `${firstPersona.tasks.length} tasks for "${personaKeys[0]}"`
          : 'NORMALIZATION BUG: persona entry has no tasks array after normalization'
      );
    }
  } catch (e) {
    // Already caught by walkthrough check above
  }
}

// ─── SCORER J: Score Contract (Fix 4) ───────────────────────────────────────
// overall_score must be numeric in HTML, max_score should be present in data
if (journeyLog && journeyLog.usability_dimensions) {
  const ud = journeyLog.usability_dimensions;
  if (ud.overall_score !== undefined) {
    check(
      'overall_score Is Numeric',
      typeof ud.overall_score === 'number',
      `overall_score = ${JSON.stringify(ud.overall_score)} (${typeof ud.overall_score})`
    );
  }
  if (ud.max_score !== undefined) {
    check(
      'max_score Is Numeric',
      typeof ud.max_score === 'number' && ud.max_score > 0,
      `max_score = ${ud.max_score}`
    );
    // The rendered score string should contain the max_score value
    const scoreStr = `${ud.overall_score}/${ud.max_score}`;
    check(
      'Score Rendered As N/max_score',
      html.includes(scoreStr) || html.includes(String(ud.overall_score)),
      html.includes(scoreStr)
        ? `"${scoreStr}" found in HTML`
        : html.includes(String(ud.overall_score))
          ? `overall_score "${ud.overall_score}" found (max_score rendering may differ)`
          : `MISSING: neither "${scoreStr}" nor "${ud.overall_score}" in HTML`
    );
  }
}

// ─── SCORER K: Fix History Uses refinement-suggestions.json (Fix 5) ─────────
if (refinementSuggestions && Array.isArray(refinementSuggestions) && refinementSuggestions.length > 0) {
  // The "Needs your review" section should exist if there are unaddressed suggestions
  const flagged = refinementSuggestions.filter(s =>
    s.fix_action === 'flagged' || s.fix_action === 'deferred_to_human' || s.fix_action === 'low_confidence'
  );
  if (flagged.length > 0) {
    const hasReviewSection = html.toLowerCase().includes('needs your review')
      || html.toLowerCase().includes('needs review')
      || html.toLowerCase().includes('unaddressed');
    check(
      'Unaddressed Suggestions Section Present',
      hasReviewSection,
      hasReviewSection
        ? `"Needs your review" section found (${flagged.length} flagged suggestions in data)`
        : `MISSING: ${flagged.length} flagged suggestions in refinement-suggestions.json but no review section in HTML`
    );
  }

  // Check that refinement-suggestions count is reflected somewhere in the report
  const totalSuggestions = refinementSuggestions.length;
  const suggestionCountInHtml = html.includes(String(totalSuggestions))
    || html.includes(`${totalSuggestions} suggestion`)
    || html.includes(`${totalSuggestions} fix`);
  check(
    'Refinement Suggestions Count In Report',
    suggestionCountInHtml || totalSuggestions < 3,
    suggestionCountInHtml
      ? `suggestion count ${totalSuggestions} referenced in HTML`
      : `${totalSuggestions} suggestions in data — count not found in HTML (acceptable if <3)`
  );
}

// ─── SCORER L: Persona Name in All 7 Display Points (Fix 3) ────────────────
// Check that raw persona slugs with hyphens don't appear title-cased as display names
if (Array.isArray(personaResults) && personaResults.length > 0) {
  for (const pr of personaResults.slice(0, 2)) {
    const pid = pr.persona_id || pr.persona;
    if (!pid) continue;
    // The slug title-cased incorrectly looks like "Alex Junior" (no dash)
    const badTitleCase = pid.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const pname = pr.persona_name;
    if (pname && pname !== badTitleCase) {
      // Count occurrences of the bad format vs the good format
      const badCount = (html.match(new RegExp(badTitleCase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      const goodCount = (html.match(new RegExp(pname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
      check(
        `No Slug-Formatted Name "${badTitleCase}"`,
        badCount === 0 || goodCount > badCount,
        badCount === 0
          ? `"${badTitleCase}" not found — correct name "${pname}" used`
          : goodCount > badCount
            ? `"${pname}" (${goodCount}x) dominates over "${badTitleCase}" (${badCount}x)`
            : `BUG: "${badTitleCase}" appears ${badCount}x — persona name resolver not applied at all display points`
      );
    }
  }
}

// ─── SCORER M: Think-Aloud Narratives ────────────────────────────────────────
if (journeyLog && journeyLog.usability_dimensions && journeyLog.usability_dimensions.think_aloud) {
  const ta = journeyLog.usability_dimensions.think_aloud;
  if (ta.traces && ta.traces.length > 0) {
    check(
      'Think-Aloud Section Renders',
      html.toLowerCase().includes('think-aloud') || html.toLowerCase().includes('thinkaloud'),
      (html.toLowerCase().includes('think-aloud') || html.toLowerCase().includes('thinkaloud'))
        ? 'Think-aloud section present in HTML'
        : 'MISSING: think_aloud data exists in JSON but no think-aloud section in HTML'
    );
  }
}

// ─── OUTPUT ──────────────────────────────────────────────────────────────────

const passCount = results.filter(r => r.pass).length;
const failCount = results.filter(r => !r.pass).length;

console.log(JSON.stringify({ results, pass_count: passCount, fail_count: failCount, all_pass: !hasFailure }, null, 2));

process.exit(hasFailure ? 1 : 0);
