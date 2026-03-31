import { 
  LayoutDashboard, 
  Users, 
  UserPlus, 
  FileText, 
  ClipboardCheck, 
  Settings, 
  LogOut,
  UserCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Admin2Sidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  // Función para navegar dentro del módulo de Admin Normal
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    navigate('/admin2'); // Regresa a la base del dashboard operativo
  };

  return (
    <aside className="w-64 bg-[#001e33] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">
      {/* Branding */}
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
          RUSSELL<br/>
          <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
        </h1>
        <div className="mt-2 inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-bold text-blue-400 uppercase tracking-widest">
          Administrative Mode
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Gestión Operativa</p>
        
        {/* PANEL GENERAL */}
        <button 
          onClick={() => handleNavigation('dashboard')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'dashboard' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={18}/> Resumen Equipo
        </button>

        {/* GESTIÓN DE PERSONAL */}
        <button 
          onClick={() => handleNavigation('users')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'users' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={18}/> Mi Personal
        </button>

        {/* REPORTES DE ASISTENCIA */}
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <ClipboardCheck size={18}/> Validar Turnos
        </div>

        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Documentación</div>
        
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <FileText size={18}/> Reportes de Nómina
        </div>
        
        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cuenta</div>
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer text-sm font-medium">
          <UserCircle size={18}/> Mi Perfil
        </div>
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <Settings size={18}/> Preferencias
        </div>
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full text-left px-4"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};