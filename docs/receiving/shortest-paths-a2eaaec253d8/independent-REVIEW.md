# Independent acceptance — RecallWeave shortest paths

The frozen shortest-paths explorer and twelve-question course are accepted for private review and source integration. The actual standalone page works from a local file, keeps its graph results honest as inputs change, and downloads a course that the existing Deck Studio can preview, replace, check and download again without changing its bytes.

This acceptance covers the nine files in `RUNTIME-FROZEN-v2.json` and the complete 251-file source projection described in `RUNTIME-INTAKE-v2.json`. It is a qualification of those exact bytes, not a claim that a future GitHub commit has already been published or merged.

## Source identity and preservation

| Identity | Exact value |
| --- | --- |
| Current parent commit | a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4 |
| Current parent tree | 9e4e37af18a0c9c2868b62710473ac7bd458768d |
| Independent source projection tree | 136a5e35929e4abe2dd5f036c7af1c3f022eaed9 |
| Complete projection | 251 files, 5,419,443 bytes |
| Runtime freeze manifest SHA256 | 23dd7cab4b3ab8ae614f9e688a5affa90b5759dab85cd0f9eb5df624e071e3cf |
| Independent intake SHA256 | 6ac02e91cfd44eba7823091fd21a8762b4d6ef0ca0ef85ea2d61b667e48c860b |

The receiver independently reconstructed the current parent Git tree and the projected tree from file names, modes and Git blob identities. All 242 current-parent files are preserved. The parent advance adds only the three dependency-graphs course/test files; every one of the original 239 files from parent `5ce520a778da04605f5fa610fb1ad110ffe52b99` remains exact. This includes the current deck validator, Deck Studio, default lesson app, shared model and styles. There is no AGENTS.md in either complete parent tree.

| Qualified product file | SHA256 |
| --- | --- |
| courses/shortest-paths-core.mjs | 600fde93ce4a2235c813ddf1dd33d066e50ec4d345b2c062be4c473d978874b0 |
| courses/shortest-paths.json | 0243e45f777042d0ea3c82a8d418f03f6733e4d2c9a735256a73a14e0060bba5 |
| courses/shortest-paths-explorer-ui.mjs | 92244241b56edc3a092d2b9c5922d20829677b911578c8120c41f94c9f390f76 |
| courses/shortest-paths-explorer.html | 8ec8a891e4a6478ed0d9d3b5c9eddad3ea179985c42fad02e3f29fa343d5bad0 |
| courses/shortest-paths.md | 459d8d68bee5c34349d90720b9d9f582fc4d74a90448b44c2a354ab39e0930ad |
| Unchanged current author.html | 898b32303c834f6539b49a54e6c86ab38d3dd2d3e88e981d8a3287d63f64295c |

The manifest also binds the unchanged template, builder and core tests, plus the browser helper's bounded cleanup correction. That helper now closes its owned browser/profile even if saving evidence raises ENOSPC. Its test steps are unchanged. The generated HTML differs from its predecessor by exactly the same single expression as the UI source.

## Independent results

| Receiving boundary | Result | Evidence |
| --- | --- | --- |
| Oracle preparation before candidate intake | 8 of 8 independent fixtures pass | Native evidence/oracle-self-receiving-v1.json and PREPARED.json |
| Exact graph core | 12 of 12 cases pass; admission/preservation controls pass | Native evidence/core-v1/ |
| Exact revised course | 12 of 12 answer and transfer checks pass | Native evidence/instructional-v2/ |
| Actual final browser and Deck Studio history | 11 of 11 checks pass | browser-v3/browser-report.json and browser-v3-execution.json |
| Visual inspection | All five final captures inspected | BROWSER-VISUAL-REVIEW.json |
| Product source after the browser run | All 251 files and modes unchanged | browser-v3-execution.json and AUDIT.json |

The graph oracle was sealed before the candidate was loaded. It uses synchronous Bellman–Ford rounds and exhaustive simple-path enumeration, with hand-calculated expectations, rather than the candidate's Dijkstra transitions or the author's tests. The receiver checks each settled distance against the independent optimum and verifies that every finite parent route follows real directed edges, has the reported cost and contains no parent cycle. It covers zero-weight cycles, unreachable vertices, ties, directed-only reachability, an isolated source, target equal to source, an early expensive target discovery, and a route whose total exceeds the per-edge bound.

The receiver also checks truthful tentative/final/unreachable status, the specified alphabetical tie rule, equal-route predecessor retention, actual relaxation histories, retained prior states, untouched input graphs, terminal idempotence, rejection of negative weights and refusal to replay a serialized trace as a live state. The core has remained byte-identical through the course and display successors, so this graph gate was not repeated.

All twelve canonical answers and transfer responses were independently checked. The course covers weighted paths, tentative distances, settlement and the nonnegative-weight guarantee in a connected progression. Its four canonical answer positions contain three answers each. Root's proof precision correction is present: processing the settled predecessor offers a route costing **no more than** the arbitrary path prefix. Every other course byte is preserved from the prior interface. The worked traces and all twelve transfer answers in the guide agree with the accepted course.

The receiver consulted [MIT 6.006 Spring 2020, Lecture 13](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/d819e7f4568aced8d5b59e03db6c7b67_MIT6_006S20_lec13.pdf) for initialization, relaxation and the role of nonnegative weights. The receiver's tiny graph fixtures and calculations were independently authored; the course's questions and examples were authored separately.

## One observed defect and its exact successor

A real Chromium witness on predecessor HTML `3f9ef038…0767` entered the valid value `000000000010`. The graph displayed the raw spelling, which occupied 187.232 SVG units across a 44-unit weight box. The downloaded trace correctly stored numeric 10. The original screenshot, actual trace, source, driver and execution receipt are retained under native `evidence/numeric-label-v1/`.

The accepted correction changes only the valid display expression from `raw` to `String(Number(raw))`. It retains the input spelling, the existing invalid `?` branch, validation, graph values, state transitions and downloads. The final browser history repeated the exact original spelling: its label is now `10`, measuring 31.212 SVG units and fitting inside the same 44-unit box. A second valid spelling `000000000001` retains its input while displaying numeric `1`, and the real edited trace records weight 1. No algorithm correction was required.

## Actual browser workflow

The receiver used the installed Chromium 153.0.8010.12 through Playwright in one fresh private context. Both the explorer and the unchanged `author.html` opened using actual `file:` URLs. The support helper creates an unused loopback server, but the tested pages do not depend on it. There were no observed page errors, console errors or external HTTP(S) request attempts.

The single continuous history begins with keyboard prediction and settlement. It preserves an actual trace in which T has been discovered at 9 but is still tentative. Changing the target to the source clears the old history and prediction without settling automatically. Changing the source to A respects directed reachability and reports S as unreachable.

An invalid negative weight clears every previous distance, route, predecessor display, history and prediction while retaining the user's invalid input. Run controls and run export become unavailable, while the fixed course can still be downloaded. Repair and Reset preserve the edited input and begin a clean unstepped run.

With the edited direct edge of weight 1, keyboard steps settle T while A remains unsettled. The downloaded JSON honestly records a final target route and an incomplete overall run. Finishing the run makes the graph and table agree with independent distances S=0, T=1, A=2 and B=3.

The same page then resizes from 1280×1000 to 390×844 without losing results or causing horizontal document overflow. The compact graph and explicit distance table are clear in the captured layout. The graph's scaled numbers are smaller than its table text, so the table remains a useful equivalent representation. The measured Reset control is 46.797 pixels high. This is a finite viewport and keyboard check, not a broad accessibility certification.

The actual course download is exactly 13,678 bytes with SHA256 `0243e45f…0bba5`. In the current standalone Deck Studio, opening it first previews the file while a sentinel draft remains unchanged; cancelling also preserves that draft. Explicit replacement and Check expose all twelve prompts, canonical answers, explanations and transfer prompts. A deliberately malformed subsequent file is rejected without replacing the accepted checked draft. The real Studio re-download is byte-for-byte identical to the original course.

## Storage, evidence and limitations

The Mac's APFS volume returned ENOSPC despite reported free space. The author correctly marked its interrupted successor browser attempt as an environment failure, with two completed groups, rather than acceptance. The independent final history did not retry that path.

Root provisioned and allocation-tested a new private RAM volume. Only this receiver's assigned 120 MiB area held its temporary profile, downloads, captures and receipts; the accepted product source stayed read-only on APFS. The final browser ran once, exited 0, preserved all 251 source files and removed its temporary profile. The execution receipt records the exact command, TMPDIR, driver hash, volume UUID and empty temporary directory after close. The sealed packet is intended for direct transfer to existing ThinkPad custody before that temporary volume is detached.

No learner-session import composition is claimed. The separately owned learner importer is absent from the accepted parent; the current supported file intake is Deck Studio. The downloadable run is a record, not a learner-session restore format. The guide states both boundaries. The prepared but unexecuted full-browser v1/v2 drivers and separate course-contract helper are retained as preparation; only the actual v3 browser history is counted here. No broad author test replay, simulator, default-app change, hosted deployment or learning-efficacy claim is part of this acceptance.

The source may be published or packaged after binding the final full-source commit to this exact qualified tuple. No further runtime gate is required for evidence-only publication changes that preserve all of these product and consumer dependencies.
