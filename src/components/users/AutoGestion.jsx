import React from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react';

const AutoGestion = () => {
  // Datos de ejemplo de tareas asignadas
  const tareas = [
    { id: 1, titulo: "Cierre Mensual - Facturación", prioridad: "Alta", estado: "Pendiente", fecha: "31 Mar" },
    { id: 2, titulo: "Revisión de Auditoría Interna", prioridad: "Media", estado: "En Proceso", fecha: "02 Abr" },
    { id: 3, titulo: "Carga de comprobantes GCT", prioridad: "Baja", estado: "Completado", fecha: "25 Mar" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-[#001e33]">Mis Tareas Asignadas</h3>
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          {tareas.length} Tareas totales
        </span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tarea</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimiento</th>
              <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {tareas.map((tarea) => (
              <tr key={tarea.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:scale-110 transition-transform">
                      <FileText size={16} />
                    </div>
                    <span className="text-sm font-bold text-slate-700">{tarea.titulo}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                    tarea.prioridad === 'Alta' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                    {tarea.prioridad}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {tarea.estado === 'Completado' ? (
                      <CheckCircle2 size={14} className="text-emerald-500" />
                    ) : (
                      <Clock size={14} className="text-amber-500" />
                    )}
                    <span className="text-xs font-medium text-slate-600">{tarea.estado}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-xs text-slate-500 font-medium">
                  {tarea.fecha}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="text-[10px] font-black text-indigo-600 uppercase hover:underline">
                    Gestionar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AutoGestion;