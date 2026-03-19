/**
 * SaaS Admin Bootstrap Seeder
 * Run once: node seeders/saasAdmin.js
 * Creates: 1 SaaS Admin user + 1 default college (for migrating existing data)
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const College = require('../models/College');

async function seed() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // 1. Create default college (for existing data)
    let defaultCollege = await College.findOne({ code: 'DEFAULT' });
    if (!defaultCollege) {
        defaultCollege = await College.create({
            name: 'Default College',
            code: 'DEFAULT',
            email: 'admin@smartmcq.com',
            features: { practiceMode: true, uploadPermission: true, maxStudents: 9999 },
        });
        console.log('🏫 Default college created:', defaultCollege._id);
    } else {
        console.log('🏫 Default college already exists:', defaultCollege._id);
    }

    // 2. Migrate existing users without collegeId
    const migrated = await User.updateMany(
        { collegeId: null, role: { $ne: 'saas-admin' } },
        { $set: { collegeId: defaultCollege._id } }
    );
    console.log(`👥 Migrated ${migrated.modifiedCount} existing users to default college`);

    // 3. Migrate existing exams without collegeId
    const ExamSession = require('../models/ExamSession');
    const Question = require('../models/Question');
    const Attempt = require('../models/Attempt');

    const examMigrated = await ExamSession.updateMany({ collegeId: null }, { $set: { collegeId: defaultCollege._id, createdByRole: 'college-admin' } });
    const qMigrated = await Question.updateMany({ collegeId: null }, { $set: { collegeId: defaultCollege._id } });
    const aMigrated = await Attempt.updateMany({ collegeId: null }, { $set: { collegeId: defaultCollege._id } });

    console.log(`📝 Migrated ${examMigrated.modifiedCount} exams, ${qMigrated.modifiedCount} questions, ${aMigrated.modifiedCount} attempts`);

    // 4. Migrate 'admin' role → 'college-admin', 'exam-student' → 'student'
    await User.updateMany({ role: 'admin' }, { $set: { role: 'college-admin' } });
    await User.updateMany({ role: 'exam-student' }, { $set: { role: 'student' } });
    console.log('🔄 Migrated old roles to new role system');

    // 5. Create SaaS Admin
    const saasEmail = process.env.SAAS_ADMIN_EMAIL || 'saas@smartmcq.com';
    const saasPass = process.env.SAAS_ADMIN_PASSWORD || 'SaaS@Admin123';

    let saasAdmin = await User.findOne({ email: saasEmail });
    if (!saasAdmin) {
        saasAdmin = await User.create({
            name: 'SaaS Administrator',
            email: saasEmail,
            password: saasPass,
            role: 'saas-admin',
            collegeId: null,
        });
        console.log(`👑 SaaS Admin created: ${saasEmail} / ${saasPass}`);
    } else {
        console.log(`👑 SaaS Admin already exists: ${saasEmail}`);
    }

    console.log('\n✅ Seeding complete!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   SaaS Admin Email:    ${saasEmail}`);
    console.log(`   SaaS Admin Password: ${saasPass}`);
    console.log(`   Default College ID:  ${defaultCollege._id}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    process.exit(0);
}

seed().catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exit(1);
});
