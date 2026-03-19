/**
 * Deterministically generates a 6-digit test code for a specific student and exam.
 * This ensures every student has a unique code without extra DB storage.
 */
const getStudentTestCode = (studentId, examId, examSeed) => {
    if (!studentId || !examId) return '000000';
    
    // Force everything to string to avoid ObjectID vs String mismatches
    const sid = String(studentId);
    const eid = String(examId);
    const seed = String(examSeed || 'SMART');
    
    const str = `${sid}-${eid}-${seed}`;
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash | 0; // Convert to 32bit integer
    }
    
    // Convert to a 6-digit numeric string (100000 - 999999)
    const code = Math.abs(hash % 900000) + 100000;
    const finalCode = code.toString();
    
    // Log only in dev to help with user's specific "invalid" report
    if (process.env.NODE_ENV !== 'production') {
        process.stdout.write(`[GEN_CODE] Str: ${str} => Code: ${finalCode}\n`);
    }

    return finalCode;
};

module.exports = { getStudentTestCode };
