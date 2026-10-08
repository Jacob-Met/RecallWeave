# Integrated shuffle and revised-content receiving

This is a separate receiving run on the revised deck composed onto RecallWeave main `a64369f84fae4cfd0b81aa3878cc11e2fa8d298c`, after PR 12 merged answer shuffling. The historical baseline and pre-shuffle candidate packet in the parent directory is preserved byte for byte.

The unchanged frozen receiver `../independent-content-browser.mjs` (SHA-256 `6ebec86131397331e7babf8349e9fb1c19201746f2b714022914097cfb2ada13`) ran under Node 22.22.1 and actual Chromium 153.0.8010.47 on 2026-10-08, 10:45:39.977–10:45:57.268 UTC. All eight check groups passed, with no JavaScript violations and no changes across the 121 source and evidence files snapshotted before and after the browser.

The report records nonidentity option permutations, canonical first answers and separate practice retries. Choosing the longest actual visible option scores 2/6; canonical correct choices still achieve 6/6. Physical keyboard input, practice pause/resume, three actual saved study-note files, a 390px layout, and the standalone file with HTTP(S) blocked are checked. The saved text witnesses preserve the exact downloaded bytes; their timestamps naturally differ from earlier runs. This verifies the specified workflows on the recorded Chromium build, not learning efficacy or every browser.

Run from a checkout with this content:

```sh
node docs/deck-content-evidence-20261008/independent-content-browser.mjs --root . --browser /path/to/chromium --output /tmp/recallweave-independent-integrated
```

`manifest.json` records exact byte sizes, SHA-256 digests and Git blob identities for this seven-file receiving packet. The raw JSON receipts retain original native paths as provenance. The browser receiver, application and scenario files are not rewritten by this packet.
