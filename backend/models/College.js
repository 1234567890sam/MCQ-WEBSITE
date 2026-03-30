const mongoose = require('mongoose');

const collegeSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, 'College name is required'],
            trim: true,
            maxlength: 100,
        },
        code: {
            type: String,
            required: [true, 'College code is required'],
            unique: true,
            uppercase: true,
            trim: true,
            maxlength: 20,
        },
        email: {
            type: String,
            trim: true,
            lowercase: true,
        },
        phone: {
            type: String,
            trim: true,
        },
        address: {
            type: String,
            trim: true,
        },
        logo: {
            type: String,
            default: '',
        },
        // SaaS feature flags — controlled by SaaS Admin
        features: {
            practiceMode: { type: Boolean, default: true },
            uploadPermission: { type: Boolean, default: true },
            maxStudents: { type: Number, default: 500 },
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        // Academic Departments
        departments: {
            type: [String],
            default: ['Computer Engineering']
        },
        // Soft delete
        isDeleted: { type: Boolean, default: false },
        deletedAt: { type: Date, default: null },
    },
    { timestamps: true }
);

module.exports = mongoose.model('College', collegeSchema);
