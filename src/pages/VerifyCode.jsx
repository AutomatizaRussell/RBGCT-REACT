import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Mail, ArrowRight, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const VerifyCode = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setEmpleadoDataVerify } = useAuth();
  const { email, password, userId, id_permisos } = location.state || {};

  const [codigo, setCodigo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intentos, setIntentos] = useState(0);
  const [reenviando, setReenviando] = useState(false);

  // Si no hay email en state, redirigir al login
  if (!email) {
    navigate('/login');
    return null;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/verificar-codigo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          codigo: codigo.trim(),
          password
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Código correcto - actualizar AuthContext y redirigir
        setEmpleadoDataVerify(data.user);
        
        // Redirigir a completar perfil
        navigate('/completar-perfil');
      } else {
        // Código incorrecto
        setError(data.error || 'Código incorrecto');
        setIntentos(prev => prev + 1);
      }
    } catch (err) {
      console.error('Error verificando código:', err);
      setError('Error de conexión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const reenviarCodigo = async () => {
    setReenviando(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8000/api/enviar-codigo/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const data = await response.json();

      if (response.ok) {
        setError('');
        alert('Nuevo código enviado a tu correo');
      } else {
        setError('No se pudo reenviar el código');
      }
    } catch (err) {
      setError('Error al reenviar código');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[#001e33] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Mail className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-[#001e33]">Verificación de Código</h1>
          <p className="text-slate-500 mt-2">
            Ingresa el código de 6 dígitos enviado a:<br />
            <span className="font-semibold text-[#001e33]">{email}</span>
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-red-700 font-semibold">{error}</p>
                {intentos > 0 && (
                  <p className="text-red-600 text-sm mt-1">
                    Intentos fallidos: {intentos}
                  </p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Código de verificación
              </label>
              <input
                type="text"
                value={codigo}
                onChange={(e) => {
                  // Solo números, máximo 6 dígitos
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setCodigo(value);
                }}
                placeholder="000000"
                className="w-full text-center text-3xl font-bold tracking-[0.5em] py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-[#001e33] focus:bg-white outline-none transition-all"
                autoFocus
              />
              <p className="text-xs text-slate-400 mt-2 text-center">
                El código expira en 15 minutos
              </p>
            </div>

            <button
              type="submit"
              disabled={loading || codigo.length !== 6}
              className="w-full bg-[#001e33] text-white py-4 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-[#002d4a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Verificar
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Reenviar */}
          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={reenviarCodigo}
              disabled={reenviando}
              className="text-[#001e33] font-semibold hover:underline disabled:opacity-50 inline-flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${reenviando ? 'animate-spin' : ''}`} />
              {reenviando ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-slate-400 text-sm mt-8">
          RBG CT - Sistema de Gestión
        </p>
      </div>
    </div>
  );
};

export default VerifyCode;
