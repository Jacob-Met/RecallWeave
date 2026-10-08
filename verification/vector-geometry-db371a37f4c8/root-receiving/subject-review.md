# Independent analytical review of the vector course

Reviewer: `estate-db371a37f4c8 / qualification`. Recorded by root from the reviewer's completed analytical response.

**Accepted: no blocking mathematical or content defect.** The reviewer examined the full prompt, option, key, explanation and transfer transcript supplied by root for course SHA256 `66b8c5f0a047417605b4f6d399478bb8324fb5852aadb01d796d7ef94f5c3513`. All twelve keys are correct; each item has one correct option under its stated conventions. This was a transcript-based analytical review, with no reviewer execution or independent file hashing. Root separately verified the frozen file bytes and ran the real browser consumer.

| Item | Zero-based key / result | Independently checked transfer |
| --- | --- | --- |
| vg-move | 1 / (4,3) | Translated endpoints still differ by (4,3). |
| vg-combine | 3 / (1,3) | Both procedures end at (5,5); two-leg length sqrt(10)+sqrt(20) differs from net length sqrt(10). |
| vg-length | 0 / 5 | (3,4) has length 5; (6,-8)=-2(-3,4) has length 10 and opposite direction. |
| vg-unit | 2 / (-3/5,4/5) | Normalize (6,8) to (3/5,4/5); scaling by 12 gives (36/5,48/5), length 12. |
| vg-dot | 2 / 0 | Replacing the second vector by (1,2) gives dot product 4, not a right angle. |
| vg-component | 0 / -3 | Reversing unit direction gives +3 without changing displacement or length. |
| vg-project | 3 / (4,2) | Direction (4,2) changes coefficient to 1, preserving the point. |
| vg-residual | 1 / (3,-3) | Opposite residual is also perpendicular but does not equal the requested b-p. |
| vg-matrix | 0 / (0,-6) | Columns (2,0) and (1,3) combine as first minus twice second. |
| vg-basis | 2 / (4,9) | T(-1,2)=(-4,5); unique basis expansion and linearity determine every image. |
| vg-order | 1 / (-4,1) | From (2,1), the orders give (-2,2) and (-1,4). Uniform factor 2 commutes with rotation, giving (-2,4). |
| vg-loss | 3 / both inputs map to (3,0) | G inverse is (u/2,v/3). F is many-to-one and loses y. |

The review accepts the explicit perpendicular/equal-unit geometric axes and column-vector matrix convention. Distractors distinguish position, displacement, traveled length, squared length, unit direction, signed component, residual sign and order. Transfer prompts change inputs or ask for an invariant rather than repeat arithmetic.

The residual transfer requires both line membership and perpendicular remainder. For b=(5,-1) on the y=x example, proposed p=(0,0) satisfies line membership but fails perpendicular remainder; proposed p=(4,0) has perpendicular remainder (1,-1) but is not on the line. The course correctly supplies both conditions.

## Explorer contract

For explorer SHA256 `f10b3481b9c7d59c1e3bc2837017a1050978d6222a322acf051a1e7c495796e1`, the described formulas p=((b dot a)/(a dot a))a and r=b-p are correct for nonzero a. They give line membership, perpendicular residual, reconstruction and invariance under every nonzero rescaling of a. Zero b is valid; zero a is not. Quarter-step inputs in [-6,6] avoid extreme intermediate magnitudes. Three-decimal display rounding is consistent with underlying JavaScript arithmetic.

Analytical witness b=(6,6), a=(2,1) gives p=(7.2,3.6), r=(-1.2,2.4): a valid output coordinate can exceed the input bound. Root executed the exact shipped core and inspected its shared SVG mapping; `projection-range-witness.json` records the unclamped output and actual plot point (500,200) inside the plot rectangle. This is not a claim of an additional browser run.

The mathematical review requires no course correction. The guide should continue to make clear that the negative factor in (6,-8) both reverses direction and doubles length, and that flattening lacks an inverse because it identifies distinct inputs. Division by zero is the coordinate symptom, not a replacement for that explanation. The existing guide is consistent with those qualifications.

No content validation is presented as evidence of improved learning. The reviewer accepted the stated mathematical contract, not unseen event handlers or SVG implementation; native author/root receipts address those separately.

## Execution-channel limitation

The reviewer encountered three read-only tool stalls, including local file reads with both inner and outer 1000 ms yield requests. The final interrupted local read returned no output, process ID or session ID and was aborted after 1549.9 seconds. It requested no mutation and started no known native-host process. Root supplied the source transcript directly so the independent analytical work could finish. No execution result is inferred from the stalled calls.
