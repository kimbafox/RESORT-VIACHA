

RESORT-VIACHA
El presente proyecto consiste en el diseño y desarrollo de una aplicación web para un resort ubicado en la ciudad de La Paz. El sistema incorpora mecanismos y extensiones de seguridad web para garantizar el manejo seguro de información, autenticación y transacciones. Trabajo para la materia de Tecnología Web por el grupo El Plan 3000 Remake.

## Backend (carpeta `BACKEND`)

El backend es un servidor hecho con **Node.js** y **Express**. Su trabajo es manejar el registro y login de usuarios.

Archivos principales:

- **`server.js`**: es el archivo principal. Enciende el servidor, prepara Express para leer JSON/formularios, sirve archivos estáticos y conecta las rutas de autenticación (`/api/register`, `/api/login`, `/api/profile`).
- **`routes/authRoutes.js`**: tiene la lógica de registrarse e iniciar sesión.
  - Valida que el email y la contraseña sean correctos usando `express-validator`.
  - Guarda la contraseña **encriptada** (nunca en texto plano) usando `bcryptjs`.
  - Cuando el login es correcto, genera un **token** con `jsonwebtoken` (como una "llave" que identifica al usuario).
- **`middleware/authMiddleware.js`**: revisa que el token enviado por el usuario sea válido antes de dejarlo entrar a rutas protegidas (como `/api/profile`).

En resumen, el backend funciona así:

1. El usuario envía email y contraseña.
2. Express-validator revisa que los datos estén bien escritos.
3. Bcryptjs encripta o compara la contraseña.
4. Si todo está correcto, jsonwebtoken crea un token que el usuario usará para futuras peticiones.

## Frontend: `index.html`

Es la página de inicio del sitio. Tiene tres partes:

1. **Pantalla de carga (`loaderScreen`)**: se muestra un momento mientras carga la página, luego desaparece.
2. **Navegación (`navbar`)**: enlaces para moverse entre las páginas (Inicio, Guía, Calendario, Precios, Mi Perfil).
3. **Formularios de Login/Registro**: hay dos pestañas ("Ingresar" y "Registrarse") que se muestran u ocultan con la función `switchTab()` en `js/main.js`.
4. **Galería de imágenes**: muestra fotos del resort (piscina, bar, instalaciones).

El archivo `js/main.js` es el que da vida a `index.html`:

- `switchTab()`: cambia entre el formulario de login y el de registro.
- `handleLogin()` y `handleRegister()`: por ahora solo muestran un mensaje de alerta (`alert()`). **Todavía no están conectados al backend**; para que funcionen de verdad, hay que hacer que envíen los datos con `fetch()` a `/api/login` y `/api/register`.

## Cómo probar el backend

```powershell
cd BACKEND
npm install
npm start
```

El servidor queda escuchando en `http://localhost:3000`.
