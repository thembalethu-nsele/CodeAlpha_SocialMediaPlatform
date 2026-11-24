function postHtml(p) {
  const me = getUser();
  const author = p.author || { username: 'deleted', _id: '' };
  const mine = me && String(author._id) === String(me.id);
  const profileLink = 'profile.html?u=' + encodeURIComponent(author.username);

  return `
    <div class="card post" id="post-${p._id}" data-author="${author._id}">
      <div class="post-head">
        <a href="${profileLink}">${avatar(author)}</a>
        <div class="post-meta">
          <a class="uname" href="${profileLink}">@${esc(author.username)}</a>
          <span class="muted">${timeAgo(p.createdAt)}</span>
        </div>
        ${mine ? `<button class="btn btn-danger btn-sm" onclick="deletePost('${p._id}')">Delete</button>` : ''}
      </div>
      <p class="post-text">${esc(p.content)}</p>
      ${p.imageUrl ? `<img class="post-img" src="${esc(p.imageUrl)}" alt="" onerror="this.style.display='none'">` : ''}
      <div class="post-actions">
        <button class="act ${p.likedByMe ? 'liked' : ''}" id="like-${p._id}" onclick="toggleLike('${p._id}')">
          ${p.likedByMe ? '♥' : '♡'} <span id="likes-${p._id}">${p.likeCount}</span>
        </button>
        <button class="act" onclick="toggleComments('${p._id}')">
          💬 <span id="ccount-${p._id}">${p.commentCount}</span>
        </button>
      </div>
      <div class="comments hidden" id="comments-${p._id}"></div>
    </div>`;
}

async function toggleLike(id) {
  const { ok, data } = await apiFetch(`/posts/${id}/like`, { method: 'POST' });
  if (!ok) { showToast(data.message || 'Could not like'); return; }
  const btn = document.getElementById('like-' + id);
  btn.classList.toggle('liked', data.liked);
  btn.innerHTML = `${data.liked ? '♥' : '♡'} <span id="likes-${id}">${data.likeCount}</span>`;
  btn.classList.add('pop');
  setTimeout(() => btn.classList.remove('pop'), 400);
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  const { ok, data } = await apiFetch('/posts/' + id, { method: 'DELETE' });
  if (!ok) { showToast(data.message || 'Could not delete'); return; }
  document.getElementById('post-' + id).remove();
  showToast('Post deleted');
}

async function toggleComments(id) {
  const box = document.getElementById('comments-' + id);
  if (!box.classList.contains('hidden')) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  await loadComments(id);
}

async function loadComments(id) {
  const box = document.getElementById('comments-' + id);
  const { ok, data } = await apiFetch(`/posts/${id}/comments`);
  if (!ok) { box.innerHTML = `<p class="msg">${esc(data.message)}</p>`; return; }

  const me = getUser();
  const postAuthor = document.getElementById('post-' + id).dataset.author;
  const list = data.map((c) => {
    const a = c.author || { username: 'deleted', _id: '' };
    const canDelete = me && (String(a._id) === String(me.id) || postAuthor === String(me.id));
    return `
      <div class="comment">
        ${avatar(a, 'avatar-sm')}
        <div class="comment-body">
          <a class="uname" href="profile.html?u=${encodeURIComponent(a.username)}">@${esc(a.username)}</a>
          <span class="muted">${timeAgo(c.createdAt)}</span>
          <p>${esc(c.text)}</p>
        </div>
        ${canDelete ? `<button class="link-btn" onclick="deleteComment('${c._id}', '${id}')">Delete</button>` : ''}
      </div>`;
  }).join('');

  box.innerHTML = `
    ${list || '<p class="muted" style="margin-bottom:10px">No comments yet. Be the first!</p>'}
    <div class="comment-form">
      <input type="text" id="cinput-${id}" maxlength="300" placeholder="Write a comment..."
             onkeydown="if (event.key === 'Enter') addComment('${id}')" />
      <button class="btn btn-sm" onclick="addComment('${id}')">Send</button>
    </div>`;
}

async function addComment(id) {
  const input = document.getElementById('cinput-' + id);
  const text = input.value.trim();
  if (!text) return;
  const { ok, data } = await apiFetch(`/posts/${id}/comments`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  if (!ok) { showToast(data.message || 'Could not comment'); return; }
  const counter = document.getElementById('ccount-' + id);
  counter.textContent = Number(counter.textContent) + 1;
  await loadComments(id);
  document.getElementById('cinput-' + id).focus();
}

async function deleteComment(commentId, postId) {
  if (!confirm('Delete this comment?')) return;
  const { ok, data } = await apiFetch('/posts/comments/' + commentId, { method: 'DELETE' });
  if (!ok) { showToast(data.message || 'Could not delete'); return; }
  const counter = document.getElementById('ccount-' + postId);
  counter.textContent = Math.max(0, Number(counter.textContent) - 1);
  loadComments(postId);
}