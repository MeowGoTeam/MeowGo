import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, get, child, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";
// Importiamo le funzioni del modulo notifiche centralizzato
import { sendWelcomeNotification, requestNotificationPermission } from "../../assets/js/notifications.js";

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

if (getCurrentUser()) {
  window.location.replace('../feed/feed.html');
}

let isRegisterMode = false;

window.toggleAuthMode = function () {
  isRegisterMode = !isRegisterMode;
  document.getElementById('auth-error').classList.add('d-none');

  if (isRegisterMode) {
    document.getElementById('auth-title').innerText = "Nuova Registrazione";
    document.getElementById('auth-subtitle').innerText = "Salva utente.";
    document.getElementById('username-container').classList.remove('d-none');
    document.getElementById('auth-username').setAttribute('required', 'true');
    document.getElementById('auth-submit-btn').innerText = "Registrati Ora 🚀";
    document.getElementById('auth-switch-text').innerText = "Hai già un account?";
  } else {
    document.getElementById('auth-title').innerText = "Accedi a MeowGo";
    document.getElementById('auth-subtitle').innerText = "Verifica credenziali.";
    document.getElementById('username-container').classList.add('d-none');
    document.getElementById('auth-username').removeAttribute('required');
    document.getElementById('auth-submit-btn').innerText = "Accedi 🚀";
    document.getElementById('auth-switch-text').innerText = "Non hai ancora un account?";
  }
};

document.getElementById('auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email = document.getElementById('auth-email').value.trim().toLowerCase();
  const password = document.getElementById('auth-password').value;
  const username = document.getElementById('auth-username').value.trim();
  const errorDiv = document.getElementById('auth-error');
  const submitBtn = document.getElementById('auth-submit-btn');

  errorDiv.classList.add('d-none');
  submitBtn.disabled = true;

  try {
    // Richiedi i permessi delle notifiche durante il flusso di accesso/registrazione
    await requestNotificationPermission();

    const dbRef = ref(db);
    const snapshot = await get(child(dbRef, 'users'));
    const usersData = snapshot.exists() ? snapshot.val() : {};

    let currentUser;

    if (isRegisterMode) {
      for (let id in usersData) {
        if (usersData[id].email === email) throw new Error("Email già registrata!");
      }

      const newUserRef = push(ref(db, 'users'));
      const newUser = { username, email, password, xp: 0, catsFound: 0, badges: {} };

      await update(newUserRef, newUser);
      currentUser = { id: newUserRef.key, ...newUser };

      // Invia notifica di benvenuto (registrazione) gestita da notifications.js
      await sendWelcomeNotification(currentUser.id);

    } else {
      let foundUser = null;
      for (let id in usersData) {
        if (usersData[id].email === email && usersData[id].password === password) {
          foundUser = { id: id, ...usersData[id] };
          break;
        }
      }

      if (!foundUser) throw new Error("Credenziali errate o utente non trovato.");

      if (foundUser.bannedUntil) {
        const isBanned = foundUser.bannedUntil === 'indefinite' || new Date(foundUser.bannedUntil) > new Date();
        if (isBanned) {
          throw new Error(`⛔ Account Bloccato! Motivo: ${foundUser.banReason || 'Violazione delle regole'}`);
        }
      }

      currentUser = foundUser;
    }

    setCurrentUser(currentUser);
    window.location.href = '../feed/feed.html';

  } catch (err) {
    errorDiv.innerText = err.message;
    errorDiv.classList.remove('d-none');
  } finally {
    submitBtn.disabled = false;
  }
});
