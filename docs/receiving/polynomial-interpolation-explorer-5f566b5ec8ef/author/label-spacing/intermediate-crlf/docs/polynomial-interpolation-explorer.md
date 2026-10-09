# Polynomial interpolation — offline browser explorer

Open `courses/polynomial-interpolation-explorer.html` directly in an existing modern browser. It requires no server, installation, account, storage or connection.

The mathematical model and original 18-question course belong to the accepted estate-e82707f2bc62 contribution for RecallWeave issue172. This receiving increment adds an editable browser interface. The core, original command, accepted corrected course and worked guide remain byte-exact. The original archive and prose-successor are retained separately; no earlier qualification is reattributed to this interface.

## Work through a selection

1. Choose a starting example, or enter 1–8 sample rows. Enter x and y separately. Row order is the order used by the Newton basis and divided differences; it is never silently sorted.
2. Optionally enter up to 16 query x values, one per line. A wholly blank box means no queries. A blank line among values is an invalid coordinate.
3. Select **Apply experiment**. Samples must have distinct rational x values, so `1/2` and `0.5` cannot both serve as sample nodes. Accepted integer, fraction and decimal forms and bounds are listed next to the form.
4. Inspect every exact table: raw/reduced inputs, the complete divided-difference triangle, Newton coefficients with their factors, ascending monomial coefficients, reproduction at all nodes and each query result.
5. Download the accepted observation if needed. It contains the original model's complete exact record, not merely the values currently visible in a scrolled table.

Any edit, row addition/removal or preset selection retires the old calculation and its observation download. Invalid Apply leaves the draft intact with an error. Repairing the draft requires another explicit Apply. Course and worked-guide downloads remain available while a draft is pending or invalid.

The graph is an approximate floating-point drawing with separately scaled axes. Curves are sampled at 161 plotting points and may lose detail or suffer cancellation, especially for extreme coordinates and high-degree forms. Marked sample nodes and queries are converted to approximate positions. The graph never supplies exact values or the inside/node/outside relation. If finite drawing coordinates cannot be formed, only the graph is omitted; the exact results remain. Consult the exact table and original worked guide.

The polynomial passes through supplied points exactly; that is not evidence that the points are accurate or that an unknown function agrees elsewhere. An inside-range evaluation does not supply an error bound. An outside-range evaluation is extrapolation, not a forecast. A one-sample polynomial is constant. A zero polynomial has undefined degree; a nonzero constant has degree 0. More supplied nodes need not increase the actual degree.

## Continue in the existing learner

Download **original course**, then open the neighboring `demo.html` through the page's local learner link. Choose **Bring your own lesson**, select the downloaded JSON, review its preview, and explicitly start it. The original 18 questions, explanations and transfer prompts are unchanged, including the accepted explanation-only successor. The worked-guide button downloads the exact original Markdown.

The experiment is not automatically imported into a learner session. Observation JSON is a complete mathematical record, not an accepted imported lesson or a resume file. This explorer neither stores user data nor changes the learner's behavior.

## Source and receiving limits

Accepted core SHA256: `8647e22022f5809d1b72ed0a5e37ca74f7f12463efa9b80b18415112631a4037`.
Accepted course SHA256: `1c06eb1ee07b4fe48f41a760a14c240d486479fbf1f1624e6d2d239993ee6649`.
Original worked guide SHA256: `6bc5e287e7d66a4ee8b89f25650d7c726ec7a1696728599c164ac0a180cfe3d8`.

The builder pins those three original sources, validates the course with the unchanged current parser, and embeds exact course/guide text in one direct-open HTML file. `node tools/build-polynomial-interpolation-explorer.mjs --check` compares the generated page without writing. New interface checks run separately from the original mathematical/CLI suites.

The native source is an explicitly declared 11-file receiving projection plus the new interface. It is not a full current repository clone. Original current-main identity, full tree metadata, archives, owner/root evidence and both setup phases are retained. Source refs/PR/main/Actions remain subject to the current standing hold; native evidence is not hosted CI or deployment.

Tables intentionally scroll on a narrow screen. Printing does not guarantee that every wide table fits a page; use HTML and the full observation JSON for complete retained values. No participant study, learning-effectiveness result or human usability claim is made.
