'use strict';

document.querySelectorAll('[data-resource-filter]').forEach((form) => {
  const input = form.querySelector('input[type="search"]');
  const count = form.querySelector('.resource-search-count');
  const tabs = Array.from(form.querySelectorAll('[data-filter]'));
  const body = form.closest('.article-body');
  const cards = body ? Array.from(body.querySelectorAll('.article-related-card')) : [];
  let activeFilter = 'all';

  function normalize(value) {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function cardCategory(card) {
    const label = normalize(card.querySelector('span')?.textContent || '');
    const text = normalize(card.textContent || '');
    if (label.includes('cas d usage') || text.includes('cas d usage')) return 'cas';
    if (label.includes('comparatif')) return 'comparatif';
    if (label.includes('sectoriel')) return 'sectoriel';
    if (label.includes('conformite') || text.includes('rgpd') || text.includes('securite')) return 'conformite';
    if (label.includes('guide') || label.includes('tarifs') || label.includes('formation')) return 'guide';
    return 'all';
  }

  function applyFilter() {
    const query = normalize(input?.value.trim() || '');
    let visible = 0;

    cards.forEach((card) => {
      const text = normalize(card.textContent || '');
      const category = cardCategory(card);
      const matchesQuery = !query || text.includes(query);
      const matchesFilter = activeFilter === 'all' || category === activeFilter;
      const show = matchesQuery && matchesFilter;
      card.hidden = !show;
      if (show) visible += 1;
    });

    body?.querySelectorAll('.article-related-grid').forEach((grid) => {
      const hasVisibleCard = Array.from(grid.querySelectorAll('.article-related-card'))
        .some((card) => !card.hidden);
      grid.hidden = !hasVisibleCard;

      const previous = grid.previousElementSibling;
      if (previous?.tagName === 'P') {
        previous.hidden = !hasVisibleCard;
        if (previous.previousElementSibling?.tagName === 'H2') {
          previous.previousElementSibling.hidden = !hasVisibleCard;
        }
      } else if (previous?.tagName === 'H2') {
        previous.hidden = !hasVisibleCard;
      }
    });

    if (count) {
      count.textContent = visible === cards.length
        ? `${visible} ressources disponibles`
        : `${visible} ressource${visible > 1 ? 's' : ''} trouvée${visible > 1 ? 's' : ''}`;
    }
  }

  const params = new URLSearchParams(window.location.search);
  const initialQuery = params.get('q');
  if (input && initialQuery) input.value = initialQuery;

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    applyFilter();
    const url = new URL(window.location.href);
    const value = input?.value.trim() || '';
    if (value) url.searchParams.set('q', value);
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', url);
  });

  input?.addEventListener('input', applyFilter);
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      activeFilter = tab.dataset.filter || 'all';
      tabs.forEach((item) => item.setAttribute('aria-pressed', String(item === tab)));
      applyFilter();
    });
  });

  applyFilter();
});
