// Actual production callbacks with an authored, simulated DOM. Real Node Blob
// and object URLs; no browser rendering, file picker or saved-download claim.
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { mountExplorer, requestDownload } from '../src/substring-search-ui.mjs';

class Element {
  constructor(tag) { this.tagName = tag; this.children = []; this.listeners = new Map(); this.attributes = {}; this.value = ''; this.disabled = false; this.hidden = false; this._text = ''; }
  set textContent(value) { this.children = []; this._text = String(value); }
  get textContent() { return this._text + this.children.map(child => child.textContent).join(''); }
  append(...children) { for (const child of children) { child.parentNode = this; this.children.push(child); } }
  replaceChildren(...children) { this.children = []; this._text = ''; this.append(...children); }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  addEventListener(kind, listener) { if (!this.listeners.has(kind)) this.listeners.set(kind, []); this.listeners.get(kind).push(listener); }
  dispatch(kind) { const event = { preventDefault() { this.prevented = true; } }; for (const listener of this.listeners.get(kind) || []) listener(event); return event; }
  click() { if (this.onClick) this.onClick(); this.dispatch('click'); }
  remove() { if (this.parentNode) { this.parentNode.children = this.parentNode.children.filter(child => child !== this); this.parentNode = null; } }
}

export function fixture(mount = mountExplorer, course = readFileSync(new URL('../courses/substring-search.json', import.meta.url), 'utf8')) {
  const ids = ['search-text', 'search-pattern', 'search-form', 'search-example', 'search-result', 'search-status', 'download-calculation', 'download-course', 'search-summary', 'search-identity', 'trace-naive', 'trace-prefix', 'trace-kmp'];
  const nodes = Object.fromEntries(ids.map(id => [id, new Element('fixture-' + id)]));
  const captured = [], revoked = [], clicked = [];
  const document = { body: new Element('body'), getElementById: id => nodes[id], createElement(tag) {
    const node = new Element(tag);
    if (tag === 'a') node.onClick = () => { clicked.push({ href: node.href, download: node.download }); if (document.failClick) throw new Error('simulated anchor dispatch failure'); };
    return node;
  } };
  const platform = { Blob, URL: {
    createObjectURL(blob) { const url = URL.createObjectURL(blob); captured.push({ blob, url }); return url; },
    revokeObjectURL(url) { URL.revokeObjectURL(url); revoked.push(url); }
  } };
  nodes['search-text'].value = 'ABABABABA'; nodes['search-pattern'].value = 'ABABA';
  mount(document, platform, course);
  return { nodes, document, platform, captured, revoked, clicked, course, submit: () => nodes['search-form'].dispatch('submit') };
}

function allChildren(node) { return [node, ...node.children.flatMap(allChildren)]; }
function panelControls(nodes, phase) {
  const children = allChildren(nodes['trace-' + phase]);
  return { previous: children.find(node => node.attributes['aria-label'] === (phase === 'kmp' ? 'KMP search' : phase === 'naive' ? 'Naive search' : 'Prefix preparation') + ': previous step'),
    next: children.find(node => node.attributes['aria-label']?.endsWith(': next step')),
    select: children.find(node => node.tagName === 'select') };
}

test('actual callbacks build once and navigate three independent retained traces with named controls', async () => {
  const f = fixture(), { nodes } = f;
  assert.equal(nodes['search-result'].hidden, true); assert.equal(nodes['download-calculation'].disabled, true);
  assert.equal(f.submit().prevented, true);
  assert.equal(nodes['search-result'].hidden, false);
  assert.match(nodes['search-summary'].textContent, /All match starts: 0, 2, 4.*naive: 17.*prefix preparation: 4.*KMP text search: 9.*KMP total: 13/s);
  const naive = panelControls(nodes, 'naive'), prefix = panelControls(nodes, 'prefix'), kmp = panelControls(nodes, 'kmp');
  assert.equal(naive.previous.disabled, true); naive.next.click();
  assert.equal(naive.select.value, '1'); assert.equal(prefix.select.value, '0'); assert.equal(kmp.select.value, '0');
  kmp.select.value = String(kmp.select.children.length - 1); kmp.select.dispatch('change');
  assert.equal(kmp.next.disabled, true); assert.equal(prefix.select.value, '0');
  kmp.previous.click(); assert.equal(kmp.next.disabled, false);
  nodes['download-calculation'].click();
  const exported = JSON.parse(await f.captured[0].blob.text());
  assert.deepEqual(exported.kmp.matches, [0, 2, 4]);
  assert.equal(exported.naive.steps[0].kind, 'initial'); assert.equal(exported.kmp.steps.at(-1).kind, 'complete');
  assert.ok(exported.prefix.steps.length > 1);
  assert.deepEqual(exported.counts, { naive: 17, prefix: 4, kmpSearch: 9, kmpTotal: 13 });
  assert.deepEqual(f.revoked, f.captured.map(row => row.url)); assert.equal(f.document.body.children.length, 0);
});

test('edits retire accepted work, invalid drafts survive, and silent field changes cannot download stale calculations', () => {
  const f = fixture(), { nodes } = f; f.submit();
  nodes['search-pattern'].value = ''; nodes['search-pattern'].dispatch('input');
  assert.equal(nodes['search-result'].hidden, true); assert.equal(nodes['download-calculation'].disabled, true);
  nodes['download-calculation'].click(); assert.equal(f.captured.length, 0);
  f.submit(); assert.equal(nodes['search-pattern'].value, ''); assert.match(nodes['search-status'].textContent, /at least one/);
  nodes['search-pattern'].value = 'ABABA'; f.submit();
  nodes['search-text'].value = 'changed without an input event'; nodes['download-calculation'].click();
  assert.equal(nodes['search-result'].hidden, true); assert.equal(f.captured.length, 0);
  nodes['search-example'].value = '4'; nodes['search-example'].dispatch('change');
  assert.equal(nodes['search-text'].value, '😀A😀A😀'); assert.equal(nodes['search-result'].hidden, true);
  assert.match(nodes['search-status'].textContent, /draft/);
});

test('full captured JSON and original course retain Unicode, controls and exact bytes independently of input edits', async () => {
  const course = '{"literal":"</script> 😀 e\u0301 \\u0000"}\r\n';
  const f = fixture(mountExplorer, course), { nodes } = f;
  const text = '\0\t\r\n<>&"\\😀'; nodes['search-text'].value = text; nodes['search-pattern'].value = '\r\n'; f.submit();
  nodes['download-calculation'].click();
  nodes['search-text'].value = 'later'; nodes['search-text'].dispatch('input');
  const exported = JSON.parse(await f.captured[0].blob.text());
  assert.equal(exported.text, text); assert.equal(exported.pattern, '\r\n'); assert.deepEqual(exported.kmp.matches, [2]);
  nodes['download-course'].click();
  assert.equal(await f.captured[1].blob.text(), course);
  assert.equal(f.clicked[1].download, 'substring-search.json');
  assert.deepEqual(f.revoked, f.captured.map(row => row.url));
  const tokenCells = allChildren(nodes['trace-kmp']).filter(node => node.attributes['aria-label']?.includes('index'));
  assert.ok(tokenCells.some(node => node.attributes['aria-label'].includes('U+0000')));
  assert.ok(tokenCells.some(node => node.attributes['aria-label'].includes('U+1F600')));
});

test('post-allocation dispatch failure releases resources, retains calculation and permits explicit retry', async () => {
  const f = fixture(), { nodes } = f; f.submit(); f.document.failClick = true;
  nodes['download-calculation'].click();
  assert.match(nodes['search-status'].textContent, /could not be requested.*retained/);
  assert.equal(nodes['search-result'].hidden, false); assert.equal(nodes['download-calculation'].disabled, false);
  assert.equal(f.document.body.children.length, 0); assert.deepEqual(f.revoked, [f.captured[0].url]);
  f.document.failClick = false; nodes['download-calculation'].click();
  assert.equal(await f.captured[1].blob.text(), await f.captured[0].blob.text());
  assert.match(nodes['search-status'].textContent, /download requested/);
  assert.deepEqual(f.revoked, f.captured.map(row => row.url));
});

test('failure while attaching an allocated URL still cleans up; allocation refusal attempts no dispatch', () => {
  const f = fixture(); f.document.body.append = () => { throw new Error('simulated append failure'); };
  assert.throws(() => requestDownload(f.document, f.platform, 'x', 'x.txt', 'text/plain'), /append failure/);
  assert.deepEqual(f.revoked, [f.captured[0].url]); assert.equal(f.clicked.length, 0);
  const refuse = { Blob, URL: { createObjectURL() { throw new Error('simulated allocation refusal'); }, revokeObjectURL() { assert.fail('no allocation to revoke'); } } };
  assert.throws(() => requestDownload(f.document, refuse, 'x', 'x.txt', 'text/plain'), /allocation refusal/);
});
