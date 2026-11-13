const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');
const database = require('../database');

const router = express.Router();

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

const DEFAULT_PROFILE_IMAGE = '/assets/logo.png';
const ALLOWED_AVATARS = [
    '/assets/logo.png', '/assets/piscina.jpg', '/assets/bar.jpg',
    '/assets/viaje1.jpg', '/assets/viaje2.jpg', '/assets/demo1.jpg'
];
const UPLOADED_AVATAR_PATTERN = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const MAX_AVATAR_LENGTH = 400000;

function formatUser(row) {
    return {
        id: row.id,
        email: row.email,
        name: row.name || '',
        description: row.description || '',
        profileImage: row.profile_image,
        createdAt: row.created_at
    };
}

function isValidAvatar(value) {
    if (typeof value !== 'string') return false;
    if (ALLOWED_AVATARS.includes(value)) return true;
    return value.length <= MAX_AVATAR_LENGTH && UPLOADED_AVATAR_PATTERN.test(value);
}

const USER_COLUMNS = 'id, email, name, description, profile_image, created_at';

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
    let result;
    try {
        result = await database.run(
            'INSERT INTO users (email, password_hash, profile_image) VALUES (?, ?, ?)',
            [email, hashedPassword, DEFAULT_PROFILE_IMAGE]
        );
    } catch (error) {
        if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('users.email')) {
            return res.status(400).json({ success: false, message: 'El usuario ya está registrado.' });
        }
        throw error;
    }
    const newUser = formatUser(await database.get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [result.id]));

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '2h' });
    return res.status(201).json({ success: true, message: 'Registro exitoso.', token, user: newUser });
}));

// API Endpoint: Login de usuarios
router.post('/login', loginValidators, handleValidation, asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await database.get(
        `SELECT ${USER_COLUMNS}, password_hash FROM users WHERE email = ?`,
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
        user: formatUser(user)
    });
}));

// API Endpoint: Perfil protegido (requiere token JWT válido)
router.get('/profile', authMiddleware, asyncHandler(async (req, res) => {
    const user = await database.get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [req.user.id]);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    return res.json({ success: true, user: formatUser(user) });
}));

const profileValidators = [
    body('name').optional().isString().trim().isLength({ max: 60 }).withMessage('El nombre no puede superar 60 caracteres.'),
    body('description').optional().isString().trim().isLength({ max: 300 }).withMessage('La descripción no puede superar 300 caracteres.'),
    body('profileImage').optional().custom((value) => {
        if (!isValidAvatar(value)) throw new Error('La foto de perfil no es válida o es demasiado grande.');
        return true;
    })
];

// API Endpoint: Editar perfil (nombre, descripción y foto)
router.put('/profile', authMiddleware, profileValidators, handleValidation, asyncHandler(async (req, res) => {
    const current = await database.get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [req.user.id]);
    if (!current) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }

    const name = req.body.name !== undefined ? req.body.name : current.name;
    const description = req.body.description !== undefined ? req.body.description : current.description;
    const profileImage = req.body.profileImage !== undefined ? req.body.profileImage : current.profile_image;

    await database.run(
        'UPDATE users SET name = ?, description = ?, profile_image = ? WHERE id = ?',
        [name, description, profileImage, req.user.id]
    );
    const updated = await database.get(`SELECT ${USER_COLUMNS} FROM users WHERE id = ?`, [req.user.id]);
    return res.json({ success: true, message: 'Perfil actualizado.', user: formatUser(updated) });
}));

module.exports = router;
