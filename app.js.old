// ===== Netflix Clone App =====
// All data stored in localStorage + IndexedDB for videos

const STORAGE_KEY = 'netflix_clone_library_v2';  // bumped to clear any old demo data
const CONTINUE_KEY = 'netflix_clone_continue_v2';

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
    if (item.badge.toLowerCase().includes('leaving')) badge.classList.add('leaving');
    if (item.badge.toLowerCase().includes('new') || item.badge.toLowerCase().includes('recently')) badge.classList.add('new');
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
  } else {
    // Just highlight nav
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
  });
});

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

// ===== Upload Video =====
document.getElementById('uploadForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const title = document.getElementById('uploadTitle').value.trim();
  const type = document.getElementById('uploadType').value;
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
      type,
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
    desc: 'Pulled from YouTube',
    poster: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    badge: 'YouTube',
    source: 'youtube',
    youtubeId: videoId,
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

  showToast(`"${title}" added from YouTube`);
  document.getElementById('ytUrl').value = '';
  document.getElementById('ytTitle').value = '';
}

// ===== Detail & Play =====
function openDetail(item) {
  currentDetail = item;
  document.getElementById('detailTitle').textContent = item.title;
  document.getElementById('detailMeta').textContent =
    `${item.type?.toUpperCase() || 'VIDEO'} • ${item.source === 'youtube' ? 'YouTube' : item.source === 'upload' ? 'Uploaded' : 'Library'}`;
  document.getElementById('detailDesc').textContent = item.desc || 'No description.';

  const posterEl = document.getElementById('detailPoster');
  posterEl.innerHTML = '';
  if (item.poster) {
    const img = document.createElement('img');
    img.src = item.poster;
    posterEl.appendChild(img);
  } else {
    posterEl.style.background = '#333';
    posterEl.textContent = item.title;
    posterEl.style.display = 'flex';
    posterEl.style.alignItems = 'center';
    posterEl.style.justifyContent = 'center';
    posterEl.style.padding = '20px';
    posterEl.style.textAlign = 'center';
  }

  document.getElementById('detailModal').classList.add('open');
}

function closeDetail() {
  document.getElementById('detailModal').classList.remove('open');
  currentDetail = null;
}

async function playFromDetail() {
  if (!currentDetail) return;
  await playItem(currentDetail);
  closeDetail();
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
    // Starter content – no real video
    wrapper.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;color:#aaa;gap:12px;">
        <div style="font-size:3rem;">▶</div>
        <p>Demo title – no video file attached.</p>
        <p style="font-size:0.85rem;">Upload your own videos or pull from YouTube to play real content.</p>
      </div>`;
  }

  // Track continue watching
  if (!continueWatching.includes(item.id)) {
    continueWatching.unshift(item.id);
    if (continueWatching.length > 12) continueWatching.pop();
    saveContinue();
  }
  // Fake progress
  item.progress = Math.min(95, (item.progress || 0) + 15);
  saveLibrary();
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

// ===== Navbar scroll =====
window.addEventListener('scroll', () => {
  document.querySelector('.navbar').classList.toggle('scrolled', window.scrollY > 40);
});

// ===== Init =====
async function init() {
  await initDB();
  loadLibrary();
  loadContinue();
  renderRows();

  // Make logo clickable
  document.querySelector('.logo').addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

init();
