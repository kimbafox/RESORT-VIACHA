const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Base de datos temporal en memoria (Para la versión Beta)
const users = [];

// API Endpoint: Registro de usuarios
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        return res.status(400).json({ success: false, message: 'El usuario ya está registrado.' });
    }

    const newUser = { email, password };
    users.push(newUser);
    return res.json({ success: true, message: 'Registro exitoso.', user: newUser });
});

// API Endpoint: Login de usuarios
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);

    if (user) {
        return res.json({ success: true, message: 'Inicio de sesión exitoso.', user });
    } else {
        return res.status(401).json({ success: false, message: 'Credenciales incorrectas.' });
    }
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});