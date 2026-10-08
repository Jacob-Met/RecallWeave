# Euclidean algorithm: source and receiving record

This contribution adds an original twelve-question course, worked companion and offline explorer. The explorer computes exact Euclidean divisions and Bézout coefficients for two nonnegative integers from 0 through 999999. It preserves input order, explains the zero convention, retires an old result when inputs change, and requires an explicit Compute action. Its SVG widths are illustrative; the displayed arithmetic and downloaded trace are exact.

## Product source

The nine new course, core, UI, template, builder, companion and test files are the final V2 author bytes. README adds a discovery section. Existing lesson, catalog, session, practice, archive and note source is preserved.

The core and course tests run under the repository's ordinary `node --test tests/*.test.mjs` workflow. `node tools/build-euclidean-algorithm.mjs --check` verifies the distributed offline HTML against its exact source and embedded course. This receiving index records native observations; hosted checks must be read at the actual published commit.

## Evidence by actual subject

| Subject | Observed result | Exact record |
| --- | --- | --- |
| Original V1 author source | Twelve focused tests pass: exact divisions/coefficient reconstruction, all 6,561 small pairs, 522 boundary/seeded large pairs, course import, complete adaptive session, separate practice, notes and generated HTML parity | [Author packet](euclidean-algorithm-author-3dab-20261008/AUTHOR_REVIEW.md) |
| Final V2 author course and generated HTML | Four focused course/integration/parity tests pass after the one-prompt correction. The eight unchanged core groups were not rerun or relabeled. | [Author manifest](euclidean-algorithm-author-3dab-20261008/AUTHOR_MANIFEST.json) |
| Independent mathematics and original content | A blind oracle and question answers were frozen before implementation/key review. The actual native core passes 29 selected vectors and 105 division-row reconstructions; five corrupted-result controls are rejected and an alternate valid Bézout pair is accepted. All twelve final questions have a unique correct answer. | [Independent math approval](euclidean-algorithm-math-3dab-20261008/REVIEW.md) |
| Original V1 offline explorer and standalone learner on `169b618c` | Actual file downloads, exact trace inspection, invalid-input/result retirement, worked pairs, 390px layout, failure/retry, full twelve-question learning, two missed-item practice answers, multiline notes and save/restore are received. | [Consumer approval and preserved failures](euclidean-algorithm-consumer-3dab-20261008/REVIEW.md) |
| V2 downloaded course in the same native standalone learner | Actual embedded V2 download, all twelve preview prompts, explicit Start and the corrected remainder-range question/feedback are received. Unchanged learner journeys were not replayed. | [Consumer summary](euclidean-algorithm-consumer-3dab-20261008/receiving-summary.json) |

The independent content review found that the original wording “always required” admitted both a strict remainder bound and a weaker true bound. V2 asks for the **full allowed range**. Only that prompt and its embedded HTML copy changed; options, key, explanations, IDs and prerequisites are unchanged. V1 inputs and all original failed receiver attempts remain intact.

## Packet custody

| Packet | Raw archive | SHA256 |
| --- | --- | --- |
| Author, 36 archived members | [author-native.zip](euclidean-algorithm-author-3dab-20261008/author-native.zip) | `3d61117616afbc9819c2a4c82dc7abd90b7eec9f029714347082935c7d466ca5` |
| Independent math, 25 archived members | [native-math-receiving.zip](euclidean-algorithm-math-3dab-20261008/native-math-receiving.zip) | `c5f0fafdc65ba671e3c3a76b70a0523eaab82bd86680631fb5d144569d39e10e` |
| Browser/learner, 88 public payloads plus manifest | [euclid-browser-receiving-v2.tar.gz](euclidean-algorithm-consumer-3dab-20261008/euclid-browser-receiving-v2.tar.gz) | `de421db13d12bd60adb994a55ad910108057da8b74318b69f18f04818179c304` |

Root independently checked every archived member against its manifest, all top-level publication payloads, the authored and independent test/receiver source, exact source guards and selected desktop/phone captures. The consumer's two observations containing unrelated desktop/window metadata remain private; only their immutable hashes and a factual boundary summary are public.

## Current-source interpretation

The initial publication is composed onto main `3a3704c352f8a12e20c208445c2c5ade412b365d`, tree `6e2d15579a60b2961b121d231e3c8238e68a433b`. The five existing mathematics/session modules used by the author tests remain byte identical to the received baseline.

The existing learner has since gained another owner's in-progress lesson archive, with changes to app, index, styles and generated demo. Root inspected that app delta and preserves it. The earlier complete native learner journey remains qualified to `169b618c`; it is not relabeled as execution of the current generated demo `cf7eea3792deacc3eb98a22aef539b920fb66746`. A focused current-source handoff, if subsequently received, belongs in a separate additive record.

The Mac's modular localhost browser route stopped before application delivery, including on a tiny authored page. The completed direct-file learner result is not an HTTP browser qualification. No keychain reset, credential entry or permission change occurred. The exact current contribution can be reviewed with these boundaries and its actual hosted checks. No new account, service activation or installed application is part of this change.

Scope: [RecallWeave issue64](https://github.com/Jacob-Met/RecallWeave/issues/64).
