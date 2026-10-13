# Keep an active learning session open

The learner asks the browser to confirm refresh or navigation while this tab contains answers, practice answers, or any learner-written explanation. Choose the browser's **Cancel** or **Stay** action to keep working. The current question, answer ordering, first-session estimates, practice progress and writing remain in the same tab.

An untouched session does not request a prompt. Opening a question without answering does not request one either. Starting a fresh local session or explicitly starting another deck still performs the existing reset; the empty session then has no active records to protect.

## Keep a file for another visit

The existing save controls retain their existing meanings:

- **Save lesson (.json)** keeps an unfinished lesson's answers, answer ordering and current question or feedback.
- The completed learning-trace control keeps first answers and separate practice progress.
- **Download study notes (.txt)** keeps a readable copy of answers, explanations, learner writing and practice answers.

Requesting, completing or failing a download does not remove active answers or writing from the tab, so it does not remove the leave prompt. A page cannot establish that a browser or person kept a file. Save a record, check the downloaded file, then choose whether to leave.

Opening and previewing an archive leaves the current session in place. Its existing explicit resume/restore action determines the new answers and practice state. The unfinished-lesson flow deliberately retains writing already in the tab, even when the reopened lesson has zero answers; that writing still requests protection. Spaces and line breaks count as writing and are not trimmed.

## Browser limits

The browser controls whether it displays a prompt, and supplies its own wording. Normal user interaction is required. A stopped process, some mobile transitions or other browser decisions may omit it. This is no automatic save or later-session recovery mechanism; use the explicit files for that purpose.

## Source and receiving

The common learner progress update derives the handler from actual records. Writing input events refresh it immediately. The same stable event handler is registered only while records exist and is removed when none remain. The learner's model, course data, answer order and archive codecs are unchanged.

Rebuild the ordinary direct-open learner and its existing offline course pack after a source edit:

```sh
python3 tools/make_demo.py
python3 tools/build-offline-pack.py
python3 tools/build-offline-pack.py --check
```

The focused browser course uses Node 22 or newer and an already available Chrome/Chromium executable. It creates a new evidence directory and browser profile, serves the modular learner only on loopback, opens the generated standalone file separately, and records actual browser dialogs and downloads. It does not install a browser or edit the offered source:

```sh
CHROME_PATH=/absolute/path/to/chrome node tools/check_learner_leave_browser.cjs /absolute/path/to/RecallWeave /new/evidence-directory
```

On Windows PowerShell, set the existing executable explicitly before the same Node command:

```powershell
$env:CHROME_PATH = "C:\Program Files\Google\Chrome\Application\chrome.exe"
node tools/check_learner_leave_browser.cjs C:\path\to\RecallWeave C:\path\to\new-receiving
```

The two older browser receivers explicitly accept the leave prompt only when their own course deliberately replaces the current document. An unexpected prompt outside that operation remains a receiving failure.

This is a finite automated authored-input course, separate from human playtesting, accessibility technology evaluation and learning-efficacy claims.

