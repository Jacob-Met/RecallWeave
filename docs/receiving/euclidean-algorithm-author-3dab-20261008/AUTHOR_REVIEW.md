# Euclidean algorithm course and explorer — author receiving

The contribution adds an original twelve-question, four-concept course and a separate direct-file Euclidean/Bézout explorer. Existing deck import, adaptive selection, first-answer review, missed-question practice, reflections, notes and learning-trace behavior remain owned by the existing learner.

## Exact subjects and actual results

The native carrier uses the unchanged deck/model/review/note modules from RecallWeave commit `169b618ce71d2d4702a0d2ef740821df53581ad2`, complete tree `96471ac3db79b3c5329a27837d92d81f34b1f318`.

| Receipt | Subject | Result |
| --- | --- | --- |
| author-unit-v1 | Original six-file V1 explorer/course, two added focused test files and companion, plus five unchanged learner modules | 12 Node tests pass; exit 0; empty stderr; all 14 source inputs unchanged. |
| author-course-v2 | Corrected V2 course and regenerated standalone; same core/UI/template/builder/test/companion and learner modules | 4 course/integration/parity tests pass; exit 0; empty stderr; all 14 source inputs unchanged. |

The eight arithmetic test groups compare all 6,561 pairs from 0 through 80 against direct enumeration of common divisors and 522 boundary/deterministic larger pairs against a separate binary-gcd implementation. Every division reconstructs the dividend, satisfies the remainder bounds and yields the next displayed pair. All dividend/divisor/remainder coefficient pairs and the final Bézout identity reconstruct their values. Zero, equal, divisible, smaller-first and long-chain examples are included. Input refusal, exact JSON decimal strings and recursively frozen result objects are checked.

The four course groups parse the complete original deck through the actual current parser, finish a full adaptive first session, preserve two intentional first misses during separate correct retries, inspect every original explanation/answer in generated study notes, receive an all-correct session, and compare the standalone with its exact build inputs.

These are software tests over authored inputs. Counts are test groups and arithmetic input pairs, not learner trials or evidence of learning efficacy. The corrected course run does not relabel the original arithmetic run as V2 execution; the arithmetic source is byte-identical.

## Content correction and preserved V1

Independent blind review found that division-3's original phrase “which condition is always required” literally admitted both the intended strict range and the looser bound with r ≤ b. The corrected prompt asks which condition gives the **full allowed range**. It changes no option, answer, explanation, prerequisite, item identity or other question.

The original question-only packet and all six exact V1 product files are retained in this archive, alongside both native runs. V2 changes only the course prompt and the same text inside the embedded exact course download. Core, UI, template and builder bytes are unchanged.

The independent review's blind oracles, original ambiguity analysis, corrected-key comparison and actual Node receiving are preserved separately. Browser receiving has its own exact source subjects, actual saved files and failures; this author packet does not substitute source inspection or unit tests for browser operation.

## Runtime and reproduction

Actual runtime: macOS 26.6.2 arm64, Node v26.3.0 and CPython 3.13.7. The recorded commands use the existing installed Node. No application dependency was added.

Run from the repository root:

```sh
node --test tests/euclidean-algorithm.test.mjs tests/euclidean-algorithm-course.test.mjs
node tools/build-euclidean-algorithm.mjs --check
```

The archive includes exact receiving drivers, raw stdout/stderr, runtime reports, complete before/after source maps, original V1 product files, final V2 source files, question-only packet and version pins. Its manifest checks each archive member by byte length and SHA-256.

All mathematical examples and wording are original. Mathematical background is linked in the course and companion to MIT OpenCourseWare's 2024 divisibility lecture and 2010 Recitation 4. The software does not make provider calls, upload files or persist browser state. The explorer's six-digit nonnegative input bound is intentional, and proportional SVG widths remain approximate while all displayed arithmetic uses exact integers.
