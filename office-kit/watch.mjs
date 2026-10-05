/**
 * office-kit/watch.mjs – Office Kit Laptop Companion Daemon (Phase 2)
 *
 * Touchpoints (TECHNICAL.md §10):
 * 1. Laptop -> Phone: Captures broken terminal build output, generates privacy-safe
 *    trace beacon, and prints QR/URL bridge or relays via adb/local bridge.
 * 2. Phone -> Laptop: Receives exported `.md` fix cards into the project repository.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { buildSignature } from '../prototype/phase1/src/signature.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CARDS_DIR = join(__dirname, '../fix-cards');

if (!existsSync(CARDS_DIR)) {
  mkdirSync(CARDS_DIR, { recursive: true });
}

// ── HTTP Sync Bridge for Phone -> Laptop Fix Cards ────────────────────────────
const PORT = process.env.OFFICE_KIT_PORT || 3030;

const server = createServer(async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/cards') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const card = JSON.parse(body);
        const filename = `fix-${card.fp || 'unknown'}-${Date.now()}.md`;
        const filepath = join(CARDS_DIR, filename);

        const content = [
          `# Tracebeam Fix Card: ${card.cls || 'Error'}`,
          `**Fingerprint:** \`${card.fp}\` · **Family:** \`${card.fam}\``,
          `**Date:** ${new Date().toISOString()}`,
          '',
          '## Resolution',
          card.summary || 'No summary provided.',
          '',
          '## Spoken Voice Note',
          card.voiceNote || '_No voice note recorded._',
          '',
          '---',
          '_Received via Tracebeam Office Kit companion._'
        ].join('\n');

        writeFileSync(filepath, content, 'utf8');
        console.log(`\n[Office Kit] Received fix card from phone: ${filename}`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, file: filename }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // Health check
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'Office Kit Daemon Active', port: PORT }));
});

server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` Tracebeam Office Kit – Laptop Companion Daemon Active`);
  console.log(` Listening on http://localhost:${PORT}`);
  console.log(` Fix cards destination: ${CARDS_DIR}`);
  console.log(`=======================================================`);
  console.log(`Usage:`);
  console.log(`  Pipe build error:  npm run build 2>&1 | node office-kit/watch.mjs`);
  console.log(`=======================================================\n`);
});

// ── STDIN Terminal Error Piper ────────────────────────────────────────────────
if (!process.stdin.isTTY) {
  let stdinBuffer = '';
  process.stdin.on('data', chunk => { stdinBuffer += chunk; });
  process.stdin.on('end', async () => {
    if (stdinBuffer.trim().length > 0) {
      console.log('[Office Kit] Parsing terminal error stream on-device…');
      const sig = await buildSignature(stdinBuffer);
      if (sig) {
        console.log(`\n[Office Kit] Isolated and Redacted Error:`);
        console.log(`  Family:      ${sig.fam}`);
        console.log(`  Class:       ${sig.cls}`);
        console.log(`  Fingerprint: ${sig.fp}`);
        console.log(`  Keywords:    ${sig.kw.join(', ')}`);
        console.log(`  Beacon ready to broadcast to nearby peers.\n`);
      } else {
        console.log('[Office Kit] No fatal error pattern detected in stream.');
      }
    }
  });
}
