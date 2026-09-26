import test from 'node:test';
import assert from 'node:assert/strict';
import { avoidCurrentDuplicate, getPool, makeOrders, makeQuestions, type Settings } from './game.ts';

const settings: Settings = {
  groupCount: 3, contact: 'contact4', itemType: 'all', direction: 'NL_FR',
  questionCount: 15, pigeons: true, sound: false,
};

test('alle groepen krijgen precies dezelfde willekeurig gekozen vragen, elk eenmaal', () => {
  const questions = makeQuestions(settings);
  const ids = questions.map((question) => question.id);
  assert.equal(ids.length, 15);
  assert.equal(new Set(ids).size, 15);
  const orders = makeOrders(questions, 3);
  assert.equal(orders.length, 3);
  for (const order of orders) assert.deepEqual([...order].sort(), [...ids].sort());
  assert.equal(new Set(orders.map((order) => order[0])).size, 3);
});

test('antwoordballonnen bevatten een juist en twee verschillende foute antwoorden', () => {
  for (const direction of ['NL_FR', 'FR_NL'] as const) {
    const questions = makeQuestions({ ...settings, direction });
    for (const question of questions) {
      assert.equal(question.options.length, 3);
      assert.equal(new Set(question.options.map((value) => value.toLocaleLowerCase('nl'))).size, 3);
      assert.equal(question.options[0], question.answer);
    }
  }
});

test('te grote vraagselectie wordt geweigerd en botsende volgende vraag wordt uitgesteld', () => {
  const pool = getPool({ contact: 'contact14', itemType: 'all' });
  assert.throws(() => makeQuestions({ ...settings, contact: 'contact14', questionCount: pool.length + 1 }));
  assert.deepEqual(avoidCurrentDuplicate(['a', 'b', 'c'], 0, ['a']), ['b', 'a', 'c']);
});
