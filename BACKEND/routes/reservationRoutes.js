const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const database = require('../database');
const { MAX_GUESTS, MAX_NIGHTS, PAYMENT_METHODS, ROOMS } = require('../catalog');

const router = express.Router();

const DAY = 86400000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

function parseDay(value) {
    if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return null;
    const time = Date.parse(`${value}T00:00:00Z`);
    if (Number.isNaN(time) || new Date(time).toISOString().slice(0, 10) !== value) return null;
    return time;
}

const formatDay = (time) => new Date(time).toISOString().slice(0, 10);

// Se tolera un día de diferencia por la zona horaria del servidor
function earliestAllowedDay() {
    const now = new Date();
    return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - DAY;
}

async function occupancyByDay(room) {
    const rows = await database.all(
        "SELECT check_in, check_out FROM reservations WHERE room = ? AND status = 'confirmada' AND check_out > ?",
        [room, formatDay(earliestAllowedDay())]
    );
    const counts = {};
    for (const row of rows) {
        for (let time = parseDay(row.check_in); time < parseDay(row.check_out); time += DAY) {
            const key = formatDay(time);
            counts[key] = (counts[key] || 0) + 1;
        }
    }
    return counts;
}

function formatReservation(row) {
    return {
        id: row.id,
        code: `PR-${String(row.id).padStart(5, '0')}`,
        room: row.room,
        roomName: ROOMS[row.room] ? ROOMS[row.room].name : row.room,
        checkIn: row.check_in,
        checkOut: row.check_out,
        guests: row.guests,
        nights: row.nights,
        total: row.total,
        paymentMethod: row.payment_method,
        status: row.status,
        createdAt: row.created_at
    };
}

// Fechas sin disponibilidad para una habitación (público)
router.get('/availability/:room', asyncHandler(async (req, res) => {
    const room = ROOMS[req.params.room];
    if (!room) {
        return res.status(404).json({ success: false, message: 'Habitación no encontrada.' });
    }
    const counts = await occupancyByDay(req.params.room);
    const fullDates = Object.keys(counts).filter((day) => counts[day] >= room.stock).sort();
    return res.json({ success: true, fullDates });
}));

router.get('/reservations', authMiddleware, asyncHandler(async (req, res) => {
    const rows = await database.all(
        'SELECT * FROM reservations WHERE user_id = ? ORDER BY id DESC',
        [req.user.id]
    );
    return res.json({ success: true, reservations: rows.map(formatReservation) });
}));

router.post('/reservations', authMiddleware, asyncHandler(async (req, res) => {
    const { room: roomKey, checkIn, checkOut, paymentMethod } = req.body;
    const guests = Number(req.body.guests);
    const room = ROOMS[roomKey];

    if (!room) {
        return res.status(400).json({ success: false, message: 'Selecciona una habitación válida.' });
    }
    const start = parseDay(checkIn);
    const end = parseDay(checkOut);
    if (start === null || end === null) {
        return res.status(400).json({ success: false, message: 'Las fechas no son válidas.' });
    }
    if (start < earliestAllowedDay()) {
        return res.status(400).json({ success: false, message: 'No puedes reservar fechas pasadas.' });
    }
    const nights = Math.round((end - start) / DAY);
    if (nights < 1 || nights > MAX_NIGHTS) {
        return res.status(400).json({ success: false, message: `La estadía debe ser de 1 a ${MAX_NIGHTS} noches.` });
    }
    if (!Number.isInteger(guests) || guests < 1 || guests > MAX_GUESTS) {
        return res.status(400).json({ success: false, message: `Los huéspedes deben ser entre 1 y ${MAX_GUESTS}.` });
    }
    if (!PAYMENT_METHODS.includes(paymentMethod)) {
        return res.status(400).json({ success: false, message: 'Elige un método de pago válido.' });
    }

    // Verificar disponibilidad e insertar debe ser atómico: si no, dos peticiones
    // simultáneas pueden reservar la misma última unidad (sobre-reserva).
    const total = nights * room.price;
    const row = await database.exclusive(async () => {
        const counts = await occupancyByDay(roomKey);
        for (let time = start; time < end; time += DAY) {
            if ((counts[formatDay(time)] || 0) >= room.stock) return null;
        }
        const result = await database.run(
            `INSERT INTO reservations (user_id, room, check_in, check_out, guests, nights, total, payment_method)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [req.user.id, roomKey, checkIn, checkOut, guests, nights, total, paymentMethod]
        );
        return database.get('SELECT * FROM reservations WHERE id = ?', [result.id]);
    });

    if (!row) {
        return res.status(409).json({ success: false, message: 'Esas fechas ya no están disponibles. Elige otras.' });
    }
    return res.status(201).json({ success: true, message: 'Reserva confirmada.', reservation: formatReservation(row) });
}));

router.delete('/reservations/:id', authMiddleware, asyncHandler(async (req, res) => {
    const result = await database.run(
        "UPDATE reservations SET status = 'cancelada' WHERE id = ? AND user_id = ? AND status = 'confirmada'",
        [req.params.id, req.user.id]
    );
    if (!result.changes) {
        return res.status(404).json({ success: false, message: 'Reserva no encontrada.' });
    }
    return res.json({ success: true, message: 'Reserva cancelada.' });
}));

module.exports = router;
