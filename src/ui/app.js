// ==========================================================================
// CAPVOYAGE - APPLICATION CLIENT-SIDE (app.js) V3
// Planification Jour par Jour & Préparation Sereine de Séjours à l'Étranger
// Spec-Driven Development • 100% Hors-Ligne • Passwordless & Démo
// ==========================================================================

import { ActivityService } from '../domain/ActivityService.js';
import { BudgetEngine } from '../domain/BudgetEngine.js';
import { ContactService } from '../domain/ContactService.js';
import { TodoService } from '../domain/TodoService.js';
import { TripService } from '../domain/TripService.js';
import { AuthService } from '../domain/AuthService.js';
import { ReminderService } from '../domain/ReminderService.js';
import { COUNTRIES_CATALOG, GeographyData } from '../domain/GeographyData.js';
import { ACTIVITY_TEMPLATES, searchTemplates, resolveTemplateTitle } from '../domain/ActivityTemplates.js';
import { IcsService } from '../domain/IcsService.js';

// État global réactif de l'application
const state = {
  session: null,         // { token, email, isDemo }
  trip: null,            // Données complètes du voyage actif
  activeDayNumber: 1,    // Jour actuellement sélectionné
  activeTab: 'tab-planning',
  activeTodoFilter: 'Tous',
  activeActivityFilter: 'Tous',
  isDayFolded: false,    // Accordéon de la journée
  selectedContactForQuickAdd: null, // Contact sélectionné pour l'ajout rapide
  isReadOnly: false,     // Mode consultation partagée (Lien magique)
  wizardContactsList: [], // Liste locale des contacts ajoutés pas-à-pas à l'étape 3
  wizardData: {
    country: 'Cameroun',
    mainCity: 'Douala',
    startDate: '2026-11-01',
    endDate: '2026-11-21',
    totalBudget: 2500,
    baseCurrency: 'EUR',
    activityPurposes: ['Famille', 'Amis', 'Loisirs / Découverte']
  }
};

// Sélecteurs d'éléments DOM
const elements = {
  // 1. Vues Principales
  viewLanding: document.getElementById('view-landing'),
  viewWizard: document.getElementById('view-wizard'),
  viewApp: document.getElementById('view-app'),

  // 2. Landing Page & Navigation Accès
  btnLandingOpenLogin: document.getElementById('btn-landing-open-login'),
  btnLandingDemo: document.getElementById('btn-landing-demo'),
  btnHeroStart: document.getElementById('btn-hero-start'),
  btnHeroDemo: document.getElementById('btn-hero-demo'),

  // 3. Modale Connexion Passwordless Email
  dialogLogin: document.getElementById('dialog-login'),
  loginStepEmail: document.getElementById('login-step-email'),
  formRequestCode: document.getElementById('form-request-code'),
  loginEmailInput: document.getElementById('login-email-input'),
  btnCancelLogin: document.getElementById('btn-cancel-login'),
  btnCloseLoginDialog: document.getElementById('btn-close-login-dialog'),
  loginStepCode: document.getElementById('login-step-code'),
  sentCodeTargetEmail: document.getElementById('sent-code-target-email'),
  devCodeBanner: document.getElementById('dev-code-banner'),
  formVerifyCode: document.getElementById('form-verify-code'),
  loginCodeInput: document.getElementById('login-code-input'),
  btnBackToEmail: document.getElementById('btn-back-to-email'),

  // 4. Onboarding Express (Wizard V3)
  btnWizardCancel: document.getElementById('btn-wizard-cancel'),
  dotStep1: document.getElementById('dot-step-1'),
  dotStep2: document.getElementById('dot-step-2'),
  dotStep3: document.getElementById('dot-step-3'),
  wizardStep1: document.getElementById('wizard-step-1'),
  tabBtnPopular: document.getElementById('tab-btn-popular'),
  tabBtnCustom: document.getElementById('tab-btn-custom'),
  destPopularPane: document.getElementById('dest-popular-pane'),
  destCustomPane: document.getElementById('dest-custom-pane'),
  destPopularCards: document.getElementById('dest-popular-cards'),
  wizCascadingCitiesWrapper: document.getElementById('wiz-cascading-cities-wrapper'),
  wizCascadingCities: document.getElementById('wiz-cascading-cities'),
  wizCountryInput: document.getElementById('wiz-country-input'),
  wizCityInput: document.getElementById('wiz-city-input'),
  formWizardStep1: document.getElementById('form-wizard-step-1'),
  wizCountry: document.getElementById('wiz-country'),
  wizCity: document.getElementById('wiz-city'),
  wizStartDate: document.getElementById('wiz-start-date'),
  wizEndDate: document.getElementById('wiz-end-date'),
  wizBudget: document.getElementById('wiz-budget'),
  wizCurrency: document.getElementById('wiz-currency'),
  wizardStep2: document.getElementById('wizard-step-2'),
  wizPurposesGrid: document.getElementById('wiz-purposes-grid'),
  btnWizBack1: document.getElementById('btn-wiz-back-1'),
  btnWizTo3: document.getElementById('btn-wiz-to-3'),
  wizardStep3: document.getElementById('wizard-step-3'),
  wizContactName: document.getElementById('wiz-contact-name'),
  wizContactRel: document.getElementById('wiz-contact-rel'),
  wizContactCity: document.getElementById('wiz-contact-city'),
  btnWizAddContact: document.getElementById('btn-wiz-add-contact'),
  wizAddedContactsList: document.getElementById('wiz-added-contacts-list'),
  wizNoContactsHint: document.getElementById('wiz-no-contacts-hint'),
  wizContactsCount: document.getElementById('wiz-contacts-count'),
  btnWizBack2: document.getElementById('btn-wiz-back-2'),
  btnWizSkip3: document.getElementById('btn-wiz-skip-3'),
  btnWizFinish: document.getElementById('btn-wiz-finish'),

  // 5. Header Application & Session
  btnHeaderHome: document.getElementById('btn-header-home'),
  tripCountryBadge: document.getElementById('trip-country-badge'),
  tripMainTitle: document.getElementById('trip-main-title'),
  tripMetaDates: document.getElementById('trip-meta-dates'),
  tabButtons: document.querySelectorAll('.tab-btn'),
  tabPanes: document.querySelectorAll('.tab-pane'),
  todoBadgeCount: document.getElementById('todo-badge-count'),
  headerRemainingBadge: document.getElementById('header-remaining-badge'),
  contactsBadgeCount: document.getElementById('contacts-badge-count'),
  userDisplayPill: document.getElementById('user-display-pill'),
  userEmailText: document.getElementById('user-email-text'),
  btnHeaderShare: document.getElementById('btn-header-share'),
  readonlyBanner: document.getElementById('readonly-banner'),
  btnHeaderNewTrip: document.getElementById('btn-header-new-trip'),
  btnLogoutHeader: document.getElementById('btn-logout-header'),

  // 6. Bandeau de Rappels Prioritaires
  remindersBannerZone: document.getElementById('reminders-banner-zone'),
  remindersContainer: document.getElementById('reminders-container'),

  // 7. Onglet Programme & Planning
  btnExportIcs: document.getElementById('btn-export-ics'),
  planningCategoryFilters: document.getElementById('planning-category-filters'),
  filterActiveIndicator: document.getElementById('filter-active-indicator'),
  daySelectorTrack: document.getElementById('day-selector-track'),
  dayBannerAccordion: document.getElementById('day-banner-accordion'),
  activeDayTitle: document.getElementById('active-day-title'),
  activeDayCityName: document.getElementById('active-day-city-name'),
  btnEditCity: document.getElementById('btn-edit-city'),
  activeDayActivityCount: document.getElementById('active-day-activity-count'),
  dayAccordionArrow: document.getElementById('day-accordion-arrow'),
  formQuickAddActivity: document.getElementById('form-quick-add-activity'),
  inputQuickActivityTitle: document.getElementById('input-quick-activity-title'),
  btnQuickMentionContact: document.getElementById('btn-quick-mention-contact'),
  quickContactDropdown: document.getElementById('quick-contact-dropdown'),
  activityTemplateAutocomplete: document.getElementById('activity-template-autocomplete'),
  ribbonItemsContainer: document.getElementById('ribbon-items-container'),
  temporalGridWrapper: document.getElementById('temporal-grid-wrapper'),
  listBlockUnassigned: document.getElementById('list-block-unassigned'),
  listBlockMorning: document.getElementById('list-block-morning'),
  listBlockAfternoon: document.getElementById('list-block-afternoon'),
  listBlockEvening: document.getElementById('list-block-evening'),
  countBlockUnassigned: document.getElementById('count-block-unassigned'),
  countBlockMorning: document.getElementById('count-block-morning'),
  countBlockAfternoon: document.getElementById('count-block-afternoon'),
  countBlockEvening: document.getElementById('count-block-evening'),

  // 8. Modale Détail & Enrichissement de l'Activité (Direct UX V3)
  dialogActivityEnrich: document.getElementById('dialog-activity-enrich'),
  formEnrichActivity: document.getElementById('form-enrich-activity'),
  editActivityId: document.getElementById('edit-activity-id'),
  editActivityDay: document.getElementById('edit-activity-day'),
  editActivityTitle: document.getElementById('edit-activity-title'),
  editActivityCategory: document.getElementById('edit-activity-category'),
  editActivityStatus: document.getElementById('edit-activity-status'),
  activityQuickTimePills: document.getElementById('activity-quick-time-pills'),
  editActivityTime: document.getElementById('edit-activity-time'),
  editActivityLocation: document.getElementById('edit-activity-location'),
  btnInlineContactToggle: document.getElementById('btn-inline-contact-toggle'),
  inlineContactBox: document.getElementById('inline-contact-box'),
  inlineContactName: document.getElementById('inline-contact-name'),
  inlineContactRelation: document.getElementById('inline-contact-relation'),
  btnSaveInlineContact: document.getElementById('btn-save-inline-contact'),
  editActivityContactsList: document.getElementById('edit-activity-contacts-list'),
  editActivityNotes: document.getElementById('edit-activity-notes'),
  btnCloseActivityDialog: document.getElementById('btn-close-activity-dialog'),
  btnCancelActivity: document.getElementById('btn-cancel-activity'),

  // 9. Modale Déplacement de Jour (conservée pour rétrocompatibilité)
  dialogMoveActivity: document.getElementById('dialog-move-activity'),
  formMoveActivity: document.getElementById('form-move-activity'),
  moveActivityId: document.getElementById('move-activity-id'),
  moveActivityName: document.getElementById('move-activity-name'),
  selectTargetDay: document.getElementById('select-target-day'),
  btnCloseMoveDialog: document.getElementById('btn-close-move-dialog'),
  btnCancelMove: document.getElementById('btn-cancel-move'),

  // 10. Onglet Préparatifs & To-Dos
  btnOpenAddTodo: document.getElementById('btn-open-add-todo'),
  todoProgressBar: document.getElementById('todo-progress-bar'),
  todoProgressPercent: document.getElementById('todo-progress-percent'),
  todoProgressDetails: document.getElementById('todo-progress-details'),
  todoCategoryFilters: document.getElementById('todo-category-filters'),
  todosContainer: document.getElementById('todos-container'),
  dialogAddTodo: document.getElementById('dialog-add-todo'),
  formAddTodo: document.getElementById('form-add-todo'),
  todoTitle: document.getElementById('todo-title'),
  todoCategory: document.getElementById('todo-category'),
  todoPriority: document.getElementById('todo-priority'),
  btnCloseTodoDialog: document.getElementById('btn-close-todo-dialog'),
  btnCancelTodo: document.getElementById('btn-cancel-todo'),

  // Modale Édition To-Do V4
  dialogEditTodo: document.getElementById('dialog-edit-todo'),
  formEditTodo: document.getElementById('form-edit-todo'),
  editTodoId: document.getElementById('edit-todo-id'),
  editTodoTitle: document.getElementById('edit-todo-title'),
  editTodoCategory: document.getElementById('edit-todo-category'),
  editTodoPriority: document.getElementById('edit-todo-priority'),
  editTodoStatus: document.getElementById('edit-todo-status'),
  editTodoNotes: document.getElementById('edit-todo-notes'),
  btnCloseEditTodoDialog: document.getElementById('btn-close-edit-todo-dialog'),
  btnCancelEditTodo: document.getElementById('btn-cancel-edit-todo'),
  btnDeleteEditTodo: document.getElementById('btn-delete-edit-todo'),

  // 11. Onglet Budget & Devises
  kpiBudgetCard: document.getElementById('kpi-budget-card'),
  kpiTotalBudget: document.getElementById('kpi-total-budget'),
  kpiTotalBudgetXaf: document.getElementById('kpi-total-budget-xaf'),
  kpiTotalSpent: document.getElementById('kpi-total-spent'),
  kpiTotalSpentXaf: document.getElementById('kpi-total-spent-xaf'),
  kpiRemainingCard: document.getElementById('kpi-remaining-card'),
  kpiRemaining: document.getElementById('kpi-remaining'),
  kpiRemainingXaf: document.getElementById('kpi-remaining-xaf'),
  currentRateDisplay: document.getElementById('current-rate-display'),
  btnEditRate: document.getElementById('btn-edit-rate'),
  btnSyncRates: document.getElementById('btn-sync-rates'),
  syncRatesBadge: document.getElementById('sync-rates-badge'),
  convEur: document.getElementById('conv-eur'),
  convXaf: document.getElementById('conv-xaf'),
  budgetBreakdownList: document.getElementById('budget-breakdown-list'),
  expensesTableWrapper: document.getElementById('expenses-table-wrapper'),
  btnOpenAddExpense: document.getElementById('btn-open-add-expense'),
  dialogEditBudget: document.getElementById('dialog-edit-budget'),
  formUpdateBudget: document.getElementById('form-update-budget'),
  editBudgetAmount: document.getElementById('edit-budget-amount'),
  btnCloseBudgetDialog: document.getElementById('btn-close-budget-dialog'),
  btnCancelBudgetEdit: document.getElementById('btn-cancel-budget-edit'),
  dialogAddExpense: document.getElementById('dialog-add-expense'),
  formAddExpense: document.getElementById('form-add-expense'),
  expenseLabel: document.getElementById('expense-label'),
  expenseAmount: document.getElementById('expense-amount'),
  expenseCurrency: document.getElementById('expense-currency'),
  expenseCategory: document.getElementById('expense-category'),
  expenseDate: document.getElementById('expense-date'),
  btnCloseExpenseDialog: document.getElementById('btn-close-expense-dialog'),
  btnCancelExpense: document.getElementById('btn-cancel-expense'),

  // 12. Onglet Contacts & Contact Picker
  contactsContainer: document.getElementById('contacts-container'),
  btnImportNativeContacts: document.getElementById('btn-import-native-contacts'),
  btnOpenAddContact: document.getElementById('btn-open-add-contact'),
  dialogAddContact: document.getElementById('dialog-add-contact'),
  dialogContactModalTitle: document.getElementById('dialog-contact-modal-title'),
  formAddContact: document.getElementById('form-add-contact'),
  contactId: document.getElementById('contact-id'),
  contactName: document.getElementById('contact-name'),
  contactRelation: document.getElementById('contact-relation'),
  contactCityPills: document.getElementById('contact-city-pills'),
  contactCity: document.getElementById('contact-city'),
  contactPhone: document.getElementById('contact-phone'),
  contactNotes: document.getElementById('contact-notes'),
  btnDeleteContactInModal: document.getElementById('btn-delete-contact-in-modal'),
  btnSubmitContact: document.getElementById('btn-submit-contact'),
  btnCloseContactDialog: document.getElementById('btn-close-contact-dialog'),
  btnCancelContact: document.getElementById('btn-cancel-contact'),
  dialogContactActivities: document.getElementById('dialog-contact-activities'),
  contactActivitiesModalTitle: document.getElementById('contact-activities-modal-title'),
  contactActivitiesList: document.getElementById('contact-activities-list'),
  btnCloseContactActivitiesDialog: document.getElementById('btn-close-contact-activities-dialog'),
  btnCloseContactActivities: document.getElementById('btn-close-contact-activities'),

  // 13. Modale Profil & Multi-Voyages V3
  dialogUserProfile: document.getElementById('dialog-user-profile'),
  profileEmailDisplay: document.getElementById('profile-email-display'),
  profileStatusBadge: document.getElementById('profile-status-badge'),
  userTripsList: document.getElementById('user-trips-list'),
  btnProfileNewTrip: document.getElementById('btn-profile-new-trip'),
  btnProfileLogout: document.getElementById('btn-profile-logout'),
  btnCloseProfile: document.getElementById('btn-close-profile'),
  btnCloseProfileDialog: document.getElementById('btn-close-profile-dialog'),

  // 14. Modales d'édition Étape & Taux (V4)
  dialogEditCity: document.getElementById('dialog-edit-city'),
  formEditCity: document.getElementById('form-edit-city'),
  inputEditCityName: document.getElementById('input-edit-city-name'),
  btnCancelEditCity: document.getElementById('btn-cancel-edit-city'),
  btnCloseEditCityDialog: document.getElementById('btn-close-edit-city-dialog'),
  dialogEditRate: document.getElementById('dialog-edit-rate'),
  formEditRate: document.getElementById('form-edit-rate'),
  inputEditRateValue: document.getElementById('input-edit-rate-value'),
  btnCancelEditRate: document.getElementById('btn-cancel-edit-rate'),
  btnCloseEditRateDialog: document.getElementById('btn-close-edit-rate-dialog'),

  // 15. Navigation Mobile & Badges synchronisés
  mobileNavBtns: document.querySelectorAll('.mobile-nav-btn'),
  mobileBadgeTodos: document.getElementById('mobile-badge-todos'),
  mobileBadgeContacts: document.getElementById('mobile-badge-contacts')
};

// ==========================================================================
// SYSTÈME DE TOASTS & ACCESSIBILITÉ DES DIALOGUES (WCAG CONFORME)
// ==========================================================================
let lastFocusedElement = null;

export function showToast(message, options = {}) {
  const opts = typeof options === 'string' ? { type: options } : (options || {});
  const { type = 'info', undoCallback = null, duration = 5000 } = opts;
  const container = document.getElementById('toast-container');
  if (!container) return;

  const item = document.createElement('div');
  item.className = `toast-item toast-${type}`;
  
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  item.appendChild(textSpan);

  let timerId = null;

  if (undoCallback) {
    const undoBtn = document.createElement('button');
    undoBtn.className = 'toast-undo-btn';
    undoBtn.textContent = 'Annuler';
    undoBtn.setAttribute('aria-label', 'Annuler cette action');
    undoBtn.addEventListener('click', () => {
      clearTimeout(timerId);
      item.remove();
      undoCallback();
    });
    item.appendChild(undoBtn);
  }

  container.appendChild(item);

  timerId = setTimeout(() => {
    item.style.opacity = '0';
    item.style.transform = 'translateY(8px)';
    item.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    setTimeout(() => item.remove(), 200);
  }, duration);

  return {
    dismiss: () => {
      clearTimeout(timerId);
      item.remove();
    }
  };
}

export function openAccessibleDialog(dialogElement) {
  if (!dialogElement) return;
  lastFocusedElement = document.activeElement;
  dialogElement.showModal();
}

export function closeAccessibleDialog(dialogElement) {
  if (!dialogElement) return;
  dialogElement.close();
  if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
    lastFocusedElement.focus();
  }
}

// ==========================================================================
// CYCLE DE VIE & NAVIGATION DES ÉCRANS (Landing / Wizard / App)
// ==========================================================================

async function initApp() {
  setupEventListeners();

  // 1. Vérification de la session en cache local (Device-first)
  const cachedSession = localStorage.getItem('capvoyage_session');
  if (cachedSession) {
    try {
      const parsed = JSON.parse(cachedSession);
      if (parsed && (parsed.isDemo || parsed.token || parsed.email)) {
        state.session = parsed;
      }
    } catch (e) {
      console.warn('Session locale non valide');
    }
  }

  // 2. Détection du mode Partage en Lecture Seule (?share=token)
  const urlParams = new URLSearchParams(window.location.search);
  const shareToken = urlParams.get('share');
  if (shareToken) {
    state.isReadOnly = true;
    document.body.classList.add('mode-readonly');
    if (elements.readonlyBanner) {
      elements.readonlyBanner.style.display = 'flex';
    }
    await enterAppView();
    registerServiceWorker();
    return;
  }

  // 3. Si aucune session, afficher la Landing Page
  if (!state.session) {
    showLandingView();
  } else {
    await enterAppView();
  }

  // 4. Enregistrement PWA (Service Worker)
  registerServiceWorker();
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    // Recharger une fois quand une nouvelle version du SW prend la main (pas au premier install)
    const hadController = !!navigator.serviceWorker.controller;
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(err => {
      console.warn('Enregistrement ServiceWorker non disponible:', err);
    });
  }
}

function showLandingView() {
  elements.viewLanding.classList.add('active');
  elements.viewWizard.classList.remove('active');
  elements.viewApp.classList.remove('active');

  // Ajustement dynamique des boutons d'appel à l'action si déjà connecté
  if (state.session) {
    elements.btnLandingOpenLogin.textContent = 'Mon Voyage ➔';
    elements.btnLandingOpenLogin.onclick = () => enterAppView();
    elements.btnHeroStart.textContent = 'Reprendre mon Voyage ✈️';
    elements.btnHeroStart.onclick = () => enterAppView();
  } else {
    elements.btnLandingOpenLogin.textContent = 'Se Connecter';
    elements.btnLandingOpenLogin.onclick = () => openLoginModal();
    elements.btnHeroStart.textContent = 'Commencer mon Voyage ✈️';
    elements.btnHeroStart.onclick = () => openLoginModal();
  }
}

function showWizardView() {
  elements.viewLanding.classList.remove('active');
  elements.viewApp.classList.remove('active');
  elements.viewWizard.classList.add('active');

  // Réinitialisation du Wizard à l'Étape 1
  setWizardStep(1);

  // Initialisation de la sélection visuelle de destination
  initDestinationSelector();

  // Réinitialisation de la liste des contacts unitaires (Étape 3)
  state.wizardContactsList = [];
  renderWizardContactsList();

  // Valeurs par défaut pratiques
  elements.wizStartDate.value = state.wizardData.startDate || '2026-11-01';
  elements.wizEndDate.value = state.wizardData.endDate || '2026-11-21';
  elements.wizBudget.value = state.wizardData.totalBudget || 2500;
}

// --------------------------------------------------------------------------
// Destinations Populaires & Cascade Dynamique Pays -> Villes (V3)
// --------------------------------------------------------------------------
function initDestinationSelector() {
  if (!elements.destPopularCards) return;
  elements.destPopularCards.innerHTML = '';

  COUNTRIES_CATALOG.forEach(country => {
    const card = document.createElement('div');
    card.className = 'dest-card';
    card.dataset.country = country.name;
    card.innerHTML = `
      <span class="dest-card-flag">${country.flag}</span>
      <span class="dest-card-name">${country.name}</span>
    `;

    card.addEventListener('click', () => {
      selectDestinationCountry(country);
    });

    elements.destPopularCards.appendChild(card);
  });

  // Sélection initiale par défaut (Cameroun ou existant)
  const defaultCountry = COUNTRIES_CATALOG.find(c => c.name === (state.wizardData.country || 'Cameroun')) || COUNTRIES_CATALOG[0];
  if (defaultCountry) {
    selectDestinationCountry(defaultCountry);
  }
}

function selectDestinationCountry(country) {
  if (elements.destPopularCards) {
    elements.destPopularCards.querySelectorAll('.dest-card').forEach(c => {
      c.classList.toggle('selected', c.dataset.country === country.name);
    });
  }

  // Synchronisation des champs
  elements.wizCountry.value = country.name;
  if (elements.wizCountryInput) elements.wizCountryInput.value = country.name;

  // Auto-sélection de la monnaie
  const defCurr = country.defaultCurrency || 'EUR';
  if (elements.wizCurrency) {
    elements.wizCurrency.value = defCurr;
  }

  // Cascade animée des villes
  renderCascadingCities(country);
}

function renderCascadingCities(country) {
  if (!elements.wizCascadingCitiesWrapper || !elements.wizCascadingCities) return;
  elements.wizCascadingCities.innerHTML = '';
  elements.wizCascadingCitiesWrapper.style.display = 'block';

  const cities = country.cities || [];
  cities.forEach((city, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'cascading-city-chip';
    chip.style.animationDelay = `${idx * 30}ms`;
    chip.textContent = city;
    chip.dataset.city = city;

    chip.addEventListener('click', () => {
      selectCity(city);
    });

    elements.wizCascadingCities.appendChild(chip);
  });

  // Sélection par défaut de la première ville
  const targetCity = (state.wizardData.mainCity && cities.includes(state.wizardData.mainCity)) ? state.wizardData.mainCity : cities[0];
  if (targetCity) {
    selectCity(targetCity);
  }
}

function selectCity(cityName) {
  if (elements.wizCascadingCities) {
    elements.wizCascadingCities.querySelectorAll('.cascading-city-chip').forEach(c => {
      c.classList.toggle('selected', c.dataset.city === cityName);
    });
  }
  elements.wizCity.value = cityName;
  if (elements.wizCityInput) elements.wizCityInput.value = cityName;
  if (elements.wizContactCity) elements.wizContactCity.value = cityName;
}

// --------------------------------------------------------------------------
// Contacts Multiples avec Validation Unitaire (Étape 3 V3)
// --------------------------------------------------------------------------
function renderWizardContactsList() {
  if (!elements.wizAddedContactsList) return;
  elements.wizAddedContactsList.innerHTML = '';

  const contacts = state.wizardContactsList || [];
  if (elements.wizContactsCount) elements.wizContactsCount.textContent = contacts.length;

  if (contacts.length === 0) {
    if (elements.wizNoContactsHint) elements.wizNoContactsHint.style.display = 'inline-block';
    return;
  }

  if (elements.wizNoContactsHint) elements.wizNoContactsHint.style.display = 'none';

  contacts.forEach((c, index) => {
    const chip = document.createElement('div');
    chip.className = 'wiz-contact-chip';
    chip.innerHTML = `
      <span>👤 ${escapeHtml(c.name)}</span>
      <span class="chip-rel">${escapeHtml(c.relationship || 'Proche')}</span>
      ${c.city ? `<span class="chip-rel">📍 ${escapeHtml(c.city)}</span>` : ''}
      <button type="button" class="chip-del" title="Retirer ce contact">&times;</button>
    `;

    chip.querySelector('.chip-del').addEventListener('click', () => {
      state.wizardContactsList.splice(index, 1);
      renderWizardContactsList();
    });

    elements.wizAddedContactsList.appendChild(chip);
  });
}

function setWizardStep(stepNumber) {
  // Panes
  elements.wizardStep1.classList.toggle('active', stepNumber === 1);
  elements.wizardStep2.classList.toggle('active', stepNumber === 2);
  elements.wizardStep3.classList.toggle('active', stepNumber === 3);

  // Indicateurs de progression
  elements.dotStep1.classList.toggle('active', stepNumber >= 1);
  elements.dotStep2.classList.toggle('active', stepNumber >= 2);
  elements.dotStep3.classList.toggle('active', stepNumber >= 3);
}

async function enterAppView() {
  elements.viewLanding.classList.remove('active');
  elements.viewWizard.classList.remove('active');
  elements.viewApp.classList.add('active');

  // Affichage du profil utilisateur
  if (state.session) {
    elements.userEmailText.textContent = state.session.isDemo ? 'Mode Démo (Cameroun)' : state.session.email;
  }

  await loadTripData();
  renderAll();
}

// ==========================================================================
// GESTION DU VOYAGE & PERSISTANCE (Offline-First)
// ==========================================================================

async function loadTripData() {
  try {
    const headers = {};
    if (state.session?.token) {
      headers['Authorization'] = `Bearer ${state.session.token}`;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const shareParam = urlParams.get('share');
    const endpoint = shareParam ? `/api/trip?share=${encodeURIComponent(shareParam)}` : '/api/trip';

    const res = await fetch(endpoint, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    // Si le compte authentifié n'a encore aucun voyage configuré, le guider vers le Wizard
    if (data.hasTrip === false) {
      state.trip = null;
      localStorage.removeItem('capvoyage_trip_cache');
      showWizardView();
      return;
    }

    state.trip = data;
    localStorage.setItem('capvoyage_trip_cache', JSON.stringify(data));
  } catch (err) {
    console.warn('Serveur distant non joignable, récupération depuis le stockage hors-ligne...', err);
    const cached = localStorage.getItem('capvoyage_trip_cache');
    if (cached) {
      state.trip = JSON.parse(cached);
    } else if (state.session && !state.session.isDemo) {
      // Utilisateur connecté sans aucun cache : ouvrir l'assistant
      showWizardView();
      return;
    } else {
      // Voyage de secours Démo initialisé
      state.trip = TripService.createTrip({
        country: 'Cameroun',
        startDate: '2026-11-01',
        endDate: '2026-11-21',
        totalBudget: 2500
      });
      state.trip.todos = TodoService.createDefaultTodos('Cameroun');
    }
  }
}

async function saveTripData() {
  if (!state.trip || state.isReadOnly) return;

  // 1. Sauvegarde instantanée dans le cache local (Offline-first)
  localStorage.setItem('capvoyage_trip_cache', JSON.stringify(state.trip));

  // 2. Synchronisation serveur en arrière-plan
  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.session?.token) {
      headers['Authorization'] = `Bearer ${state.session.token}`;
    }
    await fetch('/api/trip', {
      method: 'POST',
      headers,
      body: JSON.stringify(state.trip)
    });
  } catch (err) {
    console.warn('Synchronisation serveur différée (accès hors-ligne actif)', err);
  }
}

// ==========================================================================
// RENDU COMPLET DES COMPOSANTS DE L'APPLICATION
// ==========================================================================

function renderAll() {
  if (!state.trip) return;

  renderHeader();
  renderRemindersBanner();
  renderDayTimeline();
  renderActiveDayPlanning();
  renderTemplateRibbon();
  renderTodos();
  renderBudget();
  renderContacts();
}

// --------------------------------------------------------------------------
// En-tête de l'application & Badges
// --------------------------------------------------------------------------
function renderHeader() {
  const trip = state.trip;
  elements.tripMainTitle.textContent = trip.title;

  const countryName = trip.country || 'Cameroun';
  const flag = countryName.toLowerCase().includes('cameroun') ? '🇨🇲' : '🌍';
  elements.tripCountryBadge.textContent = `${flag} ${countryName}`;

  const dayCount = (trip.days || []).length;
  elements.tripMetaDates.textContent = `Du ${formatDateFr(trip.startDate)} au ${formatDateFr(trip.endDate)} • ${dayCount} jours`;

  const todosUndone = (trip.todos || []).filter(t => t.status !== 'Fait').length;
  elements.todoBadgeCount.textContent = todosUndone;
  if (elements.mobileBadgeTodos) {
    elements.mobileBadgeTodos.textContent = todosUndone;
    elements.mobileBadgeTodos.style.display = todosUndone > 0 ? 'inline-block' : 'none';
  }

  const contactsCount = (trip.contacts || []).filter(c => !c.archived).length;
  elements.contactsBadgeCount.textContent = contactsCount;
  if (elements.mobileBadgeContacts) {
    elements.mobileBadgeContacts.textContent = contactsCount;
    elements.mobileBadgeContacts.style.display = contactsCount > 0 ? 'inline-block' : 'none';
  }

  const budgetSummary = BudgetEngine.calculateSummary(trip);
  elements.headerRemainingBadge.textContent = `${formatNumber(budgetSummary.remainingBudgetBase)} € restants`;
  elements.headerRemainingBadge.className = budgetSummary.isOverBudget ? 'badge-solde overbudget' : 'badge-solde';
}

// --------------------------------------------------------------------------
// Bandeau d'Alertes Prioritaires & Échéances (Vaccins, Visas, Agenda)
// --------------------------------------------------------------------------
function renderRemindersBanner() {
  if (!state.trip) return;

  const reminders = ReminderService.getConsolidatedReminders(state.trip);
  elements.remindersContainer.innerHTML = '';

  if (reminders.length === 0) {
    elements.remindersBannerZone.style.display = 'none';
    return;
  }

  elements.remindersBannerZone.style.display = 'block';

  reminders.forEach(rem => {
    const chip = document.createElement('div');
    chip.className = `reminder-chip ${rem.priority || 'warning'}`;
    chip.style.cursor = 'pointer';

    let icon = '🔔';
    if (rem.id === 'rem-vaccin') icon = '💉';
    else if (rem.id === 'rem-visa') icon = '🛂';
    else if (rem.type === 'activity') icon = '🗓️';

    chip.innerHTML = `
      <span>${icon}</span>
      <span>${escapeHtml(rem.title)} : ${escapeHtml(rem.message || '')}</span>
    `;

    chip.onclick = () => {
      if (rem.type === 'todo') {
        switchTab('tab-todos');
      } else if (rem.type === 'activity') {
        if (rem.dayNumber) state.activeDayNumber = rem.dayNumber;
        switchTab('tab-planning');
        renderDayTimeline();
        renderActiveDayPlanning();
      }
    };

    elements.remindersContainer.appendChild(chip);
  });
}

// --------------------------------------------------------------------------
// Sélecteur de Journées & Vue Planning
// --------------------------------------------------------------------------
function renderDayTimeline() {
  const track = elements.daySelectorTrack;
  track.innerHTML = '';

  (state.trip.days || []).forEach(day => {
    const pill = document.createElement('div');
    pill.className = `day-pill ${day.dayNumber === state.activeDayNumber ? 'active' : ''}`;
    pill.innerHTML = `
      <div class="day-pill-number">Jour ${day.dayNumber}</div>
      <div class="day-pill-city">${escapeHtml(day.city || '—')}</div>
    `;
    pill.addEventListener('click', () => {
      state.activeDayNumber = day.dayNumber;
      renderDayTimeline();
      renderActiveDayPlanning();
    });
    track.appendChild(pill);
  });
}

function renderActiveDayPlanning() {
  const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
  if (!day) return;

  elements.activeDayTitle.textContent = `Jour ${day.dayNumber} • ${formatDateFr(day.date)}`;
  elements.activeDayCityName.textContent = day.city || '(Non définie)';

  let activities = day.activities || [];

  // Filtrage par catégorie
  activities = ActivityService.filterActivitiesByCategory(activities, state.activeActivityFilter);

  // Indicateur de filtre actif
  if (state.activeActivityFilter !== 'Tous') {
    elements.filterActiveIndicator.textContent = `(Filtré sur : ${state.activeActivityFilter})`;
  } else {
    elements.filterActiveIndicator.textContent = '';
  }

  elements.activeDayActivityCount.textContent = `${activities.length} activité(s)`;

  // Regroupement dans les 4 blocs temporels
  const grouped = ActivityService.groupActivitiesByTemporalBlocks(activities);

  renderTemporalBlock(elements.listBlockUnassigned, elements.countBlockUnassigned, grouped.unassigned, 'Aucune activité à caler');
  renderTemporalBlock(elements.listBlockMorning, elements.countBlockMorning, grouped.morning, 'Rien de prévu le matin');
  renderTemporalBlock(elements.listBlockAfternoon, elements.countBlockAfternoon, grouped.afternoon, 'Rien de prévu l’après-midi');
  renderTemporalBlock(elements.listBlockEvening, elements.countBlockEvening, grouped.evening, 'Rien de prévu en soirée');
}

function renderTemporalBlock(container, countEl, acts, emptyMsg) {
  countEl.textContent = acts.length;
  container.innerHTML = '';

  if (acts.length === 0) {
    container.innerHTML = `<div class="empty-block-hint">${emptyMsg}</div>`;
    return;
  }

  acts.forEach(act => {
    const card = document.createElement('div');
    card.className = 'activity-card clickable-tile';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Détail de l'activité ${act.title}`);

    // Nuage de contacts liés
    const contactsHtml = (act.contactIds || []).map(cid => {
      const c = (state.trip.contacts || []).find(x => x.id === cid);
      return c ? `<span class="contact-pill-tag">👤 ${escapeHtml(c.name)}</span>` : '';
    }).join('');

    card.innerHTML = `
      <div class="activity-top-row">
        <h4 class="activity-title">${escapeHtml(act.title)}</h4>
        <span class="badge-category cat-${act.category || 'Autre'}">${act.category || 'Autre'}</span>
      </div>

      <div class="activity-details-row">
        ${act.time ? `<div class="activity-detail-item">🕒 <strong>${escapeHtml(act.time)}</strong></div>` : ''}
        ${act.location ? `<div class="activity-detail-item">📍 ${escapeHtml(act.location)}</div>` : ''}
      </div>

      ${contactsHtml ? `<div class="activity-contacts-cloud">${contactsHtml}</div>` : ''}
      ${act.notes ? `<div class="activity-details-row notes-snippet">📝 ${escapeHtml(act.notes)}</div>` : ''}

      <div class="activity-bottom-row">
        <span class="status-badge status-${(act.status || 'À planifier').replace(/\s+/g, '-')}">${act.status || 'À planifier'}</span>
        <div class="card-actions">
          <span class="edit-hint-label">Détail & Modifier ➔</span>
          <button class="icon-action-btn btn-del-act" title="Supprimer l'activité">🗑️</button>
        </div>
      </div>
    `;

    // Clic sur toute la tuile pour ouvrir la modale d'enrichissement / détail
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-del-act')) {
        e.stopPropagation();
        const deletedAct = { ...act };
        ActivityService.deleteActivity(state.trip, act.id);
        saveTripData();
        renderAll();
        showToast(`Activité "${deletedAct.title}" supprimée.`, {
          type: 'info',
          undoCallback: () => {
            ActivityService.addActivity(state.trip, deletedAct);
            saveTripData();
            renderAll();
            showToast(`Activité "${deletedAct.title}" restaurée.`, { type: 'success' });
          }
        });
        return;
      }
      openEnrichModal(act);
    });

    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEnrichModal(act);
      }
    });

    container.appendChild(card);
  });
}

// --------------------------------------------------------------------------
// Modale Enrichissement & Cercles Relationnels (UX Direct V3)
// --------------------------------------------------------------------------
function openEnrichModal(activity) {
  elements.editActivityId.value = activity.id;
  elements.editActivityTitle.value = activity.title;
  elements.editActivityCategory.value = activity.category || 'Autre';
  elements.editActivityStatus.value = activity.status || 'À planifier';
  elements.editActivityTime.value = activity.time || '';
  elements.editActivityLocation.value = activity.location || '';
  elements.editActivityNotes.value = activity.notes || '';

  // Populer le menu déroulant direct de Jour
  if (elements.editActivityDay) {
    elements.editActivityDay.innerHTML = '';
    const currentDay = (state.trip.days || []).find(d => (d.activities || []).some(a => a.id === activity.id)) ||
                       (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);

    (state.trip.days || []).forEach(d => {
      const opt = document.createElement('option');
      opt.value = d.dayNumber;
      opt.textContent = `Jour ${d.dayNumber} • ${formatDateFr(d.date)} (${d.city || 'Sans étape'})`;
      if (currentDay && currentDay.dayNumber === d.dayNumber) {
        opt.selected = true;
      }
      elements.editActivityDay.appendChild(opt);
    });
  }

  // Masquer la boîte de création express de contact au départ
  if (elements.inlineContactBox) {
    elements.inlineContactBox.style.display = 'none';
    if (elements.inlineContactName) elements.inlineContactName.value = '';
  }

  renderContactsInModal(activity.category || 'Autre', activity.contactIds || []);

  openAccessibleDialog(elements.dialogActivityEnrich);
}

// --------------------------------------------------------------------------
// Ruban de Modèles d'Activités & Saisie Rapide (V3)
// --------------------------------------------------------------------------
function renderTemplateRibbon() {
  if (!elements.ribbonItemsContainer) return;
  elements.ribbonItemsContainer.innerHTML = '';

  const quickTemplates = [
    { label: 'Dîner entre amis', icon: '🍽️', pattern: 'Dîner avec {contact}', slot: 'Soirée' },
    { label: 'Repas de famille', icon: '🍲', pattern: 'Repas chez {contact}', slot: 'Midi' },
    { label: 'Rdv professionnel', icon: '💼', pattern: 'Rdv client avec {contact}', slot: 'Matin' },
    { label: 'Plage & Détente', icon: '🏖️', pattern: 'Journée plage & détente', slot: 'Après-midi' },
    { label: 'Marché artisanal', icon: '🛍️', pattern: 'Visite du marché artisanal', slot: 'Matin' },
    { label: 'Trajet interurbain', icon: '🚗', pattern: 'Trajet vers {ville}', slot: 'Matin' }
  ];

  quickTemplates.forEach(t => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'template-pill';
    pill.innerHTML = `${t.icon} ${t.label}`;

    pill.addEventListener('click', () => {
      let resolved = t.pattern;
      const contacts = (state.trip && state.trip.contacts) ? state.trip.contacts : [];
      const firstContact = contacts.find(c => !c.archived);

      if (resolved.includes('{contact}')) {
        resolved = resolved.replace('{contact}', firstContact ? firstContact.name : '...');
      }
      if (resolved.includes('{ville}')) {
        const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
        resolved = resolved.replace('{ville}', day?.city || 'destination');
      }

      elements.inputQuickActivityTitle.value = resolved;
      elements.inputQuickActivityTitle.focus();
      const dotsIdx = resolved.indexOf('...');
      if (dotsIdx !== -1) {
        elements.inputQuickActivityTitle.setSelectionRange(dotsIdx, dotsIdx + 3);
      }
    });

    elements.ribbonItemsContainer.appendChild(pill);
  });
}

function renderContactsInModal(category, selectedContactIds = []) {
  const cloud = elements.editActivityContactsList;
  cloud.innerHTML = '';

  const sortedContacts = ContactService.getContactsForActivityCategory(state.trip, category);

  if (sortedContacts.length === 0) {
    cloud.innerHTML = `<span style="font-size:0.8rem; color:#64748b;">Aucun contact créé. Ajoutez-en dans l'onglet "Contacts".</span>`;
    return;
  }

  sortedContacts.forEach(c => {
    const isChecked = selectedContactIds.includes(c.id);
    const label = document.createElement('label');
    label.className = 'checkbox-tag-item';
    label.innerHTML = `
      <input type="checkbox" name="contact-chk" value="${c.id}" ${isChecked ? 'checked' : ''} />
      <span>${escapeHtml(c.name)} <small>(${escapeHtml(c.relationship)})</small></span>
    `;
    cloud.appendChild(label);
  });
}

function openMoveModal(activity) {
  elements.moveActivityId.value = activity.id;
  elements.moveActivityName.textContent = `"${activity.title}"`;

  const sel = elements.selectTargetDay;
  sel.innerHTML = '';
  (state.trip.days || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `Jour ${d.dayNumber} - ${formatDateFr(d.date)} (${d.city || 'Sans étape'})`;
    if (d.dayNumber === state.activeDayNumber) opt.selected = true;
    sel.appendChild(opt);
  });

  openAccessibleDialog(elements.dialogMoveActivity);
}

// --------------------------------------------------------------------------
// Onglet Préparatifs & To-Dos
// --------------------------------------------------------------------------
function renderTodos() {
  const todos = state.trip.todos || [];
  const progress = TodoService.calculateProgress(todos);

  elements.todoProgressPercent.textContent = `${progress.percentage}%`;
  elements.todoProgressBar.style.width = `${progress.percentage}%`;
  elements.todoProgressDetails.textContent = `${progress.completed} fait(s) sur ${progress.total} préparatifs (${progress.inProgress} en cours)`;

  const filtered = TodoService.filterByCategory(todos, state.activeTodoFilter);
  const container = elements.todosContainer;
  container.innerHTML = '';

  if (filtered.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; color: #64748b; text-align: center; padding: 2rem;">Aucune tâche dans cette catégorie.</p>`;
    return;
  }

  filtered.forEach(todo => {
    const card = document.createElement('div');
    const isDone = todo.status === 'Fait';
    card.className = `todo-item-card ${isDone ? 'is-done' : ''}`;

    let iconCheck = '⚪';
    let statusClass = 'afaire';
    if (todo.status === 'En cours') {
      iconCheck = '🟡';
      statusClass = 'encours';
    } else if (todo.status === 'Fait') {
      iconCheck = '✅';
      statusClass = 'fait';
    }

    card.innerHTML = `
      <div class="todo-body">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem; margin-bottom:0.35rem;">
          <h4 class="todo-title">${escapeHtml(todo.title)}</h4>
          <span class="todo-status-badge status-${statusClass}">${iconCheck} ${escapeHtml(todo.status)}</span>
        </div>
        <div class="todo-meta-row">
          <span class="badge-category cat-${todo.category}">${todo.category}</span>
          <span class="priority-badge priority-${todo.priority}">Priorité ${todo.priority}</span>
          ${todo.notes ? `<span style="color:#64748b; font-size:0.75rem;">📝 ${escapeHtml(todo.notes)}</span>` : ''}
        </div>
      </div>
      <button class="icon-action-btn btn-del-todo" title="Supprimer">🗑️</button>
    `;

    // Clic sur n'importe quel point de la tuile pour ouvrir la modale d'édition complète
    card.addEventListener('click', () => {
      openEditTodoModal(todo);
    });

    // Arrêt de propagation sur la suppression avec Undo
    card.querySelector('.btn-del-todo').addEventListener('click', (e) => {
      e.stopPropagation();
      const deletedTodo = { ...todo };
      TodoService.deleteTodo(state.trip.todos, todo.id);
      saveTripData();
      renderAll();
      showToast(`Tâche "${deletedTodo.title}" supprimée.`, {
        type: 'info',
        undoCallback: () => {
          TodoService.addTodo(state.trip.todos, deletedTodo);
          saveTripData();
          renderAll();
          showToast(`Tâche "${deletedTodo.title}" restaurée.`, { type: 'success' });
        }
      });
    });

    container.appendChild(card);
  });
}

function openEditTodoModal(todo) {
  if (!elements.dialogEditTodo) return;
  elements.editTodoId.value = todo.id;
  elements.editTodoTitle.value = todo.title;
  elements.editTodoCategory.value = todo.category || 'Autre';
  elements.editTodoPriority.value = todo.priority || 'Moyenne';
  elements.editTodoStatus.value = todo.status || 'À faire';
  elements.editTodoNotes.value = todo.notes || '';
  openAccessibleDialog(elements.dialogEditTodo);
}

// --------------------------------------------------------------------------
// Onglet Budget & Devises (Édition directe au clic)
// --------------------------------------------------------------------------
function renderBudget() {
  const summary = BudgetEngine.calculateSummary(state.trip);

  elements.kpiTotalBudget.textContent = `${formatNumber(summary.totalBudgetBase)} €`;
  elements.kpiTotalBudgetXaf.textContent = `~${formatNumber(summary.totalBudgetLocal)} FCFA`;

  elements.kpiTotalSpent.textContent = `${formatNumber(summary.totalSpentBase)} €`;
  elements.kpiTotalSpentXaf.textContent = `~${formatNumber(summary.totalSpentLocal)} FCFA`;

  elements.kpiRemaining.textContent = `${formatNumber(summary.remainingBudgetBase)} €`;
  elements.kpiRemainingXaf.textContent = `~${formatNumber(summary.remainingBudgetLocal)} FCFA`;

  if (summary.isOverBudget) {
    elements.kpiRemainingCard.className = 'kpi-card overbudget';
  } else {
    elements.kpiRemainingCard.className = 'kpi-card highlight';
  }

  elements.currentRateDisplay.textContent = summary.localRate;

  // Répartition par catégorie
  const breakdownList = elements.budgetBreakdownList;
  breakdownList.innerHTML = '';
  if (summary.breakdown.length === 0) {
    breakdownList.innerHTML = `<p style="color:#64748b; font-size:0.85rem;">Aucune dépense enregistrée pour l'instant.</p>`;
  } else {
    summary.breakdown.forEach(b => {
      const item = document.createElement('div');
      item.className = 'breakdown-item';
      item.innerHTML = `
        <div class="breakdown-meta">
          <span>${escapeHtml(b.category)}</span>
          <span>${formatNumber(b.amountBase)} € (${formatNumber(b.amountLocal)} FCFA) • <strong>${b.percentage}%</strong></span>
        </div>
        <div class="breakdown-bar-bg">
          <div class="breakdown-bar-fill" style="width: ${b.percentage}%;"></div>
        </div>
      `;
      breakdownList.appendChild(item);
    });
  }

  // Journal des dépenses
  const expensesWrapper = elements.expensesTableWrapper;
  expensesWrapper.innerHTML = '';
  const expenses = state.trip.expenses || [];

  if (expenses.length === 0) {
    expensesWrapper.innerHTML = `<p style="color:#64748b; font-size:0.85rem; padding: 1rem 0;">Aucune dépense enregistrée.</p>`;
  } else {
    expenses.slice().reverse().forEach(exp => {
      const row = document.createElement('div');
      row.className = 'expense-row-item';
      row.innerHTML = `
        <div class="expense-info-col">
          <h4>${escapeHtml(exp.label)}</h4>
          <p>${formatDateFr(exp.date)} • <span class="badge-category cat-${exp.category}">${exp.category}</span></p>
        </div>
        <div class="expense-amount-col">
          <div>
            <div class="expense-main-val">${formatNumber(exp.amount)} ${exp.currency}</div>
            <div class="expense-sub-val">≈ ${formatNumber(exp.convertedBaseAmount)} €</div>
          </div>
          <button class="icon-action-btn btn-del-expense" title="Supprimer">🗑️</button>
        </div>
      `;

      row.querySelector('.btn-del-expense').addEventListener('click', () => {
        const deletedExp = { ...exp };
        BudgetEngine.deleteExpense(state.trip, exp.id);
        saveTripData();
        renderAll();
        showToast(`Dépense "${deletedExp.label}" supprimée.`, {
          type: 'info',
          undoCallback: () => {
            BudgetEngine.addExpense(state.trip, deletedExp);
            saveTripData();
            renderAll();
            showToast(`Dépense "${deletedExp.label}" restaurée.`, { type: 'success' });
          }
        });
      });

      expensesWrapper.appendChild(row);
    });
  }
}

// --------------------------------------------------------------------------
// Onglet Carnet de Contacts
// --------------------------------------------------------------------------
function renderContacts() {
  const container = elements.contactsContainer;
  container.innerHTML = '';

  const contacts = (state.trip.contacts || []).filter(c => !c.archived);

  if (contacts.length === 0) {
    container.innerHTML = `<p style="grid-column: 1/-1; color:#64748b; text-align: center; padding: 2rem;">Aucun contact pour l'instant. Ajoutez des contacts avec "+ Nouveau Contact" ou importez-les.</p>`;
    return;
  }

  contacts.forEach(contact => {
    const card = document.createElement('div');
    card.className = 'contact-card';

    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    card.innerHTML = `
      <div>
        <div class="contact-header">
          <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
          <span class="contact-relation-badge">${escapeHtml(contact.relationship)}</span>
        </div>

        <div style="margin-top: 0.75rem;">
          ${contact.city ? `<div class="contact-detail-row">📍 Ville : <strong>${escapeHtml(contact.city)}</strong></div>` : ''}
          ${contact.phone ? `
            <div class="contact-detail-row">
              📞 Tél : ${escapeHtml(contact.phone)}
              ${waLink ? `<a href="${waLink}" target="_blank" class="whatsapp-link" title="Discuter sur WhatsApp">💬 WhatsApp</a>` : ''}
            </div>
          ` : ''}
          ${contact.notes ? `<div class="contact-detail-row" style="font-style:italic;">📝 ${escapeHtml(contact.notes)}</div>` : ''}
        </div>
      </div>

      <div class="contact-footer-actions">
        <button class="btn btn-secondary btn-sm btn-view-contact-acts">Activités liées</button>
        <button class="icon-action-btn btn-del-contact" title="Archiver / Supprimer">🗑️</button>
      </div>
    `;

    // Clic sur toute la tuile pour modifier le contact
    card.addEventListener('click', () => {
      openEditContactModal(contact);
    });

    const waEl = card.querySelector('.whatsapp-link');
    if (waEl) {
      waEl.addEventListener('click', (e) => e.stopPropagation());
    }

    card.querySelector('.btn-view-contact-acts').addEventListener('click', (e) => {
      e.stopPropagation();
      openContactActivitiesModal(contact);
    });

    card.querySelector('.btn-del-contact').addEventListener('click', (e) => {
      e.stopPropagation();
      const res = ContactService.deleteOrArchiveContact(state.trip, contact.id);
      saveTripData();
      renderAll();
      if (res.action === 'archived') {
        showToast(`Contact "${contact.name}" archivé (${res.linkedCount} activité(s) liée(s)).`, { type: 'info' });
      } else {
        showToast(`Contact "${contact.name}" supprimé.`, {
          type: 'info',
          undoCallback: () => {
            ContactService.addContact(state.trip, contact);
            saveTripData();
            renderAll();
            showToast(`Contact "${contact.name}" restauré.`, { type: 'success' });
          }
        });
      }
    });

    container.appendChild(card);
  });
}

function renderContactCityPills(selectedCity = '') {
  if (!elements.contactCityPills) return;
  elements.contactCityPills.innerHTML = '';

  const countryCities = GeographyData.getCitiesForCountry(state.trip?.country || 'Cameroun');
  const stepCities = (state.trip?.days || []).map(d => d.city).filter(Boolean);
  const allCities = Array.from(new Set([...countryCities, ...stepCities]));

  allCities.slice(0, 8).forEach(city => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `contact-city-pill ${(selectedCity && selectedCity.toLowerCase() === city.toLowerCase()) ? 'active' : ''}`;
    pill.textContent = city;

    pill.addEventListener('click', () => {
      elements.contactCity.value = city;
      elements.contactCityPills.querySelectorAll('.contact-city-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
    });

    elements.contactCityPills.appendChild(pill);
  });
}

function openAddContactModal() {
  if (!elements.dialogAddContact) return;
  elements.contactId.value = '';
  elements.dialogContactModalTitle.textContent = 'Ajouter une personne au carnet';
  elements.btnSubmitContact.textContent = 'Enregistrer le contact';
  elements.btnDeleteContactInModal.style.display = 'none';

  elements.contactName.value = '';
  elements.contactRelation.value = 'Famille';
  elements.contactCity.value = '';
  elements.contactPhone.value = '';
  elements.contactNotes.value = '';

  renderContactCityPills('');
  openAccessibleDialog(elements.dialogAddContact);
  setTimeout(() => elements.contactName?.focus(), 50);
}

function openEditContactModal(contact) {
  if (!elements.dialogAddContact) return;
  elements.contactId.value = contact.id;
  elements.dialogContactModalTitle.textContent = `Modifier le contact "${contact.name}"`;
  elements.btnSubmitContact.textContent = 'Enregistrer les modifications';
  elements.btnDeleteContactInModal.style.display = 'inline-block';

  elements.contactName.value = contact.name || '';
  elements.contactRelation.value = contact.relationship || 'Autre';
  elements.contactCity.value = contact.city || '';
  elements.contactPhone.value = contact.phone || '';
  elements.contactNotes.value = contact.notes || '';

  renderContactCityPills(contact.city || '');
  openAccessibleDialog(elements.dialogAddContact);
  setTimeout(() => elements.contactName?.focus(), 50);
}

function openContactActivitiesModal(contact) {
  elements.contactActivitiesModalTitle.textContent = `Activités avec ${contact.name}`;
  const listEl = elements.contactActivitiesList;
  listEl.innerHTML = '';

  const activities = ContactService.getContactActivities(state.trip, contact.id);

  if (activities.length === 0) {
    listEl.innerHTML = `<p style="color:#64748b; padding:1rem 0;">Aucune activité n'est actuellement associée à cette personne.</p>`;
  } else {
    activities.forEach(item => {
      const div = document.createElement('div');
      div.className = 'contact-activity-item';
      div.innerHTML = `
        <strong>Jour ${item.dayNumber} (${formatDateFr(item.date)}) :</strong> ${escapeHtml(item.activity.title)}
        <div style="font-size:0.8rem; color:#64748b;">${item.activity.time ? `🕒 ${item.activity.time} ` : ''}${item.activity.location ? `📍 ${item.activity.location} ` : ''}[${item.activity.status}]</div>
      `;
      listEl.appendChild(div);
    });
  }

  openAccessibleDialog(elements.dialogContactActivities);
}

// ==========================================================================
// CONFIGURATION DES GESTIONNAIRES D'ÉVÉNEMENTS
// ==========================================================================

function setupEventListeners() {

  // Détection du statut réseau (En ligne / Hors-ligne)
  window.addEventListener('offline', () => {
    showToast('📶 Mode Hors-Ligne activé : vos modifications sont sauvegardées sur votre appareil', 'warning');
  });
  window.addEventListener('online', () => {
    showToast('🌐 Connexion rétablie : synchronisation avec le serveur réussie !', 'success');
    saveTripData();
  });

  // Fermeture automatique au clic sur le backdrop pour tous les <dialog> et restauration focus
  document.querySelectorAll('dialog').forEach(dialog => {
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        e.clientX >= rect.left &&
        e.clientX <= rect.right &&
        e.clientY >= rect.top &&
        e.clientY <= rect.bottom
      );
      if (!isInDialog) {
        dialog.close();
      }
    });

    dialog.addEventListener('close', () => {
      if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus();
      }
    });
  });

  // Accessibilité Clavier (WAI-ARIA) pour les conteneurs cliquables
  if (elements.dayBannerAccordion) {
    elements.dayBannerAccordion.setAttribute('role', 'button');
    elements.dayBannerAccordion.setAttribute('tabindex', '0');
    elements.dayBannerAccordion.setAttribute('aria-expanded', 'true');
    elements.dayBannerAccordion.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elements.dayBannerAccordion.click();
      }
    });
  }

  if (elements.kpiBudgetCard) {
    elements.kpiBudgetCard.setAttribute('role', 'button');
    elements.kpiBudgetCard.setAttribute('tabindex', '0');
    elements.kpiBudgetCard.setAttribute('aria-label', 'Modifier le budget prévisionnel');
    elements.kpiBudgetCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elements.kpiBudgetCard.click();
      }
    });
  }

  if (elements.userDisplayPill) {
    elements.userDisplayPill.setAttribute('role', 'button');
    elements.userDisplayPill.setAttribute('tabindex', '0');
    elements.userDisplayPill.setAttribute('aria-label', 'Voir mon profil utilisateur');
    elements.userDisplayPill.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        elements.userDisplayPill.click();
      }
    });
  }

  // 1. Navigation Landing & Authentification Passwordless
  elements.btnLandingDemo.addEventListener('click', () => enterDemoMode());
  elements.btnHeroDemo.addEventListener('click', () => enterDemoMode());

  elements.btnCloseLoginDialog.addEventListener('click', () => elements.dialogLogin.close());
  elements.btnCancelLogin.addEventListener('click', () => elements.dialogLogin.close());

  // Demande de Code par Email
  elements.formRequestCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.loginEmailInput.value.trim();
    if (!email) return;

    try {
      const res = await fetch('/api/auth/request-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la demande de code');

      // Affichage de l'étape de validation du code
      elements.loginStepEmail.style.display = 'none';
      elements.loginStepCode.style.display = 'block';
      elements.sentCodeTargetEmail.textContent = email;

      if (data.devCode) {
        elements.devCodeBanner.style.display = 'block';
        elements.devCodeBanner.innerHTML = `🔑 <strong>Code de test : ${data.devCode}</strong> (pré-rempli automatiquement)`;
        elements.loginCodeInput.value = data.devCode;
      } else {
        elements.devCodeBanner.style.display = 'none';
        elements.loginCodeInput.value = '';
      }
    } catch (err) {
      showToast(`Erreur : ${err.message}`, { type: 'danger' });
    }
  });

  elements.btnBackToEmail.addEventListener('click', () => {
    elements.loginStepCode.style.display = 'none';
    elements.loginStepEmail.style.display = 'block';
  });

  // Validation du Code & Connexion
  elements.formVerifyCode.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = elements.sentCodeTargetEmail.textContent.trim();
    const code = elements.loginCodeInput.value.trim();

    try {
      const res = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Code incorrect');

      state.session = {
        token: data.token,
        email: data.email || data.user?.email || email,
        isDemo: false
      };
      localStorage.setItem('capvoyage_session', JSON.stringify(state.session));
      // Nettoyer l'ancien cache local pour charger le vrai voyage de ce compte
      localStorage.removeItem('capvoyage_trip_cache');
      closeAccessibleDialog(elements.dialogLogin);

      // Si nouvel utilisateur ou aucun voyage configuré pour ce compte : aller à la config (Wizard)
      if (data.isNewUser || !data.hasTrip) {
        showWizardView();
      } else {
        await enterAppView();
      }
    } catch (err) {
      showToast(`Erreur : ${err.message}`, { type: 'danger' });
    }
  });

  // Bouton pour configurer un voyage depuis le header
  if (elements.btnHeaderNewTrip) {
    elements.btnHeaderNewTrip.addEventListener('click', () => {
      showWizardView();
    });
  }

  // 2. Déconnexion & Retour Accueil
  elements.btnHeaderHome.addEventListener('click', () => {
    showLandingView();
  });

  elements.btnLogoutHeader.addEventListener('click', async () => {
    logoutUser();
    showLandingView();
    showToast('Vous êtes déconnecté. À bientôt sur CapVoyage !', { type: 'info' });
  });

  // 3. Parcours Onboarding Wizard (< 3 minutes)
  elements.btnWizardCancel.addEventListener('click', () => {
    if (state.trip) enterAppView();
    else showLandingView();
  });

  // Onglets Destinations Populaires / Saisie Libre
  if (elements.tabBtnPopular && elements.tabBtnCustom) {
    elements.tabBtnPopular.addEventListener('click', () => {
      elements.tabBtnPopular.classList.add('active');
      elements.tabBtnCustom.classList.remove('active');
      elements.destPopularPane.style.display = 'block';
      elements.destCustomPane.style.display = 'none';
    });

    elements.tabBtnCustom.addEventListener('click', () => {
      elements.tabBtnCustom.classList.add('active');
      elements.tabBtnPopular.classList.remove('active');
      elements.destCustomPane.style.display = 'block';
      elements.destPopularPane.style.display = 'none';
      if (elements.wizCountryInput) elements.wizCountryInput.focus();
    });
  }

  // Synchronisation saisie libre vers champs techniques masqués
  if (elements.wizCountryInput) {
    elements.wizCountryInput.addEventListener('input', () => {
      elements.wizCountry.value = elements.wizCountryInput.value.trim();
    });
  }
  if (elements.wizCityInput) {
    elements.wizCityInput.addEventListener('input', () => {
      elements.wizCity.value = elements.wizCityInput.value.trim();
    });
  }

  elements.formWizardStep1.addEventListener('submit', (e) => {
    e.preventDefault();
    const country = elements.wizCountry.value.trim();
    const city = elements.wizCity.value.trim();

    if (!country) {
      showToast('Veuillez sélectionner un pays de destination.', { type: 'warning' });
      return;
    }
    if (!city) {
      showToast('Veuillez sélectionner ou renseigner une ville principale d\'arrivée.', { type: 'warning' });
      return;
    }

    const startDate = elements.wizStartDate.value;
    const endDate = elements.wizEndDate.value;

    if (new Date(endDate) < new Date(startDate)) {
      showToast('La date de retour doit être postérieure à la date de départ.', { type: 'warning' });
      return;
    }

    state.wizardData = {
      country,
      mainCity: city,
      startDate,
      endDate,
      totalBudget: parseFloat(elements.wizBudget.value),
      baseCurrency: elements.wizCurrency.value
    };

    setWizardStep(2);
  });

  // Gestion des checkboxes de profil (Étape 2)
  elements.wizPurposesGrid.querySelectorAll('.purpose-card').forEach(card => {
    const chk = card.querySelector('input[type="checkbox"]');
    card.addEventListener('click', (e) => {
      if (e.target !== chk) {
        chk.checked = !chk.checked;
      }
      card.classList.toggle('checked', chk.checked);
    });
  });

  elements.btnWizBack1.addEventListener('click', () => setWizardStep(1));
  elements.btnWizTo3.addEventListener('click', () => {
    const selectedPurposes = Array.from(
      elements.wizPurposesGrid.querySelectorAll('input[type="checkbox"]:checked')
    ).map(c => c.value);
    state.wizardData.activityPurposes = selectedPurposes;
    setWizardStep(3);
  });

  elements.btnWizBack2.addEventListener('click', () => setWizardStep(2));

  // Étape 3 : Contacts unitaires V3
  if (elements.btnWizAddContact) {
    if (elements.wizContactName) {
      elements.wizContactName.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          elements.btnWizAddContact.click();
        }
      });
    }

    elements.btnWizAddContact.addEventListener('click', () => {
      const name = elements.wizContactName.value.trim();
      if (!name) {
        showToast('Veuillez saisir le nom de la personne.', { type: 'warning' });
        return;
      }
      const relationship = elements.wizContactRel.value || 'Famille';
      const city = elements.wizContactCity.value.trim();
      state.wizardContactsList.push({ name, relationship, city });
      elements.wizContactName.value = '';
      renderWizardContactsList();
      elements.wizContactName.focus();
    });
  }

  elements.btnWizSkip3.addEventListener('click', () => {
    finishWizardSubmission([]);
  });

  if (elements.btnWizFinish) {
    elements.btnWizFinish.addEventListener('click', () => {
      finishWizardSubmission(state.wizardContactsList);
    });
  }

  // 4. Navigation par Onglets
  elements.tabButtons.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  if (elements.mobileNavBtns) {
    elements.mobileNavBtns.forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }

  // 5. Filtres par Catégorie d'Activité
  elements.planningCategoryFilters.addEventListener('click', (e) => {
    const pill = e.target.closest('.cat-pill');
    if (!pill) return;
    elements.planningCategoryFilters.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeActivityFilter = pill.dataset.cat;
    renderActiveDayPlanning();
  });

  // 6. Accordéon du Jour (Plier / Déplier la journée active)
  elements.dayBannerAccordion.addEventListener('click', (e) => {
    if (e.target.closest('#btn-edit-city')) return;
    state.isDayFolded = !state.isDayFolded;
    elements.dayBannerAccordion.classList.toggle('folded', state.isDayFolded);
    elements.temporalGridWrapper.classList.toggle('hidden', state.isDayFolded);
  });

  // 7. Ajout Express d'Activité en 2 secondes & Suggestions
  setupTemplateAutocomplete();

  // Bouton @Contact
  if (elements.btnQuickMentionContact) {
    elements.btnQuickMentionContact.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleQuickContactDropdown();
    });
  }

  // Détection de frappe du caractère @
  if (elements.inputQuickActivityTitle) {
    elements.inputQuickActivityTitle.addEventListener('input', () => {
      const val = elements.inputQuickActivityTitle.value;
      if (val.endsWith('@') || val.includes('@')) {
        showQuickContactDropdown();
      }
    });
  }

  elements.formQuickAddActivity.addEventListener('submit', (e) => {
    e.preventDefault();
    const title = elements.inputQuickActivityTitle.value.trim();
    if (!title) return;

    const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
    if (!day) return;

    // Détermination des contacts à lier
    let contactIds = [];
    if (state.selectedContactForQuickAdd) {
      contactIds = [state.selectedContactForQuickAdd];
    } else {
      // Détection automatique si un contact est explicitement nommé
      const titleLower = title.toLowerCase();
      const matched = (state.trip.contacts || []).find(c => !c.archived && titleLower.includes(c.name.toLowerCase()));
      if (matched) {
        contactIds = [matched.id];
      }
    }

    ActivityService.addActivity(state.trip, { dayId: day.id, title, contactIds });
    elements.inputQuickActivityTitle.value = '';
    state.selectedContactForQuickAdd = null;

    if (elements.activityTemplateAutocomplete) {
      elements.activityTemplateAutocomplete.style.display = 'none';
    }
    if (elements.quickContactDropdown) {
      elements.quickContactDropdown.style.display = 'none';
    }

    saveTripData();
    renderAll();
  });

  // 8. Modification de la Ville Étape (remplace prompt())
  elements.btnEditCity.addEventListener('click', () => {
    const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
    if (!day || !elements.dialogEditCity) return;
    elements.inputEditCityName.value = day.city || '';
    openAccessibleDialog(elements.dialogEditCity);
    setTimeout(() => elements.inputEditCityName.focus(), 50);
  });

  if (elements.formEditCity) {
    elements.formEditCity.addEventListener('submit', (e) => {
      e.preventDefault();
      const newCity = elements.inputEditCityName.value.trim();
      if (!newCity) return;
      TripService.assignCityToDay(state.trip, state.activeDayNumber, newCity);
      saveTripData();
      closeAccessibleDialog(elements.dialogEditCity);
      renderAll();
      showToast(`Étape mise à jour : ${newCity}`, { type: 'success' });
    });
  }
  if (elements.btnCancelEditCity) {
    elements.btnCancelEditCity.addEventListener('click', () => closeAccessibleDialog(elements.dialogEditCity));
  }
  if (elements.btnCloseEditCityDialog) {
    elements.btnCloseEditCityDialog.addEventListener('click', () => closeAccessibleDialog(elements.dialogEditCity));
  }

  // 9. Modale Enrichissement (Créneaux rapides, Déplacement direct, Contact Express)
  if (elements.activityQuickTimePills) {
    elements.activityQuickTimePills.addEventListener('click', (e) => {
      const btn = e.target.closest('.time-slot-btn');
      if (!btn) return;
      elements.editActivityTime.value = btn.dataset.time || '';
    });
  }

  if (elements.btnInlineContactToggle) {
    elements.btnInlineContactToggle.addEventListener('click', () => {
      const isVisible = elements.inlineContactBox.style.display !== 'none';
      elements.inlineContactBox.style.display = isVisible ? 'none' : 'block';
      if (!isVisible && elements.inlineContactName) {
        elements.inlineContactName.focus();
      }
    });
  }

  if (elements.btnSaveInlineContact) {
    elements.btnSaveInlineContact.addEventListener('click', async () => {
      const name = elements.inlineContactName.value.trim();
      if (!name) {
        showToast('Veuillez renseigner le nom du contact.', { type: 'warning' });
        return;
      }
      const relationship = elements.inlineContactRelation.value || 'Autre';
      const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
      const newContact = ContactService.addContact(state.trip, {
        name,
        relationship,
        city: day?.city || ''
      });

      if (state.session?.token) {
        try {
          await fetch('/api/user/contacts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${state.session.token}`
            },
            body: JSON.stringify({ name, relationship, city: day?.city || '' })
          });
        } catch (e) {
          console.warn('Sync contact global différée', e);
        }
      }

      const checkedContacts = Array.from(
        elements.editActivityContactsList.querySelectorAll('input[name="contact-chk"]:checked')
      ).map(chk => chk.value);
      checkedContacts.push(newContact.id);

      renderContactsInModal(elements.editActivityCategory.value, checkedContacts);

      elements.inlineContactName.value = '';
      elements.inlineContactBox.style.display = 'none';
      saveTripData();
      renderContacts();
    });
  }

  elements.editActivityCategory.addEventListener('change', () => {
    const selectedContacts = Array.from(
      elements.editActivityContactsList.querySelectorAll('input[name="contact-chk"]:checked')
    ).map(chk => chk.value);
    renderContactsInModal(elements.editActivityCategory.value, selectedContacts);
  });

  elements.formEnrichActivity.addEventListener('submit', (e) => {
    e.preventDefault();
    const actId = elements.editActivityId.value;
    const selectedContacts = Array.from(
      elements.editActivityContactsList.querySelectorAll('input[name="contact-chk"]:checked')
    ).map(chk => chk.value);

    ActivityService.updateActivity(state.trip, actId, {
      title: elements.editActivityTitle.value,
      category: elements.editActivityCategory.value,
      status: elements.editActivityStatus.value,
      time: elements.editActivityTime.value,
      location: elements.editActivityLocation.value,
      contactIds: selectedContacts,
      notes: elements.editActivityNotes.value
    });

    // Déplacement direct de jour si modifié
    if (elements.editActivityDay) {
      const targetDayNumber = parseInt(elements.editActivityDay.value, 10);
      const currentDay = (state.trip.days || []).find(d => (d.activities || []).some(a => a.id === actId));
      if (currentDay && currentDay.dayNumber !== targetDayNumber) {
        TripService.moveActivityToDay(state.trip, actId, targetDayNumber);
        state.activeDayNumber = targetDayNumber;
      }
    }

    elements.dialogActivityEnrich.close();
    saveTripData();
    renderAll();
  });

  elements.btnCloseActivityDialog.addEventListener('click', () => elements.dialogActivityEnrich.close());
  elements.btnCancelActivity.addEventListener('click', () => elements.dialogActivityEnrich.close());

  // 10. Profil & Multi-Voyages V3
  if (elements.userDisplayPill) {
    elements.userDisplayPill.addEventListener('click', () => {
      openUserProfileModal();
    });
  }

  if (elements.btnProfileNewTrip) {
    elements.btnProfileNewTrip.addEventListener('click', () => {
      elements.dialogUserProfile.close();
      showWizardView();
    });
  }

  if (elements.btnProfileLogout) {
    elements.btnProfileLogout.addEventListener('click', () => {
      elements.dialogUserProfile.close();
      logoutUser();
    });
  }

  if (elements.btnCloseProfile) {
    elements.btnCloseProfile.addEventListener('click', () => elements.dialogUserProfile.close());
  }
  if (elements.btnCloseProfileDialog) {
    elements.btnCloseProfileDialog.addEventListener('click', () => elements.dialogUserProfile.close());
  }

  // 10. Déplacement d'Activité
  elements.formMoveActivity.addEventListener('submit', (e) => {
    e.preventDefault();
    const actId = elements.moveActivityId.value;
    const targetDayId = elements.selectTargetDay.value;

    ActivityService.moveActivity(state.trip, actId, targetDayId);
    elements.dialogMoveActivity.close();
    saveTripData();
    renderAll();
  });

  elements.btnCloseMoveDialog.addEventListener('click', () => elements.dialogMoveActivity.close());
  elements.btnCancelMove.addEventListener('click', () => elements.dialogMoveActivity.close());

  // 11. Gestion du Budget (Clic sur le budget pour modification)
  elements.kpiBudgetCard.addEventListener('click', () => {
    elements.editBudgetAmount.value = state.trip.totalBudget;
    openAccessibleDialog(elements.dialogEditBudget);
  });

  elements.formUpdateBudget.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newBudget = parseFloat(elements.editBudgetAmount.value);
    if (isNaN(newBudget) || newBudget <= 0) return;

    TripService.updateTripBudget(state.trip, {
      totalBudget: newBudget,
      baseCurrency: state.trip.baseCurrency || 'EUR'
    });

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (state.session?.token) {
        headers['Authorization'] = `Bearer ${state.session.token}`;
      }
      await fetch('/api/trip/budget', {
        method: 'POST',
        headers,
        body: JSON.stringify({ totalBudget: newBudget })
      });
    } catch (err) {
      console.warn('Mise à jour distante du budget différée', err);
    }

    elements.dialogEditBudget.close();
    saveTripData();
    renderAll();
  });

  elements.btnCloseBudgetDialog.addEventListener('click', () => elements.dialogEditBudget.close());
  elements.btnCancelBudgetEdit.addEventListener('click', () => elements.dialogEditBudget.close());

  // Convertisseur Rapide de Devises
  elements.convEur.addEventListener('input', () => {
    const val = parseFloat(elements.convEur.value);
    if (isNaN(val)) {
      elements.convXaf.value = '';
      return;
    }
    elements.convXaf.value = BudgetEngine.convert({
      amount: val,
      fromCode: 'EUR',
      toCode: 'XAF',
      currencies: state.trip.currencies
    });
  });

  elements.convXaf.addEventListener('input', () => {
    const val = parseFloat(elements.convXaf.value);
    if (isNaN(val)) {
      elements.convEur.value = '';
      return;
    }
    elements.convEur.value = BudgetEngine.convert({
      amount: val,
      fromCode: 'XAF',
      toCode: 'EUR',
      currencies: state.trip.currencies
    });
  });

  // Modification manuelle du Taux (remplace prompt())
  elements.btnEditRate.addEventListener('click', () => {
    const currentRate = (state.trip.currencies || []).find(c => c.code === 'XAF')?.rateToBase || 655.957;
    if (!elements.dialogEditRate) return;
    elements.inputEditRateValue.value = currentRate;
    openAccessibleDialog(elements.dialogEditRate);
    setTimeout(() => elements.inputEditRateValue.focus(), 50);
  });

  if (elements.formEditRate) {
    elements.formEditRate.addEventListener('submit', (e) => {
      e.preventDefault();
      const parsed = parseFloat(elements.inputEditRateValue.value);
      if (!isNaN(parsed) && parsed > 0) {
        BudgetEngine.setCurrencyRate(state.trip, 'XAF', parsed);
        saveTripData();
        closeAccessibleDialog(elements.dialogEditRate);
        renderAll();
        showToast(`Taux actualisé : 1 EUR = ${parsed} XAF`, { type: 'success' });
      }
    });
  }
  if (elements.btnCancelEditRate) {
    elements.btnCancelEditRate.addEventListener('click', () => closeAccessibleDialog(elements.dialogEditRate));
  }
  if (elements.btnCloseEditRateDialog) {
    elements.btnCloseEditRateDialog.addEventListener('click', () => closeAccessibleDialog(elements.dialogEditRate));
  }

  // Ajout Dépense
  elements.btnOpenAddExpense.addEventListener('click', () => {
    elements.formAddExpense.reset();
    elements.expenseDate.value = new Date().toISOString().split('T')[0];
    openAccessibleDialog(elements.dialogAddExpense);
  });

  elements.formAddExpense.addEventListener('submit', (e) => {
    e.preventDefault();
    BudgetEngine.addExpense(state.trip, {
      label: elements.expenseLabel.value,
      amount: parseFloat(elements.expenseAmount.value),
      currency: elements.expenseCurrency.value,
      category: elements.expenseCategory.value,
      date: elements.expenseDate.value
    });
    elements.dialogAddExpense.close();
    saveTripData();
    renderAll();
  });

  elements.btnCloseExpenseDialog.addEventListener('click', () => elements.dialogAddExpense.close());
  elements.btnCancelExpense.addEventListener('click', () => elements.dialogAddExpense.close());

  // 12. Préparatifs To-Dos
  elements.btnOpenAddTodo.addEventListener('click', () => {
    elements.formAddTodo.reset();
    openAccessibleDialog(elements.dialogAddTodo);
  });

  elements.formAddTodo.addEventListener('submit', (e) => {
    e.preventDefault();
    TodoService.addTodo(state.trip.todos, {
      title: elements.todoTitle.value,
      category: elements.todoCategory.value,
      priority: elements.todoPriority.value
    });
    elements.dialogAddTodo.close();
    saveTripData();
    renderAll();
  });

  elements.btnCloseTodoDialog.addEventListener('click', () => elements.dialogAddTodo.close());
  elements.btnCancelTodo.addEventListener('click', () => elements.dialogAddTodo.close());

  // Modale Édition Tâche To-Do (V4)
  if (elements.formEditTodo) {
    elements.formEditTodo.addEventListener('submit', (e) => {
      e.preventDefault();
      const todoId = elements.editTodoId.value;
      if (!todoId) return;

      TodoService.updateTodo(state.trip.todos, todoId, {
        title: elements.editTodoTitle.value,
        category: elements.editTodoCategory.value,
        priority: elements.editTodoPriority.value,
        status: elements.editTodoStatus.value,
        notes: elements.editTodoNotes.value
      });

      elements.dialogEditTodo.close();
      saveTripData();
      renderAll();
    });

    elements.btnCloseEditTodoDialog.addEventListener('click', () => elements.dialogEditTodo.close());
    elements.btnCancelEditTodo.addEventListener('click', () => elements.dialogEditTodo.close());

    elements.btnDeleteEditTodo.addEventListener('click', () => {
      const todoId = elements.editTodoId.value;
      if (!todoId) return;
      const todo = (state.trip.todos || []).find(t => t.id === todoId);
      if (!todo) return;
      const deletedTodo = { ...todo };
      TodoService.deleteTodo(state.trip.todos, todoId);
      closeAccessibleDialog(elements.dialogEditTodo);
      saveTripData();
      renderAll();
      showToast(`Tâche "${deletedTodo.title}" supprimée.`, {
        type: 'info',
        undoCallback: () => {
          TodoService.addTodo(state.trip.todos, deletedTodo);
          saveTripData();
          renderAll();
          showToast(`Tâche "${deletedTodo.title}" restaurée.`, { type: 'success' });
        }
      });
    });
  }

  elements.todoCategoryFilters.addEventListener('click', (e) => {
    const pill = e.target.closest('.filter-pill');
    if (!pill) return;
    elements.todoCategoryFilters.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
    pill.classList.add('active');
    state.activeTodoFilter = pill.dataset.cat;
    renderTodos();
  });

  // 13. Contacts & Contact Picker Web API
  elements.btnOpenAddContact.addEventListener('click', () => {
    openAddContactModal();
  });

  elements.formAddContact.addEventListener('submit', (e) => {
    e.preventDefault();
    const contactId = elements.contactId?.value;
    const name = elements.contactName.value.trim();
    const relationship = elements.contactRelation.value;
    const city = elements.contactCity.value.trim();
    const phone = elements.contactPhone.value.trim();
    const notes = elements.contactNotes.value.trim();

    if (!name) return;

    if (contactId) {
      ContactService.updateContact(state.trip, contactId, {
        name,
        relationship,
        city,
        phone,
        notes
      });
    } else {
      ContactService.addContact(state.trip, {
        name,
        relationship,
        city,
        phone,
        notes
      });
    }

    elements.dialogAddContact.close();
    saveTripData();
    renderAll();
  });

  if (elements.btnDeleteContactInModal) {
    elements.btnDeleteContactInModal.addEventListener('click', () => {
      const contactId = elements.contactId?.value;
      if (!contactId) return;
      const contact = (state.trip.contacts || []).find(c => c.id === contactId);
      if (!contact) return;
      const res = ContactService.deleteOrArchiveContact(state.trip, contactId);
      closeAccessibleDialog(elements.dialogAddContact);
      saveTripData();
      renderAll();
      if (res.action === 'archived') {
        showToast(`Contact "${contact.name}" archivé (${res.linkedCount} activité(s) liée(s)).`, { type: 'info' });
      } else {
        showToast(`Contact "${contact.name}" supprimé.`, {
          type: 'info',
          undoCallback: () => {
            ContactService.addContact(state.trip, contact);
            saveTripData();
            renderAll();
            showToast(`Contact "${contact.name}" restauré.`, { type: 'success' });
          }
        });
      }
    });
  }

  elements.btnCloseContactDialog.addEventListener('click', () => elements.dialogAddContact.close());
  elements.btnCancelContact.addEventListener('click', () => elements.dialogAddContact.close());

  elements.btnCloseContactActivitiesDialog.addEventListener('click', () => elements.dialogContactActivities.close());
  elements.btnCloseContactActivities.addEventListener('click', () => elements.dialogContactActivities.close());

  // 14. Export Calendrier Universel (.ics) (V4)
  if (elements.btnExportIcs) {
    elements.btnExportIcs.addEventListener('click', () => {
      try {
        const icsData = IcsService.generateIcs(state.trip);
        const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const filename = `capvoyage-${(state.trip.destinationCountry || state.trip.country || 'voyage').toLowerCase().replace(/\s+/g, '-')}.ics`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        showToast(`Erreur lors de l'export du calendrier : ${err.message}`, { type: 'danger' });
      }
    });
  }

  // 15. Actualisation des Devises en Direct (V4)
  if (elements.btnSyncRates) {
    elements.btnSyncRates.addEventListener('click', async () => {
      elements.btnSyncRates.textContent = '⏳ Actualisation...';
      const result = await BudgetEngine.syncExchangeRates(state.trip);
      elements.btnSyncRates.textContent = '🔄 Actualiser devises en direct';

      if (elements.syncRatesBadge) {
        elements.syncRatesBadge.style.display = 'inline-block';
        if (result.success) {
          elements.syncRatesBadge.className = 'sync-status-badge success';
          elements.syncRatesBadge.textContent = `Taux à jour (${result.updatedCount} devises) ✓`;
        } else {
          elements.syncRatesBadge.className = 'sync-status-badge offline';
          elements.syncRatesBadge.textContent = 'Mode hors-ligne (taux conservés)';
        }
        setTimeout(() => {
          if (elements.syncRatesBadge) elements.syncRatesBadge.style.display = 'none';
        }, 4000);
      }

      saveTripData();
      renderBudget();
    });
  }

  // 16. Partage de Voyage en Lecture Seule (Lien Magique V4)
  if (elements.btnHeaderShare) {
    elements.btnHeaderShare.addEventListener('click', async () => {
      const token = TripService.getOrCreateShareToken(state.trip);
      await saveTripData();
      const shareUrl = `${window.location.origin}${window.location.pathname}?share=${token}`;
      try {
        await navigator.clipboard.writeText(shareUrl);
        showToast('🔗 Lien de partage copié dans le presse-papier !', { type: 'success' });
      } catch (e) {
        showToast(`Lien : ${shareUrl}`, { type: 'info', duration: 8000 });
      }
    });
  }

  // Intégration Native Contact Picker API
  elements.btnImportNativeContacts.addEventListener('click', async () => {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      try {
        const props = ['name', 'tel'];
        const selected = await navigator.contacts.select(props, { multiple: true });
        if (selected && selected.length > 0) {
          selected.forEach(c => {
            const name = (c.name && c.name[0]) || 'Contact Répertoire';
            const phone = (c.tel && c.tel[0]) || '';
            ContactService.addContact(state.trip, {
              name,
              phone,
              relationship: 'Amis'
            });
          });
          saveTripData();
          renderAll();
          showToast(`${selected.length} contact(s) importé(s) depuis votre carnet !`, { type: 'success' });
        }
      } catch (err) {
        console.warn('Annulation ou refus d\'importation des contacts', err);
      }
    } else {
      showToast("Sélecteur natif indisponible sur cet appareil. Formulaire manuel ouvert.", { type: 'info' });
      elements.formAddContact.reset();
      openAccessibleDialog(elements.dialogAddContact);
    }
  });
}

// --------------------------------------------------------------------------
// Fonctions d'Action du Wizard & Mode Démo
// --------------------------------------------------------------------------
async function finishWizardSubmission(initialContacts = []) {
  const payload = {
    ...state.wizardData,
    initialContacts
  };

  try {
    const headers = { 'Content-Type': 'application/json' };
    if (state.session?.token) {
      headers['Authorization'] = `Bearer ${state.session.token}`;
    }
    const res = await fetch('/api/wizard/trip', {
      method: 'POST',
      headers,
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du voyage');

    state.trip = data.trip;
    state.activeDayNumber = 1;
    saveTripData();
    await enterAppView();
  } catch (err) {
    showToast(`Erreur : ${err.message}`, { type: 'danger' });
  }
}

function enterDemoMode() {
  state.session = AuthService.createDemoSession();
  localStorage.setItem('capvoyage_session', JSON.stringify(state.session));
  localStorage.removeItem('capvoyage_trip_cache');
  enterAppView();
}

function openLoginModal() {
  elements.loginStepEmail.style.display = 'block';
  elements.loginStepCode.style.display = 'none';
  elements.devCodeBanner.style.display = 'none';
  elements.loginEmailInput.value = '';
  elements.loginCodeInput.value = '';
  openAccessibleDialog(elements.dialogLogin);
}

function switchTab(targetTabId) {
  elements.tabButtons.forEach(b => {
    b.classList.remove('active');
    b.setAttribute('aria-selected', 'false');
  });

  if (elements.mobileNavBtns) {
    elements.mobileNavBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-selected', 'false');
    });
  }

  elements.tabPanes.forEach(p => p.classList.remove('active'));

  const activeBtn = document.querySelector(`.tab-btn[data-tab="${targetTabId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    activeBtn.setAttribute('aria-selected', 'true');
  }

  const activeMobileBtn = document.querySelector(`.mobile-nav-btn[data-tab="${targetTabId}"]`);
  if (activeMobileBtn) {
    activeMobileBtn.classList.add('active');
    activeMobileBtn.setAttribute('aria-selected', 'true');
  }

  const targetPane = document.getElementById(targetTabId);
  if (targetPane) targetPane.classList.add('active');
  state.activeTab = targetTabId;
}

// --------------------------------------------------------------------------
// Utilitaires de Formatage
// --------------------------------------------------------------------------
function formatDateFr(isoDate) {
  if (!isoDate) return '';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function formatNumber(num) {
  if (num === undefined || num === null) return '0';
  return Number(num).toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --------------------------------------------------------------------------
// Autocomplete Dynamique des Templates d'Activités (V3)
// --------------------------------------------------------------------------
function setupTemplateAutocomplete() {
  if (!elements.inputQuickActivityTitle || !elements.activityTemplateAutocomplete) return;

  elements.inputQuickActivityTitle.addEventListener('input', () => {
    const query = elements.inputQuickActivityTitle.value.trim();
    if (query.length < 2) {
      elements.activityTemplateAutocomplete.style.display = 'none';
      return;
    }

    const contacts = (state.trip && state.trip.contacts) ? state.trip.contacts : [];
    const results = searchTemplates(query, contacts);

    if (results.length === 0) {
      elements.activityTemplateAutocomplete.style.display = 'none';
      return;
    }

    elements.activityTemplateAutocomplete.innerHTML = '';
    results.slice(0, 5).forEach(tpl => {
      const item = document.createElement('div');
      item.className = 'autocomplete-item';

      const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
      const title = resolveTemplateTitle(tpl, {
        contactName: contacts.find(c => !c.archived)?.name || 'contact',
        cityName: day?.city
      });

      item.innerHTML = `
        <span class="autocomplete-item-title">${tpl.icon} ${escapeHtml(title)}</span>
        <span class="autocomplete-item-meta">${tpl.suggestedSlot} (${tpl.macro})</span>
      `;

      item.addEventListener('click', () => {
        elements.inputQuickActivityTitle.value = title;
        elements.activityTemplateAutocomplete.style.display = 'none';
        elements.inputQuickActivityTitle.focus();
      });

      elements.activityTemplateAutocomplete.appendChild(item);
    });

    elements.activityTemplateAutocomplete.style.display = 'block';
  });

  // Fermer les suggestions au clic en dehors
  document.addEventListener('click', (e) => {
    if (elements.activityTemplateAutocomplete && 
        !elements.activityTemplateAutocomplete.contains(e.target) && 
        e.target !== elements.inputQuickActivityTitle) {
      elements.activityTemplateAutocomplete.style.display = 'none';
    }
    if (elements.quickContactDropdown && 
        !elements.quickContactDropdown.contains(e.target) && 
        e.target !== elements.btnQuickMentionContact) {
      elements.quickContactDropdown.style.display = 'none';
    }
  });
}

function toggleQuickContactDropdown() {
  if (!elements.quickContactDropdown) return;
  const isHidden = elements.quickContactDropdown.style.display === 'none';
  if (isHidden) {
    showQuickContactDropdown();
  } else {
    elements.quickContactDropdown.style.display = 'none';
  }
}

function showQuickContactDropdown() {
  if (!elements.quickContactDropdown) return;
  const container = elements.quickContactDropdown;
  container.innerHTML = '';

  const contacts = (state.trip?.contacts || []).filter(c => !c.archived);
  if (contacts.length === 0) {
    container.innerHTML = `<div style="padding: 0.6rem 0.9rem; font-size: 0.82rem; color: #64748b;">Aucun contact créé. Ajoutez des contacts dans l'onglet "Contacts".</div>`;
    container.style.display = 'block';
    return;
  }

  contacts.forEach(contact => {
    const item = document.createElement('div');
    item.className = 'quick-contact-item';
    item.innerHTML = `
      <span class="quick-contact-name">👤 ${escapeHtml(contact.name)}</span>
      <span class="quick-contact-rel">${escapeHtml(contact.relationship)}</span>
    `;

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      let currentVal = elements.inputQuickActivityTitle.value;
      if (currentVal.includes('@')) {
        currentVal = currentVal.replace(/@[^ ]*$/, contact.name);
      } else if (currentVal.trim() === '') {
        currentVal = `Dîner avec ${contact.name}`;
      } else if (/avec\s*$/i.test(currentVal) || /chez\s*$/i.test(currentVal)) {
        currentVal = `${currentVal.trim()} ${contact.name}`;
      } else {
        currentVal = `${currentVal.trim()} avec ${contact.name}`;
      }

      elements.inputQuickActivityTitle.value = currentVal;
      state.selectedContactForQuickAdd = contact.id;
      container.style.display = 'none';
      elements.inputQuickActivityTitle.focus();
    });

    container.appendChild(item);
  });

  const freeItem = document.createElement('div');
  freeItem.className = 'quick-contact-item';
  freeItem.innerHTML = `<span style="font-size:0.8rem; color:#64748b; font-style:italic;">✍️ Saisie libre (continuer sans lier de contact)</span>`;
  freeItem.addEventListener('click', (e) => {
    e.stopPropagation();
    state.selectedContactForQuickAdd = null;
    container.style.display = 'none';
    elements.inputQuickActivityTitle.focus();
  });
  container.appendChild(freeItem);

  container.style.display = 'block';
}

// --------------------------------------------------------------------------
// Profil Utilisateur & Gestion Multi-Voyages (V3)
// --------------------------------------------------------------------------
async function openUserProfileModal() {
  if (!elements.dialogUserProfile) return;

  const isAuth = state.session && !state.session.isDemo;
  elements.profileEmailDisplay.textContent = isAuth ? state.session.email : 'Mode Démo (Cameroun)';
  elements.profileStatusBadge.textContent = isAuth ? 'Compte Connecté' : 'Mode Démo';
  elements.userTripsList.innerHTML = '<p style="font-size:0.85rem; color:#64748b;">Chargement des séjours...</p>';

  openAccessibleDialog(elements.dialogUserProfile);

  if (!isAuth) {
    elements.userTripsList.innerHTML = `
      <div class="trip-history-item active">
        <div class="trip-item-info">
          <h5>🇨🇲 ${escapeHtml(state.trip?.title || 'Voyage Démo Cameroun')}</h5>
          <p class="trip-item-meta">${(state.trip?.days || []).length} jours • Du ${formatDateFr(state.trip?.startDate)} au ${formatDateFr(state.trip?.endDate)}</p>
        </div>
        <span class="badge">Actif ✓</span>
      </div>
      <p style="font-size:0.8rem; color:#64748b; margin-top:0.75rem;">
        💡 Connectez-vous avec votre adresse email pour sauvegarder plusieurs voyages, basculer entre eux et les retrouver sur tous vos appareils.
      </p>
    `;
    return;
  }

  try {
    const res = await fetch('/api/user/trips', {
      headers: { 'Authorization': `Bearer ${state.session.token}` }
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();

    if (!data.trips || data.trips.length === 0) {
      elements.userTripsList.innerHTML = `<p style="font-size:0.85rem; color:#64748b;">Aucun voyage enregistré.</p>`;
      return;
    }

    elements.userTripsList.innerHTML = '';
    data.trips.forEach(t => {
      const item = document.createElement('div');
      item.className = t.isActive ? 'trip-history-item active' : 'trip-history-item';

      const flag = t.country.toLowerCase().includes('cameroun') ? '🇨🇲' :
                   t.country.toLowerCase().includes('sénégal') ? '🇸🇳' :
                   t.country.toLowerCase().includes('canada') ? '🇨🇦' :
                   t.country.toLowerCase().includes('chine') ? '🇨🇳' : '🌍';

      item.innerHTML = `
        <div class="trip-item-info">
          <h5>${flag} ${escapeHtml(t.title)}</h5>
          <p class="trip-item-meta">
            ${t.daysCount} jours • Budget : ${formatNumber(t.totalBudget)} ${t.baseCurrency} • ${t.activitiesCount} activité(s)
          </p>
        </div>
        <div class="trip-item-action">
          ${t.isActive 
            ? '<span class="badge">Actif ✓</span>' 
            : `<button class="btn btn-sm btn-secondary btn-switch-trip" data-trip-id="${t.id}">Basculer</button>`
          }
        </div>
      `;

      const switchBtn = item.querySelector('.btn-switch-trip');
      if (switchBtn) {
        switchBtn.addEventListener('click', async () => {
          await switchUserTrip(t.id);
        });
      }

      elements.userTripsList.appendChild(item);
    });
  } catch (err) {
    elements.userTripsList.innerHTML = `<p style="font-size:0.85rem; color:#ef4444;">Erreur de chargement : ${err.message}</p>`;
  }
}

async function switchUserTrip(tripId) {
  try {
    const res = await fetch('/api/user/trips/switch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${state.session.token}`
      },
      body: JSON.stringify({ tripId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de voyage');

    state.trip = data.trip;
    state.activeDayNumber = 1;
    saveTripData();
    closeAccessibleDialog(elements.dialogUserProfile);
    renderAll();
  } catch (err) {
    showToast(`Erreur : ${err.message}`, { type: 'danger' });
  }
}

function logoutUser() {
  if (state.session?.token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${state.session.token}` }
    }).catch(() => {});
  }
  state.session = null;
  state.trip = null;
  localStorage.removeItem('capvoyage_session');
  localStorage.removeItem('capvoyage_trip_cache');
  showLandingView();
}

// Lancement au chargement du DOM
document.addEventListener('DOMContentLoaded', initApp);
