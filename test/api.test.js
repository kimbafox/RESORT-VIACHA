const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

test('registro concurrente y validación de reservas', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'resort-test-'));
    const socket = net.createServer();
    await new Promise((resolve) => socket.listen(0, '127.0.0.1', resolve));
    const port = socket.address().port;
    await new Promise((resolve, reject) => socket.close((error) => error ? reject(error) : resolve()));

    const server = spawn(process.execPath, [path.join(__dirname, '..', 'BACKEND', 'server.js')], {
        env: { ...process.env, PORT: String(port), DB_PATH: path.join(directory, 'test.sqlite'), NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';
    server.stdout.on('data', (data) => { output += data; });
    server.stderr.on('data', (data) => { output += data; });
    t.after(async () => {
        if (server.exitCode === null) {
            server.kill();
            await new Promise((resolve) => server.once('exit', resolve));
        }
        fs.rmSync(directory, { recursive: true, force: true });
    });

    const base = `http://127.0.0.1:${port}`;
    for (let attempt = 0; ; attempt++) {
        try {
            await fetch(`${base}/health`);
            break;
        } catch (error) {
            if (server.exitCode !== null || attempt >= 100) {
                throw new Error(`El servidor de prueba no arrancó: ${output}`, { cause: error });
            }
            await new Promise((resolve) => setTimeout(resolve, 50));
        }
    }

    async function request(url, method = 'GET', body, token) {
        const response = await fetch(`${base}/api${url}`, {
            method,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
            ...(body ? { body: JSON.stringify(body) } : {})
        });
        return { status: response.status, data: await response.json() };
    }

    const credentials = { email: 'test@example.com', password: 'testing123' };
    const registrations = await Promise.all(Array.from({ length: 4 }, () => request('/register', 'POST', credentials)));
    assert.deepEqual(registrations.map((result) => result.status).sort(), [201, 400, 400, 400]);
    const token = registrations.find((result) => result.status === 201).data.token;

    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    const today = Date.parse(`${values.year}-${values.month}-${values.day}T00:00:00Z`);
    const date = (offset) => new Date(today + offset * 86400000).toISOString().slice(0, 10);
    const booking = { room: 'estandar', checkIn: date(1), checkOut: date(3), guests: 2, paymentMethod: 'efectivo' };

    assert.equal((await request('/reservations', 'POST', { ...booking, checkIn: date(-1), checkOut: date(0) }, token)).status, 400);
    assert.equal((await request('/reservations', 'POST', { ...booking, room: '__proto__' }, token)).status, 400);
    assert.equal((await request('/availability/__proto__')).status, 404);
    const reservations = await Promise.all(Array.from({ length: 4 }, () => request('/reservations', 'POST', booking, token)));
    assert.deepEqual(reservations.map((result) => result.status).sort(), [201, 201, 201, 409]);
});
