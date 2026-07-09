import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import rbLogo from '../../assets/russell-bedford-logo.png'
import { BRAND } from '../../lib/brand'
import { cn } from '../../lib/cn'

/**
 * Item visual del sidebar.
 *
 * Solo maneja apariencia y delega navegación al padre.
 */
function SidebarNavItem({ item, activeTab, onNavigate, isCollapsed }) {
  const Icon = item.icon
  const isActive = activeTab === item.tab

  const btnPadding = isCollapsed ? 'justify-center px-2 py-2' : 'px-4 py-3'
  const iconWrapperClass = isCollapsed
    ? 'h-5 w-5 md:h-6 md:w-6 lg:h-7 lg:w-7'
    : 'h-4 w-4 md:h-5 md:w-5 lg:h-6 lg:w-6'

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.tab)}
      title={item.label}
      className={cn(
        'group flex w-full items-center rounded-xl text-left text-sm font-bold transition focus:outline-none',
        btnPadding,
        isActive ? 'rb-sidebar-item-active' : 'rb-sidebar-item'
      )}
    >
      <span className={cn('flex items-center justify-center', iconWrapperClass)}>
        {Icon ? <Icon className="h-full w-full" /> : item.iconNode}
      </span>
      {!isCollapsed && <span className="truncate ml-3">{item.label}</span>}
    </button>
  )
}

/**
 * SidebarShell
 *
 * Shell visual común para sidebars.
 *
 * Decisiones:
 * - El logo corporativo vive arriba del sidebar.
 * - El item activo usa el azul corporativo definido en las variables de marca.
 * - No se usa ring turquesa ni borde visible en el item activo.
 * - No maneja autenticación, permisos, rutas ni APIs.
 */
export function SidebarShell({
  title,
  subtitle,
  badge,
  activeTab,
  isOpen,
  isCollapsed,
  onClose,
  onToggleCollapse,
  onNavigate,
  sections = [],
  footer,
  userCard,
}) {
  const hasTextHeader = Boolean(title || subtitle || badge)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-in-out',
        'lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 lg:shadow-none',
        // Responsive widths: smaller on phones/laptops, larger on desktops
        // Expanded: base w-56, md:w-64, lg:w-80
        // Collapsed: base w-14, md:w-16, lg:w-20
        isCollapsed ? 'w-14 md:w-16 lg:w-20' : 'w-56 md:w-64 lg:w-80',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-slate-200', isCollapsed ? 'px-3 py-6' : 'px-6 py-5')}>
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              {isCollapsed ? (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="flex h-12 w-12 md:h-14 md:w-14 lg:h-16 lg:w-16 items-center justify-center rounded-full bg-slate-100 p-1.5 text-slate-600 transition hover:bg-slate-200"
                  aria-label="Expandir menú"
                >
                  <img
                    src={rbLogo}
                    alt="Russell Bedford GCT"
                    className="h-full w-full object-contain"
                  />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onToggleCollapse}
                  className="text-left transition hover:opacity-80"
                  aria-label="Minimizar menú"
                >
                  <img
                    src={rbLogo}
                    alt="Russell Bedford GCT"
                    className="h-auto w-[240px] max-w-full object-contain"
                  />
                </button>
              )}

              {hasTextHeader ? (
                <div className={cn('mt-4', isCollapsed ? 'lg:hidden' : '')}>
                  {title ? (
                    <p
                      className="text-sm font-extrabold uppercase tracking-widest"
                      style={{ color: BRAND.navy }}
                    >
                      {title}
                    </p>
                  ) : null}

                  {subtitle ? (
                    <p className="mt-1 text-sm leading-5 text-slate-500">
                      {subtitle}
                    </p>
                  ) : null}

                  {badge ? (
                    <div className="rb-sidebar-badge mt-3 inline-flex rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest">
                      {badge}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex items-center gap-2">
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
        </div>

        {userCard && !isCollapsed ? (
          <div className="border-b border-slate-100 px-4 py-4">
            {userCard}
          </div>
        ) : null}

        <nav className="flex-1 space-y-5 overflow-y-auto px-4 py-5">
          {sections.map((section) => (
            <div key={section.label || section.items[0]?.tab} className="space-y-2">
              {section.label && !isCollapsed ? (
                <p className="rb-sidebar-section-label px-4 text-[11px] font-extrabold uppercase tracking-widest">
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
                      isCollapsed={isCollapsed}
                    />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {footer && !isCollapsed ? (
          <div className="border-t border-slate-200 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
