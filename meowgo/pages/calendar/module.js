import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, update, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
function clearCurrentUser() {
  localStorage.removeItem('meowgo_test_user');
}

function renderNavbar() {
  const currentUser = getCurrentUser();
  const navLinks = document.getElementById('nav-links');

  if (currentUser) {
    navLinks.innerHTML = `
      <li class="nav-item"><a class="nav-link fw-bold text-dark" href="../feed/feed.html"><i class="fa-solid fa-newspaper"></i> Feed</a></li>
      <li class="nav-item"><a class="nav-link fw-bold text-success" href="../garden/garden.html"><i class="fa-solid fa-tree"></i> MeowGarden</a></li>
      <li class="nav-item"><a class="nav-link fw-bold text-dark" href="../profile/profile.html"><i class="fa-solid fa-user"></i> Profilo (${currentUser.username})</a></li>
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

const currentUser = renderNavbar();

let currentDate = new Date();
let postsData = [];
let selectedDateStr = null;

const monthNames = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

function formatPostTimestamp(post) {
  if (post.date && post.time) {
    return `${post.date} - ${post.time}`;
  } else if (post.createdAt) {
    const d = new Date(post.createdAt);
    return `${d.toLocaleDateString('it-IT')} - ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return post.time || '';
}

const catsRef = ref(db, 'cats');
onValue(catsRef, (snapshot) => {
  postsData = [];
  if (snapshot.exists()) {
    const data = snapshot.val();
    postsData = Object.keys(data).map(key => ({ id: key, ...data[key] }));
  }
  renderCalendar();
  if (selectedDateStr) {
    const eventsOnSelectedDay = getEventsForDate(selectedDateStr);
    showDayEvents(selectedDateStr, eventsOnSelectedDay);
  }
});

function getEventsForDate(dateStr) {
  return postsData.filter(post => {
    if (post.date) return post.date === dateStr;
    if (post.createdAt) {
      const d = new Date(post.createdAt);
      const postDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      return postDateStr === dateStr;
    }
    return false;
  });
}

function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  document.getElementById('current-month-display').innerText = `${monthNames[month]} ${year}`;

  const grid = document.getElementById('calendar-days-grid');
  grid.innerHTML = '';

  const firstDayOfMonth = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  let startingDay = firstDayOfMonth.getDay() - 1;
  if (startingDay === -1) startingDay = 6; 

  for (let i = 0; i < startingDay; i++) {
    const emptyCell = document.createElement('div');
    emptyCell.className = 'calendar-day-cell empty';
    grid.appendChild(emptyCell);
  }

  const today = new Date();

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement('div');
    cell.className = 'calendar-day-cell';

    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
      cell.classList.add('today');
    }

    const dateStr = `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year}`;
    const eventsOnDay = getEventsForDate(dateStr);

    if (eventsOnDay.length > 0) {
      cell.classList.add('has-events');
      cell.innerHTML = `<span class="day-number">${day}</span><span class="event-badge">${eventsOnDay.length}</span>`;
    } else {
      cell.innerHTML = `<span>${day}</span>`;
    }

    cell.addEventListener('click', () => {
      selectedDateStr = dateStr;
      showDayEvents(dateStr, eventsOnDay);
    });
    grid.appendChild(cell);
  }
}

function showDayEvents(dateStr, events) {
  const title = document.getElementById('selected-date-title');
  const container = document.getElementById('day-events-container');

  title.innerHTML = `<i class="fa-solid fa-calendar-day" style="color: #b45309;"></i> Avvistamenti del ${dateStr}`;
  container.innerHTML = '';

  if (events.length === 0) {
    container.innerHTML = `
      <div class="glass-card p-4 text-center">
        <p class="text-muted mb-0">Nessun avvistamento registrato in questa data.</p>
      </div>
    `;
    return;
  }

  events.slice().reverse().forEach(post => {
    const likesMap = post.likes || {};
    const likesCount = Object.keys(likesMap).length;
    const isLiked = currentUser && likesMap[currentUser.id];
    const dateTimeStr = formatPostTimestamp(post);

    const card = document.createElement('div');
    card.className = "glass-card overflow-hidden";
    card.innerHTML = `
      <div class="p-3 d-flex align-items-center gap-2 border-bottom">
        <div class="fw-bold text-dark"><i class="fa-solid fa-circle-user text-warning"></i> ${post.author}</div>
        <span class="small text-muted ms-auto"><i class="fa-regular fa-calendar-days me-1"></i>${dateTimeStr}</span>
      </div>
      <img src="${post.imageUrl}" class="cat-post-img" alt="${post.catName}">
      <div class="p-3">
        <div class="d-flex align-items-center gap-3 mb-2">
          <button class="btn btn-link p-0 text-decoration-none btn-like fs-4 ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}')">
            <i class="${isLiked ? 'fa-solid' : 'fa-regular'} fa-heart"></i>
          </button>
          <span class="fw-bold text-dark">${likesCount} Mi piace</span>
        </div>
        <h5 class="fw-bold text-dark mb-0">${post.catName}</h5>
      </div>
    `;
    container.appendChild(card);
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

document.getElementById('prev-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() - 1);
  renderCalendar();
});

document.getElementById('next-month').addEventListener('click', () => {
  currentDate.setMonth(currentDate.getMonth() + 1);
  renderCalendar();
});
