/**
 * flag.js – Flag Forge (Phase 1)
 * Implements TECHNICAL.md §7 – deterministic flag generation.
 * F3: same fp gives same flag on every device.
 * Pure functions – no DOM, no storage.
 */

// ── Patterns (3 bits → 8 patterns) ───────────────────────────────────────────
// Each pattern is a function that fills an SVG <g> with <polygon> or <rect> elements.
// Colours are substituted from the palette token values.

const PATTERNS = [
  'quarters',       // 0 – four quadrants
  'horizontal',     // 1 – top/bottom split
  'vertical',       // 2 – left/right split
  'diagonal',       // 3 – NW–SE diagonal split
  'cross',          // 4 – horizontal + vertical bars
  'border',         // 5 – solid centre with frame
  'stripes',        // 6 – five horizontal stripes
  'saltire',        // 7 – X diagonal split
];

// ── Palette (must stay in sync with tokens.css) ───────────────────────────────
const COLOURS = {
  red:    '#E8262B',  // --distress-red
  yellow: '#FFC72C',  // --pennant-yellow
  blue:   '#1B3FD8',  // --hoist-blue
  black:  '#000000',  // --black
  white:  '#F5F7FA',  // --flag-white
};

// The code alphabet excludes 0, O, 1, I to avoid confusion
const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

// ── Deterministic hash helpers ────────────────────────────────────────────────
/**
 * Simple 32-bit hash of a string (deterministic, no crypto needed here –
 * the fp is already a cryptographic fingerprint).
 */
function djb2(str, seed = 0) {
  let h = seed >>> 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(h, 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Extract a value in range [0, max) from a fingerprint string using byte offset.
 * @param {string} fp  – 16-char hex fingerprint
 * @param {number} byteOffset – which pair of hex chars to use (0–7)
 * @param {number} max
 */
function fpByte(fp, byteOffset, max) {
  const val = parseInt(fp.slice(byteOffset * 2, byteOffset * 2 + 2), 16);
  return val % max;
}

// ── Colour picker ─────────────────────────────────────────────────────────────
/**
 * Pick 2–3 colours from the palette.
 * Rules: adjacent fields must differ; at least one of red, yellow, blue.
 */
function pickColours(fp) {
  const keys = ['red', 'yellow', 'blue', 'black', 'white'];
  const primary = fpByte(fp, 2, 3);           // red | yellow | blue (guaranteed warm)
  const secondary = (fpByte(fp, 3, 4) + primary + 1) % 5;  // any, must differ
  const useThird = fpByte(fp, 4, 2) === 1;
  let third = useThird ? (fpByte(fp, 5, 3) + secondary + 1) % 5 : -1;
  if (third === primary) third = (third + 1) % 5;

  const cols = [keys[primary], keys[secondary]];
  if (useThird && third !== -1 && third !== secondary && third !== primary) {
    cols.push(keys[third]);
  }
  return cols.map(k => COLOURS[k]);
}

// ── SVG drawing per pattern ───────────────────────────────────────────────────
function drawPattern(pattern, cols, size) {
  const [c0, c1, c2 = c0] = cols;
  const h = size;
  const w = size;
  const m = h / 2;

  switch (pattern) {
    case 'quarters':
      return `
        <rect x="0" y="0" width="${m}" height="${m}" fill="${c0}"/>
        <rect x="${m}" y="0" width="${m}" height="${m}" fill="${c1}"/>
        <rect x="0" y="${m}" width="${m}" height="${m}" fill="${c1}"/>
        <rect x="${m}" y="${m}" width="${m}" height="${m}" fill="${c0}"/>`;
    case 'horizontal':
      return `
        <rect x="0" y="0" width="${w}" height="${m}" fill="${c0}"/>
        <rect x="0" y="${m}" width="${w}" height="${m}" fill="${c1}"/>`;
    case 'vertical':
      return `
        <rect x="0" y="0" width="${m}" height="${h}" fill="${c0}"/>
        <rect x="${m}" y="0" width="${m}" height="${h}" fill="${c1}"/>`;
    case 'diagonal':
      return `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${c1}"/>
        <polygon points="0,0 ${w},0 0,${h}" fill="${c0}"/>`;
    case 'cross':
      return `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${c0}"/>
        <rect x="0" y="${h * 0.35}" width="${w}" height="${h * 0.3}" fill="${c1}"/>
        <rect x="${w * 0.35}" y="0" width="${w * 0.3}" height="${h}" fill="${c1}"/>`;
    case 'border':
      return `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${c0}"/>
        <rect x="${w * 0.2}" y="${h * 0.2}" width="${w * 0.6}" height="${h * 0.6}" fill="${c1}"/>`;
    case 'stripes': {
      const sh = h / 5;
      return [0,1,2,3,4].map(i =>
        `<rect x="0" y="${i * sh}" width="${w}" height="${sh}" fill="${i % 2 === 0 ? c0 : c1}"/>`
      ).join('');
    }
    case 'saltire':
      return `
        <rect x="0" y="0" width="${w}" height="${h}" fill="${c0}"/>
        <polygon points="0,0 ${w * 0.3},0 ${m},${m * 0.7} ${w * 0.7},0 ${w},0 ${w},${h * 0.3} ${w * 0.7 + m * 0.3},${m} ${w},${h * 0.7} ${w},${h} ${w * 0.7},${h} ${m},${m * 1.3} ${w * 0.3},${h} 0,${h} 0,${h * 0.7} ${m * 0.3 + 0},${m} 0,${h * 0.3}" fill="${c1}"/>`;
    default:
      return `<rect x="0" y="0" width="${w}" height="${h}" fill="${c0}"/>`;
  }
}

// ── Main export ───────────────────────────────────────────────────────────────
/**
 * Deterministically generate a flag for a fingerprint.
 * @param {string} fp – 16-char hex fingerprint
 * @param {number} [size=160] – tile size in px
 * @returns {{ pattern: string, colors: string[], code: string, svg: string, description: string }}
 */
export function forgeFlag(fp, size = 160) {
  if (!fp || fp.length < 6) {
    fp = '0000000000000000';
  }

  const patternIndex = fpByte(fp, 0, 8);
  const pattern = PATTERNS[patternIndex];
  const colors  = pickColours(fp);

  // 3-char code from fp chars (skipping 0, O, 1, I)
  const code = [6, 8, 10].map(i => {
    const v = parseInt(fp[i], 16);
    return CODE_ALPHABET[v % CODE_ALPHABET.length];
  }).join('');

  const innerSVG = drawPattern(pattern, colors, size);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" role="img" aria-label="Flag ${code}, ${describeFlag(pattern, colors)}">
  <title>Flag ${code}</title>
  <g>${innerSVG}
  </g>
  <rect x="0" y="0" width="${size}" height="${size}" fill="none" stroke="#000000" stroke-width="3"/>
</svg>`;

  return {
    pattern,
    colors,
    code,
    svg,
    description: describeFlag(pattern, colors),
  };
}

/**
 * Human-readable description for TalkBack / screen readers.
 */
function describeFlag(pattern, colors) {
  const colorNames = colors.map(hex =>
    Object.entries(COLOURS).find(([, v]) => v === hex)?.[0] ?? 'coloured'
  );
  const patterns = {
    quarters:   `${colorNames[0]} and ${colorNames[1]} quarters`,
    horizontal: `${colorNames[0]} top, ${colorNames[1]} bottom`,
    vertical:   `${colorNames[0]} left, ${colorNames[1]} right`,
    diagonal:   `${colorNames[0]} triangle, ${colorNames[1]} field`,
    cross:      `${colorNames[1]} cross on ${colorNames[0]} field`,
    border:     `${colorNames[0]} with ${colorNames[1]} centre`,
    stripes:    `${colorNames[0]} and ${colorNames[1]} stripes`,
    saltire:    `${colorNames[1]} saltire on ${colorNames[0]} field`,
  };
  return patterns[pattern] ?? colorNames.join(' and ');
}
