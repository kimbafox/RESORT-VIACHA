const jwt = require('jsonwebtoken');

const DEV_SECRET = 'dev_secret_change_me';
const JWT_SECRET = process.env.JWT_SECRET || DEV_SECRET;

// En producción (p. ej. dentro de Docker) no se arranca con un secreto ausente, el de
// desarrollo o uno corto: quien conozca ese valor podría fabricar tokens de cualquier usuario.
if (process.env.NODE_ENV === 'production' && (JWT_SECRET === DEV_SECRET || JWT_SECRET.length < 32)) {
    console.error('JWT_SECRET debe definirse con al menos 32 caracteres cuando NODE_ENV=production.');
    process.exit(1);
}

const JWT_OPTIONS = { algorithms: ['HS256'] };

// Verifica el token JWT enviado en el header Authorization: Bearer <token>
function authMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Token de acceso requerido.' });
    }

    jwt.verify(token, JWT_SECRET, JWT_OPTIONS, (err, decoded) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Token inválido o expirado.' });
        }
        req.user = decoded;
        next();
    });
}

module.exports = { authMiddleware, JWT_SECRET };
