import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const [candidate, requestPath, output] = process.argv.slice(2);
if (!candidate || !requestPath || !output) throw new Error('candidate, request and absent output directory are required');
fs.mkdirSync(output);
const request = JSON.parse(fs.readFileSync(requestPath, 'utf8'));
const loaded = {};
const load = async name => {
  const source = path.join(candidate, name);
  loaded[name] = crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex');
  return import(pathToFileURL(source).href);
};
const writeJson = (name, value) => fs.writeFileSync(path.join(output, name), JSON.stringify(value, null, 2) + '\n', {flag:'wx'});
let result;

if (request.operation === 'samples') {
  const { analyzeSampling, samplingCsv } = await load('src/sampling-aliasing.mjs');
  const observations = request.cases.map(testCase => {
    const snapshot = analyzeSampling(testCase.parameters);
    const csv = samplingCsv(snapshot);
    const csvName = `${testCase.name}.csv`;
    fs.writeFileSync(path.join(output, csvName), csv, {flag:'wx'});
    return {name: testCase.name, parameters: testCase.parameters, snapshot, csvName};
  });
  result = {operation:request.operation, observations};
} else if (request.operation === 'course') {
  const { parseDeck, serializeDeck } = await load('src/deck.mjs');
  const { createReview, beginPractice, currentPracticeItem, answerPractice } = await load('src/review.mjs');
  const { initialMastery, updateMastery } = await load('src/knowledge.mjs');
  const { createStudyNotes } = await load('src/session-export.mjs');
  const original = fs.readFileSync(path.join(candidate, 'courses/sampling-aliasing.json'));
  loaded['courses/sampling-aliasing.json'] = crypto.createHash('sha256').update(original).digest('hex');
  const deck = parseDeck(original.toString('utf8'));
  const serialized = serializeDeck(deck);
  fs.writeFileSync(path.join(output, 'course-original.json'), original, {flag:'wx'});
  fs.writeFileSync(path.join(output, 'course-roundtrip.json'), serialized, {flag:'wx'});
  const review = createReview(deck.items, request.firstAnswers);
  const mastery = initialMastery(deck.concepts);
  for (const item of review) mastery[item.concept] = updateMastery(mastery[item.concept], item.correct);
  const originalReview = JSON.parse(JSON.stringify(review));
  const originalMastery = JSON.parse(JSON.stringify(mastery));
  const exportedAt = new Date(request.syntheticExportedAt);
  const notesBefore = createStudyNotes({deck,review,mastery,exportedAt});
  const initialPractice = beginPractice(review);
  const current = currentPracticeItem(initialPractice);
  const practice = answerPractice(initialPractice, request.retry.item, request.retry.choice);
  const notesAfter = createStudyNotes({deck,review,mastery,practice,exportedAt});
  fs.writeFileSync(path.join(output, 'study-notes-before.txt'), notesBefore.text, {flag:'wx'});
  fs.writeFileSync(path.join(output, 'study-notes-after.txt'), notesAfter.text, {flag:'wx'});
  result = {
    operation:request.operation, originalReview, finalReview:review,
    originalMastery, finalMastery:mastery, initialPractice,
    currentPracticeId:current?.id, finalPractice:practice,
    nextPracticeId:currentPracticeItem(practice)?.id ?? null,
    notesBefore, notesAfter,
  };
} else throw new Error('Unknown receiving operation');

writeJson('result.json', result);
writeJson('process.json', {
  pid:process.pid, node:process.version, versions:process.versions,
  executable:process.execPath,
  executableSha256:crypto.createHash('sha256').update(fs.readFileSync(process.execPath)).digest('hex'),
  argv:process.argv, loadedSources:loaded,
  provenance:'Actual frozen native module calls on explicit synthetic inputs; no browser or real learner execution.'
});
