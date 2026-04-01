import { useState } from 'react';
import { supabase } from "../lib/supabase"; 
import { useNavigate } from 'react-router-dom';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // --- ESTADOS PARA EL MODAL DE OLVIDO DE CLAVE ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState({ loading: false, success: false, error: '' });

  const navigate = useNavigate();

  const bgImageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600";
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  const openForgotPasswordModal = () => {
    setResetEmail('');
    setResetStatus({ loading: false, success: false, error: '' });
    setIsModalOpen(true);
  };

  // --- FUNCIÓN PARA ENVIAR SOLICITUD (CORREO -> ID -> ALERTA) ---
  const handleSendResetRequest = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;

    setResetStatus({ ...resetStatus, loading: true, error: '' });

    try {
      // 1. Buscamos el id_empleado en rbgct.datos_empleado usando el correo
      const { data: empleado, error: errorBusqueda } = await supabase
        .from('datos_empleado')
        .select('id_empleado')
        .eq('correo_corporativo', resetEmail.trim())
        .single();

      if (errorBusqueda || !empleado) {
        throw new Error('El correo ingresado no pertenece a un colaborador activo.');
      }

      // 2. Insertamos en rbgct.solicitudes_password vinculando el ID (Cero redundancia)
      const { error: errorInsert } = await supabase
        .from('solicitudes_password')
        .insert([
          { 
            id_empleado: empleado.id_empleado,
            fecha_solicitud: new Date().toISOString() 
          }
        ]);

      if (errorInsert) throw errorInsert;
      
      setResetStatus({ loading: false, success: true, error: '' });

    } catch (error) {
      setResetStatus({ 
        loading: false, 
        success: false, 
        error: error.message || 'No se pudo enviar la solicitud.' 
      });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;

      const userRole = authData.user?.user_metadata?.role;

      if (userRole === 'admin' || authData.user?.is_super_admin) {
        navigate('/admin');
        return; 
      }

      const { data: empleado, error: dbError } = await supabase
        .from('datos_empleado') 
        .select('auth_id')
        .eq('auth_id', authData.user.id)
        .single();

      if (dbError || !empleado) {
        setErrorMessage("Acceso denegado. Su cuenta no está vinculada al registro de empleados.");
        await supabase.auth.signOut();
        return;
      }

      if (userRole === 'user') {
        navigate('/app');
      } else {
        setErrorMessage("Perfil no autorizado.");
        await supabase.auth.signOut();
      }

    } catch (error) {
      setErrorMessage("Credenciales inválidas.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans antialiased text-slate-800 bg-white relative">
      
      {/* SECCIÓN IZQUIERDA */}
      <div className="w-full lg:w-1/2 bg-[#001e33] flex flex-col items-center lg:items-start justify-center p-10 lg:p-20 relative overflow-hidden h-[30vh] lg:h-auto z-10">
        <img src={bgImageUrl} alt="Office" className="absolute inset-0 w-full h-full object-cover opacity-10" />
        <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase">
            Russell<br/><span className="text-slate-400">Bedford</span>
          </h1>
          <p className="hidden sm:block text-sm lg:text-xl text-slate-400 mt-4 lg:mt-8 tracking-[0.2em] font-light uppercase border-l-0 lg:border-l lg:border-slate-700 lg:pl-6">
            Global Network
          </p>
        </div>
      </div>

      {/* SECCIÓN DERECHA */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16 z-10">
        <div className="w-full max-w-sm">
          <header className="mb-8 lg:mb-12 text-center lg:text-left">
            <h2 className="text-3xl lg:text-4xl font-bold text-slate-900 tracking-tight">Iniciar sesión</h2>
            <p className="text-slate-500 mt-2 font-medium">Plataforma de Intranet Corporativa</p>
          </header>

          <form className="space-y-5 lg:space-y-7" onSubmit={handleLogin}>
            {errorMessage && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 text-center">
                {errorMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 lg:p-4 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl outline-none transition-all focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-slate-900 disabled:opacity-50"
                placeholder="usuario@russellbedford.com.co"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] lg:text-xs font-bold text-slate-500 uppercase tracking-widest">Contraseña</label>
                <button type="button" onClick={openForgotPasswordModal} className="text-[10px] lg:text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">
                  ¿Olvidó su clave?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full p-3 lg:p-4 bg-slate-50 border border-slate-200 rounded-xl lg:rounded-2xl outline-none transition-all focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-slate-900 disabled:opacity-50"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={`w-full py-3.5 lg:py-4 rounded-xl lg:rounded-2xl font-bold text-xs lg:text-sm tracking-widest uppercase transition-all ${
                isFormValid && !loading ? 'bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-900/20 active:scale-[0.95]' : 'bg-slate-100 text-slate-300'
              }`}
            >
              {loading ? 'Verificando...' : 'Entrar al Sistema'}
            </button>
          </form>

          <footer className="mt-12 lg:mt-20 pt-8 border-t border-slate-100 text-center">
            <p className="text-[9px] lg:text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
              © 2026 Russell Bedford GCT S.A.S
            </p>
          </footer>
        </div>
      </div>

      {/* MODAL DE RECUPERACIÓN */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-6" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white p-8 sm:p-10 rounded-3xl shadow-2xl w-full max-w-lg relative animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors p-2 rounded-full hover:bg-slate-100">✕</button>

            <header className="mb-10 text-center">
              <h3 className="text-3xl font-bold text-slate-900 tracking-tight">Recuperar Contraseña</h3>
              <p className="text-slate-500 mt-2 font-medium">Introduce tu correo corporativo registrado.</p>
            </header>

            {!resetStatus.success ? (
              <form className="space-y-7" onSubmit={handleSendResetRequest}>
                {resetStatus.error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-bold border border-red-100 text-center">
                    {resetStatus.error}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Correo Electrónico Corporativo</label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    required
                    disabled={resetStatus.loading}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none transition-all focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 text-slate-900"
                    placeholder="tesoreria.gct@rbcol.co"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="w-1/2 py-4 rounded-2xl font-bold text-xs uppercase text-slate-600 bg-slate-100 hover:bg-slate-200">Cancelar</button>
                  <button type="submit" disabled={resetStatus.loading || !resetEmail.trim()} className="w-1/2 py-4 rounded-2xl font-bold text-xs uppercase bg-slate-900 text-white hover:bg-black shadow-lg">
                    {resetStatus.loading ? 'Validando...' : 'Enviar Alerta'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="text-center py-8 space-y-6">
                <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-50"><span className="text-5xl">✅</span></div>
                <p className="text-slate-700 font-semibold">Solicitud vinculada a tu ID de empleado. El Administrador ha sido notificado.</p>
                <button onClick={() => setIsModalOpen(false)} className="py-4 px-8 rounded-2xl font-bold text-xs uppercase bg-slate-900 text-white">Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
      `}</style>
    </div>
  );
}

export default Login;