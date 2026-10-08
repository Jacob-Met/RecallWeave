# Course handout receiving — 7879c2abc07f

**Disposition:** the production source and actual automated native receiving passed. Direct inspection of the generated print/PDF artifacts remains pending. This packet claims neither integration nor deployment.

This branch is an evidence-only child of the exact candidate `611d341b562475610dc9bf598b1e0b5790d431d6`. The candidate's complete 389-leaf source tree is retained. It does not move PR38's source branch or add a new execution workflow.

## Product and independent source review

[PR38](https://github.com/Jacob-Met/RecallWeave/pull/38) implements [issue35](https://github.com/Jacob-Met/RecallWeave/issues/35): choose a checked local deck, review the title and credit, explicitly use it, then print or save a student worksheet and a separately labeled answer key. Both retain authored wording, original question/option order, attribution and permission. The worksheet document's explicit data projection omits answer indices and explanations; no private explanation merely hides in its HTML. The teacher builder intentionally reads the complete checked deck. Transfer prompts remain open responses because the deck supplies no separate transfer answers.

I independently read the complete model/renderer, UI, template, stylesheet, standalone builder, thirteen new model/builder tests, receiver and workflow. Exact strings enter the DOM through textContent; embedded JSON escapes HTML delimiters. The request-version gate protects accepted work from obsolete reads. Invalid, oversized and cancelled selections preserve the accepted deck. Each print/save control fixes its own document kind. No blocking scoped source defect was found.

The native current base was `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3`, actual tree `fec13a2ab7d1a5da29689664281a4af182d137a8`. The complete candidate preserves every one of 377 unrelated base leaves, modifies only README by one exactly reversible additive section, adds eleven files and removes none. The complete tree has no AGENTS.md, CONTRIBUTING or CODEOWNERS. Existing importer, authoring, learning-session, reflection, archive and optional-course owners retain their source and scope.

## Actual final execution

Both final jobs checked out `31f8beb557e9997566ef8eddbbe3350060013738`, whose parents are current base `9b69c9c1dcc578d45e58d9b7f78eecb0613d76f3` and candidate `611d341b562475610dc9bf598b1e0b5790d431d6`. Its actual tree is exactly `c2206293c7f816ba92d032542f17857c4b351a85`.

- [Maintained native run37782741594](https://github.com/Jacob-Met/RecallWeave/actions/runs/37782741594), job113329679619: **134 tests passed, zero failed or skipped**, including all thirteen new handout model/builder cases. Both real Python standalone-builder checks passed. These unit tests call native producer/model functions; they do not by themselves prove a browser download.
- [Independent browser run37782741581](https://github.com/Jacob-Met/RecallWeave/actions/runs/37782741581), job113329680288: **13 groups passed, 18 registered output artifacts, source_unchanged=true**, using cached Node22.23.3 and installed Chrome154.0.8037.97. The consumer actually typed its independent fixture into the current Deck studio, moved a selected option, received the real JSON download and checked frozen B/A/F answers, including the six-option boundary. It used the real chooser and explicit Use controls, preserved accepted work through refusals and obsolete reads, downloaded separately projected HTML files and reopened them offline at 1280px and 390px. Actual native print requests generated six bounded Chrome PDFs; the direct-open builder parity step passed.

I directly received the complete decoded logs and bound the logged checkout to the native commit/tree objects. The original log bytes are retained beside this README, with their UTF-8 byte counts and SHA-256 values in receipt.json. The independent receiver's [native comment6060733772](https://github.com/Jacob-Met/RecallWeave/pull/38#issuecomment-6060733772) accepts these actual automated gates with the same artifact limitations.

## Preserved failure and correction

The first real browser run [37782344220](https://github.com/Jacob-Met/RecallWeave/actions/runs/37782344220), job113328314702, executed the same production code at candidate `d7e570e7c92c9d6896549958a2dd907258c6f5e2`. Actual checkout `9ad531d2ec69bc7069ae25e1e051dc0d94c1e9b1` had tree `237e97ddf9152708e4c5e8111c20599cdebb553e`. Six real consumer groups passed and the first worksheet PDF was generated before a receiver screenshot failed: `.handout-question:last-child` matched no element because a footer follows the questions.

The correction selected the last actual question before the two affected screenshots. Exact full-tree comparison proves that all 388 other leaves and all product, fixture and assertion inputs remained unchanged. The failed run, raw log and original artifact11551719524 are retained. The earlier runner e7b4d272 was an unexecuted draft; six DOM-assumption corrections before the first run are recorded separately and are not represented as native failures or production repairs.

## Print artifacts still requiring direct receipt

The final native artifact is [11552533138](https://github.com/Jacob-Met/RecallWeave/actions/runs/37782741581/artifacts/11552533138), 1,136,852 bytes, ZIP SHA-256 `663296538db41e68ec653f79ac89c7993f6c03c87086d89eab1066a5df2381a6`, expiring 2026-10-22T13:14:32Z. The failed artifact is 307,252 bytes, ZIP SHA-256 `ead583a2b44beabd694f88f5c80ddd775956b031a35e5f825b8e7f6469457b7e`.

The artifact connector successfully returned native Files references. That does not mean the ZIP bytes were read. The available signed-URL probe returned HTTP403, and a file-ID-scoped native Library read/search did not resolve an artifact ZIP. The actual workspace overlay was full; no local/Mac runtime or artifact writes were attempted under the storage floors. No alternate host route, CI source-write right or installation was introduced.

The hosted image did not have pdftotext, so the explicit optional PDF-text gate reports unavailable. **No PDF-text, rendered-pixel or operating-system-printer acceptance is claimed.** Receive the exact final ZIP through an authorized file reader, verify its digest and individual output custody, and inspect the actual worksheet/key PDFs and representative print/desktop/mobile images before closing the print/artifact receiving boundary. Browser DOM exactness, no-overflow checks and PDF generation are useful separate evidence; they do not replace that direct inspection.
