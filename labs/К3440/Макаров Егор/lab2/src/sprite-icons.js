import './sprite-icons.css';
import spriteMarkup from '../assets/icons.svg?raw';

function mountSprite() {
  if (document.querySelector('#tt-svg-sprite')) return;
  document.body.insertAdjacentHTML('afterbegin', `<div id="tt-svg-sprite" aria-hidden="true">${spriteMarkup}</div>`);
}

function iconMarkup(name) {
  return `<svg class="tt-icon tt-icon--${name}" aria-hidden="true" focusable="false" viewBox="0 0 24 24"><use href="#icon-${name}"></use></svg>`;
}

function prependIcon(element, name) {
  if (!element || element.querySelector(':scope > svg.tt-icon')) return;
  element.insertAdjacentHTML('afterbegin', iconMarkup(name));
}

function decorateInterface() {
  const header = document.querySelector('#site-header');
  prependIcon(header?.querySelector('.nav-link[href="index.html"]'), 'search');
  prependIcon(header?.querySelector('.nav-link[href="bookings.html"]'), 'calendar');
  prependIcon(header?.querySelector('.nav-link[href="profile.html"]'), 'user');
  prependIcon(header?.querySelector('.btn[href="login.html"]'), 'user');
  prependIcon(header?.querySelector('#logoutButton'), 'logout');

  document.querySelectorAll('.restaurant-card .meta, #restaurantMeta').forEach((element) => prependIcon(element, 'pin'));
  document.querySelectorAll('.reserve, #detailReserve').forEach((element) => prependIcon(element, 'calendar'));
  document.querySelectorAll('a.btn-outline-ink[href^="restaurant.html"]').forEach((element) => prependIcon(element, 'arrow-right'));
  document.querySelectorAll('a.btn-soft[href="index.html"]').forEach((element) => prependIcon(element, 'arrow-left'));
}

const observer = new MutationObserver(decorateInterface);
observer.observe(document.documentElement, { childList: true, subtree: true });
mountSprite();
decorateInterface();
