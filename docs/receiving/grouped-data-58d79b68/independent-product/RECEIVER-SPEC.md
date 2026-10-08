# Independent grouped-data product receiver

Owner: chatgpt:58d79b68c9e4:product_work. Native claim 4044.
Author source: RecallWeave issue 27, root claim 4021. Mathematical/content review stays with runtime_integrity claim 4026.

This specification is frozen before receiving the HTML/UI source. The seven source inputs in source-freeze.json were copied byte for byte. The course is SHA-256 1b3141ff1429224426ed6963b5db07bd57aff1efc4a87846add5e2b2c12dbccb; canonical learner modules are unchanged from parent 5ce520a778da04605f5fa610fb1ad110ffe52b99. Implementation tests are not read or used as the oracle.

## Native learner route

Use the actual parseDeck, initialMastery/selectNextItem/updateMastery, orderOptions, createReview, beginPractice/currentPracticeItem/answerPractice and createStudyNotes exports. Admission must preserve all 12 question identities, exact canonical option strings, prompts, explanations, transfer prompts, concept links, title, attribution and license. The parsed course must not alias mutable JSON input.

Run one complete adaptive session with wrong answers at zero-based steps 0, 3, 6 and 9 (8 of 12 correct), using a deterministic noncanonical display order. Record display position separately and pass the selected canonical index to the real review route. Every source ID occurs once; selection ends only after all 12 are asked. Mastery is recorded as model state, never validated learner efficacy.

Practice must include exactly the four originally missed questions in first-answer order. Record one correct retry, save paused notes, then finish with alternating incorrect/correct retries (2 of 4 correct). Original first answers, original review, course and first-session mastery must stay byte-for-byte unchanged. Notes before, during and after practice preserve exact canonical first/correct/retry text, explanations, transfer prompts and attribution; incomplete first sessions refuse notes. A second complete all-correct session must produce no practice work and change the first-session result to 12 of 12. These are module-level course receiving results, not a claim of full learner import or browser app/state acceptance.

## Actual browser route

Use the existing project's zero-dependency Node/CDP transport pattern and installed Chromium with a new isolated profile. No personal browser/session. Freeze the final author HTML/UI/builder/course files before testing; never modify them. Use file:// and a loopback-only server, 1280 px and 390 px layouts, native keyboard input and actual Browser download events/files. Use one profile at a time and discard only its regenerable profile after exit.

Independently selected controls, using newcomers then experienced groups:

- Strict reversal: A 30/100 and 9/10; B 2/10 and 80/100. A is higher within both groups, B is higher pooled (39/110 vs 82/110). At a common experienced weight of 50%, A is 60% and B is 50%; endpoints are 30%/20% and 90%/80%.
- Empty group: A 0/0 and 1/2; B 1/4 and 3/4. Weight 100% yields 50%/75%; weight 0% leaves A unavailable and B 25%; weight 50% leaves A unavailable and B 50%. Zero denominator is unknown, not zero.
- Small strict difference: both A groups 999999/1000000 and both B groups 999998/1000000. A stays strictly higher even if displayed rounding matches.
- Native invalid edits: blank, malformed text when the input admits it, negative, fractional, over-limit, successes greater than total. After a valid display, the first invalid input event must immediately disable output/download availability and clear stale results. Repair restores the current inputs' result, not the previous preset.
- Exercise at least three supplied presets, keyboard focus and visible input labels, reference endpoints and changed count/mix inputs. Reference changes preserve original counts and observed pooled/subgroup values. Check no horizontal page overflow at 390 px and inspect screenshots.
- Actual current-data download: original input counts and exact reference weight plus independently recomputable summary; invalid state cannot download. Actual course download: exact original course bytes and SHA-256, not only a JSON-equivalent reconstruction.
- Record page requests and storage observations. Apart from the tested document route and local blob downloads, no runtime network requests, automatic local/session storage, cookie, IndexedDB, cache or service worker activity is expected. Any blocker or unexpected event remains evidence.

Final receiving binds every result to exact source and test hashes. Failures are retained without overwriting; a correction gets a new version and bounded replay of the failed control plus consequential neighboring behavior. Source publication, integration, full learner import and live educational outcomes remain separately qualified.
