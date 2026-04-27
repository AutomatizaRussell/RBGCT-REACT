import { useState, useEffect } from 'react'; 
import { Sidebar } from '../components/layout/Sidebar';
import { useLocation, useNavigate } from 'react-router-dom';
import { Users, Activity, ShieldAlert, Zap, Database, KeyRound, Check, Plus, X, AlertTriangle, Eye, Trash2, CheckCircle, Lock, Edit3 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { 
  getAllEmpleados, 
  getActividadReciente, 
  getAlertasRecuperacion,
  atenderAlerta,
  eliminarAlerta,
  actualizarPasswordEmpleado,
  habilitarEdicionMasivaSuperAdmin
} from '../lib/db';

// Componentes comunes de Gestión de Usuarios
import UserTable from '../components/users/UserTable';
import CreateUserPage from '../components/users/CreateUserPage';

// Componentes de Tareas/Calendario
import TaskDashboard from '../components/tasks/TaskDashboard'; 
import N8nLogs from '../components/users/N8nLogs'; 
import SystemSettings from '../components/users/SystemSettings'; 

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [recentActivity, setRecentActivity] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [employeeStats, setEmployeeStats] = useState({ activeCount: 0, loading: true });
  const [alertasCount, setAlertasCount] = useState(0);
  const [alertasRecuperacion, setAlertasRecuperacion] = useState([]);
  const [showAlertasModal, setShowAlertasModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [concurrentUsers, setConcurrentUsers] = useState(0);
  const [n8nStatus, setN8nStatus] = useState({ connected: false, ping: null, loading: true }); 
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin, user } = useAuth();

  // --- FUNCIONES DE CARGA ---

  const fetchStats = async () => {
    try {
      const empleados = await getAllEmpleados();
      const total = empleados.length;
      const activos = empleados.filter(emp => emp.estado === 'ACTIVA');
      setEmployeeStats({ totalCount: total, activeCount: activos.length, loading: false });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
      setEmployeeStats({ totalCount: 0, activeCount: 0, loading: false });
    }
  };

  const checkN8nStatus = async () => {
    try {
      const start = performance.now();
      await fetch('http://localhost:5678/healthz', { 
        method: 'GET',
        mode: 'no-cors',
        cache: 'no-cache',
        signal: AbortSignal.timeout(3000) // 3 segundos timeout
      });
      const end = performance.now();
      const ping = Math.round(end - start);
      
      setN8nStatus({ 
        connected: true, 
        ping: ping || 42, 
        loading: false 
      });
    } catch (error) {
      console.error('Error al verificar estado de n8n:', error);
      setN8nStatus({ 
        connected: false, 
        ping: null, 
        loading: false 
      });
    }
  };

  const fetchAlertsCount = async () => {
    try {
      const response = await getAlertasRecuperacion();
      if (response && response.alertas) {
        setAlertasRecuperacion(response.alertas);
        setAlertasCount(response.total || 0);
      }
    } catch (err) {
      console.error('Error al cargar alertas:', err);
      setAlertasCount(0);
    }
  };

  // Función para mostrar detalle de alerta
  const showAlertDetail = (alerta) => {
    if (alerta.empleado_info) {
      const emp = alerta.empleado_info;
      alert(`DETALLE DEL EMPLEADO:

Nombre: ${emp.nombre_completo}
Email: ${emp.correo}
Teléfono: ${emp.telefono}
Área: ${emp.area}
Cargo: ${emp.cargo}
Dirección: ${emp.direccion}, ${emp.barrio}
Ubicación: ${emp.municipio}, ${emp.departamento}
Estado: ${emp.estado}
Fecha Ingreso: ${emp.fecha_ingreso ? new Date(emp.fecha_ingreso).toLocaleDateString() : 'N/A'}

Este usuario existe en el sistema y solicitó recuperar contraseña.`);
    } else {
      alert(`USUARIO NO REGISTRADO:

Email: ${alerta.email}
Nombre: ${alerta.nombre}
Rol: ${alerta.rol}

Este correo NO existe en el sistema.`);
    }
  };

  const fetchConcurrentUsers = async () => {
    // TODO: Implementar con API REST cuando exista endpoint
    setConcurrentUsers(1); // Solo el admin actual
  };

  const fetchAllActivity = async () => {
    try {
      setLoading(true);
      const actividad = await getActividadReciente();
      
      // Combinar activos (en línea), recientes (desconectados) y alertas de recuperación
      const alertasData = alertasRecuperacion.map(alerta => ({
        id: alerta.id,
        name: alerta.nombre,
        role: alerta.rol,
        time: alerta.timestamp,
        action: `Intento de recuperación: ${alerta.email}`,
        type: 'alert',
        estado: 'alerta',
        email: alerta.email
      }));
      
      const allActivity = [
        // Alertas de recuperación (primero, son importantes)
        ...alertasData,
        // Activos en línea
        ...actividad.activos.map(usr => ({
          id: usr.id,
          name: usr.nombre,
          role: usr.rol,
          time: usr.ultima_actividad,
          action: "En Línea",
          type: 'login',
          estado: 'en_linea',
          minutos: 0
        })),
        // Recientes desconectados
        ...actividad.recientes.map(usr => ({
          id: usr.id,
          name: usr.nombre,
          role: usr.rol,
          time: usr.ultima_actividad,
          action: `Hace ${usr.minutos_transcurridos} min`,
          type: 'logout',
          estado: 'desconectado',
          minutos: usr.minutos_transcurridos
        }))
      ];

      setConcurrentUsers(actividad.total_en_linea);
      setRecentActivity(allActivity);
    } catch (err) {
      console.error("Error cargando actividad:", err?.message || err);
      // Fallback: mostrar solo el admin actual
      const currentUser = user || { email: 'SuperAdmin' };
      setRecentActivity([{
        id: 1,
        name: currentUser.email ? currentUser.email.split('@')[0] : 'SuperAdmin',
        role: 'SuperAdmin',
        time: new Date().toISOString(),
        action: "En Línea",
        type: 'login',
        estado: 'en_linea',
        minutos: 0
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (idSolicitud) => {
    try {
      await atenderAlerta(idSolicitud);
      fetchAlertsCount();
      fetchAllActivity();
    } catch (err) {
      alert("No se pudo marcar como atendida: " + err.message);
    }
  };

  const handleEliminarAlerta = async (idSolicitud) => {
    if (!confirm('¿Estás seguro de eliminar esta alerta permanentemente?')) return;
    try {
      await eliminarAlerta(idSolicitud);
      fetchAlertsCount();
      fetchAllActivity();
    } catch (err) {
      alert("No se pudo eliminar la alerta: " + err.message);
    }
  };

  const openPasswordModal = (empleado) => {
    setSelectedEmpleado(empleado);
    setNewPassword('');
    setAdminPassword('');
    setShowPasswordModal(true);
  };

  // --- HABILITAR EDICIÓN MASIVA (SuperAdmin) ---
  const handleHabilitarEdicionMasiva = async () => {
    const adminEmail = prompt('Confirma tu email de SuperAdmin:');
    if (!adminEmail) return;
    
    const adminPass = prompt('Confirma tu contraseña:');
    if (!adminPass) return;
    
    const habilitar = confirm('¿Habilitar edición para TODOS? (Cancelar = Deshabilitar)');
    
    try {
      const response = await habilitarEdicionMasivaSuperAdmin(adminEmail, adminPass, habilitar);
      alert(response.message);
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!adminPassword) {
      alert('Debes ingresar tu contraseña de administrador');
      return;
    }

    setUpdatingPassword(true);
    try {
      const result = await actualizarPasswordEmpleado(
        selectedEmpleado.id,
        newPassword,
        user?.email,
        adminPassword
      );
      if (result.success) {
        alert('Contraseña actualizada exitosamente');
        setShowPasswordModal(false);
        setNewPassword('');
        setAdminPassword('');
        setSelectedEmpleado(null);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error al actualizar contraseña: ' + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchAlertsCount();
    fetchConcurrentUsers();
    fetchAllActivity();
    checkN8nStatus();

    // Auto-refresh cada 30 segundos
    const interval = setInterval(() => {
      fetchStats();
      fetchAlertsCount();
      fetchAllActivity();
      checkN8nStatus();
    }, 30000);

    return () => clearInterval(interval);
  }, []); // Solo al montar

  // --- LÓGICA DE RENDERIZADO ---
  const renderContent = () => {
    if (location.pathname === '/admin/usuarios/nuevo') return <CreateUserPage />;

    switch (activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard 
                label="Personal Registrado" 
                value={employeeStats.loading ? "..." : employeeStats.totalCount.toString()} 
                icon={<Users size={18}/>} 
                subtext={`${employeeStats.activeCount} activos en sistema`} 
              />
              <StatCard 
                label="Integración n8n" 
                value={n8nStatus.loading ? "..." : (n8nStatus.connected ? "Estable" : "Desconectado")} 
                icon={<Zap size={18} className={n8nStatus.connected ? "text-emerald-600" : "text-red-500"}/>} 
                subtext={n8nStatus.loading ? "Verificando..." : (n8nStatus.connected ? `Ping: ${n8nStatus.ping}ms | Webhooks OK` : "Servicio no disponible")} 
                color={n8nStatus.connected ? "text-emerald-600" : "text-red-600"}
              />
              
              <div onClick={() => alertasCount > 0 && setShowAlertasModal(true)} className={alertasCount > 0 ? "cursor-pointer" : ""}>
                <StatCard 
                  label="Alertas del Sistema" 
                  value={alertasCount.toString()} 
                  icon={<ShieldAlert size={18} className={alertasCount > 0 ? "text-red-500" : ""}/>} 
                  subtext={alertasCount > 0 ? `${alertasCount} solicitudes pendientes` : "Sin incidentes críticos"} 
                  color={alertasCount > 0 ? "text-red-600" : "text-[#001e33]"}
                />
              </div>

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
                        estado={item.estado}
                        onMarkRead={() => handleMarkAsRead(item.id)}
                        onClick={() => item.type === 'alert' && showAlertDetail(alertasRecuperacion.find(a => a.id === item.id))}
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
                  <ActionButton 
                    label="Sincronizar n8n" 
                    icon={<Zap size={14}/>} 
                    primary 
                    onClick={() => setActiveTab('logs')} 
                  />
                  {/* Botón de Edición Masiva - Solo SuperAdmin */}
                  {isSuperAdmin && (
                    <ActionButton 
                      label="Habilitar Edición Masiva" 
                      icon={<Edit3 size={14}/>} 
                      primary 
                      onClick={handleHabilitarEdicionMasiva}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      case 'users':
        return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><UserTable /></div>;
      case 'tasks':
        return <TaskDashboard />;
      case 'logs': 
        return <N8nLogs />;
      case 'settings': 
        return <SystemSettings />;
      default:
        return <div className="animate-in fade-in slide-in-from-bottom-2 duration-500"><UserTable /></div>;
    }
  };

  const getHeaderTitle = () => {
    if (location.pathname === '/admin/usuarios/nuevo') return 'Nuevo Registro';
    switch (activeTab) {
      case 'dashboard': return 'Panel General';
      case 'users': return 'Gestión de Personal';
      case 'tasks': return 'Calendario de Tareas';
      case 'logs': return 'Monitoreo de n8n';
      case 'settings': return 'Ajustes del Sistema';
      default: return 'Panel de Control';
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Control Global</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {getHeaderTitle()}
            </h2>
          </div>
          {/* Botón Crear Usuario - Solo SuperAdmin en Gestión de Personal */}
          {isSuperAdmin && activeTab === 'users' && (
            <button
              onClick={() => navigate('/admin/usuarios/nuevo')}
              className="flex items-center gap-2 px-4 py-2 bg-[#001e33] text-white rounded-lg hover:bg-[#003366] transition-colors text-sm font-medium"
            >
              <Plus size={16} />
              Crear Usuario
            </button>
          )}
        </header>
        <div className="p-10 overflow-auto flex-1">{renderContent()}</div>
      </main>
      
      {/* Modal de Alertas */}
      <AlertasModal 
        isOpen={showAlertasModal}
        onClose={() => setShowAlertasModal(false)}
        alertas={alertasRecuperacion}
        onViewDetail={showAlertDetail}
        onAtender={handleMarkAsRead}
        onEliminar={handleEliminarAlerta}
        onChangePassword={openPasswordModal}
      />

      {/* Modal de Actualizar Contraseña */}
      <PasswordModal
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedEmpleado(null);
          setNewPassword('');
          setAdminPassword('');
        }}
        empleado={selectedEmpleado}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        onSubmit={handleUpdatePassword}
        updating={updatingPassword}
      />
    </div>
  );
};

// --- SUB-COMPONENTES UI ---

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

const RecentUserRow = ({ name, time, role, action, isAlert, onMarkRead, estado, onClick }) => (
  <div 
    onClick={onClick}
    className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 px-3 rounded-2xl transition-colors cursor-pointer ${isAlert ? 'bg-red-50/50 hover:bg-red-50' : estado === 'en_linea' ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-slate-50'}`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${isAlert ? 'bg-red-600' : estado === 'en_linea' ? 'bg-emerald-500' : 'bg-[#001e33]'} text-white rounded-xl flex items-center justify-center font-bold text-xs relative`}>
        {isAlert ? <KeyRound size={16}/> : name.charAt(0).toUpperCase()}
        {estado === 'en_linea' && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"></span>
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
          onClick={(e) => {
            e.stopPropagation();
            onMarkRead();
          }}
          className="p-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          title="Marcar como gestionada"
        >
          <Check size={14} />
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
  }`}>
    {icon} {label}
  </button>
);

// --- MODAL DE ALERTAS ---

const AlertasModal = ({ isOpen, onClose, alertas, onViewDetail, onAtender, onEliminar, onChangePassword }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-xl">
              <AlertTriangle className="text-red-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#001e33]">Alertas del Sistema</h3>
              <p className="text-xs text-slate-500">Solicitudes de recuperación de contraseña</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {alertas.length === 0 ? (
            <div className="text-center py-10">
              <ShieldAlert size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">No hay alertas pendientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alertas.map((alerta) => (
                <div 
                  key={alerta.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    alerta.usuario_existe 
                      ? 'bg-red-50/50 border-red-100 hover:bg-red-50' 
                      : 'bg-amber-50/50 border-amber-100 hover:bg-amber-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
                        alerta.usuario_existe ? 'bg-red-500' : 'bg-amber-500'
                      }`}>
                        {alerta.nombre?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{alerta.nombre || 'Desconocido'}</p>
                        <p className="text-xs text-slate-500">{alerta.email}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {new Date(alerta.timestamp).toLocaleString('es-CO', {
                            dateStyle: 'medium',
                            timeStyle: 'short'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase ${
                        alerta.usuario_existe 
                          ? 'bg-red-100 text-red-600' 
                          : 'bg-amber-100 text-amber-600'
                      }`}>
                        {alerta.usuario_existe ? 'Usuario Existe' : 'No Registrado'}
                      </span>
                      <button
                        onClick={() => onViewDetail(alerta)}
                        className="p-2 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        title="Ver detalle"
                      >
                        <Eye size={14} className="text-slate-600" />
                      </button>
                    </div>
                  </div>
                  
                  {/* Info del empleado */}
                  {alerta.empleado_info && (
                    <div className="mt-3 pt-3 border-t border-red-100/50">
                      <p className="text-xs text-slate-600 mb-2">
                        <span className="font-semibold">Área:</span> {alerta.empleado_info.area || 'N/A'} | {' '}
                        <span className="font-semibold">Cargo:</span> {alerta.empleado_info.cargo || 'N/A'} | {' '}
                        <span className="font-semibold">Tel:</span> {alerta.empleado_info.telefono || 'N/A'}
                      </p>
                    </div>
                  )}
                  
                  {/* Botones de acción */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                    {alerta.usuario_existe && alerta.empleado_info && (
                      <button
                        onClick={() => onChangePassword(alerta.empleado_info)}
                        className="flex items-center gap-2 px-3 py-2 bg-[#001e33] text-white text-xs font-semibold rounded-lg hover:bg-[#003366] transition-colors"
                      >
                        <Lock size={14} />
                        Cambiar Contraseña
                      </button>
                    )}
                    <button
                      onClick={() => onAtender(alerta.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-lg hover:bg-emerald-200 transition-colors"
                    >
                      <CheckCircle size={14} />
                      Marcar Atendida
                    </button>
                    <button
                      onClick={() => onEliminar(alerta.id)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-200 transition-colors ml-auto"
                    >
                      <Trash2 size={14} />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <button 
            onClick={onClose}
            className="w-full py-3 bg-[#001e33] text-white rounded-xl font-semibold hover:bg-[#003366] transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

// --- MODAL DE ACTUALIZAR CONTRASEÑA ---

const PasswordModal = ({ 
  isOpen, 
  onClose, 
  empleado, 
  newPassword, 
  setNewPassword, 
  adminPassword, 
  setAdminPassword, 
  onSubmit, 
  updating 
}) => {
  if (!isOpen || !empleado) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#001e33]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <Lock className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Actualizar Contraseña</h3>
              <p className="text-xs text-white/70">{empleado.nombre_completo || empleado.nombre}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <X size={20} className="text-white/70" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Nueva Contraseña
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#001e33] focus:ring-1 focus:ring-[#001e33] outline-none transition-all"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Tu Contraseña de Administrador
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              placeholder="Confirma tu identidad"
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-[#001e33] focus:ring-1 focus:ring-[#001e33] outline-none transition-all"
              required
            />
            <p className="text-xs text-slate-500 mt-1">
              Se requiere tu contraseña para autorizar el cambio
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-semibold hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updating}
              className="flex-1 py-3 bg-[#001e33] text-white rounded-xl font-semibold hover:bg-[#003366] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updating ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminDashboard;