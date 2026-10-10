import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const listEl = document.getElementById('updates-list');

onValue(ref(db, 'content/updates'), (snapshot) => {
  if (!snapshot.exists()) {
    listEl.innerHTML = `
      <p class="text-center text-muted my-3">Nessun aggiornamento pubblicato ancora.</p>
    `;
    return;
  }

  const data = snapshot.val();
  const updates = Object.entries(data).map(([id, u]) => ({ id, ...u }));

  // I più recenti in cima
  updates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  listEl.innerHTML = '';
  updates.forEach(u => {
    const item = document.createElement('div');
    item.className = 'update-item';
    item.innerHTML = `
      ${u.version ? `<span class="update-version">${escapeHtml(u.version)}</span>` : ''}
      <h6 class="fw-bold mb-1">${escapeHtml(u.title || '')}</h6>
      <p class="small text-muted mb-0">${escapeHtml(u.description || '')}</p>
    `;
    listEl.appendChild(item);
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.innerText = str;
  return div.innerHTML;
}
