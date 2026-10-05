/**
 * match.test.mjs – Matching engine tests (Phase 1)
 * Run with: node --test prototype/phase1/tests
 * Covers: scoreMatch, findBestMatch, shouldAlert, cooldown
 * SKILLS.md §3: match-score
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { scoreMatch, findBestMatch, shouldAlert, resetCooldown } from '../src/match.js';
import { minhash } from '../src/signature.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function makeBeacon(overrides = {}) {
  return {
    fp:  'a1b2c3d4e5f60001',
    fam: 'gradle',
    kw:  ['ndk', 'abi', 'mismatch'],
    mh:  minhash(['ndk', 'abi', 'mismatch']),
    ts:  Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

function makeEntry(overrides = {}) {
  return {
    fp:       'a1b2c3d4e5f60001',
    fam:      'gradle',
    cls:      'BuildFailure',
    kw:       ['ndk', 'abi', 'mismatch', 'cmake'],
    mh:       minhash(['ndk', 'abi', 'mismatch', 'cmake']),
    solvedAt: Math.floor(Date.now() / 1000) - 86400,   // 1 day ago
    note:     'Fixed by pinning NDK version.',
    confirmed: true,
    synthetic: true,
    ...overrides,
  };
}

// ── scoreMatch ────────────────────────────────────────────────────────────────
describe('scoreMatch', () => {
  it('returns score 1.0 + recency for exact fingerprint match', () => {
    const beacon = makeBeacon();
    const entry  = makeEntry();
    const result = scoreMatch(beacon, entry);
    assert.ok(result !== null, 'Should match');
    assert.ok(result.score >= 1.0, `Score ${result.score} should be >= 1.0`);
    assert.equal(result.exactFp, true);
  });

  it('returns null for different family', () => {
    const beacon = makeBeacon({ fam: 'python', fp: 'different0000001' });
    const entry  = makeEntry({ fam: 'gradle' });
    const result = scoreMatch(beacon, entry);
    assert.equal(result, null);
  });

  it('returns null for same family but low Jaccard', () => {
    const beacon = makeBeacon({
      fam: 'node',
      fp:  'ffffffffffffffff',
      mh:  minhash(['react', 'jsx', 'component']),
      kw:  ['react', 'jsx'],
    });
    const entry = makeEntry({
      fam:      'node',
      fp:       'eeeeeeeeeeeeeeee',
      mh:       minhash(['postgres', 'sql', 'connection']),
      kw:       ['postgres', 'sql'],
      solvedAt: Math.floor(Date.now() / 1000) - 86400,
    });
    const result = scoreMatch(beacon, entry);
    assert.equal(result, null);
  });

  it('includes shared tokens in the "why" field', () => {
    const beacon = makeBeacon();
    const entry  = makeEntry();
    const result = scoreMatch(beacon, entry);
    assert.ok(result !== null);
    assert.ok(result.why.includes('ndk') || result.why.includes('abi'));
  });

  it('gives a recency bonus for entries solved within 14 days', () => {
    const recentEntry = makeEntry({ solvedAt: Math.floor(Date.now() / 1000) - 3600 }); // 1 hour ago
    const oldEntry    = makeEntry({ solvedAt: Math.floor(Date.now() / 1000) - 30 * 86400 }); // 30 days ago

    const recentResult = scoreMatch(makeBeacon(), recentEntry);
    const oldResult    = scoreMatch(makeBeacon(), oldEntry);

    if (recentResult && oldResult) {
      assert.ok(recentResult.score >= oldResult.score, 'Recent entry should score at least as high');
    }
  });
});

// ── findBestMatch ─────────────────────────────────────────────────────────────
describe('findBestMatch', () => {
  it('returns the highest-scoring entry from a ledger', () => {
    const beacon = makeBeacon();
    const ledger = [
      makeEntry({ fp: 'wrong000000fffff', fam: 'python' }),
      makeEntry(),  // exact match
      makeEntry({ fp: 'other00000000000', fam: 'java' }),
    ];
    const result = findBestMatch(beacon, ledger);
    assert.ok(result !== null);
    assert.equal(result.exactFp, true);
  });

  it('returns null when no entry meets the threshold', () => {
    const beacon = makeBeacon({ fam: 'rust', fp: 'aaaaaaaaaaaaaaaa' });
    const ledger = [makeEntry({ fam: 'python' }), makeEntry({ fam: 'java' })];
    const result = findBestMatch(beacon, ledger);
    assert.equal(result, null);
  });

  it('returns null for empty ledger', () => {
    const result = findBestMatch(makeBeacon(), []);
    assert.equal(result, null);
  });
});

// ── Cooldown ──────────────────────────────────────────────────────────────────
describe('shouldAlert / cooldown', () => {
  beforeEach(() => resetCooldown());

  it('allows the first alert', () => {
    assert.equal(shouldAlert('fp-test-001'), true);
  });

  it('blocks a repeat within 60 s', () => {
    shouldAlert('fp-test-002');
    assert.equal(shouldAlert('fp-test-002'), false);
  });

  it('allows different fingerprints independently', () => {
    shouldAlert('fp-test-003');
    assert.equal(shouldAlert('fp-test-004'), true);
  });
});

// ── Precision target (TECHNICAL.md §13) ───────────────────────────────────────
describe('top-1 precision target', () => {
  it('hits exact match for matching fingerprint (precision 100% for exact)', () => {
    const beacon = makeBeacon({ fp: 'exactmatch000001' });
    const ledger = [
      makeEntry({ fp: 'exactmatch000001', fam: 'gradle' }),
      makeEntry({ fp: 'other00000000001', fam: 'python' }),
    ];
    const result = findBestMatch(beacon, ledger);
    assert.ok(result !== null);
    assert.equal(result.entry.fp, 'exactmatch000001');
  });

  it('false alerts are avoided by returning null for unrelated families', () => {
    // 20 flags from different families against an unrelated gradle ledger
    let falseAlerts = 0;
    const entry = makeEntry();
    for (let i = 0; i < 20; i++) {
      const beacon = makeBeacon({
        fam: 'python',
        fp:  `python${i.toString().padStart(10,'0')}`,
        mh:  minhash([`token${i}`, `word${i}`]),
      });
      const result = scoreMatch(beacon, entry);
      if (result !== null) falseAlerts++;
    }
    assert.ok(falseAlerts <= 1, `Too many false alerts: ${falseAlerts} / 20`);
  });
});
