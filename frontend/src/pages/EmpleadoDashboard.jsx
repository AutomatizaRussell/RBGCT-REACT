import { useState, useEffect, useRef } from 'react'
import { useLocation, Outlet, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'

import { EmpleadoSidebar } from '../components/layout/EmpleadoSidebar'
import Topbar from '../components/layout/Topbar'
import { useAuth } from '../hooks/useAuth'
import { getTareasByEmpleado, getMisSugerencias, confirmarSugerenciaVista } from '../lib/api'
import UtilidadesSection from '../components/herramientas/UtilidadesSection'
import FormulariosSQF from '../components/features/FormulariosSQF/FormulariosSQF'
import EmpleadoHome from '../components/empleados/portal/dashboard/EmpleadoHome'
import NotificationsPanel from '../components/empleados/portal/dashboard/NotificationsPanel'
import SugerenciasChat from '../components/common/SugerenciasChat'

/**
 * Dashboard del empleado (ruta /app).
 *
 * Refactorizado con estilo minimalista SaaS: fondo gris muy claro, tarjetas
 * blancas con bordes sutiles, sombras suaves y tipografía limpia.
 *
 * Responsabilidades de este componente:
 *  - Layout principal (sidebar + topbar + área de contenido).
 *  - Estado global del tab activo y sincronización con la URL.
 *  - Carga de tareas y notificaciones.
 *  - Renderizado condicional de Home, Utilidades, SQF y Outlet (rutas anidadas).
 */
const UserDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const { empleadoData, logout } = useAuth()

  // ── Stats de tareas ──
  const [taskStats, setTaskStats] = useState({
    pending: 0,
    inProgress: 0,
    completed: 0,
    total: 0,
  })
  const [loadingStats, setLoadingStats] = useState(true)

  // ── Notificaciones / campanita ──
  const [showNotif, setShowNotif] = useState(false)
  const [notifTareas, setNotifTareas] = useState([])
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [confirmaciones, setConfirmaciones] = useState([])
  const notifRef = useRef(null)

  // ── Helpers de ruta ──
  // Acceso a SQF: solo si tiene al menos un flag individual explícito.
  // El flag general 'acceso_formularios_sqf' no otorga acceso automático.
  const tieneAccesoSQF = Boolean(
    empleadoData?.acceso_sqf_clientes ||
    empleadoData?.acceso_sqf_contratos ||
    empleadoData?.acceso_sqf_facturacion ||
    empleadoData?.acceso_sqf_auditoria
  )

  const isHome = location.pathname === '/app' || location.pathname === '/app/'
  const isUtilidades = location.pathname.includes('/app/utilidades')
  const isSQF = location.pathname.includes('/app/sqf') && tieneAccesoSQF

  // Sincroniza tab activo con la URL actual.
  useEffect(() => {
    if (location.state?.tab && tieneAccesoSQF) {
      setActiveTab(location.state.tab)
      return
    }

    const path = location.pathname
    if (path.includes('auto-gestion')) setActiveTab('tasks')
    else if (path.includes('perfil')) setActiveTab('profile')
    else if (path.includes('manuales')) setActiveTab('cursos')
    else if (path.includes('comunicados')) setActiveTab('reglamento')
    else if (path.includes('utilidades')) setActiveTab('utilidades')
    else if (path.includes('sqf')) setActiveTab('sqf')
    else setActiveTab('dashboard')
  }, [location.pathname, location.state, tieneAccesoSQF])

  // Retrae el sidebar automáticamente al entrar al formulario SQF.
  useEffect(() => {
    setSidebarCollapsed(isSQF)
  }, [isSQF])

  // Carga las estadísticas de tareas del empleado autenticado.
  useEffect(() => {
    if (!empleadoData?.id_empleado) return

    const fetchStats = async () => {
      try {
        setLoadingStats(true)
        const data = await getTareasByEmpleado(empleadoData.id_empleado)
        const tareas = Array.isArray(data) ? data : data?.results || []

        setTaskStats({
          pending: tareas.filter((t) => t.estado === 'pendiente').length,
          inProgress: tareas.filter((t) => t.estado === 'en_proceso').length,
          completed: tareas.filter((t) => t.estado === 'completada').length,
          total: tareas.length,
        })
      } catch {
        // Los stats del dashboard no son críticos; no se interrumpe la experiencia.
      } finally {
        setLoadingStats(false)
      }
    }

    fetchStats()
  }, [empleadoData?.id_empleado])

  // Cierra el panel de notificaciones al hacer click fuera.
  useEffect(() => {
    const handler = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotif(false)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Carga confirmaciones de sugerencias recibidas (badge de la campanita).
  const cargarConfirmaciones = async () => {
    try {
      const data = await getMisSugerencias()
      const lista = data?.sugerencias || []
      setConfirmaciones(lista.filter((s) => s.recibida && !s.confirmacion_vista))
    } catch {
      // Silencioso: no debe tumbar el dashboard.
    }
  }

  useEffect(() => {
    if (empleadoData?.id_empleado) cargarConfirmaciones()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoData?.id_empleado])

  const descartarConfirmacion = async (id) => {
    setConfirmaciones((prev) => prev.filter((s) => s.id !== id))
    try {
      await confirmarSugerenciaVista(id)
    } catch {
      // Silencioso
    }
  }

  // Abre/cierra el panel de notificaciones y recarga su contenido.
  const toggleNotif = async () => {
    if (showNotif) {
      setShowNotif(false)
      return
    }

    setShowNotif(true)
    if (!empleadoData?.id_empleado) return

    setLoadingNotif(true)
    try {
      const data = await getTareasByEmpleado(empleadoData.id_empleado)
      const tareas = Array.isArray(data) ? data : data?.results || []
      setNotifTareas(tareas.filter((t) => t.estado !== 'completada'))
      cargarConfirmaciones()
    } catch {
      // Silencioso
    } finally {
      setLoadingNotif(false)
    }
  }

  // ── Títulos del header ──
  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador'

  const hora = new Date().getHours()
  const saludo =
    hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'

  const getHeaderTitle = () => {
    if (isHome || isUtilidades || isSQF) return null

    if (activeTab === 'tasks') return 'Mis solicitudes'
    if (activeTab === 'profile') return 'Mi Perfil'
    if (activeTab === 'cursos') return 'Cursos y Capacitaciones'
    if (activeTab === 'reglamento') return 'Reglamento Interno'

    return 'Portal Empleado'
  }

  const topbarTitle = isHome
    ? `${saludo}, ${nombreUsuario}`
    : isSQF
      ? 'Formularios SQF'
      : getHeaderTitle() || 'Portal Empleado'

  const notifCount = taskStats.pending + confirmaciones.length

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-sans antialiased text-slate-900">
      {/* Overlay móvil para el sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <EmpleadoSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#f8f9fb]">
        <Topbar
          eyebrow="Portal del empleado"
          title={topbarTitle}
          userRole="Colaborador"
          userName={nombreUsuario}
          avatarLabel={nombreUsuario.charAt(0).toUpperCase()}
          userEmail={empleadoData?.correo_corporativo}
          userCargo={empleadoData?.nombre_cargo}
          userArea={empleadoData?.nombre_area}
          onLogout={logout}
          onOpenSidebar={() => setSidebarOpen(true)}
          actions={
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={toggleNotif}
                className={`
                  relative flex h-10 w-10 items-center justify-center rounded-xl border transition-colors
                  ${showNotif
                    ? 'border-slate-200 bg-white text-slate-700'
                    : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-white hover:text-slate-700'}
                `}
                aria-label="Notificaciones"
              >
                <Bell size={18} strokeWidth={1.75} />

                {notifCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#001871] px-1 text-[10px] font-semibold text-white">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </button>

              {showNotif && (
                <NotificationsPanel
                  tareas={notifTareas}
                  loading={loadingNotif}
                  confirmaciones={confirmaciones}
                  onDescartarConfirmacion={descartarConfirmacion}
                  onClose={() => setShowNotif(false)}
                  onNavigate={() => {
                    setShowNotif(false)
                    setActiveTab('tasks')
                    navigate('/app/auto-gestion')
                  }}
                  count={notifCount}
                />
              )}
            </div>
          }
        />

        <div className="flex-1 overflow-auto px-4 py-6 lg:px-10 lg:py-8">
          {isHome ? (
            <EmpleadoHome
              taskStats={taskStats}
              loadingStats={loadingStats}
              empleadoData={empleadoData}
              setActiveTab={setActiveTab}
              navigate={navigate}
            />
          ) : isUtilidades ? (
            <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
              <div className="mb-8 border-b border-slate-100 bg-white rounded-2xl p-6 shadow-sm">
                <p className="text-xs font-medium uppercase tracking-widest text-slate-400">
                  Productividad
                </p>
                <h3 className="mt-2 text-lg font-semibold text-slate-900">
                  Herramientas
                </h3>
                <p className="mt-1 max-w-xl text-sm text-slate-500">
                  Utilidades corporativas disponibles para su labor diaria.
                </p>
              </div>

              <UtilidadesSection />
            </div>
          ) : isSQF ? (
            <div className="animate-in fade-in duration-500">
              <FormulariosSQF
                onBack={() => {
                  setActiveTab('dashboard')
                  navigate('/app')
                }}
              />
            </div>
          ) : (
            <div className="mx-auto max-w-6xl animate-in fade-in duration-500">
              <Outlet />
            </div>
          )}
        </div>
      </main>

      <SugerenciasChat />
    </div>
  )
}

export default UserDashboard
