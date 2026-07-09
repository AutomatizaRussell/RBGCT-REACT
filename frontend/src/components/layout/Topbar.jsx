import { useState, useEffect, useRef } from 'react'
import { Menu, LogOut, Mail, Briefcase, Building2 } from 'lucide-react'
import { BRAND } from '../../lib/brand'

export default function Topbar({
  eyebrow,
  title,
  description,
  userName,
  userRole,
  avatarLabel,
  onOpenSidebar,
  actions,
  userEmail,
  userCargo,
  userArea,
  onLogout,
}) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

          {/* Rol arriba (bold navy) · Nombre abajo (pequeño gris) */}
          <div className="hidden text-right sm:block">
            {userRole ? (
              <p className="max-w-[180px] truncate text-sm font-bold text-[#001871]">
                {userRole}
              </p>
            ) : null}

            {userName ? (
              <p className="mt-0.5 max-w-[220px] truncate text-[11px] font-medium text-slate-500">
                {userName}
              </p>
            ) : null}
          </div>

          {/* Avatar — botón con dropdown de información */}
          {avatarLabel ? (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setShowUserMenu((v) => !v)}
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-black text-white transition hover:opacity-80 focus:outline-none"
                style={{ backgroundColor: BRAND.navy }}
                aria-label="Menú de usuario"
              >
                {avatarLabel}
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-12 z-50 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_16px_48px_-16px_rgba(15,23,42,0.22)] animate-in fade-in duration-200">
                  {/* Cabecera */}
                  <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-4 py-4">
                    <div
                      className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-base font-black text-white"
                      style={{ backgroundColor: BRAND.navy }}
                    >
                      {avatarLabel}
                    </div>
                    <div className="min-w-0">
                      {userName && (
                        <p className="truncate text-sm font-semibold text-slate-800">{userName}</p>
                      )}
                      {userRole && (
                        <p className="mt-0.5 truncate text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {userRole}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Detalles */}
                  {(userEmail || userCargo || userArea) && (
                    <div className="py-2">
                      {userEmail && (
                        <div className="flex items-center gap-3 px-4 py-2">
                          <Mail size={13} className="flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                          <p className="truncate text-[11px] text-slate-600">{userEmail}</p>
                        </div>
                      )}
                      {userCargo && (
                        <div className="flex items-center gap-3 px-4 py-2">
                          <Briefcase size={13} className="flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                          <p className="truncate text-[11px] text-slate-600">{userCargo}</p>
                        </div>
                      )}
                      {userArea && (
                        <div className="flex items-center gap-3 px-4 py-2">
                          <Building2 size={13} className="flex-shrink-0 text-slate-400" strokeWidth={1.75} />
                          <p className="truncate text-[11px] text-slate-600">{userArea}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Cerrar sesión */}
                  {onLogout && (
                    <div className="border-t border-slate-100 p-2">
                      <button
                        type="button"
                        onClick={() => { setShowUserMenu(false); onLogout(); }}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-red-500 transition-colors hover:bg-red-50 hover:text-red-600"
                      >
                        <LogOut size={13} strokeWidth={2} />
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              )}
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
