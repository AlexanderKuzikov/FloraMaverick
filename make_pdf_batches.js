const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const FOLDER_PATH = './_букеты';
const BATCH_SIZE = 15; // Идеальный лимит для генерации Gold Set

function createPDFBatch(files, batchIndex) {
    return new Promise((resolve) => {
        const doc = new PDFDocument({ autoFirstPage: false });
        const pdfName = `Gold_Batch_${batchIndex + 1}.pdf`;
        const writeStream = fs.createWriteStream(pdfName);
        
        doc.pipe(writeStream);

        for (const file of files) {
            doc.addPage({ margin: 50 });
            
            // Пишем имя файла крупным шрифтом
            doc.fontSize(24).text(`Файл: ${file}`, { align: 'center' });
            doc.moveDown(1);

            // Вставляем картинку с автоматическим масштабированием под страницу
            const imagePath = path.join(FOLDER_PATH, file);
            doc.image(imagePath, {
                fit: [500, 600], // Масштабируем, чтобы влезло на А4
                align: 'center',
                valign: 'center'
            });
        }

        doc.end();
        writeStream.on('finish', () => {
            console.log(`✅ Создан PDF: ${pdfName} (картинок: ${files.length})`);
            resolve();
        });
    });
}

async function run() {
    const files = fs.readdirSync(FOLDER_PATH)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort(); // Сортируем по алфавиту для порядка

    if (files.length === 0) {
        return console.log("Нет картинок для создания PDF.");
    }

    console.log(`Найдено ${files.length} изображений. Разбиваем по ${BATCH_SIZE}...`);

    for (let i = 0; i < files.length; i += BATCH_SIZE) {
        const batch = files.slice(i, i + BATCH_SIZE);
        const batchIndex = Math.floor(i / BATCH_SIZE);
        await createPDFBatch(batch, batchIndex);
    }
    console.log("🎉 Все PDF-батчи готовы! Можно загружать в чат.");
}

run();
