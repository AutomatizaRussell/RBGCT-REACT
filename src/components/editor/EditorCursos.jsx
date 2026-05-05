import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Plus, ChevronDown, ChevronRight, Trash2, Pencil,
  Video, FileText, Link, ClipboardList, Type, Upload, X,
  PlayCircle, Loader2, AlertCircle, Download, ExternalLink,
  FolderOpen, Clock, CheckCircle2, GripVertical, Users, Building2, Globe
} from 'lucide-react';
import {
  getAllCursos, createCurso, updateCurso, deleteCurso,
  createCursoContenido, deleteCursoContenido,
  getAllAreas, getAllEmpleados,
} from '../../lib/db';

const TIPO_CONFIG = {
  youtube:      { label: 'Video YouTube',   icon: PlayCircle, color: 'text-red-500',    bg: 'bg-red-50',    border: 'border-red-100',    badge: 'bg-red-100 text-red-700' },
  video:        { label: 'Video Propio',    icon: Video,      color: 'text-purple-500',  bg: 'bg-purple-50',  border: 'border-purple-100',  badge: 'bg-purple-100 text-purple-700' },
  documento:    { label: 'Documento',       icon: FileText,   color: 'text-blue-500',   bg: 'bg-blue-50',   border: 'border-blue-100',   badge: 'bg-blue-100 text-blue-700' },
  texto:        { label: 'Artículo/Texto',  icon: Type,       color: 'text-slate-500',  bg: 'bg-slate-50',   border: 'border-slate-100',   badge: 'bg-slate-100 text-slate-700' },
  enlace:       { label: 'Enlace Externo',  icon: Link,       color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', badge: 'bg-emerald-100 text-emerald-700' },
  cuestionario: { label: 'Cuestionario',    icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-50',  border: 'border-amber-100',  badge: 'bg-amber-100 text-amber-700' },
};

export default function EditorCursos() {
  const [cursos, setCursos] = useState([]);
  const [areas, setAreas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showNuevoCurso, setShowNuevoCurso] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({ nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null });
  const [editingCurso, setEditingCurso] = useState(null);
  const [showAddContenido, setShowAddContenido] = useState(null);
  const [saving, setSaving] = useState(false);

  const fetchCursos = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cData, aData, eData] = await Promise.all([
        getAllCursos(),
        getAllAreas(),
        getAllEmpleados(),
      ]);
      setCursos(Array.isArray(cData) ? cData : []);
      setAreas(Array.isArray(aData) ? aData : []);
      setEmpleados(Array.isArray(eData) ? eData : []);
    } catch (err) {
      console.error('Error cargando datos:', err);
      setError('No se pudieron cargar los datos. Intenta recargar la página.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCursos(); }, [fetchCursos]);

  const buildCursoPayload = (data) => {
    const payload = {
      nombre: data.nombre.trim(),
      descripcion: data.descripcion?.trim() || '',
      visibilidad: data.visibilidad || 'todos',
    };
    if (data.visibilidad === 'area') payload.area_id = data.area_id || null;
    if (data.visibilidad === 'persona') payload.empleado_asignado_id = data.empleado_asignado_id || null;
    return payload;
  };

  const handleCrearCurso = async () => {
    if (!nuevoCurso.nombre.trim()) return;
    setSaving(true);
    try {
      const created = await createCurso(buildCursoPayload(nuevoCurso));
      setNuevoCurso({ nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null });
      setShowNuevoCurso(false);
      await fetchCursos();
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
      fetchCursos();
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
      fetchCursos();
    } catch (err) {
      alert('Error al eliminar: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleContenidoAdded = () => {
    setShowAddContenido(null);
    fetchCursos();
  };

  const handleEliminarContenido = async (contenidoId) => {
    if (!confirm('¿Eliminar este contenido?')) return;
    try {
      await deleteCursoContenido(contenidoId);
      fetchCursos();
    } catch (err) {
      alert('Error al eliminar contenido: ' + (err.message || 'Error desconocido'));
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
        <button onClick={fetchCursos} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-200 transition-all">
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
          <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-sm">
            <BookOpen size={20} className="text-white"/>
          </div>
          <div>
            <h3 className="font-bold text-[#001e33] text-lg">Gestión de Cursos</h3>
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">
              {cursos.length} curso{cursos.length !== 1 ? 's' : ''} disponible{cursos.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <button
          onClick={() => { setShowNuevoCurso(true); setEditingCurso(null); setNuevoCurso({ nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null }); }}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus size={14}/> Nuevo Curso
        </button>
      </div>

      {/* Form nuevo curso */}
      {showNuevoCurso && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={16} className="text-purple-500"/>
            <p className="text-xs font-bold text-purple-700 uppercase tracking-widest">Crear nuevo curso</p>
          </div>
          <input
            autoFocus
            value={nuevoCurso.nombre}
            onChange={e => setNuevoCurso(p => ({ ...p, nombre: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleCrearCurso()}
            placeholder="Nombre del curso..."
            className="w-full px-4 py-3 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 font-semibold transition-all"
          />
          <textarea
            value={nuevoCurso.descripcion}
            onChange={e => setNuevoCurso(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Descripción del curso (opcional)..."
            rows={2}
            className="w-full px-4 py-3 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none transition-all"
          />

          {/* Visibilidad */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-purple-700 uppercase tracking-widest">Visibilidad del curso</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'todos', label: 'Todos', icon: Globe },
                { key: 'area', label: 'Área', icon: Building2 },
                { key: 'persona', label: 'Persona', icon: Users },
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setNuevoCurso(p => ({ ...p, visibilidad: key, area_id: key === 'area' ? p.area_id : null, empleado_asignado_id: key === 'persona' ? p.empleado_asignado_id : null }))}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                    nuevoCurso.visibilidad === key
                      ? 'bg-[#001e33] text-white border-[#001e33] shadow-sm'
                      : 'bg-white border-purple-200 text-slate-500 hover:border-purple-300'
                  }`}
                >
                  <Icon size={14}/> {label}
                </button>
              ))}
            </div>

            {nuevoCurso.visibilidad === 'area' && (
              <select
                value={nuevoCurso.area_id || ''}
                onChange={e => setNuevoCurso(p => ({ ...p, area_id: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-2.5 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 transition-all"
              >
                <option value="">Seleccionar área...</option>
                {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
              </select>
            )}

            {nuevoCurso.visibilidad === 'persona' && (
              <select
                value={nuevoCurso.empleado_asignado_id || ''}
                onChange={e => setNuevoCurso(p => ({ ...p, empleado_asignado_id: e.target.value ? Number(e.target.value) : null }))}
                className="w-full px-4 py-2.5 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 transition-all"
              >
                <option value="">Seleccionar persona...</option>
                {empleados.map(e => (
                  <option key={e.id_empleado} value={e.id_empleado}>
                    {e.nombre_completo || `${e.primer_nombre} ${e.primer_apellido}`}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleCrearCurso}
              disabled={saving || !nuevoCurso.nombre.trim()}
              className="px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
            >
              {saving ? <><Loader2 size={14} className="animate-spin"/> Creando...</> : <><CheckCircle2 size={14}/> Crear Curso</>}
            </button>
            <button
              onClick={() => { setShowNuevoCurso(false); setNuevoCurso({ nombre: '', descripcion: '', visibilidad: 'todos', area_id: null, empleado_asignado_id: null }); }}
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
            className="px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            <Plus size={14} className="inline mr-2"/> Crear Primer Curso
          </button>
        </div>
      )}

      {/* Lista de cursos */}
      <div className="space-y-4">
        {cursos.map(curso => (
          <div key={curso.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all hover:shadow-md">
            {/* Cabecera del curso */}
            {editingCurso?.id === curso.id ? (
              <div className="p-5 bg-amber-50/60 border-l-4 border-amber-400 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <Pencil size={14} className="text-amber-600"/>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Editando curso</p>
                </div>
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

                {/* Visibilidad edit */}
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Visibilidad</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { key: 'todos', label: 'Todos', icon: Globe },
                      { key: 'area', label: 'Área', icon: Building2 },
                      { key: 'persona', label: 'Persona', icon: Users },
                    ].map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setEditingCurso(p => ({ ...p, visibilidad: key, area_id: key === 'area' ? p.area_id : null, empleado_asignado_id: key === 'persona' ? p.empleado_asignado_id : null }))}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                          editingCurso.visibilidad === key
                            ? 'bg-[#001e33] text-white border-[#001e33] shadow-sm'
                            : 'bg-white border-amber-200 text-slate-500 hover:border-amber-300'
                        }`}
                      >
                        <Icon size={14}/> {label}
                      </button>
                    ))}
                  </div>

                  {editingCurso.visibilidad === 'area' && (
                    <select
                      value={editingCurso.area_id || ''}
                      onChange={e => setEditingCurso(p => ({ ...p, area_id: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 transition-all"
                    >
                      <option value="">Seleccionar área...</option>
                      {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
                    </select>
                  )}

                  {editingCurso.visibilidad === 'persona' && (
                    <select
                      value={editingCurso.empleado_asignado_id || ''}
                      onChange={e => setEditingCurso(p => ({ ...p, empleado_asignado_id: e.target.value ? Number(e.target.value) : null }))}
                      className="w-full px-4 py-2.5 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 transition-all"
                    >
                      <option value="">Seleccionar persona...</option>
                      {empleados.map(e => (
                        <option key={e.id_empleado} value={e.id_empleado}>
                          {e.nombre_completo || `${e.primer_nombre} ${e.primer_apellido}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleGuardarEditCurso}
                    disabled={saving}
                    className="px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
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
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50/80 transition-colors select-none"
                onClick={() => setExpandedId(expandedId === curso.id ? null : curso.id)}
              >
                <span className="text-slate-400 flex-shrink-0 transition-transform duration-200">
                  {expandedId === curso.id ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                </span>
                <div className="w-10 h-10 bg-gradient-to-br from-[#001e33] to-slate-700 text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0 shadow-sm">
                  {curso.nombre?.charAt(0).toUpperCase() || 'C'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-[#001e33] text-sm truncate">{curso.nombre}</p>
                    {curso.visibilidad === 'todos' && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 flex items-center gap-1">
                        <Globe size={10}/> Todos
                      </span>
                    )}
                    {curso.visibilidad === 'area' && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 flex items-center gap-1">
                        <Building2 size={10}/> {curso.nombre_area || 'Área'}
                      </span>
                    )}
                    {curso.visibilidad === 'persona' && (
                      <span className="text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 flex items-center gap-1">
                        <Users size={10}/> {curso.nombre_empleado || 'Persona'}
                      </span>
                    )}
                  </div>
                  {curso.descripcion && <p className="text-xs text-slate-400 truncate mt-0.5">{curso.descripcion}</p>}
                </div>
                <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg flex-shrink-0">
                  {curso.total_contenidos || 0} item{(curso.total_contenidos || 0) !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => setEditingCurso({
                      id: curso.id,
                      nombre: curso.nombre,
                      descripcion: curso.descripcion || '',
                      visibilidad: curso.visibilidad || 'todos',
                      area_id: curso.area_id || null,
                      empleado_asignado_id: curso.empleado_asignado_id || null,
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

            {/* Contenido del curso (expandido) */}
            {expandedId === curso.id && (
              <div className="border-t border-slate-100 bg-slate-50/40 p-5 space-y-4">
                {/* Items del curso */}
                {curso.contenidos && curso.contenidos.length > 0 ? (
                  <div className="space-y-3">
                    {curso.contenidos.map((item) => {
                      const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.enlace;
                      const IconComp = cfg.icon;
                      return (
                        <div key={item.id} className={`flex items-start gap-3 p-4 rounded-xl border ${cfg.bg} ${cfg.border} shadow-sm`}>
                          <div className={`mt-0.5 flex-shrink-0 p-2 rounded-lg bg-white/80`}>
                            <IconComp size={16} className={cfg.color}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-sm font-bold text-[#001e33] truncate">{item.titulo}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${cfg.badge}`}>
                                {cfg.label}
                              </span>
                            </div>
                            {item.descripcion && <p className="text-xs text-slate-500 mb-1">{item.descripcion}</p>}

                            {/* URL / Enlace */}
                            {item.url && (
                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 hover:underline font-medium mt-1"
                              >
                                <ExternalLink size={12}/>
                                {item.url.length > 50 ? item.url.substring(0, 50) + '…' : item.url}
                              </a>
                            )}

                            {/* Archivo subido */}
                            {item.archivo_url && (
                              <div className="flex items-center gap-2 mt-2">
                                <a
                                  href={item.archivo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  download
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
                                >
                                  <Download size={12}/> Descargar archivo
                                </a>
                                <a
                                  href={item.archivo_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                  <ExternalLink size={12}/> Ver
                                </a>
                              </div>
                            )}

                            {/* Contenido texto */}
                            {item.contenido && item.tipo !== 'cuestionario' && (
                              <div className="mt-2 p-3 bg-white/80 rounded-lg border border-slate-100">
                                <p className="text-xs text-slate-600 whitespace-pre-wrap line-clamp-4">{item.contenido}</p>
                              </div>
                            )}

                            {item.contenido && item.tipo === 'cuestionario' && (
                              <div className="mt-2 p-3 bg-amber-50/60 rounded-lg border border-amber-100">
                                <p className="text-xs text-amber-800 whitespace-pre-wrap line-clamp-4">{item.contenido}</p>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleEliminarContenido(item.id)}
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

                {/* Formulario agregar contenido */}
                {showAddContenido === curso.id ? (
                  <AddContenidoForm
                    cursoId={curso.id}
                    onDone={handleContenidoAdded}
                    onCancel={() => setShowAddContenido(null)}
                  />
                ) : (
                  <button
                    onClick={() => setShowAddContenido(curso.id)}
                    className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50/50 transition-all"
                  >
                    <Plus size={14}/> Agregar Contenido al Curso
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Formulario para agregar contenido ─────────────────────────────────────────

function AddContenidoForm({ cursoId, onDone, onCancel }) {
  const [tipo, setTipo] = useState('documento');
  const [form, setForm] = useState({ titulo: '', descripcion: '', url: '', contenido: '' });
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const needsUrl = ['youtube', 'enlace'].includes(tipo);
  const needsFile = ['video', 'documento'].includes(tipo);
  const needsContenido = ['texto', 'cuestionario'].includes(tipo);

  const handleSubmit = async () => {
    if (!form.titulo.trim()) {
      alert('El título es obligatorio');
      return;
    }
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
          curso: cursoId,
          tipo,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          url: needsUrl ? form.url.trim() || null : null,
          contenido: needsContenido ? form.contenido.trim() || null : null,
        });
      }
      setForm({ titulo: '', descripcion: '', url: '', contenido: '' });
      setArchivo(null);
      onDone();
    } catch (err) {
      alert('Error al agregar contenido: ' + (err.message || 'Error desconocido'));
    } finally {
      setSaving(false);
    }
  };

  const currentCfg = TIPO_CONFIG[tipo];

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-purple-100 rounded-lg">
          <Plus size={14} className="text-purple-600"/>
        </div>
        <p className="text-xs font-bold text-purple-700 uppercase tracking-widest">Nuevo contenido</p>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const IconC = cfg.icon;
          return (
            <button
              key={key}
              onClick={() => setTipo(key)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                tipo === key
                  ? 'bg-[#001e33] text-white border-[#001e33] shadow-sm'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <IconC size={14} className={tipo === key ? 'text-white' : cfg.color}/>
              {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Campos del formulario */}
      <div className="space-y-3">
        <input
          autoFocus
          value={form.titulo}
          onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
          placeholder="Título del contenido *"
          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 font-semibold transition-all"
        />
        <input
          value={form.descripcion}
          onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          placeholder="Descripción (opcional)..."
          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all"
        />

        {/* URL para youtube/enlace */}
        {needsUrl && (
          <input
            value={form.url}
            onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
            placeholder={tipo === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 transition-all"
          />
        )}

        {/* Subida de archivo */}
        {needsFile && (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept={tipo === 'video' ? 'video/*' : '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar,application/*'}
              onChange={e => setArchivo(e.target.files[0])}
              className="hidden"
            />
            <button
              onClick={() => fileRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-xs font-semibold transition-all ${
                archivo
                  ? 'border-purple-400 text-purple-700 bg-purple-50'
                  : 'border-slate-200 text-slate-400 hover:border-purple-300 hover:text-purple-500'
              }`}
            >
              <Upload size={14}/>
              {archivo ? (
                <span className="flex items-center gap-2">
                  <FileText size={14}/> {archivo.name}
                  <span className="text-[10px] text-slate-400">({(archivo.size / 1024).toFixed(0)} KB)</span>
                </span>
              ) : (
                `Seleccionar ${tipo === 'video' ? 'video' : 'documento'}`
              )}
            </button>
            {archivo && (
              <button
                onClick={() => setArchivo(null)}
                className="text-[10px] text-red-500 hover:text-red-600 mt-1 font-medium"
              >
                Quitar archivo
              </button>
            )}
          </div>
        )}

        {/* Contenido texto */}
        {needsContenido && (
          <textarea
            value={form.contenido}
            onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
            placeholder={tipo === 'cuestionario' ? 'Escribe las preguntas del cuestionario...' : 'Escribe el contenido del artículo...'}
            rows={5}
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-50 resize-none transition-all"
          />
        )}
      </div>

      {/* Botones de acción */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={saving || !form.titulo.trim()}
          className="px-5 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2"
        >
          {saving ? <><Loader2 size={14} className="animate-spin"/> Guardando...</> : <><CheckCircle2 size={14}/> Agregar Contenido</>}
        </button>
        <button
          onClick={onCancel}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
