/**
 * signature.test.mjs – Signal engine tests (Phase 1)
 * Run with: node --test prototype/phase1/tests
 * Covers: isolate, redact, template, family, extract, tokens, fingerprint, minhash
 * SKILLS.md §1: trace-signature
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isolate,
  redact,
  template,
  detectFamily,
  extract,
  tokenise,
  fingerprint,
  minhash,
  jaccardEstimate,
  buildSignature,
} from '../src/signature.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const corpusDir = join(__dirname, '../corpus/traces');
const expected  = JSON.parse(readFileSync(join(__dirname, '../corpus/expected.json'), 'utf8'));
const secrets   = expected.secrets;

// ── 1. Isolate ────────────────────────────────────────────────────────────────
describe('isolate', () => {
  it('finds error line and keeps up to 13 lines', () => {
    const input = 'line1\nline2\nTraceback: some error\nframe1\nframe2\n'.repeat(5);
    const result = isolate(input);
    assert.ok(result.includes('Traceback'));
    assert.ok(result.split('\n').length <= 13);
  });

  it('returns empty string when no error line found', () => {
    assert.equal(isolate('all fine here\nno issues\n'), '');
  });

  it('is case-insensitive for error keywords', () => {
    assert.ok(isolate('FATAL: something crashed\ndetails').includes('FATAL'));
  });
});

// ── 2. Redact ─────────────────────────────────────────────────────────────────
describe('redact', () => {
  it('removes email addresses', () => {
    const result = redact('user@example.com caused the error');
    assert.ok(!result.includes('@example.com'), 'email should be redacted');
  });

  it('removes IPv4 addresses', () => {
    const result = redact('connecting to 192.168.1.1 failed');
    assert.ok(!result.includes('192.168.1.1'));
  });

  it('removes JWT-like tokens', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.faketoken';
    const result = redact(`token=${jwt}`);
    assert.ok(!result.includes('eyJ'));
  });

  it('removes AWS-style keys', () => {
    const result = redact('key=AKIAFAKEKEY1234567890ABCDEF used');
    assert.ok(!result.includes('AKIA'));
  });

  it('removes long opaque tokens (24+ chars)', () => {
    const token = 'verylongsecrettoken1234567890abcdefghijklmnop';
    const result = redact(`TOKEN=${token}`);
    assert.ok(!result.includes(token));
  });

  it('removes home directory usernames', () => {
    const result = redact('/home/johndoe/project/src');
    assert.ok(!result.includes('johndoe'));
  });

  it('removes Windows user paths', () => {
    const result = redact('C:\\Users\\johndoe\\Desktop\\project');
    assert.ok(!result.includes('johndoe'));
  });

  // Test against all secret-seeded corpus traces
  describe('corpus secret leakage', () => {
    for (const secret of secrets) {
      it(`does not leak: ${secret.slice(0, 20)}…`, () => {
        const raw    = `connecting to database\ntoken=${secret}\nSomeError: failed`;
        const sliced = isolate(raw) || raw;
        const clean  = redact(sliced);
        assert.ok(!clean.includes(secret), `Secret leaked: ${secret.slice(0,20)}`);
      });
    }
  });

  // Ensure fake corpus traces are redacted when combined with secrets
  it('python_secret_01 – no secrets survive redact', () => {
    const raw = readFileSync(join(corpusDir, 'python_secret_01.txt'), 'utf8');
    const sliced = isolate(raw) || raw;
    const clean  = redact(sliced);
    for (const secret of secrets) {
      assert.ok(!clean.includes(secret), `Secret survived: ${secret.slice(0,20)}`);
    }
  });
});

// ── 3. Template ───────────────────────────────────────────────────────────────
describe('template', () => {
  it('replaces UUIDs', () => {
    const result = template('id=550e8400-e29b-41d4-a716-446655440000');
    assert.ok(result.includes('<UUID>'));
    assert.ok(!result.includes('550e8400'));
  });

  it('replaces hex literals', () => {
    const result = template('at 0xdeadbeef in crash');
    assert.ok(result.includes('<HEX>'));
  });

  it('replaces quoted strings', () => {
    const result = template('message: "hello world"');
    assert.ok(result.includes('<STR>'));
  });

  it('replaces standalone numbers', () => {
    const result = template('line 42 in module');
    assert.ok(result.includes('<N>'));
  });

  it('keeps path last segment only', () => {
    const result = template('File "/some/deep/path/utils.py"');
    assert.ok(result.includes('utils.py'));
    assert.ok(!result.includes('/some/deep'));
  });
});

// ── 4. Family detection ───────────────────────────────────────────────────────
describe('detectFamily', () => {
  const cases = [
    { input: 'Traceback (most recent call last):\n  File "app.py"', expected: 'python' },
    { input: 'TypeError: Cannot read properties\n    at Object.\n node_modules',  expected: 'node' },
    { input: 'java.lang.NullPointerException\n\tat com.example.App',            expected: 'java' },
    { input: 'FAILURE: Build failed\n> Could not resolve :app:',                 expected: 'gradle' },
    { input: 'RenderFlex overflowed package:flutter widgets',                    expected: 'flutter' },
    { input: 'thread "main" panicked at unwrap() .rs:42',                       expected: 'rust' },
    { input: 'goroutine 1 panic: runtime error .go:10',                         expected: 'go' },
  ];

  for (const { input, expected: exp } of cases) {
    it(`detects ${exp}`, () => {
      assert.equal(detectFamily(input), exp);
    });
  }

  it('returns "unknown" for unrecognised input', () => {
    assert.equal(detectFamily('something completely different'), 'unknown');
  });
});

// ── 5. Extract ────────────────────────────────────────────────────────────────
describe('extract', () => {
  it('extracts errorClass from Java trace', () => {
    const { errorClass } = extract('java.lang.NullPointerException: message', 'java');
    assert.equal(errorClass, 'NullPointerException');
  });

  it('extracts errorClass from Python trace', () => {
    const { errorClass } = extract('ModuleNotFoundError: No module named "django"', 'python');
    assert.equal(errorClass, 'ModuleNotFoundError');
  });
});

// ── 6. Tokens ─────────────────────────────────────────────────────────────────
describe('tokenise', () => {
  it('returns at most 24 tokens', () => {
    const fields = { errorClass: 'SomeError', messageTemplate: Array(50).fill('word').join(' '), frames: [], versions: [] };
    const kw = tokenise(fields);
    assert.ok(kw.length <= 24);
  });

  it('deduplicates tokens', () => {
    const fields = { errorClass: 'module', messageTemplate: 'module module module found', frames: [], versions: [] };
    const kw = tokenise(fields);
    const set = new Set(kw);
    assert.equal(kw.length, set.size);
  });

  it('filters short tokens', () => {
    const fields = { errorClass: 'it', messageTemplate: 'a b c error', frames: [], versions: [] };
    const kw = tokenise(fields);
    assert.ok(kw.every(w => w.length >= 3));
  });
});

// ── 7. Fingerprint ────────────────────────────────────────────────────────────
describe('fingerprint', () => {
  it('returns 16 hex chars', async () => {
    const fp = await fingerprint('python', 'ModuleNotFoundError', 'No module named <STR>');
    assert.equal(fp.length, 16);
    assert.match(fp, /^[0-9a-f]{16}$/);
  });

  it('is deterministic – same inputs give same output', async () => {
    const a = await fingerprint('gradle', 'BuildFailure', 'Could not resolve <STR>');
    const b = await fingerprint('gradle', 'BuildFailure', 'Could not resolve <STR>');
    assert.equal(a, b);
  });

  it('differs for different inputs', async () => {
    const a = await fingerprint('python', 'ModuleNotFoundError', 'x');
    const b = await fingerprint('node',   'TypeError',           'x');
    assert.notEqual(a, b);
  });
});

// ── 8. MinHash ────────────────────────────────────────────────────────────────
describe('minhash', () => {
  it('returns 32 bytes', () => {
    const mh = minhash(['ndk', 'abi', 'mismatch']);
    assert.equal(mh.byteLength, 32);
  });

  it('is deterministic', () => {
    const a = minhash(['ndk', 'abi', 'mismatch']);
    const b = minhash(['ndk', 'abi', 'mismatch']);
    assert.deepEqual(a, b);
  });

  it('returns zeros for empty token set', () => {
    const mh = minhash([]);
    assert.ok(mh.every(b => b === 0));
  });
});

describe('jaccardEstimate', () => {
  it('returns 1.0 for identical minhash arrays', () => {
    const mh = minhash(['error', 'module', 'python']);
    assert.equal(jaccardEstimate(mh, mh), 1.0);
  });

  it('returns a value between 0 and 1', () => {
    const a = minhash(['ndk', 'abi']);
    const b = minhash(['react', 'jsx', 'typescript']);
    const j = jaccardEstimate(a, b);
    assert.ok(j >= 0 && j <= 1);
  });
});

// ── Full pipeline corpus run ─────────────────────────────────────────────────
describe('buildSignature corpus', () => {
  const traceFiles = readdirSync(corpusDir).filter(f => f.endsWith('.txt'));

  it(`has at least 5 trace files in corpus`, () => {
    assert.ok(traceFiles.length >= 5, `Only ${traceFiles.length} trace files found`);
  });

  for (const file of traceFiles) {
    it(`produces a signature for ${file}`, async () => {
      const raw = readFileSync(join(corpusDir, file), 'utf8');
      const sig = await buildSignature(raw);
      const exp = expected.traces[file];

      if (exp?.signatureExpected === false) {
        assert.equal(sig, null);
        return;
      }

      assert.ok(sig !== null, `No signature for ${file}`);
      assert.equal(sig.v, 1);
      assert.match(sig.fp, /^[0-9a-f]{16}$/);
      assert.ok(sig.kw.length > 0);
      assert.ok(sig.mh.byteLength === 32);

      if (exp?.family) {
        assert.equal(sig.fam, exp.family, `Wrong family for ${file}`);
      }

      // Secret leakage check for secret-seeded traces
      if (exp?.secretSeeded) {
        for (const secret of secrets) {
          const beacon = JSON.stringify({ fp: sig.fp, fam: sig.fam, kw: sig.kw, cls: sig.cls });
          assert.ok(!beacon.includes(secret), `Secret leaked in beacon for ${file}: ${secret.slice(0,20)}`);
        }
      }
    });
  }
});
