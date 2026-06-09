import { useState, useEffect } from 'react';
import { BookOpen, ChevronDown, ChevronRight, RefreshCw, Download } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import { getAllReglamento } from '../../lib/api';

// Configure PDF worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.js',
    import.meta.url,
  ).href;
}

const ComunicadosInternos = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [pdfPages, setPdfPages] = useState({});

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

  const onPdfLoadSuccess = (itemId, { numPages }) => {
    setPdfPages(prev => ({ ...prev, [itemId]: numPages }));
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
                <div className="border-t border-slate-50 bg-slate-50/30">
                  {item.archivo_url ? (
                    <div className="p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-sm text-[#001871]">Documento PDF</h4>
                        <a href={item.archivo_url} download className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors">
                          <Download size={14} /> Descargar
                        </a>
                      </div>
                      <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
                        <Document
                          file={item.archivo_url}
                          onLoadSuccess={(doc) => onPdfLoadSuccess(item.id, doc)}
                          loading={<div className="p-8 text-center text-sm text-slate-500">Cargando PDF...</div>}
                          error={<div className="p-8 text-center text-sm text-red-500">Error al cargar el PDF</div>}
                        >
                          {Array.from(new Array(pdfPages[item.id] || 1), (el, index) => (
                            <div key={`page_${index + 1}`} className="mb-4 border-b border-slate-100 pb-4 last:border-b-0">
                              <Page pageNumber={index + 1} width={500} />
                            </div>
                          ))}
                        </Document>
                      </div>
                    </div>
                  ) : null}
                  {item.contenido && (
                    <div className="px-6 pb-5">
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComunicadosInternos;
