import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { getAllReglamento, descargarArchivoIntranet } from '../../../lib/api';

const abrirPdfIntranet = async (archivoUrl) => {
  const filename = decodeURIComponent(archivoUrl.split('/').pop());
  const blob = await descargarArchivoIntranet('reglamento', filename);
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
};

const ComunicadosInternos = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [descargando, setDescargando] = useState(null);

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
          <h3 className="text-lg font-bold text-[#001871]">Reglamento Interno de Trabajo</h3>
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
                  <span className="font-bold text-[#001871] text-sm">{item.titulo}</span>
                </div>
                {expanded === item.id
                  ? <ChevronDown size={16} className="text-slate-400 flex-shrink-0"/>
                  : <ChevronRight size={16} className="text-slate-400 flex-shrink-0"/>
                }
              </button>

              {expanded === item.id && (
                <div className="border-t border-slate-50 bg-slate-50/30 p-6 space-y-4">
                  {item.archivo_url && (
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={async () => {
                          setDescargando(item.id);
                          try { await abrirPdfIntranet(item.archivo_url); }
                          finally { setDescargando(null); }
                        }}
                        disabled={descargando === item.id}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-900 text-xs font-semibold rounded-lg hover:bg-indigo-200 transition-colors disabled:opacity-60"
                      >
                        {descargando === item.id ? 'Cargando…' : 'Abrir PDF'}
                      </button>
                      <button
                        onClick={async () => {
                          setDescargando(`dl-${item.id}`);
                          try {
                            const filename = decodeURIComponent(item.archivo_url.split('/').pop());
                            const blob = await descargarArchivoIntranet('reglamento', filename);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = filename; a.click();
                            URL.revokeObjectURL(url);
                          } finally { setDescargando(null); }
                        }}
                        disabled={descargando === `dl-${item.id}`}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg hover:bg-slate-300 transition-colors disabled:opacity-60"
                      >
                        <Download size={14} /> {descargando === `dl-${item.id}` ? 'Descargando…' : 'Descargar'}
                      </button>
                    </div>
                  )}
                  {item.contenido && (
                    <div className="space-y-2">
                      {item.contenido.split('\n').filter(l => l.trim()).map((linea, i) => (
                        <div key={i} className="flex items-start gap-2.5 text-sm text-slate-600">
                          <span className="mt-2 w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0"/>
                          {linea.trim()}
                        </div>
                      ))}
                    </div>
                  )}
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
