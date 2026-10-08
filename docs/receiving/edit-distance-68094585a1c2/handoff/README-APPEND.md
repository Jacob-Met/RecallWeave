
## Edit distance: inspect every prefix and alignment choice

[Open the offline edit-distance explorer](courses/edit-distance-explorer.html), download its [original fourteen-question course](courses/edit-distance.json), or read the [worked guide](courses/edit-distance.md). Compare two strings of 0–24 Unicode code points, inspect the complete prefix-cost matrix and all optimal predecessor choices, and follow a deterministic minimum-cost alignment. Exact path counts preserve ties such as AA → A and AB → BA. The model fixes unit insertion/deletion/substitution costs, zero-cost matches, and literal code-point input without normalization.

The comparison download contains the applied inputs, policy, full table, candidate evidence and canonical alignment. A separate fixed course download imports through the existing learner preview and **Start this deck** controls, with review, practice and study-note export. Build with `node tools/build_edit_distance_explorer.mjs`; check with `node --test tests/edit-distance.test.mjs`.
