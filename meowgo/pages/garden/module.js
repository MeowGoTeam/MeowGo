import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import {
  getDatabase, ref, push, get, child, update, onValue, onChildAdded
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const IMGBB_API_KEY = "b2bd2cbba6ca0679055dc317aa5bf613";

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

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('meowgo_test_user')) || null;
}
function setCurrentUser(user) {
  localStorage.setItem('meowgo_test_user', JSON.stringify(user));
}
function clearCurrentUser() {
  localStorage.removeItem('meowgo_test_user');
}

function renderNavbar(activePage, requireAuth = true) {
  const currentUser = getCurrentUser();
  const navLinks = document.getElementById('nav-links');

  if (currentUser) {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'feed' ? 'text-warning' : 'text-dark'}" href="../feed/feed.html"><i class="fa-solid fa-newspaper"></i> Feed</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'garden' ? 'text-warning' : 'text-success'}" href="./garden.html"><i class="fa-solid fa-tree"></i> MeowGarden</a></li>
      <li class="nav-item"><a class="nav-link fw-bold ${activePage === 'profile' ? 'text-warning' : 'text-dark'}" href="../profile/profile.html"><i class="fa-solid fa-user"></i> Profilo (${currentUser.username})</a></li>
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

  return currentUser;
}

const currentUser = renderNavbar('garden');

if (currentUser) {
  document.getElementById('garden-owner-name').innerText = currentUser.username;
  checkBanStatus();
  listenToAdminNotifications();
  listenToMyCats();
}

// --- CONTROLLO BAN UTENTE ---
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

// --- ASCOLTO NOTIFICHE ADMIN ---
function listenToAdminNotifications() {
  if (!currentUser) return;

  const globalNotifRef = ref(db, 'notifications/global');
  onChildAdded(globalNotifRef, (snapshot) => {
    const notif = snapshot.val();
    if (notif && notif.title) {
      alert("📢 COMUNICAZIONE STAFF:\n\n" + notif.title + "\n" + (notif.message || ''));
    }
  });

  if (currentUser.id) {
    const directNotifRef = ref(db, 'notifications/direct/' + currentUser.id);
    onChildAdded(directNotifRef, (snapshot) => {
      const notif = snapshot.val();
      if (notif && notif.title) {
        alert("🔔 MESSAGGIO PRIVATO DALLO STAFF:\n\n" + notif.title + "\n" + (notif.message || ''));
      }
    });
  }
}

let myCatImageUrls = [];

function listenToMyCats() {
  const catsRef = ref(db, 'cats');
  onValue(catsRef, (snapshot) => {
    myCatImageUrls = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((post) => {
        // Ignora post eliminati
        if (currentUser && post.author === currentUser.username && post.imageUrl && post.deleted !== true) {
          myCatImageUrls.push(post.imageUrl);
        }
      });
    }
    respawnGardenCats();
  });
}

const catsCanvas = document.getElementById('cats-canvas');
const catsCtx = catsCanvas.getContext('2d');
const activeGardenCats = [];

function resizeCatsCanvas() {
  const box = document.getElementById('garden-container-box');
  if (box) {
    catsCanvas.width = box.clientWidth;
    catsCanvas.height = box.clientHeight;
  }
}

window.addEventListener('resize', () => {
  resizeCatsCanvas();
  respawnGardenCats();
});

class GardenCat {
  constructor(imgSrc) {
    this.radius = 34;
    const safeW = Math.max((catsCanvas.width || 300) - this.radius * 2, 50);
    const safeH = Math.max((catsCanvas.height || 300) - this.radius * 2, 50);

    this.x = this.radius + Math.random() * safeW;
    this.y = this.radius + Math.random() * safeH;
    this.speedX = (Math.random() - 0.5) * 1.5;
    if (Math.abs(this.speedX) < 0.4) this.speedX = 0.8;

    this.speedY = (Math.random() - 0.5) * 1.5;
    if (Math.abs(this.speedY) < 0.4) this.speedY = 0.8;

    this.img = new Image();
    this.img.crossOrigin = "anonymous";
    this.img.src = imgSrc;
  }

  update() {
    const cw = catsCanvas.width || 300;
    const ch = catsCanvas.height || 300;

    this.x += this.speedX;
    this.y += this.speedY;

    if (this.x - this.radius < 10 || this.x + this.radius > cw - 10) this.speedX *= -1;
    if (this.y - this.radius < 10 || this.y + this.radius > ch - 10) this.speedY *= -1;
  }

  draw() {
    catsCtx.save();
    catsCtx.beginPath();
    catsCtx.ellipse(this.x, this.y + this.radius - 2, this.radius * 0.8, this.radius * 0.28, 0, 0, Math.PI * 2);
    catsCtx.fillStyle = "rgba(0, 0, 0, 0.45)";
    catsCtx.fill();
    catsCtx.restore();

    catsCtx.save();
    catsCtx.beginPath();
    catsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    catsCtx.clip();

    if (this.img.complete && this.img.naturalWidth !== 0) {
      catsCtx.drawImage(this.img, this.x - this.radius, this.y - this.radius, this.radius * 2, this.radius * 2);
    } else {
      catsCtx.fillStyle = '#b45309';
      catsCtx.fill();
    }
    catsCtx.restore();

    catsCtx.beginPath();
    catsCtx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    catsCtx.strokeStyle = '#f59e0b';
    catsCtx.lineWidth = 3.5;
    catsCtx.stroke();
  }
}

function respawnGardenCats() {
  activeGardenCats.length = 0;
  if (!catsCanvas.width || !catsCanvas.height) resizeCatsCanvas();

  myCatImageUrls.forEach(url => {
    activeGardenCats.push(new GardenCat(url));
  });
}

function animate() {
  catsCtx.clearRect(0, 0, catsCanvas.width, catsCanvas.height);

  activeGardenCats.forEach(cat => {
    cat.update();
    cat.draw();
  });

  requestAnimationFrame(animate);
}

resizeCatsCanvas();
animate();
