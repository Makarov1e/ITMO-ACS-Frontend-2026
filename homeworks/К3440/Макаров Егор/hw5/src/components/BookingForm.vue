<script setup>
import { computed, reactive, watch } from 'vue'

const props = defineProps({
  restaurant: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['create-booking'])

const form = reactive({
  date: '2026-09-26',
  time: '',
  guests: 2,
  name: ''
})

const error = computed(() => {
  if (!form.date || !form.time || !form.name.trim()) return 'Укажите дату, время и имя для бронирования.'
  return ''
})

const dateLabel = computed(() => new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric', month: 'long'
}).format(new Date(`${form.date}T12:00:00`)))

watch(
  () => props.restaurant,
  (restaurant) => {
    form.time = restaurant.available
  },
  { immediate: true }
)

function submitBooking() {
  if (error.value) return

  emit('create-booking', {
    id: crypto.randomUUID(),
    restaurantName: props.restaurant.name,
    dateLabel: dateLabel.value,
    time: form.time,
    guests: form.guests,
    guestName: form.name.trim()
  })
  form.name = ''
}
</script>

<template>
  <form class="booking-form" @submit.prevent="submitBooking">
    <div class="chosen-restaurant">
      <span class="chosen-label">Ресторан</span>
      <strong>{{ restaurant.name }}</strong>
      <span>{{ restaurant.district }} · {{ restaurant.cuisine }}</span>
    </div>

    <div class="form-grid">
      <label>
        <span>Дата</span>
        <input v-model="form.date" type="date" min="2026-09-01" required />
      </label>
      <label>
        <span>Время</span>
        <select v-model="form.time" required>
          <option v-for="time in ['18:00', '18:45', '19:30', '20:00', '20:30', '21:00']" :key="time" :value="time">{{ time }}</option>
        </select>
      </label>
    </div>

    <label>
      <span>Количество гостей</span>
      <div class="guest-control">
        <button type="button" :disabled="form.guests === 1" aria-label="Уменьшить количество гостей" @click="form.guests--">−</button>
        <output>{{ form.guests }} {{ form.guests === 1 ? 'гость' : form.guests < 5 ? 'гостя' : 'гостей' }}</output>
        <button type="button" :disabled="form.guests === 8" aria-label="Увеличить количество гостей" @click="form.guests++">+</button>
      </div>
    </label>

    <label>
      <span>Ваше имя</span>
      <input v-model.trim="form.name" type="text" autocomplete="name" placeholder="Например, Егор" required />
    </label>

    <p v-if="error && form.name" class="form-error" role="alert">{{ error }}</p>
    <button class="booking-submit" type="submit">Подтвердить бронь <span aria-hidden="true">→</span></button>
    <p class="form-note">Только учебная демонстрация: данные не передаются на сервер.</p>
  </form>
</template>
