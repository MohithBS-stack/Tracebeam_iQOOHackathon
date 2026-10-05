/**
 * signature.js – Signal Engine (Phase 1)
 * Implements TECHNICAL.md §5 – all pure functions, no DOM, no storage.
 * F1 (capture) feeds into here; F2 (redact + sign) lives here.
 *
 * Pipeline:
 *   isolate → redact → template → family → extract → tokens → fingerprint → minhash
 */

// ── 1. Isolate ────────────────────────────────────────────────────────────────
/**
 * Find the first error-like line and keep up to 12 following lines.
 * @param {string} raw – up to 8 KB of text
 * @returns {string} the isolated slice
 */
export function isolate(raw) {
  const lines = raw.split('\n');
  const errorRe = /error|exception|traceback|fatal|failed/i;
  const start = lines.findIndex(l => errorRe.test(l));
  if (start === -1) return '';
  return lines.slice(start, start + 13).join('\n');
}

// ── 2. Redact ─────────────────────────────────────────────────────────────────
/**
 * Remove all secrets BEFORE any further processing.
 * Returns the redacted string with secrets replaced by [REDACTED].
 * Tests must ensure no secret survives into kw, cls, or the beacon.
 * @param {string} text
 * @returns {string}
 */
export function redact(text) {
  return text
    // Email addresses
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, '[REDACTED]')
    // IPv4
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, '[REDACTED]')
    // IPv6 (simplified)
    .replace(/\b([0-9a-fA-F]{1,4}:){2,7}[0-9a-fA-F]{1,4}\b/g, '[REDACTED]')
    // URLs with credentials (scheme://user:pass@host) – catches postgres://user:password@host
    .replace(/\b\w+:\/\/[^\s@/]+:[^\s@/]+@[^\s]*/g, '[REDACTED]')
    // Inline credentials in connection strings / assignments
    .replace(/(?:password|passwd|pass|secret|token|key|apikey|api_key|auth|setting|config|env|cred|credential)s?\s*[=:]\s*["']?([^\s"'&,;]+)["']?/gi, (m, val) => m.replace(val, '[REDACTED]'))
    // Standalone tokens with password/secret in them
    .replace(/\b[A-Za-z0-9_\-]*(?:password|secret)[A-Za-z0-9_\-]*\b/gi, '[REDACTED]')
    // JWT-like tokens (eyJ… with or without signature segment)
    .replace(/eyJ[A-Za-z0-9_\-]{4,}(?:\.[A-Za-z0-9_\-]+)*/g, '[REDACTED]')
    // AWS-style access keys
    .replace(/\bAKIA[0-9A-Z]{16}\b/g, '[REDACTED]')
    // Long opaque tokens: 24+ chars of [A-Za-z0-9_-] not interrupted by spaces
    .replace(/[A-Za-z0-9_\-]{24,}/g, '[REDACTED]')
    // Home directories / usernames in paths: /home/username or /Users/username
    .replace(/\/(home|Users)\/[^\s/]+/g, '/$1/[REDACTED]')
    // Windows user paths: C:\Users\username
    .replace(/[A-Za-z]:\\Users\\[^\s\\]+/gi, '[DRIVE]:\\Users\\[REDACTED]');
}

// ── 3. Template ───────────────────────────────────────────────────────────────
/**
 * Normalise variable values so two traces of the same bug hash the same.
 * @param {string} text – already redacted
 * @returns {string}
 */
export function template(text) {
  return text
    // UUIDs
    .replace(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/g, '<UUID>')
    // Absolute paths (POSIX and Windows) - reduce to last segment
    .replace(/(?:\/[^/\s"']+)+\/([^/\s"']+)/g, '$1')
    .replace(/[A-Za-z]:\\(?:[^\s\\]+\\)+([^\s\\]+)/g, '$1')
    // Hex literals (0x…)
    .replace(/\b0x[0-9a-fA-F]+\b/g, '<HEX>')
    // Standalone hex strings (8+ hex chars)
    .replace(/\b[0-9a-fA-F]{8,}\b/g, '<HEX>')
    // Quoted strings - replace non-file strings with <STR> (keep file names like "utils.py" intact)
    .replace(/(["'])(?![a-zA-Z0-9_.-]+\.[a-zA-Z0-9]{1,8}\1)[^"']*\1/g, '<STR>')
    // Standalone numbers (not part of identifiers)
    .replace(/(?<![A-Za-z_])\d+(?!\w)/g, '<N>');
}

// ── 4. Family ─────────────────────────────────────────────────────────────────
const FAMILY_CUES = [
  { family: 'python',  re: /Traceback|\.py[c"]|SyntaxError|IndentationError|ModuleNotFoundError|ImportError/ },
  { family: 'node',    re: /node_modules|\.js:\d|at Object\.|UnhandledPromiseRejection|require\(/ },
  { family: 'java',    re: /java\.|\.java:\d|NullPointerException|ClassNotFoundException|at com\./ },
  { family: 'kotlin',  re: /\.kt:\d|KotlinNullPointerException|kotlinx\.|kotlin\.[A-Z]/ },
  { family: 'gradle',  re: /FAILURE: Build failed|:app:|Gradle|Could not resolve/ },
  { family: 'react',   re: /React|JSX|jsx|useState|useEffect|react-dom/ },
  { family: 'flutter', re: /flutter|dart:|package:flutter|FlutterError|RenderFlex/ },
  { family: 'cpp',     re: /Segmentation fault|core dumped|std::|\.cpp:\d|\.cc:\d|SIGSEGV/ },
  { family: 'rust',    re: /thread 'main' panicked|\.rs:\d|unwrap\(\)|Rust/ },
  { family: 'go',      re: /goroutine \d|\.go:\d|panic:|runtime error/ },
];

/**
 * @param {string} text – isolated + redacted + templated
 * @returns {string} one of the family identifiers or 'unknown'
 */
export function detectFamily(text) {
  for (const { family, re } of FAMILY_CUES) {
    if (re.test(text)) return family;
  }
  return 'unknown';
}

// ── 5. Extract ────────────────────────────────────────────────────────────────
/**
 * Pull structured fields from the templated text.
 * @param {string} text
 * @param {string} family
 * @returns {{ errorClass: string, messageTemplate: string, frames: string[], versions: string[] }}
 */
export function extract(text, family) {
  // Error class: first CamelCase word followed by colon (Python, Java, Kotlin)
  const classMatch = text.match(/([A-Z][a-zA-Z0-9]*(?:Error|Exception|Failure|Panic|Fault|Warning))/);
  const errorClass = classMatch ? classMatch[1] : '';

  // Message template: text after the error class up to end of first error line
  const msgMatch = text.match(/[A-Z][a-zA-Z0-9]*(?:Error|Exception|Failure|Panic|Fault|Warning)[:\s]+([^\n]{0,120})/);
  const messageTemplate = msgMatch ? msgMatch[1].trim() : text.split('\n')[0].slice(0, 120);

  // Library frames: package/module names (never app code)
  const frameRe = {
    java:    /\bat (\w+\.\w+)\./g,
    kotlin:  /\bat (\w+\.\w+)\./g,
    python:  /File "([^"]+)", line/g,
    node:    /at (.+?) \(/g,
    flutter: /package:(\w+)\//g,
    react:   /at (\w+) \(/g,
    go:      /(\w+\/\w+)\.go:/g,
    rust:    /at (\w+)\/\w+\.rs:/g,
    cpp:     /#\d+ +\w+ in (\w+)/g,
    gradle:  /> Could not resolve ([^\s]+)/g,
    unknown: /at ([^\s]+)\(/g,
  }[family] || /at ([^\s]+)\(/g;

  const frames = [];
  let m;
  while ((m = frameRe.exec(text)) !== null && frames.length < 3) {
    frames.push(m[1]);
  }

  // Version hints
  const versionRe = /(NDK|node|python|gradle|flutter|kotlin|java|go|rust|react)\s+(?:v)?(\d+[\d.]*)/gi;
  const versions = [];
  while ((m = versionRe.exec(text)) !== null) {
    versions.push(`${m[1].toLowerCase()} ${m[2]}`);
  }

  return { errorClass, messageTemplate, frames, versions };
}

// ── 6. Tokens ────────────────────────────────────────────────────────────────
/**
 * Produce up to 24 lowercase word-pieces from the structured fields.
 * @param {{ errorClass, messageTemplate, frames, versions }} fields
 * @returns {string[]}
 */
export function tokenise({ errorClass, messageTemplate, frames, versions }) {
  const raw = [errorClass, messageTemplate, ...frames, ...versions].join(' ');
  const words = raw
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length >= 3 && !STOP_WORDS.has(w));

  // Deduplicate, preserve order, cap at 24
  const seen = new Set();
  const result = [];
  for (const w of words) {
    if (!seen.has(w)) { seen.add(w); result.push(w); }
    if (result.length >= 24) break;
  }
  return result;
}

const STOP_WORDS = new Set(['the','and','for','not','but','has','had','was','are','its','str','hex','uuid']);

// ── 7. Fingerprint ────────────────────────────────────────────────────────────
/**
 * First 16 hex chars of SHA-256(family|errorClass|messageTemplate).
 * @param {string} family
 * @param {string} errorClass
 * @param {string} messageTemplate
 * @returns {Promise<string>} 16-char hex string
 */
export async function fingerprint(family, errorClass, messageTemplate) {
  const input = `${family}|${errorClass}|${messageTemplate}`;
  const encoded = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hex.slice(0, 16);
}

// ── 8. MinHash ────────────────────────────────────────────────────────────────
// 16 hash functions over the token set, 16 bits each → 32 bytes
const MINHASH_A = [
  0x517cc1b7, 0x27220a95, 0xd4f0b858, 0x8c97d9cd,
  0x3a84f2db, 0xb5a4bcae, 0x7c98f3a1, 0xe1d35f09,
  0x4a6c8e2f, 0x9b1df047, 0xc3e72b6d, 0x56a8d4f1,
  0x82b5c9e3, 0x1f4a7d08, 0xd8e3b521, 0x6c941a37,
];
const MINHASH_B = [
  0xa4c6e8f2, 0x3b8d1f05, 0x7e4a9c23, 0xd1f6b049,
  0x58c3e7a1, 0xbc50f284, 0x91d42e67, 0x4f8a03cb,
  0xe72b564d, 0x1a9c38f0, 0x63d5a812, 0x0bf4e925,
  0x8a17cf40, 0xd63b09e7, 0x524ea18c, 0x9f0c647b,
];
const MINHASH_P = 0x7fffffff; // Mersenne prime

/**
 * @param {string[]} tokens
 * @returns {Uint8Array} 32 bytes (16 × 16-bit minhash values, big-endian)
 */
export function minhash(tokens) {
  const result = new Uint8Array(32);
  if (tokens.length === 0) return result;

  for (let i = 0; i < 16; i++) {
    let minVal = Infinity;
    for (const token of tokens) {
      let hash = 0;
      for (let c = 0; c < token.length; c++) {
        hash = (Math.imul(hash, 31) + token.charCodeAt(c)) >>> 0;
      }
      const h = ((Math.imul(MINHASH_A[i], hash) + MINHASH_B[i]) % MINHASH_P) >>> 0;
      if (h < minVal) minVal = h;
    }
    // Store 16 bits big-endian
    const v = minVal & 0xffff;
    result[i * 2]     = (v >> 8) & 0xff;
    result[i * 2 + 1] = v & 0xff;
  }
  return result;
}

// ── Jaccard estimate from two MinHash arrays ──────────────────────────────────
/**
 * @param {Uint8Array} mhA
 * @param {Uint8Array} mhB
 * @returns {number} 0..1
 */
export function jaccardEstimate(mhA, mhB) {
  let matches = 0;
  for (let i = 0; i < 16; i++) {
    if (mhA[i * 2] === mhB[i * 2] && mhA[i * 2 + 1] === mhB[i * 2 + 1]) {
      matches++;
    }
  }
  return matches / 16;
}

// ── Full pipeline ─────────────────────────────────────────────────────────────
/**
 * @typedef {Object} Signature
 * @property {1}          v
 * @property {string}     fp   – 16-char hex fingerprint
 * @property {string}     fam  – language family
 * @property {string}     cls  – error class
 * @property {string[]}   kw   – up to 8 keywords for preview
 * @property {Uint8Array} mh   – 32-byte MinHash
 * @property {number}     ts   – unix seconds
 * @property {number}     ttl  – seconds, default 600
 */

/**
 * Run the full signal-engine pipeline on raw text.
 * @param {string} raw
 * @returns {Promise<Signature|null>} null if isolation fails
 */
export async function buildSignature(raw) {
  const sliced = isolate(raw);
  if (!sliced) return null;

  const clean    = redact(sliced);
  const normed   = template(clean);
  const fam      = detectFamily(normed);
  const fields   = extract(normed, fam);
  const kw       = tokenise(fields).slice(0, 8);
  const fp       = await fingerprint(fam, fields.errorClass, fields.messageTemplate);
  const mh       = minhash(tokenise(fields));

  return {
    v:   1,
    fp,
    fam,
    cls: fields.errorClass,
    kw,
    mh,
    ts:  Math.floor(Date.now() / 1000),
    ttl: 600,
  };
}
