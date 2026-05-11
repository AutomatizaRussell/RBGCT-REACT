import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { getAllReglamento } from '../../lib/api';

const ComunicadosInternos = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => { fetchReglamento(); }, []);

  const fetchReglamento = async () => {
    try {
      setLoading(true);
      const data = await getAllReglamento();
      setItems(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error('Error cargando reglamento:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw size={24} className="text-indigo-600 animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#001e33]">Reglamento Interno de Trabajo</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Russell Bedford Colombia — {items.length} sección{items.length !== 1 ? 'es' : ''}
          </p>
        </div>
        <button onClick={fetchReglamento}
          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-indigo-600 uppercase transition-colors">
          <RefreshCw size={13}/> Actualizar
        </button>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-16 text-center">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-sm font-semibold text-slate-400">El reglamento aún no tiene secciones publicadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={item.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-xl bg-indigo-50 text-indigo-600 text-[11px] font-black flex items-center justify-center flex-shrink-0">
                    {idx + 1}
                  </span>
                  <span className="font-bold text-[#001e33] text-sm">{item.titulo}</span>
                </div>
                {expanded === item.id
                  ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0"/>
                  : <ChevronRight size={16} className="text-slate-400 flex-shrink-0"/>
                }
              </button>

              {expanded === item.id && item.contenido && (
                <div className="px-6 pb-5 border-t border-slate-50 bg-slate-50/30">
                  <div className="space-y-2 pt-4">
                    {item.contenido.split('\n').filter(l => l.trim()).map((linea, i) => (
                      <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
                        {linea.trim()}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComunicadosInternos;
