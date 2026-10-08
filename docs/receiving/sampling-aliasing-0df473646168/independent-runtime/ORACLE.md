# Fixed independent receiving oracle

This plan fixes expected results before any native RecallWeave execution. It adapts MATH-PREPARATION.md to the author's actual contract: unit-amplitude zero-phase cosine, half-Hz frequencies from 0 through 40 Hz, integer sample rates from 2 through 32, and a one-second window including both endpoints. Phase and arbitrary real-frequency controls are not part of the native interface; the phase limit is received as course content instead.

## 1. Alias periods and a real CSV consumer

Use the real analyzeSampling and samplingCsv exports at fs=12. A separate standard Python CSV reader consumes the written CSV bytes. The receiver expects all thirteen indices 0 through 12, exact parameter columns and times n/12, a final newline, and a one-to-one match between native numeric snapshot rows and every CSV row. Exported numeric values must retain the model's binary floating-point values when parsed; rounded display numbers are not substituted for CSV data.

| Reference f | Lowest representative | Different comparison | Expected sequence |
|---:|---:|---:|---|
| 2 | 2 | 14 | Six-value cosine period |
| 10 | 2 | 2 | Six-value cosine period |
| 14 | 2 | 2 | Six-value cosine period |
| 26 | 2 | 2 | Six-value cosine period |
| 0 | 0 | 12 | All ones |
| 12 | 0 | 0 | All ones |
| 24 | 0 | 0 | All ones |

The exact six-value period is [1, 1/2, -1/2, -1, -1/2, 1/2], repeated through index 12. It follows directly from 2*pi*2*n/12. Whole-rate shifts add 2*pi*k*n; cosine evenness permits the reflected 10 Hz reference. The expected values do not call the native cosine, alias, sample or CSV helpers. A displayed comparison remains a different compatible authored curve even when the reference is in baseband.

## 2. Strict boundary with identical observations on opposite sides

Use the supported f values 5.5, 6 and 6.5 at fs=12. Expected statuses are respectively below, at and above. Expected lowest representatives are 5.5, 6 and 5.5; different comparisons are 17.5, 18 and 5.5.

For both side cases,

cos((pi +/- pi/12)*n) = (-1)^n*cos(pi*n/12).

The receiver evaluates the thirteen cos(pi*n/12) values using exact special-angle expressions: 1, (sqrt(6)+sqrt(2))/4, sqrt(3)/2, sqrt(2)/2, 1/2, (sqrt(6)-sqrt(2))/4, 0, followed by their reversed negative counterparts through -1. It does not ask the native cosine helper for the expected sequence. At f=6, the zero-phase cosine is exactly (-1)^n.

Thus the below and above cases must give the same samples while retaining distinct reference frequencies and statuses in both native rows and CSV. Equality is its own status. For arbitrary phase, a boundary sine gives sin(pi*n)=0; the course states this explicitly. The fixed-phase lab itself does not prove arbitrary-phase recovery or reconstruction from a finite record.

All sample-value comparisons use an absolute tolerance of 2e-12, fixed before execution. This allows ordinary floating-point trigonometric evaluation error but rejects display rounding of the radical-valued boundary observations. Times use 1e-15 absolute tolerance; CSV versus native snapshot values compare exactly after standard numeric parsing.

## 3. New course through existing review and saved-note APIs

The frozen course must match the independently reviewed draft identity in content-review.json. This is an independent content review, not a blinded review: the draft keys and explanations were visible. That record contains separately reasoned answers and transfer solutions for all twelve questions, with the exact draft source pin.

Use unchanged parseDeck and serializeDeck to obtain an ordinary JSON round trip of the entire course. Synthetic choices deliberately answer only the boundary question incorrectly, selecting its statement that the sine is zero at every continuous time. All other choices come from the fixed independent answer map. Use unchanged createReview, initialMastery and updateMastery to produce the native first-session state. Then use beginPractice/currentPracticeItem/answerPractice to retry that one question with the independently expected correct option.

Call the existing createStudyNotes before and after the retry. The text artifacts must keep 11/12 first-attempt correctness separate from one later correct retry. Every prompt, correct option, explanation, transfer problem, course title, attribution and license must survive into the notes. The original first-review and mastery states must remain equal before and after practice, and the notes must keep their existing model-estimate qualification. The exported timestamp is a deliberately fixed synthetic fixture value, 2026-10-08T12:00:00.000Z; it is not the execution time or real learner evidence.

## Execution and scope

Planned selection: three distinct methods, one parent Python standard-reader/test process, and one fresh Node native consumer for each method. The two numeric methods emit ten CSV files containing 130 data rows total. The course method emits the original and canonical JSON plus two actual native study-note files. Exact source and receiver identities, commands, return codes and before/after comparisons will accompany the one receiving execution. No author suite, baseline or browser scenario is replayed.

The author separately owns actual browser observation, control handling, rendering and file downloads. This receiver qualifies numeric model rows and emitted CSV; it does not label those rows as a browser DOM observation. Existing importer, Deck studio, shared model and course owners remain untouched. No model-validity, real learner outcome, physical acquisition, unique-original identification or live deployment claim follows from these synthetic controls.
