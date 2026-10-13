# Selected-course browser receiving

**Accepted native receiving:** the supplied expected-loss lesson completes the real RecallWeave learner on the verified MSI device, using desktop HTTP and a standalone file at a 390-pixel viewport. The exact receiver also passes independently authored one- and two-question courses. A follow-up against the newly changed learner source passes unchanged.

Owner: `dc7255e161d3/root`; source scope [#315](https://github.com/Jacob-Met/RecallWeave/issues/315). The selected lesson remains under the existing content and mathematical-review ownership in [#235](https://github.com/Jacob-Met/RecallWeave/issues/235).

## Use the lesson

Download the maintained [standalone learner at the current received revision](https://raw.githubusercontent.com/Jacob-Met/RecallWeave/ea860d9a47ee16788e6d1220c7a0c5053cc08978/demo.html) as `demo.html`, and the [accepted lesson JSON](https://raw.githubusercontent.com/Jacob-Met/RecallWeave/1892d07bc16b009af91407f42836f5c2e67459ff/courses/expected-loss-decisions.json) as a separate file. Open `demo.html` locally, choose that JSON, inspect its preview, and explicitly start it. Its twelve questions cover expected loss, action thresholds, decision limits and value of information.

The learner offers explanations, first-session review, separate retry practice, written reflections and downloadable study notes. The receiving sessions deliberately miss two questions to exercise these paths. The published notes and screenshots are synthetic receiving artifacts, not Jacob's answers or evidence of measured learning.

For reusable engineering receiving, see [the practical receiver guide](../../course-import-receiving.md).

## Exact qualified inputs

| Input | Identity |
| --- | --- |
| Original learner used by the twelve-, one- and two-question receiving | `340203703b38ba91536f4337c35a200c8f947cda` |
| Newer learner independently received before integration | `ea860d9a47ee16788e6d1220c7a0c5053cc08978` |
| Accepted expected-loss lesson commit | `1892d07bc16b009af91407f42836f5c2e67459ff` |
| Accepted lesson JSON Git blob | `0ea649536cc612a954a21540d5176ecb3239ce74` |
| Receiver SHA-256 | `9823f06e0321794045a0206ab5735ec052780c15b808e21fd3465bb9d40eb45a` |
| Receiver Git blob | `763bf8bcbf17093e87f617da6a6e1c84e6dd0936` |

Each receiving reads seventeen maintained learner/build files and verifies their exact source identities before and after execution. The selected course and its guide remain unchanged. The original nineteen-file intake totaled 247,937 bytes. The newer intake changes exactly `src/app.mjs`, `index.html` and `demo.html`, incorporating the existing owner's leave-page feature. No new module is needed by that version.

The course's earlier independent mathematical review remains separate. This receiver derives expected answer text from the supplied course key; it verifies faithful presentation and saved output.

## Actual receiving

All entries below used the same final receiver, Node **24.19.0** and Microsoft Edge **155.0.4283.45**, on authorized device `9ea77fe9-bb87-46e0-a5a8-8b3e25f6ff7e` (MSI, Windows user Veria). The work used a private directory, browser profile and temporary directory on D:.

| Course and learner | Browser entry points | Check groups | Actual notes | Outcome |
| --- | --- | --- | --- | --- |
| Twelve-question expected loss; original learner; v3 | Desktop HTTP and mobile-width standalone file | 21 passed | Four completed downloads | Exit 0; no fatal error; all cleanup checks pass |
| Independently authored one-question/two-option control; original learner | Both entry points | 21 passed | Four completed downloads | Exit 0; singular notes path and cleanup pass |
| Independently authored two-question prerequisite control; original learner | Both entry points | 21 passed | Four completed downloads | Exit 0; three-/six-option questions and pause/resume pass |
| Twelve-question expected loss; newer learner; current v4 | Both entry points | 21 passed | Four completed downloads | Exit 0; no receiver change; all cleanup checks pass |

These are groups in a finite browser protocol, not a repository-wide unit-test count. Each twelve-question entry covers every question, actual pointer answers, corrections, explanations, transfer text, the 10/12 first result, typed first-item reflection, two separate retries, and real notes before and after practice. It also checks horizontal overflow, exact served source bytes, the switch back to an empty bundled lesson, and preservation of already-downloaded notes.

The current run is recorded in [the process result](process-result-v4.json) and [the complete browser receipt](expected-loss-current-v4/browser-receipt.json). The receipt is **206,263 bytes**, SHA-256 **c2d236f3eae8b5e9b20baca12b4fced5c6a92a4359bd1035aa6fbd629f3e1519**. The Node child exited zero in 37.828 seconds; that duration is an observation, not a benchmark.

The current run followed launcher PID 25936 to actual browser PID 30596. After requesting closure, it observed the remote connection close and the actual PID disappear, then removed only its private profile. Closure observation took 16.828 seconds. The original twelve-question and two-question runs also required more than five seconds, which explains the bounded 30-second grace in the final receiver.

## Review the actual artifacts

The current receiving captures are:

- [Desktop lesson preview](expected-loss-current-v4/desktop-http-preview.png)
- [Desktop first-session trace](expected-loss-current-v4/desktop-http-first-trace.png)
- [Mobile-width first question](expected-loss-current-v4/mobile-file-first-question.png)
- [Mobile-width completed practice](expected-loss-current-v4/mobile-file-practice-complete.png)

The four actual current note downloads are:

- [Desktop before practice](expected-loss-current-v4/desktop-http-before-practice-study-notes.txt)
- [Desktop after practice](expected-loss-current-v4/desktop-http-after-practice-study-notes.txt)
- [Mobile standalone before practice](expected-loss-current-v4/mobile-file-before-practice-study-notes.txt)
- [Mobile standalone after practice](expected-loss-current-v4/mobile-file-after-practice-study-notes.txt)

The independent [artifact review](context-artifact-review-current-v4-20261013.json) compares every note to the accepted course, checks that the synthetic reflection remains with its first question, and verifies that practice does not replace first answers or model estimates. It also records personal inspection of all four selected current captures. The newer notes equal the earlier accepted v3 notes after removing only their save timestamps.

The [independent runtime packet](runtime-review/review.json) contains the original-source receiving disposition, original one-/two-question fixtures, actual notes and browser receipts, exact source checks, lifecycle measurements and preserved environmental controls. Its [manifest](runtime-review/MANIFEST.json) covers the frozen 35-file, 209,110-byte packet. Later-current-source receiving is an additional qualification, not a retroactive expansion of those controls.

The separate [current-source runtime review](runtime-review-current-v4/full-v4-independent-review.json) verifies all nineteen source/course intake files, the exact receiver, all four current notes, and fresh absence of actual browser PID 30596 and its owned profile. Its [review helper](runtime-review-current-v4/review-full-v4.mjs) is retained alongside that record. Source integration also preserves `acc5f48f8d20b5899c06b3a38a5342f9e496bdad`, which adds two unrelated ranked-voting package helpers without changing any received learner input.

## Reproduce the current native workflow

The successful source directory on the verified device is:

`D:\hamon-course-receiving-dc7255e161d3\source-current-ea860d9`

The process used `TMP` and `TEMP` under `D:\hamon-course-receiving-dc7255e161d3\tmp`, and a fresh private profile under the sibling `profiles` directory. The exact argv is retained in the process receipt. For a repeat, choose a new output path:

```powershell
$env:TMP = 'D:\hamon-course-receiving-dc7255e161d3\tmp'
$env:TEMP = $env:TMP
$env:RECALL_COURSE_PROFILE_ROOT = 'D:\hamon-course-receiving-dc7255e161d3\profiles'
& 'C:\Program Files\nodejs\node.exe' `
  'D:\hamon-course-receiving-dc7255e161d3\source-current-ea860d9\tools\check_course_import_browser.mjs' `
  'D:\hamon-course-receiving-dc7255e161d3\source-current-ea860d9' `
  'D:\hamon-course-receiving-dc7255e161d3\source-current-ea860d9\courses\expected-loss-decisions.json' `
  'D:\hamon-course-receiving-dc7255e161d3\new-receiving-output' `
  'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
```

For another device, use its own verified browser and supported source/output/profile/temp locations. The source and course paths are arguments; this tool is not tied to the recorded machine.

## Preserved failures and corrections

The first ThinkPad runs reached all twelve questions and reflection entry, then failed at a canceled note download. Independent 50-byte HTTP and Blob controls also failed with the browser's **Disk full** reason before writing bytes. The temporary filesystem was full, and the home volume later also filled. These remain failed environmental receiving attempts; no browser policy or sandbox was changed and no other workers' files were deleted.

The first Windows attempt exposed Edge's launcher handoff. Its launcher exited zero while the private browser continued. The worker identified that exact browser through its fresh profile's own debugging endpoint, closed it through CDP, and verified its absence. The receiver now follows the actual browser PID instead of treating launcher exit as browser completion.

The next Windows run passed all 21 learner groups but failed the original five-second shutdown observation. Later independent inspection found the actual browser absent. A small measured close probe and the final full runs supported retaining the same cleanup criteria with a bounded longer grace. A separately reproduced temporary `EBUSY` while Edge wrote its endpoint file is retried within the existing startup deadline; access-denied errors still fail.

The earlier receipts under [history](history/) and the [runtime lifecycle evidence](runtime-review/lifecycle/) retain these outcomes. They are not rewritten as successes. Independent source review also corrected singular wording in the one-question notes expectation and strengthened the reflection-to-question assertion.

## Scope and ownership

This is native engineering receiving of the supplied course through the recorded learner revisions. It establishes actual import, question/feedback presentation, practice, downloaded notes, response-byte identity and owned-resource cleanup for the recorded cases.

It does not establish learning efficacy, validated assessment, correctness of arbitrary course content, every possible valid-deck boundary, installed service adoption, a hosted deployment, cross-platform browser success, or human creative acceptance. The leave-page feature's own behavior and the separately owned Resume/practice freshness correction remain with their existing owners.

Only the new generic receiver, its guide and this additive receiving evidence are changed. The maintained learner, lesson content, existing receivers, dependencies and workflows are preserved. Source publication uses the existing no-Actions convention; no workflow is dispatched, rerun, edited or bypassed.

## Publication and integration boundary

The reviewed source and native evidence are published on a feature branch. Main integration is held under the standing no-Actions instruction: the repository currently has a separate `dynamic/pages/pages-build-deployment` route on main, including [run 38346707454](https://github.com/Jacob-Met/RecallWeave/actions/runs/38346707454) at the preserved composition base. Commit skip markers do not establish suppression of that independent route. This work changes no workflow or deployment setting. The feature-branch source, practical guide and actual receiving artifacts remain usable while that integration boundary is unresolved.
