import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import os from "node:os";

const options = {};
for (let i = 2; i < process.argv.length; i += 2) {
  const name = process.argv[i];
  if (!["--candidate", "--learner", "--output", "--chromium", "--playwright"].includes(name) || !process.argv[i + 1] || Object.hasOwn(options, name)) throw new Error("Supply each named receiver path exactly once.");
  options[name] = resolve(process.argv[i + 1]);
}
if (Object.keys(options).length !== 5) throw new Error("Required: --candidate --learner --output --chromium --playwright");
const candidate = options["--candidate"], output = options["--output"];
await fs.mkdir(output, { recursive: false });
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const paths = ["src/linear-programming.mjs", "src/linear-programming-ui.mjs",
  "courses/linear-programming.json", "courses/linear-programming.md",
  "courses/linear-programming-explorer.template.html", "courses/linear-programming-explorer.html",
  "src/deck.mjs", "tools/build-linear-programming.mjs"];
const pins = async () => Object.fromEntries(await Promise.all(paths.map(async path => [path, sha(await fs.readFile(join(candidate, path)))])));
const before = await pins();
const learnerBefore = sha(await fs.readFile(options["--learner"]));
const stat = await fs.statfs(output);
const meminfo = await fs.readFile("/proc/meminfo", "utf8");
const availableMemory = Number(meminfo.match(/^MemAvailable:\s+(\d+) kB/m)[1]) * 1024;
const capacity = { availableDisk: stat.bavail * stat.bsize, availableMemory, load: os.loadavg(), cpus: os.availableParallelism() };
assert.ok(capacity.availableDisk >= 268435456, "At least 256 MiB free disk is required.");
assert.ok(capacity.availableMemory >= 536870912, "At least 512 MiB available RAM is required.");
assert.ok(capacity.load[1] < capacity.cpus * 2, "Five-minute load exceeds bounded receiver admission.");
const require = createRequire(import.meta.url);
const { chromium } = require(options["--playwright"]);
const playwrightVersion = JSON.parse(await fs.readFile(join(options["--playwright"], "package.json"), "utf8")).version;
let browser, context, page;
const groups = [], consoleErrors = [], pageErrors = [], outsideRequests = [];
let failure = null, checks = 0;
const check = (condition, message) => { checks += 1; assert.ok(condition, message); };
const eq = (actual, expected, message) => { checks += 1; assert.deepEqual(actual, expected, message); };
const group = async (name, action) => { await action(); groups.push(name); console.log("PASS " + name); };
const text = id => page.locator("#" + id).innerText();
const preset = async id => { await page.selectOption("#preset", id); await page.click("#load-preset"); };
const download = async (selector, name) => {
  const pending = page.waitForEvent("download");
  await page.click(selector);
  const item = await pending;
  eq(item.suggestedFilename(), name, "download name");
  const target = join(output, name);
  await item.saveAs(target);
  eq(await item.failure(), null, "download succeeded");
  return fs.readFile(target);
};
try {
  await fs.mkdir(join(output, "browser-downloads"));
  browser = await chromium.launch({ downloadsPath: join(output, "browser-downloads"), executablePath: options["--chromium"], headless: true, chromiumSandbox: true, timeout: 45000 });
  context = await browser.newContext({ acceptDownloads: true, viewport: { width: 1280, height: 960 } });
  await context.route("**/*", route => {
    const url = route.request().url();
    if (!/^(file:|data:|blob:)/.test(url)) { outsideRequests.push(url); return route.abort(); }
    return route.continue();
  });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") consoleErrors.push(message.text()); });
  await page.goto(pathToFileURL(join(candidate, "courses/linear-programming-explorer.html")).href);
  await group("initial exact unique optimum and all pair rows", async () => {
    check((await text("optimum-summary")).includes("Maximum 9 at V3 (1, 3)"), "unique optimum");
    eq(await page.locator("#vertices-table tbody tr").count(), 4, "four vertices");
    eq(await page.locator("#pairs-table tbody tr").count(), 15, "all 15 boundary pairs");
    check((await text("status")).includes("exact arithmetic"), "applied status");
    eq(await page.locator("#download-observation").isEnabled(), true, "observation available");
  });
  await group("fractional optimum and exact downloaded observation", async () => {
    await preset("fractional");
    check((await text("optimum-summary")).includes("Maximum 10/3"), "fractional value");
    check((await text("vertices-table")).includes("5/3"), "exact rational coordinates");
    await page.selectOption("#vertex-select", "V3");
    const bytes = await download("#download-observation", "linear-programming-observation.json");
    const observation = JSON.parse(bytes);
    eq(observation.optimum.value, "10/3", "download exact value");
    eq(observation.inspection.selectedVertex, "V3", "download inspected vertex");
    eq(observation.pairs.length, 15, "download all pair decisions");
    eq(observation.vertices.find(v => v.id === "V3").x, "5/3", "download exact x");
    eq(observation.vertices.find(v => v.id === "V3").slacks.length, 6, "all row slacks");
    await page.screenshot({ path: join(output, "desktop-fractional.png"), fullPage: true });
  });
  await group("all complete optimum dimensions and infeasibility", async () => {
    for (const [id, fragment, coverage] of [
      ["edge", "entire segment", "remaining feasible"],
      ["constant", "entire feasible region", "Every feasible"],
      ["line", "Minimum 6", "Every feasible"],
      ["point", "(2, 1)", "Every feasible"],
      ["empty", "Infeasible", "no attained optimum"]
    ]) {
      await preset(id);
      check((await text("optimum-summary")).includes(fragment), id + " summary");
      check((await text("coverage")).includes(coverage), id + " complete set");
    }
    eq(await page.locator("#vertex-select").isDisabled(), true, "empty inspection disabled");
    eq(await page.locator("#vertices-table tbody tr").count(), 0, "empty has no vertex");
    eq(await page.locator("#slacks-table tbody tr").count(), 0, "empty has no stale slacks");
  });
  await group("draft retirement, invalid recovery and changed mathematical rectangle", async () => {
    await preset("fractional");
    await page.fill("#xmax", "1");
    eq(await page.locator("#result").isVisible(), false, "old result retired");
    eq(await page.locator("#download-observation").isDisabled(), true, "old download retired");
    await page.click("#apply");
    check((await text("optimum-summary")).includes("Maximum 3"), "bound changes optimum");
    await page.fill("#constraints", '<img src=x onerror="window.bad=1">');
    await page.click("#apply");
    eq(await page.locator("#error").isVisible(), true, "invalid draft alert");
    eq(await page.locator("#result").isVisible(), false, "invalid draft has no old result");
    eq(await page.locator("img").count(), 0, "input is not interpreted as markup");
    eq(await page.evaluate(() => window.bad), undefined, "no markup side effect");
    await page.fill("#constraints", "2, 1, 5\n1, 2, 5");
    await page.click("#apply");
    eq(await page.locator("#error").isVisible(), false, "error clears on recovery");
    check((await text("optimum-summary")).includes("Maximum 3"), "recovered changed problem");
  });
  await group("zero-normal contradiction and degenerate rectangle receiving", async () => {
    await preset("unique");
    await page.fill("#constraints", "0, 0, -1");
    await page.click("#apply");
    check((await text("optimum-summary")).startsWith("Infeasible"), "zero-normal contradiction");
    check((await text("pairs-table")).includes("zero-normal"), "pair classification visible");
    for (const [id, value] of [["xmin","2"],["xmax","2"],["ymin","1"],["ymax","1"],["p","0"],["q","0"],["constraints",""]]) await page.fill("#" + id, value);
    await page.click("#apply");
    check((await text("optimum-summary")).includes("(2, 1)"), "degenerate rectangle remains point");
    check((await text("coverage")).includes("Every feasible"), "point whole region");
    eq(await page.locator("#plot circle").count() > 0, true, "point drawn");
  });
  let courseBytes;
  await group("course and guide real downloads have exact original bytes", async () => {
    courseBytes = await download("#download-course", "linear-programming.json");
    eq(courseBytes, await fs.readFile(join(candidate, "courses/linear-programming.json")), "course bytes");
    const guideBytes = await download("#download-guide", "linear-programming.md");
    eq(guideBytes, await fs.readFile(join(candidate, "courses/linear-programming.md")), "guide bytes");
  });
  await group("keyboard application and exact vertex inspection", async () => {
    await preset("unique");
    await page.focus("#p");
    await page.keyboard.press("ControlOrMeta+A");
    await page.keyboard.type("1");
    await page.keyboard.press("Enter");
    check((await text("result-title")).includes("1x + 2y"), "keyboard applied draft");
    await page.focus("#vertex-select");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    eq(await page.locator("#vertex-select").inputValue(), "V4", "keyboard native select");
    check((await text("vertex-detail")).startsWith("V4"), "inspection follows keyboard");
    eq(await page.locator("#slacks-table tbody tr").count(), 6, "all inspected row slacks");
  });
  await group("mobile layout and explicit print rendering", async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "no page horizontal overflow");
    await page.locator("#pair-details summary").click();
    eq(await page.locator("#pair-details").getAttribute("open"), "", "pairs open via actual control");
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, "long table remains contained");
    await page.screenshot({ path: join(output, "mobile-pairs.png"), fullPage: true });
    await page.emulateMedia({ media: "print" });
    await page.screenshot({ path: join(output, "print.png"), fullPage: true });
    await page.emulateMedia({ media: "screen" });
  });
  await group("downloaded course enters unchanged learner preview start and feedback", async () => {
    const learner = await context.newPage();
    learner.on("pageerror", error => pageErrors.push(error.message));
    await learner.goto(pathToFileURL(options["--learner"]).href);
    await learner.setInputFiles("#deck-file", join(output, "linear-programming.json"));
    await learner.locator("#start-deck").waitFor();
    check((await learner.locator("#deck-preview-title").innerText()).includes("Linear programming"), "native preview title");
    check((await learner.locator(".deck-preview-count").innerText()).includes("16"), "native preview count");
    await learner.click("#start-deck");
    const prompt = await learner.locator(".question-card h2").innerText();
    const deck = JSON.parse(courseBytes);
    const question = deck.items.find(item => item.prompt === prompt);
    check(Boolean(question), "learner uses original lesson question");
    await learner.click('.choice[data-choice="' + question.answer + '"]');
    await learner.locator("#feedback-slot .feedback").waitFor();
    check((await learner.locator("#feedback-slot").innerText()).includes(question.explanation), "native learner shows matching explanation");
    eq(await learner.locator(".choice.correct").count(), 1, "native learner marks correct answer");
    await learner.screenshot({ path: join(output, "learner-feedback.png"), fullPage: true });
    await learner.close();
    check((await text("vertex-detail")).startsWith("V4"), "separate learner flow preserves lab inspection");
  });
  await group("no external requests, browser errors or automatic storage", async () => {
    eq(outsideRequests, [], "no external request");
    eq(pageErrors, [], "no page errors");
    eq(consoleErrors, [], "no console errors");
    eq(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })), { local: 0, session: 0 }, "no browser storage");
  });
} catch (error) {
  failure = { name: error.name, message: error.message, stack: error.stack };
  if (page) await page.screenshot({ path: join(output, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  const browserVersion = browser?.version() ?? null;
  if (context) await context.close().catch(() => {});
  if (browser) await browser.close().catch(() => {});
  const after = await pins();
  const learnerAfter = sha(await fs.readFile(options["--learner"]));
  if (JSON.stringify(before) !== JSON.stringify(after) || learnerBefore !== learnerAfter) failure ??= { message: "Source changed during receiving." };
  const receipt = {
    schema: "recallweave.linear-programming-browser/1", status: failure ? "failed" : "passed",
    runtime: { node: process.version, playwright: playwrightVersion, browser: browserVersion, chromium: options["--chromium"], chromiumSandbox: true },
    capacity, groups, checks, before, after, learnerBefore, learnerAfter, outsideRequests, pageErrors, consoleErrors, failure
  };
  await fs.writeFile(join(output, "RECEIPT.json"), JSON.stringify(receipt, null, 2) + "\n");
  console.log(JSON.stringify({ status: receipt.status, groups: groups.length, checks, failure }));
  if (failure) process.exitCode = 1;
}
