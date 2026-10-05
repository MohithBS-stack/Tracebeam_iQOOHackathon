# Tracebeam Office Kit (Laptop Companion)

The **Office Kit** provides seamless developer workflows connecting your laptop terminal and your phone during hackathons or sprint sessions, satisfying the 10% rubric touchpoint in [TECHNICAL.md §10](file:///c:/Users/mohit/OneDrive/Desktop/Tracebeam/TECHNICAL.md#L145-L153).

---

## Capabilities

1. **Laptop -> Phone (Error Pipe & Beacon Generation):**
   - Automatically parses terminal build errors or compiler crashes.
   - Runs local redaction, templating, and fingerprinting immediately on your machine without cloud exposure.
   - Displays the ready-to-broadcast beacon and keywords.

2. **Phone -> Laptop (Fix Card Sync):**
   - Once a nearby peer accepts and you mark an error solved on the phone, the phone syncs the resolution `.md` fix card back to your laptop repository in `fix-cards/`.

---

## How to Run

### 1. Start the Companion Daemon
```bash
node office-kit/watch.mjs
```
The daemon starts listening on `http://localhost:3030`.

### 2. Pipe Broken Build Errors
```bash
# Pipe failing build directly into Office Kit:
npm test 2>&1 | node office-kit/watch.mjs
# or:
./gradlew build 2>&1 | node office-kit/watch.mjs
```
The signal engine isolates the error line, redacts sensitive paths/credentials, and prints the deterministic fingerprint and broadcast beacon.
