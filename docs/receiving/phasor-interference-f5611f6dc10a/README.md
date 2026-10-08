# Phasor course and offline lab — receiving

This packet records the original course/model contribution in [issue 75](https://github.com/Jacob-Met/RecallWeave/issues/75) and [PR 87](https://github.com/Jacob-Met/RecallWeave/pull/87). The product pin is `14e6a606c44047425abb0fc4980d7d12c676d40e`; adding this packet and the maintained browser receiver does not change its course, numerical model, UI, template or generated lab bytes.

## Source and native checks

The initial exact base is `67b5fd0381fd8cbd843952ca2cb26434dba3b594`. All 147 materialized native source leaves passed Git-blob verification; the unchanged suite passed **261 tests**. Seventeen new course/model checks pass, including 120 deterministic experiments compared with independent real cosine equations, complete-cycle averages, exact opposite-phase cancellation at arbitrary common rotation, nonzero near-cancellation, branch-cut handling, immutable results and full-precision export identity.

The final product incorporates current main `964d3eeb7d81a4b54d140dd268ed8f204ec4bec3`. Its 21 changed source leaves were independently fetched and verified; **299 native tests pass with zero failures or skips**. Complete remote tree receiving preserves all **1,484 unrelated base leaves**, with ten owned product paths and 1,494 total leaves. Existing learner, importer, validator, catalog, other courses and workflows remain owned by their original contributors. The one README entry reversibly composes with that exact parent.

[qualification.json](qualification.json) contains numerical counts and product hashes. [source-materialization.json](source-materialization.json) records source inputs. Raw [baseline](baseline-tests.log), [focused](focused-tests.log) and [current-source](native-tests.log) logs retain actual executed output. The standalone builder validates the course with the existing parser and passes exact output parity.

## Independent receiving

A separate GPT-6 Astra/Ultra worker solved all sixteen prompt/options-only questions before seeing the authored answer key. Every answer agreed; its calculations and independently selected numerical edge cases are in [blind-content-review.json](blind-content-review.json).

A second independent source review checked the complete guide/course/model and all three primary references, finding no blocking issue. Its [record](content-model-review.json) distinguishes the one later editorial clarification about elementary preset choices from the unchanged mathematics and product logic.

A different worker used an existing Mac Chrome, an isolated profile/download directory and the exact product bytes. The final real-browser process passed **24/24 controls**, including typed negative phase, every one of 129 independently calculated values, CSV and JSON downloads, original course-file identity, zero/near-zero handling, invalid-input retirement, cursor keyboard/boundary behavior, and the unchanged learner's complete import/answer/review/retry/reflection-note flow. Desktop and phone screenshots were inspected; mobile plot labels were enlarged before the final pass. The maintained receiver and its runtime/command/outputs are recorded in [browser/](browser/).

## Retained boundaries

The local Playwright package initially lacked its configured executable. One bounded browser-install command exited 1 because the downloaded archive could not be read; [the setup failure](browser-install-failure.log) is not relabeled as browser acceptance. The existing Mac runtime supplied actual browser receiving.

An early browser receiver used synthetic triple-click selection that did not clear a two-digit numeric input. The resulting invalid form was correctly refused. Input-event evidence identified the receiver error; explicit native select-all plus empty/final-value assertions corrected it without changing product logic. That failed run remains distinct from the successful final product pass.

The course uses a scalar, same-frequency cosine model. Its cycle mean square is a mathematical result, not a calibrated intensity. Exported files preserve numerical precision within JavaScript's floating-point limits. Qualification verifies source behavior and stated calculations; it does not establish physical measurement accuracy, learning efficacy or native estate deployment.
