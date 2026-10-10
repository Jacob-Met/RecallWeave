(() => {
  const search = document.querySelector('#course-search');
  const labs = document.querySelector('#labs-only');
  const cards = [...document.querySelectorAll('[data-course]')];
  const count = document.querySelector('#result-count');
  const empty = document.querySelector('#empty-results');
  function filter() {
    const query = search.value.trim().toLowerCase();
    let visible = 0;
    for (const card of cards) {
      card.hidden = !card.dataset.search.includes(query) || (labs.checked && card.dataset.lab !== 'true');
      if (!card.hidden) visible++;
    }
    count.textContent = `${visible} of ${cards.length} courses`;
    empty.hidden = visible !== 0;
  }
  search.addEventListener('input', filter);
  labs.addEventListener('change', filter);
  filter();
})();
