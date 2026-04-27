import { 
  LayoutDashboard, 
  FileEdit, 
  Image as ImageIcon, 
  Calendar, 
  History, 
  Settings, 
  LogOut,
  UserCircle
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
      case 'content':   navigate('/editor/articulos'); break;
      case 'media':     navigate('/editor/biblioteca'); break;
      case 'tasks':     navigate('/editor/tareas'); break;
      case 'perfil':    navigate('/editor/perfil'); break;
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

        {/* GESTIÓN DE CONTENIDO */}
        <button 
          onClick={() => handleNavigation('content')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'content' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileEdit size={18}/> Mis Artículos
        </button>

        {/* BIBLIOTECA DE MEDIOS */}
        <button 
          onClick={() => handleNavigation('media')} 
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'media' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ImageIcon size={18}/> Multimedia
        </button>

        {/* SECCIONES DE PLANIFICACIÓN */}
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

        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <History size={18}/> Historial Cambios
        </div>
        
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