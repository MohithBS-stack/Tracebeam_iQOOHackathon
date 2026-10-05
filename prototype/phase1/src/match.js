/**
 * match.js – Matching engine (Phase 1)
 * Implements TECHNICAL.md §6 – runs on the helper's phone against the Fix Ledger.
 * Pure functions – no DOM, no storage.
 */

import { jaccardEstimate } from './signature.js';

// ── Constants ────────────────────────────────────────────────────────────────
const JACCARD_THRESHOLD  = 0.55;
const SCORE_THRESHOLD    = 0.60;
const RECENCY_DAYS       = 14;
const RECENCY_BONUS_MAX  = 0.10;
const COOLDOWN_SECONDS   = 60;

/**
 * @typedef {Object} LedgerEntry
 * @property {string}     fp
 * @property {string}     fam
 * @property {Uint8Array} mh
 * @property {string[]}   kw
 * @property {number}     solvedAt   – unix seconds
 * @property {string}     note       – helper's fix note
 * @property {string}     cls
 * @property {boolean}    synthetic  – true for seed data
 */

/**
 * @typedef {Object} Beacon
 * @property {string}     fp
 * @property {string}     fam
 * @property {Uint8Array} mh
 * @property {string[]}   kw
 * @property {number}     ts
 */

/**
 * @typedef {Object} MatchResult
 * @property {LedgerEntry} entry
 * @property {number}      score      – 0..1+
 * @property {string}      why        – shared token list for display
 * @property {boolean}     exactFp
 */

// ── Recency boost ─────────────────────────────────────────────────────────────
function recencyBoost(solvedAt) {
  const ageDays = (Date.now() / 1000 - solvedAt) / 86400;
  if (ageDays > RECENCY_DAYS) return 0;
  return RECENCY_BONUS_MAX * (1 - ageDays / RECENCY_DAYS);
}

// ── Shared tokens ─────────────────────────────────────────────────────────────
function sharedTokens(kwA, kwB) {
  const setB = new Set(kwB);
  return kwA.filter(k => setB.has(k));
}

// ── Score a single beacon against a single ledger entry ───────────────────────
/**
 * @param {Beacon}       beacon
 * @param {LedgerEntry}  entry
 * @returns {MatchResult|null}
 */
export function scoreMatch(beacon, entry) {
  let score  = 0;
  let exactFp = false;

  if (beacon.fp === entry.fp) {
    score   = 1.0;
    exactFp = true;
  } else if (beacon.fam === entry.fam) {
    const j = jaccardEstimate(beacon.mh, entry.mh);
    if (j < JACCARD_THRESHOLD) return null;
    score = j;
  } else {
    return null;
  }

  score += recencyBoost(entry.solvedAt);

  if (score < SCORE_THRESHOLD) return null;

  const shared = sharedTokens(beacon.kw, entry.kw);
  const why    = shared.length
    ? `Both mention: ${shared.slice(0, 5).join(', ')}`
    : `Same ${entry.fam} error class`;

  return { entry, score, why, exactFp };
}

// ── Find best match in the ledger ─────────────────────────────────────────────
/**
 * @param {Beacon}        beacon
 * @param {LedgerEntry[]} ledger
 * @returns {MatchResult|null} best match or null
 */
export function findBestMatch(beacon, ledger) {
  let best = null;
  for (const entry of ledger) {
    const result = scoreMatch(beacon, entry);
    if (result && (!best || result.score > best.score)) {
      best = result;
    }
  }
  return best;
}

// ── Cooldown tracker ──────────────────────────────────────────────────────────
/** Map from fingerprint → last alert unix seconds */
const alertHistory = new Map();

/**
 * Returns true if a match should trigger an alert (not on cooldown).
 * Side-effect: records the alert if it should fire.
 * @param {string} fp
 * @returns {boolean}
 */
export function shouldAlert(fp) {
  const last = alertHistory.get(fp) ?? 0;
  const now  = Date.now() / 1000;
  if (now - last < COOLDOWN_SECONDS) return false;
  alertHistory.set(fp, now);
  return true;
}

/** Reset cooldown (for testing). */
export function resetCooldown() { alertHistory.clear(); }
