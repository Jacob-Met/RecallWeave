# First-pass answer feedback receiving

Owner: `hamon-ultra-ab529ac65023-20261008/mac_production`. Scope: [issue #76](https://github.com/Jacob-Met/RecallWeave/issues/76).

This commit freezes the receiver and original synthetic fixture before any production change. The existing first-pass feedback identifies answers through option colors; the proposed correction adds visible chosen and correct option text through the existing escaping function. Practice, scoring, option order, model parameters, focus and saved-state contracts stay under their current implementation and owners. In particular, issue #81's pending-question resume work is separate.

## Frozen receiving

Run with Node 22+ and an installed Chrome:

```sh
node --check tools/check_answer_feedback_browser.mjs
python3 tools/make_demo.py
git diff --exit-code -- demo.html
node tools/check_answer_feedback_browser.mjs --root "$PWD" --browser /path/to/chrome --output /new/owned/output --emit-bundle
```

The unique `answer-feedback-browser` workflow uses the repository's already pinned checkout/setup-node actions. All existing workflows retain their original bytes.

The receiver uses actual keyboard Tab/Enter actions and actual file inputs. It checks the modular bundled learner, the standalone learner with an original three-question literal-text fixture, and saved feedback restored through a physical downloaded file. Each fresh document forces a specified option-shuffle random value, recorded in the report. Forced colors, visible canonical answer paragraphs and unignored accessibility-tree label text provide a color-independent text check. This is not a screen-reader or whole-application accessibility certification.

Correctness controls compare canonical answer text, first-try review, mastery, progress and saved presentation, retain existing focus and polite live-region behavior, reject active markup/external requests, and verify every consumed source file remains unchanged. The receiver retains two screenshots, two downloaded lesson files and a full report. Its bounded complete packet is printed only after each file is read and hashed; the workflow log is part of evidence custody.

## Baseline and resource status

Actual Node, Chrome and baseline results are pending in this source-only commit. The Mac's observed 328,232,960 bytes free is below the 1 GiB browser/build floor; no browser or native target write began. Hosted receiving uses the same floor and an owned browser/profile/output only.

`source-receipt.json` pins the exact production baseline, frozen receiver and fixture, including the preliminary V8 adapter error and its narrow syntax-adapter correction. `preparation/receiver-before-bundle.mjs` retains the original unexecuted source variant before adding the maintained packet transport. Neither preparation check is represented as actual Node or browser execution.
