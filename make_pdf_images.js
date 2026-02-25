const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

const FOLDER_PATH = './_букеты';
const OUTPUT_PDF = 'Images_Only_Gold.pdf';
const OUTPUT_TXT = 'Mapping.txt';

function createImagePdf() {
    const files = fs.readdirSync(FOLDER_PATH)
        .filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f))
        .sort();

    if (files.length === 0) return console.log("Нет картинок в папке.");

    console.log(`Найдено ${files.length} файлов. Генерируем PDF без текста...`);

    const doc = new PDFDocument({ autoFirstPage: false });
    const writeStream = fs.createWriteStream(OUTPUT_PDF);
    doc.pipe(writeStream);

    let mappingText = "Связь страниц PDF и файлов:\n\n";

    files.forEach((file, index) => {
        // Создаем страницу (размер А4: 595 x 842 точек)
        doc.addPage({ size: 'A4', margin: 0 });
        
        const imagePath = path.join(FOLDER_PATH, file);
        
        // Вставляем картинку. fit вписывает её целиком без обрезки!
        doc.image(imagePath, 0, 0, {
            fit: [595.28, 841.89],
            align: 'center',
            valign: 'center'
        });

        // Записываем привязку в текстовый файл
        mappingText += `Страница ${index + 1} ---> ${file}\n`;
    });

    doc.end();
    fs.writeFileSync(OUTPUT_TXT, mappingText, 'utf-8');

    writeStream.on('finish', () => {
        console.log(`✅ Создан чистый PDF: ${OUTPUT_PDF}`);
        console.log(`✅ Создан файл оглавления: ${OUTPUT_TXT}`);
    });
}

createImagePdf();
