# AGENTS.md: Tracebeam

Instructions for AI coding agents working in this repo. Read this file first, then the doc that matches your task.

## What we are building

Tracebeam: when a developer hits an error, their phone redacts it on-device and finds a nearby developer who has already fixed it. Team Lagnarok, iQOO Hackathon 2026 Grand Finale, Community App track.

Read: `docs/PRD.md` (what), `docs/TECHNICAL.md` (how), `docs/DESIGN.md` (look and copy), `SKILLS.md` (reusable playbooks).

## Hard rules (never break these)

1. **No cloud.** No network calls in the core flow, no API keys, no servers. Android manifest has no `INTERNET` permission.
2. **Free tier only.** Do not add a paid service or a dependency that needs an account.
3. **Event rules.** Everything in `prototype/phase1/` is a dated concept prototype. Native Android code in `android/` is written only inside the event window. Never copy generated Phase 1 code into `android/` outside the window without the owner's say-so.
4. **Privacy.** Redaction runs before fingerprinting. Never log, broadcast, or preview unredacted trace text. Test data must use fake secrets only.
5. **Honest claims.** Never write "NPU" in code comments, docs, or UI unless a log in `docs/evidence/` shows the NPU backend ran. Label CPU or GPU runs as such. Synthetic ledger data is labelled synthetic.
6. **Design tokens only.** Colours, spacing, shadows, and fonts come from `styles/tokens.css` (web) or `Tb` (Compose). No raw hex in components.

## Repo layout

```
docs/                 PRD.md TECHNICAL.md DESIGN.md evidence/
prototype/phase1/     index.html styles/ src/ corpus/ tests/
android/              empty until the event window
```

## Commands (Phase 1)

```
npx serve prototype/phase1       # run locally
node --test prototype/phase1/tests   # run tests
```

## Code conventions

- Phase 1: vanilla JS ES modules, no framework, no bundler. One responsibility per file. Pure functions in `signature.js`, `flag.js`, `match.js` (no DOM, no storage) so they are testable and portable to Kotlin.
- Prefer small, readable functions over clever ones. A teammate must be able to explain every line on stage.
- Comments say why, not what. No dead code, no commented-out blocks.
- UI strings live in one `copy.js` file and follow the copy rules in `docs/DESIGN.md`.

## Design rules (summary, full detail in `docs/DESIGN.md`)

- Signal-flag neo-brutalism: 3 px black outline, 4 px hard shadow with zero blur, square corners, flat fills.
- Palette: hoist blue, distress red, pennant yellow, black, flag white, sea mist. Red is never text on white.
- Fonts: Archivo (display), Atkinson Hyperlegible Next (body), Martian Mono (real code only).
- Forbidden: gradients, blur shadows, rounded cards, emoji icons, ALL-CAPS eyebrows, arrow glyphs on buttons.
- State is never colour-only: shape plus label plus colour.
- One orchestrated motion: the hoist. Respect `prefers-reduced-motion`.

## Roles (use one at a time; stay in your lane)

| Role | Owns | Does not touch |
|---|---|---|
| Architect | `docs/`, interfaces between modules | UI styling |
| Signal engineer | `signature.js`, `match.js`, corpus, tests | UI, transport |
| Flag and UI builder | `flag.js`, `styles/`, `src/ui/` | Signal engine logic |
| Mesh and device | `mesh-sim.js`, haptics, later Nearby code | UI styling |
| QA and demo | tests, demo script, video checklist | Feature code |

If a task crosses lanes, say so, finish your part, and list what the next role must do.

## Workflow

1. Restate the task in two lines and name the PRD requirement ID (F1 to F12) it serves.
2. Write or update the test first when touching signal engine code.
3. Make the smallest change that works. Run the tests. Open the screen and check it.
4. Run the `design-lint` skill before finishing any UI change.
5. Summarise what changed, what you verified, and what you did not verify.

## Definition of done

- Tests pass (`node --test`).
- The change maps to a PRD requirement and its acceptance line is met.
- No hard rule broken. No raw hex, no network call, no unredacted logging.
- UI changes checked at 360 px wide, with reduced motion on, and with a keyboard.

## Starter prompts

- "Implement F2 in `signature.js`. Add tests from `corpus/` for every redaction rule in TECHNICAL.md section 5. Show me the failing tests first."
- "Build the Raise screen from DESIGN.md section 8. Use tokens only, then run design-lint."
- "Add 5 traces to `corpus/` for the gradle family, fake secrets only, and update `expected.json`."
