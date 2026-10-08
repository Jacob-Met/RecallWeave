# Substring lesson and explorer design before production edits

This is a design/qualification note for the queued source claim. It is not a production implementation or evidence of browser behavior.

## Exact algorithm variants

Inputs are finite arrays of Unicode code points obtained from well-formed strings. Keep the original text and pattern unchanged. Empty pattern is refused; empty text is allowed. The maximum accepted text length is 64 code points and pattern length 16. Case, combining marks, spacing and line breaks participate in exact equality. No normalization or grapheme segmentation occurs.

The naive algorithm visits each feasible start in increasing order, from 0 through `n-m`, compares pattern tokens from left to right, and stops that alignment on its first mismatch. A complete match is emitted and the next start is still considered, so overlaps are included. If `m>n`, there are no feasible starts and no naive comparisons.

Prefix preparation defines `pi[i]` as the length of the longest proper prefix of `pattern[0..i]` that is also its suffix. Start with `pi[0]=0`, `i=1`, `q=0`. Compare `pattern[i]` and `pattern[q]` exactly once per comparison step. Equality records `pi[i]=q+1` and advances both values. On mismatch with `q>0`, set `q=pi[q-1]` without changing `i`; otherwise record zero and advance `i`. Fallback and record events add no equality count.

The prefix-function KMP search starts with `i=0,q=0`. Compare `text[i]` with `pattern[q]` exactly once per comparison step. Equality advances both. When `q=m`, emit `i-m` and continue with `q=pi[m-1]`, preserving overlap. On mismatch with `q>0`, fall back to `pi[q-1]` without moving the text cursor. Otherwise advance the text cursor. Text search runs until `i=n`, including when the pattern is longer than the text. Prefix preparation is always displayed separately, even for empty text.

This is the declared prefix-function variant. It is not a claim to reproduce every optimization from the original paper. Both algorithms find the same exact occurrences. Preparation and text-search comparison counts are separate; a total is their sum. Small examples can favor the naive variant.

## Trace contract

Each accepted build owns an immutable complete result. Keep the original token arrays, final prefix values, final occurrence lists and three independent traces: naive search, prefix preparation and KMP search. Every trace begins with an initial state and ends with an explicit complete state. Each comparison step identifies both compared tokens and indices, its equality result and the cumulative comparison count. Fallbacks show old/new prefix length and the unchanged text/preparation cursor. Completed-match events show the exact start before the next state begins.

Snapshots retain all data needed for inspection; UI stepping selects a snapshot and does not execute another algorithm step. Count equality evaluations only; row changes, fallback assignments, occurrence output and UI navigation are not comparisons. Bounds keep the teaching traces small. The stored trace has greater space use than the underlying search algorithm and will not be described as the algorithm's working-space bound.

## Learner flow

Edit text/pattern, then explicitly build. Editing either field immediately retires the accepted trace and its calculation download. Invalid drafts remain available for correction. Use separate Previous/Next/step selectors for the three traces; keep a useful final summary and input identity visible. An initial pattern longer than the text shows why no match is possible while still showing the declared preparation and scan work.

Use text nodes for all input, tokens, labels and explanations. Show whitespace/control tokens with an explicit code-point label while preserving literal originals in the result JSON. Course download bytes must equal the authored JSON file, including formatting. The standalone builder embeds the raw course as a JSON string with script-delimiter-safe escaping, not a reconstructed deck object. Source-module and bundled handler behavior must share the same implementation.

No live updates, file import, storage, external assets, accounts, telemetry or timers are needed. The page can be directly opened and its result/course explicitly saved through ordinary browser controls, but this lane will qualify only native Node/model/handler/build behavior. No browser execution or download acceptance is implied.

## Qualification targets

- Compare every emitted occurrence against whole-slice equality; compare every prefix cell against independently enumerated proper borders.
- Enumerate bounded binary alphabets, including empty texts, patterns longer than text and heavily overlapping inputs. This is a finite exhaustive domain, not a universal proof by test.
- Retain hand-derived exact counts and the stationary-text fallback witness before implementation. Validate trace transitions, final state, counts and immutable input/results separately.
- Test the 64/16 code-point limits, astral values, combining sequences, controls, case distinctions and unpaired-surrogate refusal.
- Receive twelve new questions through the exact existing deck validator, adaptive selector, review/practice and notes. Check each worked numeric answer against independent examples, and balance canonical answer positions without relying on displayed letters.
- Use actual UI callbacks under an explicitly simulated DOM to check retirement, rejected drafts, stepping, current-result selection and exact prepared download bytes. Record any failed dispatch cleanup separately. No simulated layout or actual browser download claim.
- Verify the generated standalone artifact is deterministic and contains the exact current core/UI/CSS/course closure. Existing learner and catalog source must remain byte-identical.
