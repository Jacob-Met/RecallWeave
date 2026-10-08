# Native learner receiving — original course revision

Verdict: passed, bounded to the exact native modules and course copied in `../source-freeze.json`. Browser explorer and full learner import acceptance are separate.

Course SHA-256: `1b3141ff1429224426ed6963b5db07bd57aff1efc4a87846add5e2b2c12dbccb`.
Receiver SHA-256: `1a71dd1106efac26a886bb7ded38986889d3e748fed3a31122020d66528330fa`.
Specification SHA-256: `e12b8226d04c469c30ff4a9b68ccfd726e3c193408c139a50211e4af447f20b1`.

All ten independent controls passed on Node 22.22.1. The real `parseDeck`, knowledge selection/update, answer ordering, review, practice and study-note exports were loaded from seven byte-exact frozen inputs. No author test was used as the oracle.

The mixed run completed twelve unique first answers, selecting eight correct and four incorrect canonical choices under a deliberately noncanonical display order. Review retained exact prompt, option, correction, explanation and transfer text. One bounded round then recorded four retries, with two correct and two incorrect. Before, paused and completed study notes preserve the first-session answers and model state, while retaining separate exact retry text. An incomplete first session refuses notes. A changed all-correct run completed twelve first answers and offered no missed-question practice.

`result.json` records the complete traces, full-precision model state, exact source readback and four native exported-text hashes. The four `.txt` files are actual bytes returned by `createStudyNotes`; they are not described as browser downloads. Original author files and the frozen copies matched their initial hashes after this run.

The model values are software state, not validated learning efficacy or a grade. This does not establish the pending importer, app/browser learner lifecycle, saved-lesson state, source integration or installed product acceptance. A later course revision receives its own source pin and bounded replay; this record remains historical.
