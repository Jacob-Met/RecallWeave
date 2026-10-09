# Circuit reference signs: which way does the label point?

Six fictional paper cases about voltage labels, current arrows and electrical power. Work from the stated terminal data, rather than guessing what is inside a component. No apparatus, app, calculator or circuit simulator is needed.

Try every question before reading the worked section. For each numerical answer, keep the sign, unit and terminal names. A bare minus sign is not an explanation: say which reference it opposes or which energy-transfer direction it describes.

This is a prerequisite companion to [DC circuits](dc-circuits.md) and [RC transients](rc-transients.md). It focuses on reading their reference conventions, without solving another resistor network or capacitor response.

## Rules for all six cases

Every element has exactly two named terminals. Use the stipulated steady values in an ideal lumped model: the current entering one terminal leaves the other. The elements are unnamed internally; none is assumed to be a resistor, battery or capacitor. Separate states in a table are separate hypothetical records, not a switching sequence.

For an element with terminals A and B:

- Capital $V_A$ and $V_B$ are terminal potentials measured relative to the **same reference zero**.
- Define $v_{AB}=V_A-V_B$. Its voltage label has **+ at A and − at B**. Reversing that label defines $v_{BA}=V_B-V_A=-v_{AB}$.
- Define $i_A$ as conventional current **entering the element at A** and leaving it at B. A positive value follows that reference; a negative value describes current entering at B instead. Zero means no net current direction.
- The opposite reference, $i_B$, is conventional current entering the same element at B and leaving at A. Thus $i_B=-i_A$.
- A **+ voltage label** does not promise that its terminal has the higher actual potential. The signed voltage supplies that information. Current arrows are references, not claims about electron motion.

### Pair the references before multiplying

With the preceding definitions, absorbed electrical power is

$$
p_{\mathrm{abs}}=v_{AB}i_A.
$$

Here the positive current reference enters the terminal carrying the + voltage label. This is the **passive reference pairing**. If instead the chosen current enters the terminal carrying the − label,

$$
p_{\mathrm{abs}}=-v_{AB}i_B.
$$

That opposite pairing is sometimes called an active or generator reference convention. These names describe labels, not the type of component.

- $p_{\mathrm{abs}}>0$: the element absorbs electrical power.
- $p_{\mathrm{abs}}<0$: it delivers electrical power of magnitude $-p_{\mathrm{abs}}$.
- Signed delivered power is $p_{\mathrm{del}}=-p_{\mathrm{abs}}$.
- At $p_{\mathrm{abs}}=0$, there is no net electrical power transfer in this model.

The numerical product of whichever voltage and current variables happen to be printed together is not automatically absorbed power. Use their pairing. Changing labels for the **same state** changes the corresponding signed coordinates, not the physical power transfer.

Use volts (V), amperes (A) and watts (W). One milliampere is 0.001 A; V × mA gives mW, and 1,000 mW = 1 W. Treat all supplied numbers as exact teaching data.

Adding one common constant to every stated terminal potential changes the chosen zero, not the potential differences. This is a change of description, not an instruction to alter a circuit. Do not infer resistance, internal heating or storage, a duration, or total energy from these cases.

## Case 1 — A plus label below zero

Element E1 has terminals A and B. Its potentials share one reference zero:

| Quantity | Stated value |
| --- | ---: |
| $V_A$ | −2 V |
| $V_B$ | +5 V |
| $i_A$, entering E1 at A | +0.30 A |

1. Calculate $v_{AB}$ and $v_{BA}$. Which terminal actually has the higher potential?
2. State where conventional current enters and leaves E1. Is the + label for $v_{AB}$ a claim that A is the higher-potential terminal?
3. Calculate both signed $p_{\mathrm{abs}}$ and signed $p_{\mathrm{del}}$. Describe the energy-transfer direction in a sentence.
4. A learner says, “The current is positive, so the element must absorb power.” Does that reasoning work here? Can these terminal data alone identify E1 as a particular kind of device?

## Case 2 — The current reference enters the minus-labelled terminal

Element E2 has terminals P and Q. Define $v_{PQ}=V_P-V_Q$, with + at P and − at Q. In both records below, $i_Q$ is conventional current **entering E2 at Q**, not at P.

| Independent record | $v_{PQ}$ | $i_Q$ |
| --- | ---: | ---: |
| L | −12 V | +75 mA |
| H | +12 V | +75 mA |

1. For each record, identify the higher-potential terminal and the terminal where conventional current enters E2.
2. Write the correct formula for absorbed power using the supplied variables $v_{PQ}$ and $i_Q$. Calculate it for each record in both mW and W.
3. Give signed delivered power for each record and state which record describes absorption and which describes delivery.
4. A learner multiplies the two printed numbers and calls the result absorbed power. Identify the missing convention check. Do the equal positive current values force the two records to have the same power-transfer direction?

## Case 3 — Four descriptions of one state

Element E3 has terminals U and V. In one fixed state, $v_{UV}=+10$ V and $i_U=-0.060$ A. Here $i_U$ enters E3 at U; $i_V$ enters E3 at V. Define the ordered voltages exactly as in the rules.

No physical condition changes between the following rows.

| Description | Voltage variable | Current variable |
| --- | --- | --- |
| Original | $v_{UV}$ | $i_U$ |
| Reverse only the voltage label | $v_{VU}$ | $i_U$ |
| Reverse only the current arrow | $v_{UV}$ | $i_V$ |
| Reverse both references | $v_{VU}$ | $i_V$ |

1. For every row, give both signed variable values, the correct absorbed-power formula in those variables, and the resulting $p_{\mathrm{abs}}$.
2. Which rows use the passive reference pairing? In which rows would multiplying the printed voltage and current values without another sign report $p_{\mathrm{del}}$ instead?
3. In this state, where does conventional current actually enter E3, and does E3 absorb or deliver electrical power? Explain why those answers survive all four descriptions.
4. Someone reverses only the current arrow but keeps its old numerical value. Is that a faithful relabeling of the same state? State the required correction.

## Case 4 — A different zero for the same potentials

Element E4 has terminals K and L. Initially, $V_K=+11$ V and $V_L=-4$ V relative to a common zero. Define $v_{KL}=V_K-V_L$ and $i_K=+40$ mA entering E4 at K.

A second writer subtracts 20 V from **both** terminal potentials solely to change the reference zero. A third writer starts from the original values and chooses a zero for which L has potential 0 V. The element and its current are unchanged throughout.

1. Write the two terminal potentials for all three descriptions.
2. For each description, calculate $v_{KL}$ and $p_{\mathrm{abs}}$. Does the reference change alter which terminal is higher or which terminal the current enters?
3. Is the original number “−4 V at L” by itself the voltage across E4? Explain the information an across-element voltage needs.
4. Another note replaces only $V_K$ by $V_K-20$ V and leaves $V_L$ unchanged. Can that note describe the same state merely by changing its reference zero? Compare its potential difference with the original, without inventing a physical circuit change.

## Case 5 — Zero is a result, not missing data

Element E5 has terminals S and T. Use $v_{ST}=V_S-V_T$ and $i_S$ entering E5 at S. Each row is an independent stipulated state.

| State | $v_{ST}$ | $i_S$ |
| --- | ---: | ---: |
| A | 0 V | +120 mA |
| B | −6 V | 0 A |
| C | 0 V | 0 A |

1. For each state, calculate $p_{\mathrm{abs}}$ and $p_{\mathrm{del}}$. State whether there is a net conventional-current direction, and identify the entry terminal when there is one.
2. Which state or states have equal terminal potentials? Which have zero current? Keep these two questions separate.
3. Evaluate: “Zero absorbed power requires both voltage and current to be zero.” Use the table to support your answer.
4. Does zero terminal power identify the element's internal construction or prove it holds no stored energy? State the limit of what the supplied terminal data establish.

## Case 6 — A record that does not determine power

Element E6 has terminals M and N. The **only quantity supplied in this fictional record** is $v_{MN}=+3.5$ V, defined as $V_M-V_N$. No current, resistance or internal-device law is given. If used, $i_M$ means conventional current entering E6 at M.

1. Identify what the voltage establishes about the relative terminal potentials. Does it determine either terminal's individual potential relative to an unspecified zero?
2. Does the record determine current magnitude, current direction, or absorbed power? Assess the claim, “The current field is missing, so use zero and report zero power.”
3. Consider two explicitly hypothetical completions of the record: one with $i_M=+0.20$ A, the other with $i_M=-0.20$ A. Calculate absorbed and delivered power for each and interpret them. Explain why these alternatives demonstrate insufficient information in the original record; they are not observations or device predictions.
4. A later note adds only “current magnitude 0.20 A,” with no entry terminal or signed-current convention. Is power's sign now determined? State what direction information would settle it.
5. Without further component data, can the original record justify applying a fixed-resistor relation or assigning a device identity? Explain.

## Before checking your work

For each case, check the subtraction order, the terminal entered by positive current, the sign required by that pairing, and the units. Distinguish an explicit zero from an absent value. Treat label changes as new descriptions unless the problem explicitly changes the state.

After this prerequisite, return to the [DC guide](dc-circuits.md) for fixed resistors and the [RC guide](rc-transients.md) for the source-to-capacitor convention. The RC guide's source power is labelled as **delivered** power; do not silently replace that label with absorbed power.

## Background and attribution

These cases, data and explanations are original fictional teaching material. The following primary sources support the definitions; their own examples are not this casebook's answer key.

- MIT 6.200, Karl K. Berggren, [Foundations and Vocabulary](https://circuits.mit.edu/_static/S23/handouts/lec01b/lecture01b.pdf), 2023-02-06 draft, pp. 4–7: current references, terminal voltage labels and their pairing.
- MIT Unified Engineering, [Lecture S5 muddy points](https://ocw.mit.edu/courses/16-01-unified-engineering-i-ii-iii-iv-fall-2005-spring-2006/81f4c665b17b453c14497e0e63a11d76_S5_mud.pdf), questions 1 and 13: absorbed versus supplied electrical power.
- OpenStax, *University Physics Volume 2*, [§7.2 Electric Potential and Potential Difference](https://openstax.org/books/university-physics-volume-2/pages/7-2-electric-potential-and-potential-difference): potential differences and a freely chosen zero. Its change from A to B is $V_B-V_A$; this casebook explicitly defines $v_{AB}=V_A-V_B$, so the order must be read rather than assumed.

The existing study sequence inspected for this prerequisite is the [DC guide](https://github.com/Jacob-Met/RecallWeave/blob/ec07bf3989132130759e5c00c6cb02eef19709d3/courses/dc-circuits.md) followed by the [RC guide](https://github.com/Jacob-Met/RecallWeave/blob/ec07bf3989132130759e5c00c6cb02eef19709d3/courses/rc-transients.md).

Prepared with AI assistance. No textbook exercise or figure is reproduced, and no new repository-wide license is declared. This paper casebook claims no apparatus, simulation, app-import, browser-rendering or learning-outcome validation.

## Worked answers

Keep the physical element fixed while translating its labels. The sign of a voltage compares the named potentials; the sign of a current compares the flow with its named entry terminal. Absorbed power combines those two pieces of information with the correct reference pairing.

### Case 1 — A plus label below zero

**1. Ordered voltages and higher potential**

$$
v_{AB}=(-2)-(+5)=-7\ \mathrm{V},\qquad
v_{BA}=(+5)-(-2)=+7\ \mathrm{V}.
$$

B is 7 V higher than A. A's negative potential relative to the chosen zero and the negative value of $v_{AB}$ are different statements: the first uses the reference zero; the second compares A with B.

**2. Current and the + label**

Since $i_A=+0.30$ A, conventional current enters E1 at A and leaves at B. The + label for $v_{AB}$ identifies A as the first potential in the subtraction. It does not assert that A is actually higher. Here A carries that label while B has the higher potential.

**3. Absorbed and delivered power**

The positive $i_A$ reference enters the + labelled terminal A, so this is the passive pairing:

$$
p_{\mathrm{abs}}=v_{AB}i_A=(-7)(+0.30)=-2.10\ \mathrm{W},
\qquad p_{\mathrm{del}}=+2.10\ \mathrm{W}.
$$

E1 delivers 2.10 W of electrical power. A negative absorbed-power value describes delivery; it is not a negative magnitude of delivered power.

**4. Diagnose the claim**

Positive current alone does not establish absorption. This record has positive $i_A$ but negative $v_{AB}$, and their correctly paired product is negative. The record specifies an electrical power-transfer direction, not E1's construction or device identity.

### Case 2 — The current reference enters the minus-labelled terminal

**1. Potentials and current**

In record L, $v_{PQ}=-12$ V means Q is 12 V higher than P. In record H, $v_{PQ}=+12$ V means P is 12 V higher than Q. In both records $i_Q$ is positive, so conventional current enters E2 at Q and leaves at P.

**2–3. The pairing, both units and both power conventions**

The supplied positive-current reference enters Q, the terminal carrying the − label for $v_{PQ}$. Therefore

$$
p_{\mathrm{abs}}=-v_{PQ}i_Q,\qquad
p_{\mathrm{del}}=v_{PQ}i_Q.
$$

Use $75\ \mathrm{mA}=0.075\ \mathrm{A}$.

| Record | Absorbed-power calculation in V × mA | $p_{\mathrm{abs}}$ | $p_{\mathrm{del}}$ | Interpretation |
| --- | --- | ---: | ---: | --- |
| L | $-(-12)(+75)=+900$ mW | +900 mW = +0.900 W | −900 mW = −0.900 W | E2 absorbs 0.900 W. |
| H | $-(+12)(+75)=-900$ mW | −900 mW = −0.900 W | +900 mW = +0.900 W | E2 delivers 0.900 W. |

Negative signed delivered power in L is another description of absorption, not a second simultaneous transfer.

**4. Diagnose the printed-number product**

The missing check is whether positive current enters the terminal with the + or the − voltage label. In these records it enters the − labelled terminal. The printed product $v_{PQ}i_Q$ is signed delivered power, so calling it absorbed power reverses the interpretation.

The two currents are equal and positive in the same reference, but the voltages have opposite signs. Consequently, the physical power-transfer directions differ. Neither the current sign nor the reference convention names a component type.

### Case 3 — Four descriptions of one state

**1. Complete the four descriptions**

Reversing the voltage reference gives $v_{VU}=-10$ V. Reversing the current reference gives $i_V=+0.060$ A. Neither operation changes the state.

| Description | Signed voltage | Signed current | Correct absorbed-power formula | Substitution and result |
| --- | ---: | ---: | --- | --- |
| Original | $v_{UV}=+10$ V | $i_U=-0.060$ A | $p_{\mathrm{abs}}=v_{UV}i_U$ | $(+10)(-0.060)=-0.600$ W |
| Voltage label only reversed | $v_{VU}=-10$ V | $i_U=-0.060$ A | $p_{\mathrm{abs}}=-v_{VU}i_U$ | $-(-10)(-0.060)=-0.600$ W |
| Current arrow only reversed | $v_{UV}=+10$ V | $i_V=+0.060$ A | $p_{\mathrm{abs}}=-v_{UV}i_V$ | $-(+10)(+0.060)=-0.600$ W |
| Both references reversed | $v_{VU}=-10$ V | $i_V=+0.060$ A | $p_{\mathrm{abs}}=v_{VU}i_V$ | $(-10)(+0.060)=-0.600$ W |

**2. Which products have which meaning?**

The original row and the both-reversed row use the passive pairing: positive current enters the terminal carrying the + label. Their voltage-current products are absorbed power, even though their values are negative.

In the two middle rows, positive current enters the − labelled terminal. Their unadjusted products are +0.600 W, which is $p_{\mathrm{del}}$. The additional minus sign in the absorbed-power formula is essential.

**3. The unchanged physical interpretation**

Conventional current enters E3 at V and leaves at U: this is expressed either by negative $i_U$ or by positive $i_V$. E3 delivers 0.600 W. Every row gives the same negative absorbed power, because each changes the coordinates and the pairing formula consistently.

**4. An arrow change without a value change**

Keeping the old value would label $i_V=-0.060$ A. A negative current referenced into V describes current entering U instead, contradicting the original state. The faithful opposite reference is $i_V=-i_U=+0.060$ A. Reversing the drawn reference alone does not reverse the physical flow.

### Case 4 — A different zero for the same potentials

**1–2. Complete all three descriptions**

The second description adds −20 V to both original potentials. The third adds +4 V to both, making L the zero-potential terminal. In every description, $i_K$ remains +40 mA.

| Description | $V_K$ | $V_L$ | $v_{KL}=V_K-V_L$ | $p_{\mathrm{abs}}=v_{KL}i_K$ |
| --- | ---: | ---: | ---: | ---: |
| Original zero | +11 V | −4 V | +15 V | +600 mW = +0.600 W |
| Both potentials reduced by 20 V | −9 V | −24 V | +15 V | +600 mW = +0.600 W |
| Zero chosen at L | +15 V | 0 V | +15 V | +600 mW = +0.600 W |

K stays 15 V higher than L. Conventional current still enters E4 at K and leaves at L, and E4 still absorbs 0.600 W. In the second description both terminal potentials are negative, but their difference and the power are unchanged.

**3. A terminal potential is not the across-element voltage**

The original −4 V describes L relative to the original reference zero. The voltage across E4 requires both terminal potentials and an order. With the stated order, it is $v_{KL}=11-(-4)=15$ V, not −4 V.

**4. Changing only one recorded potential**

The other note gives $V_K=-9$ V while retaining $V_L=-4$ V. Its difference is

$$
V_K-V_L=(-9)-(-4)=-5\ \mathrm{V}.
$$

That differs from the original +15 V. It cannot be the same state expressed with a new common zero: a common offset must be applied to both potentials and must preserve their difference. This identifies an inconsistent relabeling. It does not establish that someone physically changed the element or predict a new circuit response.

### Case 5 — Zero is a result, not missing data

**1. Power and current direction**

The given variables have the passive pairing, so $p_{\mathrm{abs}}=v_{ST}i_S$ and $p_{\mathrm{del}}=-p_{\mathrm{abs}}$.

| State | Power check | $p_{\mathrm{abs}}$ | $p_{\mathrm{del}}$ | Net conventional current |
| --- | --- | ---: | ---: | --- |
| A | $0\ \mathrm{V}\times0.120\ \mathrm{A}$ | 0 W | 0 W | Enters E5 at S and leaves at T, with magnitude 120 mA. |
| B | $(-6\ \mathrm{V})\times0\ \mathrm{A}$ | 0 W | 0 W | Zero; there is no net entry direction. |
| C | $0\ \mathrm{V}\times0\ \mathrm{A}$ | 0 W | 0 W | Zero; there is no net entry direction. |

**2. Separate the two zero conditions**

A and C have equal terminal potentials because $v_{ST}=0$. B and C have zero current. In B, T is 6 V higher than S despite the absence of net current.

**3. Diagnose the claim**

The claim is false. A has nonzero current and zero voltage; B has nonzero voltage and zero current. Either zero factor makes the product zero. C has both factors zero, but that is not required.

**4. Keep the inference at the terminals**

The records establish zero net electrical power transfer at E5's terminals in these stipulated states. They do not identify its internal construction or establish that stored energy is absent. In particular, zero ongoing power transfer is not a measurement of total stored energy. No internal heating, storage mechanism or elapsed-energy calculation follows from this table.

### Case 6 — A record that does not determine power

**1. What the voltage does establish**

M is 3.5 V higher than N. The equation $V_M-V_N=3.5$ V does not determine either individual potential relative to an unspecified zero: adding the same constant to both retains the stated difference.

**2. What is missing**

Current magnitude and direction are unspecified, so absorbed power is also undetermined. A missing current field is not a measured or stipulated zero. Setting it to zero silently adds a premise. Positive, negative and zero $i_M$ have not been distinguished by the original record.

**3. Check the two hypothetical completions**

For $v_{MN}$ and current entering at M, use the passive pairing $p_{\mathrm{abs}}=v_{MN}i_M$.

| Hypothetical completion | Conventional current | $p_{\mathrm{abs}}$ | $p_{\mathrm{del}}$ | Interpretation |
| --- | --- | ---: | ---: | --- |
| $i_M=+0.20$ A | Enters M, leaves N | $(+3.5)(+0.20)=+0.70$ W | −0.70 W | E6 absorbs 0.70 W. |
| $i_M=-0.20$ A | Enters N, leaves M | $(+3.5)(-0.20)=-0.70$ W | +0.70 W | E6 delivers 0.70 W. |

Both completions retain the supplied voltage while assigning different current information. They yield opposite power-transfer directions, so the voltage record alone cannot select between those directions. These are conditional calculations under added premises, not observations, proposed apparatus or claims about how an unspecified device will behave.

**4. A magnitude still lacks a direction**

With current magnitude 0.20 A, the magnitude of terminal power is 0.70 W, but its sign is not fixed. Current entering M gives absorption; current entering N gives delivery. Stating the entry terminal, or giving the sign of $i_M$ with its existing definition, settles the ambiguity. The added nonzero magnitude excludes zero current; it still does not select a direction.

**5. No unstated device law**

The original voltage record supplies neither a resistance nor a fixed-resistor model. It therefore does not justify solving for current from an assumed Ohm's-law relation, or identifying E6 as a resistor or a source. First establish what the terminal data and reference definitions say; apply a device law only when the problem actually supplies it.

The same habit carries into the existing courses: retain each voltage's subtraction order, each current's entry terminal, and whether the displayed power is absorbed or delivered. A changed sign can describe a changed label, a different physical state, or a mistaken calculation; the accompanying definitions decide which.
