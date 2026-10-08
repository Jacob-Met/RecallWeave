# Independent native browser receiving: phasor interference

The final product at RecallWeave commit **14e6a606c44047425abb0fc4980d7d12c676d40e**
passed **24 of 24 browser cases**, exit **0**, on 2026-10-08. This receipt comes
from the existing Mac Chrome installation through Remote Desktop Commander,
with a new test directory, browser profile and download directories. No browser
or dependency installation was needed.

The reusable receiver is
[tools/verify-phasor-interference-browser.mjs](../../../../tools/verify-phasor-interference-browser.mjs).
It imports no product model or UI functions. It uses actual keyboard input,
preset/step clicks, browser file selection, navigation, completed browser
downloads and DOM inspection. Its independent numerical oracle evaluates the
two real cosines directly and computes the complex sum separately.

## Exact received source and runtime

| Source | Git blob |
| --- | --- |
| Standalone lab, 55,587 bytes | a528a4e2355d28a540032051dc90e935a232e1c3 |
| Course, 14,911 bytes | cc9c1b58baf8dee2642833838c9834c2dea0d315 |
| Existing learner demo, 97,565 bytes | cf7eea3792deacc3eb98a22aef539b920fb66746 |
| Worked guide | 47fc2f1ae3d6788671e576955331382d2d12db62 |

The lab SHA-256 is
b12c9458db30ee50a8e605a61418452ea0df9813be580652863745fe50444108.
All materialized source bytes were checked against their Git blob identities
before execution. The full source manifest includes SHA-256 values.

The native runtime was Node **26.3.0**, Puppeteer **25.12.0** and
Chrome **154.0.8037.98** on Darwin **25.6.0**, arm64. Both the lab and the
unchanged learner ran as local file URLs. The receiver observed zero JavaScript
page errors, console errors or external **page** requests. The last statement
describes the pages under test, not all operating-system or browser traffic.

## Controls and numerical results

The receiver compared all 129 downloaded samples with an independently written
direct-cosine oracle. It also compared the visible 129-row table with the
download and checked all 12 columns of the actual CSV.

| Experiment | Observed result | Independent comparison |
| --- | --- | --- |
| A=3, B=4, relative phase 90°, common phase 0° | Peak 5, phase 53.13010235415598°, mean square 12.5, RMS 3.5355339059327373 | Maximum sample error 4.89e-15 |
| A=1.25, B=2.75, relative phase −63°, common phase 22°, f=2.5 Hz | Peak 3.4994549126555956, phase −22.441896699683195° | Maximum sample error 9.55e-15 |
| In-phase 2+2 | Peak 4 | Direct cosine and full trace checked |
| Opposed 3−1 | Peak 2 | Direct cosine and full trace checked |
| Opposed 2−2, including common rotation 37.5° | Exactly zero for every sum sample; phase null/Undefined | Zero vector identity checked separately |
| Opposed 2−(2−1e-8) | Peak 9.99999993922529e-9, displayed 1.000e-8; phase remains defined | Separate subtraction identity; maximum sum error 1.12e-23 |

Actual cursor keyboard input moved by 1/64 of a cycle; step buttons moved by 1/16.
The zero/two-cycle bounds disabled the appropriate buttons, and the downloaded
cursor time matched the chosen frequency. Refreshing restored the initial
example.

Blank amplitude and six explicit numeric range failures hid the previous result,
cleared both plots and the table, and disabled experiment downloads and step
buttons. The course download remained usable. A preset recovered valid current
results after each invalid edit. The course downloaded from both valid and
invalid experiment states was byte-for-byte identical to the 14,911-byte original.

## Native course receiving

The receiver followed the lab's relative Open learner link to the **unchanged**
demo.html, selected the actual downloaded JSON through its file input, and
observed the native preview with 16 questions and 4 concepts. Preview did not
change the existing session; clicking Start this deck did.

All 16 imported questions were answered through their displayed buttons. Before
each answer, the receiver matched every button's text and canonical option
identity to the source course, so shuffled display letters were not treated as
answer keys. It deliberately missed one question and answered 15 correctly,
checked all 16 native review entries, then corrected the single missed item in
native practice. The first-try count remained 15/16.

A real 13,243-byte study-notes download contained all 16 original prompts and
explanations, the correct answer and the receiver's authored per-question and
application reflections. Its exact byte hash and every other completed download
are recorded in report.json. These are synthetic browser interactions, not
evidence of human learning outcomes.

## Retained receiver failure and correction

The first pass on earlier lab commit a8c57533da80dd31596758572c17ce6cdd15bae2
passed 22/24 cases. Instrumented native input showed that Puppeteer's synthetic
triple-click did not select the entire two-digit number 90: Backspace left 9.
Typing −63 then made an invalid edit, correctly retiring the lab's results.
The arbitrary-input and dependent cursor tests consequently failed.

A second receiver-only attempt using synthetic modifier+A without an explicit
editing command still failed to select that field; 20/24 cases passed. Both
attempts' actual stdout/stderr, failure details, source identities and the
recorded input probes are retained in receiver-entry-investigation.json.
The original complete reports remain in the isolated native receiving directory;
the committed investigation avoids duplicating all successful cases.

The installed Puppeteer keyboard implementation supports Chrome's native
selectAll editing command. The final receiver uses that command with the normal
modifier/key events, asserts that the field is empty, types the requested
number, and asserts the exact resulting value. A separate native probe entered
−63 successfully with badInput=false. No product logic was changed for this
receiver issue.

Separately, the root contributor inspected the first desktop/mobile screenshots
and enlarged mobile SVG labels. The final pass and screenshots here use the
new 55,587-byte lab with that CSS change. Course, numerical model, UI logic and
native learner bytes remained unchanged.

## Files and reproduction

- report.json: final runtime/source identities, 24 results, independent numerical
  differences, all completed download hashes and screenshot dimensions/hashes.
- final.stdout: actual final process output; final stderr was empty.
- command.json: exact executed arguments and exit status.
- source-manifest.json: native byte/Git/SHA-256 checks for the four received files.
- receiver-entry-investigation.json: retained failed receiving and diagnosed
  native-input behavior.
- screenshots/: original native desktop/mobile lab and learner preview/review
  PNG files. No generated illustrations or modified screenshots are used.

With the exact received repository files and an already installed compatible
Puppeteer/Chrome pair, choose a new output directory and run:

    node tools/verify-phasor-interference-browser.mjs \
      --source-root /absolute/path/to/received/repository \
      --out /absolute/path/to/new/receiving-output \
      --puppeteer /absolute/path/to/installed/puppeteer/module.js \
      --executable /absolute/path/to/installed/chrome \
      --source-commit 14e6a606c44047425abb0fc4980d7d12c676d40e \
      --expected-lab-sha256 b12c9458db30ee50a8e605a61418452ea0df9813be580652863745fe50444108

The receiver refuses an existing output directory. It keeps the fresh browser
profile and downloaded artifacts inside that new directory and closes the
browser when finished. It does not modify product files, use a personal browser
profile or access a signed-in browser session.

Contributor boundary: estate-f5611f6dc10a / thinkpad_runtime performed independent
native receiving and authored this receiver/evidence. The cohort root owns
product source, tree/branch serialization and final integration.
