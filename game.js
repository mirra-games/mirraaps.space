const STORAGE_KEY_CONTINUE = 'mirraapps_continue_games_v1';

async function loadGames() {
  try {
    const response = await fetch('./games.json');
    if (!response.ok) {
      console.error('Failed to load games.json', response.status);
      return [];
    }
    return await response.json();
  } catch (e) {
    console.error('Invalid JSON in games.json', e);
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

function buildGameUrl(game) {
  const base = new URL(game.url, window.location.origin);
  if (game.defaultParams && typeof game.defaultParams === 'object') {
    Object.entries(game.defaultParams).forEach(([key, value]) => {
      base.searchParams.set(key, String(value));
    });
  }
  return base.toString();
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
        const params = new URLSearchParams(window.location.search);
        params.set('id', game.id);
        window.location.href = `./game.html?${params.toString()}`;
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

function createSidebarItem(game, currentId) {
  const item = document.createElement('button');
  item.type = 'button';
  item.className = 'game-sidebar-item';
  if (game.id === currentId) {
    item.classList.add('game-sidebar-item--active');
  }

  const thumb = document.createElement('div');
  thumb.className = 'game-sidebar-thumb';

  const img = document.createElement('img');
  img.src = game.icon || '';
  img.alt = game.title || game.id || 'Game';
  thumb.appendChild(img);
  item.appendChild(thumb);

  const title = document.createElement('div');
  title.className = 'game-sidebar-title-text';
  title.textContent = game.title || game.id || 'Game';
  item.appendChild(title);

  item.addEventListener('click', () => {
    const params = new URLSearchParams(window.location.search);
    params.set('id', game.id);
    window.location.href = `./game.html?${params.toString()}`;
  });

  return item;
}

function setupFullscreen(frameWrapper) {
  const button = document.getElementById('fullscreen-button');
  const buttonText = document.getElementById('fullscreen-button-text');
  const frameEl = document.getElementById('game-frame');
  if (!button || !frameWrapper) return;

  const PSEUDO_CLASS = 'game-frame-wrapper--pseudo-fullscreen';
  const BUTTON_OVERLAY_CLASS = 'game-fullscreen-button--overlay';
  const EXIT_BUTTON_CLASS = 'game-exit-fullscreen-button';

  const exitButton = document.createElement('button');
  exitButton.type = 'button';
  exitButton.className = EXIT_BUTTON_CLASS;
  exitButton.setAttribute('aria-label', 'Exit fullscreen');
  exitButton.hidden = true;
  exitButton.innerHTML = '&times;';
  document.body.appendChild(exitButton);

  const isAppleMobile =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  function isPseudoFullscreen() {
    return frameWrapper.classList.contains(PSEUDO_CLASS);
  }

  function enterPseudoFullscreen() {
    frameWrapper.classList.add(PSEUDO_CLASS);
    document.body.classList.add('is-game-pseudo-fullscreen');
    button.classList.add(BUTTON_OVERLAY_CLASS);
  }

  function exitPseudoFullscreen() {
    frameWrapper.classList.remove(PSEUDO_CLASS);
    document.body.classList.remove('is-game-pseudo-fullscreen');
    button.classList.remove(BUTTON_OVERLAY_CLASS);
  }

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement
    );
  }

  function canUseFullscreenApi(el) {
    if (!el) return false;
    return Boolean(
      el.requestFullscreen ||
      el.webkitRequestFullscreen ||
      el.mozRequestFullScreen ||
      el.msRequestFullscreen
    );
  }

  function requestFs(el) {
    if (el.requestFullscreen) return el.requestFullscreen();
    if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
    if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
    if (el.msRequestFullscreen) return el.msRequestFullscreen();
  }

  function canExitFullscreen() {
    return Boolean(
      document.exitFullscreen ||
      document.webkitExitFullscreen ||
      document.mozCancelFullScreen ||
      document.msExitFullscreen
    );
  }

  function exitFs() {
    if (document.exitFullscreen) return document.exitFullscreen();
    if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
    if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
    if (document.msExitFullscreen) return document.msExitFullscreen();
  }

  function setButtonLabel(isOn) {
    const label = isOn ? 'Уменьшить' : 'На весь экран';
    if (buttonText) {
      buttonText.textContent = label;
    }
    button.setAttribute('aria-label', label);
  }

  function syncButtonState() {
    const isFs = Boolean(getFullscreenElement());
    document.body.classList.toggle('is-game-fullscreen', isFs);
    setButtonLabel(Boolean(isFs || isPseudoFullscreen()));
    exitButton.hidden = !(isFs || isPseudoFullscreen());
  }

  button.addEventListener('click', async () => {
    if (getFullscreenElement()) {
      if (canExitFullscreen()) {
        try {
          await exitFs();
        } finally {
          syncButtonState();
        }
      }
      return;
    }

    if (isPseudoFullscreen()) {
      exitPseudoFullscreen();
      syncButtonState();
      return;
    }

    if (isAppleMobile) {
      enterPseudoFullscreen();
      syncButtonState();
      return;
    }

    const fsTarget = canUseFullscreenApi(frameWrapper) ? frameWrapper : frameEl;
    if (!canUseFullscreenApi(fsTarget)) {
      enterPseudoFullscreen();
      syncButtonState();
      return;
    }

    try {
      await requestFs(fsTarget);
    } catch (_) {
      enterPseudoFullscreen();
    } finally {
      syncButtonState();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isPseudoFullscreen()) {
      exitPseudoFullscreen();
      syncButtonState();
    }
  });

  exitButton.addEventListener('click', async () => {
    if (getFullscreenElement()) {
      if (canExitFullscreen()) {
        try {
          await exitFs();
        } finally {
          syncButtonState();
        }
      }
      return;
    }

    if (isPseudoFullscreen()) {
      exitPseudoFullscreen();
      syncButtonState();
    }
  });

  syncButtonState();
}

function setupMobileTabs() {
  const tabs = Array.from(document.querySelectorAll('.game-mobile-tab'));
  const panels = Array.from(document.querySelectorAll('.game-mobile-panel'));
  if (tabs.length === 0 || panels.length === 0) return;

  function activate(tabKey) {
    tabs.forEach((t) => t.classList.toggle('game-mobile-tab--active', t.dataset.tab === tabKey));
    panels.forEach((p) => p.classList.toggle('game-mobile-panel--active', p.dataset.panel === tabKey));
  }

  tabs.forEach((t) => {
    t.addEventListener('click', () => {
      activate(t.dataset.tab);
    });
  });
}

function populateMobileMoreGames(games, currentId) {
  const list = document.getElementById('game-mobile-more');
  if (!list) return;
  list.innerHTML = '';

  const pool = games.filter((g) => g && g.id && g.id !== currentId);
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const MAX = 8;
  pool.slice(0, Math.min(MAX, pool.length)).forEach((g) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'game-mobile-more-item';

    const thumb = document.createElement('div');
    thumb.className = 'game-mobile-more-thumb';
    const img = document.createElement('img');
    img.src = g.icon || '';
    img.alt = g.title || g.id || 'Game';
    thumb.appendChild(img);

    const name = document.createElement('div');
    name.className = 'game-mobile-more-name';
    name.textContent = g.title || g.id || 'Game';

    item.appendChild(thumb);
    item.appendChild(name);

    if (typeof g.rating === 'number' && !Number.isNaN(g.rating)) {
      const rating = document.createElement('div');
      rating.className = 'game-mobile-more-rating';
      const score = g.rating.toFixed(1).replace(/\.0$/, '');
      rating.textContent = `★ ${score}`;
      item.appendChild(rating);
    }

    item.addEventListener('click', () => {
      saveContinueGame(g);
      const params = new URLSearchParams(window.location.search);
      params.set('id', g.id);
      window.location.href = `./game.html?${params.toString()}`;
    });

    list.appendChild(item);
  });
}

function fillMobileGameInfo(game) {
  const titleEl = document.getElementById('game-mobile-title');
  const iconEl = document.getElementById('game-mobile-icon');
  const ratingBadgeEl = document.getElementById('game-mobile-rating-badge');
  const tagsEl = document.getElementById('game-mobile-tags');
  const developerEl = document.getElementById('game-mobile-developer');
  const technologyEl = document.getElementById('game-mobile-technology');
  const descriptionEl = document.getElementById('game-mobile-description');
  const controlsEl = document.getElementById('game-mobile-controls');
  const heroEl = document.getElementById('game-mobile-hero');

  if (titleEl) titleEl.textContent = game.title || game.id || 'Game';
  if (iconEl) iconEl.src = game.icon || '';

  if (tagsEl) {
    tagsEl.innerHTML = '';
    const tags = Array.isArray(game.tags) ? game.tags : [];
    const labelMap = {
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobile'
    };
    tags.forEach((tag) => {
      const key = String(tag).toLowerCase();
      const label = labelMap[key] || tag;
      const span = document.createElement('span');
      span.className = `game-tag game-tag--${key}`;
      span.textContent = label;
      tagsEl.appendChild(span);
    });
  }

  if (developerEl) developerEl.textContent = game.developer || 'Mirra Games';
  if (technologyEl) technologyEl.textContent = game.technology || 'HTML5';
  if (descriptionEl) descriptionEl.textContent = game.description || 'Enjoy this Mirra Apps game right in your browser.';

  if (controlsEl) {
    controlsEl.innerHTML = '';
    const controls = Array.isArray(game.controls) ? game.controls : [];
    controls.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      controlsEl.appendChild(li);
    });
  }

  if (ratingBadgeEl) {
    if (typeof game.rating === 'number' && !Number.isNaN(game.rating)) {
      const clamped = Math.max(0, Math.min(10, game.rating));
      const display = clamped.toFixed(1).replace(/\.0$/, '');
      ratingBadgeEl.textContent = display;
    } else {
      ratingBadgeEl.textContent = '';
    }
  }

  if (heroEl) {
    const heroImage = game.banner || game.cover || game.hero || game.icon || '';
    heroEl.style.setProperty('--game-mobile-hero-image', heroImage ? `url("${heroImage}")` : 'none');
  }
}

function setupMobileActions(frameWrapper) {
  const playBottom = document.getElementById('play-now-button-bottom');
  const fsBottom = document.getElementById('play-fullscreen-button');
  const fsButton = document.getElementById('fullscreen-button');
  if (!frameWrapper) return;

  function scrollToFrame() {
    const rect = frameWrapper.getBoundingClientRect();
    const y = rect.top + window.scrollY - 10;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }

  if (playBottom) playBottom.addEventListener('click', scrollToFrame);
  if (fsBottom && fsButton) {
    fsBottom.addEventListener('click', () => fsButton.click());
  }
}

async function initGamePage() {
  const params = new URLSearchParams(window.location.search);
  const gameId = params.get('id');

  if (!gameId) {
    window.location.href = './index.html';
    return;
  }

  const [games] = await Promise.all([
    loadGames()
  ]);

  if (!Array.isArray(games) || games.length === 0) {
    return;
  }

  const game = games.find((g) => g.id === gameId);
  if (!game) {
    window.location.href = './index.html';
    return;
  }

  const titleEl = document.getElementById('game-title');
  const categoryEl = document.getElementById('game-category');
  const descriptionEl = document.getElementById('game-description');
  const tagsEl = document.getElementById('game-tags');
  const developerEl = document.getElementById('game-developer');
  const technologyEl = document.getElementById('game-technology');
  const controlsEl = document.getElementById('game-controls');
  const ratingScoreEl = document.getElementById('game-rating-score');
  const ratingStarsEl = document.getElementById('game-rating-stars');
  const sidebarList = document.getElementById('sidebar-games');
  const frameEl = document.getElementById('game-frame');
  const frameWrapper = document.getElementById('game-frame-wrapper');
  if (!titleEl || !sidebarList || !frameEl || !frameWrapper) {
    return;
  }

  const originalParent = frameWrapper.parentElement;
  const originalNextSibling = frameWrapper.nextSibling;
  const hero = document.getElementById('game-mobile-hero');
  const mqMobile = window.matchMedia ? window.matchMedia('(max-width: 768px)') : null;

  function isFullscreenLikeActive() {
    return Boolean(
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      frameWrapper.classList.contains('game-frame-wrapper--pseudo-fullscreen') ||
      document.body.classList.contains('is-game-pseudo-fullscreen')
    );
  }

  function syncFramePlacement() {
    if (isFullscreenLikeActive()) return;

    const isMobile = mqMobile ? mqMobile.matches : false;
    if (isMobile) {
      if (hero && frameWrapper.parentElement !== hero) {
        hero.insertBefore(frameWrapper, hero.firstChild);
      }
      return;
    }

    if (!originalParent) return;
    if (frameWrapper.parentElement === originalParent) return;

    if (originalNextSibling && originalNextSibling.parentNode === originalParent) {
      originalParent.insertBefore(frameWrapper, originalNextSibling);
    } else {
      originalParent.appendChild(frameWrapper);
    }
  }

  syncFramePlacement();
  if (mqMobile) {
    if (mqMobile.addEventListener) {
      mqMobile.addEventListener('change', syncFramePlacement);
    } else if (mqMobile.addListener) {
      mqMobile.addListener(syncFramePlacement);
    }
  }
  window.addEventListener('resize', syncFramePlacement);
  window.addEventListener('orientationchange', () => setTimeout(syncFramePlacement, 50));

  titleEl.textContent = game.title || game.id || 'Game';
  if (categoryEl) {
    categoryEl.textContent = game.category || '';
  }

  if (descriptionEl) {
    descriptionEl.textContent = game.description || 'Enjoy this Mirra Apps game right in your browser.';
  }

  if (tagsEl) {
    tagsEl.innerHTML = '';
    const tags = Array.isArray(game.tags) ? game.tags : [];
    const labelMap = {
      desktop: 'Desktop',
      tablet: 'Tablet',
      mobile: 'Mobile'
    };

    tags.forEach((tag) => {
      const key = String(tag).toLowerCase();
      const label = labelMap[key] || tag;
      const span = document.createElement('span');
      span.className = `game-tag game-tag--${key}`;
      span.textContent = label;
      tagsEl.appendChild(span);
    });
  }

  if (developerEl) {
    developerEl.textContent = game.developer || 'Mirra Games';
  }

  if (technologyEl) {
    technologyEl.textContent = game.technology || 'HTML5';
  }

  if (controlsEl) {
    controlsEl.innerHTML = '';
    const controls = Array.isArray(game.controls) ? game.controls : [];
    controls.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      controlsEl.appendChild(li);
    });
  }

  if (ratingScoreEl) {
    if (typeof game.rating === 'number' && !Number.isNaN(game.rating)) {
      const clamped = Math.max(0, Math.min(10, game.rating));
      const display = clamped.toFixed(1).replace(/\.0$/, '');
      ratingScoreEl.textContent = display;

      if (ratingStarsEl) {
        ratingStarsEl.innerHTML = '';
        const maxStars = 5;
        const starsValue = clamped / 2;
        for (let i = 0; i < maxStars; i += 1) {
          const star = document.createElement('span');
          star.className = 'game-rating-star';
          const diff = starsValue - i;
          if (diff >= 0.75) {
            star.classList.add('game-rating-star--full');
          } else if (diff >= 0.25) {
            star.classList.add('game-rating-star--half');
          }
          ratingStarsEl.appendChild(star);
        }
      }
    } else {
      ratingScoreEl.textContent = '';
      if (ratingStarsEl) {
        ratingStarsEl.innerHTML = '';
      }
    }
  }

  sidebarList.innerHTML = '';

  const MAX_SIDEBAR_ITEMS = 10;
  const pool = [...games];
  for (let i = pool.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let sidebarGames = pool.slice(0, Math.min(MAX_SIDEBAR_ITEMS, pool.length));
  if (!sidebarGames.find((g) => g.id === game.id)) {
    sidebarGames[sidebarGames.length - 1] = game;
  }

  sidebarGames.forEach((g) => {
    const item = createSidebarItem(g, game.id);
    sidebarList.appendChild(item);
  });

  const gameUrl = buildGameUrl(game);
  frameEl.src = gameUrl;
  saveContinueGame(game);

  setupFullscreen(frameWrapper);
  setupSearch(games);

  fillMobileGameInfo(game);
  setupMobileTabs();
  populateMobileMoreGames(games, game.id);
  setupMobileActions(frameWrapper);
}

document.addEventListener('DOMContentLoaded', () => {
  setupThemeToggle();
  initGamePage();
});
