# Решения ДЗ1

Макаров Егор, К3440. В этом файле ответы извлечены из журналов фактических успешных проверок. Описание способа проверки и воспроизведения находится в [отчёте](REPORT.md).

## Flexbox Froggy

| Уровень | Принятый CSS |
|---|---|
| 1 | `justify-content: flex-end;` |
| 2 | `justify-content: center;` |
| 3 | `justify-content: space-around;` |
| 4 | `justify-content: space-between;` |
| 5 | `align-items: flex-end;` |
| 6 | `justify-content: center; align-items: center;` |
| 7 | `justify-content: space-around; align-items: flex-end;` |
| 8 | `flex-direction: row-reverse;` |
| 9 | `flex-direction: column;` |
| 10 | `flex-direction: row-reverse; justify-content: flex-end;` |
| 11 | `flex-direction: column; justify-content: flex-end;` |
| 12 | `flex-direction: column-reverse; justify-content: space-between;` |
| 13 | `flex-direction: row-reverse; justify-content: center; align-items: flex-end;` |
| 14 | `order: 2;` |
| 15 | `order: -1;` |
| 16 | `align-self: flex-end;` |
| 17 | `order: 2; align-self: flex-end;` |
| 18 | `flex-wrap: wrap;` |
| 19 | `flex-direction: column; flex-wrap: wrap;` |
| 20 | `flex-flow: column wrap;` |
| 21 | `align-content: flex-start;` |
| 22 | `align-content: flex-end;` |
| 23 | `flex-direction: column-reverse; align-content: center;` |
| 24 | `flex-flow: column-reverse wrap-reverse; justify-content: center; align-content: space-between;` |

## CSS Grid Garden

| Уровень | Принятый CSS |
|---|---|
| 1 | `grid-column-start: 3;` |
| 2 | `grid-column-start: 5;` |
| 3 | `grid-column-end: 4;` |
| 4 | `grid-column-end: 2;` |
| 5 | `grid-column-end: -2;` |
| 6 | `grid-column-start: -3;` |
| 7 | `grid-column-end: span 2;` |
| 8 | `grid-column-end: span 5;` |
| 9 | `grid-column-start: span 3;` |
| 10 | `grid-column: 4 / 6;` |
| 11 | `grid-column: 2 / span 3;` |
| 12 | `grid-row-start: 3;` |
| 13 | `grid-row: 3 / 6;` |
| 14 | `grid-column: 2; grid-row: 5;` |
| 15 | `grid-column: 2 / 6; grid-row: 1 / 6;` |
| 16 | `grid-area: 1 / 2 / 4 / 6;` |
| 17 | `grid-area: 2 / 3 / 5 / 6;` |
| 18 | `order: 2;` |
| 19 | `order: -1;` |
| 20 | `grid-template-columns: 50% 50%;` |
| 21 | `grid-template-columns: repeat(8, 12.5%);` |
| 22 | `grid-template-columns: 100px 3em 40%;` |
| 23 | `grid-template-columns: 1fr 5fr;` |
| 24 | `grid-template-columns: 50px 1fr 1fr 1fr 50px;` |
| 25 | `grid-template-columns: 75px 3fr 2fr; grid-template-rows: 100%;` |
| 26 | `grid-template-rows: 50px 0 0 0 1fr;` |
| 27 | `grid-template: 60% / 200px 1fr;` |
| 28 | `grid-template: 1fr 50px / 1fr 4fr;` |

## Learn Git Branching

Указанные команды введены в штатный терминал тренажёра. Их принятие подтверждено оригинальным checker. Ссылки ведут на реальные диалоги успешного завершения.

### intro1 — Знакомство с Git Commit

```text
git commit
git commit
```

[Подтверждение уровня](screenshots/git/intro1.png)

### intro2 — Ветвление в Git

```text
git branch bugFix
git checkout bugFix
```

[Подтверждение уровня](screenshots/git/intro2.png)

### intro3 — Слияния веток в Git

```text
git checkout -b bugFix
git commit
git checkout main
git commit
git merge bugFix
```

[Подтверждение уровня](screenshots/git/intro3.png)

### intro4 — Введение в rebase

```text
git checkout -b bugFix
git commit
git checkout main
git commit
git checkout bugFix
git rebase main
```

[Подтверждение уровня](screenshots/git/intro4.png)

### remote1 — Введение в клонирование

```text
git clone
```

[Подтверждение уровня](screenshots/git/remote1.png)

### remote2 — Удалённые ветки

```text
git commit
git checkout o/main
git commit
```

[Подтверждение уровня](screenshots/git/remote2.png)

### remote3 — Git fetch

```text
git fetch
```

[Подтверждение уровня](screenshots/git/remote3.png)

### remote4 — Git pull

```text
git pull
```

[Подтверждение уровня](screenshots/git/remote4.png)

### remote5 — Коллективная работа

```text
git clone
git fakeTeamwork 2
git commit
git pull
```

[Подтверждение уровня](screenshots/git/remote5.png)

### remote6 — Git push

```text
git commit
git commit
git push
```

[Подтверждение уровня](screenshots/git/remote6.png)

### remote7 — Расхождение в истории

```text
git clone
git fakeTeamwork
git commit
git pull --rebase
git push
```

[Подтверждение уровня](screenshots/git/remote7.png)

### remote8 — Заблокированная ветвь main

```text
git branch -f main o/main
git checkout -b feature C2
git push origin feature
```

[Подтверждение уровня](screenshots/git/remote8.png)

### remoteAdvanced1 — Push Мастер!

```text
git fetch
git rebase o/main side1
git rebase side1 side2
git rebase side2 side3
git rebase side3 main
git push
```

[Подтверждение уровня](screenshots/git/remoteAdvanced1.png)

### remoteAdvanced2 — Слияние с удалённым репозиторием

```text
git checkout main
git pull
git merge side1
git merge side2
git merge side3
git push
```

[Подтверждение уровня](screenshots/git/remoteAdvanced2.png)

### remoteAdvanced3 — Слежка за удалённым репозиторием

```text
git checkout -b side o/main
git commit
git pull --rebase
git push
```

[Подтверждение уровня](screenshots/git/remoteAdvanced3.png)

### remoteAdvanced4 — Аргументы git push

```text
git push origin main
git push origin foo
```

[Подтверждение уровня](screenshots/git/remoteAdvanced4.png)

### remoteAdvanced5 — Аргументы для push -- расширенная версия!

```text
git push origin main^:foo
git push origin foo:main
```

[Подтверждение уровня](screenshots/git/remoteAdvanced5.png)

### remoteAdvanced6 — Аргументы для fetch

```text
git fetch origin c3:foo
git fetch origin c6:main
git checkout foo
git merge main
```

[Подтверждение уровня](screenshots/git/remoteAdvanced6.png)

### remoteAdvanced7 — Пустой источник

```text
git push origin :foo
git fetch origin :bar
```

[Подтверждение уровня](screenshots/git/remoteAdvanced7.png)

### remoteAdvanced8 — Аргументы для pull

```text
git pull origin c3:foo
git pull origin c2:side
```

[Подтверждение уровня](screenshots/git/remoteAdvanced8.png)

## Источники

[1]: https://flexboxfroggy.com/#ru "Flexbox Froggy"
[2]: https://cssgridgarden.com/#ru "CSS Grid Garden"
[3]: https://github.com/pcottle/learnGitBranching/tree/20dfff09e59e42ddc8fbd5dc722e8ddddeb43418 "Learn Git Branching — проверенная версия"
