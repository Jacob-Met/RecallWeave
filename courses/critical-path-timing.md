# Parallel plans: critical paths, slack and what a delay changes

This original sixteen-question course turns a small dependency plan into timing
predictions. Learn when parallel work overlaps, how to work backward from a
deadline, why several branches can be critical, and when a changed duration
uses up slack. The examples require only addition, subtraction and comparisons.

Save [the course JSON](critical-path-timing.json), then open the repository's
`demo.html`. Under **Bring your own lesson**, choose that file, inspect its
title and sixteen-question preview, and select **Start this deck**. Starting a
deck explicitly replaces the current lesson and practice progress. Complete
the first-answer session, inspect the learning trace, practice missed questions,
and use **Download study notes (.txt)** to retain the session's explanations.
The course uses the existing `recallweave-deck/1` format; no new importer or
learning-model behavior is introduced.

The four concepts each have four questions:

1. **Earliest finish:** serial requirements and parallel joins.
2. **Latest times and slack:** backward reasoning and shared delay margins.
3. **Critical branches:** all limiting paths, tight arrows and milestones.
4. **Scope and changes:** recomputation, cycle refusal and omitted constraints.

Every prompt supplies its own job data and assumptions because the learner may
present questions in a different order. The examples are fictional mathematical
plans, not measured project data. The course makes no claim that a score measures
competence or that this lesson has demonstrated learning efficacy.

## The model we are using

Jobs have fixed nonnegative integer durations in abstract time units. Time starts
at 0. Any number of jobs may run simultaneously. An arrow `X -> Y` means X must
finish before Y starts; it carries no additional lag. The entire project is
finished only when every job is finished.

For an acyclic graph:

- A job with no prerequisites may start at 0. Otherwise its earliest start
  **ES** is the largest earliest finish among its prerequisites.
- Its earliest finish is **EF = ES + duration**.
- The earliest project finish **T** is the largest EF across all jobs.
- Work backward using this same T as the deadline. A job with no successors has
  latest finish **LF = T**; otherwise LF is the smallest latest start among its
  successors. Then **LS = LF - duration**.
- **Total slack = LS - ES**, equivalently LF - EF. A critical job has zero total
  slack under this particular deadline.
- A tight critical arrow has critical endpoints and **EF(source) = ES(target)**.

These rules describe the unchanged
[offline timing companion](dependency-timing.html). It accepts 1–8 named jobs,
at most 64 distinct arrows and integer durations from 0 through 1,000,000.
It shows all critical jobs and tight arrows; it does not select only one path.
Any cycle prevents a timing table, even if the cycle's durations are zero.

The lesson uses the earliest project finish as its deadline throughout. A later
external deadline would answer a different latest-time/slack question. Total
slack also differs from an assurance that no successor's *earliest* start moves:
some slack may be shared along a branch.

## Explore the examples without changing the companion

Open [dependency-timing.html](dependency-timing.html) directly in a browser. Put
one job name per line into **Job names**, and one `X -> Y` arrow per line into
**Prerequisite arrows**. Enter the listed duration beside each job. Choose **Calculate
timing** explicitly, then inspect the full table and critical arrows. Editing
any graph or duration retires the previous result and its download until you
calculate again. **Download timing trace (.json)** retains the actual accepted
input, assumptions and complete calculation.

The worked examples below fit the existing tool's bounds. The separate waiting
timeline in example D is a reasoning exercise: this companion has no arbitrary
wait, release-time or dependency-lag control. Do not pretend that typing a job
duration is the same as adding an external wait.

### A. One branch has room to move

Jobs: Prep=2, Draft=3, Review=4, Pack=1.

```text
Prep -> Draft
Prep -> Review
Draft -> Pack
Review -> Pack
```

The two complete branches take 2+3+1=6 and 2+4+1=7 units. Draft and Review
overlap after Prep. Pack waits for the later finish, so T=7 rather than the sum
of all work, 10.

| Job | Duration | ES | EF | LS | LF | Total slack |
|---|---:|---:|---:|---:|---:|---:|
| Prep | 2 | 0 | 2 | 0 | 2 | 0 |
| Draft | 3 | 2 | 5 | 3 | 6 | 1 |
| Review | 4 | 2 | 6 | 2 | 6 | 0 |
| Pack | 1 | 6 | 7 | 6 | 7 | 0 |

Prep, Review and Pack are critical. Draft can start at 3 instead of 2 and still
finish by 6. Its duration is 3, but its slack is only 1.

Change only Draft's duration to 4. Both branch totals become 7, so T stays 7
while Draft becomes critical. Change it to 5 instead: Pack starts at 7 and
finishes at 8. Against that recomputed deadline, Draft has slack 0 and Review
has slack 1. The old critical branch does not stay critical merely because it
was critical before the edit.

A separate serial check makes the contrast clear: Load=2 → Check=3 → Seal=1
takes 6 units despite unlimited parallelism. Those arrows forbid overlap.
Two unrelated jobs Scan=2 and Notes=3 instead finish together by time 3.

### B. Shortening one tied branch can leave the finish unchanged

Use A's graph with Draft=4 and Review=4. All four jobs are critical and T=7.
Now shorten only Draft to 3. Its branch drops to 6, but the Review branch still
requires 7, so the common finish remains 7. Draft gains one unit of slack.

Shortening **both** branch jobs from 4 to 3 gives T=6. That is not a claim about
the cost or feasibility of accelerating real work; it is a comparison of two
explicit sets of fixed durations.

### C. Zero duration does not decide criticality

Jobs: Start=0, Left=2, Right=2, Done=3, Note=0. Note has no edges.

```text
Start -> Left
Start -> Right
Left -> Done
Right -> Done
Start -> Done
```

| Job | Duration | ES | EF | LS | LF | Total slack |
|---|---:|---:|---:|---:|---:|---:|
| Start | 0 | 0 | 0 | 0 | 0 | 0 |
| Left | 2 | 0 | 2 | 0 | 2 | 0 |
| Right | 2 | 0 | 2 | 0 | 2 | 0 |
| Done | 3 | 2 | 5 | 2 | 5 | 0 |
| Note | 0 | 0 | 0 | 5 | 5 | 5 |

Start is a critical milestone. The disconnected Note is not critical under
the common deadline 5, despite also having duration zero. Note may occur as
late as time 5 without delaying completion.

The direct Start → Done arrow remains a prerequisite, but it is not tight:
Start's EF is 0 and Done's ES is 2. Critical endpoints alone are insufficient.
The four tight critical arrows are Start → Left, Start → Right, Left → Done
and Right → Done. The shortcut adds no lag and does not override the two
other prerequisites of Done.

As a transfer check, set every duration in this acyclic graph to zero. T becomes
zero and every job has zero slack, including Note. This different result follows
from the common deadline, not from a rule that zero-duration jobs are always
critical or always noncritical.

### D. Shared slack is not two independent waiting budgets

Jobs: Long=5, First=1, Second=1, Join=1.

```text
Long -> Join
First -> Second
Second -> Join
```

| Job | Duration | ES | EF | LS | LF | Total slack |
|---|---:|---:|---:|---:|---:|---:|
| Long | 5 | 0 | 5 | 0 | 5 | 0 |
| First | 1 | 0 | 1 | 3 | 4 | 3 |
| Second | 1 | 1 | 2 | 4 | 5 | 3 |
| Join | 1 | 5 | 6 | 5 | 6 | 0 |

Both short jobs report total slack 3. One three-unit wait before First shifts
First to 3–4 and Second to 4–5. Join still runs 5–6: both starts moved three units,
but only one extra wait was added.

Now add **another three-unit wait after First finishes and before Second
starts**. The timeline is:

| Event | Interval |
|---|---|
| Long | 0–5 |
| First wait | 0–3 |
| First | 3–4 |
| Separate second wait | 4–7 |
| Second | 7–8 |
| Join | 8–9 |

The resulting finish is 9. Saying merely that “both starts are three units later”
would describe the first timeline and would not justify 9. The course question
therefore specifies the two separate waits explicitly.

### E. A refusal is not a finish value

Jobs: X=1, Y=1, Z=1, Free=2. Only edges X → Y, Y → X, Y → Z.

X and Y are cycle members. Z is downstream of that cycle but cannot reach it,
so Z is blocked rather than a member. Free is disconnected and independently
ready. The companion refuses a whole-plan timing result; it does not silently
delete the cycle or report a numerical finish of zero. Completing Free would
not remove the cycle.

This is a DAG timing model, not a model of repeated or iterative work. To study
an iteration, specify a different mathematical model rather than interpreting
this refusal as a timing estimate.

## Worked answer map and transfer checks

The learner JSON supplies feedback and an open-ended transfer prompt for every
question. The table gives a compact independent-review target.

| Question | Correct content | Main distinction |
|---|---|---|
| ct-early-1 | 3 units | Parallel finish is a maximum, not total work. |
| ct-early-2 | 7 units | Both complete branches constrain the join. |
| ct-early-3 | Time 6 | A start is not a finish, and every prerequisite matters. |
| ct-early-4 | 6 units | Unlimited workers do not remove serial arrows. |
| ct-slack-1 | Time 3 | Backward start is deadline minus downstream requirements. |
| ct-slack-2 | 1 unit | Duration and total slack are different quantities. |
| ct-slack-3 | (3, 4) | Latest starts respect First → Second. |
| ct-slack-4 | 9 units | Two explicitly separate waits exceed the shared margin. |
| ct-critical-1 | All four jobs | Tied branches remain critical together. |
| ct-critical-2 | 7 units | The unchanged tied branch still limits the finish. |
| ct-critical-3 | Start → Done is not tight | EF(Start)=0 differs from ES(Done)=2. |
| ct-critical-4 | Start slack 0; Note slack 5 | A zero milestone and an isolated zero job differ. |
| ct-change-1 | Finish 7; both branches critical | The critical set can change without a changed finish. |
| ct-change-2 | Finish 8; Draft slack 0, Review slack 1 | Recompute against the new earliest finish. |
| ct-change-3 | Cycle X/Y, blocked Z, ready Free; no timing | Cycle membership differs from downstream blocking. |
| ct-change-4 | Model result only | Calendars, worker limits and uncertainty were not entered. |

Transfer responses are deliberately open-ended. A useful response names the
changed assumption or recomputes the relevant path, rather than repeating an
answer letter. For example, reducing Draft and Review together in B gives 6;
delaying only Draft's start to 3 in A preserves 7; and the all-zero version of C
makes every job zero-slack. For a one-worker version of A, the unlimited-parallel
result cannot simply be reused.

Correct positions are balanced across the sixteen questions. No question depends
on a previous answer or on recognizing the longest option. The four prerequisite
concepts form an acyclic chain; those lesson links guide the existing learner
and are separate from the job graphs inside the questions.

## Limits, references and original content

This lesson does not schedule people, optimize staffing, account for working
calendars, estimate uncertain durations or recommend a production deadline.
Its numerical answers are exact for the supplied small mathematical instances.
They do not validate the realism of the supplied dependencies or durations.

Primary references checked on 2026-10-08:

- Olivier de Weck, MIT OpenCourseWare **ESD.36 System & Project Management,
  Fall 2012, Lecture 2: Critical Path Method**, especially slides 18, 22–29 and 38:
  <https://ocw.mit.edu/courses/esd-36-system-project-management-fall-2012/50d2b3499047b71baaa511aa809f6712_MITESD_36F12_Lec02.pdf>.
  This supports the precedence, forward/backward-time and slack terminology.
  The course's tied-branch and changed-duration examples explicitly retain
  their stated conditions rather than treating every critical-job reduction
  as an unconditional project speedup.
- Robert Sedgewick and Kevin Wayne, **Algorithms, 4th edition**, public
  `CPM` API documentation:
  <https://algs4.cs.princeton.edu/code/javadoc/edu/princeton/cs/algs4/CPM.html>.
  Its indexed primary documentation describes the connection between parallel
  precedence-constrained scheduling and longest paths in a DAG. A direct page
  fetch returned HTTP 403 during this review; no full-page access is claimed.

All lesson wording, numerical instances, choices, explanations, transfer prompts
and worked tables were authored for this contribution, **estate-60b2c08feb01**,
with AI assistance. No reference exercise, illustration or passage is copied.
The original course content is offered under **CC BY 4.0** with attribution;
the references retain their own terms and do not endorse this lesson.

## Native content checks

From the repository root, run:

```sh
node --test tests/critical-path-timing-course.test.mjs
```

The maintained checks admit the literal course through the existing validator,
derive the small graphs from its actual prompts, check keys against independently
enumerated paths and compare that calculation with the unchanged native timing
model. Schema-valid wrong-answer controls for the earliest finish and the
non-tight shortcut must be rejected.

Those content checks are distinct from real learner/browser receiving and from
required hosted CI. The original timing companion's accepted behavior is reused;
this course changes none of its source or generated bytes. The active Actions
hold leaves hosted gates required and unrun; it is not permission to bypass them.
