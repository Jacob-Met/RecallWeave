# Native source receiving

The exact two-commit notes packet was applied with git am onto actual RecallWeave main 262bf32aa09bcc62fb5a29c3b97d26bcdc31b27d, after the review/practice owner merged PR #4. Source commit 4e9e35dd1bb89c48f5091720ca1e45a059ec5d20 contains only the notes delta; incoming evidence is 7c7c556677a5a99d8ee31e7031b1a30b8e3b1da5. The independent capture history was not published.

All seven authored source hashes, thirteen independent source Git blobs, eight browser-source hashes, six named saved downloads, seven independent evidence artifacts, four screenshot hashes and the original integrity receipt match. Existing base files outside the four declared modified paths remain unchanged. The original integrity check predates intentional removal of redundant raw GUID-named download copies; every retained staged file is checked and the omitted duplicates are explicitly listed in receiving-receipt.json.

Native Node 22.22.1 passed all 19 tests. The established Python demo builder reproduced the reviewed file byte for byte. No browser check was repeated; the unchanged captured Chromium 153 evidence retains its separate 15-check, six-download scope.

No product or incoming evidence bytes were changed by receiving. This directory adds receiving receipts and native test/build logs. No hosted deployment, contest submission, native goal or runtime adoption is claimed.
