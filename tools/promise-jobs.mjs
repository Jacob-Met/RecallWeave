/** Fixed original Promise-job examples. Importing this module runs no example. */
import { pathToFileURL } from 'node:url';

async function p01() {
  const log = [];
  log.push("start");
  const pending = new Promise(resolve => {
    log.push("executor");
    resolve("value");
  });
  const done = pending.then(value => log.push(value));
  log.push("end");
  await done;
  return log;
}

async function p02() {
  const log = [];
  const pending = Promise.resolve();
  const a = pending.then(() => log.push("A"));
  const b = pending.then(() => log.push("B"));
  log.push("sync");
  await Promise.all([a, b]);
  return log;
}

async function p03() {
  const log = [];
  async function work() {
    log.push("before");
    await 0;
    log.push("after");
  }
  const done = work();
  log.push("caller");
  await done;
  return log;
}

async function p04() {
  const log = [];
  const a = Promise.resolve().then(() => log.push("then"));
  const b = new Promise(resolve => queueMicrotask(() => {
    log.push("micro");
    resolve();
  }));
  log.push("sync");
  await Promise.all([a, b]);
  return log;
}

async function p05() {
  const log = [];
  let nested;
  const first = Promise.resolve().then(() => {
    log.push("A");
    nested = Promise.resolve().then(() => log.push("C"));
  });
  const second = Promise.resolve().then(() => log.push("B"));
  await Promise.all([first, second]);
  await nested;
  return log;
}

async function p06() {
  const log = [];
  let releaseA, releaseB;
  const a = new Promise(resolve => { releaseA = resolve; });
  const b = new Promise(resolve => { releaseB = resolve; });
  const done = Promise.all([a, b]).then(values => {
    log.push(values.join(","));
  });
  releaseB("B");
  log.push("releasedB");
  releaseA("A");
  log.push("releasedA");
  await done;
  return log;
}

async function p07() {
  const log = [];
  let releaseA, releaseB;
  const a = new Promise(resolve => { releaseA = resolve; });
  const b = new Promise(resolve => { releaseB = resolve; });
  const done = Promise.race([a, b]).then(value => log.push(value));
  releaseB("B");
  releaseA("A");
  log.push("released");
  await done;
  return log;
}

async function p08() {
  const log = [];
  const value = await Promise.resolve("kept").finally(() => {
    log.push("finally");
    return "replacement";
  });
  log.push(value);
  return log;
}

async function p09() {
  const log = [];
  const value = await Promise.resolve()
    .then(() => { log.push("then"); throw new Error("bad"); })
    .catch(error => { log.push(error.message); return "ok"; })
    .then(result => { log.push(result); return 7; });
  log.push(String(value));
  return log;
}

async function p10() {
  const log = [];
  const request = { state: "draft" };
  async function read() {
    await Promise.resolve();
    log.push(request.state);
  }
  const done = read();
  request.state = "changed";
  await done;
  return log;
}

async function p11() {
  const log = [];
  const request = { state: "draft" };
  async function read() {
    const state = request.state;
    await Promise.resolve();
    log.push(state);
  }
  const done = read();
  request.state = "changed";
  await done;
  return log;
}

async function p12() {
  const log = [];
  const original = { name: "before", nested: { count: 1 } };
  const copy = { ...original };
  const done = Promise.resolve().then(() => {
    log.push(copy.name + ":" + copy.nested.count);
  });
  original.name = "after";
  original.nested.count = 2;
  await done;
  return log;
}

const scenarios = Object.freeze({
  P01: p01,
  P02: p02,
  P03: p03,
  P04: p04,
  P05: p05,
  P06: p06,
  P07: p07,
  P08: p08,
  P09: p09,
  P10: p10,
  P11: p11,
  P12: p12
});

export const SCENARIO_IDS = Object.freeze(Object.keys(scenarios));
export const scenarioSources = Object.freeze(Object.fromEntries(
  SCENARIO_IDS.map(id => [id, Function.prototype.toString.call(scenarios[id])])
));

/** Execute one fixed example, with fresh local state and a detached result. */
export async function runScenario(id) {
  if (typeof id !== 'string' || !Object.hasOwn(scenarios, id)) {
    throw new RangeError('Choose an exact scenario ID from P01 through P12.');
  }
  const lines = await scenarios[id]();
  return { id, lines: [...lines] };
}

class ArgumentError extends Error {}
const HELP = 'Promise jobs: before and after await\n' +
  'node tools/promise-jobs.mjs --list\n' +
  'node tools/promise-jobs.mjs --scenario P01\n' +
  'node tools/promise-jobs.mjs --all\n' +
  'node tools/promise-jobs.mjs --help\n' +
  'Fixed original examples only; no timers, network, files or code input.\n';

async function writeComplete(text) {
  if (Buffer.byteLength(text, 'utf8') > 16384) {
    throw new Error('The complete output exceeds the 16 KiB bound.');
  }
  await new Promise((resolve, reject) => {
    process.stdout.write(text, error => error ? reject(error) : resolve());
  });
}

async function cli(args) {
  let output;
  if (args.length === 1 && args[0] === '--help') {
    output = HELP;
  } else if (args.length === 1 && args[0] === '--list') {
    output = JSON.stringify(SCENARIO_IDS) + '\n';
  } else if (args.length === 1 && args[0] === '--all') {
    const results = [];
    for (const id of SCENARIO_IDS) results.push(await runScenario(id));
    output = JSON.stringify(results) + '\n';
  } else if (args.length === 2 && args[0] === '--scenario' &&
             SCENARIO_IDS.includes(args[1])) {
    output = JSON.stringify(await runScenario(args[1])) + '\n';
  } else {
    throw new ArgumentError('Use --list, --scenario P01..P12, --all, or --help.');
  }
  await writeComplete(output);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await cli(process.argv.slice(2));
  } catch (error) {
    process.stderr.write('Promise jobs: ' + String(error.message || error) + '\n');
    process.exitCode = error instanceof ArgumentError ? 2 : 1;
  }
}
