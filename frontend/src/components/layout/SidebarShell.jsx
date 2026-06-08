
/**
 * SidebarShell
 *
 * Componente visual base para todas las barras laterales.
 *
 * Objetivo:
 * - Migrar el lenguaje visual desde Next.js hacia React/Vite.
 * - Unificar ancho, colores, bordes, navegación y footer.
 * - Mantener intacta la lógica funcional de cada rol.
 *
 * No hace:
 * - No autentica.
 * - No consulta APIs.
 * - No conoce permisos.
 * - No decide rutas.
 */

import { X } from 'lucide-react'
import { BRAND } from '../../lib/brand'
import { cn } from '../../lib/cn'

/**
 * Item visual del sidebar.
 *
 * Mantiene la navegación delegada al componente padre para no acoplar
 * este shell a rutas concretas, permisos, autenticación ni lógica de negocio.
 */
function SidebarNavItem({ item, activeTab, onNavigate }) {
  const Icon = item.icon
  const isActive = activeTab === item.tab

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.tab)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-bold transition',
        'focus:outline-none focus:ring-2 focus:ring-[#00bfb3]/40 focus:ring-offset-2',
        isActive
          ? 'bg-[#981d97] text-white shadow-sm'
          : 'text-slate-700 hover:bg-slate-100 hover:text-[#001871]'
      )}
    >
      {Icon ? <Icon size={18} /> : item.iconNode}
      <span className="truncate">{item.label}</span>
    </button>
  )
}

/**
 * SidebarShell
 *
 * Componente visual base para todas las barras laterales.
 *
 * Objetivo:
 * - Migrar el lenguaje visual desde Next.js hacia React/Vite.
 * - Unificar ancho, colores, bordes, navegación y footer.
 * - Mantener intacta la lógica funcional de cada rol.
 *
 * Decisión de diseño:
 * - El logo NO vive aquí. El logo pertenece a la Topbar.
 * - Este componente solo muestra contexto del menú: title, subtitle y badge.
 * - title/subtitle/badge son opcionales para evitar textos globales incorrectos.
 *
 * No hace:
 * - No autentica.
 * - No consulta APIs.
 * - No conoce permisos.
 * - No decide rutas.
 * - No renderiza logo.
 */
export function SidebarShell({
  title,
  subtitle,
  badge,
  activeTab,
  isOpen,
  onClose,
  onNavigate,
  sections = [],
  footer,
  userCard,
}) {
  const hasHeaderContent = Boolean(title || subtitle || badge)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-80 shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl transition-transform duration-300 ease-in-out',
        'lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 lg:shadow-none',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div
          className={cn(
            'border-b border-slate-200 px-6',
            hasHeaderContent ? 'py-6' : 'py-4'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {title ? (
                <p
                  className="text-base font-extrabold uppercase tracking-wide"
                  style={{ color: BRAND.navy }}
                >
                  {title}
                </p>
              ) : null}

              {subtitle ? (
                <p className="mt-2 text-sm leading-5 text-slate-500">
                  {subtitle}
                </p>
              ) : null}

              {badge ? (
                <div className="mt-4 inline-flex rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-500">
                  {badge}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 lg:hidden"
              aria-label="Cerrar menú"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {userCard ? (
          <div className="border-b border-slate-100 px-4 py-4">
            {userCard}
          </div>
        ) : null}

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {sections.map((section) => (
            <div key={section.label} className="space-y-2">
              {section.label ? (
                <p className="px-4 text-[11px] font-extrabold uppercase tracking-widest text-slate-400">
                  {section.label}
                </p>
              ) : null}

              <div className="space-y-2">
                {section.items
                  .filter((item) => item.visible !== false)
                  .map((item) => (
                    <SidebarNavItem
                      key={item.tab}
                      item={item}
                      activeTab={activeTab}
                      onNavigate={onNavigate}
                    />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {footer ? (
          <div className="border-t border-slate-200 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
