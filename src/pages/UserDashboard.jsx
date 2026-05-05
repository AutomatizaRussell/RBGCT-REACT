import { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle2, PlayCircle,
  BookOpen, Wrench, Bell, RefreshCw, ArrowRight, Activity,
  AlertTriangle, X, CalendarDays
} from 'lucide-react';
import { UserSidebar } from '../components/layout/UserSidebar';
import { useAuth } from '../hooks/useAuth';
import { getTareasByEmpleado } from '../lib/db';
import UtilidadesSection from '../components/admin2/UtilidadesSection';

const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();
  const { empleadoData } = useAuth();

  const [taskStats, setTaskStats] = useState({ pending: 0, inProgress: 0, completed: 0, total: 0 });
  const [loadingStats, setLoadingStats] = useState(true);
  const [showNotif, setShowNotif] = useState(false);
  const [notifTareas, setNotifTareas] = useState([]);
  const [loadingNotif, setLoadingNotif] = useState(false);
  const notifRef = useRef(null);

  const isHome = location.pathname === '/app' || location.pathname === '/app/';
  const isUtilidades = location.pathname.includes('/app/utilidades');

  useEffect(() => {
    const path = location.pathname;
    if (path.includes('auto-gestion'))   setActiveTab('tasks');
    else if (path.includes('perfil'))    setActiveTab('profile');
    else if (path.includes('manuales'))  setActiveTab('cursos');
    else if (path.includes('comunicados')) setActiveTab('reglamento');
    else if (path.includes('utilidades')) setActiveTab('utilidades');
    else setActiveTab('dashboard');
  }, [location.pathname]);

  useEffect(() => {
    if (!empleadoData?.id_empleado) return;
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        const data = await getTareasByEmpleado(empleadoData.id_empleado);
        const tareas = Array.isArray(data) ? data : (data?.results || []);
        setTaskStats({
          pending:    tareas.filter(t => t.estado === 'pendiente').length,
          inProgress: tareas.filter(t => t.estado === 'en_proceso').length,
          completed:  tareas.filter(t => t.estado === 'completada').length,
          total:      tareas.length,
        });
      } catch {
        // silencioso, los stats no son críticos
      } finally {
        setLoadingStats(false);
      }
    };
    fetchStats();
  }, [empleadoData?.id_empleado]);

  useEffect(() => {
    const handler = (e) => { if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotif(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const toggleNotif = async () => {
    if (showNotif) { setShowNotif(false); return; }
    setShowNotif(true);
    if (!empleadoData?.id_empleado) return;
    setLoadingNotif(true);
    try {
      const data = await getTareasByEmpleado(empleadoData.id_empleado);
      const tareas = Array.isArray(data) ? data : (data?.results || []);
      setNotifTareas(tareas.filter(t => t.estado !== 'completada'));
    } catch { /* silencioso */ }
    finally { setLoadingNotif(false); }
  };

  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador';

  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches';

  const getHeaderTitle = () => {
    if (isHome || isUtilidades) return null;
    if (activeTab === 'tasks')       return 'Mis Tareas Asignadas';
    if (activeTab === 'profile')     return 'Mi Perfil';
    if (activeTab === 'cursos')      return 'Cursos y Capacitaciones';
    if (activeTab === 'reglamento')  return 'Reglamento Interno';
    return 'Portal Empleado';
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Portal del Empleado</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {isHome ? `${saludo}, ${nombreUsuario} 👋` : (getHeaderTitle() || 'Portal Empleado')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={notifRef}>
              <button
                onClick={toggleNotif}
                className={`relative p-2 rounded-xl transition-all ${showNotif ? 'text-[#001e33] bg-slate-100' : 'text-slate-400 hover:text-[#001e33] hover:bg-slate-100'}`}
              >
                <Bell size={18}/>
                {taskStats.pending > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-amber-500 text-white rounded-full text-[9px] font-black flex items-center justify-center">
                    {taskStats.pending}
                  </span>
                )}
              </button>

              {showNotif && (
                <NotificationsPanel
                  tareas={notifTareas}
                  loading={loadingNotif}
                  onClose={() => setShowNotif(false)}
                  onNavigate={() => { setShowNotif(false); setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                />
              )}
            </div>
            <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-[#001e33]">{nombreUsuario}</p>
                <p className="text-[10px] text-slate-400 font-medium">
                  {empleadoData?.nombre_area || 'Colaborador'}
                </p>
              </div>
              <button
                onClick={() => { setActiveTab('profile'); navigate('/app/perfil'); }}
                className="w-10 h-10 bg-[#001e33] rounded-xl flex items-center justify-center text-white font-black hover:bg-slate-800 transition-all shadow-lg text-sm"
              >
                {nombreUsuario.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <div className="p-10 overflow-auto flex-1">

          {isHome ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">

              {/* KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                <KpiCard
                  label="Pendientes" value={loadingStats ? '…' : taskStats.pending}
                  sub="Por completar"
                  icon={<Clock size={18}/>}
                  iconBg="bg-amber-50" iconColor="text-amber-600"
                  accent="border-l-amber-400"
                  onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                />
                <KpiCard
                  label="En Proceso" value={loadingStats ? '…' : taskStats.inProgress}
                  sub="Trabajando ahora"
                  icon={<Activity size={18}/>}
                  iconBg="bg-blue-50" iconColor="text-blue-600"
                  accent="border-l-blue-400"
                  onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                />
                <KpiCard
                  label="Completadas" value={loadingStats ? '…' : taskStats.completed}
                  sub="¡Buen trabajo!"
                  icon={<CheckCircle2 size={18}/>}
                  iconBg="bg-emerald-50" iconColor="text-emerald-600"
                  accent="border-l-emerald-400"
                  highlight={taskStats.completed > 0}
                />
                <KpiCard
                  label="Total Asignadas" value={loadingStats ? '…' : taskStats.total}
                  sub={empleadoData?.nombre_cargo || 'Tus tareas'}
                  icon={<ClipboardList size={18}/>}
                  iconBg="bg-slate-50" iconColor="text-slate-500"
                  accent="border-l-slate-300"
                />
              </div>

              {/* Accesos rápidos */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Mis tareas */}
                <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-7 shadow-sm">
                  <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-50">
                    <div>
                      <h3 className="font-bold text-[#001e33]">Estado de Mis Tareas</h3>
                      <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">Resumen personal</p>
                    </div>
                    <button onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                      className="text-[10px] font-bold text-slate-400 hover:text-[#001e33] uppercase tracking-widest flex items-center gap-1 transition-colors">
                      Ver todas <ArrowRight size={10}/>
                    </button>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: 'Pendientes',   count: taskStats.pending,    color: 'bg-amber-400',   textColor: 'text-amber-600'   },
                      { label: 'En Proceso',   count: taskStats.inProgress, color: 'bg-blue-400',    textColor: 'text-blue-600'    },
                      { label: 'Completadas',  count: taskStats.completed,  color: 'bg-emerald-400', textColor: 'text-emerald-600' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-600">{t.label}</span>
                            <span className={`text-sm font-black ${t.textColor}`}>{t.count}</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full rounded-full ${t.color} transition-all duration-700`}
                              style={{ width: taskStats.total > 0 ? `${(t.count / taskStats.total * 100)}%` : '0%' }}/>
                          </div>
                        </div>
                      </div>
                    ))}
                    {taskStats.total === 0 && !loadingStats && (
                      <p className="text-xs text-slate-400 text-center py-4">Sin tareas asignadas aún</p>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="bg-white rounded-3xl border border-slate-100 p-7 shadow-sm">
                  <h3 className="font-bold text-[#001e33] mb-5 text-sm pb-4 border-b border-slate-50">Accesos Rápidos</h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Mis Tareas',   icon: <ClipboardList size={14}/>, tab: 'tasks',      path: '/app/auto-gestion', color: 'hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200' },
                      { label: 'Cursos',        icon: <PlayCircle size={14}/>,    tab: 'cursos',     path: '/app/manuales',     color: 'hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200' },
                      { label: 'Reglamento',   icon: <BookOpen size={14}/>,      tab: 'reglamento', path: '/app/comunicados',  color: 'hover:bg-violet-50 hover:text-violet-700 hover:border-violet-200' },
                      { label: 'Herramientas', icon: <Wrench size={14}/>,        tab: 'utilidades', path: '/app/utilidades',   color: 'hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200' },
                    ].map(a => (
                      <button key={a.tab}
                        onClick={() => { setActiveTab(a.tab); navigate(a.path); }}
                        className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 bg-slate-50 border border-transparent transition-all ${a.color}`}>
                        <span className="flex items-center gap-2">{a.icon} {a.label}</span>
                        <ArrowRight size={12} className="opacity-40"/>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          ) : isUtilidades ? (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-[#001e33]">Herramientas</h3>
                <p className="text-xs text-slate-500 mt-0.5">Utilidades y herramientas de productividad</p>
              </div>
              <UtilidadesSection />
            </div>

          ) : (
            <div className="animate-in fade-in duration-500">
              <Outlet/>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

const NotificationsPanel = ({ tareas, loading, onClose, onNavigate }) => {
  const now = new Date();
  const vencidas = tareas.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < now);
  const activas  = tareas.filter(t => !(t.fecha_vencimiento && new Date(t.fecha_vencimiento) < now));

  const fmtFecha = (f) => new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });

  return (
    <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
        <p className="text-xs font-black text-[#001e33] uppercase tracking-widest">Notificaciones</p>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">
          <X size={14} className="text-slate-400"/>
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <RefreshCw size={20} className="text-indigo-400 animate-spin"/>
          </div>
        ) : tareas.length === 0 ? (
          <div className="py-10 text-center">
            <CheckCircle2 size={32} className="text-emerald-300 mx-auto mb-2"/>
            <p className="text-xs font-semibold text-slate-400">¡Sin tareas pendientes!</p>
          </div>
        ) : (
          <>
            {vencidas.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1.5 text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1">
                  <AlertTriangle size={9}/> Vencidas ({vencidas.length})
                </p>
                {vencidas.map(t => (
                  <NotifItem key={t.id} tarea={t} vencida onNavigate={onNavigate} fmtFecha={fmtFecha}/>
                ))}
              </div>
            )}
            {activas.length > 0 && (
              <div>
                <p className="px-4 pt-3 pb-1.5 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                  Pendientes ({activas.length})
                </p>
                {activas.map(t => (
                  <NotifItem key={t.id} tarea={t} onNavigate={onNavigate} fmtFecha={fmtFecha}/>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      {!loading && tareas.length > 0 && (
        <div className="border-t border-slate-100 px-4 py-3">
          <button
            onClick={onNavigate}
            className="w-full text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:text-indigo-800 transition-colors flex items-center justify-center gap-1"
          >
            Ver todas mis tareas <ArrowRight size={10}/>
          </button>
        </div>
      )}
    </div>
  );
};

const NotifItem = ({ tarea, vencida, onNavigate, fmtFecha }) => (
  <button
    onClick={onNavigate}
    className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${vencida ? 'hover:bg-red-50/30' : ''}`}
  >
    <div className={`mt-0.5 p-1.5 rounded-lg flex-shrink-0 ${vencida ? 'bg-red-100 text-red-500' : tarea.estado === 'en_proceso' ? 'bg-blue-100 text-blue-500' : 'bg-amber-100 text-amber-500'}`}>
      {vencida ? <AlertTriangle size={11}/> : <Clock size={11}/>}
    </div>
    <div className="flex-1 min-w-0">
      <p className={`text-xs font-bold truncate leading-snug ${vencida ? 'text-red-700' : 'text-[#001e33]'}`}>{tarea.titulo}</p>
      <div className="flex items-center gap-2 mt-0.5">
        {tarea.prioridad && (
          <span className={`text-[9px] font-black uppercase ${tarea.prioridad === 'alta' ? 'text-red-500' : tarea.prioridad === 'media' ? 'text-amber-500' : 'text-blue-500'}`}>
            {tarea.prioridad}
          </span>
        )}
        {tarea.fecha_vencimiento && (
          <span className={`text-[9px] font-medium flex items-center gap-0.5 ${vencida ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
            <CalendarDays size={9}/> {fmtFecha(tarea.fecha_vencimiento)}
          </span>
        )}
      </div>
    </div>
  </button>
);

const KpiCard = ({ label, value, sub, icon, iconBg, iconColor, accent, highlight, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white rounded-3xl border border-slate-100 p-6 shadow-sm border-l-4 ${accent} transition-all duration-300
      ${highlight ? 'ring-1 ring-emerald-100' : ''}
      ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : 'hover:shadow-md'}`}
  >
    <div className="flex items-start justify-between mb-4">
      <div className={`p-2.5 rounded-xl ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      {highlight && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse mt-1"/>}
    </div>
    <p className="text-3xl font-black text-[#001e33] leading-none mb-2">{value}</p>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{label}</p>
    <p className="text-[10px] text-slate-400 mt-1 truncate">{sub}</p>
  </div>
);

export default UserDashboard;
