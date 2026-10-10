import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue, push, remove } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAwgqotGF0BTUGBjxOMseMMfXpBZdAUTI",
  authDomain: "meowmaster-51991.firebaseapp.com",
  databaseURL: "https://meowmaster-51991-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "meowmaster-51991",
  storageBucket: "meowmaster-51991.firebasestorage.app",
  messagingSenderId: "1079993425259",
  appId: "1:1079993425259:web:1aa6a9e5f0a65b6ee4802e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
let selectedPostForShare = null;
let shareModalInstance = null;
let usersCache = {}; // Cache per memorizzare le foto profilo degli utenti

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('meowgo_test_user')) || null;
}
function clearCurrentUser() {
  localStorage.removeItem('meowgo_test_user');
}

function renderNavbar(activePage) {
  const currentUser = getCurrentUser();
  const navLinks = document.getElementById('nav-links');

  if (currentUser) {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'feed' ? 'text-warning' : 'text-dark'}" href="./feed.html"><i class="fa-solid fa-newspaper"></i> Feed</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'garden' ? 'text-warning' : 'text-success'}" href="../garden/garden.html"><i class="fa-solid fa-tree"></i> MeowGarden</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'profile' ? 'text-warning' : 'text-dark'}" href="../profile/profile.html"><i class="fa-solid fa-user"></i> Profilo (${currentUser.username})</a></li>
      <li class="nav-item"><a class="nav-link fw-bold text-danger" href="#" id="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
    `;
    document.getElementById('logout-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      clearCurrentUser();
      window.location.href = '../login/login.html';
    });
  } else {
    window.location.replace('../login/login.html');
  }
  return currentUser;
}

const currentUser = renderNavbar('feed');
if (currentUser) {
  initFeed();
  setupNotificationsListener(currentUser);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('../../sw.js').then(reg => {
      console.log('Service Worker attivo per le notifiche di sistema.');
    });
  }
}

// Precarica la mappa degli utenti per associare la foto profilo (avatarUrl o photoURL)
async function preloadUsers() {
  const usersSnap = await get(ref(db, 'users'));
  if (usersSnap.exists()) {
    const data = usersSnap.val();
    Object.values(data).forEach(uData => {
      if (uData.username) {
        usersCache[uData.username] = uData.avatarUrl || uData.photoURL || null;
      }
    });
  }
}

async function initFeed() {
  await preloadUsers();
  listenToFeed();
}

function setupNotificationsListener(user) {
  const globalRef = ref(db, 'notifications/global');
  onValue(globalRef, (snapshot) => {
    if (snapshot.exists()) {
      const globals = snapshot.val();
      let dismissed = JSON.parse(localStorage.getItem('dismissed_globals') || '[]');

      for (let id in globals) {
        if (!dismissed.includes(id)) {
          showSystemNotification(globals[id].title || 'MeowGo', globals[id].message || globals[id].body || 'Nuova notifica');
          dismissed.push(id);
          localStorage.setItem('dismissed_globals', JSON.stringify(dismissed));
        }
      }
    }
  });

  if (user && user.id) {
    const directRef = ref(db, `notifications/direct/${user.id}`);
    onValue(directRef, async (snapshot) => {
      if (snapshot.exists()) {
        const directs = snapshot.val();
        for (let id in directs) {
          const n = directs[id];
          showSystemNotification(n.title || 'MeowGo', n.message || n.body || 'Hai un nuovo messaggio');
          await remove(ref(db, `notifications/direct/${user.id}/${id}`));
        }
      }
    });
  }
}

function showSystemNotification(title, body) {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(title, {
        body: body,
        icon: '../../assets/icons/icon-192.png',
        badge: '../../assets/icons/icon-192.png',
        vibrate: [100, 50, 100]
      });
    });
  }
}

function formatPostTimestamp(post) {
  if (post.date && post.time) {
    return `${post.date} - ${post.time}`;
  } else if (post.createdAt) {
    const d = new Date(post.createdAt);
    return `${d.toLocaleDateString('it-IT')} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return post.time || '';
}

function listenToFeed() {
  const catsRef = ref(db, 'cats');
  onValue(catsRef, (snapshot) => {
    const container = document.getElementById('feed-container');
    container.innerHTML = '';

    if (snapshot.exists()) {
      const data = snapshot.val();
      const catList = Object.keys(data).map(key => ({ id: key, ...data[key] })).reverse();

      catList.forEach((post) => {
        if (post.deleted === true) return;

        const authorName = post.author || 'Utente Sconosciuto';
        const authorAvatar = usersCache[authorName];

        // Genera l'HTML dell'avatar o l'iniziale di riserva
        let avatarHtml = '';
        if (authorAvatar) {
          avatarHtml = `<img src="${authorAvatar}" class="post-avatar me-2" alt="${authorName}">`;
        } else {
          const initial = authorName.charAt(0).toUpperCase();
          avatarHtml = `<div class="post-avatar-placeholder me-2">${initial}</div>`;
        }

        const likesMap = post.likes || {};
        const likesCount = Object.keys(likesMap).length;
        const isLiked = currentUser && likesMap[currentUser.id];

        const commentsMap = post.comments || {};
        const commentsCount = Object.keys(commentsMap).length;

        const dateTimeStr = formatPostTimestamp(post);

        const card = document.createElement('div');
        card.className = "glass-card overflow-hidden";
        card.innerHTML = `
          <div class="p-3 d-flex align-items-center justify-content-between border-bottom">
            <div class="d-flex align-items-center" style="cursor: pointer;" onclick="window.location.href='../profile-view/profile-view.html?user=${encodeURIComponent(authorName)}'">
              ${avatarHtml}
              <div>
                <h6 class="mb-0 fw-bold text-dark">${authorName}</h6>
              </div>
            </div>
            <span class="small text-muted"><i class="fa-regular fa-calendar-days me-1"></i>${dateTimeStr}</span>
          </div>
          <img src="${post.imageUrl}" class="cat-post-img" alt="${post.catName}">
          <div class="p-3">
            <div class="d-flex align-items-center gap-3 mb-2">
              <button class="btn btn-link p-0 text-decoration-none btn-like fs-4 ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
                <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
              </button>
              <span class="fw-bold text-dark">${likesCount}</span>

              <button class="btn btn-link p-0 text-decoration-none btn-comment fs-4 ms-2" onclick="toggleCommentsSection('${post.id}')" title="Commenti">
                <i class="fa-regular fa-comment"></i>
              </button>
              <span class="fw-bold text-dark" id="comments-count-${post.id}">${commentsCount}</span>

              <button class="btn btn-link p-0 text-decoration-none btn-share fs-4 ms-auto" onclick="openShareModal('${post.id}')" title="Condividi">
                <i class="fa-solid fa-share-nodes"></i>
              </button>
            </div>
            <h5 class="fw-bold text-dark mb-2">${post.catName}</h5>

            <!-- SEZIONE COMMENTI -->
            <div id="comments-box-${post.id}" class="d-none mt-3 pt-3 border-top">
              <div class="fw-bold small text-muted mb-2"><i class="fa-solid fa-comments me-1"></i> Commenti della community</div>
              <div id="comments-list-${post.id}" class="mb-3" style="max-height: 200px; overflow-y: auto;">
              </div>

              <div class="small text-muted mb-1">Scegli un commento rapido:</div>
              <div class="d-flex flex-wrap gap-1">
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '❤️ Adorabile!')">❤️ Adorabile!</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '📸 Che foto!')">📸 Che foto!</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '👋 Ciao micio!')">👋 Ciao micio!</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '😻')">😻</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '😼')">😼</button>
                <button class="btn btn-sm btn-outline-secondary rounded-pill" onclick="postComment('${post.id}', '😹')">😹</button>
              </div>
            </div>

          </div>
        `;
        container.appendChild(card);

        listenToComments(post.id);
      });

      // Gestione condivisione tramite dataset
      window.openShareModal = (postId) => {
        selectedPostForShare = catList.find(p => p.id === postId);
        if (!shareModalInstance) {
          shareModalInstance = new bootstrap.Modal(document.getElementById('shareModal'));
        }
        shareModalInstance.show();
      };
    }
  });
}

window.toggleLike = async function (postId) {
  if (!currentUser) return;
  const likeRef = ref(db, `cats/${postId}/likes/${currentUser.id}`);
  const snap = await get(likeRef);
  if (snap.exists()) {
    await update(ref(db, `cats/${postId}/likes`), { [currentUser.id]: null });
  } else {
    await update(ref(db, `cats/${postId}/likes`), { [currentUser.id]: true });
  }
};

window.toggleCommentsSection = function (postId) {
  const box = document.getElementById(`comments-box-${postId}`);
  if (box) {
    box.classList.toggle('d-none');
  }
};

window.postComment = async function (postId, text) {
  if (!currentUser) return;
  const commentsRef = ref(db, `cats/${postId}/comments`);
  await push(commentsRef, {
    author: currentUser.username,
    text: text,
    createdAt: Date.now()
  });
};

window.deleteComment = async function (postId, commentId) {
  if (!currentUser) return;
  await remove(ref(db, `cats/${postId}/comments/${commentId}`));
};

window.sharePostLink = async function () {
  if (!selectedPostForShare) return;
  const shareUrl = `${window.location.origin}${window.location.pathname}#post-${selectedPostForShare.id}`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: `MeowGo - ${selectedPostForShare.catName}`,
        text: `Guarda questo post di ${selectedPostForShare.author} su MeowGo!`,
        url: shareUrl,
      });
    } catch (err) {
      console.log('Condivisione annullata');
    }
  } else {
    await navigator.clipboard.writeText(shareUrl);
    alert('Link copiato negli appunti!');
  }
  shareModalInstance.hide();
};

window.sharePostImage = async function () {
  if (!selectedPostForShare) return;

  // Popola il template di condivisione pulito (senza commenti)
  document.getElementById('card-share-author').textContent = selectedPostForShare.author;
  document.getElementById('card-share-date').textContent = formatPostTimestamp(selectedPostForShare);
  document.getElementById('card-share-name').textContent = selectedPostForShare.catName;
  document.getElementById('card-share-likes').textContent = Object.keys(selectedPostForShare.likes || {}).length;

  const imgTarget = document.getElementById('card-share-img');
  imgTarget.src = selectedPostForShare.imageUrl;

  // Attende il caricamento dell'immagine nel DOM nascosto
  imgTarget.onload = async () => {
    const shareTarget = document.getElementById('share-card-target');
    const canvas = await html2canvas(shareTarget, { useCORS: true, allowTaint: true, scale: 2 });

    canvas.toBlob(async (blob) => {
      const file = new File([blob], `${selectedPostForShare.catName}_meowgo.png`, { type: 'image/png' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            files: [file],
            title: selectedPostForShare.catName,
            text: `Post di ${selectedPostForShare.author} su MeowGo!`,
          });
        } catch (e) {
          console.log('Condivisione immagine annullata');
        }
      } else {
        // Fallback: download dell'immagine
        const link = document.createElement('a');
        link.download = `${selectedPostForShare.catName}_meowgo.png`;
        link.href = canvas.toDataURL();
        link.click();
      }
      shareModalInstance.hide();
    });
  };
};

function listenToComments(postId) {
  const commentsRef = ref(db, `cats/${postId}/comments`);
  onValue(commentsRef, (snapshot) => {
    const listContainer = document.getElementById(`comments-list-${postId}`);
    const countSpan = document.getElementById(`comments-count-${postId}`);
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (snapshot.exists()) {
      const data = snapshot.val();
      const commentKeys = Object.keys(data);

      if (countSpan) countSpan.textContent = commentKeys.length;

      commentKeys.forEach(key => {
        const comment = data[key];
        const isOwner = currentUser && comment.author === currentUser.username;

        const bubble = document.createElement('div');
        bubble.className = 'comment-bubble';
        bubble.innerHTML = `
          <div><strong>${comment.author}:</strong> ${comment.text}</div>
          ${isOwner ? `<button class="btn btn-link text-danger p-0 ms-auto" onclick="deleteComment('${postId}', '${key}')" title="Elimina commento"><i class="fa-solid fa-trash-can fa-sm"></i></button>` : ''}
        `;
        listContainer.appendChild(bubble);
      });
    } else {
      if (countSpan) countSpan.textContent = '0';
      listContainer.innerHTML = '<div class="text-muted small fst-italic">Nessun commento ancora. Sii il primo a commentare con un tocco!</div>';
    }
  });
}
