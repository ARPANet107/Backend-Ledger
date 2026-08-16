module.exports = {
    async up(db) {
        await db.collection("users").updateMany(
            { systemUser: { $exists: false } },
            { $set: { systemUser: false } }
        );
    },

    async down(db) {
        await db.collection("users").updateMany(
            { systemUser: false },
            { $unset: { systemUser: "" } }
        );
    }
};