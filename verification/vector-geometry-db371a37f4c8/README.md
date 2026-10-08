# Vector geometry receiving

Ownership: [RecallWeave #17](https://github.com/Jacob-Met/RecallWeave/issues/17),
`estate-db371a37f4c8 / production`.

## Frozen product source

- Course: `courses/vector-geometry.json`, SHA256
  `66b8c5f0a047417605b4f6d399478bb8324fb5852aadb01d796d7ef94f5c3513`.
- Explorer: `courses/vector-geometry-explorer.html`, SHA256
  `f10b3481b9c7d59c1e3bc2837017a1050978d6222a322acf051a1e7c495796e1`.
- The course is original twelve-item material across six concepts. This packet
  establishes content arithmetic and actual product behavior, not learning
  effectiveness.

## Completed native receiving

`native-node.log` records all 21 tests passing on the authorized ThinkPad,
Node v22.22.1. Thirteen course tests check the conditions making each marked
option correct. Eight explorer tests exercise the actual embedded calculation,
including 2,000 geometries checked by independent characterizations: line
membership, orthogonality, reconstruction and Euclidean decomposition. The
course embedding is exact and its narrow build step is idempotent.

`admission.json` records admission and identical serialize/parse round trip
through the existing #7 owner's actual validator SHA256
`621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`.
This check used read-only owner source, not a reimplemented schema.

`explorer-browser-receipt.json` records eight groups on real Chromium
153.0.8010.47 snap. The receiver first served the actual HTML over an isolated
loopback HTTP origin, then closed that server and opened a fresh `file://` page.
Native pointer/keyboard edits, relationship presets, invalid clearing/recovery,
exact SVG arrow coordinates, 390px controls, and two completed course downloads
passed. Both downloads are 12,709 bytes with the same course hash. The intentional
Blob-allocation refusal preserved the geometry; native keyboard retry completed
the second download. Page requests were only the local HTML, local favicon and
direct file. No uncaught page exceptions occurred.

`desktop.png` and `mobile.png` show the actual course and longer-direction cases
at 1280px and 390px. Production and root independently viewed them. Root accepted
the visual receiving at the frozen explorer hash, separately from mathematical
review and importer-dependent lesson receiving.

Run the focused tests from the repository root:

```sh
node --test tests/vector-geometry.test.mjs tests/vector-geometry-explorer.test.mjs
```

The optional browser receiver requires Node 22+ and a real installed Chromium.
Set the following paths to exclusively owned temporary directories:

```sh
RECALLWEAVE_CHROMIUM=/path/to/chromium \
RECALLWEAVE_PROFILE_ROOT=/owned/temp/profiles \
RECALLWEAVE_EVIDENCE_DIR=/owned/temp/evidence \
node verification/vector-geometry-db371a37f4c8/explorer-browser.mjs .
```

The receiver removes only its fresh browser profile after shutdown. Downloads
and screenshots stay in the chosen evidence directory. No browser security
settings or live HAMON services are changed.

## Independent subject review

The independent reviewer accepted all twelve unique keyed answers, distractors,
explanations, transfer results and mathematical conventions at the frozen course
and explorer hashes above. The method was analytical review of the complete
source transcript, including the authored keys and feedback. The explorer's
projection formula contract was also accepted. No content correction was required.
The [analytical review](root-receiving/subject-review.md) and actual native
execution receipts are identified separately in this packet.

One useful output-range example is `b=(6,6)`, `a=(2,1)`, which gives
`p=(7.2,3.6)` and `r=(-1.2,2.4)`. The plot therefore needs room beyond the input
coordinate limit of six. The existing 2,000-case core corpus includes its
equivalent direction `a=(4,2)` and checks the nine-unit plot bound; the separate
direction-rescaling test establishes the same-line relationship. Root also
executed the exact shipped core and checked its shared SVG mapping: the projected
point maps to `(500,200)`, inside the plot rectangle. The
[range witness](root-receiving/projection-range-witness.json) records that bounded
calculation and source inspection; it does not claim another browser run.

## Actual offered-importer receiving

Root independently received this exact course through the #7 owner's offered
current-main composition over `4775af91ba6a5d4df787669f39b44364dd1e37ba`.
The receiving app is SHA256
`ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb`;
its generated standalone file is SHA256
`4d1aea8cb8d322ba775222d96c7c18f0393be47cf74098dcf116577cdadf4661`.
The source snapshot pins all seventeen inputs.

Eight actual browser groups passed on native ThinkPad Node 22 / Chromium 153.
The first course file came from the explorer's real download, then entered the
learner through the actual file input, preview and explicit start. Both modular
HTTP and a fresh standalone file after server shutdown displayed all twelve
questions, preserved the deliberately mixed 8/12 first trace, and practiced all
four missed questions with a 2/4 retry result. Preview attribution, exact feedback,
review, and unchanged model estimates/first answers passed. Six actual study-note
downloads match the full course trace in unstarted, paused and completed practice
states. Root also inspected the three preview/review screenshots and accepted
their desktop and narrow-screen layouts.

The original driver `c27ae3734e91bb4853f416fc9a3740c166e80431329b92d3a47340f02258ab9f`
downloaded the correct course before a stale CDP node identifier stopped file
admission. That failed receiver and receipt remain preserved. The corrected
`course-browser.mjs`, SHA256
`0293269b54472b84b2c1232c97ee314dd60b09c105a0e94a135f312df959c137`,
uses the real file input's remote object handle, waits for mounted trace controls,
and identifies the CDP method in errors. No product source changed to repair the
receiver.

The course browser receiver takes the exact offered learner source as its final
argument, while the course/explorer come from this repository's own paths:

```sh
RECALLWEAVE_CHROMIUM=/path/to/chromium \
RECALLWEAVE_PROFILE_ROOT=/owned/temp/profiles \
RECALLWEAVE_EVIDENCE_DIR=/owned/temp/evidence \
node verification/vector-geometry-db371a37f4c8/course-browser.mjs /owned/learner-source
```

## Final published importer receiving

Importer PR #33 merged as `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74`.
Root then ran the unchanged corrected course receiver against actual published
main `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, tree
`fec13a2ab7d1a5da29689664281a4af182d137a8`. The app retained its exact hash;
the final standalone demo changed to SHA256
`d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9`.
All twenty entry, module, default-deck and builder files were individually
matched to their published Git blobs before execution.

The [final browser receipt](root-receiving/final-browser-receipt.json) records
all eight groups passing under Node 22.22.1 and Chromium 153.0.8010.47, with
exit zero from 13:28:03.439 to 13:28:12.972 UTC on 2026-10-08. It received the
explorer's actual download through preview and explicit start, all twelve
questions and exact feedback/review, four-question paused/resumed practice,
and six actual study-note downloads in modular HTTP and a fresh file page after
HTTP shutdown. The 8/12 first-answer and 2/4 practice fixture, model estimates,
source and course bytes remained unchanged. Root independently viewed the final
phone preview and desktop review screenshots and accepted their layouts.

All twenty [received source files](root-receiving/final-source-snapshot.json)
retain the same Git blobs and modes in the exact publication parent recorded in
`publication-dependencies.json`. That comparison records the full receiving
boundary and the earlier five qualified module inputs, retaining later
unrelated contributions. No identical native test was repeated for main
movement that preserved every received input.

The [root receiving record](root-receiving/README.md) distinguishes the offered
snapshot, original CDP failure, corrected receiver and final published-source
run. The complete [native evidence archive](root-importer-receiving.tar.gz)
contains 93 payload files plus its manifest, including both exact importer
snapshots, all actual downloads, screenshots, original/corrected runners and
receipts. Archive size is 1,545,526 bytes; SHA256 is
`1b5c5387fc92b700e3ccd747635bfdb4993de433f729b0245deaf79129c3b793`.
Every one of its 94 file entries was read back natively and verified again after
transfer. The [manifest](root-receiving/custody-manifest.json) and
[transport receipt](root-receiving/transport-receipt.json) retain the exact
contents and the disposable local extraction's capacity failure. Verification
then used memory, without changing product source or the archive.

This contribution adds the original course, explorer and scoped receiving
evidence. The importer, learner, default deck and shared builders remain owned
by their existing contributors and inherited unchanged.

The loopback and file browser claims apply to the authorized ThinkPad. No new Mac
browser qualification is claimed. Earlier Mac navigation failures and ThinkPad
temporary-directory limits from the separate ShadeWindow contribution remain
with that contribution's receipts; they were not retested here.
