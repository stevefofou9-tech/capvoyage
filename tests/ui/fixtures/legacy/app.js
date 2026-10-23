// FIXTURE : comportement de l'ancien front (avant la correction du 23/10) :
// enregistre le Service Worker mais n'écoute ni `controllerchange` ni les messages du Service Worker.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
