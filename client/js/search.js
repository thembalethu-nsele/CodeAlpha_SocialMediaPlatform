let timer = null;

async function runSearch() {
  const q = document.getElementById('q').value.trim();
  const box = document.getElementById('results');
  if (!q) { box.innerHTML = ''; return; }

  const { ok, data } = await apiFetch('/users/search?q=' + encodeURIComponent(q));
  if (!ok) { box.innerHTML = `<p class="msg">${esc(data.message)}</p>`; return; }

  box.innerHTML = data.length
    ? data.map((u) => `
        <a class="card user-row" href="profile.html?u=${encodeURIComponent(u.username)}">
          ${avatar(u)}
          <div>
            <strong>@${esc(u.username)}</strong>
            <p class="muted">${esc(u.bio || '')}</p>
          </div>
        </a>`).join('')
    : '<div class="card empty">No users found.</div>';
}

if (requireLogin()) {
  // Wait 300 ms after the last keystroke so we don't search on every letter
  document.getElementById('q').addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(runSearch, 300);
  });
}