import { MAX_DECK_BYTES, parseDeck } from './deck.mjs';
import { compareCourses } from './course-comparison.mjs';

const ROLES = ['before', 'after'];
const roleName = role => role === 'before' ? 'Earlier' : 'Revised';
const roleCheck = role => { if (!ROLES.includes(role)) throw new Error('Choose an earlier or revised course role.'); };
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};
async function nativeDigest(bytes) {
  const value = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(value), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** File lifecycle only. Course semantics are supplied unchanged by the owner comparator. */
export function createCourseComparisonPage({ digest = nativeDigest } = {}) {
  const slots = { before: null, after: null };
  const versions = { before: 0, after: 0 };
  const pending = { before: false, after: false };
  const errors = { before: '', after: '' };
  let report = null;

  function state() {
    const accepted = {};
    for (const role of ROLES) {
      const record = slots[role];
      accepted[role] = record ? {
        name: record.name, bytes: record.raw.length, sha256: record.sha256,
        title: record.deck.title, questions: record.deck.items.length, concepts: record.deck.concepts.length
      } : null;
    }
    return freeze({
      slots: accepted, pending: { ...pending }, errors: { ...errors },
      canCompare: Boolean(slots.before && slots.after && !pending.before && !pending.after),
      report
    });
  }

  async function load(role, file) {
    roleCheck(role);
    if (file === null || file === undefined) return Object.freeze({ status: 'cancelled' });
    const version = ++versions[role];
    pending[role] = true;
    errors[role] = '';
    report = null;
    try {
      if (typeof file.name !== 'string' || !Number.isSafeInteger(file.size) || file.size < 0 ||
          file.size > MAX_DECK_BYTES || typeof file.arrayBuffer !== 'function') {
        throw new Error('Choose a JSON course no larger than 256 KiB.');
      }
      const capturedName = file.name;
      const buffer = await file.arrayBuffer();
      if (version !== versions[role]) return Object.freeze({ status: 'stale' });
      if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > MAX_DECK_BYTES) {
        throw new Error('The captured file must be no larger than 256 KiB.');
      }
      const raw = new Uint8Array(buffer).slice();
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw); }
      catch { throw new Error('The selected file is not valid UTF-8.'); }
      const deck = parseDeck(text);
      const sha256 = await digest(raw.slice());
      if (version !== versions[role]) return Object.freeze({ status: 'stale' });
      if (typeof sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(sha256)) throw new Error('The captured file could not be fingerprinted.');
      slots[role] = Object.freeze({ name: capturedName, raw, text, deck, sha256 });
      pending[role] = false;
      return Object.freeze({ status: 'accepted' });
    } catch (error) {
      if (version !== versions[role]) return Object.freeze({ status: 'stale' });
      pending[role] = false;
      const detail = error instanceof Error ? error.message : 'The file could not be read.';
      errors[role] = roleName(role) + ' replacement refused. ' + detail +
        (slots[role] ? ' The previous accepted copy is still loaded; compare again to review those loaded files.' : ' No copy is loaded for this role.');
      return Object.freeze({ status: 'refused' });
    }
  }

  function clear(role) {
    roleCheck(role);
    ++versions[role];
    pending[role] = false;
    errors[role] = '';
    slots[role] = null;
    report = null;
  }

  function compare() {
    if (pending.before || pending.after) throw new Error('Wait until both file reads finish.');
    if (!slots.before || !slots.after) throw new Error('Load an earlier and a revised course first.');
    report = null;
    const before = slots.before, after = slots.after;
    const comparison = compareCourses(before.text, after.text);
    const file = record => ({ name: record.name, bytes: record.raw.length, sha256: record.sha256 });
    const sameBytes = before.raw.length === after.raw.length && before.raw.every((value, i) => value === after.raw[i]);
    const data = freeze({
      format: 'recallweave-course-comparison-browser/1',
      files: { before: file(before), after: file(after) },
      sameBytes, comparison
    });
    report = freeze({ data, json: JSON.stringify(data, null, 2) + '\n' });
    return report;
  }

  return Object.freeze({ state, load, clear, compare });
}
