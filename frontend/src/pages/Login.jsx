import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  solicitarRecuperacionPassword,
  verificarCodigoRecuperacion,
  restablecerPassword,
} from '../lib/api';
import { Eye, EyeOff, Loader2, Mail, Lock, AlertTriangle, X } from 'lucide-react';
import heroImg from '../assets/hero.png';
import logoImg from '../assets/russell-bedford-logo.png';

// Input con etiqueta flotante al estilo SQF
const Field = ({ id, label, type = 'text', value, onChange, error, suffix }) => {
  const [focused, setFocused] = useState(false);
  const up = focused || value.length > 0;
  return (
    <div>
      <div
        className={`relative border transition-colors duration-150 ${
          error
            ? 'border-red-500'
            : focused
            ? 'border-[#001871]'
            : 'border-gray-300'
        }`}
      >
        <label
          htmlFor={id}
          className={`absolute left-3 pointer-events-none transition-all duration-150 ${
            up ? 'top-1.5 text-[10px]' : 'top-1/2 -translate-y-1/2 text-sm'
          } ${error ? 'text-red-500' : up ? 'text-[#001871]' : 'text-gray-400'}`}
        >
          {label}
        </label>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          className={`w-full bg-transparent outline-none text-sm text-gray-900 pt-6 pb-2 px-3 ${
            suffix ? 'pr-10' : ''
          }`}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{suffix}</div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [msLoading, setMsLoading] = useState(false);

  const navigate = useNavigate();
  const { login, userRole, isAuthenticated } = useAuth();

  useEffect(() => {
    if (needsProfileCompletion) {
      navigate('/completar-perfil', { replace: true });
      return;
    }
    if (isAuthenticated && userRole) {
      const routes = { superadmin: '/superadmin', admin: '/admin', editor: '/editor' };
      navigate(routes[userRole] || '/app', { replace: true });
    }
  }, [isAuthenticated, userRole, navigate, needsProfileCompletion]);

  const handleForgotPassword = () => {
    setShowRecoveryModal(true);
    setRecoveryStep(1);
    setRecoveryEmail('');
    setRecoveryCode('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryMessage(null);
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    const normalizedEmail = recoveryEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      setRecoveryMessage({ type: 'error', text: 'Ingresa tu correo electrónico' });
      return;
    }
    setRecoveryLoading(true);
    try {
      setRecoveryEmail(normalizedEmail);
      const response = await solicitarRecuperacionPassword(normalizedEmail);
      if (response && response.enviado) {
        setRecoveryMessage({ type: 'success', text: 'Código de verificación enviado a tu correo electrónico.' });
        setTimeout(() => { setRecoveryStep(2); setRecoveryMessage(null); }, 1500);
      } else {
        setRecoveryMessage({ type: 'success', text: 'Si el email está registrado, recibirás un código de verificación.' });
      }
    } catch (err) {
      setRecoveryMessage({ type: 'error', text: err.message || 'Error al procesar la solicitud. Intenta de nuevo.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    const normalizedEmail = recoveryEmail.trim().toLowerCase();
    const normalizedCode = recoveryCode.replace(/\D/g, '').trim();
    if (!normalizedCode) {
      setRecoveryMessage({ type: 'error', text: 'Ingresa el código de verificación' });
      return;
    }
    setRecoveryLoading(true);
    try {
      const response = await verificarCodigoRecuperacion(normalizedEmail, normalizedCode);
      if (response && response.token) {
        setRecoveryToken(response.token);
        setRecoveryMessage({ type: 'success', text: 'Código verificado correctamente.' });
        setTimeout(() => { setRecoveryStep(3); setRecoveryMessage(null); }, 1000);
      }
    } catch (err) {
      setRecoveryMessage({ type: 'error', text: err.message || 'Código incorrecto o expirado.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) { setRecoveryMessage({ type: 'error', text: 'Completa ambos campos' }); return; }
    if (newPassword.length < 6) { setRecoveryMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' }); return; }
    if (newPassword !== confirmPassword) { setRecoveryMessage({ type: 'error', text: 'Las contraseñas no coinciden' }); return; }
    setRecoveryLoading(true);
    try {
      const response = await restablecerPassword(recoveryToken, newPassword);
      if (response && response.completado) {
        setRecoveryMessage({ type: 'success', text: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' });
        setTimeout(() => { closeRecoveryModal(); }, 2000);
      }
    } catch (err) {
      setRecoveryMessage({ type: 'error', text: err.message || 'Error al restablecer la contraseña.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setMsLoading(true);
    setError('');
    try {
      const redirectUri = `${window.location.origin}/auth/microsoft/callback`;
      const res = await fetch(`/api/auth/microsoft/url/?redirect_uri=${encodeURIComponent(redirectUri)}`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error || 'Login con Microsoft no está configurado aún.');
        return;
      }
      window.location.href = data.url;
    } catch {
      setError('No se pudo conectar con el servidor. Intenta de nuevo.');
      setMsLoading(false);
    }
  };

  const closeRecoveryModal = () => {
    setShowRecoveryModal(false);
    setRecoveryStep(1);
    setRecoveryEmail('');
    setRecoveryCode('');
    setRecoveryToken('');
    setNewPassword('');
    setConfirmPassword('');
    setRecoveryMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttempted(true);
    if (!email || !password) return;
    setLoading(true);
    setError('');
    try {
      const result = await login(email, password, rememberMe);
      if (result?.requiereVerificacion) {
        navigate('/verify-code', { replace: true, state: { email } });
        return;
      }
      if (result?.primerLogin) {
        setNeedsProfileCompletion(true);
        return;
      }
    } catch (err) {
      if (err.message?.includes('no autorizado')) {
        setError('Acceso denegado. Su cuenta no está vinculada al registro de empleados o está inactiva.');
      } else if (err.message?.includes('Invalid login credentials')) {
        setError('Credenciales inválidas. Por favor verifique su correo y contraseña.');
      } else {
        setError(err.message || 'Error al iniciar sesión.');
      }
    } finally {
      setLoading(false);
    }
  };

  const emailError = attempted && !email
    ? 'Debe introducir un correo electrónico'
    : attempted && email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? 'Ingrese un correo electrónico válido'
    : '';
  const passwordError = attempted && !password ? 'Por favor, introduzca su contraseña.' : '';

  return (
    <div className="flex h-screen overflow-hidden">

      {/* ── PANEL IZQUIERDO ── */}
      <div className="hidden lg:flex w-1/2 relative flex-col items-center justify-center bg-[#001d4a]">
        <img
          src={heroImg}
          alt=""
          className="absolute inset-0 w-full h-full object-cover mix-blend-luminosity opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#001871]/80 via-[#001871]/60 to-[#00a9ce]/30" />
        <div className="relative z-10 flex flex-col items-center text-center px-12">
          <img
            src={logoImg}
            alt="Russell Bedford"
            className="w-52 mb-8 brightness-0 invert drop-shadow-xl"
          />
          <h2 className="text-white text-2xl font-bold tracking-wide">
            Gestión de Capital de Talento
          </h2>
          <p className="text-white/50 text-sm mt-3 max-w-xs leading-relaxed">
            Plataforma interna de recursos humanos para Russell Bedford RBG S.A.S
          </p>
        </div>
        {/* Franja de colores corporativos en la parte inferior */}
        <div className="absolute bottom-0 left-0 right-0 flex h-1">
          <div className="flex-1 bg-[#981d97]" />
          <div className="flex-1 bg-[#00bfb3]" />
          <div className="flex-1 bg-[#001871]" />
          <div className="flex-1 bg-[#ed8b00]" />
        </div>
      </div>

      {/* ── PANEL DERECHO ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-white px-8 py-12">
        <div className="w-full max-w-sm">

          {/* Logo mobile / top */}
          <div className="flex items-center gap-3 mb-10">
            <img src={logoImg} alt="Russell Bedford" className="h-7 object-contain" />
          </div>

          <h1 className="text-[1.75rem] font-bold text-[#001d4a] mb-8 leading-tight">
            Iniciar sesión
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>

            <Field
              id="email"
              label="Correo electrónico *"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              error={emailError}
            />

            <Field
              id="password"
              label="Contraseña *"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); }}
              error={passwordError}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />

            {error && (
              <p className="text-xs text-red-500 leading-snug">{error}</p>
            )}

            {/* Recuérdame + Olvidé contraseña */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#001871] cursor-pointer"
                />
                <span className="text-sm text-gray-600">Recuérdame</span>
              </label>
              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-[#001871] underline hover:opacity-70 transition-opacity"
              >
                ¿Se te olvidó tu contraseña?
              </button>
            </div>

            {/* Botón principal */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 text-sm font-semibold transition-colors mt-2
                disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed
                bg-[#001871] text-white hover:bg-[#001d4a] active:scale-[0.99]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Verificando...
                </span>
              ) : (
                'Iniciar sesión'
              )}
            </button>
          </form>

          {/* Separador */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">o continúa con</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Botón Microsoft */}
          <button
            type="button"
            onClick={handleMicrosoftLogin}
            disabled={msLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-300 bg-white hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.99]"
          >
            {msLoading ? (
              <Loader2 size={16} className="animate-spin text-gray-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="10" height="10" fill="#F25022"/>
                <rect x="11" y="0" width="10" height="10" fill="#7FBA00"/>
                <rect x="0" y="11" width="10" height="10" fill="#00A4EF"/>
                <rect x="11" y="11" width="10" height="10" fill="#FFB900"/>
              </svg>
            )}
            {msLoading ? 'Redirigiendo...' : 'Continuar con cuenta Microsoft'}
          </button>

          <p className="text-center text-[11px] text-gray-300 mt-10">
            © 2026 Russell Bedford GCT · Todos los derechos reservados.
          </p>
        </div>
      </div>

      {/* ── MODAL RECUPERACIÓN (3 pasos) ── */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
            <button
              onClick={closeRecoveryModal}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-[#001871] mb-2">
                {recoveryStep === 1 && 'Recuperar Contraseña'}
                {recoveryStep === 2 && 'Verificar Código'}
                {recoveryStep === 3 && 'Nueva Contraseña'}
              </h2>
              <p className="text-sm text-slate-500">
                {recoveryStep === 1 && 'Ingresa tu correo electrónico corporativo. Recibirás un código de verificación.'}
                {recoveryStep === 2 && 'Ingresa el código de 6 dígitos que recibiste por correo electrónico.'}
                {recoveryStep === 3 && 'Crea una nueva contraseña segura para tu cuenta.'}
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                {[1, 2, 3].map((s) => (
                  <div key={s} className={`w-8 h-2 rounded-full ${recoveryStep >= s ? 'bg-[#001871]' : 'bg-slate-200'}`} />
                ))}
              </div>
            </div>

            {/* Paso 1 */}
            {recoveryStep === 1 && (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="correo@russellbedford.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 outline-none transition-all text-sm"
                    required
                  />
                </div>
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${recoveryMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {recoveryMessage.text}
                  </div>
                )}
                <button type="submit" disabled={recoveryLoading} className="w-full bg-[#001871] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {recoveryLoading ? <><Loader2 size={16} className="animate-spin" /> Enviando...</> : 'Enviar Código'}
                </button>
              </form>
            )}

            {/* Paso 2 */}
            {recoveryStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-500">Código enviado a:</p>
                  <p className="font-medium text-[#001871]">{recoveryEmail}</p>
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="Código de 6 dígitos"
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 outline-none transition-all text-sm text-center text-2xl tracking-[0.5em] font-bold"
                    required
                  />
                </div>
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${recoveryMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {recoveryMessage.text}
                  </div>
                )}
                <button type="submit" disabled={recoveryLoading} className="w-full bg-[#001871] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {recoveryLoading ? <><Loader2 size={16} className="animate-spin" /> Verificando...</> : 'Verificar Código'}
                </button>
                <button type="button" onClick={() => setRecoveryStep(1)} className="w-full py-2 text-sm text-slate-500 hover:text-[#001871] transition-colors">
                  ← Volver al paso anterior
                </button>
              </form>
            )}

            {/* Paso 3 */}
            {recoveryStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña (mínimo 6 caracteres)" className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 outline-none transition-all text-sm" required minLength={6} />
                </div>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar contraseña" className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 outline-none transition-all text-sm" required />
                </div>
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${recoveryMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {recoveryMessage.text}
                  </div>
                )}
                <button type="submit" disabled={recoveryLoading} className="w-full bg-[#001871] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {recoveryLoading ? <><Loader2 size={16} className="animate-spin" /> Restableciendo...</> : 'Restablecer Contraseña'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
