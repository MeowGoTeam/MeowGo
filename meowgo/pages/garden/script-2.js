if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('../../sw.js')
      .then(reg => console.log('Service Worker attivo:', reg.scope))
      .catch(err => console.error('Errore SW:', err));
  });
}
