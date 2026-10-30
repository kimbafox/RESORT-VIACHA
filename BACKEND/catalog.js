// Habitaciones disponibles: precio por noche (Bs) y cantidad de unidades
const ROOMS = {
    estandar: { name: 'Suite Estándar', price: 120, stock: 3 },
    deluxe: { name: 'Suite Deluxe', price: 250, stock: 3 },
    presidencial: { name: 'Suite Presidencial', price: 450, stock: 2 }
};

const PAYMENT_METHODS = ['tarjeta', 'qr', 'efectivo'];
const MAX_GUESTS = 6;
const MAX_NIGHTS = 30;

module.exports = { MAX_GUESTS, MAX_NIGHTS, PAYMENT_METHODS, ROOMS };
