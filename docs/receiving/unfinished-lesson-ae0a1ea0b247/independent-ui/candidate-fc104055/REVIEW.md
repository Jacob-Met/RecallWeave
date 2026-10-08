# Independent UI/app receiving: correction required

Source: root's local frozen composition fc1040558227728ad7e3dc23d28764f030be802d,
tree 6cf44e66220840a14d5645cb08a94f683fa15297. UI blob
5061f0b3db22f5ff19c566492570f521e0612065; codec remains b55fc0dd514c105c69fdef4dd766c5dfc4cc2a84.

**Result: seven groups passed; native chooser-cancel lifetime failed.**
Chromium 153.0.8010.0 ran from 2026-10-08T12:14:13.968Z to
2026-10-08T12:14:19.022Z and closed normally. There were no browser errors.
All 14 pinned source files were verified unchanged after the run.

## Concrete defect

After a real saved file has produced a staged preview, opening the real file
input and canceling its native chooser leaves that preview visible and the Resume
action available. The recorded browser event has type cancel and isTrusted true.
The before/after preview visibility is true/true; status remains:

> Preview ready. Your current lesson stays as it is until you resume.

The active lesson itself was unchanged. The defect is the continued authority of
the canceled file-selection lifetime.

The test uses the installed CDP Page.setInterceptFileChooserDialog command with
enabled:true and cancel:true, followed by a real input click. Chromium originates
the trusted cancellation event. No DOM cancel event is synthesized, and this is
not a claim that a human pressed Escape in an external OS dialog.

The new UI handles change events and explicit preview cancellation, but lacks a
listener for the file input's separate cancel event. Its normal preview-clearing
path should invalidate both pending read generation and staged preview when that
event occurs. The corrected run must also release a previously completed native
File.text read after chooser cancellation and confirm it cannot stage a preview.

## Passing evidence

The modular question and standalone phone feedback round trips use actual native
lesson downloads, disk files, fresh browser contexts, previews and explicit Resume
clicks. Both finish by downloading the existing completed trace. Its first-answer
order and full-precision mastery exactly match an uninterrupted native session.
Every remaining question preserves the saved option permutation. Feedback resume
neither skips the next unanswered item nor double-applies its answer to the model.

A started-empty lesson crosses standalone to modular and records exactly its
first answer after resume. The Cancel button, altered-course refusal, older-file
completion after newer selection, real answering during a held read and Next
during a staged preview all preserve the expected current lesson.

The phone preview screenshot was visually inspected. New file/preview controls
fit within the 390-pixel viewport and the document has no horizontal overflow.

## Scope and preserved evidence

This is independent receiving of root's UI/app/builder contribution. The reviewer
authored the codec; its independent source/native acceptance belongs to production.

The unchanged driver is ../independent-lesson-ui.cjs relative to this directory.
The full receipt is independent-ui-receipt.json; source-after-failure.json verifies
post-run source identity. Nine native downloads and the derived synthetic
altered/held files are retained in downloads/. The screenshot is
standalone-phone-preview.png. The original failing packet must remain intact;
corrections are tested into another output directory.
