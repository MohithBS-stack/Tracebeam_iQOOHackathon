# SKILLS.md: Tracebeam

Reusable playbooks for AI agents. Each skill says when to use it, what it needs, the steps, and when it is done. Pair with `AGENTS.md` (rules) and the docs in `docs/`.

To use these as Claude Code skills, copy each section into `.claude/skills/<name>/SKILL.md` with this header:

```
---
name: <skill-name>
description: <the "When to use" line, written as a trigger>
---
```

## 1. trace-signature

**When to use:** building or changing how an error becomes a signature (F1, F2).
**Inputs:** `docs/TECHNICAL.md` section 5, `corpus/`.
**Steps:**
1. Write failing tests in `tests/signature.test.mjs` for each step: isolate, redact, template, family, extract, tokens, fingerprint, minhash.
2. Implement in `src/signature.js` as pure functions.
3. Run the 10 secret-seeded traces. Assert none of the fake secrets appear in `kw`, `cls`, or the beacon.
4. Report: signature success rate on 30 traces and time per signature.
**Done when:** 90% or more success, zero leaks, under 50 ms.

## 2. flag-forge

**When to use:** generating the flag for a fingerprint (F3).
**Inputs:** `docs/TECHNICAL.md` section 7, palette in `docs/DESIGN.md` section 4.
**Steps:**
1. Implement `forgeFlag(fp)` returning `{ pattern, colors, code, svg }`, deterministic.
2. Enforce the colour rules: adjacent fields differ, at least one of red, yellow, blue.
3. Draw with 3 px black outline and a hard shadow. Add an accessible text description.
4. Test: same `fp` gives byte-identical output; 1,000 random `fp` values never break the colour rules.
**Done when:** a gallery page shows 24 distinct flags with codes, all passing the tests.

## 3. match-score

**When to use:** tuning matching and measuring precision (F5).
**Inputs:** `src/match.js`, `corpus/ledger-seed.json`, `corpus/expected.json`.
**Steps:**
1. Implement the scoring from `docs/TECHNICAL.md` section 6.
2. Run every corpus trace against the seed ledger and compare to `expected.json`.
3. Print precision, recall, and the false alerts per 20 flags. Print the worst 5 misses with their shared tokens.
4. Adjust thresholds only with the evidence printed, and note the change in `docs/evidence/match-tuning.md`.
**Done when:** top-1 precision 80% or more and at most 1 false alert per 20 flags.

## 4. mesh-sim

**When to use:** simulating phones in the Phase 1 prototype (F4, F6, F7).
**Inputs:** `docs/TECHNICAL.md` section 8.
**Steps:**
1. Implement a `Mesh` interface: `advertise(beacon)`, `onBeacon(cb)`, `accept(id)`, `send(id, msg)`.
2. Back it with `BroadcastChannel` so two browser tabs act as two phones.
3. Add scripted peers with their own ledgers so a solo demo still produces matches.
4. Keep the interface identical to what the Android Nearby wrapper will expose later.
**Done when:** two tabs complete raise, match, accept, handshake, solved without a reload.

## 5. haptic-vocab

**When to use:** adding vibration feedback.
**Inputs:** pattern table in `docs/TECHNICAL.md` section 9.
**Steps:**
1. Put patterns in one `haptics.js` file keyed by event.
2. Guard with `navigator.vibrate` support and a settings toggle.
3. Always pair the haptic with a visual change and a text label.
**Done when:** each event has a pattern, a visual state, and a label.

## 6. fix-card

**When to use:** turning a solved error plus a voice note into a saved card (F8).
**Steps:**
1. Build the card: signature summary, flag code, date, helper note (typed or transcribed), tokens.
2. Save to the ledger. Mark confirmed when the asker taps Solved.
3. Export as markdown with a one-screen template. No raw trace text in the export unless the owner opts in.
**Done when:** a solved flow writes a `.md` file and the ledger shows the new entry.

## 7. design-lint

**When to use:** before finishing any UI change.
**Inputs:** `docs/DESIGN.md`.
**Checklist (report pass or fail for each):**
1. No raw hex outside `tokens.css`.
2. Every shadow has zero blur. Every border is 3 px (chips 2 px). No border radius except 0.
3. No gradients, no emoji icons, no ALL-CAPS eyebrows, no arrow glyphs on buttons.
4. Red is never used as text on white. Text/background pairs meet the contrast table.
5. State is shown by colour plus shape plus label.
6. Touch targets 48 dp or more (primary 56). Layout holds at 360 px wide.
7. `prefers-reduced-motion` handled for the hoist.
8. Copy follows `DESIGN.md` section 10.
**Done when:** all eight pass, or failures are listed with a reason.

## 8. npu-verify

**When to use:** anyone wants to claim NPU use (finale only).
**Steps:**
1. Run the same prompt on CPU, GPU, and NPU backends, 10 runs each.
2. Record backend name, model file, runtime version, first-token time, tokens per second, and the log lines that show the backend initialised.
3. Save to `docs/evidence/npu-<date>.md`.
4. Time-box the NPU attempt to 3 hours. If it fails, ship CPU or GPU and say so.
**Done when:** the evidence file exists, or the claim is dropped.

## 9. demo-script

**When to use:** preparing the 4-minute pitch and backup video.
**Inputs:** `docs/PRD.md` section 10.
**Steps:**
1. Write the script with timings and exact on-screen actions.
2. List every device, cable, and setting needed, including Office Kit paired and clipboard sync on.
3. Prepare a failure plan for each risky step (radio fails, OCR fails, mic fails) with a spoken line to cover it.
4. Rehearse three times with a timer and record the results.
**Done when:** three clean rehearsals under 4 minutes, plus a backup video.

## 10. submission-pack

**When to use:** the last two hours before any submission.
**Steps:**
1. README: what it is, how to run, screenshots, rules statement (Phase 1 concept prototype, dated; finale code written in the event window).
2. List open-source dependencies with licences.
3. Check the rubric map in `docs/PRD.md` section 6: each line has evidence ready.
4. Confirm no secrets, no real names, no unredacted traces in the repo.
**Done when:** a teammate can run the project from the README in 5 minutes.
