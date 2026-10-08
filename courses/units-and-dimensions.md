# Units and dimensions: conversions that preserve meaning

This course practices two connected skills: expressing the same quantity in a different unit, and checking the dimensions of a proposed relationship. It uses 12 original four-option questions, grouped into four concepts. Each question also has an open transfer task.

[Open the lesson JSON](units-and-dimensions.json). In RecallWeave, choose that file, inspect the preview, and select **Start this deck**. The [deck-format guide](../docs/deck-format.md) describes the import contract. This companion contains the answers, derivations, distractor rationales and worked transfer solutions; attempt the lesson first if you want to solve it without those answers.

## Scope and assumptions

All numerical values in the exercises are exact values within their stated models. Unit conversion factors are exact. The lesson does not ask you to infer measurement uncertainty or significant figures from the number of printed decimal places.

The physical situations are deliberately narrow. Rates are constant when stated; a sealed sample retains its stated density; pressure means a uniform normal force divided by the stated area; the force-to-power chain uses a constant-mass object and a constant net force parallel to its motion; each work calculation uses the stated constant force parallel to displacement; and the motion example is one-dimensional constant positive acceleration from rest. These assumptions are part of the problems.

The unit vocabulary centers on m, kg and s, with prefixes, g, min, h, L, mL, N, J, Pa and W. Minutes, hours and litres have published relations to SI units but are not SI base units. Temperature conversions with offsets, uncertainty propagation, chemistry calculations and circuit models are outside this lesson.

These questions are introductory practice, not a calibrated assessment. A correct answer is evidence about that particular response; neither a question score nor RecallWeave's illustrative model display establishes general mastery or a learning-effectiveness claim.

## The ideas to use

### 1. A quantity is more than its number

The statements `2.4 m` and `240 cm` describe the same length. Their numerical values differ because the units differ.

A conversion factor is a ratio of equal quantities. Since `1 m = 100 cm`:

```text
100 cm / 1 m = 1
1 m / 100 cm = 1
```

Both ratios equal one. Choose the orientation that cancels the unit you currently have and leaves the unit you want. That choice makes the calculation direct; it does not make the inverse ratio cease to equal one.

For example:

```text
2.4 m × (100 cm / 1 m) = 240 cm
```

Adding a length, dropping a prefix, or replacing a unit symbol without its scale factor is not the same operation.

### 2. Prefixes are part of the unit

The prefix facts used here are: mega M = 10^6, kilo k = 10^3, centi c = 10^−2 and milli m = 10^−3. Letter case matters. The symbol m alone denotes metre; the first m in mm is the milli prefix. Mass prefixes attach to g even though kg is the SI base unit. [NIST prefix reference][nist-prefixes]

A power applies to the whole prefixed unit. The unit in `cm^2` is `(cm)^2`, so its conversion factor is squared. Also distinguish:

```text
36 cm^2 = 36 × (cm)^2
(20 mm)^3 = 20^3 × (mm)^3
```

The number 36 in an area value is not itself squared again. In the cube formula, the complete edge quantity, including its number, is cubed.

### 3. A denominator needs its own conversion

A rate or density is a quotient. Write a conversion for every unit that changes and check its position above or below the fraction:

```text
speed       = distance / time
mass density = mass / volume
volume flow  = volume / time
```

Converting a per-minute rate to a per-hour rate multiplies its numerical value by 60, because one hour contains 60 minutes. Converting that same rate to a per-second rate divides by 60. Writing the cancellation is more reliable than a rule to always multiply or always divide.

### 4. Dimensions discard unit scale, not meaning

In `dim(...)` below, M, L and T stand for mass, length and time dimensions. These are dimension symbols; L in a volume such as `2 L` is instead the litre unit symbol.

| Quantity | Dimension | A unit used here |
|---|---|---|
| Length | L | m |
| Area | L^2 | m^2 |
| Volume | L^3 | m^3 |
| Speed | L T^−1 | m/s |
| Acceleration | L T^−2 | m/s^2 |
| Mass density | M L^−3 | kg/m^3 |
| Force | M L T^−2 | N = kg m/s^2 |
| Energy | M L^2 T^−2 | J = kg m^2/s^2 |
| Pressure | M L^−1 T^−2 | Pa = kg/(m s^2) |
| Power | M L^2 T^−3 | W = kg m^2/s^3 |

Dimensions and derived-unit relations are specified in BIPM sections 2.3.3–2.3.4. The treatment of prefixes and quantity algebra is in sections 3 and 5.4.1. [BIPM SI Brochure][bipm]

Equal dimensions are a necessary check for the two sides of a quantity equation. They do not prove its numerical coefficient, physical assumptions or interpretation. Similarly, two lengths can have the same dimension without the same value: `2 cm` and `2 m` remain different lengths.

### Exact relations used in the exercises

```text
1 km = 1000 m          1 m = 100 cm = 1000 mm
1 kg = 1000 g          1 g = 1000 mg
1 min = 60 s           1 h = 60 min = 3600 s
1 L = 1000 mL          1 L = 0.001 m^3
1 mL = 1 cm^3          1 cm^3 = 0.000001 m^3
```

The litre and time relations are given in NIST SP 330 section 4; the millilitre and cubic-centimetre relation follows from them and the prefix factors. [NIST non-SI unit relations][nist-time-volume]

## Try the offline conversion explorer

Open the [unit conversion explorer](unit-conversion-explorer.html) to change a value or unit and inspect the exact scale factors and dimension powers. Its calculation and lesson downloads work offline from the supplied HTML file. The explorer does not score the open transfer tasks.

Keep the number in the numerical-value field and use unit-only expressions in the unit fields. Write `kg*m^2/s^3` for the guide's `kg m^2/s^3`, and `kg/(m*s^2)` for `kg/(m s^2)`. Multiplication and division run from left to right; use parentheses when an entire product is the denominator. Powers take whole exponents: simplify the worked step `m^(1−2)` to `m^-1` before entering it. A formula such as `F = mass × acceleration` is reasoning in this guide, not an input expression for the explorer.

## Suggested route

Start with **Factors and prefixes**, then **Area and volume**, followed by **Rates and density**, and finally **Dimensions and models**. The deck's prerequisite names describe these conceptual links. RecallWeave uses them to select questions; they are not hard locks that prevent a question from appearing.

For each numerical problem, write the quantity, the conversion factor or stated relationship, the cancelled units, and the resulting number with its unit. For a dimensional problem, write the dimension of each factor before deciding what the result establishes.

The A–D labels in the solutions below refer to the four options in their stored order. In the JSON, answer indices start at zero.

## Complete solutions and transfer work

### 1. A factor equal to one

**Item:** `units-factor-unity`  
**Correct option: B** — `2.4 m × (100 cm / 1 m) = 240 cm`.

The numerator and denominator of `100 cm / 1 m` are the same length. Multiplication by this ratio preserves the original cable length:

```text
2.4 m × (100 cm / 1 m)
= (2.4 × 100) × (m × cm / m)
= 240 cm
```

The metre symbols cancel directly. The answer's numerical value is larger because a centimetre is a smaller unit than a metre.

| Option | Why it works or fails the requested operation |
|---|---|
| A: 0.024 cm | `1 cm / 100 m` is 0.0001, not one. The arithmetic shown follows that unequal ratio, so it changes the quantity. |
| B: 240 cm | Uses equal quantities in the ratio and leaves cm directly. |
| C: 0.024 m^2/cm | The ratio also equals one, but its orientation leaves m^2/cm. The expression still represents the original length; it has not completed the requested direct cancellation to cm. |
| D: 340 cm | Adding 100 cm adds another metre of length. It gives a different quantity rather than converting the cable's length. |

**Transfer prompt:** Express 0.085 km in m using a written conversion factor. Explain why the numerical value changes while the length stays the same.

**Worked transfer:**

```text
0.085 km × (1000 m / 1 km) = 85 m
```

The factor equals one. The unit count increases by 1000 because metres are one thousandth the size of kilometres; the length stays fixed.

### 2. Prefix case changes scale

**Item:** `units-prefix-case`  
**Correct option: D** — `4000000 J`.

Capital M means mega, so:

```text
4 MJ × (1000000 J / 1 MJ) = 4000000 J
```

This is a unit-symbol distinction, not a choice about sentence capitalization.

| Option | Rationale |
|---|---|
| A: 0.004 J | This would be 4 mJ, using lowercase milli. |
| B: 4000 J | This would be 4 kJ, using kilo instead of mega. |
| C: 4 J | Drops the prefix and therefore changes the energy. |
| D: 4000000 J | Applies the 10^6 mega factor. |

**Transfer prompt:** Convert both 7 mJ and 7 MJ to J. How many times larger is the second energy than the first? Explain why changing the letter case changes the quantity.

**Worked transfer:**

```text
7 mJ = 7 × 10^−3 J = 0.007 J
7 MJ = 7 × 10^6 J  = 7000000 J
(7000000 J) / (0.007 J) = 1000000000
```

The ratio is 10^9, or one billion. The unit J cancels in the comparison. Changing m to M changes the prefix from 10^−3 to 10^6.

### 3. Converting through grams

**Item:** `units-mass-chain`  
**Correct option: A** — `0.00036 kg`.

There are two factors of one thousand in the conversion from milligrams to kilograms:

```text
360 mg × (1 g / 1000 mg) × (1 kg / 1000 g)
= (360 / 1000 / 1000) kg
= 0.00036 kg
```

Both mg and g cancel. As a reverse check, `0.00036 kg × 1000000 mg/kg = 360 mg`.

| Option | Rationale |
|---|---|
| A: 0.00036 kg | Includes both factors of 1000 in the correct direction. |
| B: 0.36 kg | Divides only once; 0.36 is the number of grams, not kilograms. |
| C: 360000 kg | Multiplies by 1000 while relabelling the result, moving in the wrong direction. |
| D: 0.00000036 kg | Divides by an extra factor of 1000 that is not part of this conversion. |

**Transfer prompt:** Express 0.012 kg in g and in mg. Explain why standard prefixed mass-unit names are formed from gram, even though kilogram is the SI base unit.

**Worked transfer:**

```text
0.012 kg × (1000 g / 1 kg) = 12 g
12 g × (1000 mg / 1 g) = 12000 mg
```

Kilogram is the base-unit name that already includes a prefix. The SI convention forms other mass multiples and submultiples by prefixing gram, rather than stacking another prefix onto kilogram. Thus mg is an ordinary unit symbol used in the second step.

### 4. Squaring the conversion factor

**Item:** `units-square-factor`  
**Correct option: C** — `0.0036 m^2`.

Area contains two powers of length:

```text
36 cm^2 × (0.01 m / 1 cm)^2
= 36 × 0.0001 m^2
= 0.0036 m^2
```

A 1 m by 1 m square contains 100 by 100 square centimetres, so `1 m^2 = 10000 cm^2`. That supplies a geometric check on the squared factor.

| Option | Rationale |
|---|---|
| A: 0.36 m^2 | Uses the linear factor 0.01 once instead of squaring it. |
| B: 360000 m^2 | Multiplies by 10000, reversing the conversion direction. |
| C: 0.0036 m^2 | Uses `(0.01)^2 = 0.0001`. |
| D: 0.000036 m^2 | Uses `(0.01)^3`, a cubic factor for a squared unit. |

**Transfer prompt:** Express an area of 0.0045 m^2 in mm^2, showing a conversion factor raised to the second power. Explain why multiplying the numerical value by only 1000 is insufficient.

**Worked transfer:**

```text
0.0045 m^2 × (1000 mm / 1 m)^2
= 0.0045 × 1000000 mm^2
= 4500 mm^2
```

Each of the two length factors contributes 1000. Multiplying by 1000 only once would convert a length, not an area.

### 5. Cubing an edge and its unit

**Item:** `units-cube-edge`  
**Correct option: A** — `0.000008 m^3`.

Convert the edge and then use the stated volume relationship:

```text
20 mm × (0.001 m / 1 mm) = 0.02 m
V = (0.02 m)^3 = 0.000008 m^3
```

Alternatively, cube first and convert the resulting volume:

```text
V = (20 mm)^3 = 8000 mm^3
8000 mm^3 × (0.001 m / 1 mm)^3
= 8000 × 10^−9 m^3
= 0.000008 m^3
```

Both routes give the same result because the conversion applies to the entire edge quantity.

| Option | Rationale |
|---|---|
| A: 0.000008 m^3 | Converts and cubes correctly. |
| B: 0.008 m^3 | Can result from applying a squared conversion factor, 10^−6, to 8000 mm^3 instead of the cubic factor 10^−9. |
| C: 0.02 m^3 | Copies the converted edge's numerical value into a volume without cubing it. |
| D: 8 m^3 | Applies the linear factor 0.001 to 8000 mm^3 instead of cubing that factor. |

**Transfer prompt:** The cube's edge is increased to 40 mm. Calculate its new volume in m^3 and the ratio of new volume to old volume. Explain why doubling an edge does not merely double the volume.

**Worked transfer:**

```text
40 mm = 0.04 m
V_new = (0.04 m)^3 = 0.000064 m^3
V_new / V_old = 0.000064 / 0.000008 = 8
```

Each of the three edge factors doubles, so the volume multiplies by `2 × 2 × 2 = 8`. This time the physical cube changes; that is different from merely expressing a fixed cube's volume in another unit.

### 6. Linking millilitres, litres and cubic metres

**Item:** `units-litre-bridge`  
**Correct option: D** — `0.75 L and 0.00075 m^3`.

Apply the two stated equalities in sequence:

```text
750 mL × (1 L / 1000 mL) = 0.75 L
0.75 L × (0.001 m^3 / 1 L) = 0.00075 m^3
```

The prefix in mL scales the litre unit. It does not mean that the factor from mL to m^3 is merely 0.001: the litre itself is already 0.001 m^3.

| Option | Rationale |
|---|---|
| A: 0.75 L and 0.75 m^3 | The litre value is correct, but the second conversion is omitted. |
| B: 0.00075 L and 0.00000075 m^3 | The first step divides by an extra 1000; the internally consistent pair then describes the wrong volume. |
| C: 750 L and 0.75 m^3 | Drops the milli prefix in the first step; the internally consistent pair is 1000 times too large. |
| D: 0.75 L and 0.00075 m^3 | Both numbers describe the stated 750 mL. |

**Transfer prompt:** Express 1.8 L in cm^3 and in m^3 using two unit-cancelling chains. Show that the two answers describe the same volume.

**Worked transfer:**

```text
1.8 L × (1000 mL / 1 L) × (1 cm^3 / 1 mL) = 1800 cm^3
1.8 L × (0.001 m^3 / 1 L) = 0.0018 m^3

1800 cm^3 × (0.01 m / 1 cm)^3 = 0.0018 m^3
```

The final line checks that the independently obtained representations agree.

### 7. Converting both parts of a speed

**Item:** `units-speed-denominator`  
**Correct option: B** — `15 m/s`.

A speed written per hour has h in its denominator. The factor must place h in its numerator to cancel it:

```text
54 km/h × (1000 m / 1 km) × (1 h / 3600 s)
= (54 × 1000 / 3600) m/s
= 15 m/s
```

As a check, 15 m every second gives `15 × 3600 = 54000 m`, or 54 km, in one hour.

| Option | Rationale |
|---|---|
| A: 194.4 m/s | Multiplies by 3.6, the numerical conversion used for the opposite direction. |
| B: 15 m/s | Converts km and h in the positions needed for cancellation. |
| C: 54000 m/s | Converts kilometres but leaves out the hour-to-second factor. |
| D: 0.015 m/s | Divides by 3600 without converting kilometres to metres. |

**Transfer prompt:** A belt moves at a constant 1.25 m/s without stopping. How many minutes does a marked point take to travel 750 m, and what is the belt's speed in km/h? Show the unit cancellations.

**Worked transfer:**

```text
time = distance / speed
     = (750 m) / (1.25 m/s)
     = 600 s
600 s × (1 min / 60 s) = 10 min

1.25 m/s × (1 km / 1000 m) × (3600 s / 1 h)
= 4.5 km/h
```

The constant-speed assumption permits `time = distance / speed` over the whole journey.

### 8. Two scales in a density

**Item:** `units-density-two-scales`  
**Correct option: C** — `1200 kg/m^3`.

Use separate factors for mass and volume:

```text
1.2 g/mL × (0.001 kg / 1 g) × (1 mL / 0.000001 m^3)
= (1.2 × 0.001 / 0.000001) kg/m^3
= 1200 kg/m^3
```

The net factor is 1000. The smaller numerical mass factor does not cancel the volume factor because the two prefixes refer to differently sized units.

| Option | Rationale |
|---|---|
| A: 0.0012 kg/m^3 | Applies only the mass conversion, while relabelling mL as m^3. |
| B: 1.2 kg/m^3 | Treats the net factor as one. Converting g/mL to kg/L would preserve the number 1.2, but kg/m^3 requires a further factor of 1000. |
| C: 1200 kg/m^3 | Includes both stated unit sizes. |
| D: 1200000 kg/m^3 | Applies only the volume conversion, while relabelling g as kg. |

**Transfer prompt:** A sealed sample occupies 0.25 L and retains the stated density of 1.2 g/mL. Find its mass in kg. Solve once using g/mL and once using kg/m^3, and compare the results.

**Worked transfer:**

```text
0.25 L = 250 mL
mass = (1.2 g/mL) × (250 mL) = 300 g = 0.3 kg

0.25 L = 0.00025 m^3
mass = (1200 kg/m^3) × (0.00025 m^3) = 0.3 kg
```

Both calculations give the same sample mass. Changing the representation of density did not change the fluid or its volume.

### 9. A volume flow per hour

**Item:** `units-flow-time`  
**Correct option: A** — `0.144 m^3/h`.

Convert litres to cubic metres and count the number of minute intervals per hour:

```text
2.4 L/min × (0.001 m^3 / 1 L) × (60 min / 1 h)
= 0.144 m^3/h
```

After one hour, the stated constant flow would deliver `2.4 × 60 = 144 L`, which is 0.144 m^3.

| Option | Rationale |
|---|---|
| A: 0.144 m^3/h | Correctly converts volume and changes the denominator from min to h. |
| B: 0.00004 m^3/h | Divides by 60 rather than multiplying. The number 0.00004 would describe the rate in m^3/s, not m^3/h. |
| C: 144 m^3/h | Changes the time interval but omits the litre-to-cubic-metre factor. |
| D: 0.0024 m^3/h | Converts litres but omits the minute-to-hour factor. |

**Transfer prompt:** At this same constant flow rate, how many mL enter the tank in 25 s? Assume there are still no leaks. Write the calculation so that both L and min cancel.

**Worked transfer:**

```text
(2.4 L/min) × (1000 mL / 1 L) × (1 min / 60 s) × (25 s)
= 1000 mL
```

The flow is 40 mL/s, so 25 seconds delivers 1000 mL. Constant delivery and no leaks make the delivered volume equal the tank's increase in contents.

### 10. From force to energy to power

**Item:** `units-power-dimensions`  
**Correct option: D** — `kg m^2/s^3`.

Apply the relationships given in the question. F is the net force in the constant-mass relation F = mass × acceleration:

```text
F = mass × acceleration
unit(F) = kg × (m/s^2) = kg m/s^2 = N

E = F × distance
unit(E) = (kg m/s^2) × m = kg m^2/s^2 = J

P = E / elapsed time
unit(P) = (kg m^2/s^2) / s = kg m^2/s^3 = W
```

Thus `dim(P) = M L^2 T^−3`. The extra inverse power of time distinguishes power from energy.

| Option | Rationale |
|---|---|
| A: kg m/s^2 | This is force, before multiplying by distance. |
| B: kg m^2/s^2 | This is energy, before dividing by time. |
| C: kg m^2/s | Multiplies energy by time rather than dividing it by time. |
| D: kg m^2/s^3 | Represents energy per unit time. |

**Transfer prompt:** A constant force of 6 N acts parallel to a displacement of 2.5 m over 3 s. Find the energy transferred in J and the average power in W, and expand both results in kg, m and s.

**Worked transfer:**

```text
E = (6 N) × (2.5 m) = 15 J = 15 kg m^2/s^2
P_average = (15 J) / (3 s) = 5 W = 5 kg m^2/s^3
```

The parallel, constant force permits the stated product for energy transferred. Dividing by the full three-second interval gives average power; it does not require an additional claim that instantaneous power was constant.

### 11. Dividing force by area

**Item:** `units-pressure-dimensions`  
**Correct option: C** — `1 kg/(m s^2)`.

Use exponent subtraction when dividing by area:

```text
1 Pa = 1 N/m^2
     = (1 kg m/s^2)/m^2
     = 1 kg m^(1−2)/s^2
     = 1 kg/(m s^2)
```

The force numerator already contains one power of length. Dividing by two powers leaves length to the power −1, not −2.

| Option | Rationale |
|---|---|
| A: 1 kg m/s^2 | Leaves the force unit unchanged; no area division has occurred. |
| B: 1 kg m^2/s^2 | Is the energy unit, obtained by multiplying force by length. |
| C: 1 kg/(m s^2) | Subtracts the two area powers from the force's one length power. |
| D: 1 kg/(m^2 s^2) | Forgets the length already present in the force unit. |

**Transfer prompt:** A uniform normal force of 180 N acts over 300 cm^2. Calculate the pressure in Pa and in kPa. Explain how the area conversion enters the calculation.

**Worked transfer:**

```text
A = 300 cm^2 × (0.01 m / 1 cm)^2 = 0.03 m^2
p = (180 N) / (0.03 m^2) = 6000 Pa
6000 Pa × (1 kPa / 1000 Pa) = 6 kPa
```

The squared factor converts the area in the denominator. Treating cm^2 as if it were cm would produce the wrong numerical pressure even if the final unit label were written Pa.

### 12. A dimensional pass is not a physical proof

**Item:** `units-dimensions-not-proof`  
**Correct option: B** — the dimensions match, but that check cannot establish the formula or its coefficient.

Acceleration has dimension `L T^−2` and time has dimension T:

```text
dim(a t^2) = (L T^−2) × T^2 = L
dim(x) = L
```

So the proposed relationship passes the dimensional check. Multiplying its right side by any dimensionless constant would also pass. Dimensions therefore cannot choose between coefficients 1, 1/2 or 3.

The stated motion assumptions provide more information. Constant acceleration from rest means the velocity rises linearly from 0 to `a t`. The average velocity over that interval is `a t/2`, so:

```text
displacement = average velocity × elapsed time
             = (a t / 2) × t
             = a t^2 / 2
```

This is also the triangular area under the velocity-versus-time line. It is additional reasoning about the motion, not a result of dimensional matching alone.

| Option | Rationale |
|---|---|
| A: Dimensions prove the law | A necessary consistency check is being treated as sufficient proof. It cannot fix a dimensionless coefficient. |
| B: Match without proof | Correctly states what the dimensional check establishes and what remains to be justified. |
| C: Velocity dimension | Cancels only one factor of t even though the expression contains t^2. |
| D: Dimensions determine 1/2 | The coefficient comes from the stated motion and its changing velocity, not from units alone. |

**Transfer prompt:** For the same motion, compare x = a t and x = 3 a t^2. Which proposal can be discarded by dimensions alone? Use velocity-versus-time reasoning to assess the coefficient in the other proposal.

**Worked transfer:**

```text
dim(a t) = (L T^−2) × T = L T^−1
dim(3 a t^2) = 1 × (L T^−2) × T^2 = L
```

The first proposal has velocity dimension and cannot equal displacement as written. The second passes the dimensional check, because 3 is dimensionless, but the triangular velocity-time area requires a coefficient of 1/2. For the specified positive a and t, `3 a t^2` is six times that displacement. Dimensional analysis detects the first defect; the motion assumptions expose the second.

## Answer map and course construction

| Item | Concept | Correct option | JSON index |
|---|---|---|---:|
| units-factor-unity | Factors and prefixes | B | 1 |
| units-prefix-case | Factors and prefixes | D | 3 |
| units-mass-chain | Factors and prefixes | A | 0 |
| units-square-factor | Area and volume | C | 2 |
| units-cube-edge | Area and volume | A | 0 |
| units-litre-bridge | Area and volume | D | 3 |
| units-speed-denominator | Rates and density | B | 1 |
| units-density-two-scales | Rates and density | C | 2 |
| units-flow-time | Rates and density | A | 0 |
| units-power-dimensions | Dimensions and models | D | 3 |
| units-pressure-dimensions | Dimensions and models | C | 2 |
| units-dimensions-not-proof | Dimensions and models | B | 1 |

There are three questions per concept and three correct answers in each option position. This balancing is a content-design choice; it does not validate the assessment or refit RecallWeave's learner model. The transfer tasks require an explanation or calculation beyond selecting an option. Their worked answers are for comparison and discussion, not a separately validated scoring rubric.

## Primary references, authorship and reuse

The questions, numerical examples, distractors, explanations and worked transfer solutions were originally authored for RecallWeave with AI assistance on 2026-10-08. The reference sources supply unit definitions and conventions; no source exercise or question wording is reproduced.

1. **Bureau International des Poids et Mesures.** *The International System of Units (SI)*, 9th edition, version 4.01, June 2026. Sections 2.3.3–2.3.4 cover dimensions and derived units; section 3 covers prefixes and powers; section 4 lists non-SI unit relations; section 5.4.1 describes quantity algebra. [Publication and English text][bipm]. [DOI](https://doi.org/10.59161/AUEZ1291).
2. **NIST, Office of Weights and Measures.** *Metric (SI) Prefixes*, updated 2025-08-13. Prefix factors, capitalization and the gram convention for prefixed mass units. [Official page][nist-prefixes].
3. **NIST.** *Special Publication 330, section 4*, updated 2025-08-18. Table 8 supplies the minute, hour and litre relations used in this lesson. [Official page][nist-time-volume]. The current BIPM brochure and this NIST page use different section/table headings for non-SI units; the selected numerical relations agree.

Sources were checked on 2026-10-08. The examples use elementary algebra and explicitly stated model relationships; an institutional reference is not an endorsement of these questions.

**Reuse notice:** No separate license grant is made by this course. The linked references retain their own terms. This notice does not relicense BIPM or NIST materials, or any other repository content.

[bipm]: https://www.bipm.org/en/publications/si-brochure
[nist-prefixes]: https://www.nist.gov/pml/owm/metric-si-prefixes
[nist-time-volume]: https://www.nist.gov/pml/special-publication-330/sp-330-section-4
