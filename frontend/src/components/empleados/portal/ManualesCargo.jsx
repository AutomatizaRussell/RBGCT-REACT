import { useState, useEffect } from 'react';
import {
  BookOpen, PlayCircle, FileText, ExternalLink, Download,
  ChevronDown, ChevronRight, RefreshCw, Link2, HelpCircle,
  AlignLeft, Search, CheckCircle2, Circle, Loader2, Lock,
} from 'lucide-react';
import { getAllCursos, getContenidosByCurso, getMiProgresoCurso, marcarProgresoCurso } from '../../../lib/api';
import CuestionarioViewer from '../../features/cursos/CuestionarioViewer';

const TIPO_CONFIG = {
  youtube:      { icon: <PlayCircle size={15}/>,  label: 'YouTube',      color: 'text-red-600',    bg: 'bg-red-50 border-red-100' },
  video:        { icon: <PlayCircle size={15}/>,  label: 'Video',        color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
  documento:    { icon: <FileText size={15}/>,    label: 'Documento',    color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-100' },
  texto:        { icon: <AlignLeft size={15}/>,   label: 'Texto',        color: 'text-slate-600',  bg: 'bg-slate-100 border-slate-200' },
  enlace:       { icon: <Link2 size={15}/>,       label: 'Enlace',       color: 'text-violet-600', bg: 'bg-violet-50 border-violet-100' },
  cuestionario: { icon: <HelpCircle size={15}/>,  label: 'Cuestionario', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
};

const CursoCard = ({ curso }) => {
  const [open, setOpen] = useState(false);
  const [contenidos, setContenidos] = useState([]);
  const [completados, setCompletados] = useState(new Set());
  const [loadingC, setLoadingC] = useState(false);
  const [toggling, setToggling] = useState(null);
  // ID del cuestionario que está expandido (solo uno a la vez)
  const [expandedCuestionario, setExpandedCuestionario] = useState(null);
  // IDs de cuestionarios con intentos agotados
  const [agotados, setAgotados] = useState(new Set());

  const toggle = async () => {
    if (!open && contenidos.length === 0) {
      setLoadingC(true);
      try {
        const [cData, pData] = await Promise.all([
          getContenidosByCurso(curso.id),
          getMiProgresoCurso(curso.id),
        ]);
        setContenidos(Array.isArray(cData) ? cData : (cData?.results || []));
        setCompletados(new Set(pData?.completados || []));
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingC(false);
      }
    }
    setOpen(o => !o);
  };

  const handleToggleCompletado = async (contenidoId) => {
    if (toggling) return;
    setToggling(contenidoId);
    try {
      const res = await marcarProgresoCurso(curso.id, contenidoId);
      setCompletados(prev => {
        const next = new Set(prev);
        res.completado ? next.add(contenidoId) : next.delete(contenidoId);
        return next;
      });
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(null);
    }
  };

  const handleToggleCuestionario = (contenidoId) => {
    // No abrir si está agotado
    if (agotados.has(contenidoId)) return;
    setExpandedCuestionario(prev => prev === contenidoId ? null : contenidoId);
  };

  const handleAgotado = (contenidoId) => {
    setAgotados(prev => new Set([...prev, contenidoId]));
    setExpandedCuestionario(prev => prev === contenidoId ? null : prev);
  };

  const handleCompletado = (contenidoId) => {
    setCompletados(prev => new Set([...prev, contenidoId]));
  };

  const total = contenidos.length;
  const hechos = contenidos.filter(c => completados.has(c.id)).length;
  const pct = total > 0 ? Math.round((hechos / total) * 100) : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <button onClick={toggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors text-left">
        <div className="flex items-center gap-4">
          <div className="p-2.5 bg-indigo-50 rounded-xl flex-shrink-0">
            <BookOpen size={18} className="text-indigo-600"/>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[#001871] text-sm">{curso.nombre}</p>
            {curso.descripcion && (
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">{curso.descripcion}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
          {open && total > 0 && (
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden hidden sm:block">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-[10px] font-bold text-slate-400">{hechos}/{total}</span>
            </div>
          )}
          {!open && (
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden sm:block">
              {curso.total_contenidos || 0} recursos
            </span>
          )}
          {open
            ? <ChevronDown size={16} className="text-slate-400"/>
            : <ChevronRight size={16} className="text-slate-400"/>
          }
        </div>
      </button>

      {open && (
        <div className="border-t border-slate-100 bg-slate-50/40">
          {loadingC ? (
            <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
              Cargando recursos...
            </div>
          ) : contenidos.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Sin recursos en este curso aún
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {contenidos.map(c => {
                const cfg = TIPO_CONFIG[c.tipo] || TIPO_CONFIG.texto;
                const url = c.url || c.archivo_url;
                const hecho = completados.has(c.id);
                const isToggling = toggling === c.id;
                const esCuestionario = c.tipo === 'cuestionario';
                const cuestionarioAgotado = esCuestionario && agotados.has(c.id);
                const cuestionarioExpandido = esCuestionario && expandedCuestionario === c.id;

                return (
                  <div
                    key={c.id}
                    className={`px-5 py-4 transition-colors ${
                      cuestionarioAgotado
                        ? 'bg-slate-50 opacity-60'
                        : hecho
                          ? 'bg-emerald-50/40'
                          : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Checkbox de completado (no para cuestionarios) */}
                      <button
                        onClick={() => !esCuestionario && handleToggleCompletado(c.id)}
                        disabled={isToggling || esCuestionario}
                        className={`flex-shrink-0 mt-0.5 transition-colors ${
                          esCuestionario
                            ? 'cursor-default opacity-30'
                            : 'text-slate-300 hover:text-emerald-500 disabled:opacity-50'
                        }`}
                        title={esCuestionario ? 'El progreso lo registra el cuestionario' : (hecho ? 'Marcar como pendiente' : 'Marcar como completado')}
                      >
                        {isToggling
                          ? <Loader2 size={18} className="animate-spin text-emerald-400"/>
                          : hecho
                            ? <CheckCircle2 size={18} className="text-emerald-500"/>
                            : <Circle size={18}/>
                        }
                      </button>

                      {/* Icono de tipo */}
                      <div className={`flex-shrink-0 p-2 rounded-lg border ${cuestionarioAgotado ? 'bg-slate-100 border-slate-200' : cfg.bg}`}>
                        {cuestionarioAgotado
                          ? <Lock size={15} className="text-slate-400"/>
                          : <span className={cfg.color}>{cfg.icon}</span>
                        }
                      </div>

                      {/* Contenido */}
                      <div className="flex-1 min-w-0">
                        {/* Título — clic abre cuestionario */}
                        {esCuestionario ? (
                          <button
                            onClick={() => handleToggleCuestionario(c.id)}
                            disabled={cuestionarioAgotado}
                            className={`text-left w-full group flex items-center gap-2 ${
                              cuestionarioAgotado
                                ? 'cursor-default'
                                : 'hover:text-indigo-600'
                            }`}
                          >
                            <span className={`text-sm font-semibold ${
                              cuestionarioAgotado
                                ? 'text-slate-400 line-through'
                                : hecho
                                  ? 'text-emerald-700'
                                  : 'text-[#001871]'
                            }`}>
                              {c.titulo}
                            </span>
                            {!cuestionarioAgotado && (
                              cuestionarioExpandido
                                ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/>
                                : <ChevronRight size={14} className="text-slate-400 flex-shrink-0"/>
                            )}
                            {cuestionarioAgotado && (
                              <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded-md">Límite alcanzado</span>
                            )}
                            {!cuestionarioAgotado && c.max_intentos > 0 && (
                              <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-md">
                                {c.max_intentos} intento{c.max_intentos !== 1 ? 's' : ''}
                              </span>
                            )}
                          </button>
                        ) : (
                          <p className={`text-sm font-semibold ${hecho ? 'text-slate-400 line-through' : 'text-[#001871]'}`}>
                            {c.titulo}
                          </p>
                        )}

                        {c.descripcion && (
                          <p className="text-[11px] text-slate-400 mt-0.5">{c.descripcion}</p>
                        )}

                        {/* Texto inline */}
                        {c.tipo === 'texto' && c.contenido && (
                          <div className="mt-2 p-3 rounded-xl text-xs text-slate-600 whitespace-pre-line leading-relaxed bg-white border border-slate-100">
                            {c.contenido}
                          </div>
                        )}

                        {/* Cuestionario — solo si está expandido y no agotado */}
                        {esCuestionario && cuestionarioExpandido && !cuestionarioAgotado && (
                          <div className="mt-3">
                            <CuestionarioViewer
                              contenido={c}
                              onAgotado={() => handleAgotado(c.id)}
                              onCompletado={handleCompletado}
                            />
                          </div>
                        )}
                      </div>

                      {/* Botón de descarga/enlace */}
                      {url && c.tipo !== 'texto' && !esCuestionario && (
                        <a href={url} target="_blank" rel="noopener noreferrer"
                          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#001871] text-white rounded-xl text-[10px] font-bold uppercase hover:bg-slate-800 transition-all">
                          {c.tipo === 'documento' || c.tipo === 'video'
                            ? <><Download size={11}/> Descargar</>
                            : <><ExternalLink size={11}/> {c.tipo === 'youtube' ? 'Ver video' : 'Abrir'}</>
                          }
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ManualesCargo = () => {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  useEffect(() => { fetchCursos(); }, []);

  const fetchCursos = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getAllCursos();
      setCursos(Array.isArray(data) ? data.filter(c => c.activo !== false) : (data?.results || []));
    } catch {
      setError('Error al cargar los cursos');
    } finally {
      setLoading(false);
    }
  };

  const cursosFiltrados = cursos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={24} className="text-indigo-600 animate-spin"/>
        <p className="text-sm text-slate-500">Cargando cursos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <BookOpen size={32} className="text-slate-300"/>
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={fetchCursos} className="text-xs font-bold text-indigo-600 uppercase hover:underline">
          Reintentar
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#001871]">Cursos y Capacitaciones</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {cursos.length} curso{cursos.length !== 1 ? 's' : ''} disponible{cursos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={fetchCursos}
          className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-indigo-600 uppercase transition-colors">
          <RefreshCw size={13}/> Actualizar
        </button>
      </div>

      {cursos.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            type="text"
            placeholder="Buscar cursos..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
          />
        </div>
      )}

      {cursosFiltrados.length === 0 ? (
        <div className="bg-white rounded-3xl border-2 border-dashed border-slate-100 p-16 text-center">
          <BookOpen size={40} className="text-slate-200 mx-auto mb-3"/>
          <p className="text-sm font-semibold text-slate-400">
            {busqueda ? 'Sin resultados para tu búsqueda' : 'No hay cursos disponibles aún'}
          </p>
          {!busqueda && (
            <p className="text-xs text-slate-300 mt-1">El administrador publicará cursos próximamente</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {cursosFiltrados.map(c => <CursoCard key={c.id} curso={c}/>)}
        </div>
      )}
    </div>
  );
};

export default ManualesCargo;
