import React from 'react';
import { CheckCircle2, RefreshCw, ArrowRight, X } from 'lucide-react';
import NotifItem from './NotifItem';

/**
 * Panel desplegable de notificaciones.
 *
 * Muestra tareas pendientes/vencidas y confirmaciones de sugerencias recibidas.
 * Diseño minimalista con tarjeta blanca, sombra suave y bordes redondeados.
 */
const NotificationsPanel = ({
  tareas,
  loading,
  onClose,
  onNavigate,
  confirmaciones = [],
  onDescartarConfirmacion,
  count = 0,
}) => {
  const now = new Date();

  const vencidas = tareas.filter(
    (task) => task.fecha_vencimiento && new Date(task.fecha_vencimiento) < now
  );

  const activas = tareas.filter(
    (task) => !(task.fecha_vencimiento && new Date(task.fecha_vencimiento) < now)
  );

  const fmtFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
    });

  return (
    <div className="absolute right-0 top-12 z-50 w-[min(100vw-1.5rem,20rem)] overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-[0_16px_48px_-16px_rgba(15,23,42,0.15)] animate-in fade-in duration-200">
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-4 py-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-800">
            Notificaciones
          </p>
          <p className="text-[11px] text-slate-400">
            {count > 0 ? `${count} no leídas` : 'Sin notificaciones nuevas'}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          aria-label="Cerrar notificaciones"
        >
          <X size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="max-h-[420px] overflow-y-auto">
        {/* Confirmaciones de sugerencias recibidas */}
        {confirmaciones.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/80 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
              <CheckCircle2 size={11} strokeWidth={2} />
              Sugerencias recibidas ({confirmaciones.length})
            </p>
            {confirmaciones.map((s) => (
              <div
                key={s.id}
                className="flex items-start gap-2 border-b border-slate-100 px-4 py-3"
              >
                <CheckCircle2
                  size={16}
                  className="mt-0.5 flex-shrink-0 text-emerald-500"
                  strokeWidth={2}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-700">
                    Tu mensaje fue recibido por el equipo administrativo
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-slate-500">
                    “{s.sugerencia}”
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-400">
                    {s.fecha_recibida &&
                      new Date(s.fecha_recibida).toLocaleString('es-CO', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onDescartarConfirmacion?.(s.id)}
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
                  title="Descartar"
                >
                  <X size={13} strokeWidth={2} />
                </button>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw
              size={20}
              className="animate-spin text-slate-400"
              strokeWidth={1.75}
            />
          </div>
        ) : tareas.length === 0 ? (
          <div className="py-12 text-center">
            <CheckCircle2
              size={28}
              className="mx-auto text-slate-300"
              strokeWidth={1.5}
            />
            <p className="mt-3 text-xs font-medium text-slate-400">
              Sin tareas pendientes
            </p>
          </div>
        ) : (
          <>
            {vencidas.length > 0 && (
              <div>
                <p className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/50 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
                  <AlertTrianglePlaceholder size={11} strokeWidth={2} />
                  Vencidas ({vencidas.length})
                </p>

                {vencidas.map((task) => (
                  <NotifItem
                    key={task.id}
                    tarea={task}
                    vencida
                    onNavigate={onNavigate}
                    fmtFecha={fmtFecha}
                  />
                ))}
              </div>
            )}

            {activas.length > 0 && (
              <div>
                <p className="border-b border-slate-100 bg-white px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  En curso ({activas.length})
                </p>

                {activas.map((task) => (
                  <NotifItem
                    key={task.id}
                    tarea={task}
                    onNavigate={onNavigate}
                    fmtFecha={fmtFecha}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {!loading && tareas.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50/50 px-4 py-3">
          <button
            type="button"
            onClick={onNavigate}
            className="flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate-600 transition-colors hover:text-[#001871]"
          >
            Ver todas las tareas
            <ArrowRight size={12} strokeWidth={2} />
          </button>
        </div>
      )}
    </div>
  );
};

// Icono interno para evitar importar AlertTriangle dos veces con nombres distintos
const AlertTrianglePlaceholder = ({ size, strokeWidth }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
);

export default NotificationsPanel;
