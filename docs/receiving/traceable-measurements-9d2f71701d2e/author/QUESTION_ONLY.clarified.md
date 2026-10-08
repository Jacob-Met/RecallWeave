# Independent question-only review: Traceable measurements

This packet omits every answer index, explanation and transfer rationale. Please derive the correct options independently and flag any ambiguous wording, unsupported factual assertion or duplicate valid answer. Canonical A–D positions here may be shuffled in the learner.

## Case facts

The frozen report SHA-256 is e7eabec7cf886a3c1ab5f21eaf6536f6be6ad5fab2498e756e8f93ecad1adb75. It was computed from the public C3D.ORG Sample00 IST recording. The original SHA-256 is f4030190c25bfd34fc99b2979c80e3498f11347ee294d863b3c642710526abec; the analysis derivative is b5767714eaad342ddb66a7978a49e80bcf8fba4966219663baa91cf2ec8bf216. Source/derivative recordings are not included.

- Original point interval [1,134) and analog interval [18,2412) were retained: 133 marker samples and 2394 analog samples, with unchanged 60 Hz and 1080 Hz rates. Coordinates were mapped from declared metres to millimetres for a bounded analysis input. No resampling or interpolation was applied.
- Retained marker index 0 is relative time 0. The recorded source-crop offset is 1/60 second. These relative clocks do not contain wall-clock or original acquisition-frame labels. The paired-grid exercises explicitly assume a common original time zero.
- Default peak distance 85 samples refused with RHS=1, LHS=1. Explicit existing-API peak distance 51 samples produced the six records below. There are no reference contact annotations in this receiving.
- Detector side is the event-label side. Native MOS reference foot is selected separately from toe geometry. HCV associates only with interior RHS; native event MOS is signed metres, while the stated summary uses absolute magnitudes in millimetres.
- The raw recording declares two type-4 force platforms. Source-labelled vertical channels span F1Z −0.37841796875 to 0 N and F2Z −0.3564453125 to 0.0048828125 N. No plate calibration was applied. The inherited force-mean calculation returned 0 kg.

| Event ordinal | Label | Detector ordinal | Retained sample | Time from retained start (s) | MOS ordinal | MOS reference foot | Signed AP (m) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 0 | LHS | 0 | 27 | 0.45 | 0 | R | -0.04901354633425304 |
| 1 | RHS | 0 | 59 | 0.9833333333333333 | 1 | L | -0.06990720917101252 |
| 2 | LTO | 0 | 66 | 1.1 | null | null | null |
| 3 | LHS | 1 | 92 | 1.5333333333333334 | 2 | R | -0.04508261779419264 |
| 4 | RTO | 0 | 99 | 1.65 | null | null | null |
| 5 | RHS | 1 | 126 | 2.1 | 3 | L | -0.06689641526010673 |

The LTO at sample 66 HCV field is null; hcv_mm_s is in unavailable_fields and nonfinite_fields is empty. The fictional signed pair −0.04 m, +0.02 m appears only in question 8; it is not additional measured data.

## Questions

### 1. trace-source-configuration

Two runs record the same source-file SHA-256 and byte count. Run A uses a minimum peak distance of 85 marker samples and refuses analysis. Run B uses 51 samples and emits six event labels. What does the shared source pin establish in this comparison?

A. The identical source pin guarantees identical detected event labels.

B. They record the same input identity, with different analysis settings.

C. The changed peak setting proves that the input file bytes changed.

D. The run with more labels establishes the actual ground-contact times.


### 2. trace-source-lineage

An analysis derivative is built from an original recording: declared marker metres are converted to millimetres, marker names and axes are mapped, and the first marker sample plus 18 analog samples are removed. The derivative has a different content hash. Which record makes this relationship most auditable?

A. Keep only the derivative's familiar filename and replace the original file.

B. Keep only the new millimetre label and omit the actual coordinate conversion.

C. Keep only the six output labels and omit the inputs and analysis settings.

D. Keep both content pins and the exact transformations, code and settings.


### 3. trace-clock-crop

A real exported event has retained marker_sample_index = 27. Retained samples are uniformly spaced at 60 Hz, with retained index 0 at time 0. Exactly one earlier source marker sample was cropped. Relative to the retained start and then the original source start, what are the event times? Round to six decimals.

A. 0.450000 s, then 0.466667 s.

B. 0.466667 s, then 0.450000 s.

C. 27.000000 s, then 28.000000 s.

D. 0.450000 s, then 0.450000 s.


### 4. trace-clock-alignment

Two separately exported recordings each contain an event at 0.45 s from that export's first retained sample. Their source start times and crop offsets are not supplied. Can those two labels alone establish that the events occurred at the same instant?

A. Yes: matching printed seconds establish a shared physical instant.

B. Yes: any two streams measured in seconds have the same time origin.

C. No: the start-time and crop-to-source relationships are still needed.

D. No: times from sampled recordings can never be related to each other.


### 5. trace-grid-crop

For this exercise, the original marker and analog grids share time zero and are uniformly sampled at 60 Hz and 1080 Hz. You remove the first marker sample. How many leading analog samples must be removed to keep the same elapsed-time start?

A. 1 analog sample.

B. 60 analog samples.

C. 18 analog samples.

D. 1080 analog samples.


### 6. trace-grid-index

After the aligned crop of one marker sample and 18 analog samples, retained index 0 on both grids has the same time. Rates stay 60 Hz and 1080 Hz. An exported event is at retained marker index 59. Which pair gives the retained analog index and the original analog index at that timestamp?

A. 1062 retained, 1080 original.

B. 59 retained, 60 original.

C. 1080 retained, 1098 original.

D. 1061 retained, 1079 original.


### 7. trace-signed-units

The actual LHS row at retained marker index 27 has signed mos_ap_m = -0.04901354633425304 m. If you express this same signed event value in millimetres and round to three decimals, which result preserves its meaning?

A. +49.014 mm.

B. -0.049 mm.

C. -49013.546 mm.

D. -49.014 mm.


### 8. trace-absolute-summary

Consider an authored two-event comparison, separate from the measured case: the signed values are -0.04 m and +0.02 m. The stated summary takes the mean of their absolute magnitudes and reports millimetres. What are the signed mean in metres and that absolute-magnitude mean in millimetres?

A. +0.03 m, then -10 mm.

B. -0.01 m, then 30 mm.

C. -0.01 m, then 10 mm.

D. +0.03 m, then 30 mm.


### 9. trace-reference-foot

The actual row at retained marker index 27 is detector = LHS and side = L. It also records mos_reference_foot = R. The export contract defines detector side as the label's side and MOS reference foot as a separate choice made from toe geometry. How should this row be read?

A. The two fields have different meanings: detector L, geometry-selected reference R.

B. The row proves that the exporter accidentally swapped all left and right labels.

C. The reference R makes both the LHS label and its retained sample index unavailable.

D. Both fields name the same identity, so the record must discard one of the values.


### 10. trace-three-indices

The actual RHS row at retained sample 126 has event_index = 5, detector_index = 1 and mos_index = 3. event_index counts all exported events; detector_index counts within that detector's own array; mos_index counts native MOS entries. Which value indexes the RHS detector array?

A. 5.

B. 3.

C. 1.

D. 126.


### 11. trace-unavailable-zero

The actual LTO row at retained sample 66 has hcv_mm_s = null, lists hcv_mm_s in unavailable_fields, and has an empty nonfinite_fields list. This exporter associates HCV only with interior RHS rows. Which reading is supported?

A. A heel-contact speed of exactly zero was measured at this toe-off label.

B. HCV is inapplicable to this exported toe-off row, rather than a measured zero.

C. A nonfinite HCV calculation was necessarily converted to null for this row.

D. The exporter failed to retain the toe-off label and its sample position.


### 12. trace-supported-claim

The source and derivative pins were verified and the stated pipeline/settings emitted six labels. No reference contact annotations were supplied. The recording declares type-4 force plates, its vertical channels have sub-newton ranges, and this processing applied no plate calibration. Which conclusion is supported by this receiving?

A. The six labels establish that the participant has a clinically normal gait.

B. The type-4 plate declaration establishes calibrated physical force measurements.

C. The computed 0 kg force-mean estimate is a valid measurement of the person's mass.

D. This pipeline emitted six labels for this pinned input and the stated setting.

## Primary context

- https://www.c3d.org/sampledata.html
- https://www.c3d.org/HTML/Documents/pointunits.htm
- https://github.com/Jacob-Met/srs-vicon-gait-analysis/blob/d047c0892626cf2740dcce37db210e1b768e8f06/analysis/python/stroke_gait_analysis/event_export.py
- https://www.w3.org/TR/prov-overview/
