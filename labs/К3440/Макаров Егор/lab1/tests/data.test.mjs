import test from 'node:test';
import assert from 'node:assert/strict';
import { filterRestaurants, getRestaurant, restaurants } from '../src/data.js';

test('фильтр находит ресторан по кухне и району', () => {
  const results = filterRestaurants(restaurants, { cuisine: 'Итальянская', district: 'Василеостровский' });
  assert.equal(results.length, 1);
  assert.equal(results[0].id, 'vetrino');
});

test('текстовый фильтр ищет по названию и тегам без учёта регистра', () => {
  assert.equal(filterRestaurants(restaurants, { query: 'ТЕРРАСА' })[0].name, 'Ветрино');
  assert.equal(filterRestaurants(restaurants, { query: 'нева' })[0].id, 'neva-supper');
});

test('по умолчанию открывается существующий ресторан', () => {
  assert.equal(getRestaurant('unknown-id').id, restaurants[0].id);
});
