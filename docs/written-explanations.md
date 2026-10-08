# Save and reopen your written explanations

Use **Save or reopen your written explanations** in either `demo.html` or the modular learner. This explicit local file keeps your editable question explanations and application response for the exact course you have open.

1. Write in the completed learning trace. Open **Save or reopen your written explanations**, then choose **Save explanations (.json)**. Check your browser's downloads for the saved file.
2. On a later visit, open the same course. For a local course, first choose its original deck file under **Bring your own lesson**, preview it, and select **Start this deck**.
3. Choose your saved explanations file. Expand the question panels to inspect the literal writing and read the application response.
4. Select **Replace my writing** to replace every writing field, including empty fields. **Cancel** leaves the current writing in place.

The writing appears in the completed learning trace. You may reopen it before completing the course; it becomes visible in those fields when the trace is available. If you also kept a completed learning trace, restore its answers through **Keep or restore a learning trace**. The two files work independently: replacing writing keeps your existing answers, practice progress and model estimates.

Your writing stays in the tab until you explicitly download it. Restarting, changing course or reloading clears unsaved writing. Download again after later edits. There is no automatic save, account, upload or browser storage.

## Choose the appropriate file

| Download | Keeps | Reopens in the learner |
| --- | --- | --- |
| Written explanations JSON | Exact course content, every question's literal writing, and the application response | Editable writing, after preview and explicit replacement |
| Completed learning trace JSON | First answers, model estimates and practice progress | Answers and practice through its separate restore control |
| Study notes text | Readable questions, answers, explanations, model estimates, practice and your current writing | Readable copy only |
| Unfinished lesson JSON | The current first-session question or feedback, answers, model estimates and answer display order | An unfinished first session through its separate resume control |

A written-explanations file may intentionally contain only empty writing. Preview and confirmation still apply; confirming it clears every writing field. The file has a 2 MiB UTF-8 limit and contains course content as well as your writing. Keep the downloaded file wherever you want those contents to remain.

Changed course wording, answer options or attribution require the matching course version before writing can be reopened. An invalid file is refused as a whole. Invalid UTF-8 bytes are refused before preview; ordinary Unicode, a valid U+FFFD character and an optional UTF-8 byte-order mark are accepted. Editing current writing or changing the lesson while a read or preview is pending retires that preview; select the file again. Text is displayed literally, including line breaks and markup characters. Neither the file's save time nor its contents establish identity, effort or learning.

## Source and qualification

The codec is `src/reflection-file.mjs`; its preview and explicit-replacement controls are in `src/reflection-file-ui.mjs`. Existing immutable reflection functions validate the writing. The app supplies the exact selected course, current writing and lesson revision. Existing answer archive formats, reflection representation, course content, BKT update and selector are unchanged.

Run the focused native controls:

```sh
node --test tests/reflection-file.test.mjs tests/reflections.test.mjs tests/session-export.test.mjs tests/trace-archive.test.mjs tests/lesson-archive.test.mjs
python3 tools/make_demo.py
node tools/check_reflection_file_browser.mjs --browser /path/to/chromium --output /path/to/receiving
```

The browser command uses a separate temporary profile and an ephemeral local server. It operates the modular page and actual standalone file, downloads real writing and text-note files, checks replacement/cancellation, stale reads, course identity, reset, empty writing, keyboard operation literal valid Unicode, malformed UTF-8 refusal, a UTF-8 byte-order mark and a 320px preview. Its standalone pass blocks HTTP(S) requests. It records browser errors, source hashes before and after, downloaded bytes and screenshots in the chosen directory. It requires a locally installed Chromium-family browser; no npm dependency is added.

Initial qualification used RecallWeave base `567425f209cdf8e8cf9767faac9bfd3003af3e65`: 42 focused Node 24.21.0 checks on Windows and 18 browser checkpoints with native Linux Chromium 153 passed. The unchanged baseline separately demonstrated that the existing text export keeps writing while a restored learning trace has no editable-writing payload. These are functional compatibility results, not learning-efficacy evidence. Final current-main composition, independent receiving and hosted CI must qualify the integration actually published.

Independent receiving identified that permissive file decoding could silently replace malformed UTF-8 in writing. The revision reads bytes and decodes UTF-8 strictly after the existing stale-read checks. Both actual browser modes then passed 22 checkpoints in total, including malformed-byte refusal, valid U+FFFD and a UTF-8 byte-order mark, exact writing roundtrip and retired arrayBuffer completion. The codec and all focused Node-test inputs remained byte-identical, so the original 42-test result was retained. The first revision browser attempt completed zero checks because startup exceeded 16 seconds under measured host load; a separate recorded attempt allowed 60 seconds for startup and passed without changing assertions.
