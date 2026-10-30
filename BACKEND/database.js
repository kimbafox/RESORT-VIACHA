const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// DB_PATH permite apuntar a un volumen persistente (p. ej. en Railway)
const databaseFile = process.env.DB_PATH || path.join(__dirname, 'data', 'resort.sqlite');
fs.mkdirSync(path.dirname(databaseFile), { recursive: true });

const database = new sqlite3.Database(databaseFile);

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        database.run(sql, params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }

            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        database.get(sql, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(row);
        });
    });
}

async function initializeDatabase() {
    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            profile_image TEXT NOT NULL DEFAULT '/assets/logo.png',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

module.exports = { get, initializeDatabase, run };
