import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateDeck } from "../src/deck.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("Use no arguments, or --check.");
const read = path => readFile(resolve(root, path), "utf8");
const [template, course, core, ui] = await Promise.all([
  read("courses/markov-chains-explorer.template.html"), read("courses/markov-chains.json"),
  read("courses/markov-chains-core.mjs"), read("courses/markov-chains-explorer-ui.mjs")
]);
validateDeck(JSON.parse(course));
if (Buffer.byteLength(course, "utf8") > 256 * 1024) throw new Error("Course exceeds the native importer limit.");
const importLine = 'import { MAX_STEPS, STATES, PRESETS, parsePercent, computeTrace, presetFor, absorbingStates, observationJSON } from "./markov-chains-core.mjs";\n';
if (!ui.startsWith(importLine) || /^\s*import\s/m.test(ui.slice(importLine.length))) {
  throw new Error("Unexpected explorer import boundary.");
}
const names = ["MAX_STEPS", "STATES", "PRESETS", "parsePercent", "validateConfiguration", "computeTrace", "presetFor", "absorbingStates", "observationJSON"];
const actual = [...core.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(actual) !== JSON.stringify(names)) throw new Error("Unexpected core exports.");
const script = "const { " + names.join(", ") + " } = (() => {\n" +
  core.replace(/^export (?=function|const)/gm, "") +
  "\nreturn { " + names.join(", ") + " };\n})();\n" + ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error("Embedded code must not close the script element.");
let output = template;
for (const [marker, content] of Object.entries({
  "@@COURSE_BASE64@@": Buffer.from(course, "utf8").toString("base64"), "@@SCRIPT@@": script
})) {
  if (output.split(marker).length !== 2) throw new Error("Template marker must occur once: " + marker);
  output = output.replace(marker, () => content);
}
if (/@@(?:COURSE_BASE64|SCRIPT)@@/.test(output)) throw new Error("Unresolved template marker.");
const target = resolve(root, "courses/markov-chains-explorer.html");
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8") !== output) throw new Error("Rebuild the Markov-chain explorer.");
  console.log("Markov-chain explorer matches its exact core, UI, template and course inputs.");
} else {
  await writeFile(target, output, "utf8");
  console.log("Built courses/markov-chains-explorer.html");
}
