import { Menu } from 'lucide-react'
import rbLogo from '../../assets/russell-bedford-logo.png'
import { BRAND } from '../../lib/brand'
import { cn } from '../../lib/cn'

/**
 * Topbar corporativa.
 *
 * Traducción desde el AppShell/Topbar del proyecto Next.js hacia React/Vite.
 *
 * Alcance:
 * - Solo diseño.
 * - No autentica.
 * - No consulta APIs.
 * - No decide rutas.
 * - Recibe datos ya calculados desde cada dashboard.
 *
 * Responsabilidades:
 * - Mostrar logo corporativo.
 * - Mostrar contexto del módulo.
 * - Mostrar usuario/rol.
 * - Renderizar botón móvil para abrir sidebar.
 * - Renderizar franja multicolor de marca.
 */
export default function Topbar({
  eyebrow = 'Centro de operación',
  title = 'Panel de control',
  description = 'Gestión integrada de clientes, solicitudes y seguimiento',
  userName = 'Usuario',
  userRole = null,
  onOpenSidebar,
  actions,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-[84px] items-center justify-between gap-4 px-4 lg:px-8">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#001871] lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <img
            src={rbLogo}
            alt="Russell Bedford"
            className="h-auto w-[190px] shrink-0 object-contain lg:w-[250px]"
          />

          <div className="hidden h-12 w-px bg-slate-200 md:block" />

          <div className="hidden min-w-0 md:block">
            <p
              className="text-sm font-extrabold uppercase tracking-widest"
              style={{ color: BRAND.navy }}
            >
              {eyebrow}
            </p>

            <p className="mt-1 truncate text-sm text-slate-500">
              {description}
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4">
          {actions ? (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          ) : null}

          <div className="hidden h-12 w-px bg-slate-200 sm:block" />

          <div className="text-right">
            <p className="max-w-[180px] truncate text-sm font-bold text-slate-900">
              {userName}
            </p>

            {userRole ? (
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                {userRole}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid h-1 grid-cols-4">
        <div style={{ backgroundColor: BRAND.purple }} />
        <div style={{ backgroundColor: BRAND.teal }} />
        <div style={{ backgroundColor: BRAND.navy }} />
        <div style={{ backgroundColor: BRAND.orange }} />
      </div>
    </header>
  )
}
