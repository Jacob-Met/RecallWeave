# Markov chains: where probability goes

This optional RecallWeave course has fourteen original questions across five concepts. It is for learners who can multiply probabilities, add contributions, and read a table; no matrix-algebra prerequisite is required. It distinguishes a conditional transition rule, a probability distribution, a particular path, a stationary distribution, and convergence.

## Open the explorer and course

Open [the self-contained explorer](markov-chains-explorer.html) directly in a browser. Choose a teaching system or edit its nine transition percentages and three initial percentages, then select **Apply this system**. Every entry must be an integer from 0 to 100; each transition row and the initial distribution must total 100. There is no silent normalization.

Move the step slider, or use **Previous**, **Next step**, and **Step 0**. The chart contains step 0 through step 30. The incoming-contribution table explains the selected transition, and the complete distribution table provides the chart values as text. Percentages are displayed to four decimal places; a displayed 0% or 100% can be a rounded value.

The editor is a draft. Editing a field leaves the applied chart and observation unchanged until a valid system is applied. An invalid application displays a reason and preserves the applied system and selected step. The preset and initial-distribution shortcut buttons apply their shown inputs. The 50 / 25 / 25 shortcut is stationary for Mixing and Alternating; it does not claim stationarity for every custom system.

**Download observation (.json)** saves the applied integer inputs, selected step, and complete computed probability/contribution trace under format `recallweave-markov-observation/1`. Numeric JSON retains JavaScript binary64 computed precision. It is an explanatory observation, not a RecallWeave lesson or saved learner trace.

**Download course (.json)** saves the exact [original course file](markov-chains.json). Open RecallWeave's `demo.html`, choose that file under **Bring your own lesson**, inspect the preview, then select **Start this deck**. The existing learning, review, practice and study-notes flow uses the imported course. The explorer remains separate from the learning model. A copied explorer works by itself; its relative links to the course guide or learner require the companion repository files.

All explorer computation and downloads work without a server or internet connection. The page does not call a service, sample paths, use browser storage, or save files automatically. Refreshing restores the Mixing preset. External mathematical reading links are optional.

## Conventions and exact worked checks

These are hypothetical finite, discrete-time, time-homogeneous three-state chains. Rows are **current state** and columns are **next state**, in A, B, C order. For a row probability vector, the next distribution is `p_next = p_current P`. A row gives conditional probabilities; the current distribution weights those rows. All matrix entries below are percentages.

| Teaching system | From A | From B | From C | Default initial |
| --- | --- | --- | --- | --- |
| Mixing | 60, 20, 20 | 40, 50, 10 | 40, 10, 50 | 100, 0, 0 |
| Alternating | 0, 50, 50 | 100, 0, 0 | 100, 0, 0 | 100, 0, 0 |
| Absorbing A | 100, 0, 0 | 25, 50, 25 | 0, 50, 50 | 0, 0, 100 |
| Two closed states | 100, 0, 0 | 0, 100, 0 | 40, 60, 0 | 0, 0, 100 |

### Mixing

Starting entirely in A gives 60/20/20 after one step, 52/24/24 after two steps, and 50.4/24.8/24.8 after three steps. At step 2, the contributions to A are 0.60×0.60, 0.20×0.40, and 0.20×0.40, totaling 0.52. Starting at 50/50/0 instead gives 50/35/15 after one step.

The path A → B → C has probability 0.20×0.10 = 0.02. The probability of being in C after two steps is 0.24 because paths through A, B, and C all contribute. A distribution does not prescribe exact sample counts: 100 independent runs have an expected count of 52 in A after two steps, with possible variation.

The stationary distribution is 50/25/25. Each transition is positive, so the chain is irreducible and aperiodic and distributions converge to this vector from every initial distribution. From the default initial state, the exact probabilities after n steps are A = 1/2 + (1/2)(1/5)^n and B = C = 1/4 − (1/4)(1/5)^n.

### Alternating

Starting entirely in A gives 100/0/0 at every even step and 0/50/50 at every odd step. Its stationary distribution is 50/25/25, but that does not imply convergence from the default initial distribution. The chain is irreducible with period 2.

Starting at 50/25/25 instead keeps the distribution fixed. Every diagonal transition is zero, so every individual path changes state at each step. Stationarity means an unchanged distribution, not a frozen path.

### Absorbing A

Starting entirely in C gives 0/50/50 after one step and 12.5/50/37.5 after two steps. A is absorbing, and the other states have routes to A. In this specific finite chain the distribution tends to all mass in A; a finite plot does not prove that every realized path has already arrived.

An absorbing row alone says what happens after reaching that state. It does not show that other states can reach it. This chain is reducible and nevertheless has the unique stationary distribution 100/0/0.

### Two closed states

A and B are separate absorbing states. Starting entirely in C gives 40/60/0 after one step and remains there. Starting at 20/30/50 also gives 40/60/0 after one step; starting entirely in A stays in A. Every distribution supported on A and B is stationary, so the stationary distribution is not unique.

## Concept sequence

| Concept | Questions | Main distinction |
| --- | --- | --- |
| State and transition rules | mc-rule, mc-row, mc-valid-row | Current-state condition and a valid row |
| Probability flow | mc-mixture, mc-two-steps, mc-path-versus-endpoint | Incoming sums and all paths to an endpoint |
| Repeated steps and observations | mc-distribution-not-count, mc-step-zero | Probabilities versus realized counts; initial conditions |
| Stationary distributions | mc-stationary-test, mc-stationary-does-not-freeze | An invariant distribution versus a motionless path |
| Cycles and closed states | mc-alternation, mc-mixing-conditions, mc-absorbing, mc-closed-start | Periodicity, sufficient convergence conditions, reachability and nonuniqueness |

The prerequisite links are part of the normal deck format. The course uses the existing illustrative learning model; it makes no claim of measured learning efficacy or new assessment calibration.

## Mathematical references and original-content terms

These primary sources establish the standard mathematical background:

1. [MIT 6.436J/15.085J, Fall 2018, Lecture 21: Markov chains](https://ocw.mit.edu/courses/6-436j-fundamentals-of-probability-fall-2018/141423989a49375f14f0a44940d81e67_MIT6_436JF18_lec21.pdf), especially PDF pages 2–4 for row transitions, distribution updates and stationarity.
2. [Hao Wu, MIT 18.445, Spring 2015, Lecture 2](https://ocw.mit.edu/courses/18-445-introduction-to-stochastic-processes-spring-2015/2edaa8542469ce692226813a8bd1ec88_MIT18_445S15_lecture2.pdf), for irreducibility, stationary distributions and period.
3. [Hao Wu, MIT 18.445, Spring 2015, Lecture 4](https://ocw.mit.edu/courses/18-445-introduction-to-stochastic-processes-spring-2015/5bd4774f613aa28bd111c36f3a3beeed_MIT18_445S15_lecture4.pdf), PDF page 3 for convergence under finite irreducibility and aperiodicity.

For finite chains, irreducibility is sufficient for a unique stationary distribution. Irreducibility plus aperiodicity is sufficient for convergence from every initial distribution. These are not necessity claims: the reducible Absorbing A example also has a unique stationary distribution and convergence.

The questions, numerical systems, explanations and transfer prompts are original, prepared with AI assistance in 2026 and released under CC0-1.0. The referenced materials retain their own terms; no third-party exercises, prose passages or figures are reproduced. These original-content terms do not relicense the rest of the repository.

## Rebuild and verify

Run `node tools/build-markov-chains.mjs` to rebuild the single-file explorer from its core, UI, template and exact course bytes. Run the same command with `--check` to check parity without writing.

The focused checks run with `node --test tests/markov-chains.test.mjs`; the ordinary `node --test tests/*.test.mjs` command also includes them. Numerical checks use independent integer-rational propagation and exact preset identities, including a periodic stationary chain and more than one closed state.

The optional real-browser receiving script is `tools/check_markov_chains_browser.cjs`. It uses an already-installed Playwright and Chrome/Chromium, selected through `NODE_PATH` and `BROWSER_BIN`, and takes a new output-directory path as its first argument. It checks both the isolated single-file explorer and the served page, then imports the actual downloaded course into both learner versions and saves real study notes. It creates its browser profile and download directory only inside that output directory.
