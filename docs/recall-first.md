# Recall first, then compare

Open `recall-first.html` directly in your browser. It works offline without a server, installation, account, API or automatic storage.

Choose **Start this course** for the bundled energy-in-cells lesson, or select a local RecallWeave course JSON. Read the title, question count and source credits in the preview before starting. Starting a different course replaces your current practice in this tab; cancelling its preview keeps your current work.

For each prompt:

1. Explain the idea before seeing the reference. Write up to 4,000 UTF-16 code units in **Your answer**, say it aloud, or think it through. Some symbols such as emoji count as two units.
2. Select **Reveal and compare**. Compare your reasoning with the original course's correct option, explanation and transfer prompt. The page does not automatically assess your answer.
3. Choose **Ready for now** or **Revisit**. These are your self-reported study decisions, not a correctness score or mastery estimate. Either choice advances to the next prompt.

The first pass uses every course question exactly once in its original order. At the end, inspect your written attempts or choose **Revisit marked prompts** for one additional pass through the prompts you marked Revisit. Their references start hidden again. Your first and revisit attempts are retained separately in the summary. There is no automatic loop: anything still marked Revisit after the second pass is a suggestion for another study session.

**Start over** asks before clearing your attempts and restarting the same checked course. **Keep my work** cancels. Reloading or closing the page clears all work and returns to the bundled-course preview. There is no saved-session importer or connection to the main learner's answer history, writing restore, adaptive selector or model.

The prompts keep their original wording. Some multiple-choice questions depend on their choices; reveal the reference when needed. This experience hides references in the rendered prompt card. A directly openable offline page necessarily contains its bundled answers in its source, so it is a study aid rather than a secure assessment.

Course files must be valid UTF-8 JSON and at most 262,144 raw bytes (256 KiB). Admission reuses the unchanged RecallWeave deck validator. Invalid, oversized or cancelled file selections leave current work intact. A valid file is only a preview until you explicitly start it. Imported text is displayed as text, and credits and license remain visible.

Rebuild the standalone page from the small source modules, template, stylesheet and exact existing bundled deck:

```sh
node tools/build-recall-first.mjs
node tools/build-recall-first.mjs --check
node --test tests/recall-first.test.mjs
```

The builder requires only Node's built-in modules. It does not fetch content. The original `src/deck.mjs` and `data/deck.json` remain unchanged.
