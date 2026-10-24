/* Commandes de présentation (téléphone / large, avant départ / sur place) et aides partagées : feuille, notification. */
(function () {
  const P = window.PROTO;
  const dev = () => document.getElementById('device');

  document.addEventListener('click', (e) => {
    const v = e.target.closest('[data-viewport]');
    if (v) {
      dev().classList.toggle('wide', v.dataset.viewport === 'wide');
      document.querySelectorAll('[data-viewport]').forEach((b) => b.setAttribute('aria-pressed', String(b === v)));
    }
    const s = e.target.closest('[data-scenario]');
    if (s) {
      P.scenario = s.dataset.scenario;
      P.apply && P.apply(P.scenario);
      document.querySelectorAll('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(b === s)));
      P.closeSheet && P.closeSheet();
      P.onScenario && P.onScenario();
    }
  });

  let lastFocus = null;
  P.closeSheet = () => {
    const b = dev().querySelector('.sheet-backdrop');
    if (!b) return;
    b.classList.remove('in');
    setTimeout(() => b.remove(), 180);
    if (lastFocus && lastFocus.isConnected) lastFocus.focus();
  };
  P.sheet = (html, mount) => {
    P.closeSheet();
    lastFocus = document.activeElement;
    const b = document.createElement('div');
    b.className = 'sheet-backdrop';
    b.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-grab"></div>' + html + '</div>';
    b.addEventListener('click', (e) => { if (e.target === b) P.closeSheet(); });
    b.addEventListener('keydown', (e) => { if (e.key === 'Escape') P.closeSheet(); });
    dev().appendChild(b);
    requestAnimationFrame(() => b.classList.add('in'));
    const first = b.querySelector('[autofocus], input, button');
    setTimeout(() => first && first.focus({ preventScroll: true }), 60);
    mount && mount(b.querySelector('.sheet'));
    b.querySelectorAll('[data-close]').forEach((x) => x.addEventListener('click', P.closeSheet));
    return b;
  };

  let toastTimer;
  P.toast = (text, undo) => {
    dev().querySelectorAll('.toast').forEach((t) => t.remove());
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    t.innerHTML = '<span>' + P.esc(text) + '</span>' + (undo ? '<button type="button">Annuler</button>' : '');
    if (undo) t.querySelector('button').addEventListener('click', () => { undo(); t.remove(); });
    dev().appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.remove(), 5000);
  };
})();
