# LP local installation: first browser-receiving attempt

## Outcome

The first installed-browser receiving attempt **failed overall**. The installed command's actual shebang invocations `--check` and `--no-open` both passed, and the private Chrome process opened the exact installed file URL and rendered the original initial example. The receiver then stopped because its keyboard helper left the worked-example select at `unique` instead of selecting `fractional`.

This receipt remains a failed first attempt. A later remaining-work continuation may reuse its completed L1 evidence; it cannot make this original attempt an overall pass.

The qualified product is RecallWeave commit `b5e46d4f8c3013259c0baa81507652d900cb5074`, tree `988b548df0dee45259e54341b56beba1a054ccc9`. No product asset, installer or opener source was changed during this receiving work.

## What actually ran

| Operation | PID | Observed result |
| --- | ---: | --- |
| Root supervisor | 99005 | Closed with exit 3; the receiving attempt failed |
| Independent Node receiver | 99064 | Exit 1, reaped, owned group absent |
| Installed command `--check` | 99091 | Exit 0; exact thirteen declared file pins and installed file URL verified |
| Installed command `--no-open` | 99096 | Exit 0; exact same installed file URL reported without a desktop-open request |
| Private Chrome | 99101 | Actual Chrome/154.0.8037.99, revision @45889d77830582727fe00dbfd614bcb7aac35caa; Browser.close completed and process exited 0 |

The native root supervisor records 2026-10-09 07:02:26.422775–07:02:27.760286 UTC. Its polling wrapper reports 2.36 seconds; that wrapper duration is separate from the internal timestamps.

The loaded page was:

`file:///Users/me/Applications/RecallWeave-LP-e3a41d2b3368/site/courses/linear-programming-explorer.html`

It rendered “Two limits, one best vertex,” with “Maximum 9 at V3 (1, 3),” four vertex rows and fifteen pair rows. The inspected vertex initially remained V1 and both page storage counts were zero. These are initial-page observations; the planned fractional interaction had not succeeded.

## The recorded input sequence

The receiver focused the existing `#preset` select, then dispatched Home, ArrowDown and Enter. The browser recorded trusted keydown/keyup events for all three keys at that select. Its value remained `unique` throughout.

Enter also caused an actual trusted click on `#apply` followed by a trusted submit event on `#problem-form`. The original fields were still present. Accordingly, this first run did perform an application action: it submitted the initial problem. It did **not** click Load example or apply the intended fractional preset.

The receiver's value assertion failed immediately afterward. There were no recorded preset input/change events, no Load example click, no physical download, and no screenshot. L2 stopped at this assertion; L3, L4 and L5 were not completed.

## Source diagnosis and the proposed material correction

At the exact revision reported by the running browser, Chromium's Mac layout theme enables arrow-key menu opening and disables return-key menu opening. Its menu-list select implementation takes the Mac path before the Home/index-key selection logic. This makes the first helper's portable Home-plus-arrow-index assumption unsupported on this target.

Chromium also implements native printable-keypress typeahead. It matches labels case-insensitively, updates the selected option through its native select path, and dispatches input/change events. Its prefix buffer has a one-second session timeout.

Those source facts support a different future input method. They do not prove which popup path was taken in the first run, and they do not substitute for actual receiving.

The first proposed continuation prefix, “A f,” was found to be ambiguous before native use: the original product includes both “A fractional continuous optimum” and “A feasible segment.” The initial continuation draft's uniqueness guard would refuse it. That draft was never run.

The sealed correction uses **“A fr”**, which uniquely matches “A fractional continuous optimum” among all seven original labels. The vertex prefix remains **“V3”**. The continuation sends one bounded rawKeyDown/char/keyUp sequence per printable character and requires actual trusted keypress/input/change observations plus the resulting selected value. It sends no Home, arrow or Enter key, changes no DOM value, and calls no application handler or solver directly. Unexpected Apply clicks or form submits are failures.

The only future native product work is the unfinished L2–L5: load the fractional example once, inspect V3, receive the three original downloads, reopen the installed URL, and verify integrity and owned-child closure. The original installed launcher flags, installer, author controls and full earlier mathematics campaign are not invoked again.

Primary source, all at revision `45889d77830582727fe00dbfd614bcb7aac35caa`:

- [Mac select theme](https://github.com/chromium/chromium/blob/45889d77830582727fe00dbfd614bcb7aac35caa/third_party/blink/renderer/core/layout/layout_theme_mac.h)
- [Menu-list keyboard handling](https://github.com/chromium/chromium/blob/45889d77830582727fe00dbfd614bcb7aac35caa/third_party/blink/renderer/core/html/forms/select_type.cc)
- [HTML select typeahead dispatch](https://github.com/chromium/chromium/blob/45889d77830582727fe00dbfd614bcb7aac35caa/third_party/blink/renderer/core/html/forms/html_select_element.cc)
- [Printable prefix matching](https://github.com/chromium/chromium/blob/45889d77830582727fe00dbfd614bcb7aac35caa/third_party/blink/renderer/core/html/forms/type_ahead.cc)

## Diagnostics, preservation and closure

The original driver receipt contains one untimed, unqualified “owned CDP websocket error.” It has no recorded phase, so this note assigns neither its cause nor its timing. Chrome stderr also retains an allocator-loaded-multiple-times diagnostic and six CVDisplayLinkCreateWithCGDisplay errors with CVReturn -6670. Those messages are preserved; they are not established causes of the select failure or transport observation.

Browser.close completed. The created Chrome group was retired after empty scoped census, both original launcher groups had already closed, and the final driver census was empty. The outer supervisor independently recorded Node reaped and its owned group absent.

The first driver's `installedAfter`, `retainedInputsAfter` and `runtimeAfter` fields are absent because its L5 code was not reached. Separate original supervisor evidence supplies preservation: independent Python parsing of the exact raw supervisor confirms equality of all fourteen installed-file, six helper-source and four runtime-file before/after maps. Native nanosecond integers were handled losslessly. This is a supervisor preservation finding, not a retrospective L5 pass.

All seven immutable top-level artifacts named in the original driver receipt were recovered once from their exact native paths and matched their pre-existing byte count, SHA-256 and Git identities. The receipt was recovered under the same rule. A missing terminal LF was restored only when that one restoration uniquely matched all three identities. No JSON or stream was reserialized, and the three zero-length streams remain explicit zero-byte artifacts. Original profile/tmp contents were not read.

The original whole receiving-root measure was 2,857,502 bytes before the 32,788-byte final supervisor receipt. A future outer budget reserves four MiB for that sealed epoch and permits at most sixty MiB in the new continuation tree. This is a conservative accounting bound based on the original measure, not a fresh census of the original profile.

## Durable evidence

All identities below are inert Git blobs in `Jacob-Met/RecallWeave`.

| Evidence | Bytes | Git blob |
| --- | ---: | --- |
| Original raw failed receiver receipt | 60,658 | `df4aa070aa79b0394b6f8ac84c31ceb681ab3f04` |
| Original raw root supervisor receipt | 32,788 | `8430aaf3e29527723b473dca9e01b30110917f9e` |
| Complete first-epoch custody index | 9,392 | `5d212636808abb982a986b0721d7babe219fc597` |
| Executed first receiver source | 47,322 | `77f12825b480ed98a131f7430a483e6d147898bc` |
| Original receiving plan | 16,446 | `0fa25ecd260bbffb80d2e7ee55d27ea8c062a3e8` |
| Before-code continuation freeze | 12,473 | `dfd2eb3d9dede88fe747ffdb8d2e892ed5c9f6d7` |
| Unexecuted ambiguous-prefix draft | 56,942 | `c9438eae0e825c668f41b849973f32cf56761633` |
| Narrow unique-prefix amendment | 4,801 | `75c50d1e72ab98912be376bfa4770bc42e7bf601` |
| Corrected continuation source | 57,288 | `0f654871b830adf7e41d4243a9935cf9dd9a0ce7` |
| Corrected continuation plan | 24,340 | `134d66dbf1ceb54b8e87b857b81fc3405ace70c0` |

This note reports the closed first attempt and the prepared continuation. It asserts no later browser outcome, normal desktop-open/Finder acceptance, physical keyboard use, persistent/default-profile state, or service/Hub adoption.
