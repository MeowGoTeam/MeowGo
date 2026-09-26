importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDAwgqotGF0BTUGBjxOMseMMfXpBZdAUTI",
  authDomain: "meowmaster-51991.firebaseapp.com",
  databaseURL: "https://meowmaster-51991-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "meowmaster-51991",
  storageBucket: "meowmaster-51991.firebasestorage.app",
  messagingSenderId: "1079993425259",
  appId: "1:1079993425259:web:1aa6a9e5f0a65b6ee4802e"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  // Legge esattamente ciò che invii dal pannello (senza testi di default)
  const title = payload.notification?.title || "MeowGo";
  const body = payload.notification?.body || "";
  
  self.registration.showNotification(title, {
    body: body,
    icon: './icons/icon-512.png',
    badge: './icons/icon-512.png',
    data: { url: payload.notification?.click_action || './feed.html' }
  });
});
