# Resource and preparation outcomes

These outcomes are separate from the five passing content groups and six passing independent state groups. The generated course remains SHA-256 c45d46851b432d3a9fb0fd89d661d3ee5d61bc4acfbdd1a8f8c82343ccf4f913.

## Browser admission — not a run

At 2026-10-08T15:47:59.145Z the prepared actual-browser receiver observed 934,457,344 free bytes. Its unchanged admission minimum was 1,073,741,824 bytes (1 GiB). It wrote the original admission-refused.json receipt and exited before creating a Chrome profile or launching Chrome.

The driver log reports:

    Error: Chrome not launched: below fixed 1 GiB free-space floor.

No browser checkpoint, screenshot, layout assertion, DOM interaction or browser download was executed. Native modules and saved-file handoffs are separately qualified by the independent receiver.

## Small peer-adoption write

The first attempt to write adopt-peer.mjs returned this tool error:

    Error: ENOSPC: no space left on device, open '/Users/me/recall-traceable-measurements-9d2f71701d2e/adopt-peer.mjs'

An orchestration mistake then invoked a dependent command despite that failed write. Node reported MODULE_NOT_FOUND, Git add found no script, and the attempted commit added nothing. HEAD remained e00a98e5c19302e893600f6d45aac08b6a69a08d. No peer file was copied.

Before resumption, the exact path was inspected and returned ENOENT. A fresh capacity read reported 781,128 KiB available; this exceeded the small source-action floor. The same script bytes were then written successfully. The script independently checked at least 64 MiB free, verified every selected source hash/size, copied five peer files (172,222 bytes), verified destination bytes and the Git bundle, and confirmed unchanged product bytes.

The first evidence commit inherited the existing *.bundle ignore rule, so the exact ignored bundle was explicitly added in a separate one-file commit. Final adoption is 1f1a344c9bd11ac5f2c9a3e5be5f9abd7485144e, tree ed46549197231d2766540988067e9f9cf1280d76; it contains all five files. The independent receiver subsequently verified original Git, original working bytes, adopted working bytes and adopted Git objects, as recorded in independent/ADOPTION_READBACK.json.

Free-space reads are point-in-time observations, not continuous reservations. An ENOSPC report and later nonzero availability are preserved as observed; neither is rewritten as a successful browser run.

## Authoring preparation

Two earlier code-orchestration expressions failed before filesystem work: an unavailable structuredClone helper, and a malformed nested template literal while preparing test bytes. They were corrected before materialization. The five maintained content tests passed on their first actual native execution; no failed course assertion was discarded.

## Later bounded browser attempt and guide label

After the initial 32-file packet was sealed, a fresh resource check admitted one actual Chrome attempt at 2026-10-08T16:13:51.234Z with 1,942,917,120 free bytes. Native Chrome 154.0.8037.98 launched, but the first Page.navigate command hit the receiver's 10-second CDP timeout. The report records **zero interaction checkpoints**, no screenshots and no downloads. No course defect or UI pass is inferred, and no browser retry was made.

The original report, driver log and profile inventory are preserved under author/browser-v2/. They are distinct from the earlier prelaunch capacity refusal. A later cleanup read found the main child absent and no process referencing the unique receiver profile. All 27 frozen source/course/report inputs still matched their pre-run hashes. Only the ended receiver's generated profile was removed; source and evidence were retained. CLEANUP.json records this readback. Display-link messages in the browser log are diagnostics, not a demonstrated cause of the timeout.

The root's exact current-source review also corrected one guide label: **Save study notes** became **Download study notes (.txt)**, matching the existing #save-notes-button. This is the sole change to the five deliverable paths after the content freeze. The course JSON, authoring source, builder and maintained tests remain byte-identical to e00a98e5; no runtime rerun is attributed to the wording correction.
