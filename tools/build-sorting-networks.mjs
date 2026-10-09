import {readFile, writeFile} from "node:fs/promises";
import {dirname, resolve} from "node:path";
import {fileURLToPath} from "node:url";
import {validateDeck} from "../src/deck.mjs";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== "--check")) throw new Error("Use no arguments, or --check.");
const read = path => readFile(resolve(root, path), "utf8");
const [template, core, ui, course] = await Promise.all([
  read("courses/sorting-networks-explorer.template.html"), read("courses/sorting-networks-core.mjs"),
  read("courses/sorting-networks-explorer-ui.mjs"), read("courses/sorting-networks.json")
]);
validateDeck(JSON.parse(course));
if (Buffer.byteLength(course) > 262144) throw new Error("Lesson exceeds native import limit.");
const importLine = 'import { PRESETS, parseDraft, analyzeNetwork, configurationJSON } from "./sorting-networks-core.mjs";\n';
if (!ui.startsWith(importLine) || /^\s*import\s/m.test(ui.slice(importLine.length))) throw new Error("Unexpected UI import boundary.");
const names = ["MAX_WIRES","MAX_COMPARATORS","PRESETS","validateConfiguration","parseDraft","traceInput","analyzeNetwork","configurationJSON","observationJSON"];
const actual = [...core.matchAll(/^export (?:const|function) (\w+)/gm)].map(x => x[1]);
if (JSON.stringify(actual) !== JSON.stringify(names)) throw new Error("Unexpected core export boundary.");
const script = "const { " + names.join(", ") + " } = (() => {\n" +
  core.replace(/^export (?=const|function)/gm, "") +
  "\nreturn { " + names.join(", ") + " };\n})();\n" + ui.slice(importLine.length);
if (/<\/script/i.test(script)) throw new Error("Script must not close its embedding element.");
let output = template;
for (const [marker, value] of [["@@COURSE_BASE64@@", Buffer.from(course).toString("base64")], ["@@SCRIPT@@", script]]) {
  if (output.split(marker).length !== 2) throw new Error("Template needs exactly one " + marker);
  output = output.replace(marker, () => value);
}
const target = resolve(root, "courses/sorting-networks-explorer.html");
if (args[0] === "--check") {
  if (await readFile(target, "utf8") !== output) throw new Error("Standalone lab is stale.");
  console.log("Sorting-network standalone is exact to core, UI, template and course.");
} else {
  await writeFile(target, output, "utf8");
  console.log("Built courses/sorting-networks-explorer.html");
}
