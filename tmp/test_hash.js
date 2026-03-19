const getStudentTestCode = (studentId, examId, examSeed) => {
    const sid = String(studentId);
    const eid = String(examId);
    const seed = String(examSeed || 'SMART');
    const str = `${sid}-${eid}-${seed}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash = hash | 0;
    }
    const code = Math.abs(hash % 900000) + 100000;
    return code.toString();
};

const id1 = "65f8a2b3c4d5e6f7a8b9c0d1";
const id2 = { toString: () => "65f8a2b3c4d5e6f7a8b9c0d1" }; // Mongoose-like
const examId = "65f8a321c4d5e6f7a8b9c0d2";
const seed = "123456";

console.log("String ID:", getStudentTestCode(id1, examId, seed));
console.log("Object ID:", getStudentTestCode(id2, examId, seed));
