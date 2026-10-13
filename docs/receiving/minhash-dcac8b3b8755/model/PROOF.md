# Independent MinHash teaching oracle

This contract was frozen before candidate source exposure. It uses nine explicit set cases and six fully enumerated rows for the partial-overlap example. It requires no random trial or approximate tolerance.

Let U = A union B, n = |U|, and k = |A intersection B|. Both A and B are nonempty. For any permutation of U, let u be its first element. If u belongs to both sets, it is both minima. If u belongs to only one set, that set's minimum is u and the other set's minimum is a different label. Thus the collision event is equivalent to u belonging to the intersection.

For each fixed label u, exactly (n-1)! of the n! permutations put u first. Exactly k * (n-1)! permutations collide. Therefore the exact collision fraction is k/n, the Jaccard similarity. No stochastic approximation is used. With a five-label union the complete teaching universe contains 120 permutations.

For A={a,b}, B={b,c}, exactly two of six rows collide. The selected order [b,a,c] collides, while [a,b,c] does not. Neither observation proves certainty or equals the true 1/3 similarity. A uniformly sampled permutation has collision probability 1/3; a deterministically chosen order has no such sampling guarantee.

The JSON contains independently fixed integer totals, collision counts and reduced fractions. Literal label comparisons preserve case, leading spaces and accents. Only exactly repeated entries collapse. Input-array order does not affect the aggregate or the minima for the same displayed permutation. Blank-label and delimiter admission need a separate product decision; they are not silently specified here.

This is a mathematical acceptance oracle, not an executed candidate test, native/browser receipt or main-source adoption.
