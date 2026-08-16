require("dotenv").config();

module.exports = {
    mongodb: {
        url: process.env.MONGO_URI,
        databaseName: "backend-ledger"
    },

    migrationsDir: "migrations",
    changelogCollectionName: "changelog",
    lockCollectionName: "changelog_lock",
    lockTtl: 0,
    migrationFileExtension: ".js",
    useFileHash: false,
    moduleSystem: "commonjs"
};