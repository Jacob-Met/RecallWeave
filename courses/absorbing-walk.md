# Absorbing random walks: arrival and stopping

Move a hypothetical walker along states 0 through N. Every interior step goes right with probability p=a/b and left with q=1−p. At 0 or N the walker stays there. T is the first time an endpoint is reached, counting the starting position as time 0.

This is a finite, time-homogeneous probability model, not a gambling strategy or a real-world forecast. Directions have the same probabilities at each step. There is no simulated sample path or random seed: the lab computes the entire distribution exactly.

## Open and use the lab

Open absorbing-walk-lab.html directly in a browser. It needs no network or installation. Set the five labeled integer inputs and select Apply. First, Previous, Next, Last and the selected-step control navigate the same applied experiment. Every exact fraction remains visible in the text tables; the bars are approximate visual aids.

Changing any input retires the previous result and disables Download experiment until a valid Apply. Presets apply a named example at step 0. The experiment JSON includes all frames, all transition contributions, the original applied inputs and the selected step. Entering 4/6 preserves 4 and 6 in those inputs while calculated probabilities use the reduced fraction 2/3.

N is 2..8, the start is 0..N, b is 1..12, a is 0..b, and the horizon H is 0..30. Zero and unit probabilities, endpoint starts and a zero horizon are all meaningful. Invalid values are refused; they are not silently clipped.

Download course always saves the same original twelve-question deck. In the companion package, open demo.html, choose that actual downloaded JSON file, inspect the preview, and select Start this deck. Complete the lesson, review any missed connections, practice them and download study notes. The ordinary RecallWeave learning model is unchanged; its estimates are illustrative, not an assessment of ability. Download guide saves this text. Nothing is saved automatically and the lab uses no browser storage.

## A short walk worked exactly

Take N=3, start i=1 and p=q=1/2.

| Step | Distribution over [0,1,2,3] | First left | First right | Survival |
| --- | --- | --- | --- | --- |
| 0 | [0,1,0,0] | 0 | 0 | 1 |
| 1 | [1/2,0,1/2,0] | 1/2 | 0 | 1/2 |
| 2 | [1/2,1/4,0,1/4] | 0 | 1/4 | 1/4 |
| 3 | [5/8,0,1/8,1/4] | 1/8 | 0 | 1/8 |

At step 3, the left endpoint contains 5/8 of the probability mass, but only 1/8 arrived on that step. The other 1/2 was already absorbed. This distinction is why the lab retains both first-arrival and cumulative-absorption columns.

For each interior source j, multiply its current mass by q for edge j→j−1 and by p for edge j→j+1. Each endpoint transfers all of its mass to itself. Add incoming contributions at each destination to recover the next distribution. The contribution table retains zero edges too, in source order, left before right.

The complete distribution always totals one. Cumulative left absorption plus cumulative right absorption plus survival equals one. Summing first arrivals at each endpoint through a step recovers its cumulative absorption. At time 0, an endpoint start counts as a first arrival with probability one; later retained endpoint mass does not count again.

## Finite horizon is not eventual absorption

The lab shows survival P(T>t), the probability still at an interior state after step t. In the worked example it is 1, 1/2, 1/4 and 1/8 at steps 0..3. A visible nonzero tail does not mean absorption is impossible. A short plot is not a stopping guarantee.

For an integer horizon H:

    E[min(T,H)] = sum of P(T>t), for t=0,...,H−1.

For the worked example at H=2, this is 1+1/2=3/2. Its eventual E[T] is 2, so the unconditional expected excess E[T]−E[min(T,2)] is 1/2. The excess averages over all paths. It is not E[T−H | T>H], which would condition on survival. At H=0 the truncated sum is empty and equals zero.

## Eventual boundary probabilities

Let u_i be the eventual probability of reaching N from i. The boundaries give u_0=0 and u_N=1. Conditioning on the first step gives

    u_i = p u_(i+1) + q u_(i−1).

For a fair walk, u_i=i/N. On 0..6 from 2, the right probability is 1/3. A midpoint start has equal endpoint probabilities, but being closer to one boundary changes the result.

For 0<p<1 and p≠1/2, put r=q/p:

    u_i = (1−r^i)/(1−r^N).

For N=4, i=2 and p=2/3, r=1/2 and u_2=(3/4)/(15/16)=4/5. Left absorption is 1/5. Reverse the bias from the same midpoint and those probabilities swap. The probability of one right step, 2/3, is not the eventual right-boundary probability, 4/5.

## Expected stopping time

Let e_i=E[T] from i. The boundaries give e_0=e_N=0. Every interior path first spends one step:

    e_i = 1 + p e_(i+1) + q e_(i−1).

For a fair walk, e_i=i(N−i). On 0..6 from 3 this is 9 steps. It is an average over all possible path lengths, not a deadline.

For 0<p<1 and p≠1/2:

    e_i = (i−N u_i)/(q−p).

In the biased N=4 midpoint example this is (2−4·4/5)/(1/3−2/3)=18/5. The lab provides u_i and e_i for every possible starting state, not just the applied start. Check the boundary values and the two recurrences directly.

When p=0 every interior step is left, so T=i exactly. When p=1 every interior step is right, so T=N−i exactly. Endpoint starts always have T=0 regardless of p. These cases are evaluated separately; no division by zero is used.

## Arithmetic and limitations

Every probability and expectation is a reduced fraction of arbitrary-precision integers. JSON stores numerator and denominator as decimal strings so it does not lose integer precision. Zero is always 0/1 and denominators are positive. Decimal labels and bar widths are only rounded presentation; they do not drive propagation or decisions.

N and H are bounded to keep the complete trace readable and fast. The finite horizon limits which frames are displayed, not the eventual equations. Independence, fixed transition probabilities and fixed boundaries are assumptions of this teaching model; exact arithmetic does not validate them for a real process.

Standard mathematical reference: [MIT RES.6-012, Introduction to Probability, Spring 2018, lecture 26.9](https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/cde905a8cd7e53529c4fe999b70790fa_Ne2lmAZI4-I.pdf), which derives the finite-walk endpoint probabilities and expected stopping times. This lesson, its worked examples and its questions are original, not copied from the reference.

Original lesson text: CC BY 4.0. The linked reference retains its own license.
