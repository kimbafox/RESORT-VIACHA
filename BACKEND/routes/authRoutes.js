const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');
const database = require('../database');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DEFAULT_PROFILE_IMAGE = '/assets/logo.png';

const registerValidators = [
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido.').normalizeEmail(),
    body('password').isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres.')
];

const loginValidators = [
    body('email').isEmail().withMessage('Debe proporcionar un correo electrónico válido.').normalizeEmail(),
    body('password').notEmpty().withMessage('La contraseña es obligatoria.')
];

function handleValidation(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, message: 'Datos inválidos.', errors: errors.array() });
    }
    next();
}

// API Endpoint: Registro de usuarios
router.post('/register', registerValidators, handleValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const existingUser = await database.get('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'El usuario ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await database.run(
        'INSERT INTO users (email, password_hash, profile_image) VALUES (?, ?, ?)',
        [email, hashedPassword, DEFAULT_PROFILE_IMAGE]
    );
    const newUser = { id: result.id, email, profileImage: DEFAULT_PROFILE_IMAGE };

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(201).json({ success: true, message: 'Registro exitoso.', token, user: newUser });
    }));

// API Endpoint: Login de usuarios
router.post('/login', loginValidators, handleValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await database.get(
        'SELECT id, email, password_hash, profile_image FROM users WHERE email = ?',
        [email]
    );

    if (!user) {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({
        success: true,
        message: 'Inicio de sesión exitoso.',
        token,
        user: { id: user.id, email: user.email, profileImage: user.profile_image }
    });
        }));

// API Endpoint: Perfil protegido (requiere token JWT válido)
        router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
    const user = await database.get(
        'SELECT id, email, profile_image FROM users WHERE id = ?',
        [req.user.id]
    );
    if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    return res.json({
        success: true,
        user: { id: user.id, email: user.email, profileImage: user.profile_image }
    });
        }));

module.exports = router;
