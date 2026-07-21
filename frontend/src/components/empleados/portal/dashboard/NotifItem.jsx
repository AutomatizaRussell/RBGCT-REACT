import React from 'react';
import { Clock, AlertTriangle, CalendarDays } from 'lucide-react';

/**
 * Item individual del panel de notificaciones.
 *
 * Muestra una tarea con su icono de estado, título, prioridad y fecha de vencimiento.
 */
const NotifItem = ({ tarea, vencida, onNavigate, fmtFecha }) => (
  <button
    type="button"
    onClick={onNavigate}
    className={`
      flex w-full items-start gap-3 border-b border-slate-100 px-4 py-3 text-left transition-colors
      last:border-b-0 hover:bg-slate-50
      ${vencida ? 'border-l-[3px] border-l-slate-400 bg-slate-50/50 pl-[13px]' : ''}
    `}
  >
    <div
      className={`
        mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border
        ${vencida
          ? 'border-slate-200 bg-white text-slate-600'
          : tarea.estado === 'en_proceso'
            ? 'border-slate-200 bg-slate-50 text-slate-600'
            : 'border-slate-200 bg-white text-slate-500'}
      `}
    >
      {vencida ? (
        <AlertTriangle size={12} strokeWidth={2} />
      ) : (
        <Clock size={12} strokeWidth={2} />
      )}
    </div>

    <div className="min-w-0 flex-1">
      <p className="truncate text-xs font-semibold leading-snug text-slate-800">
        {tarea.titulo}
      </p>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        {tarea.prioridad && (
          <span
            className={`
              text-[10px] font-medium uppercase tracking-wide
              ${tarea.prioridad === 'alta'
                ? 'text-slate-700'
                : tarea.prioridad === 'media'
                  ? 'text-slate-500'
                  : 'text-slate-400'}
            `}
          >
            {tarea.prioridad}
          </span>
        )}

        {tarea.fecha_vencimiento && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-slate-400">
            <CalendarDays size={10} strokeWidth={2} />
            {fmtFecha(tarea.fecha_vencimiento)}
          </span>
        )}
      </div>
    </div>
  </button>
);

export default NotifItem;
