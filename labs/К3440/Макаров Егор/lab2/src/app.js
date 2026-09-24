import 'bootstrap';
import { Modal } from 'bootstrap';
import { ApiError, api, authApi, bookingApi, clearSession, getSession, saveSession } from './api.js';
import './styles.css';

const $ = (s, p = document) => p.querySelector(s);
const $$ = (s, p = document) => [...p.querySelectorAll(s)];
let restaurants = [];
let editing = null;
const esc = (v = '') => String(v).replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
const errText = (e) => e instanceof ApiError ? e.message : 'Непредвиденная ошибка интерфейса.';
const tomorrow = () => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

function message(target, text, kind = 'danger') { const el = typeof target === 'string' ? $(target) : target; if (el) { el.className = `alert alert-${kind} py-2 mb-3`; el.textContent = text; el.hidden = false; } }
function clearMessage(target) { const el = typeof target === 'string' ? $(target) : target; if (el) el.hidden = true; }
function loading(text) { return `<div class="col-12"><div class="state-panel" role="status"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>${esc(text)}</div></div>`; }
function failure(text) { return `<div class="col-12"><div class="state-panel state-error" role="alert"><strong>Не удалось получить данные.</strong><br>${esc(text)}<br><button class="btn btn-outline-ink btn-sm mt-3 retry" type="button">Повторить</button></div></div>`; }
function empty(title) { return `<div class="col-12"><div class="empty-state"><h2 class="section-title fs-3">${esc(title)}</h2><p>Попробуйте изменить условия поиска или вернуться к списку ресторанов.</p></div></div>`; }
function authenticated() { return Boolean(getSession()); }
function requireAuth() { if (!authenticated()) { location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() || 'index.html')}`; return false; } return true; }
function saveUser(user) { const session = getSession(); if (session) saveSession({ ...session, user }); }

function nav(active) {
  const user = getSession()?.user;
  return `<nav class="navbar navbar-expand-lg sticky-top" aria-label="Основная навигация"><div class="container py-2"><a class="brand" href="index.html">table<span class="brand-dot">time</span></a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Открыть меню"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="mainNav"><ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1"><li class="nav-item"><a class="nav-link ${active === 'search' ? 'active' : ''}" href="index.html">Рестораны</a></li><li class="nav-item"><a class="nav-link ${active === 'bookings' ? 'active' : ''}" href="bookings.html">Бронирования</a></li><li class="nav-item"><a class="nav-link ${active === 'profile' ? 'active' : ''}" href="profile.html">Профиль</a></li>${user ? `<li class="nav-item ms-lg-2"><span class="small text-secondary me-lg-2">${esc(user.name)}</span><button class="btn btn-sm btn-outline-ink" id="logoutButton">Выйти</button></li>` : '<li class="nav-item ms-lg-2"><a class="btn btn-sm btn-clay" href="login.html">Войти</a></li>'}</ul></div></div></nav>`;
}
function shell() {
  const page = document.body.dataset.page || '';
  $('#site-header').innerHTML = nav(page);
  $('#site-footer').innerHTML = `<footer class="mt-5"><div class="container py-4"><div class="row g-3 align-items-center"><div class="col-md"><a class="brand text-decoration-none" href="index.html">table<span class="brand-dot">time</span></a><p class="small mb-0 mt-1">Учебный интерфейс бронирования. Рестораны, отзывы и брони — демонстрационные; API работает локально.</p></div><div class="col-md-auto small text-md-end"><a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Фото: Unsplash License</a><br><span>ЛР2 · Макаров Егор · К3440</span></div></div></div></footer>`;
  $('#logoutButton')?.addEventListener('click', () => { clearSession(); location.href = 'index.html'; });
}
function card(r) { return `<article class="restaurant-card"><img src="${esc(r.image)}" alt="Интерьер ресторана ${esc(r.name)}" loading="lazy"><div class="card-body d-flex flex-column"><div class="d-flex justify-content-between gap-2 align-items-start"><h2 class="mb-1">${esc(r.name)}</h2><span class="rating">★ ${esc(r.rating)}</span></div><p class="meta mb-2">${esc(r.cuisine)} · ${esc(r.district)} · ${esc(r.priceLabel)}</p><p class="mb-3">${esc(r.description)}</p><div class="mb-3">${r.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('')}</div><div class="mt-auto d-flex gap-2 flex-wrap"><button class="btn btn-clay btn-sm reserve" type="button" data-id="${esc(r.id)}">Забронировать</button><a class="btn btn-outline-ink btn-sm" href="restaurant.html?id=${encodeURIComponent(r.id)}">О ресторане</a></div></div></article>`; }
function reservationButtons(parent = document) { $$('.reserve', parent).forEach((b) => b.addEventListener('click', () => { if (requireAuth()) openModal(restaurants.find((r) => r.id === b.dataset.id)); })); }

function modalHtml() { return `<div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalTitle" aria-describedby="bookingModalHelp"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h1 class="modal-title fs-5" id="bookingModalTitle">Забронировать столик</h1><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button></div><form id="bookingForm" novalidate><div class="modal-body"><p id="bookingModalHelp" class="text-secondary small">Учебная запись сохранится в локальном JSON Server. Ресторан её не получит.</p><div id="bookingFormMessage" class="alert" hidden role="alert"></div><p class="fw-bold mb-3" id="bookingRestaurantName"></p><input id="bookingRestaurantId" type="hidden"><div class="row g-3"><div class="col-sm-6"><label class="form-label" for="bookingDate">Дата</label><input class="form-control" id="bookingDate" type="date" required></div><div class="col-sm-6"><label class="form-label" for="bookingTime">Время</label><select class="form-select" id="bookingTime" required><option value="">Выберите время</option><option>18:00</option><option>19:00</option><option>20:00</option><option>21:00</option></select></div><div class="col-12"><label class="form-label" for="bookingGuests">Гостей</label><select class="form-select" id="bookingGuests" required><option value="">Выберите количество</option>${[1,2,3,4,5,6,7,8].map((n) => `<option value="${n}">${n} ${n === 1 ? 'гость' : 'гостей'}</option>`).join('')}</select></div><div class="col-12"><label class="form-label" for="bookingComment">Комментарий <span class="text-secondary fw-normal">необязательно</span></label><input class="form-control" id="bookingComment" maxlength="200" placeholder="Например, нужен детский стул"></div></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-ink" data-bs-dismiss="modal">Отмена</button><button type="submit" class="btn btn-clay" id="bookingSubmit">Подтвердить бронь</button></div></form></div></div></div>`; }
function initModal() {
  if ($('#bookingModal')) return;
  document.body.insertAdjacentHTML('beforeend', modalHtml());
  const modal = $('#bookingModal');
  modal.addEventListener('shown.bs.modal', () => $('#bookingDate').focus());
  $('#bookingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = { restaurantId: $('#bookingRestaurantId').value, date: $('#bookingDate').value, time: $('#bookingTime').value, guests: Number($('#bookingGuests').value), comment: $('#bookingComment').value.trim() };
    if (!body.restaurantId || !body.date || !body.time || !body.guests) return message('#bookingFormMessage', 'Заполните дату, время и количество гостей.');
    const button = $('#bookingSubmit'); button.disabled = true; clearMessage('#bookingFormMessage');
    try { if (editing) await bookingApi.update(editing.id, body); else await bookingApi.create(body); Modal.getOrCreateInstance(modal).hide(); location.href = `bookings.html?${editing ? 'updated' : 'created'}=1`; }
    catch (e) { message('#bookingFormMessage', errText(e)); if (e.status === 401) setTimeout(requireAuth, 300); }
    finally { button.disabled = false; }
  });
}
function openModal(restaurant, booking = null) {
  initModal(); editing = booking; $('#bookingModalTitle').textContent = booking ? 'Изменить бронь' : 'Забронировать столик'; $('#bookingSubmit').textContent = booking ? 'Сохранить изменения' : 'Подтвердить бронь'; $('#bookingRestaurantName').textContent = restaurant?.name || 'Выбранный ресторан'; $('#bookingRestaurantId').value = booking?.restaurantId || restaurant?.id || ''; $('#bookingDate').min = tomorrow(); $('#bookingDate').value = booking?.date || ''; $('#bookingTime').value = booking?.time || ''; $('#bookingGuests').value = booking?.guests || ''; $('#bookingComment').value = booking?.comment || ''; clearMessage('#bookingFormMessage'); Modal.getOrCreateInstance($('#bookingModal')).show();
}

async function search() {
  const form = $('#filtersForm'), out = $('#restaurantResults'), count = $('#resultCount');
  const render = () => {
    const f = Object.fromEntries(new FormData(form).entries()), q = (f.query || '').trim().toLowerCase();
    const list = restaurants.filter((r) => (!q || `${r.name} ${r.cuisine} ${r.district} ${r.tags.join(' ')}`.toLowerCase().includes(q)) && (!f.cuisine || r.cuisine === f.cuisine) && (!f.district || r.district === f.district) && (!f.price || String(r.price) === f.price));
    count.textContent = `Найдено: ${list.length}`; out.innerHTML = list.length ? list.map((r) => `<div class="col-md-6">${card(r)}</div>`).join('') : empty('Ничего не найдено'); reservationButtons(out);
  };
  const load = async () => { out.innerHTML = loading('Загружаем демонстрационные рестораны…'); try { restaurants = await api('/restaurants'); render(); } catch (e) { out.innerHTML = failure(errText(e)); $('.retry', out)?.addEventListener('click', load); } };
  form.addEventListener('input', render); form.addEventListener('change', render); $('#resetFilters').addEventListener('click', () => { form.reset(); render(); }); await load();
}
async function login() {
  if (authenticated()) { location.href = 'profile.html'; return; }
  $('#demoLogin').addEventListener('click', () => { $('#loginEmail').value = 'demo@tabletime.local'; $('#loginPassword').value = 'учебный-доступ'; });
  $('#loginForm').addEventListener('submit', async (e) => { e.preventDefault(); clearMessage('#loginMessage'); const b = $('#loginForm button[type="submit"]'); b.disabled = true; try { saveSession(await authApi.login($('#loginEmail').value.trim(), $('#loginPassword').value)); const next = new URLSearchParams(location.search).get('next'); location.href = next && /^[\w-]+\.html$/.test(next) ? next : 'profile.html'; } catch (error) { message('#loginMessage', errText(error)); } finally { b.disabled = false; } });
}
async function register() {
  if (authenticated()) { location.href = 'profile.html'; return; }
  $('#registerForm').addEventListener('submit', async (e) => { e.preventDefault(); clearMessage('#registerMessage'); const b = $('#registerForm button[type="submit"]'); b.disabled = true; try { saveSession(await authApi.register($('#registerName').value.trim(), $('#registerEmail').value.trim(), $('#registerPassword').value)); location.href = 'profile.html'; } catch (error) { message('#registerMessage', errText(error)); } finally { b.disabled = false; } });
}
async function privateUser() { if (!requireAuth()) return null; try { const { user } = await authApi.me(); saveUser(user); shell(); return user; } catch { clearSession(); requireAuth(); return null; } }
async function profile() {
  const user = await privateUser(); if (!user) return;
  $('#profileName').textContent = user.name; $('#profileEmail').textContent = user.email; $('#avatarInitial').textContent = user.name[0].toUpperCase(); $('#profileFormName').value = user.name; $('#profileFormEmail').value = user.email; if (user.isDemo) $('#demoProfileNotice').hidden = false;
  $('#profileForm').addEventListener('submit', async (e) => { e.preventDefault(); try { const { user: updated } = await authApi.update($('#profileFormName').value.trim()); saveUser(updated); $('#profileName').textContent = updated.name; $('#avatarInitial').textContent = updated.name[0].toUpperCase(); shell(); message('#profileMessage', 'Профиль сохранён в учебном API.', 'success'); } catch (error) { message('#profileMessage', errText(error)); } });
}
async function restaurant() {
  const id = new URLSearchParams(location.search).get('id') || 'baltic-table';
  try { const [r, menu, reviews] = await Promise.all([api(`/restaurants/${encodeURIComponent(id)}`), api(`/menus?restaurantId=${encodeURIComponent(id)}`), api(`/reviews?restaurantId=${encodeURIComponent(id)}`)]); restaurants = [r]; document.title = `${r.name} — TableTime`; $('#restaurantHero').style.backgroundImage = `linear-gradient(0deg,rgba(26,22,19,.76),rgba(26,22,19,.08)),url('${r.image}')`; $('#restaurantName').textContent = r.name; $('#restaurantMeta').textContent = `${r.cuisine} · ${r.district} · ${r.priceLabel} · ★ ${r.rating}`; $('#restaurantAddress').textContent = `${r.address}, ${r.metro}`; $('#restaurantDescription').textContent = r.description; $('#restaurantTags').innerHTML = r.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join(''); $('#restaurantMenu').innerHTML = menu.length ? menu.map((m) => `<div class="menu-row d-flex gap-3 justify-content-between"><div><strong>${esc(m.name)}</strong><div class="meta">${esc(m.description)}</div></div><strong>${esc(m.price)}</strong></div>`).join('') : '<p class="meta">Меню пока не добавлено.</p>'; $('#restaurantReviews').innerHTML = reviews.length ? reviews.map((v) => `<article class="review mb-4"><div class="d-flex justify-content-between"><strong>${esc(v.author)}</strong><span class="rating">${'★'.repeat(Number(v.rating))}</span></div><p class="mb-0">${esc(v.text)}</p></article>`).join('') : '<p class="meta">Отзывов пока нет.</p>'; $('#detailReserve').addEventListener('click', () => { if (requireAuth()) openModal(r); }); }
  catch (e) { $('#restaurantName').textContent = 'Не удалось загрузить ресторан'; $('#restaurantMeta').textContent = errText(e); $('#detailReserve').hidden = true; message('#restaurantLoadError', errText(e)); }
}
async function bookings() {
  if (!(await privateUser())) return; const out = $('#bookingList'), params = new URLSearchParams(location.search);
  if (params.has('created') || params.has('updated')) { $('#bookingNotice').textContent = params.has('created') ? 'Бронь сохранена в учебном API.' : 'Изменения брони сохранены в учебном API.'; $('#bookingNotice').hidden = false; }
  const load = async () => { out.innerHTML = loading('Загружаем ваши бронирования…'); try { const [items, all] = await Promise.all([bookingApi.list(), api('/restaurants')]); restaurants = all; const byId = new Map(all.map((r) => [r.id, r])); out.innerHTML = items.length ? items.map((b) => { const r = byId.get(b.restaurantId); return `<article class="booking-item mb-3"><div class="row align-items-center g-3"><div class="col-md"><span class="badge booking-status mb-2">Подтверждено учебным API</span><h2 class="h4 mb-1">${esc(r?.name || 'Ресторан удалён')}</h2><p class="mb-0 meta">${esc(b.date.split('-').reverse().join('.'))} · ${esc(b.time)} · ${b.guests} гостей<br>${esc(r?.address || 'Адрес недоступен')}</p>${b.comment ? `<p class="small mt-2 mb-0">Комментарий: ${esc(b.comment)}</p>` : ''}</div><div class="col-md-auto d-flex gap-2"><button class="btn btn-outline-ink btn-sm edit" data-id="${b.id}">Изменить</button><button class="btn btn-outline-danger btn-sm cancel" data-id="${b.id}">Отменить</button></div></div></article>`; }).join('') : `<div class="empty-state"><h2 class="section-title fs-3">Пока нет бронирований</h2><p>Выберите ресторан и создайте первую учебную бронь.</p><a class="btn btn-clay" href="index.html">Найти ресторан</a></div>`; $$('.edit', out).forEach((x) => x.addEventListener('click', () => { const b = items.find((i) => i.id === x.dataset.id); openModal(byId.get(b.restaurantId), b); })); $$('.cancel', out).forEach((x) => x.addEventListener('click', async () => { if (!confirm('Отменить эту учебную бронь?')) return; x.disabled = true; try { await bookingApi.remove(x.dataset.id); load(); } catch (e) { message('#bookingPageMessage', errText(e)); x.disabled = false; } })); } catch (e) { out.innerHTML = failure(errText(e)); $('.retry', out)?.addEventListener('click', load); } };
  await load();
}

shell();
({ search, login, register, profile, restaurant, bookings }[document.body.dataset.page] || (() => {}))();
