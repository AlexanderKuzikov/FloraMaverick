const fs = require("fs/promises");
const path = require("path");
const sharp = require("sharp");
const { BOUQUET_SYSTEM_PROMPT, BOUQUET_JSON_SCHEMA } = require("./bouquets_prompt");

// --- НАСТРОЙКИ ---
const API_KEY = process.env.GROQ_API_KEY || "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"; 
const API_KEY = process.env.GROQ_API_KEY || ""; 
const API_URL = "https://api.groq.com/openai/v1/chat/completions";
const FOLDER_PATH = "./_букеты";
const MODEL_ID = "meta-llama/llama-4-maverick-17b-128e-instruct";
const OUTPUT_FILE = "bouquets_maverick_v2.json";
const LOG_FILE = "token_log.jsonl";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- ПАРСЕР ВРЕМЕНИ GROQ ---
// Превращает "7.66s" в 7660, а "2m59.56s" в 179560
function parseGroqTime(timeStr) {
    if (!timeStr) return 0;
    let ms = 0;
    
    // Ищем минуты (например "2m")
    const minMatch = timeStr.match(/([\d\.]+)m/);
    if (minMatch) ms += parseFloat(minMatch[1]) * 60000;
    
    // Ищем секунды (например "59.56s")
    const secMatch = timeStr.match(/([\d\.]+)s/);
    if (secMatch) ms += parseFloat(secMatch[1]) * 1000;
    
    return ms;
}

async function run() {
    console.log(`\n🔍 Запуск анализа. Модель: ${MODEL_ID}`);
    const files = (await fs.readdir(FOLDER_PATH))
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

    if (!files.length) return console.log("Нет картинок для анализа.");

    let results = [];
    try {
        const existing = await fs.readFile(OUTPUT_FILE, "utf-8");
        results = JSON.parse(existing);
    } catch (e) {}

    const processedFiles = new Set(results.map(r => r.image_file));
    let stats = { processed: 0, promptTokens: 0, completionTokens: 0, startTime: Date.now() };

    for (let i = 0; i < files.length; i++) {
        const filename = files[i];
        if (processedFiles.has(filename)) {
            console.log(`[${i + 1}/${files.length}] Пропуск (уже есть): ${filename}`);
            continue;
        }

        console.log(`[${i + 1}/${files.length}] Анализ: ${filename}...`);
        
        const filePath = path.join(FOLDER_PATH, filename);
        
        const imageBuffer = await sharp(filePath)
            .resize({ width: 1000, height: 1000, fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();
            
        const base64Image = imageBuffer.toString("base64");
        const mimeType = "image/jpeg"; 

        const payload = {
            model: MODEL_ID,
            temperature: 0.1,
            messages: [
                { role: "user", content: [
                    { type: "text", text: BOUQUET_SYSTEM_PROMPT },
                    { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}` } }
                ]}
            ],
            response_format: { type: "json_schema", json_schema: BOUQUET_JSON_SCHEMA }
        };

        let attempt = 0;
        let success = false;

        while (attempt < 5 && !success) {
            attempt++;
            try {
                const res = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                // Читаем лимиты и правильно парсим время
                const remTokens = parseInt(res.headers.get('x-ratelimit-remaining-tokens') || '100000');
                const resetTokensStr = res.headers.get('x-ratelimit-reset-tokens') || '0s';
                const resetTokensMs = parseGroqTime(resetTokensStr); // <-- ИСПОЛЬЗУЕМ НОВУЮ ФУНКЦИЮ

                if (res.status === 429) {
                    // Если словили 429, сервер присылает заголовок retry-after (в секундах)
                    const retryAfter = parseInt(res.headers.get('retry-after') || '5');
                    const waitMs = (retryAfter * 1000) + 500;
                    console.log(`   ⏳ [429 Лимит] Сервер просит подождать ${Math.round(waitMs/1000)} сек...`);
                    await sleep(waitMs);
                    continue;
                }

                if (!res.ok) throw new Error(`Ошибка API: ${res.status} ${await res.text()}`);

                const data = await res.json();
                const obj = JSON.parse(data.choices[0].message.content);
                
                obj.id = String(i + 1).padStart(3, "0");
                obj.image_file = filename;
                results.push(obj);

                const usage = data.usage || {};
                stats.promptTokens += usage.prompt_tokens || 0;
                stats.completionTokens += usage.completion_tokens || 0;
                stats.processed++;

                const logEntry = { file: filename, time: new Date().toISOString(), usage };
                await fs.appendFile(LOG_FILE, JSON.stringify(logEntry) + "\n");
                await fs.writeFile(OUTPUT_FILE, JSON.stringify(results, null, 2));
                
                success = true;

                // УМНЫЙ СОН: Если токенов осталось меньше, чем весит 1 букет (~8000), ждем ресета.
                if (remTokens < 8000) {
                    console.log(`   ⏱ Мало токенов (${remTokens}). Ждем ресета ${Math.round(resetTokensMs/1000)} сек...`);
                    await sleep(resetTokensMs + 200); // 200мс запаса на пинг
                } else {
                    await sleep(300); // Микропауза анти-спам
                }

            } catch (error) {
                const isNetworkError = error.message.includes("ECONNRESET") || error.message.includes("fetch failed");
                if (isNetworkError) {
                    console.log(`   ⚠️ [Сетевой сбой] Соединение разорвано. Пробуем снова через 3 сек (попытка ${attempt}/5)...`);
                    await sleep(3000);
                } else {
                    console.error(`   ❌ [Критическая ошибка] ${error.message}`);
                    break;
                }
            }
        }
        
        if (!success) {
            console.log(`   🚨 Не удалось обработать ${filename} после 5 попыток. Пропускаем.`);
        }
    }

    const totalTimeSec = Math.round((Date.now() - stats.startTime) / 1000);
    console.log(`\n==========================================`);
    console.log(`📊 ИТОГОВЫЙ ОТЧЕТ: ${MODEL_ID}`);
    console.log(`==========================================`);
    console.log(`✅ Успешно обработано: ${stats.processed}`);
    console.log(`⏱ Общее время: ${Math.floor(totalTimeSec / 60)} мин ${totalTimeSec % 60} сек`);
    if (stats.processed > 0) console.log(`⚡ Среднее время на фото: ${(totalTimeSec / stats.processed).toFixed(1)} сек`);
    console.log(`💾 Результат: ${OUTPUT_FILE}`);
    console.log(`==========================================\n`);
}

run().catch(console.error);
