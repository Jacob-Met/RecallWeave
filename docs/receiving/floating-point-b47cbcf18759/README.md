# Floating-point course receiving evidence

This additive course and explorer belongs to the existing RecallWeave project. It uses the existing `recallweave-deck/1` parser and the existing learner's import flow. It does not change the importer, model, lesson editor, default deck, catalog manifest, workflows, or another course.

## Source and ownership

- External actor: `chatgpt:b47cbcf18759:estate_production`.
- Native conscience claim: `claim:recallweave-floating-point:b47cbcf18759`, sequence 4355, event `cev_eb818cf9461348d29da5094f`.
- Observed native source base: `98d43c30b3e0d8cc488339b6979867cb93f9586f`, tree `a5bbf78bc3faba7be3787e94c7b1a9271cd4dde2`.
- Isolated native checkout: `/home/jacob/recallweave-floating-point-b47cbcf18759`, branch `work/floating-point-b47cbcf18759`.
- Actual importer read before authoring: `src/deck.mjs`, SHA256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`.

The native checkout was populated from an existing local repository containing the exact source objects. Checkout and clean baseline checks succeeded. The local fetch also warned that its remote tracking ref was not updated because shallow roots were not allowed to be updated. The exact checked-out commit is established; complete history and a successfully populated tracking ref are not claimed.

## Numerical boundary

The core starts with finite JavaScript Numbers and models explicit binary32 rounding. Its exact fractions decode the actual input or stored value. They are not an arbitrary-precision parser for the author's decimal text.

The geometry fixture preserves the original hamon-engine regression: local binary32 vertices derived from `(0,0), (1.4,1.6), (2.6,3.4)`, a wider translation by `(10000000,10000000)`, and binary32 output storage. The resulting relative vertices are `(0,0), (1,2), (3,3)`, giving exact signed double area `-3` while the source sign remains positive. The bounded integer origins and power-of-two unit changes keep the intermediate wider additions exact in this fixture.

The lesson distinguishes input quantization, arithmetic rounding, cancellation exposing earlier error, finite range, output fidelity, and a stated perturbation model for conditioning. A sign check is not a position or shape error bound. The local-origin alternative protects the edges only while that representation remains separate.

## Independent numerical receiving already executed locally

The original root-authored driver and receipt are retained byte-for-byte as `root-independent-numerical.mjs` and `root-numerical-receiving.json`. The receipt binds core SHA256 `34346c16c71eab9560e246e5cfce2f7c65ab7d181e8b1ad876fc52021549c15a` and records actual local Node `v24.19.0`.

Thirty checks passed, including twenty hardcoded binary32 boundary vectors and a separate integer-lattice geometry oracle. That oracle independently quantizes on a fixed `2^-31` lattice and checks eighty selected origins across all seventeen supported unit exponents: 1,360 cases, with 1,173 preserved, 119 collapsed, and 68 reversed windings. These are specific tested cases, not a universal proof or an empirical learning outcome. The driver does not use the production rational decoder as its expected-result implementation.

To replay that independent check while preserving the historical receipt, provide both paths explicitly from the repository root:

```sh
node docs/receiving/floating-point-b47cbcf18759/root-independent-numerical.mjs \
  src/floating-point.mjs /tmp/floating-point-independent-new.json
```

The owned thirteen-test core suite also passed locally. Its coverage includes adjacent values, halfway directions, signed zero, subnormal and overflow boundaries, exact rational references, association controls, the original triangle, deformed-but-same-winding and collapsed controls, invalid parameters, and reproducible report serialization.

## Initial checkpoint and subsequent receiving

The local numerical checks and source/content review are complete. The native core file was persisted before a subsequent Remote Desktop Commander timeout. The later native test transfer's execution outcome is unknown; it must be read back before any replay.

At the initial checkpoint, the exact existing importer was not available in the local staging directory, so importer admission and standalone build parity were still pending. The available local Playwright package has no installed Chromium executable. No browser pass, native test pass, current-main reconciliation, publication, or delivery is inferred from that checkpoint.

The actual unchanged importer was subsequently recovered from `/Users/me/hamon-recall-catalog-peer-965d2e86e979/baseline/src/deck.mjs`. Its bytes match the previously read `98d43c3` importer at SHA256 `621438c166ec4bfafd9d87c698a1d46cb1722f4fb92dcbb8d9f52fce682c338b`. The retained peer intake identifies the broader learner snapshot as `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, tree `fec13a2ab7d1a5da29689664281a4af182d137a8`. An identical importer does not by itself establish that every learner module equals the newer source base.

Using those real importer bytes, all three local course/build controls passed: admission with unchanged question content and canonical answer mapping, independent selected-answer expectations after option permutation, and deterministic standalone build with the identical admitted embedded lesson and syntactically complete script. `local-importer-and-build.json` and its adjacent logs retain the first such run. A subsequent license-only course adjustment and companion-link addition also passed the same three controls. The final course introduces no additional reuse-license grant, matching the observed existing lesson convention.

The existing `numerical-precision` course and core were reviewed read-only at `/Users/me/hamon-recallweave-model-573ab753d9af/source`. Their SHA256 values are `7593052ae2eaf3434397d8e733bc0b3538dbfa30b8d274cfd7dd38ff5e48cb09` and `2b41168654830222766a2162328abe968c7be8fd68407e7a83247247692f2022`. That owner implements bounded exact decimal text to binary64 addition/subtraction discrepancy analysis. It does not implement the binary32 storage, neighbor/range controls, or transformed-geometry experiment added here. This course links its original companion location and preserves all of its source. The overlapping introductory facts are prerequisite connections, not a claim to originate general floating-point concepts.

Native browser controls and the downloaded lesson's real learner import remain pending until an existing private browser process can be admitted within the observed resource constraints. A Mac receiving packet may contain the exact retained `9b69c9c1` learner snapshot; any such run must name that receiving snapshot explicitly and leave final source reconciliation separate.

The existing native coordination and source repository remain the authoritative receiving route. All prior mesh qualification and publication seals stay immutable.
