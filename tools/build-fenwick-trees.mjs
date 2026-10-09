#!/usr/bin/env node
// Builds only the standalone Fenwick explorer; no package installation or network.
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createHash} from "node:crypto";
import {parseDeck} from "../src/deck.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const paths = {
  model: "src/fenwick-trees.mjs", ui: "src/fenwick-trees-ui.mjs",
  template: "templates/fenwick-trees-explorer.html", course: "courses/fenwick-trees.json"
};
const bytes = Object.fromEntries(Object.entries(paths).map(([key, name]) => [key, fs.readFileSync(path.join(root, name))]));
const source = Object.fromEntries(Object.entries(bytes).map(([key, value]) => [key, value.toString("utf8")]));
for (const [key, value] of Object.entries(bytes)) {
  if (!Buffer.from(source[key], "utf8").equals(value)) throw new Error("Invalid UTF-8: " + paths[key]);
}
parseDeck(source.course);
const importLine = 'import {parseFenwickDraft, buildFenwickTrace, serializeFenwickTrace} from "./fenwick-trees.mjs";';
if (!source.ui.startsWith(importLine + "\n") || source.ui.indexOf(importLine, importLine.length) !== -1) {
  throw new Error("Unexpected UI module boundary.");
}
const model = source.model.replace(/^export /gm, "");
if (/^\s*(import|export)\s/m.test(model)) throw new Error("Unexpected model module boundary.");
const safeJson = (value) => JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
const replacements = {
  "/*__FENWICK_MODEL__*/": model,
  "/*__FENWICK_COURSE__*/": safeJson(source.course),
  "/*__FENWICK_UI__*/": source.ui.slice(importLine.length + 1)
};
let html = source.template;
for (const [marker, replacement] of Object.entries(replacements)) {
  if (html.split(marker).length !== 2) throw new Error("Expected exactly one marker: " + marker);
  if (marker !== "/*__FENWICK_COURSE__*/" && /<\/script/i.test(replacement)) {
    throw new Error("Unexpected script terminator.");
  }
  html = html.replace(marker, () => replacement);
}
const output = path.join(root, "courses/fenwick-trees-explorer.html");
const check = process.argv.slice(2);
if (check.length > 1 || (check.length === 1 && check[0] !== "--check")) throw new Error("Use no arguments or --check.");
for (const [key, name] of Object.entries(paths)) {
  if (!fs.readFileSync(path.join(root, name)).equals(bytes[key])) throw new Error("Source changed during build: " + name);
}
if (check.length) {
  if (!fs.readFileSync(output).equals(Buffer.from(html))) throw new Error("Standalone explorer needs rebuilding.");
} else {
  const temporary = output + ".tmp-" + process.pid;
  try { fs.writeFileSync(temporary, html, {flag: "wx"}); fs.renameSync(temporary, output); }
  finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
console.log(JSON.stringify({mode: check.length ? "check" : "build", output: "courses/fenwick-trees-explorer.html",
  bytes: Buffer.byteLength(html), sha256: createHash("sha256").update(html).digest("hex"),
  inputs: Object.fromEntries(Object.entries(paths).map(([key, name]) => [name, {bytes: bytes[key].length,
    sha256: createHash("sha256").update(bytes[key]).digest("hex")}]))}));
