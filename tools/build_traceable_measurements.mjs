#!/usr/bin/env node
/** Build this original course through RecallWeave's existing author and deck codec. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {draftFromDeck, checkDraft} from '../src/deck-author.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export function buildTraceableCourse(source) {
  if (source?.source_format !== 'recallweave-traceable-measurements-source/1') {
    throw new Error('Expected the traceable-measurements authoring source.');
  }
  const checked=checkDraft(draftFromDeck(source.deck));
  if (!checked.ok) throw new Error(checked.message);
  return checked.json;
}
function main() {
  const args=process.argv.slice(2);
  if (args.length>1 || (args.length===1 && args[0]!=='--check')) {
    throw new Error('Usage: node tools/build_traceable_measurements.mjs [--check]');
  }
  const input=path.join(root,'courses/traceable-measurements.source.json');
  const output=path.join(root,'courses/traceable-measurements.json');
  const generated=buildTraceableCourse(JSON.parse(fs.readFileSync(input,'utf8')));
  if (args[0]==='--check') {
    if (fs.readFileSync(output,'utf8')!==generated) throw new Error('Course is stale; run the course builder.');
    console.log('Traceable-measurements course matches the checked authoring source.');
    return;
  }
  const temporary=path.join(path.dirname(output),'.traceable-measurements-'+process.pid+'.tmp');
  try {
    fs.writeFileSync(temporary,generated,{encoding:'utf8',flag:'wx'});
    fs.renameSync(temporary,output);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
  console.log('Built courses/traceable-measurements.json ('+Buffer.byteLength(generated)+' bytes).');
}
if (process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) main();
