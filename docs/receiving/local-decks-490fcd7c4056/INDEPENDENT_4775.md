# Independent RecallWeave current-main trace/import review

## Accepted composition

The importer receiving composition on main `4775af91ba6a5d4df787669f39b44364dd1e37ba` passed this independent review. It is pinned by the exact 38-file source manifest SHA256 `0ec4788730fb4290a5be30c833f70da5684708b331f22fd58fb95d59aa017595`.

Key source hashes:

| File | SHA256 |
| --- | --- |
| src/app.mjs | ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb |
| demo.html | 4d1aea8cb8d322ba775222d96c7c18f0393be47cf74098dcf116577cdadf4661 |
| tools/make_demo.py | 64432008082d70a3e7e72c87c2247d43f16916d74932f5bfe354e8e1d43a16c0 |

All 38 SHA256 values and Git blob IDs were independently checked while copying source into an isolated native tmpfs workspace. No production file was modified.

## Distinct native evidence

Eight groups passed: four narrow interaction cases on both the modular page served over own loopback HTTP and the actual standalone HTML opened from a file URL. The process exited 0 in 10.72 seconds on ThinkPad Chromium 154.0.8037.57, Node 22.22.1, and existing Playwright 1.62.1. A short private tmpfs directory held browser scratch. No installation, build, author suite rerun, provider, or user files were involved.

Two synthetic imported courses deliberately share the same display title, file name, and three question IDs. Their concepts, question text, answer arrays, option counts, correct indices, attribution, and license differ. Valid paused/completed trace inputs were created by answering the actual page and saving real browser downloads.

1. **Delayed read across replacement.** A's trace file read was held at the native File.text boundary. Starting B invalidated that read. B's later valid trace preview remained unchanged after A's read completed, and confirmation restored B's exact paused state.
2. **Two independent previews.** Staging B while A's trace preview was ready left A's current session and trace preview unchanged. Confirming the trace restored A while the B course preview remained staged. Subsequently starting B invalidated A's next completed-trace preview and began B with zero answers.
3. **Course identity and paused practice.** B rejected A's completed archive despite matching course title and question IDs. B's own paused trace restored correctly. Entering an unchanged paused practice state left its preview valid; recording the next practice answer invalidated that preview. Practice resumed only the remaining B question with B's current options/canonical indices, completed once, and preserved all original first answers and mastery numbers.
4. **Restart and completed restore.** Restarting A while a delayed A trace was being read invalidated that pending restore and reset the same imported course to zero answers. A later explicit completed restore preserved completed practice, showed no resume button, and restored the exact original archived state.

The harness saved **14 actual JSON trace downloads**. It compared the full restored archive state to the corresponding original, excluding only the newly generated save timestamp. Paused-practice completion preserved the original practice prefix and added only the correct remaining current-course response. Four delayed file reads were released and observed safely across the two surfaces.

No JavaScript errors or external requests occurred. Browser contexts, browser, and own HTTP server closed. The full 38-file source remained unchanged after the run.

## Adapter review and scope

The receiving adapter supplies the current deck, answers, mastery, and practice to the inherited trace UI. Progress refreshes run after reset/course selection, first answers, and practice answers. The inherited UI's generation and state stamp prevented the tested delayed reads and stale previews from changing a replacement session. Restore repopulates first answers and asked IDs, applies validated mastery, and renders the restored review/practice against the current course.

The raw bundled-source compatibility adapter was reviewed in source; historical bundled trace compatibility is covered by root's separate receiving work and was not repeated here. This packet also does not repeat the prior a64369f importer/notes/shuffle gate or the author's current unit/browser suites. It qualifies only the exact manifest above and these new cross-feature interactions. Root owns current-main drift, publication, and integration.

## Packet and reproduction

The packet includes all 38 source files, both synthetic course inputs, the unchanged independent harness, native receipt/log, and all 14 downloaded traces. Run `independent_trace_composition.cjs` with the native Chrome/Playwright paths shown in that script and a short private TMPDIR. The fixture code and comparison assertions are contained in the harness; product handlers remain unmodified.

The only test injection delays File.text for specially named synthetic trace inputs, then calls the original method when released. Other file reads and all production code run normally. A fixed Math.random value supplies reproducible display order; correctness is asserted using each current course's canonical options. There were no failed product or calibration runs for this gate.

See `evidence/receipt.json` for each case and download hash and `final-verification.json` for the final exact-source/artifact verification.
