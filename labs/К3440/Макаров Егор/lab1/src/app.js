import 'bootstrap';
import { Modal } from 'bootstrap';
import { demoReviews, filterRestaurants, getRestaurant, menuItems, restaurants } from './data.js';
import './styles.css';

const KEYS = { session: 'tabletime-lab1-session', users: 'tabletime-lab1-users', bookings: 'tabletime-lab1-bookings', selected: 'tabletime-lab1-selected-restaurant' };
const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

function safeRead(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function safeWrite(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function getSession() { return safeRead(KEYS.session, null); }
function currentUser() { return getSession() || { name: 'Гость', email: 'guest@tabletime.local', isDemo: true }; }
function getUsers() { return safeRead(KEYS.users, []); }
function setMessage(target, text, kind = 'danger') {
  const el = typeof target === 'string' ? $(target) : target;
  if (!el) return;
  el.className = `alert alert-${kind} py-2 mb-3`;
  el.textContent = text;
  el.hidden = false;
}
function clearMessage(target) { const el = typeof target === 'string' ? $(target) : target; if (el) el.hidden = true; }
function normalizeReservation(booking) { return { ...booking, restaurant: getRestaurant(booking.restaurantId) }; }
function getBookings() { return safeRead(KEYS.bookings, []).map(normalizeReservation); }
function navMarkup(active) {
  const session = getSession();
  return `<nav class="navbar navbar-expand-lg sticky-top" aria-label="Основная навигация"><div class="container py-2"><a class="brand" href="index.html">table<span class="brand-dot">time</span></a><button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav" aria-controls="mainNav" aria-expanded="false" aria-label="Открыть меню"><span class="navbar-toggler-icon"></span></button><div class="collapse navbar-collapse" id="mainNav"><ul class="navbar-nav ms-auto align-items-lg-center gap-lg-1"><li class="nav-item"><a class="nav-link ${active === 'search' ? 'active' : ''}" href="index.html">Рестораны</a></li><li class="nav-item"><a class="nav-link ${active === 'bookings' ? 'active' : ''}" href="bookings.html">Бронирования</a></li><li class="nav-item"><a class="nav-link ${active === 'profile' ? 'active' : ''}" href="profile.html">Профиль</a></li>${session ? `<li class="nav-item ms-lg-2"><button class="btn btn-sm btn-outline-ink" id="logoutButton">Выйти</button></li>` : `<li class="nav-item ms-lg-2"><a class="btn btn-sm btn-clay" href="login.html">Войти</a></li>`}</ul></div></div></nav>`;
}
function footerMarkup() {
  return `<footer class="mt-5"><div class="container py-4"><div class="row g-3 align-items-center"><div class="col-md"><a class="brand text-decoration-none" href="index.html">table<span class="brand-dot">time</span></a><p class="small mb-0 mt-1">Учебный интерфейс бронирования столиков. Данные ресторанов, отзывы и брони демонстрационные.</p></div><div class="col-md-auto small text-md-end"><a href="https://unsplash.com/license" target="_blank" rel="noreferrer">Фото: Unsplash License</a><br><span>ЛР1 · Макаров Егор · К3440</span></div></div></div></footer>`;
}
function renderShell() {
  const page = document.body.dataset.page || '';
  $('#site-header').innerHTML = navMarkup(page);
  $('#site-footer').innerHTML = footerMarkup();
  $('#logoutButton')?.addEventListener('click', () => { localStorage.removeItem(KEYS.session); window.location.href = 'index.html'; });
}
function restaurantCard(item) {
  return `<article class="restaurant-card"><img src="${item.image}" alt="Интерьер ресторана ${item.name}" loading="lazy"><div class="card-body d-flex flex-column"><div class="d-flex justify-content-between gap-2 align-items-start"><h2 class="mb-1">${item.name}</h2><span class="rating">★ ${item.rating}</span></div><p class="meta mb-2">${item.cuisine} · ${item.district} · ${item.priceLabel}</p><p class="mb-3">${item.description}</p><div class="mb-3">${item.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div><div class="mt-auto d-flex gap-2 flex-wrap"><button class="btn btn-clay btn-sm reserve-button" type="button" data-id="${item.id}" data-bs-toggle="modal" data-bs-target="#bookingModal">Забронировать</button><a class="btn btn-outline-ink btn-sm" href="restaurant.html?id=${item.id}" data-detail="${item.id}">О ресторане</a></div></div></article>`;
}
function attachReservationButtons(parent = document) {
  $$('.reserve-button', parent).forEach((button) => button.addEventListener('click', () => setupModal(getRestaurant(button.dataset.id))));
  $$('[data-detail]', parent).forEach((link) => link.addEventListener('click', () => localStorage.setItem(KEYS.selected, link.dataset.detail)));
}
function modalMarkup() {
  return `<div class="modal fade" id="bookingModal" tabindex="-1" aria-labelledby="bookingModalTitle" aria-describedby="bookingModalHelp"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><div class="modal-header"><h1 class="modal-title fs-5" id="bookingModalTitle">Забронировать столик</h1><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button></div><form id="bookingForm" novalidate><div class="modal-body"><p id="bookingModalHelp" class="text-secondary small">Учебная локальная запись: заявка сохранится только в этом браузере.</p><div id="bookingFormMessage" class="alert" hidden role="alert"></div><p class="fw-bold mb-3" id="bookingRestaurantName"></p><input id="bookingRestaurantId" type="hidden"><div class="row g-3"><div class="col-sm-6"><label class="form-label" for="bookingDate">Дата</label><input class="form-control" id="bookingDate" type="date" required></div><div class="col-sm-6"><label class="form-label" for="bookingTime">Время</label><select class="form-select" id="bookingTime" required><option value="">Выберите время</option><option>18:00</option><option>19:00</option><option>20:00</option><option>21:00</option></select></div><div class="col-12"><label class="form-label" for="bookingGuests">Гостей</label><select class="form-select" id="bookingGuests" required><option value="">Выберите количество</option><option value="2">2 гостя</option><option value="3">3 гостя</option><option value="4">4 гостя</option><option value="5">5 гостей</option><option value="6">6 гостей</option></select></div><div class="col-12"><label class="form-label" for="bookingComment">Комментарий <span class="text-secondary fw-normal">необязательно</span></label><input class="form-control" id="bookingComment" maxlength="120" placeholder="Например, нужен детский стул"></div></div></div><div class="modal-footer"><button type="button" class="btn btn-outline-ink" data-bs-dismiss="modal">Отмена</button><button type="submit" class="btn btn-clay">Подтвердить бронь</button></div></form></div></div></div>`;
}
function dateMin() { const now = new Date(); now.setDate(now.getDate() + 1); return now.toISOString().slice(0, 10); }
function setupModal(restaurant) {
  $('#bookingRestaurantName').textContent = restaurant.name;
  $('#bookingRestaurantId').value = restaurant.id;
  $('#bookingDate').min = dateMin();
  clearMessage('#bookingFormMessage');
}
function initBookingModal() {
  document.body.insertAdjacentHTML('beforeend', modalMarkup());
  const modalElement = $('#bookingModal');
  modalElement.addEventListener('shown.bs.modal', () => $('#bookingDate').focus());
  $('#bookingForm').addEventListener('submit', (event) => {
    event.preventDefault();
    const restaurantId = $('#bookingRestaurantId').value;
    const date = $('#bookingDate').value;
    const time = $('#bookingTime').value;
    const guests = Number($('#bookingGuests').value);
    if (!restaurantId || !date || !time || !guests) { setMessage('#bookingFormMessage', 'Заполните дату, время и количество гостей.'); return; }
    if (date < dateMin()) { setMessage('#bookingFormMessage', 'Выберите дату не раньше завтрашнего дня.'); return; }
    const session = currentUser();
    const booking = { id: `reservation-${Date.now()}`, restaurantId, date, time, guests, comment: $('#bookingComment').value.trim(), userEmail: session.email, createdAt: new Date().toISOString() };
    const bookings = safeRead(KEYS.bookings, []); bookings.unshift(booking); safeWrite(KEYS.bookings, bookings);
    const instance = Modal.getOrCreateInstance(modalElement); instance.hide();
    window.location.href = 'bookings.html?created=1';
  });
}

function initSearch() {
  const form = $('#filtersForm');
  const output = $('#restaurantResults');
  const count = $('#resultCount');
  function render() {
    const filters = Object.fromEntries(new FormData(form).entries());
    const results = filterRestaurants(restaurants, filters);
    count.textContent = `Найдено: ${results.length}`;
    output.innerHTML = results.length ? results.map((item) => `<div class="col-md-6">${restaurantCard(item)}</div>`).join('') : `<div class="col-12"><div class="empty-state"><h2 class="section-title fs-3">Ничего не найдено</h2><p>Попробуйте сбросить один из фильтров или изменить запрос.</p><button class="btn btn-soft" type="button" id="emptyReset">Сбросить фильтры</button></div></div>`;
    attachReservationButtons(output);
    $('#emptyReset')?.addEventListener('click', () => { form.reset(); render(); });
  }
  form.addEventListener('input', render); form.addEventListener('change', render);
  $('#resetFilters').addEventListener('click', () => { form.reset(); render(); });
  render();
}
function initLogin() {
  const form = $('#loginForm');
  $('#demoLogin').addEventListener('click', () => { $('#loginEmail').value = 'demo@tabletime.local'; $('#loginPassword').value = 'учебный-доступ'; });
  form.addEventListener('submit', (event) => {
    event.preventDefault(); clearMessage('#loginMessage');
    const email = $('#loginEmail').value.trim().toLowerCase(); const password = $('#loginPassword').value;
    const user = getUsers().find((item) => item.email === email && item.password === password);
    if (email === 'demo@tabletime.local' && password === 'учебный-доступ') { safeWrite(KEYS.session, { name: 'Гость TableTime', email, isDemo: true }); window.location.href = 'profile.html'; return; }
    if (!user) { setMessage('#loginMessage', 'Не удалось войти. Используйте демо-доступ или зарегистрируйтесь.'); return; }
    safeWrite(KEYS.session, { name: user.name, email: user.email, isDemo: false }); window.location.href = 'profile.html';
  });
}
function initRegister() {
  $('#registerForm').addEventListener('submit', (event) => {
    event.preventDefault(); clearMessage('#registerMessage');
    const name = $('#registerName').value.trim(); const email = $('#registerEmail').value.trim().toLowerCase(); const password = $('#registerPassword').value;
    if (name.length < 2 || !email.includes('@') || password.length < 6) { setMessage('#registerMessage', 'Укажите имя, корректный e-mail и пароль из 6+ символов.'); return; }
    const users = getUsers(); if (users.some((user) => user.email === email)) { setMessage('#registerMessage', 'Этот учебный e-mail уже зарегистрирован. Войдите в аккаунт.'); return; }
    users.push({ name, email, password }); safeWrite(KEYS.users, users); safeWrite(KEYS.session, { name, email, isDemo: false }); window.location.href = 'profile.html';
  });
}
function initProfile() {
  const user = currentUser();
  $('#profileName').textContent = user.name; $('#profileEmail').textContent = user.email; $('#avatarInitial').textContent = user.name.slice(0, 1).toUpperCase();
  $('#profileFormName').value = user.name; $('#profileFormEmail').value = user.email;
  if (user.isDemo) $('#demoProfileNotice').hidden = false;
  $('#profileForm').addEventListener('submit', (event) => {
    event.preventDefault(); const name = $('#profileFormName').value.trim();
    if (name.length < 2) { setMessage('#profileMessage', 'Имя должно содержать не менее двух символов.'); return; }
    const session = { ...user, name }; safeWrite(KEYS.session, session);
    if (!user.isDemo) { const users = getUsers().map((account) => account.email === user.email ? { ...account, name } : account); safeWrite(KEYS.users, users); }
    setMessage('#profileMessage', 'Профиль сохранён в локальном хранилище браузера.', 'success'); $('#profileName').textContent = name; $('#avatarInitial').textContent = name.slice(0, 1).toUpperCase();
  });
}
function initRestaurant() {
  const params = new URLSearchParams(window.location.search); const id = params.get('id') || localStorage.getItem(KEYS.selected) || restaurants[0].id; const restaurant = getRestaurant(id); localStorage.setItem(KEYS.selected, restaurant.id);
  document.title = `${restaurant.name} — TableTime`;
  $('#restaurantHero').style.backgroundImage = `linear-gradient(0deg, rgba(26, 22, 19, .76), rgba(26, 22, 19, .08)), url('${restaurant.image}')`;
  $('#restaurantName').textContent = restaurant.name; $('#restaurantMeta').textContent = `${restaurant.cuisine} · ${restaurant.district} · ${restaurant.priceLabel} · ★ ${restaurant.rating}`;
  $('#restaurantAddress').textContent = `${restaurant.address}, ${restaurant.metro}`; $('#restaurantDescription').textContent = restaurant.description;
  $('#restaurantTags').innerHTML = restaurant.tags.map((tag) => `<span class="tag">${tag}</span>`).join('');
  $('#restaurantMenu').innerHTML = menuItems.map((item) => `<div class="menu-row d-flex gap-3 justify-content-between"><div><strong>${item.name}</strong><div class="meta">${item.description}</div></div><strong class="text-nowrap">${item.price}</strong></div>`).join('');
  $('#restaurantReviews').innerHTML = demoReviews.map((review) => `<article class="review mb-4"><div class="d-flex justify-content-between"><strong>${review.author}</strong><span class="rating">${'★'.repeat(review.rating)}</span></div><p class="mb-0">${review.text}</p></article>`).join('');
  $('#detailReserve').dataset.id = restaurant.id; attachReservationButtons($('#detailReserve').parentElement);
}
function initBookings() {
  const user = currentUser(); const bookings = getBookings().filter((booking) => booking.userEmail === user.email); const output = $('#bookingList');
  if (new URLSearchParams(window.location.search).has('created')) { $('#bookingNotice').hidden = false; }
  function render() {
    const current = getBookings().filter((booking) => booking.userEmail === user.email);
    output.innerHTML = current.length ? current.map((booking) => `<article class="booking-item mb-3"><div class="row align-items-center g-3"><div class="col-md"><span class="badge booking-status mb-2">Подтверждено локально</span><h2 class="h4 mb-1">${booking.restaurant.name}</h2><p class="mb-0 meta">${booking.date.split('-').reverse().join('.')} · ${booking.time} · ${booking.guests} ${booking.guests === 1 ? 'гость' : 'гостя/гостей'}<br>${booking.restaurant.address}</p>${booking.comment ? `<p class="small mt-2 mb-0">Комментарий: ${booking.comment}</p>` : ''}</div><div class="col-md-auto"><button class="btn btn-outline-danger btn-sm cancel-booking" data-booking-id="${booking.id}">Отменить</button></div></div></article>`).join('') : `<div class="empty-state"><h2 class="section-title fs-3">Пока нет бронирований</h2><p>Выберите ресторан и создайте первую учебную бронь.</p><a class="btn btn-clay" href="index.html">Найти ресторан</a></div>`;
    $$('.cancel-booking', output).forEach((button) => button.addEventListener('click', () => {
      const remaining = safeRead(KEYS.bookings, []).filter((booking) => booking.id !== button.dataset.bookingId); safeWrite(KEYS.bookings, remaining); render();
    }));
  }
  render();
}

renderShell();
initBookingModal();
const page = document.body.dataset.page;
if (page === 'search') initSearch();
if (page === 'login') initLogin();
if (page === 'register') initRegister();
if (page === 'profile') initProfile();
if (page === 'restaurant') initRestaurant();
if (page === 'bookings') initBookings();
