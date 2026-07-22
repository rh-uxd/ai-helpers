'use strict';

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/** Absolute path to this skill's root (…/uxd-prototype-evaluate). */
const SKILL_ROOT = path.resolve(__dirname, '..');

/**
 * True when `candidate` is inside the skill install dir (or equal to it).
 * Runtime artifacts must never resolve here.
 */
function isInsideSkillRoot(candidate) {
  const resolved = path.resolve(candidate);
  return resolved === SKILL_ROOT || resolved.startsWith(SKILL_ROOT + path.sep);
}

/**
 * True when a git toplevel looks like a cloned prototype under .artifacts/<KEY>/code.
 * Those nested repos must not become the project root for artifact writes.
 */
function isNestedArtifactsClone(gitRoot) {
  const normalized = path.resolve(gitRoot).replace(/\\/g, '/');
  return /\/\.artifacts\/[^/]+\/code(\/|$)/.test(normalized + '/');
}

function gitToplevel(cwd) {
  try {
    return execSync('git rev-parse --show-toplevel', {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Resolve the consumer project root where `.artifacts/` must live.
 *
 * Priority:
 * 1. UXD_PROJECT_ROOT env (absolute path)
 * 2. git toplevel of cwd, if it is NOT the skill install and NOT a nested clone
 * 3. walk parents of cwd for a .git that passes the same checks
 * 4. cwd (last resort)
 *
 * Never returns the skill directory itself.
 */
function resolveProjectRoot(startCwd = process.cwd()) {
  const envRoot = process.env.UXD_PROJECT_ROOT;
  if (envRoot) {
    const abs = path.resolve(envRoot);
    if (!isInsideSkillRoot(abs)) return abs;
  }

  const start = path.resolve(startCwd);
  const fromGit = gitToplevel(start);
  if (fromGit && !isInsideSkillRoot(fromGit) && !isNestedArtifactsClone(fromGit)) {
    return fromGit;
  }

  let dir = start;
  while (true) {
    if (isInsideSkillRoot(dir)) {
      // Walked into the skill — jump to parent of skill and keep looking
      dir = path.dirname(SKILL_ROOT);
      continue;
    }
    const gitDir = path.join(dir, '.git');
    if (fs.existsSync(gitDir)) {
      if (!isNestedArtifactsClone(dir)) return dir;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  // Last resort: invocation cwd if usable, else process.cwd()
  if (!isInsideSkillRoot(start) && !isNestedArtifactsClone(start)) return start;
  return path.resolve(process.cwd());
}

/**
 * Absolute path to `.artifacts/<key>/` (create/publish key root).
 */
function resolveKeyDir(key, startCwd = process.cwd()) {
  if (!key) throw new Error('resolveKeyDir requires a key');
  return path.join(resolveProjectRoot(startCwd), '.artifacts', key);
}

/**
 * Absolute path to `.artifacts/<key>/eval/` (per-key eval outputs).
 */
function resolveArtifactsDir(key, startCwd = process.cwd()) {
  if (!key) throw new Error('resolveArtifactsDir requires a key');
  return path.join(resolveKeyDir(key, startCwd), 'eval');
}

/**
 * Absolute path to `.artifacts/eval/` (cross-key run log + leaderboard).
 */
function resolveEvalGlobalDir(startCwd = process.cwd()) {
  return path.join(resolveProjectRoot(startCwd), '.artifacts', 'eval');
}

/**
 * Derive the Jira/prototype key from an artifacts path.
 * Accepts either `.artifacts/<KEY>/eval` or legacy `.artifacts/<KEY>`.
 */
function resolveKeyFromArtifactsDir(artifactsDir) {
  const abs = path.resolve(artifactsDir);
  const base = path.basename(abs);
  if (base === 'eval') {
    return path.basename(path.dirname(abs));
  }
  return base;
}

/**
 * Absolute path to the key root for an artifacts (eval) dir.
 */
function resolveKeyDirFromArtifactsDir(artifactsDir) {
  const abs = path.resolve(artifactsDir);
  if (path.basename(abs) === 'eval') {
    return path.dirname(abs);
  }
  return abs;
}

module.exports = {
  SKILL_ROOT,
  resolveProjectRoot,
  resolveKeyDir,
  resolveArtifactsDir,
  resolveEvalGlobalDir,
  resolveKeyFromArtifactsDir,
  resolveKeyDirFromArtifactsDir,
  isInsideSkillRoot,
  isNestedArtifactsClone,
};
