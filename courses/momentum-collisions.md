# Momentum and collisions: what stays, what changes

Open [the offline explorer](momentum-collisions-explorer.html), or download [the original twelve-question lesson](momentum-collisions.json) and choose it through RecallWeave's **Bring your own lesson** flow. Inspect the preview and explicitly choose **Start this deck**. The learner's ordinary review, separate missed-item practice and study-note downloads remain available.

## Begin with the system and direction

This is an idealized classical model of two positive, fixed masses translating along one line. Right is positive. Cart A starts strictly to the left of cart B with a positive gap, and both incoming velocities stay constant until contact. The explorer accepts whole-number masses from 1 through 100 kg and whole-number incoming velocities from -20 through +20 m/s. Those limits keep this teaching calculation small and its displayed fractions exact; they are not material or experimental limits.

The separation is xB - xA, so its rate of change is uB - uA. A future encounter is possible for this ordering only when uA > uB. Equal incoming velocities leave the gap constant; uA < uB makes it grow. The explorer displays the initial state but supplies no collision endpoints in either case. Two carts can move in the same direction and still approach: for uA = -1 and uB = -3, B catches A from the right.

Calculated collision endpoints assume zero net external impulse on the two-cart system. They describe two different ideal events; they do not classify a measured interaction. Contact force, duration, deformation history, rotation, friction and relativistic effects are outside this model. The arrows compare velocities before and after an event; their spacing and length are not a position or time simulation.

## Three quantities to keep separate

For each cart, signed momentum is p = m v and translational kinetic energy is K = m v² / 2. Negative velocity gives negative momentum under the chosen direction convention, but a positive mass always has nonnegative kinetic energy.

The combined momentum P = mA uA + mB uB is unchanged by an event with zero net external impulse. That does not mean either cart keeps its own momentum. It also does not require the total translational kinetic energy to stay the same. A known nonzero net external impulse J instead gives Pfinal = Pinitial + J.

The center-of-mass velocity is V = P / (mA + mB). With M = mA + mB and reduced mass μ = mA mB / M, direct expansion gives the energy identity

K = P² / (2M) + (μ / 2)(uA - uB)².

The first term belongs to the motion of the center of mass. The second belongs to relative motion. Both terms are nonnegative. At fixed positive masses and total momentum, the smallest possible translational kinetic energy occurs when both final velocities equal V; the relative-motion term is then zero. This shared velocity may be nonzero.

## Compare the two ideal events

An **elastic** event conserves translational kinetic energy as well as momentum. The separating solution reverses the relative velocity: vA - vB = -(uA - uB). Solving that relation together with momentum conservation gives

- vA = ((mA - mB)uA + 2 mB uB) / (mA + mB).
- vB = ((mB - mA)uB + 2 mA uA) / (mA + mB).

Conservation of momentum and kinetic energy alone also admits the unchanged incoming velocity pair. For approaching carts that pair is still approaching; it is not the separating outcome of the stated collision. The relative-velocity condition selects the event being modeled.

In a **completely inelastic** event, the carts stick and share vA = vB = V. Momentum still balances. The reduction in translational kinetic energy is

Kinitial - Kfinal = mA mB (uA - uB)² / (2(mA + mB)).

This is conversion to other energy forms, not destruction of total energy. The endpoint model does not identify how the converted amount is distributed among internal motion, deformation or other forms. It does not infer a coefficient of restitution or a material property from the inputs.

## Worked comparisons

For mA = 2 kg, mB = 1 kg, uA = +3 m/s and uB = 0 m/s, the total momentum is +6 kg m/s and the initial kinetic energy is 9 J. The elastic endpoint is (+1, +4) m/s, retaining 9 J. The completely inelastic endpoint is (+2, +2) m/s, with 6 J of translational kinetic energy and 3 J converted to other forms.

For mA = 1 kg, mB = 2 kg, uA = +3 m/s and uB = -1 m/s, P = +1 kg m/s and Kinitial = 11/2 J. The elastic velocities are (-7/3, +5/3) m/s. The shared completely inelastic velocity is +1/3 m/s, its final kinetic energy is 1/6 J, and the converted amount is 16/3 J. The displayed fractions are exact; any decimal companion is explicitly an approximation.

For two 1 kg carts approaching at +3 and -3 m/s, total momentum is zero while initial kinetic energy is 9 J. The elastic event exchanges their velocities. The completely inelastic event stops them together. Zero total momentum does not imply that the initial carts were stationary or had no kinetic energy.

## Use and keep an exploration

Choose an example and select **Load example**, or enter both masses and incoming velocities. **Compare models** calculates the initial state and, when the carts approach, both ideal endpoints. All three velocity diagrams share the same scale. Cart letters, exact tables and direction signs carry the information alongside color.

Editing a field clears the displayed calculation and disables its download until it is compared again. An invalid mass, velocity, decimal, exponent or missing field cannot leave an earlier accepted result ready to save. A valid equal-velocity or separating case may be downloaded as a **no-collision** analysis: it retains the initial state and explicit null endpoint fields, not invented collision values.

**Download this analysis** saves the entered text, admitted integer inputs, assumptions, units, event status and complete exact calculation as JSON. Every rational quantity has a signed numerator string and a positive denominator string in lowest terms. Its format is `recallweave.momentum-collisions/1`. It is an inspectable calculation record, separate from a learner-answer archive; this explorer does not reopen records. The original course and this guide can be downloaded even before a calculation. Files are saved through the browser; nothing is uploaded or written automatically to browser storage.

## Original question explanations

### 1. momentum-sign

Cart A has mass 2 kg and velocity -3 m/s, where right is positive. What is its signed momentum?

**Correct response:** -6 kg m/s

Momentum is mass times signed velocity: p = 2 × (-3) = -6 kg m/s. The minus sign describes leftward momentum under the stated direction convention. Squaring the velocity belongs in kinetic energy, not momentum.

**Apply the idea:** Reverse the chosen positive direction without changing the cart's physical motion. Explain what changes in its momentum and what stays the same in its kinetic energy.

### 2. zero-total-moving

A 1 kg cart moves at +4 m/s and a 2 kg cart moves at -2 m/s. What are their total signed momentum p and total translational kinetic energy K?

**Correct response:** p = 0 kg m/s; K = 12 J

The momenta are +4 and -4 kg m/s, so their sum is zero. Their kinetic energies are (1/2) × 1 × 4² = 8 J and (1/2) × 2 × (-2)² = 4 J. Kinetic energy is nonnegative for each positive mass, so the total is 12 J even though the total momentum is zero.

**Apply the idea:** Invent a different pair of moving carts with zero total momentum. Check whether their total kinetic energy can be zero.

### 3. system-boundary

Treat both carts together as one fixed-mass system. The net external impulse during their interaction is zero. Which statement must hold?

**Correct response:** The sum of the carts' signed momenta is unchanged.

Internal interaction forces transfer momentum between the carts. With zero net external impulse on the combined fixed-mass system, those internal transfers do not change the total momentum between the initial and final states. Individual momenta can change, and translational kinetic energy need not be conserved.

**Apply the idea:** Choose a system boundary for a cart striking a wall. Which interaction becomes external if the wall is left outside the system?

### 4. stick-weighted-velocity

Cart A (2 kg, +3 m/s) approaches cart B (1 kg, 0 m/s) from the left. They undergo a completely inelastic collision with zero net external impulse. What common velocity do they have afterward?

**Correct response:** +2 m/s

The total initial momentum is 2 × 3 + 1 × 0 = 6 kg m/s. Sticking requires one shared final velocity, so (2 + 1)v = 6 and v = +2 m/s. The ordinary average +1.5 m/s ignores the different masses.

**Apply the idea:** Predict how the shared velocity changes if the initially stationary cart's mass increases while the incoming cart stays the same.

### 5. elastic-unequal

Cart A (2 kg, +3 m/s) approaches cart B (1 kg, 0 m/s) from the left. An ideal elastic collision conserves momentum and translational kinetic energy, and the carts separate afterward. Which pair of final velocities (vA, vB) is consistent with this event?

**Correct response:** (+1, +4) m/s

For (+1, +4), the final momentum is 2 × 1 + 1 × 4 = 6 kg m/s and the kinetic energy is (1/2) × 2 × 1² + (1/2) × 1 × 4² = 9 J, matching the initial values. The relative velocity changes from +3 to -3 m/s, so the carts separate. The unchanged (+3, 0) pair also satisfies the two conservation equations, but it is still approaching and does not describe the stated separating collision event.

**Apply the idea:** Why do two conservation equations still need an event/separation condition in this example? Explain the unchanged algebraic branch.

### 6. elastic-equal-masses

Two 1 kg carts approach each other: A, initially on the left, has uA = +4 m/s; B has uB = -2 m/s. After an ideal one-dimensional elastic collision, what are (vA, vB)?

**Correct response:** (-2, +4) m/s

In an ideal one-dimensional elastic collision of equal masses, the velocities exchange. The final pair (-2, +4) retains momentum +2 kg m/s and kinetic energy 10 J. The relative velocity changes from +6 to -6 m/s. Simply negating both incoming velocities would reverse the total momentum here.

**Apply the idea:** Choose two equal-mass incoming velocities whose sum is not zero. Show why swapping them preserves momentum but negating them does not.

### 7. inelastic-energy

Cart A (2 kg, +3 m/s) meets cart B (1 kg, 0 m/s). They stick and move together at +2 m/s with no net external impulse. How much translational kinetic energy is converted to other forms during this idealized event?

**Correct response:** 3 J

The initial translational kinetic energy is (1/2) × 2 × 3² = 9 J. The combined 3 kg mass moving at +2 m/s has (1/2) × 3 × 2² = 6 J. The difference is 3 J. Total momentum remains +6 kg m/s, while that 3 J is converted to energy forms outside this endpoint model's translational accounting.

**Apply the idea:** Repeat the initial and final kinetic-energy calculation for a different pair that sticks. State separately what momentum conservation tells you.

### 8. energy-not-destroyed

Two 1 kg carts approach at +3 m/s and -3 m/s. They stick and stop, reducing their total translational kinetic energy from 9 J to 0 J. Which interpretation is justified?

**Correct response:** The 9 J has changed into other energy forms; this endpoint model does not resolve their distribution.

The initial momenta +3 and -3 kg m/s cancel, so stopping together preserves their total momentum. Translational kinetic energy can change into internal motion, deformation and other energy forms without destroying total energy. The endpoint calculation alone cannot say how the 9 J is divided among those forms.

**Apply the idea:** What extra observations would be needed to estimate how kinetic energy was distributed into deformation, internal energy or sound?

### 9. approach-ordering

A begins to the left of B with a positive gap. Both keep their incoming velocities until contact. Which pair (uA, uB) makes the gap shrink so a future encounter is possible?

**Correct response:** (-1, -3) m/s

Let the positive gap be xB - xA. Its rate of change before contact is uB - uA. For (-1, -3), this is -3 - (-1) = -2 m/s, so the gap shrinks. B moves left faster than A and can catch it. Motion in the same direction does not by itself rule out a collision.

**Apply the idea:** Choose two positive velocities and then two negative velocities that make the gap shrink. Use uB - uA to justify both.

### 10. equal-velocity-gap

A begins to the left of B with a positive gap. Both move at +2 m/s and have no acceleration before contact. What should a collision explorer report?

**Correct response:** Their gap stays constant, so these inputs do not produce a future collision.

Equal incoming velocities give a zero gap-change rate. Starting from a positive gap, the carts remain separated under constant velocities. A completely inelastic formula describes what follows an encounter; it cannot create an encounter when these motion assumptions provide none.

**Apply the idea:** Give one additional physical condition that could create a later encounter despite initially equal velocities. Explain which current assumption it would change.

### 11. external-impulse

The two-cart system initially has total momentum +6 kg m/s. During an interaction it receives a known net external impulse of +2 kg m/s. What follows?

**Correct response:** Its final momentum is +8 kg m/s; the zero-external-impulse collision formulas do not apply unchanged.

The change in total momentum equals the net external impulse. Therefore Pfinal = +6 + (+2) = +8 kg m/s. Internal transfers still cancel in the combined accounting, but the external impulse changes the total. The zero-external-impulse formulas are not an unchanged solution to this different problem.

**Apply the idea:** State what the known net impulse determines about the combined system and what additional information you would need for the two individual final velocities.

### 12. minimum-kinetic-energy

For two fixed positive masses and a fixed total momentum, why is the shared velocity of a completely inelastic endpoint the state with the least translational kinetic energy?

**Correct response:** Any relative motion adds nonnegative kinetic energy above the center-of-mass motion, and this extra term is zero only at a shared velocity.

Write M = mA + mB, P for the fixed total momentum, and μ = mA mB / M. The total translational kinetic energy is P²/(2M) + (μ/2)(vA - vB)². The first term is fixed. Because both masses are positive, the second is nonnegative and vanishes exactly when vA = vB = P/M. A shared velocity need not be zero.

**Apply the idea:** Use the energy decomposition to explain why nonzero total momentum prevents the two-cart system from having zero total translational kinetic energy.

## Sources, authorship and reproduction

The conceptual definitions and physical limits were checked against [OpenStax, University Physics Volume 1, 9.2: Impulse and Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-2-impulse-and-collisions), [9.3: Conservation of Linear Momentum](https://openstax.org/books/university-physics-volume-1/pages/9-3-conservation-of-linear-momentum), [9.4: Types of Collisions](https://openstax.org/books/university-physics-volume-1/pages/9-4-types-of-collisions), and [MIT OpenCourseWare 8.01SC, Chapter 15: Collision Theory](https://ocw.mit.edu/courses/8-01sc-classical-mechanics-fall-2016/mit8_01scs22_chapter15.pdf). The examples, questions, explanations, transfer prompts and diagrams are original. They are dedicated under CC0-1.0; references retain their own terms. No textbook passages or figures are reproduced.

The lesson's structural checks and scripted learner receiving establish compatibility with the existing product. They do not establish learning effectiveness or assessment validity. The existing model's estimates remain illustrative model state.

Build the standalone explorer with `node tools/build-momentum-collisions.mjs`; add `--check` to require byte-identical source/deck/guide parity. Native checks run with `node --test tests/momentum-collisions*.test.mjs`. The optional actual-browser receiver is `tools/check_momentum_collisions_browser.mjs`; it uses an existing Chromium executable and a separate receiving directory. Product execution requires no server, dependency installation or network connection.
