import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TodoService, VALID_TODO_STATUSES } from '../../src/domain/TodoService.js';

describe('Suite 1 : To-Do Pré-Voyage & Formalités (TC-TODO)', () => {

  test('TC-TODO-001 : Initialisation automatique des formalités indispensables (Cameroun)', () => {
    const todos = TodoService.createDefaultTodos('Cameroun');

    assert.ok(Array.isArray(todos), 'Doit retourner une liste de tâches');
    assert.ok(todos.length >= 10, 'Doit contenir au moins 10 tâches de préparation');

    // Vérification des catégories
    const categories = new Set(todos.map(t => t.category));
    assert.ok(categories.has('Formalités'), 'Catégorie Formalités requise');
    assert.ok(categories.has('Santé'), 'Catégorie Santé requise');
    assert.ok(categories.has('Bagages'), 'Catégorie Bagages requise');
    assert.ok(categories.has('Finances'), 'Catégorie Finances requise');

    // Vérification des éléments critiques pour le Cameroun
    const yellowFever = todos.find(t => t.title.toLowerCase().includes('fièvre jaune'));
    assert.ok(yellowFever, 'Vaccin fièvre jaune obligatoire doit être présent');
    assert.equal(yellowFever.priority, 'Haute', 'Priorité Haute pour la fièvre jaune');

    const visa = todos.find(t => t.title.toLowerCase().includes('visa'));
    assert.ok(visa, 'Visa pour le Cameroun doit être présent');
    assert.equal(visa.priority, 'Haute');

    const malaria = todos.find(t => t.title.toLowerCase().includes('paludisme'));
    assert.ok(malaria, 'Traitement antipaludique obligatoire doit être présent');
  });

  test('TC-TODO-002 : Machine à états des tâches pré-voyage', () => {
    const todos = [
      { id: 'task-1', title: 'Faire le passeport', category: 'Formalités', status: 'À faire' }
    ];

    // Transition valide : À faire -> En cours
    TodoService.updateTodoStatus(todos, 'task-1', 'En cours');
    assert.equal(todos[0].status, 'En cours');

    // Transition valide : En cours -> Fait
    TodoService.updateTodoStatus(todos, 'task-1', 'Fait');
    assert.equal(todos[0].status, 'Fait');

    // Rejet d'un statut invalide
    assert.throws(() => {
      TodoService.updateTodoStatus(todos, 'task-1', 'Inconnu');
    }, /Statut invalide/);
  });

  test('TC-TODO-003 : Calcul dynamique du taux de complétion des préparatifs', () => {
    const todos = [
      { id: '1', title: 'T1', status: 'À faire' },
      { id: '2', title: 'T2', status: 'À faire' },
      { id: '3', title: 'T3', status: 'À faire' },
      { id: '4', title: 'T4', status: 'Fait' }
    ];

    let progress = TodoService.calculateProgress(todos);
    assert.equal(progress.total, 4);
    assert.equal(progress.completed, 1);
    assert.equal(progress.percentage, 25);

    // Passer une seconde tâche à Fait
    todos[1].status = 'Fait';
    progress = TodoService.calculateProgress(todos);
    assert.equal(progress.percentage, 50);

    // Passer tout à Fait
    todos[0].status = 'Fait';
    todos[2].status = 'Fait';
    progress = TodoService.calculateProgress(todos);
    assert.equal(progress.percentage, 100);
  });

  test('TC-TODO-004 : Ajout d\'une tâche personnalisée avec deadline', () => {
    const todos = [];
    const added = TodoService.addTodo(todos, {
      title: 'Acheter répulsif moustiques zone tropicale 50% DEET',
      category: 'Santé',
      priority: 'Haute',
      dueDate: '2026-10-25',
      notes: 'Pharmacie de quartier'
    });

    assert.equal(todos.length, 1);
    assert.equal(added.title, 'Acheter répulsif moustiques zone tropicale 50% DEET');
    assert.equal(added.status, 'À faire');
    assert.equal(added.dueDate, '2026-10-25');
  });

  test('TC-TODO-005 : Suppression d\'une tâche de la checklist', () => {
    const todos = [
      { id: 't1', title: 'Tâche 1', status: 'À faire' },
      { id: 't2', title: 'Tâche 2', status: 'À faire' }
    ];

    const deleted = TodoService.deleteTodo(todos, 't1');
    assert.equal(deleted.id, 't1');
    assert.equal(todos.length, 1);
    assert.equal(todos[0].id, 't2');
  });

  test('TC-TODO-006 : Filtrage des tâches par catégorie', () => {
    const todos = [
      { id: '1', title: 'Passeport', category: 'Formalités' },
      { id: '2', title: 'Visa', category: 'Formalités' },
      { id: '3', title: 'Vaccin', category: 'Santé' }
    ];

    const sante = TodoService.filterByCategory(todos, 'Santé');
    assert.equal(sante.length, 1);
    assert.equal(sante[0].title, 'Vaccin');

    const form = TodoService.filterByCategory(todos, 'Formalités');
    assert.equal(form.length, 2);
  });
});

