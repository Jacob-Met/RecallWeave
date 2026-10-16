import { MAX_DECK_BYTES, parseDeck, serializeDeck } from './deck.mjs';

export const MAX_COURSE_CSV_BYTES = MAX_DECK_BYTES;
export const COURSE_CSV_COLUMNS = Object.freeze([
  'id', 'concept', 'prompt', 'option_1', 'option_2', 'option_3', 'option_4',
  'option_5', 'option_6', 'correct_option', 'explanation', 'transfer', 'prerequisites'
]);
const requiredColumns = ['id', 'concept', 'prompt', 'option_1', 'option_2',
  'correct_option', 'explanation', 'transfer'];

const exampleRows = [
  COURSE_CSV_COLUMNS,
  ['observe-1', 'observation', 'Which sentence reports an observation?',
    'The next step will fail.', 'The log says "ready" at 09:00.', '', '', '', '', '2',
    'The second sentence reports a recorded event. The first predicts an outcome.',
    'Write one observation from an event log.', '[]'],
  ['order-2', 'sequence', 'A is recorded at 09:00 and B at 09:02. Which is earlier?',
    'A', 'B', '', '', '', '', '1',
    'In this example, 09:00 precedes 09:02.',
    'Describe an order without inventing a cause.', '["observation"]']
];
export const COURSE_CSV_TEMPLATE = exampleRows.map(row =>
  row.map(value => '"' + value.replaceAll('"', '""') + '"').join(',')
).join('\r\n') + '\r\n';

/** Comma and doubled-quote parsing; preserve every field's literal text. */
function csvRecords(text) {
  if (typeof text !== 'string' || new TextEncoder().encode(text).length > MAX_COURSE_CSV_BYTES) {
    throw new Error('Choose a UTF-8 CSV no larger than 256 KiB.');
  }
  if (text.startsWith('\uFEFF')) text = text.slice(1);
  const records = [];
  let fields = [], field = '', state = 'start', line = 1, startLine = 1;
  const fail = message => {
    throw new Error('CSV record ' + (records.length + 1) + ', line ' + line + ': ' + message);
  };
  const finishField = () => {
    fields.push(field);
    if (fields.length > COURSE_CSV_COLUMNS.length) fail('there are more than 13 columns.');
    field = '';
    state = 'start';
  };
  const finishRecord = () => {
    finishField();
    if (records.length === 101) fail('a course can contain at most 100 question records.');
    records.push({ fields, line: startLine });
    fields = [];
    startLine = line;
  };
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (state === 'quoted') {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index++; }
        else state = 'closed';
      } else {
        field += character;
        if (character === '\n' || (character === '\r' && text[index + 1] !== '\n')) line++;
      }
      continue;
    }
    if (character === ',') { finishField(); continue; }
    if (character === '\r' || character === '\n') {
      if (character === '\r') {
        if (text[index + 1] !== '\n') fail('use CRLF or LF between records; a bare CR is ambiguous.');
        index++;
      }
      line++;
      finishRecord();
      continue;
    }
    if (character === '"') {
      if (state !== 'start') fail('a quote must start a field or be doubled inside a quoted field.');
      state = 'quoted';
    } else {
      if (state === 'closed') fail('only a comma, record ending or end of file may follow a closing quote.');
      field += character;
      state = 'plain';
    }
  }
  if (state === 'quoted') fail('the quoted field has no closing quote.');
  if (fields.length || state !== 'start' || field) finishRecord();
  if (!records.length) throw new Error('The CSV needs a header and at least one question record.');
  return records;
}

function csvHeader(record) {
  const positions = new Map();
  record.fields.forEach((name, index) => {
    if (!COURSE_CSV_COLUMNS.includes(name)) {
      throw new Error('CSV header column ' + (index + 1) + ' is unknown: ' + JSON.stringify(name) + '. Use the exact template names.');
    }
    if (positions.has(name)) {
      throw new Error('CSV header repeats ' + JSON.stringify(name) + ' in columns ' +
        (positions.get(name) + 1) + ' and ' + (index + 1) + '.');
    }
    positions.set(name, index);
  });
  for (const name of requiredColumns) {
    if (!positions.has(name)) throw new Error('CSV header is missing required column ' + JSON.stringify(name) + '.');
  }
  for (let number = 3; number <= 6; number++) {
    if (positions.has('option_' + number) && !positions.has('option_' + (number - 1))) {
      throw new Error('CSV header has "option_' + number + '" without "option_' + (number - 1) + '".');
    }
  }
  return positions;
}

/**
 * Convert a declared question-bank CSV into one native, fully checked deck.
 * Metadata is supplied explicitly. The returned JSON is the exact downloadable
 * serializeDeck output and passes parseDeck's byte limit before admission.
 */
export function convertCourseCsv(csvText, metadata) {
  const records = csvRecords(csvText);
  const header = records[0];
  const positions = csvHeader(header);
  const rows = records.slice(1);
  if (!rows.length) throw new Error('The CSV needs at least one question record after its header.');
  const concepts = [];
  const seenConcepts = new Set();
  const items = rows.map((record, index) => {
    const location = 'CSV record ' + (index + 2) + ' (starts on line ' + record.line + ')';
    const fail = message => { throw new Error(location + ': ' + message); };
    if (record.fields.length !== header.fields.length) {
      fail('expected ' + header.fields.length + ' fields, received ' + record.fields.length + '.');
    }
    const get = name => positions.has(name) ? record.fields[positions.get(name)] : '';
    const options = [];
    let gap = false;
    for (let number = 1; number <= 6; number++) {
      const value = get('option_' + number);
      if (value === '') gap = true;
      else {
        if (gap) fail('"option_' + number + '" follows an empty option. Keep supplied options contiguous from option_1.');
        options.push(value);
      }
    }
    const correct = get('correct_option');
    if (!/^[1-6]$/.test(correct) || Number(correct) > options.length) {
      fail('"correct_option" must be one digit from 1 to 6 naming a supplied option (1 means option_1).');
    }
    const prerequisiteText = get('prerequisites');
    let prerequisites = [];
    if (prerequisiteText !== '') {
      try { prerequisites = JSON.parse(prerequisiteText); }
      catch { fail('"prerequisites" must be empty or a JSON array of exact concept names.'); }
    }
    const concept = get('concept');
    if (!seenConcepts.has(concept)) { seenConcepts.add(concept); concepts.push(concept); }
    return {
      id: get('id'), concept, prerequisites,
      prompt: get('prompt'), options, answer: Number(correct) - 1,
      explanation: get('explanation'), transfer: get('transfer')
    };
  });
  try {
    const json = serializeDeck({
      title: metadata?.title, attribution: metadata?.attribution, license: metadata?.license,
      concepts, items
    });
    const deck = parseDeck(json);
    return Object.freeze({ deck, json });
  } catch (error) {
    const match = /^items\[(\d+)\]/.exec(error.message);
    if (match && rows[Number(match[1])]) {
      const index = Number(match[1]);
      throw new Error('CSV record ' + (index + 2) + ' (starts on line ' + rows[index].line + '): ' + error.message);
    }
    throw error;
  }
}
