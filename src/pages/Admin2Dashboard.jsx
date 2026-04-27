import { useState, useEffect } from 'react';
import { Admin2Sidebar } from '../components/layout/Admin2Sidebar';
import { useLocation, Outlet } from 'react-router-dom';
import {
  Users, Activity, ShieldAlert, UserCheck,
  KeyRound, Check, X, Eye, Trash2, CheckCircle,
  AlertTriangle, ClipboardList, FileBarChart,
  Wrench, BookOpen, Settings, Plus, Building2, Briefcase,
  ShieldCheck, Lock, Info, Pencil
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import {
  getAllEmpleados,
  getActividadReciente,
  getAlertasRecuperacion,
  atenderAlerta,
  eliminarAlerta,
  getAllAreas,
  createArea,
  deleteArea,
  getAllCargos,
  createCargo,
  deleteCargo,
  habilitarEdicionDatos,
  getAllReglamento,
  createReglamentoItem,
  updateReglamentoItem,
  deleteReglamentoItem,
  moverReglamentoItem,
} from '../lib/db';

import UserTable from '../components/users/UserTable';
import UserProfile from '../components/users/UserProfile';
import TaskDashboard from '../components/tasks/TaskDashboard';
import CursosSection from '../components/admin2/CursosSection';
import UtilidadesSection from '../components/admin2/UtilidadesSection';

const Admin2Dashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({ totalCount: 0, activeCount: 0, loading: true });
  const [alertasCount, setAlertasCount] = useState(0);
  const [alertasRecuperacion, setAlertasRecuperacion] = useState([]);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState(0);
  const { user } = useAuth();

  const fetchStats = async () => {
    try {
      const empleados = await getAllEmpleados();
      const activos = empleados.filter(e => e.estado === 'ACTIVA');
      setEmployeeStats({ totalCount: empleados.length, activeCount: activos.length, loading: false });
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
      default:
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard
                label="Personal Registrado"
                value={employeeStats.loading ? '...' : employeeStats.totalCount.toString()}
                icon={<Users size={18}/>}
                subtext={`${employeeStats.activeCount} activos en sistema`}
              />
              <StatCard
                label="Usuarios en Línea"
                value={concurrentUsers.toString()}
                icon={<Activity size={18} className="text-emerald-600"/>}
                subtext="Activos (últimos 10 min)"
                color="text-emerald-600"
              />
              <div
                onClick={() => alertasCount > 0 && setShowAlertasModal(true)}
                className={alertasCount > 0 ? 'cursor-pointer' : ''}
              >
                <StatCard
                  label="Alertas del Sistema"
                  value={alertasCount.toString()}
                  icon={<ShieldAlert size={18} className={alertasCount > 0 ? 'text-red-500' : ''}/>}
                  subtext={alertasCount > 0 ? `${alertasCount} solicitudes pendientes` : 'Sin incidentes'}
                  color={alertasCount > 0 ? 'text-red-600' : 'text-[#001e33]'}
                />
              </div>
              <StatCard
                label="Reportes"
                value="Gestión"
                icon={<FileBarChart size={18}/>}
                subtext="Panel operativo activo"
              />
            </div>

            {/* Actividad + Acciones */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="mb-8 pb-4 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-[#001e33]">Actividad Reciente</h3>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-tight">Usuarios en línea y alertas en tiempo real</p>
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
                        estado={item.estado}
                        onMarkRead={() => handleMarkAsRead(item.id)}
                        onClick={() => item.type === 'alert' && showAlertDetail(alertasRecuperacion.find(a => a.id === item.id))}
                      />
                    ))
                  ) : (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-50 rounded-2xl">
                      <Users size={24} className="opacity-20 mb-2"/>
                      <p className="text-[10px] font-bold uppercase tracking-widest">Sin actividad reciente</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-100 rounded-xl"><ClipboardList size={20}/></div>
                  <h3 className="font-bold text-[#001e33]">Gestión Rápida</h3>
                </div>
                <div className="space-y-3">
                  <ActionButton
                    label="Ver Personal"
                    icon={<Users size={14}/>}
                    primary
                    onClick={() => setActiveTab('users')}
                  />
                  <ActionButton
                    label="Calendario Tareas"
                    icon={<ClipboardList size={14}/>}
                    onClick={() => setActiveTab('tasks')}
                  />
                  <ActionButton
                    label="Mi Perfil"
                    icon={<UserCheck size={14}/>}
                    onClick={() => setActiveTab('profile')}
                  />
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dashboard':       return 'Resumen de Equipo';
      case 'users':           return 'Gestión de Personal';
      case 'tasks':           return 'Calendario de Tareas';
      case 'profile':         return 'Mi Perfil';
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
        <header className="h-20 bg-white border-b border-slate-100 flex items-center px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Gestión Administrativa</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">{getHeaderTitle()}</h2>
          </div>
        </header>

        <div className="p-10 overflow-auto flex-1">
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

const StatCard = ({ label, value, icon, subtext, color = 'text-[#001e33]' }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:shadow-md transition-all duration-300">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[#001e33]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);

const RecentUserRow = ({ name, time, role, action, isAlert, onMarkRead, estado, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 px-3 rounded-2xl transition-colors cursor-pointer ${
      isAlert ? 'bg-red-50/50 hover:bg-red-50' :
      estado === 'en_linea' ? 'bg-emerald-50/30 hover:bg-emerald-50/50' :
      'hover:bg-slate-50'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${isAlert ? 'bg-red-600' : estado === 'en_linea' ? 'bg-emerald-500' : 'bg-[#001e33]'} text-white rounded-xl flex items-center justify-center font-bold text-xs relative`}>
        {isAlert ? <KeyRound size={16}/> : name.charAt(0).toUpperCase()}
        {estado === 'en_linea' && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"/>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{name}</p>
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-500' : estado === 'en_linea' ? 'text-emerald-600' : 'text-slate-400'}`}>{role}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-600' : action === 'En Línea' ? 'text-emerald-600' : 'text-slate-500'}`}>{action}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
      {isAlert && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(); }}
          className="p-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          title="Marcar como gestionada"
        >
          <Check size={14}/>
        </button>
      )}
    </div>
  </div>
);

const ActionButton = ({ label, icon, primary, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
      primary ? 'bg-[#001e33] text-white hover:bg-slate-800' : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
    }`}
  >
    {icon} {label}
  </button>
);

const AlertasModal = ({ isOpen, onClose, alertas, onViewDetail, onAtender, onEliminar }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

  const fetchData = async () => {
    try {
      const [a, c] = await Promise.all([getAllAreas(), getAllCargos()]);
      setAreas(a);
      setCargos(c);
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
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-blue-50 rounded-xl"><Building2 size={20} className="text-blue-600"/></div>
                  <div><h3 className="font-bold text-[#001e33]">Áreas</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{areas.length} registradas</p></div>
                </div>
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
                  {areas.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-4">Sin áreas registradas</p>
                    : areas.map(a => (
                        <div key={a.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-medium text-[#001e33]">{a.nombre_area}</span>
                          <button onClick={() => handleDeleteArea(a.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
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
              <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                  <div className="p-3 bg-emerald-50 rounded-xl"><Briefcase size={20} className="text-emerald-600"/></div>
                  <div><h3 className="font-bold text-[#001e33]">Cargos</h3>
                  <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">{cargos.length} registrados</p></div>
                </div>
                <div className="space-y-2 mb-6 max-h-64 overflow-y-auto pr-1">
                  {cargos.length === 0
                    ? <p className="text-xs text-slate-400 text-center py-4">Sin cargos registrados</p>
                    : cargos.map(c => (
                        <div key={c.id} className="flex items-center justify-between px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-sm font-medium text-[#001e33]">{c.nombre_cargo}</span>
                          <button onClick={() => handleDeleteCargo(c.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={14}/></button>
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
      <div className="bg-white rounded-3xl border border-slate-100 p-7 shadow-sm flex items-center justify-between">
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
        <div className="bg-indigo-50/50 border border-indigo-100 rounded-3xl p-7 space-y-4">
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
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-16 text-center">
          <BookOpen size={32} className="mx-auto text-slate-300 mb-3"/>
          <p className="text-sm text-slate-400 font-medium">No hay secciones en el reglamento.</p>
          <p className="text-xs text-slate-300 mt-1">Haz clic en "Agregar Sección" para comenzar.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
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
  const [empleados, setEmpleados] = useState([]);
  const [selectedEmpleado, setSelectedEmpleado] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [habilitar, setHabilitar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getAllEmpleados().then(setEmpleados).catch(() => {});
  }, []);

  const handleHabilitarEdicion = async () => {
    if (!selectedEmpleado || !adminPassword) {
      setResult({ ok: false, msg: 'Selecciona un empleado e ingresa tu contraseña.' });
      return;
    }
    setSaving(true);
    setResult(null);
    try {
      const adminEmail = user?.correo_corporativo || user?.email;
      await habilitarEdicionDatos(adminEmail, adminPassword, parseInt(selectedEmpleado), habilitar);
      setResult({ ok: true, msg: `Edición de datos ${habilitar ? 'habilitada' : 'deshabilitada'} correctamente.` });
      setAdminPassword('');
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const adminEmail = user?.correo_corporativo || user?.email || '—';
  const adminNombre = user?.primer_nombre ? `${user.primer_nombre} ${user.primer_apellido}` : 'Administrador';

  return (
    <div className="space-y-8">
      {/* Info de cuenta */}
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-slate-100 rounded-xl"><Info size={20} className="text-slate-600"/></div>
          <h3 className="font-bold text-[#001e33]">Información de Cuenta</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Nombre', value: adminNombre },
            { label: 'Correo', value: adminEmail },
            { label: 'Rol', value: 'Administrador' },
            { label: 'Estado', value: 'Activo' },
          ].map(({ label, value }) => (
            <div key={label} className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
              <p className="text-sm font-semibold text-[#001e33]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Habilitar edición de datos */}
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
          <div className="p-3 bg-amber-50 rounded-xl"><ShieldCheck size={20} className="text-amber-600"/></div>
          <div>
            <h3 className="font-bold text-[#001e33]">Permisos de Edición de Datos</h3>
            <p className="text-xs text-slate-400">Permite que un empleado edite su propio perfil (uso único)</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Empleado</label>
            <select
              value={selectedEmpleado}
              onChange={e => setSelectedEmpleado(e.target.value)}
              className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-amber-400 transition-colors"
            >
              <option value="">— Seleccionar empleado —</option>
              {empleados.map(e => (
                <option key={e.id_empleado} value={e.id_empleado}>
                  {e.primer_nombre} {e.primer_apellido} — {e.correo_corporativo}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-4">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acción</label>
            <div className="flex rounded-xl overflow-hidden border border-slate-200">
              <button
                onClick={() => setHabilitar(true)}
                className={`px-4 py-2 text-xs font-bold transition-all ${habilitar ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >Habilitar</button>
              <button
                onClick={() => setHabilitar(false)}
                className={`px-4 py-2 text-xs font-bold transition-all ${!habilitar ? 'bg-red-500 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >Deshabilitar</button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 block">Tu Contraseña (confirmación)</label>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-amber-400 transition-colors">
              <Lock size={14} className="text-slate-400 flex-shrink-0"/>
              <input
                type="password"
                value={adminPassword}
                onChange={e => setAdminPassword(e.target.value)}
                placeholder="Ingresa tu contraseña"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          {result && (
            <div className={`px-4 py-3 rounded-xl text-xs font-semibold ${result.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {result.msg}
            </div>
          )}

          <button
            onClick={handleHabilitarEdicion}
            disabled={saving}
            className="w-full py-3 bg-[#001e33] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
          >
            {saving ? 'Aplicando...' : 'Aplicar Cambio'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Admin2Dashboard;
