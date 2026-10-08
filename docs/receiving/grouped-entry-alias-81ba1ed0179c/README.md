# Grouped-data builder entry through filesystem aliases

## Observed failure and repaired behavior

The grouped-data builder compared its resolved module URL with a lexical URL made
from the command-line entry path. On the received Mac, `/tmp` resolves to
`/private/tmp`; directory and file symlinks create the same mismatch. An actual
direct invocation could therefore return exit 0 without checking arguments,
checking the generated artifact, or building anything.

The repair compares the real filesystem paths of the module and caller entry.
An absent or unresolvable caller entry remains an ordinary import. The existing
argument validation, source admission, generation, output and error handling are
unchanged. The generated explorer is byte-identical.

## Source and ownership

The source-owner handoff is [RecallWeave27](https://github.com/Jacob-Met/RecallWeave/issues/27#issuecomment-6063221326);
the bounded repair claim is [comment6063634784](https://github.com/Jacob-Met/RecallWeave/issues/27#issuecomment-6063634784).
The original grouped-data content and implementation remain attributed to
`chatgpt-58d79b68c9e4/root`. The original paired-command receipt was authored by
`estate-81ba1ed0179c/root`; this lane independently reproduced and repaired it.

Only these two existing product/test paths change:

- `tools/build-grouped-data.mjs`
- `tests/grouped-data-build.test.mjs`

The native intake contains ten files checked against canonical main
`67b5fd0381fd8cbd843952ca2cb26434dba3b594`, tree
`d2c128b2433847a6d064597fb19630f343cffc49`. Its partial baseline commit is
`e816a5716fa0a2f754c8d290689bea59ea75ba45`; the accepted candidate commit is
`c9edbdedd1b79fa32ee81f4e1d3af0454c0fa5a6`.
These are a complete builder/test dependency closure, not a full native clone.
All eight other parser, numerical, UI, course and HTML files stay exact.

## Native receiving

Native macOS arm64, Node `v26.3.0`, with explicit `TMPDIR=/tmp`:

```sh
node --test --test-reporter=tap tests/grouped-data-build.test.mjs tests/grouped-data.test.mjs
```

1. The unchanged maintained baseline reports 15 tests: 13 pass, two fail. Its
   stale-output and unexpected-dependency commands silently skip execution.
2. The frozen additional tests on that same unchanged builder also fail both
   explicit alias subcases. TAP reports 20 tests, 15 pass and five fail: this
   includes the failing parent of the two alias subcases. Canonical execution and
   ordinary-import controls pass.
3. The repaired builder passes all 20 results with zero skips, using those exact
   frozen tests.

The three direct-entry subcases use a canonical path, a directory alias, and a
file alias. Each executes current-artifact checking, invalid-argument refusal,
stale-artifact refusal without replacement, and a successful rebuild whose bytes
and JSON receipt match the original artifact. Three fresh importing processes
cover no command entry, an unresolvable caller path and an ordinary wrapper file;
all preserve the retained output and expose the builder function.

The tests use only owned temporary fixtures and fresh local Node subprocesses.
On Windows environments that cannot create a required symlink, that individual
subcase explicitly skips; the recorded Mac run executes all subcases. No browser
or whole-repository execution is claimed by this targeted native receipt.
The maintained repository CI remains a separate integration gate.

## Evidence

The original paired-command receipt, exact source intake, unmodified baseline,
frozen-regression negative control, and passing candidate logs/receipts are kept
beside this note. The candidate receipt binds both final file hashes and confirms
the eight retained inputs. The original root-reported failures are preserved;
they are not recast as successful checks.

Native custody:
`/Users/me/hamon-mcp-lab/recallweave-grouped-entry-81ba1ed0179c`.
The isolated source, partial Git bundle, full patch and all raw receiving logs are
retained there. Canonical publication overlays the two product/test changes and
this unique evidence directory onto the complete then-current repository tree.
