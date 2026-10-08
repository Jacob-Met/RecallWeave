# Complex multiplication: turn, scale, repeat

Use the [offline explorer](complex-plane-lab.html) to calculate a product, follow a finite sequence of repeated products, and download an original twelve-question RecallWeave lesson.

The starting point is **z**. The multiplier is **w**. Keeping these roles separate makes it easier to connect the algebra with the picture.

## Start with a point

A complex number `z = a + bi` has real part `Re(z) = a` and imaginary part `Im(z) = b`. Here the imaginary part means the real coefficient of `i`, not the expression `bi`. The imaginary unit satisfies `i² = −1`.

Plot `a + bi` at the ordered pair `(a, b)`: real coordinates increase to the right, and imaginary coefficients increase upward. For example, `2 + 3i` sits two units right and three units up.

Its **modulus** is its distance from the origin:

```text
|a + bi| = √(a² + b²)
```

Thus `|2 + 3i| = √13`. The conjugate `a − bi` reflects the point across the real axis and has the same modulus.

A nonzero point also has an **argument**, its direction from the positive real axis. Positive angles turn counterclockwise. This explorer reports degrees in **[−180°, 180°)**: it includes −180° and excludes +180°. Directions that differ by a whole turn are equivalent. For example, +270° is displayed as −90°.

**Zero has modulus 0 and no argument.** The table says “undefined (zero)”; an exported argument is `null`. Assigning an angle of zero would confuse “no direction” with the positive real direction.

## Multiply the coordinates

Distribute the two factors, then replace `i²` with `−1`:

```text
(a + bi)(c + di)
  = ac + adi + bci + bdi²
  = (ac − bd) + (ad + bc)i
```

For a worked example, choose `z = 2 + 3i` and `w = 4 − i`:

```text
(2 + 3i)(4 − i)
  = 8 − 2i + 12i − 3i²
  = 11 + 10i
```

The product’s coordinates are `(11, 10)`. The lab shows this single product separately from the repeated sequence, so the single-product summary remains meaningful even when the requested sequence has zero multiplication steps.

## Read multiplication as a transformation

A nonzero complex number can be written as:

```text
r(cos θ + i sin θ), where r > 0
```

Its modulus is `r`, and its direction is `θ` modulo 360°. When both `z` and `w` are nonzero, multiplication by `w`:

1. Multiplies the distance from the origin by `|w|`.
2. Adds the direction of `w` to the direction of the point, modulo a full turn.

For `w = i = 0 + 1i`, the distance multiplier is 1 and the direction change is a counterclockwise quarter turn. Algebra gives the same result:

```text
(a + bi)i = −b + ai
```

A point `(a, b)` becomes `(−b, a)`. For `w = −i`, the turn is clockwise by 90°. For `w = −1`, the point makes a half turn; this explorer displays its representative angle as −180°.

The lab distinguishes the **direction of w** from the **measured direction change z → zw**. Both use the declared principal interval. Angle subtraction can cross the −180° boundary, so compare directions modulo 360°, not by demanding that two unwrapped numbers be identical.

### The two zero cases

| Starting point and multiplier | Distance multiplier | What happens to the point? | Direction information |
|---|---|---|---|
| z is nonzero, w is nonzero | \|w\| | Distance scales and direction changes | Both arguments and the measured change are defined |
| z = 0, w is nonzero | \|w\|, still defined | The origin stays at the origin | w has an argument; z, zw and their measured change do not |
| w = 0, with any z | 0 | The product collapses to the origin | w and the product have no argument; there is no measured rotation |

Saying that every multiplication “rotates a point” would obscure these cases. A zero multiplier collapses the point. A zero starting point has no direction to measure.

## Repeat a fixed multiplier

The sequence is defined by assigning the starting point first:

```text
P₀ = z
Pₖ₊₁ = Pₖ × w
```

After **N multiplications**, the sequence contains **N + 1 indexed points**, including the start. This is a sequence based on the chosen `z`; it should not be confused with an unlabeled list of powers of `w`.

Using the worked example `z = 2 + 3i`, `w = 4 − i`, and N = 3:

| Step | Real coordinate | Imaginary coefficient | Complex number |
|---|---:|---:|---|
| P₀ | 2 | 3 | 2 + 3i |
| P₁ | 11 | 10 | 11 + 10i |
| P₂ | 54 | 29 | 54 + 29i |
| P₃ | 245 | 62 | 245 + 62i |

A returning point still occupies its own indexed row. For `z = 2 + i` and `w = i`, four multiplications return to `2 + i`, but the table contains P₀ through P₄: five rows. Coincident plot labels list their step numbers; they do not remove those rows.

For N = 0, the sequence contains only the explicitly assigned P₀, even if `w = 0`. This definition does not require interpreting `0⁰`. The separate single-product summary still calculates `z × w`.

The plot uses equal mathematical units on its two axes, with positive imaginary coefficients upward. It fits the indexed points, the multiplier reference and the separate product within its range. The gold vector identifies `w`; it is not an extra sequence step.

**Dashed lines join discrete products.** They do not specify elapsed time, a continuous spiral, a chosen direction between samples, or a winding count. A list of principal angles does not determine those extra quantities.

## Use the explorer and keep a result

1. Open [complex-plane-lab.html](complex-plane-lab.html) in a browser. The built page contains its script, styling and lesson data, so calculations and downloads work without a server or network.
2. Enter the real and imaginary coefficients of `z` and `w`, then choose 0–8 repeated multiplications.
3. Select **Calculate products**. The page moves focus to the current result, shows the single product and transformation, and lists every sequence step.
4. Use **Download experiment (.json)** to keep the current accepted settings and full numeric report.

Editing any coefficient or the step count retires the result and its experiment download. Selecting a preset also requires an explicit new calculation. An invalid draft cannot keep an old result presented as current.

On a narrow screen, the plot remains square. The coordinate table scrolls sideways inside its own region; the visible hint identifies that interaction.

### Input and arithmetic limits

Each coefficient must be plain decimal text between −10 and 10, with at most three digits after the decimal point. Leading or trailing whitespace is trimmed. The trimmed text is limited to sixteen characters.

Examples of accepted values include `−1.5` when entered with the ordinary keyboard minus sign (`-1.5`), `0.25`, `.125` and `+2`. Empty text, an isolated sign, `1.`, exponent notation such as `1e-3`, hexadecimal, commas and fractions such as `1/2` are refused. Enter `0.5` for one half. The step count is a whole number from 0 through 8.

Calculations use ordinary JavaScript **binary64 floating-point numbers**. These finite bounds avoid unbounded growth and extremely tiny accepted nonzero inputs during this short sequence; they do not make decimal arithmetic exact. Many decimal values, square roots and angles are approximations.

The display uses at most **eight significant digits**, including scientific notation when that preserves a small nonzero value. The experiment JSON keeps the computed binary64 values without applying the display rounding. “Full numeric values” describes the stored floating-point result, not exact decimal or symbolic arithmetic.

The JSON also records the input snapshot, format version, recurrence, angle convention, arithmetic note and discrete-path meaning. It is an experiment report, not a RecallWeave lesson deck; use the separate lesson download for the learner.

## Learn with the original question set

Download **complex-plane.json** using **Download the lesson (.json)** in the explorer, or obtain the [course file](complex-plane.json) from this repository.

The twelve questions cover four connected concepts:

- Points, imaginary coefficients and the imaginary unit.
- Modulus, arguments and the zero case.
- The coordinate rule and geometric effect of multiplication.
- Repeated products, indexed rows and zero steps.

Each question states the assumptions it needs. Prerequisite links describe relationships between concepts; the adaptive learner can present questions in a different order. Options may also be shuffled, so read their mathematical content rather than memorizing a letter.

To use the existing learner:

1. Open the project’s [demo.html](../demo.html).
2. Under **Bring your own lesson**, choose the downloaded lesson file and inspect the preview.
3. Select **Start this deck** to begin. Previewing a file alone does not start or replace a session.
4. Answer the question, compare the worked explanation, and respond to its unscored transfer prompt in your own words.
5. Use the learner’s existing review, practice and study-note actions to revisit reasoning you missed and keep your notes.

The lab makes explicit local downloads and does not upload the lesson or experiment. If you copied the lab alone, obtain the existing learner and this guide from the same RecallWeave project for those separate flows.

Try explaining why multiplying by `i` preserves distance using both the coordinate rule and the polar rule. Then use `w = 0.5` to predict the result after several steps before calculating. The activity supports exploration; no measured learning improvement is claimed.

## Content and references

The lesson questions, explanations, transfer prompts, worked examples, guide and lab diagrams are original content authored for this contribution. The course metadata dedicates the original lesson content under **CC0 1.0**. That statement does not relicense referenced books or other repository content.

Mathematical background was checked against these primary references:

- [OpenStax, Precalculus 2e, §3.1: Complex Numbers](https://openstax.org/books/precalculus-2e/pages/3-1-complex-numbers).
- [OpenStax, Precalculus 2e, §8.5: Polar Form of Complex Numbers](https://openstax.org/books/precalculus-2e/pages/8-5-polar-form-of-complex-numbers).

No source exercises, prose or diagrams were copied into the lesson. This finite multiplication lab does not model coherent signals, phasor addition or time traces.
