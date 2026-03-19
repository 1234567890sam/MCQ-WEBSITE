const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

/**
 * Generate Excel buffer from array-of-objects
 * @param {Object[]} data
 * @param {string} sheetName
 * @returns {Buffer}
 */
const generateExcel = (data, sheetName = 'Sheet1') => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Generate CSV string from array-of-objects
 * @param {Object[]} data
 * @returns {string}
 */
const generateCSV = (data) => {
    if (!data.length) return '';
    const headers = Object.keys(data[0]);
    const rows = data.map((row) =>
        headers.map((h) => {
            const val = row[h] ?? '';
            const str = String(val).replace(/"/g, '""');
            return /[",\n]/.test(str) ? `"${str}"` : str;
        }).join(',')
    );
    return [headers.join(','), ...rows].join('\n');
};

/**
 * Generate PDF buffer from array-of-objects
 * @param {Object[]} data
 * @param {string} title
 * @returns {Buffer}
 */
const generatePDF = (data, title = 'Report') => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const chunks = [];
        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Title
        doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(1);

        if (!data.length) {
            doc.text('No data available.', { align: 'center' });
            doc.end();
            return;
        }

        // Simple table rendering
        const headers = Object.keys(data[0]);
        const colWidth = Math.min(120, (doc.page.width - 80) / Math.min(headers.length, 6));
        const visibleHeaders = headers.slice(0, 6); // max 6 cols for readability

        // Table header styling
        doc.rect(40, doc.y, doc.page.width - 80, 20).fill('#f1f5f9').stroke('#cbd5e1');
        doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(9);
        
        const headerY = doc.y + 6;
        let x = 45;
        visibleHeaders.forEach((h) => {
            doc.text(h, x, headerY, { width: colWidth - 5, ellipsis: true });
            x += colWidth;
        });
        
        doc.y = headerY + 14; 
        doc.fillColor('#000000'); // Reset color

        // Data rows
        doc.font('Helvetica').fontSize(8);
        data.forEach((row, rowIndex) => {
            if (doc.y > doc.page.height - 60) doc.addPage();
            
            x = 45;
            const rowY = doc.y + 5;
            
            // Zebra striping (optional but good)
            if (rowIndex % 2 === 0) {
                doc.save().rect(40, doc.y, doc.page.width - 80, 18).fill('#f8fafc').restore();
            }

            visibleHeaders.forEach((h) => {
                doc.text(String(row[h] ?? ''), x, rowY, { width: colWidth - 5, ellipsis: true });
                x += colWidth;
            });
            
            doc.moveTo(40, doc.y + 18).lineTo(doc.page.width - 40, doc.y + 18).strokeColor('#e2e8f0').lineWidth(0.5).stroke();
            doc.y += 18;
        });

        doc.end();
    });
};

module.exports = { generateExcel, generateCSV, generatePDF };
