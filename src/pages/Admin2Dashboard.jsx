import { useState } from 'react'; 
import { Admin2Sidebar } from '../components/layout/Admin2Sidebar'; // Importación corregida
import { Link, useLocation, Outlet } from 'react-router-dom'; // Añadido Outlet
import { Users, UserCheck, Clock, FileBarChart, UserPlus, ClipboardList } from 'lucide-react';

import UserTable from '../components/users/UserTable';
import CreateUserPage from '../components/users/CreateUserPage';

const Admin2Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();

  const renderContent = () => {
    // Si estamos en la raíz de admin2 y la pestaña es dashboard, mostramos las stats
    if ((location.pathname === '/admin2' || location.pathname === '/admin2/') && activeTab === 'dashboard') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Métricas Operativas para Admin Normal */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard label="Mi Equipo" value="42" icon={<Users size={18}/>} subtext="Colaboradores asignados" />
            <StatCard label="Asistencia Hoy" value="38/42" icon={<UserCheck size={18} className="text-emerald-600"/>} subtext="90.4% de cumplimiento" color="text-emerald-600" />
            <StatCard label="Pendientes de Turno" value="05" icon={<Clock size={18}/>} subtext="Validaciones pendientes" />
            <StatCard label="Reportes Semanales" value="12" icon={<FileBarChart size={18}/>} subtext="Actualizado hoy" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Actividad de Personal */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#001e33]">Actividad de mi Sucursal</h3>
                <button onClick={() => setActiveTab('users')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#001e33] transition-colors">Ver Directorio</button>
              </div>
              <div className="space-y-1">
                <RecentUserRow name="Andrés Felipe Cano" time="Hace 5 min" role="Analista" action="Entrada Registrada" />
                <RecentUserRow name="Sofia Vergara" time="Hace 12 min" role="Asistente" action="Entrada Registrada" />
                <RecentUserRow name="Mateo Gómez" time="Ayer" role="Consultor" action="Salió de Turno" />
              </div>
            </div>

            {/* Acciones de Gestión Operativa */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-100 rounded-xl"><ClipboardList size={20} /></div>
                 <h3 className="font-bold text-[#001e33]">Gestión Rápida</h3>
              </div>
              <div className="space-y-3">
                <ActionButton label="Descargar Reporte" icon={<FileBarChart size={14}/>} />
                <ActionButton label="Validar Jornadas" icon={<UserCheck size={14}/>} primary />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Si la pestaña es 'users' pero estamos en la raíz /admin2, mostramos la tabla
    if (activeTab === 'users' && (location.pathname === '/admin2' || location.pathname === '/admin2/')) {
        return (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <UserTable />
            </div>
        );
    }

    // Para cualquier otra sub-ruta (como /admin2/usuarios/nuevo), usamos Outlet
    return <Outlet />;
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      {/* CORRECCIÓN: Usar la sidebar de Admin2 */}
      <Admin2Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Gestión de Sucursal</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {location.pathname.includes('nuevo') ? 'Registro de Miembro' : (activeTab === 'dashboard' ? 'Resumen de Equipo' : 'Gestión de Personal')}
            </h2>
          </div>

          {activeTab === 'users' && !location.pathname.includes('nuevo') && (
            <div className="flex items-center gap-4 animate-in fade-in duration-300">
              <Link to="/admin2/usuarios/nuevo" className="bg-[#001e33] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-blue-900/20 transition-all">
                <UserPlus size={16} /> Añadir Colaborador
              </Link>
            </div>
          )}
        </header>

        <div className="p-10 overflow-auto flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTES AUXILIARES ---
const StatCard = ({ label, value, icon, subtext, color = "text-[#001e33]" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all duration-300 overflow-hidden">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[#001e33]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);

const RecentUserRow = ({ name, time, role, action }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center font-bold text-[#001e33] text-xs">{name.charAt(0)}</div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{name}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">{role}</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-[10px] font-bold text-emerald-600 uppercase">{action}</p>
      <p className="text-[10px] text-slate-400 font-medium">{time}</p>
    </div>
  </div>
);

const ActionButton = ({ label, icon, primary }) => (
  <button className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
    primary ? 'bg-[#001e33] text-white hover:bg-slate-800' : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
  }`}>
    {icon} {label}
  </button>
);

export default Admin2Dashboard;