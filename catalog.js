const STORAGE_KEY_CONTINUE = 'mirraapps_continue_games_v1';

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
  const categoryRows = document.querySelectorAll('.game-row--category');

  if (!featuredRow || !continueRow) return;

  featuredRow.innerHTML = '';
  continueRow.innerHTML = '';

  (groups.featured || games).forEach((game) => {
    const card = createGameCard(game, 'featured');
    featuredRow.appendChild(card);
  });

  const continueGames = loadContinueGames(games);
  (continueGames.length ? continueGames : games).slice(0, 10).forEach((game) => {
    const card = createGameCard(game, 'continue');
    continueRow.appendChild(card);
  });

  categoryRows.forEach((row) => {
    const cat = row.getAttribute('data-category');
    row.innerHTML = '';
    (groups[cat] || []).forEach((game) => {
      const card = createGameCard(game, 'category');
      row.appendChild(card);
    });
  });
}

function setupSearch(games) {
  const searchInput = document.getElementById('search-input');
  const searchButton = document.getElementById('search-button');
  const overlay = document.getElementById('search-overlay');
  const overlayInput = document.getElementById('search-input-overlay');
  const backButton = document.getElementById('search-back');
  const resultsContainer = document.getElementById('search-results');

  if (!searchInput || !searchButton || !overlay || !overlayInput || !backButton || !resultsContainer) return;

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

  function openOverlay() {
    overlay.classList.add('search-overlay--visible');
    overlayInput.value = searchInput.value;
    overlayInput.focus();
    performSearch(overlayInput.value);
  }

  function closeOverlay() {
    overlay.classList.remove('search-overlay--visible');
  }

  searchButton.addEventListener('click', () => {
    if (window.matchMedia('(max-width: 767px)').matches) {
      openOverlay();
    } else {
      performSearch(searchInput.value || '');
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (window.matchMedia('(max-width: 767px)').matches) {
        openOverlay();
      } else {
        performSearch(searchInput.value || '');
      }
    }
  });

  overlayInput.addEventListener('input', (e) => {
    performSearch(e.target.value || '');
  });

  backButton.addEventListener('click', () => {
    closeOverlay();
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
  const games = await loadGames();
  if (!Array.isArray(games) || games.length === 0) {
    return;
  }

  renderSections(games);
  setupSearch(games);
  setupThemeToggle();
});