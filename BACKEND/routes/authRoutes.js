const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { authMiddleware, JWT_SECRET } = require('../middleware/authMiddleware');

const router = express.Router();

// Base de datos temporal en memoria (Para la versión Beta)
const users = [];

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
router.post('/register', registerValidators, handleValidation, async (req, res) => {
    const { email, password } = req.body;

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'El usuario ya está registrado.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { id: users.length + 1, email, password: hashedPassword };
    users.push(newUser);

    const token = jwt.sign({ id: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ success: true, message: 'Registro exitoso.', token, user: { id: newUser.id, email: newUser.email } });
});

// API Endpoint: Login de usuarios
router.post('/login', loginValidators, handleValidation, async (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user) {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }

    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '2h' });
    return res.json({ success: true, message: 'Inicio de sesión exitoso.', token, user: { id: user.id, email: user.email } });
});

// API Endpoint: Perfil protegido (requiere token JWT válido)
router.get('/profile', authMiddleware, (req, res) => {
    const user = users.find(u => u.id === req.user.id);
    if (!user) {
        return res.status(404).json({ success: false, message: 'Usuario no encontrado.' });
    }
    return res.json({ success: true, user: { id: user.id, email: user.email } });
});

module.exports = router;
