'use strict';

/* ============================================================
   AJ STUDY ACADEMY — Daily English Vocabulary PWA
   Core Application Logic
   ============================================================ */

const WORDS_PER_DAY = 10;
const TOTAL_DAYS = 100;
const STORAGE_KEYS = {
  startDate: 'aj_startDate',
  learnedWords: 'aj_learnedWords',
  completedDays: 'aj_completedDays',
  currentStreak: 'aj_currentStreak',
  longestStreak: 'aj_longestStreak',
  lastCompletedDate: 'aj_lastCompletedDate',
  theme: 'aj_theme',
  lastVisit: 'aj_lastVisit',
  hasStarted: 'aj_hasStarted'
};

let VOCAB = [];
let deferredInstallPrompt = null;
let currentDetailWordId = null;

/* ---------------- Storage helpers (fail-safe) ---------------- */
function storageGet(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === null) return fallback;
    return JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}
function storageSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('LocalStorage write failed', e);
    return false;
  }
}

/* ---------------- Vocabulary loading ---------------- */
async function loadVocabulary() {
  try {
    const res = await fetch('data/vocabulary.json');
    if (!res.ok) throw new Error('Failed to fetch vocabulary');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('Empty vocabulary');
    VOCAB = data;
    return true;
  } catch (e) {
    console.error(e);
    VOCAB = [];
    showVocabUnavailable();
    return false;
  }
}

function showVocabUnavailable() {
  const main = document.getElementById('appMain');
  if (main) {
    const div = document.createElement('div');
    div.className = 'settings-card';
    div.style.margin = '16px';
    div.textContent = 'Vocabulary data is temporarily unavailable. Please reopen the app after the initial setup.';
    main.prepend(div);
  }
}

/* ---------------- Day calculation ---------------- */
function calculateCurrentDay() {
  const startDate = storageGet(STORAGE_KEYS.startDate, null);
  if (!startDate) return 1;
  const start = new Date(startDate);
  const now = new Date();
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diffDays = Math.floor((nowMidnight - startMidnight) / (1000 * 60 * 60 * 24));
  const day = diffDays + 1;
  return Math.min(Math.max(day, 1), TOTAL_DAYS);
}

function getMaxAvailableWordCount() {
  return Math.min(VOCAB.length, TOTAL_DAYS * WORDS_PER_DAY);
}

function getWordsForDay(dayNum) {
  const startIdx = (dayNum - 1) * WORDS_PER_DAY;
  const endIdx = startIdx + WORDS_PER_DAY;
  return VOCAB.filter(w => w.id > startIdx && w.id <= endIdx);
}

function getTodaysWords() {
  const day = calculateCurrentDay();
  return getWordsForDay(day);
}

/* ---------------- Progress / learned words ---------------- */
function getLearnedWords() {
  return storageGet(STORAGE_KEYS.learnedWords, []);
}
function isWordLearned(id) {
  return getLearnedWords().includes(id);
}
function markWordAsLearned(id) {
  const learned = getLearnedWords();
  if (!learned.includes(id)) {
    learned.push(id);
    storageSet(STORAGE_KEYS.learnedWords, learned);
  }
  updateStreakIfDayComplete();
  updateProgress();
  checkFullCompletion();
}
function unmarkWord(id) {
  let learned = getLearnedWords();
  learned = learned.filter(x => x !== id);
  storageSet(STORAGE_KEYS.learnedWords, learned);
  updateProgress();
}

function isDayComplete(dayNum) {
  const words = getWordsForDay(dayNum);
  if (words.length === 0) return false;
  const learned = getLearnedWords();
  return words.every(w => learned.includes(w.id));
}

function getCompletedDays() {
  return storageGet(STORAGE_KEYS.completedDays, []);
}

/* ---------------- Streak logic ---------------- */
function updateStreakIfDayComplete() {
  const day = calculateCurrentDay();
  if (!isDayComplete(day)) return;

  let completedDays = getCompletedDays();
  if (completedDays.includes(day)) return; // already counted

  completedDays.push(day);
  storageSet(STORAGE_KEYS.completedDays, completedDays);

  const todayStr = new Date().toDateString();
  const lastCompleted = storageGet(STORAGE_KEYS.lastCompletedDate, null);
  let currentStreak = storageGet(STORAGE_KEYS.currentStreak, 0);
  let longestStreak = storageGet(STORAGE_KEYS.longestStreak, 0);

  if (lastCompleted) {
    const lastDate = new Date(lastCompleted);
    const diff = Math.floor((new Date(todayStr) - new Date(lastDate.toDateString())) / (1000 * 60 * 60 * 24));
    if (diff === 1) {
      currentStreak += 1;
    } else if (diff === 0) {
      // same day, keep streak
    } else {
      currentStreak = 1;
    }
  } else {
    currentStreak = 1;
  }

  longestStreak = Math.max(longestStreak, currentStreak);
  storageSet(STORAGE_KEYS.currentStreak, currentStreak);
  storageSet(STORAGE_KEYS.longestStreak, longestStreak);
  storageSet(STORAGE_KEYS.lastCompletedDate, todayStr);
}

/* ---------------- Rendering: Home ---------------- */
function renderGreeting() {
  const hour = new Date().getHours();
  let greeting = 'Good Morning 👋';
  if (hour >= 12 && hour < 17) greeting = 'Good Afternoon 👋';
  else if (hour >= 17) greeting = 'Good Evening 👋';
  document.getElementById('greetingText').textContent = greeting;
}

function updateProgress() {
  const day = calculateCurrentDay();
  const todayWords = getWordsForDay(day);
  const learned = getLearnedWords();
  const todayLearnedCount = todayWords.filter(w => learned.includes(w.id)).length;

  document.getElementById('dayBadge').textContent = `DAY ${day} / ${TOTAL_DAYS}`;
  document.getElementById('todayProgressNum').textContent = todayLearnedCount;
  document.getElementById('todayProgressBar').style.width = `${(todayLearnedCount / WORDS_PER_DAY) * 100}%`;

  const totalWords = getMaxAvailableWordCount();
  const overallLearned = learned.filter(id => id <= totalWords).length;
  const overallPercent = totalWords > 0 ? ((overallLearned / (VOCAB.length || 1)) * 100) : 0;

  document.getElementById('overallProgressNum').textContent = overallLearned;
  document.getElementById('overallProgressBar').style.width = `${Math.min((overallLearned / (VOCAB.length || 1)) * 100, 100)}%`;
  document.getElementById('overallPercent').textContent = `${overallPercent.toFixed(1)}% Complete`;

  document.getElementById('streakNum').textContent = storageGet(STORAGE_KEYS.currentStreak, 0);

  // Progress view mirror
  const pOverallNum = document.getElementById('pOverallNum');
  if (pOverallNum) {
    pOverallNum.textContent = overallLearned;
    document.getElementById('pOverallBar').style.width = `${Math.min((overallLearned / (VOCAB.length || 1)) * 100, 100)}%`;
    document.getElementById('pOverallPercent').textContent = `${overallPercent.toFixed(1)}% Complete`;
    document.getElementById('pCurrentStreak').textContent = storageGet(STORAGE_KEYS.currentStreak, 0);
    document.getElementById('pLongestStreak').textContent = storageGet(STORAGE_KEYS.longestStreak, 0);
    document.getElementById('pDaysCompleted').textContent = getCompletedDays().length;
    document.getElementById('pCurrentDay').textContent = day;
  }
}

function renderWordCard(word, container) {
  const learned = isWordLearned(word.id);
  const card = document.createElement('div');
  card.className = 'word-card';
  card.dataset.wordId = word.id;

  card.innerHTML = `
    <div class="word-card-head" tabindex="0" role="button" aria-expanded="false">
      <div class="word-card-headline">
        <span class="word-card-word">${escapeHtml(word.word)}</span>
        <span class="word-card-pos">${escapeHtml(word.partOfSpeech)}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        ${learned ? '<span class="word-card-learned-badge">✓</span>' : '<span class="word-card-hint">Tap to reveal</span>'}
        <span class="chevron">▾</span>
      </div>
    </div>
    <div class="word-card-body">
      <div class="word-card-body-inner">
        ${renderWordDetailHTML(word)}
        <button class="mark-learned-btn ${learned ? 'learned' : ''}" data-word-id="${word.id}">
          ${learned ? '✓ Learned' : '✓ Mark as Learned'}
        </button>
      </div>
    </div>
  `;

  const head = card.querySelector('.word-card-head');
  const toggle = () => {
    const expanded = card.classList.toggle('expanded');
    head.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  };
  head.addEventListener('click', toggle);
  head.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });

  card.querySelector('.mark-learned-btn').addEventListener('click', (e) => {
    e.stopPropagation();
    const id = parseInt(e.target.dataset.wordId, 10);
    if (isWordLearned(id)) {
      unmarkWord(id);
    } else {
      markWordAsLearned(id);
    }
    // re-render just this card's learned state
    const stillLearned = isWordLearned(id);
    e.target.textContent = stillLearned ? '✓ Learned' : '✓ Mark as Learned';
    e.target.classList.toggle('learned', stillLearned);
    const badge = card.querySelector('.word-card-learned-badge, .word-card-hint');
    if (badge) {
      if (stillLearned) {
        badge.outerHTML = '<span class="word-card-learned-badge">✓</span>';
      } else {
        badge.outerHTML = '<span class="word-card-hint">Tap to reveal</span>';
      }
    }
  });

  card.querySelectorAll('.speak-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      speakWord(btn.dataset.speak || word.word);
    });
  });

  container.appendChild(card);
}

function renderWordDetailHTML(word) {
  const synonyms = (word.synonyms || []).map(s => `<span class="chip syn">${escapeHtml(s)}</span>`).join('');
  const antonyms = (word.antonyms || []).map(a => `<span class="chip ant">${escapeHtml(a)}</span>`).join('');
  const wordFamily = (word.wordFamily || []).map(w => `<span class="chip">${escapeHtml(w)}</span>`).join('');
  const cwf = (word.commonWordFamilies || []).map(c => `
    <div class="cwf-item">
      <span class="cwf-word">${escapeHtml(c.word)}</span>
      <span class="cwf-pos">${escapeHtml(c.partOfSpeech)}</span>
      <span>${escapeHtml(c.meaningHindi)}</span>
    </div>`).join('');

  return `
    <div class="detail-row">
      <div class="detail-label">Pronunciation</div>
      <div class="pron-row">
        <span class="detail-value">${escapeHtml(word.pronunciation)}</span>
        <button class="speak-btn" data-speak="${escapeHtml(word.word)}" aria-label="Listen to pronunciation">🔊</button>
      </div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Hindi Meaning</div>
      <div class="detail-value hindi">${escapeHtml(word.meaningHindi)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Simple → Better</div>
      <div class="simple-better">${escapeHtml(word.simpleWord)} <span class="arrow">→</span> ${escapeHtml(word.betterWord)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Example</div>
      <div class="detail-value">${escapeHtml(word.example)}</div>
    </div>
    <div class="detail-row">
      <div class="detail-label">Hindi</div>
      <div class="detail-value hindi">${escapeHtml(word.exampleHindi)}</div>
    </div>
    ${wordFamily ? `<div class="detail-row"><div class="detail-label">Word Family</div><div class="chip-row">${wordFamily}</div></div>` : ''}
    ${cwf ? `<div class="detail-row"><div class="detail-label">Common Word Family</div><div class="cwf-list">${cwf}</div></div>` : ''}
    ${synonyms ? `<div class="detail-row"><div class="detail-label">Synonyms</div><div class="chip-row">${synonyms}</div></div>` : ''}
    ${antonyms ? `<div class="detail-row"><div class="detail-label">Antonyms</div><div class="chip-row">${antonyms}</div></div>` : ''}
  `;
}

function renderTodaysWords() {
  const container = document.getElementById('todayWordsList');
  container.innerHTML = '';
  const words = getTodaysWords();
  if (words.length === 0) {
    container.innerHTML = '<p class="section-sub">No words available for today yet.</p>';
    return;
  }
  words.forEach(w => renderWordCard(w, container));
}

/* ---------------- All Words view ---------------- */
function renderAllWords(filter) {
  const container = document.getElementById('allWordsList');
  container.innerHTML = '';
  const learned = getLearnedWords();
  let list = VOCAB;
  if (filter) {
    const f = filter.toLowerCase();
    list = VOCAB.filter(w => matchesSearch(w, f));
  }
  const frag = document.createDocumentFragment();
  list.slice(0, 300).forEach(w => {
    const item = document.createElement('div');
    item.className = 'word-compact-item';
    item.innerHTML = `
      <div class="word-compact-left">
        <span class="word-compact-word">${escapeHtml(w.word)}</span>
        <span class="word-compact-hindi">${escapeHtml(w.meaningHindi)}</span>
      </div>
      ${learned.includes(w.id) ? '<span class="word-compact-check">✓</span>' : ''}
    `;
    item.addEventListener('click', () => openWordDetailModal(w));
    frag.appendChild(item);
  });
  container.appendChild(frag);
  if (list.length === 0) {
    container.innerHTML = '<p class="section-sub">No words found.</p>';
  } else if (list.length > 300) {
    const note = document.createElement('p');
    note.className = 'section-sub';
    note.textContent = `Showing first 300 of ${list.length} results. Refine your search.`;
    container.appendChild(note);
  }
}

function matchesSearch(w, f) {
  return (
    w.word.toLowerCase().includes(f) ||
    (w.meaningHindi || '').toLowerCase().includes(f) ||
    (w.simpleWord || '').toLowerCase().includes(f) ||
    (w.betterWord || '').toLowerCase().includes(f) ||
    (w.wordFamily || []).some(x => x.toLowerCase().includes(f)) ||
    (w.commonWordFamilies || []).some(c => c.word.toLowerCase().includes(f) || (c.meaningHindi || '').toLowerCase().includes(f)) ||
    (w.synonyms || []).some(x => x.toLowerCase().includes(f)) ||
    (w.antonyms || []).some(x => x.toLowerCase().includes(f))
  );
}

function openWordDetailModal(word) {
  currentDetailWordId = word.id;
  const modal = document.getElementById('wordDetailModal');
  const content = document.getElementById('wordDetailContent');
  const learned = isWordLearned(word.id);
  content.innerHTML = `
    <div class="word-card-headline" style="margin-bottom:14px;">
      <span class="word-card-word">${escapeHtml(word.word)}</span>
      <span class="word-card-pos">${escapeHtml(word.partOfSpeech)}</span>
    </div>
    ${renderWordDetailHTML(word)}
    <button class="mark-learned-btn ${learned ? 'learned' : ''}" id="modalMarkLearnedBtn" data-word-id="${word.id}">
      ${learned ? '✓ Learned' : '✓ Mark as Learned'}
    </button>
    <button class="btn btn-secondary" id="closeWordDetailBtn" style="width:100%;margin-top:10px;">Close</button>
  `;
  content.querySelectorAll('.speak-btn').forEach(btn => {
    btn.addEventListener('click', () => speakWord(btn.dataset.speak || word.word));
  });
  content.querySelector('#modalMarkLearnedBtn').addEventListener('click', (e) => {
    const id = parseInt(e.target.dataset.wordId, 10);
    if (isWordLearned(id)) unmarkWord(id); else markWordAsLearned(id);
    const stillLearned = isWordLearned(id);
    e.target.textContent = stillLearned ? '✓ Learned' : '✓ Mark as Learned';
    e.target.classList.toggle('learned', stillLearned);
    renderAllWords(document.getElementById('allWordsSearch').value);
  });
  content.querySelector('#closeWordDetailBtn').addEventListener('click', () => {
    modal.hidden = true;
  });
  modal.hidden = false;
}

/* ---------------- Review / Days view ---------------- */
function renderDaysGrid() {
  const container = document.getElementById('daysGrid');
  container.innerHTML = '';
  const currentDay = calculateCurrentDay();
  const completed = getCompletedDays();
  const frag = document.createDocumentFragment();

  for (let d = 1; d <= TOTAL_DAYS; d++) {
    const chip = document.createElement('button');
    chip.className = 'day-chip';
    const isLocked = d > currentDay;
    const isCompleted = completed.includes(d);
    const isCurrent = d === currentDay;

    if (isLocked) chip.classList.add('locked');
    else if (isCompleted) chip.classList.add('completed');
    else if (isCurrent) chip.classList.add('current');

    let icon = '';
    if (isLocked) icon = '🔒';
    else if (isCompleted) icon = '✓';
    else if (isCurrent) icon = '→';

    chip.innerHTML = `<span class="day-chip-icon">${icon}</span><span>Day ${d}</span>`;
    chip.disabled = isLocked;
    if (!isLocked) {
      chip.addEventListener('click', () => openDayReview(d));
    }
    frag.appendChild(chip);
  }
  container.appendChild(frag);
}

function openDayReview(dayNum) {
  const words = getWordsForDay(dayNum);
  const modal = document.getElementById('wordDetailModal');
  const content = document.getElementById('wordDetailContent');
  content.innerHTML = `<h2 style="margin-bottom:12px;">Day ${dayNum}</h2><div id="reviewWordList" class="word-list"></div>
    <button class="btn btn-secondary" id="closeReviewBtn" style="width:100%;margin-top:14px;">Close</button>`;
  const list = content.querySelector('#reviewWordList');
  words.forEach(w => renderWordCard(w, list));
  content.querySelector('#closeReviewBtn').addEventListener('click', () => { modal.hidden = true; });
  modal.hidden = false;
}

/* ---------------- Search (header) ---------------- */
function searchVocabulary(query) {
  if (!query || query.trim().length === 0) return [];
  const f = query.toLowerCase();
  return VOCAB.filter(w => matchesSearch(w, f)).slice(0, 30);
}

function renderSearchResults(query) {
  const resultsEl = document.getElementById('searchResults');
  const results = searchVocabulary(query);
  if (results.length === 0) {
    resultsEl.hidden = query.trim().length === 0;
    resultsEl.innerHTML = query.trim().length ? '<div class="search-result-item">No results found.</div>' : '';
    return;
  }
  resultsEl.hidden = false;
  resultsEl.innerHTML = '';
  results.forEach(w => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `<span class="search-result-word">${escapeHtml(w.word)}</span><span class="search-result-hindi">${escapeHtml(w.meaningHindi)}</span>`;
    item.addEventListener('click', () => {
      openWordDetailModal(w);
      resultsEl.hidden = true;
      document.getElementById('searchInput').value = '';
    });
    resultsEl.appendChild(item);
  });
}

/* ---------------- Text to speech ---------------- */
function speakWord(text) {
  try {
    if (!('speechSynthesis' in window)) {
      alert('Voice pronunciation is not supported on this device/browser.');
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis failed', e);
  }
}

/* ---------------- Theme ---------------- */
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  storageSet(STORAGE_KEYS.theme, theme);
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) themeToggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  document.getElementById('lightModeBtn').classList.toggle('active', theme === 'light');
  document.getElementById('darkModeBtn').classList.toggle('active', theme === 'dark');
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B1220' : '#2563EB');
}
function changeTheme(theme) { applyTheme(theme); }
function loadTheme() {
  const saved = storageGet(STORAGE_KEYS.theme, 'light');
  applyTheme(saved);
}

/* ---------------- Navigation ---------------- */
function switchView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.hidden = true);
  const target = document.getElementById(viewId);
  if (target) target.hidden = false;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === viewId);
  });
  document.getElementById('appMain').scrollTop = 0;
  window.scrollTo(0, 0);

  if (viewId === 'wordsView') renderAllWords('');
  if (viewId === 'reviewView') renderDaysGrid();
  if (viewId === 'progressView') updateProgress();
}

/* ---------------- Completion check ---------------- */
function checkFullCompletion() {
  const totalAvailable = getMaxAvailableWordCount();
  if (totalAvailable < TOTAL_DAYS * WORDS_PER_DAY) return; // not all 1000 words present yet
  const learned = getLearnedWords();
  if (learned.length >= totalAvailable) {
    const alreadyShown = storageGet('aj_completionShown', false);
    if (!alreadyShown) {
      document.getElementById('modalWordsLearned').textContent = learned.length;
      document.getElementById('modalDaysCompleted').textContent = getCompletedDays().length;
      document.getElementById('modalLongestStreak').textContent = storageGet(STORAGE_KEYS.longestStreak, 0);
      document.getElementById('completionModal').hidden = false;
      storageSet('aj_completionShown', true);
    }
  }
}

/* ---------------- Online/offline ---------------- */
function updateOnlineStatus() {
  const el = document.getElementById('netStatus');
  if (navigator.onLine) {
    el.textContent = '🟢 Online';
  } else {
    el.textContent = '🔴 Offline';
  }
}

/* ---------------- Install prompt ---------------- */
function handleInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    const btn = document.getElementById('installBtn');
    if (btn) {
      btn.hidden = false;
      document.getElementById('installHint').hidden = true;
    }
  });
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installBtn.hidden = true;
    });
  }
  window.addEventListener('appinstalled', () => {
    if (installBtn) installBtn.hidden = true;
  });
}

/* ---------------- Service worker ---------------- */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('service-worker.js').catch(err => {
        console.warn('Service worker registration failed:', err);
      });
    });
  }
}

/* ---------------- Utilities ---------------- */
function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------- Init ---------------- */
function initializeUser() {
  const hasStarted = storageGet(STORAGE_KEYS.hasStarted, false);
  if (!hasStarted) {
    showWelcomeScreen();
  } else {
    showAppShell();
  }
}

function showWelcomeScreen() {
  document.getElementById('welcomeScreen').hidden = false;
  document.getElementById('appShell').classList.remove('active');
}

function showAppShell() {
  document.getElementById('welcomeScreen').hidden = true;
  document.getElementById('appShell').classList.add('active');
  renderGreeting();
  renderTodaysWords();
  updateProgress();
}

function startLearning() {
  storageSet(STORAGE_KEYS.startDate, new Date().toISOString());
  storageSet(STORAGE_KEYS.hasStarted, true);
  storageSet(STORAGE_KEYS.learnedWords, []);
  storageSet(STORAGE_KEYS.completedDays, []);
  storageSet(STORAGE_KEYS.currentStreak, 0);
  storageSet(STORAGE_KEYS.longestStreak, 0);
  showAppShell();
}

function bindEvents() {
  document.getElementById('startLearningBtn').addEventListener('click', startLearning);

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });

  document.getElementById('searchToggleBtn').addEventListener('click', () => {
    const bar = document.getElementById('searchBar');
    bar.hidden = !bar.hidden;
    if (!bar.hidden) document.getElementById('searchInput').focus();
  });
  document.getElementById('searchInput').addEventListener('input', (e) => {
    renderSearchResults(e.target.value);
  });

  document.getElementById('allWordsSearch').addEventListener('input', (e) => {
    renderAllWords(e.target.value);
  });

  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    changeTheme(current === 'dark' ? 'light' : 'dark');
  });
  document.getElementById('lightModeBtn').addEventListener('click', () => changeTheme('light'));
  document.getElementById('darkModeBtn').addEventListener('click', () => changeTheme('dark'));

  document.getElementById('closeModalBtn').addEventListener('click', () => {
    document.getElementById('completionModal').hidden = true;
  });

  document.getElementById('resetProgressBtn').addEventListener('click', () => {
    if (confirm('This will erase all your progress. Are you sure?')) {
      Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
      localStorage.removeItem('aj_completionShown');
      location.reload();
    }
  });

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Close modals when clicking backdrop
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  });
}

async function initializeApp() {
  bindEvents();
  document.querySelectorAll('.modal').forEach(modal => {
    modal.hidden = true;
  });
  loadTheme();
  updateOnlineStatus();
  handleInstallPrompt();
  registerServiceWorker();
  await loadVocabulary();
  initializeUser();
}

document.addEventListener('DOMContentLoaded', initializeApp);
