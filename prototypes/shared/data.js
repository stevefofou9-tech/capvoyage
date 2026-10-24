/* Données de démonstration partagées par les trois prototypes.
   Reprend le voyage de référence du produit (Cameroun, 21 jours, Douala → Yaoundé → Kribi). */
(function () {
  const RATE = 655.957;
  const P = (window.PROTO = window.PROTO || {});

  P.rate = RATE;
  P.scenario = 'onsite'; // 'onsite' (J4, sur place) | 'before' (J-9, préparation)
  P.TOTAL_DAYS = 21;
  P.BUDGET_EUR = 2500;
  P.NOW = '13:40';

  P.etapes = [
    { city: 'Douala', from: 1, to: 7 },
    { city: 'Yaoundé', from: 8, to: 14 },
    { city: 'Kribi', from: 15, to: 21 },
  ];

  P.contacts = [
    { id: 'c1', name: 'Oncle Paul', role: 'Famille · hébergement', city: 'Douala', phone: '237650000001' },
    { id: 'c2', name: 'Tante Rose', role: 'Famille', city: 'Douala', phone: '237650000002' },
    { id: 'c3', name: 'Samuel', role: 'Chauffeur', city: 'Douala', phone: '237650000003' },
    { id: 'c4', name: 'Marie Ekambi', role: 'Amie', city: 'Douala', phone: '237650000004' },
    { id: 'c5', name: 'Christelle', role: 'Cousine', city: 'Yaoundé', phone: '237650000005' },
    { id: 'c6', name: 'Emmanuel', role: 'Guide', city: 'Kribi', phone: '237650000006' },
  ];

  /* block : unassigned | morning | afternoon | evening   ·   cat : Famille | Amis | Loisir | Travail | Logistique */
  P.activities = [
    { id: 'a1', day: 1, block: 'afternoon', time: '14:20', title: 'Arrivée à Douala Nsimalen', place: 'Aéroport de Douala', cat: 'Logistique', contact: 'c3', cost: 8000, done: true, note: 'Samuel attend au parking, pancarte « Steve ».' },
    { id: 'a2', day: 1, block: 'evening', time: '20:00', title: 'Dîner poissons braisés', place: 'Youpwé, bord de l’eau', cat: 'Amis', contact: 'c4', cost: 22000, done: true, note: '' },
    { id: 'a3', day: 2, block: 'afternoon', time: '15:00', title: 'Retrouvailles chez Oncle Paul', place: 'Bonamoussadi', cat: 'Famille', contact: 'c1', cost: 0, done: true, note: 'Apporter les cadeaux de la valise bleue.' },
    { id: 'a4', day: 3, block: 'morning', time: '09:30', title: 'Marché aux fleurs et artisanat', place: 'Marché de Bonapriso', cat: 'Loisir', contact: null, cost: 8000, done: true, note: '' },
    { id: 'a5', day: 4, block: 'unassigned', time: '', title: 'Acheter les cadeaux pour la famille de Yaoundé', place: '', cat: 'Famille', contact: null, cost: 0, done: false, note: '' },
    { id: 'a6', day: 4, block: 'morning', time: '08:30', title: 'Carte SIM locale et retrait d’espèces', place: 'Akwa, agence MTN', cat: 'Logistique', contact: null, cost: 5000, done: true, note: '' },
    { id: 'a7', day: 4, block: 'afternoon', time: '12:30', title: 'Déjeuner chez Tante Rose', place: 'New Bell', cat: 'Famille', contact: 'c2', cost: 0, done: false, note: 'Elle prépare du ndolé, ne rien apporter à manger.' },
    { id: 'a8', day: 4, block: 'afternoon', time: '16:30', title: 'Rendez-vous avec M. Tchoua (import)', place: 'Akwa, immeuble Sonel', cat: 'Travail', contact: 'c3', cost: 0, done: false, note: 'Samuel m’y conduit. Prévoir catalogue et cartes de visite.' },
    { id: 'a9', day: 4, block: 'evening', time: '19:30', title: 'Dîner avec Marie', place: 'Bonanjo', cat: 'Amis', contact: 'c4', cost: 0, done: false, note: '' },
    { id: 'a10', day: 5, block: 'morning', time: '10:00', title: 'Visite de la cathédrale Saint-Pierre-et-Paul', place: 'Bonanjo', cat: 'Loisir', contact: null, cost: 0, done: false, note: '' },
    { id: 'a11', day: 5, block: 'evening', time: '', title: 'Soirée musique live', place: 'Akwa', cat: 'Amis', contact: 'c4', cost: 0, done: false, note: '' },
    { id: 'a12', day: 7, block: 'morning', time: '07:30', title: 'Train Camrail Douala → Yaoundé', place: 'Gare de Bessengué', cat: 'Logistique', contact: null, cost: 40000, done: false, note: 'Billets 1re classe aller-retour réservés.' },
    { id: 'a13', day: 8, block: 'afternoon', time: '', title: 'Installation chez Christelle', place: 'Bastos, Yaoundé', cat: 'Famille', contact: 'c5', cost: 0, done: false, note: '' },
    { id: 'a14', day: 15, block: 'morning', time: '09:00', title: 'Route Yaoundé → Kribi', place: 'Gare routière de Mvan', cat: 'Logistique', contact: 'c3', cost: 0, done: false, note: '' },
    { id: 'a15', day: 16, block: 'morning', time: '10:00', title: 'Chutes de la Lobé et pirogue', place: 'Kribi', cat: 'Loisir', contact: 'c6', cost: 0, done: false, note: 'Maillot, chapeau, appareil étanche.' },
  ];

  P.ideas = [
    { id: 'i1', title: 'Monter au mont Fébé', cat: 'Loisir' },
    { id: 'i2', title: 'Goûter le koki chez Mama Titi', cat: 'Amis' },
  ];

  /* prio : critique (bloque le départ) | normal ; due : « avant le … » */
  P.todos = [
    { id: 't1', label: 'Demande officielle de visa', cat: 'Formalités', prio: 'critique', due: 'avant le 25 oct.', done: false },
    { id: 't2', label: 'Passeport valide 6 mois après le retour', cat: 'Formalités', prio: 'critique', due: '', done: true },
    { id: 't3', label: 'Vaccin fièvre jaune et carnet jaune', cat: 'Santé', prio: 'critique', due: '', done: true },
    { id: 't4', label: 'Acheter la Malarone (ordonnance)', cat: 'Santé', prio: 'normal', due: 'avant le 30 oct.', done: false },
    { id: 't5', label: 'Billets de train Camrail 1re classe', cat: 'Transport', prio: 'normal', due: '', done: true },
    { id: 't6', label: 'Acompte de l’hôtel de Kribi', cat: 'Transport', prio: 'normal', due: 'avant le 28 oct.', done: false },
    { id: 't7', label: 'Prévenir la banque (paiements à l’étranger)', cat: 'Argent', prio: 'normal', due: '', done: false },
    { id: 't8', label: 'Retirer 200 € en petites coupures', cat: 'Argent', prio: 'normal', due: '', done: false },
    { id: 't9', label: 'Adaptateur de prise et batterie externe', cat: 'Valise', prio: 'normal', due: '', done: false },
    { id: 't10', label: 'Cadeaux pour la famille', cat: 'Valise', prio: 'normal', due: '', done: true },
  ];

  /* amount : montant saisi, currency : XAF | EUR */
  P.expenses = [
    { id: 'e1', label: 'Demande officielle de visa', amount: 100, currency: 'EUR', cat: 'Formalités', day: 0 },
    { id: 'e2', label: 'Vaccin fièvre jaune et Malarone', amount: 75, currency: 'EUR', cat: 'Formalités', day: 0 },
    { id: 'e3', label: 'Billets Camrail 1re classe A/R', amount: 40000, currency: 'XAF', cat: 'Transport', day: 2 },
    { id: 'e4', label: 'Acompte hôtel Kribi', amount: 60000, currency: 'XAF', cat: 'Hébergement', day: 3 },
    { id: 'e5', label: 'Dîner poissons braisés, Youpwé', amount: 22000, currency: 'XAF', cat: 'Restaurant', day: 4 },
  ];

  /* Chaque moment du voyage repart d'un état cohérent : avant le départ rien n'est fait ni dépensé, sur place les démarches sont closes. */
  const BASE = JSON.stringify({ activities: P.activities, todos: P.todos, expenses: P.expenses, ideas: P.ideas, contacts: P.contacts });
  P.apply = (scn) => {
    const b = JSON.parse(BASE);
    if (scn === 'before') {
      b.activities.forEach((a) => { a.done = false; });
      b.expenses = b.expenses.filter((e) => e.day === 0);
    } else {
      ['t1', 't4', 't7', 't8', 't9'].forEach((id) => { b.todos.find((t) => t.id === id).done = true; });
      b.todos.find((t) => t.id === 't6').due = 'avant le 14 nov.';
      b.todos.push({ id: 't11', label: 'Réserver le retour Kribi → Douala', cat: 'Transport', prio: 'normal', due: 'avant le 18 nov.', done: false });
    }
    P.activities = b.activities; P.todos = b.todos; P.expenses = b.expenses; P.ideas = b.ideas; P.contacts = b.contacts;
  };
  P.apply('onsite');

  P.catLabel = { Famille: 'Famille', Amis: 'Amis et sorties', Loisir: 'Découverte', Travail: 'Pro', Logistique: 'Logistique', Santé: 'Santé', Autre: 'Autre' };
  P.blocks = [
    { id: 'unassigned', label: 'À caler', hint: 'pas encore placé dans la journée', icon: 'inbox' },
    { id: 'morning', label: 'Matin', hint: 'avant midi', icon: 'sunrise' },
    { id: 'afternoon', label: 'Après-midi', hint: '12 h – 18 h', icon: 'sun' },
    { id: 'evening', label: 'Soirée', hint: 'à partir de 18 h', icon: 'moon' },
  ];
  P.blockLabel = (id) => (P.blocks.find((b) => b.id === id) || {}).label;

  /* ---------- aides ---------- */
  const fr = (opts) => new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: 'UTC' }, opts));
  P.dayDate = (d) => new Date(Date.UTC(2026, 10, d));
  P.dateShort = (d) => fr({ weekday: 'short', day: 'numeric', month: 'short' }).format(P.dayDate(d)).replace('.', '');
  P.dateLong = (d) => fr({ weekday: 'long', day: 'numeric', month: 'long' }).format(P.dayDate(d));
  P.weekday = (d) => fr({ weekday: 'short' }).format(P.dayDate(d)).replace('.', '');
  P.dayNum = (d) => P.dayDate(d).getUTCDate();
  P.etapeOf = (d) => P.etapes.find((e) => d >= e.from && d <= e.to) || P.etapes[0];
  P.today = () => (P.scenario === 'onsite' ? 4 : 0);
  P.daysToDeparture = 9;
  P.contact = (id) => P.contacts.find((c) => c.id === id);
  P.initials = (n) => n.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  P.wa = (c) => 'https://wa.me/' + c.phone;

  const nf = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  P.n = (v) => nf.format(Math.round(v)).replace(/[  ]/g, ' ');
  P.fcfa = (v) => P.n(v) + ' FCFA';
  P.eur = (v) => P.n(v / RATE) + ' €';
  P.toXAF = (e) => (e.currency === 'EUR' ? Math.round(e.amount * RATE) : e.amount);
  P.spentXAF = () => P.expenses.reduce((s, e) => s + P.toXAF(e), 0);
  P.budgetXAF = () => Math.round(P.BUDGET_EUR * RATE);
  P.remainingXAF = () => P.budgetXAF() - P.spentXAF();
  P.expenseCats = ['Hébergement', 'Transport', 'Restaurant', 'Formalités', 'Cadeaux', 'Sorties'];

  P.uid = () => 'n' + Math.random().toString(36).slice(2, 8);
  P.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* Déduit le moment de la journée et le contact depuis le texte saisi : l'utilisateur n'a pas à choisir. */
  P.infer = (text) => {
    const t = text.toLowerCase();
    let block = 'unassigned';
    if (/(matin|petit.?d[ée]j|march[ée]|sunrise|train de|gare)/.test(t)) block = 'morning';
    if (/(d[ée]jeuner|midi|apr[èe]s.?midi|plage|visite|rdv|rendez)/.test(t)) block = 'afternoon';
    if (/(d[iîï]ner|soir|resto|bar |concert|musique)/.test(t)) block = 'evening';
    let contact = null;
    const at = t.match(/@(\S+)/);
    const pool = P.contacts;
    if (at) contact = (pool.find((c) => c.name.toLowerCase().startsWith(at[1])) || {}).id || null;
    if (!contact) contact = (pool.find((c) => t.includes(c.name.toLowerCase().split(' ')[0] + '')) || {}).id || null;
    return { block, contact };
  };
  P.cleanTitle = (text) => text.replace(/@(\S+)/g, '$1').replace(/\s+/g, ' ').trim();

  /* Montant libre : « 15000 dîner » ou « dîner 15 000 » → { amount, label } */
  P.parseExpense = (text) => {
    const m = text.replace(/ | /g, ' ').match(/(\d[\d ]*(?:[.,]\d+)?)/);
    if (!m) return null;
    const amount = parseFloat(m[1].replace(/ /g, '').replace(',', '.'));
    const label = text.replace(m[0], '').replace(/fcfa|xaf|f cfa|€|eur/gi, '').replace(/\s+/g, ' ').trim();
    const eur = /€|eur/i.test(text);
    return { amount, currency: eur ? 'EUR' : 'XAF', label };
  };
  P.guessCat = (label) => {
    const t = label.toLowerCase();
    if (/(taxi|train|bus|essence|moto|vol)/.test(t)) return 'Transport';
    if (/(h[ôo]tel|nuit|loyer)/.test(t)) return 'Hébergement';
    if (/(d[iîï]ner|d[ée]jeuner|resto|repas|caf[ée]|poisson|pain)/.test(t)) return 'Restaurant';
    if (/(cadeau|souvenir|artisanat|march[ée])/.test(t)) return 'Cadeaux';
    if (/(visa|vaccin|pharmacie|m[ée]dic)/.test(t)) return 'Formalités';
    return 'Sorties';
  };
})();
