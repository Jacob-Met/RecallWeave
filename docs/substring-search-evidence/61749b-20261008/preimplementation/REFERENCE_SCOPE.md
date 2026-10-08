# Algorithm reference scope

All examples, prose, course answers, trace implementation and diagrams will be original. The following public primary/authoritative source reads establish background and attribution, not source-code parity.

- NIST Dictionary of Algorithms and Data Structures, Sterling Bates, “Knuth-Morris-Pratt algorithm,” modified2021-07-26, read2026-10-08: https://xlinux.nist.gov/dads/HTML/knuthMorrisPratt.html . The entry identifies the state-machine search interpretation, the `O(m+n)` bound, and the original authors/paper.
- Knuth, Morris and Pratt, “Fast Pattern Matching in Strings,” SIAM Journal on Computing6(2),323–350,1977, DOI10.1137/0206024: https://epubs.siam.org/doi/10.1137/0206024 . Publisher metadata and abstract were available; the full article requires access and was not read. The abstract describes finding all occurrences with a bound proportional to the two lengths.
- J Strother Moore's University of Texas explanation: https://www.cs.utexas.edu/~moore/best-ideas/string-searching/kpm-example.html . The authored worked search illustrates using a mismatch and known pattern structure to move the alignment. Its example text and presentation will not be reused.

The teaching implementation is an explicitly declared prefix-function variant, with independently checked proper-border and occurrence definitions. Exact comparison counts refer to that variant and its stated event convention. No claim is made that its steps or optimizations are byte-for-byte or operation-for-operation identical to those sources.

Nonqualifying source attempts are retained here for clarity: the Princeton substring page returned403, and the NIST-linked Charras/Lecroq index timed out. Neither is used as a read source. No paywall, browser route or access-control workaround was attempted.
