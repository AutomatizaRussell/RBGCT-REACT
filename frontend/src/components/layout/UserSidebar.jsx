import {
  LayoutDashboard, ClipboardList, UserCircle, LogOut,
  BookOpen, PlayCircle, Wrench, Building2, X, FileText,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useEffect, useState } from 'react';
import rbLogo from '../../assets/russell-bedford-logo.png';
import { getAllCursos } from '../../lib/api';

const NavBtn = ({ tab, icon, label, activeTab, onNavigate }) => (
  <button
    type="button"
    onClick={() => onNavigate(tab)}
    className={`flex w-full items-center gap-4 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
      activeTab === tab ? 'bg-white/10 text-white shadow-lg' : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    {icon} {label}
  </button>
);

export const UserSidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout, empleadoData } = useAuth();

  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador';

  const inicial = nombreUsuario.charAt(0).toUpperCase();
  const areaUsuario = empleadoData?.nombre_area || empleadoData?.nombre_cargo || 'Colaborador';

  const handleLogout = async () => {
    try { await logout(); navigate('/'); }
    catch { navigate('/'); }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    onClose?.();
    switch (tab) {
      case 'dashboard':   navigate('/app');              break;
      case 'tasks':       navigate('/app/auto-gestion'); break;
      case 'profile':     navigate('/app/perfil');       break;
      case 'cursos':      navigate('/app/manuales');     break;
      case 'reglamento':  navigate('/app/comunicados');  break;
      case 'utilidades':  navigate('/app/utilidades');   break;
      case 'clientes':    navigate('/app/mis-clientes'); break;
      case 'sqf':         navigate('/app/sqf');             break;
      default:            navigate('/app');
    }
  };

  const tieneSQF = Boolean(empleadoData?.acceso_formularios_sqf);

  const [tieneCursos, setTieneCursos] = useState(false);
  useEffect(() => {
    getAllCursos()
      .then(data => setTieneCursos((Array.isArray(data) ? data : data?.results || []).some(c => c.activo !== false)))
      .catch(() => {});
  }, []);

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-[#001871] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex-1">
          <img
            src={rbLogo}
            alt="Russell Bedford GCT"
            className="h-10 w-auto drop-shadow-lg hover:drop-shadow-xl transition-all duration-300"
          />
          <div className="mt-3 inline-block rounded border border-blue-500/30 bg-blue-500/15 px-2 py-0.5 text-[8px] font-bold uppercase tracking-widest text-blue-300">
            Portal Empleado
          </div>
        </div>
        <button type="button" onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors self-start mt-1">
          <X size={20} />
        </button>
      </div>

      <div className="mx-4 mb-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#001871] text-sm font-bold text-white ring-1 ring-white/20">
            {inicial}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{nombreUsuario}</p>
            <p className="truncate text-[11px] text-slate-400">{areaUsuario}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto no-scrollbar px-4 pb-4">
        <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Mi espacio</p>
        <NavBtn tab="dashboard"  icon={<LayoutDashboard size={18} />} label="Mi resumen" activeTab={activeTab} onNavigate={handleNavigation} />
        <NavBtn tab="tasks"      icon={<ClipboardList size={18} />}   label="Auto gestión" activeTab={activeTab} onNavigate={handleNavigation} />
        <NavBtn tab="clientes"   icon={<Building2 size={18} />}       label="Mis clientes" activeTab={activeTab} onNavigate={handleNavigation} />
        <NavBtn tab="profile"    icon={<UserCircle size={18} />}      label="Mi perfil" activeTab={activeTab} onNavigate={handleNavigation} />

        <p className="px-4 pb-2 pt-5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Recursos</p>
        {tieneCursos && (
          <NavBtn tab="cursos" icon={<PlayCircle size={18} />} label="Cursos" activeTab={activeTab} onNavigate={handleNavigation} />
        )}
        <NavBtn tab="reglamento" icon={<BookOpen size={18} />}    label="Reglamento" activeTab={activeTab} onNavigate={handleNavigation} />
        <NavBtn tab="utilidades" icon={<Wrench size={18} />}      label="Herramientas" activeTab={activeTab} onNavigate={handleNavigation} />
        {tieneSQF && (
          <NavBtn tab="sqf" icon={<FileText size={18} />} label="Formularios SQF" activeTab={activeTab} onNavigate={handleNavigation} />
        )}
      </nav>

      <div className="border-t border-white/5 p-5">
        <button type="button" onClick={handleLogout}
          className="flex w-full items-center gap-3 text-sm font-medium text-slate-400 transition-colors hover:text-white"
        >
          <LogOut size={16} /> Salir del portal
        </button>
      </div>
    </aside>
  );
};
