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
import { SyncQueue, SyncStatus } from '../domain/SyncQueue.js';
import { NowService } from '../domain/NowService.js';
import { icon } from './icons.js';
import { parseVCard, parseBulk, buildSortRows, toContacts, filterContacts, IMPORT_RELATIONSHIPS } from '../domain/ContactImport.js';

const DEMO_TRIP_KEY = 'capvoyage_demo_trip';
const APP_VERSION = '2.2';
const UPDATE_CHECK_MS = 30 * 60 * 1000;
const SYNC_RETRY_MS = 30000;

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
  sharedSections: null,  // Sections visibles en consultation partagée (ADR-006)
  syncQueue: null,       // File de synchronisation hors-ligne (ADR-003)
  wizardContactsList: [], // Liste locale des contacts ajoutés pas-à-pas à l'étape 3
  enrichContactIds: [],  // Contacts cochés dans la fiche d'activité (sélecteur REQ-3.5)
  quickAddContactIds: [], // Contacts choisis pour l'ajout rapide
  picker: null,          // Contexte du sélecteur de contacts ouvert
  swRegistration: null,  // Enregistrement du Service Worker (mises à jour, ADR-009)
  build: null,           // Identifiant de build du front chargé
  updateAvailable: false, // Une version plus récente est disponible
  importCtx: null,       // Contexte de l'import de contacts { context, rows }
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

  // 10. Onglet À faire (tâches)
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

  // 14 bis. v2.1 : menu d'en-tête, idées, sélecteur, import
  btnHeaderMenu: document.getElementById('btn-header-menu'),
  headerMenu: document.getElementById('header-menu'),
  ideasPanel: document.getElementById('ideas-panel'),
  ideasCount: document.getElementById('ideas-count'),
  ideasList: document.getElementById('ideas-list'),
  nextActivityBanner: document.getElementById('next-activity-banner'),
  btnQuickAddIdea: document.getElementById('btn-quick-add-idea'),
  dialogContactPicker: document.getElementById('dialog-contact-picker'),
  btnCloseContactPicker: document.getElementById('btn-close-contact-picker'),
  contactPickerSearch: document.getElementById('contact-picker-search'),
  contactPickerList: document.getElementById('contact-picker-list'),
  btnContactPickerDone: document.getElementById('btn-contact-picker-done'),
  dialogPlaceIdea: document.getElementById('dialog-place-idea'),
  formPlaceIdea: document.getElementById('form-place-idea'),
  placeIdeaId: document.getElementById('place-idea-id'),
  placeIdeaTitle: document.getElementById('place-idea-title'),
  placeIdeaDay: document.getElementById('place-idea-day'),
  placeIdeaTime: document.getElementById('place-idea-time'),
  btnCancelPlaceIdea: document.getElementById('btn-cancel-place-idea'),
  btnClosePlaceIdea: document.getElementById('btn-close-place-idea'),
  btnWizImportContacts: document.getElementById('btn-wiz-import-contacts'),
  dialogImportContacts: document.getElementById('dialog-import-contacts'),
  btnCloseImportContacts: document.getElementById('btn-close-import-contacts'),
  btnCancelImport: document.getElementById('btn-cancel-import'),
  importSources: document.getElementById('import-sources'),
  importSort: document.getElementById('import-sort'),
  importSortList: document.getElementById('import-sort-list'),
  btnImportNative: document.getElementById('btn-import-native'),
  importVcfFile: document.getElementById('import-vcf-file'),
  importBulkText: document.getElementById('import-bulk-text'),
  btnImportBulk: document.getElementById('btn-import-bulk'),
  btnImportAllFriends: document.getElementById('btn-import-all-friends'),
  btnImportIgnoreNoPhone: document.getElementById('btn-import-ignore-nophone'),
  btnImportConfirm: document.getElementById('btn-import-confirm'),

  // 14 ter. Mises à jour (ADR-009)
  updateBanner: document.getElementById('update-banner'),
  btnUpdateNow: document.getElementById('btn-update-now'),
  appVersionLabel: document.getElementById('app-version-label'),
  profileVersionLabel: document.getElementById('profile-version-label'),
  btnProfileRefresh: document.getElementById('btn-profile-refresh'),

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
  const { type = 'info', undoCallback = null, actionLabel = 'Annuler', duration = 5000 } = opts;
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
    undoBtn.textContent = actionLabel;
    undoBtn.setAttribute('aria-label', actionLabel);
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

/** Remplace chaque <span data-icon="nom"> du HTML statique par l'icône SVG correspondante. */
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.innerHTML = icon(el.dataset.icon, Number(el.dataset.iconSize) || 20);
  });
}

async function initApp() {
  hydrateIcons();
  setupEventListeners();
  initSyncQueue();
  setInterval(() => { if (state.trip) renderNowBanner(); }, 60000);

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
    // Aucune saisie possible en consultation partagée (la lecture seule est aussi garantie par le serveur)
    const READONLY_BLOCKED = '.icon-action-btn, .activity-card, .todo-item-card, .contact-card, .reminder-chip, #kpi-budget-card, #btn-edit-city, #btn-edit-rate, #btn-sync-rates';
    document.addEventListener('click', (e) => {
      if (e.target.closest(READONLY_BLOCKED) && !e.target.closest('a[href]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);
    document.addEventListener('submit', (e) => {
      e.preventDefault();
      e.stopImmediatePropagation();
      document.querySelectorAll('dialog[open]').forEach(d => d.close());
      showToast('Ce voyage est partagé en lecture seule.', { type: 'info' });
    }, true);
    await enterAppView();
    registerServiceWorker();
    return;
  }

  try {
    const shareNotice = sessionStorage.getItem('capvoyage_share_notice');
    if (shareNotice) {
      sessionStorage.removeItem('capvoyage_share_notice');
      showToast(`${shareNotice}`, { type: 'warning', duration: 10000 });
    }
  } catch (e) { /* stockage indisponible */ }

  // 3. Si aucune session, afficher la Landing Page
  if (!state.session) {
    showLandingView();
  } else {
    await enterAppView();
  }

  // 4. Enregistrement PWA (Service Worker)
  registerServiceWorker();
}

// --------------------------------------------------------------------------
// Mises à jour de l'application (ADR-009)
// --------------------------------------------------------------------------
function registerServiceWorker() {
  renderVersionLabels();
  if (!('serviceWorker' in navigator) || !window.location.protocol.startsWith('http')) return;

  // Répond au « PING » du nouveau Service Worker : « mon code sait gérer les mises à jour,
  // inutile de me recharger de force ».
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'PING' && event.ports && event.ports[0]) {
      event.ports[0].postMessage({ type: 'PONG', build: state.build });
    }
  });

  // Un nouveau Service Worker a pris la main : proposer l'actualisation (jamais de rechargement surprise)
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) markUpdateAvailable();
  });

  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
    .then((registration) => { state.swRegistration = registration; })
    .catch(err => {
      console.warn('Enregistrement ServiceWorker non disponible:', err);
    });

  // Revérification : retour au premier plan (PWA reprise sans navigation), retour du réseau, toutes les 30 min
  document.addEventListener('visibilitychange', async () => {
    if (document.visibilityState !== 'visible') return;
    if (!state.updateAvailable) await checkForUpdate();
    // Retour sur l'appli sans rien d'ouvert ni de saisi : on recharge discrètement, sinon la barre reste affichée
    if (state.updateAvailable && isIdleForReload()) applyUpdate();
  });
  window.addEventListener('online', () => checkForUpdate());
  setInterval(() => checkForUpdate(), UPDATE_CHECK_MS);
  checkForUpdate();

  if (elements.btnUpdateNow) elements.btnUpdateNow.addEventListener('click', () => applyUpdate());
  if (elements.btnProfileRefresh) elements.btnProfileRefresh.addEventListener('click', () => hardRefresh());
}

function renderVersionLabels() {
  const text = `Version ${APP_VERSION}${state.build ? ` · build ${state.build}` : ''}`;
  if (elements.appVersionLabel) elements.appVersionLabel.textContent = text;
  if (elements.profileVersionLabel) elements.profileVersionLabel.textContent = text;
}

async function fetchBuildId() {
  try {
    const res = await fetch('/api/version', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()).build || null;
  } catch (err) {
    return null;
  }
}

async function checkForUpdate() {
  if (!navigator.onLine) return;
  if (state.swRegistration) state.swRegistration.update().catch(() => {});
  const build = await fetchBuildId();
  if (!build) return;
  if (state.build === null) {
    state.build = build;
    renderVersionLabels();
  } else if (build !== state.build) {
    markUpdateAvailable();
  }
}

function markUpdateAvailable() {
  state.updateAvailable = true;
  if (elements.updateBanner) elements.updateBanner.hidden = false;
}

// Rien d'ouvert, aucune saisie en cours, aucune modification en attente de synchro
function isIdleForReload() {
  const active = document.activeElement;
  const typing = active && ['INPUT', 'TEXTAREA', 'SELECT'].includes(active.tagName);
  const pending = state.syncQueue && state.syncQueue.getStatus() === SyncStatus.PENDING;
  return !document.querySelector('dialog[open]') && !typing && !pending;
}

// Termine la synchro en attente (3 s au plus) avant de recharger : aucune modification perdue
async function flushBeforeReload() {
  await Promise.race([
    flushSync().catch(() => {}),
    new Promise(resolve => setTimeout(resolve, 3000))
  ]);
}

async function applyUpdate() {
  await flushBeforeReload();
  window.location.reload();
}

// Actualisation complète : la page /reset désinscrit le Service Worker, vide les caches de l'app et le cache HTTP
// du navigateur (Clear-Site-Data: "cache"), sans jamais toucher au localStorage (ADR-009)
async function hardRefresh() {
  if (!navigator.onLine) {
    showToast("Connectez-vous à Internet pour actualiser l'application.", { type: 'warning' });
    return;
  }
  await flushBeforeReload();
  window.location.assign('/reset');
}

function showLandingView() {
  elements.viewLanding.classList.add('active');
  elements.viewWizard.classList.remove('active');
  elements.viewApp.classList.remove('active');

  // Ajustement dynamique des boutons d'appel à l'action si déjà connecté
  if (state.session) {
    elements.btnLandingOpenLogin.textContent = 'Mon voyage';
    elements.btnLandingOpenLogin.onclick = () => enterAppView();
    elements.btnHeroStart.textContent = 'Reprendre mon voyage';
    elements.btnHeroStart.onclick = () => enterAppView();
  } else {
    elements.btnLandingOpenLogin.textContent = 'Se Connecter';
    elements.btnLandingOpenLogin.onclick = () => openLoginModal();
    elements.btnHeroStart.textContent = 'Commencer mon voyage';
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
      <span class="dest-card-flag">${country.code || country.name.slice(0, 2).toUpperCase()}</span>
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
      <span>${escapeHtml(c.name)}</span>
      <span class="chip-rel">${escapeHtml(c.relationship || 'Proche')}</span>
      ${c.city ? `<span class="chip-rel">${escapeHtml(c.city)}</span>` : ''}
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
  const demoBanner = document.getElementById('demo-exit-banner');
  if (demoBanner) demoBanner.hidden = isAuthenticated() || state.isReadOnly;

  await loadTripData();
  if (state.trip && (state.trip.days || []).length > 0) {
    state.activeDayNumber = NowService.getCurrentDay(state.trip, new Date()).dayNumber;
  }
  renderAll();
}

// ==========================================================================
// GESTION DU VOYAGE & PERSISTANCE (Offline-First)
// ==========================================================================

function isAuthenticated() {
  return !!(state.session && state.session.token && !state.session.isDemo);
}

function authHeaders(extra = {}) {
  return isAuthenticated() ? { ...extra, 'Authorization': `Bearer ${state.session.token}` } : { ...extra };
}

function readJsonStorage(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// --------------------------------------------------------------------------
// Synchronisation hors-ligne versionnée (ADR-003)
// --------------------------------------------------------------------------
class SessionExpiredError extends Error {}

function initSyncQueue() {
  state.syncQueue = new SyncQueue({
    storage: localStorage,
    transport: async (trip, baseVersion) => {
      if (!isAuthenticated()) throw new Error('Session absente');
      const res = await fetch('/api/trip', {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ trip, baseVersion })
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 409) return { status: 'conflict', trip: data.trip };
      if (res.status === 401) throw new SessionExpiredError(data.error);
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      return { status: 'ok', trip: data.trip };
    },
    onStatus: renderSyncIndicator,
    onError: (err) => {
      if (err instanceof SessionExpiredError) handleSessionExpired();
    },
    onSaved: (serverTrip) => {
      if (state.trip && state.trip.id === serverTrip.id) {
        state.trip.version = serverTrip.version;
        state.trip.sharing = serverTrip.sharing;
        localStorage.setItem('capvoyage_trip_cache', JSON.stringify(state.trip));
      }
    },
    onConflict: (serverTrip) => {
      if (state.trip && state.trip.id === serverTrip.id) {
        state.trip = serverTrip;
        localStorage.setItem('capvoyage_trip_cache', JSON.stringify(serverTrip));
        renderAll();
      }
      showToast('Ce voyage a été modifié sur un autre appareil : la version la plus récente est affichée.', {
        type: 'warning',
        duration: 15000,
        actionLabel: 'Restaurer ma version',
        undoCallback: () => restoreLocalVersion(serverTrip)
      });
    }
  });

  setInterval(() => {
    if (state.syncQueue.getStatus() === SyncStatus.PENDING && navigator.onLine) flushSync();
  }, SYNC_RETRY_MS);

  // En cas de conflit, l'indicateur permet de trancher à tout moment
  document.getElementById('sync-indicator')?.addEventListener('click', () => {
    const status = state.syncQueue.getStatus();
    if (status === SyncStatus.PENDING) {
      flushSync();
      return;
    }
    if (status !== SyncStatus.CONFLICT || !state.trip) return;
    const restore = window.confirm('Ce voyage a été modifié sur un autre appareil.\n\nOK : restaurer votre version (elle remplacera l\'autre)\nAnnuler : garder la version affichée');
    if (restore) {
      restoreLocalVersion(state.trip);
    } else {
      state.syncQueue.dismissConflict(state.trip.id);
    }
  });
  renderSyncIndicator(state.syncQueue.getStatus());
}

async function flushSync() {
  if (!state.syncQueue || !isAuthenticated()) return;
  await state.syncQueue.flush();
}

function restoreLocalVersion(serverTrip) {
  const local = state.syncQueue.restoreConflict(serverTrip.id, serverTrip.version);
  if (!local) return;
  state.trip = { ...local, version: serverTrip.version };
  localStorage.setItem('capvoyage_trip_cache', JSON.stringify(state.trip));
  renderAll();
  flushSync();
}

function renderSyncIndicator(status) {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  const showIndicator = isAuthenticated() && !state.isReadOnly;
  el.hidden = !showIndicator;
  const labels = {
    [SyncStatus.SAVED]: 'Enregistré',
    [SyncStatus.PENDING]: 'En attente de synchro',
    [SyncStatus.CONFLICT]: 'Conflit de synchronisation'
  };
  const icons = { [SyncStatus.SAVED]: 'cloud', [SyncStatus.PENDING]: 'cloudup', [SyncStatus.CONFLICT]: 'alert' };
  const label = labels[status] || '';
  el.innerHTML = label ? `${icon(icons[status] || 'cloud', 20)}<span class="sr-only">${label}</span>` : '';
  el.title = label;
  el.dataset.status = status;
}

function handleSessionExpired() {
  showToast('Votre session a expiré : reconnectez-vous pour synchroniser vos modifications.', { type: 'warning', duration: 8000 });
  state.session = null;
  localStorage.removeItem('capvoyage_session');
  showLandingView();
}

async function loadTripData() {
  const urlParams = new URLSearchParams(window.location.search);
  const shareParam = urlParams.get('share');

  // 1. Consultation partagée : vue filtrée par le serveur, en lecture seule
  if (shareParam) {
    const res = await fetch(`/api/trip?share=${encodeURIComponent(shareParam)}`).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (!res || !res.ok) {
      state.trip = null;
      showShareUnavailable(data.error || "Ce lien de partage n'est plus actif");
      return;
    }
    state.trip = {
      days: [], todos: [], contacts: [], expenses: [],
      currencies: JSON.parse(JSON.stringify(BudgetEngine.getSupportedCurrencies())),
      totalBudget: 0, baseCurrency: 'EUR',
      ...data
    };
    state.sharedSections = data.sharedSections || [];
    applySharedSectionsVisibility();
    return;
  }

  // 2. Démo : copie locale propre à ce navigateur, jamais envoyée au serveur (REQ-SEC-3)
  if (!isAuthenticated()) {
    const localDemo = readJsonStorage(DEMO_TRIP_KEY);
    if (localDemo) {
      state.trip = localDemo;
      return;
    }
    try {
      const res = await fetch('/api/trip');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.trip = await res.json();
    } catch (err) {
      state.trip = TripService.createTrip({ country: 'Cameroun', startDate: '2026-11-01', endDate: '2026-11-21', totalBudget: 2500 });
      state.trip.todos = TodoService.createDefaultTodos('Cameroun');
    }
    localStorage.setItem(DEMO_TRIP_KEY, JSON.stringify(state.trip));
    return;
  }

  // 3. Compte connecté : envoyer d'abord les modifications en attente, puis lire le serveur
  await flushSync();
  if (!isAuthenticated()) return;
  const cached = readJsonStorage('capvoyage_trip_cache');
  if (cached && state.syncQueue.hasPending(cached.id)) {
    // Toujours hors-ligne : la copie locale est la plus récente
    state.trip = cached;
    return;
  }

  try {
    const res = await fetch('/api/trip', { headers: authHeaders() });
    if (res.status === 401) {
      handleSessionExpired();
      return;
    }
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
    if (cached) {
      state.trip = cached;
    } else {
      // Utilisateur connecté sans aucun cache : ouvrir l'assistant
      showWizardView();
    }
  }
}

async function saveTripData() {
  if (!state.trip || state.isReadOnly) return;

  // Démo : uniquement sur cet appareil
  if (!isAuthenticated()) {
    localStorage.setItem(DEMO_TRIP_KEY, JSON.stringify(state.trip));
    return;
  }

  // 1. Sauvegarde instantanée dans le cache local (Offline-first)
  localStorage.setItem('capvoyage_trip_cache', JSON.stringify(state.trip));

  // 2. Mise en file puis synchronisation (rejouée automatiquement si hors-ligne)
  state.syncQueue.enqueue(state.trip, state.trip.version || 1);
  await flushSync();
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
  renderIdeas();
  renderNowBanner();
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
  elements.tripCountryBadge.textContent = countryName;

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

  if (state.syncQueue) renderSyncIndicator(state.syncQueue.getStatus());

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

    let iconName = 'bell';
    if (rem.id === 'rem-vaccin') iconName = 'shield';
    else if (rem.id === 'rem-visa') iconName = 'shield';
    else if (rem.type === 'activity') iconName = 'calendar';

    chip.innerHTML = `
      <span class="reminder-ic">${icon(iconName, 18)}</span>
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
const DOW_FMT = new Intl.DateTimeFormat('fr-FR', { weekday: 'short', timeZone: 'UTC' });

function renderDayTimeline() {
  const track = elements.daySelectorTrack;
  track.innerHTML = '';
  const current = state.trip ? NowService.getCurrentDay(state.trip, new Date()) : null;

  (state.trip.days || []).forEach(day => {
    const isActive = day.dayNumber === state.activeDayNumber;
    const isToday = !!current && current.phase === 'during' && current.dayNumber === day.dayNumber;
    const count = (day.activities || []).length;
    const date = new Date(`${day.date}T00:00:00Z`);
    const dow = isNaN(date) ? '' : DOW_FMT.format(date).replace('.', '');
    const dayOfMonth = isNaN(date) ? day.dayNumber : date.getUTCDate();
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = `day-pill${isActive ? ' active' : ''}${isToday ? ' today' : ''}`;
    pill.setAttribute('aria-label', `Jour ${day.dayNumber}, ${day.city || 'étape non définie'}, ${count} activité${count > 1 ? 's' : ''}${isToday ? ', aujourd’hui' : ''}`);
    if (isActive) pill.setAttribute('aria-current', 'date');
    pill.innerHTML = `
      <span class="day-pill-dow">${dow}</span>
      <span class="day-pill-number">${dayOfMonth}</span>
      <span class="day-pill-dots" aria-hidden="true">${'<i></i>'.repeat(Math.min(count, 3))}</span>
    `;
    pill.addEventListener('click', () => {
      state.activeDayNumber = day.dayNumber;
      renderDayTimeline();
      renderActiveDayPlanning();
    });
    track.appendChild(pill);
  });

  const active = track.querySelector('.day-pill.active');
  if (active) track.scrollLeft = active.offsetLeft - (track.clientWidth - active.offsetWidth) / 2;
}

function renderActiveDayPlanning() {
  const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
  if (!day) return;

  const nowInfo = NowService.getCurrentDay(state.trip, new Date());
  const isTodayView = nowInfo.phase === 'during' && nowInfo.dayNumber === day.dayNumber;
  const longDate = new Date(`${day.date}T00:00:00Z`);
  const longLabel = isNaN(longDate) ? formatDateFr(day.date) : new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(longDate);
  elements.activeDayTitle.textContent = isTodayView ? 'Aujourd’hui' : longLabel.charAt(0).toUpperCase() + longLabel.slice(1);
  const indexEl = document.getElementById('active-day-index');
  if (indexEl) indexEl.textContent = `${isTodayView ? longLabel.charAt(0).toUpperCase() + longLabel.slice(1) + ' · ' : ''}Jour ${day.dayNumber} sur ${(state.trip.days || []).length} ·`;
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
  // « À caler » n'apparaît que lorsqu'il y a quelque chose à caler (les autres blocs restent visibles pour ajouter)
  const unassignedBlock = elements.listBlockUnassigned.closest('.temporal-block');
  if (unassignedBlock) unassignedBlock.hidden = grouped.unassigned.length === 0;
  renderTemporalBlock(elements.listBlockMorning, elements.countBlockMorning, grouped.morning, 'Rien de prévu le matin');
  renderTemporalBlock(elements.listBlockAfternoon, elements.countBlockAfternoon, grouped.afternoon, 'Rien de prévu l’après-midi');
  renderTemporalBlock(elements.listBlockEvening, elements.countBlockEvening, grouped.evening, 'Rien de prévu en soirée');
}

function renderTemporalBlock(container, countEl, acts, emptyMsg) {
  countEl.textContent = acts.length;
  container.innerHTML = '';

  if (acts.length === 0) {
    container.innerHTML = `<button type="button" class="empty-block-hint row-slot" data-focus-quick-add>${icon('plus', 18)}<span class="slot-label">${escapeHtml(emptyMsg)}</span></button>`;
    container.querySelector('[data-focus-quick-add]').addEventListener('click', () => {
      if (!state.isReadOnly && elements.inputQuickActivityTitle) elements.inputQuickActivityTitle.focus();
    });
    return;
  }

  acts.forEach(act => {
    const card = document.createElement('div');
    const dayOfAct = (state.trip.days || []).find(d => (d.activities || []).some(a => a.id === act.id));
    const checkable = !state.isReadOnly && ActivityService.isCheckable(act, dayOfAct, NowService.getCurrentDay(state.trip, new Date()).todayStr);
    const isDone = act.status === 'Effectué';
    const isCancelled = act.status === 'Annulé';
    const actContacts = (act.contactIds || []).map(cid => (state.trip.contacts || []).find(x => x.id === cid)).filter(Boolean);

    card.className = `activity-card clickable-tile${isDone ? ' is-done' : ''}${isCancelled ? ' is-cancelled' : ''}`;
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Détail de l'activité ${act.title}`);

    const lead = checkable && !isDone
      ? `<button type="button" class="toggle btn-done-act" title="Marquer comme effectuée" aria-label="Marquer ${escapeHtml(act.title)} comme effectuée"><span>${icon('check', 18)}</span></button>`
      : `<span class="toggle is-static${isDone ? ' is-on' : ''}" aria-hidden="true"><span>${icon('check', 18)}</span></span>`;

    const frags = [
      act.time ? `<span class="frag frag-strong">${escapeHtml(act.time)}</span>` : '',
      isCancelled ? '<span class="frag frag-neg">Annulé</span>' : (act.status === 'Confirmé' ? '<span class="frag frag-pos">Confirmé</span>' : ''),
      `<span class="frag">${escapeHtml(act.location || act.category || 'Autre')}</span>`,
      actContacts.length ? `<span class="frag who">${icon('message', 14)}${escapeHtml(actContacts[0].name)}${actContacts.length > 1 ? ` +${actContacts.length - 1}` : ''}</span>` : ''
    ].join('');

    card.innerHTML = `
      ${lead}
      <div class="act-main">
        <h4 class="activity-title">${escapeHtml(act.title)}</h4>
        <div class="frags">${frags}</div>
      </div>
      <button type="button" class="icon-action-btn btn-del-act" title="Supprimer l'activité" aria-label="Supprimer ${escapeHtml(act.title)}">${icon('trash', 18)}</button>
    `;

    // Clic sur toute la tuile pour ouvrir la modale d'enrichissement / détail
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-done-act')) {
        e.stopPropagation();
        const previous = act.status || 'À planifier';
        ActivityService.updateActivity(state.trip, act.id, { status: 'Effectué' });
        saveTripData();
        renderAll();
        showToast(`« ${act.title} » effectuée.`, {
          type: 'success',
          undoCallback: () => {
            ActivityService.updateActivity(state.trip, act.id, { status: previous });
            saveTripData();
            renderAll();
          }
        });
        return;
      }
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
      if (e.target !== card) return;
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
    const isIdea = (state.trip.ideas || []).some(a => a.id === activity.id);
    const currentDay = isIdea ? null : (state.trip.days || []).find(d => (d.activities || []).some(a => a.id === activity.id));

    const ideaOpt = document.createElement('option');
    ideaOpt.value = '';
    ideaOpt.textContent = 'Aucun jour (idée)';
    ideaOpt.selected = isIdea;
    elements.editActivityDay.appendChild(ideaOpt);

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

  state.enrichContactIds = [...(activity.contactIds || [])];
  renderEnrichContacts();

  openAccessibleDialog(elements.dialogActivityEnrich);
}

// --------------------------------------------------------------------------
// Ruban de Modèles d'Activités & Saisie Rapide (V3)
// --------------------------------------------------------------------------
function renderTemplateRibbon() {
  if (!elements.ribbonItemsContainer) return;
  elements.ribbonItemsContainer.innerHTML = '';

  const quickTemplates = [
    { label: 'Dîner entre amis', icon: 'utensils', pattern: 'Dîner avec {contact}', slot: 'Soirée' },
    { label: 'Repas de famille', icon: 'utensils', pattern: 'Repas chez {contact}', slot: 'Midi' },
    { label: 'Rdv professionnel', icon: 'briefcase', pattern: 'Rdv client avec {contact}', slot: 'Matin' },
    { label: 'Plage & Détente', icon: 'sun', pattern: 'Journée plage & détente', slot: 'Après-midi' },
    { label: 'Marché artisanal', icon: 'gift', pattern: 'Visite du marché artisanal', slot: 'Matin' },
    { label: 'Trajet interurbain', icon: 'train', pattern: 'Trajet vers {ville}', slot: 'Matin' }
  ];

  quickTemplates.forEach(t => {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'template-pill';
    pill.innerHTML = `${icon(t.icon, 16)}<span>${escapeHtml(t.label)}</span>`;

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

function renderEnrichContacts() {
  const cloud = elements.editActivityContactsList;
  cloud.innerHTML = '';

  state.enrichContactIds.forEach(cid => {
    const c = (state.trip.contacts || []).find(x => x.id === cid);
    if (!c) return;
    const chip = document.createElement('span');
    chip.className = 'contact-chip';
    chip.innerHTML = `<span>${escapeHtml(c.name)}</span><button type="button" class="contact-chip-del" aria-label="Retirer ${escapeHtml(c.name)}">&times;</button>`;
    chip.querySelector('.contact-chip-del').addEventListener('click', () => {
      state.enrichContactIds = state.enrichContactIds.filter(id => id !== cid);
      renderEnrichContacts();
    });
    cloud.appendChild(chip);
  });

  const add = document.createElement('button');
  add.type = 'button';
  add.className = 'btn btn-secondary btn-sm contact-chip-add';
  add.textContent = state.enrichContactIds.length ? '＋ Ajouter' : '＋ Choisir les contacts';
  add.addEventListener('click', () => {
    openContactPicker({
      selectedIds: state.enrichContactIds,
      onChange: (ids) => { state.enrichContactIds = ids; renderEnrichContacts(); }
    });
  });
  cloud.appendChild(add);
}

// --------------------------------------------------------------------------
// Onglet À faire (tâches pré-voyage)
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
    container.innerHTML = `<p class="empty-hint">Aucune tâche dans cette catégorie.</p>`;
    return;
  }

  filtered.forEach(todo => {
    const card = document.createElement('div');
    const isDone = todo.status === 'Fait';
    card.className = `todo-item-card ${isDone ? 'is-done' : ''}`;

    const stateName = todo.status === 'En cours' ? 'partial' : (isDone ? 'done' : 'todo');

    card.innerHTML = `
      <button type="button" class="toggle todo-status-btn state-${stateName}" aria-label="${escapeHtml(todo.title)} : ${escapeHtml(todo.status)}. Toucher pour ${isDone ? 'remettre à faire' : 'marquer fait'}"><span>${isDone ? icon('check', 18) : ''}</span><span class="sr-only">${escapeHtml(todo.status)}</span></button>
      <div class="todo-body">
        <h4 class="todo-title">${escapeHtml(todo.title)}</h4>
        <div class="frags">
          <span class="frag">${escapeHtml(todo.category)}</span>
          ${todo.priority === 'Haute' && !isDone ? '<span class="frag frag-neg">Priorité haute</span>' : ''}
          ${todo.notes ? `<span class="frag">${escapeHtml(todo.notes)}</span>` : ''}
        </div>
      </div>
      <button type="button" class="icon-action-btn btn-del-todo" title="Supprimer" aria-label="Supprimer ${escapeHtml(todo.title)}">${icon('trash', 18)}</button>
    `;

    // Clic sur n'importe quel point de la tuile pour ouvrir la modale d'édition complète
    card.addEventListener('click', () => {
      openEditTodoModal(todo);
    });

    // Statut en un tap, sans ouvrir la fiche (REQ-2.5)
    card.querySelector('.todo-status-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      if (state.isReadOnly) return;
      const previous = todo.status;
      TodoService.toggleDone(state.trip.todos, todo.id);
      saveTripData();
      renderAll();
      showToast(todo.status === 'Fait' ? `« ${todo.title} » : fait.` : `« ${todo.title} » : à faire.`, {
        type: 'success',
        undoCallback: () => {
          TodoService.updateTodoStatus(state.trip.todos, todo.id, previous);
          saveTripData();
          renderAll();
        }
      });
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
const EXPENSE_ICONS = {
  'Hébergement': 'home', 'Transport': 'train', 'Nourriture/Resto': 'utensils', 'Restaurant': 'utensils',
  'Santé/Formalités': 'shield', 'Formalités': 'shield', 'Cadeaux': 'gift', 'Sorties': 'users', 'Loisirs': 'sun'
};

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
    breakdownList.innerHTML = `<p class="empty-hint">Aucune dépense enregistrée pour l'instant.</p>`;
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
    expensesWrapper.innerHTML = `<p class="empty-hint">Aucune dépense enregistrée.</p>`;
  } else {
    expenses.slice().reverse().forEach(exp => {
      const row = document.createElement('div');
      row.className = 'expense-row-item';
      row.innerHTML = `
        <span class="lead-ic">${icon(EXPENSE_ICONS[exp.category] || 'wallet', 18)}</span>
        <div class="expense-info-col">
          <h4>${escapeHtml(exp.label)}</h4>
          <p class="frags"><span class="frag">${formatDateFr(exp.date)}</span><span class="frag">${escapeHtml(exp.category)}</span></p>
        </div>
        <div class="expense-amount-col">
          <div>
            <div class="expense-main-val">${formatNumber(exp.amount)} ${exp.currency}</div>
            <div class="expense-sub-val">≈ ${formatNumber(exp.convertedBaseAmount)} €</div>
          </div>
          <button type="button" class="icon-action-btn btn-del-expense" title="Supprimer" aria-label="Supprimer ${escapeHtml(exp.label)}">${icon('trash', 18)}</button>
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
    container.innerHTML = `<p class="empty-hint">Aucun contact pour l'instant. Ajoutez des contacts avec « Nouveau » ou importez-les.</p>`;
    return;
  }

  contacts.forEach(contact => {
    const card = document.createElement('div');
    card.className = 'contact-card';

    const cleanPhone = (contact.phone || '').replace(/[^0-9]/g, '');
    const waLink = cleanPhone ? `https://wa.me/${cleanPhone}` : null;

    const initials = (contact.name || '?').split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase();
    card.innerHTML = `
      <span class="avatar" aria-hidden="true">${escapeHtml(initials)}</span>
      <div class="contact-main">
        <h3 class="contact-name">${escapeHtml(contact.name)}</h3>
        <div class="frags">
          <span class="frag">${escapeHtml(contact.relationship || 'Proche')}</span>
          ${contact.city ? `<span class="frag">${escapeHtml(contact.city)}</span>` : ''}
          ${contact.phone ? `<span class="frag">${escapeHtml(contact.phone)}</span>` : ''}
        </div>
        ${contact.notes ? `<p class="contact-note">${escapeHtml(contact.notes)}</p>` : ''}
      </div>
      ${waLink ? `<a href="${waLink}" target="_blank" rel="noopener" class="whatsapp-link icon-btn icon-btn-pos" title="Discuter sur WhatsApp" aria-label="WhatsApp ${escapeHtml(contact.name)}">${icon('message', 22)}</a>` : '<span></span>'}
      <div class="contact-footer-actions">
        <button type="button" class="link btn-view-contact-acts">Activités liées</button>
        <button type="button" class="icon-action-btn btn-del-contact" title="Archiver / Supprimer" aria-label="Archiver ou supprimer ${escapeHtml(contact.name)}">${icon('trash', 18)}</button>
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
    listEl.innerHTML = `<p class="empty-hint">Aucune activité n'est actuellement associée à cette personne.</p>`;
  } else {
    activities.forEach(item => {
      const div = document.createElement('div');
      div.className = 'contact-activity-item';
      div.innerHTML = `
        <strong>Jour ${item.dayNumber} (${formatDateFr(item.date)}) :</strong> ${escapeHtml(item.activity.title)}
        <div class="frags">${item.activity.time ? `<span class="frag frag-strong">${escapeHtml(item.activity.time)}</span>` : ''}${item.activity.location ? `<span class="frag">${escapeHtml(item.activity.location)}</span>` : ''}<span class="frag">${escapeHtml(item.activity.status || 'À planifier')}</span></div>
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
    showToast('Mode hors ligne activé : vos modifications sont sauvegardées sur votre appareil', 'warning');
  });
  window.addEventListener('online', async () => {
    await flushSync();
    if (isAuthenticated() && state.syncQueue.getStatus() === SyncStatus.SAVED) {
      showToast('Connexion rétablie : modifications synchronisées', 'success');
    }
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
        elements.devCodeBanner.innerHTML = `<strong>Code de test : ${data.devCode}</strong> (pré-rempli automatiquement)`;
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
      openContactPicker({
        selectedIds: state.quickAddContactIds,
        onChange: (ids) => { state.quickAddContactIds = ids; state.selectedContactForQuickAdd = ids[0] || null; },
        onDone: (ids) => {
          const first = (state.trip.contacts || []).find(c => c.id === ids[0]);
          if (first && !elements.inputQuickActivityTitle.value.toLowerCase().includes(first.name.toLowerCase())) {
            const cur = elements.inputQuickActivityTitle.value.trim();
            elements.inputQuickActivityTitle.value = cur ? `${cur} avec ${first.name}` : `Rdv avec ${first.name}`;
          }
          elements.inputQuickActivityTitle.focus();
        }
      });
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

  const handleQuickAdd = (asIdea) => {
    const title = elements.inputQuickActivityTitle.value.trim();
    if (!title) {
      elements.inputQuickActivityTitle.focus();
      return;
    }

    const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
    if (!asIdea && !day) return;

    // Détermination des contacts à lier
    let contactIds = [];
    if (state.quickAddContactIds.length > 0) {
      contactIds = [...state.quickAddContactIds];
    } else if (state.selectedContactForQuickAdd) {
      contactIds = [state.selectedContactForQuickAdd];
    } else {
      // Détection automatique si un contact est explicitement nommé
      const titleLower = title.toLowerCase();
      const matched = (state.trip.contacts || []).find(c => !c.archived && titleLower.includes(c.name.toLowerCase()));
      if (matched) {
        contactIds = [matched.id];
      }
    }

    ActivityService.addActivity(state.trip, { dayId: asIdea ? undefined : day.id, title, contactIds });
    elements.inputQuickActivityTitle.value = '';
    state.selectedContactForQuickAdd = null;
    state.quickAddContactIds = [];

    if (elements.activityTemplateAutocomplete) {
      elements.activityTemplateAutocomplete.style.display = 'none';
    }
    if (elements.quickContactDropdown) {
      elements.quickContactDropdown.style.display = 'none';
    }

    saveTripData();
    renderAll();
    if (asIdea) {
      if (elements.ideasPanel) elements.ideasPanel.open = true;
      showToast(`« ${title} » ajoutée aux idées.`, { type: 'success' });
    }
  };

  elements.formQuickAddActivity.addEventListener('submit', (e) => {
    e.preventDefault();
    handleQuickAdd(false);
  });
  if (elements.btnQuickAddIdea) {
    elements.btnQuickAddIdea.addEventListener('click', () => handleQuickAdd(true));
  }

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

      if (isAuthenticated()) {
        try {
          await fetch('/api/user/contacts', {
            method: 'POST',
            headers: authHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({ name, relationship, city: day?.city || '' })
          });
        } catch (e) {
          console.warn('Sync contact global différée', e);
        }
      }

      state.enrichContactIds.push(newContact.id);
      renderEnrichContacts();

      elements.inlineContactName.value = '';
      elements.inlineContactBox.style.display = 'none';
      saveTripData();
      renderContacts();
    });
  }

  elements.formEnrichActivity.addEventListener('submit', (e) => {
    e.preventDefault();
    const actId = elements.editActivityId.value;
    const selectedContacts = [...state.enrichContactIds];

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
      const rawDay = elements.editActivityDay.value;
      const currentDay = (state.trip.days || []).find(d => (d.activities || []).some(a => a.id === actId));
      if (rawDay === '') {
        // Aucun jour : l'activité retourne aux idées
        if (currentDay) ActivityService.unplaceActivity(state.trip, actId);
      } else {
        const targetDayNumber = parseInt(rawDay, 10);
        if (!currentDay || currentDay.dayNumber !== targetDayNumber) {
          TripService.moveActivityToDay(state.trip, actId, targetDayNumber);
          state.activeDayNumber = targetDayNumber;
        }
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

  // 12. À faire (tâches)
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
      elements.btnSyncRates.textContent = 'Actualisation…';
      const result = await BudgetEngine.syncExchangeRates(state.trip);
      elements.btnSyncRates.textContent = 'Actualiser les devises en direct';

      if (elements.syncRatesBadge) {
        elements.syncRatesBadge.style.display = 'inline-block';
        if (result.success) {
          elements.syncRatesBadge.className = 'sync-status-badge success';
          elements.syncRatesBadge.textContent = `Taux à jour (${result.updatedCount} devises) · FCFA à parité fixe (655,957)`;
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

  // Sortie du mode démo vers la création de compte (U6)
  document.getElementById('btn-demo-create-account')?.addEventListener('click', () => {
    state.session = null;
    localStorage.removeItem('capvoyage_session');
    showLandingView();
    openLoginModal();
  });

  // 16. Partage paramétrable en lecture seule (ADR-006)
  if (elements.btnHeaderShare) {
    elements.btnHeaderShare.addEventListener('click', () => openShareDialog());
  }
  setupShareDialog();

  // Import du répertoire : une seule boîte, trois sources, un écran de tri (ADR-008)
  elements.btnImportNativeContacts.addEventListener('click', () => openImportDialog('trip'));
  setupContactPicker();
  setupImportDialog();
  setupIdeas();
  setupHeaderMenu();
  if (elements.btnWizImportContacts) {
    elements.btnWizImportContacts.addEventListener('click', () => openImportDialog('wizard'));
  }
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
    // Démo : le voyage est créé uniquement sur cet appareil (REQ-SEC-3)
    if (!isAuthenticated()) {
      const localTrip = TripService.createTripFromWizard(payload);
      localTrip.todos = TodoService.createDefaultTodos(payload.country);
      localStorage.setItem(DEMO_TRIP_KEY, JSON.stringify(localTrip));
      state.activeDayNumber = 1;
      await enterAppView();
      return;
    }

    const res = await fetch('/api/wizard/trip', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors de la création du voyage');

    state.trip = data.trip;
    state.activeDayNumber = 1;
    localStorage.setItem('capvoyage_trip_cache', JSON.stringify(data.trip));
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

// --------------------------------------------------------------------------
// Partage paramétrable (ADR-006)
// --------------------------------------------------------------------------
const SHARE_SECTION_TABS = {
  planning: 'tab-planning',
  todos: 'tab-todos',
  budget: 'tab-budget',
  contacts: 'tab-contacts'
};

function getShareUrl(token) {
  return token ? `${window.location.origin}${window.location.pathname}?share=${token}` : '';
}

function renderShareDialog(sharing) {
  const dialog = document.getElementById('dialog-share');
  const enabled = !!sharing?.enabled;
  document.getElementById('share-enabled-toggle').checked = enabled;
  document.getElementById('share-status-label').textContent = enabled ? 'Lien de partage activé' : 'Lien de partage désactivé';
  dialog.querySelectorAll('input[name="share-section"]').forEach(input => {
    input.checked = !!sharing?.sections?.[input.value];
    input.closest('.purpose-card').classList.toggle('checked', input.checked);
  });
  document.getElementById('share-link-input').value = enabled ? getShareUrl(sharing.token) : '';
  document.getElementById('share-link-group').hidden = !enabled;
  document.getElementById('btn-regenerate-share-link').hidden = !enabled;
}

async function updateSharing(changes) {
  const res = await fetch('/api/trip/sharing', {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ tripId: state.trip.id, ...changes })
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    handleSessionExpired();
    throw new Error('Session expirée');
  }
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  state.trip.sharing = data.sharing;
  localStorage.setItem('capvoyage_trip_cache', JSON.stringify(state.trip));
  renderShareDialog(data.sharing);
  return data.sharing;
}

function openShareDialog() {
  if (!isAuthenticated()) {
    showToast('Créez votre compte (gratuit, sans mot de passe) pour partager votre propre voyage.', { type: 'info', duration: 6000 });
    return;
  }
  if (!navigator.onLine) {
    showToast('Le partage se configure en ligne. Réessayez une fois connecté.', { type: 'warning' });
    return;
  }
  renderShareDialog(state.trip.sharing);
  openAccessibleDialog(document.getElementById('dialog-share'));
}

function setupShareDialog() {
  const dialog = document.getElementById('dialog-share');
  if (!dialog) return;
  const close = () => closeAccessibleDialog(dialog);
  const withErrorToast = (fn) => async (...args) => {
    try {
      await fn(...args);
    } catch (err) {
      showToast(`Partage : ${err.message}`, { type: 'danger' });
      renderShareDialog(state.trip?.sharing);
    }
  };

  document.getElementById('btn-close-share-dialog').addEventListener('click', close);
  document.getElementById('btn-done-share').addEventListener('click', close);

  document.getElementById('share-enabled-toggle').addEventListener('change', withErrorToast(async (e) => {
    const sharing = await updateSharing({ enabled: e.target.checked });
    showToast(sharing.enabled ? 'Lien de partage activé' : 'Lien de partage désactivé : il ne donne plus accès à rien', { type: 'success' });
  }));

  dialog.querySelectorAll('input[name="share-section"]').forEach(input => {
    input.addEventListener('change', withErrorToast(async () => {
      await updateSharing({ sections: { [input.value]: input.checked } });
    }));
  });

  document.getElementById('btn-copy-share-link').addEventListener('click', async () => {
    const url = document.getElementById('share-link-input').value;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Lien copié dans le presse-papier !', { type: 'success' });
    } catch (e) {
      document.getElementById('share-link-input').select();
      showToast('Copiez le lien sélectionné (Ctrl+C ou appui long).', { type: 'info' });
    }
  });

  document.getElementById('btn-regenerate-share-link').addEventListener('click', withErrorToast(async () => {
    if (!window.confirm("Régénérer le lien ? L'ancien lien cessera immédiatement de fonctionner.")) return;
    await updateSharing({ regenerate: true });
    showToast('Nouveau lien généré : l\'ancien ne fonctionne plus.', { type: 'success' });
  }));
}

// Consultation partagée : masquer les onglets non partagés et bloquer toute saisie
function applySharedSectionsVisibility() {
  const visibleTabs = (state.sharedSections || []).map(s => SHARE_SECTION_TABS[s]).filter(Boolean);
  document.querySelectorAll('.tab-btn[data-tab], .mobile-nav-btn[data-tab]').forEach(btn => {
    btn.hidden = !visibleTabs.includes(btn.dataset.tab);
  });
  if (visibleTabs.length > 0 && !visibleTabs.includes(state.activeTab)) {
    switchTab(visibleTabs[0]);
  }
}

// Lien inactif : retour à l'accueil normal (hors lecture seule), message affiché après redirection
function showShareUnavailable(message) {
  try {
    sessionStorage.setItem('capvoyage_share_notice', message);
  } catch (e) { /* stockage indisponible : simple redirection */ }
  window.location.replace(window.location.pathname);
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

// --------------------------------------------------------------------------
// v2.1 : Jour courant & prochaine activité (REQ-7.5, REQ-7.6)
// --------------------------------------------------------------------------
function renderNowBanner() {
  const el = elements.nextActivityBanner;
  if (!el || !state.trip) return;
  let html = '';
  const current = NowService.getCurrentDay(state.trip, new Date());
  if (current.phase === 'before' && current.daysUntilStart > 0) {
    const label = `J-${current.daysUntilStart} · ${current.daysUntilStart === 1 ? 'départ demain' : `départ dans ${current.daysUntilStart} jours`}`;
    html = `<span class="now-line">${icon('clock', 18)}<span>${escapeHtml(label)}</span></span>`;
  } else if (current.phase === 'during' && state.activeDayNumber === current.dayNumber) {
    const next = NowService.getNextActivity(state.trip, new Date());
    if (next) {
      const when = next.inMinutes <= 0 ? 'maintenant' : `dans ${NowService.formatDuration(next.inMinutes)}`;
      const contact = (next.activity.contactIds || []).map(cid => (state.trip.contacts || []).find(x => x.id === cid)).find(c => c && (c.phone || '').replace(/[^0-9]/g, ''));
      const wa = contact ? `https://wa.me/${contact.phone.replace(/[^0-9]/g, '')}` : '';
      html = `<span class="now-line">${icon('clock', 18)}<span>Prochaine : <strong>${escapeHtml(next.activity.title)}</strong> ${when}</span></span>`
        + (next.activity.location ? `<span class="now-where">${icon('pin', 16)}${escapeHtml(next.activity.location)}</span>` : '')
        + (wa ? `<a class="btn btn-whatsapp-solid" href="${wa}" target="_blank" rel="noopener">${icon('message', 18)}Écrire à ${escapeHtml(contact.name.split(' ')[0])}</a>` : '');
    }
  }
  el.hidden = !html;
  el.innerHTML = html;
}

// --------------------------------------------------------------------------
// v2.1 : Idées, activités sans jour (REQ-2.4, ADR-007)
// --------------------------------------------------------------------------
function renderIdeas() {
  if (!elements.ideasPanel) return;
  const ideas = state.trip.ideas || [];
  elements.ideasPanel.hidden = state.isReadOnly;
  elements.ideasCount.textContent = ideas.length;
  const list = elements.ideasList;
  list.innerHTML = '';

  if (ideas.length === 0) {
    list.innerHTML = '<div class="empty-block-hint">Aucune idée pour l\'instant. Tapez un titre puis touchez « Idée ».</div>';
    return;
  }

  ideas.forEach(idea => {
    const card = document.createElement('div');
    card.className = 'idea-card clickable-tile';
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `Détail de l'idée ${idea.title}`);
    const contacts = (idea.contactIds || []).map(cid => (state.trip.contacts || []).find(x => x.id === cid)).filter(Boolean);
    card.innerHTML = `
      <span class="lead-ic">${icon('bulb', 18)}</span>
      <div class="idea-main">
        <h4 class="activity-title">${escapeHtml(idea.title)}</h4>
        <div class="frags">
          <span class="frag">${escapeHtml(idea.category || 'Autre')}</span>
          ${idea.location ? `<span class="frag">${escapeHtml(idea.location)}</span>` : ''}
          ${contacts.length ? `<span class="frag who">${icon('message', 14)}${escapeHtml(contacts.map(c => c.name).join(', '))}</span>` : ''}
        </div>
      </div>
      <div class="idea-actions">
        <button type="button" class="btn btn-secondary btn-sm btn-place-idea">Placer</button>
        <button type="button" class="icon-action-btn btn-del-idea" title="Supprimer l'idée" aria-label="Supprimer ${escapeHtml(idea.title)}">${icon('trash', 18)}</button>
      </div>
    `;
    card.addEventListener('click', (e) => {
      if (e.target.closest('.btn-place-idea')) {
        e.stopPropagation();
        openPlaceIdeaDialog(idea);
        return;
      }
      if (e.target.closest('.btn-del-idea')) {
        e.stopPropagation();
        const deleted = { ...idea };
        ActivityService.deleteActivity(state.trip, idea.id);
        saveTripData();
        renderAll();
        showToast(`Idée "${deleted.title}" supprimée.`, {
          type: 'info',
          undoCallback: () => {
            ActivityService.addActivity(state.trip, deleted);
            saveTripData();
            renderAll();
          }
        });
        return;
      }
      openEnrichModal(idea);
    });
    card.addEventListener('keydown', (e) => {
      if (e.target !== card) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openEnrichModal(idea);
      }
    });
    list.appendChild(card);
  });
}

function openPlaceIdeaDialog(idea) {
  elements.placeIdeaId.value = idea.id;
  elements.placeIdeaTitle.textContent = `Placer « ${idea.title} »`;
  elements.placeIdeaTime.value = idea.time || '';
  elements.placeIdeaDay.innerHTML = '';
  (state.trip.days || []).forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.dayNumber;
    opt.textContent = `Jour ${d.dayNumber} • ${formatDateFr(d.date)} (${d.city || 'Sans étape'})`;
    opt.selected = d.dayNumber === state.activeDayNumber;
    elements.placeIdeaDay.appendChild(opt);
  });
  openAccessibleDialog(elements.dialogPlaceIdea);
}

function setupIdeas() {
  if (!elements.formPlaceIdea) return;
  const close = () => closeAccessibleDialog(elements.dialogPlaceIdea);
  elements.btnCancelPlaceIdea.addEventListener('click', close);
  elements.btnClosePlaceIdea.addEventListener('click', close);
  elements.formPlaceIdea.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = elements.placeIdeaId.value;
    const dayNumber = parseInt(elements.placeIdeaDay.value, 10);
    const time = elements.placeIdeaTime.value.trim();
    const activity = ActivityService.placeIdea(state.trip, id, dayNumber, { time });
    state.activeDayNumber = dayNumber;
    saveTripData();
    close();
    renderAll();
    showToast(`« ${activity.title} » placée au jour ${dayNumber}.`, {
      type: 'success',
      undoCallback: () => {
        ActivityService.unplaceActivity(state.trip, id);
        saveTripData();
        renderAll();
      }
    });
  });
}

// --------------------------------------------------------------------------
// v2.1 : Menu d'en-tête « ⋯ » (REQ-UX-2)
// --------------------------------------------------------------------------
function setupHeaderMenu() {
  const btn = elements.btnHeaderMenu;
  const menu = elements.headerMenu;
  if (!btn || !menu) return;

  const setOpen = (open) => {
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  };

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    setOpen(menu.hidden);
    if (!menu.hidden) menu.querySelector('[role="menuitem"]')?.focus();
  });

  menu.addEventListener('click', (e) => {
    const item = e.target.closest('[data-menu-action]');
    if (!item) return;
    setOpen(false);
    const targets = {
      'share': elements.btnHeaderShare,
      'new-trip': elements.btnHeaderNewTrip,
      'profile': elements.userDisplayPill,
      'logout': elements.btnLogoutHeader
    };
    if (item.dataset.menuAction === 'refresh') {
      hardRefresh();
      return;
    }
    targets[item.dataset.menuAction]?.click();
  });

  document.addEventListener('click', (e) => {
    if (!menu.hidden && !e.target.closest('.header-menu-wrap')) setOpen(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !menu.hidden) {
      setOpen(false);
      btn.focus();
    }
  });
}

// --------------------------------------------------------------------------
// v2.1 : Sélecteur de contacts à recherche (REQ-3.5)
// --------------------------------------------------------------------------
function getRecentContactIds() {
  const acts = [...(state.trip.ideas || [])];
  (state.trip.days || []).forEach(d => acts.push(...(d.activities || [])));
  acts.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const seen = [];
  acts.forEach(a => (a.contactIds || []).forEach(id => { if (!seen.includes(id)) seen.push(id); }));
  return seen;
}

function openContactPicker({ selectedIds = [], onChange, onDone }) {
  state.picker = { selected: [...selectedIds], onChange, onDone };
  elements.contactPickerSearch.value = '';
  renderContactPicker();
  openAccessibleDialog(elements.dialogContactPicker);
  setTimeout(() => elements.contactPickerSearch.focus(), 50);
}

function renderContactPicker() {
  const picker = state.picker;
  if (!picker) return;
  const query = elements.contactPickerSearch.value;
  const matches = filterContacts(state.trip.contacts || [], query, getRecentContactIds());
  const list = elements.contactPickerList;
  list.innerHTML = '';

  const emit = () => { if (picker.onChange) picker.onChange([...picker.selected]); };

  matches.forEach(c => {
    const li = document.createElement('li');
    const on = picker.selected.includes(c.id);
    li.innerHTML = `<button type="button" class="picker-item" aria-pressed="${on}">
      <span class="picker-check" aria-hidden="true">${on ? icon('check', 16) : ''}</span>
      <span class="picker-name">${escapeHtml(c.name)}</span>
      <small>${escapeHtml(c.relationship || '')}</small>
    </button>`;
    li.querySelector('button').addEventListener('click', () => {
      picker.selected = on ? picker.selected.filter(id => id !== c.id) : [...picker.selected, c.id];
      emit();
      renderContactPicker();
    });
    list.appendChild(li);
  });

  const trimmed = query.trim();
  const exact = matches.some(c => c.name.toLowerCase() === trimmed.toLowerCase());
  if (trimmed && !exact) {
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="picker-item picker-create"><span class="picker-check" aria-hidden="true">＋</span><span class="picker-name">Créer « ${escapeHtml(trimmed)} »</span></button>`;
    li.querySelector('button').addEventListener('click', () => {
      const day = (state.trip.days || []).find(d => d.dayNumber === state.activeDayNumber);
      const created = ContactService.addContact(state.trip, { name: trimmed, relationship: 'Autre', city: day?.city || '' });
      picker.selected = [...picker.selected, created.id];
      saveTripData();
      elements.contactPickerSearch.value = '';
      emit();
      renderContactPicker();
      renderContacts();
    });
    list.appendChild(li);
  }

  if (!list.children.length) {
    list.innerHTML = '<li class="empty-block-hint">Aucun contact. Tapez un nom pour en créer un.</li>';
  }
}

function setupContactPicker() {
  if (!elements.dialogContactPicker) return;
  elements.contactPickerSearch.addEventListener('input', renderContactPicker);
  const finish = () => {
    const picker = state.picker;
    state.picker = null;
    closeAccessibleDialog(elements.dialogContactPicker);
    if (picker && picker.onDone) picker.onDone([...picker.selected]);
  };
  elements.btnContactPickerDone.addEventListener('click', finish);
  elements.btnCloseContactPicker.addEventListener('click', finish);
}

// --------------------------------------------------------------------------
// v2.1 : Import de contacts et tri par relation (REQ-3.6, ADR-008)
// --------------------------------------------------------------------------
function openImportDialog(context) {
  const existing = context === 'wizard' ? state.wizardContactsList : (state.trip?.contacts || []);
  state.importCtx = { context, existing, rows: [] };
  elements.importSources.hidden = false;
  elements.importSort.hidden = true;
  elements.importBulkText.value = '';
  elements.importVcfFile.value = '';
  elements.btnImportNative.hidden = !('contacts' in navigator && 'ContactsManager' in window);
  renderImportSort();
  openAccessibleDialog(elements.dialogImportContacts);
}

function loadImportRows(imported) {
  if (!imported.length) {
    showToast('Aucun contact trouvé dans cette source.', { type: 'warning' });
    return;
  }
  state.importCtx.rows = buildSortRows(imported, state.importCtx.existing, 'Amis');
  elements.importSources.hidden = true;
  elements.importSort.hidden = false;
  renderImportSort();
}

function renderImportSort() {
  const ctx = state.importCtx;
  const list = elements.importSortList;
  list.innerHTML = '';
  const rows = ctx ? ctx.rows : [];

  rows.forEach((row, index) => {
    const li = document.createElement('li');
    li.className = `import-row${row.ignored ? ' is-ignored' : ''}`;
    const chips = IMPORT_RELATIONSHIPS.map(rel =>
      `<button type="button" class="rel-chip" data-rel="${escapeHtml(rel)}" aria-pressed="${row.relationship === rel}">${escapeHtml(rel)}</button>`
    ).join('');
    li.innerHTML = `
      <div class="import-row-head">
        <div><strong>${escapeHtml(row.name)}</strong>${row.phone ? ` <small>${escapeHtml(row.phone)}</small>` : ''}${row.duplicate ? ' <small class="dup-tag">Déjà présent</small>' : ''}</div>
        <button type="button" class="btn btn-secondary btn-sm btn-ignore-row" aria-pressed="${row.ignored}">${row.ignored ? 'Rétablir' : 'Ignorer'}</button>
      </div>
      <div class="rel-chip-group" role="group" aria-label="Relation de ${escapeHtml(row.name)}">${chips}</div>`;
    li.querySelector('.btn-ignore-row').addEventListener('click', () => {
      row.ignored = !row.ignored;
      renderImportSort();
    });
    li.querySelector('.rel-chip-group').addEventListener('click', (e) => {
      const chip = e.target.closest('.rel-chip');
      if (!chip) return;
      row.relationship = chip.dataset.rel;
      renderImportSort();
    });
    list.appendChild(li);
  });

  const kept = rows.filter(r => !r.ignored).length;
  elements.btnImportConfirm.disabled = kept === 0;
  elements.btnImportConfirm.textContent = kept ? `Ajouter ${kept} contact${kept > 1 ? 's' : ''}` : 'Ajouter';
}

function setupImportDialog() {
  if (!elements.dialogImportContacts) return;
  const close = () => closeAccessibleDialog(elements.dialogImportContacts);
  elements.btnCancelImport.addEventListener('click', close);
  elements.btnCloseImportContacts.addEventListener('click', close);

  elements.btnImportNative.addEventListener('click', async () => {
    try {
      const picked = await navigator.contacts.select(['name', 'tel'], { multiple: true });
      loadImportRows((picked || []).map(c => ({
        name: (c.name && c.name[0]) || '',
        phone: (c.tel && c.tel[0]) || '',
        city: ''
      })).filter(c => c.name));
    } catch (err) {
      console.warn('Sélection du répertoire annulée ou refusée', err);
    }
  });

  elements.importVcfFile.addEventListener('change', async () => {
    const file = elements.importVcfFile.files && elements.importVcfFile.files[0];
    if (!file) return;
    try {
      loadImportRows(parseVCard(await file.text()));
    } catch (err) {
      showToast('Fichier illisible.', { type: 'danger' });
    }
  });

  elements.btnImportBulk.addEventListener('click', () => loadImportRows(parseBulk(elements.importBulkText.value)));

  elements.btnImportAllFriends.addEventListener('click', () => {
    (state.importCtx?.rows || []).forEach(r => { if (!r.ignored) r.relationship = 'Amis'; });
    renderImportSort();
  });
  elements.btnImportIgnoreNoPhone.addEventListener('click', () => {
    (state.importCtx?.rows || []).forEach(r => { if (!r.phone) r.ignored = true; });
    renderImportSort();
  });

  elements.btnImportConfirm.addEventListener('click', () => {
    const ctx = state.importCtx;
    if (!ctx) return;
    const contacts = toContacts(ctx.rows);
    if (ctx.context === 'wizard') {
      contacts.forEach(c => state.wizardContactsList.push({ name: c.name, relationship: c.relationship, city: c.city }));
      renderWizardContactsList();
    } else {
      contacts.forEach(c => ContactService.addContact(state.trip, c));
      saveTripData();
      renderAll();
    }
    close();
    showToast(`${contacts.length} contact${contacts.length > 1 ? 's' : ''} ajouté${contacts.length > 1 ? 's' : ''}.`, { type: 'success' });
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
      <span class="quick-contact-name">${escapeHtml(contact.name)}</span>
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
  freeItem.innerHTML = `<span class="empty-hint">Saisie libre (continuer sans lier de contact)</span>`;
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
          <h5>${escapeHtml(state.trip?.title || 'Voyage Démo Cameroun')}</h5>
          <p class="trip-item-meta">${(state.trip?.days || []).length} jours • Du ${formatDateFr(state.trip?.startDate)} au ${formatDateFr(state.trip?.endDate)}</p>
        </div>
        <span class="badge">Actif</span>
      </div>
      <p class="empty-hint">
        Connectez-vous avec votre adresse email pour sauvegarder plusieurs voyages, basculer entre eux et les retrouver sur tous vos appareils.
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
      elements.userTripsList.innerHTML = `<p class="empty-hint">Aucun voyage enregistré.</p>`;
      return;
    }

    elements.userTripsList.innerHTML = '';
    data.trips.forEach(t => {
      const item = document.createElement('div');
      item.className = t.isActive ? 'trip-history-item active' : 'trip-history-item';


      item.innerHTML = `
        <div class="trip-item-info">
          <h5>${escapeHtml(t.title)}</h5>
          <p class="trip-item-meta">
            ${t.daysCount} jours • Budget : ${formatNumber(t.totalBudget)} ${t.baseCurrency} • ${t.activitiesCount} activité(s)
          </p>
        </div>
        <div class="trip-item-action">
          ${t.isActive 
            ? '<span class="badge">Actif</span>' 
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
    await flushSync();
    const res = await fetch('/api/user/trips/switch', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ tripId })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Erreur lors du changement de voyage');

    state.trip = data.trip;
    state.activeDayNumber = 1;
    localStorage.setItem('capvoyage_trip_cache', JSON.stringify(data.trip));
    closeAccessibleDialog(elements.dialogUserProfile);
    renderAll();
  } catch (err) {
    showToast(`Erreur : ${err.message}`, { type: 'danger' });
  }
}

function logoutUser() {
  if (state.syncQueue && isAuthenticated() && state.syncQueue.getStatus() !== SyncStatus.SAVED) {
    const confirmed = window.confirm('Des modifications ne sont pas encore synchronisées avec le serveur et seront perdues. Se déconnecter quand même ?');
    if (!confirmed) return;
  }
  if (state.syncQueue) state.syncQueue.clear();
  if (isAuthenticated()) {
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
