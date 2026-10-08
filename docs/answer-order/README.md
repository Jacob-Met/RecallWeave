# Answer presentation with canonical choice identities

Worker `estate-a3425ebf9874` · RecallWeave issue #5 · 2026-10-08

The six source questions all have answer index zero. The old renderer displays the source arrays unchanged, so selecting the first displayed answer always produces six correct first answers. This source observation motivated a presentation change; it does not measure learning outcomes.

`src/answer-order.mjs` returns a frozen Fisher–Yates permutation of original option indices. The app creates one permutation per question when a local session starts and reuses that question's order for practice. Visible A–D labels follow the display positions. Data attributes, recorded first choices, correctness checks, feedback, review and exported notes keep using canonical option indices.

Question wording, distractors, answer keys, explanations, transfer prompts, adaptive item selection and model updates are unchanged. A fresh session may happen to repeat an order; every permutation remains possible. The standard `Math.random` source serves presentation variation, not a security property.

## Qualification

- Full native Node suite: **23 passed**, including four new answer-order tests.
- Independent source review: **5 passed**. A separate exhaustive control covers all 24 four-option permutations and 96 answer-key mappings through first answers and corrected practice.
- Actual Chromium 153 browser acceptance: **15 passed**, with six saved note files. Every displayed group retains each canonical index once and shows text and A–D labels in the right positions. Keyboard selection reaches the intended canonical choice, practice retains the original display order, and review/notes preserve actual answer text and model state.
- The evaluator uses seeds 41 and 83 only as deterministic test inputs. The final report records the complete per-item maps and confirms their presentations differ. Production does not fix those seeds.
- Independent negative control: the unchanged accepted notes parent passes 12 earlier checkpoints and five downloads, then fails precisely because the deck presentation remains unchanged across those inputs. There are no page errors, and the parent source is unchanged after the check.

The existing browser runners now navigate to a canonical choice through its actual displayed position. Run:

```bash
node --test tests/*.test.mjs
python3 tools/make_demo.py
node tools/check_notes_browser.mjs --browser /path/to/chromium --output /tmp/recallweave-answer-order-check
```

The final runner preserves a first-question capture, layout captures, downloaded text and a machine-readable report. The first-question view was inspected: options, labels and focus remain legible. The recorded 390px flow has no horizontal overflow. The file-based demo works without hosted requests.

## Evidence and exact source

Source commit: `a7cdc0d463fb3dc154172c4d0ddfad0a70217299`, based on local notes packet `eb8e6b64c0935f0c0fc821235e65e759e7759545`. Receiving must apply only this delta onto real notes main `3e3217959bdf277ae5ef61a7afe68142e2626486` after baseline verification. The earlier owner, notes and native-receiving evidence must remain intact.

`verification.json` pins the eight changed source/artifact files and the positive browser artifacts. `independent-review/` keeps the immutable semantic review plus the final evaluator addendum. `negative-control/` preserves the old-production/new-evaluator report and exact command/source pins. Six named browser downloads are retained; duplicate raw GUID-named copies were omitted.

The first evaluator expected one chosen question to change order between two seeds. That question legitimately received the same order while five others changed. Its failed report is retained under `harness-failures/`; the final check compares the whole question map. Product source did not change to satisfy that correction. The redundant full-page failure capture was removed with its hash and disposition recorded.

## Integration continuation

Receive the two-commit source/evidence patch onto the matching real notes main, preserve original authorship and local/native/public commit mapping, verify source and evidence bytes, obtain normal CI and independent disposition, and complete the focused PR for #5. This source change is separate from hosting or contest submission.
