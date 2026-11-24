const API = '/api';

// ---------- Session ----------
function getUser() { return JSON.parse(localStorage.getItem('user') || 'null'); }
function getToken() { return localStorage.getItem('token'); }
function saveSession(data) {
  localStorage.setItem('token', data.token);
  localStorage.setItem('user', JSON.stringify(data.user));
}
function logout() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.href = 'login.html';
}
function requireLogin() {
  if (!getToken()) { window.location.href = 'login.html'; return false; }
  return true;
}

// ---------- Helpers ----------
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'just now';
  const m = Math.floor(s / 60);
  if (m < 60) return m + ' min ago';
  const h = Math.floor(m / 60);
  if (h < 24) return h + ' h ago';
  const d = Math.floor(h / 24);
  if (d < 7) return d + ' d ago';
  return new Date(date).toLocaleDateString();
}

function showToast(text) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = text;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2000);
}

// Round profile picture, or a coloured circle with the first letter
function avatar(user, size = '') {
  const letter = esc(((user && user.username) || '?')[0].toUpperCase());
  const cls = 'avatar ' + size;
  if (user && user.avatarUrl) {
    return `<img class="${cls}" src="${esc(user.avatarUrl)}" alt="" data-letter="${letter}" onerror="avatarError(this)">`;
  }
  return `<span class="${cls} avatar-fallback">${letter}</span>`;
}
function avatarError(img) {
  const span = document.createElement('span');
  span.className = img.className + ' avatar-fallback';
  span.textContent = img.dataset.letter;
  img.replaceWith(span);
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const res = await fetch(API + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && token) logout();
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: { message: 'Cannot reach the server' } };
  }
}

// ---------- Navbar ----------
function renderNav() {
  const el = document.getElementById('nav-links');
  if (!el) return;
  const u = getUser();
  el.innerHTML = u
    ? `<a href="index.html">Feed</a>
       <a href="search.html">Search</a>
       <a href="profile.html?u=${encodeURIComponent(u.username)}">Profile</a>
       <a href="#" onclick="logout(); return false;">Logout</a>`
    : '<a href="login.html">Login</a><a href="register.html">Register</a>';
}

// ---------- Register / Login ----------
async function sendAuth(path, body) {
  const msg = document.getElementById('msg');
  const { ok, data } = await apiFetch('/auth/' + path, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!ok) { msg.textContent = data.message || 'Something went wrong'; return; }
  saveSession(data);
  window.location.href = 'index.html';
}
function register() {
  sendAuth('register', {
    username: document.getElementById('username').value,
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
}
function login() {
  sendAuth('login', {
    email: document.getElementById('email').value,
    password: document.getElementById('password').value,
  });
}

// Pressing Enter in a form field clicks the main button
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
    const btn = document.querySelector('[data-enter]');
    if (btn) btn.click();
  }
});

renderNav();