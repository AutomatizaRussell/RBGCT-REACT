import {
  LayoutDashboard,
  Calendar,
  History,
  LogOut,
  UserCircle,
  BookOpen,
  Wrench,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import rbLogo from '../../assets/russell-bedford-logo.png';

export const EditorSidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      navigate('/');
    }
  };

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    onClose?.();
    switch (tab) {
      case 'dashboard': navigate('/editor'); break;
      case 'tasks':     navigate('/editor/tareas'); break;
      case 'cursos':    navigate('/editor/cursos'); break;
      case 'historial':   navigate('/editor/historial'); break;
      case 'herramientas':  navigate('/editor/herramientas'); break;
      case 'perfil':      navigate('/editor/perfil'); break;
      default:          navigate('/editor');
    }
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-[#001871] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      {/* Branding */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex-1">
          <img
            src={rbLogo}
            alt="Russell Bedford GCT"
            className="h-10 w-auto drop-shadow-lg hover:drop-shadow-xl transition-all duration-300"
          />
          <div className="mt-3 inline-block px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 rounded text-[8px] font-bold text-emerald-300 uppercase tracking-widest">
            Content Editor
          </div>
        </div>
        <button type="button" onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors self-start mt-1">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Escritorio</p>
        
        {/* PANEL GENERAL */}
        <button 
          onClick={() => handleNavigation('dashboard')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'dashboard' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={18}/> Panel Editorial
        </button>

        {/* CONTENIDO */}
        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Contenido</div>

        <button
          onClick={() => handleNavigation('cursos')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'cursos'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen size={18}/> Cursos
        </button>

        <button
          onClick={() => handleNavigation('historial')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'historial'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <History size={18}/> Historial
        </button>

        {/* PLANIFICACIÓN */}
        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Planificación</div>

        <button
          onClick={() => handleNavigation('tasks')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'tasks'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Calendar size={18}/> Calendario Tareas
        </button>

        <button
          onClick={() => handleNavigation('herramientas')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'herramientas'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Wrench size={18}/> Herramientas
        </button>

        {/* CUENTA */}
        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cuenta</div>

        <button
          onClick={() => handleNavigation('perfil')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'perfil'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCircle size={18}/> Mi Perfil
        </button>
      </nav>

      {/* Logout */}
      <div className="p-6 border-t border-white/5">
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full text-left px-4"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};