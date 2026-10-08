# Binary-search course receiving

This contribution adds **Binary search: precise boundaries**, an original twelve-question course with a worked guide and one focused native test module. It uses RecallWeave's accepted course contract, Deck studio, and learning functions.

The production delta is three new files. The final composition preserves all **242** inherited leaves and modes from current receiving main `a1ecbb83e71abe013c02d92ec3ba5fdf5b9ffbc4` (tree `9e4e37af18a0c9c2868b62710473ac7bd458768d`). The packet adds three receiving files. There is no learner, authoring, model, default-deck, builder, dependency or workflow source change.

## Exact native source

Native source commit: `a1ba93851bffd6d793daf00cb516d4085e223339`. Its tree is `132251fa4767685e583458110100757bb9fa20c7`. The original course commit is `9766875a6bbbac6b65972d52eda5c6ffa3372795`; the later two-line supplement aligns original-content licensing with the existing original probability course in PR19 at `226068c6e04677995b08a683c8997f66be1748b3`.

| File | SHA-256 |
|---|---|
| courses/binary-search.json | b88e88ba249003421c014cec635ac6bbbf2cdd2f4c2f3cc3fcefbba02b153329 |
| courses/binary-search.md | 4db6cea08a08265acf3eba36a172cb674ff3994c9057527463ba8e9fe693ec62 |
| tests/binary-search-course.test.mjs | 8cceedc0f30b798cedf3bd0f5442a24389c59977ca8fe0a3e3004bf276060ebc |

The twelve prompts, answer keys, options, explanations and transfer prompts are exact after the independent content review. The final metadata change affects only the JSON license field and the corresponding guide sentence. CC0-1.0 applies to these original course files; the application and referenced NIST/Python materials retain their existing terms.

## Qualification

- The current-main composition `4ba18f69931c19009ee2c14e222abb6fe2c0652f` passed **71/71 native tests**, zero failures/skips, and reproduced the current demo byte-for-byte. It preserves the newly accepted graph course and biology wording fix. All six contributed paths and thirteen direct authoring/learning dependencies are exact relative to the preceding course receipt; the final authoring browser evidence therefore retains its original execution identity.
- Main passed **50/50** native Node cases. The original final course source passed **55/55**, with no failures or skips. The five new course cases check the shared deck contract and serialization, independent numerical derivations, strict interval progress and bounds, and the actual existing adaptive model, first-review, practice and study-note functions.
- After the license-only supplement, the unchanged focused course module passed **5/5** on exact current source. The preceding full-suite acceptance remains pinned to its original source; it is not relabeled as a new full-suite execution. Hosted CI must qualify the actual published head.
- The existing demo builder passed and reproduced inherited `demo.html` byte-for-byte; the existing author standalone parity check passed in the full native suite.
- An independent reviewer solved all twelve questions before seeing the key. All canonical indices matched. Full explanations, transfer examples, worked guide and both primary references were then independently reviewed. A meaningful equality-question ambiguity and an overbroad guide sentence were corrected and rechecked before acceptance.
- **Nine actual browser groups passed on final source** using existing native Playwright and Chrome for Testing 153.0.8010.12. Desktop HTTP and 390px direct-file authoring each covered actual file selection, preview/cancel, every editor question and answer identity, complete checked preview, real download and reopening. The final group verified all eight renderer sources and the course stayed unchanged, with no external page request or page error. Desktop and phone captures were visually inspected.
- Both actual downloads equal the published serializer's canonical output: **14,169 bytes**, SHA-256 `7632d95fb566b7ae4894e113e8326406680745d7c442b9605fa458c4434cbee2`. The source JSON is 13,885 bytes. Its formatting differs; all parsed content and metadata fields are identical.

These checks concern content correctness and software behavior. They do not establish measured learning effectiveness.

## Sealed evidence and original failures

[receiving.json](receiving.json) records source identity, qualification and the remaining integration boundary. [native-receiving.tar.gz](native-receiving.tar.gz) contains **65 entries** (64 payload files and its manifest); every extracted entry was read back exactly. Archive SHA-256: `cf9c04040922d8a85a4ef9e916fb814c3aa95b5c5e300445c709a3475da00443`.

`pre-license/` preserves all 45 files of native evidence commit `563191e579e48acdce5eb930b80768e7dc11c4a3`: the independent blind review and corrected examples, source custody, original and final native logs, actual downloads and screenshots, and every initial browser harness and failure. `license-supplement/` contains the exact metadata-pattern review, final source receipt, focused native results and the final authoring browser run. `current-main/` adds the exact main composition, 71-case native results, current builder parity and the preserved initial ENOSPC fetch refusal before a same-pin retry succeeded. Historical course versions exist only where needed to preserve the content-review corrections; no full repository snapshot is duplicated.

The first three bare-CDP attempts completed zero course groups. Navigation/document inspection timed out before file input. The diagnostic run proved that the loopback server returned the exact author document; it disproved an earlier suspicion that Node fetch itself was hanging. The successful receiver reused the estate's already verified native browser stack without a package or browser installation. Original failed attempts remain distinct from accepted results.

An early separate explorer sketch was set aside in favor of the accepted content contract. No parallel explorer or builder is included.

## Current interface and remaining learner dependency

This packet qualifies the **current accepted Deck studio preview/export route** and the actual native learning functions. It does **not** qualify a current browser learner-import integration.

The original issue #7 owner retains importer/schema/app/builder ownership. Comment 6059419542 supplies a newer native composition over `4775af91` at `/home/jacob/RecallWeave-receiving-4775-490fcd7c4056`, app SHA-256 `ea0926d962c23715ae885d81f1ab2075b3598692393210197e357bb88f18a7bb`. Its owner explicitly reports qualification underway, not yet accepted/published. Neither that in-progress source nor the earlier historical snapshot is included as a competing implementation or used to claim final current learner acceptance.

When that owner publishes the actual current-main importer, receive this exact course through its explicit preview/start, displayed answer identity, completed review/practice and notes/trace path. Existing generic importer receiving remains with its owner. Source publication, eventual integration and deployment are separate decisions.

## Reproduction

Run the project-native gate from the source checkout:

```sh
node --test tests/*.test.mjs
python3 tools/make_demo.py
git diff --exit-code
```

Extract the receiving archive into a fresh directory. The retained browser harness accepts explicit existing environment paths:

```sh
node /absolute/path/to/extracted/pre-license/check-binary-course-author-playwright.mjs \
  --root /absolute/path/to/RecallWeave \
  --output /absolute/path/to/new-receipt-directory \
  --playwright /absolute/path/to/existing/playwright/index.mjs \
  --browser /absolute/path/to/existing/Chromium
```

Use a new output directory to preserve the prior attempts. The receiver owns only its loopback server, fresh browser contexts and temporary files, which it closes and removes afterward. It adds no application dependency.
