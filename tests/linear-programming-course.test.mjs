import test from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { parseDeck, serializeDeck } from "../src/deck.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = path => readFile(join(root, path), "utf8");
test("original course is admitted by the native deck codec and round-trips", async () => {
  const source = await read("courses/linear-programming.json");
  const deck = parseDeck(source);
  assert.equal(deck.items.length, 16);
  assert.equal(deck.concepts.length, 5);
  assert.deepEqual(parseDeck(serializeDeck(deck)), deck);
  assert.ok(Object.isFrozen(deck));
  assert.ok(deck.items.every(item => Object.isFrozen(item)));
});
test("built course and guide downloads contain their complete exact UTF-8 bytes", async () => {
  const page = await read("courses/linear-programming-explorer.html");
  for (const [id, path] of [["course-data", "courses/linear-programming.json"], ["guide-data", "courses/linear-programming.md"]]) {
    const match = page.match(new RegExp('<script id="' + id + '" type="application/octet-stream">([A-Za-z0-9+/=]+)</script>'));
    assert.ok(match, id);
    assert.equal(Buffer.from(match[1], "base64").toString("utf8"), await read(path));
  }
});
test("the offline script is valid classic JavaScript and contains no unresolved module imports", async () => {
  const page = await read("courses/linear-programming-explorer.html");
  const scripts = [...page.matchAll(/<script>\n([\s\S]*?)\n<\/script>/g)];
  assert.equal(scripts.length, 1);
  assert.doesNotThrow(() => new vm.Script(scripts[0][1]));
  assert.doesNotMatch(scripts[0][1], /^\s*(?:import|export)\s/m);
  assert.doesNotMatch(page, /@@(?:COURSE_BASE64|GUIDE_BASE64|SCRIPT)@@/);
});
test("native builder check accepts the exact generated artifact", () => {
  const child = spawnSync(process.execPath, ["tools/build-linear-programming.mjs", "--check"], { cwd: root, encoding: "utf8" });
  assert.equal(child.status, 0, child.stderr);
  assert.match(child.stdout, /matches its exact model/);
});
test("builder rejects stale guide bytes and restores exact output only after rebuilding", async () => {
  const temp = await mkdtemp(join(tmpdir(), "recall-lp-builder-"));
  try {
    for (const path of [
      "src/deck.mjs", "src/linear-programming.mjs", "src/linear-programming-ui.mjs",
      "courses/linear-programming.json", "courses/linear-programming.md",
      "courses/linear-programming-explorer.template.html", "courses/linear-programming-explorer.html",
      "tools/build-linear-programming.mjs"
    ]) {
      await mkdir(join(temp, path, ".."), { recursive: true });
      await writeFile(join(temp, path), await read(path));
    }
    const run = args => spawnSync(process.execPath, ["tools/build-linear-programming.mjs", ...args], { cwd: temp, encoding: "utf8" });
    const original = await readFile(join(temp, "courses/linear-programming-explorer.html"), "utf8");
    await writeFile(join(temp, "courses/linear-programming.md"), await read("courses/linear-programming.md") + "\nLocal receiving change.\n");
    const stale = run(["--check"]);
    assert.notEqual(stale.status, 0);
    assert.match(stale.stderr, /Rebuild the linear-programming explorer/);
    assert.equal(await readFile(join(temp, "courses/linear-programming-explorer.html"), "utf8"), original);
    assert.equal(run([]).status, 0);
    assert.equal(run(["--check"]).status, 0);
    assert.notEqual(await readFile(join(temp, "courses/linear-programming-explorer.html"), "utf8"), original);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
test("builder refuses an unrecognized argument without rewriting the page", async () => {
  const original = await read("courses/linear-programming-explorer.html");
  const child = spawnSync(process.execPath, ["tools/build-linear-programming.mjs", "--unexpected"], { cwd: root, encoding: "utf8" });
  assert.notEqual(child.status, 0);
  assert.match(child.stderr, /Use no arguments, or --check/);
  assert.equal(await read("courses/linear-programming-explorer.html"), original);
});
