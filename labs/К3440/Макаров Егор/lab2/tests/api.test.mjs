import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = 3102;
const base = `http://127.0.0.1:${port}`;
let tempDir;
let server;
let userA;
let userB;
let bookingId;

const request = async (path, options = {}) => {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`${base}${path}`, { ...rest, headers: { 'content-type': 'application/json', ...headers } });
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
};
const token = (user) => ({ authorization: `Bearer ${user.token}` });
const makeEmail = (prefix) => `${prefix}-${Date.now()}@tabletime.local`;

before(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'tabletime-lab2-'));
  const db = join(tempDir, 'db.json');
  server = spawn(process.execPath, ['api/server.mjs'], { cwd: root, env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', TT_DB_FILE: db }, stdio: 'pipe' });
  await new Promise((resolveReady, rejectReady) => {
    const timeout = setTimeout(() => rejectReady(new Error('API did not start in time')), 10000);
    server.stdout.on('data', (chunk) => { if (chunk.toString().includes('TableTime mock API')) { clearTimeout(timeout); resolveReady(); } });
    server.on('error', rejectReady);
  });
});
after(async () => { server?.kill('SIGTERM'); await rm(tempDir, { recursive: true, force: true }); });

test('public restaurant data are readable and API does not expose users', async () => {
  const restaurants = await request('/restaurants');
  assert.equal(restaurants.response.status, 200);
  assert.equal(restaurants.body.length, 4);
  const users = await request('/users');
  assert.equal(users.response.status, 404);
});

test('registration hashes password and response does not leak a hash', async () => {
  const email = makeEmail('api-user-a');
  const result = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Тестовый Пользователь', email, password: 'учебный-пароль' }) });
  assert.equal(result.response.status, 201);
  assert.ok(result.body.token);
  assert.deepEqual(Object.keys(result.body.user).sort(), ['createdAt', 'email', 'id', 'isDemo', 'name']);
  assert.equal(JSON.stringify(result.body).includes('passwordHash'), false);
  userA = result.body;
  const db = JSON.parse(await readFile(join(tempDir, 'db.json'), 'utf8'));
  const record = db.users.find((item) => item.email === email);
  assert.ok(record.passwordHash.startsWith('$2'));
  assert.notEqual(record.passwordHash, 'учебный-пароль');
});

test('login rejects an invalid password and returns JWT for valid credentials', async () => {
  const invalid = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: userA.user.email, password: 'wrong-password' }) });
  assert.equal(invalid.response.status, 401);
  const valid = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email: userA.user.email, password: 'учебный-пароль' }) });
  assert.equal(valid.response.status, 200);
  assert.ok(valid.body.token);
});

test('profile requires a token and permits the current owner to update only their name', async () => {
  assert.equal((await request('/auth/me')).response.status, 401);
  const changed = await request('/auth/me', { method: 'PATCH', headers: token(userA), body: JSON.stringify({ name: 'Обновлённое Имя' }) });
  assert.equal(changed.response.status, 200);
  assert.equal(changed.body.user.name, 'Обновлённое Имя');
  assert.equal(changed.body.user.passwordHash, undefined);
});

test('bookings perform authenticated create, read, update and delete', async () => {
  assert.equal((await request('/bookings')).response.status, 401);
  const created = await request('/bookings', { method: 'POST', headers: token(userA), body: JSON.stringify({ restaurantId: 'baltic-table', date: '2030-06-20', time: '19:00', guests: 2, comment: 'Тестовая бронь' }) });
  assert.equal(created.response.status, 201);
  bookingId = created.body.id;
  assert.equal(created.body.userId, userA.user.id);
  const list = await request('/bookings', { headers: token(userA) });
  assert.equal(list.response.status, 200);
  assert.equal(list.body.length, 1);
  const updated = await request(`/bookings/${bookingId}`, { method: 'PATCH', headers: token(userA), body: JSON.stringify({ date: '2030-06-21', time: '20:00', guests: 3, comment: 'Изменено' }) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.guests, 3);
  const deleted = await request(`/bookings/${bookingId}`, { method: 'DELETE', headers: token(userA) });
  assert.equal(deleted.response.status, 204);
  assert.equal((await request('/bookings', { headers: token(userA) })).body.length, 0);
});

test('ownership checks hide another user booking and preserve it on forbidden deletion', async () => {
  const second = await request('/auth/register', { method: 'POST', body: JSON.stringify({ name: 'Второй Пользователь', email: makeEmail('api-user-b'), password: 'второй-пароль' }) });
  assert.equal(second.response.status, 201);
  userB = second.body;
  const own = await request('/bookings', { method: 'POST', headers: token(userA), body: JSON.stringify({ restaurantId: 'vetrino', date: '2030-07-20', time: '18:00', guests: 2, comment: '' }) });
  assert.equal(own.response.status, 201);
  const foreignId = own.body.id;
  assert.equal((await request('/bookings', { headers: token(userB) })).body.length, 0);
  assert.equal((await request(`/bookings/${foreignId}`, { headers: token(userB) })).response.status, 404);
  assert.equal((await request(`/bookings/${foreignId}`, { method: 'PATCH', headers: token(userB), body: JSON.stringify({ guests: 9 }) })).response.status, 404);
  assert.equal((await request(`/bookings/${foreignId}`, { method: 'DELETE', headers: token(userB) })).response.status, 404);
  assert.equal((await request(`/bookings/${foreignId}`, { headers: token(userA) })).response.status, 200);
});

test('server rejects invalid booking data and public data mutation', async () => {
  const invalid = await request('/bookings', { method: 'POST', headers: token(userA), body: JSON.stringify({ restaurantId: 'missing', date: '2000-01-01', time: 'noon', guests: 0 }) });
  assert.equal(invalid.response.status, 422);
  const publicWrite = await request('/restaurants/baltic-table', { method: 'PATCH', headers: token(userA), body: JSON.stringify({ name: 'Изменение' }) });
  assert.equal(publicWrite.response.status, 405);
});
