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

function renderCatalog(games) {
  const container = document.getElementById('games-list');
  if (!container) return;

  container.innerHTML = '';

  if (!Array.isArray(games) || games.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No games available yet.';
    container.appendChild(empty);
    return;
  }

  games.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'game-card';

    const img = document.createElement('img');
    img.className = 'game-icon';
    img.src = game.icon || '';
    img.alt = game.title || '';

    const title = document.createElement('div');
    title.className = 'game-title';
    title.textContent = game.title || game.id || 'Game';

    card.appendChild(img);
    card.appendChild(title);

    card.addEventListener('click', () => {
      const url = buildGameUrl(game);
      window.location.href = url;
    });

    container.appendChild(card);
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const games = await loadGames();
  renderCatalog(games);
});
