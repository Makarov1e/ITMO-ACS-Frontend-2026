import bcrypt from 'bcryptjs';
import jsonServer from 'json-server';
import jwt from 'jsonwebtoken';
import { copyFile, mkdir, access } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const seedPath = resolve(root, 'api', 'seed.json');
const dbPath = process.env.TT_DB_FILE || resolve(root, 'api', 'runtime', 'db.json');
const port = Number(process.env.PORT || 3002);
const host = process.env.HOST || '127.0.0.1';
const jwtSecret = process.env.TT_JWT_SECRET || 'tabletime-local-educational-key-not-for-production';

async function ensureDatabase() {
  try { await access(dbPath); } catch {
    await mkdir(dirname(dbPath), { recursive: true });
    await copyFile(seedPath, dbPath);
  }
}

const publicUser = ({ id, name, email, isDemo, createdAt }) => ({ id, name, email, isDemo: Boolean(isDemo), createdAt });
const cleanText = (value) => typeof value === 'string' ? value.trim() : '';
const dateTomorrow = () => { const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); };
const bookingPayload = (body = {}) => ({
  restaurantId: cleanText(body.restaurantId),
  date: cleanText(body.date),
  time: cleanText(body.time),
  guests: Number(body.guests),
  comment: cleanText(body.comment)
});
function validBooking(payload, db) {
  if (!db.get('restaurants').find({ id: payload.restaurantId }).value()) return 'Ресторан не найден.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.date) || payload.date < dateTomorrow()) return 'Выберите дату не раньше завтрашнего дня.';
  if (!/^(1[6-9]|2[0-2]):[0-5]\d$/.test(payload.time)) return 'Выберите время в диапазоне 16:00–22:59.';
  if (!Number.isInteger(payload.guests) || payload.guests < 1 || payload.guests > 12) return 'Количество гостей должно быть от 1 до 12.';
  if (payload.comment.length > 200) return 'Комментарий не должен превышать 200 символов.';
  return null;
}
function tokenFor(user) { return jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: '8h', issuer: 'tabletime-lab3' }); }
function auth(db) {
  return (req, res, next) => {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) return res.status(401).json({ error: 'Требуется авторизация.' });
    try {
      const payload = jwt.verify(match[1], jwtSecret, { issuer: 'tabletime-lab3' });
      const user = db.get('users').find({ id: payload.sub }).value();
      if (!user) return res.status(401).json({ error: 'Сессия недействительна.' });
      req.user = user;
      return next();
    } catch { return res.status(401).json({ error: 'Сессия истекла или недействительна.' }); }
  };
}

await ensureDatabase();
const server = jsonServer.create();
const router = jsonServer.router(dbPath);
const db = router.db;
const demoUser = db.get('users').find({ id: 'demo-user' }).value();
if (demoUser?.passwordHash === '__DEMO_HASH__') {
  db.get('users').find({ id: 'demo-user' }).assign({ passwordHash: await bcrypt.hash('учебный-доступ', 10) }).write();
}
server.disable('x-powered-by');
server.use(jsonServer.defaults({ logger: false }));
server.use(jsonServer.bodyParser);
server.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  next();
});

server.post('/auth/register', async (req, res) => {
  const name = cleanText(req.body?.name);
  const email = cleanText(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (name.length < 2 || name.length > 80) return res.status(422).json({ error: 'Имя должно содержать от 2 до 80 символов.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(422).json({ error: 'Укажите корректный e-mail.' });
  if (password.length < 6 || password.length > 128) return res.status(422).json({ error: 'Пароль должен содержать от 6 до 128 символов.' });
  if (db.get('users').find({ email }).value()) return res.status(409).json({ error: 'Этот e-mail уже зарегистрирован.' });
  const user = { id: randomUUID(), name, email, passwordHash: await bcrypt.hash(password, 10), isDemo: false, createdAt: new Date().toISOString() };
  db.get('users').push(user).write();
  return res.status(201).json({ token: tokenFor(user), user: publicUser(user) });
});

server.post('/auth/login', async (req, res) => {
  const email = cleanText(req.body?.email).toLowerCase();
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const user = db.get('users').find({ email }).value();
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) return res.status(401).json({ error: 'Неверный e-mail или пароль.' });
  return res.json({ token: tokenFor(user), user: publicUser(user) });
});

server.get('/auth/me', auth(db), (req, res) => res.json({ user: publicUser(req.user) }));
server.patch('/auth/me', auth(db), (req, res) => {
  const name = cleanText(req.body?.name);
  if (name.length < 2 || name.length > 80) return res.status(422).json({ error: 'Имя должно содержать от 2 до 80 символов.' });
  db.get('users').find({ id: req.user.id }).assign({ name }).write();
  return res.json({ user: publicUser({ ...req.user, name }) });
});

server.all('/users*', (_req, res) => res.status(404).json({ error: 'Ресурс не найден.' }));
server.all(/^\/(restaurants|menus|reviews)(?:\/.*)?$/, (req, res, next) => req.method === 'GET' ? next() : res.status(405).json({ error: 'Публичные демонстрационные данные доступны только для чтения.' }));

server.get('/bookings', auth(db), (req, res) => res.json(db.get('bookings').filter({ userId: req.user.id }).value()));
server.post('/bookings', auth(db), (req, res) => {
  const payload = bookingPayload(req.body);
  const error = validBooking(payload, db);
  if (error) return res.status(422).json({ error });
  const booking = { id: randomUUID(), userId: req.user.id, ...payload, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.get('bookings').push(booking).write();
  return res.status(201).json(booking);
});
server.get('/bookings/:id', auth(db), (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id, userId: req.user.id }).value();
  return booking ? res.json(booking) : res.status(404).json({ error: 'Бронь не найдена.' });
});
server.patch('/bookings/:id', auth(db), (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id, userId: req.user.id }).value();
  if (!booking) return res.status(404).json({ error: 'Бронь не найдена.' });
  const payload = bookingPayload({ ...booking, ...req.body, restaurantId: booking.restaurantId });
  const error = validBooking(payload, db);
  if (error) return res.status(422).json({ error });
  const updated = { ...booking, ...payload, updatedAt: new Date().toISOString() };
  db.get('bookings').find({ id: booking.id }).assign(updated).write();
  return res.json(updated);
});
server.delete('/bookings/:id', auth(db), (req, res) => {
  const booking = db.get('bookings').find({ id: req.params.id, userId: req.user.id }).value();
  if (!booking) return res.status(404).json({ error: 'Бронь не найдена.' });
  db.get('bookings').remove({ id: booking.id }).write();
  return res.status(204).end();
});

server.use(router);
server.use((_req, res) => res.status(404).json({ error: 'Ресурс не найден.' }));
server.listen(port, host, () => console.log(`TableTime Lab3 mock API: http://${host}:${port} (локальный учебный режим)`));
