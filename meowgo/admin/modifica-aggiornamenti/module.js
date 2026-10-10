import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, push, update, remove, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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

const form = document.getElementById('update-form');
const editIdInput = document.getElementById('edit-id');
const versionInput = document.getElementById('version-input');
const titleInput = document.getElementById('title-input');
const descriptionInput = document.getElementById('description-input');
const formTitle = document.getElementById('form-title');
const cancelBtn = document.getElementById('cancel-edit-btn');
const feedbackBox = document.getElementById('feedback-box');
const manageList = document.getElementById('updates-manage-list');

function showFeedback(message, type = 'success') {
  feedbackBox.innerHTML = `<div class="alert alert-${type} rounded-3 py-2 small">${message}</div>`;
  setTimeout(() => { feedbackBox.innerHTML = ''; }, 2500);
}

function resetForm() {
  editIdInput.value = '';
  versionInput.value = '';
  titleInput.value = '';
  descriptionInput.value = '';
  formTitle.innerText = 'Nuovo aggiornamento';
  cancelBtn.classList.add('d-none');
}

cancelBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editIdInput.value;
  const payload = {
    version: versionInput.value.trim(),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    createdAt: Date.now()
  };

  try {
    if (id) {
      await update(ref(db, `content/updates/${id}`), payload);
      showFeedback('Aggiornamento modificato ✅');
    } else {
      await push(ref(db, 'content/updates'), payload);
      showFeedback('Aggiornamento pubblicato ✅');
    }
    resetForm();
  } catch (err) {
    showFeedback('Errore: ' + err.message, 'danger');
  }
});

window.editUpdate = function(id, version, title, description) {
  editIdInput.value = id;
  versionInput.value = version || '';
  titleInput.value = title || '';
  descriptionInput.value = description || '';
  formTitle.innerText = 'Modifica aggiornamento';
  cancelBtn.classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteUpdate = async function(id) {
  if (!confirm('Eliminare questo aggiornamento?')) return;
  try {
    await remove(ref(db, `content/updates/${id}`));
  } catch (err) {
    alert('Errore: ' + err.message);
  }
};

onValue(ref(db, 'content/updates'), (snapshot) => {
  if (!snapshot.exists()) {
    manageList.innerHTML = '<p class="text-center text-muted my-3">Nessun aggiornamento ancora.</p>';
    return;
  }
  const data = snapshot.val();
  const updates = Object.entries(data).map(([id, u]) => ({ id, ...u }));
  updates.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  manageList.innerHTML = '';
  updates.forEach(u => {
    const safeVersion = (u.version || '').replace(/'/g, "\\'");
    const safeTitle = (u.title || '').replace(/'/g, "\\'");
    const safeDesc = (u.description || '').replace(/'/g, "\\'");

    const item = document.createElement('div');
    item.className = 'manage-item';
    item.innerHTML = `
      <div>
        <div class="fw-bold">${u.version ? `[${u.version}] ` : ''}${u.title || ''}</div>
        <div class="small text-muted">${u.description || ''}</div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-3" onclick="editUpdate('${u.id}', '${safeVersion}', '${safeTitle}', '${safeDesc}')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-3" onclick="deleteUpdate('${u.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    manageList.appendChild(item);
  });
});
