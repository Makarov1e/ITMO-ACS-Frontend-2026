# API TableTime — ЛР2

API предназначен **только для локальной учебной демонстрации**. По умолчанию процесс слушает `127.0.0.1:3002`; браузер получает его через Vite proxy `/api`. База исполнения `api/runtime/db.json` создаётся копированием `api/seed.json` и не входит в Git. JSON Server обслуживает публичные коллекции, а Express middleware добавляет аутентификацию и контроль владения.

| Метод и путь | Доступ | Результат |
|---|---|---|
| `GET /restaurants`, `GET /restaurants/:id` | публичный | Демонстрационные рестораны. Поддерживаются стандартные query JSON Server, например `?cuisine=Русская`. |
| `GET /menus?restaurantId=:id`, `GET /reviews?restaurantId=:id` | публичный | Демонстрационное меню или отзывы. |
| `POST /auth/register` | публичный | Принимает `name`, `email`, `password`; возвращает `{ token, user }`. E-mail уникален, пароль хранится как bcrypt-хеш. |
| `POST /auth/login` | публичный | Принимает `email`, `password`; возвращает `{ token, user }`. |
| `GET /auth/me`, `PATCH /auth/me` | Bearer JWT | Безопасное представление текущего профиля. У профиля изменяется только `name`. |
| `GET /bookings`, `POST /bookings` | Bearer JWT | Только брони текущего пользователя; создание проверяет ресторан и поля. |
| `GET`, `PATCH`, `DELETE /bookings/:id` | Bearer JWT | Операция возможна только с собственной бронью. Чужой идентификатор отвечает `404`, не раскрывая существование записи. |

`user` всегда имеет вид `{ id, name, email, isDemo, createdAt }`. Маршрут `/users` намеренно отвечает `404`, а `passwordHash` не включается ни в один ответ. Публичные сущности доступны только для `GET`; попытки их изменить возвращают `405`.

> Токен — учебный JWT со сроком 8 часов. Это mock API, не production-сервис: не вводите реальные персональные данные или пароли.

## Примеры

```bash
npm ci
npm run dev
curl http://127.0.0.1:3002/restaurants
curl -X POST http://127.0.0.1:3002/auth/login \
  -H 'content-type: application/json' \
  -d '{"email":"demo@tabletime.local","password":"учебный-доступ"}'
```

## Источники

[1]: https://github.com/typicode/json-server/tree/v0.17.4 "JSON Server v0.17.4"
[2]: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API "Fetch API — MDN Web Docs"
