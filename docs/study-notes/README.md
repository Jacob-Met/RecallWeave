# Offline study-note downloads

Worker: `estate-a3425ebf9874` · 2026-10-08

The completed RecallWeave lesson now offers **Download study notes (.txt)**. The UTF-8 file keeps the actual first answers in session order, the correct answers, explanations, transfer prompts, model estimates and deck attribution. Practice answers have their own labels and counts. A paused round records the unanswered retries without inventing answers. Downloading requests a browser file save and leaves the lesson available.

## Source and receiving

The source change is local commit `013cee1a06123ade07aa5be0299efd753ec06603`, based on the review owner's qualified local capture `fca805724b55a9a01f073966cf26507fe2c3d6a0`. The source receiver independently confirmed the seven shared baseline Git blobs match the owner's merged PR #4 at real main `262bf32aa09bcc62fb5a29c3b97d26bcdc31b27d`.

Only the notes delta is intended for the real repository. The owner's review/practice implementation and their additional independent review evidence remain intact. The local capture history must not replace the real repository history.

## Run and verify

Open `demo.html` directly, finish the six questions, and activate the download button. The same action is present in the modular app after serving the repository locally.

```bash
node --test tests/*.test.mjs
python3 tools/make_demo.py
node tools/check_notes_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-notes-check
```

The browser runner requires Node 22+ and an existing Chrome/Chromium executable. It uses a fresh temporary browser profile and localhost fixture server, reads actual files saved by Chromium, and retains named text captures, images and a JSON report. The default unit suite has no browser dependency.

## Qualification

- Native unit suite: **19 passed**, including five notes tests.
- Independent source review: **6 passed**, including a separately written per-question association control with different answer-key positions and retry outcomes.
- Actual browser acceptance: **15 passed** on Chromium 153. Six downloads cover the modular first session, paused practice, completed practice, retry after a simulated preparation failure, a 390px all-correct session, and the standalone file with completed practice.
- Downloaded byte counts and SHA-256 hashes were checked. Saving makes no network request and preserves the first-session answers and model estimates.
- Desktop and 390px captures were visually inspected. Controls and status text are legible, and the page has no horizontal overflow.
- After the shared scratch filesystem filled, a separate integrity review confirmed all reviewed product files, all six saved texts, all four complete PNGs and the staged file copy. No corrupted source was found.

`verification.json` pins source and links the evidence. `independent-review/` preserves the independent test, sample input and complete generated notes. `browser/` retains six named saved-file captures; duplicate raw GUID-named download copies were omitted from the packet. `integrity-receipt.json` describes the exact files inspected before that duplicate removal.

## Retained limitations and failure evidence

The first browser launch targeted an empty `/tmp/chromium` placeholder and exited before the application ran. Its zero-checkpoint failure is retained under `harness-failures/`. Switching to the existing real executable produced the passing browser report without changing product source.

This feature writes a readable study record. It does not restore or resume a session after refresh. The file is requested locally through the browser's normal download mechanism; the UI does not claim to know that a person accepted a save dialog. No physical phone, assistive-technology session, deployment, contest submission or learning-efficacy result is claimed.

## Next integration action

Apply the qualified source and evidence commits onto the matching real main, verify the receiving bytes against `verification.json`, run the established CI, and complete normal independent source integration. Preserve the external coordination record and exact resulting commit. Do not publish the artificial materialization parent history.
