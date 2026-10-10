(() => {
  const search = document.querySelector('#course-search');
  const labs = document.querySelector('#labs-only');
  const cards = [...document.querySelectorAll('[data-course]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-results');
  const clear = document.querySelector('#clear-filters');
  const compact = document.querySelector('#compact-view');
  const directory = document.querySelector('#course-directory');
  function filter() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      card.hidden = !card.dataset.search.includes(query) || (labs.checked && card.dataset.lab !== 'true');
      if (!card.hidden) visible++;
    }
    count.textContent = `${visible} of ${cards.length} courses`;
    empty.hidden = visible !== 0;
    clear.disabled = !query && !labs.checked;
  }
  search.addEventListener('input', filter);
  labs.addEventListener('change', filter);
  clear.addEventListener('click', () => {
    search.value = '';
    labs.checked = false;
    filter();
    search.focus();
  });
  compact.addEventListener('click', () => {
    const enabled = compact.getAttribute('aria-pressed') !== 'true';
    compact.setAttribute('aria-pressed', String(enabled));
    directory.classList.toggle('course-grid--compact', enabled);
  });
  filter();
})();
