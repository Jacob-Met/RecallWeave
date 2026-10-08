import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile, writeFile, mkdtemp, mkdir, rm, cp, readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {makeExperiment, stateAt, makeObservation, sampleTrajectory} from '../courses/normal-modes-core.mjs';
import {parseDeck} from '../src/deck.mjs';
import {REPOSITORY_ROOT, renderLab, buildLab} from '../tools/build-normal-modes.mjs';

const input = {mass:2, wallStiffness:8, coupling:6, x1:0.6, x2:-0.2, v1:0.4, v2:-0.1, duration:8};

test('original course uses the unchanged checked-deck contract', async () => {
  const deck = parseDeck(await readFile(join(REPOSITORY_ROOT, 'courses/normal-modes.json'), 'utf8'));
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 4);
  assert.ok(deck.attribution.includes('Original AI-assisted'));
  assert.ok(deck.license.includes('CC0-1.0'));
  assert.deepEqual(deck.items.map(item=>item.answer), [1,2,0,3,1,2,1,0,3,1,0,2,3,1,2,0]);
});

test('applied experiment is a detached immutable record', () => {
  const draft = {...input, mass:' 2e0 '};
  const experiment = makeExperiment(draft);
  draft.mass = 9;
  assert.equal(experiment.parameters.mass, 2);
  assert.ok(Object.isFrozen(experiment.parameters));
  for (const bad of ['', '2kg', '0x2', false, null, Infinity, '1e-999'])
    assert.throws(()=>makeExperiment({...input, coupling:bad}));
  assert.equal(experiment.parameters.coupling, 6);
});

test('observation retains applied values and signed joule residual', () => {
  const experiment = makeExperiment(input);
  const observation = makeObservation(experiment, 1.25);
  assert.equal(observation.format, 'recallweave-normal-modes-observation/1');
  assert.equal(observation.inspectionTime, 1.25);
  assert.deepEqual(observation.state, stateAt(experiment, 1.25));
  assert.equal(observation.state.energies.drift, observation.state.energies.total-experiment.energy.total);
  observation.parameters.mass = 9;
  assert.equal(experiment.parameters.mass, 2);
  assert.throws(()=>makeObservation(experiment, -0.1));
  assert.throws(()=>makeObservation(experiment, 8.01));
});

test('sampling includes exact window endpoints with sufficient fastest-mode resolution', () => {
  const experiment = makeExperiment({...input,mass:0.1,wallStiffness:200,coupling:200,duration:20});
  const samples = sampleTrajectory(experiment);
  assert.equal(samples[0].t,0);
  assert.equal(samples.at(-1).t,20);
  assert.ok(samples.length > 240);
  assert.ok(20/(samples.length-1) <= (2*Math.PI/experiment.omega.minus)/48);
  assert.ok(samples.every(row=>Object.values(row.energies).every(Number.isFinite)));
});

test('standalone parity is exact; refused content and publication preserve prior state', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'normal-modes-build-'));
  try {
    await mkdir(join(temp,'courses'));
    for (const name of ['normal-modes-lab.template.html','normal-modes-core.mjs','normal-modes-ui.mjs','normal-modes.json','normal-modes.md'])
      await cp(join(REPOSITORY_ROOT,'courses',name),join(temp,'courses',name));
    const original = await renderLab(temp);
    await buildLab({root:temp});
    const output=join(temp,'courses/normal-modes-lab.html');
    assert.equal(await readFile(output,'utf8'),original);
    assert.equal((await buildLab({root:temp,check:true})).checked,true);
    const deck=await readFile(join(temp,'courses/normal-modes.json'),'utf8');
    await writeFile(join(temp,'courses/normal-modes.json'),'{"format":"wrong"}');
    await assert.rejects(()=>buildLab({root:temp}));
    assert.equal(await readFile(output,'utf8'),original);
    await writeFile(join(temp,'courses/normal-modes.json'),deck);
    await rm(output);
    await mkdir(output);
    await assert.rejects(()=>buildLab({root:temp}));
    assert.deepEqual(await readdir(output),[]);
    assert.ok((await readdir(join(temp,'courses'))).every(name=>!name.includes('.tmp-')));
  } finally { await rm(temp,{recursive:true,force:true}); }
});


test('lesson literals remain exact data during standalone substitution', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'normal-modes-literals-'));
  try {
    await mkdir(join(temp,'courses'));
    await cp(join(REPOSITORY_ROOT,'courses/normal-modes-core.mjs'),join(temp,'courses/normal-modes-core.mjs'));
    const originalDeck = JSON.parse(await readFile(join(REPOSITORY_ROOT,'courses/normal-modes.json'),'utf8'));
    originalDeck.items[0].prompt += ' Literal {{NORMAL_MODES_GUIDE_JSON}} </script> \u2028 \u2029';
    const deck = JSON.stringify(originalDeck,null,2)+'\n';
    const guide = 'Literal {{NORMAL_MODES_EXAMPLE}} and {{NORMAL_MODES_CORE}} remain prose.\r\n</script>\u2028\u2029\n';
    const template = '<script>\nconst normalModesDeckText = {{NORMAL_MODES_DECK_JSON}};\nconst normalModesGuideText = {{NORMAL_MODES_GUIDE_JSON}};\n{{NORMAL_MODES_CORE}}\n{{NORMAL_MODES_UI}}\n</script>';
    await writeFile(join(temp,'courses/normal-modes.json'),deck);
    await writeFile(join(temp,'courses/normal-modes.md'),guide);
    await writeFile(join(temp,'courses/normal-modes-lab.template.html'),template);
    await writeFile(join(temp,'courses/normal-modes-ui.mjs'),'globalThis.received = {deck:normalModesDeckText,guide:normalModesGuideText};');
    const html = await renderLab(temp);
    assert.equal((html.match(/<\/script>/g)||[]).length,1);
    const context = {};
    const {runInNewContext} = await import('node:vm');
    runInNewContext(html.slice('<script>\n'.length,-'</script>'.length),context);
    assert.equal(context.received.deck,deck);
    assert.equal(context.received.guide,guide);
  } finally { await rm(temp,{recursive:true,force:true}); }
});
