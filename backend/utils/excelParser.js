const XLSX = require('xlsx');

/**
 * Parse and validate an .xlsx buffer containing MCQ questions.
 * Returns { valid: [...], errors: [...] }
 */
const parseExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });

    const required = ['QUESTION', 'OPTION A', 'OPTION B', 'OPTION C', 'OPTION D', 'ANSWER', 'SUBJECT', 'DIFFICULTY', 'MARKS'];

    // Check required columns
    if (rows.length === 0) {
        return { valid: [], errors: ['Excel file is empty or has no data rows'] };
    }

    const firstRow = rows[0];
    const missingCols = required.filter((col) => !(col in firstRow));
    if (missingCols.length > 0) {
        return { valid: [], errors: [`Missing required columns: ${missingCols.join(', ')}`] };
    }

    const valid = [];
    const errors = [];
    const seen = new Set(); // For duplicate detection

    rows.forEach((row, index) => {
        const rowNum = index + 2; // Account for header row
        const rowErrors = [];

        const question = (row['QUESTION'] || '').trim();
        const optA = (row['OPTION A'] || '').trim();
        const optB = (row['OPTION B'] || '').trim();
        const optC = (row['OPTION C'] || '').trim();
        const optD = (row['OPTION D'] || '').trim();
        const answer = (row['ANSWER'] || '').trim().toUpperCase();
        const subject = (row['SUBJECT'] || '').trim();
        const difficulty = (row['DIFFICULTY'] || '').trim();
        const marks = parseFloat(row['MARKS']) || 1;

        if (!question) rowErrors.push('QUESTION is empty');
        if (!optA || !optB || !optC || !optD) rowErrors.push('One or more options are empty');
        if (!['A', 'B', 'C', 'D'].includes(answer)) rowErrors.push(`ANSWER must be A/B/C/D, got: "${answer}"`);
        if (!subject) rowErrors.push('SUBJECT is empty');
        if (!['Easy', 'Medium', 'Hard'].includes(difficulty)) rowErrors.push(`DIFFICULTY must be Easy/Medium/Hard, got: "${difficulty}"`);

        // Duplicate check
        const dupKey = question.toLowerCase();
        if (seen.has(dupKey)) {
            rowErrors.push('Duplicate question');
        } else {
            seen.add(dupKey);
        }

        if (rowErrors.length > 0) {
            errors.push({ row: rowNum, question: question || '(empty)', issues: rowErrors });
        } else {
            valid.push({
                question,
                options: [optA, optB, optC, optD],
                correctAnswer: answer,
                subject,
                difficulty,
                marks,
            });
        }
    });

    return { valid, errors };
};

module.exports = { parseExcel };
