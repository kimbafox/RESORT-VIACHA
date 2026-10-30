(function () {
    const ROOMS = {
        estandar: { name: 'Suite Estándar', price: 120 },
        deluxe: { name: 'Suite Deluxe', price: 250 },
        presidencial: { name: 'Suite Presidencial', price: 450 }
    };
    const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const DAY = 86400000;

    const $ = (id) => document.getElementById(id);
    const modal = $('resModal');
    const days = $('resDays');
    const confirmBtn = $('resConfirm');
    const message = $('resMessage');

    const pad = (n) => String(n).padStart(2, '0');
    const fmt = (year, month, day) => `${year}-${pad(month + 1)}-${pad(day)}`;
    const toTime = (value) => Date.parse(`${value}T00:00:00Z`);
    const prettyDate = (value) => {
        const [y, m, d] = value.split('-').map(Number);
        return `${d} de ${MONTHS[m - 1]} de ${y}`;
    };

    const now = new Date();
    const today = fmt(now.getFullYear(), now.getMonth(), now.getDate());

    let roomKey = null;
    let fullDates = new Set();
    let view = new Date(now.getFullYear(), now.getMonth(), 1);
    let start = null;
    let end = null;

    function hasFullNight(from, to) {
        for (let t = toTime(from); t < toTime(to); t += DAY) {
            if (fullDates.has(new Date(t).toISOString().slice(0, 10))) return true;
        }
        return false;
    }

    function updateSummary() {
        const room = ROOMS[roomKey];
        $('resIn').textContent = start ? prettyDate(start) : '—';
        $('resOut').textContent = end ? prettyDate(end) : '—';
        const nights = start && end ? Math.round((toTime(end) - toTime(start)) / DAY) : 0;
        $('resNights').textContent = nights || '—';
        $('resTotal').textContent = `Bs ${nights * room.price}`;
        confirmBtn.disabled = !nights;
        $('resHint').textContent = !start
            ? 'Selecciona tu fecha de entrada.'
            : !end ? 'Ahora selecciona tu fecha de salida.' : 'Revisa los datos y confirma tu reserva.';
    }

    function selectDay(value) {
        message.textContent = '';
        if (!start || end || value <= start) {
            start = value;
            end = null;
        } else if (hasFullNight(start, value)) {
            message.textContent = 'Hay noches sin disponibilidad en ese rango. Elige otras fechas.';
            start = value;
            end = null;
        } else {
            end = value;
        }
        render();
    }

    function render() {
        const year = view.getFullYear();
        const month = view.getMonth();
        $('resMonth').textContent = MONTHS[month];
        $('resYear').textContent = year;
        days.innerHTML = '';

        const firstIndex = new Date(year, month, 1).getDay();
        const total = new Date(year, month + 1, 0).getDate();

        for (let i = 0; i < firstIndex; i++) {
            const blank = document.createElement('span');
            days.appendChild(blank);
        }

        for (let day = 1; day <= total; day++) {
            const value = fmt(year, month, day);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'day-cell';
            button.textContent = day;

            const isFull = fullDates.has(value);
            const canBeCheckout = start && !end && value > start;
            const disabled = value < today || (isFull && !canBeCheckout);
            if (isFull) button.classList.add('full');
            if (value === today) button.classList.add('today');
            if (value === start || value === end) button.classList.add('selected');
            if (start && end && value > start && value < end) button.classList.add('in-range');

            if (disabled) {
                button.disabled = true;
            } else {
                button.addEventListener('click', () => selectDay(value));
            }
            days.appendChild(button);
        }
        updateSummary();
    }

    async function openModal(key) {
        if (!window.resortAuth.user()) {
            window.location.href = 'login.html?next=precios.html#login';
            return;
        }
        roomKey = key;
        start = null;
        end = null;
        fullDates = new Set();
        view = new Date(now.getFullYear(), now.getMonth(), 1);
        message.textContent = '';
        $('resTitle').textContent = `Reservar ${ROOMS[key].name}`;
        $('resForm').hidden = false;
        $('resDone').hidden = true;
        modal.hidden = false;
        render();

        try {
            const data = await window.resortAuth.api(`/availability/${key}`);
            fullDates = new Set(data.fullDates);
            render();
        } catch (error) {
            message.textContent = 'No se pudo cargar la disponibilidad.';
        }
    }

    function closeModal() {
        modal.hidden = true;
    }

    async function confirm() {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Procesando pago...';
        message.textContent = '';
        try {
            const data = await window.resortAuth.api('/reservations', {
                method: 'POST',
                body: JSON.stringify({
                    room: roomKey,
                    checkIn: start,
                    checkOut: end,
                    guests: Number($('resGuests').value),
                    paymentMethod: $('resPayment').value
                })
            });
            const r = data.reservation;
            $('resCode').textContent = r.code;
            $('resDoneInfo').textContent = `${r.roomName} · ${prettyDate(r.checkIn)} al ${prettyDate(r.checkOut)} · ${r.nights} noche(s) · Bs ${r.total}`;
            $('resForm').hidden = true;
            $('resDone').hidden = false;
        } catch (error) {
            if (error.status === 401 || error.status === 403) {
                window.location.href = 'login.html?next=precios.html#login';
                return;
            }
            message.textContent = error.message;
            if (error.status === 409) {
                try {
                    const data = await window.resortAuth.api(`/availability/${roomKey}`);
                    fullDates = new Set(data.fullDates);
                    start = null;
                    end = null;
                    render();
                } catch (ignored) { /* se mantiene el mensaje */ }
            }
        } finally {
            confirmBtn.textContent = 'Confirmar reserva';
            updateSummary();
        }
    }

    document.querySelectorAll('[data-room]').forEach((button) => {
        button.addEventListener('click', () => openModal(button.dataset.room));
    });
    $('resClose').addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeModal(); });
    $('resPrev').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() - 1, 1); render(); });
    $('resNext').addEventListener('click', () => { view = new Date(view.getFullYear(), view.getMonth() + 1, 1); render(); });
    confirmBtn.addEventListener('click', confirm);
})();
