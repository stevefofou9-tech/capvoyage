import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { TodoService } from '../../src/domain/TodoService.js';

describe('Statut en un tap, tâches (TC-QS)', () => {
  const mk = () => { const todos = []; TodoService.addTodo(todos, { title: 'Visa' }); return todos; };

  test('TC-QS-001 : À faire -> Fait, progression recalculée', () => {
    const todos = mk();
    assert.equal(TodoService.calculateProgress(todos).percentage, 0);
    TodoService.toggleDone(todos, todos[0].id);
    assert.equal(todos[0].status, 'Fait');
    assert.equal(TodoService.calculateProgress(todos).percentage, 100);
  });

  test('TC-QS-002 : Fait -> À faire ; En cours -> Fait', () => {
    const todos = mk();
    TodoService.toggleDone(todos, todos[0].id);
    TodoService.toggleDone(todos, todos[0].id);
    assert.equal(todos[0].status, 'À faire');
    TodoService.updateTodoStatus(todos, todos[0].id, 'En cours');
    TodoService.toggleDone(todos, todos[0].id);
    assert.equal(todos[0].status, 'Fait');
  });

  test('tâche inconnue -> erreur', () => {
    assert.throws(() => TodoService.toggleDone([], 'x'), /introuvable/);
  });
});
