window.addEventListener('load', () => {
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 1600);
});

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const tabs = document.querySelectorAll('.tab-btn');

    if (!loginForm || !registerForm || !tabs.length) return;

    const isLogin = tab === 'login';
    loginForm.style.display = isLogin ? 'block' : 'none';
    registerForm.style.display = isLogin ? 'none' : 'block';

    tabs.forEach((button) => {
        button.classList.toggle('active', button.getAttribute('onclick')?.includes(tab));
    });
}

function handleLogin(event) {
    event.preventDefault();
    alert('Inicio de sesión exitoso');
}

function handleRegister(event) {
    event.preventDefault();
    alert('Cuenta creada correctamente');
}

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
                bookingDate.value = selectedDate.toISOString().split('T')[0];
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
    bookingDate.value = selectedDate.toISOString().split('T')[0];
    renderCalendar();
}
