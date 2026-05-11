import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { 
  solicitarRecuperacionPassword, 
  verificarCodigoRecuperacion, 
  restablecerPassword 
} from '../lib/api';
import { Building2, Eye, EyeOff, Loader2, Mail, Lock, AlertTriangle, X } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [needsProfileCompletion, setNeedsProfileCompletion] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState(1); // 1: email, 2: codigo, 3: nueva password
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [recoveryToken, setRecoveryToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, userRole, isAuthenticated } = useAuth();

  // Redirigir automáticamente si ya está autenticado
  useEffect(() => {
    // Si necesita completar perfil, redirigir a completar-perfil
    if (needsProfileCompletion) {
      navigate('/completar-perfil', { replace: true });
      return;
    }
    
    if (isAuthenticated && userRole) {
      switch (userRole) {
        case 'superadmin':
          navigate('/admin', { replace: true });
          break;
        case 'admin':
          navigate('/admin2', { replace: true });
          break;
        case 'editor':
          navigate('/editor', { replace: true });
          break;
        case 'usuario':
          navigate('/app', { replace: true });
          break;
        default:
          navigate('/app', { replace: true });
      }
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

  // Paso 1: Solicitar código de recuperación
  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    
    if (!recoveryEmail) {
      setRecoveryMessage({ type: 'error', text: 'Ingresa tu correo electrónico' });
      return;
    }
    
    setRecoveryLoading(true);
    
    try {
      const response = await solicitarRecuperacionPassword(recoveryEmail);
      console.log('Respuesta de recuperación:', response);
      
      if (response && response.enviado) {
        setRecoveryMessage({ 
          type: 'success', 
          text: 'Código de verificación enviado a tu correo electrónico.' 
        });
        // Avanzar al paso 2 después de 1.5 segundos
        setTimeout(() => {
          setRecoveryStep(2);
          setRecoveryMessage(null);
        }, 1500);
      } else {
        // Mensaje genérico por seguridad
        setRecoveryMessage({ 
          type: 'success', 
          text: 'Si el email está registrado, recibirás un código de verificación.' 
        });
      }
      
    } catch (err) {
      console.error('Error al solicitar recuperación:', err);
      setRecoveryMessage({ type: 'error', text: err.message || 'Error al procesar la solicitud. Intenta de nuevo.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Paso 2: Verificar código
  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!recoveryCode) {
      setRecoveryMessage({ type: 'error', text: 'Ingresa el código de verificación' });
      return;
    }
    
    setRecoveryLoading(true);
    
    try {
      const response = await verificarCodigoRecuperacion(recoveryEmail, recoveryCode);
      console.log('Código verificado:', response);
      
      if (response && response.token) {
        setRecoveryToken(response.token);
        setRecoveryMessage({ 
          type: 'success', 
          text: 'Código verificado correctamente. Ahora puedes crear una nueva contraseña.' 
        });
        // Avanzar al paso 3 después de 1 segundo
        setTimeout(() => {
          setRecoveryStep(3);
          setRecoveryMessage(null);
        }, 1000);
      }
      
    } catch (err) {
      console.error('Error al verificar código:', err);
      setRecoveryMessage({ type: 'error', text: err.message || 'Código incorrecto o expirado.' });
    } finally {
      setRecoveryLoading(false);
    }
  };

  // Paso 3: Restablecer contraseña
  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (!newPassword || !confirmPassword) {
      setRecoveryMessage({ type: 'error', text: 'Completa ambos campos' });
      return;
    }
    
    if (newPassword.length < 6) {
      setRecoveryMessage({ type: 'error', text: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setRecoveryMessage({ type: 'error', text: 'Las contraseñas no coinciden' });
      return;
    }
    
    setRecoveryLoading(true);
    
    try {
      const response = await restablecerPassword(recoveryToken, newPassword);
      console.log('Contraseña restablecida:', response);
      
      if (response && response.completado) {
        setRecoveryMessage({ 
          type: 'success', 
          text: 'Contraseña restablecida correctamente. Ya puedes iniciar sesión.' 
        });
        // Cerrar modal después de 2 segundos
        setTimeout(() => {
          setShowRecoveryModal(false);
          // Limpiar estados
          setRecoveryStep(1);
          setRecoveryEmail('');
          setRecoveryCode('');
          setRecoveryToken('');
          setNewPassword('');
          setConfirmPassword('');
          setRecoveryMessage(null);
        }, 2000);
      }
      
    } catch (err) {
      console.error('Error al restablecer contraseña:', err);
      setRecoveryMessage({ type: 'error', text: err.message || 'Error al restablecer la contraseña.' });
    } finally {
      setRecoveryLoading(false);
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
    setLoading(true);
    setError('');

    try {
      const result = await login(email, password);
      
      // Si requiere verificación de código (primer login)
      if (result?.requiereVerificacion) {
        // Redirigir a página de verificación de código
        navigate('/verify-code', {
          replace: true,
          state: {
            email,
            password,
            userId: result.empleadoData.id_empleado,
            id_permisos: result.empleadoData.id_permisos
          }
        });
        return;
      }
      
      // Verificar si es primer login y necesita completar datos (después de verificación)
      if (result?.primerLogin) {
        setNeedsProfileCompletion(true);
        return;
      }
      
      // La redirección automática se maneja en el useEffect cuando userRole se actualiza
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

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#001e33] rounded-2xl mb-4 shadow-xl shadow-blue-900/20">
            <Building2 className="text-white" size={40} />
          </div>
          <h1 className="text-2xl font-black text-[#001e33] tracking-tight">
            RUSSELL <span className="text-slate-400 font-light">BEDFORD</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">
            Portal GCT - Gestión Corporativa
          </p>
        </div>

        {/* Formulario */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl p-8">
          <h2 className="text-lg font-black text-[#001e33] mb-6">Iniciar Sesión</h2>
          
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Mail size={12} /> Correo Corporativo
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
                placeholder="usuario@russellbedford.com.co"
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <Lock size={12} /> Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#001e33] transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#001e33] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Verificando...
                </>
              ) : (
                'Ingresar al Sistema'
              )}
            </button>
          </form>

          {/* Mensaje de recuperación */}
          {recoveryMessage && (
            <div className={`mt-4 p-3 rounded-lg flex items-center gap-2 text-sm ${
              recoveryMessage.type === 'warning' 
                ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{recoveryMessage.text}</span>
            </div>
          )}

          {/* Links */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button 
              onClick={handleForgotPassword}
              className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#001e33] transition-colors"
              type="button"
            >
              ¿Olvidó su contraseña?
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
          © 2026 Russell Bedford RBG. Todos los derechos reservados.
        </p>
      </div>

      {/* Modal de Recuperación de Contraseña - 3 Pasos */}
      {showRecoveryModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
            {/* Cerrar */}
            <button 
              onClick={closeRecoveryModal}
              className="absolute top-4 right-4 p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-500" />
            </button>

            {/* Header con indicador de pasos */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={32} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-[#001e33] mb-2">
                {recoveryStep === 1 && 'Recuperar Contraseña'}
                {recoveryStep === 2 && 'Verificar Código'}
                {recoveryStep === 3 && 'Nueva Contraseña'}
              </h2>
              <p className="text-sm text-slate-500">
                {recoveryStep === 1 && 'Ingresa tu correo electrónico corporativo. Recibirás un código de verificación.'}
                {recoveryStep === 2 && 'Ingresa el código de 6 dígitos que recibiste por correo electrónico.'}
                {recoveryStep === 3 && 'Crea una nueva contraseña segura para tu cuenta.'}
              </p>
              
              {/* Indicador de progreso */}
              <div className="flex items-center justify-center gap-2 mt-4">
                <div className={`w-8 h-2 rounded-full ${recoveryStep >= 1 ? 'bg-[#001e33]' : 'bg-slate-200'}`}></div>
                <div className={`w-8 h-2 rounded-full ${recoveryStep >= 2 ? 'bg-[#001e33]' : 'bg-slate-200'}`}></div>
                <div className={`w-8 h-2 rounded-full ${recoveryStep >= 3 ? 'bg-[#001e33]' : 'bg-slate-200'}`}></div>
              </div>
            </div>

            {/* PASO 1: Solicitar código */}
            {recoveryStep === 1 && (
              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={recoveryEmail}
                    onChange={(e) => setRecoveryEmail(e.target.value)}
                    placeholder="correo@russellbedford.com"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none transition-all text-sm"
                    required
                  />
                </div>

                {/* Mensaje */}
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    recoveryMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {recoveryMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-[#001e33] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {recoveryLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Enviando...
                    </>
                  ) : (
                    'Enviar Código'
                  )}
                </button>
              </form>
            )}

            {/* PASO 2: Verificar código */}
            {recoveryStep === 2 && (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="text-center mb-4">
                  <p className="text-sm text-slate-500">Código enviado a:</p>
                  <p className="font-medium text-[#001e33]">{recoveryEmail}</p>
                </div>
                
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={recoveryCode}
                    onChange={(e) => setRecoveryCode(e.target.value)}
                    placeholder="Código de 6 dígitos"
                    maxLength={6}
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none transition-all text-sm text-center text-2xl tracking-[0.5em] font-bold"
                    required
                  />
                </div>

                {/* Mensaje */}
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    recoveryMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {recoveryMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-[#001e33] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {recoveryLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Verificando...
                    </>
                  ) : (
                    'Verificar Código'
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setRecoveryStep(1)}
                  className="w-full py-2 text-sm text-slate-500 hover:text-[#001e33] transition-colors"
                >
                  ← Volver al paso anterior
                </button>
              </form>
            )}

            {/* PASO 3: Nueva contraseña */}
            {recoveryStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña (mínimo 6 caracteres)"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none transition-all text-sm"
                    required
                    minLength={6}
                  />
                </div>
                
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar contraseña"
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none transition-all text-sm"
                    required
                  />
                </div>

                {/* Mensaje */}
                {recoveryMessage && (
                  <div className={`p-3 rounded-lg text-sm ${
                    recoveryMessage.type === 'success' 
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}>
                    {recoveryMessage.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recoveryLoading}
                  className="w-full bg-[#001e33] text-white py-3 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {recoveryLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Restableciendo...
                    </>
                  ) : (
                    'Restablecer Contraseña'
                  )}
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