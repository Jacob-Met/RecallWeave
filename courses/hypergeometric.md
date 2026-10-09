# Sampling without replacement: exact finite chances

This original companion uses fictional labelled tokens. It describes a mathematical sampling design, not evidence about a real population or advice about designing a real survey.

## What is being modelled?

There are N distinct tokens, exactly K designated as marked. A sample contains n different tokens. Every unordered subset of size n is equally likely. X is the number of marked tokens in that subset. This is the hypergeometric model.

The individual tokens remain distinct even when they share a category. An unordered subset does not count the same tokens again in different orders. A uniform sequential draw without replacement produces this uniform subset distribution; a biased sampling procedure may not.

The explorer admits whole numbers 1 ≤ N ≤ 200, 0 ≤ K ≤ N and 0 ≤ n ≤ N. Its inclusive event endpoints satisfy 0 ≤ lower ≤ upper ≤ n. Invalid inputs are refused; no values are clamped or silently changed. N=0 is outside this teaching interface. A sample of size zero is allowed.

## Count before dividing

There are C(N,n) equally likely complete subsets. For exactly k marked tokens, choose k of the K marked tokens and n−k of the N−K unmarked tokens. The product C(K,k)C(N−K,n−k) counts favourable subsets. Divide this product by C(N,n).

The possible marked counts are max(0,n−(N−K)) through min(n,K). Outside this support the probability is zero. The explorer keeps those impossible rows visible among 0 through n, so absence of enough marked or unmarked tokens can be inspected explicitly.

For the default N=8,K=3,n=4, there are 70 total subsets. The favourable counts for k=0,1,2,3,4 are 5,30,30,5,0. Exactly two marked tokens has probability 30/70=3/7. Two or three marked tokens has probability (30+5)/70=1/2.

An interval event adds disjoint count rows, including both endpoints. It does not multiply them. A valid interval can lie outside the support and have probability zero.

## Mean and spread

The expected count is nK/N. Each draw position has marginal marked probability K/N; expectations add even though the draw indicators are dependent. A realized count is an integer; its expectation need not be.

For N>1, variance is

    n × (K/N) × (1−K/N) × (N−n)/(N−1).

For the default system the mean is 3/2 and variance 15/28. Variance is in squared count units. It is different from the mean, a probability or a standard deviation. The last factor is the finite-population variance correction relative to independent draws with the same marked fraction. When n=1 it is one; when n=N>1 it is zero. If n=0 or either category is empty, the count is deterministic. With N=1, the explorer handles the deterministic count directly, avoiding division by N−1.

The explorer computes all combination counts with BigInt and retains their exact decimal integer strings. Reduced fraction strings are exact. Decimal probabilities, percentage bars and decimal moments are display approximations; the exact fractions remain visible and are included in the downloaded observation. Large combination counts are never converted to floating point before counting or reducing.

## Use the explorer

Open hypergeometric-explorer.html directly; no server or connection is needed. Choose a worked preset or edit the five input fields, then use **Apply population**. Any input edit retires the prior results and observation download until a new valid application. Presets fill a draft and do not silently apply it.

Inspect any count row to see both combination factors. An illustrative compatible subset shows named token identities; it is a deterministic example, not a random draw and not evidence of likelihood. Impossible rows have no compatible example. The selected count is independent of the inclusive highlighted event.

Download the exact observation, original course JSON or this guide. The observation records applied parameters, every row, exact counts/fractions, the event and moments, and the inspected count. It has format recallweave-hypergeometric-observation/1 and is separate from learner-answer archives. The page makes no automatic storage writes.

To study the course, open RecallWeave's demo.html and choose the downloaded JSON under **Bring your own lesson**, inspect the preview and start the deck. This uses the unchanged feedback, review, practice and notes flow. Starting an imported lesson is an explicit learner action.

## Original worked questions

### 1. Five distinct tokens are labelled A–E. A simple random sample selects two without replacement, and order is ignored. What probability does each particular two-token subset have?

Answer: 1/10, because all ten two-token subsets are equally likely.

There are C(5,2)=10 unordered subsets. A simple random sample assigns each the same probability, 1/10. There are 20 ordered draws, but each unordered pair corresponds to two of them, giving 2/20=1/10.

Transfer: With six distinct tokens and a three-token sample, there are C(6,3)=20 equally likely subsets. Each has probability 1/20; the number of marked tokens does not change this denominator.

### 2. A box contains 8 distinct tokens, 3 marked and 5 unmarked. Draw uniformly without replacement. Given that the first token was marked, what is the probability that the second token is marked?

Answer: 2/7

The observed marked token has left the box. Seven tokens remain, two marked, so the conditional probability is 2/7. This differs from the first-draw probability 3/8. Without replacement, the mark indicators need not be independent.

Transfer: If the first token was unmarked instead, the second-draw probability is 3/7. Before seeing the first result, symmetry still gives the second token a marginal marked probability of 3/8.

### 3. A population has N=10 distinct tokens, K=8 marked, and a sample has n=7 tokens drawn without replacement. Which values can the marked count X take?

Answer: Every integer from 5 through 7.

Only two unmarked tokens exist. A seven-token sample must therefore include at least five marked tokens. It can include no more than seven tokens in total and no more than eight marked tokens. The support is max(0,7−2)=5 through min(7,8)=7.

Transfer: For N=12, K=3 and n=10, only nine unmarked tokens exist. The support is 1,2,3: at least one marked token is necessary and no more than three are available.

### 4. A simple random sample of 4 comes from 8 distinct tokens, 3 marked. How many equally likely subsets contain exactly 2 marked tokens, and what is their total probability?

Answer: 30 subsets; probability 30/70 = 3/7.

Choose two of the three marked tokens in C(3,2)=3 ways, and two of the five unmarked tokens in C(5,2)=10 ways. Each pair of choices determines one complete subset, so there are 30 favourable subsets. All C(8,4)=70 subsets are equally likely, giving 30/70=3/7.

Transfer: For the same population and sample size, exactly three marked tokens requires all three marked and one of five unmarked tokens. The count is C(3,3)C(5,1)=5, with probability 5/70=1/14.

### 5. A simple random sample of n=3 comes from N=9 distinct tokens with K=4 marked. What is P(X=0), the probability of no marked token?

Answer: 10/84 = 5/42.

A sample with zero marked tokens chooses all three from the five unmarked tokens: C(5,3)=10 favourable subsets among C(9,3)=84. Hence P(X=0)=5/42. Multiplying (5/9)^3 would reuse the same unmarked fraction after each draw, which does not describe sampling without replacement.

Transfer: The sequential calculation agrees: (5/9)(4/8)(3/7)=60/504=5/42. The shrinking numerators and denominators account for the removed unmarked tokens.

### 6. For N=9, K=4 and n=3, suppose P(X=0)=5/42. What is the probability that the sample contains at least one marked token?

Answer: 37/42

The disjoint events X=0 and X≥1 cover every possible sample. The complement rule gives 1−5/42=37/42. The event 'at least one' includes one, two and three marked tokens.

Transfer: In a population of N=7 with K=2 marked and n=2, P(X=0)=C(5,2)/C(7,2)=10/21. Thus P(X≥1)=11/21, including both the one-marked and two-marked outcomes.

### 7. For N=8, K=3, n=4, exactly 2 marked tokens occurs in 30 subsets and exactly 3 in 5 subsets, out of 70 equally likely subsets. What is P(2≤X≤3)?

Answer: 35/70 = 1/2, from adding disjoint outcome counts.

The endpoint counts are mutually exclusive: one sample cannot contain both exactly two and exactly three marked tokens. The inclusive interval therefore has 30+5=35 favourable subsets, giving 35/70=1/2. Possible values need not have equal probabilities.

Transfer: For this same system the counts for X=0,1,2,3 are 5,30,30,5. Therefore P(0≤X≤1)=35/70=1/2, while P(X=1)=30/70=3/7.

### 8. A simple random sample has N=12, K=5 and n=4. What is the expected marked count, and must one particular sample equal it?

Answer: 5/3; no, an expectation can lie between attainable integer counts.

Each of the four draw positions has marginal marked probability 5/12. Linearity of expectation gives 4×5/12=5/3 even though the indicators are dependent. Individual samples have integer counts; an expected count need not be attainable in one sample.

Transfer: For N=15, K=6 and n=5, the expected count is 5×6/15=2. An expectation that happens to be an integer still does not force every sample to contain that many marked tokens.

### 9. For N=8, K=3 and n=4, the marked fraction is p=3/8. Which expression is the variance of X under simple random sampling without replacement?

Answer: 4p(1−p)×(8−4)/(8−1)=15/28.

For N>1, Var(X)=np(1−p)(N−n)/(N−1). Substitution gives (15/16)(4/7)=15/28. The factor reflects dependence from sampling without replacement. It reduces the corresponding independent-draw variance when more than one token is sampled and both categories exist.

Transfer: For N=10, K=4 and n=5, the mean is 2 and the variance is 5×(4/10)×(6/10)×(5/9)=2/3. Variance measures squared count spread, not the expected count itself.

### 10. A simple random sample selects all n=9 tokens from a population with N=9 and K=4 marked. What are X and its variance?

Answer: X is certainly 4; variance is 0.

There is only one nine-token subset: the whole population. It contains all four marked tokens, so X=4 with probability one. A constant random variable has variance zero; the finite-population factor is also zero when n=N>1.

Transfer: For N=1, selecting the only token is also deterministic. The usual variance expression has a denominator N−1=0, so handle the one-token population directly rather than evaluating 0/0.

### 11. The model allows a sample size n=0 from N=7 tokens, K=2 marked. Which result is correct?

Answer: There is one empty subset; P(X=0)=1 and the mean is 0.

The empty set is one subset of size zero: C(7,0)=1. It contains zero marked tokens. Thus the distribution puts all its probability on X=0, and both mean and variance are zero. This is different from sampling from an empty population, which this explorer does not admit.

Transfer: For any allowed N and K, changing n to zero keeps this result. In the explorer the only permitted inclusive event endpoints are then 0 and 0.

### 12. There are N=6 distinct tokens, only K=1 marked. Three tokens will be drawn uniformly without replacement. Before any results are observed, what is the probability that the third token is marked?

Answer: 1/6, because every token is equally likely to occupy the third draw position.

Unconditionally, each of the six token identities is equally likely to appear in any fixed draw position, so the third-draw marked probability is 1/6. The conditional chance after specific earlier observations can differ: if the marked token already appeared it is zero; if the first two were unmarked it is 1/4.

Transfer: In this system X can only be 0 or 1. The probability that the three-token sample contains the unique marked token is 3/6=1/2, which differs from the probability for one specified draw position.

### 13. A population has N=10 tokens with K=4 marked, and n=3 tokens are sampled. If the category names are swapped, how does the original event 'exactly 2 marked' translate?

Answer: Exactly 1 token from the newly marked category, with the same probability.

Each three-token sample contains X old-marked and 3−X old-unmarked tokens. Swapping names makes the new count 3−X, so X=2 becomes a new count of 1. It is the same set of underlying samples. Both counts give C(4,2)C(6,1)/C(10,3)=36/120=3/10.

Transfer: For an original event 1≤X≤2 in a sample of size 3, the relabelled count Y=3−X also lies between 1 and 2. More generally an inclusive interval [a,b] becomes [n−b,n−a].

### 14. Four distinct tokens A,B,C,D are on a ring. A procedure chooses one of AB, BC, CD or DA, each with probability 1/4. Each token has inclusion probability 1/2. Is this a simple random sample of size 2 from the four tokens?

Answer: No; AC and BD are never selected, so the six two-token subsets are not equally likely.

A simple random sample requires equal probability for every subset of the specified size. Equal individual inclusion probabilities are not sufficient. This procedure assigns zero probability to AC and BD, while the four adjacent pairs have probability 1/4.

Transfer: If A and C are marked, this ring procedure always selects exactly one marked token. A simple random sample instead gives P(X=1)=C(2,1)C(2,1)/C(4,2)=4/6=2/3. Knowing only N,K,n does not repair a sampling design that violates the model.

## Mathematical sources and authorship

Mathematical background was checked against Philip B. Stark's UC Berkeley SticiGui:
- Random Variables and Discrete Distributions, hypergeometric subsection: https://www.stat.berkeley.edu/~stark/SticiGui/Text/randomVariables.htm
- Standard Error, simple random sampling subsection: https://www.stat.berkeley.edu/~stark/SticiGui/Text/standardError.htm

All questions, examples, explanations, interface prose and figures in this contribution are original, authored with AI assistance. No source exercises, prose or figures are reproduced. Original lesson content is CC0-1.0; referenced works retain their own terms.
