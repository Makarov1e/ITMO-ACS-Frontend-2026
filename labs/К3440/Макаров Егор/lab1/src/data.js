export const restaurants = [
  {
    id: 'baltic-table',
    name: 'Балтийский стол',
    cuisine: 'Русская',
    district: 'Петроградский',
    price: 2,
    priceLabel: '₽₽',
    rating: '4,9',
    reviews: 128,
    address: 'Каменноостровский пр., 21',
    metro: 'Петроградская · 6 мин',
    image: './assets/restaurant-interior-unsplash.jpg',
    description: 'Современная северная кухня и камерный зал в пяти минутах от метро.',
    tags: ['Северная кухня', 'Вино', 'Тихий зал']
  },
  {
    id: 'saffron-room',
    name: 'Шафрановая гостиная',
    cuisine: 'Паназиатская',
    district: 'Центральный',
    price: 3,
    priceLabel: '₽₽₽',
    rating: '4,8',
    reviews: 86,
    address: 'ул. Марата, 18',
    metro: 'Маяковская · 4 мин',
    image: './assets/luxury-interior-unsplash.jpg',
    description: 'Пряные авторские блюда, открытая кухня и мягкий свет для долгих встреч.',
    tags: ['Авторская кухня', 'Бар', 'Свидание']
  },
  {
    id: 'vetrino',
    name: 'Ветрино',
    cuisine: 'Итальянская',
    district: 'Василеостровский',
    price: 2,
    priceLabel: '₽₽',
    rating: '4,7',
    reviews: 203,
    address: '8-я линия В.О., 27',
    metro: 'Василеостровская · 8 мин',
    image: './assets/restaurant-bar-unsplash.jpg',
    description: 'Паста ручной работы, сезонные овощи и оживлённый вечерний бар.',
    tags: ['Паста', 'Семейный', 'Терраса']
  },
  {
    id: 'neva-supper',
    name: 'Нева — ужин',
    cuisine: 'Европейская',
    district: 'Адмиралтейский',
    price: 3,
    priceLabel: '₽₽₽',
    rating: '4,9',
    reviews: 64,
    address: 'наб. реки Мойки, 54',
    metro: 'Адмиралтейская · 9 мин',
    image: './assets/fine-dining-unsplash.jpg',
    description: 'Небольшой ресторан для особых вечеров рядом с набережной Мойки.',
    tags: ['Дегустационный сет', 'Вид', 'Особый случай']
  }
];

export const demoReviews = [
  { author: 'Анна К.', text: 'Бронировали столик на двоих: спокойно, внимательно и очень вкусно.', rating: 5 },
  { author: 'Михаил Р.', text: 'Удачная винная карта и понятное сезонное меню. Вернёмся ещё.', rating: 5 },
  { author: 'София Л.', text: 'Комфортная посадка и приветливая команда. Лучше бронировать заранее.', rating: 4 }
];

export const menuItems = [
  { name: 'Тартар из лосося', description: 'огурец, укроп, хрустящий картофель', price: '890 ₽' },
  { name: 'Филе судака', description: 'печёный сельдерей, соус из белого вина', price: '1 290 ₽' },
  { name: 'Павлова с облепихой', description: 'меренга, сливочный крем, ягоды', price: '590 ₽' }
];

export function filterRestaurants(items, filters = {}) {
  const query = (filters.query || '').trim().toLowerCase();
  return items.filter((item) => {
    const searchable = `${item.name} ${item.cuisine} ${item.district} ${item.tags.join(' ')}`.toLowerCase();
    return (!query || searchable.includes(query)) &&
      (!filters.cuisine || item.cuisine === filters.cuisine) &&
      (!filters.district || item.district === filters.district) &&
      (!filters.price || String(item.price) === String(filters.price));
  });
}

export function getRestaurant(id) {
  return restaurants.find((restaurant) => restaurant.id === id) || restaurants[0];
}
