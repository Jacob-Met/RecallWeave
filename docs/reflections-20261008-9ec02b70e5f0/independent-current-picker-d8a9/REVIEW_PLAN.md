# Independent receiving of course selection and session reflections

The new receiving target composes RecallWeave's reflection feature with the
landed local-course picker at `d8a9ff81e8e5290e8daad5b4af957d4eddc0ee74`.
Root owns that composition. This packet contains independent browser checks;
it changes no application, picker, validator, author or trace implementation.

The prior completed six-scenario packet under `recallweave-5ce-review` remains
frozen. Its driver is preserved byte for byte except for two inserted blocks:
separate course helpers and five scenarios appended after the original six.
`receiver-provenance.json` records that exact derivation. The failed earlier
4775 browser attempts remain historical transport failures, separately labeled.

## Receiving scenarios

1. Preserve all six existing trace/notes scenarios: real source trace export;
   preview and cancel; confirmation after destination note edits; wrong-course
   same-ID refusal; paused practice resume; fresh reset and other-tab isolation.
2. Reject malformed course JSON and cancel a valid native file preview. Keep
   current first answers and notes, including edits entered after preview.
   Download and compare actual notes files at those boundaries.
3. Explicitly start a valid three-question course that reuses three bundled
   question IDs but has distinct concepts, prompts and canonical choices.
   Confirm fresh answers and empty writing, stale old trace invalidation,
   full-course trace refusal, and exact imported paragraphs in actual notes.
4. Write imported-course notes and complete separate practice. Cancel the
   bundled-course preview and compare actual exported notes. Download the
   imported answer archive and verify it contains no notebook.
5. Start a fresh session on the imported course, verify cleared writing,
   answers and practice, then restore its actual saved trace after new writing.
   Keep the new notebook while reconstructing the original canonical answers,
   practice and full-precision estimates.
6. Explicitly return to the bundled lesson. Reused IDs must have empty notes;
   the bundled Apply-it prompt must return. Preserve the untouched modular
   source tab and original selected files throughout.

Both the rendered imported Apply-it prompt and the prompt in the downloaded
notes must match the landed generic connection question. The energy-specific
bundled prompt must be absent from the imported notes. No learning efficacy or
live deployed behavior is claimed.

## Native receiving and evidence

Use one disposable native Chromium profile. The existing driver controls the
actual page with native keyboard events and DOM file-input uploads; it does
not replace app state, event handlers or File reads. The modular source runs
on loopback. The receiving standalone target has HTTP(S) blocked and operates
on the generated `demo.html` file. Save real UTF-8 notes and JSON trace files,
all native action acknowledgements and read-only failure diagnostics.

Expected complete result: eleven checkpoints, fifteen actual study-note files,
four actual answer-trace files, and no page exceptions. Frozen source pins
must include the prior thirteen runtime/build paths plus `src/deck.mjs` and
`src/deck-picker.mjs`, and match both before and after browser execution.

## Preparation status

The independently authored receiver passes `node --check`. Browser execution
is pending the root's final source pins and viable temporary filesystem space.
An initial attempt to write the added scenario draft failed without a reported
errno and left a zero-byte unfrozen file. `draft-write-failure.json` preserves
the actual error and contemporaneous capacity observation; no browser or
product assertion had run at that point. A verified archived duplicate was
later removed only from this worker's own scope to recover limited headroom.

The final result and limitations will be recorded separately after the bounded
receiving run. Preparation is not a passing product qualification.
