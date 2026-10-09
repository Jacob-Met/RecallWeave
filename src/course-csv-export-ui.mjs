import { MAX_DECK_BYTES } from './deck.mjs';
import { exportCourseCsv } from './course-csv-export.mjs';

async function sha256(bytes) {
  if (!globalThis.crypto?.subtle) {
    throw new Error('This browser cannot compute the required SHA-256 receipt. Open this file in a current browser.');
  }
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
}

/** Mount one local, in-memory file-to-CSV preparation surface. */
export function mountCourseCsvExport(document, platform = {}) {
  const byId = id => document.getElementById(id);
  const fileInput = byId('csv-export-file');
  const status = byId('csv-export-status');
  const preview = byId('csv-export-preview');
  const empty = byId('csv-export-empty');
  const csvButton = byId('download-course-csv');
  const receiptButton = byId('download-csv-metadata');
  const hash = platform.hash ?? sha256;
  const createURL = platform.createObjectURL ?? (value => URL.createObjectURL(value));
  const revokeURL = platform.revokeObjectURL ?? (value => URL.revokeObjectURL(value));
  const later = platform.setTimeout ?? setTimeout;
  const BlobType = platform.Blob ?? Blob;
  const listeners = [];
  const urls = new Set();
  let generation = 0;
  let selected = null;

  function on(element, event, action) {
    element.addEventListener(event, action);
    listeners.push(() => element.removeEventListener(event, action));
  }

  function revoke(url) {
    if (urls.delete(url)) revokeURL(url);
  }

  function retire(message) {
    generation++;
    selected = null;
    preview.hidden = true;
    empty.hidden = false;
    csvButton.disabled = true;
    receiptButton.disabled = true;
    for (const url of [...urls]) revoke(url);
    for (const id of ['csv-source-name', 'csv-lesson-title', 'csv-lesson-counts',
      'csv-attribution', 'csv-license', 'csv-source-hash', 'csv-output-hash', 'csv-text-preview']) {
      byId(id).textContent = '';
    }
    status.textContent = message;
    return generation;
  }

  async function readSelection() {
    const version = retire('Checking the selected lesson…');
    const file = fileInput.files?.[0];
    if (!file) {
      status.textContent = 'Selection cancelled. Choose a lesson JSON to begin.';
      return;
    }
    try {
      if (fileInput.files.length !== 1) throw new Error('Choose one lesson JSON at a time.');
      if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > MAX_DECK_BYTES) {
        throw new Error('Choose a JSON deck no larger than 256 KiB.');
      }
      const buffer = await file.arrayBuffer();
      if (version !== generation) return;
      const bytes = new Uint8Array(buffer);
      if (bytes.byteLength > MAX_DECK_BYTES) throw new Error('Choose a JSON deck no larger than 256 KiB.');
      let text;
      try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); }
      catch { throw new Error('The input must contain valid UTF-8; invalid bytes were not replaced.'); }
      const result = exportCourseCsv(text);
      const csvBytes = new TextEncoder().encode(result.csv);
      const [inputHash, csvHash] = await Promise.all([hash(bytes), hash(csvBytes)]);
      if (version !== generation) return;
      if (![inputHash, csvHash].every(value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value))) {
        throw new Error('The required SHA-256 receipt could not be prepared.');
      }
      const receipt = {
        format: 'recallweave-course-csv-export/1',
        input: file.name, input_sha256: inputHash, output: 'question-bank.csv',
        csv_sha256: csvHash, question_count: result.questionCount,
        concept_count: result.conceptCount, metadata: result.metadata
      };
      selected = Object.freeze({ csv: result.csv, receipt: JSON.stringify(receipt, null, 2) + '\n' });
      byId('csv-source-name').textContent = file.name;
      byId('csv-lesson-title').textContent = result.metadata.title;
      byId('csv-lesson-counts').textContent = result.questionCount + (result.questionCount === 1 ? ' question' : ' questions')
        + ' · ' + result.conceptCount + (result.conceptCount === 1 ? ' concept' : ' concepts');
      byId('csv-attribution').textContent = result.metadata.attribution;
      byId('csv-license').textContent = result.metadata.license;
      byId('csv-source-hash').textContent = inputHash;
      byId('csv-output-hash').textContent = csvHash;
      byId('csv-text-preview').textContent = result.csv;
      preview.hidden = false;
      empty.hidden = true;
      csvButton.disabled = false;
      receiptButton.disabled = false;
      status.textContent = 'Lesson checked. Download both files: the CSV question bank and its separate metadata receipt.';
    } catch (error) {
      if (version !== generation) return;
      retire(error instanceof Error ? error.message : 'The file could not be read. Choose another lesson JSON.');
    }
  }

  function download(kind) {
    if (!selected) return;
    const isCsv = kind === 'csv';
    try {
      const url = createURL(new BlobType([isCsv ? selected.csv : selected.receipt], {
        type: isCsv ? 'text/csv;charset=utf-8' : 'application/json;charset=utf-8'
      }));
      urls.add(url);
      const link = document.createElement('a');
      link.href = url;
      link.download = isCsv ? 'question-bank.csv' : 'question-bank.metadata.json';
      document.body.append(link);
      try { link.click(); } finally { link.remove(); }
      later(() => revoke(url), 1000);
      status.textContent = (isCsv ? 'CSV' : 'Metadata receipt') + ' download requested. Keep both files and the original lesson JSON.';
    } catch {
      retire('The download could not be prepared. Choose the lesson again and retry.');
    }
  }

  on(byId('choose-csv-export-file'), 'click', () => {
    retire('Choose a lesson JSON. The previous preview and downloads have been cleared.');
    fileInput.value = '';
    fileInput.click();
  });
  on(fileInput, 'change', readSelection);
  on(fileInput, 'cancel', () => {
    retire('Selection cancelled. Choose a lesson JSON to begin.');
    fileInput.value = '';
  });
  on(byId('clear-csv-export'), 'click', () => {
    retire('Selection cleared. Choose a lesson JSON to begin.');
    fileInput.value = '';
  });
  on(csvButton, 'click', () => download('csv'));
  on(receiptButton, 'click', () => download('receipt'));
  retire('Choose a checked lesson JSON to begin.');
  return () => {
    retire('CSV export closed.');
    listeners.forEach(remove => remove());
  };
}

if (typeof document !== 'undefined') mountCourseCsvExport(document);
