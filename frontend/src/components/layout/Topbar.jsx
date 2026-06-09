import { Menu } from 'lucide-react'
import { BRAND } from '../../lib/brand'

/**
 * Topbar corporativa.
 *
 * Traducción visual del topbar del proyecto Next.js hacia React/Vite.
 *
 * Responsabilidades:
 * - Mostrar contexto de la pantalla.
 * - Mostrar acciones superiores.
 * - Mostrar usuario/rol.
 * - Mostrar línea corporativa inferior.
 *
 * No hace:
 * - No autentica.
 * - No consulta APIs.
 * - No decide rutas.
 */
export default function Topbar({
  eyebrow,
  title,
  description,
  userName,
  userRole,
  avatarLabel,
  onOpenSidebar,
  actions,
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:h-[84px] lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenSidebar}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-[#001871] lg:hidden"
            aria-label="Abrir menú"
          >
            <Menu size={20} />
          </button>

          <div className="min-w-0">
            {eyebrow ? (
              <p className="hidden text-[10px] font-extrabold uppercase tracking-[0.24em] text-slate-400 sm:block">
                {eyebrow}
              </p>
            ) : null}

            {title ? (
              <h1 className="truncate text-base font-black tracking-tight text-[#001871] lg:text-xl">
                {title}
              </h1>
            ) : null}

            {description ? (
              <p className="mt-1 hidden truncate text-sm text-slate-500 lg:block">
                {description}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-3 lg:gap-5">
          {actions ? (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          ) : null}

          <div className="hidden h-10 w-px bg-slate-200 sm:block" />

          <div className="hidden text-right sm:block">
            {userName ? (
              <p className="max-w-[180px] truncate text-sm font-bold text-[#001871]">
                {userName}
              </p>
            ) : null}

            {userRole ? (
              <p className="mt-0.5 max-w-[220px] truncate text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                {userRole}
              </p>
            ) : null}
          </div>

          {avatarLabel ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#2d007f] text-sm font-black text-white">
              {avatarLabel}
            </div>
          ) : null}
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
