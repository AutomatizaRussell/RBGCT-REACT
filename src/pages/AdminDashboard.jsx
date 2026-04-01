import { useState, useEffect } from 'react'; 
import { Sidebar } from '../components/layout/Sidebar';
import { Link, useLocation } from 'react-router-dom';
import { Users, Activity, ShieldAlert, Zap, Database, UserPlus, KeyRound, Check } from 'lucide-react';
import { supabase } from "../lib/supabase"; 

import UserTable from '../components/users/UserTable';
import CreateUserPage from '../components/users/CreateUserPage';

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentActivity, setRecentActivity] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({ activeCount: 0, loading: true });
  const [alertasCount, setAlertasCount] = useState(0);
  const [concurrentUsers, setConcurrentUsers] = useState(0); // Estado para usuarios reales
  const location = useLocation();

  // --- FUNCIONES DE CARGA ---

  const fetchStats = async () => {
    try {
      const { count, error } = await supabase
        .from('datos_empleado') 
        .select('*', { count: 'exact', head: true })
        .eq('estado', 'ACTIVA'); // Filtra por estado activo
      if (!error) setEmployeeStats({ activeCount: count || 0, loading: false });
    } catch (err) {
      setEmployeeStats({ activeCount: 0, loading: false });
    }
  };

  const fetchAlertsCount = async () => {
    const { count, error } = await supabase
      .from('solicitudes_password')
      .select('*', { count: 'exact', head: true })
      .eq('leida', false); // Solo alertas no gestionadas
    if (!error) setAlertasCount(count || 0);
  };

  const fetchConcurrentUsers = async () => {
    try {
      // Definimos "concurrente" como alguien con actividad en los últimos 10 minutos
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { count, error } = await supabase
        .from('auth_users_view')
        .select('*', { count: 'exact', head: true })
        .gt('last_sign_in_at', tenMinutesAgo);
      
      if (!error) setConcurrentUsers(count || 0);
    } catch (err) {
      console.error("Error concurrentes:", err);
    }
  };

  const fetchAllActivity = async () => {
    try {
      setLoading(true);
      // Logins recientes
      const { data: logins } = await supabase
        .from('auth_users_view') 
        .select('*')
        .not('last_sign_in_at', 'is', null) 
        .order('last_sign_in_at', { ascending: false })
        .limit(5);

      // Alertas pendientes
      const { data: alertas } = await supabase
        .from('solicitudes_password')
        .select(`id, fecha_solicitud, datos_empleado (correo_corporativo)`)
        .eq('leida', false)
        .order('fecha_solicitud', { ascending: false });

      const formattedLogins = (logins || []).map(user => ({
        id: user.id,
        name: user.email.split('@')[0],
        role: user.raw_user_meta_data?.role || 'Usuario',
        time: user.last_sign_in_at,
        action: "En Línea",
        type: 'login'
      }));

      const formattedAlerts = (alertas || []).map(alerta => ({
        id: alerta.id,
        name: alerta.datos_empleado?.correo_corporativo.split('@')[0] || 'Desconocido',
        role: 'Solicitante',
        time: alerta.fecha_solicitud,
        action: "Pidió Clave",
        type: 'alert'
      }));

      const combined = [...formattedAlerts, ...formattedLogins]
        .sort((a, b) => new Date(b.time) - new Date(a.time))
        .slice(0, 6);

      setRecentActivity(combined);
    } catch (err) {
      console.error("Error:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- MANEJADOR DE INTERACCIÓN ---

  const handleMarkAsRead = async (idSolicitud) => {
    try {
      const { error } = await supabase
        .from('solicitudes_password')
        .update({ leida: true }) // Cambia estado a leída
        .eq('id', idSolicitud);

      if (error) throw error;
      
      fetchAlertsCount();
      fetchAllActivity();
    } catch (err) {
      alert("No se pudo gestionar: " + err.message);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlertsCount();
    fetchConcurrentUsers();
    
    if (activeTab === 'dashboard') {
      fetchAllActivity();
      // Auto-actualizar cada minuto los usuarios en línea
      const interval = setInterval(fetchConcurrentUsers, 60000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const renderContent = () => {
    if (location.pathname === '/admin/usuarios/nuevo') return <CreateUserPage />;

    if (activeTab === 'dashboard') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard 
              label="Colaboradores Activos" 
              value={employeeStats.loading ? "..." : employeeStats.activeCount.toString()} 
              icon={<Users size={18}/>} 
              subtext="Estado: ACTIVA en rbgct" 
            />
            <StatCard label="Integración n8n" value="Estable" icon={<Zap size={18} className="text-emerald-600"/>} subtext="Ping: 42ms | Webhooks OK" color="text-emerald-600" />
            
            <StatCard 
              label="Alertas del Sistema" 
              value={alertasCount.toString()} 
              icon={<ShieldAlert size={18} className={alertasCount > 0 ? "text-red-500" : ""}/>} 
              subtext={alertasCount > 0 ? `${alertasCount} solicitudes pendientes` : "Sin incidentes críticos"} 
              color={alertasCount > 0 ? "text-red-600" : "text-[#001e33]"}
            />

            <StatCard 
              label="Usuarios Concurrentes" 
              value={concurrentUsers.toString()} 
              icon={<Activity size={18}/>} 
              subtext="Activos (últimos 10 min)" 
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#001e33]">Actividad Reciente</h3>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Logins y alertas en tiempo real</p>
              </div>
              
              <div className="space-y-1">
                {loading ? (
                  <div className="py-10 text-center text-xs text-slate-400 animate-pulse">Sincronizando...</div>
                ) : recentActivity.length > 0 ? (
                  recentActivity.map((item, idx) => (
                    <RecentUserRow 
                      key={idx}
                      name={item.name} 
                      time={item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'} 
                      role={item.role} 
                      action={item.action} 
                      isAlert={item.type === 'alert'}
                      onMarkRead={() => handleMarkAsRead(item.id)}
                    />
                  ))
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-50 rounded-2xl">
                    <Users size={24} className="opacity-20 mb-2" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">Sin actividad reciente</p>
                  </div>
                )}
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
    return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><UserTable /></div>;
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
        </header>
        <div className="p-10 overflow-auto flex-1">{renderContent()}</div>
      </main>
    </div>
  );
};

const StatCard = ({ label, value, icon, subtext, color = "text-[#001e33]" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[#001e33]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);

const RecentUserRow = ({ name, time, role, action, isAlert, onMarkRead }) => (
  <div className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 px-3 rounded-2xl transition-colors ${isAlert ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${isAlert ? 'bg-red-600' : 'bg-[#001e33]'} text-white rounded-xl flex items-center justify-center font-bold text-xs`}>
        {isAlert ? <KeyRound size={16}/> : name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{name}</p>
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-500' : 'text-slate-400'}`}>{role}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>{action}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
      {isAlert && (
        <button 
          onClick={onMarkRead}
          className="p-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          title="Marcar como gestionada"
        >
          <Check size={14} />
        </button>
      )}
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