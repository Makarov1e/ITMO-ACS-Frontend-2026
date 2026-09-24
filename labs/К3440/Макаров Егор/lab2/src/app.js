import 'bootstrap';
import { Modal } from 'bootstrap';
import { ApiError, api, authApi, bookingApi, clearSession, getSession, saveSession } from './api.js';
import { createThemeController } from './theme.js';
import './sprite-icons.js';
import './styles.css';

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const theme = createThemeController();
let restaurants = [];
let editing = null;
let modalReturnFocus = null;
const esc = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
const errText = (error) => error instanceof ApiError ? error.message : 'Непредвиденная ошибка интерфейса.';
const tomorrow = () => { const date = new Date(); date.setDate(date.getDate() + 1); return date.toISOString().slice(0, 10); };

function message(target, text, kind = 'danger') {
  const element = typeof target === 'string' ? $(target) : target;
  if (!element) return;
  element.className = `alert alert-${kind} py-2 mb-3`;
  element.textContent = text;
  element.hidden = false;
}
function clearMessage(target) { const element = typeof target === 'string' ? $(target) : target; if (element) element.hidden = true; }
function loading(text) { return `<div class="col-12"><div class="state-panel" role="status" aria-live="polite" aria-atomic="true"><span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span><span>${esc(text)}</span></div></div>`; }
function failure(text, retryLabel = 'Повторить загрузку') { return `<div class="col-12"><div class="state-panel state-error" role="alert" aria-atomic="true"><strong>Не удалось получить данные.</strong><br>${esc(text)}<br><button class="btn btn-outline-ink btn-sm mt-3 retry" type="button" aria-label="${esc(retryLabel)}">Повторить</button></div></div>`; }
function empty(title, text = 'Попробуйте изменить условия поиска или вернуться к списку ресторанов.') { return `<div class="col-12"><div class="empty-state"><h3 class="section-title fs-3">${esc(title)}</h3><p>${esc(text)}</p></div></div>`; }
function authenticated() { return Boolean(getSession()); }
function requireAuth() { if (!authenticated()) { location.href = `login.html?next=${encodeURIComponent(location.pathname.split('/').pop() || 'index.html')}`; return false; } return true; }
function saveUser(user) { const session = getSession(); if (session) saveSession({ ...session, user }); }
function setBusy(element, value) { if (element) element.setAttribute('aria-busy', String(value)); }
function prepareFormValidation(form) {
  if (!form) return;
  form.addEventListener('invalid', (event) => event.target.setAttribute('aria-invalid', 'true'), true);
  form.addEventListener('input', (event) => { if (event.target.validity?.valid) event.target.removeAttribute('aria-invalid'); });
  form.addEventListener('change', (event) => { if (event.target.validity?.valid) event.target.removeAttribute('aria-invalid'); });
}

function nav(active) {
  const user = getSession()?.user;
  const current = (page) => active === page ? ' aria-current="page"' : '';
  return `<nav class="navbar navbar-expand-lg sticky-top" aria-label="Основная навигация"><div class="container py-2"><a class="brand" href="index.html" aria-label="TableTime, на главную">table<span class="brand-dot">time</span></a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Открыть меню"><span class="navbar-toggler-icon" aria-hidden="true"></span></button><div class="collapse navbar-collapse" id="mainNav"><ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1"><li class="nav-item"><a class="nav-link${active === 'search' ? ' active' : ''}" href="index.html"${current('search')}>Рестораны</a></li><li class="nav-item"><a class="nav-link${active === 'bookings' ? ' active' : ''}" href="bookings.html"${current('bookings')}>Бронирования</a></li><li class="nav-item"><a class="nav-link${active === 'profile' ? ' active' : ''}" href="profile.html"${current('profile')}>Профиль</a></li><li class="nav-item ms-lg-2" data-theme-controls></li>${user ? `<li class="nav-item ms-lg-2"><span class="small text-secondary me-lg-2">${esc(user.name)}</span><button class="btn btn-sm btn-outline-ink" id="logoutButton" type="button">Выйти</button></li>` : '<li class="nav-item ms-lg-2"><a class="btn btn-sm btn-clay" href="login.html">Войти</a></li>'}</ul></div></div></nav>`;
}
function shell() {
  const page = document.body.dataset.page || '';
  $('#site-header').innerHTML = nav(page);
  $('#site-footer').innerHTML = `<div class="container py-4"><div class="row g-3 align-items-center"><div class="col-md"><a class="brand text-decoration-none" href="index.html" aria-label="TableTime, на главную">table<span class="brand-dot">time</span></a><p class="small mb-0 mt-1">Учебный интерфейс бронирования. Рестораны, отзывы и брони — демонстрационные; API работает локально.</p></div><div class="col-md-auto small text-md-end"><a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Фото: Unsplash License <span class="visually-hidden">(откроется в новой вкладке)</span></a><br><span>ЛР2 · Макаров Егор · К3440</span></div></div></div>`;
  $$('[data-theme-controls]').forEach((control) => theme.mount(control));
  $('#logoutButton')?.addEventListener('click', () => { clearSession(); location.href = 'index.html'; });
}
function card(restaurant) {
  const headingId = `restaurant-${esc(restaurant.id)}-title`;
  return `<article class="restaurant-card" aria-labelledby="${headingId}"><img src="${esc(restaurant.image)}" alt="Интерьер ресторана ${esc(restaurant.name)}" loading="lazy"><div class="card-body d-flex flex-column"><div class="d-flex justify-content-between gap-2 align-items-start"><h3 class="mb-1" id="${headingId}">${esc(restaurant.name)}</h3><span class="rating" aria-label="Рейтинг: ${esc(restaurant.rating)} из 5"><span aria-hidden="true">★</span> ${esc(restaurant.rating)}</span></div><p class="meta mb-2">${esc(restaurant.cuisine)} · ${esc(restaurant.district)} · ${esc(restaurant.priceLabel)}</p><p class="mb-3">${esc(restaurant.description)}</p><ul class="tags mb-3" aria-label="Особенности: ${esc(restaurant.tags.join(', '))}">${restaurant.tags.map((tag) => `<li class="tag">${esc(tag)}</li>`).join('')}</ul><div class="mt-auto d-flex gap-2 flex-wrap"><button class="btn btn-clay btn-sm reserve" type="button" data-id="${esc(restaurant.id)}">Забронировать в ${esc(restaurant.name)}</button><a class="btn btn-outline-ink btn-sm" href="restaurant.html?id=${encodeURIComponent(restaurant.id)}">О ресторане ${esc(restaurant.name)}</a></div></div></article>`;
}
function reservationButtons(parent = document) { $$('.reserve', parent).forEach((button) => button.addEventListener('click', () => { if (requireAuth()) openModal(restaurants.find((restaurant) => restaurant.id === button.dataset.id)); })); }

function modalHtml() { return `<div class="modal fade" id="bookingModal" tabindex="-1" role="dialog" aria-modal="true" aria-labelledby="bookingModalTitle" aria-describedby="bookingModalHelp"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h2 class="modal-title fs-5" id="bookingModalTitle">Забронировать столик</h2><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть форму бронирования"></button></div><form id="bookingForm"><div class="modal-body"><p id="bookingModalHelp" class="text-secondary small">Учебная запись сохранится в локальном JSON Server. Ресторан её не получит.</p><div id="bookingFormMessage" class="alert" hidden role="alert" aria-atomic="true"></div><p class="fw-bold mb-3" id="bookingRestaurantName"></p><input id="bookingRestaurantId" type="hidden"><div class="row g-3"><div class="col-sm-6"><label class="form-label" for="bookingDate">Дата <span aria-hidden="true">*</span><span class="visually-hidden">, обязательное поле</span></label><input class="form-control" id="bookingDate" name="date" type="date" required></div><div class="col-sm-6"><label class="form-label" for="bookingTime">Время <span aria-hidden="true">*</span><span class="visually-hidden">, обязательное поле</span></label><select class="form-select" id="bookingTime" name="time" required><option value="">Выберите время</option><option>18:00</option><option>19:00</option><option>20:00</option><option>21:00</option></select></div><div class="col-12"><label class="form-label" for="bookingGuests">Гостей <span aria-hidden="true">*</span><span class="visually-hidden">, обязательное поле</span></label><select class="form-select" id="bookingGuests" name="guests" required><option value="">Выберите количество</option>${[1, 2, 3, 4, 5, 6, 7, 8].map((number) => `<option value="${number}">${number} ${number === 1 ? 'гость' : 'гостей'}</option>`).join('')}</select></div><div class="col-12"><label class="form-label" for="bookingComment">Комментарий <span class="text-secondary fw-normal">(необязательно)</span></label><input class="form-control" id="bookingComment" name="comment" maxlength="200" placeholder="Например, нужен детский стул"></div></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-ink" data-bs-dismiss="modal">Отмена</button><button type="submit" class="btn btn-clay" id="bookingSubmit">Подтвердить бронь</button></div></form></div></div></div>`; }
function initModal() {
  if ($('#bookingModal')) return;
  document.body.insertAdjacentHTML('beforeend', modalHtml());
  const modal = $('#bookingModal');
  prepareFormValidation($('#bookingForm'));
  modal.addEventListener('shown.bs.modal', () => $('#bookingDate').focus());
  modal.addEventListener('hidden.bs.modal', () => {
    const returnTarget = modalReturnFocus;
    modalReturnFocus = null;
    requestAnimationFrame(() => requestAnimationFrame(() => returnTarget?.focus()));
  });
  $('#bookingForm').addEventListener('submit', async (event) => {
    event.preventDefault();
    const body = { restaurantId: $('#bookingRestaurantId').value, date: $('#bookingDate').value, time: $('#bookingTime').value, guests: Number($('#bookingGuests').value), comment: $('#bookingComment').value.trim() };
    if (!body.restaurantId || !body.date || !body.time || !body.guests) return message('#bookingFormMessage', 'Заполните дату, время и количество гостей.');
    const button = $('#bookingSubmit'); button.disabled = true; clearMessage('#bookingFormMessage');
    try { if (editing) await bookingApi.update(editing.id, body); else await bookingApi.create(body); Modal.getOrCreateInstance(modal).hide(); location.href = `bookings.html?${editing ? 'updated' : 'created'}=1`; }
    catch (error) { message('#bookingFormMessage', errText(error)); if (error.status === 401) setTimeout(requireAuth, 300); }
    finally { button.disabled = false; }
  });
}
function openModal(restaurant, booking = null) {
  modalReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  initModal(); editing = booking;
  $('#bookingModalTitle').textContent = booking ? 'Изменить бронь' : 'Забронировать столик';
  $('#bookingSubmit').textContent = booking ? 'Сохранить изменения' : 'Подтвердить бронь';
  $('#bookingRestaurantName').textContent = restaurant?.name || 'Выбранный ресторан';
  $('#bookingRestaurantId').value = booking?.restaurantId || restaurant?.id || '';
  $('#bookingDate').min = tomorrow(); $('#bookingDate').value = booking?.date || '';
  $('#bookingTime').value = booking?.time || ''; $('#bookingGuests').value = booking?.guests || ''; $('#bookingComment').value = booking?.comment || '';
  $$('#bookingForm [aria-invalid]').forEach((field) => field.removeAttribute('aria-invalid'));
  clearMessage('#bookingFormMessage'); Modal.getOrCreateInstance($('#bookingModal')).show();
}

async function search() {
  const form = $('#filtersForm'), output = $('#restaurantResults'), count = $('#resultCount');
  const render = () => {
    const filters = Object.fromEntries(new FormData(form).entries()), query = (filters.query || '').trim().toLowerCase();
    const list = restaurants.filter((restaurant) => (!query || `${restaurant.name} ${restaurant.cuisine} ${restaurant.district} ${restaurant.tags.join(' ')}`.toLowerCase().includes(query)) && (!filters.cuisine || restaurant.cuisine === filters.cuisine) && (!filters.district || restaurant.district === filters.district) && (!filters.price || String(restaurant.price) === filters.price));
    count.textContent = `Найдено: ${list.length}`; output.innerHTML = list.length ? list.map((restaurant) => `<div class="col-md-6">${card(restaurant)}</div>`).join('') : empty('Ничего не найдено'); reservationButtons(output); setBusy(output, false);
  };
  const load = async () => { setBusy(output, true); output.innerHTML = loading('Загружаем демонстрационные рестораны…'); try { restaurants = await api('/restaurants'); render(); } catch (error) { output.innerHTML = failure(errText(error), 'Повторить загрузку списка ресторанов'); setBusy(output, false); $('.retry', output)?.addEventListener('click', load); } };
  form.addEventListener('input', render); form.addEventListener('change', render); $('#resetFilters').addEventListener('click', () => { form.reset(); render(); }); await load();
}
async function login() {
  if (authenticated()) { location.href = 'profile.html'; return; }
  const form = $('#loginForm'); prepareFormValidation(form);
  $('#demoLogin').addEventListener('click', () => { $('#loginEmail').value = 'demo@tabletime.local'; $('#loginPassword').value = 'учебный-доступ'; $('#loginEmail').removeAttribute('aria-invalid'); $('#loginPassword').removeAttribute('aria-invalid'); });
  form.addEventListener('submit', async (event) => { event.preventDefault(); clearMessage('#loginMessage'); const button = $('#loginForm button[type="submit"]'); button.disabled = true; try { saveSession(await authApi.login($('#loginEmail').value.trim(), $('#loginPassword').value)); const next = new URLSearchParams(location.search).get('next'); location.href = next && /^[\w-]+\.html$/.test(next) ? next : 'profile.html'; } catch (error) { message('#loginMessage', errText(error)); } finally { button.disabled = false; } });
}
async function register() {
  if (authenticated()) { location.href = 'profile.html'; return; }
  const form = $('#registerForm'); prepareFormValidation(form);
  form.addEventListener('submit', async (event) => { event.preventDefault(); clearMessage('#registerMessage'); const button = $('#registerForm button[type="submit"]'); button.disabled = true; try { saveSession(await authApi.register($('#registerName').value.trim(), $('#registerEmail').value.trim(), $('#registerPassword').value)); location.href = 'profile.html'; } catch (error) { message('#registerMessage', errText(error)); } finally { button.disabled = false; } });
}
async function privateUser() { if (!requireAuth()) return null; try { const { user } = await authApi.me(); saveUser(user); shell(); return user; } catch { clearSession(); requireAuth(); return null; } }
async function profile() {
  const user = await privateUser(); if (!user) return;
  $('#profileName').textContent = user.name; $('#profileEmail').textContent = user.email; $('#avatarInitial').textContent = user.name[0].toUpperCase(); $('#profileFormName').value = user.name; $('#profileFormEmail').value = user.email; if (user.isDemo) $('#demoProfileNotice').hidden = false;
  const form = $('#profileForm'); prepareFormValidation(form);
  form.addEventListener('submit', async (event) => { event.preventDefault(); try { const { user: updated } = await authApi.update($('#profileFormName').value.trim()); saveUser(updated); $('#profileName').textContent = updated.name; $('#avatarInitial').textContent = updated.name[0].toUpperCase(); shell(); message('#profileMessage', 'Профиль сохранён в учебном API.', 'success'); } catch (error) { message('#profileMessage', errText(error)); } });
}
async function restaurant() {
  const id = new URLSearchParams(location.search).get('id') || 'baltic-table';
  try {
    const [restaurant, menu, reviews] = await Promise.all([api(`/restaurants/${encodeURIComponent(id)}`), api(`/menus?restaurantId=${encodeURIComponent(id)}`), api(`/reviews?restaurantId=${encodeURIComponent(id)}`)]);
    restaurants = [restaurant]; document.title = `${restaurant.name} — TableTime`; $('#restaurantHero').style.backgroundImage = `linear-gradient(0deg,rgba(26,22,19,.76),rgba(26,22,19,.08)),url('${restaurant.image}')`; $('#restaurantName').textContent = restaurant.name; $('#restaurantMeta').textContent = `${restaurant.cuisine} · ${restaurant.district} · ${restaurant.priceLabel} · рейтинг ${restaurant.rating} из 5`; $('#restaurantAddress').textContent = `${restaurant.address}, ${restaurant.metro}`; $('#restaurantDescription').textContent = restaurant.description; $('#restaurantTags').innerHTML = restaurant.tags.map((tag) => `<span class="tag">${esc(tag)}</span>`).join('');
    $('#restaurantMenu').innerHTML = menu.length ? menu.map((item) => `<div class="menu-row d-flex gap-3 justify-content-between"><div><strong>${esc(item.name)}</strong><div class="meta">${esc(item.description)}</div></div><strong>${esc(item.price)}</strong></div>`).join('') : '<p class="meta">Меню пока не добавлено.</p>';
    $('#restaurantReviews').innerHTML = reviews.length ? reviews.map((review) => `<article class="review mb-4"><div class="d-flex justify-content-between"><h3 class="h5 mb-1">${esc(review.author)}</h3><span class="rating" aria-label="Оценка: ${esc(review.rating)} из 5"><span aria-hidden="true">${'★'.repeat(Number(review.rating))}</span></span></div><p class="mb-0">${esc(review.text)}</p></article>`).join('') : '<p class="meta">Отзывов пока нет.</p>';
    $('#detailReserve').addEventListener('click', () => { if (requireAuth()) openModal(restaurant); });
  } catch (error) { $('#restaurantName').textContent = 'Не удалось загрузить ресторан'; $('#restaurantMeta').textContent = errText(error); $('#detailReserve').hidden = true; message('#restaurantLoadError', errText(error)); }
}
async function bookings() {
  if (!(await privateUser())) return;
  const output = $('#bookingList'), params = new URLSearchParams(location.search);
  if (params.has('created') || params.has('updated')) { const notice = $('#bookingNotice'); notice.textContent = params.has('created') ? 'Бронь сохранена в учебном API.' : 'Изменения брони сохранены в учебном API.'; notice.hidden = false; }
  const load = async () => {
    setBusy(output, true); output.innerHTML = loading('Загружаем ваши бронирования…');
    try {
      const [items, all] = await Promise.all([bookingApi.list(), api('/restaurants')]); restaurants = all; const byId = new Map(all.map((restaurant) => [restaurant.id, restaurant]));
      output.innerHTML = items.length ? items.map((booking) => { const restaurant = byId.get(booking.restaurantId); const name = restaurant?.name || 'Ресторан удалён'; return `<article class="booking-item mb-3" aria-label="Бронирование: ${esc(name)}, ${esc(booking.date)} в ${esc(booking.time)}"><div class="row align-items-center g-3"><div class="col-md"><span class="badge booking-status mb-2">Подтверждено учебным API</span><h2 class="h4 mb-1">${esc(name)}</h2><p class="mb-0 meta">${esc(booking.date.split('-').reverse().join('.'))} · ${esc(booking.time)} · ${booking.guests} гостей<br>${esc(restaurant?.address || 'Адрес недоступен')}</p>${booking.comment ? `<p class="small mt-2 mb-0">Комментарий: ${esc(booking.comment)}</p>` : ''}</div><div class="col-md-auto d-flex gap-2"><button class="btn btn-outline-ink btn-sm edit" type="button" data-id="${booking.id}" aria-label="Изменить бронь в ресторане ${esc(name)}">Изменить</button><button class="btn btn-outline-danger btn-sm cancel" type="button" data-id="${booking.id}" aria-label="Отменить бронь в ресторане ${esc(name)}">Отменить</button></div></div></article>`; }).join('') : `<div class="empty-state"><h2 class="section-title fs-3">Пока нет бронирований</h2><p>Выберите ресторан и создайте первую учебную бронь.</p><a class="btn btn-clay" href="index.html">Найти ресторан</a></div>`;
      $$('.edit', output).forEach((button) => button.addEventListener('click', () => { const booking = items.find((item) => item.id === button.dataset.id); openModal(byId.get(booking.restaurantId), booking); }));
      $$('.cancel', output).forEach((button) => button.addEventListener('click', async () => { if (!confirm('Отменить эту учебную бронь?')) return; button.disabled = true; try { await bookingApi.remove(button.dataset.id); load(); } catch (error) { message('#bookingPageMessage', errText(error)); button.disabled = false; } }));
      setBusy(output, false);
    } catch (error) { output.innerHTML = failure(errText(error), 'Повторить загрузку бронирований'); setBusy(output, false); $('.retry', output)?.addEventListener('click', load); }
  };
  await load();
}

shell();
({ search, login, register, profile, restaurant, bookings }[document.body.dataset.page] || (() => {}))();
