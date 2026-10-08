# Receive current author drafts and measurement lab

Initial importer PR head: `6a98243456cc9ef579b2b649c918f0e649a7f9ee`.
Incoming main: `d22b5ef7c641fc1726ae5b774383f8e6527d73e7`, tree `5dfe46795450c2d59da9875d2fb8d49768040a4c`.

Main added the course studio's explicit editable draft format and safe reopening, plus a separate measurement-uncertainty course and interactive lab. The only source overlap with the importer was README's studio instructions. The receiving composition preserves current **Open draft or deck**, **Save draft** and **Download checked deck** controls, then tells the learner to import the checked course; an editable draft must first be repaired and exported as a checked lesson.

All incoming runtime and test blobs were read at the exact main SHA and independently verified by Git blob ID on native write. All 16 learner/validator/model/trace/notes/shuffle/builder/UI/bundled-data paths listed in the receipt remained byte-identical to the browser-qualified a1ec composition. The source and evidence tree is built on the actual incoming main tree, with a real merge commit whose parents are the prior PR head and that main commit.

The 53-file native composition passed **111 Node tests**, zero failures or skips, and `python3 tools/make_author.py --check`. All 53 source hashes stayed unchanged during qualification. No browser rerun was needed for unchanged learner executable and standalone bytes; previous browser results remain pinned to their recorded bytes. No author or measurement implementation was modified.

- [Exact receiving manifest](receiving-d22b5ef-source.json)
- [Native receipt](receiving-d22b5ef.json)
- [Complete current unit log](receiving-d22b5ef-unit.log)
- [Author standalone parity](receiving-d22b5ef-author-parity.log)

The README-only conflict and its earlier-app trace compatibility wording were reviewed directly. This receiving step does not broaden the source integration into deployment or live learner state.
