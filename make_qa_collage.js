const fs = require('fs/promises');
const path = require('path');
const sharp = require('sharp');

const FOLDER_PATH = './_букеты';
const MAPPING_FILE = 'Collage_Mapping.txt';
const BATCH_SIZE = 9; // Сетка 3x3

async function run() {
    // 1. Берем файлы и сортируем по алфавиту
    const allFiles = (await fs.readdir(FOLDER_PATH))
        .filter((f) => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

    if (allFiles.length === 0) return console.log("Нет файлов для коллажа.");

    let mappingText = "Связь коллажей и файлов (читаем слева-направо, сверху-вниз):\n\n";
    
    // 2. Пагинация: разбиваем на батчи по 9 штук
    for (let i = 0; i < allFiles.length; i += BATCH_SIZE) {
        const chunk = allFiles.slice(i, i + BATCH_SIZE);
        const batchNum = Math.floor(i / BATCH_SIZE) + 1;
        const outputName = `QA_Collage_${batchNum}.jpg`;

        console.log(`Создаем ${outputName} (${chunk.length} фото)...`);
        mappingText += `=== ${outputName} ===\n`;

        // Настройки холста
        const thumbSize = 800; // Размер ячейки
        const padding = 20;    // Отступ
        const cols = 3;        // 3 колонки
        const rows = Math.ceil(chunk.length / cols); // Вычисляем кол-во строк

        const canvasWidth = cols * thumbSize + padding * (cols + 1);
        const canvasHeight = rows * thumbSize + padding * (rows + 1);

        const compositeOperations = [];

        // 3. Обрабатываем каждую картинку в батче
        for (let j = 0; j < chunk.length; j++) {
            const file = chunk[j];
            const filePath = path.join(FOLDER_PATH, file);

            // МАГИЯ ANTI-CROP: fit 'contain' вписывает картинку целиком, 
            // заполняя пустоты белым фоном. Никакая цена не обрежется!
            const buffer = await sharp(filePath)
                .resize(thumbSize, thumbSize, { 
                    fit: 'contain', 
                    background: { r: 255, g: 255, b: 255 } 
                })
                .toBuffer();

            // Вычисляем координаты X и Y
            const col = j % cols;
            const row = Math.floor(j / cols);
            
            const left = padding + col * (thumbSize + padding);
            const top = padding + row * (thumbSize + padding);

            compositeOperations.push({ input: buffer, top, left });
            
            // Записываем позицию (от 1 до 9) в маппинг
            mappingText += `Позиция ${j + 1} -> ${file}\n`;
        }

        // 4. Склеиваем и сохраняем коллаж
        await sharp({
            create: {
                width: canvasWidth,
                height: canvasHeight,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
        .composite(compositeOperations)
        .jpeg({ quality: 85 })
        .toFile(outputName);
        
        mappingText += "\n";
    }

    // 5. Сохраняем текстовый файл оглавления
    await fs.writeFile(MAPPING_FILE, mappingText, 'utf-8');
    console.log(`✅ Все коллажи и файл ${MAPPING_FILE} готовы!`);
}

run().catch(console.error);
