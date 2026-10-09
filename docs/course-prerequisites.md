# Review a course’s prerequisites

Open **prerequisites.html** directly in a browser, or serve the repository and open **prerequisites/index.html**. Choose a saved RecallWeave course JSON file, no larger than 256 KiB. The page uses the existing lesson validator and reads the file locally. It never edits the course, uploads it, or saves browser state automatically.

The overview preserves the original concept order. Each visible “Source concept N” number identifies that exact source entry, so names that differ only in whitespace remain distinguishable. Select a concept to see:

- **Direct prerequisites:** links declared by any question for the selected concept. Expand a witness list to read every original question that names that prerequisite.
- **All requirements:** the distinct concepts reached by one or more prerequisite links. This includes direct requirements.
- **Direct dependents** and **all dependents:** the same relationships in reverse, identifying other concepts that refer to the selected concept.
- **Chains:** one shortest path for each relationship, with original question witnesses for every step. Equal-length paths use source concept order. Each step reads “requires”; it does not add a new direct link.
- **Original questions:** the selected concept’s prompts, original question numbers and IDs, and each question’s authored prerequisite order.

Structural depth is the longest declared prerequisite chain ending at a concept, with depth zero for a concept that declares no prerequisites. It is not elapsed time, a recommended teaching sequence, or a judgment about learner mastery. The review describes the course author’s declarations.

Attribution and license remain exact. The provenance panel shows the literal filename, captured byte count and SHA-256 of the bytes read. This hash identifies those bytes; it does not authenticate their author.

**Download review JSON** saves the current selection and complete review, including source provenance, concept relationships, paths and original question prompts. This is a review report, not a lesson or draft file. It omits answer choices, correct answers, explanations and transfer questions. Consider whether the prompts may be shared before sending the report.

Choosing another file pauses the review controls until that read completes. A refused replacement preserves the previous admitted review and clearly identifies it as the file still being shown. Cancelling the chooser leaves the review unchanged. **Clear review** removes it and retires any pending read. A download preparation error leaves the current review available for another attempt.

## Development

Use Node 20 or newer. No package installation is required for the core or bundle tests.

Run the focused tests:

~~~sh
node --test tests/course-prerequisites.test.mjs tests/course-prerequisites-bundle.test.mjs
~~~

Rebuild the standalone page after changing its template, styles, modules or shared imports:

~~~sh
node tools/build-course-prerequisites.mjs
node tools/build-course-prerequisites.mjs --check
~~~

The core API is inspectCoursePrerequisites(text, selectedConceptIndex = 0) from src/course-prerequisites.mjs. It uses the unchanged parseDeck and planCourseFocus modules and returns a deeply frozen JSON-safe projection. All report indices are zero-based; the page displays source ordinals starting at one. No existing author, learner, importer, catalog or focus flow is modified.
