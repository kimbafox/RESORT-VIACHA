const express = require('express');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/authRoutes');
const reservationRoutes = require('./routes/reservationRoutes');
const { initializeDatabase } = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'FRONTEND')));

app.get('/health', (req, res) => res.json({ ok: true }));
app.use('/api', authRoutes);
app.use('/api', reservationRoutes);

const swaggerSpec = swaggerJsdoc({
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'Paradise Resort API',
            version: '1.0.0',
            description: 'API beta para registro, inicio de sesión y perfil de usuarios.'
        },
        servers: [{ url: `http://localhost:${PORT}`, description: 'Servidor local' }],
        components: {
            securitySchemes: {
                bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
            },
            schemas: {
                Credentials: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'usuario@ejemplo.com' },
                        password: { type: 'string', format: 'password', minLength: 6, example: 'secreto123' }
                    }
                },
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        email: { type: 'string', format: 'email' },
                        profileImage: { type: 'string', example: '/assets/logo.png' }
                    }
                }
            }
        },
        paths: {
            '/api/register': {
                post: {
                    summary: 'Crear una cuenta beta',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } }
                    },
                    responses: { 201: { description: 'Cuenta creada' }, 400: { description: 'Datos inválidos o correo duplicado' } }
                }
            },
            '/api/login': {
                post: {
                    summary: 'Iniciar sesión',
                    requestBody: {
                        required: true,
                        content: { 'application/json': { schema: { $ref: '#/components/schemas/Credentials' } } }
                    },
                    responses: { 200: { description: 'Sesión iniciada' }, 401: { description: 'Credenciales incorrectas' } }
                }
            },
            '/api/profile': {
                get: {
                    summary: 'Obtener el perfil autenticado',
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Perfil del usuario' }, 401: { description: 'Token requerido' } }
                }
            }
        }
    },
    apis: []
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { explorer: true }));

app.use('/api', (req, res) => res.status(404).json({ success: false, message: 'Ruta no encontrada.' }));

// Manejo de errores (los handlers async de Express 4 los envían aquí)
app.use((error, req, res, next) => {
    if (error.status && error.status < 500) {
        return res.status(error.status).json({ success: false, message: 'Solicitud inválida.' });
    }
    console.error(error);
    res.status(500).json({ success: false, message: 'Error interno del servidor.' });
});

initializeDatabase()
    .then(() => {
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((error) => {
        console.error('No se pudo inicializar la base de datos:', error);
        process.exit(1);
    });