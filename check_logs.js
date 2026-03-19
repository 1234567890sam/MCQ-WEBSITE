const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: 'd:/WEBSITE LINK/MCQ WEBSITE/backend/.env' });

const AuditLog = require('d:/WEBSITE LINK/MCQ WEBSITE/backend/models/AuditLog');

async function checkLogs() {
    try {
        console.log('Connecting to:', process.env.MONGO_URI);
        await mongoose.connect(process.env.MONGO_URI);
        const count = await AuditLog.countDocuments();
        const latest = await AuditLog.find().sort({ createdAt: -1 }).limit(5).populate('userId', 'name email');
        console.log('Total Logs:', count);
        console.log('Latest Logs:', JSON.stringify(latest, null, 2));
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

checkLogs();
