/**
 * state.js – Application state machine (Phase 1)
 * Central store – one object, one setState, subscribers notified on change.
 * Screens: listening | raise | raised | match | meet | solved | ledger
 */

/**
 * @typedef {'listening'|'raise'|'raised'|'match'|'meet'|'solved'|'ledger'} Screen
 */

/** @type {AppState} */
const initialState = {
  screen:        'listening',   // current screen

  // Signal engine
  rawTrace:      '',            // user-pasted text
  signature:     null,          // Signature|null

  // Peers
  nearbyCount:   0,             // simulated count for display
  peerId:        null,          // ephemeral session ID of matched peer

  // Match result
  matchResult:   null,          // MatchResult|null (helper side)
  isHelper:      false,         // true when this tab is acting as helper

  // Meet / solve
  helperName:    '',            // self-declared name of helper (shown after accept)
  askerName:     '',            // self-declared name of asker

  // Voice note
  audioBlob:     null,          // Blob|null
  noteText:      '',            // typed or transcribed note
  recording:     false,         // microphone active

  // UI state
  hoisting:      false,         // hoist animation running
  loading:       false,         // async operation in progress
  error:         '',            // error message to display
};

let _state = { ...initialState };
const _subscribers = new Set();

/**
 * Read the current state snapshot.
 * @returns {Readonly<typeof initialState>}
 */
export function getState() {
  return Object.freeze({ ..._state });
}

/**
 * Merge partial updates into state and notify all subscribers.
 * @param {Partial<typeof initialState>} patch
 */
export function setState(patch) {
  _state = { ..._state, ...patch };
  for (const cb of _subscribers) cb(getState());
}

/**
 * Navigate to a screen.
 * @param {Screen} screen
 */
export function navigate(screen) {
  setState({ screen, error: '' });
}

/**
 * Subscribe to state changes.
 * @param {(state: ReturnType<typeof getState>) => void} cb
 * @returns {() => void} unsubscribe
 */
export function subscribe(cb) {
  _subscribers.add(cb);
  return () => _subscribers.delete(cb);
}

/** Reset to initial state (test helper). */
export function resetState() {
  _state = { ...initialState };
}

// ── Derived helpers ───────────────────────────────────────────────────────────
export function isOnScreen(screen) {
  return _state.screen === screen;
}
