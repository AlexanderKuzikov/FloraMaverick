const fs = require('fs/promises');

// Твой API-ключ. Скрипт подхватит его из переменных окружения или использует тот, что ты скинул ранее.
const API_KEY = process.env.GROQ_API_KEY || "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";
const API_URL = "https://api.groq.com/openai/v1/chat/completions";

const MODELS = [
    { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B (Быстрая)" },
    { id: "openai/gpt-oss-120b", name: "GPT-OSS 120B (С рассуждениями)" }
];

// Вопросы заточены под твою сферу (ЖКХ, парсинг, Node.js)
const QUESTIONS = [
    "Извлеки ФИО, город и сумму долга из текста: 'Собственник Смирнов А.В., г. Казань, ул. Баумана, д. 15, кв. 42. Текущая задолженность за ЖКУ составляет 34 500 рублей.' Выведи ответ строго в формате JSON, без лишнего текста.",
    "Должник не платил за коммунальные услуги 5 лет. Управляющая компания хочет подать в суд. Учитывая, что срок исковой давности в РФ — 3 года, стоит ли вписывать в иск всю сумму долга за 5 лет? Ответь кратко, дай юридический совет.",
    "Как в Node.js максимально быстро сгенерировать 10 000 DOCX-файлов через библиотеку docxtemplater из шаблонов, чтобы этот процесс не заблокировал Event Loop (цикл событий)? Напиши 3 главных архитектурных совета.",
    "В многоквартирном доме прорвало стояк холодного водоснабжения до первого запорного крана. Залило соседей снизу. Кто по закону РФ должен компенсировать ущерб: управляющая компания или собственник квартиры? Почему?",
    "Напиши текст SMS-уведомления для должника ЖКХ о том, что через 3 дня дело будет передано в суд. Условия: максимум 160 символов, строго официально, без приветствий."
];

async function askModel(modelId, question) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: modelId,
                messages: [{ role: "user", content: question }],
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const err = await response.text();
            return `Ошибка API: ${response.status} - ${err}`;
        }

        const data = await response.json();
        return data.choices[0].message.content;
    } catch (error) {
        return `Системная ошибка: ${error.message}`;
    }
}

async function runTest() {
    console.log("🚀 Начинаем тестирование моделей через Groq API...\n");
    let htmlContent = `
    <!DOCTYPE html>
    <html lang="ru">
    <head>
        <meta charset="UTF-8">
        <title>Сравнение моделей: Llama 3.3 vs GPT-OSS-120B</title>
        <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f0f2f5; color: #333; margin: 0; padding: 20px; }
            h1 { text-align: center; color: #2c3e50; }
            .question-card { background: white; margin-bottom: 30px; border-radius: 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); overflow: hidden; }
            .question-header { background: #34495e; color: white; padding: 15px 20px; font-size: 1.1em; font-weight: bold; }
            .grid { display: flex; }
            .column { flex: 1; padding: 20px; border-right: 1px solid #eee; width: 50%; }
            .column:last-child { border-right: none; }
            .model-name { color: #e67e22; font-weight: bold; border-bottom: 2px solid #e67e22; padding-bottom: 5px; margin-bottom: 15px; font-size: 1.2em; }
            pre { white-space: pre-wrap; word-wrap: break-word; background: #f8f9fa; padding: 15px; border-radius: 5px; font-family: 'Courier New', Courier, monospace; font-size: 0.95em; line-height: 1.4; border: 1px solid #e1e4e8; }
        </style>
    </head>
    <body>
        <h1>Сравнение ответов: Llama 3.3 70B vs GPT-OSS 120B</h1>
    `;

    for (let i = 0; i < QUESTIONS.length; i++) {
        const q = QUESTIONS[i];
        console.log(`⏳ Вопрос ${i + 1}/${QUESTIONS.length}: ${q.substring(0, 50)}...`);
        
        // Запрашиваем ответы параллельно для ускорения
        const [answerLlama, answerGpt] = await Promise.all([
            askModel(MODELS[0].id, q),
            askModel(MODELS[1].id, q)
        ]);

        htmlContent += `
        <div class="question-card">
            <div class="question-header">Вопрос ${i + 1}: ${q}</div>
            <div class="grid">
                <div class="column">
                    <div class="model-name">${MODELS[0].name}</div>
                    <pre>${escapeHtml(answerLlama)}</pre>
                </div>
                <div class="column">
                    <div class="model-name">${MODELS[1].name}</div>
                    <pre>${escapeHtml(answerGpt)}</pre>
                </div>
            </div>
        </div>`;
        
        console.log(`✅ Вопрос ${i + 1} обработан!\n`);
    }

    htmlContent += `</body></html>`;

    await fs.writeFile('comparison_result.html', htmlContent, 'utf-8');
    console.log("🎉 Готово! Открой файл 'comparison_result.html' в браузере.");
}

function escapeHtml(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

runTest();
