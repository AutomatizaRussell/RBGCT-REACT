import {
  LayoutDashboard,
  ClipboardList,
  UserCircle,
  LogOut,
  BookOpen,
  PlayCircle,
  Wrench,
  FileSpreadsheet,
  // Building2, // Pausado temporalmente
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getAllCursos } from '../../lib/api'
import { SidebarShell } from './SidebarShell'

export const EmpleadoSidebar = ({ activeTab, setActiveTab, isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const navigate = useNavigate()
  const { logout, empleadoData } = useAuth()

  const nombreUsuario = empleadoData?.primer_nombre
    ? `${empleadoData.primer_nombre} ${empleadoData.primer_apellido || ''}`.trim()
    : 'Colaborador'

  const inicial = nombreUsuario.charAt(0).toUpperCase()

  const areaUsuario =
    empleadoData?.nombre_area ||
    empleadoData?.nombre_cargo ||
    'Colaborador'

  const [tieneCursos, setTieneCursos] = useState(false)

  const puedeVerSQF = Boolean(
    empleadoData?.acceso_formularios_sqf ||
    empleadoData?.acceso_sqf_contratos ||
    empleadoData?.acceso_sqf_facturacion ||
    empleadoData?.acceso_sqf_auditoria
  )

  useEffect(() => {
    getAllCursos()
      .then((data) => {
        const cursos = Array.isArray(data) ? data : data?.results || []
        setTieneCursos(cursos.some((curso) => curso.activo !== false))
      })
      .catch(() => { })
  }, [])

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch {
      navigate('/')
    }
  }

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
      // case 'clientes':
      //   navigate('/app/mis-clientes')
      //   break
      case 'sqf':
        navigate('/app/sqf')
        break
      default:
        navigate('/app')
    }
  }

  const sections = [
    {
      label: 'Mi espacio',
      items: [
        { tab: 'dashboard', label: 'Mi resumen', icon: LayoutDashboard },
        { tab: 'tasks', label: 'Auto gestión', icon: ClipboardList },
        { tab: 'sqf', label: 'Formularios SQF', icon: FileSpreadsheet, visible: puedeVerSQF },
        // { tab: 'clientes', label: 'Mis clientes', icon: Building2, visible: true }, // Pausado temporalmente
        { tab: 'profile', label: 'Mi perfil', icon: UserCircle },
      ],
    },
    {
      label: 'Recursos',
      items: [
        { tab: 'cursos', label: 'Formación', icon: PlayCircle, visible: tieneCursos },
        { tab: 'reglamento', label: 'Reglamento', icon: BookOpen },
        { tab: 'utilidades', label: 'Herramientas', icon: Wrench },
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
      isCollapsed={isCollapsed}
      onClose={onClose}
      onToggleCollapse={onToggleCollapse}
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
