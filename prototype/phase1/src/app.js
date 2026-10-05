/**
 * app.js – App entry point (Phase 1)
 * Wires state machine to screen mounting and bottom bar navigation.
 * Starts mesh simulator and scripted peers.
 */

import { getState, subscribe, navigate, setState } from './state.js';
import { mountHome }   from './ui/home.js';
import { mountRaise, mountRaised } from './ui/hoist.js';
import { mountMatch, mountMeet, showMatchAlert }  from './ui/alert.js';
import { mountSolved }  from './ui/solved.js';
import { mountLedger }  from './ui/raised.js';
import { onBeacon, onMessage, startScriptedPeers, getSessionId, MSG } from './mesh-sim.js';
import { seedIfEmpty, getHelperName, setHelperName } from './ledger.js';
import { findBestMatch, shouldAlert } from './match.js';
import { vibrate } from './haptics.js';

// ── Bootstrap ─────────────────────────────────────────────────────────────────
async function init() {
  // Seed the ledger with synthetic data if empty
  const seedData = await fetch('./corpus/ledger-seed.json').then(r => r.json()).catch(() => []);
  seedIfEmpty(seedData);

  // Prompt for name if not set
  if (!getHelperName()) {
    const name = prompt('Your first name (shown only after you accept a match):') ?? 'Dev';
    setHelperName(name.trim() || 'Dev');
  }

  // Simulate growing nearby count for demo
  simulateNearbyCount();

  // Start mesh listener (BroadcastChannel – catches beacons from other tabs)
  onBeacon((beacon, sessionId) => {
    const { isHelper } = getState();
    if (isHelper) return; // already matched

    // Run match against the seeded ledger
    const ledger = JSON.parse(localStorage.getItem('tb:ledger:v1') ?? '[]').map(e => ({
      ...e,
      mh: new Uint8Array(e.mh),
    }));
    const match = findBestMatch(beacon, ledger);

    if (match && shouldAlert(beacon.fp)) {
      showMatchAlert(match, sessionId);
    }
  });

  onMessage((type, payload, fromSessionId) => {
    if (type === MSG.ACCEPT) {
      // Asker receives accept from helper
      setState({ helperName: payload.name });
      navigate('meet');
      vibrate('accepted');
    }
    if (type === MSG.SOLVED) {
      // Helper is notified the asker solved it
      navigate('listening');
    }
  });

  // Start scripted fake peers (solo demo – they respond to our beacons)
  startScriptedPeers((matchResult, peer) => {
    showMatchAlert(matchResult, 'scripted-peer');
  });

  // Mount the initial screen
  renderCurrentScreen();

  // Subscribe to screen changes
  subscribe((state) => {
    updateBottomBar(state.screen);
    renderCurrentScreen();
  });

  // Bind bottom bar navigation
  bindBottomBar();
}

// ── Screen renderer ───────────────────────────────────────────────────────────
let cleanupFn = null;

function renderCurrentScreen() {
  const { screen } = getState();
  const container  = document.getElementById('screen-container');
  if (!container) return;

  if (cleanupFn) { cleanupFn(); cleanupFn = null; }

  switch (screen) {
    case 'listening': cleanupFn = mountHome(container);   break;
    case 'raise':     cleanupFn = mountRaise(container);  break;
    case 'raised':    cleanupFn = mountRaised(container); break;
    case 'match':     cleanupFn = mountMatch(container);  break;
    case 'meet':      cleanupFn = mountMeet(container);   break;
    case 'solved':    cleanupFn = mountSolved(container); break;
    case 'ledger':    cleanupFn = mountLedger(container); break;
  }
}

// ── Bottom bar ────────────────────────────────────────────────────────────────
function bindBottomBar() {
  const tabs = document.querySelectorAll('[data-screen]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      navigate(tab.dataset.screen);
    });
    // Press animation
    tab.addEventListener('pointerdown', () => tab.dataset.pressed = '');
    tab.addEventListener('pointerup',   () => delete tab.dataset.pressed);
  });
}

function updateBottomBar(screen) {
  document.getElementById('tab-listening')?.setAttribute(
    'aria-selected', screen === 'listening' ? 'true' : 'false'
  );
  document.getElementById('tab-ledger')?.setAttribute(
    'aria-selected', screen === 'ledger' ? 'true' : 'false'
  );
}

// ── Simulated nearby count ────────────────────────────────────────────────────
function simulateNearbyCount() {
  // Ramp from 0 to 3–7 over 3 seconds to simulate BLE discovery
  let count = 0;
  const target = 3 + Math.floor(Math.random() * 5);
  const interval = setInterval(() => {
    if (count >= target) { clearInterval(interval); return; }
    count++;
    setState({ nearbyCount: count });
  }, 600);
}

// ── Start ─────────────────────────────────────────────────────────────────────
init().catch(err => console.error('Tracebeam init error:', err));
