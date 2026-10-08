# Floating point: when stored coordinates change the answer

This lesson follows one question from a single stored number to a triangle: **which value did the computer actually keep, and which inputs does a later calculation describe?** Open [the offline explorer](floating-point-lab.html), then import [the lesson JSON](floating-point.json) into RecallWeave for fourteen retrieval questions and transfer prompts. The explorer also contains the exact lesson download, so it can travel as one HTML file.

The examples are original teaching material. Their numerical controls establish the stated behavior; they do not establish a measured learning benefit.

For an earlier representation boundary, the existing [Numerical precision lesson](numerical-precision.md) compares exact decimal text with binary64 operands and addition or subtraction. This follow-on examines conversion to binary32 and the geometry retained after storing transformed coordinates. The introductory fraction and addition controls connect the two lessons.

## 1. Separate the intended value from its stored value

The fraction 1/8 has the finite binary expansion 0.001. The fraction 1/10 has a repeating binary expansion. A format with finite precision must choose a nearby value for the latter.

This explorer deliberately starts with a JavaScript **Number**, which uses binary64, and converts it with `Math.fround`. That operation rounds to binary32 using ties to even and returns the selected value as a Number. The exact reference therefore compares **the already parsed binary64 input** with the binary32 result. It is not an arbitrary-precision decimal parser. See the normative [ECMAScript Math.fround contract](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-math.fround).

For the input written as `0.1`:

| Data set | Exact fraction |
| --- | --- |
| Intended decimal | 1/10 |
| JavaScript Number input | 3602879701896397 / 36028797018963968 |
| Binary32 stored value | 13421773 / 134217728 |

The explorer decodes bits into integer fractions rather than estimating these references from printed decimal strings. Its signed conversion error is **stored minus Number input**. That leaves the earlier decimal-to-Number representation error visible as a separate question.

Try `0.125`, `0.1`, and the two halfway integer presets. At 2^24, the binary32 neighbor below is one unit away and the neighbor above is two units away. A halfway tie selects the neighbor with an even retained significand: 16,777,217 rounds down to 16,777,216, while 16,777,219 rounds up to 16,777,220. A rule that always rounds downward would fail the second control.

Binary32 stores a sign bit, eight exponent bits, and 23 fraction bits. Normal values also have an implicit leading bit, giving 24 bits of precision. Subnormal values use a different leading-bit rule and extend the representation toward zero. The [Oracle Numerical Computation Guide's format description](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_math.html) gives the encoding details.

## 2. Mark each arithmetic rounding boundary

Use the addition experiment with a=100,000,000, b=-100,000,000, c=1. Round after every addition:

| Path | First rounded result | Final rounded result |
| --- | --- | --- |
| (a + b) + c | 0 | 1 |
| a + (b + c) | -100,000,000 | 0 |

The exact sum of these stored inputs is 1. In the second path, the contribution of 1 disappears when b+c is rounded. The subsequent cancellation exposes that earlier loss. With the smaller 8, -8, 1 control, both paths give 1. Reordering is consequential in some computations; it is not guaranteed to change every result.

Wider arithmetic can preserve information through a calculation **if it is used before the relevant rounding**. Copying an already rounded result into a wider format preserves that rounded value; it cannot reconstruct discarded information. Goldberg's original discussion of [rounding and cancellation](https://docs.oracle.com/cd/E19957-01/806-3568/ncg_goldberg.html) is useful background for distinguishing arithmetic error from error already present in the operands.

## 3. Preserve the actual geometric counterexample

Take the intended decimal vertices a=(0,0), b=(1.4,1.6), and c=(2.6,3.4). Their signed **double area** is

`D = (bx - ax)(cy - ay) - (by - ay)(cx - ax) = 3/5`.

This determinant is twice the signed triangle area. Positive and negative signs encode opposite windings under the same axis convention. The triangle's area is 3/10, not 3/5.

The experiment first stores each local vertex in binary32. Its exact local double area is slightly different from 3/5 and remains positive. It then adds the origin (10,000,000,10,000,000) in wider arithmetic and stores the output coordinates in binary32. In this bounded fixture, those wider additions are exact; the next storage conversion is the loss point.

| Vertex | Stored global coordinates | Relative to stored a |
| --- | --- | --- |
| a | (10,000,000, 10,000,000) | (0, 0) |
| b | (10,000,001, 10,000,002) | (1, 2) |
| c | (10,000,003, 10,000,003) | (3, 3) |

The exact double area of these stored vertices is `1*3 - 2*3 = -3`. Translation preserves area in exact mathematics, yet the **stored result has reversed winding and still has nonzero area**. This is the original case used to repair output admission in [hamon-engine PR170](https://github.com/Jacob-Met/hamon-engine/pull/170), whose qualified source head is `41d5e7f97171b9d9eaa62e0d864e153376db806c`.

Two separate checks matter here. A positive affine determinant describes the exact transform's orientation. Checking the actual stored output tests the additional quantization boundary. Rejecting only zero area would miss the reversed, nonzero result.

The explorer computes each reported double area using exact integer fractions for that particular set of coordinates. It never silently substitutes the intended decimal vertices for the stored source or output.

## 4. Read controls as controls, not as a universal ranking

Try these origins with the default units:

| Origin added to each axis | Stored relative vertices b and c | Stored double area | Winding |
| --- | --- | --- | --- |
| 0 | The original binary32 local vertices | About +0.60000014 | Preserved |
| 10,000,000 | (1,2), (3,3) | -3 | Reversed |
| 16,777,216 | (2,2), (2,4) | +4 | Preserved, with deformed geometry |
| 67,108,864 | (0,0), (0,0) | 0 | Collapsed |

**“Winding preserved” is a sign statement.** It does not certify position, shape, area, or acceptable error. Increasing the origin does not produce a monotonic progression through those three labels.

Now change all units by 2^k. The explorer scales both the local geometry and the origin, using k from -8 through 8. In this bounded normal-range experiment, the normalized outlines and the rounding reversal remain unchanged. Raw double area changes by 2^(2k). A small raw area by itself is therefore not a conditioning diagnosis.

The displayed |sin(theta)| describes the angle between the local edges. A small value identifies nearly parallel edges and helps explain why some perturbations can alter a small area. It is **not a complete condition number** for the whole pipeline. Such a claim would need a specified input perturbation model, a choice of relative or absolute measurement, and an output of interest. Input quantization at a large origin, cancellation of nearly equal quantities, finite exponent range, and mathematical sensitivity require distinct explanations even when they appear in the same workflow.

The number inspector's subnormal and overflow presets explore range separately. The positive input 2^-150 rounds to zero; 2^128 rounds to infinity in binary32. Neither observation alone determines the conditioning of a mathematical problem.

## 5. Choose where coordinates remain local

Keeping the local vertices and world origin separate retains these source edges for operations that use the local data. Subtracting the origin **after** the global coordinates have been rounded exposes the already altered differences; it cannot recover the local source.

This strategy has a boundary too. If a later stage bakes large global binary32 coordinates again, the same loss can recur. A practical verification should inspect the representation that the receiving consumer actually uses and measure the property that matters: winding, positional error, normals, or another explicit requirement.

Use the downloadable experiment record to keep the exact inputs, stored points, rational double areas, and interpretation together. The report has a separate experiment format; the lesson download uses the existing `recallweave-deck/1` importer unchanged.

## Verification and scope

The implementation has independent controls for known binary32 bit patterns; adjacent values on both sides of a power of two; halfway ties in both directions; signed zero; subnormal and overflow boundaries; exact and inexact association examples; the original reversed triangle; a same-winding deformed triangle; a collapsed triangle; and the 17 bounded power-of-two unit settings. The course must pass the existing deck parser, and the standalone page must match its source build.

These are small, explicit experiments. They do not implement a general geometric condition estimator, a robust orientation predicate for arbitrary input ranges, or an arbitrary-precision decimal calculator. Their purpose is to make each representation and reference visible enough to reason about it.
