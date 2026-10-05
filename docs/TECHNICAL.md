# Tracebeam: Technical Document (v0.1, 4 Oct 2026)

## 1. Overview

Two builds share one idea and one signal engine design:

- **Phase 1 (today)**: static web prototype, no build step, runs on a laptop and in Android Chrome. Peers are simulated.
- **Finale build (event window)**: native Android (Kotlin, Jetpack Compose) with real phone-to-phone discovery.

Everything is free tier. No server, no accounts, no API keys. The Android app declares **no INTERNET permission**.

## 2. Architecture

```
 Laptop (Office Kit)         Phone A (asker)                      Phone B (helper)
 ┌──────────────┐  clipboard ┌──────────────────────────┐        ┌──────────────────────────┐
 │ terminal/IDE │ ─────────▶ │ Capture (paste | camera) │        │ Discovery listener       │
 └──────────────┘            │   ▼                      │        │   ▼                      │
        ▲                    │ Signal engine            │ beacon │ Matcher ◀── Fix Ledger   │
        │ fix card .md       │ redact → template →      │ ─────▶ │   ▼ (hit)                │
        └─────────────────── │ tokens → fingerprint     │ (radio)│ Alert: haptic + card     │
          file transfer      │   ▼                      │        │   ▼ accept               │
                             │ Beacon + Flag Forge      │ ◀────▶ │ Handshake (name + note)  │
                             └──────────────────────────┘        └──────────────────────────┘
```

Non-matching phones receive only the beacon and never connect.

## 3. Phase 1 stack (web)

| Concern | Choice |
|---|---|
| Language | Vanilla JS (ES modules), CSS variables from `DESIGN.md` |
| Build | None. Serve with `npx serve` or GitHub Pages |
| Tests | `node --test` (built in, zero dependencies) |
| Peers | `BroadcastChannel` between two tabs plus scripted fake peers |
| Haptics | `navigator.vibrate` (Android Chrome) |
| Voice note | Web Speech API (needs network in Chrome, fine for Phase 1) |
| OCR (optional) | Tesseract.js from jsDelivr, pinned version |
| Storage | `localStorage` or IndexedDB for the ledger |
| Export | Blob download of a `.md` fix card |

Host on localhost or GitHub Pages. Do not rely on a sandboxed artifact host for OCR, because the OCR worker and language data load from other origins that such hosts block.

Repo layout:

```
tracebeam/
  AGENTS.md  SKILLS.md
  docs/            PRD.md  TECHNICAL.md  DESIGN.md
  prototype/phase1/
    index.html
    styles/tokens.css  styles/components.css
    src/signature.js  flag.js  match.js  mesh-sim.js  ledger.js  haptics.js  state.js
    src/ui/          home.js  hoist.js  raised.js  alert.js  solved.js
    corpus/          traces/*.txt  ledger-seed.json  expected.json
    tests/           signature.test.mjs  match.test.mjs  redaction.test.mjs
  android/         (empty until the event window)
```

## 4. Finale stack (Android)

| Concern | Choice | Notes |
|---|---|---|
| UI | Kotlin + Jetpack Compose, custom neo-brutal components, no Material | Tokens from `DESIGN.md` |
| Discovery and transport | Google Nearby Connections, strategy `P2P_CLUSTER` | Offline, many-to-many. Needs `BLUETOOTH_ADVERTISE`, `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT`, `NEARBY_WIFI_DEVICES` (Android 13+) |
| OCR | ML Kit Text Recognition, bundled model | Works offline, free |
| Camera | CameraX | Capture 3 frames, keep the highest confidence |
| Storage | Room (SQLite) | Fix Ledger and settings |
| Speech | `SpeechRecognizer.createOnDeviceSpeechRecognizer` (API 31+) | If no language pack, save the audio without transcript |
| Haptics | `VibrationEffect.createWaveform` | Patterns in section 9 |
| LLM (tier 3, optional) | LiteRT-LM with Gemma 4 E2B or a small Qwen | One-line summary only. Not on the critical path |
| Office Kit | OS-level clipboard sync and file transfer, no SDK | See section 10 |

Permissions: `CAMERA`, `RECORD_AUDIO`, `VIBRATE`, the Nearby set above. After the first release build, inspect the merged manifest and confirm `INTERNET` is absent. If a dependency injects it, remove it with `tools:node="remove"`.

## 5. Signal engine

Input: up to 8 KB of text. Output: a `Signature`.

1. **Isolate**: find the first line matching `error|exception|traceback|fatal|failed` (case-insensitive) and keep up to 12 following lines.
2. **Redact (before anything else)**: emails, IPv4 and IPv6, URLs with credentials, JWT-like strings (`eyJ…`), AWS-style keys (`AKIA…`), any token of 24+ characters of `[A-Za-z0-9_-]`, home directories and usernames in paths.
3. **Template**: replace hex literals with `<HEX>`, UUIDs with `<UUID>`, numbers with `<N>`, quoted strings with `<STR>`, absolute paths with their last segment only.
4. **Family**: regex cues choose one of `python | node | java | kotlin | gradle | react | flutter | cpp | rust | go | unknown`.
5. **Extract**: `errorClass`, `messageTemplate`, up to 3 library frames (package or module names, never app code), version hints (for example `NDK 26`, `node 20`).
6. **Tokens**: lowercase word pieces of the above, deduplicated, at most 24.
7. **Fingerprint**: first 16 hex chars of `SHA-256(family | errorClass | messageTemplate)`.
8. **MinHash**: 16 hash functions over the token set, 16 bits each, giving 32 bytes.

```ts
type Signature = {
  v: 1; fp: string; fam: string; cls: string;
  kw: string[];        // at most 8, shown in the preview
  mh: Uint8Array;      // 32 bytes
  ts: number;          // unix seconds
  ttl: number;         // seconds, default 600
};
```

## 6. Matching

Runs on the helper's phone against the local Fix Ledger.

```
if beacon.fp == entry.fp                          score = 1.0
else if beacon.fam == entry.fam
     and jaccardEstimate(mh) >= 0.55              score = jaccard
else                                              no match
score += min(0.10, recencyBoost(entry.solvedAt))   // within 14 days
alert if score >= 0.60 and cooldown(fp) > 60 s
```

The "why" line shown on the card is the shared tokens, so the match is explainable ("both mention `ndk`, `abi`, `mismatch`").

## 7. Flag Forge

Deterministic from `fp`. Same input, same output on every device.

- Pattern (3 bits): quarters, horizontal split, vertical split, diagonal, cross, border, five stripes, saltire.
- Colours (from the palette in `DESIGN.md`): pick two or three from red, yellow, blue, black, white. Adjacent fields must differ and at least one must be red, yellow, or blue.
- Code: 3 characters from `fp` (alphabet without `0 O 1 I`) shown under the flag, so two similar flags can still be told apart.
- Output: SVG string (web) or Compose `Canvas` drawing (Android).

## 8. Wire protocol

Nearby Connections: service id `dev.lagnarok.tracebeam`, strategy `P2P_CLUSTER`.

1. Asker advertises. The advertisement info carries a compact **beacon**: `fp` (8 bytes), `fam` (1 byte), `ts` (4 bytes), `mh` (32 bytes), roughly 45 bytes. Advertisement info is size-limited, so check the current limit in the Nearby docs at build time and trim if needed.
2. Every phone discovers continuously. On `onEndpointFound`, the matcher runs against the beacon. **No match means no connection.**
3. On a match, the helper phone alerts. If the helper taps Accept, it calls `requestConnection`.
4. The asker sees the helper's first name and fix-note preview, then taps Accept. Only then is the `Handshake` sent: `{ name, note }`.
5. After the meet, either side disconnects. The asker's Solved tap sends `{ solvedBy }` so the helper's ledger can count a confirmed fix.

Ephemeral endpoint names (random per session) so devices cannot be tracked across sessions.

## 9. Haptic vocabulary

| Event | Pattern (ms, off/on alternating, starting with a pause) |
|---|---|
| Flag raised (asker) | `[0, 250]` |
| Match found (helper) | `[0, 60, 80, 60, 80, 60, 120, 260]` |
| Accepted | `[0, 120, 60, 120]` |
| Solved | `[0, 40, 40, 40, 40, 200]` |

## 10. Office Kit touchpoints (10% of the score, measured)

| Direction | Use |
|---|---|
| Laptop to phone | Shared clipboard: copy a trace on the laptop and the phone offers "Raise a flag" |
| Laptop to phone | File transfer: copy the model file onto the phone (no internet needed) |
| Phone to laptop | File transfer: fix card `.md` into the laptop's folder |
| Both | Screen mirror and remote input for the live demo |

## 11. Tiers and fallbacks

| Tier | What it does | Needed for the demo? | Fallback |
|---|---|---|---|
| 1 | Rules: redact, template, fingerprint | Yes | none, it is the core |
| 2 | MinHash fuzzy match | Yes | exact fingerprint only |
| 3 | On-device LLM writes one-line summary and fix card | No | template-based summary |

NPU: Google's LiteRT supports the Snapdragon 8 Elite Gen 5 (SM8850) through its Qualcomm accelerator, but developers report the NPU path can fail silently on library version mismatches. Ship the CPU or GPU path first, time-box NPU to 3 hours, and say "NPU" on stage only if you have logs proving that backend ran. A label of CPU or GPU is fine and honest.

Discovery fallback if Nearby is unavailable on the loaner: advertise and scan with plain BLE (manufacturer data carries `fp` prefix and `fam`), and confirm the match over a short GATT exchange. Slower to build, so decide in the first two hours.

## 12. Privacy rules (enforced by tests)

- Redaction runs before fingerprinting, and tests seed secrets in the corpus and assert they never appear in any beacon or preview.
- The preview screen shows exactly the bytes that will be broadcast.
- Nothing is sent to a non-matching phone beyond the beacon.
- Names are shared only after both sides accept.
- The ledger never leaves the device. Export is a user-initiated file transfer.

## 13. Test plan

Corpus (`prototype/phase1/corpus/`): 30 traces (5 families times 6), 10 secret-seeded traces, 10 negatives. `ledger-seed.json` holds synthetic fixes, labelled as synthetic.

| Test | Target |
|---|---|
| Signature produced | 90% or more of 30 |
| Secrets in beacon or preview | 0 |
| Top-1 match precision | 80% or more |
| False alerts | at most 1 in 20 flags |
| Signature time | under 50 ms |
| Beacon to alert (real phones) | 3 s or less |

## 14. Finale build blocks (align to the published Red and Green Light windows)

| Block | Work | Light |
|---|---|---|
| A | Gradle skeleton, tokens, fonts, Compose components, port signal engine from JS | Green |
| B | Nearby hello-world between two phones, then beacon match | Green |
| C | On-device testing through Office Kit: OCR, haptics, permissions, copy | Red |
| D | Alert, meet, solve, ledger, fix card export | Green or Red |
| E | Optional LLM summary (time-boxed), polish, backup video, rehearsals | Red |

Checkpoint targets: first checkpoint shows raise and match on two phones, second shows the full loop, third shows polish and the pitch.

## 15. Sources (checked 4 Oct 2026)

- Nearby Connections strategies and permissions: developers.google.com/android/reference/com/google/android/gms/nearby/connection/Strategy
- LiteRT Qualcomm NPU support and SoC list: ai.google.dev/edge/litert/next/qualcomm
- LiteRT-LM on Qualcomm NPU, reported init pitfalls: dev.to/jdshah (six silent failures article) and github.com/google-ai-edge/LiteRT-LM issue 2226
- Event rules and rubric: reskilll.com iQOO blog and iqoo.reskilll.com guide
