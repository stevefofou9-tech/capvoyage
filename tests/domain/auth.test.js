import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { AuthService } from '../../src/domain/AuthService.js';

describe('Suite Authentification & Comptes Sécurisés (AuthService)', () => {

  test('AUT-01 : Validation du format email et normalisation', () => {
    assert.equal(AuthService.isValidEmail('test@capvoyage.com'), true);
    assert.equal(AuthService.isValidEmail('  User.Name@Domain.FR  '), true);
    assert.equal(AuthService.normalizeEmail('  User.Name@Domain.FR  '), 'user.name@domain.fr');

    assert.equal(AuthService.isValidEmail('invalid-email'), false);
    assert.equal(AuthService.isValidEmail('@missinguser.com'), false);
    assert.equal(AuthService.isValidEmail(''), false);
  });

  test('AUT-02 : Demande de code magique par email (Création utilisateur)', () => {
    const users = [];
    const res = AuthService.requestLoginCode(users, 'steve@voyage.fr');

    assert.equal(res.success, true);
    assert.equal(res.email, 'steve@voyage.fr');
    assert.ok(res.devCode, 'Un code à 6 chiffres doit être généré');
    assert.equal(res.devCode.length, 6);

    // Vérifier la présence dans le store users
    assert.equal(users.length, 1);
    assert.equal(users[0].email, 'steve@voyage.fr');
    assert.equal(users[0].verificationCode, res.devCode);
    assert.ok(users[0].codeExpiresAt);
  });

  test('AUT-03 : Rejet des emails invalides lors de la demande de code', () => {
    const users = [];
    assert.throws(() => {
      AuthService.requestLoginCode(users, 'not-an-email');
    }, /Adresse email invalide/);
  });

  test('AUT-04 : Validation du code et création de la session sécurisée', () => {
    const users = [];
    const { devCode } = AuthService.requestLoginCode(users, 'voyageur@capvoyage.com');

    // Tentative avec mauvais code
    assert.throws(() => {
      AuthService.verifyCode(users, 'voyageur@capvoyage.com', '000000');
    }, /Code de vérification incorrect/);

    // Succès avec bon code
    const authRes = AuthService.verifyCode(users, 'voyageur@capvoyage.com', devCode);
    assert.equal(authRes.success, true);
    assert.ok(authRes.token, 'Un token de session doit être retourné');
    assert.equal(authRes.user.email, 'voyageur@capvoyage.com');

    // Le code doit être révoqué après usage
    assert.equal(users[0].verificationCode, null);
    assert.equal(users[0].sessionToken, authRes.token);
  });

  test('AUT-05 : Validation de session et persistance', () => {
    const users = [
      { id: 'u1', email: 'valid@capvoyage.com', sessionToken: 'secret-token-123', trips: [] }
    ];

    const session = AuthService.validateSession(users, 'secret-token-123');
    assert.ok(session);
    assert.equal(session.email, 'valid@capvoyage.com');

    const invalidSession = AuthService.validateSession(users, 'wrong-token');
    assert.equal(invalidSession, null);
  });

  test('AUT-06 : Déconnexion sécurisée', () => {
    const users = [
      { id: 'u1', email: 'valid@capvoyage.com', sessionToken: 'active-token-999', trips: [] }
    ];

    const loggedOut = AuthService.logout(users, 'active-token-999');
    assert.equal(loggedOut, true);
    assert.equal(users[0].sessionToken, null);

    // Nouvelle validation impossible
    assert.equal(AuthService.validateSession(users, 'active-token-999'), null);
  });
});
