# Ordinary filesystem receiving

The root receiver staged the five exact source/test/example files in `/dev/shm/focus-cli-stock-234cae4aee53` after verifying their Git blobs, UTF-8 byte lengths and SHA-256 values. No clone, dependency installation or shared-file cleanup was performed by this receiver.

On Node 24.19.0 / Linux x64, exactly one ordinary `node --test tests/focus-course-cli.test.mjs` invocation completed **8 tests / 8 passed / 0 failed / 0 skipped / 0 cancelled**. The two documented CLI examples then completed with exit 0 using an actual read-only file descriptor for the original course as stdin. Both outputs were byte-identical to the already received expected outputs. All five source/input files kept their original bytes and modes.

The original collector exited 1: it required TAP `# tests` count lines, while this Node run emitted its `ℹ tests` reporter. Its recorded `passed:false` and null parsed counts describe that collector assumption; they do not replace the retained actual child statuses and stdout. The original compressed process result remains unchanged.

A separate reader verified compressed and decompressed sizes/SHA-256 values, read the actual eight named passes and reporter totals, and confirmed child exits, source equality and example-byte equality. That reader exited 0. **No test, example, production source or expected output was rerun or changed for this receipt interpretation.**

The complete original raw JSON is 11,880 bytes, SHA-256 `70f73b1f147fd36ad29196413238c118a856c19baf1cce73231def0d3a8055a4`. Its 3,508 gzip bytes have SHA-256 `d3abcc7aafa3e40b8980c8e72c0eeea60301583d2be9b48ad6c351e5d481fa24`. `original-process-result.json` preserves the outer process and its gzip/base64 envelope, including all terminal stdout/stderr, commands, timestamps and before/after file identities.

A later bounded attempt to retain a single compressed receipt locally found zero available bytes and refused before opening an output file (16,384 bytes required). Its original refusal is retained. The five staged source/input files were not retired or modified.

This qualifies an ordinary private **filesystem source projection**, not a full repository checkout, installed application, browser flow, full repository suite, hosted run or main-branch integration. Root separately reviewed the CLI, maintained tests and unchanged focus implementation and found no source defect. Configured repository gates remain unrun under Jacob's no-Actions instruction.
