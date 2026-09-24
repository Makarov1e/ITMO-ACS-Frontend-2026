<script setup>
import { computed, ref } from 'vue'
import BookingForm from './components/BookingForm.vue'
import RestaurantCard from './components/RestaurantCard.vue'

const restaurants = ref([
  {
    id: 1,
    name: 'Северяне',
    cuisine: 'Авторская кухня',
    district: 'Петроградская сторона',
    price: '₽₽₽',
    rating: '4.9',
    description: 'Ужин у открытой кухни и сезонные блюда, собранные вокруг северных продуктов.',
    available: '19:30',
    accent: 'terracotta',
    featured: true
  },
  {
    id: 2,
    name: 'Пробка',
    cuisine: 'Итальянская кухня',
    district: 'Центральный район',
    price: '₽₽',
    rating: '4.8',
    description: 'Живой вечер с пастой, вином и длинным разговором за общим столом.',
    available: '20:00',
    accent: 'olive',
    featured: false
  },
  {
    id: 3,
    name: 'Футура',
    cuisine: 'Бистро',
    district: 'Васильевский остров',
    price: '₽₽',
    rating: '4.7',
    description: 'Небольшое бистро для позднего завтрака, встречи с друзьями и неспешного ужина.',
    available: '18:45',
    accent: 'sand',
    featured: false
  }
])

const activeCuisine = ref('Все')
const selectedRestaurant = ref(restaurants.value[0])
const bookings = ref([])
const notice = ref('')

const cuisines = computed(() => ['Все', ...new Set(restaurants.value.map((restaurant) => restaurant.cuisine))])
const filteredRestaurants = computed(() => {
  if (activeCuisine.value === 'Все') return restaurants.value
  return restaurants.value.filter((restaurant) => restaurant.cuisine === activeCuisine.value)
})

function selectRestaurant(restaurant) {
  selectedRestaurant.value = restaurant
  notice.value = ''
}

function addBooking(booking) {
  bookings.value.unshift(booking)
  notice.value = `Столик в «${booking.restaurantName}» добавлен в список бронирований.`
}
</script>

<template>
  <main class="page-shell">
    <section class="hero" aria-labelledby="page-title">
      <header class="topbar">
        <a class="brand" href="#page-title" aria-label="TableTime, на главную">
          <span class="brand-mark" aria-hidden="true">T</span>
          <span>TableTime</span>
        </a>
        <p class="city"><span aria-hidden="true">⌖</span> Санкт-Петербург</p>
      </header>

      <div class="hero-content">
        <p class="eyebrow">учебное Vue-приложение</p>
        <h1 id="page-title">Вечер, который<br />начинается со стола.</h1>
        <p class="hero-copy">Выберите ресторан, время и количество гостей. Данные демонстрационные: бронь остаётся только в текущей сессии.</p>
      </div>
    </section>

    <section class="content-grid" aria-label="Выбор ресторана и оформление бронирования">
      <div class="discover-panel">
        <div class="section-heading">
          <div>
            <p class="eyebrow">подборка на сегодня</p>
            <h2>Рестораны для вашего вечера</h2>
          </div>
          <span class="result-count">{{ filteredRestaurants.length }} варианта</span>
        </div>

        <div class="filter-list" aria-label="Фильтр по кухне">
          <button
            v-for="cuisine in cuisines"
            :key="cuisine"
            class="filter-button"
            :class="{ active: activeCuisine === cuisine }"
            type="button"
            :aria-pressed="activeCuisine === cuisine"
            @click="activeCuisine = cuisine"
          >
            {{ cuisine }}
          </button>
        </div>

        <div class="restaurant-list">
          <RestaurantCard
            v-for="restaurant in filteredRestaurants"
            :key="restaurant.id"
            :restaurant="restaurant"
            :selected="selectedRestaurant?.id === restaurant.id"
            @select="selectRestaurant"
          />
        </div>
      </div>

      <aside class="booking-panel" aria-labelledby="booking-title">
        <p class="eyebrow">ваш выбор</p>
        <h2 id="booking-title">Забронировать столик</h2>
        <BookingForm
          v-if="selectedRestaurant"
          :restaurant="selectedRestaurant"
          @create-booking="addBooking"
        />
        <p v-else class="empty-state">Выберите ресторан из списка, чтобы продолжить.</p>

        <p v-if="notice" class="notice" role="status">{{ notice }}</p>

        <section v-if="bookings.length" class="booking-history" aria-labelledby="history-title">
          <div class="history-title-row">
            <h3 id="history-title">В этой сессии</h3>
            <span>{{ bookings.length }}</span>
          </div>
          <ul>
            <li v-for="booking in bookings" :key="booking.id">
              <strong>{{ booking.restaurantName }}</strong>
              <span>{{ booking.dateLabel }}, {{ booking.time }} · {{ booking.guests }} гостя</span>
            </li>
          </ul>
        </section>
      </aside>
    </section>
  </main>
</template>
