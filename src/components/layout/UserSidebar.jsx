import { 
  LayoutDashboard, 
  ClipboardList, 
  UserCircle, 
  Bell, 
  LogOut,
  FileText 
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const UserSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();

  // FUNCIÓN ÚNICA DE NAVEGACIÓN
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    
    // Switch de rutas basado en el tab seleccionado
    switch (tab) {
      case 'dashboard':
        navigate('/app');
        break;
      case 'tasks':
        navigate('/app/auto-gestion');
        break;
      case 'profile':
        navigate('/app/perfil');
        break;
      default:
        navigate('/app');
    }
  };

  return (
    <aside className="w-64 bg-[#001e33] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">
      {/* IDENTIDAD VISUAL */}
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
          RUSSELL<br/>
          <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
        </h1>
        <div className="mt-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md inline-block">
          <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Portal Empleado</p>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mi Espacio</p>
        
        {/* BOTÓN: MI RESUMEN (Dashboard) */}
        <button 
          onClick={() => handleNavigation('dashboard')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'dashboard' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={18}/> Mi Resumen
        </button>

        {/* BOTÓN: AUTO GESTIÓN (Tareas) */}
        <button 
          onClick={() => handleNavigation('tasks')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'tasks' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ClipboardList size={18}/> Auto Gestión
        </button>

        {/* BOTÓN: MI CONFIGURACIÓN (Perfil) */}
        <button 
          onClick={() => handleNavigation('profile')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'profile'
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCircle size={18}/> Mi Configuración
        </button>

        {/* RECURSOS BLOQUEADOS O INFORMATIVOS */}
        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Recursos</div>
        
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 opacity-50 cursor-not-allowed text-sm">
          <FileText size={18}/> Manuales de Cargo
        </div>

        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 opacity-50 cursor-not-allowed text-sm">
          <Bell size={18}/> Comunicados internos
        </div>
      </nav>

      {/* SALIR */}
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => navigate('/')} 
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full text-left"
        >
          <LogOut size={16} /> Salir del Portal
        </button>
      </div>
    </aside>
  );
};