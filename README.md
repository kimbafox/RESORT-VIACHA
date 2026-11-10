

RESORT-VIACHA
El presente proyecto consiste en el diseño y desarrollo de una aplicación web para un resort ubicado en la ciudad de La Paz. El sistema incorpora mecanismos y extensiones de seguridad web para garantizar el manejo seguro de información, autenticación y transacciones. Trabajo para la materia de Tecnología Web por el grupo El Plan 3000 Remake.

## Backend (carpeta `BACKEND`)

El backend es un servidor hecho con **Node.js** y **Express**. Su trabajo es manejar el registro y login de usuarios.

Archivos principales:

- **`server.js`**: es el archivo principal. Enciende el servidor, prepara Express para leer JSON/formularios, sirve el frontend y conecta las rutas de autenticación (`/api/register`, `/api/login`, `/api/profile`). También publica Swagger en `http://localhost:3000/api-docs`.
- **`database.js`**: inicializa automáticamente una base SQLite en `BACKEND/data/resort.sqlite` y crea la tabla `users` si todavía no existe.
- **`routes/authRoutes.js`**: tiene la lógica de registrarse e iniciar sesión.
  - Valida que el email y la contraseña sean correctos usando `express-validator`.
  - Guarda la contraseña **encriptada** (nunca en texto plano) usando `bcryptjs` y conserva el usuario en SQLite.
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
- El acceso usa un componente de React cargado por CDN, conectado mediante `fetch()` con `/api/login` y `/api/register`. Incluye un modal de bienvenida beta y asigna el logo del Resort como foto de perfil predeterminada al crear la cuenta.

## Cómo probar el backend

```powershell
cd BACKEND
npm install
npm start
```

El servidor queda escuchando en `http://localhost:3000`.

## Ejecución con Docker

Requisitos: Docker Desktop (o Docker Engine + Compose).

```bash
# 1) Crear el archivo de configuración y generar el secreto de los tokens
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # pega el resultado en JWT_SECRET=

# 2) Construir y levantar
docker compose up -d --build

# 3) Verificar
docker compose ps          # debe aparecer "healthy"
docker compose logs -f web
```

El sitio queda en `http://localhost:3000` y Swagger en `http://localhost:3000/api-docs`.
Para detenerlo: `docker compose down` (la base de datos se conserva). Para borrar también los datos: `docker compose down -v`.

### Seguridad de la base de datos

- La base SQLite vive en el volumen `resort_data` (`/data`), fuera del código y de la imagen; con permisos `700` (carpeta) y `600` (archivos).
- El contenedor corre sin root, con sistema de archivos de solo lectura, sin capacidades extra de Linux y con límites de memoria y procesos.
- `PRAGMA foreign_keys`, restricciones `CHECK` e índices en `reservations`; `secure_delete` y modo WAL activados.
- La verificación de disponibilidad y el `INSERT` de una reserva son atómicos (evita sobre-reservas con peticiones simultáneas).
- Con `NODE_ENV=production` la app no arranca si `JWT_SECRET` falta o tiene menos de 32 caracteres.
- El archivo `.env` y los `*.sqlite` están en `.gitignore` y `.dockerignore`: no se suben a Git ni entran en la imagen.

### Respaldo de la base de datos

```bash
docker compose exec web node -e "const s=require('sqlite3');const d=new s.Database('/data/resort.sqlite');d.run(\"VACUUM INTO '/data/backup.sqlite'\",e=>{console.log(e||'respaldo ok');d.close()})"
docker cp resort-viacha:/data/backup.sqlite ./backup.sqlite
docker compose exec web rm /data/backup.sqlite
```

