import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  LogOut,
  BookOpen,
  PlayCircle,
  Wrench,
  Building2,
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
  const areaUsuario = empleadoData?.nombre_area || empleadoData?.nombre_cargo || 'Colaborador';

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
      case 'dashboard':   navigate('/app');              break;
      case 'tasks':       navigate('/app/auto-gestion'); break;
      case 'profile':     navigate('/app/perfil');       break;
      case 'cursos':      navigate('/app/manuales');     break;
      case 'reglamento':  navigate('/app/comunicados');  break;
      case 'utilidades':  navigate('/app/utilidades');   break;
      case 'clientes':    navigate('/app/mis-clientes'); break;
      default:            navigate('/app');
    }
  };

  const NavBtn = ({ tab, icon, label }) => (
    <button
      type="button"
      onClick={() => handleNavigation(tab)}
      className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
        activeTab === tab
          ? 'bg-white/10 text-white shadow-lg'
          : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <aside className="sticky top-0 z-20 flex h-screen w-64 shrink-0 flex-col bg-[#001e33] text-white shadow-2xl">
      <div className="p-8 pb-6">
        <h1 className="text-xl font-bold uppercase leading-none tracking-tighter text-white">
          RUSSELL
          <br />
          <span className="text-lg font-light tracking-normal text-slate-400">BEDFORD</span>
        </h1>
        <div className="mt-2 inline-block rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-blue-400">
          Portal empleado
        </div>
      </div>

      <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001e33] text-sm font-bold text-white ring-1 ring-white/20">
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{nombreUsuario}</p>
            <p className="truncate text-[11px] text-slate-400">{areaUsuario}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-4">
        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Mi espacio</p>
        <NavBtn tab="dashboard"  icon={<LayoutDashboard size={18} />} label="Mi resumen" />
        <NavBtn tab="tasks"      icon={<ClipboardList size={18} />}   label="Mis tareas" />
        <NavBtn tab="clientes"   icon={<Building2 size={18} />}      label="Mis clientes" />
        <NavBtn tab="profile"    icon={<UserCircle size={18} />}      label="Mi perfil" />

        <p className="px-4 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recursos</p>
        <NavBtn tab="cursos"     icon={<PlayCircle size={18} />}  label="Cursos" />
        <NavBtn tab="reglamento" icon={<BookOpen size={18} />}    label="Reglamento" />
        <NavBtn tab="utilidades" icon={<Wrench size={18} />}      label="Herramientas" />
      </nav>

      <div className="border-t border-white/5 p-5">
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <LogOut size={16} />
          Salir del portal
        </button>
      </div>
    </aside>
  );
};
