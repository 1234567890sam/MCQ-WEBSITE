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

/**
 * Parse student bulk-upload Excel.
 * Expected columns: NAME, EMAIL (optional)
 * Auto-generates email/password if missing.
 */
const parseStudentExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });

    if (!rows.length) return { students: [], errors: ['Empty file'] };

    const students = [];
    const errors = [];

    rows.forEach((row, i) => {
        const name = (row['NAME'] || row['Name'] || row['name'] || '').trim();
        if (!name) { errors.push({ row: i + 2, issue: 'NAME is empty' }); return; }

        const studentId = (row['STUDENT ID'] || row['Student ID'] || row['student_id'] || '').trim();
        const seatNumber = (row['SEAT NUMBER'] || row['Seat Number'] || row['seat_no'] || '').trim();
        const semester = (row['SEMESTER'] || row['Semester'] || row['sem'] || '').trim();
        const department = (row['DEPARTMENT'] || row['Department'] || row['dept'] || '').trim();

        // Auto-generate email from name + index if not provided
        const baseEmail = name.toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9.]/g, '');
        let email = (row['EMAIL'] || row['Email'] || row['email'] || `${studentId || baseEmail}.${i + 1}@exam.local`).trim().toLowerCase();
        
        // Remove common suffixes like "(optional)" if user accidentally left them in
        email = email.split(' ')[0].split('(')[0].trim();

        // Password is same as studentId if provided, otherwise random 8-char
        let password = studentId;
        if (!password) {
            const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
            for (let j = 0; j < 8; j++) password += chars.charAt(Math.floor(Math.random() * chars.length));
        }

        students.push({ 
            name, 
            email, 
            password,
            studentId: studentId || null,
            seatNumber: seatNumber || null,
            semester: semester || null,
            department: department || null
        });
    });

    return { students, errors };
};

/**
 * Parse question Excel for an exam session.
 * Same required columns as the global question upload.
 * Returns { questions, errors } where questions are plain objects (no DB insert).
 */
const parseSessionQuestionsExcel = (buffer) => {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });

    if (!rows.length) return { questions: [], errors: ['Empty file'] };

    const questions = [];
    const errors = [];

    rows.forEach((row, index) => {
        const rowNum = index + 2;
        const question = (row['QUESTION'] || '').trim();
        const optA = (row['OPTION A'] || '').trim();
        const optB = (row['OPTION B'] || '').trim();
        const optC = (row['OPTION C'] || '').trim();
        const optD = (row['OPTION D'] || '').trim();
        const answer = (row['ANSWER'] || '').trim().toUpperCase();
        const subject = (row['SUBJECT'] || '').trim();
        const difficulty = (row['DIFFICULTY'] || 'Medium').trim();
        const marks = parseFloat(row['MARKS']) || 1;

        const rowErrors = [];
        if (!question) rowErrors.push('QUESTION empty');
        if (!optA || !optB || !optC || !optD) rowErrors.push('Options incomplete');
        if (!['A', 'B', 'C', 'D'].includes(answer)) rowErrors.push(`ANSWER invalid: ${answer}`);
        if (!subject) rowErrors.push('SUBJECT empty');

        if (rowErrors.length) { errors.push({ row: rowNum, issues: rowErrors }); return; }

        questions.push({
            question,
            options: [optA, optB, optC, optD],
            correctAnswer: answer,
            subject,
            difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
            marks,
        });
    });

    return { questions, errors };
};

module.exports = { parseExcel, parseStudentExcel, parseSessionQuestionsExcel };
