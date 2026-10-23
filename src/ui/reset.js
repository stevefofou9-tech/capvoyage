// Page de secours /reset (ADR-009) : renouvelle l'application sur l'appareil sans toucher aux données.
// Elle supprime les Service Workers et les caches « capvoyage-cache-* », jamais le localStorage
// (voyage, session et file de synchronisation).

const status = document.getElementById('reset-status');
const continueLink = document.getElementById('reset-continue');

async function refreshApp() {
  // Hors connexion, supprimer le cache rendrait l'application inutilisable : on s'abstient.
  const probe = await fetch('/api/health', { cache: 'no-store' }).catch(() => null);
  if (!probe || !probe.ok) {
    status.textContent = "Pas de connexion Internet : rien n'a été modifié. Réessayez dès que vous avez du réseau.";
    continueLink.hidden = false;
    return;
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map(registration => registration.unregister()));
  }
  if ('caches' in window) {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('capvoyage-cache-')).map(key => caches.delete(key)));
  }

  status.textContent = '✅ Terminé. Ouverture de la dernière version…';
  continueLink.hidden = false;
  // ?noredirect=1 : reste sur la page (diagnostic, tests)
  if (!new URLSearchParams(window.location.search).has('noredirect')) {
    setTimeout(() => window.location.replace('/'), 900);
  }
}

refreshApp().catch(() => {
  status.textContent = "L'actualisation a échoué. Fermez puis rouvrez l'application.";
  continueLink.hidden = false;
});
