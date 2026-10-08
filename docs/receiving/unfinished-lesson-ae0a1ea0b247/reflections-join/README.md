# Reflection notebook and unfinished lesson composition

## Source and reason for the successor

PR #37's importer composition `5caab405651dd9078a46d817d76a6a33c8d5c234`
passed native CI (204 tests and exact standalone rebuild). Its normal
expected-head merge returned GitHub 405, "Pull Request has merge conflicts",
after the reflection notebook in PR #36 merged at
`3cdebd86e69506709bcaeaeff4026deb3d1fc208`.
The accepted source was preserved and the real concurrent conflict was composed.

Local receiving commit `c7e296167813982978ecf01af2f66f2ebfbddc80` has
parent `6255bcb2e739c4c8e4e6821b63defce655a9771d`. This is an affected
receiving closure, not complete native repository ancestry.
The [source manifest](source-pins.json) binds 22 runtime, documentation and test
inputs plus nine exact native notebook before-images.

The app merge retained both adjacent import declarations; all other app regions
merged cleanly. The existing lesson additions were applied to the notebook
owner's builder, CSS and README. Notebook and export modules were not modified:

| Source | Git blob |
|---|---|
| Joined app | `18521c1f4d3abdadf76790218616f09cee96d6c2` |
| Joined builder | `3fe8ccbab37310cc126f898fb76a6df7a025c0ca` |
| Generated standalone | `cf7eea3792deacc3eb98a22aef539b920fb66746` |
| Joined CSS | `bbe8021daa239faa3ad04281ecce94816d04cb15` |
| Unchanged lesson codec | `b55fc0dd514c105c69fdef4dd766c5dfc4cc2a84` |
| Unchanged lesson UI | `21674525d078e633313503f91bcf89b72ed999df` |
| Native notebook | `1506c7b920ed827a94080bde73351daed6554590` |
| Native study-note exporter | `394b9148d210f885869102d6ea2475efa034bda4` |

## Observed contract

Explicit lesson resume replaces first answers, mastery, question/feedback
presentation, option orders and practice state. It leaves the current notebook
object intact. Consequently, question notes remain bound to item IDs and the
latest application response remains available to the unchanged native notes
download. A saved lesson does not contain notebook writing.

Fresh Reset and Start retain the notebook owner's clearing policy and advance
the lesson control's transient session revision. A pending native read or staged
preview from the previous session cannot undo that reset, even when a repeated
Start has identical visible state and an identical archive aside from its date.

## Qualification and limits

The builder produced 97,565 bytes and its embedded classic script parsed.
The [native receipt](native-tests.json) and [complete output](native-tests.txt)
record 34 passing affected tests, with zero failures or skips. This count is
bounded to lesson, notebook, study-note export and completed-trace tests.
Full inherited repository coverage is reported by the exact published PR's
native CI rather than inferred from this local closure.

A distinct reviewer authored and froze
[independent-reflection-lesson.cjs](independent-browser/independent-reflection-lesson.cjs)
before receiving the composition. Its SHA256 is
`06d6c1e58d8eceeb9831ac925280c7b48c35192691adeb5fd63b854c8c7d4a69`.
All three actual Chromium 153.0.8010.0 groups passed:

1. Modular current notebook edits made after native file reading and after
   preview survived explicit resume, completion and the genuine notes download.
2. The generated standalone repeated that behavior at a 390 by 844 viewport;
   its document width was exactly 390 pixels.
3. Reset and same-course Start cleared writing and invalidated previews and
   held reads, including an explicitly controlled equal-state repeated Start.

There were ten genuine downloads, zero page errors and zero external requests.
All 22 frozen input hashes were unchanged before and after. The saved trace
excluded notebook notes. Exact [results](independent-browser/candidate/receipt.json),
[downloads](independent-browser/candidate/downloads), driver, manifests, stdout,
stderr and the earlier prebrowser ENOSPC disposition are preserved as all 20
original UTF-8 packet members. Receipt SHA256:
`15234be4ebfc16dd36eb821c067ec755803521d99e7b8f67d646d11baaeb2176`.

Only delivery of an already-completed native `File.text()` result was held.
One separate browser context fixed `Math.random` to 0.375 solely to establish
equal-state Start. Course, codec, app and model state were not substituted.
This receiving establishes the stated local software behavior; it does not
establish hosted operation, cross-browser coverage or learning effectiveness.

## Publication and reproduction

The complete native parent at publication retains all other workers' paths.
Since browser receiving, native main added a separate grouped-rates explorer
and a README section. Its lesson runtime is unchanged. The final README
preserves that incoming section and applies only the same eight-line lesson
section; removing the lesson section reconstructs the incoming README exactly.
Historical source pins remain unchanged. [Publication pins](reproduction-pins.json)
adjust only that README identity for reproduction on the published tree.

From a checkout of the exact published PR source, run:

```sh
node --test tests/lesson-archive.test.mjs tests/reflections.test.mjs tests/session-export.test.mjs tests/trace-archive.test.mjs
python3 tools/make_demo.py
node docs/receiving/unfinished-lesson-ae0a1ea0b247/reflections-join/independent-browser/independent-reflection-lesson.cjs \
  --source "$PWD" \
  --out /tmp/recallweave-reflection-receiving-new \
  --pins docs/receiving/unfinished-lesson-ae0a1ea0b247/reflections-join/reproduction-pins.json \
  --legacy docs/receiving/unfinished-lesson-ae0a1ea0b247/independent-ui/candidate-f52bf26f/downloads
```

The optional browser receiver requires an existing Playwright installation and
the Chromium executable supplied through `RECALLWEAVE_REVIEW_CHROMIUM`. Use a fresh output
directory. The application and ordinary native tests remain dependency-free.
