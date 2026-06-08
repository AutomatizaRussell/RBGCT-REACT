import {
  LayoutDashboard,
  Calendar,
  History,
  LogOut,
  UserCircle,
  BookOpen,
  Wrench,
} from 'lucide-react'

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { SidebarShell } from './SidebarShell'

export const EditorSidebar = ({ activeTab, setActiveTab, isOpen, onClose }) => {
  const navigate = useNavigate()
  const { logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
    } catch (error) {
      console.error('Error al cerrar sesión:', error)
      navigate('/')
    }
  }

  const handleNavigation = (tab) => {
    setActiveTab(tab)
    onClose?.()

    switch (tab) {
      case 'dashboard':
        navigate('/editor')
        break
      case 'tasks':
        navigate('/editor/tareas')
        break
      case 'cursos':
        navigate('/editor/cursos')
        break
      case 'historial':
        navigate('/editor/historial')
        break
      case 'herramientas':
        navigate('/editor/herramientas')
        break
      case 'perfil':
        navigate('/editor/perfil')
        break
      default:
        navigate('/editor')
    }
  }

  const sections = [
    {
      label: 'Escritorio',
      items: [
        { tab: 'dashboard', label: 'Panel Editorial', icon: LayoutDashboard },
      ],
    },
    {
      label: 'Contenido',
      items: [
        { tab: 'cursos', label: 'Cursos', icon: BookOpen },
        { tab: 'historial', label: 'Historial', icon: History },
      ],
    },
    {
      label: 'Planificación',
      items: [
        { tab: 'tasks', label: 'Calendario Tareas', icon: Calendar },
        { tab: 'herramientas', label: 'Herramientas', icon: Wrench },
      ],
    },
    {
      label: 'Cuenta',
      items: [
        { tab: 'perfil', label: 'Mi Perfil', icon: UserCircle },
      ],
    },
  ]

  return (
    <SidebarShell
      title=""
      subtitle=""
      badge="Content Editor"
      activeTab={activeTab}
      isOpen={isOpen}
      onClose={onClose}
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