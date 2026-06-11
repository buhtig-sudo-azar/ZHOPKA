---
Task ID: 1
Agent: Main Agent
Task: Интеграция AI из dive-into-llms в ZHOPKA — выбор моделей, токены, fallback

Work Log:
- Клонировал и изучил проект ZHOPKA (E-Commerce генератор карточек товаров)
- Изучил проект dive-into-llms через GitHub API (AI платформа с чатом, моделями, токенами)
- Проанализировал паттерны AI интеграции: model-store, ModelSelector, ApiTokenInput, fallback цепочка моделей
- Создал model-store.ts (Zustand) — управление текущей моделью, API токеном, списком бесплатных моделей, rate limits, localStorage persistence
- Создал /api/models/route.ts — GET список бесплатных моделей с OpenRouter с 5-минутным кэшем и fallback
- Создал /api/models/check/route.ts — POST проверка доступности модели (probe request), rate limit info
- Обновил /api/generate-text/route.ts — fallback цепочка моделей при 429/timeout, поддержка пользовательского токена и модели, 8с таймаут
- Создал ModelSelector.tsx — popover с поиском, статусами моделей, кастомная модель, проверка всех
- Создал ApiTokenInput.tsx — ввод/отображение/верификация/удаление API ключа OpenRouter
- Обновил page.tsx — ModelSelector в хедере, передача model/apiToken в generate-text API
- Убрал лишний AI Assistant Chat (не относящийся к генерации карточки)
- Сборка next build проходит успешно (TypeScript + 6 маршрутов)
- API тесты: /api/models возвращает 21 модель, /api/models/check работает, /api/generate-text корректно обрабатывает ошибки
- Пуш на GitHub: commit 9c99ab24

Stage Summary:
- 8 файлов изменено, 946 добавлений, 56 удалений
- 5 новых файлов: model-store.ts, models/route.ts, models/check/route.ts, ModelSelector.tsx, ApiTokenInput.tsx
- 3 модифицированных: generate-text/route.ts, page.tsx, theme-toggle.tsx
- Удалены: chat-store.ts, chat/route.ts, AIAssistantChat.tsx
- Ключ на GitHub: push успешен в main ветку
