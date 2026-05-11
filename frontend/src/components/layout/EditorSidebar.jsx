import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  LogOut,
  UserCircle,
  BookOpen,
  Wrench
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export const EditorSidebar = ({ activeTab, setActiveTab }) => {
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
    <aside className="w-64 bg-[#001e33] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">
      {/* Branding */}
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
          RUSSELL<br/>
          <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
        </h1>
        <div className="mt-2 inline-block px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 uppercase tracking-widest">
          Content Editor
        </div>
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