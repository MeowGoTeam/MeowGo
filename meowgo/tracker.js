/**
 * MeowGo Web Tracker (Firebase REST Direct)
 */
(function () {
  // Indirizzo del tuo Firebase Realtime Database
  const FIREBASE_DB_URL = "https://meowgo-default-rtdb.firebaseio.com"; // ⚠️ SOSTITUISCI CON IL TUO URL FIREBASE SE DIVERSO

  function sendPresence() {
    let currentUser = { username: 'Anonimo', email: 'N/D' };

    // Tenta di recuperare i dati dell'utente dal localStorage/sessionStorage
    try {
      const savedUser = localStorage.getItem('user') || 
                        sessionStorage.getItem('user') || 
                        localStorage.getItem('userData');
      if (savedUser) {
        const parsed = JSON.parse(savedUser);
        currentUser = {
          username: parsed.username || parsed.catName || parsed.name || parsed.displayName || 'Anonimo',
          email: parsed.email || parsed.userEmail || 'N/D'
        };
      }
    } catch (e) {}

    // Pulisce la chiave dell'utente per evitare caratteri vietati da Firebase (come punti o chiocciole)
    const rawKey = currentUser.email !== 'N/D' ? currentUser.email : currentUser.username;
    const cleanKey = (rawKey + "_" + (navigator.userAgent.includes('Mobile') ? 'mobile' : 'pc'))
                      .replace(/[.#$\[\]@]/g, "_");

    const payload = {
      username: currentUser.username,
      email: currentUser.email,
      page: window.location.pathname || 'index.html',
      lastSeen: Date.now(),
      userAgent: navigator.userAgent
    };

    // Invio diretto a Firebase via HTTP PUT (REST API)
    fetch(`${FIREBASE_DB_URL}/active_users/${cleanKey}.json`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).catch(err => {
      // Ignora silenziosamente
    });
  }

  // Esegui subito e poi ogni 30 secondi
  sendPresence();
  setInterval(sendPresence, 30000);
})();
