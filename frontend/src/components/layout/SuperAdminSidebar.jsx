import {
  LayoutDashboard,
  Users,
  Database,
  Settings,
  LogOut,
  CalendarDays,
  Key,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SidebarShell } from './SidebarShell'

export const SuperAdminSidebar = ({ activeTab, setActiveTab, isOpen, isCollapsed, onClose, onToggleCollapse }) => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleNavigation = (tab) => {
    setActiveTab(tab)
    navigate('/superadmin')
    onClose?.()
  }

  const handleLogout = async () => {
    try {
      await logout()
      window.location.href = '/'
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      window.location.href = '/'
    }
  }

  const sections = [
    {
      label: 'Menú principal',
      items: [
        { tab: 'dashboard', label: 'Panel General', icon: LayoutDashboard },
        { tab: 'users', label: 'Gestión de Personal', icon: Users },
        { tab: 'tasks', label: 'Calendario Tareas', icon: CalendarDays },
        { tab: 'logs', label: 'Logs de n8n', icon: Database },
      ],
    },
    {
      label: 'Configuración',
      items: [
        { tab: 'settings', label: 'Ajustes Sistema', icon: Settings },
        { tab: 'apikeys', label: 'API Keys', icon: Key },
      ],
    },
  ]

  return (
    <SidebarShell
      title=""
      subtitle=""
      badge="Superadmin"
      activeTab={activeTab}
      isOpen={isOpen}
      isCollapsed={isCollapsed}
      onClose={onClose}
      onToggleCollapse={onToggleCollapse}
      onNavigate={handleNavigation}
      sections={sections}
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
