  // Independent assertions; the outer CDP transport is reused unchanged from
  // the candidate's check_browser.mjs at SHA256 c86c6fe64d3650ab4602f26a0f4bb9346bd7b375f57f55bc139d90ef707e212f.
  report.reviewer = 'memory_capability';
  report.transportSha256 = 'c86c6fe64d3650ab4602f26a0f4bb9346bd7b375f57f55bc139d90ef707e212f';
  report.transportChange = 'Only startup allowance raised from 16s to 45s after retained pre-application startup timeout';
  report.rawSnapshots = [];

  const exactOriginal = () => evaluate(`({mastery, answers, asked: [...asked], review})`);
  const exactRound = () => evaluate(`({answers: practice?.answers ?? [], count: practice?.answers.length ?? 0,
    allFrozen: !!practice && Object.isFrozen(practice) && Object.isFrozen(practice.items)
      && Object.isFrozen(practice.answers) && practice.answers.every(Object.isFrozen)})`);
  async function assertOriginal(expected, label) {
    const actual = await exactOriginal();
    assert.deepEqual(actual, expected, label);
    report.rawSnapshots.push({label, stateSha256: createHash('sha256').update(JSON.stringify(actual)).digest('hex')});
  }
  async function space() {
    for (const type of ['keyDown', 'keyUp']) await command('Input.dispatchKeyEvent', {
      type, key: ' ', code: 'Space', windowsVirtualKeyCode: 32, nativeVirtualKeyCode: 32,
      ...(type === 'keyDown' ? {text: ' ', unmodifiedText: ' '} : {})
    });
  }
  async function physicalDoubleClick(selector) {
    const {x, y} = await evaluate(`(() => {
      const control = document.querySelector(${JSON.stringify(selector)});
      control.scrollIntoView({block: 'center'});
      const r = control.getBoundingClientRect();
      return {x: r.x + r.width / 2, y: r.y + r.height / 2};
    })()`);
    for (const clickCount of [1, 2]) {
      await command('Input.dispatchMouseEvent', {type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount});
      await command('Input.dispatchMouseEvent', {type: 'mouseReleased', x, y, button: 'left', buttons: 0, clickCount});
      if (clickCount === 1) assert.equal(await evaluate('document.activeElement.id'), 'practice-next', 'Submitting one answer moves focus to the next action');
    }
  }
  async function resetByControl() {
    await activate('#reset-button');
    await waitFor(() => evaluate(`document.readyState === 'complete' && !!document.querySelector('#start-button')`), 'actual reset reload');
    assert.equal(await evaluate(`document.querySelectorAll('.review-item').length`), 0);
    assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')`), '0');
  }

  // The direct-open build exposes its original lexical bindings. Read them
  // without assignments to compare the full precision state, beyond rounded UI.
  await command('Network.setBlockedURLs', {urls: ['http://*', 'https://*']});
  await navigate(pathToFileURL(join(project, 'demo.html')).href, 390, 844);
  const welcomeOriginal = await exactOriginal();
  await activate('#simulation-button');
  await assertOriginal(welcomeOriginal, 'welcome simulation leaves exact learner state intact');
  assert.equal(await evaluate('practice'), null);
  passed('the welcome-screen simulation does not alter learner or retry state');
  const direct = await lesson('missed');
  assert.equal(direct.state.reviewCount, deck.items.length, 'Every first answer must have an accessible review panel');
  assert.equal(direct.state.overflow, false);
  const original = await exactOriginal();
  assert.equal(original.answers.length, 6);
  assert.ok(original.answers.every(answer => answer.correct === false));
  const expectedMastery = initialMastery(deck.concepts);
  for (const answer of direct.firstAnswers) expectedMastery[answer.item.concept] = updateMastery(expectedMastery[answer.item.concept], answer.correct);
  assert.deepEqual(original.mastery, expectedMastery, 'First session retains exact native model values');
  assert.equal(await evaluate(`answers.every(Object.isFrozen) && Object.isFrozen(review)
    && review.every(row => Object.isFrozen(row) && Object.isFrozen(row.options))`), true);
  report.firstSession = {original, displayed: direct.state};
  passed('direct-open all-missed session retains exact native model and immutable review snapshots');

  await evaluate(`document.querySelector('.review-item summary').focus()`);
  await space();
  assert.equal(await evaluate(`document.querySelector('.review-item').open`), true, 'Space opens the native disclosure');
  const ax = await command('Accessibility.getFullAXTree');
  const disclosures = ax.nodes.filter(node => node.role?.value === 'DisclosureTriangle' && node.name?.value.includes('first try'));
  assert.equal(disclosures.length, 6, 'Every review disclosure appears in the accessibility tree');
  assert.equal(disclosures[0].properties.find(property => property.name === 'expanded').value.value, true);
  assert.ok(disclosures.every(node => node.name.value.includes('Needs review')));
  report.accessibility = disclosures.map(node => ({role: node.role.value, name: node.name.value,
    expanded: node.properties.find(property => property.name === 'expanded').value.value}));
  await space();
  assert.equal(await evaluate(`document.querySelector('.review-item').open`), false);
  passed('Space toggles review disclosures with expanded state and first-try labels in the accessibility tree');

  await activate('#practice-button');
  const missed = direct.firstAnswers;

  for (let index = 0; index < missed.length; index++) {
    assert.equal(await evaluate(`document.querySelector('.practice-card h2').textContent`), missed[index].item.prompt);
    const wrongChoice = (missed[index].item.answer + 2) % missed[index].item.options.length;
    await physicalDoubleClick(`[data-practice-choice="${wrongChoice}"]`);
    const round = await exactRound();
    assert.equal(round.count, index + 1, 'Rapid repeated physical clicks record one retry per question');
    assert.equal(round.allFrozen, true);
    assert.equal(round.answers[index].item, missed[index].item.id);
    assert.equal(round.answers[index].choice, wrongChoice);
    assert.equal(round.answers[index].correct, false);
    assert.equal(await evaluate(`document.querySelector('[role="progressbar"]').getAttribute('aria-valuenow')`), String(index + 1));
    await assertOriginal(original, `wrong retry ${index + 1} preserves exact original state`);
    if (index === missed.length - 1) await activate('#back-to-review');
    else await activate('#practice-next');
  }
  await assertOriginal(original, 'completion through Back preserves exact original state');
  const completed = await snapshot();
  assert.equal(completed.score, direct.state.score);
  assert.deepEqual(completed.estimates, direct.state.estimates);
  assert.equal(completed.focus, 'H2');
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /0 of 6 correctly on retry/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 6);
  assert.equal(await evaluate(`document.querySelectorAll('.review-status.needs-review').length`), 6);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer strong').length`), 6);
  report.completedRound = await exactRound();
  passed('six wrong retries remain separate, duplicate clicks are ignored, and Back from last feedback completes the bounded round');
  await activate('.review-item summary');
  assert.equal(await evaluate(`document.documentElement.scrollWidth > innerWidth`), false);
  await screenshot('independent-direct-review-mobile.png', '.review-item');

  await resetByControl();
  const fresh = await exactOriginal();
  assert.deepEqual(fresh.mastery, initialMastery(deck.concepts));
  assert.deepEqual(fresh.answers, []);
  assert.deepEqual(fresh.asked, []);
  assert.equal(fresh.review, null);
  assert.equal(await evaluate('practice'), null);
  assert.equal(await evaluate('inPractice'), false);
  const afterReset = await lesson('correct');
  assert.match(afterReset.state.score, /6 of 6 connections on the first try/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 0);
  assert.equal(await evaluate(`!!document.querySelector('#practice-button')`), false);
  assert.equal(await evaluate('practice'), null);
  assert.ok(pageRequests.every(url => url.startsWith('file:')), 'The direct build never attempts a hosted request with HTTP(S) blocked');
  report.directRequests = [...pageRequests];
  report.directStorage = await evaluate('({local: localStorage.length, session: sessionStorage.length})');
  assert.deepEqual(report.directStorage, {local: 0, session: 0});
  passed('the actual direct-file reset clears both rounds and mastery; a new session has no stale retry data or hosted dependency');

  await command('Network.setBlockedURLs', {urls: []});
  await navigate(`${base}/index.html`);
  const modular = await lesson('mixed');
  const originalMarkup = await evaluate(`document.querySelector('#first-try-summary').textContent`);
  const originalAnswers = await evaluate(`[...document.querySelectorAll('.review-answers')].map(node => node.textContent)`);
  await activate('#practice-button');
  const firstMiss = modular.firstAnswers.find(answer => !answer.correct);
  await activate(`[data-practice-choice="${firstMiss.item.answer}"]`);
  await activate('#back-to-review');
  assert.equal(await evaluate(`document.querySelector('#first-try-summary').textContent`), originalMarkup);
  assert.deepEqual(await evaluate(`[...document.querySelectorAll('.review-answers')].map(node => node.textContent)`), originalAnswers);
  assert.deepEqual((await snapshot()).estimates, modular.state.estimates);
  assert.match(await evaluate(`document.querySelector('#practice-status').textContent`), /1 of 3 answered/);
  await resetByControl();
  const modularFresh = await lesson('correct');
  assert.match(modularFresh.state.score, /6 of 6 connections on the first try/);
  assert.equal(await evaluate(`document.querySelectorAll('.review-practice-answer').length`), 0);
  assert.deepEqual(modularFresh.state.estimates, afterReset.state.estimates);
  assert.ok(pageRequests.every(url => url.startsWith(base)), 'Modular build requests only its loopback origin');
  report.modularRequests = [...pageRequests];
  passed('modular first-answer markup and mastery survive practice; the real reset discards a paused round and matches direct-file fresh results');
  assert.deepEqual(pageErrors, []);
  passed('all independently exercised browser paths complete without JavaScript exceptions');
  report.status = 'passed';
