import { useState, useEffect } from 'react';
import { EditorSidebar } from '../components/layout/EditorSidebar';
import { useLocation, Outlet, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  BarChart3,
  Send,
  Eye,
  BookOpen,
  History,
  ChevronRight
} from 'lucide-react';
import TaskDashboard from '../components/tasks/TaskDashboard';
import UtilidadesSection from '../components/admin2/UtilidadesSection';
import { getAllCursos, getCursoHistorial } from '../lib/db';

const EditorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    cursosTotal: 0,
    cursosHoy: 0,
    contenidosTotal: 0,
    cambiosHoy: 0,
  });
  const [recentCourses, setRecentCourses] = useState([]);
  const [recentHistory, setRecentHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [cursos, historial] = await Promise.all([
          getAllCursos(),
          getCursoHistorial(20),
        ]);

        const cursosArr = Array.isArray(cursos) ? cursos : cursos.results || [];
        const histArr = Array.isArray(historial) ? historial : historial.results || [];

        const contenidosTotal = cursosArr.reduce((sum, c) => sum + (c.total_contenidos || 0), 0);

        const hoy = new Date().toISOString().slice(0, 10);
        const cursosHoy = cursosArr.filter(c => {
          const d = c.created_at || c.fecha_creacion;
          return d && d.slice(0, 10) === hoy;
        }).length;
        const cambiosHoy = histArr.filter(h => {
          const d = h.created_at || h.fecha;
          return d && d.slice(0, 10) === hoy;
        }).length;

        setStats({
          cursosTotal: cursosArr.length,
          cursosHoy,
          contenidosTotal,
          cambiosHoy,
        });

        setRecentCourses(cursosArr.slice(0, 5));
        setRecentHistory(histArr.slice(0, 5));
      } catch (e) {
        console.error('Error cargando dashboard:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  useEffect(() => {
    const path = location.pathname;
    if (path === '/editor' || path === '/editor/') setActiveTab('dashboard');
    else if (path.includes('articulos')) setActiveTab('content');
    else if (path.includes('biblioteca')) setActiveTab('media');
    else if (path.includes('tareas')) setActiveTab('tasks');
    else if (path.includes('cursos')) setActiveTab('cursos');
    else if (path.includes('historial')) setActiveTab('historial');
    else if (path.includes('herramientas')) setActiveTab('herramientas');
    else if (path.includes('perfil')) setActiveTab('perfil');
  }, [location.pathname]);

  const renderContent = () => {
    // Si la ruta es exactamente /editor, mostramos el dashboard
    // Si es /editor/biblioteca o algo más, mostramos el Outlet
    if (location.pathname === '/editor' || location.pathname === '/editor/') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Métricas reales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard label="Cursos Totales" value={String(stats.cursosTotal)} icon={<BookOpen size={18}/>} subtext={stats.cursosHoy > 0 ? `+${stats.cursosHoy} hoy` : 'Sin cambios hoy'} color="text-[#001e33]" />
            <StatCard label="Contenidos" value={String(stats.contenidosTotal)} icon={<CheckCircle size={18} className="text-emerald-600"/>} subtext="Archivos en cursos" color="text-emerald-600" />
            <StatCard label="Cambios Hoy" value={String(stats.cambiosHoy)} icon={<History size={18}/>} subtext="Acciones registradas" color="text-blue-600" />
            <StatCard label="Cursos Activos" value={String(recentCourses.filter(c => c.activo !== false).length)} icon={<Eye size={18}/>} subtext="Visibles para usuarios" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cursos Recientes / Actividad */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#001e33]">Actividad Reciente</h3>
                <button onClick={() => navigate('/editor/historial')} className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#001e33] transition-colors flex items-center gap-1">
                  Ver Historial <ChevronRight size={12}/>
                </button>
              </div>
              {loading ? (
                <div className="text-center py-8 text-xs text-slate-400">Cargando...</div>
              ) : recentHistory.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">Sin actividad reciente</div>
              ) : (
                <div className="space-y-1">
                  {recentHistory.map((h, idx) => (
                    <ContentRow
                      key={idx}
                      title={h.descripcion || h.accion || 'Cambio'}
                      author={h.usuario_nombre || 'Sistema'}
                      status={h.accion}
                      time={h.created_at ? new Date(h.created_at).toLocaleString('es-CO', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : ''}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-100 rounded-xl"><BarChart3 size={20} /></div>
                 <h3 className="font-bold text-[#001e33]">Herramientas</h3>
              </div>
              <div className="space-y-3">
                <ActionButton label="Ir a Cursos" icon={<BookOpen size={14}/>} primary onClick={() => navigate('/editor/cursos')} />
                <ActionButton label="Ver Historial" icon={<History size={14}/>} onClick={() => navigate('/editor/historial')} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Si la pestaña es 'tasks', mostramos el calendario
    if (activeTab === 'tasks') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <TaskDashboard />
        </div>
      );
    }

    // Si la pestaña es 'herramientas', mostramos las utilidades
    if (activeTab === 'herramientas') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#001e33]">Herramientas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Utilidades y herramientas de productividad</p>
          </div>
          <UtilidadesSection />
        </div>
      );
    }

    // Para cualquier otra sub-ruta (/editor/biblioteca, /editor/perfil)
    return <Outlet />;
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      {/* Corregido: Usamos el nombre correcto del componente importado */}
      <EditorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Editor Workspace</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {location.pathname.includes('cursos') ? 'Gestión de Cursos' :
               location.pathname.includes('historial') ? 'Historial de Cambios' :
               location.pathname.includes('tareas') ? 'Calendario de Tareas' :
               location.pathname.includes('herramientas') ? 'Herramientas' :
               location.pathname.includes('perfil') ? 'Mi Perfil' :
               location.pathname.includes('biblioteca') ? 'Biblioteca de Medios' :
               'Panel de Edición'}
            </h2>
          </div>
        </header>

        <div className="p-10 overflow-auto flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTES AUXILIARES (SE MANTIENEN IGUAL) ---

const StatCard = ({ label, value, icon, subtext, color = "text-[#001e33]" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all duration-300">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[#001e33]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);



const ContentRow = ({ title, author, status, time }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-[#001e33] text-white rounded-xl flex items-center justify-center">
        <FileText size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{title}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Autor: {author}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`text-[10px] font-bold uppercase ${
        status === 'Pendiente' ? 'text-amber-500' : status === 'En Revisión' ? 'text-blue-500' : 'text-emerald-600'
      }`}>{status}</p>
      <p className="text-[10px] text-slate-400 font-medium">{time}</p>
    </div>
  </div>
);

const ActionButton = ({ label, icon, primary, onClick }) => (
  <button onClick={onClick} className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
    primary ? 'bg-[#001e33] text-white hover:bg-slate-800' : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
  }`}>
    {icon} {label}
  </button>
);

export default EditorDashboard;