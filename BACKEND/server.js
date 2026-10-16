const express = require('express');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const authRoutes = require('./routes/authRoutes');
const { initializeDatabase } = require('./database');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware para procesar JSON y datos de formularios
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, '..', 'FRONTEND')));

// Rutas de autenticación (registro, login, perfil)
app.use('/api', authRoutes);

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

initializeDatabase()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
            console.log(`Documentación Swagger disponible en http://localhost:${PORT}/api-docs`);
        });
    })
    .catch((error) => {
        console.error('No se pudo inicializar la base de datos:', error);
        process.exit(1);
    });