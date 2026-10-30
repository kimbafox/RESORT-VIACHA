const { useState } = React;

function AuthApp() {
    const [mode, setMode] = useState(window.location.hash === '#register' ? 'register' : 'login');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [showBetaModal, setShowBetaModal] = useState(
        !localStorage.getItem('authToken') && !sessionStorage.getItem('betaSeen')
    );

    React.useEffect(() => {
        const onHash = () => setMode(window.location.hash === '#register' ? 'register' : 'login');
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []);

    const isRegistering = mode === 'register';

    async function submit(event) {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const email = form.get('email');
        const password = form.get('password');

        setIsSubmitting(true);
        setMessage('');

        try {
            const response = await fetch(`/api/${isRegistering ? 'register' : 'login'}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await response.json();

            if (!response.ok) {
                const validationMessage = data.errors?.[0]?.msg;
                setMessage(validationMessage || data.message || 'No fue posible completar la solicitud.');
                return;
            }

            localStorage.setItem('authToken', data.token);
            localStorage.setItem('currentUser', JSON.stringify(data.user));
            setMessage(`${data.message} Redirigiendo a tu perfil...`);
            formElement.reset();
            setTimeout(() => { window.location.href = 'usuario.html'; }, 900);
        } catch (error) {
            setMessage('No se pudo conectar con el servidor. Intenta nuevamente.');
        } finally {
            setIsSubmitting(false);
        }
    }

    function changeMode(nextMode) {
        setMode(nextMode);
        setMessage('');
        window.history.replaceState(null, '', `#${nextMode}`);
    }

    return (
        <>
            <section className="glass-container auth-card" aria-label="Acceso beta">
                <span className="beta-badge">BETA</span>
                <div className="auth-tabs" role="tablist" aria-label="Acceso a cuenta">
                    <button className={`tab-btn ${!isRegistering ? 'active' : ''}`} type="button" onClick={() => changeMode('login')}>Ingresar</button>
                    <button className={`tab-btn ${isRegistering ? 'active' : ''}`} type="button" onClick={() => changeMode('register')}>Crear cuenta</button>
                </div>
                <p className="beta-copy">Acceso disponible durante la versión beta.</p>
                <form onSubmit={submit}>
                    <div className="form-group">
                        <label htmlFor="authEmail">Correo electrónico</label>
                        <input id="authEmail" name="email" type="email" autoComplete="email" required />
                    </div>
                    <div className="form-group">
                        <label htmlFor="authPassword">Contraseña</label>
                        <input id="authPassword" name="password" type="password" autoComplete={isRegistering ? 'new-password' : 'current-password'} minLength="6" required />
                    </div>
                    <button type="submit" className="btn-submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Procesando...' : isRegistering ? 'Crear cuenta beta' : 'Entrar'}
                    </button>
                </form>
                {message && <p className="auth-message" role="status">{message}</p>}
            </section>

            {showBetaModal && (
                <div className="modal-backdrop" role="presentation">
                    <section className="beta-modal" role="dialog" aria-modal="true" aria-labelledby="betaTitle">
                        <img src="assets/logo.png" className="profile-placeholder" alt="Logo del Resort como foto de perfil predeterminada" />
                        <span className="beta-badge">BETA</span>
                        <h2 id="betaTitle">Bienvenido a Paradise Resort</h2>
                        <p>Al crear tu cuenta se asignará automáticamente el logo del Resort como tu foto de perfil.</p>
                        <button className="btn-submit" type="button" onClick={() => { sessionStorage.setItem('betaSeen', '1'); setShowBetaModal(false); }}>Continuar</button>
                    </section>
                </div>
            )}
        </>
    );
}

ReactDOM.createRoot(document.getElementById('authRoot')).render(<AuthApp />);
