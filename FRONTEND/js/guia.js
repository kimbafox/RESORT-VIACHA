(function () {
    const origin = [-16.5042006, -68.1311518];
    const destinations = {
        charquini: { name: 'Charquini', coordinates: [-16.2992778, -68.1011031] },
        tiwanaku: { name: 'Complejo Arqueológico de Tiwanaku', coordinates: [-16.5553030, -68.6735141] }
    };
    const dialog = document.getElementById('routeDialog');
    const title = document.getElementById('routeTitle');
    const status = document.getElementById('routeStatus');
    const tileStatus = document.getElementById('tileStatus');
    let map;
    let controller;
    let trigger;

    async function openRoute(key, button) {
        const destination = destinations[key];
        if (!destination) return;
        trigger = button;
        title.textContent = `Recorrido a ${destination.name}`;
        status.textContent = 'Consultando el recorrido por carretera...';
        tileStatus.textContent = '';
        dialog.showModal();
        document.getElementById('routeClose').focus();

        if (!window.L) {
            status.textContent = 'No se pudo cargar el mapa. Comprueba tu conexión e inténtalo de nuevo.';
            return;
        }

        map = L.map('routeMap', { zoomControl: false }).setView(origin, 11);
        L.control.zoom({ zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar' }).addTo(map);
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | Rutas: <a href="https://project-osrm.org/">OSRM</a>'
        }).on('tileerror', () => {
            tileStatus.textContent = 'No se pudieron cargar algunas partes del mapa. Comprueba tu conexión.';
        }).addTo(map);
        map.invalidateSize();

        controller = new AbortController();
        const request = controller;
        let timedOut = false;
        const timeout = setTimeout(() => {
            timedOut = true;
            request.abort();
        }, 15000);
        const points = [origin, destination.coordinates].map(([lat, lon]) => `${lon},${lat}`).join(';');

        try {
            const response = await fetch(`https://router.project-osrm.org/route/v1/driving/${points}?overview=full&geometries=geojson&steps=false`, {
                signal: request.signal
            });
            if (!response.ok) throw new Error('Error del servicio de rutas');
            const data = await response.json();
            const route = data.routes && data.routes[0];
            const endpoint = data.waypoints && data.waypoints[1];
            if (data.code !== 'Ok' || !route || !route.geometry || !endpoint || !Number.isFinite(endpoint.distance)) {
                throw new Error('Ruta no disponible');
            }
            if (!dialog.open || request !== controller) return;
            const line = L.geoJSON(route.geometry, {
                style: { color: '#146df5', weight: 5, opacity: 1 }
            }).addTo(map);
            map.fitBounds(line.getBounds(), { padding: [25, 25] });
            const distance = (route.distance / 1000).toLocaleString('es-BO', { maximumFractionDigits: 1 });
            const remaining = Math.round(endpoint.distance);
            status.textContent = `Ruta por carretera: ${distance} km.`
                + (remaining > 50
                    ? ` Termina en la vía más cercana, a aproximadamente ${remaining} m en línea recta del destino; el tramo restante no está trazado.`
                    : '');
        } catch (error) {
            if (!dialog.open || request !== controller) return;
            status.textContent = timedOut
                ? 'La consulta de la ruta tardó demasiado. Cierra el mapa e inténtalo de nuevo.'
                : 'No se pudo obtener la ruta. Cierra el mapa y vuelve a intentarlo.';
        } finally {
            clearTimeout(timeout);
        }
    }

    document.querySelectorAll('[data-destination]').forEach((button) => {
        button.addEventListener('click', () => openRoute(button.dataset.destination, button));
    });
    document.getElementById('routeClose').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            dialog.close();
        }
    });
    dialog.addEventListener('close', () => {
        if (controller) controller.abort();
        controller = null;
        if (map) map.remove();
        map = null;
        if (trigger) trigger.focus();
    });
})();
