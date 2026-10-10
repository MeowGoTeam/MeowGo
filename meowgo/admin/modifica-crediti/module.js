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

const form = document.getElementById('credit-form');
const editIdInput = document.getElementById('edit-id');
const iconInput = document.getElementById('icon-input');
const titleInput = document.getElementById('title-input');
const descriptionInput = document.getElementById('description-input');
const formTitle = document.getElementById('form-title');
const cancelBtn = document.getElementById('cancel-edit-btn');
const feedbackBox = document.getElementById('feedback-box');
const manageList = document.getElementById('credits-manage-list');

function showFeedback(message, type = 'success') {
  feedbackBox.innerHTML = `<div class="alert alert-${type} rounded-3 py-2 small">${message}</div>`;
  setTimeout(() => { feedbackBox.innerHTML = ''; }, 2500);
}

function resetForm() {
  editIdInput.value = '';
  iconInput.value = '';
  titleInput.value = '';
  descriptionInput.value = '';
  formTitle.innerText = 'Nuovo credito';
  cancelBtn.classList.add('d-none');
}

cancelBtn.addEventListener('click', resetForm);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = editIdInput.value;
  const payload = {
    icon: (iconInput.value.trim() || 'fa-star'),
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    createdAt: Date.now()
  };

  try {
    if (id) {
      await update(ref(db, `content/credits/${id}`), payload);
      showFeedback('Credito modificato ✅');
    } else {
      await push(ref(db, 'content/credits'), payload);
      showFeedback('Credito pubblicato ✅');
    }
    resetForm();
  } catch (err) {
    showFeedback('Errore: ' + err.message, 'danger');
  }
});

window.editCredit = function(id, icon, title, description) {
  editIdInput.value = id;
  iconInput.value = icon || '';
  titleInput.value = title || '';
  descriptionInput.value = description || '';
  formTitle.innerText = 'Modifica credito';
  cancelBtn.classList.remove('d-none');
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.deleteCredit = async function(id) {
  if (!confirm('Eliminare questo credito?')) return;
  try {
    await remove(ref(db, `content/credits/${id}`));
  } catch (err) {
    alert('Errore: ' + err.message);
  }
};

onValue(ref(db, 'content/credits'), (snapshot) => {
  if (!snapshot.exists()) {
    manageList.innerHTML = '<p class="text-center text-muted my-3">Nessun credito ancora.</p>';
    return;
  }
  const data = snapshot.val();
  const credits = Object.entries(data).map(([id, c]) => ({ id, ...c }));
  credits.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

  manageList.innerHTML = '';
  credits.forEach(c => {
    const safeIcon = (c.icon || '').replace(/'/g, "\\'");
    const safeTitle = (c.title || '').replace(/'/g, "\\'");
    const safeDesc = (c.description || '').replace(/'/g, "\\'");

    const item = document.createElement('div');
    item.className = 'manage-item';
    item.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <i class="fa-solid ${c.icon || 'fa-star'}" style="color:#b45309; width:22px; text-align:center;"></i>
        <div>
          <div class="fw-bold">${c.title || ''}</div>
          <div class="small text-muted">${c.description || ''}</div>
        </div>
      </div>
      <div class="d-flex gap-2">
        <button class="btn btn-outline-secondary btn-sm rounded-3" onclick="editCredit('${c.id}', '${safeIcon}', '${safeTitle}', '${safeDesc}')">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn btn-outline-danger btn-sm rounded-3" onclick="deleteCredit('${c.id}')">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    `;
    manageList.appendChild(item);
  });
});
