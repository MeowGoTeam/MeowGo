if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('../../firebase-messaging-sw.js', { scope: '../../' });
      console.log('Service Worker registrato con successo:', reg);
    } catch (err) {
      console.error('Errore registrazione Service Worker:', err);
    }
  });
}
