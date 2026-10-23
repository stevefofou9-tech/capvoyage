// ==========================================================================
// SYNCQUEUE : file de synchronisation hors-ligne versionnée (ADR-003)
// Module pur : stockage et transport sont injectés (testable sous Node).
// ==========================================================================

export const SYNC_STORAGE_KEY = 'capvoyage_sync_v1';

export const SyncStatus = Object.freeze({
  SAVED: 'saved',
  PENDING: 'pending',
  CONFLICT: 'conflict'
});

export class SyncQueue {
  /**
   * @param {Object} deps
   * @param {{ getItem: Function, setItem: Function }} deps.storage - ex : localStorage
   * @param {(trip: Object, baseVersion: number) => Promise<{ status: 'ok'|'conflict', trip: Object }>} deps.transport
   *        Rejette en cas d'erreur réseau (l'instantané reste en file).
   * @param {(status: string) => void} [deps.onStatus]
   * @param {(serverTrip: Object) => void} [deps.onSaved] - version enregistrée par le serveur
   * @param {(serverTrip: Object, localTrip: Object) => void} [deps.onConflict]
   * @param {(error: Error) => void} [deps.onError] - échec du transport (réseau, session expirée...)
   */
  constructor({ storage, transport, onStatus = () => {}, onSaved = () => {}, onConflict = () => {}, onError = () => {}, storageKey = SYNC_STORAGE_KEY }) {
    this.storage = storage;
    this.transport = transport;
    this.onStatus = onStatus;
    this.onSaved = onSaved;
    this.onConflict = onConflict;
    this.onError = onError;
    this.storageKey = storageKey;
    this.inFlight = null;
    this.state = this._load();
  }

  _load() {
    try {
      const raw = this.storage.getItem(this.storageKey);
      const parsed = raw ? JSON.parse(raw) : null;
      if (parsed && typeof parsed === 'object') {
        return { pending: parsed.pending || {}, conflicts: parsed.conflicts || {} };
      }
    } catch (err) { /* état corrompu : on repart d'une file vide */ }
    return { pending: {}, conflicts: {} };
  }

  _persist() {
    try {
      this.storage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (err) { /* stockage plein ou indisponible : la file reste en mémoire */ }
    this.onStatus(this.getStatus());
  }

  getStatus() {
    if (Object.keys(this.state.conflicts).length > 0) return SyncStatus.CONFLICT;
    if (Object.keys(this.state.pending).length > 0) return SyncStatus.PENDING;
    return SyncStatus.SAVED;
  }

  hasPending(tripId) {
    return !!this.state.pending[tripId];
  }

  getConflict(tripId) {
    return this.state.conflicts[tripId] || null;
  }

  /**
   * Met en file un instantané du voyage. Une modification plus récente remplace
   * l'instantané en attente mais conserve la version de base d'origine (coalescence).
   */
  enqueue(trip, baseVersion) {
    const snapshot = JSON.parse(JSON.stringify(trip));
    const existing = this.state.pending[trip.id];
    this.state.pending[trip.id] = {
      trip: snapshot,
      baseVersion: existing ? existing.baseVersion : baseVersion,
      queuedAt: new Date().toISOString()
    };
    this._persist();
  }

  /**
   * Envoie la file, un voyage à la fois (single-flight). Les appels concurrents
   * attendent l'envoi en cours puis relancent pour prendre les nouveautés.
   */
  async flush() {
    if (this.inFlight) {
      await this.inFlight.catch(() => {});
      if (this.inFlight) return this.inFlight;
    }
    this.inFlight = this._drain().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  async _drain() {
    for (;;) {
      const tripId = Object.keys(this.state.pending)[0];
      if (!tripId) break;
      const entry = this.state.pending[tripId];

      let result;
      try {
        result = await this.transport(entry.trip, entry.baseVersion);
      } catch (err) {
        this.onStatus(this.getStatus());
        this.onError(err);
        return false;
      }

      const latest = this.state.pending[tripId];
      if (result.status === 'conflict') {
        this.state.conflicts[tripId] = (latest || entry).trip;
        delete this.state.pending[tripId];
        this._persist();
        this.onConflict(result.trip, this.state.conflicts[tripId]);
        continue;
      }

      if (latest && latest !== entry) {
        // Modification survenue pendant l'envoi : la rebaser sur la nouvelle version serveur
        latest.baseVersion = result.trip.version;
      } else {
        delete this.state.pending[tripId];
      }
      this._persist();
      this.onSaved(result.trip);
    }
    return true;
  }

  /**
   * « Restaurer ma version » : renvoie la copie locale par-dessus la version serveur courante.
   */
  restoreConflict(tripId, serverVersion) {
    const local = this.state.conflicts[tripId];
    if (!local) return null;
    delete this.state.conflicts[tripId];
    delete this.state.pending[tripId];
    this.enqueue(local, serverVersion);
    return local;
  }

  dismissConflict(tripId) {
    delete this.state.conflicts[tripId];
    this._persist();
  }

  clear() {
    this.state = { pending: {}, conflicts: {} };
    this._persist();
  }
}
