import {

  LayoutDashboard,

  Users,

  Wrench,

  BookOpen,

  Settings,

  LogOut,

  UserCircle,

  CalendarDays

} from 'lucide-react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';



export const Admin2Sidebar = ({ activeTab, setActiveTab }) => {

  const navigate = useNavigate();

  const { logout } = useAuth();



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



      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">

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



        {/* CALENDARIO DE TAREAS */}

        <button 

          onClick={() => handleNavigation('tasks')} 

          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${

            activeTab === 'tasks' 

            ? 'bg-white/10 text-white shadow-lg' 

            : 'text-slate-400 hover:text-white hover:bg-white/5'

          }`}

        >

          <CalendarDays size={18}/> Calendario Tareas

        </button>



        {/* HERRAMIENTAS */}

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



        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Documentación</div>



        <button
          onClick={() => handleNavigation('reglamento')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'reglamento'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <BookOpen size={18}/> Reglamento
        </button>



        <div className="pt-4 pb-2 px-4 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Cuenta</div>

        <button
          onClick={() => handleNavigation('profile')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'profile'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <UserCircle size={18}/> Mi Perfil
        </button>

        <button
          onClick={() => handleNavigation('configuraciones')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'configuraciones'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings size={18}/> Configuraciones
        </button>

      </nav>



      {/* Logout */}

      <div className="p-6 border-t border-white/5">

        <button 

          onClick={async () => {

            try {

              await logout();

              navigate('/');

            } catch (error) {

              console.error('Error al cerrar sesión:', error);

              navigate('/');

            }

          }}

          className="flex items-center gap-3 text-slate-400 hover:text-red-400 transition-colors text-sm font-medium w-full text-left px-4"

        >

          <LogOut size={16} /> Cerrar Sesión

        </button>

      </div>

    </aside>

  );

};