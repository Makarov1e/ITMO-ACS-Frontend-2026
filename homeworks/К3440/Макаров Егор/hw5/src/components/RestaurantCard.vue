<script setup>
defineProps({
  restaurant: {
    type: Object,
    required: true
  },
  selected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])
</script>

<template>
  <article class="restaurant-card" :class="[{ selected }, `accent-${restaurant.accent}`]">
    <div class="card-image" aria-hidden="true">
      <span v-if="restaurant.featured" class="photo-label">выбор редакции</span>
      <span class="image-tint"></span>
    </div>
    <div class="card-body">
      <div class="card-topline">
        <p>{{ restaurant.cuisine }}</p>
        <span class="rating"><span aria-hidden="true">★</span> {{ restaurant.rating }}</span>
      </div>
      <h3>{{ restaurant.name }}</h3>
      <p class="card-description">{{ restaurant.description }}</p>
      <div class="card-footer">
        <span class="restaurant-meta">{{ restaurant.district }} · {{ restaurant.price }}</span>
        <button
          class="select-button"
          type="button"
          :aria-pressed="selected"
          @click="emit('select', restaurant)"
        >
          {{ selected ? 'Выбрано' : `В ${restaurant.available}` }}
          <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  </article>
</template>
