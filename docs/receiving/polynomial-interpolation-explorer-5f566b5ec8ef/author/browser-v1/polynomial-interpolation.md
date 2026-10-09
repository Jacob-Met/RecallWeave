# Polynomial interpolation: exact samples and their limits

This original lesson connects sample constraints, divided differences and the
polynomial they determine. The examples are authored mathematical data, not
measurements. An exact fit at the supplied nodes does not establish the behavior
of an unknown function elsewhere.

The companion `polynomial-interpolation.json` uses the existing RecallWeave lesson
format: 18 questions across six linked concepts, with worked explanations and
transfer prompts. It can be selected through the existing **Bring your own
lesson** flow. The native lesson validator, adaptive selector, review and bounded
practice round retain their own behavior. This contribution does not change the
learning model or make a learning-effectiveness claim.

The separate dependency-free Node command below makes the arithmetic usable from
a terminal. This contribution supplies no new browser interface; native model and
command receiving do not establish browser rendering or file-picker behavior.

## Run an exact experiment

Save this UTF-8 JSON as `points.json`:

```json
{
  "points": [
    {"x": "0", "y": "1"},
    {"x": "2", "y": "5"},
    {"x": "5", "y": "26"}
  ],
  "at": ["0", "3/2", "5", "7"]
}
```

From the repository root, with Node 20 or later:

```sh
node tools/interpolate-polynomial.mjs points.json --format text
node tools/interpolate-polynomial.mjs points.json
```

The default output is complete JSON. `--format text` displays every order of
divided differences, both coefficient forms, every original-node check and the
requested values. A lone `-` reads the JSON from stdin; `./-` names a literal file.
`--help` prints the command syntax. The command creates no output files and does
not change the input. It performs no network calls or dependency installation.

For this experiment the ascending monomial coefficients are `["1","0","1"]`,
meaning `1 + 0x + 1x²`. The requested values are `1`, `13/4`, `26` and `50`.
Their location labels are respectively `node`, `inside`, `node` and `outside`.
The last label identifies extrapolation; it does not forbid evaluating the
polynomial or turn the result into a prediction guarantee.

## What the supplied samples determine

With `n` distinct x coordinates, exactly one polynomial of degree at most `n−1`
passes through all `n` supplied pairs. The degree can be lower than the bound.
For example, `(-1,4)` and `(3,4)` determine the constant polynomial `4`.

The restriction on degree matters. If `p` fits the samples at `x₀,…,xₙ₋₁`, then

```text
p(x) + c (x−x₀)(x−x₁)…(x−xₙ₋₁)
```

also fits them for any constant `c`. The added term vanishes at each supplied x,
but can change other values. Without the degree bound the fit is not unique.

For the worked samples, both `1+x²` and `1+x²+x(x−2)(x−5)` agree at `0,2,5`.
At `x=1` they give `2` and `6`. The data identify the degree-at-most-two
interpolant; they do not prove that an unknown generating function is quadratic.

Two rows requiring different y values at the same x are inconsistent with a
single-valued function. Equal duplicate rows are redundant mathematically, but
this experiment refuses *all* repeated rational x coordinates. It neither
silently drops rows nor treats repeats as derivative data for Hermite
interpolation. Thus `0.5`, `1/2` and `2/4` are the same x for admission.

## Build the complete divided-difference table

Start with each y value. A first divided difference is a secant slope. Higher
orders divide the change between two neighboring lower-order differences by
the span of the complete node window:

```text
D[i,0] = y[i]
D[i,k] = (D[i+1,k−1] − D[i,k−1]) / (x[i+k] − x[i])
```

For the authored order `(0,1), (2,5), (5,26)`:

| Order | Contiguous node windows | Exact values |
| --- | --- | --- |
| 0 | individual nodes | 1, 5, 26 |
| 1 | [0,2] and [2,5] | (5−1)/2 = 2; (26−5)/3 = 7 |
| 2 | [0,2,5] | (7−2)/(5−0) = 1 |

The distinct denominators account for unequal spacing. The tool preserves the
authored node order instead of sorting it. Each array in `dividedDifferences`
is one order, with every contiguous window for that order from left to right.

## Read Newton form and check equivalent representations

The first value of each table order is a Newton coefficient. Coefficient `k`
multiplies the product of the first `k` node factors. The worked example gives

```text
p(x) = 1 + 2(x−0) + 1(x−0)(x−2)
     = 1 + x².
```

The output retains both forms: `newtonCoefficients` and the expanded
`monomialCoefficients` in ascending powers. Trailing zero monomial coefficients
are removed. The zero polynomial is represented by `["0"]` with `degree:null`,
because there is no highest nonzero coefficient; a nonzero constant has degree 0.

Reversing the worked order gives Newton coefficients `["26","7","1"]`:

```text
26 + 7(x−5) + (x−5)(x−2) = 1 + x².
```

The Newton description changes, but the polynomial does not. Two candidate
polynomials of degree at most two which agree at three distinct nodes have a
difference with three roots and degree at most two. That difference must be
identically zero. The same argument works for `n` nodes and degree at most `n−1`.

Lagrange form supplies another exact representation. For the middle node `2`
among `0,2,5`, the basis polynomial is `x(x−5)/(−6)`. It is 1 at `2` and 0 at
the other nodes. Multiplying each node's basis by its y value and adding gives
the same interpolant. The implementation uses divided differences, while
independent receiving checks equivalent polynomial identities.

## Add a point, change values and evaluate between nodes

Appending `(3,10)` to the worked samples adds no new polynomial term, because
`1+3²=10` already holds. The new highest-order Newton coefficient is zero and
the effective degree remains two. Appending `(3,11)` instead changes the fit;
the old polynomial cannot satisfy that additional requirement.

Adding 3 to every y value gives `4+x²`. Multiplying every y by −2 gives
`−2−2x²`. These transformations preserve exact sample reproduction. They do
not move the x coordinates or add information between them.

At `x=3/2`, the original polynomial gives `1+9/4=13/4`. The result is exactly
the same at `−3/2`, but their location labels differ: `3/2` lies inside `[0,5]`,
whereas `−3/2` is outside. The label refers to the sampled range, not the sign
or magnitude of the resulting y value.

Very close x values can lead to a large slope. The samples `(0,0)` and
`(1/1000,1)` determine `p(x)=1000x`, so `p(1)=1000`. Changing the second y
to `1001/1000` gives slope `1001` and changes `p(1)` by 1. Exact arithmetic
preserves both calculations; it does not establish that either line is a
reliable extrapolation of an unknown process.

## Input and output boundaries

Supply exactly `points` and `at`. Each point has exactly `x` and `y`.
Both coordinates and queries are strings. There must be 1–8 points and 0–16
queries. An empty query list still returns the polynomial and all node checks.

An admitted token has at most 32 characters and is an integer, a decimal with
1–6 digits after the decimal point, or a fraction with a positive integer
denominator. Integer numerators may have a leading `+` or `-`. Decimal input
needs digits on both sides of the point. Outer whitespace is retained in the
`input` evidence but ignored for numeric admission. Exponents, `NaN`, infinity,
JSON numeric values, empty tokens and signed fraction denominators are refused.

The absolute numerator is at most 1,000,000,000, before reduction and after
decimal expansion. The denominator is at most 1,000,000, before reduction.
For example, `1000.000001` exceeds the expanded-numerator limit, even though
the decimal's magnitude is modest. These are explicit bounded-experiment
limits, not mathematical restrictions on interpolation. Intermediate and final
results may exceed those input limits; they remain exact reduced BigInt
rationals rather than clamped Numbers.

Output rational strings are canonical: reduced fraction, positive denominator,
no denominator when it is 1, and `0` for zero. Authored raw strings and row order
stay available alongside the normalized nodes. `nodeChecks` evaluates the
expanded polynomial at every input node and records exact reproduction.

Input is limited to 65,536 bytes and must be valid UTF-8. Invalid arguments,
UTF-8, JSON or mathematical admission exit with status 2 and no stdout.
Input or output I/O errors exit with status 1. The complete result is prepared
before ordinary output starts; an output I/O error can occur after bytes have
been emitted, so consumers must check the exit status. The command does not
authenticate input, identify a source file cryptographically, or provide a
report importer. Trusted JavaScript callers must supply ordinary own data
properties and dense arrays, not accessors or sparse sequences.

## Native checks and qualification

```sh
node --test tests/polynomial-interpolation.test.mjs
node --test tests/polynomial-interpolation-receiving.test.mjs
```

The first suite includes the unchanged original lesson control, exact
reconstruction, input refusals, real command processes and the new course's
native adaptive/review/practice flow. The independent suite uses separately
frozen polynomial oracles and also receives actual file/stdin and output-I/O
behavior. Synthetic mathematical examples qualify software arithmetic and
contracts; they are not learner study results or scientific measurements.

The source is locally received while GitHub Actions and triggering publication
remain held by the project owner's direction. No hosted, merged, deployed or
browser acceptance is implied by these native checks.

## Reference and original authorship

The uniqueness, Lagrange and Newton/divided-difference formulas can be checked
in [NIST DLMF §3.3: Interpolation](https://dlmf.nist.gov/3.3), especially parts
(i), (iii) and (iv), read on 2026-10-08. This guide's prose, examples, questions
and calculations are original. No reference passage, figure or exercise is
reproduced. Referenced material retains its own terms; this contribution makes
no separate reuse-license grant. See the repository's AI-tool disclosure for
its educational-content review guidance.
