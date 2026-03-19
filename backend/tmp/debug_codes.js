const mongoose = require('mongoose');
require('dotenv').config();

const checkStatus = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const ExamSession = require('../models/ExamSession');
        const User = require('../models/User');

        const exams = await ExamSession.find({ isDeleted: false }).sort('-createdAt').limit(2);
        for (const exam of exams) {
            console.log(`\nExam: ${exam.title} (${exam._id})`);
            console.log(`Seed (testCode field): "${exam.testCode}"`);
            
            // Simulation
            const sampleStudents = await User.find({ collegeId: exam.collegeId, role: 'student', isDeleted: false }).limit(2);
            for (const s of sampleStudents) {
                const sCode = getStudentTestCode(s._id, exam._id, exam.testCode);
                console.log(`  Student: ${s.name} (${s._id}) => Expected Code: ${sCode}`);
            }
        }
        process.exit();
    } catch (e) { console.error(e); process.exit(1); }
};

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
    return (Math.abs(hash % 900000) + 100000).toString();
};

checkStatus();
