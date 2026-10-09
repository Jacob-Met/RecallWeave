# Optimal stopping: when the next record is enough

Open `optimal-stopping-explorer.html` directly from your files. No server, installation, account or connection is needed. Choose an authored order, set the skip count, then select **Run this order**. Editing any input retires the displayed result and its observation download.

This finite teaching model has a known number n of distinct arrivals, from 1 to 8. Rank n is best. First reject a chosen number r, then choose the first later arrival better than every earlier arrival. If no such record is selected earlier, choose the final arrival. Rejection and selection are irreversible.

The whole authored order is visible to you, but the rule does not consult the future or test whether a label equals n. It uses only comparisons with the observed prefix. Rows after selection are explicitly not observed. The selected rank is compared with n only afterwards to label success.

## One order and a probability are different objects

The order 2,4,1,5,3 with r=2 observes ranks 2 and 4, rejects 1, then selects 5. The last rank 3 is not observed. By contrast, 1,3,4,2 with r=1 selects 3 and misses the later best. A record is best so far, not necessarily best overall.

For 4,1,3,2 with r=1, the best is rejected during observation. No later record appears; the fallback selects rank 2 at the end. The fallback cannot recover the rejected best. A final record uses the ordinary record action; a final nonrecord uses the fallback action.

The probability table is separate: it gives equal weight to all n! orders. It is not a simulation estimate, a measured success rate or a prediction for an arbitrary arrival process.

## Derive the exact finite count

For r=0 the first arrival is selected, and it is best in (n−1)! orders.

For r≥1, condition on the best being at position j, where j ranges from r+1 to n. That position contains the best in (n−1)! orders. To reach it without selecting earlier, the largest of its j−1 predecessors must lie among the first r positions. Those predecessor positions are symmetric. Thus the successful count for this position is r·(n−1)!/(j−1).

Sum these counts over j and divide by n!. Each division is exact for the bounded integer count used here. Reduce the resulting fraction; displayed percentages are only a secondary decimal presentation.

For n=4,r=1 the three contributions are 6,3,2: 11/24. For n=3,r=1 the successful orders are 1,3,2; 2,1,3; and 2,3,1, giving 3/6=1/2. For n=2 both allowed skip counts tie at 1/2. The table retains every maximizing skip, not a fabricated unique winner.

Skipping n−1 always selects the last arrival, with probability 1/n. At n=1 the sole rule selects its sole item and succeeds. The broader classical large-n approximation of about 37% is context, not a replacement for these exact finite comparisons.

## Assumptions and boundaries

“Best skip count” means best among the displayed threshold rules, with this success objective and uniform distribution. Changing arrival probabilities, allowing ties or recall, hiding n, charging a cost for waiting or valuing second-best outcomes changes the problem. This lesson is not a hiring, financial or clinical recommendation.

Use **Save observation JSON** to keep this authored input, every trace row, the choice, all exact threshold counts and assumptions. This file is a mathematical observation and cannot be imported as a lesson or learner-answer archive.

Use **Save course JSON**, then open the unchanged RecallWeave `../demo.html`. Under **Bring your own lesson**, choose the downloaded course, inspect its preview and select **Start this deck**. A download does not start a learner session. The explorer stores no history automatically; closing it discards changes that you have not explicitly downloaded. Printing preserves the complete applied trace and probability table.

## Study and transfer

The twelve original questions cover relative information, stopping traces, exact probability and model boundaries. Each answer explanation is in the course file. Try writing an order that succeeds and one that fails for the same n and skip. Explain why neither one-order result changes the all-order count. Then change an assumption and identify which calculation would need to be replaced.

## Source and authorship

Original lesson, worked examples, finite count derivation and implementation by HAMON estate contributor estate-81ba1ed0179c, CC0-1.0. Mathematical background: Thomas S. Ferguson, *Optimal Stopping and Applications*, Chapter 2 §2.1, https://math.ucla.edu/~tom/Stopping/sr2.pdf (accessed 2026-10-09). That source uses a different threshold index and rank orientation; here r is the number rejected and larger rank is better. Its classical no-selection convention and our mandatory final fallback have the same best-choice success count: a nonrecord fallback cannot be the global best. No source exercises, diagrams or prose are reproduced.

Build only this explorer with `node tools/build-optimal-stopping.mjs`; `--check` verifies exact generated bytes. Run focused controls with `node --test tests/optimal-stopping.test.mjs`. Existing learner, catalog, README and workflow files remain untouched.
