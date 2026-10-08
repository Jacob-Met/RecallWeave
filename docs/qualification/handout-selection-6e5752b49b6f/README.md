# Exact-question handouts — author qualification

A teacher can now choose a nonempty subset of questions from a checked course deck and save or print a shorter worksheet with its matching, separate answer key. Original question numbers and source order are retained; unselected concepts/questions are excluded. The selector starts with all questions and explicitly says prerequisites are not added. Clearing the selection disables save/print and removes the old paper until a question is selected.

Source commit **35ba3fe7a611395016fc5c808604ea1a815dc81b**, tree **8c509b174be3e799d2265558c9e0b3720b0b63ad**, parent **698902f9c9c1d5c5023092b85b3632a7cb7a01ed**. Seven scoped paths change. All 2,909 other inherited leaves and modes are identical. The validator, learner, author, catalog, focus tool, workflows and builder remain unchanged.

The optional third argument to `createHandout` and `createHandoutDocument` accepts exact question IDs. Omitted selection retains the original full output byte-for-byte. Explicit selection must be a nonempty dense array of unique existing string IDs; malformed and inherited/sparse entries refuse. The whole input deck is validated before projection. Requested order cannot reorder or renumber source questions, and worksheet data omits actual answer indices/explanations.

Native author gate: **21/21 pass**, comprising eight new selection tests, twelve inherited handout tests and one inherited standalone parity test. Three syntax checks and the existing builder passed. This is not a full repository or hosted-CI claim. The earlier test-regex syntax failure is retained in the native packet; only that test expression changed before the passing run.

Actual author browser gate: **10/10 groups**, Chrome154.0.8037.98 and Node24.21.0 on the qualified LA7 Windows route. Modular 1280×960 and offline standalone390×844 each exercised real keyboard controls and file choosers, cancellation/invalid-file retention, stale reads/previews, exact full-copy parity, selected-only downloads, print actions and offline reopening. Eight actual HTML files, four PDFs and four PNGs are preserved. The source, receiver and runtime hashes were unchanged, there were no page errors/external requests, and the browser/profile/server closed. The existing SYSTEM connector identity was not changed. The original PowerShell script-policy refusal was honored and preserved; a direct native Node controller executed the JavaScript receiver.

Independent root UI, native_runtime domain and github_integration source reviews are separate receiving authorities. Their receipts can be added unchanged after handoff; this author packet does not claim their results.

| Packet | Bytes | Members | SHA-256 |
| --- | ---: | ---: | --- |
| [Native author archive](native-author.tar.gz) | 107540 | 54 | `6ce8f2023b2b179a58c8f9852e5d329f9429e75629cefaba90a2caae8cd9b16f` |
| [Actual browser archive](browser-author.tar.gz) | 461404 | 50 | `e546e105b13a964523fdeed4cad9cc407d2acbf99fad2ca14bd86de3061a8ca6` |

Each archive was read back member-by-member on its originating machine and its Git create-blob result equals its native Git content hash. Readable manifests accompany both. Their README files explain exact reproduction, prior failures and print/environment limits.

Public frozen contract: Git blob85ee68d5d92f44272a4e68c0eef1cc40f76c6550 and [issue170](https://github.com/Jacob-Met/RecallWeave/issues/170). Cooperative completed handout-owner handoff is [issue35 comment6069368496](https://github.com/Jacob-Met/RecallWeave/issues/35#issuecomment-6069368496). Twenty-one unreadable advisory records remain unknown scopes; no abandonment was inferred.

**Custody only.** Actions remain held. The complete five-workflow event review permits this non-main contribution ref; source35ba had zero workflow runs. No PR, main update, Actions dispatch/retry or owner adoption is claimed. Current-main adoption must preserve other owners and admit any changed consumer boundary separately.
