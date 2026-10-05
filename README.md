# Tracebeam

**When you hit an error, your phone reads it on-device and quietly finds the nearby developer who has already fixed it.**

Team Lagnarok · iQOO Hackathon 2026 Grand Finale · Track: Community App

> **Phase 1 concept prototype** — dated 5 Oct 2026. Runs as a static web app in Chrome.  
> The native Android build (Kotlin, Jetpack Compose, Nearby Connections) will be written inside the event window (9–11 Oct 2026).

---

## How to run in 5 minutes

### Prerequisites

- Node.js 20+ (for tests and the local server)
- A modern browser (Chrome on Android or desktop)

### Steps

```bash
# 1. Clone or unzip the repo
cd Tracebeam

# 2. (Optional) copy the example env file
cp .env.example .env          # macOS/Linux/Git Bash
# Copy-Item .env.example .env  # PowerShell

# 3. Serve the Phase 1 prototype
npx serve prototype/phase1
# → Open http://localhost:3000 in Chrome

# 4. Run the tests
node --test prototype/phase1/tests
```

That is it. No `npm install`, no build step, no API keys.

---

## Demo (60-second loop)

1. **Open two tabs** at `http://localhost:3000` (simulate two phones in the same room).
2. Tab 1 → paste a stack trace → **Raise a flag** → flag hoists and is broadcast.
3. Tab 2 → receives a haptic match alert with the same flag, a reason line, and a fix-note preview.
4. Tab 2 → **Accept** → both tabs show the same flag and flag code.
5. Tab 1 → **Mark solved** → Tab 2 → hold to record a voice note → **Save fix card** → `.md` file downloads.

Even with only one tab, the scripted fake peers (Alex, Priya) will match your beacon automatically.

---

## Architecture

```
Tracebeam/
├── prototype/phase1/             Phase 1: Web Concept Prototype
│   ├── index.html                App shell, bottom nav bar
│   ├── styles/
│   │   ├── tokens.css            ALL colour, spacing, typography tokens
│   │   └── components.css        Button, flag tile, sheet, bottom bar, etc.
│   ├── src/
│   │   ├── app.js                Entry point – wires everything together
│   │   ├── signature.js          Signal engine (isolate→redact→template→fingerprint→minhash)
│   │   ├── flag.js               Flag Forge – deterministic SVG from fingerprint
│   │   ├── match.js              Matching engine (Jaccard, cooldown, recency boost)
│   │   ├── mesh-sim.js           BroadcastChannel mesh + scripted fake peers
│   │   ├── ledger.js             localStorage fix ledger + markdown export
│   │   ├── haptics.js            Haptic vocabulary (navigator.vibrate)
│   │   ├── state.js              Central state machine (subscribe / setState)
│   │   ├── copy.js               All UI strings in one file
│   │   └── ui/                   5 core screens (home, hoist, alert, solved, raised)
│   └── tests/                    72 passing unit & privacy tests
├── android/                      Phase 2: Native Android Jetpack Compose App
│   ├── build.gradle.kts          Root Gradle build configuration
│   ├── settings.gradle.kts       Module settings
│   ├── gradle/libs.versions.toml Version catalog
│   └── app/
│       ├── AndroidManifest.xml   Strict offline manifest (NO INTERNET permission)
│       └── src/main/java/dev/lagnarok/tracebeam/
│           ├── MainActivity.kt   State & permission host
│           ├── TracebeamApp.kt   Application entry
│           ├── core/             Kotlin SignatureEngine, FlagForge, Matcher, NearbyMeshManager
│           ├── data/             Room SQLite database, entities, and DAOs
│           ├── ocr/              CameraX & ML Kit offline text recognizer
│           └── ui/               Jetpack Compose screens (Home, Hoist, MatchAlert, SolveCard, Ledger)
└── office-kit/                   Office Kit: Laptop Companion (10% score rubric)
    ├── watch.mjs                 Terminal build watcher & fix card HTTP bridge
    └── README.md                 Office Kit documentation
```

### Signal engine pipeline

```
raw text (≤ 8 KB)
  → isolate   (first error line + 12 following)
  → redact    (emails, IPs, JWTs, AWS keys, long tokens, home paths)
  → template  (hex, UUIDs, numbers, quoted strings → placeholders)
  → family    (python | node | java | kotlin | gradle | react | flutter | cpp | rust | go)
  → extract   (errorClass, messageTemplate, library frames, version hints)
  → tokens    (≤ 24 lowercase word-pieces, deduplicated)
  → fingerprint   (SHA-256[family|class|message], first 16 hex chars)
  → minhash   (16 × 16-bit values, 32 bytes)
```

### Matching

```
if beacon.fp == entry.fp                      → score 1.0
else if same family and Jaccard(mh) ≥ 0.55   → score = Jaccard
else                                          → no match
score += recency bonus (≤ 0.10, within 14 days)
alert if score ≥ 0.60 and not on 60-s cooldown
```

---

## Design system

Signal-flag neo-brutalism: 3 px black outlines, 4 px hard zero-blur shadows, flat palette from the International Code of Signals.

| Token | Hex | Use |
|---|---|---|
| `--hoist-blue` | `#1B3FD8` | Brand, primary buttons, solved |
| `--distress-red` | `#E8262B` | Stuck state, flag fill |
| `--pennant-yellow` | `#FFC72C` | Match card, focus shadow |
| `--black` | `#000000` | Outlines, text |
| `--flag-white` | `#F5F7FA` | Background, cards |
| `--sea-mist` | `#DCE3F1` | Sunken surfaces |

Fonts: Archivo (display, weight 900, width 125%), Atkinson Hyperlegible Next (body), Martian Mono (code only).

**No raw hex anywhere except `styles/tokens.css`.**

---

## Tests

```bash
node --test prototype/phase1/tests
```

| Test | Target |
|---|---|
| Signature produced from corpus | ≥ 90% of traces |
| Secrets in beacon or preview | 0 |
| Top-1 match precision | ≥ 80% |
| False alerts in 20 flags | ≤ 1 |
| Flag SVG determinism | 1,000 random fps |
| Off-palette colours in SVG | 0 |

---

## PRD requirements covered

| ID | Requirement | Status |
|---|---|---|
| F1 | Capture from clipboard or camera | ✅ Clipboard (textarea + paste); camera OCR wired but requires localhost |
| F2 | Redact then sign | ✅ Redaction runs first; preview shows exact payload |
| F3 | Deterministic flag + 3-char code | ✅ Same fp → same SVG on every tab |
| F4 | Broadcast and discover | ✅ BroadcastChannel (two tabs) + scripted peers |
| F5 | Match and explain | ✅ Jaccard + shared token "why" line |
| F6 | Helper alert: haptic, flag, reason, fix preview | ✅ match sheet with Accept/Not now |
| F7 | Meet: same flag, first name only | ✅ Meet screen after mutual accept |
| F8 | Solve and remember | ✅ Voice note + ledger + .md export |
| F9 | Ledger search | ✅ Live-filtered list |

---

## Honest claims

- **No NPU**: this prototype runs in a browser. No neural backend of any kind.
- **CPU path only**: all signal processing is pure JS on the main thread.
- **Synthetic ledger**: `corpus/ledger-seed.json` entries are labelled `"synthetic": true`.
- **Simulated mesh**: `BroadcastChannel` is not Nearby Connections. The finale build uses real radio.

---

## Open-source dependencies & licences

| Library | Use | Licence |
|---|---|---|
| Google Fonts: Archivo | Display font | OFL 1.1 |
| Google Fonts: Atkinson Hyperlegible Next | Body font | OFL 1.1 |
| Martian Mono | Code font | OFL 1.1 |
| Node.js built-in `node:test` | Tests | MIT |
| `npx serve` | Local dev server | MIT |

No other runtime dependencies. No npm package.json. No bundler.

---

## Repo rules (from AGENTS.md)

1. No cloud, no network calls in the core flow, no API keys.
2. Free tier only.
3. Phase 1 code is concept prototype only; finale code written in the event window.
4. Redaction runs before fingerprinting. No unredacted logging.
5. No "NPU" claims without evidence in `docs/evidence/`.
6. No raw hex outside `styles/tokens.css`.

---

*Tracebeam · Team Lagnarok · iQOO Hackathon 2026 Grand Finale*
