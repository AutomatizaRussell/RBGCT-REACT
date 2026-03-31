import { useState } from 'react';
import { supabase } from "../lib/supabase"; 
import { useNavigate } from 'react-router-dom'; // 1. Importamos el hook

function Login() { // Cambié el nombre a Login para que no choque con tu App.jsx de rutas
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const navigate = useNavigate(); // 2. Inicializamos el navegador

  const bgImageUrl = "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1600";
  const isFormValid = email.trim() !== '' && password.trim() !== '';

  // --- FUNCIÓN DE LOGIN CORREGIDA ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');

    // 1. Petición a Supabase
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    // 2. Si falla
    if (error) {
      console.error('Error de Auth:', error.message);
      setErrorMessage('Correo o contraseña incorrectos. Intente de nuevo.');
      setLoading(false);
      return;
    }

    // 3. Si tiene éxito: Redirigir según el perfil
    console.log('Usuario logueado:', data.user.email);
    
    // Verificamos el rol para saber a dónde mandarlo
    if (data.user?.user_metadata?.role === 'admin' || data.user?.is_super_admin) {
      navigate('/admin'); // Va a las rutas de Admin
    } else {
      navigate('/app');   // Va a las rutas de Empleado (AutoGestión, etc.)
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans antialiased text-slate-800 bg-white">
      
      {/* --- SECCIÓN IZQUIERDA: DISEÑO --- */}
      <div className="w-full lg:w-1/2 bg-[#001e33] flex flex-col items-center lg:items-start justify-center p-10 lg:p-20 relative overflow-hidden h-[30vh] lg:h-auto">
        <img
          src={bgImageUrl}
          alt="Office"
          className="absolute inset-0 w-full h-full object-cover opacity-10"
        />
        <div className="relative z-10 flex flex-col items-center lg:items-start text-center lg:text-left">
          <h1 className="text-4xl md:text-6xl lg:text-8xl font-black text-white leading-[0.9] tracking-tighter uppercase">
            Russell<br/>
            <span className="text-slate-400">Bedford</span>
          </h1>
          <p className="hidden sm:block text-sm lg:text-xl text-slate-400 mt-4 lg:mt-8 tracking-[0.2em] font-light uppercase border-l-0 lg:border-l lg:border-slate-700 lg:pl-6">
            Global Network
          </p>
        </div>
      </div>

      {/* --- SECCIÓN DERECHA: FORMULARIO --- */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12 lg:p-16">
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
                <a href="#" className="text-[10px] lg:text-xs font-bold text-slate-400 hover:text-slate-900 transition-colors">¿Olvidó su clave?</a>
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
                isFormValid && !loading
                  ? 'bg-slate-900 text-white hover:bg-black shadow-xl shadow-slate-900/20 active:scale-[0.95] cursor-pointer'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
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
    </div>
  );
}

export default Login;