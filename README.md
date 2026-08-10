<p align="center">
  <a href="https://nodejs.org"><img alt="Node.js" src="https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white"></a>
  <a href="https://github.com/AlexanderKuzikov/FloraMaverick/blob/main/LICENSE"><img alt="License" src="https://img.shields.io/badge/License-Apache--2.0-blue"></a>
</p>

<h1 align="center">FloraMaverick</h1>
<p align="center">Пакетная обработка фото букетов: PDF, QA-коллажи, VLM-сравнение</p>

---

Набор утилит для пакетной обработки фотографий букетов. Генерация PDF-батчей, создание QA-коллажей и сравнение результатов VLM-моделей.

- **PDF-батчи** — пакетная сборка PDF из фотографий букетов через pdfkit.
- **QA-коллажи** — автоматическая генерация коллажей для контроля качества.
- **VLM-сравнение** — сопоставление результатов различных vision-language моделей.

## Быстрый старт

```bash
git clone https://github.com/AlexanderKuzikov/FloraMaverick.git
cd FloraMaverick
npm install
node index.js
```

## Документация

- [`docs/CONTEXT.md`](docs/CONTEXT.md) — состояние проекта
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — архитектурные решения

## Статус

**v1.0.0** — работает.

## Лицензия

[Apache-2.0](LICENSE) © Alexander Kuzikov
