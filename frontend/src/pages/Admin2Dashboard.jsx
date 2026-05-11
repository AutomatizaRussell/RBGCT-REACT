import { useState, useEffect } from 'react';
import { Admin2Sidebar } from '../components/layout/Admin2Sidebar';
import { useLocation, Outlet } from 'react-router-dom';
import {
  Users, Activity, ShieldAlert, UserCheck,
  KeyRound, Check, X, Eye, Trash2, CheckCircle,
  AlertTriangle, ClipboardList, FileBarChart,
  Wrench, BookOpen, Settings, Plus, Building2, Briefcase,
  ShieldCheck, Lock, Info, Pencil,
  TrendingUp, RefreshCw, Calendar, Bell, UserX,
  CheckCircle2, Clock, BarChart2, ArrowRight
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  getAllEmpleados,
  getAllTareas,
  getActividadReciente,
  getAlertasRecuperacion,
  atenderAlerta,
  eliminarAlerta,
  getAllAreas,
  createArea,
  updateArea,
  deleteArea,
  getAllCargos,
  createCargo,
  updateCargo,
  deleteCargo,
  habilitarEdicionDatos,
  actualizarPasswordEmpleado,
  getAllReglamento,
  createReglamentoItem,
  updateReglamentoItem,
  deleteReglamentoItem,
  moverReglamentoItem,
} from '../lib/api';

import UserTable from '../components/users/UserTable';
import UserProfile from '../components/users/UserProfile';
import TaskDashboard from '../components/tasks/TaskDashboard';
import CursosSection from '../components/admin2/CursosSection';
import UtilidadesSection from '../components/admin2/UtilidadesSection';
import ContratosSection from '../components/admin2/ContratosSection';
import ClientesSection from '../components/admin2/ClientesSection';
import StatCard from '../components/ui/StatCard';
import RecentUserRow from '../components/ui/RecentUserRow';
import ActionButton from '../components/ui/ActionButton';

const Admin2Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({ totalCount: 0, activeCount: 0, loading: true });
  const [alertasCount, setAlertasCount] = useState(0);
  const [alertasRecuperacion, setAlertasRecuperacion] = useState([]);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState(0);
  const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0, total: 0 });
  const [areaStats, setAreaStats] = useState([]);
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const { user } = useAuth();

  const fetchStats = async () => {
    try {
      const [empleados, tareas] = await Promise.all([getAllEmpleados(), getAllTareas()]);
      const activos = empleados.filter(e => e.estado === 'ACTIVA');
      setEmployeeStats({ totalCount: empleados.length, activeCount: activos.length, loading: false });

      // Tareas
      const pending    = tareas.filter(t => t.estado === 'pendiente').length;
      const inProgress = tareas.filter(t => t.estado === 'en_proceso').length;
      const completed  = tareas.filter(t => t.estado === 'completada').length;
      setTaskStats({ pending, inProgress, completed, total: tareas.length });

      // Distribución por área
      const areaMap = {};
      activos.forEach(e => {
        const nombre = e.nombre_area || 'Sin área';
        areaMap[nombre] = (areaMap[nombre] || 0) + 1;
      });
      const sorted = Object.entries(areaMap)
        .map(([nombre, count]) => ({ nombre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 6);
      setAreaStats(sorted);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error stats:', err);
      setEmployeeStats({ totalCount: 0, activeCount: 0, loading: false });
    }
  };

  const fetchAlertsCount = async () => {
    try {
      const res = await getAlertasRecuperacion();
      if (res?.alertas) {
        setAlertasRecuperacion(res.alertas);
        setAlertasCount(res.total || 0);
      }
    } catch (err) {
      console.error('Error alertas:', err);
    }
  };

  const fetchAllActivity = async () => {
    try {
      setLoading(true);
      const actividad = await getActividadReciente();

      const alertasData = alertasRecuperacion.map(a => ({
        id: a.id, name: a.nombre, role: a.rol,
        time: a.timestamp, action: `Recuperación: ${a.email}`,
        type: 'alert', estado: 'alerta', email: a.email
      }));

      const allActivity = [
        ...alertasData,
        ...actividad.activos.map(u => ({
          id: u.id, name: u.nombre, role: u.rol,
          time: u.ultima_actividad, action: 'En Línea',
          type: 'login', estado: 'en_linea'
        })),
        ...actividad.recientes.map(u => ({
          id: u.id, name: u.nombre, role: u.rol,
          time: u.ultima_actividad, action: `Hace ${u.minutos_transcurridos} min`,
          type: 'logout', estado: 'desconectado'
        }))
      ];

      setConcurrentUsers(actividad.total_en_linea);
      setRecentActivity(allActivity);
    } catch (err) {
      console.error('Error actividad:', err);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await atenderAlerta(id);
      fetchAlertsCount();
      fetchAllActivity();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEliminarAlerta = async (id) => {
    if (!confirm('¿Eliminar esta alerta permanentemente?')) return;
    try {
      await eliminarAlerta(id);
      fetchAlertsCount();
      fetchAllActivity();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const showAlertDetail = (alerta) => {
    if (alerta?.empleado_info) {
      const e = alerta.empleado_info;
      alert(`DETALLE:\nNombre: ${e.nombre_completo}\nEmail: ${e.correo}\nÁrea: ${e.area}\nCargo: ${e.cargo}\nEstado: ${e.estado}`);
    } else {
      alert(`NO REGISTRADO:\nEmail: ${alerta?.email}\nNombre: ${alerta?.nombre}`);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlertsCount();
    fetchAllActivity();

    const interval = setInterval(() => {
      fetchStats();
      fetchAlertsCount();
      fetchAllActivity();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'users':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <UserTable />
          </div>
        );
      case 'tasks':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <TaskDashboard />
          </div>
        );
      case 'contratos':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full -m-8">
            <ContratosSection />
          </div>
        );
      case 'clientes':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 h-full -m-8">
            <ClientesSection />
          </div>
        );
      case 'profile':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <UserProfile />
          </div>
        );
      case 'herramientas':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <HerramientasTab />
          </div>
        );
      case 'reglamento':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ReglamentoTab />
          </div>
        );
      case 'configuraciones':
        return (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <ConfiguracionesTab user={user} />
          </div>
        );
      case 'dashboard':
      default: {
        const inactivos = employeeStats.totalCount - employeeStats.activeCount;
        const maxArea = areaStats[0]?.count || 1;
        const hora = new Date().getHours();
        const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';
        const adminName = user?.primer_nombre
          ? `${user.primer_nombre}${user.primer_apellido ? ' ' + user.primer_apellido : ''}`
          : 'Administrador';

        return (
          <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-500">

            {/* Saludo */}
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Panel Administrativo</p>
                <h2 className="text-2xl font-bold text-[#001e33]">{saludo}, {adminName}</h2>
                <p className="text-sm text-slate-400 mt-1">
                  Tienes <span className="font-bold text-amber-500">{taskStats.pending} tarea{taskStats.pending !== 1 ? 's' : ''} pendiente{taskStats.pending !== 1 ? 's' : ''}</span> y{' '}
                  <span className={`font-bold ${alertasCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {alertasCount > 0 ? `${alertasCount} alerta${alertasCount !== 1 ? 's' : ''} activa${alertasCount !== 1 ? 's' : ''}` : 'sin alertas'}
                  </span>
                </p>
              </div>
              <p className="text-xs text-slate-400 hidden lg:block">
                Actualizado: {lastRefresh.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <KpiCard
                label="Personal Total"
                value={employeeStats.loading ? '…' : employeeStats.totalCount}
                sub={`${employeeStats.activeCount} activos · ${inactivos} inactivos`}
                icon={<Users size={20}/>}
                iconBg="bg-blue-50" iconColor="text-blue-600"
                accent="border-l-blue-400"
              />
              <KpiCard
                label="En Línea Ahora"
                value={concurrentUsers}
                sub="Últimos 10 minutos"
                icon={<Activity size={20}/>}
                iconBg="bg-emerald-50" iconColor="text-emerald-600"
                accent="border-l-emerald-400"
                highlight
              />
              <KpiCard
                label="Tareas Activas"
                value={taskStats.inProgress}
                sub={`${taskStats.pending} pendientes · ${taskStats.completed} listas`}
                icon={<ClipboardList size={20}/>}
                iconBg="bg-amber-50" iconColor="text-amber-600"
                accent="border-l-amber-400"
              />
              <KpiCard
                label="Alertas"
                value={alertasCount}
                sub={alertasCount > 0 ? 'Click para gestionar' : 'Sistema sin incidentes'}
                icon={<ShieldAlert size={20}/>}
                iconBg={alertasCount > 0 ? 'bg-red-50' : 'bg-slate-50'}
                iconColor={alertasCount > 0 ? 'text-red-500' : 'text-slate-400'}
                accent={alertasCount > 0 ? 'border-l-red-400' : 'border-l-slate-200'}
                onClick={() => alertasCount > 0 && setShowAlertasModal(true)}
                clickable={alertasCount > 0}
              />
            </div>

            {/* Fila principal */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Distribución por área */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-[#001e33]">Distribución por Área</h3>
                    <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Empleados activos</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl"><BarChart2 size={16} className="text-blue-600"/></div>
                </div>
                {areaStats.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-400">No hay datos de áreas aún</div>
                ) : (
                  <div className="space-y-4">
                    {areaStats.map((a, i) => {
                      const pct = Math.round((a.count / maxArea) * 100);
                      const colors = ['bg-blue-500','bg-emerald-500','bg-violet-500','bg-amber-500','bg-rose-500','bg-cyan-500'];
                      return (
                        <div key={i}>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-700 truncate max-w-[55%]">{a.nombre}</span>
                            <span className="text-xs font-black text-slate-500">{a.count} empleado{a.count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full transition-all duration-700 ${colors[i % colors.length]}`}
                              style={{ width: `${pct}%` }}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Estado del equipo + Acciones */}
              <div className="space-y-5">
                {/* Donut visual estado */}
                <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#001e33] mb-4 text-sm">Estado del Equipo</h3>
                  <div className="flex items-center gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3.5"/>
                        <circle cx="18" cy="18" r="15.9" fill="none" stroke="#10b981" strokeWidth="3.5"
                          strokeDasharray={`${employeeStats.totalCount > 0 ? (employeeStats.activeCount / employeeStats.totalCount * 100) : 0} 100`}
                          strokeLinecap="round"/>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-lg font-black text-[#001e33]">
                          {employeeStats.totalCount > 0 ? Math.round(employeeStats.activeCount / employeeStats.totalCount * 100) : 0}%
                        </span>
                      </div>
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0"/>
                          <span className="text-xs text-slate-600">Activos</span>
                        </div>
                        <span className="text-sm font-black text-emerald-600">{employeeStats.activeCount}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-slate-300 flex-shrink-0"/>
                          <span className="text-xs text-slate-600">Inactivos</span>
                        </div>
                        <span className="text-sm font-black text-slate-500">{inactivos}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0"/>
                          <span className="text-xs text-slate-600">En línea</span>
                        </div>
                        <span className="text-sm font-black text-emerald-500">{concurrentUsers}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                  <h3 className="font-bold text-[#001e33] mb-4 text-sm">Acciones Rápidas</h3>
                  <div className="space-y-2">
                    {[
                      { label: 'Gestionar Personal',  icon: <Users size={14}/>,       tab: 'users',    color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' },
                      { label: 'Calendario Tareas',   icon: <Calendar size={14}/>,    tab: 'tasks',    color: 'hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200' },
                      { label: 'Herramientas',        icon: <Wrench size={14}/>,      tab: 'herramientas', color: 'hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200' },
                      { label: 'Reglamento',          icon: <BookOpen size={14}/>,    tab: 'reglamento', color: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200' },
                    ].map(a => (
                      <button key={a.tab} onClick={() => setActiveTab(a.tab)}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 border border-transparent transition-all ${a.color}`}>
                        <span className="flex items-center gap-2">{a.icon} {a.label}</span>
                        <ArrowRight size={12} className="opacity-40"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Fila inferior: Tareas + Actividad */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Resumen de tareas */}
              <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <h3 className="font-bold text-[#001e33]">Resumen de Tareas</h3>
                  <button onClick={() => setActiveTab('tasks')}
                    className="text-[10px] font-bold text-slate-400 hover:text-[#001e33] uppercase tracking-widest transition-colors flex items-center gap-1">
                    Ver todo <ArrowRight size={10}/>
                  </button>
                </div>
                <div className="space-y-4">
                  {[
                    { label: 'Pendientes',   count: taskStats.pending,    color: 'bg-amber-400',   textColor: 'text-amber-600',   icon: <Clock size={14}/> },
                    { label: 'En Proceso',   count: taskStats.inProgress, color: 'bg-blue-400',    textColor: 'text-blue-600',    icon: <Activity size={14}/> },
                    { label: 'Completadas',  count: taskStats.completed,  color: 'bg-emerald-400', textColor: 'text-emerald-600', icon: <CheckCircle2 size={14}/> },
                  ].map(t => (
                    <div key={t.label} className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg bg-slate-50 ${t.textColor}`}>{t.icon}</div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-slate-600">{t.label}</span>
                          <span className={`text-sm font-black ${t.textColor}`}>{t.count}</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${t.color} transition-all duration-700`}
                            style={{ width: taskStats.total > 0 ? `${(t.count / taskStats.total * 100)}%` : '0%' }}/>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-400">Total registradas</span>
                    <span className="text-sm font-black text-[#001e33]">{taskStats.total}</span>
                  </div>
                </div>
              </div>

              {/* Actividad reciente */}
              <div className="lg:col-span-2 bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                  <div>
                    <h3 className="font-bold text-[#001e33]">Actividad Reciente</h3>
                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight mt-0.5">
                      {concurrentUsers} usuario{concurrentUsers !== 1 ? 's' : ''} en línea ahora
                    </p>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
                </div>
                <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                  {loading ? (
                    <div className="py-8 text-center text-xs text-slate-400 animate-pulse">Sincronizando...</div>
                  ) : recentActivity.length > 0 ? (
                    recentActivity.slice(0, 10).map((item, idx) => (
                      <RecentUserRow
                        key={idx}
                        name={item.name}
                        time={item.time ? new Date(item.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        role={item.role}
                        action={item.action}
                        isAlert={item.type === 'alert'}
                        estado={item.estado}
                        onMarkRead={() => handleMarkAsRead(item.id)}
                        onClick={() => item.type === 'alert' && showAlertDetail(alertasRecuperacion.find(a => a.id === item.id))}
                      />
                    ))
                  ) : (
                    <div className="py-10 flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-50 rounded-2xl">
                      <Users size={24} className="mb-2"/>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      }
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':       return 'Resumen de Equipo';
      case 'users':           return 'Gestión de Personal';
      case 'tasks':           return 'Calendario de Tareas';
      case 'profile':         return 'Mi Perfil';
      case 'contratos':       return 'Contratos Laborales';
      case 'clientes':        return 'Clientes';
      case 'herramientas':    return 'Herramientas';
      case 'reglamento':      return 'Reglamento Interno';
      case 'configuraciones': return 'Configuraciones';
      default:                return 'Panel Administrativo';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      <Admin2Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Gestión Administrativa</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">{getHeaderTitle()}</h2>
          </div>
          <div className="flex items-center gap-4">
            {activeTab === 'dashboard' && (
              <button onClick={() => { fetchStats(); fetchAlertsCount(); fetchAllActivity(); }}
                className="p-2 text-slate-400 hover:text-[#001e33] hover:bg-slate-100 rounded-xl transition-all" title="Actualizar datos">
                <RefreshCw size={16}/>
              </button>
            )}
            <button onClick={() => alertasCount > 0 && setShowAlertasModal(true)}
              className="relative p-2 text-slate-400 hover:text-[#001e33] hover:bg-slate-100 rounded-xl transition-all">
              <Bell size={18}/>
              {alertasCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                  {alertasCount}
                </span>
              )}
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right">
                <p className="text-sm font-bold text-[#001e33]">
                  {user?.primer_nombre ? `${user.primer_nombre} ${user.primer_apellido || ''}` : 'Administrador'}
                </p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}
                </p>
              </div>
              <div className="w-10 h-10 bg-[#001e33] rounded-xl flex items-center justify-center text-white font-black text-sm">
                {user?.primer_nombre?.charAt(0) || 'A'}
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-auto flex-1">
          {renderContent()}
        </div>
      </main>

      <AlertasModal
        isOpen={showAlertasModal}
        onClose={() => setShowAlertasModal(false)}
        alertas={alertasRecuperacion}
        onViewDetail={showAlertDetail}
        onAtender={handleMarkAsRead}
        onEliminar={handleEliminarAlerta}
      />
    </div>
  );
};

// ── Sub-componentes ────────────────────────────────────────────────────────────

const KpiCard = ({ label, value, sub, icon, iconBg, iconColor, accent, highlight, onClick, clickable }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-xl border border-slate-100 p-5 shadow-sm transition-all duration-300
      ${clickable ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'hover:shadow-md'}`}
  >
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2 rounded-lg ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      {highlight && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1"/>}
    </div>
    <p className="text-2xl font-bold text-[#001e33] leading-none mb-1.5">{value}</p>
    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">{label}</p>
    <p className="text-[10px] text-slate-400 mt-0.5 truncate">{sub}</p>
  </div>
);

const AlertasModal = ({ isOpen, onClose, alertas, onViewDetail, onAtender, onEliminar }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl"><AlertTriangle className="text-red-600" size={24}/></div>
            <div>
              <h3 className="text-lg font-bold text-[#001e33]">Alertas del Sistema</h3>
              <p className="text-xs text-slate-500">Solicitudes de recuperación de contraseña</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} className="text-slate-400"/>
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {alertas.length === 0 ? (
            <div className="text-center py-10">
              <ShieldAlert size={48} className="mx-auto text-slate-300 mb-4"/>
              <p className="text-slate-500">No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map(alerta => (
                <div
                  key={alerta.id}
                  className={`p-4 rounded-2xl border ${alerta.usuario_existe ? 'bg-red-50/50 border-red-100' : 'bg-amber-50/50 border-amber-100'}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${alerta.usuario_existe ? 'bg-red-500' : 'bg-amber-500'}`}>
                        {alerta.nombre?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{alerta.nombre || 'Desconocido'}</p>
                        <p className="text-xs text-slate-500">{alerta.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(alerta.timestamp).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${alerta.usuario_existe ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
                        {alerta.usuario_existe ? 'Usuario Existe' : 'No Registrado'}
                      </span>
                      <button
                        onClick={() => onViewDetail(alerta)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={14} className="text-slate-600"/>
                      </button>
                    </div>
                  </div>
                  {alerta.empleado_info && (
                    <div className="mt-3 pt-3 border-t border-red-100/50 text-xs text-slate-600">
                      <span className="font-semibold">Área:</span> {alerta.empleado_info.area || 'N/A'} |{' '}
                      <span className="font-semibold">Cargo:</span> {alerta.empleado_info.cargo || 'N/A'}
                    </div>
                  )}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    <button
                      onClick={() => onAtender(alerta.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <CheckCircle size={14}/> Marcar Atendida
                    </button>
                    <button
                      onClick={() => onEliminar(alerta.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors ml-auto"
                    >
                      <Trash2 size={14}/> Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button onClick={onClose} className="w-full py-3 bg-[#001e33] text-white rounded-xl font-semibold hover:bg-[#003366] transition-colors">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// ── HerramientasTab ────────────────────────────────────────────────────────────

const HerramientasTab = () => {
  const [seccion, setSeccion] = useState('estructura');
  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newArea, setNewArea] = useState('');
  const [newCargo, setNewCargo] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState(null);
  const [editAreaName, setEditAreaName] = useState('');
  const [editingCargoId, setEditingCargoId] = useState(null);
  const [editCargoName, setEditCargoName] = useState('');
  const [empleadosPorArea, setEmpleadosPorArea] = useState({});

  const fetchData = async () => {
    try {
      const [a, c, emps] = await Promise.all([getAllAreas(), getAllCargos(), getAllEmpleados()]);
      setAreas(a);
      setCargos(c);
      const areaCount = {};
      emps.forEach(e => { if (e.nombre_area) areaCount[e.nombre_area] = (areaCount[e.nombre_area] || 0) + 1; });
      setEmpleadosPorArea(areaCount);
    } catch (err) {
      console.error('Error cargando herramientas:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (seccion === 'estructura') fetchData(); }, [seccion]);

  const handleAddArea = async () => {
    if (!newArea.trim()) return;
    setSaving(true);
    try {
      await createArea({ nombre_area: newArea.trim() });
      setNewArea('');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveArea = async (id) => {
    if (!editAreaName.trim()) return;
    try {
      await updateArea(id, { nombre_area: editAreaName.trim() });
      setEditingAreaId(null);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteArea = async (id) => {
    if (!confirm('¿Eliminar esta área?')) return;
    try {
      await deleteArea(id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleAddCargo = async () => {
    if (!newCargo.trim()) return;
    setSaving(true);
    try {
      await createCargo({ nombre_cargo: newCargo.trim() });
      setNewCargo('');
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCargo = async (id) => {
    if (!editCargoName.trim()) return;
    try {
      await updateCargo(id, { nombre_cargo: editCargoName.trim() });
      setEditingCargoId(null);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDeleteCargo = async (id) => {
    if (!confirm('¿Eliminar este cargo?')) return;
    try {
      await deleteCargo(id);
      fetchData();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const SECCIONES = [
    { id: 'estructura', label: 'Estructura', icon: <Building2 size={14}/> },
    { id: 'cursos',     label: 'Cursos',     icon: <Briefcase size={14}/> },
    { id: 'utilidades', label: 'Utilidades', icon: <Wrench size={14}/> },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navegación */}
      <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm w-fit">
        {SECCIONES.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              seccion === s.id ? 'bg-[#001e33] text-white shadow' : 'text-slate-400 hover:text-[#001e33] hover:bg-slate-50'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Estructura: Áreas y Cargos */}
      {seccion === 'estructura' && (
        loading
          ? <div className="py-20 text-center text-sm text-slate-400 animate-pulse">Cargando...</div>
          : <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

              {/* Áreas */}
              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-blue-50 rounded-xl"><Building2 size={20} className="text-blue-600"/></div>
                  <div>
                    <h3 className="font-bold text-[#001e33]">Áreas</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{areas.length} registradas</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
                  {areas.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-4">Sin áreas registradas</p>
                    : areas.map(a => (
                        <div key={a.id}>
                          {editingAreaId === a.id ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-200">
                              <input
                                autoFocus
                                value={editAreaName}
                                onChange={e => setEditAreaName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveArea(a.id); if (e.key === 'Escape') setEditingAreaId(null); }}
                                className="flex-1 bg-transparent text-sm font-medium focus:outline-none text-[#001e33]"
                              />
                              <button onClick={() => handleSaveArea(a.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"><Check size={14}/></button>
                              <button onClick={() => setEditingAreaId(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-all"><X size={14}/></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 group">
                              <div className="flex items-center gap-3 min-w-0">
                                <span className="text-sm font-medium text-[#001e33] truncate">{a.nombre_area}</span>
                                {empleadosPorArea[a.nombre_area] > 0 && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold flex-shrink-0">
                                    {empleadosPorArea[a.nombre_area]}
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingAreaId(a.id); setEditAreaName(a.nombre_area); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Pencil size={13}/></button>
                                <button onClick={() => handleDeleteArea(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13}/></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  }
                </div>
                <div className="flex gap-2">
                  <input value={newArea} onChange={e => setNewArea(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddArea()}
                    placeholder="Nueva área..." className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-400"/>
                  <button onClick={handleAddArea} disabled={saving || !newArea.trim()} className="px-4 py-2.5 bg-[#001e33] text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all"><Plus size={16}/></button>
                </div>
              </div>

              {/* Cargos */}
              <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-emerald-50 rounded-xl"><Briefcase size={20} className="text-emerald-600"/></div>
                  <div>
                    <h3 className="font-bold text-[#001e33]">Cargos</h3>
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{cargos.length} registrados</p>
                  </div>
                </div>
                <div className="space-y-2 mb-6 max-h-72 overflow-y-auto pr-1">
                  {cargos.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-4">Sin cargos registrados</p>
                    : cargos.map(c => (
                        <div key={c.id}>
                          {editingCargoId === c.id ? (
                            <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 rounded-xl border border-emerald-200">
                              <input
                                autoFocus
                                value={editCargoName}
                                onChange={e => setEditCargoName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCargo(c.id); if (e.key === 'Escape') setEditingCargoId(null); }}
                                className="flex-1 bg-transparent text-sm font-medium focus:outline-none text-[#001e33]"
                              />
                              <button onClick={() => handleSaveCargo(c.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-all"><Check size={14}/></button>
                              <button onClick={() => setEditingCargoId(null)} className="p-1.5 text-slate-400 hover:bg-slate-200 rounded-lg transition-all"><X size={14}/></button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 group">
                              <span className="text-sm font-medium text-[#001e33]">{c.nombre_cargo}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => { setEditingCargoId(c.id); setEditCargoName(c.nombre_cargo); }} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"><Pencil size={13}/></button>
                                <button onClick={() => handleDeleteCargo(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={13}/></button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                  }
                </div>
                <div className="flex gap-2">
                  <input value={newCargo} onChange={e => setNewCargo(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddCargo()}
                    placeholder="Nuevo cargo..." className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-400"/>
                  <button onClick={handleAddCargo} disabled={saving || !newCargo.trim()} className="px-4 py-2.5 bg-[#001e33] text-white rounded-xl hover:bg-slate-800 disabled:opacity-40 transition-all"><Plus size={16}/></button>
                </div>
              </div>
            </div>
      )}

      {seccion === 'cursos'     && <CursosSection />}
      {seccion === 'utilidades' && <UtilidadesSection />}
    </div>
  );
};

// ── ReglamentoTab ──────────────────────────────────────────────────────────────

const ReglamentoTab = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({ titulo: '', contenido: '' });
  const [adding, setAdding] = useState(false);
  const [newData, setNewData] = useState({ titulo: '', contenido: '' });
  const [saving, setSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const data = await getAllReglamento();
      setItems(data);
    } catch (err) {
      console.error('Error cargando reglamento:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleEdit = (item) => {
    setEditingId(item.id);
    setEditData({ titulo: item.titulo, contenido: item.contenido });
  };

  const handleSaveEdit = async (id) => {
    if (!editData.titulo.trim()) return;
    setSaving(true);
    try {
      await updateReglamentoItem(id, editData);
      setEditingId(null);
      fetchItems();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta sección del reglamento?')) return;
    try {
      await deleteReglamentoItem(id);
      fetchItems();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleMover = async (id, direccion) => {
    try {
      const updated = await moverReglamentoItem(id, direccion);
      setItems(updated);
    } catch (err) {
      console.error('Error moviendo:', err);
    }
  };

  const handleAdd = async () => {
    if (!newData.titulo.trim()) return;
    setSaving(true);
    try {
      await createReglamentoItem(newData);
      setNewData({ titulo: '', contenido: '' });
      setAdding(false);
      fetchItems();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-20 text-center text-sm text-slate-400 animate-pulse">Cargando reglamento...</div>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl"><BookOpen size={22} className="text-indigo-600"/></div>
          <div>
            <h2 className="text-lg font-black text-[#001e33]">Reglamento Interno de Trabajo</h2>
            <p className="text-xs text-slate-400">Russell Bedford Colombia — {items.length} sección{items.length !== 1 ? 'es' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setAdding(true); setEditingId(null); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          <Plus size={14}/> Agregar Sección
        </button>
      </div>

      {/* Formulario de nueva sección */}
      {adding && (
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-7 space-y-4">
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2">Nueva Sección</p>
          <input
            autoFocus
            value={newData.titulo}
            onChange={e => setNewData(p => ({ ...p, titulo: e.target.value }))}
            placeholder="Título de la sección..."
            className="w-full px-4 py-2.5 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors font-semibold"
          />
          <textarea
            value={newData.contenido}
            onChange={e => setNewData(p => ({ ...p, contenido: e.target.value }))}
            placeholder="Contenido del reglamento... (cada línea será un punto)"
            rows={4}
            className="w-full px-4 py-2.5 text-sm bg-white border border-indigo-200 rounded-xl focus:outline-none focus:border-indigo-400 transition-colors resize-none"
          />
          <div className="flex gap-3">
            <button
              onClick={handleAdd}
              disabled={saving || !newData.titulo.trim()}
              className="px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
            >
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => { setAdding(false); setNewData({ titulo: '', contenido: '' }); }}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de secciones */}
      {items.length === 0 && !adding ? (
        <div className="bg-white rounded-xl border-2 border-dashed border-slate-100 p-16 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-sm text-slate-400 font-medium">No hay secciones en el reglamento.</p>
          <p className="text-xs text-slate-300 mt-1">Haz clic en "Agregar Sección" para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
              {editingId === item.id ? (
                <div className="p-7 space-y-4 bg-amber-50/30 border-l-4 border-amber-400">
                  <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Editando sección</p>
                  <input
                    autoFocus
                    value={editData.titulo}
                    onChange={e => setEditData(p => ({ ...p, titulo: e.target.value }))}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 transition-colors font-semibold"
                  />
                  <textarea
                    value={editData.contenido}
                    onChange={e => setEditData(p => ({ ...p, contenido: e.target.value }))}
                    rows={5}
                    className="w-full px-4 py-2.5 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 transition-colors resize-none"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSaveEdit(item.id)}
                      disabled={saving || !editData.titulo.trim()}
                      className="px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
                    >
                      {saving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#001e33] text-base mb-3">{item.titulo}</h3>
                      {item.contenido && (
                        <div className="space-y-2">
                          {item.contenido.split('\n').filter(l => l.trim()).map((linea, i) => (
                            <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                              <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
                              {linea.trim()}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => handleMover(item.id, 'arriba')}
                        disabled={idx === 0}
                        title="Subir"
                        className="p-2 text-slate-400 hover:text-[#001e33] hover:bg-slate-100 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        ▲
                      </button>
                      <button
                        onClick={() => handleMover(item.id, 'abajo')}
                        disabled={idx === items.length - 1}
                        title="Bajar"
                        className="p-2 text-slate-400 hover:text-[#001e33] hover:bg-slate-100 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed"
                      >
                        ▼
                      </button>
                      <button
                        onClick={() => handleEdit(item)}
                        title="Editar"
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Pencil size={15}/>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        title="Eliminar"
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={15}/>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── ConfiguracionesTab ─────────────────────────────────────────────────────────

const ConfiguracionesTab = ({ user }) => {
  const [seccion, setSeccion] = useState('cuenta');
  const [empleados, setEmpleados] = useState([]);
  const [miPerfil, setMiPerfil] = useState(null);

  const [selEmpPerm, setSelEmpPerm] = useState('');
  const [adminPassPerm, setAdminPassPerm] = useState('');
  const [habilitar, setHabilitar] = useState(true);
  const [savingPerm, setSavingPerm] = useState(false);
  const [resultPerm, setResultPerm] = useState(null);

  const [selEmpPass, setSelEmpPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [adminPassReset, setAdminPassReset] = useState('');
  const [savingPass, setSavingPass] = useState(false);
  const [resultPass, setResultPass] = useState(null);
  const [showPass, setShowPass] = useState(false);

  useEffect(() => {
    getAllEmpleados().then(data => {
      setEmpleados(data);
      // Buscar el empleado asociado al correo del admin
      const adminEmail = user?.correo_corporativo || user?.email;
      const perfil = data.find(emp => 
        emp.correo_corporativo === adminEmail || emp.email === adminEmail
      );
      if (perfil) setMiPerfil(perfil);
    }).catch(() => {});
  }, [user]);

  const adminEmail = user?.correo_corporativo || user?.email || '—';
  // Usar datos del perfil de empleado si existe, sino los del user
  const adminNombre = miPerfil?.primer_nombre
    ? `${miPerfil.primer_nombre} ${miPerfil.primer_apellido || ''}`.trim()
    : user?.primer_nombre
      ? `${user.primer_nombre} ${user.primer_apellido || ''}`.trim()
      : 'Administrador';

  const handleHabilitarEdicion = async () => {
    if (!selEmpPerm || !adminPassPerm) {
      setResultPerm({ ok: false, msg: 'Selecciona un empleado e ingresa tu contraseña.' });
      return;
    }
    setSavingPerm(true);
    setResultPerm(null);
    try {
      await habilitarEdicionDatos(adminEmail, adminPassPerm, parseInt(selEmpPerm), habilitar);
      setResultPerm({ ok: true, msg: `Edición de datos ${habilitar ? 'habilitada' : 'deshabilitada'} correctamente.` });
      setAdminPassPerm('');
    } catch (err) {
      setResultPerm({ ok: false, msg: err.message });
    } finally {
      setSavingPerm(false);
    }
  };

  const handleResetPassword = async () => {
    if (!selEmpPass || !newPass || !confirmPass || !adminPassReset) {
      setResultPass({ ok: false, msg: 'Completa todos los campos.' });
      return;
    }
    if (newPass !== confirmPass) {
      setResultPass({ ok: false, msg: 'Las contraseñas no coinciden.' });
      return;
    }
    if (newPass.length < 8) {
      setResultPass({ ok: false, msg: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setSavingPass(true);
    setResultPass(null);
    try {
      await actualizarPasswordEmpleado(parseInt(selEmpPass), newPass, adminEmail, adminPassReset);
      setResultPass({ ok: true, msg: 'Contraseña actualizada correctamente.' });
      setNewPass(''); setConfirmPass(''); setAdminPassReset(''); setSelEmpPass('');
    } catch (err) {
      setResultPass({ ok: false, msg: err.message });
    } finally {
      setSavingPass(false);
    }
  };

  const SECCIONES_CFG = [
    { id: 'cuenta',      label: 'Mi Cuenta',   icon: <Info size={14}/> },
    { id: 'permisos',    label: 'Permisos',     icon: <ShieldCheck size={14}/> },
    { id: 'contrasenas', label: 'Contraseñas',  icon: <KeyRound size={14}/> },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-nav */}
      <div className="flex gap-1.5 bg-white rounded-2xl border border-slate-100 p-1.5 shadow-sm w-fit">
        {SECCIONES_CFG.map(s => (
          <button key={s.id} onClick={() => setSeccion(s.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
              seccion === s.id ? 'bg-[#001e33] text-white shadow' : 'text-slate-400 hover:text-[#001e33] hover:bg-slate-50'
            }`}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Mi Cuenta */}
      {seccion === 'cuenta' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-6 mb-8 pb-6 border-b border-slate-50">
            <div className="w-20 h-20 bg-[#001e33] rounded-2xl flex items-center justify-center text-white text-3xl font-black flex-shrink-0">
              {user?.primer_nombre?.charAt(0)?.toUpperCase() || 'A'}
            </div>
            <div>
              <h2 className="text-xl font-black text-[#001e33]">{adminNombre}</h2>
              <p className="text-sm text-slate-400 mt-0.5">{adminEmail}</p>
              <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-[10px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0"/>Administrador
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Nombre Completo',    value: adminNombre },
              { label: 'Correo Corporativo', value: adminEmail },
              { label: 'Área',               value: miPerfil?.nombre_area || user?.nombre_area || '—' },
              { label: 'Cargo',              value: miPerfil?.nombre_cargo || user?.nombre_cargo || '—' },
              { label: 'Fecha de Ingreso',   value: (miPerfil?.fecha_ingreso || user?.fecha_ingreso) ? new Date(miPerfil?.fecha_ingreso || user?.fecha_ingreso).toLocaleDateString('es-CO', { dateStyle: 'medium' }) : <span className="text-slate-400 italic">No registrada</span> },
              { label: 'Estado',             value: miPerfil?.estado || 'Activo' },
            ].map(({ label, value }) => (
              <div key={label} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                <p className="text-sm font-semibold text-[#001e33]">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permisos */}
      {seccion === 'permisos' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-amber-50 rounded-xl"><ShieldCheck size={20} className="text-amber-600"/></div>
            <div>
              <h3 className="font-bold text-[#001e33]">Permisos de Edición de Datos</h3>
              <p className="text-xs text-slate-400">Permite que un empleado edite su propio perfil (uso único)</p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Empleado</label>
              <select value={selEmpPerm} onChange={e => setSelEmpPerm(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition-colors">
                <option value="">— Seleccionar empleado —</option>
                {empleados.map(e => (
                  <option key={e.id_empleado} value={e.id_empleado}>
                    {e.primer_nombre} {e.primer_apellido} — {e.correo_corporativo}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 block">Acción</label>
              <div className="flex rounded-xl overflow-hidden border border-slate-200 w-fit">
                <button onClick={() => setHabilitar(true)}
                  className={`px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 ${habilitar ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <Check size={12}/> Habilitar
                </button>
                <button onClick={() => setHabilitar(false)}
                  className={`px-5 py-2.5 text-xs font-bold transition-all flex items-center gap-1.5 ${!habilitar ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                  <X size={12}/> Deshabilitar
                </button>
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tu Contraseña (confirmación)</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-amber-400 transition-colors">
                <Lock size={14} className="text-slate-400 flex-shrink-0"/>
                <input type="password" value={adminPassPerm} onChange={e => setAdminPassPerm(e.target.value)}
                  placeholder="Ingresa tu contraseña" className="flex-1 bg-transparent text-sm focus:outline-none"/>
              </div>
            </div>
            {resultPerm && (
              <div className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${resultPerm.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {resultPerm.ok ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                {resultPerm.msg}
              </div>
            )}
            <button onClick={handleHabilitarEdicion} disabled={savingPerm}
              className="w-full py-3 bg-[#001e33] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
              {savingPerm ? 'Aplicando...' : 'Aplicar Cambio'}
            </button>
          </div>
        </div>
      )}

      {/* Contraseñas */}
      {seccion === 'contrasenas' && (
        <div className="bg-white rounded-xl border border-slate-100 p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
            <div className="p-3 bg-slate-100 rounded-xl"><KeyRound size={20} className="text-slate-600"/></div>
            <div>
              <h3 className="font-bold text-[#001e33]">Resetear Contraseña de Empleado</h3>
              <p className="text-xs text-slate-400">Establece una nueva contraseña para cualquier empleado</p>
            </div>
          </div>
          <div className="space-y-5">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Empleado</label>
              <select value={selEmpPass} onChange={e => setSelEmpPass(e.target.value)}
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors">
                <option value="">— Seleccionar empleado —</option>
                {empleados.map(e => (
                  <option key={e.id_empleado} value={e.id_empleado}>
                    {e.primer_nombre} {e.primer_apellido} — {e.nombre_area || e.correo_corporativo}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Nueva Contraseña</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 transition-colors">
                  <Lock size={14} className="text-slate-400 flex-shrink-0"/>
                  <input type={showPass ? 'text' : 'password'} value={newPass} onChange={e => setNewPass(e.target.value)}
                    placeholder="Mínimo 8 caracteres" className="flex-1 bg-transparent text-sm focus:outline-none"/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Confirmar Contraseña</label>
                <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 transition-colors">
                  <Lock size={14} className="text-slate-400 flex-shrink-0"/>
                  <input type={showPass ? 'text' : 'password'} value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
                    placeholder="Repetir contraseña" className="flex-1 bg-transparent text-sm focus:outline-none"/>
                  <button onClick={() => setShowPass(p => !p)} title={showPass ? 'Ocultar' : 'Mostrar'}
                    className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0">
                    <Eye size={14}/>
                  </button>
                </div>
              </div>
            </div>
            {newPass && confirmPass && (
              <p className={`text-[11px] font-semibold flex items-center gap-1.5 ${newPass === confirmPass ? 'text-emerald-600' : 'text-red-500'}`}>
                {newPass === confirmPass ? <><Check size={12}/> Las contraseñas coinciden</> : <><X size={12}/> Las contraseñas no coinciden</>}
              </p>
            )}
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tu Contraseña de Admin (confirmación)</label>
              <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-slate-400 transition-colors">
                <ShieldCheck size={14} className="text-slate-400 flex-shrink-0"/>
                <input type="password" value={adminPassReset} onChange={e => setAdminPassReset(e.target.value)}
                  placeholder="Confirma tu contraseña de administrador" className="flex-1 bg-transparent text-sm focus:outline-none"/>
              </div>
            </div>
            {resultPass && (
              <div className={`px-4 py-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${resultPass.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                {resultPass.ok ? <CheckCircle size={14}/> : <AlertTriangle size={14}/>}
                {resultPass.msg}
              </div>
            )}
            <button onClick={handleResetPassword} disabled={savingPass}
              className="w-full py-3 bg-[#001e33] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
              {savingPass ? 'Actualizando...' : 'Resetear Contraseña'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin2Dashboard;
