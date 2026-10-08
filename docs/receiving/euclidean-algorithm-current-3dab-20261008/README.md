# Published Euclid course through the current standalone learner

This is a new, bounded integration receiving packet. It preserves the older complete Euclid explorer/math/learner evidence and does not relabel it as execution against a newer app.

Subject: RecallWeave PR118 head 9a74255d1efc273b810f3e9443078a91acd6cb5d, exact explorer SHA c555ed39543f6ee1faf6d428b36fdd9deedec4c3559af38632bc30de147440ba and course SHA 75bd21e98d313d7d2ac99609aa47e86f0463db7cadca5936d60d98512f339fba. The standalone learner is the unchanged current demo.html Git blob cf7eea3792deacc3eb98a22aef539b920fb66746 / SHA c7f1877facf1c62c741373b6bd03b645ec351af3457da06c45988efde805701a. Root checked that learner blob against current main f42ad22e069b5ed3b2d85ea0573b84fef121d254.

The real Chromium 153.0.8010.47 browser physically downloads the course from the published explorer, then supplies that exact completed file to the current standalone learner's native file input. All twelve preview prompts, course identity and concept count match the exact JSON. Preview preserves the default six-question session. An explicit Start event selects the course, and ordinary canonical-answer / Next events continue until euclid-division-3. The full corrected remainder-range wording and its actual explanatory feedback are verified, with a 390px frame.

The native Node 22.22.1 command exits 0 with EUCLID_HANDOFF_OK checks=4 failures=0. Both before/after maps retain all three inputs exactly; observed page requests are file URLs only, with no JavaScript exceptions or blocked HTTP requests. The owned browser exits normally, and only its generated private profile is removed.

This receiving does not repeat the former full explorer, mathematical oracle, practice, archive or modular HTTP route. It does not claim physical mobile hardware. No product source or installed app is modified. The receiver uses the already-qualified private-profile CDP lifecycle, no new dependency or web server.

native-current-handoff.tar.gz contains all three source inputs, exact receiver/controller, source pins, raw command output, browser report/stderr, actual downloaded course and final phone screenshot. NATIVE_MEMBERS.json lists every exact member; assembly reads all archive members back. MANIFEST.json records the top-level packet payloads. The source and native evidence remain in the original uniquely owned ThinkPad directory.
