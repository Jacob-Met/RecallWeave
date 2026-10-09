# Offline timing lesson

[Download the complete study folder](RecallWeave-critical-path-timing-offline.zip), extract the entire ZIP, then open **RecallWeave/START-HERE.html**. It contains the accepted sixteen-question course, its worked guide, matching standalone learner and timing companion. Three unchanged graph assets keep the companion's local links usable.

1. Choose **Open the learner**. The original bundled lesson appears first.
2. Under **Bring your own lesson**, choose the included `courses/critical-path-timing.json`.
3. Inspect **Parallel plans: critical paths, slack and what a delay changes — 16 questions, 4 concepts**, with its attribution and permission.
4. Select **Start this deck** explicitly. Previewing preserves the current lesson; starting replaces it and its practice progress.
5. Answer, review and practice. Use **Download study notes (.txt)** to retain a study record.

The timing companion is a separate tool. Its timing-trace JSON is a calculation record, not an importable course deck. The worked guide remains its original Markdown file; a text editor can open it if the browser downloads it. Local tools need JavaScript but no server, account or installation. Optional external references require internet access.

## Exact package

- ZIP: **81,685 bytes**
- Git blob: `07ec7f8068686fe2b68c8f30120009cce170bab2`
- SHA256: `d5136f2b49d56459b5a1420e9032fd4a2606a8f6e899022d2cd237633be80e0f`
- Source: [accepted issue 171 custody commit](https://github.com/Jacob-Met/RecallWeave/commit/be8e9fd6a279a72fc3843da44c52ac109dcd8cd2), tree `1328c908fbefd52b62ea05ae3c1bcb7e80e9c7b2`.

| Unchanged product path | Git blob |
| --- | --- |
| demo.html | ef7bc3e27e7f161d917ced6a457fad8822802f3f |
| courses/critical-path-timing.json | 49a84feea08ec76de711557e172ccbc6c5c744e9 |
| courses/critical-path-timing.md | 501be7ae56a040b3e5bfcb251737728576aa278c |
| courses/dependency-timing.html | a955954c7d7d900612ee8111cfd29c39febc1723 |
| courses/dependency-graphs-explorer.html | eda0dfa00efec0127818a66a9009da692c40a379 |
| courses/dependency-graphs.md | fedb1704e6c14b01cbf03864ac53a65ea5465d31 |
| courses/dependency-graphs.json | 6e36d7113308540eb923fe5f5c83f1ba0b0ac537 |

The other four members are packaging-only `START-HERE.html`, `START-HERE.txt`, `SOURCE.json` and `SHA256SUMS.json`. The checksum file lists the other ten members. Source terms and attribution remain intact; the timing lesson's CC BY 4.0 statement does not relicense the learner, companion or referenced works.

## Why this detached bundle exists

The accepted branch already has a general offline ZIP, `23041c1de2e33889c44daf4b5e1c75b698286236`, with 15 members and eleven registered course decks. Actual CRC/member inspection found neither this timing course nor its guide or companion. The unchanged native packer consumes an explicit catalog registry and does not package these guide/explorer links.

This delivery follows the existing single-course ZIP precedent and the native checksum/relative-path conventions, using Python's standard-library ZIP tools. It is not a regenerated general catalog pack. No catalog, registry, builder or product source changed.

## Packaging verification and limits

The assembly command exited 0. All 11 members extracted successfully with exact byte lengths, Git hashes and SHA256 hashes; ZIP CRC, safe regular-file metadata, the complete checksum list, all 21 local links and HTML fragment targets passed. Three optional external links were recorded. Every product file retained its accepted bytes before and after packaging.

An independent receiver directly read the canonical guide/companion/graph links and reviewed the supplied opening text. It approved those instructions and the seven-file local dependency set. That review did not independently read the final ZIP bytes; the native packaging gate establishes physical membership and hashes.

[packaging-receiving.json](packaging-receiving.json) records the complete package, local-link audit, actual general-pack exclusion, source pins and narrow boundaries. [packaging-native-evidence.tar.gz](packaging-native-evidence.tar.gz) retains the assembly script, raw command/results, original pack inspection and executed verification code. Rebuild the exact pinned seven-file source projection with:

```sh
python -I -B build-study-bundle.py PINNED_SOURCE NEW.zip
```

The script requires a new destination and refuses any source identity mismatch. The archive's compressed byte identity also depends on the recorded Python/zlib implementation; extracted source identity is checked separately.

This is packaging and source acceptance only. It does not repeat the course/model/browser qualification, claim Windows learner execution or installed adoption, merge the contribution, or invoke Actions. Original tooling retrieval/preparation failures are retained separately from the successful packaging gate. The active no-Actions hold and unrun integration gates remain unchanged.
