import {
  LayoutDashboard,
  Users,
  Wrench,
  BookOpen,
  Settings,
  LogOut,
  UserCircle,
  CalendarDays,
  FileText,
  Building2,
  ClipboardList,
  X,
} from 'lucide-react';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getCertPermisosBackend } from '../../lib/api';



export const Admin2Sidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {

  const navigate = useNavigate();

  const { logout, empleadoData } = useAuth();
  const [puedeExpedirCert, setPuedeExpedirCert] = useState(false);

  useEffect(() => {
    if (!empleadoData?.id_empleado) return;
    getCertPermisosBackend()
      .then(res => {
        const ids = (res.permisos || []).map(String);
        setPuedeExpedirCert(ids.includes(String(empleadoData.id_empleado)));
      })
      .catch(() => {});
  }, [empleadoData?.id_empleado]);



  // Función para navegar dentro del módulo de Admin Normal

  const handleNavigation = (tab) => {
    setActiveTab(tab);
    navigate('/admin2');
    onClose?.();
  };



  return (

    <aside className={`fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-[#001871] text-white shadow-2xl transition-transform duration-300 ease-in-out lg:sticky lg:top-0 lg:translate-x-0 lg:z-20 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>

      {/* Branding */}
      <div className="flex items-center justify-between p-8 pb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tighter uppercase leading-none text-white">
            RUSSELL<br/>
            <span className="text-slate-400 font-light text-lg tracking-normal">BEDFORD</span>
          </h1>
          <div className="mt-2 inline-block px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 rounded text-[9px] font-bold text-blue-400 uppercase tracking-widest">
            Administrative Mode
          </div>
        </div>
        <button type="button" onClick={onClose} className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors self-start mt-1">
          <X size={20} />
        </button>
      </div>



      <nav className="flex-1 px-4 space-y-1 overflow-y-auto no-scrollbar">

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



        {/* AUTO GESTIÓN */}
        <button
          onClick={() => handleNavigation('autogestion')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'autogestion'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <ClipboardList size={18}/> Auto Gestión
        </button>

        {/* CONTRATOS */}
        <button
          onClick={() => handleNavigation('contratos')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'contratos'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <FileText size={18}/> Contratos
        </button>

        {/* CLIENTES CRM */}
        <button
          onClick={() => handleNavigation('clientes')}
          className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
            activeTab === 'clientes'
            ? 'bg-white/10 text-white shadow-lg'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          <Building2 size={18}/> Clientes
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

        {/* CERTIFICADO DE EMPLEO — solo si tiene permiso */}
        {puedeExpedirCert && (
          <button
            onClick={() => handleNavigation('certificado')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all font-medium text-sm ${
              activeTab === 'certificado'
              ? 'bg-white/10 text-white shadow-lg'
              : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <FileText size={18}/> Certificado de Empleo
          </button>
        )}



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