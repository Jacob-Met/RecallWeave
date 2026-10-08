# Independent trace and notebook review on main 4775

## Result: partial native evidence; browser transport blocked

Neither of the two browser attempts completed the first of the six planned
coupling checkpoints. Both stopped when the native CDP
`Input.dispatchKeyEvent` request was not acknowledged within ten seconds. No
product assertion failed, and no page JavaScript exception was reported. This
is **not a passing independent qualification** of preview, restore or reset.
The exact failed attempts remain available; their evidence is not relabeled as
a later source version or as a successful run.

The second attempt progressed farther. It completed a real modular first
session with zero of six first answers correct, recorded two of six practice
attempts, and downloaded one native learning-trace JSON file. The receiver
verified its canonical question IDs, first choices, full-precision mastery and
separate practice records. The first retry was correct and the second was
incorrect. The trace contained answers and practice only; it did not embed the
source tab's six explanations or Apply-it writing. The attempted standalone
receiver then encountered the keyboard transport timeout. No study-notes file
was downloaded in either attempt.

| Attempt | Complete coupling checkpoints | Actual trace downloads | Actual notes downloads | Outcome |
| --- | ---: | ---: | ---: | --- |
| Initial | 0 | 0 | 0 | CDP keyboard-event timeout after 10.90s |
| Unchanged replay | 0 | 1 | 0 | CDP keyboard-event timeout after 12.47s |

## Exact source and receiver

The reviewed composition uses RecallWeave main
`4775af91ba6a5d4df787669f39b44364dd1e37ba`. The13-file manifest,
`source-pins.json`, has SHA-256
`9372414b9bc6a971c85cf00c421fbbe97e2bcd8d5cce4e933b0bd0a5f8a21fc8`.
Both browser attempts verified all 13 file hashes and sizes before and after.
The current app is
`c5c1ef9ac80bdd040a4b18bdf48092a2ed42ea4495674f60efd076fc409eed4c`;
the generated demo is
`0011c8af51845f355e5ae8db867886a8c85c598edf4ede6af89b6b64d0ae36be`.

The independently authored receiver is
`verify_trace_notebook_receiving.mjs`, SHA-256
`72173358964f1d22baf0361fca18251be097de0077596f49c8a2603646af52d6`.
It stayed byte-identical between attempts. It retains the prior qualified
receiver's native keyboard, canonical-ID selection and exact downloaded-note
paragraph helpers without changing their bytes. It adds native file selection,
real trace downloads and the six new coupling scenarios. It never replaces
application globals, injects restored state directly, or substitutes the
production exporter. `receiver-provenance.json` records that relationship.

The source review independently checked that six owner modules—trace parsing,
trace UI, option ordering, knowledge model, review and deck—and the complete
native trace mount/restore callback are byte-identical to the materialized
main 4775 baseline. `owner-reconciliation.json` records the hashes. The callback
continues to restore first answers, mastery and practice and then render the
page using the current live notebook. The owner UI explicitly says existing
reflections remain in the tab. These are source observations, not a substitute
for the browser behaviors that failed to complete.

## Planned consumer boundaries

`control-plan.json` preserves the six assertions separately from observed
outcomes:

1. A modular source exports a real paused trace; a direct-open demo has its own
   different answers and notebook, with HTTP(S) requests blocked.
2. Preview and explicit cancellation preserve destination state and downloaded
   notes, apart from the save timestamp.
3. Editing one explanation, clearing another and changing Apply-it after
   preview but before confirmation retains the latest notebook when the first
   answers and practice are restored; actual text and JSON exports must agree.
4. A private negative trace with different course wording but the same item IDs
   must be refused without changing state or exported notes.
5. Restored practice must resume at the next unanswered canonical item while
   first answers and destination writing remain intact.
6. Actual fresh-session reset must clear the restored tab, while the other tab
   and the original downloaded trace remain unchanged.

No checkpoint in that list is marked passed by this packet.

## Receiving conditions and preserved files

The first browser's stderr reported less than 64 MB of temporary shared-memory
space, with 15 MB available. The second attempt began with 79,880,192 bytes of
tmpfs headroom and still encountered a transport timeout. Shared tmpfs and
cgroup memory were close to capacity in subsequent read-only observations.
`resource-observation.json` records a separate post-attempt snapshot. Memory
pressure is an observed receiving limitation; these observations do not prove
it caused either missing CDP acknowledgement.

The exact logs and execution metadata are `browser.log`,
`browser-execution.json`, `browser-replay.log` and
`browser-replay-execution.json`. Their original reports are in `receiving/` and
`receiving-replay/`. The latter contains the actual native downloaded trace,
including its browser-assigned download file. Disposable profiles were removed
by the runner, and no browser owned by these attempts remained running.

The reviewer made no product source edits, GitHub writes or deployments and
ran no broad native suite. No further 4775 browser replay is claimed. A later
source version may receive one bounded run with additional native-action
acknowledgement and last-page diagnostics; it must retain its own source pins
and observed result. Previous successful original and PR12 reflection review
packets remain unchanged.
