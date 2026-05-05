import { useState, useEffect, useCallback } from 'react';
import {
  History, Loader2, AlertCircle, BookOpen, Plus, Pencil, Trash2,
  FileText, ArrowRight, Clock, Filter, X
} from 'lucide-react';
import { getCursoHistorial } from '../../lib/db';

const ACCION_CONFIG = {
  crear:            { label: 'Creado',            color: 'text-emerald-600',  bg: 'bg-emerald-50',  border: 'border-emerald-100',  icon: Plus },
  editar:           { label: 'Editado',           color: 'text-blue-600',    bg: 'bg-blue-50',    border: 'border-blue-100',    icon: Pencil },
  eliminar:         { label: 'Eliminado',         color: 'text-red-600',     bg: 'bg-red-50',     border: 'border-red-100',     icon: Trash2 },
  agregar_contenido:   { label: 'Contenido Agregado',  color: 'text-purple-600',  bg: 'bg-purple-50',  border: 'border-purple-100',  icon: FileText },
  eliminar_contenido:  { label: 'Contenido Eliminado', color: 'text-amber-600',   bg: 'bg-amber-50',   border: 'border-amber-100',   icon: Trash2 },
};

export default function EditorHistorial() {
  const [historial, setHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtro, setFiltro] = useState('todos');

  const fetchHistorial = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getCursoHistorial(100);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando historial:', err);
      setError('No se pudo cargar el historial. Intenta recargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchHistorial(); }, [fetchHistorial]);

  const filtrados = filtro === 'todos'
    ? historial
    : historial.filter(h => h.accion === filtro);

  const conteos = historial.reduce((acc, h) => {
    acc[h.accion] = (acc[h.accion] || 0) + 1;
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-slate-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Cargando historial...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={32} className="text-red-400 mb-3" />
        <p className="text-sm text-red-500 font-medium mb-4">{error}</p>
        <button onClick={fetchHistorial} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-slate-600 to-slate-800 rounded-xl shadow-sm">
            <History size={20} className="text-white"/>
          </div>
          <div>
            <h3 className="font-bold text-[#001e33] text-lg">Historial de Cambios</h3>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              {historial.length} registro{historial.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={fetchHistorial}
          className="flex items-center gap-2 px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
        >
          <Clock size={14}/> Actualizar
        </button>
      </div>

      {/* Filtros rápidos */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro('todos')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            filtro === 'todos' ? 'bg-[#001e33] text-white border-[#001e33]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          Todos ({historial.length})
        </button>
        {Object.entries(ACCION_CONFIG).map(([key, cfg]) => (
          <button
            key={key}
            onClick={() => setFiltro(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              filtro === key ? 'bg-[#001e33] text-white border-[#001e33]' : `bg-white ${cfg.border} text-slate-500 hover:bg-slate-50`
            }`}
          >
            <cfg.icon size={12} className={filtro === key ? 'text-white' : cfg.color}/>
            {cfg.label} ({conteos[key] || 0})
          </button>
        ))}
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-2xl inline-block mb-4">
            <History size={32} className="text-slate-300"/>
          </div>
          <p className="text-sm font-bold text-slate-600 mb-1">No hay registros</p>
          <p className="text-xs text-slate-400">
            {filtro === 'todos' ? 'Aún no se han realizado cambios en los cursos.' : 'No hay registros para este filtro.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtrados.map((item) => {
            const cfg = ACCION_CONFIG[item.accion] || ACCION_CONFIG.editar;
            const IconC = cfg.icon;
            return (
              <div
                key={item.id}
                className={`flex items-start gap-4 p-4 rounded-2xl border ${cfg.bg} ${cfg.border} shadow-sm transition-all hover:shadow-md`}
              >
                <div className={`p-2.5 rounded-xl bg-white/80 flex-shrink-0`}>
                  <IconC size={18} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 ${cfg.color}`}>
                      {cfg.label}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                      <Clock size={10}/>
                      {new Date(item.created_at).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-[#001e33] truncate">
                    {item.curso_nombre || 'Curso eliminado'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">{item.descripcion}</p>
                  {item.usuario_nombre && (
                    <p className="text-[10px] text-slate-400 mt-1.5 font-medium">
                      Por: {item.usuario_nombre}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
