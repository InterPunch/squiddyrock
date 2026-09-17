// ===== Netflix Clone App =====
// All data stored in localStorage + IndexedDB for videos

const STORAGE_KEY = 'netflix_clone_library_v2';  // bumped to clear any old demo data
const CONTINUE_KEY = 'netflix_clone_continue_v2';
const SPOTIFY_KEY = 'netflix_clone_spotify_v1';

// ===== PASSWORD GATE =====
// Change this password to whatever you want
const APP_PASSWORD = 'netflix123';

function checkLogin() {
  // Stay logged in for the browser session
  if (sessionStorage.getItem('netflix_unlocked') === '1') {
    unlockApp();
    return;
  }
  // Show login screen (already visible by default)
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('passwordInput').value;
    if (input === APP_PASSWORD) {
      sessionStorage.setItem('netflix_unlocked', '1');
      unlockApp();
    } else {
      const err = document.getElementById('loginError');
      err.classList.remove('hidden');
      document.getElementById('passwordInput').value = '';
      document.getElementById('passwordInput').focus();
    }
  });
  // Focus the password field
  setTimeout(() => document.getElementById('passwordInput').focus(), 100);
}

function unlockApp() {
  document.getElementById('loginScreen').classList.add('hidden');
  const app = document.getElementById('app');
  app.classList.remove('app-hidden');
  app.classList.add('app-visible');
  // Now start the real app
  initApp();
}

// No demo/starter content — library starts empty
let library = [];
let continueWatching = [];
let currentDetail = null;

// ===== IndexedDB for video blobs =====
let db;
const DB_NAME = 'NetflixCloneVideos';
const STORE_NAME = 'videos';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = (e) => {
      db = e.target.result;
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function saveVideoBlob(id, blob) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put({ id, blob });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function getVideoBlob(id) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result ? req.result.blob : null);
    req.onerror = () => reject(req.error);
  });
}

function clearAllVideos() {
  return new Promise((resolve, reject) => {
    if (!db) {
      resolve();
      return;
    }
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function resetApp() {
  const ok = confirm(
    'Reset the entire app?\n\nThis will permanently delete:\n• All uploaded videos\n• All series & episodes\n• YouTube items\n• Spotify list\n• Continue watching\n\nThis cannot be undone.'
  );
  if (!ok) return;

  try {
    await clearAllVideos();
  } catch (e) {
    console.warn('Could not clear video store:', e);
  }

  library = [];
  continueWatching = [];
  spotifyItems = [];

  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(CONTINUE_KEY);
  localStorage.removeItem(SPOTIFY_KEY);

  renderRows();
  renderSpotify();
  showToast('App fully reset — all data wiped');
}

// ===== LocalStorage helpers =====
function loadLibrary() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      library = JSON.parse(raw);
    } else {
      library = [];  // start empty — no demo content
    }
  } catch {
    library = [];
  }
}

function saveLibrary() {
  // Don't store huge base64 posters forever – keep only metadata
  const toSave = library.map(item => {
    const copy = { ...item };
    // Keep poster data URLs for small images; large ones already handled
    return copy;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
}

function loadContinue() {
  try {
    const raw = localStorage.getItem(CONTINUE_KEY);
    continueWatching = raw ? JSON.parse(raw) : [];
  } catch {
    continueWatching = [];
  }
}

function saveContinue() {
  localStorage.setItem(CONTINUE_KEY, JSON.stringify(continueWatching));
}

// ===== UI Rendering =====
function createPosterElement(item) {
  const div = document.createElement('div');
  div.className = 'poster';
  div.dataset.id = item.id;

  if (item.poster) {
    const img = document.createElement('img');
    img.src = item.poster;
    img.alt = item.title;
    img.loading = 'lazy';
    div.appendChild(img);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'poster-placeholder';
    placeholder.textContent = item.title;
    // Generate a nice gradient based on title
    const hue = item.title.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360;
    placeholder.style.background = `linear-gradient(135deg, hsl(${hue}, 40%, 25%), hsl(${(hue + 40) % 360}, 50%, 15%))`;
    div.appendChild(placeholder);
  }

  if (item.badge) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    const b = item.badge.toLowerCase();
    if (b.includes('leaving')) badge.classList.add('leaving');
    if (b.includes('new') || b.includes('recently')) badge.classList.add('new');
    if (b.includes('online')) badge.classList.add('online');
    badge.textContent = item.badge;
    div.appendChild(badge);
  }

  if (item.progress) {
    const prog = document.createElement('div');
    prog.className = 'progress-bar-mini';
    prog.style.width = item.progress + '%';
    div.appendChild(prog);
  }

  const overlay = document.createElement('div');
  overlay.className = 'poster-title-overlay';
  overlay.textContent = item.title;
  div.appendChild(overlay);

  div.addEventListener('click', () => openDetail(item));
  return div;
}

function renderRows() {
  // Continue Watching
  const contEl = document.getElementById('continueWatching');
  contEl.innerHTML = '';
  const contItems = continueWatching.length
    ? continueWatching.map(id => library.find(i => i.id === id)).filter(Boolean)
    : library.filter(i => i.progress).slice(0, 6);

  if (contItems.length === 0) {
    contEl.innerHTML = '<div class="empty-row">Nothing in progress yet. Start watching!</div>';
  } else {
    contItems.forEach(item => contEl.appendChild(createPosterElement(item)));
  }

  // Top Picks
  const topEl = document.getElementById('topPicks');
  topEl.innerHTML = '';
  if (library.length === 0) {
    topEl.innerHTML = '<div class="empty-row">Your library is empty. Upload videos or pull from YouTube to get started.</div>';
  } else {
    library.slice(0, 8).forEach(item => topEl.appendChild(createPosterElement(item)));
  }

  // Gems
  const gemsEl = document.getElementById('gems');
  gemsEl.innerHTML = '';
  if (library.length <= 4) {
    gemsEl.innerHTML = '<div class="empty-row">Add more content to see gems here.</div>';
  } else {
    library.slice(4, 12).forEach(item => gemsEl.appendChild(createPosterElement(item)));
  }

  // My Library (user uploads + created)
  const libEl = document.getElementById('myLibrary');
  libEl.innerHTML = '';
  const mine = library.filter(i => i.source === 'upload' || i.source === 'created' || i.source === 'youtube');
  if (mine.length === 0) {
    libEl.innerHTML = '<div class="empty-row">No uploads yet. Go to “Upload / Create” to add your own movies & series.</div>';
  } else {
    mine.forEach(item => libEl.appendChild(createPosterElement(item)));
  }

  // YouTube
  const ytEl = document.getElementById('youtubeImports');
  ytEl.innerHTML = '';
  const yts = library.filter(i => i.source === 'youtube');
  if (yts.length === 0) {
    ytEl.innerHTML = '<div class="empty-row">No YouTube videos pulled yet. Use the “Pull from YouTube” tab.</div>';
  } else {
    yts.forEach(item => ytEl.appendChild(createPosterElement(item)));
  }
}

// ===== Navigation =====
function showSection(section) {
  if (section === 'upload') {
    openPanel('uploadPanel');
  } else if (section === 'youtube') {
    openPanel('youtubePanel');
  } else if (section === 'spotify') {
    document.getElementById('spotify-row')?.scrollIntoView({ behavior: 'smooth' });
    document.querySelectorAll('.nav-links li').forEach(li => {
      li.classList.toggle('active', li.dataset.section === 'spotify');
    });
  } else {
    document.querySelectorAll('.nav-links li').forEach(li => {
      li.classList.toggle('active', li.dataset.section === section);
    });
  }
}

document.querySelectorAll('.nav-links li').forEach(li => {
  li.addEventListener('click', () => {
    const sec = li.dataset.section;
    showSection(sec);
  });
});

// ===== Panels =====
function openPanel(id) {
  document.getElementById(id).classList.add('open');
  if (id === 'uploadPanel') {
    populateSeriesDropdown();
  }
}

function closePanel(id) {
  document.getElementById(id).classList.remove('open');
}

// Tabs inside upload panel
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
    if (tab.dataset.tab === 'episode') {
      populateSeriesDropdown();
    }
  });
});

function populateSeriesDropdown() {
  const select = document.getElementById('episodeSeries');
  if (!select) return;
  const seriesList = library.filter(i => i.type === 'series');
  select.innerHTML = '<option value="">-- Choose a series --</option>';
  seriesList.forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    const epCount = (s.episodes || []).length;
    opt.textContent = `${s.title} (${epCount} episode${epCount !== 1 ? 's' : ''})`;
    select.appendChild(opt);
  });
  const hint = document.getElementById('noSeriesHint');
  if (hint) hint.style.display = seriesList.length === 0 ? 'block' : 'none';
}

// ===== File helpers =====
function readFileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function generateId() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
}

// ===== Upload Video (standalone) =====
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('uploadTitle').value.trim();
  const desc = document.getElementById('uploadDesc').value.trim();
  const posterFile = document.getElementById('uploadPoster').files[0];
  const videoFile = document.getElementById('uploadVideo').files[0];

  if (!title || !videoFile) {
    showToast('Title and video file are required');
    return;
  }

  const progressEl = document.getElementById('uploadProgress');
  const bar = document.getElementById('progressBar');
  const text = document.getElementById('progressText');
  progressEl.classList.remove('hidden');
  bar.style.width = '10%';
  text.textContent = 'Processing...';

  try {
    let posterData = null;
    if (posterFile) {
      posterData = await readFileAsDataURL(posterFile);
    }

    bar.style.width = '40%';
    text.textContent = 'Saving video...';

    const id = generateId();
    await saveVideoBlob(id, videoFile);

    bar.style.width = '80%';

    const item = {
      id,
      title,
      type: 'movie',
      desc: desc || 'User uploaded video',
      poster: posterData,
      badge: 'My Upload',
      source: 'upload',
      hasVideo: true,
      createdAt: Date.now()
    };

    library.unshift(item);
    saveLibrary();
    renderRows();

    bar.style.width = '100%';
    text.textContent = 'Done!';
    showToast(`"${title}" added to your library`);

    setTimeout(() => {
      progressEl.classList.add('hidden');
      document.getElementById('uploadForm').reset();
      closePanel('uploadPanel');
    }, 800);
  } catch (err) {
    console.error(err);
    showToast('Upload failed: ' + err.message);
    progressEl.classList.add('hidden');
  }
});

// ===== Add Episode to Series =====
document.getElementById('episodeForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const seriesId = document.getElementById('episodeSeries').value;
  const season = parseInt(document.getElementById('episodeSeason').value) || 1;
  const epNum = parseInt(document.getElementById('episodeNumber').value) || 1;
  const title = document.getElementById('episodeTitle').value.trim();
  const desc = document.getElementById('episodeDesc').value.trim();
  const videoFile = document.getElementById('episodeVideo').files[0];

  if (!seriesId) {
    showToast('Please select a series');
    return;
  }
  if (!title || !videoFile) {
    showToast('Episode title and video file are required');
    return;
  }

  const series = library.find(i => i.id === seriesId);
  if (!series) {
    showToast('Series not found');
    return;
  }

  const progressEl = document.getElementById('episodeProgress');
  const bar = document.getElementById('episodeProgressBar');
  const text = document.getElementById('episodeProgressText');
  progressEl.classList.remove('hidden');
  bar.style.width = '20%';
  text.textContent = 'Saving episode...';

  try {
    const id = generateId();
    await saveVideoBlob(id, videoFile);
    bar.style.width = '70%';

    if (!series.episodes) series.episodes = [];

    const episode = {
      id,
      title,
      desc: desc || `S${season}E${epNum}`,
      season,
      episode: epNum,
      hasVideo: true,
      createdAt: Date.now()
    };

    series.episodes.push(episode);
    // Sort by season then episode
    series.episodes.sort((a, b) => (a.season - b.season) || (a.episode - b.episode));

    // Update series badge to show episode count
    series.badge = `${series.episodes.length} Ep`;

    saveLibrary();
    renderRows();
    populateSeriesDropdown();

    bar.style.width = '100%';
    text.textContent = 'Done!';
    showToast(`"${title}" added to ${series.title} (S${season}E${epNum})`);

    setTimeout(() => {
      progressEl.classList.add('hidden');
      document.getElementById('episodeForm').reset();
      document.getElementById('episodeSeason').value = 1;
      document.getElementById('episodeNumber').value = 1;
      closePanel('uploadPanel');
    }, 800);
  } catch (err) {
    console.error(err);
    showToast('Failed to add episode: ' + err.message);
    progressEl.classList.add('hidden');
  }
});

// ===== Create Series =====
document.getElementById('seriesForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('seriesTitle').value.trim();
  const desc = document.getElementById('seriesDesc').value.trim();
  const seasons = parseInt(document.getElementById('seriesSeasons').value) || 1;
  const posterFile = document.getElementById('seriesPoster').files[0];

  if (!title) return;

  let posterData = null;
  if (posterFile) posterData = await readFileAsDataURL(posterFile);

  const item = {
    id: generateId(),
    title,
    type: 'series',
    desc: desc || `${seasons} season series`,
    poster: posterData,
    badge: 'Series',
    source: 'created',
    seasons,
    episodes: [],
    createdAt: Date.now()
  };

  library.unshift(item);
  saveLibrary();
  renderRows();
  showToast(`Series "${title}" created`);
  document.getElementById('seriesForm').reset();
  closePanel('uploadPanel');
});

// ===== Create Movie =====
document.getElementById('movieForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('movieTitle').value.trim();
  const desc = document.getElementById('movieDesc').value.trim();
  const posterFile = document.getElementById('moviePoster').files[0];
  const videoFile = document.getElementById('movieVideo').files[0];

  if (!title) return;

  let posterData = null;
  if (posterFile) posterData = await readFileAsDataURL(posterFile);

  const id = generateId();
  let hasVideo = false;

  if (videoFile) {
    await saveVideoBlob(id, videoFile);
    hasVideo = true;
  }

  const item = {
    id,
    title,
    type: 'movie',
    desc: desc || 'User created movie',
    poster: posterData,
    badge: 'My Movie',
    source: 'created',
    hasVideo,
    createdAt: Date.now()
  };

  library.unshift(item);
  saveLibrary();
  renderRows();
  showToast(`Movie "${title}" created`);
  document.getElementById('movieForm').reset();
  closePanel('uploadPanel');
});

// ===== YouTube Pull =====
function extractYouTubeId(urlOrId) {
  if (!urlOrId) return null;
  // Already an ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(urlOrId.trim())) return urlOrId.trim();

  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
  ];
  for (const p of patterns) {
    const m = urlOrId.match(p);
    if (m) return m[1];
  }
  return null;
}

function pullFromYouTube() {
  const raw = document.getElementById('ytUrl').value.trim();
  const customTitle = document.getElementById('ytTitle').value.trim();
  const type = document.getElementById('ytType').value;

  const videoId = extractYouTubeId(raw);
  if (!videoId) {
    showToast('Invalid YouTube URL or ID');
    return;
  }

  const title = customTitle || `YouTube Video (${videoId})`;
  const item = {
    id: 'yt-' + videoId,
    title,
    type,
    desc: 'Online Only — streams from YouTube when you play it. No file is saved to your computer.',
    poster: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    badge: 'Online Only',
    source: 'youtube',
    youtubeId: videoId,
    onlineOnly: true,
    createdAt: Date.now()
  };

  // Avoid duplicates
  if (library.some(i => i.id === item.id)) {
    showToast('This video is already in your library');
    return;
  }

  library.unshift(item);
  saveLibrary();
  renderRows();

  // Preview
  const preview = document.getElementById('ytPreview');
  const embed = document.getElementById('ytEmbed');
  embed.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}" allowfullscreen></iframe>`;
  preview.classList.remove('hidden');

  showToast(`"${title}" added (Online Only)`);
  document.getElementById('ytUrl').value = '';
  document.getElementById('ytTitle').value = '';
}

// ===== Detail & Play =====
function openDetail(item) {
  currentDetail = item;
  document.getElementById('detailTitle').textContent = item.title;

  let meta = `${(item.type || 'video').toUpperCase()}`;
  if (item.type === 'series') {
    const epCount = (item.episodes || []).length;
    meta += ` • ${item.seasons || 1} Season${(item.seasons || 1) > 1 ? 's' : ''} • ${epCount} Episode${epCount !== 1 ? 's' : ''}`;
  } else if (item.source === 'youtube') {
    meta += ' • YouTube';
  } else if (item.source === 'upload' || item.source === 'created') {
    meta += ' • Your Library';
  }
  document.getElementById('detailMeta').textContent = meta;
  document.getElementById('detailDesc').textContent = item.desc || 'No description.';

  const posterEl = document.getElementById('detailPoster');
  posterEl.innerHTML = '';
  posterEl.style = '';
  if (item.poster) {
    const img = document.createElement('img');
    img.src = item.poster;
    posterEl.appendChild(img);
  } else {
    posterEl.style.background = '#333';
    posterEl.style.display = 'flex';
    posterEl.style.alignItems = 'center';
    posterEl.style.justifyContent = 'center';
    posterEl.style.padding = '20px';
    posterEl.style.textAlign = 'center';
    posterEl.textContent = item.title;
  }

  // Episodes list for series
  const epList = document.getElementById('episodesList');
  const playBtn = document.getElementById('detailPlayBtn');
  epList.innerHTML = '';
  epList.classList.add('hidden');

  if (item.type === 'series') {
    playBtn.style.display = 'none'; // series itself has no single video
    const episodes = item.episodes || [];
    if (episodes.length > 0) {
      epList.classList.remove('hidden');
      epList.innerHTML = '<h3>Episodes</h3>';
      episodes.forEach(ep => {
        const row = document.createElement('div');
        row.className = 'episode-item';
        row.innerHTML = `
          <div class="ep-info">
            <span class="ep-num">S${ep.season} E${ep.episode}</span>
            <span class="ep-title">${ep.title}</span>
          </div>
          <button class="ep-play">▶ Play</button>
        `;
        row.querySelector('.ep-play').addEventListener('click', (e) => {
          e.stopPropagation();
          playEpisode(item, ep);
        });
        row.addEventListener('click', () => playEpisode(item, ep));
        epList.appendChild(row);
      });
    } else {
      epList.classList.remove('hidden');
      epList.innerHTML = '<h3>Episodes</h3><p style="color:#888;font-size:0.9rem;">No episodes yet. Use “Add to Series” to upload videos.</p>';
    }
  } else {
    playBtn.style.display = '';
  }

  document.getElementById('detailModal').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  currentDetail = null;
}

async function playFromDetail() {
  if (!currentDetail) return;
  // If series with episodes, play first episode
  if (currentDetail.type === 'series' && currentDetail.episodes && currentDetail.episodes.length) {
    await playEpisode(currentDetail, currentDetail.episodes[0]);
  } else {
    await playItem(currentDetail);
  }
  closeDetail();
}

async function playEpisode(series, episode) {
  closeDetail();
  // Play the episode video using its own id
  const playable = {
    id: episode.id,
    title: `${series.title} – S${episode.season}E${episode.episode}: ${episode.title}`,
    desc: episode.desc || series.desc,
    hasVideo: true,
    source: 'upload'
  };
  await playItem(playable);
  // Also mark the series in continue watching
  if (!continueWatching.includes(series.id)) {
    continueWatching.unshift(series.id);
    if (continueWatching.length > 12) continueWatching.pop();
    saveContinue();
  }
}

async function playItem(item) {
  const wrapper = document.getElementById('playerWrapper');
  wrapper.innerHTML = '';
  document.getElementById('playerTitle').textContent = item.title;
  document.getElementById('playerDesc').textContent = item.desc || '';

  if (item.youtubeId) {
    const iframe = document.createElement('iframe');
    iframe.src = `https://www.youtube.com/embed/${item.youtubeId}?autoplay=1`;
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    wrapper.appendChild(iframe);
  } else if (item.hasVideo) {
    const blob = await getVideoBlob(item.id);
    if (blob) {
      const video = document.createElement('video');
      video.controls = true;
      video.autoplay = true;
      video.src = URL.createObjectURL(blob);
      wrapper.appendChild(video);
    } else {
      wrapper.innerHTML = '<p style="color:#aaa;padding:40px;text-align:center;">Video file not found in storage.</p>';
    }
  } else {
    wrapper.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#aaa;gap:12px;">
        <div style="font-size:3rem;">▶</div>
        <p>No video file attached.</p>
        <p style="font-size:0.85rem;">Upload a video or pull from YouTube to play real content.</p>
      </div>`;
  }

  // Track continue watching
  if (!continueWatching.includes(item.id)) {
    continueWatching.unshift(item.id);
    if (continueWatching.length > 12) continueWatching.pop();
    saveContinue();
  }
  // Fake progress on the item if it exists in library
  const libItem = library.find(i => i.id === item.id);
  if (libItem) {
    libItem.progress = Math.min(95, (libItem.progress || 0) + 15);
    saveLibrary();
  }
  renderRows();

  document.getElementById('playerModal').classList.add('open');
}

function closePlayer() {
  const wrapper = document.getElementById('playerWrapper');
  // Stop any playing media
  const video = wrapper.querySelector('video');
  if (video) {
    video.pause();
    URL.revokeObjectURL(video.src);
  }
  wrapper.innerHTML = '';
  document.getElementById('playerModal').classList.remove('open');
}

function playFeatured() {
  if (library.length) playItem(library[0]);
}

// ===== Search =====
document.getElementById('searchInput').addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    renderRows();
    return;
  }
  const filtered = library.filter(i =>
    i.title.toLowerCase().includes(q) ||
    (i.desc && i.desc.toLowerCase().includes(q))
  );

  // Temporarily show filtered in top picks
  const topEl = document.getElementById('topPicks');
  topEl.innerHTML = '';
  if (filtered.length === 0) {
    topEl.innerHTML = '<div class="empty-row">No results found.</div>';
  } else {
    filtered.forEach(item => topEl.appendChild(createPosterElement(item)));
  }
});

// ===== Toast =====
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  setTimeout(() => t.classList.add('hidden'), 2800);
}

// ===== Spotify =====
let spotifyItems = [];

function loadSpotify() {
  try {
    const raw = localStorage.getItem(SPOTIFY_KEY);
    spotifyItems = raw ? JSON.parse(raw) : [];
  } catch {
    spotifyItems = [];
  }
}

function saveSpotify() {
  localStorage.setItem(SPOTIFY_KEY, JSON.stringify(spotifyItems));
}

function extractSpotifyEmbed(url) {
  // Supports track, album, playlist, episode, show
  // https://open.spotify.com/track/xxx
  // https://open.spotify.com/playlist/xxx
  // https://open.spotify.com/album/xxx
  const match = url.match(/open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  const type = match[1];
  const id = match[2];
  // Compact height for tracks, taller for playlists/albums
  const height = (type === 'track' || type === 'episode') ? 152 : 352;
  return {
    type,
    id,
    embedUrl: `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`,
    height
  };
}

function addSpotify() {
  const raw = document.getElementById('spotifyUrl').value.trim();
  if (!raw) {
    showToast('Paste a Spotify link first');
    return;
  }
  const parsed = extractSpotifyEmbed(raw);
  if (!parsed) {
    showToast('Invalid Spotify link. Use open.spotify.com track/album/playlist URLs.');
    return;
  }
  // Avoid duplicates
  if (spotifyItems.some(s => s.id === parsed.id && s.type === parsed.type)) {
    showToast('Already in your Spotify list');
    return;
  }
  spotifyItems.unshift({
    ...parsed,
    originalUrl: raw,
    addedAt: Date.now()
  });
  saveSpotify();
  renderSpotify();
  document.getElementById('spotifyUrl').value = '';
  showToast('Added to Spotify section');
}

function removeSpotify(id, type) {
  spotifyItems = spotifyItems.filter(s => !(s.id === id && s.type === type));
  saveSpotify();
  renderSpotify();
  showToast('Removed');
}

function renderSpotify() {
  const list = document.getElementById('spotifyList');
  if (!list) return;
  list.innerHTML = '';
  if (spotifyItems.length === 0) {
    list.innerHTML = '<div class="spotify-empty">No Spotify items yet. Paste a track, album, or playlist link above.</div>';
    return;
  }
  spotifyItems.forEach(item => {
    const card = document.createElement('div');
    card.className = 'spotify-card';
    card.innerHTML = `
      <button class="spotify-remove" title="Remove">×</button>
      <iframe style="border-radius:8px" src="${item.embedUrl}" width="100%" height="${item.height}" frameBorder="0" allowfullscreen="" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
    `;
    card.querySelector('.spotify-remove').addEventListener('click', () => removeSpotify(item.id, item.type));
    list.appendChild(card);
  });
}

// ===== Navbar scroll =====
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 40);
});

// ===== Init =====
async function initApp() {
  await initDB();
  loadLibrary();
  loadContinue();
  loadSpotify();
  renderRows();
  renderSpotify();

  // Make logo clickable
  document.querySelector('.logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Reset button
  document.getElementById('resetBtn')?.addEventListener('click', resetApp);

  // Enter key on Spotify input
  document.getElementById('spotifyUrl')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addSpotify();
  });
}

// Start with password check
checkLogin();
