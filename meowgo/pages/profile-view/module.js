import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDAwgqotGF0BTUGBjxOMseMMfXpBZdAUTI",
  authDomain: "meowmaster-51991.firebaseapp.com",
  databaseURL: "https://meowmaster-51991-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "meowmaster-51991",
  storageBucket: "meowmaster-51991.firebasestorage.app",
  messagingSenderId: "1079993425259",
  appId: "1:1079993425259:web:1aa6a9e5f0a65b6ee4802e"
};

const db = getDatabase(initializeApp(firebaseConfig));
const urlParams = new URLSearchParams(window.location.search);
const targetUsername = urlParams.get('user');

let userPosts = [];
let currentPostIndex = 0;

async function loadUserProfile() {
  if (!targetUsername) {
    document.getElementById('profile-username').innerText = "Utente non specificato";
    return;
  }

  document.getElementById('profile-username').innerText = targetUsername;
  document.getElementById('grid-owner-name').innerText = targetUsername;
  document.getElementById('modal-author').innerText = targetUsername;

  const usersSnap = await get(ref(db, 'users'));
  if (usersSnap.exists()) {
    const users = usersSnap.val();
    let userEntry = null;

    for (const [uid, uData] of Object.entries(users)) {
      if (uData.username === targetUsername || uid === targetUsername) {
        userEntry = uData;
        break;
      }
    }

    if (userEntry) {
      // Gestione Foto Profilo (avatarUrl o photoURL)
      const userAvatar = userEntry.avatarUrl || userEntry.photoURL;
      if (userAvatar) {
        document.getElementById('profile-avatar-container').innerHTML = `<img src="${userAvatar}" class="avatar-circle">`;
      } else {
        document.getElementById('profile-initial').innerText = targetUsername.charAt(0).toUpperCase();
      }

      // Visualizzazione Bio
      const bioEl = document.getElementById('profile-bio');
      if (userEntry.bio) {
        bioEl.innerText = userEntry.bio;
        bioEl.classList.remove('d-none');
      } else {
        bioEl.innerText = '';
      }

      // XP e Livello
      const xp = Number(userEntry.xp) || 0;
      const level = Math.floor(xp / 1000) + 1;
      const xpInLevel = xp % 1000;
      const percent = (xpInLevel / 1000) * 100;

      document.getElementById('profile-level-text').innerText = `Livello ${level} • ${xp} XP totali`;
      document.getElementById('profile-xp-bar').style.width = `${percent}%`;
      document.getElementById('profile-xp-detail').innerText = `${xpInLevel} / 1000 XP al prossimo livello`;

      // Badge
      if (userEntry.badges) {
        const badgesContainer = document.getElementById('profile-badges');
        badgesContainer.innerHTML = '';

        Object.entries(userEntry.badges).forEach(([badgeKey, badgeData]) => {
          const title = (typeof badgeData === 'object' && badgeData.title) ? badgeData.title : badgeKey;
          const icon = (typeof badgeData === 'object' && badgeData.icon) ? badgeData.icon : 'fa-medal';

          badgesContainer.innerHTML += `
            <div class="badge-item" title="${title}">
              <div class="badge-icon-box"><i class="fa-solid ${icon}"></i></div>
              <span class="small fw-bold text-dark text-truncate w-100">${title}</span>
            </div>
          `;
        });
      }
    } else {
      document.getElementById('profile-initial').innerText = targetUsername.charAt(0).toUpperCase();
    }
  }

  // Caricamento Post
  const postsSnap = await get(ref(db, 'cats'));
  const gridContainer = document.getElementById('user-posts-grid');
  gridContainer.innerHTML = '';
  userPosts = [];

  if (postsSnap.exists()) {
    const postsData = postsSnap.val();
    Object.keys(postsData).forEach(key => {
      const post = postsData[key];
      if (!post.deleted && (post.author === targetUsername || post.username === targetUsername)) {
        userPosts.push({ id: key, ...post });
      }
    });

    if (userPosts.length > 0) {
      userPosts.forEach((post, index) => {
        const thumb = document.createElement('img');
        thumb.src = post.imageUrl || post.image;
        thumb.className = 'grid-thumbnail';
        thumb.addEventListener('click', () => openIgModal(index));
        gridContainer.appendChild(thumb);
      });
    } else {
      gridContainer.innerHTML = `<div class="text-muted text-center py-3" style="grid-column: span 4;">Nessun post pubblicato.</div>`;
    }
  }
}

function openIgModal(index) {
  currentPostIndex = index;
  updateModalContent();
  document.getElementById('ig-modal').style.display = 'flex';
}

function updateModalContent() {
  const post = userPosts[currentPostIndex];
  document.getElementById('modal-img').src = post.imageUrl || post.image;
  document.getElementById('modal-cat-name').innerText = post.catName || post.title || 'Senza nome';
  document.getElementById('modal-date').innerText = post.date || post.createdAt || '';
}

document.getElementById('ig-prev-btn').addEventListener('click', () => {
  if (currentPostIndex > 0) {
    currentPostIndex--;
    updateModalContent();
  }
});

document.getElementById('ig-next-btn').addEventListener('click', () => {
  if (currentPostIndex < userPosts.length - 1) {
    currentPostIndex++;
    updateModalContent();
  }
});

document.getElementById('ig-close-btn').addEventListener('click', () => {
  document.getElementById('ig-modal').style.display = 'none';
});

document.getElementById('ig-modal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('ig-modal')) {
    document.getElementById('ig-modal').style.display = 'none';
  }
});

loadUserProfile();
