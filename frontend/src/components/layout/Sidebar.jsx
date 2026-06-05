import { LayoutDashboard, Users, Database, Settings, LogOut, CalendarDays, Key, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import rbLogo from '../../assets/russell-bedford-logo.png';

export const Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    navigate('/admin');
    onClose?.();
  };

  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/';
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      window.location.href = '/';
    }
  };

  return (
    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-[#001871] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="flex items-center justify-between p-6 pb-4">
        <img
          src={rbLogo}
          alt="Russell Bedford GCT"
          className="h-10 w-auto drop-shadow-lg hover:drop-shadow-xl transition-all duration-300"
        />
        <button type="button" onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors">
          <X size={20} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menú Principal</p>

        {[
          { tab: 'dashboard', icon: <LayoutDashboard size={18}/>, label: 'Panel General' },
          { tab: 'users',     icon: <Users size={18}/>,           label: 'Gestión de Personal' },
          { tab: 'tasks',     icon: <CalendarDays size={18}/>,    label: 'Calendario Tareas' },
          { tab: 'logs',      icon: <Database size={18}/>,        label: 'Logs de n8n' },
        ].map(({ tab, icon, label }) => (
          <button key={tab} onClick={() => handleNavigation(tab)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === tab ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {icon} {label}
          </button>
        ))}

        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Configuración</div>

        {[
          { tab: 'settings', icon: <Settings size={18}/>, label: 'Ajustes Sistema' },
          { tab: 'apikeys',  icon: <Key size={18}/>,      label: 'API Keys' },
        ].map(({ tab, icon, label }) => (
          <button key={tab} onClick={() => handleNavigation(tab)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === tab ? 'bg-white/10 text-white shadow-inner' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {icon} {label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-white/5">
        <button onClick={handleLogout}
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full group"
        >
          <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};
