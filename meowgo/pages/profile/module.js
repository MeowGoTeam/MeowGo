import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child, update, remove, onValue, onChildAdded } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";

// Vecchia API Key ImgBB ripristinata
const IMGBB_API_KEY = "82fcd1a9192375d6c456c52e7979599c";

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
let messaging = null;

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('meowgo_test_user')) || null;
}
function setCurrentUser(user) {
  localStorage.setItem('meowgo_test_user', JSON.stringify(user));
}
function clearCurrentUser() {
  localStorage.removeItem('meowgo_test_user');
}

const currentUser = getCurrentUser();

try {
  messaging = getMessaging(app);
  Notification.requestPermission().then(async (permission) => {
    if (permission === 'granted' && 'serviceWorker' in navigator) {
      const swReg = await navigator.serviceWorker.register('../../firebase-messaging-sw.js');
      const token = await getToken(messaging, { serviceWorkerRegistration: swReg });
      if (token && currentUser) {
        update(ref(db, `users/${currentUser.id}`), { fcmToken: token });
      }
    }
  });
} catch (e) {
  console.warn("FCM non supportato in questo browser:", e);
}

if (messaging) {
  onMessage(messaging, (payload) => {
    if (payload.notification) {
      sendNativeNotification(payload.notification.title || "MeowGo", payload.notification.body || "", payload.notification.image);
    }
  });
}

async function sendNativeNotification(title, body, imageUrl = null) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const options = {
    body: body || "",
    icon: '../../assets/icons/icon-512.png',
    badge: '../../assets/icons/icon-512.png',
    image: imageUrl || null,
    vibrate: [100, 50, 100],
    data: { url: new URL('../feed/feed.html', location.href).href },
    actions: [
      { action: 'open', title: '👀 Guarda Feed' },
      { action: 'close', title: 'Chiudi' }
    ]
  };

  try {
    const reg = await navigator.serviceWorker.ready;
    if (reg && reg.showNotification) {
      await reg.showNotification(title || "MeowGo", options);
    } else {
      new Notification(title || "MeowGo", options);
    }
  } catch (err) {
    console.warn("Errore notifica nativa:", err);
  }
}

function renderNavbar(activePage, requireAuth = true) {
  const activeUser = getCurrentUser();
  const navLinks = document.getElementById('nav-links');

  if (activeUser) {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'feed' ? 'text-warning' : 'text-dark'}" href="../feed/feed.html"><i class="fa-solid fa-newspaper"></i> Feed</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'garden' ? 'text-warning' : 'text-success'}" href="../garden/garden.html"><i class="fa-solid fa-tree"></i> MeowGarden</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'profile' ? 'text-warning' : 'text-dark'}" href="./profile.html"><i class="fa-solid fa-user"></i> Profilo (${activeUser.username})</a></li>
      <li class="nav-item"><a class="nav-link fw-bold text-danger" href="#" id="logout-link"><i class="fa-solid fa-right-from-bracket"></i> Logout</a></li>
    `;
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearCurrentUser();
        window.location.href = '../login/login.html';
      });
    }
  } else {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link fw-bold text-dark" href="../login/login.html"><i class="fa-solid fa-right-to-bracket"></i> Accedi</a></li>
    `;
    if (requireAuth && activePage !== 'login') {
      window.location.replace('../login/login.html');
    }
  }

  return activeUser;
}

renderNavbar('profile');

function renderProfileHeader(user) {
  if (!user) return;
  document.getElementById('user-display-name').innerText = user.username;
  document.getElementById('user-email-badge').innerText = user.email;

  const bioEl = document.getElementById('user-bio');
  bioEl.innerText = user.bio ? user.bio : '';

  const avatarEl = document.getElementById('user-avatar');
  if (user.photoURL) {
    avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Foto profilo di ${user.username}">`;
  } else {
    avatarEl.innerHTML = '😸';
  }
}

if (currentUser) {
  renderProfileHeader(currentUser);
  checkBanStatus();
  listenToAdminNotifications();
  updateUI();

  onValue(ref(db, `users/${currentUser.id}`), (snapshot) => {
    if (snapshot.exists()) {
      const dbUser = { ...currentUser, ...snapshot.val() };
      setCurrentUser(dbUser);
      renderProfileHeader(dbUser);
    }
  });
}

function checkBanStatus() {
  if (!currentUser || !currentUser.id) return;
  const userRef = ref(db, 'users/' + currentUser.id);
  onValue(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const userData = snapshot.val();
      if (userData.bannedUntil) {
        const isBanned = userData.bannedUntil === 'indefinite' || new Date(userData.bannedUntil) > new Date();
        if (isBanned) {
          clearCurrentUser();
          document.body.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px; font-family:sans-serif;">
              <h1 style="color: #dc2626; font-size: 2.5rem; font-weight: bold;">⛔ ACCOUNT BLOCCATO</h1>
              <p style="font-size: 1.2rem; color: #4b5563;">Sei stato sospeso da MeowGo.</p>
              <p><strong>Motivo:</strong> ${userData.banReason || 'Violazione delle regole della community'}</p>
              <a href="../login/login.html" class="btn btn-warning mt-3">Torna alla Login</a>
            </div>
          `;
        }
      }
    }
  });
}

function listenToAdminNotifications() {
  if (!currentUser) return;

  const globalNotifRef = ref(db, 'notifications/global');
  onChildAdded(globalNotifRef, (snapshot) => {
    const notif = snapshot.val();
    const notifId = snapshot.key;
    const lastSeenGlobal = localStorage.getItem('meowgo_last_seen_global') || '';

    if (notif && notifId !== lastSeenGlobal) {
      sendNativeNotification(notif.title || "MeowGo", notif.message || "");
      localStorage.setItem('meowgo_last_seen_global', notifId);
    }
  });

  if (currentUser.id) {
    const directNotifRef = ref(db, 'notifications/direct/' + currentUser.id);
    onChildAdded(directNotifRef, (snapshot) => {
      const notif = snapshot.val();
      const notifId = snapshot.key;

      if (notif && notif.read !== true) {
        sendNativeNotification(notif.title || "MeowGo", notif.message || "");

        update(ref(db, `notifications/direct/${currentUser.id}/${notifId}`), {
          read: true
        }).catch(err => console.error("Errore aggiornamento stato notifica:", err));
      }
    });
  }
}

const deleteModalEl = document.getElementById('deletePostModal');
const deleteModal = new bootstrap.Modal(deleteModalEl);
const settingsSidebarEl = document.getElementById('settings-sidebar');
const settingsSidebar = bootstrap.Offcanvas.getOrCreateInstance(settingsSidebarEl);

document.getElementById('open-delete-modal-btn').addEventListener('click', () => {
  settingsSidebar.hide();
  loadMyPosts();
  deleteModal.show();
});

const sidebarLogoutLink = document.getElementById('sidebar-logout-link');
if (sidebarLogoutLink) {
  sidebarLogoutLink.addEventListener('click', (e) => {
    e.preventDefault();
    clearCurrentUser();
    window.location.href = '../login/login.html';
  });
}

function formatPostTimestamp(post) {
  if (post.date && post.time) {
    return `${post.date} - ${post.time}`;
  } else if (post.createdAt) {
    const d = new Date(post.createdAt);
    return `${d.toLocaleDateString('it-IT')} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else {
    return post.time || 'Data non disponibile';
  }
}

async function loadMyPosts() {
  const container = document.getElementById('my-posts-list');
  container.innerHTML = '<p class="text-center text-muted my-3">Caricamento post...</p>';

  try {
    const snapshot = await get(ref(db, 'cats'));
    if (!snapshot.exists()) {
      container.innerHTML = '<p class="text-center text-muted my-3">Non hai ancora pubblicato nessun post.</p>';
      return;
    }

    const data = snapshot.val();
    const myPosts = [];
    for (let key in data) {
      if (data[key].author === currentUser.username && data[key].deleted !== true) {
        myPosts.push({ id: key, ...data[key] });
      }
    }

    if (myPosts.length === 0) {
      container.innerHTML = '<p class="text-center text-muted my-3">Non hai ancora pubblicato nessun post attivo.</p>';
      return;
    }

    container.innerHTML = '';
    myPosts.reverse().forEach(post => {
      const dateTimeStr = formatPostTimestamp(post);
      const item = document.createElement('div');
      item.className = "d-flex align-items-center justify-content-between p-2 border rounded-3 bg-white shadow-sm";
      item.innerHTML = `
        <div class="d-flex align-items-center gap-3">
          <img src="${post.imageUrl}" class="my-post-thumb" alt="${post.catName}">
          <div>
            <h6 class="mb-0 fw-bold text-dark">${post.catName}</h6>
            <small class="text-muted"><i class="fa-regular fa-calendar-days me-1"></i>${dateTimeStr}</small>
          </div>
        </div>
        <button class="btn btn-outline-danger btn-sm rounded-3 ms-2" onclick="confirmAndDeletePost('${post.id}')">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;
      container.appendChild(item);
    });

  } catch (err) {
    container.innerHTML = `<p class="text-danger small my-3">${err.message}</p>`;
  }
}

window.confirmAndDeletePost = async function(postId) {
  const confirmed = confirm("Sei sicuro di cancellare questo post? Se lo cancelli diminuiranno anche i punti XP perché quando andrai a cancellare il post dal database andrai in automatico anche a cancellare l'XP dell'utente.");
  if (!confirmed) return;

  try {
    await remove(ref(db, `cats/${postId}`));

    currentUser.xp = Math.max(0, (currentUser.xp || 0) - 100);
    currentUser.catsFound = Math.max(0, (currentUser.catsFound || 0) - 1);
    setCurrentUser(currentUser);

    await update(ref(db, `users/${currentUser.id}`), {
      xp: currentUser.xp,
      catsFound: currentUser.catsFound
    });

    updateUI();
    loadMyPosts();

  } catch (err) {
    alert("Errore durante l'eliminazione: " + err.message);
  }
};

document.getElementById('upload-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const nameInput = document.getElementById('cat-name-input');
  const photoInput = document.getElementById('cat-photo-input');
  const uploadBtn = document.getElementById('upload-btn');

  if (!photoInput.files || !photoInput.files[0] || !currentUser) return;

  const catName = nameInput.value.trim();
  const n = catName.toLowerCase();

  uploadBtn.disabled = true;
  uploadBtn.innerHTML = `Caricamento... ⏳`;

  try {
    const formData = new FormData();
    formData.append("image", photoInput.files[0]);

    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: "POST", body: formData
    });
    const result = await response.json();

    if (!result.success) throw new Error("Errore durante il caricamento dell'immagine.");

    const imageUrl = result.data.url;
    const now = new Date();

    const newCatRef = push(ref(db, 'cats'));
    await update(newCatRef, {
      author: currentUser.username,
      catName: catName,
      imageUrl: imageUrl,
      createdAt: Date.now(),
      date: now.toLocaleDateString('it-IT'),
      time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    if (!currentUser.badges) currentUser.badges = {};

    let unlockedSecret = false;
    const rules = [
      { key: 'pelata', words: ['pelata', 'pelato', 'sfinge', 'sphynx', 'calvo', 'gatito'] },
      { key: 'maranza', words: ['maranza', 'tuta', 'tn'] },
      { key: 'police', words: ['poliziotto', 'sbirro', 'agente'] },
      { key: 'marescialla', words: ['marescialla', 'poliziotta'] },
      { key: 'pizza', words: ['pizza', 'margherita', 'pizzaiolo'] },
      { key: 'space', words: ['spazio', 'astro', 'alieno', 'ufo'] },
      { key: 'ninja', words: ['ninja', 'shinobi', 'ombra'] },
      { key: 'wizard', words: ['mago', 'wizard', 'magia', 'merlino'] },
      { key: 'royal', words: ['re', 'regina', 'principe', 'principessa'] },
      { key: 'pirate', words: ['pirata', 'ciurma', 'tesoro'] },
      { key: 'rocker', words: ['rock', 'metal', 'chitarra'] },
      { key: 'chef', words: ['chef', 'cucina', 'cuoco'] },
      { key: 'hero', words: ['hero', 'superman', 'batman', 'eroe'] },
      { key: 'hacker', words: ['hacker', 'code', 'cyber'] },
      { key: 'detective', words: ['sherlock', 'detective', 'spia'] },
      { key: 'vampire', words: ['vampiro', 'dracula', 'frenk'] },
      { key: 'ghost', words: ['fantasma', 'ghost', 'spettro'] },
      { key: 'zombie', words: ['zombie', 'nonmorto'] },
      { key: 'soccer', words: ['gol', 'calcio', 'pallone', 'inter', 'milan', 'juve'] },
      { key: 'artist', words: ['arte', 'pittore', 'picasso'] },
      { key: 'gamer', words: ['gamer', 'play', 'xbox', 'gaming'] }
    ];

    rules.forEach(rule => {
      if (rule.words.some(w => n.includes(w))) {
        currentUser.badges[rule.key] = true;
        unlockedSecret = true;
      }
    });

    currentUser.catsFound = (currentUser.catsFound || 0) + 1;
    currentUser.xp = (currentUser.xp || 0) + 100;
    setCurrentUser(currentUser);

    await update(ref(db, `users/${currentUser.id}`), {
      xp: currentUser.xp,
      catsFound: currentUser.catsFound,
      badges: currentUser.badges
    });

    confetti({ particleCount: unlockedSecret ? 120 : 50, spread: 70, origin: { y: 0.6 } });
    updateUI();

    if (unlockedSecret) {
      await sendNativeNotification("🏆 Badge Segreto Sbloccato!", `Hai sbloccato un badge speciale con ${catName}!`, imageUrl);
    } else {
      await sendNativeNotification("📸 Gatto Registrato!", `Hai aggiunto ${catName}! +100 XP guadagnati.`, imageUrl);
    }

    nameInput.value = '';
    photoInput.value = '';

    setTimeout(() => {
      window.location.href = '../feed/feed.html';
    }, 1000);

  } catch (err) {
    alert("Errore caricamento: " + err.message);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.innerHTML = `🌿 Carica Gatto`;
  }
});

function updateUI() {
  if (!currentUser) return;
  const xp = currentUser.xp || 0;
  const catsFound = currentUser.catsFound || 0;
  const level = Math.floor(xp / 1000) + 1;
  const b = currentUser.badges || {};

  document.getElementById('user-level').innerText = level;
  document.getElementById('user-xp').innerText = xp % 1000;
  document.getElementById('xp-bar').style.width = `${(xp % 1000) / 10}%`;

  document.getElementById('badge-first').classList.toggle('unlocked', catsFound >= 1);
  document.getElementById('badge-hunter').classList.toggle('unlocked', catsFound >= 5);
  document.getElementById('badge-master').classList.toggle('unlocked', catsFound >= 10);
  document.getElementById('badge-lvl2').classList.toggle('unlocked', level >= 2);

  const badgeKeys = ['pelata', 'maranza', 'police', 'marescialla', 'pizza', 'space', 'ninja', 'wizard', 'royal', 'pirate', 'rocker', 'chef', 'hero', 'hacker', 'detective', 'vampire', 'ghost', 'zombie', 'soccer', 'artist', 'gamer'];
  let countUnlockedSecrets = 0;

  badgeKeys.forEach(k => {
    const colEl = document.getElementById(`col-badge-${k}`);
    if (colEl) {
      const isUnlocked = !!b[k];
      colEl.classList.toggle('unlocked', isUnlocked);
      if (isUnlocked) countUnlockedSecrets++;
    }
  });

  const secretSection = document.getElementById('secret-badges-section');
  if (secretSection) {
    if (countUnlockedSecrets > 0) {
      secretSection.classList.remove('d-none');
    } else {
      secretSection.classList.add('d-none');
    }
  }
}
