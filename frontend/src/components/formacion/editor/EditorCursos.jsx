import { useState, useEffect, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import {
  BookOpen, Plus, ChevronDown, ChevronRight, Trash2, Pencil,
  Video, FileText, Link, ClipboardList, Type, Upload, X,
  PlayCircle, Loader2, AlertCircle, Download, ExternalLink,
  FolderOpen, CheckCircle2, Users, Building2, Globe,
  GripVertical, FileSpreadsheet, ChevronLeft, GraduationCap,
} from 'lucide-react';
import {
  getAllCursos, createCurso, updateCurso, deleteCurso,
  createCursoContenido, deleteCursoContenido,
  getAllAreas, getAllEmpleados, getAllCargos,
  reordenarCursos, reordenarContenidos, exportarCalificaciones,
} from '../../../lib/api';
import CuestionarioBuilder from '../shared/CuestionarioBuilder';

const TIPO_CONFIG = {
  youtube:      { label: 'Video YouTube',   icon: PlayCircle,    color: 'text-red-500',     bg: 'bg-red-50',     border: 'border-red-100',    badge: 'bg-red-100 text-red-700' },
  video:        { label: 'Video Propio',    icon: Video,         color: 'text-purple-500',  bg: 'bg-purple-50',  border: 'border-purple-100', badge: 'bg-purple-100 text-purple-700' },
  documento:    { label: 'Documento',       icon: FileText,      color: 'text-blue-500',    bg: 'bg-blue-50',    border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700' },
  texto:        { label: 'Artículo/Texto',  icon: Type,          color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-100',  badge: 'bg-slate-100 text-slate-700' },
  enlace:       { label: 'Enlace Externo',  icon: Link,          color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100',badge: 'bg-emerald-100 text-emerald-700' },
  cuestionario: { label: 'Cuestionario',    icon: ClipboardList, color: 'text-amber-500',   bg: 'bg-amber-50',   border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700' },
};

const PAGE_SIZE = 10;

function getYoutubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YouTubeThumbnailE({ url, titulo }) {
  const [abierto, setAbierto] = useState(false);
  const id = getYoutubeId(url);
  if (!id) return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:underline font-medium mt-1">
      <ExternalLink size={12}/> Ver en YouTube
    </a>
  );
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-red-100 shadow-sm">
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-red-50 hover:bg-red-100/80 transition-colors text-left">
        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
          <PlayCircle size={13} className="text-white"/>
        </div>
        <span className="flex-1 text-xs font-semibold text-red-700 truncate">{titulo || 'Ver video'}</span>
        <ChevronDown size={14} className={`text-red-400 flex-shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}/>
      </button>
      {abierto && (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            title={titulo || 'YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}
    </div>
  );
}

function getLT(tipo) {
  const cap = tipo === 'capacitacion';
  return {
    entidad:   cap ? 'capacitación' : 'curso',
    Entidad:   cap ? 'Capacitación' : 'Curso',
    nueva:     cap ? 'Nueva capacitación' : 'Nuevo curso',
    crear:     cap ? 'Crear capacitación' : 'Crear curso',
    editando:  cap ? 'Editando capacitación' : 'Editando curso',
    nombrePH:  cap ? 'Ej: Uso del sistema ERP — módulo de facturación' : 'Ej: Gestión de Proyectos con metodologías ágiles',
    descPH:    cap ? 'Procedimiento, herramienta o tarea específica a habilitar...' : 'Describe los conceptos y conocimientos a desarrollar...',
  };
}

export default function EditorCursos() {
  const [cursos, setCursos] = useState([]);
  const [totalCursos, setTotalCursos] = useState(0);
  const [page, setPage] = useState(1);
  const [areas, setAreas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showNuevoCurso, setShowNuevoCurso] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null, nivel_cargo: null });
  const [editingCurso, setEditingCurso] = useState(null);
  const [showAddContenido, setShowAddContenido] = useState(null);
  const [saving, setSaving] = useState(false);
  const [exportingId, setExportingId] = useState(null);

  // Labels dinámicos según el tipo seleccionado en cada form
  const lN = getLT(nuevoCurso.tipo    || 'curso');
  const lE = getLT(editingCurso?.tipo || 'curso');

  // Drag-drop state
  const [dragId, setDragId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);
  const [reordenando, setReordenando] = useState(false);

  const totalPages = Math.ceil(totalCursos / PAGE_SIZE);

  const fetchCursos = useCallback(async (p = page) => {
    setLoading(true);
    setError(null);
    try {
      const [cData, aData, eData, carData] = await Promise.all([
        getAllCursos(p, PAGE_SIZE),
        getAllAreas(),
        getAllEmpleados(),
        getAllCargos(),
      ]);
      const lista = Array.isArray(cData) ? cData : (cData?.results || []);
      setCursos(lista);
      setTotalCursos(cData?.count ?? lista.length);
      setAreas(Array.isArray(aData) ? aData : []);
      setEmpleados(Array.isArray(eData) ? eData : []);
      setCargos(Array.isArray(carData) ? carData : (carData?.results || []));
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchCursos(page); }, [page]);

  const cambiarPagina = (nueva) => {
    setPage(nueva);
    setExpandedId(null);
  };

  const buildCursoPayload = (data) => {
    const payload = {
      tipo: data.tipo || 'curso',
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || '',
      visibilidad: data.visibilidad || 'todos',
    };
    if (data.visibilidad === 'area' || data.visibilidad === 'cargo')
      payload.area_ids = data.area_id ? [data.area_id] : [];
    if (data.visibilidad === 'persona') payload.empleado_asignado_id = data.empleado_asignado_id || null;
    if (data.visibilidad === 'cargo')   payload.nivel_cargo          = data.nivel_cargo ?? null;
    return payload;
  };

  const handleCrearCurso = async () => {
    if (!nuevoCurso.nombre.trim()) return;
    setSaving(true);
    try {
      const created = await createCurso(buildCursoPayload(nuevoCurso));
      setNuevoCurso({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null, nivel_cargo: null });
      setShowNuevoCurso(false);
      await fetchCursos(page);
      if (created?.id) setExpandedId(created.id);
    } catch (err) {
      alert('Error al crear curso: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarEditCurso = async () => {
    if (!editingCurso?.nombre?.trim()) return;
    setSaving(true);
    try {
      await updateCurso(editingCurso.id, buildCursoPayload(editingCurso));
      setEditingCurso(null);
      fetchCursos(page);
    } catch (err) {
      alert('Error al actualizar: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminarCurso = async (id) => {
    if (!confirm('¿Eliminar este curso y todo su contenido? Esta acción no se puede deshacer.')) return;
    try {
      await deleteCurso(id);
      if (expandedId === id) setExpandedId(null);
      fetchCursos(page);
    } catch (err) {
      alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleContenidoAdded = () => {
    setShowAddContenido(null);
    fetchCursos(page);
  };

  const handleEliminarContenido = async (contenidoId) => {
    if (!confirm('¿Eliminar este contenido?')) return;
    try {
      await deleteCursoContenido(contenidoId);
      fetchCursos(page);
    } catch (err) {
      alert('Error al eliminar contenido: ' + (err.message || 'Error desconocido'));
    }
  };

  // ── Drag-drop cursos ──────────────────────────────────────────────────────────

  const handleDragStart = (e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, id) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (id !== dragId) setDragOverId(id);
  };

  const handleDrop = async (e, targetId) => {
    e.preventDefault();
    if (!dragId || dragId === targetId) {
      setDragId(null);
      setDragOverId(null);
      return;
    }
    const from = cursos.findIndex(c => c.id === dragId);
    const to = cursos.findIndex(c => c.id === targetId);
    if (from === -1 || to === -1) return;

    const reordenados = [...cursos];
    const [moved] = reordenados.splice(from, 1);
    reordenados.splice(to, 0, moved);
    const conOrden = reordenados.map((c, i) => ({ ...c, orden: i }));
    setCursos(conOrden);
    setDragId(null);
    setDragOverId(null);

    setReordenando(true);
    try {
      await reordenarCursos(conOrden.map(c => ({ id: c.id, orden: c.orden })));
    } catch {
      fetchCursos(page); // revertir si falla
    } finally {
      setReordenando(false);
    }
  };

  const handleDragEnd = () => {
    setDragId(null);
    setDragOverId(null);
  };

  // ── Reordenar contenidos ──────────────────────────────────────────────────────

  const handleReordenarContenidos = async (cursoId, contenidosNuevos) => {
    setCursos(prev => prev.map(c =>
      c.id === cursoId ? { ...c, contenidos: contenidosNuevos } : c
    ));
    try {
      await reordenarContenidos(contenidosNuevos.map((c, i) => ({ id: c.id, orden: i })));
    } catch {
      fetchCursos(page);
    }
  };

  // ── Exportar calificaciones ───────────────────────────────────────────────────

  const handleExportar = async (curso) => {
    setExportingId(curso.id);
    try {
      const data = await exportarCalificaciones(curso.id);
      if (!data?.intentos?.length) {
        alert('Este curso no tiene calificaciones registradas todavía.');
        return;
      }
      const filas = data.intentos.map(row => ({
        'Empleado': row.empleado,
        'Correo': row.correo,
        'Cuestionario': row.cuestionario,
        'Puntaje (%)': row.puntaje,
        'Aprobado': row.aprobado,
        'Intento #': row.num_intento,
        'Tiempo (seg)': row.tiempo_seg,
        'Fecha': row.fecha,
      }));
      const ws = XLSX.utils.json_to_sheet(filas);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Calificaciones');
      const nombre = curso.nombre.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 30);
      XLSX.writeFile(wb, `Calificaciones_${nombre}.xlsx`);
    } catch (err) {
      alert('Error al exportar: ' + (err.message || 'Error desconocido'));
    } finally {
      setExportingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 size={32} className="text-slate-400 animate-spin mb-3" />
        <p className="text-sm text-slate-400 font-medium">Cargando cursos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle size={32} className="text-red-400 mb-3" />
        <p className="text-sm text-red-500 font-medium mb-4">{error}</p>
        <button onClick={() => fetchCursos(page)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all">
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
          <div className="p-2.5 bg-gradient-to-br from-[#001871] to-[#00a9ce] rounded-xl shadow-sm">
            <BookOpen size={20} className="text-white"/>
          </div>
          <div>
            <h3 className="font-bold text-[#001871] text-lg">Gestión de Cursos</h3>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              {totalCursos} curso{totalCursos !== 1 ? 's' : ''} en total
              {reordenando && <span className="ml-2 text-[#00a9ce]">· guardando orden...</span>}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowNuevoCurso(true); setEditingCurso(null); setNuevoCurso({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null, nivel_cargo: null }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus size={14}/> Nuevo Curso
        </button>
      </div>

      {/* Tip drag-drop */}
      {cursos.length > 1 && (
        <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
          <GripVertical size={12}/> Arrastra los cursos para cambiar el orden de visualización
        </p>
      )}

      {/* Form nuevo curso */}
      {showNuevoCurso && (
        <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={16} className="text-[#001871]"/>
            <p className="text-xs font-bold text-[#001871] uppercase tracking-widest">{lN.nueva}</p>
          </div>
          <TipoSelectorEditor value={nuevoCurso.tipo || 'curso'} onChange={t => setNuevoCurso(p => ({ ...p, tipo: t }))} />
          <input
            autoFocus
            value={nuevoCurso.nombre}
            onChange={e => setNuevoCurso(p => ({ ...p, nombre: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleCrearCurso()}
            placeholder={lN.nombrePH}
            className="w-full px-4 py-3 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-100 font-semibold transition-all"
          />
          <textarea
            value={nuevoCurso.descripcion}
            onChange={e => setNuevoCurso(p => ({ ...p, descripcion: e.target.value }))}
            placeholder={lN.descPH}
            rows={2}
            className="w-full px-4 py-3 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-100 resize-none transition-all"
          />
          <VisibilidadSelector value={nuevoCurso} onChange={setNuevoCurso} areas={areas} empleados={empleados} />
          <div className="flex gap-3">
            <button
              onClick={handleCrearCurso}
              disabled={saving || !nuevoCurso.nombre.trim()}
              className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin"/> Creando...</> : <><CheckCircle2 size={14}/> {lN.crear}</>}
            </button>
            <button
              onClick={() => setShowNuevoCurso(false)}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <X size={14}/> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista vacía */}
      {cursos.length === 0 && !showNuevoCurso && (
        <div className="bg-white border-2 border-dashed border-slate-200 rounded-2xl p-16 text-center shadow-sm">
          <div className="p-4 bg-slate-50 rounded-2xl inline-block mb-4">
            <BookOpen size={32} className="text-slate-300"/>
          </div>
          <p className="text-sm font-bold text-slate-600 mb-1">No hay cursos creados</p>
          <p className="text-xs text-slate-400 mb-4">Comienza creando tu primer curso para organizar contenido.</p>
          <button
            onClick={() => setShowNuevoCurso(true)}
            className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            <Plus size={14} className="inline mr-2"/> Crear Primer Curso
          </button>
        </div>
      )}

      {/* Lista de cursos con drag-drop */}
      <div className="space-y-3">
        {cursos.map(curso => (
          <div
            key={curso.id}
            draggable
            onDragStart={e => handleDragStart(e, curso.id)}
            onDragOver={e => handleDragOver(e, curso.id)}
            onDrop={e => handleDrop(e, curso.id)}
            onDragEnd={handleDragEnd}
            className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all ${
              dragOverId === curso.id
                ? 'border-[#00a9ce] shadow-md scale-[1.01]'
                : dragId === curso.id
                  ? 'border-[#001871] opacity-50'
                  : 'border-slate-100 hover:shadow-md'
            }`}
          >
            {/* Cabecera del curso */}
            {editingCurso?.id === curso.id ? (
              <div className="p-5 bg-amber-50/60 border-l-4 border-amber-400 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Pencil size={14} className="text-amber-600"/>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">{lE.editando}</p>
                </div>
                <TipoSelectorEditor value={editingCurso.tipo || 'curso'} onChange={t => setEditingCurso(p => ({ ...p, tipo: t }))} />
                <input
                  autoFocus
                  value={editingCurso.nombre}
                  onChange={e => setEditingCurso(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-4 py-3 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 font-semibold transition-all"
                />
                <textarea
                  value={editingCurso.descripcion}
                  onChange={e => setEditingCurso(p => ({ ...p, descripcion: e.target.value }))}
                  placeholder="Descripción..."
                  rows={2}
                  className="w-full px-4 py-3 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 resize-none transition-all"
                />
                <VisibilidadSelector value={editingCurso} onChange={setEditingCurso} areas={areas} empleados={empleados} accentColor="amber" />
                <div className="flex gap-3">
                  <button
                    onClick={handleGuardarEditCurso}
                    disabled={saving}
                    className="px-4 py-2 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
                  >
                    {saving ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                  <button
                    onClick={() => setEditingCurso(null)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 p-4 select-none">
                {/* Handle drag */}
                <span className="text-slate-300 cursor-grab active:cursor-grabbing flex-shrink-0" title="Arrastra para reordenar">
                  <GripVertical size={16}/>
                </span>
                <span
                  className="text-slate-400 flex-shrink-0 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === curso.id ? null : curso.id)}
                >
                  {expandedId === curso.id ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                </span>
                <div
                  className="w-10 h-10 bg-gradient-to-br from-[#001871] to-[#00a9ce] text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm cursor-pointer"
                  onClick={() => setExpandedId(expandedId === curso.id ? null : curso.id)}
                >
                  {curso.nombre?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(expandedId === curso.id ? null : curso.id)}>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#001871] text-sm truncate">{curso.nombre}</p>
                    <TipoBadgeEditor tipo={curso.tipo} />
                    <VisibilidadBadge visibilidad={curso.visibilidad} nombreArea={curso.nombre_area} nombreEmpleado={curso.nombre_empleado} nivelCargo={curso.nivel_cargo} />
                  </div>
                  {curso.descripcion && <p className="text-xs text-slate-400 truncate mt-0.5">{curso.descripcion}</p>}
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                  {curso.total_contenidos || 0} item{(curso.total_contenidos || 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  {/* Exportar calificaciones */}
                  <button
                    onClick={() => handleExportar(curso)}
                    disabled={exportingId === curso.id}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Exportar calificaciones"
                  >
                    {exportingId === curso.id
                      ? <Loader2 size={14} className="animate-spin"/>
                      : <FileSpreadsheet size={14}/>
                    }
                  </button>
                  <button
                    onClick={() => setEditingCurso({
                      tipo: curso.tipo || 'curso',
                      id: curso.id,
                      nombre: curso.nombre,
                      descripcion: curso.descripcion || '',
                      visibilidad: curso.visibilidad || 'todos',
                      area_id: curso.area_id || null,
                      empleado_asignado_id: curso.empleado_asignado_id || null,
                      nivel_cargo: curso.nivel_cargo ?? null,
                    })}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    title="Editar curso"
                  >
                    <Pencil size={14}/>
                  </button>
                  <button
                    onClick={() => handleEliminarCurso(curso.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar curso"
                  >
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            )}

            {/* Contenidos expandidos */}
            {expandedId === curso.id && (
              <ContenidosPanel
                curso={curso}
                onContenidoAdded={handleContenidoAdded}
                onEliminarContenido={handleEliminarContenido}
                showAddContenido={showAddContenido}
                setShowAddContenido={setShowAddContenido}
                onReordenar={handleReordenarContenidos}
              />
            )}
          </div>
        ))}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => cambiarPagina(page - 1)}
            disabled={page <= 1}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16}/>
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button
              key={p}
              onClick={() => cambiarPagina(p)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${
                p === page
                  ? 'bg-[#001871] text-white'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {p}
            </button>
          ))}
          <button
            onClick={() => cambiarPagina(page + 1)}
            disabled={page >= totalPages}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight size={16}/>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function TipoBadgeEditor({ tipo }) {
  if (tipo === 'capacitacion') return (
    <span className="text-[10px] font-bold text-[#00bfb3] bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 flex items-center gap-1">
      <GraduationCap size={10}/> Capacitación
    </span>
  );
  return (
    <span className="text-[10px] font-bold text-[#001871] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
      <BookOpen size={10}/> Curso
    </span>
  );
}

const NIVELES_CARGO_E = [
  { valor: 0, label: 'Socio',           color: '#001871' },
  { valor: 1, label: 'Gerente Asociado', color: '#981d97' },
  { valor: 2, label: 'Senior',           color: '#00bfb3' },
  { valor: 3, label: 'Líder de equipo',  color: '#ed8b00' },
  { valor: 4, label: 'Analista',         color: '#00a9ce' },
];

function nivelDeCargoE(nombre = '') {
  const n = nombre.toUpperCase();
  if (n.includes('SOCIO'))                                    return 0;
  if (n.includes('GERENTE'))                                  return 1;
  if (n.includes('LÍDER') || n.includes('LIDER') || n.includes('SEMI')) return 3;
  if (n.includes('SENIOR'))                                   return 2;
  if (n.includes('ANALISTA') || n.includes('ASISTENTE'))     return 4;
  return 99;
}

function VisibilidadBadge({ visibilidad, nombreArea, nombreEmpleado, nivelCargo }) {
  if (visibilidad === 'area') return (
    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
      <Building2 size={10}/> {nombreArea || 'Área'}
    </span>
  );
  if (visibilidad === 'persona') return (
    <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
      <Users size={10}/> {nombreEmpleado || 'Persona'}
    </span>
  );
  if (visibilidad === 'cargo') {
    const nivel = NIVELES_CARGO_E.find(n => n.valor === nivelCargo);
    return (
      <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100 flex items-center gap-1">
        <GraduationCap size={10}/> {nivel?.label || 'Por cargo'}
      </span>
    );
  }
  return (
    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
      <Globe size={10}/> Todos
    </span>
  );
}

function VisibilidadSelector({ value, onChange, areas, empleados, accentColor = 'blue' }) {
  const [areaFiltro, setAreaFiltro] = useState(() =>
    (value.visibilidad === 'area' || value.visibilidad === 'persona' || value.visibilidad === 'cargo')
      ? (value.area_id || null) : null
  );

  const empleadosDelArea = areaFiltro
    ? empleados.filter(e => e.area_id === Number(areaFiltro))
    : empleados;

  const nivelesDelArea = areaFiltro
    ? [...new Set(empleadosDelArea.map(e => nivelDeCargoE(e.nombre_cargo || '')).filter(n => n !== 99))].sort()
    : NIVELES_CARGO_E.map(n => n.valor);

  const isTodos   = value.visibilidad === 'todos';
  const isArea    = value.visibilidad === 'area';
  const isPersona = value.visibilidad === 'persona';
  const isCargo   = value.visibilidad === 'cargo';
  const enArea    = isArea || isPersona || isCargo;

  const elegirTodos = () => { setAreaFiltro(null); onChange(p => ({ ...p, visibilidad: 'todos', area_id: null, empleado_asignado_id: null, nivel_cargo: null })); };
  const activarArea = () => { onChange(p => ({ ...p, visibilidad: 'area', area_id: areaFiltro, empleado_asignado_id: null, nivel_cargo: null })); };
  const cambiarArea = (id) => { const n = id ? Number(id) : null; setAreaFiltro(n); onChange(p => ({ ...p, visibilidad: 'area', area_id: n, empleado_asignado_id: null, nivel_cargo: null })); };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Visibilidad del curso</p>

      {/* Paso 1 */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={elegirTodos}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${isTodos ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
          <Globe size={12}/> Todos
        </button>
        <button type="button" onClick={activarArea}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${enArea ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
          <Building2 size={12}/> Por Área
        </button>
      </div>

      {/* Paso 2: Área */}
      {enArea && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">Área</label>
          <select value={areaFiltro || ''} onChange={e => cambiarArea(e.target.value || null)}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all">
            <option value="">Seleccionar área...</option>
            {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
          </select>
        </div>
      )}

      {/* Paso 3: Granularidad */}
      {enArea && areaFiltro && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'area', area_id: areaFiltro, empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${isArea ? 'bg-[#00bfb3] text-white border-[#00bfb3] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Users size={11}/> Todo el área
          </button>
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'cargo', area_id: areaFiltro, empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${isCargo ? 'bg-[#ed8b00] text-white border-[#ed8b00] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <GraduationCap size={11}/> Por Cargo
          </button>
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'persona', area_id: null, empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${isPersona ? 'bg-[#981d97] text-white border-[#981d97] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}>
            <Users size={11}/> Persona
          </button>
        </div>
      )}

      {/* Niveles de cargo */}
      {isCargo && areaFiltro && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nivel de cargo</p>
          <div className="flex flex-wrap gap-2">
            {NIVELES_CARGO_E.filter(n => nivelesDelArea.includes(n.valor)).map(({ valor, label, color }) => {
              const activo = value.nivel_cargo === valor;
              return (
                <button key={valor} type="button"
                  onClick={() => onChange(p => ({ ...p, visibilidad: 'cargo', area_id: areaFiltro, nivel_cargo: valor, empleado_asignado_id: null }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${activo ? 'text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  style={activo ? { backgroundColor: color, borderColor: color } : {}}>
                  <Users size={11} style={{ color: activo ? 'white' : color }}/> {label}
                </button>
              );
            })}
            {nivelesDelArea.length === 0 && <p className="text-[10px] text-amber-500 font-semibold">Sin empleados en esta área</p>}
          </div>
          {value.nivel_cargo !== null && value.nivel_cargo !== undefined && (
            <p className="text-[10px] text-[#001871] font-semibold">
              Solo {NIVELES_CARGO_E.find(n => n.valor === value.nivel_cargo)?.label} del área verán este curso
            </p>
          )}
        </div>
      )}

      {/* Persona filtrada */}
      {isPersona && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">
            Persona <span className="text-slate-400 font-normal">({empleadosDelArea.length} en esta área)</span>
          </label>
          <select value={value.empleado_asignado_id || ''}
            onChange={e => onChange(p => ({ ...p, visibilidad: 'persona', area_id: null, nivel_cargo: null, empleado_asignado_id: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all">
            <option value="">Seleccionar persona...</option>
            {empleadosDelArea.map(e => (
              <option key={e.id_empleado} value={e.id_empleado}>
                {e.nombre_completo || `${e.primer_nombre} ${e.primer_apellido}`}
                {e.nombre_cargo ? ` · ${e.nombre_cargo}` : ''}
              </option>
            ))}
          </select>
          {empleadosDelArea.length === 0 && <p className="text-[10px] text-amber-500 font-semibold mt-1">Sin empleados en esta área</p>}
        </div>
      )}
    </div>
  );
}

function ContenidosPanel({ curso, onContenidoAdded, onEliminarContenido, showAddContenido, setShowAddContenido, onReordenar }) {
  const [dragItemId, setDragItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);
  const contenidos = curso.contenidos || [];

  const handleDragStartItem = (e, id) => {
    setDragItemId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.stopPropagation();
  };
  const handleDragOverItem = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (id !== dragItemId) setDragOverItemId(id);
  };
  const handleDropItem = (e, targetId) => {
    e.preventDefault();
    e.stopPropagation();
    if (!dragItemId || dragItemId === targetId) { setDragItemId(null); setDragOverItemId(null); return; }
    const from = contenidos.findIndex(c => c.id === dragItemId);
    const to = contenidos.findIndex(c => c.id === targetId);
    if (from === -1 || to === -1) return;
    const reordenados = [...contenidos];
    const [moved] = reordenados.splice(from, 1);
    reordenados.splice(to, 0, moved);
    setDragItemId(null);
    setDragOverItemId(null);
    onReordenar(curso.id, reordenados);
  };

  return (
    <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-4">
      {contenidos.length > 0 ? (
        <div className="space-y-2">
          {contenidos.map((item) => {
            const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.enlace;
            const IconComp = cfg.icon;
            return (
              <div
                key={item.id}
                draggable
                onDragStart={e => handleDragStartItem(e, item.id)}
                onDragOver={e => handleDragOverItem(e, item.id)}
                onDrop={e => handleDropItem(e, item.id)}
                onDragEnd={() => { setDragItemId(null); setDragOverItemId(null); }}
                className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border} shadow-sm transition-all ${
                  dragOverItemId === item.id ? 'ring-2 ring-[#00a9ce] scale-[1.01]' : dragItemId === item.id ? 'opacity-50' : ''
                }`}
              >
                <span className="text-slate-300 cursor-grab active:cursor-grabbing mt-1 flex-shrink-0" title="Arrastra para reordenar">
                  <GripVertical size={14}/>
                </span>
                <div className="mt-0.5 flex-shrink-0 p-2 rounded-lg bg-white/80">
                  <IconComp size={16} className={cfg.color}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-bold text-[#001871] truncate">{item.titulo}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${cfg.badge}`}>
                      {cfg.label}
                    </span>
                  </div>
                  {item.descripcion && <p className="text-xs text-slate-500 mb-1">{item.descripcion}</p>}
                  {item.tipo === 'youtube' && item.url
                    ? <YouTubeThumbnailE url={item.url} titulo={item.titulo} />
                    : item.url && (
                      <a href={item.url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium mt-1">
                        <ExternalLink size={12}/>
                        {item.url.length > 50 ? item.url.substring(0, 50) + '…' : item.url}
                      </a>
                    )
                  }
                  {item.archivo_url && (
                    <div className="flex items-center gap-2 mt-2">
                      <a href={item.archivo_url} target="_blank" rel="noopener noreferrer" download
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={12}/> Descargar
                      </a>
                      <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all">
                        <ExternalLink size={12}/> Ver
                      </a>
                    </div>
                  )}
                  {item.contenido && item.tipo !== 'cuestionario' && (
                    <div className="mt-2 p-3 bg-white/80 rounded-lg border border-slate-100">
                      <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{item.contenido}</p>
                    </div>
                  )}
                  {item.contenido && item.tipo === 'cuestionario' && (() => {
                    try {
                      const q = JSON.parse(item.contenido);
                      const total = q.preguntas?.length || 0;
                      const autogradables = (q.preguntas || []).filter(p => p.tipo !== 'texto_libre').length;
                      return (
                        <div className="mt-2 p-3 bg-amber-50/60 rounded-lg border border-amber-100 flex flex-wrap gap-3 text-[11px] font-semibold text-amber-800">
                          <span>{total} pregunta{total !== 1 ? 's' : ''}</span>
                          <span className="text-amber-400">·</span>
                          <span>{autogradables} autocalificable{autogradables !== 1 ? 's' : ''}</span>
                          <span className="text-amber-400">·</span>
                          <span>Aprobación: {q.puntaje_aprobacion ?? 70}%</span>
                          {item.max_intentos > 0 && (
                            <><span className="text-amber-400">·</span><span>{item.max_intentos} intento{item.max_intentos !== 1 ? 's' : ''} máx.</span></>
                          )}
                        </div>
                      );
                    } catch {
                      return <div className="mt-2 p-3 bg-amber-50/60 rounded-lg border border-amber-100 text-xs text-amber-700">Cuestionario guardado</div>;
                    }
                  })()}
                </div>
                <button
                  onClick={() => onEliminarContenido(item.id)}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                  title="Eliminar contenido"
                >
                  <Trash2 size={14}/>
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="p-3 bg-slate-100 rounded-xl inline-block mb-2">
            <FolderOpen size={20} className="text-slate-300"/>
          </div>
          <p className="text-xs text-slate-400 font-medium">Este curso aún no tiene contenido.</p>
          <p className="text-[10px] text-slate-300 mt-1">Agrega videos, documentos, enlaces o artículos.</p>
        </div>
      )}

      {showAddContenido === curso.id ? (
        <AddContenidoForm cursoId={curso.id} onDone={onContenidoAdded} onCancel={() => setShowAddContenido(null)} />
      ) : (
        <button
          onClick={() => setShowAddContenido(curso.id)}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-[#001871] hover:text-[#001871] hover:bg-blue-50/30 transition-all"
        >
          <Plus size={14}/> Agregar Contenido al Curso
        </button>
      )}
    </div>
  );
}

// ── Selector de tipo compacto para EditorCursos ──────────────────────────────

function TipoSelectorEditor({ value, onChange }) {
  const opciones = [
    { key: 'curso',        label: 'Curso',        desc: 'Formativo — amplía conocimientos', Icon: BookOpen,      color: '#001871' },
    { key: 'capacitacion', label: 'Capacitación',  desc: 'Práctico — habilita para una función', Icon: GraduationCap, color: '#00bfb3' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {opciones.map(({ key, label, desc, Icon, color }) => {
        const activo = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all ${
              activo ? 'border-current shadow-sm bg-white' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
            style={activo ? { borderColor: color } : {}}>
            <div className="p-1.5 rounded-lg flex-shrink-0" style={{ backgroundColor: color + '18' }}>
              <Icon size={13} style={{ color: activo ? color : '#94a3b8' }}/>
            </div>
            <div>
              <p className="text-xs font-bold" style={{ color: activo ? color : '#64748b' }}>{label}</p>
              <p className="text-[9px] text-slate-400 leading-snug">{desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── Formulario para agregar contenido ────────────────────────────────────────

function AddContenidoForm({ cursoId, onDone, onCancel }) {
  const [tipo, setTipo] = useState('documento');
  const [form, setForm] = useState({ titulo: '', descripcion: '', url: '', contenido: '', max_intentos: 3 });
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const needsUrl = ['youtube', 'enlace'].includes(tipo);
  const needsFile = ['video', 'documento'].includes(tipo);
  const needsContenido = tipo === 'texto';
  const needsBuilder = tipo === 'cuestionario';

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { alert('El título es obligatorio'); return; }
    setSaving(true);
    try {
      if (needsFile && archivo) {
        const fd = new FormData();
        fd.append('curso', cursoId);
        fd.append('tipo', tipo);
        fd.append('titulo', form.titulo.trim());
        fd.append('descripcion', form.descripcion.trim());
        fd.append('archivo', archivo);
        await createCursoContenido(fd);
      } else {
        await createCursoContenido({
          curso: cursoId, tipo,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          url: needsUrl ? form.url.trim() || null : null,
          contenido: (needsContenido || needsBuilder) ? form.contenido || null : null,
          max_intentos: needsBuilder ? Number(form.max_intentos) || 0 : 0,
        });
      }
      setForm({ titulo: '', descripcion: '', url: '', contenido: '', max_intentos: 3 });
      setArchivo(null);
      onDone();
    } catch (err) {
      alert('Error al agregar contenido: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-blue-100 rounded-lg">
          <Plus size={14} className="text-[#001871]"/>
        </div>
        <p className="text-xs font-bold text-[#001871] uppercase tracking-widest">Nuevo contenido</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const IconC = cfg.icon;
          return (
            <button key={key} onClick={() => setTipo(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                tipo === key ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <IconC size={14} className={tipo === key ? 'text-white' : cfg.color}/> {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        <input autoFocus value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
          placeholder="Título del contenido *"
          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-50 font-semibold transition-all"
        />
        <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          placeholder="Descripción (opcional)..."
          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-50 transition-all"
        />
        {needsUrl && (
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
            placeholder={tipo === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-50 transition-all"
          />
        )}
        {needsFile && (
          <div>
            <input ref={fileRef} type="file"
              accept={tipo === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,application/*'}
              onChange={e => setArchivo(e.target.files[0])} className="hidden"
            />
            <button onClick={() => fileRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-xs font-semibold transition-all ${
                archivo ? 'border-[#001871] text-[#001871] bg-blue-50' : 'border-slate-200 text-slate-400 hover:border-[#001871] hover:text-[#001871]'
              }`}
            >
              <Upload size={14}/>
              {archivo
                ? <span className="flex items-center gap-2"><FileText size={14}/> {archivo.name} <span className="text-[10px] text-slate-400">({(archivo.size / 1024).toFixed(0)} KB)</span></span>
                : `Seleccionar ${tipo === 'video' ? 'video' : 'documento'}`
              }
            </button>
            {archivo && <button onClick={() => setArchivo(null)} className="text-[10px] text-red-500 hover:text-red-600 mt-1 font-medium">Quitar archivo</button>}
          </div>
        )}
        {needsContenido && (
          <textarea value={form.contenido} onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
            placeholder="Escribe el contenido del artículo..." rows={5}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-50 resize-none transition-all"
          />
        )}
        {needsBuilder && (
          <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
            <ClipboardList size={14} className="text-amber-500 flex-shrink-0"/>
            <label className="text-xs font-bold text-slate-600 flex-shrink-0">Intentos permitidos:</label>
            <input type="number" min={0} max={99} value={form.max_intentos}
              onChange={e => setForm(p => ({ ...p, max_intentos: e.target.value }))}
              className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-400">(0 = sin límite)</span>
          </div>
        )}
        {needsBuilder && (
          <CuestionarioBuilder value={form.contenido} onChange={val => setForm(p => ({ ...p, contenido: val }))} />
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button onClick={handleSubmit} disabled={saving || !form.titulo.trim()}
          className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin"/> Guardando...</> : <><CheckCircle2 size={14}/> Agregar Contenido</>}
        </button>
        <button onClick={onCancel} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}
