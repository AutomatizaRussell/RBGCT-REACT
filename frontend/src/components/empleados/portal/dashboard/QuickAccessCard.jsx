import React from 'react';
import { ArrowRight } from 'lucide-react';

/**
 * Card de accesos rápidos con estilo minimalista.
 *
 * Lista vertical de botones con icono, label y flecha, con hover sutil.
 */
const QuickAccessCard = ({ actions }) => (
  <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
    <h3 className="border-b border-slate-100 pb-4 text-base font-semibold text-slate-900">
      Accesos rápidos
    </h3>

    <div className="mt-5 space-y-2">
      {actions.map((action) => (
        <button
          key={action.id || action.label}
          type="button"
          onClick={action.onClick}
          className="flex w-full items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 text-left text-sm font-medium text-slate-600 transition-all hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="flex items-center gap-3">
            <span className="text-slate-400">{action.icon}</span>
            {action.label}
          </span>

          <ArrowRight
            size={14}
            className="shrink-0 text-slate-300 transition-colors group-hover:text-slate-500"
            strokeWidth={2}
          />
        </button>
      ))}
    </div>
  </div>
);

export default QuickAccessCard;
