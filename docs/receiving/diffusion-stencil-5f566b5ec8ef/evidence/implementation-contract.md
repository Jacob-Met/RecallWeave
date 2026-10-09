# Periodic diffusion stencil — frozen outcome contract
Owner chatgpt:5f566b5ec8ef:coordination. Repository Jacob-Met/RecallWeave.
Canonical parent 698902f9c9c1d5c5023092b85b3632a7cb7a01ed, tree d6d3707b691850af7928299242631534cff89aa8.

A learner can inspect an eight-cell periodic, simultaneous explicit diffusion update:
u[j,n+1] = r*u[(j-1) mod 8,n] + (1-2*r)*u[j,n] + r*u[(j+1) mod 8,n].
It is a discrete teaching model. The dimensionless ratio r corresponds to kappa*dt/dx^2 in a forward-time centered-space heat-equation discretization; the lab does not fit material parameters or establish PDE accuracy from one grid.

Model API computeDiffusion({values, numerator, denominator, steps}).
values is a dense array of exactly 8 Number integers in [-20,20], numerator an integer in [0,16], denominator an integer in [1,16], numerator<=denominator, steps an integer in [0,24]. Reject bool, string, NaN, infinity, fractions, holes and out-of-range values before calculating. Negative zero is accepted as mathematical zero. Unknown object fields do not change results.
Internal arithmetic is reduced BigInt rational, with exact JSON-safe decimal numerator/denominator strings. No mutation of input; recursively frozen detached output.
Retain original admitted input spelling as Number integers plus canonical reduced r. Return all rows including step0, exact values/sum/mean/min/max/squared deviations from the conserved mean, and each next row's 8 contributions (left, center, right indices, previous values, weighted terms, sum).
Return the exact alternating-mode multiplier 1-4*r and weights. The boolean convexWeights holds precisely when 0<=r<=1/2; for this even periodic grid this also bounds every Fourier multiplier in [-1,1]. Do not claim strict damping at r=0 or r=1/2: the latter preserves the amplitude of the alternating mode with sign reversal. r>1/2 has a growing alternating mode, but constant data still stays constant. A preserved sum alone does not imply stability.
The model labels only mathematical properties of this scheme. Exact tables accompany approximate SVG coordinates. Signed values are dimensionless deviations, not temperatures forced nonnegative.

Standalone offline UI: 8 labeled integer inputs, exact ratio numerator/denominator, step-count input and explicit Apply. Initial preset is a single pulse at cell0, r=1/4, 8 steps. Presets include constant, alternating stable, alternating boundary and alternating growing.
Any draft edit immediately retires navigation/observation download while visibly retaining prior applied results. Apply reads every field as one snapshot; refusal preserves the previous result with a useful error and disabled observation export. Preset changes only populate draft; explicit Apply accepts it. Selected row and cell controls inspect the accepted result without recomputing/changing its inputs. Show wraparound neighbors and all weighted terms from the previous row. Step0 has no transition.
Fixed original lesson and guide downloads are independent of draft validity. Observation download is the entire accepted model result plus current selected row/cell, not only graph points. No network, storage, external dependencies or animation needed. No learner model/catalog/parser change.

New product fence: src/diffusion-stencil.mjs, src/diffusion-stencil-ui.mjs; courses/diffusion-stencil.json, courses/diffusion-stencil.md, courses/diffusion-stencil-lab.html; templates/diffusion-stencil-lab.html; tools/build-diffusion-stencil.mjs; tests/diffusion-stencil.test.mjs, tests/diffusion-stencil-build.test.mjs; a dedicated browser receiver and unique docs/receiving/diffusion-stencil-5f566b5ec8ef/. Additive README pointer only after qualification, preserving all current entries.

12 original questions and transfer prompts use the unchanged recallweave-deck/1 parser and actual learner/review/practice/notes path. Freeze masked questions before independent content review. Independently derive exact rational controls before peer sees model/source. No efficacy claim.
Primary mathematical reference: MIT Gilbert Strang CSE section5.4, https://math.mit.edu/classes/18.086/2006/am54.pdf. All exercises/exposition are original.
Native qualified artifacts will be distinguished from source-only publication and any later integration. User no-Actions hold remains controlling: no PR/main/push-triggered Actions, dispatch/rerun, workflow/runner/settings edits.
