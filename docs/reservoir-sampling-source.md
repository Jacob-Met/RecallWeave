# Reservoir companion source

This additive companion is derived from RecallWeave canonical commit
698902f9c9c1d5c5023092b85b3632a7cb7a01ed. It leaves the original learner,
deck parser, catalogs, workflows and all existing source leaves unchanged.

Use Node.js 22 or later. No package installation is required.

```sh
node --test tests/reservoir-sampling.test.mjs
node --test tests/reservoir-sampling-course.test.mjs
node tools/build-reservoir-sampling.mjs
```

The builder validates the original lesson through src/deck.mjs and embeds the
core, interface, exact lesson JSON and guide into
courses/reservoir-sampling-lab.html. Open that HTML directly. The unchanged
demo.html at the parent directory is the lesson learner. The generated HTML
is committed so opening the product does not require Node.

The mathematical core accepts explicit legal draws and enumerates finite
histories; it never calls a random generator. Its public results are copied,
deeply frozen JSON values. The UI retains raw applied text in observation
downloads and retires the result immediately on draft edits.

The course and guide credit Algorithm R to Alan Waterman as reported by
Vitter. Questions and explanatory text are original CC0-1.0 material.
The independent receiving records distinguish exact deterministic trace
checks, complete subset/marginal counts, lesson reasoning, actual browser
behavior and source custody. A mathematical check is not a classroom
effectiveness study.

The delivery's source archive is a complete runnable closure. Native Git
custody preserves the full original tree references, but its inherited
sparse object store may lack unrelated original blobs. This is recorded
explicitly in the source offer; it does not affect the included closure.
At the native source freeze, no hosted workflow or remote publication had
been invoked. Later source storage or adoption has a separate receiving and
publication record; the native freeze does not assert that later state.
