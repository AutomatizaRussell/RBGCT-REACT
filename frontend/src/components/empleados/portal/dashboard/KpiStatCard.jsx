import React from 'react';

/**
 * Tarjeta KPI estilo minimalista SaaS.
 *
 * Diseño limpio con fondo blanco, borde sutil, sombra suave y esquinas redondeadas.
 * Incluye un icono dentro de un contenedor redondeado con fondo gris claro.
 */
const KpiStatCard = ({
  label,
  value,
  sub,
  icon,
  accentColor = 'text-[#001871]',
  onClick,
}) => (
  <div
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
    onClick={onClick}
    onKeyDown={
      onClick
        ? (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onClick();
            }
          }
        : undefined
    }
    className={`
      group relative overflow-hidden rounded-2xl border border-slate-100 bg-white p-5 shadow-sm
      transition-all duration-200
      ${onClick ? 'cursor-pointer hover:border-slate-200 hover:shadow-md' : ''}
    `}
  >
    <div className="mb-4 flex items-start justify-between">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition-colors group-hover:bg-slate-100">
        {icon}
      </div>
    </div>

    <p className={`text-2xl font-bold tabular-nums leading-none ${accentColor}`}>
      {value}
    </p>

    <p className="mt-3 truncate text-[11px] font-semibold uppercase tracking-wider text-slate-500">
      {label}
    </p>

    {sub && (
      <p className="mt-1 truncate text-[11px] text-slate-400">
        {sub}
      </p>
    )}
  </div>
);

export default KpiStatCard;
