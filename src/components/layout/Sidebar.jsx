import { LayoutDashboard, Users, ShieldCheck, Database, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Importamos el navegador

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate(); // 2. Inicializamos la navegación

  // 3. Función maestra para cambiar de pestaña y limpiar la URL
  const handleNavigation = (tab) => {
    setActiveTab(tab);
    navigate('/admin'); // Esto nos saca de "usuarios/nuevo" y nos regresa al dashboard base
  };

  return (
    <aside className="w-64 bg-[#001e33] text-white flex flex-col h-screen sticky top-0 shadow-2xl z-20">
      <div className="p-8">
        <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
          RUSSELL<br/>
          <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        <p className="px-4 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Menú Principal</p>
        
        {/* BOTÓN: PANEL GENERAL */}
        <button 
          onClick={() => handleNavigation('dashboard')} // 4. Ahora usa la función de navegación
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'dashboard' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <LayoutDashboard size={18}/> Panel General
        </button>

        {/* BOTÓN: GESTIÓN DE PERSONAL */}
        <button 
          onClick={() => handleNavigation('users')} // 4. Ahora usa la función de navegación
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'users' 
            ? 'bg-white/10 text-white shadow-lg' 
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={18}/> Gestión de Personal
        </button>

        {/* Los demás se mantienen bloqueados como los tenías */}
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <ShieldCheck size={18}/> Roles y Permisos
        </div>
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <Database size={18}/> Logs de n8n
        </div>
        
        <div className="pt-6 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Configuración</div>
        <div className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-slate-600 cursor-not-allowed opacity-50 text-sm">
          <Settings size={18}/> Ajustes Sistema
        </div>
      </nav>

      <div className="p-6 border-t border-white/5">
        <button 
          onClick={() => navigate('/')} // Opcional: Mandar al login
          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full text-left"
        >
          <LogOut size={16} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};