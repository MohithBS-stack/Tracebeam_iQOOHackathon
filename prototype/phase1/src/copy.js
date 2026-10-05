/**
 * copy.js – UI string constants (Phase 1)
 * All user-visible strings live here. Follow DESIGN.md §10 copy rules:
 * plain verbs, sentence case, active voice, same name for an action everywhere.
 */

export const COPY = {
  // ── App ─────────────────────────────────────────────────────────────────────
  appName:       'Tracebeam',
  appTagline:    'Find someone nearby who has fixed this',

  // ── Navigation ───────────────────────────────────────────────────────────────
  navListening:  'Listening',
  navLedger:     'Ledger',
  navRaise:      'Raise a flag',

  // ── Screen 1: Listening ───────────────────────────────────────────────────────
  nearbyCount:   (n) => `${n} developer${n !== 1 ? 's' : ''} nearby`,
  listeningHint: 'Listening for helpers in this room',
  noNearby:      'No one detected yet. Open the app on another phone.',

  // ── Screen 2: Raise a flag ───────────────────────────────────────────────────
  raiseTitle:    'Raise a flag',
  pasteLabel:    'Paste your error or stack trace',
  pastePlaceholder: 'Paste a stack trace or error here…',
  payloadLabel:  'We will send only this. Your code stays on your phone.',
  keywordsLabel: 'Signal keywords:',
  raiseBtn:      'Raise it',
  captureTip:    'Or use the camera to scan a screen →',
  captureBtn:    'Scan with camera',

  // ── Screen 3: Flag raised ────────────────────────────────────────────────────
  raisedTitle:   'Flag raised',
  waiting:       'Looking for someone nearby who has fixed this',
  cancelBtn:     'Cancel',
  flagCode:      (code) => `Code: ${code}`,

  // ── Screen 4: Match (helper) ─────────────────────────────────────────────────
  matchTitle:    'Someone nearby has this error',
  matchWhy:      (why) => why,
  notePreviewLabel: 'Your fix note:',
  acceptBtn:     'Accept',
  declineBtn:    'Not now',

  // ── Screen 5: Meet ───────────────────────────────────────────────────────────
  meetTitle:     'Find the matching flag',
  meetInstruction: 'Walk to the person showing this flag and code.',

  // ── Screen 6: Solved ─────────────────────────────────────────────────────────
  solvedTitle:   'Fixed.',
  voiceNoteLabel: 'Say what worked (20 s max)',
  holdToRecord:  'Hold to record',
  recording:     'Recording… release to stop',
  saveCard:      'Save fix card',
  skipNote:      'Skip note',

  // ── Ledger screen ────────────────────────────────────────────────────────────
  ledgerTitle:   'Your fix ledger',
  ledgerEmpty:   'No fixes yet. Mark your next fix as solved and it shows up here.',
  ledgerSearch:  'Search fixes',
  syntheticBadge:'Synthetic',
  confirmedBadge:'Confirmed',

  // ── Errors & permissions ──────────────────────────────────────────────────────
  permDenied:    'Tracebeam needs Nearby devices to find helpers. Open settings to allow it.',
  noInput:       'Paste a stack trace first.',
  signatureFail: 'Could not read a signature from this text. Try more of the trace.',
  exportDone:    (filename) => `Fix card saved as ${filename}`,

  // ── Onboarding ───────────────────────────────────────────────────────────────
  namePrompt:    'Your first name (shown only after you accept a match)',
  namePlaceholder:'e.g. Alex',
  nameSave:      'Save',
};
