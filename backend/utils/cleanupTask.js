const Attempt = require('../models/Attempt');

/**
 * Automatically soft-deletes old results to keep the database lean.
 * - Practice results: Soft-delete after 15 days.
 * - Test results: Soft-delete after 20 days.
 */
const runCleanupLogic = async () => {
    try {
        console.log('[Cleanup Task] Starting automatic cleanup...');
        
        const now = new Date();
        const practiceThreshold = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000);
        const testThreshold = new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000);

        // Soft-delete practice modes
        const practiceResult = await Attempt.updateMany(
            { 
                mode: 'practice', 
                isDeleted: false, 
                createdAt: { $lt: practiceThreshold } 
            },
            { 
                $set: { isDeleted: true, deletedAt: new Date() } 
            }
        );

        // Soft-delete test modes
        const testResult = await Attempt.updateMany(
            { 
                mode: 'test', 
                isDeleted: false, 
                createdAt: { $lt: testThreshold } 
            },
            { 
                $set: { isDeleted: true, deletedAt: new Date() } 
            }
        );

        console.log(`[Cleanup Task] Finished. Soft-deleted: ${practiceResult.modifiedCount} practice results, ${testResult.modifiedCount} test results.`);
    } catch (error) {
        console.error('[Cleanup Task] Error during cleanup:', error);
    }
};

/**
 * Initializes the cleanup task to run every 24 hours.
 */
const initCleanupTask = () => {
    // Run immediately on startup
    runCleanupLogic();

    // Then run every 24 hours (86,400,000 ms)
    setInterval(runCleanupLogic, 24 * 60 * 60 * 1000);
};

module.exports = { initCleanupTask };
