window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});

window.resortToday = () => {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/La_Paz', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
};

// Sesión compartida entre páginas
window.resortAuth = {
    token: () => localStorage.getItem('authToken'),
    user() {
        try {
            return this.token() ? JSON.parse(localStorage.getItem('currentUser')) : null;
        } catch (error) {
            return null;
        }
    },
    save(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },
    async api(path, options = {}) {
        const headers = { 'Content-Type': 'application/json' };
        if (this.token()) headers.Authorization = `Bearer ${this.token()}`;
        const response = await fetch(`/api${path}`, { ...options, headers });
        const data = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403) this.clear();
        if (!response.ok) {
            const error = new Error(data.errors?.[0]?.msg || data.message || 'No fue posible completar la solicitud.');
            error.status = response.status;
            throw error;
        }
        return data;
    }
};

// Botones de sesión en la barra de navegación (logo a la izquierda, acceso a la derecha)
(function renderNavAuth() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;

    const currentPage = location.pathname.split('/').pop() || 'index.html';
    navbar.querySelectorAll('.nav-links a').forEach((link) => {
        if (link.getAttribute('href') === currentPage) link.setAttribute('aria-current', 'page');
    });

    const user = window.resortAuth.user();

    const box = document.createElement('div');
    box.className = 'nav-auth';

    if (user) {
        const profile = document.createElement('a');
        profile.href = 'usuario.html';
        profile.className = 'nav-user';
        const avatar = document.createElement('img');
        avatar.src = user.profileImage || 'assets/logo.png';
        avatar.alt = 'Perfil';
        const name = document.createElement('span');
        name.textContent = user.name || user.email;
        profile.append(avatar, name);

        const logout = document.createElement('button');
        logout.type = 'button';
        logout.className = 'nav-cta';
        logout.textContent = 'Salir';
        logout.addEventListener('click', () => {
            window.resortAuth.clear();
            window.location.href = 'index.html';
        });
        box.append(profile, logout);
    } else {
        const login = document.createElement('a');
        login.href = 'login.html#login';
        login.className = 'nav-cta';
        login.textContent = 'Iniciar sesión';
        const register = document.createElement('a');
        register.href = 'login.html#register';
        register.className = 'nav-cta nav-cta-primary';
        register.textContent = 'Registrarse';
        box.append(login, register);
    }

    navbar.appendChild(box);
})();

const monthName = document.getElementById('monthName');
const yearName = document.getElementById('yearName');
const calendarDays = document.getElementById('calendarDays');
const bookingDate = document.getElementById('bookingDate');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');

if (monthName && yearName && calendarDays && bookingDate && prevMonthBtn && nextMonthBtn) {
    let currentDate = new Date();
    let selectedDate = new Date();

    function formatMonthName(date) {
        return date.toLocaleDateString('es-ES', { month: 'long' });
    }

    function renderCalendar() {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        monthName.textContent = formatMonthName(currentDate);
        yearName.textContent = year;

        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);
        const firstDayIndex = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        calendarDays.innerHTML = '';

        for (let i = firstDayIndex - 1; i >= 0; i--) {
            const day = document.createElement('button');
            day.type = 'button';
            day.className = 'day-cell muted';
            day.textContent = daysInPrevMonth - i;
            day.disabled = true;
            calendarDays.appendChild(day);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'day-cell';
            button.textContent = day;

            const isToday = date.toDateString() === new Date().toDateString();
            const isSelected = date.toDateString() === selectedDate.toDateString();

            if (isToday) button.classList.add('today');
            if (isSelected) button.classList.add('selected');

            button.addEventListener('click', () => {
                selectedDate = new Date(year, month, day);
                bookingDate.value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                renderCalendar();
            });

            calendarDays.appendChild(button);
        }

        const remainingCells = 42 - (firstDayIndex + daysInMonth);
        for (let day = 1; day <= remainingCells; day++) {
            const nextDay = document.createElement('button');
            nextDay.type = 'button';
            nextDay.className = 'day-cell muted';
            nextDay.textContent = day;
            nextDay.disabled = true;
            calendarDays.appendChild(nextDay);
        }
    }

    prevMonthBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
        renderCalendar();
    });

    nextMonthBtn.addEventListener('click', () => {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
        renderCalendar();
    });

    bookingDate.addEventListener('change', (event) => {
        const value = event.target.value;
        if (!value) return;

        const date = new Date(value + 'T12:00:00');
        currentDate = new Date(date.getFullYear(), date.getMonth(), 1);
        selectedDate = new Date(date);
        renderCalendar();
    });

    selectedDate = new Date();
    bookingDate.value = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
    renderCalendar();
}
