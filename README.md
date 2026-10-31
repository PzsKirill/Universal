# unversal

Портфолио сайтов, сделанных человеком вместе с Claude. План — в [PLAN.md](PLAN.md), лицензии ассетов — в [ASSETS.md](ASSETS.md), журналы процесса — в [process/](process/).

## Проекты

| Папка | Что это | Запуск |
|---|---|---|
| [apps/lithic](apps/lithic) | LITHIC — лендинг вымышленного архива «глубокого времени» (шейдер, скролл-сцены, лазерная гравировка) | `pnpm dev:lithic` |

## Команды

```bash
pnpm install                     # зависимости для всех проектов
pnpm dev:lithic                  # dev-сервер LITHIC → http://localhost:5173
pnpm build                       # сборка всех проектов
pnpm typecheck                   # проверка типов
pnpm shot http://localhost:5173  # скриншоты по секциям (Edge), добавь --mobile для телефона
```
