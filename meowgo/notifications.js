import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, onChildAdded, push, query, orderByChild, startAt } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
export const db = getDatabase(app);

const currentUserId = localStorage.getItem('meowgo_uid'); 
const seenNotifs = new Set(); // Previene i duplicati nello stesso ciclo
const pageStartTime = Date.now(); // Marca temporale per ascoltare SOLO da adesso in poi

// 1. Chiedi i permessi
export async function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
}

// 2. Mostra la notifica nel centro notifiche del sistema operativo
export function showSystemNotification(title, body, targetUrl = './garden.html') {
  if ('Notification' in window && Notification.permission === 'granted') {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.showNotification(title || "MeowGo", {
          body: body || "Hai una nuova notifica!",
          icon: './icons/icon-192.png',
          badge: './icons/icon-192.png',
          vibrate: [100, 50, 100],
          data: { url: targetUrl }
        });
      });
    }
  }
}

// 3. Ascolta le notifiche Admin (Solo quelle nuove dopo il caricamento della pagina)
function listenForAdminNotifications() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  // Filtra per far ascoltare solo notifiche inviate DOPO il caricamento della pagina
  const globalQuery = query(ref(db, 'notifications/global'), orderByChild('timestamp'), startAt(pageStartTime));

  onChildAdded(globalQuery, (snapshot) => {
    const notifId = snapshot.key;
    const notif = snapshot.val();

    if (notif && !seenNotifs.has(notifId)) {
      seenNotifs.add(notifId);
      showSystemNotification(notif.title, notif.body || notif.message, './garden.html');
    }
  });

  if (currentUserId) {
    const directQuery = query(ref(db, `notifications/direct/${currentUserId}`), orderByChild('timestamp'), startAt(pageStartTime));
    
    onChildAdded(directQuery, (snapshot) => {
      const notifId = snapshot.key;
      const notif = snapshot.val();

      if (notif && !seenNotifs.has(notifId)) {
        seenNotifs.add(notifId);
        showSystemNotification(notif.title, notif.body || notif.message, './garden.html');
      }
    });
  }
}

// ==========================================
// NOTIFICHE AUTOMATICHE (EVENTI UTENTE)
// ==========================================

// A. Notifica al momento della REGISTRAZIONE
export async function sendWelcomeNotification(userId) {
  const payload = {
    title: "Benvenuto su MeowGo! 🐾",
    body: "Il tuo account è pronto. Esplora il giardino e inizia la tua avventura!",
    timestamp: Date.now()
  };

  // Salva nello storico
  await push(ref(db, `notifications/direct/${userId}`), payload);
  // Mostra subito nel centro notifiche
  showSystemNotification(payload.title, payload.body, './garden.html');
}

// B. Notifica al momento di un NUOVO POST
export async function sendPostPublishedNotification(userId) {
  const payload = {
    title: "Post Pubblicato! 📸",
    body: "Il tuo post è ora visibile nel feed della community.",
    timestamp: Date.now()
  };

  // Salva nello storico
  await push(ref(db, `notifications/direct/${userId}`), payload);
  // Mostra subito nel centro notifiche
  showSystemNotification(payload.title, payload.body, './feed.html');
}

// Inizializzazione automatica
document.addEventListener('DOMContentLoaded', () => {
  requestNotificationPermission().then(() => {
    listenForAdminNotifications();
  });
});
