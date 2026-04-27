import { useState, useEffect, useRef } from 'react';
import {
  BookMarked, Plus, ChevronDown, ChevronRight, Trash2, Pencil,
  Video, FileText, Link, ClipboardList, Type,
  Upload, X, Check, GripVertical, PlayCircle
} from 'lucide-react';
import {
  getAllCursos, createCurso, updateCurso, deleteCurso,
  createCursoContenido, deleteCursoContenido,
} from '../../lib/db';

const TIPO_CONFIG = {
  youtube:      { label: 'Video YouTube',   icon: <PlayCircle size={14} className="text-red-500"/>,    color: 'bg-red-50 border-red-100' },
  video:        { label: 'Video Propio',    icon: <Video size={14} className="text-purple-500"/>,   color: 'bg-purple-50 border-purple-100' },
  documento:    { label: 'Documento',       icon: <FileText size={14} className="text-blue-500"/>,  color: 'bg-blue-50 border-blue-100' },
  texto:        { label: 'Artículo/Texto',  icon: <Type size={14} className="text-slate-500"/>,     color: 'bg-slate-50 border-slate-100' },
  enlace:       { label: 'Enlace Externo',  icon: <Link size={14} className="text-emerald-500"/>,   color: 'bg-emerald-50 border-emerald-100' },
  cuestionario: { label: 'Cuestionario',    icon: <ClipboardList size={14} className="text-amber-500"/>, color: 'bg-amber-50 border-amber-100' },
};

export default function CursosSection() {
  const [cursos, setCursos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [showNuevoCurso, setShowNuevoCurso] = useState(false);
  const [nuevoCurso, setNuevoCurso] = useState({ nombre: '', descripcion: '' });
  const [editingCurso, setEditingCurso] = useState(null);
  const [showAddContenido, setShowAddContenido] = useState(null); // cursoId
  const [saving, setSaving] = useState(false);

  const fetchCursos = async () => {
    try {
      const data = await getAllCursos();
      setCursos(data);
    } catch (err) {
      console.error('Error cargando cursos:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCursos(); }, []);

  const handleCrearCurso = async () => {
    if (!nuevoCurso.nombre.trim()) return;
    setSaving(true);
    try {
      const created = await createCurso(nuevoCurso);
      setNuevoCurso({ nombre: '', descripcion: '' });
      setShowNuevoCurso(false);
      await fetchCursos();
      setExpandedId(created.id);
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleGuardarEditCurso = async () => {
    if (!editingCurso?.nombre?.trim()) return;
    setSaving(true);
    try {
      await updateCurso(editingCurso.id, { nombre: editingCurso.nombre, descripcion: editingCurso.descripcion });
      setEditingCurso(null);
      fetchCursos();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEliminarCurso = async (id) => {
    if (!confirm('¿Eliminar este curso y todo su contenido?')) return;
    try {
      await deleteCurso(id);
      if (expandedId === id) setExpandedId(null);
      fetchCursos();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleContenidoAdded = () => {
    setShowAddContenido(null);
    fetchCursos();
  };

  const handleEliminarContenido = async (contenidoId, cursoId) => {
    if (!confirm('¿Eliminar este contenido?')) return;
    try {
      await deleteCursoContenido(contenidoId);
      fetchCursos();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <div className="py-10 text-center text-sm text-slate-400 animate-pulse">Cargando cursos...</div>;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl"><BookMarked size={18} className="text-purple-600"/></div>
          <div>
            <h3 className="font-bold text-[#001e33]">Cursos</h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">{cursos.length} curso{cursos.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <button
          onClick={() => { setShowNuevoCurso(true); setEditingCurso(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
        >
          <Plus size={13}/> Nuevo Curso
        </button>
      </div>

      {/* Form nuevo curso */}
      {showNuevoCurso && (
        <div className="bg-purple-50/60 border border-purple-100 rounded-2xl p-5 space-y-3">
          <input
            autoFocus
            value={nuevoCurso.nombre}
            onChange={e => setNuevoCurso(p => ({ ...p, nombre: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && handleCrearCurso()}
            placeholder="Nombre del curso..."
            className="w-full px-4 py-2.5 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 font-semibold"
          />
          <textarea
            value={nuevoCurso.descripcion}
            onChange={e => setNuevoCurso(p => ({ ...p, descripcion: e.target.value }))}
            placeholder="Descripción (opcional)..."
            rows={2}
            className="w-full px-4 py-2.5 text-sm bg-white border border-purple-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none"
          />
          <div className="flex gap-2">
            <button onClick={handleCrearCurso} disabled={saving || !nuevoCurso.nombre.trim()}
              className="px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
              {saving ? 'Creando...' : 'Crear Curso'}
            </button>
            <button onClick={() => setShowNuevoCurso(false)}
              className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-50 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de cursos */}
      {cursos.length === 0 && !showNuevoCurso ? (
        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-12 text-center">
          <BookMarked size={28} className="mx-auto text-slate-300 mb-2"/>
          <p className="text-sm text-slate-400">No hay cursos creados. Haz clic en "Nuevo Curso".</p>
        </div>
      ) : (
        cursos.map(curso => (
          <div key={curso.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {/* Cabecera del curso */}
            {editingCurso?.id === curso.id ? (
              <div className="p-5 bg-amber-50/40 border-l-4 border-amber-400 space-y-3">
                <input
                  autoFocus
                  value={editingCurso.nombre}
                  onChange={e => setEditingCurso(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-4 py-2 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none focus:border-amber-400 font-semibold"
                />
                <textarea
                  value={editingCurso.descripcion}
                  onChange={e => setEditingCurso(p => ({ ...p, descripcion: e.target.value }))}
                  rows={2}
                  className="w-full px-4 py-2 text-sm bg-white border border-amber-200 rounded-xl focus:outline-none resize-none"
                />
                <div className="flex gap-2">
                  <button onClick={handleGuardarEditCurso} disabled={saving}
                    className="px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
                    Guardar
                  </button>
                  <button onClick={() => setEditingCurso(null)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex items-center gap-3 p-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                onClick={() => setExpandedId(expandedId === curso.id ? null : curso.id)}
              >
                <span className="text-slate-400 flex-shrink-0">
                  {expandedId === curso.id ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
                </span>
                <div className="w-9 h-9 bg-[#001e33] text-white rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0">
                  {curso.nombre.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#001e33] text-sm truncate">{curso.nombre}</p>
                  {curso.descripcion && <p className="text-[10px] text-slate-400 truncate">{curso.descripcion}</p>}
                </div>
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg flex-shrink-0">
                  {curso.total_contenidos} item{curso.total_contenidos !== 1 ? 's' : ''}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                  <button onClick={() => setEditingCurso({ id: curso.id, nombre: curso.nombre, descripcion: curso.descripcion || '' })}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                    <Pencil size={13}/>
                  </button>
                  <button onClick={() => handleEliminarCurso(curso.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            )}

            {/* Contenido del curso (expandido) */}
            {expandedId === curso.id && (
              <div className="border-t border-slate-50 bg-slate-50/50 p-4 space-y-3">
                {/* Items del curso */}
                {curso.contenidos && curso.contenidos.length > 0 ? (
                  <div className="space-y-2">
                    {curso.contenidos.map((item, idx) => {
                      const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.enlace;
                      return (
                        <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border ${cfg.color}`}>
                          <span className="mt-0.5 flex-shrink-0">{cfg.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#001e33] truncate">{item.titulo}</p>
                            {item.descripcion && <p className="text-[10px] text-slate-500 truncate">{item.descripcion}</p>}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                className="text-[10px] text-blue-500 hover:underline truncate block mt-0.5">
                                {item.url.length > 60 ? item.url.substring(0, 60) + '…' : item.url}
                              </a>
                            )}
                            {item.archivo_url && (
                              <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] text-purple-600 hover:underline mt-0.5">
                                <PlayCircle size={11}/> Ver archivo
                              </a>
                            )}
                            {item.contenido && item.tipo !== 'cuestionario' && (
                              <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.contenido}</p>
                            )}
                          </div>
                          <button onClick={() => handleEliminarContenido(item.id, curso.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 text-center py-3">Este curso no tiene contenido aún.</p>
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
                    className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-purple-300 hover:text-purple-500 transition-all"
                  >
                    <Plus size={13}/> Agregar Contenido
                  </button>
                )}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

// ── Formulario para agregar contenido a un curso ──────────────────────────────

function AddContenidoForm({ cursoId, onDone, onCancel }) {
  const [tipo, setTipo] = useState('youtube');
  const [form, setForm] = useState({ titulo: '', descripcion: '', url: '', contenido: '' });
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const needsUrl = ['youtube', 'enlace'].includes(tipo);
  const needsFile = ['video', 'documento'].includes(tipo);
  const needsContenido = ['texto', 'cuestionario'].includes(tipo);

  const handleSubmit = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    try {
      if (needsFile && archivo) {
        const fd = new FormData();
        fd.append('curso', cursoId);
        fd.append('tipo', tipo);
        fd.append('titulo', form.titulo);
        fd.append('descripcion', form.descripcion);
        fd.append('archivo', archivo);
        await createCursoContenido(fd);
      } else {
        await createCursoContenido({
          curso: cursoId,
          tipo,
          titulo: form.titulo,
          descripcion: form.descripcion,
          url: needsUrl ? form.url : null,
          contenido: needsContenido ? form.contenido : null,
        });
      }
      onDone();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-purple-100 rounded-2xl p-4 space-y-3">
      <p className="text-[10px] font-bold text-purple-600 uppercase tracking-widest">Nuevo contenido</p>

      {/* Tipo */}
      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setTipo(key)}
            className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-[10px] font-bold border transition-all ${
              tipo === key ? 'bg-[#001e33] text-white border-[#001e33]' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            {cfg.icon} {cfg.label}
          </button>
        ))}
      </div>

      <input
        autoFocus
        value={form.titulo}
        onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
        placeholder="Título..."
        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
      />
      <input
        value={form.descripcion}
        onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
        placeholder="Descripción (opcional)..."
        className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
      />

      {needsUrl && (
        <input
          value={form.url}
          onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
          placeholder={tipo === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400"
        />
      )}

      {needsFile && (
        <div>
          <input ref={fileRef} type="file"
            accept={tipo === 'video' ? 'video/*' : '*/*'}
            onChange={e => setArchivo(e.target.files[0])}
            className="hidden"
          />
          <button onClick={() => fileRef.current.click()}
            className={`w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed rounded-xl text-xs font-semibold transition-all ${
              archivo ? 'border-purple-400 text-purple-600 bg-purple-50' : 'border-slate-200 text-slate-400 hover:border-purple-300'
            }`}>
            <Upload size={13}/>
            {archivo ? archivo.name : `Seleccionar ${tipo === 'video' ? 'video' : 'documento'}`}
          </button>
        </div>
      )}

      {needsContenido && (
        <textarea
          value={form.contenido}
          onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
          placeholder={tipo === 'cuestionario' ? 'Escribe las preguntas del cuestionario...' : 'Contenido del artículo...'}
          rows={4}
          className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 resize-none"
        />
      )}

      <div className="flex gap-2 pt-1">
        <button onClick={handleSubmit} disabled={saving || !form.titulo.trim()}
          className="px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
          {saving ? 'Guardando...' : 'Agregar'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}
