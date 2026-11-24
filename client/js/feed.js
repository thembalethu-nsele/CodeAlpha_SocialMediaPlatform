let postImage = '';   // the chosen photo, shrunk and ready to send ('' means none)

function showGreeting() {
  const me = getUser();
  if (!me) return;
  document.getElementById('me-avatar').innerHTML = avatar(me);
  document.getElementById('greeting').textContent = 'Hi, ' + me.username + '!';
}

async function loadFeed() {
  const box = document.getElementById('feed');
  const { ok, data } = await apiFetch('/posts/feed');
  if (!ok) { box.innerHTML = `<p class="msg">${esc(data.message)}</p>`; return; }
  box.innerHTML = data.length
    ? data.map(postHtml).join('')
    : '<div class="card empty">Your feed is empty. Write your first post, or <a href="search.html">search for people</a> to follow.</div>';
}

// ---------- Photo picker ----------
// Shrinks the photo to at most 800 px wide and saves it as a JPEG
function resizeImage(file, maxSide = 800) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read the file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('That file is not a valid image'));
      img.onload = () => {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showPhotoPreview() {
  const box = document.getElementById('photo-preview');
  if (!postImage) { box.classList.add('hidden'); box.innerHTML = ''; return; }
  box.classList.remove('hidden');
  box.innerHTML = `
    <img src="${postImage}" alt="Preview" />
    <button class="remove-photo" type="button" onclick="removePhoto()" title="Remove photo">&times;</button>`;
}

function removePhoto() {
  postImage = '';
  document.getElementById('photo').value = '';
  showPhotoPreview();
}

async function onPhotoChosen(e) {
  const file = e.target.files[0];
  const msg = document.getElementById('msg');
  msg.textContent = '';
  if (!file) return;
  if (!file.type.startsWith('image/')) { msg.textContent = 'Please choose an image file'; return; }
  try {
    postImage = await resizeImage(file);
    showPhotoPreview();
  } catch (err) {
    msg.textContent = err.message;
  }
}

// ---------- Create a post ----------
async function createPost() {
  const msg = document.getElementById('msg');
  const content = document.getElementById('content').value.trim();
  msg.textContent = '';
  if (!content && !postImage) { msg.textContent = 'Write something or add a photo first'; return; }

  const { ok, data } = await apiFetch('/posts', {
    method: 'POST',
    body: JSON.stringify({ content, imageUrl: postImage }),
  });
  if (!ok) { msg.textContent = data.message || 'Could not post'; return; }

  document.getElementById('content').value = '';
  document.getElementById('counter').textContent = '0 / 500';
  removePhoto();

  const box = document.getElementById('feed');
  if (box.querySelector('.empty')) box.innerHTML = '';
  box.insertAdjacentHTML('afterbegin', postHtml(data));
}

if (requireLogin()) {
  showGreeting();
  document.getElementById('content').addEventListener('input', (e) => {
    document.getElementById('counter').textContent = e.target.value.length + ' / 500';
  });
  document.getElementById('photo').addEventListener('change', onPhotoChosen);
  loadFeed();
}