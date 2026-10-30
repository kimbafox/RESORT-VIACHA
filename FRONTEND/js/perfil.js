(function () {
    const auth = window.resortAuth;
    const $ = (id) => document.getElementById(id);
    const PRESETS = [
        ['/assets/logo.png', 'Logo'],
        ['/assets/piscina.jpg', 'Piscina'],
        ['/assets/bar.jpg', 'Bar'],
        ['/assets/viaje1.jpg', 'Viaje 1'],
        ['/assets/viaje2.jpg', 'Viaje 2'],
        ['/assets/demo1.jpg', 'Resort']
    ];
    const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const PAYMENTS = { tarjeta: 'Tarjeta', qr: 'QR / Transferencia', efectivo: 'Efectivo al llegar' };

    let selectedImage = null;
    const message = $('profileMessage');

    function pretty(value) {
        const [y, m, d] = value.slice(0, 10).split('-').map(Number);
        return `${d} ${MONTHS[m - 1]} ${y}`;
    }

    function showUser(user) {
        $('displayName').textContent = user.name || 'Huésped de Paradise Resort';
        $('displayEmail').textContent = user.email;
        $('displaySince').textContent = user.createdAt ? `Miembro desde ${pretty(user.createdAt)}` : '';
        $('displayDesc').textContent = user.description || 'Aún no has agregado una descripción. ¡Cuéntanos algo sobre ti!';
        $('profileImage').src = user.profileImage || '/assets/logo.png';
    }

    function renderOptions() {
        const box = $('avatarOptions');
        box.innerHTML = '';
        PRESETS.forEach(([src, label]) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'avatar-option';
            button.title = label;
            button.classList.toggle('active', selectedImage === src);
            const img = document.createElement('img');
            img.src = src;
            img.alt = label;
            button.appendChild(img);
            button.addEventListener('click', () => selectImage(src));
            box.appendChild(button);
        });
    }

    function selectImage(src) {
        selectedImage = src;
        $('profileImage').src = src;
        renderOptions();
    }

    // Reduce la foto a 256x256 para que sea liviana
    function resizeImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('No se pudo leer la imagen.'));
            reader.onload = () => {
                const img = new Image();
                img.onerror = () => reject(new Error('El archivo no es una imagen válida.'));
                img.onload = () => {
                    const size = 256;
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const side = Math.min(img.width, img.height);
                    canvas.getContext('2d').drawImage(
                        img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size
                    );
                    resolve(canvas.toDataURL('image/jpeg', 0.85));
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
        });
    }

    function renderReservations(list) {
        const box = $('reservationList');
        box.innerHTML = '';
        if (!list.length) {
            const empty = document.createElement('p');
            empty.className = 'muted-text';
            empty.textContent = 'Todavía no tienes reservas.';
            box.appendChild(empty);
            return;
        }
        list.forEach((r) => {
            const item = document.createElement('article');
            item.className = `reservation ${r.status}`;

            const info = document.createElement('div');
            const title = document.createElement('h3');
            title.textContent = `${r.roomName} · ${r.code}`;
            const dates = document.createElement('p');
            dates.textContent = `${pretty(r.checkIn)} → ${pretty(r.checkOut)} · ${r.nights} noche(s) · ${r.guests} huésped(es)`;
            const pay = document.createElement('p');
            pay.textContent = `Bs ${r.total} · ${PAYMENTS[r.paymentMethod] || r.paymentMethod}`;
            info.append(title, dates, pay);

            const side = document.createElement('div');
            side.className = 'reservation-side';
            const badge = document.createElement('span');
            badge.className = 'status-badge';
            badge.textContent = r.status === 'confirmada' ? 'Confirmada' : 'Cancelada';
            side.appendChild(badge);

            if (r.status === 'confirmada') {
                const cancel = document.createElement('button');
                cancel.type = 'button';
                cancel.className = 'link-danger';
                cancel.textContent = 'Cancelar';
                cancel.addEventListener('click', async () => {
                    if (!window.confirm('¿Cancelar esta reserva?')) return;
                    try {
                        await auth.api(`/reservations/${r.id}`, { method: 'DELETE' });
                        loadReservations();
                    } catch (error) {
                        window.alert(error.message);
                    }
                });
                side.appendChild(cancel);
            }
            item.append(info, side);
            box.appendChild(item);
        });
    }

    async function loadReservations() {
        try {
            const data = await auth.api('/reservations');
            renderReservations(data.reservations);
        } catch (error) {
            $('reservationList').textContent = error.message;
        }
    }

    function goToLogin() {
        window.location.href = 'login.html?next=usuario.html#login';
    }

    async function init() {
        if (!auth.token()) return goToLogin();

        let user;
        try {
            user = (await auth.api('/profile')).user;
        } catch (error) {
            return goToLogin();
        }
        auth.save(user);
        showUser(user);
        $('editName').value = user.name;
        $('editDesc').value = user.description;
        $('descCount').textContent = `${user.description.length}/300`;
        selectedImage = user.profileImage;
        renderOptions();
        loadReservations();
    }

    $('editDesc').addEventListener('input', (event) => {
        $('descCount').textContent = `${event.target.value.length}/300`;
    });

    $('avatarFile').addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        message.textContent = '';
        try {
            selectImage(await resizeImage(file));
        } catch (error) {
            message.textContent = error.message;
        }
        event.target.value = '';
    });

    $('profileForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = $('saveProfile');
        button.disabled = true;
        message.textContent = '';
        try {
            const data = await auth.api('/profile', {
                method: 'PUT',
                body: JSON.stringify({
                    name: $('editName').value,
                    description: $('editDesc').value,
                    profileImage: selectedImage
                })
            });
            auth.save(data.user);
            showUser(data.user);
            message.textContent = '✔ Perfil actualizado.';
            const navAvatar = document.querySelector('.nav-user img');
            const navName = document.querySelector('.nav-user span');
            if (navAvatar) navAvatar.src = data.user.profileImage;
            if (navName) navName.textContent = data.user.name || data.user.email;
        } catch (error) {
            if (error.status === 401 || error.status === 403) return goToLogin();
            message.textContent = error.message;
        } finally {
            button.disabled = false;
        }
    });

    init();
})();
