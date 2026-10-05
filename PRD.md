# Tracebeam: Product Requirements (v0.1, 4 Oct 2026)

Team Lagnarok. iQOO Hackathon 2026 Grand Finale (Bengaluru, 9–11 Oct). Track: **Community App**.

## 1. One-liner

When you hit an error, your phone reads it on-device and quietly finds the nearby developer who has already fixed it.

## 2. Problem

In any room of developers (hackathon hall, college lab, coworking floor, office floor) someone is stuck on an error that someone else already solved. They never connect. Asking aloud is awkward, searching alone is slow, and cloud AI knows nothing about who in the room has the fix.

Existing tools, as found in searches on 4 Oct 2026 (not proof of absence):
- Event matchmakers (Swapcard, Brella, Grip) match profiles and agendas, not live problems.
- AI debuggers (Sentry Seer, Devin, Tracelit) replace the human and run in the cloud.
- Nothing found that starts from a live error and finds a nearby human who has fixed it.

## 3. Users

| Persona | Need | What makes them say yes |
|---|---|---|
| Stuck (student or pro dev, mid-task) | Unblocked in minutes, no embarrassment | One tap, nothing leaves the phone except a redacted signature |
| Helper (solved something similar recently) | Help only when it is specific and cheap | Opt-in, sees the error summary first, can decline silently |
| Mentor (hackathon mentor, lab TA) | Know who needs help without walking the room | Always-available toggle (P2) |

## 3a. Goals and non-goals

Goals: an end-to-end loop that runs on the iQOO phone in under 60 seconds; fully on-device; free tier only; each rubric line has visible evidence.

Non-goals: accounts, cloud sync, chat, IDE plugin, payments, tamper-proof reputation, iOS.

## 4. Core loop

1. **Raise**: capture the error (clipboard via Office Kit, or camera OCR). Phone redacts it and shows exactly what will be broadcast.
2. **Match**: nearby phones compare the beacon to their private Fix Ledger. Non-helpers never see anything and never connect.
3. **Meet**: the helper gets a haptic buzz and a card. On accept, both phones show the same flag full screen: find the matching flag.
4. **Solve**: the asker taps Solved and the helper adds a 20-second voice note.
5. **Remember**: the note becomes a fix card in the helper's ledger and exports to the laptop as markdown.

## 5. Requirements

### P0 (must work in the demo)

| ID | Requirement | Acceptance |
|---|---|---|
| F1 | Capture an error from the clipboard or the camera | At least 90% of the 30-trace corpus yields a signature. OCR of a 12-line trace in under 3 s. |
| F2 | Redact then sign | Zero secrets in the broadcast across the secret-seeded corpus. Preview screen shows the exact payload. |
| F3 | Deterministic flag plus 3-character code per signature | Same signature gives the same flag on every device. |
| F4 | Broadcast and discover with no internet | First match in 3 s or less across 3 phones in one room. |
| F5 | Match against the local ledger and explain why | Top-1 precision at least 80% on the corpus. False alerts at most 1 per 20 flags. |
| F6 | Helper alert: haptic pattern, flag, one-line reason, fix-note preview, Accept or Not now | Declining sends nothing back. |
| F7 | Meet: both phones show the same flag and first name only | Names are self-declared and never broadcast before accept. |
| F8 | Solve and remember | Voice note (20 s max) saved to the ledger. Fix card exported to the laptop as .md through Office Kit. |

### P1 (if time allows)

| ID | Requirement |
|---|---|
| F9 | Ledger screen: list and search of own fixes |
| F10 | "Available to help" toggle and quiet hours |
| F11 | Warmer/colder distance hint from BLE signal strength |
| F12 | On-device LLM writes the one-line summary (CPU or GPU first; NPU only with evidence) |

### P2

Mentor mode, more language families, room-level anonymised "what is stuck" view.

## 6. Rubric map

| Criterion | Weight | Earned by | Evidence in the demo |
|---|---|---|---|
| Product quality | 30% | One tight loop, no dead ends, finished neo-brutal UI | Live run with no crash. Backup video. |
| Novelty and impact | 20% | Error-triggered human matching, proof-of-fix ledger | One slide: Tracebeam vs Swapcard vs Sentry Seer |
| Creative phone use (HackTracker) | 15% | Camera OCR, voice note, haptic vocabulary, local radios, on-device AI | Each sensor used on stage |
| Technical depth | 15% | Redaction, templating, MinHash matching, offline mesh, tiered AI with fallbacks | Architecture slide and corpus accuracy number |
| Office Kit (HackTracker) | 10% | Clipboard in, fix card out, model file transfer, screen mirror | Each used at least once during build and demo |
| Demo and presentation | 10% | 4-minute script rehearsed three times | Timer on stage |

A local or open-source model at the core earns bonus points, so keep tier 3 (the LLM) in the pitch even though the core loop does not depend on it.

## 7. Success metrics

- Time from error to helper buzz: 3 s or less.
- Corpus: signature success 90% or more, top-1 match precision 80% or more, secret leaks 0.
- Demo: full loop in 60 s or less, rehearsed 3 times without a failure.

## 8. Phasing (important, read the event rules)

The published rules say competition code must be written during the event window, and pre-event idea drafting is allowed. Treat today's build as a **dated, clearly labelled Phase 1 concept prototype** (web, in `prototype/phase1/`). Write the native Android build inside the event window. Confirm with the organisers whether preparatory code may be reused (organiser contact is on iqoo.reskilll.com).

| | Phase 1 (today) | Finale (event window) |
|---|---|---|
| Platform | Static web prototype, runs in Android Chrome | Native Android, Kotlin, Compose |
| Mesh | Simulated: two browser tabs plus scripted peers | Real Nearby Connections between phones |
| AI | Rules and fuzzy matching in JS, optional browser OCR | ML Kit OCR, optional on-device LLM |
| Purpose | Idea submission, visual proof, de-risk UX | The scored product |

## 9. Under-a-day plan (Phase 1, about 10 hours)

| Hours | Work | Skill used |
|---|---|---|
| 0:00–0:45 | Repo, tokens, fonts, agent files in place | design-lint |
| 0:45–2:30 | Signal engine and 30-trace corpus with tests | trace-signature, match-score |
| 2:30–3:30 | Flag generator | flag-forge |
| 3:30–6:00 | Five screens wired to one state machine | design-lint |
| 6:00–7:30 | Mesh simulator, haptics, ledger | mesh-sim, haptic-vocab |
| 7:30–8:30 | Optional camera OCR, voice note, markdown export | fix-card |
| 8:30–9:30 | Hoist animation, empty and error states, reduced motion | design-lint |
| 9:30–10:30 | 90-second video, README, submission pack | submission-pack |
| Buffer | 1.5 hours | |

## 10. Demo script (4 minutes)

- 0:00–0:30 Problem: every hallway has someone stuck and someone who already solved it.
- 0:30–2:30 Live: break a build on the laptop. Office Kit sends the trace to the phone. Raise the flag. A teammate's phone across the room buzzes with the same flag and a fix note. Walk over, fix it, mark solved, speak the note. Fix card lands on the laptop.
- 2:30–3:30 Tech: no INTERNET permission in the manifest, three tiers (rules, fuzzy match, optional LLM), honest backend labels (CPU or NPU).
- 3:30–4:00 Impact: hackathons, labs, coworking, office floors. A community knowledge base that never leaves the room.

## 11. Risks

| Risk | Mitigation |
|---|---|
| Nearby needs Google Play Services on the loaner | Check on arrival. Fallback in TECHNICAL.md. |
| NPU setup eats the weekend | CPU or GPU first. NPU time-boxed to 3 hours. |
| OCR is poor on a monitor | Clipboard is the primary path, camera is the showpiece. |
| Not enough fixes in the ledger for a live match | Seed synthetic fixes during the event. Say so on stage. |
| Rules question on prep code | Label Phase 1, write the finale build in the window, ask the organisers. |

## 12. Open questions for organisers

1. May Phase 1 prototype code be referenced in the event build?
2. Exact loaner model, RAM, storage, and whether Google Play Services is present.
3. What is allowed on the laptop during Red Light, and is Office Kit available before check-in?
4. Final submission cutoff on Sunday and required video format.
