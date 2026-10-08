# Independent normal-modes builder receiving

Reviewer: /root/research, session 3e50c5ad22c5. Implementation owner: /root. All fixture writes occurred under /tmp/hamon-normal-modes-builder-review-3e50c5ad22c5. The previously sealed physics/content packet was not modified.

## Current result

The original builder passes all seven independently frozen receiving groups. Two additional source-inspection regressions expose the same defect: valid literal marker-shaped text inside a deck or guide is incorrectly treated as a template directive.

The isolated minimal patch validates marker cardinality against the original template, then substitutes the four markers in one pass. It passes all nine groups. Normal and literal-HTML fixture output bytes are identical before and after the patch.

Production-template rendering and final source composition remain pending in this packet. Authored minimal fixture results do not claim full browser UI behavior.

## Source identity and chronology

| Item | SHA256 |
| --- | --- |
| Original builder | 34764aeb0b8b0eea36cb473ed80c9638ad36d54ff68513a964f23bf1a193b4ce |
| Proposed patched builder | cf70e91c7f64c60395cb1c7045d34946caf47a8bb1b7af45fd5c724c64f8ebef |
| Unchanged native deck parser | 621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b |
| Frozen expected controls | 1dba6e68a4dd098b992db09b7846b8b72306206e6dd46f71e04d484c8ab57dc0 |

Expected behavior was frozen at 2026-10-08T19:16:16.018Z, before reading the builder. expected-controls.json and controls-freeze.json retain this independent contract.

The original candidate ran at 19:20:55–19:20:57Z. The proposed patch ran at 19:22:46–19:22:49Z. Both receipts record identical before/after builder and parser hashes.

## Frozen controls

| Group | Result |
| --- | --- |
| Deterministic exact parity | Repeated builds are byte-identical. Each of five source inputs affects output. Exact check mode preserves output inode and modification time; stale checks refuse without replacing prior bytes. |
| Template token cardinality | Four missing-marker cases, four duplicate-marker cases, and an unknown template marker are refused while preserving prior HTML. |
| Checked-deck refusal | Malformed JSON, invalid answer index, unknown prerequisite, prerequisite cycle, and an incorrect reviewed question count are refused without replacing prior HTML. |
| Literal source serialization | Closing script tags, HTML-like text, quotes, ampersands, U+2028, and U+2029 decode to exact original deck and guide text, including leading whitespace, CRLF and trailing newlines. The authored HTML retains one executable script. |
| Standalone execution | The generated classic script executes the authored core and UI fixture. Retained static import/export dependencies are refused. |
| Failed rename | An existing destination directory and its sentinel survive. The builder removes its own temporary file and preserves a separately authored preexisting temporary sentinel. |
| CLI working directory | An absolute builder invocation from another directory builds/checks the intended project. Stale check exits 1, unknown arguments exit 2, and the caller directory remains untouched. |

The literal fixture retained a 5,961-byte deck source and a 138-byte guide source exactly. Its output SHA256 is 90833c545962fe2c3f8569c54d510f4e5ce45674d6815a70f530ad5230063de6 under both builders. Ordinary deterministic fixture output is ccc34cc8f5f3b9f0fac1268628a3aa24d44a67061f34f8fb0779f565651af0db under both builders.

## Concrete defect and isolated fix

A valid sixteen-question, four-concept deck with the prompt:

```text
Explain literal {{NORMAL_MODES_GUIDE_JSON}} as text.
```

is rejected by the original builder as though the template contained a duplicate guide marker. The template itself contains each required marker exactly once. The extra occurrence exists only inside the serialized deck payload.

A guide containing this ordinary source text is likewise rejected by the final unresolved-marker scan:

```text
{{NORMAL_MODES_EXAMPLE}} is source prose, not a template directive.
```

The original implementation validates the progressively substituted output, allowing inserted payload data to change the interpretation of template markers. proposed-builder.patch changes only this render block. It checks the original template for exactly one of each required marker, rejects unknown marker prefixes remaining in that template, then substitutes the original template in one pass. Inserted data is never scanned as another directive.

Both regressions are retained in builder-review.mjs and failed on the original source. They pass on proposed-build-normal-modes.mjs. The actual implementation source was not edited by this reviewer.

## Guide refinement acceptance

guide-refinement-acceptance.json accepts the exact bounded change from guide SHA256 3811bc8c0e77a033f82b46e57b5488439e5bdcec22f3ae8cda2502235d5652dc to e89f0eb939190d2b8ff457b257ccbf02560294042828f9dd641b40d81ce3f49a.

The change adds the explicit unstrained-equilibrium/no-preload assumption and clarifies immediate preset application versus applying manually edited fields. The latter is consistent with the owner/runtime lane contract; browser behavior remains in that lane. No core or deck test was repeated.

## Reproduction and retained material

The integration packet preserves the original builder/parser source snapshots, both complete receiving receipts, the original frozen contract, the test harness, the proposed source and patch, and the guide refinement acceptance.

The authored fixture trees are deterministic intermediates generated by the retained harness. To replay, copy this compact packet to a fresh temporary directory and supply the candidate project root:

```text
node /temporary-packet/builder-review.mjs /candidate-project fresh-run
node /temporary-packet/builder-review.mjs /candidate-project proposed-run /temporary-packet/proposed-build-normal-modes.mjs
```

Run names must be fresh. The harness creates its own fixture directories, copies the exact candidate builder and native parser, performs all mutations only in those fixtures, and retains a new receipt. It never invokes physics tests or modifies the candidate project's source files.
