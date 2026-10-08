# Information: what one label reveals

A sixteen-question RecallWeave course with a small joint-distribution laboratory.

Start with a box of cards. Each card carries an X label and a Y label. Draw one card uniformly. How uncertain is either label? How much does seeing one tell you about the other?

The explorer lets you change the **number of cards carrying each pair of labels**. Its probabilities describe that exact finite box. The examples are invented; they are not measurements of people, learning, or any outside population.

## Use the explorer and course

Open [the information explorer](information-theory-explorer.html) directly in a browser. It is a self-contained page. Choose an example and press **Use example**, or type your own count table and press **Apply table**.

- Put one X category on each line and one Y category in each column, separated by spaces.
- Use 2–4 rows and 2–4 columns. Each count must be an integer from 0 through 999, with at least one positive count.
- Use ordinary whole-number spelling: 0 and 12 are accepted; -0, 01, 1.5 and 1e2 are not. The input is limited to 512 characters.
- A change to the draft retires the previous result. Apply the new table before interpreting or downloading its observation.
- Select either **Observe X** or **Observe Y**, then select the observed label. Compare the distribution before observing that label with the conditional distribution afterward.
- **Download this observation** saves the complete applied counts, exact fractions, approximate information values, and selected conditioning view. It does not save an unapplied draft.
- **Download course** and **Download worked guide** always save this fixed lesson and guide. Editing a table does not change the questions.

Open [the RecallWeave learner](../demo.html). Import the downloaded course JSON, inspect the preview, then choose **Start this deck** to begin the questions. The learner may change question and answer-option order; reason about the option text instead of memorizing letters.

After answering the sixteen questions, inspect their explanations, write transfer reflections, and use the existing practice and notes controls. A practice retry is separate from the original recorded answer.

The explorer makes no network requests, uses no browser storage, and starts no download until you click a download button. A source link or the learner link is ordinary explicit navigation.

## Read the counts before the bits

For a cell with count n, row total r, column total c, and grand total N:

| Quantity | Meaning | Formula |
| --- | --- | --- |
| Joint probability | Both labels on the same draw | P(X=x, Y=y) = n / N |
| X marginal | Ignore Y and count the row | P(X=x) = r / N |
| Y marginal | Ignore X and count the column | P(Y=y) = c / N |
| Y given X | Restrict the box to that X row | P(Y=y given X=x) = n / r, if r > 0 |
| X given Y | Restrict the box to that Y column | P(X=x given Y=y) = n / c, if c > 0 |

The joint table shows reduced fractions and their integer counts. Equal numbers of category names do not imply equal probabilities.

Multiplying every count by the same positive integer leaves all these probabilities unchanged. It therefore leaves the information quantities unchanged too. This is a property of the normalized finite table; it does not say that collecting more observations provides no additional statistical evidence.

## Surprise, entropy, and shared information

The definitions use base-two logarithms, so their unit is the **bit**. For a positive-probability outcome, its surprise is log2(1/p). Entropy is its probability-weighted average. Conditional entropy averages the entropy after each possible observation. Mutual information is the average reduction in that uncertainty. These definitions and identities follow the primary course notes linked below. The numerical examples and questions here are original.

- H(X) = sum over x of p(x) log2(1/p(x)).
- H(X,Y) = sum over pairs of p(x,y) log2(1/p(x,y)).
- H(Y given X) = sum over x with p(x)>0 of p(x) H(Y given X=x).
- I(X;Y) = H(Y) - H(Y given X) = H(X) - H(X given Y).
- Equivalently, I(X;Y) = sum over positive joint cells of p(x,y) log2[p(x,y)/(p(x)p(y))].

Sources: [Stanford EE376A/STATS376A, Lecture 3, January 16, 2018](https://web.stanford.edu/class/ee376a/files/2017-18/lecture_3.pdf), and [MIT 6.441, Lecture 1, Spring 2010](https://ocw.mit.edu/courses/6-441-information-theory-spring-2010/aa7737b3645178c0b746a57f1bdff2cd_MIT6_441S10_lec01.pdf).

The explorer's bars share one scale and display these decompositions:

- H(X) = I(X;Y) + H(X given Y).
- H(Y) = I(X;Y) + H(Y given X).
- H(X,Y) = I(X;Y) + H(X given Y) + H(Y given X).

These are lengths for numerical quantities, not a claim that an arbitrary geometric Venn picture has meaningful area.

### Work one table all the way through

For counts

    3 1
    1 3

there are eight cards. Each marginal is (1/2, 1/2), so H(X)=H(Y)=1 bit. Each conditional distribution is either (3/4, 1/4) or its reversal. Its entropy is

    (3/4) log2(4/3) + (1/4) log2(4) = 0.811278124459… bits.

The weighted conditional average is the same value. The joint entropy is 1.811278124459… bits, and the mutual information is 0.188721875541… bits.

The cell (X1,Y2) has joint probability 1/8. Under independence its probability would be 1/4. Its pointwise information is log2(1/2)=-1 bit, and its weighted contribution to mutual information is -1/8 bit. Each diagonal cell contributes approximately 0.219360937770 bits. Adding all four signed terms gives the positive total above.

A negative individual term does not make total mutual information negative. Mutual information is also unchanged when X and Y are swapped; the two conditional entropies need not be equal.

### What zeros mean

A cell with no cards contributes zero to entropy and to the weighted mutual-information sum. That summand convention does **not** give an impossible outcome a finite surprise of zero.

The downloadable data therefore uses null for a zero-cell surprise and pointwise information, together with explicit zero-probability metadata. The table labels these entries as excluded zero-probability outcomes. Their weighted terms are zero.

A row or column with total zero describes an observation that cannot occur in the finite box. Its conditional probabilities and conditional entropy are undefined. The explorer shows no invented distribution for it. Its contribution to the average conditional entropy is zero because it has zero probability.

### Seeing one label can increase uncertainty in that case

For counts

    8 0
    1 1

the Y marginal is (9/10, 1/10), with entropy about 0.468996 bits. If the observed label is X2, the conditional Y distribution is (1/2, 1/2), with entropy 1 bit: this particular observation leaves more uncertainty.

The average after observing X is different. X1 occurs with probability 4/5 and leaves zero entropy; X2 occurs with probability 1/5 and leaves one bit. Thus H(Y given X)=1/5 bit, less than the prior entropy.

“Conditioning reduces entropy” refers to that weighted average. It does not promise a decrease after every individual outcome.

## Exact independence and approximate information

Independence means every joint probability factors into its two marginals. The explorer checks every cell using exact integer arithmetic:

    n * N == r * c

These products remain within exact integer representation under the lab's size and count limits. All cells must pass. The displayed bit values are approximate binary64 calculations and never determine this verdict.

For

    998 999
    997 998

N=3992. At (X1,Y1), n*N=3,984,016 while r*c=3,984,015. The exact values differ, so the table is dependent. Its mutual information is only about 4.54467e-14 bits. A display rounded to six decimal places would conceal it; the explorer uses scientific notation for sufficiently small nonzero values.

### Why the total and signed terms use different arithmetic

Directly subtracting two almost equal entropies can lose tiny mutual information. Even summing positive and negative cell terms can cancel most useful digits.

The model therefore also evaluates an equivalent divergence expression. For a cell, let p be its joint probability, q the product of its marginals, and t=(p-q)/q when q>0. The robust total sums

    q * [(1+t) ln(1+t) - t] / ln(2).

The removed linear terms sum to zero over the complete distribution. Close to t=0, a short convergent series evaluates the bracket without subtracting nearly equal numbers. At p=0 with q>0 its bracket has limit 1; if q=0, the joint probability is also zero and the cell contributes zero.

The **signed contribution table** still displays the original p*log2(p/q) terms. The nonnegative stabilized terms are an equivalent way to compute the aggregate; they are not those original signed terms. Both are retained in the observation data, along with the direct signed sum. Small floating-point differences between equivalent identities are expected. No small-value threshold is used to declare independence.

## What the table cannot establish

The finite-card model fixes the distribution by construction. If you instead type counts from observations, the explorer describes the normalized recorded counts. A positive value by itself cannot establish a population effect, causal direction, usefulness of a predictor on new data, learning progress, or a required compressed file size.

Ask how the observations were selected, whether they are representative and independent, what is missing, how the labels were chosen, and what competing causal explanation could produce the association. Intervening on one label is a different question from conditioning on it.

Mutual information has no positive-versus-negative association sign. A perfect copy and a perfect opposite can carry the same information. Nor does perfect prediction always mean one bit: an uneven copied label contains less than one bit, and an already constant label contains zero.

## Worked transfer responses

These are responses to the sixteen transfer prompts, keyed by stable item ID. The learner may present them in another order. Some prompts deliberately extend the idea beyond the explorer's 4-category or 999-count interface limits; solve those extensions by reasoning instead of forcing them into the lab.

### 1. info-joint — scale the same pair

The new total is 16, and (X1,Y2) has count 2. Its joint probability is 2/16=1/8. Doubling both numerator and denominator preserves the probability. The draw is uniform over cards, not over pair names.

### 2. info-marginal — sum before dividing

The original rows are (2,1,1) and (0,2,2), totaling eight cards. X2 has four cards, so P(X2)=4/8=1/2. Y3 has one plus two cards, so P(Y3)=3/8. Y2 also has three cards, although it gathers them from a different column.

### 3. info-scale — more copies of every card

The counts (1,2; 2,4) become (3,6; 6,12), with total 27. The first joint cell has probability 3/27=1/9, just as 1/9 before scaling. Every marginal and conditional fraction also scales equally, so the information quantities are unchanged.

### 4. info-surprise — compare two outcomes

At probability 1/2 the surprise is log2(2)=1 bit. At probability 1/16 it is log2(16)=4 bits. The rarer outcome has three additional bits of surprise. These are outcome surprises; an entropy would require averaging over a complete distribution.

### 5. info-constant — unused names add no uncertainty

All seven cards still carry X1. Adding unused X category names adds only zero-probability summands, so H(X) remains zero. Nothing in this question specifies the Y labels. A zero weighted entropy term is a limiting convention, not a finite zero surprise for an impossible outcome.

### 6. info-entropy-average — four equally likely values

For four equally likely values, each probability is 1/4 and each surprise is 2 bits. The weighted average is 4*(1/4)*2=2 bits. Merely listing four values does not make them equally likely: a distribution concentrated on one has zero entropy, and uneven nonconstant distributions give other values below two.

### 7. info-conditional-denominator — condition in the other direction

In (3,1; 1,3), column Y2 contains four cards, one with X1. Thus P(X1 given Y2)=1/4. Row X2 also contains four cards, one with Y1, so P(Y1 given X2)=1/4. Both happen to match because of this table's symmetry, not because conditional probabilities always reverse unchanged.

### 8. info-weighted-conditional — make the ambiguous row rarer

In (18,0; 1,1), X1 occurs with probability 18/20 and leaves zero Y entropy. X2 occurs with probability 2/20 and leaves one bit. H(Y given X)=(18/20)*0+(2/20)*1=0.1 bit. Averaging the two row entropies equally would ignore how often each observation occurs.

### 9. info-particular-observation — separate one case from the average

The same table has Y probabilities (19/20, 1/20), with marginal entropy approximately 0.286396957116 bits. Observing X2 still gives an even split and one bit of conditional entropy in that case. The weighted average after observing X is only 0.1 bit. One surprising observation can increase uncertainty while the average decreases.

### 10. info-biased-copy — perfect prediction of what?

In (1,0; 0,1), either label is fair and determines the other. The conditional entropies are zero and the mutual information is one bit. In (7,0; 0,0), both labels are already certain before observation, so all entropies and the mutual information are zero. Perfect prediction alone does not specify the amount of information gained.

### 11. info-directional-conditionals — eight values grouped into two

Imagine eight equally likely X labels, each assigned deterministically to one of two Y groups of four. H(X)=3 bits and H(Y)=1 bit. Given X, Y is known, so H(Y given X)=0. Given Y, four equally likely X labels remain, so H(X given Y)=2 bits. H(X,Y)=3 bits and I(X;Y)=1 bit. This is an eight-row by-hand extension beyond the lab's four-row input limit.

### 12. info-signed-term — assemble the noisy table

For either diagonal cell, p=3/8 and q=1/4, so its contribution is (3/8)log2(3/2), approximately 0.219360937770 bits. The two off-diagonal contributions are each -1/8 bit. The total is twice the diagonal contribution minus 1/4, approximately 0.188721875541 bits.

### 13. info-exact-independence — check all pairs

For (1,2; 2,4), N=9 and both marginal count lists are (3,6). The four joint products n*N are 9, 18, 18, 36; the matching r*c products are 9, 18, 18, 36. Every comparison agrees, so this nonuniform table is independent.

Checking only the largest cell is not a general method. Larger tables have additional degrees of freedom. The course asks for all four products here to practice the complete factorization check; the explorer always checks every cell.

### 14. info-opposite-labels — rename, do not change probabilities

In (0,1; 1,0), swapping the two Y names moves the nonzero cells to the diagonal. Their probabilities remain 1/2, so H(X)=H(Y)=H(X,Y)=I(X;Y)=1 bit and both conditional entropies remain zero. The association's verbal description changes from “opposite” to “matching”; its information does not.

### 15. info-rounding — an exact difference survives scaling

Doubling every count also doubles each marginal count and N. Each product n*N and r*c therefore grows by a factor of four. Their original difference of one becomes four, so the inequality remains. The probabilities and mutual information are unchanged.

The doubled counts exceed the lab's 999 limit. This is a mathematical scaling argument, not an instruction to enter an out-of-range table. A positive approximate value may be tiny; an exact factorization failure remains a failure however the bits are formatted.

### 16. info-observations — separate two kinds of question

One possible sampling concern: forty classroom observations may come from a selected or unrepresentative group, and repeated observations may not be independent. One possible causal concern: another factor could influence both labels, or the selection process could induce their association.

A defensible statement is that the normalized recorded table has dependence. A claim about a wider population needs a sampling argument and uncertainty assessment. A causal claim needs an appropriate design and assumptions; the table alone does not supply them.

## Source and regeneration

The model is in src/information-theory.mjs and the page behavior is in src/information-theory-ui.mjs. The authored HTML template, course JSON, and this guide sit beside the generated explorer.

From the repository root, run:

    node tools/build-information-theory.mjs

To check that the generated page matches the authored inputs without rewriting it:

    node tools/build-information-theory.mjs --check

The builder embeds the exact course and guide text for download and the same model used by the Node tests. It does not rebuild the learner or change another course.

## Attribution and license

This course, guide, examples, and wording are original work prepared with AI assistance. The original lesson content is offered under CC0-1.0. The linked primary sources retain their own terms. No exercise text was copied from them.
