const STORAGE_KEY_CONTINUE = 'mirraapps_continue_games_v1';

let CATEGORY_CONFIG = [];

async function loadGames() {
  const response = await fetch('./games.json');

  if (!response.ok) {
    console.error('Failed to load games.json', response.status);
    return [];
  }

  try {
    return await response.json();
  } catch (e) {
    console.error('Invalid JSON in games.json', e);
    return [];
  }
}

async function loadCategoryConfig() {
  try {
    const response = await fetch('./categories.json');
    if (!response.ok) {
      console.error('Failed to load categories.json', response.status);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];
    return data;
  } catch (e) {
    console.error('Invalid categories.json', e);
    return [];
  }
}

function buildGameUrl(game) {
  const base = new URL(game.url, window.location.origin);
  if (game.defaultParams && typeof game.defaultParams === 'object') {
    Object.entries(game.defaultParams).forEach(([key, value]) => {
      base.searchParams.set(key, String(value));
    });
  }
  return base.toString();
}

function createGameCard(game, variant) {
  const card = document.createElement('button');
  card.type = 'button';
  card.className = `game-card game-card--${variant}`;

  const thumb = document.createElement('div');
  thumb.className = 'game-thumb';

  const img = document.createElement('img');
  img.className = 'game-thumb-img';
  img.src = game.icon || '';
  img.alt = game.title || game.id || 'Game';

  thumb.appendChild(img);

  const title = document.createElement('div');
  title.className = 'game-title';
  title.textContent = game.title || game.id || 'Game';

  card.appendChild(thumb);
  card.appendChild(title);

  card.addEventListener('click', () => {
    saveContinueGame(game);
    const url = buildGameUrl(game);
    window.location.href = url;
  });

  return card;
}

function groupByCategory(games) {
  const groups = {};
  games.forEach((game) => {
    const cat = game.category || 'other';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(game);
  });
  return groups;
}

function loadContinueGames(allGames) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTINUE);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    if (!Array.isArray(ids) || ids.length === 0) return [];
    return ids
      .map((id) => allGames.find((g) => g.id === id))
      .filter(Boolean);
  } catch (e) {
    return [];
  }
}

function saveContinueGame(game) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONTINUE);
    const ids = raw ? JSON.parse(raw) : [];
    const without = ids.filter((id) => id !== game.id);
    without.unshift(game.id);
    const limited = without.slice(0, 10);
    localStorage.setItem(STORAGE_KEY_CONTINUE, JSON.stringify(limited));
  } catch (e) {
  }
}

function renderSections(games) {
  const groups = groupByCategory(games);

  const featuredRow = document.getElementById('featured-row');
  const continueRow = document.getElementById('continue-row');
  const dynamicContainer = document.getElementById('dynamic-sections');

  if (!featuredRow || !continueRow || !dynamicContainer) return;

  featuredRow.innerHTML = '';
  continueRow.innerHTML = '';
  dynamicContainer.innerHTML = '';

  (groups.featured || games).forEach((game) => {
    const card = createGameCard(game, 'featured');
    featuredRow.appendChild(card);
  });

  const continueGames = loadContinueGames(games);
  (continueGames.length ? continueGames : games).slice(0, 10).forEach((game) => {
    const card = createGameCard(game, 'continue');
    continueRow.appendChild(card);
  });

  CATEGORY_CONFIG.forEach(({ id, title }) => {
    const list = groups[id];
    if (!Array.isArray(list) || list.length === 0) return;

    const section = document.createElement('section');
    section.className = 'section';

    const heading = document.createElement('h2');
    heading.className = 'section-title';
    heading.textContent = title;

    const row = document.createElement('div');
    row.className = 'game-row game-row--category';
    row.setAttribute('data-category', id);

    list.forEach((game) => {
      const card = createGameCard(game, 'category');
      row.appendChild(card);
    });

    section.appendChild(heading);
    section.appendChild(row);
    dynamicContainer.appendChild(section);
  });
}

function setupRowScrollControls() {
  const sections = document.querySelectorAll('.section');
  sections.forEach((section) => {
    const row = section.querySelector('.game-row, .featured-row');
    if (!row) return;

    const leftBtn = document.createElement('button');
    leftBtn.type = 'button';
    leftBtn.className = 'scroll-arrow scroll-arrow--left scroll-arrow--hidden';

    const rightBtn = document.createElement('button');
    rightBtn.type = 'button';
    rightBtn.className = 'scroll-arrow scroll-arrow--right scroll-arrow--hidden';

    const fadeLeft = document.createElement('div');
    fadeLeft.className = 'scroll-fade scroll-fade--left scroll-fade--hidden';

    const fadeRight = document.createElement('div');
    fadeRight.className = 'scroll-fade scroll-fade--right scroll-fade--hidden';

    section.appendChild(leftBtn);
    section.appendChild(rightBtn);
    section.appendChild(fadeLeft);
    section.appendChild(fadeRight);

    function updateState() {
      const maxScroll = row.scrollWidth - row.clientWidth;
      if (maxScroll <= 0) {
        leftBtn.classList.add('scroll-arrow--hidden');
        rightBtn.classList.add('scroll-arrow--hidden');
        fadeLeft.classList.add('scroll-fade--hidden');
        fadeRight.classList.add('scroll-fade--hidden');
        return;
      }

      const atStart = row.scrollLeft <= 1;
      const atEnd = row.scrollLeft >= maxScroll - 1;

      if (atStart) {
        leftBtn.classList.add('scroll-arrow--hidden');
        fadeLeft.classList.add('scroll-fade--hidden');
      } else {
        leftBtn.classList.remove('scroll-arrow--hidden');
        fadeLeft.classList.remove('scroll-fade--hidden');
      }

      if (atEnd) {
        rightBtn.classList.add('scroll-arrow--hidden');
        fadeRight.classList.add('scroll-fade--hidden');
      } else {
        rightBtn.classList.remove('scroll-arrow--hidden');
        fadeRight.classList.remove('scroll-fade--hidden');
      }
    }

    leftBtn.addEventListener('click', () => {
      row.scrollBy({ left: -row.clientWidth * 0.8, behavior: 'smooth' });
    });

    rightBtn.addEventListener('click', () => {
      row.scrollBy({ left: row.clientWidth * 0.8, behavior: 'smooth' });
    });

    row.addEventListener('scroll', updateState);
    window.addEventListener('resize', updateState);
    updateState();
  });
}

function setupSearch(games) {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const overlay = document.getElementById('search-overlay');
  const overlayInput = document.getElementById('search-input-overlay');
  const backButton = document.getElementById('search-back');
  const resultsContainer = document.getElementById('search-results');
  const searchBar = document.getElementById('search-bar');

  if (!searchInput || !searchButton || !overlay || !overlayInput || !backButton || !resultsContainer || !searchBar) return;

  function performSearch(query) {
    const q = query.trim().toLowerCase();
    resultsContainer.innerHTML = '';
    if (!q) return;

    const matched = games.filter((g) => (g.title || '').toLowerCase().includes(q));

    matched.forEach((game) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = 'search-result-item';

      const thumb = document.createElement('div');
      thumb.className = 'search-result-thumb';
      const img = document.createElement('img');
      img.src = game.icon || '';
      img.alt = game.title || game.id || 'Game';
      thumb.appendChild(img);

      const title = document.createElement('div');
      title.className = 'search-result-title';
      title.textContent = game.title || game.id || 'Game';

      row.appendChild(thumb);
      row.appendChild(title);

      row.addEventListener('click', () => {
        saveContinueGame(game);
        const url = buildGameUrl(game);
        window.location.href = url;
      });

      resultsContainer.appendChild(row);
    });
  }

  function isMobile() {
    return window.matchMedia('(max-width: 767px)').matches;
  }

  function openOverlay() {
    overlay.classList.add('search-overlay--visible');
    if (isMobile()) {
      overlayInput.value = searchInput.value;
      overlayInput.focus();
      performSearch(overlayInput.value || '');
    } else {
      const rect = searchBar.getBoundingClientRect();
      overlay.style.left = `${rect.left}px`;
      overlay.style.width = `${rect.width}px`;
      overlay.style.right = 'auto';
      overlay.style.top = `${rect.bottom + 6 + window.scrollY}px`;
      performSearch(searchInput.value || '');
    }
  }

  function closeOverlay() {
    overlay.classList.remove('search-overlay--visible');
  }

  searchButton.addEventListener('click', () => {
    if (!isMobile() && overlay.classList.contains('search-overlay--visible')) {
      closeOverlay();
    } else {
      openOverlay();
    }
  });

  searchInput.addEventListener('input', () => {
    if (isMobile()) return;
    const value = searchInput.value || '';

    if (!overlay.classList.contains('search-overlay--visible')) {
      if (value.trim() === '') return;
      openOverlay();
    } else {
      performSearch(value);
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      openOverlay();
    }
  });

  overlayInput.addEventListener('input', (e) => {
    if (isMobile()) {
      performSearch(e.target.value || '');
    }
  });

  backButton.addEventListener('click', () => {
    closeOverlay();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeOverlay();
    }
  });

  document.addEventListener('click', (e) => {
    if (isMobile()) return;
    if (!overlay.classList.contains('search-overlay--visible')) return;
    if (!overlay.contains(e.target) && e.target !== searchInput && e.target !== searchButton) {
      closeOverlay();
    }
  });
}

function setupThemeToggle() {
  const root = document.getElementById('app-root');
  const toggle = document.getElementById('theme-toggle');
  if (!root || !toggle) return;

  toggle.addEventListener('click', () => {
    const isDark = root.classList.contains('app--theme-dark');
    root.classList.toggle('app--theme-dark', !isDark);
    root.classList.toggle('app--theme-light', isDark);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const [games, categories] = await Promise.all([
    loadGames(),
    loadCategoryConfig()
  ]);

  if (!Array.isArray(games) || games.length === 0) {
    return;
  }

  if (Array.isArray(categories)) {
    CATEGORY_CONFIG = categories;
  }

  renderSections(games);
  setupRowScrollControls();
  setupSearch(games);
  setupThemeToggle();
});