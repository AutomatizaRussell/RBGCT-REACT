import { X } from 'lucide-react'
import rbLogo from '../../assets/russell-bedford-logo.png'
import { BRAND } from '../../lib/brand'
import { cn } from '../../lib/cn'

/**
 * Item visual del sidebar.
 *
 * Solo maneja apariencia y delega navegación al padre.
 */
function SidebarNavItem({ item, activeTab, onNavigate, collapsed }) {
  const Icon = item.icon
  const isActive = activeTab === item.tab

  return (
    <button
      type="button"
      onClick={() => onNavigate(item.tab)}
      title={collapsed ? item.label : undefined}
      className={cn(
        'flex w-full items-center rounded-xl py-3 text-left text-sm font-bold transition',
        'focus:outline-none',
        collapsed ? 'justify-center px-2' : 'gap-3 px-4',
        isActive ? 'rb-sidebar-item-active' : 'rb-sidebar-item'
      )}
    >
      {Icon ? <Icon size={18} /> : item.iconNode}
      {collapsed ? null : <span className="truncate">{item.label}</span>}
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
  onClose,
  onNavigate,
  sections = [],
  footer,
  userCard,
  collapsed = false,
}) {
  const hasTextHeader = Boolean(title || subtitle || badge)

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-slate-200 bg-white shadow-xl transition-all duration-300 ease-in-out',
        'lg:sticky lg:top-0 lg:z-20 lg:translate-x-0 lg:shadow-none',
        collapsed ? 'w-20' : 'w-80',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}
    >
      <div className="flex h-full flex-col">
        <div className={cn('border-b border-slate-200', collapsed ? 'px-2 py-4' : 'px-6 py-5')}>
          <div className={cn('flex items-start gap-4', collapsed ? 'flex-col items-center' : 'justify-between')}>
            {collapsed ? (
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-extrabold text-white"
                style={{ background: BRAND.navy }}
                title="Russell Bedford GCT"
              >
                RB
              </div>
            ) : (
              <div className="min-w-0">
                <img
                  src={rbLogo}
                  alt="Russell Bedford GCT"
                  className="h-auto w-[240px] max-w-full object-contain"
                />

                {hasTextHeader ? (
                  <div className="mt-4">
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
            )}

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

        {userCard && !collapsed ? (
          <div className="border-b border-slate-100 px-4 py-4">
            {userCard}
          </div>
        ) : null}

        <nav className={cn('flex-1 space-y-5 overflow-y-auto py-5', collapsed ? 'px-2' : 'px-4')}>
          {sections.map((section) => (
            <div key={section.label} className="space-y-2">
              {section.label && !collapsed ? (
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
                      collapsed={collapsed}
                    />
                  ))}
              </div>
            </div>
          ))}
        </nav>

        {footer && !collapsed ? (
          <div className="border-t border-slate-200 p-5">
            {footer}
          </div>
        ) : null}
      </div>
    </aside>
  )
}
