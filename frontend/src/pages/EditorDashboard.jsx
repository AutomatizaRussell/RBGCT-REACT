import { useState, useEffect } from 'react'
import { EditorSidebar } from '../components/layout/EditorSidebar'
import Topbar from '../components/layout/Topbar'
import { useLocation, Outlet, useNavigate } from 'react-router-dom'
import {
  FileText,
  CheckCircle,
  BarChart3,
  Eye,
  BookOpen,
  History,
  ChevronRight,
} from 'lucide-react'
import TaskDashboard from '../components/tasks/TaskDashboard'
import UtilidadesSection from '../components/admin2/UtilidadesSection'
import { getAllCursos, getCursoHistorial } from '../lib/api'
import StatCard from '../components/ui/StatCard'
import ActionButton from '../components/ui/ActionButton'
import SugerenciasChat from '../components/common/SugerenciasChat'

const EditorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  const [stats, setStats] = useState({
    cursosTotal: 0,
    cursosHoy: 0,
    contenidosTotal: 0,
    cambiosHoy: 0,
  })

  const [recentCourses, setRecentCourses] = useState([])
  const [recentHistory, setRecentHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)

        const [cursos, historial] = await Promise.all([
          getAllCursos(),
          getCursoHistorial(20),
        ])

        const cursosArr = Array.isArray(cursos) ? cursos : cursos.results || []
        const histArr = Array.isArray(historial)
          ? historial
          : historial.results || []

        const contenidosTotal = cursosArr.reduce(
          (sum, curso) => sum + (curso.total_contenidos || 0),
          0
        )

        const hoy = new Date().toISOString().slice(0, 10)

        const cursosHoy = cursosArr.filter((curso) => {
          const fecha = curso.created_at || curso.fecha_creacion
          return fecha && fecha.slice(0, 10) === hoy
        }).length

        const cambiosHoy = histArr.filter((item) => {
          const fecha = item.created_at || item.fecha
          return fecha && fecha.slice(0, 10) === hoy
        }).length

        setStats({
          cursosTotal: cursosArr.length,
          cursosHoy,
          contenidosTotal,
          cambiosHoy,
        })

        setRecentCourses(cursosArr.slice(0, 5))
        setRecentHistory(histArr.slice(0, 5))
      } catch (error) {
        console.error('Error cargando dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  useEffect(() => {
    const path = location.pathname

    if (path === '/editor' || path === '/editor/') setActiveTab('dashboard')
    else if (path.includes('articulos')) setActiveTab('content')
    else if (path.includes('biblioteca')) setActiveTab('media')
    else if (path.includes('tareas')) setActiveTab('tasks')
    else if (path.includes('cursos')) setActiveTab('cursos')
    else if (path.includes('historial')) setActiveTab('historial')
    else if (path.includes('herramientas')) setActiveTab('herramientas')
    else if (path.includes('perfil')) setActiveTab('perfil')
  }, [location.pathname])

  const getHeaderTitle = () => {
    if (location.pathname.includes('cursos')) return 'Gestión de Cursos'
    if (location.pathname.includes('historial')) return 'Historial de Cambios'
    if (location.pathname.includes('tareas')) return 'Calendario de eventos'
    if (location.pathname.includes('herramientas')) return 'Herramientas'
    if (location.pathname.includes('perfil')) return 'Mi Perfil'
    if (location.pathname.includes('biblioteca')) return 'Biblioteca de Medios'

    return 'Panel de Edición'
  }

  const renderContent = () => {
    /**
     * Ruta base del editor.
     *
     * Se mantiene la lógica existente:
     * - /editor muestra dashboard editorial.
     * - subrutas delegan en Outlet o render específico.
     */
    if (location.pathname === '/editor' || location.pathname === '/editor/') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Cursos Totales"
              value={String(stats.cursosTotal)}
              icon={<BookOpen size={18} />}
              subtext={stats.cursosHoy > 0 ? `+${stats.cursosHoy} hoy` : 'Sin cambios hoy'}
              color="text-[#001871]"
            />

            <StatCard
              label="Contenidos"
              value={String(stats.contenidosTotal)}
              icon={<CheckCircle size={18} className="text-emerald-600" />}
              subtext="Archivos en cursos"
              color="text-emerald-600"
            />

            <StatCard
              label="Cambios Hoy"
              value={String(stats.cambiosHoy)}
              icon={<History size={18} />}
              subtext="Acciones registradas"
              color="text-blue-600"
            />

            <StatCard
              label="Cursos Activos"
              value={String(recentCourses.filter((curso) => curso.activo !== false).length)}
              icon={<Eye size={18} />}
              subtext="Visibles para usuarios"
            />
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-sm lg:col-span-2">
              <div className="mb-8 flex items-center justify-between border-b border-slate-100 pb-4">
                <h3 className="text-lg font-bold text-[#001871]">
                  Actividad Reciente
                </h3>

                <button
                  type="button"
                  onClick={() => navigate('/editor/historial')}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#001871]"
                >
                  Ver Historial <ChevronRight size={12} />
                </button>
              </div>

              {loading ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Cargando...
                </div>
              ) : recentHistory.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  Sin actividad reciente
                </div>
              ) : (
                <div className="space-y-1">
                  {recentHistory.map((item, index) => (
                    <ContentRow
                      key={index}
                      title={item.descripcion || item.accion || 'Cambio'}
                      author={item.usuario_nombre || 'Sistema'}
                      status={item.accion}
                      time={
                        item.created_at
                          ? new Date(item.created_at).toLocaleString('es-CO', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : ''
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-6 rounded-3xl border border-slate-100 bg-white p-8 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-slate-100 p-3">
                  <BarChart3 size={20} />
                </div>

                <h3 className="font-bold text-[#001871]">
                  Herramientas
                </h3>
              </div>

              <div className="space-y-3">
                <ActionButton
                  label="Ir a Cursos"
                  icon={<BookOpen size={14} />}
                  primary
                  onClick={() => navigate('/editor/cursos')}
                />

                <ActionButton
                  label="Ver Historial"
                  icon={<History size={14} />}
                  onClick={() => navigate('/editor/historial')}
                />
              </div>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'tasks') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <TaskDashboard />
        </div>
      )
    }

    if (activeTab === 'herramientas') {
      return (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-[#001871]">
              Herramientas
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Utilidades y herramientas de productividad
            </p>
          </div>

          <UtilidadesSection />
        </div>
      )
    }

    return <Outlet />
  }

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001871]">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <EditorSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f1f5f9]">
        <Topbar
          eyebrow="Editor Workspace"
          title={getHeaderTitle()}
          description="Contenido · Cursos · Documentación"
          userName="Editor"
          userRole="Contenido"
          avatarLabel="E"
          onOpenSidebar={() => setSidebarOpen(true)}
        />

        <div className="flex-1 overflow-auto p-4 lg:p-10">
          {renderContent()}
        </div>
      </main>
      <SugerenciasChat />
    </div>
  )
}

const ContentRow = ({ title, author, status, time }) => (
  <div className="flex items-center justify-between rounded-2xl border-b border-slate-50 px-3 py-4 transition-colors last:border-0 hover:bg-slate-50">
    <div className="flex items-center gap-4">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#001871] text-white">
        <FileText size={18} />
      </div>

      <div>
        <p className="text-sm font-bold tracking-tight text-slate-800">
          {title}
        </p>

        <p className="text-[10px] font-bold uppercase text-slate-400">
          Autor: {author}
        </p>
      </div>
    </div>

    <div className="text-right">
      <p
        className={`text-[10px] font-bold uppercase ${
          status === 'Pendiente'
            ? 'text-amber-500'
            : status === 'En Revisión'
              ? 'text-blue-500'
              : 'text-emerald-600'
        }`}
      >
        {status}
      </p>

      <p className="text-[10px] font-medium text-slate-400">
        {time}
      </p>
    </div>
  </div>
)

export default EditorDashboard
