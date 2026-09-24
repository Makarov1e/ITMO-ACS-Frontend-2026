import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BookingForm from './BookingForm.vue'
import RestaurantCard from './RestaurantCard.vue'

const restaurant = {
  id: 1,
  name: 'Северяне',
  cuisine: 'Авторская кухня',
  district: 'Петроградская сторона',
  price: '₽₽₽',
  rating: '4.9',
  description: 'Тестовое описание',
  available: '19:30',
  accent: 'terracotta',
  featured: true
}

describe('Vue-компоненты TableTime', () => {
  it('RestaurantCard отображает props и передаёт ресторан в событии select', async () => {
    const wrapper = mount(RestaurantCard, { props: { restaurant } })
    expect(wrapper.text()).toContain('Северяне')
    await wrapper.get('.select-button').trigger('click')
    expect(wrapper.emitted('select')).toEqual([[restaurant]])
  })

  it('BookingForm реактивно меняет количество гостей и emits валидную бронь', async () => {
    const wrapper = mount(BookingForm, { props: { restaurant } })
    await wrapper.get('[aria-label="Увеличить количество гостей"]').trigger('click')
    expect(wrapper.text()).toContain('3 гостя')
    await wrapper.get('input[autocomplete="name"]').setValue('Егор')
    await wrapper.get('form').trigger('submit')
    const event = wrapper.emitted('create-booking')
    expect(event).toHaveLength(1)
    expect(event[0][0]).toMatchObject({ restaurantName: 'Северяне', guests: 3, guestName: 'Егор' })
  })
})
