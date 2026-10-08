# Independent content receiving — 2026-10-08

This packet preserves the exact receiver and native evidence for RecallWeave #9.
[Independent acceptance](https://github.com/Jacob-Met/RecallWeave/issues/9#issuecomment-6057637334).

The frozen receiver selects the longest **visible** answer through actual keyboard
input, then checks canonical scoring, first-answer review, practice pause/resume,
separate retry answers, real downloaded notes, a 390px layout, and standalone use
with HTTP(S) blocked. It retains the existing browser-launch/CDP plumbing; the
receiving scenarios were independently authored. It uses a controlled random
stream so later answer-order composition can be compared reproducibly.

On original notes-integrated main `3e3217959bdf277ae5ef61a7afe68142e2626486`,
seven behavior controls pass and the receiver exits 1 because the longest-option
strategy scores 6/6. The reviewed content candidate passes all eight checkpoints
with exit 0 and that strategy scores 2/6. Correct canonical choices remain able
to score 6/6. This is a mechanical cue check, not a learning-efficacy result.

## Replay

Run from a checked-out repository with Node 22+ and an installed Chromium:

```sh
node docs/deck-content-evidence-20261008/independent-content-browser.mjs \
  --root . --browser /path/to/chromium --output /tmp/recallweave-content-check
```

Use a new output directory. The receiver creates its own temporary browser profile
and loopback server, closes them, and removes the profile. It does not reuse an
existing browser session. The original source pin is expected to fail the cue check.

## Preserved evidence

- `independent-content-baseline/` and `independent-content-candidate/`: raw
  browser reports and the three actual UTF-8 study-note downloads from each run.
- The two adjacent `.log` files retain process output, including the original
  expected failure.
- `content-candidate-integrity.json`: native run timestamps, process status,
  receiver identity, and before/after hashes for all 69 candidate source files.
  No source hash changed during the run. Its native absolute paths and the raw
  reports' paths are historical custody data and are intentionally unchanged.
- `manifest.json`: byte sizes, SHA-256 and Git blob identities for all packet
  files other than the manifest itself, plus their native source locations.

The candidate source review covers deck SHA-256
`28204e412703fb3f143ebcaf0770e0eb6116a2c8c09c9a68a1b0ef873f95cc16`,
application SHA-256
`e66ee04e49407b99c199465428874e3914dfa44a799f0f2e8742113b4b3b0eb9`,
and generated demo SHA-256
`2256b76ac0add0268674b059676523b51630c77fd7431d23cc58357989c465e9`.
The integrity receipt predates final editorial changes to the author's review
document and addition of this packet; it does not claim those later evidence
files existed during the browser run.

Native environment: Node 22.22.1; Chromium 153.0.8010.47, Linux x86_64.
Source integration and ordinary CI disposition belong to the source PR.
