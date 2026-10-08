# How an estimate changes

The optional [model walkthrough](../model-walkthrough.html) answers a concrete
question: **how can a response change the model's estimate, and which assumptions
caused the change?** It uses the same `updateMastery` function as the lesson.
The inputs are a hypothetical response sequence for one concept; it does not
read a learner's answers or infer a person's knowledge.

Open the standalone file directly. The page works without a server, account or
network connection. The modular version is `model-walkthrough/index.html`.
The lesson's existing **How the adaptive model works** note opens the walkthrough
in a separate tab, so the current question stays in its original tab.

## Explore an update

The opening example contains one hypothetical correct response followed by one
hypothetical incorrect response. The four fields initially use the shipped
illustrative defaults:

| Assumption | Default | Meaning inside this model |
| --- | ---: | --- |
| Initial knowledge | 0.22 | Probability assigned to the known state before any response |
| Guess | 0.20 | Probability of a correct response in the not-yet-known state |
| Slip | 0.10 | Probability of an incorrect response in the known state |
| Learning transition | 0.18 | Probability of moving from not-yet-known to known after a response |

Use **Correct response** or **Incorrect response** to append an observation.
Choose a history row to inspect its evidence and learning stages; change its
outcome in the adjacent select control to recompute that response and every
later estimate. **Undo last response** removes the last observation.
**Clear responses** keeps the applied assumptions and returns the estimate to
their initial value.

Editing the fields creates a draft. **Apply assumptions** recomputes the entire
current hypothetical sequence before replacing the displayed result.
Until the draft is applied, the old result remains labeled as using the
previous applied assumptions, and response additions/edits are disabled.
**Restore illustrative defaults** keeps the response sequence and recomputes it
with the four defaults above. History inspection, removal and exporting continue
to refer to the applied trace.

There is a limit of 24 responses to keep the history practical to inspect.
After reaching it, edit a response, undo the last one, or clear the sequence.

## The two stages

Let `p` be the current probability assigned to the known state, `g` the guess
probability, `s` the slip probability, and `t` the learning-transition
probability. The walkthrough exposes the two joint weights used by the actual
shipped function.

| Observed response | Known-state weight | Not-yet-known weight |
| --- | --- | --- |
| Correct | `p × (1 − s)` | `(1 − p) × g` |
| Incorrect | `p × s` | `(1 − p) × (1 − g)` |

The sum of the weights is the probability of that response under the current
assumptions. Dividing the known-state weight by this sum gives the probability
after considering the evidence:

```text
posterior = known-state weight / (known-state weight + not-yet-known weight)
```

The model then adds the assumed learning transition to the remaining
not-yet-known share:

```text
learning contribution = (1 − posterior) × t
next estimate = clip(posterior + learning contribution, 0, 1)
```

The next estimate becomes the prior for the next response. The final value shown
is obtained by calling the unchanged `updateMastery`; the walkthrough's
explanatory fields follow its operation order. The detailed view also exposes
prior clipping, the value before final clipping, and any final clipping change.

For the first correct response with the defaults, the two weights are
`0.198` and `0.156`. The evidence posterior is `33/59`, about **55.93%**.
The learning transition then adds about **7.93 percentage points**, giving
about **63.86%**. These are stages of one model calculation, not three observed
measurements.

For an incorrect response directly from the initial 22% assumption, the
evidence posterior is `11/323`, about **3.41%**. The learning transition adds
about **17.39 percentage points**, ending at about **20.79%**. With a sufficiently
large learning-transition probability, an incorrect response can even end above
the prior despite lowering the evidence posterior. The walkthrough separates
these contributions so that this behavior is visible.

### Edge assumptions and refusal

All four input fields require finite numeric probabilities in [0, 1].
A blank field is refused rather than interpreted as zero. The pure receiving
API additionally refuses non-boolean responses, sparse arrays, extra parameter
names, and histories beyond the response limit.

Some boundary assumptions give an observation zero probability. For example,
`guess = 0` and `slip = 1` make a correct response impossible in either state.
Conditioning on it would require `0 / 0`; the shipped model then returns
`NaN`. The walkthrough refuses that observation before adding it. If an edited
sequence or set of assumptions makes a later response impossible, the complete
previous applied trace remains intact and the error identifies the response
number. The same refusal covers a likelihood that underflows to zero at
JavaScript number precision.

When `guess + slip = 1`, the response does not distinguish the two states,
apart from floating-point rounding. The learning transition can still change
the estimate. When the sum is greater than 1, the assumed evidence is reversed:
a correct response favors the not-yet-known state. These are permitted
hypotheses, and the page explains their consequence instead of silently
changing their values.

The public `explainMasteryUpdate` accepts finite priors outside [0, 1] solely
to expose the shipped function's prior clipping. The page's initial field
requires [0, 1], and valid subsequent states stay within this interval.

## Keep the arithmetic

**Download this walkthrough (.txt)** saves the applied assumptions, each
response, both evidence weights, the posterior, learning contribution,
clipping change and actual model return. It recomputes a valid trace before
exporting and uses the full round-trippable JavaScript number representation.
The screen uses rounded values with approximate-equality signs. Tiny nonzero
probabilities use scientific notation, and interior probabilities very close
to one retain their digits instead of rounding to one. Summing rounded
screen values may differ slightly from the full-precision result.

The download is a readable explanation, not a learner archive or a restore
format. Nothing is stored automatically. Reloading returns to the illustrative
opening example.

## Scope and background

This walkthrough explains the local demo's arithmetic. Its percentages are
model states, not grades, diagnoses, calibrated probabilities for a person,
or evidence of learning efficacy. The defaults are not fitted to the learner
or their course. The code treats knowledge as two hidden states, includes
a learning transition, and has no forgetting term. It does not establish
understanding, retention or transfer.

The historical model is described by Albert T. Corbett and John R. Anderson,
[Knowledge tracing: Modeling the acquisition of procedural knowledge](https://doi.org/10.1007/BF01099821),
*User Modeling and User-Adapted Interaction* 4, 253–278 (1994).
That paper's findings do not validate this demo's parameters. The explanation
above is derived from the actual local source, rather than transferring
the paper's empirical results to this product.

## Build and focused receiving

```sh
python3 tools/make_model_walkthrough.py
python3 tools/make_model_walkthrough.py --check
node --test tests/model-walkthrough.test.mjs tests/knowledge.test.mjs
```

The small standalone builder follows the existing author-page convention. It
bundles the exact knowledge module, walkthrough module and UI, with no package
dependency. The UI waits for the DOM in both the modular and inline entry paths.
After changing the lesson's optional link, regenerate its standalone file with
the unchanged `python3 tools/make_demo.py`.

An optional real-browser receiver uses Node 22+ and an existing Chromium or
Chrome executable:

```sh
node tools/check_model_walkthrough_browser.mjs \
  --browser "/path/to/chrome" \
  --output "/new/private/receiving-directory"
```

Use `--entry modular` or `--entry standalone` to qualify just one entry after a
distinct receiving failure; the default checks both. Use `--focus formatting`
for the numeric display boundaries or `--focus hook` for the separate-tab lesson
link without repeating the broader flow.

It refuses an existing output directory. It uses a new browser profile and a
loopback-only server for the modular page, and opens the standalone through
`file://`. It exercises keyboard activation, native input/select editing,
atomic invalid/impossible refusals, endpoints, the response cap, undo,
actual download bytes, a 390-pixel layout, and the real lesson's separate-tab
link. It retains page errors, requests, source hashes, screenshots and
downloaded text. These are functional and arithmetic checks, not a
learner-outcome study.
