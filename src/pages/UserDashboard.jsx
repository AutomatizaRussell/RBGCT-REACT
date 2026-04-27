import { useState, useEffect } from 'react'; 
import { useLocation, Outlet, Link, useNavigate } from 'react-router-dom';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle2, 
  CalendarDays, 
  FileText, 
  UserCircle,
  Bell
} from 'lucide-react';

// Importamos el Sidebar exclusivo de usuario
import { UserSidebar } from '../components/layout/UserSidebar';
import TaskCalendar from '../components/tasks/TaskCalendar';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  // Detectamos si estamos en la raíz /app
  const isHome = location.pathname === '/app' || location.pathname === '/app/';

  // Sincronizar activeTab con la ruta actual
  useEffect(() => {
    const path = location.pathname;
    if (path.includes('auto-gestion')) {
      setActiveTab('tasks');
    } else if (path.includes('perfil')) {
      setActiveTab('profile');
    } else if (path.includes('manuales')) {
      setActiveTab('manuales');
    } else if (path.includes('comunicados')) {
      setActiveTab('comunicados');
    } else {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      
      {/* SIDEBAR: Maneja el estado de las pestañas y navegación */}
      <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        
        {/* HEADER DINÁMICO */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Portal del Empleado</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {isHome ? 'Mi Resumen Diario' : 
               location.pathname.includes('auto-gestion') ? 'Auto Gestión de Tareas' : 
               location.pathname.includes('perfil') ? 'Mi Configuración' :
               location.pathname.includes('manuales') ? 'Manuales de Cargo' :
               location.pathname.includes('comunicados') ? 'Comunicados Internos' : 'Portal Empleado'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 text-slate-400 hover:text-[#001e33] transition-colors bg-slate-50 rounded-full">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white"></span>
            </button>
            
            <div className="flex items-center gap-4 pl-6 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#001e33]">Colaborador Activo</p>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight font-mono">ID: RB-2026</p>
              </div>
              <Link 
                to="/app/perfil" 
                onClick={() => setActiveTab('profile')}
                className="w-10 h-10 bg-[#001e33] rounded-xl flex items-center justify-center text-white hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/10"
              >
                <UserCircle size={22} />
              </Link>
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-10 overflow-auto flex-1">
          {isHome ? (
            /* VISTA PRINCIPAL (Dashboard / Home) */
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              
              {/* Stats Personalizados */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <StatCard label="Mis Pendientes" value="05" icon={<Clock size={18}/>} subtext="Revisar hoy" />
                <StatCard label="Tareas Listas" value="12" icon={<CheckCircle2 size={18} className="text-emerald-600"/>} subtext="Buen ritmo" color="text-emerald-600" />
                <StatCard label="Horas Mes" value="128h" icon={<CalendarDays size={18}/>} subtext="Corte: 30 Mar" />
                <StatCard label="Mi Perfil" value="A1" icon={<UserCircle size={18}/>} subtext="Verificado" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Calendario Dinámico de Tareas */}
              <div className="lg:col-span-2">
                <TaskCalendar readOnly={true} />
              </div>

                {/* Accesos Rápidos */}
                <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
                  <div className="flex items-center gap-4">
                     <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><FileText size={20} /></div>
                     <h3 className="font-bold text-[#001e33]">Auto Gestión</h3>
                  </div>
                  <div className="space-y-3">
                    <ActionButton 
                      label="Ver Mis Tareas" 
                      icon={<ClipboardList size={14}/>} 
                      onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                      primary
                    />
                    <ActionButton 
                      label="Mi Configuración" 
                      icon={<UserCircle size={14}/>} 
                      onClick={() => { setActiveTab('profile'); navigate('/app/perfil'); }}
                    />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* VISTA DE RUTAS HIJAS (Auto-Gestión, Perfil, etc.) */
            <div className="animate-in fade-in duration-500">
              <Outlet /> 
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTES UI REUTILIZABLES ---

const StatCard = ({ label, value, icon, subtext, color = "text-[#001e33]" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-indigo-100 transition-all">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl text-[#001e33] border border-slate-100">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);

const ActivityRow = ({ title, time, status }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-[#001e33] text-[10px] border border-slate-200">
        {title.charAt(0)}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{title}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
    </div>
    <span className="text-[9px] font-black text-indigo-600 uppercase bg-indigo-50 px-2.5 py-1 rounded-lg tracking-wider border border-indigo-100">
      {status}
    </span>
  </div>
);

const ActionButton = ({ label, icon, primary, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
      primary 
        ? 'bg-[#001e33] text-white hover:bg-slate-800 shadow-lg shadow-blue-900/10' 
        : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
    }`}
  >
    {icon} {label}
  </button>
);

export default UserDashboard;