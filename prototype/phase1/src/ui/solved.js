/**
 * solved.js – Screen 6: Solved + voice note + fix card export
 * F8: Voice note (20 s max), fix card saved to ledger, exported as .md
 */

import { COPY } from '../copy.js';
import { getState, subscribe, setState, navigate } from '../state.js';
import { addEntry, toMarkdown, getHelperName } from '../ledger.js';
import { vibrate } from '../haptics.js';

let mediaRecorder = null;
let audioChunks   = [];
let recordingTimer = null;
const MAX_DURATION = 20000; // 20 s

// ── Mount ─────────────────────────────────────────────────────────────────────
export function mountSolved(container) {
  container.innerHTML = renderSolved(getState());
  bindSolved(container);

  const unsub = subscribe((state) => {
    if (state.screen !== 'solved') return;
    container.innerHTML = renderSolved(state);
    bindSolved(container);
  });

  return unsub;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderSolved(state) {
  return `
    <div class="screen" id="screen-solved" aria-label="Solved screen">
      <div class="top-bar">
        <span class="subheading">${COPY.solvedTitle}</span>
      </div>

      <div class="stack" style="margin-top: var(--space-6);">
        <p class="body-text">${COPY.voiceNoteLabel}</p>

        <button id="btn-record" class="recorder-btn"
          ${state.recording ? 'data-recording=""' : ''}
          aria-label="${state.recording ? COPY.recording : COPY.holdToRecord}"
          aria-pressed="${state.recording}">
          <span aria-hidden="true">${state.recording ? '🔴' : '🎙'}</span>
          ${state.recording ? COPY.recording : COPY.holdToRecord}
        </button>

        ${state.audioBlob ? `
        <p class="small-text" style="font-weight:700">Recording captured ✓</p>` : ''}

        <label class="subheading" for="note-text">Or type your note</label>
        <textarea id="note-text" class="trace-box" rows="4"
          placeholder="e.g. Added abiFilters arm64-v8a in build.gradle…"
          aria-label="Fix note">${state.noteText}</textarea>

        <button id="btn-save-card" class="btn btn--primary">${COPY.saveCard}</button>
        <button id="btn-skip-note" class="btn btn--ghost">${COPY.skipNote}</button>
      </div>
    </div>`;
}

// ── Bind ──────────────────────────────────────────────────────────────────────
function bindSolved(container) {
  const btnRecord   = container.querySelector('#btn-record');
  const btnSave     = container.querySelector('#btn-save-card');
  const btnSkip     = container.querySelector('#btn-skip-note');
  const noteTextarea = container.querySelector('#note-text');

  if (noteTextarea) {
    noteTextarea.addEventListener('input', () =>
      setState({ noteText: noteTextarea.value })
    );
  }

  if (btnRecord) {
    btnRecord.addEventListener('pointerdown', startRecording);
    btnRecord.addEventListener('pointerup',   stopRecording);
    btnRecord.addEventListener('pointerleave', stopRecording);
  }

  if (btnSave) {
    btnSave.addEventListener('click', saveFixCard);
  }

  if (btnSkip) {
    btnSkip.addEventListener('click', () => saveFixCard(true));
  }
}

// ── Recording ─────────────────────────────────────────────────────────────────
async function startRecording() {
  if (getState().recording) return;
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    audioChunks  = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = e => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const blob = new Blob(audioChunks, { type: 'audio/webm' });
      setState({ audioBlob: blob, recording: false });
      stream.getTracks().forEach(t => t.stop());
    };
    mediaRecorder.start();
    setState({ recording: true });
    recordingTimer = setTimeout(stopRecording, MAX_DURATION);
  } catch {
    // Mic permission denied or unavailable – silent fail, typed note still works
    setState({ recording: false });
  }
}

function stopRecording() {
  if (!getState().recording) return;
  clearTimeout(recordingTimer);
  if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
  setState({ recording: false });
}

// ── Save fix card ─────────────────────────────────────────────────────────────
async function saveFixCard(skipNote = false) {
  const state = getState();
  const sig   = state.signature;
  if (!sig) { navigate('listening'); return; }

  const noteText = skipNote ? '' : (state.noteText || '');

  const card = addEntry({
    fp:        sig.fp,
    fam:       sig.fam,
    cls:       sig.cls,
    kw:        sig.kw,
    mh:        sig.mh,
    note:      noteText,
    confirmed: false,
    synthetic: false,
  });

  vibrate('solved');

  // Export as .md
  const md       = toMarkdown(card);
  const filename = `tracebeam-fix-${card.fp.slice(0, 8)}.md`;
  downloadMarkdown(md, filename);

  setState({ noteText: '', audioBlob: null, signature: null });
  navigate('listening');
}

function downloadMarkdown(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
