import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

function getCurrentUser() {
  return JSON.parse(localStorage.getItem('meowgo_test_user')) || null;
}
function setCurrentUser(user) {
  localStorage.setItem('meowgo_test_user', JSON.stringify(user));
}

let currentUser = getCurrentUser();
if (!currentUser) {
  window.location.replace('../login/login.html');
}

const usernameInput = document.getElementById('username-input');
const bioInput = document.getElementById('bio-input');
const bioCount = document.getElementById('bio-count');
const emailDisplay = document.getElementById('email-display');
const avatarPreview = document.getElementById('avatar-preview');
const photoInput = document.getElementById('photo-input');
const saveBtn = document.getElementById('save-btn');
const feedbackBox = document.getElementById('feedback-box');

let newPhotoFile = null;

function renderAvatar(photoURL) {
  avatarPreview.innerHTML = photoURL
    ? `<img src="${photoURL}" alt="Anteprima foto profilo">`
    : '😸';
}

function fillForm(user) {
  usernameInput.value = user.username || '';
  bioInput.value = user.bio || '';
  bioCount.innerText = (user.bio || '').length;
  emailDisplay.value = user.email || '';
  renderAvatar(user.photoURL || '');
}

// Carica sempre i dati più recenti dal database, per restare sincronizzati
async function loadFromDb() {
  try {
    const snap = await get(ref(db, `users/${currentUser.id}`));
    if (snap.exists()) {
      currentUser = { ...currentUser, ...snap.val() };
      setCurrentUser(currentUser);
    }
  } catch (err) {
    console.warn('Impossibile aggiornare dal database, uso i dati locali:', err);
  }
  fillForm(currentUser);
}
loadFromDb();

bioInput.addEventListener('input', () => {
  bioCount.innerText = bioInput.value.length;
});

photoInput.addEventListener('change', () => {
  const file = photoInput.files[0];
  if (!file) return;
  newPhotoFile = file;
  renderAvatar(URL.createObjectURL(file));
});

function showFeedback(message, type = 'success') {
  feedbackBox.innerHTML = `
    <div class="alert alert-${type} rounded-3 py-2 small" role="alert">${message}</div>
  `;
}

document.getElementById('edit-profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const newUsername = usernameInput.value.trim();
  const newBio = bioInput.value.trim();
  const oldUsername = currentUser.username;

  if (!newUsername) {
    showFeedback('Il nome utente non può essere vuoto.', 'danger');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = 'Salvataggio... ⏳';

  try {
    let photoURL = currentUser.photoURL || '';

    // Se l'utente ha scelto una nuova foto, la carica su ImgBB
    if (newPhotoFile) {
      const formData = new FormData();
      formData.append('image', newPhotoFile);

      const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
        method: 'POST', body: formData
      });
      const result = await response.json();
      if (!result.success) throw new Error("Errore durante il caricamento della foto profilo.");
      photoURL = result.data.url;
    }

    // Aggiorna i dati utente sul database
    const updates = {
      username: newUsername,
      bio: newBio,
      photoURL: photoURL
    };
    await update(ref(db, `users/${currentUser.id}`), updates);

    // Se lo username è cambiato, aggiorna anche i post già pubblicati con il vecchio nome
    if (newUsername !== oldUsername) {
      const catsSnap = await get(ref(db, 'cats'));
      if (catsSnap.exists()) {
        const catsData = catsSnap.val();
        const multiUpdate = {};
        for (let key in catsData) {
          if (catsData[key].author === oldUsername) {
            multiUpdate[`cats/${key}/author`] = newUsername;
          }
        }
        if (Object.keys(multiUpdate).length > 0) {
          await update(ref(db), multiUpdate);
        }
      }
    }

    currentUser = { ...currentUser, ...updates };
    setCurrentUser(currentUser);
    newPhotoFile = null;

    showFeedback('Profilo aggiornato con successo! ✅', 'success');

    setTimeout(() => {
      window.location.href = '../profile/profile.html';
    }, 900);

  } catch (err) {
    showFeedback('Errore: ' + err.message, 'danger');
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Salva modifiche';
  }
});
