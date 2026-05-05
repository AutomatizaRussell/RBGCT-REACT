import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  LogOut,
  BookOpen,
  PlayCircle,
  Wrench,
  ChevronRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const UserSidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const { logout, empleadoData } = useAuth();

  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador';

  const inicial = nombreUsuario.charAt(0).toUpperCase();
  const areaUsuario = empleadoData?.nombre_area || empleadoData?.nombre_cargo || 'Portal Empleado';

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch {
      navigate('/');
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    switch (tab) {
      case 'dashboard':   navigate('/app');             break;
      case 'tasks':       navigate('/app/auto-gestion'); break;
      case 'profile':     navigate('/app/perfil');       break;
      case 'cursos':      navigate('/app/manuales');     break;
      case 'reglamento':  navigate('/app/comunicados');  break;
      case 'utilidades':  navigate('/app/utilidades');   break;
      default:            navigate('/app');
    }
  };

  const NavBtn = ({ tab, icon, label }) => (
    <button
      onClick={() => handleNavigation(tab)}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
        activeTab === tab
          ? 'bg-white/10 text-white shadow-lg'
          : 'text-slate-400 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {activeTab === tab && <ChevronRight size={13} className="opacity-50"/>}
    </button>
  );

  return (
    <aside className="w-64 bg-[#001e33] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">

      {/* Identidad */}
      <div className="p-7 pb-5">
        <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
          RUSSELL<br/>
          <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
        </h1>
        <div className="mt-2 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-md inline-block">
          <p className="text-[8px] font-bold text-emerald-400 uppercase tracking-widest">Portal Empleado</p>
        </div>
      </div>

      {/* Perfil del usuario */}
      <div className="mx-4 mb-4 p-3.5 bg-white/5 rounded-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-500 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0">
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{nombreUsuario}</p>
            <p className="text-[10px] text-slate-400 truncate">{areaUsuario}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">

        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mi Espacio</p>
        <NavBtn tab="dashboard"  icon={<LayoutDashboard size={17}/>} label="Mi Resumen"/>
        <NavBtn tab="tasks"      icon={<ClipboardList size={17}/>}   label="Mis Tareas"/>
        <NavBtn tab="profile"    icon={<UserCircle size={17}/>}      label="Mi Perfil"/>

        <p className="px-4 pt-5 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Recursos</p>
        <NavBtn tab="cursos"     icon={<PlayCircle size={17}/>}  label="Cursos"/>
        <NavBtn tab="reglamento" icon={<BookOpen size={17}/>}    label="Reglamento"/>
        <NavBtn tab="utilidades" icon={<Wrench size={17}/>}      label="Herramientas"/>

      </nav>

      {/* Salir */}
      <div className="p-5 border-t border-white/5">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full"
        >
          <LogOut size={16}/> Salir del Portal
        </button>
      </div>
    </aside>
  );
};
