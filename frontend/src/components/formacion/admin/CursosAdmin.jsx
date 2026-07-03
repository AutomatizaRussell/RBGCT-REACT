import { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, Plus, ChevronLeft, ChevronDown, Trash2, Pencil, Video, FileText,
  Link, ClipboardList, Type, Upload, Check, PlayCircle, Bell,
  CheckCheck, Search, Users, Building2, Globe, X, Loader2,
  AlertCircle, Download, ExternalLink, ArrowLeft, BookMarked,
  GraduationCap, BarChart2, Layers, Calendar, CalendarOff, Clock, Award,
} from 'lucide-react';
import {
  getAllCursos, createCurso, updateCurso, deleteCurso,
  createCursoContenido, deleteCursoContenido,
  getNotificacionesCursos, marcarNotificacionCursoLeida,
  marcarTodasNotificacionesCursosLeidas,
  getAllAreas, getAllEmpleados, getAllCargos,
} from '../../../lib/api';
import CuestionarioBuilder from '../shared/CuestionarioBuilder';
import UsuariosFormacion from './UsuariosFormacion';
import OnboardingAdmin from './OnboardingAdmin';

// ── Paleta de gradientes RB rotativos para las tarjetas ──────────────────────
// Navy siempre como ancla — nunca dos colores brillantes juntos
const GRADIENTS = [
  'from-[#001871] to-[#981d97]',
  'from-[#001871] to-[#00bfb3]',
  'from-[#001871] to-[#ed8b00]',
  'from-[#981d97] to-[#001871]',
  'from-[#00bfb3] to-[#001871]',
];

const TIPO_CONFIG = {
  youtube:      { label: 'YouTube',    Icon: PlayCircle,    color: 'text-red-500',     bg: 'bg-red-50 border-red-200',     badge: 'bg-red-100 text-red-700' },
  video:        { label: 'Video',      Icon: Video,         color: 'text-purple-500',  bg: 'bg-purple-50 border-purple-200', badge: 'bg-purple-100 text-purple-700' },
  documento:    { label: 'Documento',  Icon: FileText,      color: 'text-blue-500',    bg: 'bg-blue-50 border-blue-200',    badge: 'bg-blue-100 text-blue-700' },
  texto:        { label: 'Texto',      Icon: Type,          color: 'text-slate-500',   bg: 'bg-slate-50 border-slate-200',  badge: 'bg-slate-100 text-slate-600' },
  enlace:       { label: 'Enlace',     Icon: Link,          color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-200', badge: 'bg-emerald-100 text-emerald-700' },
  cuestionario: { label: 'Cuestionario', Icon: ClipboardList, color: 'text-amber-500', bg: 'bg-amber-50 border-amber-200',  badge: 'bg-amber-100 text-amber-700' },
};

function contarPorTipo(contenidos = []) {
  return {
    videos:       contenidos.filter(c => ['youtube', 'video'].includes(c.tipo)).length,
    documentos:   contenidos.filter(c => c.tipo === 'documento').length,
    textos:       contenidos.filter(c => ['texto', 'enlace'].includes(c.tipo)).length,
    cuestionarios: contenidos.filter(c => c.tipo === 'cuestionario').length,
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function CursosAdmin() {
  const [cursos, setCursos]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [busqueda, setBusqueda]       = useState('');
  const [saving, setSaving]           = useState(false);
  const [areas, setAreas]             = useState([]);
  const [empleados, setEmpleados]     = useState([]);
  const [cargos, setCargos]           = useState([]);

  // Vista: 'grid' | 'detail'
  const [vista, setVista]             = useState('grid');
  const [cursoActivo, setCursoActivo] = useState(null);
  const [tabActivo, setTabActivo]     = useState('formacion'); // 'formacion' | 'onboarding' | 'usuarios'

  // Forms
  const [showNuevo, setShowNuevo]     = useState(false);
  const [nuevoCurso, setNuevoCurso]   = useState({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_ids: [], empleado_asignado_id: null, nivel_cargo: null, fecha_inicio: '', fecha_fin: '' });
  const [editingCurso, setEditingCurso] = useState(null);
  const [showAddContenido, setShowAddContenido] = useState(false);

  // Notificaciones
  const [notifs, setNotifs]           = useState([]);
  const [showNotif, setShowNotif]     = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cData, aData, eData, carData, nData] = await Promise.all([
        getAllCursos(1, 100),
        getAllAreas(),
        getAllEmpleados(),
        getAllCargos(),
        getNotificacionesCursos().catch(() => []),
      ]);
      const lista = Array.isArray(cData) ? cData : (cData?.results || []);
      setCursos(lista);
      setAreas(Array.isArray(aData) ? aData : []);
      setEmpleados(Array.isArray(eData) ? eData : []);
      setCargos(Array.isArray(carData) ? carData : (carData?.results || []));
      setNotifs(Array.isArray(nData) ? nData : []);
      if (cursoActivo) {
        const actualizado = lista.find(c => c.id === cursoActivo.id);
        if (actualizado) setCursoActivo(actualizado);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [cursoActivo?.id]);

  useEffect(() => { fetchAll(); }, []);

  // Estadísticas globales
  const totalItems      = cursos.reduce((a, c) => a + (c.total_contenidos || 0), 0);
  const totalQuizzes    = cursos.reduce((a, c) => a + contarPorTipo(c.contenidos || []).cuestionarios, 0);

  // Labels dinámicos derivados del tipo seleccionado en cada form
  const lN = getLT(nuevoCurso.tipo    || 'curso');   // labels para form "nuevo"
  const lE = getLT(editingCurso?.tipo || 'curso');   // labels para form "editar"
  const noLeidas        = notifs.filter(n => !n.leida).length;
  const cursosFiltrados = cursos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers
  const handleCrear = async () => {
    if (!nuevoCurso.nombre.trim()) return;
    setSaving(true);
    try {
      const payload = {
        ...nuevoCurso,
        fecha_inicio: nuevoCurso.fecha_inicio || null,
        fecha_fin: nuevoCurso.fecha_fin || null,
      };
      const created = await createCurso(payload);
      setNuevoCurso({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_ids: [], empleado_asignado_id: null, nivel_cargo: null, fecha_inicio: '', fecha_fin: '' });
      setShowNuevo(false);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEditar = async () => {
    if (!editingCurso?.nombre?.trim()) return;
    setSaving(true);
    try {
      await updateCurso(editingCurso.id, {
        nombre: editingCurso.nombre,
        descripcion: editingCurso.descripcion,
        visibilidad: editingCurso.visibilidad,
        area_ids: editingCurso.area_ids || [],
        empleado_asignado_id: editingCurso.empleado_asignado_id,
        nivel_cargo: editingCurso.nivel_cargo ?? null,
        fecha_inicio: editingCurso.fecha_inicio || null,
        fecha_fin: editingCurso.fecha_fin || null,
      });
      setEditingCurso(null);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id) => {
    const lbl = getLT(cursos.find(c => c.id === id)?.tipo || cursoActivo?.tipo || 'curso');
    if (!confirm(lbl.eliminarConfirm)) return;
    try {
      await deleteCurso(id);
      if (cursoActivo?.id === id) { setVista('grid'); setCursoActivo(null); }
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleEliminarContenido = async (contenidoId) => {
    if (!confirm('¿Eliminar este contenido?')) return;
    try {
      await deleteCursoContenido(contenidoId);
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const abrirDetalle = (curso) => { setCursoActivo(curso); setVista('detail'); setEditingCurso(null); setShowAddContenido(false); };
  const volverGrid   = () => { setVista('grid'); setCursoActivo(null); setEditingCurso(null); };

  const marcarLeida    = async (id) => { await marcarNotificacionCursoLeida(id); setNotifs(p => p.map(n => n.id === id ? { ...n, leida: true } : n)); };
  const marcarTodas    = async () => { await marcarTodasNotificacionesCursosLeidas(); setNotifs(p => p.map(n => ({ ...n, leida: true }))); };

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-28 gap-3">
      <Loader2 size={32} className="text-[#001871] animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Cargando cursos...</p>
    </div>
  );

  // ── Vista detalle de un curso ─────────────────────────────────────────────
  if (vista === 'detail' && cursoActivo) {
    const grad = GRADIENTS[cursoActivo.id % GRADIENTS.length];
    const contenidos = cursoActivo.contenidos || [];
    return (
      <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
        {/* Breadcrumb */}
        <button onClick={volverGrid}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#001871] uppercase tracking-widest transition-colors">
          <ArrowLeft size={14}/> Volver a cursos
        </button>

        {/* Header del curso */}
        {editingCurso?.id === cursoActivo.id ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
              <Pencil size={13}/> {getLT(editingCurso.tipo).editando}
            </p>
            <TipoSelector value={editingCurso.tipo || 'curso'} onChange={t => setEditingCurso(p => ({
              ...p, tipo: t,
              ...(t === 'capacitacion' && p.visibilidad === 'todos' ? { visibilidad: 'area', area_id: null } : {})
            }))} />
            <input autoFocus value={editingCurso.nombre}
              onChange={e => setEditingCurso(p => ({ ...p, nombre: e.target.value }))}
              placeholder={lE.nombrePH}
              className="w-full px-4 py-3 text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]"
            />
            <textarea value={editingCurso.descripcion}
              onChange={e => setEditingCurso(p => ({ ...p, descripcion: e.target.value }))}
              rows={2} placeholder="Descripción..."
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] resize-none"
            />
            <VisibilidadSelector value={editingCurso} onChange={setEditingCurso} areas={areas} empleados={empleados} tipo={editingCurso.tipo} />
            <PlazoSelector value={editingCurso} onChange={setEditingCurso} />
            <div className="flex gap-3">
              <button onClick={handleEditar} disabled={saving}
                className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditingCurso(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className={`bg-gradient-to-r ${grad} px-8 py-8`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center font-black text-3xl text-white border border-white/30">
                    {cursoActivo.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <TipoBadge tipo={cursoActivo.tipo} light />
                      <VisibilidadBadge visibilidad={cursoActivo.visibilidad}
                        nombresAreas={cursoActivo.nombres_areas} nombreEmpleado={cursoActivo.nombre_empleado}
                        nivelCargo={cursoActivo.nivel_cargo} light />
                    </div>
                    <h2 className="text-2xl font-black text-white mt-2">{cursoActivo.nombre}</h2>
                    {cursoActivo.descripcion && (
                      <p className="text-white/70 text-sm mt-1">{cursoActivo.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setEditingCurso({ tipo: cursoActivo.tipo || 'curso', id: cursoActivo.id, nombre: cursoActivo.nombre, descripcion: cursoActivo.descripcion || '', visibilidad: cursoActivo.visibilidad || 'todos', area_ids: cursoActivo.area_ids || [], empleado_asignado_id: cursoActivo.empleado_asignado_id || null, nivel_cargo: cursoActivo.nivel_cargo ?? null, fecha_inicio: cursoActivo.fecha_inicio || '', fecha_fin: cursoActivo.fecha_fin || '' })}
                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all" title="Editar">
                    <Pencil size={15}/>
                  </button>
                  <button onClick={() => handleEliminar(cursoActivo.id)}
                    className="p-2.5 bg-white/20 hover:bg-red-400/50 text-white rounded-xl transition-all" title="Eliminar">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
              {/* Chips de contenido */}
              {contenidos.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-5">
                  {(() => {
                    const c = contarPorTipo(contenidos);
                    return [
                      c.videos > 0 && <span key="v" className="flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold text-white"><PlayCircle size={11}/> {c.videos} video{c.videos > 1 ? 's' : ''}</span>,
                      c.documentos > 0 && <span key="d" className="flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold text-white"><FileText size={11}/> {c.documentos} doc{c.documentos > 1 ? 's' : ''}</span>,
                      c.textos > 0 && <span key="t" className="flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold text-white"><Type size={11}/> {c.textos} texto{c.textos > 1 ? 's' : ''}</span>,
                      c.cuestionarios > 0 && <span key="q" className="flex items-center gap-1.5 px-3 py-1 bg-white/15 rounded-full text-[11px] font-bold text-white"><ClipboardList size={11}/> {c.cuestionarios} quiz{c.cuestionarios > 1 ? 'zes' : ''}</span>,
                    ].filter(Boolean);
                  })()}
                </div>
              )}
            </div>

            {/* Lista de contenidos */}
            <div className="bg-white p-6 space-y-3">
              {contenidos.length === 0 ? (
                <div className="py-10 text-center">
                  <Layers size={28} className="mx-auto text-slate-200 mb-3"/>
                  <p className="text-sm text-slate-400 font-medium">Este curso no tiene contenido aún</p>
                  <p className="text-xs text-slate-300 mt-1">Agrega videos, documentos o cuestionarios</p>
                </div>
              ) : (
                contenidos.map(item => {
                  const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.enlace;
                  const { Icon } = cfg;
                  return (
                    <div key={item.id} className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.bg}`}>
                      <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                        <Icon size={16} className={cfg.color}/>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-bold text-[#001871] truncate">{item.titulo}</p>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cfg.badge}`}>{cfg.label}</span>
                        </div>
                        {item.descripcion && <p className="text-xs text-slate-500">{item.descripcion}</p>}
                        {item.tipo === 'youtube' && item.url
                          ? <YouTubeThumbnail url={item.url} titulo={item.titulo} />
                          : item.url && (
                            <a href={item.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1">
                              <ExternalLink size={11}/>
                              {item.url.length > 55 ? item.url.slice(0, 55) + '…' : item.url}
                            </a>
                          )
                        }
                        {item.archivo_url && (
                          <a href={item.archivo_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-[#001871] hover:underline mt-1">
                            <Download size={11}/> Descargar archivo
                          </a>
                        )}
                        {item.contenido && item.tipo === 'cuestionario' && (() => {
                          try {
                            const q = JSON.parse(item.contenido);
                            const total = q.preguntas?.length || 0;
                            return (
                              <p className="text-[11px] text-amber-700 mt-1 font-semibold">
                                {total} pregunta{total !== 1 ? 's' : ''} · Aprobación: {q.puntaje_aprobacion ?? 70}%
                                {item.max_intentos > 0 ? ` · ${item.max_intentos} intento${item.max_intentos > 1 ? 's' : ''} máx.` : ''}
                              </p>
                            );
                          } catch { return null; }
                        })()}
                        {item.contenido && item.tipo === 'texto' && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.contenido}</p>
                        )}
                      </div>
                      <button onClick={() => handleEliminarContenido(item.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex-shrink-0">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  );
                })
              )}

              {/* Agregar contenido */}
              {showAddContenido ? (
                <AddContenidoForm cursoId={cursoActivo.id}
                  onDone={() => { setShowAddContenido(false); fetchAll(); }}
                  onCancel={() => setShowAddContenido(false)}
                />
              ) : (
                <button onClick={() => setShowAddContenido(true)}
                  className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 hover:border-[#001871] hover:text-[#001871] hover:bg-blue-50/30 transition-all">
                  <Plus size={14}/> Agregar Contenido
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista grid principal ──────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Tabs Formación | Onboarding | Usuarios ── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
        {[
          { key: 'formacion',  label: 'Cursos y Capacitaciones', Icon: BookOpen },
          { key: 'onboarding', label: 'Onboarding',              Icon: ClipboardList },
          { key: 'usuarios',   label: 'Usuarios',                Icon: Users },
        ].map(({ key, label, Icon }) => (
          <button key={key} type="button"
            onClick={() => { setTabActivo(key); setVista('grid'); setCursoActivo(null); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              tabActivo === key
                ? 'bg-white text-[#001871] shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}>
            <Icon size={13}/> {label}
          </button>
        ))}
      </div>

      {/* Tab: Onboarding */}
      {tabActivo === 'onboarding' && (
        <OnboardingAdmin />
      )}

      {/* Tab: Usuarios */}
      {tabActivo === 'usuarios' && (
        <UsuariosFormacion />
      )}

      {/* Tab: Formación — contenido original */}
      {tabActivo === 'formacion' && (
      <div className="space-y-6">

      {/* Barra de acciones */}
      <div className="flex items-center justify-end gap-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Campana */}
          {(notifs.length > 0 || noLeidas > 0) && (
            <div className="relative">
              <button onClick={() => setShowNotif(v => !v)}
                className={`relative p-2.5 rounded-xl border transition-all ${noLeidas > 0 ? 'bg-amber-50 border-amber-200 text-amber-600 hover:bg-amber-100' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'}`}>
                <Bell size={16}/>
                {noLeidas > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">
                    {noLeidas > 9 ? '9+' : noLeidas}
                  </span>
                )}
              </button>
              {showNotif && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
                    <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Completados recientemente</p>
                    {noLeidas > 0 && (
                      <button onClick={marcarTodas} className="text-[10px] font-bold text-[#001871] flex items-center gap-1">
                        <CheckCheck size={11}/> Marcar todas
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                    {notifs.length === 0
                      ? <p className="text-xs text-slate-400 text-center py-6">Sin notificaciones</p>
                      : notifs.map(n => (
                        <div key={n.id} className={`px-4 py-3 text-xs transition-colors ${n.leida ? 'opacity-50' : 'bg-amber-50/40'}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-bold text-[#001871]">{n.nombre_empleado}</p>
                              <p className="text-slate-500 mt-0.5">completó <span className="font-semibold">{n.nombre_curso}</span></p>
                              <p className="text-slate-400 text-[10px] mt-1">{new Date(n.fecha).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                            </div>
                            {!n.leida && (
                              <button onClick={() => marcarLeida(n.id)} className="text-slate-300 hover:text-emerald-500 mt-0.5" title="Marcar leída">
                                <Check size={13}/>
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    }
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={() => { setShowNuevo(true); setNuevoCurso({ tipo: 'curso', nombre: '', descripcion: '', visibilidad: 'todos', area_ids: [], empleado_asignado_id: null, nivel_cargo: null, fecha_inicio: '', fecha_fin: '' }); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm">
            <Plus size={14}/> Nuevo Curso
          </button>
        </div>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Cursos',        value: cursos.length, Icon: BookOpen,      hex: '#001871' },
          { label: 'Contenidos',    value: totalItems,     Icon: Layers,        hex: '#00a9ce' },
          { label: 'Cuestionarios', value: totalQuizzes,   Icon: ClipboardList, hex: '#00bfb3' },
          { label: 'Notificaciones',value: noLeidas,       Icon: GraduationCap, hex: '#981d97' },
        ].map(({ label, value, Icon, hex }) => (
          <div key={label} className="bg-white rounded-2xl px-5 py-4 flex items-center gap-3 border border-slate-100 shadow-sm">
            <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: hex + '15' }}>
              <Icon size={16} style={{ color: hex }}/>
            </div>
            <div>
              <p className="text-xl font-black text-slate-800">{value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Buscador */}
      {cursos.length > 0 && (
        <div className="relative">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cursos por nombre o descripción..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#001871]/20 focus:border-[#001871] transition-all"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={14}/>
            </button>
          )}
        </div>
      )}

      {/* Form nuevo curso / capacitación */}
      {showNuevo && (
        <div className="bg-gradient-to-br from-blue-50 to-slate-50 border border-blue-100 rounded-2xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-[#001871] rounded-xl"><Plus size={14} className="text-white"/></div>
            <p className="text-sm font-bold text-[#001871]">{lN.nueva}</p>
          </div>
          <TipoSelector value={nuevoCurso.tipo || 'curso'} onChange={t => setNuevoCurso(p => ({
            ...p, tipo: t,
            // capacitación no puede ser "todos" — forzar a área
            ...(t === 'capacitacion' && p.visibilidad === 'todos' ? { visibilidad: 'area', area_id: null } : {})
          }))} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input autoFocus value={nuevoCurso.nombre}
              onChange={e => setNuevoCurso(p => ({ ...p, nombre: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && handleCrear()}
              placeholder={`Nombre de la ${lN.entidad} *`}
              className="px-4 py-3 text-sm font-semibold bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-blue-100 transition-all"
            />
            <input value={nuevoCurso.descripcion}
              onChange={e => setNuevoCurso(p => ({ ...p, descripcion: e.target.value }))}
              placeholder={lN.descPH}
              className="px-4 py-3 text-sm bg-white border border-blue-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all"
            />
          </div>
          <VisibilidadSelector value={nuevoCurso} onChange={setNuevoCurso} areas={areas} empleados={empleados} tipo={nuevoCurso.tipo} />
          <PlazoSelector value={nuevoCurso} onChange={setNuevoCurso} />
          <div className="flex gap-3">
            <button onClick={handleCrear} disabled={saving || !nuevoCurso.nombre.trim()}
              className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-2">
              {saving ? <><Loader2 size={13} className="animate-spin"/> Creando...</> : <><Check size={13}/> {lN.crear}</>}
            </button>
            <button onClick={() => setShowNuevo(false)}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all flex items-center gap-2">
              <X size={13}/> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Grid de tarjetas */}
      {cursosFiltrados.length === 0 ? (
        <EmptyState busqueda={busqueda} onNuevo={() => setShowNuevo(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cursosFiltrados.map((curso, idx) => (
            <CursoCard
              key={curso.id}
              curso={curso}
              gradient={GRADIENTS[idx % GRADIENTS.length]}
              onAbrir={() => abrirDetalle(curso)}
              onEditar={() => { abrirDetalle(curso); setEditingCurso({ tipo: curso.tipo || 'curso', id: curso.id, nombre: curso.nombre, descripcion: curso.descripcion || '', visibilidad: curso.visibilidad || 'todos', area_ids: curso.area_ids || [], empleado_asignado_id: curso.empleado_asignado_id || null, nivel_cargo: curso.nivel_cargo ?? null, fecha_inicio: curso.fecha_inicio || '', fecha_fin: curso.fecha_fin || '' }); }}
              onEliminar={() => handleEliminar(curso.id)}
            />
          ))}
        </div>
      )}

      </div>
      )}
    </div>
  );
}

// ── Tarjeta de curso ──────────────────────────────────────────────────────────

function CursoCard({ curso, gradient, onAbrir, onEditar, onEliminar }) {
  const contenidos = curso.contenidos || [];
  const tipos = contarPorTipo(contenidos);
  const inicial = curso.nombre.charAt(0).toUpperCase();

  return (
    <div className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col">
      {/* Header de color */}
      <div className={`bg-gradient-to-br ${gradient} p-5 relative`}>
        <div className="flex items-start justify-between">
          <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center font-black text-xl text-white border border-white/25 shadow-sm">
            {inicial}
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <TipoBadge tipo={curso.tipo} light />
            <VisibilidadBadge
              visibilidad={curso.visibilidad}
              nombresAreas={curso.nombres_areas}
              nombreEmpleado={curso.nombre_empleado}
              nivelCargo={curso.nivel_cargo}
              light
            />
          </div>
        </div>
        <div className="mt-4">
          <h3 className="font-black text-white text-base leading-snug line-clamp-2">{curso.nombre}</h3>
          {curso.descripcion && (
            <p className="text-white/65 text-[11px] mt-1 line-clamp-2 leading-relaxed">{curso.descripcion}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-4">
        {/* Chips de tipos de contenido */}
        <div className="flex flex-wrap gap-1.5 min-h-[24px]">
          {contenidos.length === 0 ? (
            <span className="text-[10px] text-slate-300 font-medium italic">Sin contenido aún</span>
          ) : (
            <>
              {tipos.videos > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-100 rounded-md text-[10px] font-bold text-red-600">
                  <PlayCircle size={9}/> {tipos.videos} video{tipos.videos > 1 ? 's' : ''}
                </span>
              )}
              {tipos.documentos > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[10px] font-bold text-blue-600">
                  <FileText size={9}/> {tipos.documentos} doc{tipos.documentos > 1 ? 's' : ''}
                </span>
              )}
              {tipos.textos > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded-md text-[10px] font-bold text-slate-500">
                  <Type size={9}/> {tipos.textos} texto{tipos.textos > 1 ? 's' : ''}
                </span>
              )}
              {tipos.cuestionarios > 0 && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md text-[10px] font-bold text-amber-600">
                  <ClipboardList size={9}/> {tipos.cuestionarios} quiz{tipos.cuestionarios > 1 ? 'zes' : ''}
                </span>
              )}
            </>
          )}
        </div>

        {/* Badge de plazo */}
        <PlazoBadge curso={curso} />

        {/* Total de items */}
        <div className="flex items-center gap-2 py-2 border-t border-slate-100">
          <Layers size={12} className="text-slate-300"/>
          <span className="text-[11px] text-slate-400 font-semibold">{curso.total_contenidos || 0} ítem{(curso.total_contenidos || 0) !== 1 ? 's' : ''} en total</span>
        </div>

        {/* Acciones */}
        <div className="flex gap-2 mt-auto">
          <button onClick={onAbrir}
            className="flex-1 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-all">
            Ver contenido
          </button>
          <button onClick={onEditar}
            className="p-2.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all" title="Editar">
            <Pencil size={14}/>
          </button>
          <button onClick={onEliminar}
            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 rounded-xl transition-all" title="Eliminar">
            <Trash2 size={14}/>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Estado vacío ──────────────────────────────────────────────────────────────

function EmptyState({ busqueda, onNuevo }) {
  return (
    <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
      <div className="w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-50 rounded-3xl flex items-center justify-center shadow-sm">
        <GraduationCap size={36} className="text-slate-300"/>
      </div>
      <div className="text-center">
        <p className="text-base font-bold text-slate-500">
          {busqueda ? 'Sin resultados para tu búsqueda' : 'Aún no hay cursos creados'}
        </p>
        <p className="text-sm text-slate-400 mt-1">
          {busqueda ? 'Intenta con otro término' : 'Crea el primer curso para empezar a capacitar al equipo'}
        </p>
      </div>
      {!busqueda && (
        <button onClick={onNuevo}
          className="flex items-center gap-2 px-6 py-3 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm">
          <Plus size={14}/> Crear primer curso
        </button>
      )}
    </div>
  );
}

// ── Labels dinámicos según tipo ──────────────────────────────────────────────

function getLT(tipo) {
  const cap = tipo === 'capacitacion';
  return {
    entidad:          cap ? 'capacitación'  : 'curso',
    Entidad:          cap ? 'Capacitación'  : 'Curso',
    nueva:            cap ? 'Nueva capacitación' : 'Nuevo curso',
    crear:            cap ? 'Crear capacitación' : 'Crear curso',
    editando:         cap ? 'Editando capacitación' : 'Editando curso',
    eliminarConfirm:  cap ? '¿Eliminar esta capacitación y todo su contenido? No se puede deshacer.'
                          : '¿Eliminar este curso y todo su contenido? No se puede deshacer.',
    nombrePH:         cap ? 'Ej: Uso del sistema ERP — módulo de facturación'
                          : 'Ej: Gestión de Proyectos con metodologías ágiles',
    descPH:           cap ? 'Procedimiento, herramienta o tarea específica a habilitar...'
                          : 'Describe los conceptos y conocimientos a desarrollar...',
    verán:            cap ? 'verán esta capacitación' : 'verán este curso',
  };
}

// ── Selector de tipo (Curso / Capacitación) ───────────────────────────────────

const TIPO_INFO = {
  curso: {
    label: 'Curso',
    desc: 'Formativo — amplía conocimientos sobre un tema',
    Icon: BookOpen,
    color: '#001871',
    bg: 'bg-[#001871]',
    bgLight: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-[#001871]',
  },
  capacitacion: {
    label: 'Capacitación',
    desc: 'Práctico — habilita para una función o herramienta',
    Icon: GraduationCap,
    color: '#00bfb3',
    bg: 'bg-[#00bfb3]',
    bgLight: 'bg-teal-50',
    border: 'border-teal-200',
    text: 'text-[#00bfb3]',
  },
};

function TipoSelector({ value, onChange }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Object.entries(TIPO_INFO).map(([key, info]) => {
        const { Icon } = info;
        const activo = value === key;
        return (
          <button key={key} type="button" onClick={() => onChange(key)}
            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all text-left ${
              activo
                ? `border-[${info.color}] bg-white shadow-sm`
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}>
            <div className={`p-1.5 rounded-lg flex-shrink-0 mt-0.5 ${activo ? info.bgLight : 'bg-slate-100'}`}>
              <Icon size={14} style={{ color: activo ? info.color : '#94a3b8' }}/>
            </div>
            <div>
              <p className={`text-xs font-bold ${activo ? info.text : 'text-slate-500'}`}>{info.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-snug">{info.desc}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function TipoBadge({ tipo, light = false }) {
  const info = TIPO_INFO[tipo] || TIPO_INFO.curso;
  const { Icon } = info;
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
      light
        ? 'bg-white/20 text-white border-white/25'
        : `${info.bgLight} border-[${info.color}]/20`
    }`}
      style={!light ? { color: info.color } : {}}>
      <Icon size={9}/> {info.label}
    </span>
  );
}

// ── Helpers de fecha ─────────────────────────────────────────────────────────

function fmtFecha(iso) {
  if (!iso) return null;
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function diasParaVencer(fechaFin) {
  if (!fechaFin) return null;
  const diff = Math.ceil((new Date(fechaFin + 'T23:59:59') - new Date()) / 86400000);
  return diff;
}

function getYoutubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YouTubeThumbnail({ url, titulo }) {
  const [abierto, setAbierto] = useState(false);
  const id = getYoutubeId(url);
  if (!id) return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-1">
      <ExternalLink size={11}/> Ver en YouTube
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

// ── Badge de plazo en tarjeta ────────────────────────────────────────────────

function PlazoBadge({ curso }) {
  const { fecha_inicio, fecha_fin, estado_disponibilidad } = curso;
  if (!fecha_inicio && !fecha_fin) return null;

  const estado = estado_disponibilidad || 'sin_plazo';
  const dias   = diasParaVencer(fecha_fin);

  if (estado === 'expirado') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600">
      <CalendarOff size={11}/> Expirado · {fmtFecha(fecha_fin)}
    </div>
  );
  if (estado === 'proximo') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-50 border border-amber-100 rounded-xl text-[10px] font-bold text-amber-600">
      <Clock size={11}/> Disponible el {fmtFecha(fecha_inicio)}
    </div>
  );
  // disponible con plazo
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-100 rounded-xl text-[10px] font-bold text-[#001871]">
      <Calendar size={11}/>
      {fecha_inicio && fecha_fin
        ? `${fmtFecha(fecha_inicio)} – ${fmtFecha(fecha_fin)}`
        : fecha_fin
          ? dias !== null && dias <= 7
            ? <span className="text-red-600">Vence en {dias} día{dias !== 1 ? 's' : ''}</span>
            : `Hasta ${fmtFecha(fecha_fin)}`
          : `Desde ${fmtFecha(fecha_inicio)}`
      }
    </div>
  );
}

// ── Selector de plazo ─────────────────────────────────────────────────────────

function PlazoSelector({ value, onChange }) {
  // Estado local para controlar si el usuario activó el modo plazo.
  // Se inicializa en true si el curso ya tiene fechas guardadas.
  const [activado, setActivado] = useState(!!(value.fecha_inicio || value.fecha_fin));

  const activar = () => setActivado(true);

  const desactivar = () => {
    setActivado(false);
    onChange(p => ({ ...p, fecha_inicio: '', fecha_fin: '' }));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Plazo de disponibilidad <span className="normal-case font-normal text-slate-300">— opcional</span>
        </p>
        {activado && (
          <button type="button" onClick={desactivar}
            className="text-[10px] font-bold text-red-400 hover:text-red-600 flex items-center gap-1 transition-colors">
            <CalendarOff size={10}/> Quitar plazo
          </button>
        )}
      </div>

      {!activado ? (
        <button type="button" onClick={activar}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-slate-200 rounded-xl text-[11px] font-bold text-slate-400 hover:border-[#001871] hover:text-[#001871] hover:bg-blue-50/30 transition-all">
          <Calendar size={14}/> Sin plazo — siempre disponible &nbsp;·&nbsp; clic para definir fechas
        </button>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Disponible desde</label>
            <input type="date"
              value={value.fecha_inicio || ''}
              onChange={e => onChange(p => ({ ...p, fecha_inicio: e.target.value || '' }))}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all"
            />
            <p className="text-[9px] text-slate-400 mt-1">Dejar vacío = disponible de inmediato</p>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 block mb-1">Disponible hasta</label>
            <input type="date"
              value={value.fecha_fin || ''}
              min={value.fecha_inicio || undefined}
              onChange={e => onChange(p => ({ ...p, fecha_fin: e.target.value || '' }))}
              className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all"
            />
            <p className="text-[9px] text-slate-400 mt-1">Dejar vacío = sin fecha límite</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Selector de visibilidad ───────────────────────────────────────────────────

// Niveles del organigrama (misma lógica que backend _nivel_cargo / _NIVEL_LABEL)
const NIVELES_CARGO = [
  { valor: 0, label: 'Socio',           color: '#001871' },
  { valor: 1, label: 'Gerente Asociado', color: '#981d97' },
  { valor: 2, label: 'Senior',           color: '#00bfb3' },
  { valor: 3, label: 'Líder de equipo',  color: '#ed8b00' },
  { valor: 4, label: 'Analista',         color: '#00a9ce' },
];

function nivelDeCargo(nombre = '') {
  const n = nombre.toUpperCase();
  if (n.includes('SOCIO'))                                   return 0;
  if (n.includes('GERENTE'))                                 return 1;
  if (n.includes('LÍDER') || n.includes('LIDER') || n.includes('SEMI')) return 3;
  if (n.includes('SENIOR'))                                  return 2;
  if (n.includes('ANALISTA') || n.includes('ASISTENTE'))    return 4;
  return 99;
}

function VisibilidadSelector({ value, onChange, areas, empleados, tipo = 'curso' }) {
  const esCapacitacion = tipo === 'capacitacion';
  const areaIdsSeleccionadas = value.area_ids || [];

  // Empleados que pertenecen a ALGUNA de las áreas seleccionadas
  const empleadosDeAreas = areaIdsSeleccionadas.length > 0
    ? empleados.filter(e => areaIdsSeleccionadas.includes(e.area_id))
    : empleados;

  const nivelesDeAreas = [...new Set(
    empleadosDeAreas.map(e => nivelDeCargo(e.nombre_cargo || '')).filter(n => n !== 99)
  )].sort();

  const isTodos   = value.visibilidad === 'todos';
  const isArea    = value.visibilidad === 'area';
  const isPersona = value.visibilidad === 'persona';
  const isCargo   = value.visibilidad === 'cargo';
  const enArea    = isArea || isPersona || isCargo;

  const elegirTodos = () => {
    onChange(p => ({ ...p, visibilidad: 'todos', area_ids: [], empleado_asignado_id: null, nivel_cargo: null }));
  };

  const activarArea = () => {
    onChange(p => ({ ...p, visibilidad: 'area', empleado_asignado_id: null, nivel_cargo: null }));
  };

  const toggleArea = (areaId) => {
    const numId = Number(areaId);
    const actuales = value.area_ids || [];
    const nuevas = actuales.includes(numId)
      ? actuales.filter(id => id !== numId)
      : [...actuales, numId];
    onChange(p => ({ ...p, area_ids: nuevas }));
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visibilidad</p>

      {/* Paso 1: Todos vs Por Área */}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={esCapacitacion ? undefined : elegirTodos}
          disabled={esCapacitacion}
          title={esCapacitacion ? 'Las capacitaciones deben asignarse a un grupo específico' : ''}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
            esCapacitacion ? 'bg-slate-50 border-slate-200 text-slate-300 cursor-not-allowed'
            : isTodos ? 'bg-[#001871] text-white border-[#001871] shadow-sm'
            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}>
          <Globe size={12}/> Todos
        </button>
        <button type="button" onClick={activarArea}
          className={`flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all ${
            enArea ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}>
          <Building2 size={12}/> Por Área
        </button>
      </div>
      {esCapacitacion && (
        <p className="text-[10px] text-[#ed8b00] font-semibold flex items-center gap-1.5">
          <AlertCircle size={11}/> Las capacitaciones requieren asignación específica
        </p>
      )}

      {/* Paso 2: Checkboxes de áreas (multi-selección) */}
      {enArea && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              Áreas {areaIdsSeleccionadas.length > 0 && (
                <span className="normal-case font-normal text-slate-400">— {areaIdsSeleccionadas.length} seleccionada{areaIdsSeleccionadas.length !== 1 ? 's' : ''}</span>
              )}
            </label>
            {areaIdsSeleccionadas.length > 0 && (
              <button type="button" onClick={() => onChange(p => ({ ...p, area_ids: [] }))}
                className="text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors">
                Limpiar
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto pr-1">
            {areas.map(a => {
              const sel = areaIdsSeleccionadas.includes(a.id_area);
              return (
                <button key={a.id_area} type="button" onClick={() => toggleArea(a.id_area)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border text-left transition-all ${
                    sel ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-600 hover:border-[#001871]/40'
                  }`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                    sel ? 'border-white bg-white' : 'border-slate-300'
                  }`}>
                    {sel && <span className="w-2 h-2 rounded-sm bg-[#001871]"/>}
                  </div>
                  <span className="truncate">{a.nombre_area}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Paso 3: Granularidad */}
      {enArea && areaIdsSeleccionadas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'area', empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              isArea ? 'bg-[#00bfb3] text-white border-[#00bfb3] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            <Users size={11}/> Todo el área
          </button>
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'cargo', empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              isCargo ? 'bg-[#ed8b00] text-white border-[#ed8b00] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            <GraduationCap size={11}/> Por Cargo
          </button>
          <button type="button"
            onClick={() => onChange(p => ({ ...p, visibilidad: 'persona', empleado_asignado_id: null, nivel_cargo: null }))}
            className={`flex items-center justify-center gap-1.5 px-2 py-2.5 rounded-xl text-xs font-bold border transition-all ${
              isPersona ? 'bg-[#981d97] text-white border-[#981d97] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}>
            <Users size={11}/> Persona
          </button>
        </div>
      )}

      {/* Rama Cargo */}
      {isCargo && areaIdsSeleccionadas.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nivel de cargo</p>
          <div className="flex flex-wrap gap-2">
            {NIVELES_CARGO.filter(n => nivelesDeAreas.length === 0 || nivelesDeAreas.includes(n.valor)).map(({ valor, label, color }) => {
              const activo = value.nivel_cargo === valor;
              return (
                <button key={valor} type="button"
                  onClick={() => onChange(p => ({ ...p, visibilidad: 'cargo', nivel_cargo: valor, empleado_asignado_id: null }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                    activo ? 'text-white shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                  style={activo ? { backgroundColor: color, borderColor: color } : {}}>
                  <Users size={11} style={{ color: activo ? 'white' : color }}/> {label}
                </button>
              );
            })}
          </div>
          {value.nivel_cargo !== null && value.nivel_cargo !== undefined && (
            <p className="text-[10px] text-[#001871] font-semibold flex items-center gap-1">
              <Users size={10}/>
              Solo {NIVELES_CARGO.find(n => n.valor === value.nivel_cargo)?.label} de las áreas seleccionadas {getLT(value.tipo || 'curso').verán}
            </p>
          )}
        </div>
      )}

      {/* Rama Persona */}
      {isPersona && (
        <div>
          <label className="text-[10px] font-bold text-slate-500 block mb-1">
            Persona <span className="font-normal text-slate-400">({empleadosDeAreas.length} en áreas seleccionadas)</span>
          </label>
          <select value={value.empleado_asignado_id || ''}
            onChange={e => onChange(p => ({ ...p, visibilidad: 'persona', nivel_cargo: null, empleado_asignado_id: e.target.value ? Number(e.target.value) : null }))}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all">
            <option value="">Seleccionar persona...</option>
            {empleadosDeAreas.map(e => (
              <option key={e.id_empleado} value={e.id_empleado}>
                {e.nombre_completo || `${e.primer_nombre} ${e.primer_apellido}`}
                {e.nombre_cargo ? ` · ${e.nombre_cargo}` : ''}
              </option>
            ))}
          </select>
          {empleadosDeAreas.length === 0 && (
            <p className="text-[10px] text-amber-500 font-semibold mt-1">Sin empleados en las áreas seleccionadas</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Badge de visibilidad ──────────────────────────────────────────────────────

function VisibilidadBadge({ visibilidad, nombresAreas, nombreEmpleado, nivelCargo, light = false }) {
  const base = light ? 'bg-white/20 text-white border-white/25' : '';
  if (visibilidad === 'area') {
    const etiqueta = nombresAreas?.length > 0
      ? nombresAreas.length === 1 ? nombresAreas[0] : `${nombresAreas.length} áreas`
      : 'Área';
    return (
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${light ? base : 'bg-blue-50 border-blue-100 text-blue-700'}`}>
        <Building2 size={9}/> {etiqueta}
      </span>
    );
  }
  if (visibilidad === 'persona') return (
    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${light ? base : 'bg-purple-50 border-purple-100 text-purple-700'}`}>
      <Users size={9}/> {nombreEmpleado || 'Persona'}
    </span>
  );
  if (visibilidad === 'cargo') {
    const nivel = NIVELES_CARGO.find(n => n.valor === nivelCargo);
    return (
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${light ? base : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
        <GraduationCap size={9}/> {nivel?.label || 'Por cargo'}
      </span>
    );
  }
  return (
    <span className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${light ? base : 'bg-emerald-50 border-emerald-100 text-emerald-700'}`}>
      <Globe size={9}/> Todos
    </span>
  );
}

// ── Formulario agregar contenido ──────────────────────────────────────────────

function AddContenidoForm({ cursoId, onDone, onCancel }) {
  const [tipo, setTipo] = useState('youtube');
  const [form, setForm] = useState({ titulo: '', descripcion: '', url: '', contenido: '', max_intentos: 3 });
  const [archivo, setArchivo] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef();

  const needsUrl     = ['youtube', 'enlace'].includes(tipo);
  const needsFile    = ['video', 'documento'].includes(tipo);
  const needsText    = tipo === 'texto';
  const needsBuilder = tipo === 'cuestionario';

  const handleSubmit = async () => {
    if (!form.titulo.trim()) { alert('El título es obligatorio'); return; }
    setSaving(true);
    try {
      if (needsFile && archivo) {
        const fd = new FormData();
        fd.append('curso', cursoId); fd.append('tipo', tipo);
        fd.append('titulo', form.titulo); fd.append('descripcion', form.descripcion);
        fd.append('archivo', archivo);
        await createCursoContenido(fd);
      } else {
        await createCursoContenido({
          curso: cursoId, tipo,
          titulo: form.titulo.trim(),
          descripcion: form.descripcion.trim(),
          url: needsUrl ? form.url.trim() || null : null,
          contenido: (needsText || needsBuilder) ? form.contenido || null : null,
          max_intentos: needsBuilder ? Number(form.max_intentos) || 0 : 0,
        });
      }
      onDone();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-[#001871] rounded-lg"><Plus size={13} className="text-white"/></div>
        <p className="text-xs font-bold text-[#001871] uppercase tracking-widest">Agregar contenido</p>
      </div>

      {/* Selector de tipo */}
      <div className="grid grid-cols-3 gap-1.5">
        {Object.entries(TIPO_CONFIG).map(([key, cfg]) => {
          const { Icon } = cfg;
          return (
            <button key={key} onClick={() => setTipo(key)}
              className={`flex items-center gap-1.5 px-2.5 py-2.5 rounded-xl text-[10px] font-bold border transition-all ${
                tipo === key ? 'bg-[#001871] text-white border-[#001871] shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
              }`}>
              <Icon size={12} className={tipo === key ? 'text-white' : cfg.color}/> {cfg.label}
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <input autoFocus value={form.titulo} onChange={e => setForm(p => ({ ...p, titulo: e.target.value }))}
          placeholder="Título *"
          className="w-full px-4 py-2.5 text-sm font-semibold bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all"
        />
        <input value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
          placeholder="Descripción (opcional)"
          className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all"
        />
        {needsUrl && (
          <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
            placeholder={tipo === 'youtube' ? 'https://youtube.com/watch?v=...' : 'https://...'}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all"
          />
        )}
        {needsFile && (
          <div>
            <input ref={fileRef} type="file" accept={tipo === 'video' ? 'video/*' : '*/*'}
              onChange={e => setArchivo(e.target.files[0])} className="hidden" />
            <button onClick={() => fileRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed rounded-xl text-xs font-semibold transition-all ${
                archivo ? 'border-[#001871] text-[#001871] bg-blue-50' : 'border-slate-200 text-slate-400 hover:border-[#001871]'
              }`}>
              <Upload size={13}/>
              {archivo ? archivo.name : `Seleccionar ${tipo === 'video' ? 'video' : 'documento'}`}
            </button>
          </div>
        )}
        {needsText && (
          <textarea value={form.contenido} onChange={e => setForm(p => ({ ...p, contenido: e.target.value }))}
            placeholder="Escribe el contenido aquí..." rows={4}
            className="w-full px-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] resize-none transition-all"
          />
        )}
        {needsBuilder && (
          <div className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl">
            <ClipboardList size={14} className="text-amber-500 flex-shrink-0"/>
            <label className="text-xs font-bold text-slate-600 flex-shrink-0">Intentos permitidos:</label>
            <input type="number" min={0} max={99} value={form.max_intentos}
              onChange={e => setForm(p => ({ ...p, max_intentos: e.target.value }))}
              className="w-16 px-2 py-1.5 text-sm font-bold text-center bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-400"
            />
            <span className="text-[10px] text-slate-400">(0 = sin límite)</span>
          </div>
        )}
        {needsBuilder && (
          <CuestionarioBuilder value={form.contenido} onChange={val => setForm(p => ({ ...p, contenido: val }))} />
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={saving || !form.titulo.trim()}
          className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all flex items-center gap-2">
          {saving ? <><Loader2 size={13} className="animate-spin"/> Guardando...</> : <><Check size={13}/> Agregar</>}
        </button>
        <button onClick={onCancel}
          className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
          Cancelar
        </button>
      </div>
    </div>
  );
}
