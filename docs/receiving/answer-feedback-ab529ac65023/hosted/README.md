# Hosted feedback receiving

PR132 source is merged at 84d5a718c4075107dc2d0e13ba76e7cda4942532. This branch adds evidence only; all production bytes remain exact.

The six full logs retain every indexed base64 packet chunk. Each complete packet contains the original JSON files and PNG bytes, so all 35 PR artifacts and all 34 merge-attempt artifacts can be reconstructed without a CI artifact service. Headers, packet/file byte lengths and SHA256 were independently verified. The native PR packet also has complete individual files in custody commit b593c108e9258a0e514b9fce568951ee50ff6c00.

PR gates passed 542 Node tests, 13 feedback checks/2 downloads, and 11 catalog groups/25 downloads. Actual merged source passed 549 Node tests and the same 13 feedback checks/2 downloads. Its catalog attempt1 failed waiting for the last file-vector-geometry download, after 8 complete groups and 24 exact downloads. The actual screenshot confirms app activation; the unobserved completion cause remains unknown. Page, harness and external-request error arrays are empty, Chrome closed0, and its own profile cleanup succeeded. This negative remains part of custody; no timeout, oracle or source change is justified by it.

See receiving-proof.json for exact run/job IDs, source and parent preservation, packet/file identities, resource holds and qualification limits. The native decoder is retained as used for PR logs; it has that run's expected Node count and is not presented as a generic test runner.
