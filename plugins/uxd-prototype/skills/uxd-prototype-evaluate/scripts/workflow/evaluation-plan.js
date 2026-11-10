'use strict';

// Match the reviewed plan to what actually ran, including work from parent
// runs. This checks receipts and adds up usage; it does not call providers or
// stop a host from spending money before those calls happen.
const fs = require('fs');
const path = require('path');
const Ajv2020 = require('ajv/dist/2020');
const addFormats = require('ajv-formats');
const C = require('../artifacts/split-contract');
const assert = (ok, message) => { if (!ok) throw new Error(message); };
const same = C.isDeepStrictEqual;
const overCostCap = (value, cap) => cap !== null && value - cap > Number.EPSILON * Math.max(Number.MIN_VALUE, value, cap) * 4;
const zero = () => ({ model_invocations: 0, llm_cost_usd: 0, known_cost_usd: 0 });
const unknown = () => ({ model_invocations: null, llm_cost_usd: null, known_cost_usd: null });
const combine = (a, b) => ({ model_invocations: a.model_invocations === null || b.model_invocations === null ? null : a.model_invocations + b.model_invocations, llm_cost_usd: a.llm_cost_usd === null || b.llm_cost_usd === null ? null : a.llm_cost_usd + b.llm_cost_usd, known_cost_usd: a.known_cost_usd === null || b.known_cost_usd === null ? null : a.known_cost_usd + b.known_cost_usd });
function usage(phases) {
  return phases.filter(p => p.model_invoked).reduce((total, p) => combine(total, { model_invocations: 1, llm_cost_usd: p.llm_cost_usd, known_cost_usd: p.llm_cost_usd ?? 0 }), zero());
}
function lineageUsage(state) {
  if (state.planning) return state.planning.lineage_usage;
  if (state.usage_attribution) return state.usage_attribution.lineage_usage;
  // A root's retained phases are its own. On a historical child, their
  // ownership is unknowable: they may include any number of ancestor phases.
  return state.workflow?.parent_run_id ? unknown() : usage(state.phases);
}
function priorUsage(parentState) {
  return parentState ? lineageUsage(parentState) : zero();
}
let validator;
function validatePlan(plan, packetHash) {
  // Steps may depend only on earlier steps. That keeps this a simple ordered
  // list instead of building a general-purpose workflow engine.
  if (!validator) {
    const ajv = new Ajv2020({ allErrors: true, strict: true }); addFormats(ajv);
    ajv.addSchema(C.read(path.resolve(__dirname, '../../schemas/v1/shared.schema.json')));
    validator = ajv.compile(C.read(path.resolve(__dirname, '../../schemas/v1/evaluation-plan.schema.json')));
  }
  assert(validator(plan), `Invalid evaluation plan: ${JSON.stringify(validator.errors)}`);
  assert(plan.packet_sha256 === packetHash, 'Plan must bind the exact reviewed packet bytes');
  const questions = new Set(plan.questions.map(q => q.id));
  assert(questions.size === plan.questions.length, 'Duplicate evaluation question ID');
  const ids = new Set(); const checks = new Set();
  const order = { classify: 0, 'consistency-source': 1, heuristic: 2, 'consistency-visual': 2, walkthroughs: 3 };
  let previous = -1;
  for (const step of plan.steps) {
    assert(!ids.has(step.id) && !checks.has(step.check), 'Plan needs unique step IDs and checks');
    assert(step.depends_on.every(id => ids.has(id)), 'Plan dependencies must identify earlier steps; no cycles or forward references');
    assert(step.question_ids.every(id => questions.has(id)), 'Plan step references an unknown evaluation question');
    assert(plan.allowed_checks.includes(step.check), 'Planned check is outside the reviewed envelope');
    assert(order[step.check] >= previous, 'Plan order is unsupported by the bundled adapters; use separate parent-linked runs to sequence differently'); previous = order[step.check];
    ids.add(step.id); checks.add(step.check);
  }
}

function preflight(options, parent, approval) {
  // Continuing keeps the same inputs; verification checks a changed build;
  // adapting changes the plan. None should quietly approve extra work.
  if (options['continue-from']) {
    const selected = parent['pe-state.json'].quick_checks?.selected || [];
    if (options.checks !== undefined) assert(same(options.checks.split(','), selected), 'Continuation cannot change check selection; use --adapt-from with a reviewed plan change');
    for (const key of ['workspace', 'base-ref', 'judgment-bundle', 'design-system', 'design-system-version', 'guideline-manifest', 'guidelines', 'plan-change']) assert(options[key] === undefined, `Continuation cannot silently ignore --${key}; use an explicit adapted run`);
  }
  const old = parent?.['pe-context.json'].intent.evaluation_plan;
  const planFile = options.plan;
  const bytes = planFile ? fs.readFileSync(planFile) : options['continue-from'] && old ? fs.readFileSync(path.join(options['continue-from'], 'inputs/evaluation-plan.json')) : null;
  if (!bytes) {
    assert(!options['adapt-from'] && !options['plan-change'], 'Adaptation requires an explicit --plan and --plan-change');
    assert(!old || !options['verify-from'], 'Verification of a planned run requires a freshly reviewed --plan for its changed build');
    return null; // Legacy runs remain readable without invented planning history.
  }
  const packetBytes = options['continue-from'] ? fs.readFileSync(path.join(options['continue-from'], 'inputs/packet.json')) : fs.readFileSync(options.input);
  const plan = JSON.parse(bytes); validatePlan(plan, C.hash(packetBytes));
  let change = { kind: options['continue-from'] ? 'continue' : 'initial', reason: options['continue-from'] ? 'Continue the reviewed frozen plan without repeating Quick work.' : 'Initial reviewed evaluation plan.', recorded_at: plan.reviewed_at, allow_rerun: false };
  if (options['continue-from']) assert(old && C.hash(bytes) === parent['pe-state.json'].planning?.plan_sha256, 'Continuation cannot replace the frozen plan');
  else {
    const selected = plan.steps.filter(s => s.check !== 'walkthroughs').map(s => s.check);
    if (options.route !== 'walkthroughs') {
      assert(selected.length, 'Quick/Full plans need selected Quick checks');
      if (options.checks === undefined) options.checks = selected.join(',');
      assert(same(options.checks.split(','), selected), 'Selected checks/order differ from the reviewed plan');
    } else assert(plan.steps.length === 1 && plan.steps[0].check === 'walkthroughs', 'Independent plans contain only walkthroughs, not implicit Quick work');
    if (options.route === 'quick') assert(!plan.steps.some(s => s.check === 'walkthroughs'), 'Quick cannot plan implicit walkthroughs');
  }
  if (options['continue-from'] && approval.purpose === 'continue-walkthroughs') {
    assert(plan.steps.some(s => s.check === 'walkthroughs'), 'Walkthroughs were not selected in the frozen plan; adapt after reviewing the new scope');
    assert(parent['pe-state.json'].planning.budget_status !== 'exceeded', 'Exceeded budget requires an approved adapted plan, not unchanged continuation');
    if (parent['pe-state.json'].planning.budget_status === 'unknown' && plan.limits.max_cost_usd !== null) assert(approval.accept_unknown_usage === true && approval.plan_sha256 === C.hash(bytes) && approval.packet_sha256 === plan.packet_sha256, 'Review unknown prior cost explicitly before Full walkthroughs');
  }
  if (options['verify-from']) {
    for (const key of ['goal', 'questions', 'allowed_checks', 'limits', 'steps']) assert(old && same(old[key], plan[key]), 'Verification preserves the reviewed plan except build/packet identity and review timestamp');
    assert(parent['pe-state.json'].planning.budget_status !== 'exceeded', 'Exceeded budget cannot authorize verification; review a separately scoped plan first');
    if (parent['pe-state.json'].planning.budget_status === 'unknown' && plan.limits.max_cost_usd !== null) assert(approval.accept_unknown_usage === true && approval.plan_sha256 === C.hash(bytes) && approval.packet_sha256 === plan.packet_sha256, 'Review unknown prior cost explicitly before fresh verification');
    change = { kind: 'verification', reason: 'Fresh evidence at the approved changed build; preserve evaluation intent.', recorded_at: plan.reviewed_at, allow_rerun: true };
  }
  if (options['adapt-from']) {
    assert(planFile && options['plan-change'], 'Adaptation requires --plan and --plan-change');
    assert(!(options.route === 'walkthroughs' && parent['pe-state.json'].workflow?.route === 'full' && parent['pe-state.json'].workflow.status === 'awaiting-review'), 'Full walkthroughs must use the reviewed Full continuation; adapt Full to a new checkpoint first');
    const record = C.read(options['plan-change']);
    assert(typeof record.reason === 'string' && record.reason.trim() && typeof record.allow_rerun === 'boolean' && typeof record.recorded_at === 'string' && record.recorded_at.endsWith('Z') && Number.isFinite(Date.parse(record.recorded_at)), 'Plan change needs a public reason, UTC recorded_at and explicit allow_rerun');
    const expands = !old || plan.goal !== old.goal || plan.packet_sha256 !== old.packet_sha256 || plan.allowed_checks.some(c => !old.allowed_checks.includes(c)) || ['max_model_invocations', 'max_cost_usd'].some(k => old.limits[k] !== null && (plan.limits[k] === null || plan.limits[k] > old.limits[k])) || old.limits.stop_conditions.some(stop => !plan.limits.stop_conditions.includes(stop));
    if (expands) assert(approval?.purpose === 'expand-evaluation' && approval.plan_sha256 === C.hash(bytes) && approval.packet_sha256 === plan.packet_sha256, 'Scope/goal/budget expansion needs explicit parent-bound approval of the new plan and packet hashes');
    const previous = [...(parent['pe-state.json'].quick_checks?.selected || []), ...(parent['pe-evaluation-snapshot.json'].journeys.length ? ['walkthroughs'] : [])];
    assert(record.allow_rerun || !plan.steps.some(s => previous.includes(s.check)), 'Repeating a selected check requires explicit allow_rerun and a recorded reason');
    const budgetRaised = old && ['max_model_invocations', 'max_cost_usd'].some(k => old.limits[k] !== null && (plan.limits[k] === null || plan.limits[k] > old.limits[k]));
    assert(parent['pe-state.json'].planning?.budget_status !== 'exceeded' || budgetRaised, 'Exceeded budget requires an explicitly approved budget expansion before more work');
    if (parent['pe-state.json'].planning?.budget_status === 'exceeded') {
      const prior = parent['pe-state.json'].planning.lineage_usage;
      assert((plan.limits.max_model_invocations === null || plan.limits.max_model_invocations >= prior.model_invocations) && !overCostCap(prior.known_cost_usd, plan.limits.max_cost_usd), 'Expanded limits still fall below known lineage usage');
    }
    if (parent['pe-state.json'].planning?.budget_status === 'unknown' && plan.limits.max_cost_usd !== null && plan.steps.some(s => ['heuristic', 'consistency-visual', 'walkthroughs'].includes(s.check))) assert(approval && ['expand-evaluation', 'continue-unknown-usage'].includes(approval.purpose) && approval.plan_sha256 === C.hash(bytes) && approval.packet_sha256 === plan.packet_sha256, 'Unknown prior cost cannot establish remaining budget; review uncertainty before additional model work');
    change = { kind: expands ? 'expanded' : 'within-envelope', reason: record.reason, recorded_at: record.recorded_at, allow_rerun: record.allow_rerun };
  } else assert(!options['plan-change'], '--plan-change requires --adapt-from');
  const prior = priorUsage(parent?.['pe-state.json']);
  assert(prior.model_invocations !== null && prior.known_cost_usd !== null, 'Cannot create a planned child from historical ancestry without usage attribution; preserve the unknowns or create an unplanned run');
  return { plan, bytes, change, prior_usage: prior };
}

function execution(plan, docs) {
  // Match each planned check to its recorded calls and evidence. A check can
  // finish without proving that every AC or task succeeded.
  const phases = docs['pe-state.json'].phases;
  return plan.steps.map(step => {
    const indexes = phases.flatMap((p, i) => {
      const owns = step.check === 'walkthroughs' ? ['journey', 'usability'].includes(p.name) : p.name === step.check || p.checks?.includes(step.check);
      return owns && p.status !== 'skipped' ? [i] : [];
    });
    const journeys = step.check === 'walkthroughs' ? docs['pe-evaluation-snapshot.json'].journeys : [];
    let status = !indexes.length ? 'not-run' : indexes.some(i => phases[i].status === 'failed') ? 'failed' : 'completed';
    if (journeys.length) {
      if (journeys.some(j => j.execution?.status === 'incomplete')) status = 'incomplete';
      else if (journeys.some(j => j.execution?.status === 'blocked')) status = 'blocked';
      else if (journeys.every(j => j.verdict === 'NOT_RUN')) status = 'not-run';
      else if (journeys.some(j => j.verdict === 'NOT_RUN')) status = 'incomplete';
    }
    const evidence = step.check === 'walkthroughs' ? journeys.flatMap(j => j.steps.flatMap(s => s.evidence_ids)) : step.check === 'heuristic' ? docs['pe-evaluation-snapshot.json'].heuristics?.coverage.flatMap(c => c.evidence_ids) || [] : step.check === 'consistency-source' || step.check === 'consistency-visual' ? docs['pe-evaluation-snapshot.json'].consistency.findings.filter(f => f.origin === (step.check === 'consistency-source' ? 'source' : 'visual')).flatMap(f => f.evidence_ids) : [];
    return { step_id: step.id, status, phase_indexes: indexes, evidence_ids: [...new Set(evidence)], reason: journeys.length ? `Recorded ${journeys.length} task/persona outcomes; see each journey's actual stopping reason.` : indexes.length ? 'Recorded execution; check completion is not an AC verdict or proof of complete coverage.' : 'No execution recorded; awaiting review, unselected, unavailable or stopped.' };
  });
}

function stateFor(prepared, docs, inherited) {
  // Add this run's new calls to the parent's usage once, not once per child.
  // Known spend can already exceed a cap even if some costs are still missing.
  const own = usage(docs['pe-state.json'].phases.slice(inherited));
  const total = combine(prepared.prior_usage, own); const limits = prepared.plan.limits;
  const exceeded = limits.max_model_invocations !== null && total.model_invocations > limits.max_model_invocations || overCostCap(total.known_cost_usd, limits.max_cost_usd);
  return { schema_version: 1, plan_sha256: C.hash(prepared.bytes), inherited_phase_count: inherited, prior_usage: prepared.prior_usage, change: prepared.change, execution: execution(prepared.plan, docs), own_usage: own, lineage_usage: total, budget_status: exceeded ? 'exceeded' : total.llm_cost_usd === null ? 'unknown' : 'within-known' };
}
function attach(prepared, docs, stage, inherited, parentState) {
  if (!prepared) {
    const state = docs['pe-state.json'];
    const own = usage(state.phases.slice(inherited));
    const prior = priorUsage(parentState);
    state.usage_attribution = {
      schema_version: 1,
      parent_run_id: state.workflow?.parent_run_id || null,
      inherited_phase_count: inherited,
      own_usage: own,
      prior_usage: prior,
      lineage_usage: combine(prior, own),
    };
    return;
  }
  const target = path.join(stage, 'inputs/evaluation-plan.json');
  if (fs.existsSync(target)) assert(C.hash(fs.readFileSync(target)) === C.hash(prepared.bytes), 'Cannot overwrite an inherited frozen plan');
  else fs.writeFileSync(target, prepared.bytes, { flag: 'wx' });
  docs['pe-context.json'].intent.evaluation_plan = prepared.plan;
  docs['pe-state.json'].planning = stateFor(prepared, docs, inherited);
}
function validatePublished(docs, root) {
  const plan = docs['pe-context.json'].intent.evaluation_plan; const stored = docs['pe-state.json'].planning;
  assert(Boolean(plan) === Boolean(stored), 'Plan and planning execution state must appear together');
  const state = docs['pe-state.json'];
  const attribution = state.usage_attribution;
  if (attribution) {
    assert(!stored, 'Usage attribution is only used when no reviewed plan is persisted');
    assert(attribution.parent_run_id === (state.workflow?.parent_run_id || null), 'Usage attribution parent disagrees with workflow lineage');
    assert(attribution.inherited_phase_count <= state.phases.length, 'Inherited phase count exceeds recorded phases');
    const expectedOwn = usage(state.phases.slice(attribution.inherited_phase_count));
    assert(same(expectedOwn, attribution.own_usage), 'Own usage disagrees with attributed phases');
    const prior = attribution.prior_usage;
    const unknownPrior = prior.model_invocations === null && prior.llm_cost_usd === null && prior.known_cost_usd === null;
    const knownPrior = Number.isInteger(prior.model_invocations) && (prior.llm_cost_usd === null || Number.isFinite(prior.llm_cost_usd)) && Number.isFinite(prior.known_cost_usd);
    assert(unknownPrior || knownPrior, 'Prior usage must be fully attributed or wholly unknown');
    if (!attribution.parent_run_id) assert(attribution.inherited_phase_count === 0 && same(attribution.prior_usage, zero()), 'Root usage attribution cannot invent inherited work');
    assert(same(combine(attribution.prior_usage, attribution.own_usage), attribution.lineage_usage), 'Lineage usage disagrees with own and prior attribution');
  }
  if (!plan) return;
  const bytes = C.referenceBytes(root, { path: 'inputs/evaluation-plan.json', sha256: stored.plan_sha256 });
  assert(same(JSON.parse(bytes), plan), 'Canonical plan differs from frozen plan bytes');
  validatePlan(plan, C.hash(fs.readFileSync(path.join(root, 'inputs/packet.json'))));
  const workflow = docs['pe-state.json'].workflow;
  const receipt = JSON.parse(C.referenceBytes(root, { path: workflow.receipt_path, sha256: workflow.receipt_sha256 }));
  assert(receipt.plan_sha256 === stored.plan_sha256 && same(receipt.plan_change, stored.change), 'Workflow receipt disagrees with the frozen plan/change');
  const notBefore = Math.max(Date.parse(plan.reviewed_at), Date.parse(stored.change.recorded_at), receipt.approval ? Date.parse(receipt.approval.recorded_at) : 0);
  assert(docs['pe-state.json'].phases.slice(stored.inherited_phase_count).every(p => !p.model_invoked || Date.parse(p.started_at) >= notBefore), 'New invocation predates its reviewed plan/change/decision; do not recount prior calls as new work');
  if (stored.change.kind === 'expanded') assert(receipt.approval?.purpose === 'expand-evaluation' && receipt.approval.approved === true && receipt.approval.run_id === workflow.parent_run_id && receipt.approval.plan_sha256 === stored.plan_sha256 && receipt.approval.packet_sha256 === plan.packet_sha256, 'Expanded plan lacks its explicit hash-bound review decision');
  assert(stored.inherited_phase_count <= docs['pe-state.json'].phases.length, 'Inherited phase count exceeds recorded phases');
  if (!docs['pe-state.json'].workflow?.parent_run_id) assert(stored.inherited_phase_count === 0 && same(stored.prior_usage, zero()) && stored.change.kind === 'initial', 'Initial planning cannot invent inherited work');
  const expected = stateFor({ plan, bytes, change: stored.change, prior_usage: stored.prior_usage }, docs, stored.inherited_phase_count);
  assert(same(expected, stored), 'Planned/executed coverage or usage disagrees with canonical receipts');
  const selected = docs['pe-state.json'].quick_checks?.selected || [];
  assert(same(plan.steps.filter(s => s.check !== 'walkthroughs').map(s => s.check), selected), 'Plan selection disagrees with executed Quick selection');
  assert(!docs['pe-evaluation-snapshot.json'].journeys.length || plan.steps.some(s => s.check === 'walkthroughs'), 'Walkthrough execution was not in the reviewed plan');
  for (const step of plan.steps) {
    const observed = stored.execution.find(row => row.step_id === step.id);
    if (!observed.phase_indexes.length) continue;
    for (const id of step.depends_on) {
      const dependency = stored.execution.find(row => row.step_id === id);
      assert(dependency.status === 'completed' && dependency.phase_indexes.length && Math.max(...dependency.phase_indexes) < Math.min(...observed.phase_indexes), 'Executed plan dependency is unmet or shares the same invocation; do not claim unsupported sequencing');
    }
  }
}

module.exports = { preflight, attach, validatePublished, usage };
