let profile = null;
let avatarData = '';   // the picture that will be saved ('' means none)

function profileName() {
  const q = new URLSearchParams(window.location.search).get('u');
  const me = getUser();
  return q || (me && me.username);
}

async function loadProfile() {
  const header = document.getElementById('profile-header');
  const { ok, data } = await apiFetch('/users/' + encodeURIComponent(profileName()));
  if (!ok) {
    header.innerHTML = '<div class="card"><p class="msg">User not found.</p></div>';
    return;
  }
  profile = data;
  renderHeader();
  loadPosts();
}

function renderHeader() {
  const p = profile;
  const action = p.isMe
    ? '<button class="btn btn-outline" onclick="toggleEdit()">Edit profile</button>'
    : `<button class="btn ${p.isFollowing ? 'btn-outline' : ''}" onclick="toggleFollow()">${p.isFollowing ? 'Unfollow' : 'Follow'}</button>`;

  document.getElementById('profile-header').innerHTML = `
    <div class="card profile-head">
      ${avatar(p, 'avatar-xl')}
      <div class="profile-info">
        <h2>@${esc(p.username)}</h2>
        <p>${p.bio ? esc(p.bio) : '<span class="muted">No bio yet</span>'}</p>
        <div class="stats">
          <span><strong>${p.posts}</strong> posts</span>
          <span><strong>${p.followers}</strong> followers</span>
          <span><strong>${p.following}</strong> following</span>
        </div>
        <p class="muted">Joined ${new Date(p.createdAt).toLocaleDateString()}</p>
        ${action}
      </div>
    </div>`;
}

async function loadPosts() {
  const box = document.getElementById('profile-posts');
  const { ok, data } = await apiFetch('/posts/user/' + profile.id);
  if (!ok) { box.innerHTML = `<p class="msg">${esc(data.message)}</p>`; return; }
  box.innerHTML = data.length
    ? data.map(postHtml).join('')
    : '<div class="card empty">No posts yet.</div>';
}

async function toggleFollow() {
  const { ok, data } = await apiFetch(`/users/${profile.id}/follow`, { method: 'POST' });
  if (!ok) { showToast(data.message || 'Could not update'); return; }
  profile.isFollowing = data.isFollowing;
  profile.followers = data.followers;
  renderHeader();
}

// ---------- Edit profile ----------
function showPreview() {
  document.getElementById('avatar-preview').innerHTML =
    avatar({ username: document.getElementById('e-username').value || profile.username, avatarUrl: avatarData }, 'avatar-xl');
}

function toggleEdit() {
  const panel = document.getElementById('edit-panel');
  if (panel.classList.contains('hidden')) {
    document.getElementById('e-username').value = profile.username;
    document.getElementById('e-bio').value = profile.bio || '';
    document.getElementById('e-file').value = '';
    document.getElementById('msg').textContent = '';
    avatarData = profile.avatarUrl || '';
    showPreview();
  }
  panel.classList.toggle('hidden');
}

// Crop to a square and shrink to 160 x 160 so it stays small in the database
function resizeImage(file, size = 160) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);
        const side = Math.min(img.width, img.height);
        const sx = (img.width - side) / 2;
        const sy = (img.height - side) / 2;
        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

async function onFileChosen(e) {
  const file = e.target.files[0];
  const msg = document.getElementById('msg');
  msg.textContent = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { msg.textContent = 'Please choose an image file'; return; }
  try {
    avatarData = await resizeImage(file);
    showPreview();
  } catch (err) {
    msg.textContent = err.message;
  }
}

function removeAvatar() {
  avatarData = '';
  document.getElementById('e-file').value = '';
  showPreview();
}

async function saveProfile() {
  const msg = document.getElementById('msg');
  const { ok, data } = await apiFetch('/users/me', {
    method: 'PUT',
    body: JSON.stringify({
      username: document.getElementById('e-username').value,
      bio: document.getElementById('e-bio').value,
      avatarUrl: avatarData,
    }),
  });
  if (!ok) { msg.textContent = data.message || 'Could not save'; return; }

  localStorage.setItem('user', JSON.stringify(data));   // keep the saved session in sync
  window.location.href = 'profile.html?u=' + encodeURIComponent(data.username);
}

if (requireLogin()) {
  loadProfile();
  document.getElementById('e-file').addEventListener('change', onFileChosen);
}