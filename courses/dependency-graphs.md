# Directed graphs: from arrows to dependency plans

This original twelve-question course develops a practical graph vocabulary for
reading job dependencies, following their effects and checking a proposed order.
It is intended for learners who can read short lists and count steps; no
programming or prior graph theory is required. Every example supplies its own
vertices, edges and interpretation. There is no empirical learner data or claim
that these questions measure competence.

The course file is [dependency-graphs.json](dependency-graphs.json), using the
existing `recallweave-deck/1` format. Its four concepts each have three questions:
directed links, reachability, dependency orders, and cycles/updates. The course's
prerequisite links form an acyclic graph. Correct positions are balanced across
the four options; neither option length nor alphabetic order identifies the
answers consistently.

## Explore the prerequisite decisions

Open the [offline dependency-planning companion](dependency-graphs-explorer.html)
to edit a small graph, complete ready jobs, undo or reset progress, and distinguish
cycle members from downstream blocked jobs. Its course examples use the arrow
convention below. The companion also downloads this original course unchanged
for the existing learner; its calculations and download work directly from the
single HTML file.

## Open and adapt it with the integrated studio

1. Open the repository's existing `author.html` directly in a browser, or serve
   the repository and visit `author/`.
2. Choose **Open a deck to edit** and select `dependency-graphs.json`.
3. Inspect the studio's preview, then choose **Replace draft** when you intend
   to replace the current editor draft.
4. Inspect or adapt the questions. **Check and preview** validates the draft and
   exposes its answer key. **Download deck (.json)** saves the checked course.

The studio is the existing owner's application. This contribution supplies
course content and does not alter its import, preview, replacement or export
behavior. Learner-side local course selection is the separate
[issue #7](https://github.com/Jacob-Met/RecallWeave/issues/7) contribution; this
course does not add a second importer or claim that path is integrated. The
original bundled cellular-energy lesson and other course contributions remain
unchanged.

## Conventions that matter

An arrow is directed. For the dependency-order questions, `X → Y` means that X
must come before Y. Other applications can choose the reverse convention, so
the arrow legend is part of the problem. Direct neighbors are one edge away;
reachability can use several edges. Where the starting vertex must be excluded,
the question says so explicitly.

Shortest distance in this course counts edges equally. A weighted cost question
would be different. Ready jobs have all graph prerequisites complete; this says
nothing about available workers or shared resources. A cycle prevents a complete
topological order, but a node blocked by that cycle need not itself lie on the
cycle. These distinctions are mathematical properties of the supplied examples,
not claims about a particular production scheduler.

## Worked answer map

The JSON contains the complete learner feedback and transfer prompts. The table
below makes each answer and its principal distractor checks easy to review.

| Question | Correct result | Derivation and rejected alternatives |
|---|---|---|
| `dg-links-1` | `Parse → Render` | Parse is the prerequisite. Reversing the arrow reverses the requirement; adding a return arrow or a self-loop does not encode the single stated dependency. |
| `dg-links-2` | 2 | Only B and E have edges ending at D. A and C are indirect predecessors through B. |
| `dg-links-3` | `{B, C}` | These are the endpoints of A's outgoing edges. D requires two edges; A has no self-loop. |
| `dg-reach-1` | `{B, C, D}` | B and C are one step from A; D is two steps away. E and F are disconnected from A, and there is no positive-length route back to A. |
| `dg-reach-2` | 2 | `S → C → T` takes two edges. No direct edge gives one step. The route through A and B is longer. |
| `dg-reach-3` | `{Clean, Chart, Summary}` | Follow both branches below Clean. The explicit rule excludes Raw and unrelated Glossary; omitting Summary misses a downstream consumer. |
| `dg-order-1` | `B, A, C, D` | Both A and B precede C, which precedes D. Each other option violates at least one of those edges. |
| `dg-order-2` | `{B}` | C still needs B, and D still needs C. One completed prerequisite does not satisfy all prerequisites. |
| `dg-order-3` | 2 orders | C is last; A and B can occur in either order. The two possibilities exhaust all arrangements. |
| `dg-update-1` | add `C → A` | The existing `A → B → C` path gives the directed return route. The other three additions leave at least one valid topological order. |
| `dg-update-2` | `{A, B, C}` remain | Remove D, then E. A and B remain circular; their dependent C stays blocked despite not being a cycle member. |
| `dg-update-3` | same valid-order set | `A → B → C` already forces A before C. The original and augmented graphs both allow exactly `A,B,C,D`, `A,B,D,C`, and `A,D,B,C`. |

The last example preserves ordering only. A redundant edge could carry other
meaning in a data-transfer graph; the course does not recommend deleting such
edges from an application.

## References and original-content provenance

The following primary teaching and reference materials were read on
2026-10-08 to check terminology and the general graph properties:

- Paul E. Black, **directed graph**, NIST *Dictionary of Algorithms and Data
  Structures*, entry updated 2023-06-08:
  <https://xlinux.nist.gov/dads/HTML/directedGraph.html>.
- Paul E. Black, **topological sort**, NIST *Dictionary of Algorithms and Data
  Structures*, entry updated 2022-04-21:
  <https://xlinux.nist.gov/dads/HTML/topologicalSort.html>.
- Erik Demaine, Jason Ku and Justin Solomon, MIT OpenCourseWare **6.006,
  Lecture 9: Breadth-First Search**, Spring 2020, especially pages 1–4:
  <https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/196a95604877d326c6586e60477b59d4_MIT6_006S20_lec9.pdf>.
- The same MIT course, **Recitation 10**, especially the topological-sort
  definition on page 3:
  <https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/d9265b3b33d238ff914b0223ac8e7628_MIT6_006S20_r10.pdf>.

All scenarios, vertex sets, question wording, options, explanations and transfer
prompts were newly authored for this course by the HAMON estate contribution
`e137a7f86391` with AI assistance. No reference exercise, figure, example graph or
passage is copied. Original course content is offered under **CC BY 4.0**; the
linked sources retain their own terms. Reference links are background reading,
not an endorsement of this course or a claim of measured learning effectiveness.

## Exact-content receiving

Run the focused native check with Node 20 or later from the repository root:

```sh
node --test tests/dependency-graphs.test.mjs
```

It admits the literal UTF-8 course through the existing validator, checks its
bounded size and round trip, and derives the example answers from the graph
declarations in the actual learner prompts. Exhaustive enumeration covers the
small ordering examples. Two intentionally changed course copies remain
structurally valid but fail the mathematical answer check: a reversed
prerequisite and a blocked descendant mislabeled as removable.

The existing selector, first-answer review, separate practice, study-note export
and trace archive are also exercised with these twelve questions. That native
consumer check is distinct from actual browser/studio receiving. Source and
receiving records retain their exact pins; no learner-importer or browser
acceptance is inferred from format validation alone.
