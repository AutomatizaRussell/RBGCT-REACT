import { useState } from 'react'; 
import { Sidebar } from '../components/layout/Sidebar';
import { Link, useLocation } from 'react-router-dom';
import { Users, Activity, ShieldAlert, Zap, Database, UserPlus } from 'lucide-react'; // Search removido

import UserTable from '../components/users/UserTable';
import CreateUserPage from '../components/users/CreateUserPage';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();

  const renderContent = () => {
    if (location.pathname === '/admin/usuarios/nuevo') {
      return <CreateUserPage />;
    }

    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard label="Colaboradores Activos" value="124" icon={<Users size={18}/>} subtext="+3.2% vs mes anterior" />
            <StatCard label="Integración n8n" value="Estable" icon={<Zap size={18} className="text-emerald-600"/>} subtext="Ping: 42ms | Webhooks OK" color="text-emerald-600" />
            <StatCard label="Alertas del Sistema" value="0" icon={<ShieldAlert size={18}/>} subtext="Sin incidentes críticos" />
            <StatCard label="Usuarios Concurrentes" value="18" icon={<Activity size={18}/>} subtext="Uso promedio de red" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#001e33]">Actividad Reciente</h3>
                <button onClick={() => setActiveTab('users')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#001e33] transition-colors">Administrar Todo</button>
              </div>
              <div className="space-y-1">
                <RecentUserRow name="John Stiben Garcia" time="11:30 AM" role="Super Admin" action="Creó Usuario" />
                <RecentUserRow name="Ana Maria Lopez" time="10:45 AM" role="Consultor" action="Accedió a logs" />
                <RecentUserRow name="Carlos Ruíz" time="09:12 AM" role="Auditor" action="Actualizó Rol" />
              </div>
            </div>
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-100 rounded-xl"><Database size={20} /></div>
                 <h3 className="font-bold text-[#001e33]">Estado de Datos</h3>
              </div>
              <div className="space-y-3">
                <ActionButton label="Exportar Base de Datos" icon={<Database size={14}/>} />
                <ActionButton label="Sincronizar n8n" icon={<Zap size={14}/>} primary />
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        <UserTable />
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Control Global</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {location.pathname === '/admin/usuarios/nuevo' ? 'Nuevo Registro' : (activeTab === 'dashboard' ? 'Panel General' : 'Gestión de Personal')}
            </h2>
          </div>

          {activeTab === 'users' && location.pathname !== '/admin/usuarios/nuevo' && (
            <div className="flex items-center gap-4 animate-in fade-in duration-300">
              {/* Buscador removido de aquí */}
              <Link to="/admin/usuarios/nuevo" className="bg-[#001e33] text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-blue-900/20 transition-all">
                <UserPlus size={16} /> Añadir Registro
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

// --- COMPONENTES (INTACTOS) ---
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

export default AdminDashboard;