import React, { useMemo, useState } from 'react'
import PreviewErrorBoundary from './components/dev/PreviewErrorBoundary'

import {
  usuarioMock,
  empleadosMock,
  tareasMock,
  clientesMock,
  contratosMock,
  cursosMock,
} from './mocks/devPreviewData'

// UI básicos
import StatCard from './components/ui/StatCard'
import ActionButton from './components/ui/ActionButton'
import RecentUserRow from './components/ui/RecentUserRow'

// Layouts
import Sidebar from './components/layout/Sidebar'
import Admin2Sidebar from './components/layout/Admin2Sidebar'
import UserSidebar from './components/layout/UserSidebar'
import EditorSidebar from './components/layout/EditorSidebar'

// Admin / usuarios
import UserTable from './components/users/UserTable'
import UserTableadm2 from './components/users/UserTableadm2'
import RoleModal from './components/users/RoleModal'
import UserProfile from './components/users/UserProfile'
import CreateUserPage from './components/users/CreateUserPage'
import SystemSettings from './components/users/SystemSettings'
import N8nLogs from './components/users/N8nLogs'
import AutoGestion from './components/users/AutoGestion'
import ManualesCargo from './components/users/ManualesCargo'
import ComunicadosInternos from './components/users/ComunicadosInternos'
import MisClientes from './components/users/MisClientes'
import MisClienteDetalle from './components/users/MisClienteDetalle'

// Admin2
import GeminiChat from './components/admin2/GeminiChat'
import CursosSection from './components/admin2/CursosSection'
import UtilidadesSection from './components/admin2/UtilidadesSection'
import ClientesSection from './components/admin2/ClientesSection'
import ContratosSection from './components/admin2/ContratosSection'
import CertificadoSection from './components/admin2/CertificadoSection'

// Editor
import EditorCursos from './components/editor/EditorCursos'
import EditorHistorial from './components/editor/EditorHistorial'

// Tasks
import TaskManager from './components/tasks/TaskManager'
import TaskDashboard from './components/tasks/TaskDashboard'
import TaskCalendar from './components/tasks/TaskCalendar'

// Tools
import LimpiadorMetadatos from './components/tools/LimpiadorMetadatos'
import GestorPDF from './components/tools/GestorPDF'
import ConvertidorArchivos from './components/tools/ConvertidorArchivos'

// Pages
import Login from './pages/Login'
import VerifyCode from './pages/VerifyCode'
import CompleteProfile from './pages/CompleteProfile'
import AdminDashboard from './pages/AdminDashboard'
import Admin2Dashboard from './pages/Admin2Dashboard'
import EditorDashboard from './pages/EditorDashboard'
import UserDashboard from './pages/UserDashboard'
import FormulariosSQF from './pages/FormulariosSQF'
import GestorPDFPage from './pages/GestorPDFPage'

/**
 * Wrapper visual para cada bloque del preview.
 *
 * Intención:
 * - Dar contexto visual uniforme.
 * - Aislar fallos por componente usando ErrorBoundary.
 * - Permitir montar componentes reales sin depender de navegación real.
 */
function PreviewBlock({ title, description, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-5 border-b border-slate-100 pb-4">
        <h2 className="text-xl font-semibold text-slate-900">
          {title}
        </h2>

        {description ? (
          <p className="mt-1 text-sm text-slate-500">
            {description}
          </p>
        ) : null}
      </div>

      {children}
    </section>
  )
}

/**
 * Render seguro de componentes.
 *
 * Intención:
 * - Si un componente depende de props/contexto/API y falla, se muestra el error
 *   sin tumbar toda la galería.
 */
function SafeComponent({ name, children }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
        {name}
      </div>

      <PreviewErrorBoundary name={name}>
        {children}
      </PreviewErrorBoundary>
    </div>
  )
}

export default function DevPreview() {
  const sections = useMemo(
    () => [
      'ui',
      'layouts',
      'admin',
      'admin2',
      'editor',
      'usuario',
      'tasks',
      'tools',
      'pages',
    ],
    []
  )

  const [activeSection, setActiveSection] = useState('ui')

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <section className="mx-auto max-w-[1600px] space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">
                DevPreview
              </h1>

              <p className="mt-2 max-w-3xl text-sm text-slate-500">
                Galería visual aislada para renderizar componentes reales con datos mock.
                No usa login, no depende del backend y no debe alterar lógica productiva.
              </p>
            </div>

            <div className="rounded-xl bg-slate-100 px-4 py-2 text-xs text-slate-500">
              Modo desarrollo visual
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section}
                type="button"
                onClick={() => setActiveSection(section)}
                className={[
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  activeSection === section
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {section}
              </button>
            ))}
          </nav>
        </header>

        {activeSection === 'ui' && (
          <PreviewBlock
            title="UI básicos"
            description="Componentes pequeños. Son los primeros que debes estabilizar."
          >
            <div className="grid gap-4 lg:grid-cols-3">
              <SafeComponent name="StatCard">
                <div className="grid gap-4 md:grid-cols-2">
                  <StatCard
                    title="Usuarios activos"
                    value="128"
                    description="Usuarios habilitados"
                  />

                  <StatCard
                    title="Contratos"
                    value="42"
                    description="Contratos vigentes"
                  />
                </div>
              </SafeComponent>

              <SafeComponent name="ActionButton">
                <div className="flex flex-wrap gap-3">
                  <ActionButton>Crear usuario</ActionButton>
                  <ActionButton>Exportar</ActionButton>
                  <ActionButton>Ver detalle</ActionButton>
                </div>
              </SafeComponent>

              <SafeComponent name="RecentUserRow">
                <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
                  <RecentUserRow
                    name="Ana Gómez"
                    email="ana.gomez@empresa.com"
                    role="Admin"
                    status="Activo"
                  />
                  <RecentUserRow
                    name="Carlos Ruiz"
                    email="carlos.ruiz@empresa.com"
                    role="Usuario"
                    status="Pendiente"
                  />
                </div>
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'layouts' && (
          <PreviewBlock
            title="Layouts y sidebars"
            description="Renderiza navegación lateral y estructuras base."
          >
            <div className="grid gap-6 xl:grid-cols-4">
              <SafeComponent name="Sidebar">
                <div className="h-[650px] overflow-hidden rounded-xl border bg-white">
                  <Sidebar />
                </div>
              </SafeComponent>

              <SafeComponent name="Admin2Sidebar">
                <div className="h-[650px] overflow-hidden rounded-xl border bg-white">
                  <Admin2Sidebar />
                </div>
              </SafeComponent>

              <SafeComponent name="UserSidebar">
                <div className="h-[650px] overflow-hidden rounded-xl border bg-white">
                  <UserSidebar user={usuarioMock} />
                </div>
              </SafeComponent>

              <SafeComponent name="EditorSidebar">
                <div className="h-[650px] overflow-hidden rounded-xl border bg-white">
                  <EditorSidebar />
                </div>
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'admin' && (
          <PreviewBlock
            title="Admin / usuarios"
            description="Componentes asociados a gestión de usuarios y configuración."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="UserTable">
                <UserTable users={empleadosMock} />
              </SafeComponent>

              <SafeComponent name="UserTableadm2">
                <UserTableadm2 users={empleadosMock} />
              </SafeComponent>

              <SafeComponent name="RoleModal">
                <RoleModal
                  isOpen
                  user={empleadosMock[0]}
                  onClose={() => {}}
                  onSave={() => {}}
                />
              </SafeComponent>

              <SafeComponent name="UserProfile">
                <UserProfile user={usuarioMock} />
              </SafeComponent>

              <SafeComponent name="CreateUserPage">
                <CreateUserPage />
              </SafeComponent>

              <SafeComponent name="SystemSettings">
                <SystemSettings />
              </SafeComponent>

              <SafeComponent name="N8nLogs">
                <N8nLogs />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'admin2' && (
          <PreviewBlock
            title="Admin2"
            description="Secciones administrativas secundarias."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="GeminiChat">
                <GeminiChat />
              </SafeComponent>

              <SafeComponent name="CursosSection">
                <CursosSection cursos={cursosMock} />
              </SafeComponent>

              <SafeComponent name="UtilidadesSection">
                <UtilidadesSection />
              </SafeComponent>

              <SafeComponent name="ClientesSection">
                <ClientesSection clientes={clientesMock} />
              </SafeComponent>

              <SafeComponent name="ContratosSection">
                <ContratosSection contratos={contratosMock} />
              </SafeComponent>

              <SafeComponent name="CertificadoSection">
                <CertificadoSection />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'editor' && (
          <PreviewBlock
            title="Editor"
            description="Componentes de gestión editorial y cursos."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="EditorCursos">
                <EditorCursos cursos={cursosMock} />
              </SafeComponent>

              <SafeComponent name="EditorHistorial">
                <EditorHistorial />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'usuario' && (
          <PreviewBlock
            title="Usuario"
            description="Componentes visibles para usuarios finales."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="AutoGestion">
                <AutoGestion user={usuarioMock} />
              </SafeComponent>

              <SafeComponent name="ManualesCargo">
                <ManualesCargo />
              </SafeComponent>

              <SafeComponent name="ComunicadosInternos">
                <ComunicadosInternos />
              </SafeComponent>

              <SafeComponent name="MisClientes">
                <MisClientes clientes={clientesMock} />
              </SafeComponent>

              <SafeComponent name="MisClienteDetalle">
                <MisClienteDetalle cliente={clientesMock[0]} />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'tasks' && (
          <PreviewBlock
            title="Tareas"
            description="Componentes de tablero, calendario y gestión de tareas."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="TaskManager">
                <TaskManager tareas={tareasMock} />
              </SafeComponent>

              <SafeComponent name="TaskDashboard">
                <TaskDashboard tareas={tareasMock} />
              </SafeComponent>

              <SafeComponent name="TaskCalendar">
                <TaskCalendar tareas={tareasMock} />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'tools' && (
          <PreviewBlock
            title="Herramientas"
            description="Utilidades como PDF, metadatos y conversión."
          >
            <div className="grid gap-6 xl:grid-cols-2">
              <SafeComponent name="LimpiadorMetadatos">
                <LimpiadorMetadatos />
              </SafeComponent>

              <SafeComponent name="GestorPDF">
                <GestorPDF />
              </SafeComponent>

              <SafeComponent name="ConvertidorArchivos">
                <ConvertidorArchivos />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}

        {activeSection === 'pages' && (
          <PreviewBlock
            title="Páginas"
            description="Páginas completas. Son las más propensas a fallar por contexto, API o rutas protegidas."
          >
            <div className="grid gap-6">
              <SafeComponent name="Login">
                <Login />
              </SafeComponent>

              <SafeComponent name="VerifyCode">
                <VerifyCode />
              </SafeComponent>

              <SafeComponent name="CompleteProfile">
                <CompleteProfile />
              </SafeComponent>

              <SafeComponent name="FormulariosSQF">
                <FormulariosSQF />
              </SafeComponent>

              <SafeComponent name="GestorPDFPage">
                <GestorPDFPage />
              </SafeComponent>

              <SafeComponent name="AdminDashboard">
                <AdminDashboard />
              </SafeComponent>

              <SafeComponent name="Admin2Dashboard">
                <Admin2Dashboard />
              </SafeComponent>

              <SafeComponent name="EditorDashboard">
                <EditorDashboard />
              </SafeComponent>

              <SafeComponent name="UserDashboard">
                <UserDashboard />
              </SafeComponent>
            </div>
          </PreviewBlock>
        )}
      </section>
    </main>
  )
}