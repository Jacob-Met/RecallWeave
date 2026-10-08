# SQL course through the published learner picker

The unchanged twelve-question SQL course passed actual local-file import, preview, explicit start, complete first answers, review, practice, notes downloads, and fresh-document trace restoration on both learner surfaces. This packet closes the course-specific importer receiving gap recorded in [issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7#issuecomment-6060452393). The course and query explorer were already published in [PR #32](https://github.com/Jacob-Met/RecallWeave/pull/32); the companion now explains the received learner controls.

## Exact inputs

| Input | Published source | SHA-256 |
|---|---|---|
| Learner app | `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74` / `src/app.mjs` | `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb` |
| Standalone learner | Same commit / `demo.html` | `d0819e8630ff119be2c078408907ab53e3725999c8fdf71d35deb7f230d3bcd9` |
| SQL course | `01582d09017011dd7a128a1d6ba64c73a8f26f88` / `courses/sql-query-foundations.json` | `e5fbe1589409876871d1358e6287eb95d2cdd624a5d8da1e1a0a2871801f4512` |
| Receiving script | `receive_sql_picker_v1.mjs` inside the native archive | `244a84390351acd584d93caf71e2161a58fab62bcd37dacda5a6329b6d5908d3` |

The [source manifest](source-pins.json) records exact Git blobs, byte lengths, and hashes for all thirteen public learner assets and the SQL input. Four additional published owner/reference files are recorded separately; they are not executed by this receiver. All fourteen runtime inputs and the receiving script remained unchanged before and after execution. The tested learner came from the merged importer [PR #33](https://github.com/Jacob-Met/RecallWeave/pull/33), tree `2d6b3849fe9efe0d38f8c3cd62588fb9477d328d`.

The subsequent SQL merge is `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, with parents `d8a9ff81…` and `01582d09…`. Its tree retains the received learner and course bytes. This successor changes only the SQL companion instructions and adds this receiving packet; the earlier standalone/SQLite/source evidence stays intact.

## Native result

The [unaltered native receipt](native-receiving.json) reports **10 passing groups**, process exit **0**, and no page exceptions on Chromium **153.0.8010.47** / Node **22.22.1**, running in one exclusive ThinkPad QA directory. The modular learner ran at **1,280 px**. The standalone `file://` learner ran at **390 px**, after the temporary loopback server had closed.

Each surface passed five groups:

1. The actual file input accepted the exact SQL JSON. The preview showed its title, all twelve prompts, four concepts, attribution and license while preserving the current lesson; **Start this deck** explicitly started SQL.
2. All twelve questions appeared exactly once. Every displayed option matched its canonical value, actual display orders were shuffled, feedback retained the supplied explanations/transfers, and the completed review contained all first answers.
3. Two deliberately missed connections made practice observable. One retry was recorded, then practice was paused. Physical notes and trace downloads contained the exact course, all twelve first choices, and the separate retry.
4. A fresh browser document refused the SQL trace against the bundled course. Loading the same SQL course admitted a preview; **Restore these answers** explicitly restored the twelve first choices and paused practice.
5. **Resume practice** offered the remaining missed question. Fresh physical exports contained both retries while preserving every original first choice and the full-precision mastery values from the earlier trace.

Eight actual downloaded files and their original Chromium download identifiers are retained. Four unedited native PNGs show the preview and restored review at both widths. Their file hashes are in the native receipt; the images are under `receiving-v1/` in the archive. Page requests were limited to the owned loopback server and local standalone file. The qualified browser exited normally and its exclusive profile was removed.

## Evidence and reproduction

- [Native evidence archive](native-evidence.tar.gz): 28 payloads plus its original manifest, including the exact receiver/controller, raw output, source pins, all physical downloads, and four screenshots. SHA-256: `1ef0877c44e601b2e0ab0a23f24a5783c07ff9d163b445897e27326e453baedb`.
- Native payload manifest SHA-256: `cf96b97e6165996606eafb3ca9a2ef60dba1b158c06cf68654c3468dd75d380f`.
- Native receipt SHA-256: `7df93ad80079cd391964b0f710e62a91ee5098d27d1a4448d50f44a1489dd694`.
- [Original Mac runtime failure](mac-runtime-failure.tar.gz): six untouched payloads plus a manifest. SHA-256: `2c930c8f148f741d4e0f80d9d4484a281f6bfa7a425ef2ee61a9a01d484e8a93`.

The Mac run reached **zero product groups**: Chrome 154 timed out on the initial `Page.navigate` and reported display-link diagnostics. Bounded cleanup terminated only the receiver's own Chrome process and removed its profile. Its receipt and raw logs remain failed. The subsequent passing run used the same script and application bytes on the previously qualified ThinkPad Chromium runtime.

To reproduce, recover the exact public learner assets and SQL file listed in `source-pins.json` into an isolated `repo/`, then run the archived receiver with an already installed Node 22+ and Chromium. The output directory must be new:

```sh
node receive_sql_picker_v1.mjs --root /path/to/repo --manifest /path/to/source-pins.json --browser /path/to/chromium --output /path/to/new-receiving-directory
```

Require process exit 0, the exact terminal marker `SQL_PICKER_OK checks=10 failures=0`, a passed receipt, unchanged source hashes, and the retained physical downloads. The receiver uses Chromium's `DOM.setFileInputFiles` for the actual file inputs and native keyboard events for buttons. It does not operate or qualify cancellation of the OS file chooser. “Fresh document” means a new browser target with newly loaded application state inside the same exclusive QA browser process. This evidence covers the exact SQL course and learner versions above; the separate prepared-query/SQLite controls and generic importer qualification remain in their original packets.
