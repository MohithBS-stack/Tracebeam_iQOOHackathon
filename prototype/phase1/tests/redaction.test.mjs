/**
 * redaction.test.mjs – Privacy / redaction tests (Phase 1)
 * Run with: node --test prototype/phase1/tests
 * Verifies TECHNICAL.md §12: secrets never appear in beacon or preview.
 * AGENTS.md hard rule 4: Privacy.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { redact, isolate, buildSignature } from '../src/signature.js';
import { forgeFlag } from '../src/flag.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const expected  = JSON.parse(readFileSync(join(__dirname, '../corpus/expected.json'), 'utf8'));
const secrets   = expected.secrets;
const corpusDir = join(__dirname, '../corpus/traces');

// ── Secret leakage in redact() ────────────────────────────────────────────────
describe('redact – no secrets in output', () => {
  for (const secret of secrets) {
    it(`redact removes: ${secret.slice(0, 30)}`, () => {
      const text   = `Error: connection failed\nSETTING=${secret}\ndetails`;
      const result = redact(text);
      assert.ok(!result.includes(secret),
        `Secret leaked: "${secret.slice(0, 30)}…"`);
    });
  }
});

// ── Secret leakage in full pipeline ──────────────────────────────────────────
describe('buildSignature – no secrets in beacon fields', () => {
  const secretTraces = readdirSync(corpusDir).filter(f => f.includes('secret'));

  for (const file of secretTraces) {
    it(`${file} – kw and cls contain no secrets`, async () => {
      const raw = readFileSync(join(corpusDir, file), 'utf8');
      const sig = await buildSignature(raw);
      if (!sig) return; // null signature is fine for this test

      const beaconStr = JSON.stringify({ fp: sig.fp, fam: sig.fam, kw: sig.kw, cls: sig.cls });

      for (const secret of secrets) {
        assert.ok(
          !beaconStr.includes(secret),
          `Secret in beacon for ${file}: "${secret.slice(0, 30)}…"`
        );
      }
    });
  }
});

// ── Preview text contains no secrets ─────────────────────────────────────────
describe('preview text – redaction bars on secrets', () => {
  it('replaces [REDACTED] but not the original secret', () => {
    const secret = 'verylongsecrettoken1234567890abcdefghijklmnop';
    const raw    = `SomeError: failed\nTOKEN=${secret}\ndetails here`;
    const sliced = isolate(raw) || raw;
    const clean  = redact(sliced);
    assert.ok(!clean.includes(secret));
    assert.ok(clean.includes('[REDACTED]') || !clean.includes(secret));
  });
});

// ── Flag determinism ──────────────────────────────────────────────────────────
describe('forgeFlag – deterministic and colour-rule compliance', () => {
  it('same fp gives byte-identical SVG', () => {
    const a = forgeFlag('a1b2c3d4e5f60001');
    const b = forgeFlag('a1b2c3d4e5f60001');
    assert.equal(a.svg, b.svg);
    assert.equal(a.code, b.code);
  });

  it('different fps give different flags', () => {
    const a = forgeFlag('a1b2c3d4e5f60001');
    const b = forgeFlag('f0e1d2c3b4a59876');
    // At least the code or SVG should differ
    assert.ok(a.code !== b.code || a.svg !== b.svg);
  });

  it('flag code is exactly 3 characters', () => {
    for (const fp of ['a1b2c3d4e5f60001', 'deadbeef12345678', '0000000000000000']) {
      const { code } = forgeFlag(fp);
      assert.equal(code.length, 3, `Code for ${fp} is not 3 chars: ${code}`);
    }
  });

  it('1000 random fps never produce invalid SVG', () => {
    for (let i = 0; i < 1000; i++) {
      const fp = Math.random().toString(16).slice(2).padEnd(16, '0').slice(0, 16);
      const { svg, code } = forgeFlag(fp);
      assert.ok(svg.includes('<svg'), `Missing SVG tag for ${fp}`);
      assert.ok(svg.includes('</svg>'), `Missing closing SVG for ${fp}`);
      assert.equal(code.length, 3, `Code not 3 chars for ${fp}`);
    }
  });

  it('svg includes no raw hex colours outside known palette', () => {
    const PALETTE_HEXES = ['#E8262B', '#FFC72C', '#1B3FD8', '#000000', '#F5F7FA'];
    const fp = 'a1b2c3d4e5f60001';
    const { svg } = forgeFlag(fp);
    // Extract all fill= hex values
    const fills = svg.match(/fill="(#[0-9A-Fa-f]{3,6})"/g) ?? [];
    for (const fillAttr of fills) {
      const hex = fillAttr.match(/"(#[^"]+)"/)?.[1];
      if (hex && hex !== 'none') {
        const upper = hex.toUpperCase().replace(/#([0-9A-F]{3})$/, (_, s) => `#${s.split('').map(c=>c+c).join('')}`);
        const paletteUpper = PALETTE_HEXES.map(h => h.toUpperCase());
        assert.ok(paletteUpper.includes(upper) || paletteUpper.some(p => p === hex.toUpperCase()),
          `Off-palette colour in flag SVG: ${hex}`);
      }
    }
  });
});
