import {
  LayoutDashboard,
  Users,
  Wrench,
  BookOpen,
  Settings,
  LogOut,
  UserCircle,
  CalendarDays,
  FileText,
  Building2,
  ClipboardList,
} from 'lucide-react'

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { getCertPermisosBackend } from '../../lib/api'
import { SidebarShell } from './SidebarShell'

export const Admin2Sidebar = ({ activeTab, setActiveTab, isOpen, onClose, collapsed }) => {
  const navigate = useNavigate()
  const { logout, empleadoData } = useAuth()
  const [puedeExpedirCert, setPuedeExpedirCert] = useState(false)

  useEffect(() => {
    if (!empleadoData?.id_empleado) return

    getCertPermisosBackend()
      .then((res) => {
        const ids = (res.permisos || []).map(String)
        setPuedeExpedirCert(ids.includes(String(empleadoData.id_empleado)))
      })
      .catch(() => {})
  }, [empleadoData?.id_empleado])

  const handleNavigation = (tab) => {
    setActiveTab(tab)
    navigate('/admin2')
    onClose?.()
  }

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      navigate('/')
    }
  }

  const sections = [
    {
      label: 'Gestión operativa',
      items: [
        { tab: 'dashboard', label: 'Resumen Equipo', icon: LayoutDashboard },
        { tab: 'users', label: 'Colaboradores', icon: Users },
        { tab: 'tasks', label: 'Calendario', icon: CalendarDays },
        { tab: 'autogestion', label: 'Auto Gestión', icon: ClipboardList },
        { tab: 'contratos', label: 'Gestión Personas', icon: FileText },
        { tab: 'clientes', label: 'Clientes', icon: Building2 },
        { tab: 'herramientas', label: 'Herramientas', icon: Wrench },
      ],
    },
    {
      label: 'Documentación',
      items: [
        { tab: 'reglamento', label: 'Reglamento', icon: BookOpen },
        {
          tab: 'certificado',
          label: 'Certificado de Empleo',
          icon: FileText,
          visible: puedeExpedirCert,
        },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { tab: 'profile', label: 'Mi Perfil', icon: UserCircle },
        { tab: 'configuraciones', label: 'Configuraciones', icon: Settings },
      ],
    },
  ]

  return (
    <SidebarShell
      title=""
      subtitle=""
      badge="Administrative Mode"
      activeTab={activeTab}
      isOpen={isOpen}
      onClose={onClose}
      onNavigate={handleNavigation}
      sections={sections}
      collapsed={collapsed}
      footer={
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold text-slate-500 transition hover:bg-red-50 hover:text-red-600"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      }
    />
  )
}