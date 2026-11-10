const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// DB_PATH permite apuntar a un volumen persistente (p. ej. en Railway)
const databaseFile = process.env.DB_PATH || path.join(__dirname, 'data', 'resort.sqlite');
fs.mkdirSync(path.dirname(databaseFile), { recursive: true, mode: 0o700 });

// Solo el usuario que ejecuta la app puede leer/escribir la base (en Windows se ignora)
function restrictPermissions() {
    try {
        fs.chmodSync(path.dirname(databaseFile), 0o700);
        for (const suffix of ['', '-wal', '-shm']) {
            if (fs.existsSync(databaseFile + suffix)) fs.chmodSync(databaseFile + suffix, 0o600);
        }
    } catch (error) {
        console.warn('No se pudieron ajustar los permisos de la base de datos:', error.message);
    }
}

const database = new sqlite3.Database(databaseFile);

// Exclusión mutua: evita que dos peticiones simultáneas pasen la verificación
// de disponibilidad y ambas inserten (sobre-reserva). Un solo proceso, una sola conexión.
let queue = Promise.resolve();
function exclusive(task) {
    const result = queue.then(task, task);
    queue = result.catch(() => {});
    return result;
}

function close() {
    return new Promise((resolve) => database.close(() => resolve()));
}

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

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        database.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(rows);
        });
    });
}

async function initializeDatabase() {
    await run('PRAGMA foreign_keys = ON');   // hace cumplir reservations.user_id -> users.id
    await run('PRAGMA journal_mode = WAL');  // más robusto ante cortes y lecturas concurrentes
    await run('PRAGMA synchronous = NORMAL');
    await run('PRAGMA busy_timeout = 5000');
    await run('PRAGMA secure_delete = ON');  // sobrescribe con ceros los datos borrados

    await run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            password_hash TEXT NOT NULL,
            profile_image TEXT NOT NULL DEFAULT '/assets/logo.png',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
    `);

    const columns = (await all('PRAGMA table_info(users)')).map((column) => column.name);
    if (!columns.includes('name')) {
        await run("ALTER TABLE users ADD COLUMN name TEXT NOT NULL DEFAULT ''");
    }
    if (!columns.includes('description')) {
        await run("ALTER TABLE users ADD COLUMN description TEXT NOT NULL DEFAULT ''");
    }

    await run(`
        CREATE TABLE IF NOT EXISTS reservations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL REFERENCES users(id),
            room TEXT NOT NULL,
            check_in TEXT NOT NULL,
            check_out TEXT NOT NULL,
            guests INTEGER NOT NULL CHECK (guests BETWEEN 1 AND 6),
            nights INTEGER NOT NULL CHECK (nights BETWEEN 1 AND 30),
            total INTEGER NOT NULL CHECK (total >= 0),
            payment_method TEXT NOT NULL CHECK (payment_method IN ('tarjeta', 'qr', 'efectivo')),
            status TEXT NOT NULL DEFAULT 'confirmada' CHECK (status IN ('confirmada', 'cancelada')),
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CHECK (check_out > check_in)
        )
    `);

    await run('CREATE INDEX IF NOT EXISTS idx_reservations_user ON reservations(user_id)');
    await run('CREATE INDEX IF NOT EXISTS idx_reservations_room_status ON reservations(room, status, check_out)');

    restrictPermissions();
}

module.exports = { all, close, exclusive, get, initializeDatabase, run };
