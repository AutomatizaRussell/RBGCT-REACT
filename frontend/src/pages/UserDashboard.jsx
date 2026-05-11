import { useState, useEffect, useRef } from 'react';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  ClipboardList, Clock, CheckCircle2, PlayCircle,
  BookOpen, Wrench, Bell, RefreshCw, ArrowRight, Activity,
  AlertTriangle, X, CalendarDays
} from 'lucide-react';
import { UserSidebar } from '../components/layout/UserSidebar';
import { useAuth } from '../hooks/useAuth';
import { getTareasByEmpleado } from '../lib/api';
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
    else if (path.includes('mis-clientes') || path.includes('/app/cliente/')) setActiveTab('clientes');
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
    if (activeTab === 'clientes') {
      if (location.pathname.includes('/app/cliente/')) return 'Detalle del cliente';
      return 'Mis Clientes Asignados';
    }
    return 'Portal Empleado';
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      <UserSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden border-l border-slate-200/80 bg-[#f1f5f9]">
        {/* Header */}
        <header className="relative z-10 flex h-[4.25rem] shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 shadow-sm lg:px-10">
          <div className="min-w-0 pr-4">
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Portal del empleado</p>
            <h2 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-[#001e33] lg:text-xl">
              {isHome ? `${saludo}, ${nombreUsuario}` : (getHeaderTitle() || 'Portal Empleado')}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotif}
                className={`relative flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                  showNotif
                    ? 'border-slate-200 bg-slate-50 text-[#001e33]'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-[#001e33]'
                }`}
                aria-label="Notificaciones"
              >
                <Bell size={18} strokeWidth={1.75} />
                {taskStats.pending > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#001e33] px-1 text-[10px] font-semibold text-white">
                    {taskStats.pending > 9 ? '9+' : taskStats.pending}
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
            <div className="flex items-center gap-3 border-l border-slate-200 pl-3 sm:pl-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-[#001e33]">{nombreUsuario}</p>
                <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                  {empleadoData?.nombre_area || 'Colaborador'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setActiveTab('profile'); navigate('/app/perfil'); }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#001e33] text-sm font-semibold text-white transition-colors hover:bg-slate-800"
                aria-label="Ir a mi perfil"
              >
                {nombreUsuario.charAt(0).toUpperCase()}
              </button>
            </div>
          </div>
        </header>

        {/* Contenido */}
        <div className="flex-1 overflow-auto px-6 py-8 lg:px-10 lg:py-10">

          {isHome ? (
            <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">

              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
                <KpiCard
                  label="Pendientes" value={loadingStats ? '…' : taskStats.pending}
                  sub="Por completar"
                  icon={<Clock size={18} strokeWidth={1.75} />}
                  iconBg="bg-blue-50" iconColor="text-blue-600"
                  accent="border-l-blue-400"
                  onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                />
                <KpiCard
                  label="En proceso" value={loadingStats ? '…' : taskStats.inProgress}
                  sub="En curso"
                  icon={<Activity size={18} strokeWidth={1.75} />}
                  iconBg="bg-blue-50" iconColor="text-blue-600"
                  accent="border-l-blue-500"
                  onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                />
                <KpiCard
                  label="Completadas" value={loadingStats ? '…' : taskStats.completed}
                  sub="Cerradas en el periodo"
                  icon={<CheckCircle2 size={18} strokeWidth={1.75} />}
                  iconBg="bg-slate-50" iconColor="text-slate-600"
                  accent="border-l-slate-400"
                  highlight={taskStats.completed > 0}
                />
                <KpiCard
                  label="Total asignadas" value={loadingStats ? '…' : taskStats.total}
                  sub={empleadoData?.nombre_cargo || 'Cartera de tareas'}
                  icon={<ClipboardList size={18} strokeWidth={1.75} />}
                  iconBg="bg-white" iconColor="text-slate-500"
                  accent="border-l-slate-300"
                />
              </div>

              {/* Accesos rápidos */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

                {/* Mis tareas */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2 lg:p-8">
                  <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                    <div>
                      <h3 className="text-base font-semibold text-[#001e33]">Estado de mis tareas</h3>
                      <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">Resumen personal</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('tasks'); navigate('/app/auto-gestion'); }}
                      className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#001e33]"
                    >
                      Ver todas <ArrowRight size={12} strokeWidth={2} />
                    </button>
                  </div>
                  <div className="space-y-5">
                    {[
                      { label: 'Pendientes',   count: taskStats.pending,    color: 'bg-blue-500',    textColor: 'text-blue-600'   },
                      { label: 'En proceso',   count: taskStats.inProgress, color: 'bg-blue-400',    textColor: 'text-blue-600'  },
                      { label: 'Completadas',  count: taskStats.completed,  color: 'bg-slate-300',   textColor: 'text-slate-600' },
                    ].map(t => (
                      <div key={t.label} className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-600">{t.label}</span>
                            <span className={`text-sm font-semibold tabular-nums ${t.textColor}`}>{t.count}</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-sm bg-slate-100">
                            <div
                              className={`h-full rounded-sm ${t.color} transition-all duration-700`}
                              style={{ width: taskStats.total > 0 ? `${(t.count / taskStats.total * 100)}%` : '0%' }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                    {taskStats.total === 0 && !loadingStats && (
                      <p className="py-6 text-center text-xs text-slate-500">Sin tareas asignadas en este momento.</p>
                    )}
                  </div>
                </div>

                {/* Acciones rápidas */}
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
                  <h3 className="border-b border-slate-200 pb-4 text-sm font-semibold text-[#001e33]">Accesos rápidos</h3>
                  <div className="mt-5 space-y-2">
                    {[
                      { label: 'Mis tareas',   icon: <ClipboardList size={15} strokeWidth={1.75} />, tab: 'tasks',      path: '/app/auto-gestion' },
                      { label: 'Cursos',       icon: <PlayCircle size={15} strokeWidth={1.75} />,    tab: 'cursos',     path: '/app/manuales' },
                      { label: 'Reglamento',   icon: <BookOpen size={15} strokeWidth={1.75} />,      tab: 'reglamento', path: '/app/comunicados' },
                      { label: 'Herramientas', icon: <Wrench size={15} strokeWidth={1.75} />,        tab: 'utilidades', path: '/app/utilidades' },
                    ].map(a => (
                      <button
                        key={a.tab}
                        type="button"
                        onClick={() => { setActiveTab(a.tab); navigate(a.path); }}
                        className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-xs font-semibold text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        <span className="flex items-center gap-3">
                          <span className="text-slate-400">{a.icon}</span>
                          {a.label}
                        </span>
                        <ArrowRight size={14} className="shrink-0 text-slate-300" strokeWidth={2} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

          ) : isUtilidades ? (
            <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
              <div className="mb-8 border-b border-slate-200 pb-6">
                <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-500">Productividad</p>
                <h3 className="mt-2 text-lg font-semibold text-[#001e33]">Herramientas</h3>
                <p className="mt-1 max-w-xl text-sm text-slate-600">Utilidades corporativas disponibles para su labor diaria.</p>
              </div>
              <UtilidadesSection />
            </div>

          ) : (
            <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
              <Outlet />
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
    <div className="absolute right-0 top-12 z-50 w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_12px_40px_-8px_rgba(15,23,42,0.18)] animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#001e33]">Notificaciones</p>
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-white hover:text-[#001e33]">
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw size={20} className="animate-spin text-blue-600" strokeWidth={1.75} />
          </div>
        ) : tareas.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2 size={28} className="mx-auto text-slate-300" strokeWidth={1.5} />
            <p className="mt-3 text-xs font-medium text-slate-500">Sin tareas pendientes</p>
          </div>
        ) : (
          <>
            {vencidas.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[#001e33]">
                  <AlertTriangle size={11} strokeWidth={2} /> Vencidas ({vencidas.length})
                </p>
                {vencidas.map(t => (
                  <NotifItem key={t.id} tarea={t} vencida onNavigate={onNavigate} fmtFecha={fmtFecha}/>
                ))}
              </div>
            )}
            {activas.length > 0 && (
              <div>
                <p className="border-b border-slate-100 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  En curso ({activas.length})
                </p>
                {activas.map(t => (
                  <NotifItem key={t.id} tarea={t} onNavigate={onNavigate} fmtFecha={fmtFecha}/>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!loading && tareas.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <button
            type="button"
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-colors hover:text-[#001e33]"
          >
            Ver todas las tareas <ArrowRight size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

const NotifItem = ({ tarea, vencida, onNavigate, fmtFecha }) => (
  <button
    type="button"
    onClick={onNavigate}
    className={`flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-slate-50 ${
      vencida ? 'border-l-[3px] border-l-blue-400 bg-blue-50/60 pl-[13px]' : ''
    }`}
  >
    <div
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
        vencida
          ? 'border-blue-200 bg-white text-blue-600'
          : tarea.estado === 'en_proceso'
            ? 'border-blue-200 bg-blue-50 text-blue-600'
            : 'border-slate-200 bg-white text-slate-500'
      }`}
    >
      {vencida ? <AlertTriangle size={12} strokeWidth={2} /> : <Clock size={12} strokeWidth={2} />}
    </div>
    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-bold leading-snug text-[#001e33]">{tarea.titulo}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        {tarea.prioridad && (
          <span
            className={`text-[10px] font-medium uppercase tracking-wide ${
              tarea.prioridad === 'alta' ? 'text-blue-600' : tarea.prioridad === 'media' ? 'text-slate-500' : 'text-slate-400'
            }`}
          >
            {tarea.prioridad}
          </span>
        )}
        {tarea.fecha_vencimiento && (
          <span className={`flex items-center gap-1 text-[10px] font-medium ${vencida ? 'text-slate-700' : 'text-slate-500'}`}>
            <CalendarDays size={10} strokeWidth={2} /> {fmtFecha(tarea.fecha_vencimiento)}
          </span>
        )}
      </div>
    </div>
  </button>
);

const KpiCard = ({ label, value, sub, icon, iconBg, iconColor, accent, highlight, onClick }) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={onClick ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
    className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 ${accent} border-l-[3px] pl-[17px]
      ${highlight ? 'ring-1 ring-slate-900/[0.06]' : ''}
      ${onClick ? 'cursor-pointer hover:border-slate-300 hover:shadow-md' : ''}`}
  >
    <div className="mb-4 flex items-start justify-between">
      <div className={`flex h-10 w-10 items-center justify-center rounded-md border border-slate-100 ${iconBg}`}>
        <span className={iconColor}>{icon}</span>
      </div>
      {highlight && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" title="Con actividad reciente" />}
    </div>
    <p className="text-2xl font-black tabular-nums leading-none text-[#001e33] sm:text-3xl">{value}</p>
    <p className="mt-3 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
    <p className="mt-1 truncate text-[11px] text-slate-500">{sub}</p>
  </div>
);

export default UserDashboard;
