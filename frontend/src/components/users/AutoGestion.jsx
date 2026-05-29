import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, Clock, AlertCircle, FileText, RefreshCw,
  AlertTriangle, X, CalendarDays, Building2, ChevronRight,
  Send, Award
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getTareasByEmpleado, updateTareaEstado, crearSolicitudCert } from '../../lib/api';

// ── Modal de detalle de tarea ─────────────────────────────────────────────────

const TaskDetailModal = ({ tarea, onClose, onActualizar }) => {
  const [saving, setSaving] = useState(false);

  const estaVencida = tarea.estado !== 'completada' && tarea.fecha_vencimiento && new Date(tarea.fecha_vencimiento) < new Date();
  const formatFecha = (f) => f ? new Date(f).toLocaleDateString('es-CO', { dateStyle: 'long' }) : '—';

  const cambiar = async (nuevoEstado) => {
    if (tarea.estado === nuevoEstado) return;
    setSaving(true);
    await onActualizar(tarea.id, nuevoEstado);
    setSaving(false);
    onClose();
  };

  const ESTADOS = [
    { value: 'pendiente',  label: 'Pendiente',  active: 'bg-amber-500  text-white border-amber-500',  idle: 'bg-amber-50  border-amber-200  text-amber-700'  },
    { value: 'en_proceso', label: 'En Proceso', active: 'bg-blue-500   text-white border-blue-500',   idle: 'bg-blue-50   border-blue-200   text-blue-700'   },
    { value: 'completada', label: 'Completada', active: 'bg-emerald-500 text-white border-emerald-500', idle: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200 overflow-hidden">

        {/* Header */}
        <div className={`px-6 pt-6 pb-5 border-b ${estaVencida ? 'bg-red-50/60 border-red-100' : 'border-slate-100'}`}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg uppercase tracking-wider ${
                  tarea.prioridad === 'alta'  ? 'bg-red-100 text-red-600' :
                  tarea.prioridad === 'media' ? 'bg-amber-100 text-amber-600' :
                  'bg-blue-100 text-blue-600'
                }`}>{tarea.prioridad || 'normal'}</span>
                {estaVencida && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-lg bg-red-100 text-red-600 flex items-center gap-1">
                    <AlertTriangle size={10}/> Vencida
                  </span>
                )}
              </div>
              <h3 className="text-lg font-black text-[#001871] leading-snug">{tarea.titulo}</h3>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors flex-shrink-0 -mt-1">
              <X size={18} className="text-slate-400"/>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {tarea.descripcion && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Descripción</p>
              <p className="text-sm text-slate-600 leading-relaxed">{tarea.descripcion}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vencimiento</p>
              <p className={`text-xs font-bold flex items-center gap-1.5 ${estaVencida ? 'text-red-600' : 'text-[#001871]'}`}>
                <CalendarDays size={12}/> {formatFecha(tarea.fecha_vencimiento)}
              </p>
            </div>
            <div className="px-4 py-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Estado actual</p>
              <p className={`text-xs font-bold ${
                tarea.estado === 'completada' ? 'text-emerald-600' :
                tarea.estado === 'en_proceso' ? 'text-blue-600' : 'text-amber-600'
              }`}>
                {tarea.estado === 'completada' ? '✓ Completada' :
                 tarea.estado === 'en_proceso' ? '⟳ En Proceso' : '○ Pendiente'}
              </p>
            </div>
          </div>

          {tarea.nombre_area && (
            <div className="flex items-center gap-2 px-4 py-3 bg-slate-50 rounded-xl border border-slate-100 text-xs font-semibold text-slate-600">
              <Building2 size={13} className="text-slate-400"/> {tarea.nombre_area}
            </div>
          )}

          {/* Cambiar estado */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Cambiar estado</p>
            <div className="grid grid-cols-3 gap-2">
              {ESTADOS.map(e => (
                <button
                  key={e.value}
                  onClick={() => cambiar(e.value)}
                  disabled={saving || tarea.estado === e.value}
                  className={`py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all ${
                    tarea.estado === e.value ? e.active : e.idle + ' hover:opacity-80'
                  } disabled:cursor-default`}
                >
                  {saving && tarea.estado !== e.value ? '...' : e.label}
                </button>
              ))}
            </div>
          </div>

          {/* Botón grande completar */}
          {tarea.estado !== 'completada' && (
            <button
              onClick={() => cambiar('completada')}
              disabled={saving}
              className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              <CheckCircle2 size={18}/>
              {saving ? 'Guardando...' : 'Marcar como Completada'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Modal de solicitud de certificado ────────────────────────────────────────

const CertificadoModal = ({ empleadoData, onClose }) => {
  const [enviando, setEnviando] = useState(false);
  const [status, setStatus] = useState(null); // 'ok' | 'error'
  const formRef = useRef(null);

  const fmtFecha = (str) => str
    ? new Date(str + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setEnviando(true);
    setStatus(null);
    const fd = new FormData(formRef.current);
    try {
      await crearSolicitudCert({
        fecha:              fmtFecha(fd.get('fecha')),
        tipo_entidad:       fd.get('tipo_entidad') || '',
        nombre_entidad:     fd.get('nombre_entidad') || '',
        incluir_salario:    fd.get('incluir_salario') || 'Sí',
        auxilio_transporte: fd.get('auxilio_transporte') || 'No',
        asunto:             fd.get('asunto') || '',
        nombre_empleado:      empleadoData?.nombre_completo  || '',
        tipo_documento:       empleadoData?.tipo_documento   || '',
        numero_documento:     empleadoData?.numero_documento || '',
        nombre_cargo:         empleadoData?.nombre_cargo     || '',
        fecha_ingreso:        fmtFecha(empleadoData?.fecha_ingreso),
        correo_corporativo:   empleadoData?.correo_corporativo || '',
        id_empleado:          empleadoData?.id_empleado || '',
      });
      setStatus('ok');
    } catch {
      setStatus('error');
    } finally {
      setEnviando(false);
    }
  };

  const inputCls = "w-full text-sm border border-slate-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#001871]/20 focus:border-[#001871] text-[#001871] placeholder:text-slate-300 bg-white";
  const labelCls = "block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!enviando ? onClose : undefined}/>
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="bg-[#001871] px-6 pt-6 pb-5 rounded-t-3xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/10 rounded-xl">
                <Award size={20} className="text-white"/>
              </div>
              <div>
                <h3 className="text-base font-black text-white leading-tight">Solicitar Certificado de Empleo</h3>
                <p className="text-[11px] text-white/60 mt-0.5">RR.HH. recibirá tu solicitud para procesarla</p>
              </div>
            </div>
            {!enviando && (
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors flex-shrink-0 -mt-1">
                <X size={18} className="text-white/70"/>
              </button>
            )}
          </div>
        </div>

        {status === 'ok' ? (
          <div className="p-10 flex flex-col items-center gap-4 text-center">
            <div className="p-5 bg-emerald-50 rounded-2xl">
              <CheckCircle2 size={40} className="text-emerald-500"/>
            </div>
            <div>
              <h4 className="text-base font-black text-[#001871] mb-1">¡Solicitud enviada!</h4>
              <p className="text-sm text-slate-500">RR.HH. procesará tu certificado y lo enviará a tu correo corporativo.</p>
            </div>
            <button type="button" onClick={onClose} className="mt-2 px-6 py-2.5 bg-[#001871] text-white rounded-xl text-sm font-bold hover:bg-[#002a47] transition-colors">
              Cerrar
            </button>
          </div>
        ) : (
          <form ref={formRef} onSubmit={handleSubmit} className="p-6 space-y-3">

            <div>
              <label className={labelCls}>Tipo de entidad <span className="text-red-400">*</span></label>
              <select name="tipo_entidad" required className={inputCls}>
                <option value="">— Seleccionar —</option>
                <option value="Financiera">Financiera</option>
                <option value="Universitaria">Universitaria</option>
                <option value="Gobierno">Gobierno / Entidad Pública</option>
                <option value="Empresa">Empresa Privada</option>
                <option value="Salud">Salud / EPS</option>
                <option value="Otra">Otra</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Nombre de la entidad <span className="text-red-400">*</span></label>
              <input name="nombre_entidad" type="text" required placeholder="Ej: Bancolombia, Universidad de Antioquia..." className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>Fecha del certificado <span className="text-red-400">*</span></label>
              <input name="fecha" type="date" defaultValue={new Date().toISOString().split('T')[0]} required className={inputCls}/>
            </div>
            <div>
              <label className={labelCls}>¿Deseas incluir salario? <span className="text-red-400">*</span></label>
              <select name="incluir_salario" required className={inputCls}>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>¿Auxilio de transporte aplica? <span className="text-red-400">*</span></label>
              <select name="auxilio_transporte" required className={inputCls}>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Asunto <span className="text-red-400">*</span></label>
              <input name="asunto" type="text" required placeholder="Ej: Solicitud de crédito, trámite universitario..." className={inputCls}/>
            </div>

            {status === 'error' && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100 text-sm text-red-600">
                <AlertCircle size={15} className="flex-shrink-0"/>
                Error al enviar la solicitud. Intenta de nuevo.
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} disabled={enviando}
                className="flex-1 py-3 rounded-2xl border-2 border-slate-200 text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors disabled:opacity-50">
                Cancelar
              </button>
              <button type="submit" disabled={enviando}
                className="flex-1 py-3 bg-[#001871] text-white rounded-2xl text-sm font-bold hover:bg-[#002a47] transition-colors disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg">
                {enviando ? <RefreshCw size={15} className="animate-spin"/> : <Send size={15}/>}
                {enviando ? 'Enviando...' : 'Enviar Solicitud'}
              </button>
            </div>

          </form>
        )}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

const AutoGestion = () => {
  const { empleadoData } = useAuth();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showCertModal, setShowCertModal] = useState(false);

  useEffect(() => { fetchTareas(); }, [empleadoData?.id_empleado]);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      setError(null);
      if (!empleadoData?.id_empleado) {
        setError('No se encontró información del empleado');
        return;
      }
      const data = await getTareasByEmpleado(empleadoData.id_empleado);
      setTareas(Array.isArray(data) ? data : (data?.results || []));
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar tus tareas. Verifica tu conexión.');
    } finally {
      setLoading(false);
    }
  };

  const actualizarEstado = async (tareaId, nuevoEstado) => {
    try {
      setActualizando(tareaId);
      await updateTareaEstado(tareaId, nuevoEstado);
      setTareas(prev => prev.map(t => t.id === tareaId ? { ...t, estado: nuevoEstado } : t));
    } catch (err) {
      alert('Error al actualizar la tarea: ' + err.message);
    } finally {
      setActualizando(null);
    }
  };

  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '—';
    return new Date(fechaStr).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
  };

  const estaVencida = (fechaVencimiento, estado) => {
    if (estado === 'completada' || !fechaVencimiento) return false;
    return new Date(fechaVencimiento) < new Date();
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={24} className="text-indigo-600 animate-spin"/>
        <p className="text-sm text-slate-500">Cargando tus tareas...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <AlertCircle size={24} className="text-red-500"/>
        <p className="text-sm text-red-600 text-center">{error}</p>
        <button onClick={fetchTareas} className="text-xs font-bold text-indigo-600 uppercase hover:underline">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Certificado de empleo */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#001871]/5 rounded-xl">
              <Award size={18} className="text-[#001871]"/>
            </div>
            <div>
              <p className="text-sm font-bold text-[#001871]">Certificado de Empleo</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Solicita tu certificado; se envía a tu correo corporativo</p>
            </div>
          </div>
          <button
            onClick={() => setShowCertModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold hover:bg-[#002a47] transition-colors shadow-sm"
          >
            <FileText size={13}/> Solicitar
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-[#001871]">Mis Tareas Asignadas</h3>
          <p className="text-xs text-slate-500 mt-0.5">Haz clic en cualquier tarea para ver el detalle y cambiar su estado</p>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={fetchTareas} disabled={loading}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:text-indigo-600 uppercase transition-colors">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''}/> Actualizar
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-3 py-1 rounded-full">
            {tareas.length} tarea{tareas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Pendientes',  count: tareas.filter(t => t.estado === 'pendiente').length,   color: 'text-amber-600',   bg: 'bg-amber-50',   icon: <Clock size={16}/> },
          { label: 'En Proceso',  count: tareas.filter(t => t.estado === 'en_proceso').length,  color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <RefreshCw size={16}/> },
          { label: 'Completadas', count: tareas.filter(t => t.estado === 'completada').length,  color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle2 size={16}/> },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
              <p className={`text-2xl font-black ${s.color} leading-none`}>{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Lista */}
      {tareas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-14 shadow-sm text-center">
          <CheckCircle2 size={48} className="text-emerald-400 mx-auto mb-4"/>
          <h4 className="text-base font-bold text-[#001871] mb-1">¡Sin tareas pendientes!</h4>
          <p className="text-sm text-slate-400">El administrador aún no te ha asignado tareas.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tareas.map(tarea => {
            const vencida = estaVencida(tarea.fecha_vencimiento, tarea.estado);
            return (
              <div
                key={tarea.id}
                onClick={() => setSelectedTask(tarea)}
                className={`bg-white rounded-2xl border shadow-sm px-5 py-4 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all group ${
                  vencida ? 'border-red-100 bg-red-50/20 hover:bg-red-50/40' :
                  tarea.estado === 'completada' ? 'border-slate-100 opacity-70' :
                  'border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/10'
                }`}
              >
                {/* Icono estado */}
                <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                  tarea.estado === 'completada' ? 'bg-emerald-50 text-emerald-500' :
                  tarea.estado === 'en_proceso'  ? 'bg-blue-50 text-blue-500' :
                  'bg-amber-50 text-amber-500'
                }`}>
                  {tarea.estado === 'completada' ? <CheckCircle2 size={16}/> : <Clock size={16}/>}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${tarea.estado === 'completada' ? 'text-slate-400 line-through' : 'text-[#001871]'}`}>
                    {tarea.titulo}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    <span className={`text-[10px] font-bold uppercase ${
                      tarea.estado === 'completada' ? 'text-emerald-500' :
                      tarea.estado === 'en_proceso'  ? 'text-blue-500' : 'text-amber-500'
                    }`}>
                      {tarea.estado === 'completada' ? 'Completada' : tarea.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                    </span>
                    {tarea.prioridad && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        tarea.prioridad === 'alta' ? 'bg-red-50 text-red-500' :
                        tarea.prioridad === 'media' ? 'bg-amber-50 text-amber-500' :
                        'bg-blue-50 text-blue-500'
                      }`}>{tarea.prioridad}</span>
                    )}
                    {tarea.fecha_vencimiento && (
                      <span className={`text-[10px] font-medium flex items-center gap-1 ${vencida ? 'text-red-500 font-bold' : 'text-slate-400'}`}>
                        <CalendarDays size={10}/> {formatearFecha(tarea.fecha_vencimiento)}
                        {vencida && ' · Vencida'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick complete button */}
                {tarea.estado !== 'completada' && (
                  <button
                    onClick={e => { e.stopPropagation(); actualizarEstado(tarea.id, 'completada'); }}
                    disabled={actualizando === tarea.id}
                    title="Marcar como completada"
                    className="flex-shrink-0 p-2 text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    {actualizando === tarea.id
                      ? <RefreshCw size={16} className="animate-spin"/>
                      : <CheckCircle2 size={16}/>
                    }
                  </button>
                )}

                <ChevronRight size={14} className="text-slate-300 flex-shrink-0 group-hover:text-slate-400 transition-colors"/>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal detalle */}
      {selectedTask && (
        <TaskDetailModal
          tarea={tareas.find(t => t.id === selectedTask.id) || selectedTask}
          onClose={() => setSelectedTask(null)}
          onActualizar={actualizarEstado}
        />
      )}

      {/* Modal certificado */}
      {showCertModal && (
        <CertificadoModal
          empleadoData={empleadoData}
          onClose={() => setShowCertModal(false)}
        />
      )}
    </div>
  );
};

export default AutoGestion;
