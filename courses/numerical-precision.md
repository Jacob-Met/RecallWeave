# Numerical precision — worked lesson

This original lesson compares exact written decimal values with JavaScript Number operations. It keeps operand conversion, arithmetic rounding, display formatting and a chosen comparison policy separate. Exact written values are mathematical references, not claims about measurement accuracy. The directly openable explorer supports bounded decimal addition and subtraction; the lesson also asks about grouping, comparisons and integer representation.

## Use the explorer

Open `numerical-precision-explorer.html` directly. Choose an example or enter two signed plain decimal values, each with at most 18 whole digits and 18 fractional digits. Exponent notation, commas and expressions are refused. Choose addition or subtraction and select **Compare values**. Editing an input clears the previous result until another comparison succeeds.

The result table shows the exact written-decimal result, the exact arithmetic result for the already converted operands, and the actual Number result. A second table decomposes the total signed discrepancy into an operand-conversion contribution and an arithmetic contribution. Their signs can reinforce or cancel. Expand exact fractions to inspect the values without reading rounded labels as exact decimal truth. Rational zero treats +0 and -0 as the same value; the Number bits and displayed sign preserve negative zero separately.

**Download worked record** saves the exact inputs, represented fractions, bits, arithmetic result and signed decomposition as local JSON. **Download lesson** saves `numerical-precision.json` in RecallWeave's deck format. To study it, open RecallWeave's learner page or local `demo.html`. Under **Bring your own lesson**, use **Choose a deck file** to select the downloaded JSON, review its title and twelve-question preview, then select **Start this deck**. Starting the selected deck replaces the current lesson and its practice answers. The file stays on your device. This explorer makes no network requests and does not automatically save browser state.

## Model boundaries

The arithmetic reference uses BigInt rational values. The Number calculation uses JavaScript's actual conversion and + or - operation; the model extracts the finite binary64 value through DataView. This is a small teaching surface, not an arbitrary expression evaluator, a decimal package, a measurement-uncertainty model or a rule for production financial calculations. The examples deliberately include exact results, conversion-only discrepancy, arithmetic-only discrepancy and mixed contributions.

The safe-integer flag reports Number.isSafeInteger for the stored Number. False can mean that a value is fractional or outside the guaranteed integer interval. It does not by itself say that the entered value was rounded. The separately calculated exact discrepancy answers that question for this bounded operation.

## Worked questions and transfer

### np-01 — Exact representations

Which exact decimal value is representable by a finite binary fraction?

A. 0.1
B. 0.125
C. 0.2
D. 0.3

**Answer: B.** 0.125 = 1/8 = 0.001 in base two, so this small value is exactly representable. The other choices reduce to 1/10, 1/5 and 3/10; each denominator retains a factor of 5, so its binary expansion does not terminate. This is a claim about these particular values, not a claim that every decimal fraction is inexact.

**Transfer:** Write 0.375 as a reduced fraction. Does its denominator permit a finite binary expansion?

0.375 = 375/1000 = 3/8. Since 8 = 2^3, the binary expansion terminates: 0.011₂.

### np-02 — Exact representations

For a rational number reduced to lowest terms, which denominator condition gives a finite binary expansion?

A. Its denominator is any even integer.
B. Its denominator is a power of 10.
C. Its denominator is any prime number.
D. Its denominator is a power of 2, including 1.

**Answer: D.** A finite binary fractional expansion has an integer numerator over 2^k. After reduction, its denominator can therefore contain only factors of 2. Being even is insufficient: 1/6 retains a factor of 3. A power of 10 usually retains factors of 5, and an arbitrary prime need not be 2. The criterion concerns a finite mathematical binary expansion; a specific floating-point format also imposes precision and range limits.

**Transfer:** Decide whether 3/40 and 7/16 have finite binary expansions, explaining the denominator test.

3/40 is already reduced and 40 = 2^3 × 5, so it has no finite binary expansion. The reduced denominator of 7/16 is 2^4, so 7/16 = 0.0111₂ terminates. Finite expansion alone does not establish a particular format's range or precision.

### np-03 — Exact representations

JavaScript displays String(Number('0.1')) as '0.1'. What does that display establish about the stored value?

A. The short display alone does not prove that the stored value equals the exact fraction 1/10.
B. The stored binary value must equal the exact fraction 1/10.
C. Number preserves the original input string as its numeric representation.
D. Displaying a value converts its stored representation to exact decimal arithmetic.

**Answer: A.** The displayed text is short, while the stored value can be inspected separately. For this Number, the exact fraction is 3602879701896397/36028797018963968, slightly greater than 1/10. The text '0.1' therefore does not prove exact equality to the written decimal. A Number is not the original input string, and displaying it does not replace binary arithmetic with decimal arithmetic.

**Transfer:** Explain why inspecting an exact fraction of the stored value answers a different question from reading its shortest displayed decimal.

The exact stored fraction identifies the numeric value represented by the bits. Its numerator times 10 differs from its denominator, so it is not 1/10. A short display is a readable representation and need not spell out that entire exact fraction.

### np-04 — Conversion and arithmetic

In JavaScript using Number values, what is String(0.1 + 0.2)?

A. '0.3'
B. '0.29999999999999999'
C. '0.30000000000000004'
D. 'NaN'

**Answer: C.** The expression displays '0.30000000000000004'. The exact written-decimal sum is 3/10, while the stored result exceeds that reference by 1/22517998136852480. For this example, operand conversion and addition rounding both contribute. '0.3' is not the displayed result of this expression; the smaller proposed value has the wrong direction, and both inputs are finite numbers, so NaN does not arise. Formatting can change the label, but it does not undo those operations.

**Transfer:** Compare the exact decimal sum with the exact stored result. Is formatting the result a way to undo the earlier arithmetic?

The reference is 3/10. The stored result is 1351079888211149/4503599627370496, larger by 1/22517998136852480. A two-decimal string such as '0.30' is a presentation choice; x still contains the previously computed Number unless another operation assigns a different value.

### np-05 — Conversion and arithmetic

Let a = Number('1.0000000000000001') and b = Number('1'). JavaScript computes a - b as 0, while the exact decimal-text difference is 0.0000000000000001. Where was that difference lost?

A. Both inputs were exact, but subtraction necessarily rounds every sufficiently small difference to zero.
B. Conversion rounded a to 1; subtracting the two stored values then gives exactly zero.
C. The exact decimal-text difference is also zero, so there is no discrepancy.
D. Number converts the first input to NaN, and subtraction changes NaN to zero.

**Answer: B.** Number('1.0000000000000001') is already 1 after conversion. The written difference is 1/10000000000000000, but the stored operands are both exactly 1. Their subtraction is exactly zero: the combined conversion contribution is -1/10000000000000000, and the arithmetic contribution is zero. It is inaccurate to attribute this example's discrepancy to new rounding during subtraction, to a zero written-decimal difference, or to NaN.

**Transfer:** Would subtracting stored 1 from stored 1 introduce an arithmetic rounding discrepancy? Keep this separate from the earlier input conversion.

No. The stored calculation 1 - 1 is exact. Its arithmetic contribution is zero, while the earlier conversion of 1.0000000000000001 to 1 accounts for the whole discrepancy from the written-decimal reference.

### np-06 — Conversion and arithmetic

For the exact decimal inputs 0.125 and 0.25, JavaScript Number addition returns 0.375. Which account is correct?

A. Every decimal input has already rounded, even in this example.
B. The inputs are exact, but the result must be inexact because addition uses Number.
C. The displayed result is exact only after converting it to a string.
D. Both operands and their sum are exactly representable; no discrepancy is introduced in this example.

**Answer: D.** The operands are 1/8 and 1/4, and their sum is 3/8. All three fit exactly in this small binary calculation. There is no input-conversion discrepancy and no arithmetic discrepancy. Number operations do not introduce an error in every example, and a string conversion is not what makes this example exact.

**Transfer:** Give another pair of small dyadic fractions whose sum is exactly representable, and show their exact fraction arithmetic.

For example, 0.5 + 0.25 = 1/2 + 1/4 = 3/4 = 0.75. These small operands and the result are all exactly representable.

### np-07 — Comparison and order

Let x = 0.1 + 0.2 and y = 0.3. A stated policy accepts differences with Math.abs(x - y) <= 1e-12. What are the values of x === y and this acceptance check?

A. false; true
B. true; true
C. false; false
D. true; false

**Answer: A.** The strict equality check is false. The two stored Numbers differ by 1/18014398509481984, approximately 5.55 × 10^-17, which satisfies the explicitly chosen 10^-12 absolute bound. Thus the acceptance check is true. The other pairs disagree with one or both tests. This policy accepts a small difference; it does not make the values exactly equal or establish a tolerance suitable for every unit and application.

**Transfer:** Why does passing this explicitly chosen tolerance not prove exact equality, and why would another application need to choose its own tolerance?

The two values remain distinct; the policy merely accepts their difference. An application's scale, units and required accuracy determine a useful tolerance. Neither 10^-12 nor Number.EPSILON is a universal acceptance rule.

### np-08 — Comparison and order

Run const x = 0.1 + 0.2; const label = x.toFixed(2). Which statement is correct?

A. label is '0.30', and x is changed to the exact decimal value 0.3.
B. label is '0.3', and x is changed to a string.
C. label is '0.30', while x remains the same Number and still differs from the Number value 0.3.
D. label is '0.30000000000000004', because formatting cannot round displayed text.

**Answer: C.** toFixed(2) returns the string '0.30'. It formats a value for display without changing x, which remains the original Number and still differs from the Number value 0.3. The alternatives incorrectly change x, omit a requested fractional digit, or ignore the formatting operation. Converting the label back to Number would be another operation with its own result; that conversion has not occurred in the stated code.

**Transfer:** What would need to be recorded if a worked example must preserve the computed Number as well as a two-decimal display?

Keep the original computed value in an unambiguous form, such as its exact binary64 fraction or bits, alongside the separate string '0.30'. Keeping only the rounded label loses distinctions between values that share that label.

### np-09 — Comparison and order

Let a = 10000000000000000, b = -10000000000000000 and c = 1, all JavaScript Number values. What are (a + b) + c and a + (b + c), respectively?

A. 0 and 0
B. 1 and 1
C. 0 and 1
D. 1 and 0

**Answer: D.** In the left grouping, a + b is exactly zero, then adding c gives 1. In the right grouping, the exact integer b + c would be -9999999999999999. That intermediate rounds to -10000000000000000 under Number arithmetic, so the final sum is zero. Exact integer arithmetic gives 1 with either grouping. The alternatives either change the exact first cancellation or assume reassociation preserves the rounded intermediates.

**Transfer:** Compute the exact integer result for each parenthesization, then identify the rounded intermediate in the Number calculation.

Both exact groupings give 10000000000000000 - 10000000000000000 + 1 = 1. Only the right Number grouping first computes b + c; its exact intermediate lies between representable values and rounds to -10000000000000000. The left grouping cancels a and b exactly first.

### np-10 — Integer guarantees

Which value is Number.MAX_SAFE_INTEGER, the positive end of JavaScript's guaranteed safe-integer interval?

A. 9007199254740991 (2^53 - 1)
B. 9007199254740992 (2^53)
C. 4503599627370496 (2^52)
D. 18446744073709551615 (2^64 - 1)

**Answer: A.** Number.MAX_SAFE_INTEGER is 2^53 - 1, or 9007199254740991. The API's safe-integer interval is symmetric, from -9007199254740991 to +9007199254740991 inclusive. The value 2^52 is safely inside it but is not the maximum; 2^53 is representable but outside the interval; 2^64 - 1 is not its bound. The interval must not be confused with the entire set of representable integers or finite Numbers.

**Transfer:** State the corresponding negative endpoint. Does a value outside this interval automatically have to be non-integer?

The negative endpoint is -9007199254740991. Outside values can still be finite integers and can sometimes be represented exactly; being outside means Number.isSafeInteger returns false, not that Number.isInteger necessarily does.

### np-11 — Integer guarantees

Let s = '9007199254740992' and t = '9007199254740993'. What are Number(s) === Number(t) and BigInt(s) === BigInt(t), respectively?

A. false; false
B. false; true
C. true; false
D. true; true

**Answer: C.** Both Number conversions produce 9007199254740992, so their strict equality is true. Direct BigInt conversion preserves the two distinct integer strings, so that equality is false. The other answer pairs lose one of those distinctions. BigInt(Number(t)) cannot recover the original integer after Number(t) has already rounded; the exact integer text must reach BigInt directly when that is the intended representation.

**Transfer:** If these strings are exact integer counts that must stay distinct, explain why converting through Number before BigInt would lose information.

Number(t) has already become 9007199254740992, so BigInt(Number(t)) receives that rounded integer. BigInt(t) receives the original decimal integer text and returns 9007199254740993n. Choose the representation before losing the distinction.

### np-12 — Integer guarantees

JavaScript evaluates 9007199254740992 + 2 as 9007199254740994, and Number.isSafeInteger of that result is false. How should these facts be interpreted?

A. The reported sum must be numerically wrong because the result is outside the safe interval.
B. This particular sum is exactly representable; isSafeInteger reports the guaranteed interval, not exactness of every individual value.
C. Number.isSafeInteger is true for every exactly represented integer, so the reported false is impossible.
D. Every integer greater than Number.MAX_SAFE_INTEGER is stored as Infinity.

**Answer: B.** This particular addition is exact: both operands and the result 9007199254740994 are representable. Number.isSafeInteger is nevertheless false because the result is beyond its guaranteed interval. An outside value is not automatically inexact or infinite, and the API is not a test of exactness for every individual integer. Nearby integer text such as '9007199254740993' does round during conversion, demonstrating why the interval and per-value exactness are different questions.

**Transfer:** Contrast this exact result with converting the distinct integer text '9007199254740993' to Number.

9007199254740994 is an exactly representable even integer at this magnitude, so the stated sum is exact. The neighboring text '9007199254740993' lies between representable Number values and converts to 9007199254740992. Both results remain outside the API's safe interval.

## Technical references and provenance

Normative background was checked on 2026-10-08 against the live ECMAScript specification:

- [Number type and binary64 representation](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-ecmascript-language-types-number-type).
- [Number addition and subtraction](https://tc39.es/ecma262/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-add).
- [Number.isSafeInteger](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.issafeinteger) and [Number.MAX_SAFE_INTEGER](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.max_safe_integer).
- [Number.EPSILON](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.epsilon) and [Number.prototype.toFixed](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-number.prototype.tofixed).

All questions, distractor reasoning and transfer answers are newly written. Numerical examples are deterministic mathematical inputs, not collected observations. AI assistance was used in authorship and implementation. Source rules establish the language contract; separately recorded exact arithmetic, native execution and independent receiving qualify these concrete examples. No learning-effect or assessment-validity claim is made.
