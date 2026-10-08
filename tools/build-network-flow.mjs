import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseDeck } from "../src/deck.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
if (process.argv.slice(2).some(arg => arg !== "--check")) throw new Error("Use no arguments, or --check.");
const read = path => readFile(resolve(root, path), "utf8");
const [template, course, guide, core, ui] = await Promise.all([
  read("courses/network-flow-explorer.template.html"), read("courses/network-flow.json"),
  read("courses/network-flow.md"), read("src/network-flow.mjs"), read("src/network-flow-ui.mjs")
]);
parseDeck(course);
const importLine = 'import { PRESETS, parseNetwork, networkText, solveNetwork, observationJSON } from "./network-flow.mjs";\n';
if (!ui.startsWith(importLine) || /^\s*import\s/m.test(ui.slice(importLine.length))) throw new Error("Unexpected explorer import boundary.");
const names = ["LIMITS", "PRESETS", "validateNetwork", "parseNetwork", "networkText", "solveNetwork", "observationJSON"];
const actual = [...core.matchAll(/^export (?:function|const) (\w+)/gm)].map(match => match[1]);
if (JSON.stringify(actual) !== JSON.stringify(names)) throw new Error("Unexpected core exports.");
const script = "(() => {\nconst { " + names.join(", ") + " } = (() => {\n" +
  core.replace(/^export (?=function|const)/gm, "") + "\nreturn { " + names.join(", ") + " };\n})();\n" +
  ui.slice(importLine.length) + "\n})();\n";
if (/<\/script/i.test(script)) throw new Error("Embedded code must not close its script element.");
let output = template;
for (const [marker, content] of Object.entries({
  "@@COURSE_BASE64@@": Buffer.from(course, "utf8").toString("base64"),
  "@@GUIDE_BASE64@@": Buffer.from(guide, "utf8").toString("base64"),
  "@@SCRIPT@@": script
})) {
  if (output.split(marker).length !== 2) throw new Error("Template marker must occur once: " + marker);
  output = output.replace(marker, () => content);
}
if (/@@(?:COURSE_BASE64|GUIDE_BASE64|SCRIPT)@@/.test(output)) throw new Error("Unresolved template marker.");
const target = resolve(root, "courses/network-flow-explorer.html");
if (process.argv.includes("--check")) {
  if (await readFile(target, "utf8") !== output) throw new Error("Rebuild the network-flow explorer.");
  console.log("Network-flow explorer matches its exact model, UI, template, course and guide.");
} else {
  await writeFile(target, output, "utf8");
  console.log("Built courses/network-flow-explorer.html (" + Buffer.byteLength(output, "utf8") + " bytes).");
}
