import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  LogOut,
  BookOpen,
  PlayCircle,
  Wrench,
  Building2,
  FileText,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getAllCursos } from '../../lib/api'
import { SidebarShell } from './SidebarShell'

/**
 * UserSidebar
 *
 * Barra lateral para usuarios finales / colaboradores.
 *
 * Alcance de este cambio:
 * - Solo rediseño visual.
 * - Mantiene rutas existentes.
 * - Mantiene lógica de logout existente.
 * - Mantiene consulta de cursos existente.
 * - Mantiene permisos SQF existentes.
 * - Mantiene contrato de props: activeTab, setActiveTab, isOpen, onClose.
 *
 * Riesgo principal:
 * - Cambia ancho visual de w-64 a w-80 porque SidebarShell replica
 *   el estilo del proyecto Next.js. Por eso debe validarse el layout
 *   del dashboard contenedor.
 */
export const UserSidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navigate = useNavigate()
  const { logout, empleadoData } = useAuth()

  /**
   * Nombre visible del usuario.
   *
   * Se conserva la lógica previa:
   * - Si hay primer_nombre, se construye nombre + apellido.
   * - Si no hay datos, se usa "Colaborador".
   */
  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador'

  const inicial = nombreUsuario.charAt(0).toUpperCase()

  /**
   * Área/cargo visible en la tarjeta del usuario.
   *
   * Se mantiene fallback defensivo para evitar errores visuales si
   * empleadoData llega incompleto.
   */
  const areaUsuario =
    empleadoData?.nombre_area ||
    empleadoData?.nombre_cargo ||
    'Colaborador'

  /**
   * Permiso SQF.
   *
   * No se cambia la regla funcional existente.
   */
  const tieneSQF = Boolean(empleadoData?.acceso_formularios_sqf)

  /**
   * Cursos disponibles.
   *
   * Se conserva la llamada existente a getAllCursos.
   * Si falla, simplemente no muestra el botón Cursos.
   */
  const [tieneCursos, setTieneCursos] = useState(false)

  useEffect(() => {
    getAllCursos()
      .then((data) => {
        const cursos = Array.isArray(data) ? data : data?.results || []
        setTieneCursos(cursos.some((curso) => curso.activo !== false))
      })
      .catch(() => { })
  }, [])

  /**
   * Logout.
   *
   * Se conserva comportamiento:
   * - Ejecuta logout del AuthContext.
   * - Redirige al login.
   */
  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch {
      navigate('/')
    }
  }

  /**
   * Navegación por tabs.
   *
   * Se conservan las rutas existentes del sidebar anterior.
   * Solo cambia la capa visual del componente.
   */
  const handleNavigation = (tab) => {
    setActiveTab(tab)
    onClose?.()

    switch (tab) {
      case 'dashboard':
        navigate('/app')
        break

      case 'tasks':
        navigate('/app/auto-gestion')
        break

      case 'profile':
        navigate('/app/perfil')
        break

      case 'cursos':
        navigate('/app/manuales')
        break

      case 'reglamento':
        navigate('/app/comunicados')
        break

      case 'utilidades':
        navigate('/app/utilidades')
        break

      case 'clientes':
        navigate('/app/mis-clientes')
        break

      case 'sqf':
        navigate('/app/sqf')
        break

      default:
        navigate('/app')
    }
  }

  /**
   * Definición declarativa del menú.
   *
   * Ventaja:
   * - Evita repetir JSX por cada botón.
   * - Facilita rediseñar todos los roles desde SidebarShell.
   * - Permite ocultar elementos con visible=false sin tocar la UI base.
   */
  const sections = [
    {
      label: 'Mi espacio',
      items: [
        {
          tab: 'dashboard',
          label: 'Mi resumen',
          icon: LayoutDashboard,
        },
        {
          tab: 'tasks',
          label: 'Auto gestión',
          icon: ClipboardList,
        },
        {
          tab: 'clientes',
          label: 'Mis clientes',
          icon: Building2,
        },
        {
          tab: 'profile',
          label: 'Mi perfil',
          icon: UserCircle,
        },
      ],
    },
    {
      label: 'Recursos',
      items: [
        {
          tab: 'cursos',
          label: 'Cursos',
          icon: PlayCircle,
          visible: tieneCursos,
        },
        {
          tab: 'reglamento',
          label: 'Reglamento',
          icon: BookOpen,
        },
        {
          tab: 'utilidades',
          label: 'Herramientas',
          icon: Wrench,
        },
        {
          tab: 'sqf',
          label: 'Formulario Creacion clientes/contratos',
          icon: FileText,
          visible: tieneSQF,
        },
      ],
    },
  ]

  return (
    <SidebarShell
      title={null}
      subtitle={null}
      badge="Portal Empleado"
      activeTab={activeTab}
      isOpen={isOpen}
      onClose={onClose}
      onNavigate={handleNavigation}
      sections={sections}
      userCard={
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#001871] to-[#00a9ce] text-sm font-bold text-white shadow-md">
              {inicial}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-[#001871]">
                {nombreUsuario}
              </p>

              <p className="truncate text-[11px] font-medium text-slate-500">
                {areaUsuario}
              </p>
            </div>
          </div>
        </div>
      }
      footer={
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} />
          Salir del portal
        </button>
      }
    />
  )
}