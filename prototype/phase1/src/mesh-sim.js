/**
 * mesh-sim.js – Mesh simulator (Phase 1)
 * Simulates Nearby Connections using BroadcastChannel between browser tabs.
 * Scripted peers act as helpers with seeded ledgers.
 * Implements TECHNICAL.md §8 interface: advertise, onBeacon, accept, send.
 * Skill: mesh-sim (SKILLS.md §4)
 */

import { findBestMatch, shouldAlert } from './match.js';

const CHANNEL_NAME = 'tb:mesh:v1';
const SESSION_ID   = crypto.randomUUID().slice(0, 8); // ephemeral per session

// ── Message types ─────────────────────────────────────────────────────────────
export const MSG = {
  BEACON:    'beacon',
  ACCEPT:    'accept',
  HANDSHAKE: 'handshake',
  SOLVED:    'solved',
};

let channel = null;
let beaconCallback = null;
let messageCallback = null;
let currentBeacon = null;

function getChannel() {
  if (!channel) channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

// ── Serialise / deserialise Uint8Array ────────────────────────────────────────
function serialiseBeacon(beacon) {
  return { ...beacon, mh: Array.from(beacon.mh) };
}

function deserialiseBeacon(raw) {
  return { ...raw, mh: new Uint8Array(raw.mh) };
}

// ── Mesh interface ────────────────────────────────────────────────────────────
/**
 * Advertise a beacon so other tabs (phones) can see it.
 * @param {import('./signature.js').Signature} sig
 */
export function advertise(sig) {
  currentBeacon = sig;
  const ch = getChannel();
  ch.postMessage({
    type:      MSG.BEACON,
    beacon:    serialiseBeacon(sig),
    sessionId: SESSION_ID,
  });
}

/**
 * Register callback for incoming beacons.
 * @param {(beacon: Object, sessionId: string) => void} cb
 */
export function onBeacon(cb) {
  beaconCallback = cb;
  const ch = getChannel();
  ch.onmessage = (evt) => {
    const { type, beacon, sessionId, payload } = evt.data;
    if (sessionId === SESSION_ID) return; // our own message
    if (type === MSG.BEACON && beaconCallback) {
      beaconCallback(deserialiseBeacon(beacon), sessionId);
    }
    if ([MSG.ACCEPT, MSG.HANDSHAKE, MSG.SOLVED].includes(type) && messageCallback) {
      messageCallback(type, payload, sessionId);
    }
  };
}

/**
 * Register callback for non-beacon messages (accept, handshake, solved).
 * @param {(type: string, payload: Object, sessionId: string) => void} cb
 */
export function onMessage(cb) {
  messageCallback = cb;
}

/**
 * Accept a match (helper → asker).
 * @param {string} targetSessionId
 * @param {{ name: string, note: string }} payload
 */
export function accept(targetSessionId, payload) {
  getChannel().postMessage({
    type:      MSG.ACCEPT,
    sessionId: SESSION_ID,
    target:    targetSessionId,
    payload,
  });
}

/**
 * Send a handshake or solved message.
 * @param {string} targetSessionId
 * @param {string} type
 * @param {Object} payload
 */
export function send(targetSessionId, type, payload) {
  getChannel().postMessage({
    type,
    sessionId: SESSION_ID,
    target:    targetSessionId,
    payload,
  });
}

// ── Scripted fake peers ───────────────────────────────────────────────────────
const FAKE_PEERS = [
  {
    name:  'Alex',
    ledger: [
      {
        fp:       'a1b2c3d4e5f60001',
        fam:      'gradle',
        cls:      'BuildFailure',
        kw:       ['ndk', 'abi', 'mismatch', 'cmake', 'toolchain'],
        mh:       new Uint8Array(32).fill(0xaa),
        solvedAt: Math.floor(Date.now() / 1000) - 3 * 86400,
        note:     'Added abiFilters arm64-v8a in app/build.gradle. NDK version was mismatched – pinned to 25.2.9519653.',
        confirmed: true,
        synthetic: true,
      },
      {
        fp:       'b2c3d4e5f6071234',
        fam:      'node',
        cls:      'TypeError',
        kw:       ['undefined', 'cannot', 'read', 'property', 'null'],
        mh:       new Uint8Array(32).fill(0xbb),
        solvedAt: Math.floor(Date.now() / 1000) - 1 * 86400,
        note:     'Added a null check before accessing the property. The API changed in v3.x.',
        confirmed: true,
        synthetic: true,
      },
    ],
  },
  {
    name:  'Priya',
    ledger: [
      {
        fp:       'c3d4e5f607182abc',
        fam:      'python',
        cls:      'ModuleNotFoundError',
        kw:       ['module', 'found', 'pip', 'install', 'venv'],
        mh:       new Uint8Array(32).fill(0xcc),
        solvedAt: Math.floor(Date.now() / 1000) - 7 * 86400,
        note:     'Virtual env was not activated. Run source .venv/bin/activate before running the script.',
        confirmed: true,
        synthetic: true,
      },
    ],
  },
];

/**
 * Start scripted fake peers that listen and respond to beacons.
 * Peers check the beacon against their ledgers and fire a match if they find one.
 * @param {(matchResult: Object, peer: Object) => void} onMatch
 */
export function startScriptedPeers(onMatch) {
  const ch = getChannel();
  const handler = (evt) => {
    const { type, beacon, sessionId } = evt.data;
    if (sessionId === SESSION_ID) return;
    if (type !== MSG.BEACON) return;

    const b = deserialiseBeacon(beacon);
    for (const peer of FAKE_PEERS) {
      const match = findBestMatch(b, peer.ledger);
      if (match && shouldAlert(b.fp)) {
        // Simulate a 300–800 ms discovery delay
        setTimeout(() => {
          onMatch({ ...match, peerName: peer.name }, peer);
        }, 300 + Math.random() * 500);
        break; // one peer at a time
      }
    }
  };

  // We need a separate listener so we don't override the main one
  const peerChannel = new BroadcastChannel(CHANNEL_NAME);
  peerChannel.onmessage = handler;
  return () => peerChannel.close(); // cleanup function
}

export function getSessionId() { return SESSION_ID; }
