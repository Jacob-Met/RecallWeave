"""Actual unchanged-learner receiving phase; importing this module launches no browser."""
from pathlib import Path
import hashlib
import json
from playwright.sync_api import expect

def digest(raw):
    return hashlib.sha256(raw).hexdigest()

def receive_learner(page, demo_path, downloaded_course_path, derived_answers_path, output_path):
    """Caller owns an isolated browser/context and network guard. Uses only actual UI controls."""
    demo_path = Path(demo_path).resolve(strict=True)
    course_path = Path(downloaded_course_path).resolve(strict=True)
    answers_path = Path(derived_answers_path).resolve(strict=True)
    output = Path(output_path)
    output.mkdir(parents=True, exist_ok=False)
    course_raw, demo_raw = course_path.read_bytes(), demo_path.read_bytes()
    expected = json.loads(answers_path.read_text())
    assert digest(course_raw) == expected["courseSHA256"]
    demo_blob = hashlib.sha1(b"blob " + str(len(demo_raw)).encode() + b"\0" + demo_raw).hexdigest()
    assert demo_blob == "ef7bc3e27e7f161d917ced6a457fad8822802f3f", "Unexpected learner bytes"
    deck = json.loads(course_raw)
    answers = {item["id"]: item for item in expected["answers"]}
    assert len(deck["items"]) == len(answers) == 16
    assert all(item["answer"] == answers[item["id"]]["answer"] for item in deck["items"])
    prompts = {item["prompt"]: item for item in deck["items"]}
    assert len(prompts) == 16
    deliberate_miss = deck["items"][0]["id"]
    checks, observed = [], []
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.set_viewport_size({"width": 1365, "height": 1000})
    page.goto(demo_path.as_uri())
    expect(page.locator("#deck-file")).to_be_visible()
    old_progress = page.locator("#step-count").inner_text()
    page.locator("#deck-file").set_input_files(str(course_path))
    expect(page.locator("#deck-preview")).to_be_visible()
    expect(page.locator("#deck-preview-title")).to_have_text(deck["title"])
    expect(page.locator("#deck-preview .deck-questions ol li")).to_have_count(16)
    assert page.locator("#step-count").inner_text() == old_progress
    preview_toggle = page.locator("#deck-preview .deck-questions summary")
    preview_toggle.focus()
    preview_toggle.press("Enter")
    assert page.locator("#deck-preview .deck-questions ol li strong").all_text_contents() == list(prompts)
    page.screenshot(path=str(output / "import-preview-desktop.png"), full_page=True)
    checks.append("Actual downloaded course previews all16 exact prompts without starting or replacing the current session")
    page.locator("#start-deck").focus()
    page.locator("#start-deck").press("Enter")
    expect(page.locator("#lesson-description")).to_have_text(deck["title"])
    expect(page.locator("#step-count")).to_have_text("0 / 16")
    expect(page.locator(".question-card h2")).to_be_visible()
    checks.append("Explicit Start this deck begins the imported questions directly in the unchanged learner")
    seen = set()
    for index in range(16):
        heading = page.locator(".question-card h2")
        expect(heading).to_be_visible()
        prompt = heading.inner_text()
        assert prompt in prompts, "Learner displayed a question outside the downloaded course"
        item = prompts[prompt]
        assert item["id"] not in seen, "Question repeated before complete first pass"
        seen.add(item["id"])
        answer = answers[item["id"]]["answer"]
        choice = (answer + 1) % len(item["options"]) if item["id"] == deliberate_miss else answer
        button = page.locator('button[data-choice="' + str(choice) + '"]')
        assert item["options"][choice] in button.inner_text()
        button.focus()
        button.press("Enter")
        feedback = page.locator("#feedback-slot")
        expect(feedback).to_be_visible()
        text = feedback.inner_text()
        assert item["options"][choice] in text
        assert item["options"][answer] in text
        assert item["explanation"] in text
        assert item["transfer"] in text
        expect(page.locator(".choices button:not([disabled])")).to_have_count(0)
        expect(page.locator("#step-count")).to_have_text(str(index + 1) + " / 16")
        observed.append({"id": item["id"], "choice": choice, "correct": choice == answer, "prompt": prompt})
        page.locator("#next-button").focus()
        page.locator("#next-button").press("Enter")
    assert seen == set(answers)
    expect(page.locator(".review-item")).to_have_count(16)
    expect(page.locator("#first-try-summary")).to_contain_text("15 of 16")
    expect(page.locator(".review-status.needs-review")).to_have_count(1)
    assert page.locator(".review-prompt").all_text_contents() == [x["prompt"] for x in observed]
    checks.append("All16 original questions completed once with exact option/feedback identity, including one deliberate independent-answer miss")
    missed = next(item for item in deck["items"] if item["id"] == deliberate_miss)
    missed_index = next(i for i, item in enumerate(observed) if item["id"] == deliberate_miss)
    details = page.locator(".review-item").nth(missed_index)
    details.locator("summary").focus()
    details.locator("summary").press("Enter")
    item_note = "A rare conditioning value can increase entropy; the weighted average is constrained. <literal reflection>"
    application_note = "This authored finite table alone does not establish population or causal effects."
    note_selector = 'textarea[data-reflection-item="' + deliberate_miss + '"]'
    page.locator(note_selector).fill(item_note)
    page.locator("#application-reflection").fill(application_note)
    original_summary = page.locator("#first-try-summary").inner_text()
    expect(page.locator(".mastery-box output")).to_have_count(len(deck["concepts"]))
    original_estimates = page.locator(".mastery-box output").all_text_contents()
    page.screenshot(path=str(output / "full-review-desktop.png"), full_page=True)
    checks.append("Full learning trace exposes each answer/explanation and retains independently written item/application notes")
    page.locator("#practice-button").focus()
    page.locator("#practice-button").press("Enter")
    expect(page.locator(".practice-card h2")).to_have_text(missed["prompt"])
    retry = page.locator('button[data-practice-choice="' + str(answers[deliberate_miss]["answer"]) + '"]')
    assert missed["options"][answers[deliberate_miss]["answer"]] in retry.inner_text()
    retry.focus()
    retry.press("Enter")
    expect(page.locator("#practice-feedback")).to_contain_text("That connection holds on retry.")
    page.locator("#practice-next").focus()
    page.locator("#practice-next").press("Enter")
    expect(page.locator("#practice-status")).to_contain_text("1 of 1 correctly on retry")
    expect(page.locator("#first-try-summary")).to_have_text(original_summary)
    expect(page.locator(".review-status.needs-review")).to_have_count(1)
    assert page.locator(".mastery-box output").all_text_contents() == original_estimates
    assert page.locator(note_selector).input_value() == item_note
    assert page.locator("#application-reflection").input_value() == application_note
    checks.append("Only the missed item is practiced; original first-try result, displayed estimates and authored notes remain intact")
    page.set_viewport_size({"width": 390, "height": 844})
    assert page.evaluate("document.documentElement.scrollWidth <= innerWidth + 1"), "Learner page overflows390px"
    page.screenshot(path=str(output / "learning-trace-phone.png"), full_page=True)
    with page.expect_download() as downloaded:
        page.locator("#save-notes-button").focus()
        page.locator("#save-notes-button").press("Enter")
    download = downloaded.value
    name = download.suggested_filename
    assert name.startswith("recallweave-study-notes-") and name.endswith(".txt") and Path(name).name == name
    target = output / name
    assert not target.exists()
    download.save_as(str(target))
    notes = target.read_text()
    assert deck["title"] in notes and item_note in notes and application_note in notes
    for item in deck["items"]:
        assert item["prompt"] in notes
        assert item["explanation"] in notes
        assert item["transfer"] in notes
    assert "Practice answer:" in notes and "correct on retry" in notes
    assert "15 of 16 connections correct on the first try." in notes
    checks.append("Actual keyboard-triggered study-notes download retains all16 prompts/feedback, original reflections and separate practice result")
    assert errors == [], errors
    assert demo_path.read_bytes() == demo_raw and course_path.read_bytes() == course_raw
    receipt = {"schema": "recallweave.information-theory.peer-learner-browser.v1",
               "passed": True, "checks": checks, "sourceDemoSHA256": digest(demo_raw),
               "sourceDemoGitBlob": demo_blob, "downloadedCourseSHA256": digest(course_raw),
               "derivedAnswersSHA256": digest(answers_path.read_bytes()), "firstAnswers": observed,
               "deliberateMiss": deliberate_miss, "noteFile": name,
               "notesSHA256": digest(target.read_bytes()), "pageErrors": errors,
               "sourceBytesUnchanged": True,
               "scope": "Actual unchanged learner UI with a downloaded authored course and private browser; no source modification or provider operation."}
    print(json.dumps({"learnerPassed": True, "checks": len(checks), "answered": len(observed)}), flush=True)
    (output / "learner-receipt.json").write_text(json.dumps(receipt, indent=2) + "\n")
    return receipt
