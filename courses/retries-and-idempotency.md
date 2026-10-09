# Retries: one request, uncertain replies

A missing reply leaves a practical question: did the requested change happen? This lesson follows small counters, registers and operation records so you can distinguish a repeated delivery, a distinct intention and a historical result.

Save [the twelve-question deck](retries-and-idempotency.json). In RecallWeave, choose it under **Bring your own lesson**, inspect the preview, then select **Start this deck**. The deck uses the existing review, practice and study-note flow. This guide supplies worked reasoning for the same questions; it does not send requests or operate a service.

## The rules belong to each example

Each prompt states its fictional protocol. All numbers here are exact integers. ADD n changes a counter c to c + n. SET v replaces a register with v. No unmentioned operation, rollback, record or ordering guarantee exists.

For a requested state transition f, idempotence means f(f(s)) = f(s), for the states covered by that operation's contract. It does not say f(s) = s, require identical response text, or automatically protect an intervening writer. When an example discusses an operation ID, its namespace, parameter comparison and retention rule are stated explicitly. The letter K has no special behavior outside that rule.

Four concepts build on one another:

1. Compare the effects of one application and repeated applications.
2. Decide what makes two deliveries the same operation.
3. Separate a retained result from current state, and connect the record to the effect.
4. State the time, concurrency and delivery limits of the guarantee.

Try the deck before reading the worked answers. RecallWeave shuffles answer options in a learner session, so the labels below use question IDs and result meanings, not displayed A–D letters.

## Worked answers

### 1. Adding twice changes the state twice

**Question:** `retry-increment-twice`.

Start at 7. The first ADD 3 gives 10. The second gives 13. One application ends at 10, while two end at 13, so this requested counter change is not idempotent. Reusing the same request text changes neither calculation.

**Transfer:** SET 10 from 7 gives 10; repeating SET 10 still gives 10. The crucial comparison concerns state transitions.

### 2. Assignment can be idempotent and still do work

**Question:** `retry-assignment-twice`.

The register trace is 4 → 12 → 12. The first application changes state; its immediate repeat adds no further requested register effect. Two separate audit entries do not alter that comparison. A claim about one requested effect should identify that effect rather than silently include every log or observation.

**Transfer:** DELETE-if-present can first report “removed” and later “already absent” while both leave the requested object absent. Idempotence does not require equal responses.

### 3. A timeout is a missing observation

**Question:** `retry-missing-reply`.

These two histories fit the same client observation:

| History | Server effect | Client observation |
| --- | --- | --- |
| Request never reaches the service | No increment | No response |
| Increment commits and its reply is lost | One increment | No response |

The timeout alone does not choose between them. A second unprotected increment could duplicate an effect, but declaring success would also be unjustified.

**Transfer:** A protocol-specific lookup of the original operation's retained result could resolve the uncertainty. Assigning a fresh identity does not discover what happened to the old one.

### 4. Historical results do not rewind current state

**Question:** `retry-historical-result`.

| Delivery | Action under the declared rule | Reply | Counter afterward |
| --- | --- | ---: | ---: |
| A, ADD 2 | Apply and retain A's result | 2 | 2 |
| B, ADD 5 | Apply and retain B's result | 7 | 7 |
| A, ADD 2 again | Replay A's retained result | 2 | 7 |

The last pair is **reply 2, current counter 7**. Replaying a receipt is neither a new addition nor a restoration of the old state.

**Transfer:** A separate current-value read after the replay reports 7 in this trace. Label which kind of observation each number represents.

### 5. A retained identity fixes the declared intent

**Question:** `retry-changed-intent`.

The stored record binds blue to ADD 4. A later blue with ADD 9 conflicts with that binding. The specified service refuses the mismatch without changing the counter or the record; the counter remains 4.

**Transfer:** A genuinely new request to add 9 needs a new identity under this protocol. That is a new operation, not a way to resolve uncertainty about blue.

### 6. Equal parameters can describe two intended operations

**Question:** `retry-equal-parameters-new-ids`.

Starting at 1, first/ADD 3 gives 4 and second/ADD 3 gives 7. The caller intentionally supplied distinct IDs. Comparing only amounts would incorrectly suppress one of these two operations.

**Transfer:** If the caller repeats first instead, with the same amount while its record remains, its retained result replays and the counter stays at 4. Parameters and operation identity play different roles.

### 7. Compare the complete identity namespace

**Question:** `retry-caller-namespace`.

The keys are (Ada, job-1) and (Bo, job-1). Because this protocol keys by the complete pair, both are first deliveries: 0 → 2 → 4. The repeated job-1 text alone is not a collision.

**Transfer:** (Ada, job-1) repeated by Ada is the same pair. Another API could define a different namespace; read its contract before applying this example.

### 8. A durable effect without its record can be duplicated

**Question:** `retry-record-effect-gap`.

The broken sequence is:

1. ADD 5 becomes durable, leaving the counter at 5.
2. The service crashes before recording completion for K.
3. After restart, the handler sees no K record and applies ADD 5 again.
4. The counter becomes 10.

The example exposes a gap between the effect and the fact needed to recognize it. It does not claim that a timeout rolled the effect back.

**Transfer:** Reversing two unrelated writes does not solve the general problem. A success record could survive while the effect never commits. The teaching requirement is that the supported atomic durable outcome includes both pieces.

### 9. Atomic increments do not make a check-and-record protocol atomic

**Question:** `retry-concurrent-check`.

Both workers observe no K record. W1 then increments 0 → 1; W2 increments 1 → 2. Neither increment is lost, yet the same identity produced two effects.

**Transfer:** A different protocol could make one protected identity decision and its effect/result commitment while the other worker receives the retained result. Atomicity must cover the relevant decision; atomicity of one counter instruction is not enough for this trace.

### 10. Retention is part of the guarantee

**Question:** `retry-retention-expiry`.

K first changes 0 → 2. Deleting its record at 60 seconds leaves the counter at 2. At 120 seconds, the explicitly stated handler treats the missing record as a new operation, giving 4.

**Transfer:** An actual service might instead refuse an expired identifier or impose other conditions. This lesson's outcome follows its declared policy; it is not a universal expiry rule.

### 11. Repeating an assignment can overwrite an intervening update

**Question:** `retry-intervening-update`.

The actual sequence SET 5, SET 9, SET 5 yields 5 → 9 → 5. Immediate repeated SET 5 is idempotent, but that fact alone does not preserve the intervening writer's value. It also does not make SET 5 and SET 9 commute.

**Transfer:** If the final two deliveries arrive in the opposite order, the final value is 9. A version precondition or retained operation record could define another protocol; neither appears in this example.

### 12. At most one does not promise eventual completion

**Question:** `retry-at-most-once-not-eventual`.

A request that never reaches the service causes zero increments. Zero satisfies the at-most-one bound. Duplicate suppression alone cannot deliver a lost message, arrange another attempt or ensure success.

**Transfer:** A bounded retry policy may stop with the effect unknown or absent. State the actual observation and the protocol's assumptions rather than inferring completion from the word idempotent.

## Put the distinctions together

For a new hypothetical protocol, write down these six things before predicting a retry:

- The requested state transition.
- The complete operation identity and namespace.
- Which parameters are bound to that identity.
- What commits together and how concurrent duplicates are decided.
- How long the relevant record is retained and what expiry means.
- What the caller actually observed, including whether it is a historical result or a current-state read.

For example, a retained result may establish that one operation committed, while a current read may show a value changed by later operations. Both can be correct. A lost response can leave uncertainty even when the system's internal rule is sound.

This is a conceptual lesson with fully stated teaching protocols. It supplies no production retry policy, network client, storage implementation or claim of exactly-once delivery. The repository's model estimates are illustrative; structural deck admission and content review do not establish learning effectiveness.

## Sources, authorship and reuse

These questions, numeric traces, explanations and transfer examples are original, authored with AI assistance in 2026. No source implementation, quoted passage or exercise is reproduced.

- [RFC 9110, section 9.2.2: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#name-idempotent-methods) supplies the distinction between an intended requested effect and repeated request delivery.
- Malcolm Featonby's [Making retries safe with idempotent APIs](https://aws.amazon.com/builders-library/making-retries-safe-with-idempotent-APIs/) discusses explicit request identity, intent, retained responses and the limits of retry guarantees.

CC0-1.0 applies to this lesson's original wording and examples. The linked sources retain their own terms and are not included. See [AI-DISCLOSURE.md](../AI-DISCLOSURE.md) for the project's educational review context.
