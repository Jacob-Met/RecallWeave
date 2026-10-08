# Traceable measurements: follow a result back to its samples

A number becomes useful when you can tell where it came from, which clock it uses, what its sign means, and whether it is available at all. This original course practises those decisions with six software-produced event records from one public motion-capture recording. You do not need anatomy or gait-analysis training: the movement labels are identifiers in a data table, and the questions concern research literacy.

The course has **12 questions across six connected concepts**. Basic multiplication, division and reading a table are enough. Each question supplies the facts it needs. The examples support interpretation of this recorded computation; they do not establish physical contact accuracy or a person's clinical status.

## Open the lesson

1. Download `courses/traceable-measurements.json` from this repository.
2. Open RecallWeave's existing `demo.html`, or its normal local web application.
3. In the lesson picker, choose that JSON file. Check the title, question preview, attribution and license.
4. Select **Start this deck**, then start the lesson. A preview can be cancelled without starting a new lesson.
5. Answer each question before reading its explanation. At the end, review your first answers, write an application reflection, and use the existing practice round for missed questions. **Download study notes (.txt)** downloads your local review and reflections.

Answer and question order may vary. The checks below refer to question IDs and data fields, not display letters. RecallWeave's estimates are illustrative model state, not a validated assessment of ability. Practice and reflection are recorded separately from the original answers. The course needs no additional application or account.

The human-editable authoring record is `traceable-measurements.source.json`. Its `deck` object follows the existing `recallweave-deck/1` contract; the surrounding measurement case preserves source facts outside the learner's content schema. To regenerate or check the importable file:

```sh
node tools/build_traceable_measurements.mjs
node tools/build_traceable_measurements.mjs --check
node --test tests/traceable-measurements-course.test.mjs
```

The course builder calls RecallWeave's existing author codec and validator. It does not change the learner, knowledge model, shared builder or catalog.

## 1. Keep a chain from input to result

The case begins with the **Innovative Sports Training “Gait with EMG.c3d”** member of C3D.ORG's public Sample00 archive. The received example creates a bounded analysis derivative: it selects a window, maps marker names and axes, and converts declared marker coordinates from metres to millimetres. The unchanged analysis pipeline then processes that derivative with an explicit setting.

| Stage | Evidence to keep | Why it matters |
| --- | --- | --- |
| Original recording | Publisher URL, archive member, byte count and content hash | Identifies the input actually read. |
| Analysis derivative | Its own byte count and hash, plus the crop and transformations | Makes changes between representations auditable. |
| Software run | Code identity, settings, refusal or success, and report hash | Connects a computation to its outputs. |

A filename can be reused for different bytes. A source hash identifies content; it does not encode algorithm settings. Here, the normal minimum peak distance of **85 marker samples** refuses analysis with one right and one left heel-strike label. Calling the existing API with **51 samples** produces the six records below. Both observations belong in the record. More labels are not evidence of greater accuracy.

The retained point interval is zero-based and half-open: **[1, 134)**, containing 133 marker samples. The analog interval is **[18, 2412)**, containing 2394 samples. Marker coordinates are mapped as `[-source_Y, -source_X, source_Z] × 1000`; the inherited alignment step returns analysed coordinates to the original XYZ orientation, scaled to millimetres. Marker-name correspondences were checked against source anatomical descriptions. No interpolation or resampling was applied.

These operations create an input for this bounded example. They are not a general conversion or calibration of every acquisition component. C3D's POINT:UNITS documentation distinguishes declaring a unit from numerically converting coordinate values; source and transformation evidence are both needed.[1]

**Try it elsewhere:** for a spreadsheet, sensor export or image-analysis report, record the input identity, transformation, code/settings and output identity. Which of those facts does a familiar filename fail to preserve?

## 2. State the clock before converting an index

A sample index is a position in a particular array. With uniform rate `f`, zero-based retained index `k`, and retained index 0 at elapsed time 0:

```text
retained-relative time = k / f
source-relative time  = (k + removed source samples) / f
```

For the event at retained marker index **27**, the rate is 60 Hz and one earlier source marker sample was removed:

- Relative to the retained start: 27 / 60 = **0.450000 s**.
- Relative to the original loaded source start: (27 + 1) / 60 = **0.466667 s**, rounded to six decimals.

These describe the same event under two stated origins. They are not wall-clock timestamps. The report does not preserve original acquisition-frame labels. Two unrelated files that each say “0.45 s” do not thereby identify the same physical instant: the start-time and crop relationships are still missing.

Do not confuse sample count with last-sample time. A retained sequence of 133 zero-based samples ends at index 132. Its final timestamp is 132 / 60 = 2.2 s. The quantity 133 / 60 describes 133 sampling intervals, not the timestamp of index 132.

## 3. Align sampling grids with explicit assumptions

The marker rate is **60 Hz**, the analog rate **1080 Hz**, and their ratio is:

```text
1080 / 60 = 18 analog samples per marker interval
```

For these exercises, the original grids explicitly share time zero and are uniformly sampled. This is an assumption of the problem; two rates alone do not prove it.

Removing one marker sample therefore means removing **18 analog samples** to retain the same elapsed-time start. After this aligned crop, retained marker index 59 maps to:

| Coordinate | Calculation | Index |
| --- | --- | --- |
| Retained analog array | 59 × 18 | 1062 |
| Original analog array | 1062 + 18 | 1080 |

Both describe that timestamp under the common-origin assumption. Physical delays, drift, missing samples or independently started acquisition would require additional evidence; the rate ratio does not estimate them. The course does not ask you to infer aliasing, design a filter or assess timing uncertainty.

## 4. Read the actual event records as records

This is a selected projection of the pinned report. These are software outputs, not annotated reference contact events. L/R identify sides; HS and TO are the pipeline's heel-strike and toe-off labels. “MOS” names a computed margin-of-stability field; here, you need only its documented units and reference identity.

| Event ordinal | Label | Within-detector ordinal | Retained marker index | Time from retained start (s) | MOS ordinal | MOS reference foot | Signed AP (m) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | LHS | 0 | 27 | 0.45 | 0 | R | -0.04901354633425304 |
| 1 | RHS | 0 | 59 | 0.9833333333333333 | 1 | L | -0.06990720917101252 |
| 2 | LTO | 0 | 66 | 1.1 | null | null | null |
| 3 | LHS | 1 | 92 | 1.5333333333333334 | 2 | R | -0.04508261779419264 |
| 4 | RTO | 0 | 99 | 1.65 | null | null | null |
| 5 | RHS | 1 | 126 | 2.1 | 3 | L | -0.06689641526010673 |

Several indices can be correct at once. In the last row, `event_index = 5` addresses the combined event list; `detector_index = 1` addresses the RHS detector's array; `mos_index = 3` addresses the native MOS sequence. Marker index 126 addresses a time sample. Using the wrong index can associate a valid number with the wrong record.

The first row has detector side **L** and MOS reference foot **R**. They answer different questions: event-label side and the reference foot selected from toe geometry. That pair is not, by itself, evidence that left and right were accidentally exchanged.

Terminal same-side events have no following same-side event within this window. Their interval fields are unavailable. Their labels and sample positions remain present; the missing interval is not zero.

## 5. Preserve signs and name the summary operation

Unit conversion multiplies a signed scalar by the conversion factor; it does not choose a new sign. The first actual event has:

```text
-0.04901354633425304 m × 1000
= -49.01354633425304 mm
≈ -49.014 mm
```

Native event MOS retains signed metres. The stated summary instead uses **absolute magnitudes** in millimetres. For the four available AP events, its mean absolute magnitude is **57.724947139891235 mm**. Comparing that positive summary directly with a negative event value mixes operations.

A separate **fictional** pair makes the distinction visible: −0.04 m and +0.02 m. These are authored comparison values, not additional observations from the public trial.

| Operation on the fictional pair | Calculation | Result |
| --- | --- | --- |
| Signed mean | (−0.04 + 0.02) / 2 | −0.01 m |
| Mean absolute magnitude | (0.04 + 0.02) / 2 × 1000 | 30 mm |
| Absolute value of the signed mean | abs(−0.01) × 1000 | 10 mm |

Taking absolute values before averaging generally differs from doing so afterwards. All four actual AP values happen to be negative; that set alone would not demonstrate the difference in magnitude. The fictional comparison is labelled to keep it separate from observed data.

## 6. Separate unavailable values, nonfinite results and measured zero

The LTO row at retained sample 66 keeps its label and clock, but `hcv_mm_s` is `null`. That field appears in `unavailable_fields`, while `nonfinite_fields` is empty. The exporter associates heel-contact-velocity (HCV) entries only with interior RHS records. HCV is inapplicable to this toe-off row under that contract.

| Representation and context | Supported reading |
| --- | --- |
| Numeric 0 in an applicable measured field | A numeric zero was recorded; units and measurement validity still require context. |
| `null` with an unavailable field | No applicable/available value is supplied. Inspect the field's contract and reason. |
| Field listed in `nonfinite_fields` | A nonfinite numerical result was explicitly identified. Do not infer this from every `null`. |
| Label and sample index with unavailable auxiliary fields | The event can remain present when an associated measurement is unavailable. |

The inherited force-mean calculation returned **0 kg**, but this result is excluded from interpretation. Source-declared vertical channels span F1Z **−0.37841796875 to 0 N** and F2Z **−0.3564453125 to 0.0048828125 N**. The file declares two type-4 force platforms, and this processing applies no calibration matrix. Unit labels do not establish physical scaling. The short overground pass is an additional limitation of the estimator. This computation does not establish the person's body mass.

The supported outcome is useful and specific: the stated pipeline, input and setting emitted six software labels and the associated values. There are no reference contact annotations here, no calibrated-force qualification, and no clinical validation. W3C PROV's distinction between entities and the activities that produce them provides background for documenting the chain; it does not replace the actual evidence.[2]

## Worked checks after the lesson

| Question ID | Check to carry to another dataset |
| --- | --- |
| `trace-source-configuration` | One input identity can have different settings and outcomes. |
| `trace-source-lineage` | Keep both content identities and the transformations, code and settings. |
| `trace-clock-crop` | State the origin: 27/60 and 28/60 answer different clock questions. |
| `trace-clock-alignment` | Equal relative times do not establish simultaneous events across independent files. |
| `trace-grid-crop` | Under a common origin, a 60 Hz interval spans 18 intervals at 1080 Hz. |
| `trace-grid-index` | Retained marker 59 maps to retained analog 1062 and original analog 1080. |
| `trace-signed-units` | The converted event value is −49.014 mm, retaining its sign. |
| `trace-absolute-summary` | Signed mean −0.01 m; mean absolute magnitude 30 mm; abs(mean) is different. |
| `trace-reference-foot` | Label side and geometry-selected reference identity are separate fields. |
| `trace-three-indices` | Use detector ordinal 1 for the RHS array, not event, MOS or sample index. |
| `trace-unavailable-zero` | Inapplicable toe-off HCV is not measured zero or necessarily nonfinite. |
| `trace-supported-claim` | State the software outcome without adding clinical or calibration conclusions. |

**Application reflection:** choose a result table you work with. Write one sentence for its input identity, one for its time origin, one for its unit/summary operation, and one for an unavailable value. Name an attractive conclusion the available evidence does not yet support.

## Sources, reproducibility and use

Data facts come from the published, received report and its exact example. They are not additional measurements made by this course.

| Artifact | Exact identity |
| --- | --- |
| Public archive | [C3D.ORG Sample00.zip](https://www.c3d.org/data/Sample00.zip), member `Innovative Sports Training/Gait with EMG.c3d` |
| Original recording | 376576 bytes; SHA-256 `f4030190c25bfd34fc99b2979c80e3498f11347ee294d863b3c642710526abec` |
| Analysis derivative | 134144 bytes; SHA-256 `b5767714eaad342ddb66a7978a49e80bcf8fba4966219663baa91cf2ec8bf216` |
| [Published report](https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/38c5cce04cef4782b6ff3b6e34c9437c86a34d22/docs/receiving/public-c3d-9d2f71701d2e/event-records/analysis.json) | 9779 bytes; SHA-256 `e7eabec7cf886a3c1ab5f21eaf6536f6be6ad5fab2498e756e8f93ecad1adb75` |
| [Received example](https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/38c5cce04cef4782b6ff3b6e34c9437c86a34d22/analysis/python/examples/public_c3d_trial.py) | SHA-256 `1d3ff6e5ea88eb77053fdf00d9da78d00d4aac24495731d32205ad485d2c9667` |
| [Exporter contract/source](https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/d047c0892626cf2740dcce37db210e1b768e8f06/analysis/python/stroke_gait_analysis/event_export.py) | Original owner commit `d047c0892626cf2740dcce37db210e1b768e8f06`; module SHA-256 `e434703d652513630c61e4bb8c16d773b7bf228308d2360cf9152ec081f4ad35` |

Report and example URLs use immutable commit `38c5cce04cef4782b6ff3b6e34c9437c86a34d22`. The exporter was received through [SRS integration PR 31](https://github.com/Jacob-Met/srs-vicon-gait-analysis/pull/31). The [report integration note](https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/38c5cce04cef4782b6ff3b6e34c9437c86a34d22/docs/receiving/public-c3d-9d2f71701d2e/INTEGRATION.md) explains its execution and receiving limits.

[1] [C3D POINT:UNITS](https://www.c3d.org/HTML/Documents/pointunits.htm), primary format documentation, for declared units versus changing coordinate values. The [sample-data page](https://www.c3d.org/sampledata.html) identifies the archive.

[2] [W3C PROV-Overview](https://www.w3.org/TR/prov-overview/), W3C Working Group Note, 30 April 2013; general provenance background. The questions, prose and worked examples are original.

**Use and limits:** Original lesson wording and authored exercises are released under CC0-1.0. Displayed computed numbers are factual results with their source identified. This addition contains no original or derived C3D and grants no redistribution license over the publisher's recording or referenced documents. It makes no clinical, calibration, event-accuracy or learning-efficacy claim.
