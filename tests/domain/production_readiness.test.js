import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DbService } from '../../src/services/DbService.js';
import { EmailService } from '../../src/services/EmailService.js';
import { AuthService } from '../../src/domain/AuthService.js';
import { StorageService } from '../../src/domain/StorageService.js';
import path from 'path';
import { promises as fs } from 'fs';

describe('Suite Préparation Production & Persistance SQLite (Option B)', () => {

  test('PROD-01 : Persistance SQLite - Création, Indexation et Sauvegarde Utilisateur', () => {
    const db = new DbService(':memory:');
    
    const user = {
      id: 'usr-test-123',
      email: 'voyageur.pro@capvoyage.com',
      createdAt: new Date().toISOString(),
      currentTripId: 'trip-1',
      trips: ['trip-1', 'trip-2'],
      globalContacts: [{ name: 'Paul', relationship: 'Famille' }]
    };

    db.saveUser(user);

    const fetchedByEmail = db.getUserByEmail('voyageur.pro@capvoyage.com');
    assert.ok(fetchedByEmail, 'L\'utilisateur doit être retrouvé par email');
    assert.equal(fetchedByEmail.id, 'usr-test-123');
    assert.equal(fetchedByEmail.trips.length, 2);
    assert.equal(fetchedByEmail.globalContacts[0].name, 'Paul');

    const fetchedById = db.getUserById('usr-test-123');
    assert.ok(fetchedById);
    assert.equal(fetchedById.email, 'voyageur.pro@capvoyage.com');

    db.close();
  });

  test('PROD-02 : Persistance SQLite - Sauvegarde, Recherche et Partage de Voyage', () => {
    const db = new DbService(':memory:');

    const trip = {
      id: 'trip-cam-456',
      userId: 'usr-test-123',
      title: 'Voyage Professionnel Douala',
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-15',
      baseCurrency: 'EUR',
      totalBudget: 3000,
      shareToken: 'secret-share-token-xyz',
      days: [{ dayNumber: 1, city: 'Douala', activities: [] }]
    };

    db.saveTrip(trip, 'usr-test-123');

    // Récupération par ID
    const retrieved = db.getTripById('trip-cam-456');
    assert.ok(retrieved);
    assert.equal(retrieved.title, 'Voyage Professionnel Douala');

    // Récupération par Jeton de Partage Public
    const shared = db.getTripByShareToken('secret-share-token-xyz');
    assert.ok(shared, 'Le voyage doit être résolu par son jeton de partage public');
    assert.equal(shared.id, 'trip-cam-456');

    // Récupération par Utilisateur
    const userTrips = db.getTripsByUserId('usr-test-123');
    assert.equal(userTrips.length, 1);
    assert.equal(userTrips[0].id, 'trip-cam-456');

    db.close();
  });

  test('PROD-03 : Protection Brute-Force & Rate Limiting en Base SQLite', () => {
    const db = new DbService(':memory:');
    const key = 'rate_test:ip:192.168.1.100';

    // 3 requêtes autorisées dans une fenêtre
    const r1 = db.checkRateLimit(key, 3, 5000, 5000);
    assert.equal(r1.allowed, true);
    assert.equal(r1.remaining, 2);

    const r2 = db.checkRateLimit(key, 3, 5000, 5000);
    assert.equal(r2.allowed, true);
    assert.equal(r2.remaining, 1);

    const r3 = db.checkRateLimit(key, 3, 5000, 5000);
    assert.equal(r3.allowed, true);
    assert.equal(r3.remaining, 0);

    // 4ème requête : bloquée !
    const r4 = db.checkRateLimit(key, 3, 5000, 5000);
    assert.equal(r4.allowed, false);
    assert.ok(r4.retryAfterSeconds > 0);

    db.close();
  });

  test('PROD-04 : EmailService & Masquage de devCode en Production', async () => {
    // Mode Dev
    const devEmailService = new EmailService({ isProduction: false });
    const devRes = await devEmailService.sendLoginCode('dev@capvoyage.com', '123456');
    assert.equal(devRes.success, true);
    assert.equal(devRes.devCode, '123456', 'En mode dev, devCode doit être disponible');

    // Mode Production
    const prodEmailService = new EmailService({ isProduction: true });
    const prodRes = await prodEmailService.sendLoginCode('client@capvoyage.com', '987654');
    assert.equal(prodRes.success, true);
    assert.equal(prodRes.devCode, undefined, 'En mode production, devCode ne doit JAMAIS fuiter dans la réponse');

    const lastMail = prodEmailService.getLastSentEmail();
    assert.ok(lastMail);
    assert.equal(lastMail.code, '987654');
    assert.equal(lastMail.to, 'client@capvoyage.com');
  });

  test('PROD-05 : AuthService - Révocation après 5 tentatives erronées (Sécurité Prod)', () => {
    const users = [];
    const { devCode } = AuthService.requestLoginCode(users, 'securite@capvoyage.com', { isProduction: false });

    // 4 erreurs autorisées avec avertissement
    for (let i = 0; i < 4; i++) {
      assert.throws(() => {
        AuthService.verifyCode(users, 'securite@capvoyage.com', '000000');
      }, /Code de vérification incorrect/);
    }

    // 5ème tentative erronée : révocation immédiate du code
    assert.throws(() => {
      AuthService.verifyCode(users, 'securite@capvoyage.com', '000000');
    }, /Nombre maximal de tentatives de validation atteint/);

    // Même avec le bon code après révocation, l'accès est bloqué
    assert.throws(() => {
      AuthService.verifyCode(users, 'securite@capvoyage.com', devCode);
    }, /Aucun code en attente de validation|Nombre maximal de tentatives/);
  });

  test('PROD-06 : StorageService - Écriture Atomique et Résilience', async () => {
    const tempDir = path.join(process.cwd(), 'data', 'test_atomic');
    await fs.mkdir(tempDir, { recursive: true });
    const testFile = path.join(tempDir, 'atomic_trip.json');

    const trip = {
      id: 'trip-atomic',
      country: 'Cameroun',
      startDate: '2026-11-01',
      endDate: '2026-11-21',
      days: []
    };

    await StorageService.saveToFile(trip, testFile);
    const loaded = await StorageService.loadFromFile(testFile);
    assert.equal(loaded.id, 'trip-atomic');

    // Nettoyage
    await fs.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  });

  test('PROD-07 : Résolution et Verrouillage d\'un Voyage Partagé (?share=token)', () => {
    const db = new DbService(':memory:');
    
    // Voyage partagé
    const trip = {
      id: 'trip-share-demo',
      userId: 'usr-owner',
      title: 'Voyage Partagé au Sénégal',
      country: 'Sénégal',
      startDate: '2026-12-01',
      endDate: '2026-12-10',
      baseCurrency: 'XOF',
      totalBudget: 1500,
      shareToken: 'share-token-abc-123',
      days: []
    };

    db.saveTrip(trip, 'usr-owner');

    const resolved = db.getTripByShareToken('share-token-abc-123');
    assert.ok(resolved);
    assert.equal(resolved.title, 'Voyage Partagé au Sénégal');

    // Vérifier l'inviolabilité avec un faux token
    const fake = db.getTripByShareToken('wrong-token');
    assert.equal(fake, null);

    db.close();
  });

  test('PROD-08 : Validation de la Configuration Fly.io (fly.toml, volume et ports)', async () => {
    const tomlPath = path.join(process.cwd(), 'fly.toml');
    const content = await fs.readFile(tomlPath, 'utf-8');

    assert.ok(content.includes('app = "capvoyage"'), 'Le nom de l\'application doit être défini');
    assert.ok(content.includes('destination = "/app/data"'), 'Le volume persistant doit être monté sur /app/data');
    assert.ok(content.includes('source = "capvoyage_data"'), 'Le volume source doit être capvoyage_data');
    assert.ok(content.includes('internal_port = 3000'), 'Le port interne doit être 3000');
    assert.ok(content.includes('path = "/health"'), 'Le healthcheck doit surveiller /health');
  });

  test('PROD-09 : Validation du Workflow GitHub Actions CI/CD (Test + Déploiement Fly.io)', async () => {
    const ciPath = path.join(process.cwd(), '.github', 'workflows', 'ci.yml');
    const content = await fs.readFile(ciPath, 'utf-8');

    assert.ok(content.includes('superfly/flyctl-actions/setup-flyctl'), 'L\'action officielle setup-flyctl doit être présente');
    assert.ok(content.includes('flyctl deploy --remote-only'), 'La commande flyctl deploy --remote-only doit être exécutée');
    assert.ok(content.includes('FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}'), 'Le secret FLY_API_TOKEN doit être injecté');
    assert.ok(content.includes('needs: test'), 'Le déploiement doit obligatoirement dépendre de la réussite des tests');
  });

});
