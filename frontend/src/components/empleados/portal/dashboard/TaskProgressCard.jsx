import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Card de progreso de tareas con estilo minimalista.
 *
 * Muestra una lista de tareas con barras de progreso limpias y colores suaves.
 */
const TaskProgressCard = ({ taskStats, loading, onViewAll }) => {
  const items = [
    {
      label: 'Pendientes',
      count: taskStats.pending,
      barColor: 'bg-slate-400',
      textColor: 'text-slate-600',
    },
    {
      label: 'En proceso',
      count: taskStats.inProgress,
      barColor: 'bg-[#00a9ce]',
      textColor: 'text-[#00a9ce]',
    },
    {
      label: 'Completadas',
      count: taskStats.completed,
      barColor: 'bg-emerald-400',
      textColor: 'text-emerald-600',
    },
  ];

  const total = taskStats.total || 0;

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm lg:col-span-2">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Estado de mis tareas
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Resumen personal
          </p>
        </div>

        <button
          type="button"
          onClick={onViewAll}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-[#001871]"
        >
          Ver todas
          <ArrowRight size={14} strokeWidth={2} />
        </button>
      </div>

      <div className="space-y-5">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-600">
                  {item.label}
                </span>

                <span className={`text-sm font-semibold tabular-nums ${item.textColor}`}>
                  {loading ? '…' : item.count}
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${item.barColor} transition-all duration-700`}
                  style={{
                    width: total > 0 ? `${(item.count / total) * 100}%` : '0%',
                  }}
                />
              </div>
            </div>
          </div>
        ))}

        {total === 0 && !loading && (
          <p className="py-6 text-center text-sm text-slate-400">
            Sin tareas asignadas en este momento.
          </p>
        )}
      </div>
    </div>
  );
};

export default TaskProgressCard;
