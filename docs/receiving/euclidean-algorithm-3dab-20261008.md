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
| Learner at `48611be9`, blob `cf7eea3792deacc3eb98a22aef539b920fb66746`, with the published V2 explorer/course | Actual Chrome 153 file download, all twelve exact preview prompts, unchanged default preview state, explicit Start and nine ordinary answer/Next steps reach the corrected division-3 question and feedback at 390px. Four bounded groups pass on native Node 22.22.1. | [Current handoff](euclidean-algorithm-current-3dab-20261008/README.md) |

The independent content review found that the original wording “always required” admitted both a strict remainder bound and a weaker true bound. V2 asks for the **full allowed range**. Only that prompt and its embedded HTML copy changed; options, key, explanations, IDs and prerequisites are unchanged. V1 inputs and all original failed receiver attempts remain intact.

## Packet custody

| Packet | Raw archive | SHA256 |
| --- | --- | --- |
| Author, 36 archived members | [author-native.zip](euclidean-algorithm-author-3dab-20261008/author-native.zip) | `3d61117616afbc9819c2a4c82dc7abd90b7eec9f029714347082935c7d466ca5` |
| Independent math, 25 archived members | [native-math-receiving.zip](euclidean-algorithm-math-3dab-20261008/native-math-receiving.zip) | `c5f0fafdc65ba671e3c3a76b70a0523eaab82bd86680631fb5d144569d39e10e` |
| Browser/learner, 88 public payloads plus manifest | [euclid-browser-receiving-v2.tar.gz](euclidean-algorithm-consumer-3dab-20261008/euclid-browser-receiving-v2.tar.gz) | `de421db13d12bd60adb994a55ad910108057da8b74318b69f18f04818179c304` |
| Current learner handoff, 16 archived members | [native-current-handoff.tar.gz](euclidean-algorithm-current-3dab-20261008/native-current-handoff.tar.gz) | `8ff898830afa8769bd4ae484409b361c7de78103c2eb3f6feff9f454eb8b1fff` |

Root independently checked every archived member against its manifest, all top-level publication payloads, the authored and independent test/receiver source, exact source guards and selected desktop/phone captures. The consumer's two observations containing unrelated desktop/window metadata remain private; only their immutable hashes and a factual boundary summary are public.

## Current-source interpretation

The initial publication was composed onto main `3a3704c352f8a12e20c208445c2c5ade412b365d`, tree `6e2d15579a60b2961b121d231e3c8238e68a433b`. The five existing mathematics/session modules used by the author tests remain byte identical to the received baseline.

The integration composition uses main `84d5a718c4075107dc2d0e13ba76e7cda4942532`, tree `1871b2e6784174db3e16b690dd8f09ffeb49e32f`. Its 2,289 unrelated leaves remain exact; README retains all existing text with only the Euclid discovery section added. The 30 contribution paths yield 2,319 total leaves. Another owner's in-progress lesson archive and all subsequently integrated courses remain intact.

The earlier complete native learner journey remains qualified to `169b618c`. A separate current-source handoff actually ran on 2026-10-08 from 18:51:52 to 18:52:22 UTC using native Node 22.22.1 and Chromium 153.0.8010.47. Its exact generated learner blob `cf7eea3792deacc3eb98a22aef539b920fb66746` was verified against both main `f42ad22e069b5ed3b2d85ea0573b84fef121d254` and the later composition base `48611be99baa20f51d1e3846ed8cd38879748961`. The browser physically downloaded the published V2 course, previewed all twelve prompts without replacing the default six-question session, explicitly started the deck and used nine ordinary answer/Next steps to reach the corrected division-3 feedback. All four bounded groups passed; all three source inputs remained exact, observed page requests were file URLs, no JavaScript exceptions occurred, and the owned browser/profile were cleaned up. Root read the complete receiver and report, inspected the phone capture, and independently checked all sixteen archive members and six top-level packet files. This additive check does not repeat or relabel the prior full explorer, practice or archive journeys.

After that receiving, main `84d5a718` added explicit **Your answer** and **Correct answer** paragraphs to the shared feedback. Root compared both complete app sources: the only runtime change is one renderer markup line using the existing escaped canonical option values. Scoring, ordering, import, Start, session, practice, archive and export code remain exact. Its generated learner is now `42f991e0ceab6144e24b667f59905777d9659246`. The [owner's separately received feedback change](answer-feedback-ab529ac65023/README.md) and ordinary checks qualify that presentation delta. The Euclid handoff and its screenshot remain attributed to the actually received `cf7eea37` learner; they are not claimed as execution of the later markup.

The Mac's modular localhost browser route stopped before application delivery, including on a tiny authored page. The completed direct-file learner result is not an HTTP browser qualification. No keychain reset, credential entry or permission change occurred. The exact current contribution can be reviewed with these boundaries and its actual hosted checks. No new account, service activation or installed application is part of this change.

Scope: [RecallWeave issue64](https://github.com/Jacob-Met/RecallWeave/issues/64).
