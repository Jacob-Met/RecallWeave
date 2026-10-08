# Focus CLI source and initial receiving

This detached source packet follows RecallWeave issue #164 and central HAMON #140 comment6068970450. It is an immutable source/evidence tree, not a branch, PR, source integration, installed command, browser qualification or Actions run.

The CLI delegates the existing source-bound focus/deck model unchanged. Production SHA-256: 427c7242dcf93a91a72f56793dd36aac686c3ae06fd61726020a67f21689b67e; Git blob 0598839e2e1e4ca8f553f98b0c8f9facbbf398d9. Both dependency hashes in the receipt exactly match main 4438eb6e.

At 2026-10-08T21:04:15Z the maintained test source executed through native Node 24.19.0 on Linux x64. All 8 named process-test groups passed, zero failed/skipped, outer process exit 0. The receipt retains raw stdout/stderr, timestamps and every source byte count/SHA-256/Git blob. The complete receiver embeds the exact four module bodies used.

Because cloud storage was full, a synchronous in-memory ESM loader supplied those exact path-based modules. The test and child CLI used real Node processes, ordinary argv and actual stdin/stdout/stderr. No production/test import text was rewritten. This establishes the recorded process/module behavior; it does not establish an on-disk checkout, stock filesystem module resolution, browser behavior or hosted gate.

The independent receiver froze its own fixture/process cases before seeing the CLI. Its later v2 additionally covers the unchanged model's compact serialization near the byte limit, without assuming a trailing newline. That receiving remains pending at this initial packet and will be retained separately. Root source review and any required unrun repository gates likewise remain explicit.

No source, ref, PR, workflow or merge operation that starts Actions is authorized. This packet was created through the immutable Git-tree route only. The original parent libraries and incoming owner paths are not edited.
