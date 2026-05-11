import { useState, useEffect, useCallback } from 'react';
import {
  FileText, AlertTriangle, CheckCircle, Clock, XCircle,
  Plus, Search, ChevronRight, Upload, RefreshCw,
  User, Building2, Briefcase, Calendar, DollarSign,
  Shield, Edit3, Ban, RotateCcw, X, Save, Eye,
} from 'lucide-react';
import {
  getAllEmpleados,
  getContratoActivo,
  createContrato,
  updateContrato,
  terminarContrato,
  renovarContrato,
  getAfiliacionSS,
  createAfiliacionSS,
  updateAfiliacionSS,
  getEntidadesEPS,
  getEntidadesAFP,
  getEntidadesARL,
  getCajasCompensacion,
} from '../../lib/api';

// ── Utilidades ────────────────────────────────────────────────────────────────

const TIPO_CONTRATO = [
  { value: 'termino_fijo',         label: 'Término Fijo' },
  { value: 'termino_indefinido',   label: 'Término Indefinido' },
  { value: 'obra_labor',           label: 'Obra o Labor' },
  { value: 'prestacion_servicios', label: 'Prestación de Servicios' },
  { value: 'aprendizaje',          label: 'Aprendizaje' },
];
const TIPO_SALARIO   = [{ value: 'ordinario', label: 'Ordinario' }, { value: 'integral', label: 'Integral (≥10 SMLMV)' }];
const FORMA_PAGO     = [{ value: 'mensual', label: 'Mensual' }, { value: 'quincenal', label: 'Quincenal' }, { value: 'semanal', label: 'Semanal' }];
const JORNADA        = [{ value: 'completa', label: 'Jornada Completa' }, { value: 'medio_tiempo', label: 'Medio Tiempo' }, { value: 'flexible', label: 'Flexible' }, { value: 'por_horas', label: 'Por Horas' }];
const MODALIDAD      = [{ value: 'presencial', label: 'Presencial' }, { value: 'remoto', label: 'Remoto' }, { value: 'hibrido', label: 'Híbrido' }];
const MOTIVOS_TERM   = [
  { value: 'renuncia',            label: 'Renuncia Voluntaria' },
  { value: 'despido_justa_causa', label: 'Despido con Justa Causa' },
  { value: 'despido_sin_causa',   label: 'Despido sin Justa Causa' },
  { value: 'mutuo_acuerdo',       label: 'Mutuo Acuerdo' },
  { value: 'vencimiento',         label: 'Vencimiento del Término' },
  { value: 'obra_terminada',      label: 'Terminación de la Obra' },
];
const NIVEL_RIESGO   = ['I', 'II', 'III', 'IV', 'V'];

const diasParaVencer = (fechaFin) => {
  if (!fechaFin) return null;
  const diff = (new Date(fechaFin) - new Date()) / 86400000;
  return Math.ceil(diff);
};

const estadoBadge = (contrato) => {
  if (!contrato) return { label: 'Sin contrato', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={11} /> };
  const dias = diasParaVencer(contrato.fecha_fin);
  if (contrato.estado === 'ACTIVO' && dias !== null && dias <= 30 && dias > 0)
    return { label: `Vence en ${dias}d`, color: 'bg-amber-100 text-amber-700', icon: <Clock size={11} /> };
  if (contrato.estado === 'ACTIVO')   return { label: 'Activo',    color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle size={11} /> };
  if (contrato.estado === 'VENCIDO')  return { label: 'Vencido',   color: 'bg-amber-100 text-amber-700',    icon: <Clock size={11} /> };
  if (contrato.estado === 'TERMINADO')return { label: 'Terminado', color: 'bg-slate-100 text-slate-500',     icon: <XCircle size={11} /> };
  if (contrato.estado === 'SUSPENDIDO')return { label:'Suspendido',color: 'bg-orange-100 text-orange-700',  icon: <Ban size={11} /> };
  return { label: contrato.estado, color: 'bg-slate-100 text-slate-500', icon: null };
};

// ── Sub-componentes de formulario ─────────────────────────────────────────────

const Field = ({ label, children, required }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
      {label}{required && <span className="text-red-400 ml-1">*</span>}
    </label>
    {children}
  </div>
);

const Input = (props) => (
  <input {...props} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white" />
);

const Select = ({ children, ...props }) => (
  <select {...props} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white">
    {children}
  </select>
);

const Textarea = (props) => (
  <textarea {...props} rows={3} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white resize-none" />
);

// ── Formulario de Contrato ────────────────────────────────────────────────────

const ContratoForm = ({ empleado, contrato, mode, onSaved, onCancel }) => {
  const isEdit  = mode === 'editar';
  const isRenew = mode === 'renovar';
  const isTerm  = mode === 'terminar';

  const [form, setForm] = useState(() => {
    if (isRenew) return { fecha_renovacion: '', nueva_fecha_fin: '', nuevo_salario: '', observaciones: '' };
    if (isTerm)  return { motivo_terminacion: '', fecha_terminacion: '', observaciones: '' };
    return {
      empleado: empleado.id_empleado,
      tipo_contrato: contrato?.tipo_contrato || 'termino_indefinido',
      fecha_inicio: contrato?.fecha_inicio || '',
      fecha_fin: contrato?.fecha_fin || '',
      periodo_prueba_dias: contrato?.periodo_prueba_dias ?? 60,
      salario: contrato?.salario || '',
      tipo_salario: contrato?.tipo_salario || 'ordinario',
      auxilio_transporte: contrato?.auxilio_transporte ?? true,
      forma_pago: contrato?.forma_pago || 'mensual',
      jornada: contrato?.jornada || 'completa',
      modalidad: contrato?.modalidad || 'presencial',
      lugar_trabajo: contrato?.lugar_trabajo || '',
      fecha_firma: contrato?.fecha_firma || '',
      observaciones: contrato?.observaciones || '',
      pdf_contrato: null,
    };
  });

  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (isRenew) {
        await renovarContrato(contrato.id, form);
      } else if (isTerm) {
        await terminarContrato(contrato.id, form);
      } else if (isEdit) {
        await updateContrato(contrato.id, form);
      } else {
        await createContrato(form);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (isTerm) return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
        Vas a terminar el contrato de <strong>{empleado.nombre_completo}</strong>. Esta acción no se puede deshacer.
      </div>
      <Field label="Motivo" required>
        <Select value={form.motivo_terminacion} onChange={e => set('motivo_terminacion', e.target.value)} required>
          <option value="">Selecciona motivo...</option>
          {MOTIVOS_TERM.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      <Field label="Fecha de terminación" required>
        <Input type="date" value={form.fecha_terminacion} onChange={e => set('fecha_terminacion', e.target.value)} required />
      </Field>
      <Field label="Observaciones">
        <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Detalles adicionales..." />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:opacity-50">
          {saving ? 'Terminando...' : 'Terminar contrato'}
        </button>
      </div>
    </form>
  );

  if (isRenew) return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
        Renovación del contrato de <strong>{empleado.nombre_completo}</strong>.
      </div>
      <Field label="Fecha de renovación" required>
        <Input type="date" value={form.fecha_renovacion} onChange={e => set('fecha_renovacion', e.target.value)} required />
      </Field>
      <Field label="Nueva fecha de vencimiento">
        <Input type="date" value={form.nueva_fecha_fin} onChange={e => set('nueva_fecha_fin', e.target.value)} />
      </Field>
      <Field label="Nuevo salario (si cambia)">
        <Input type="number" value={form.nuevo_salario} onChange={e => set('nuevo_salario', e.target.value)} placeholder="Dejar vacío si no cambia" />
      </Field>
      <Field label="PDF de renovación">
        <input type="file" accept=".pdf" onChange={e => set('pdf_renovacion', e.target.files[0])} className="text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
      </Field>
      <Field label="Observaciones">
        <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} />
      </Field>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Confirmar renovación'}
        </button>
      </div>
    </form>
  );

  const needsFechaFin = ['termino_fijo', 'obra_labor', 'prestacion_servicios', 'aprendizaje'].includes(form.tipo_contrato);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo de contrato" required>
          <Select value={form.tipo_contrato} onChange={e => set('tipo_contrato', e.target.value)} required>
            {TIPO_CONTRATO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Fecha de inicio" required>
          <Input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} required />
        </Field>
        {needsFechaFin && (
          <Field label="Fecha de vencimiento" required>
            <Input type="date" value={form.fecha_fin} onChange={e => set('fecha_fin', e.target.value)} required={needsFechaFin} />
          </Field>
        )}
        <Field label="Período de prueba (días)">
          <Input type="number" value={form.periodo_prueba_dias} onChange={e => set('periodo_prueba_dias', e.target.value)} min={0} max={60} />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
        <Field label="Salario" required>
          <Input type="number" value={form.salario} onChange={e => set('salario', e.target.value)} placeholder="Ej: 1800000" required />
        </Field>
        <Field label="Tipo de salario">
          <Select value={form.tipo_salario} onChange={e => set('tipo_salario', e.target.value)}>
            {TIPO_SALARIO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </Field>
        <Field label="Forma de pago">
          <Select value={form.forma_pago} onChange={e => set('forma_pago', e.target.value)}>
            {FORMA_PAGO.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
          </Select>
        </Field>
        <Field label="Auxilio de transporte">
          <Select value={form.auxilio_transporte ? 'true' : 'false'} onChange={e => set('auxilio_transporte', e.target.value === 'true')}>
            <option value="true">Sí aplica</option>
            <option value="false">No aplica (integral o &gt;2 SMLMV)</option>
          </Select>
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-4 grid grid-cols-2 gap-3">
        <Field label="Jornada">
          <Select value={form.jornada} onChange={e => set('jornada', e.target.value)}>
            {JORNADA.map(j => <option key={j.value} value={j.value}>{j.label}</option>)}
          </Select>
        </Field>
        <Field label="Modalidad">
          <Select value={form.modalidad} onChange={e => set('modalidad', e.target.value)}>
            {MODALIDAD.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </Select>
        </Field>
        <Field label="Lugar de trabajo" className="col-span-2">
          <Input value={form.lugar_trabajo} onChange={e => set('lugar_trabajo', e.target.value)} placeholder="Ciudad / Dirección" />
        </Field>
        <Field label="Fecha de firma">
          <Input type="date" value={form.fecha_firma} onChange={e => set('fecha_firma', e.target.value)} />
        </Field>
      </div>

      <div className="border-t border-slate-100 pt-4 space-y-3">
        <Field label="PDF del contrato firmado">
          <input type="file" accept=".pdf" onChange={e => set('pdf_contrato', e.target.files[0])}
            className="text-sm text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 w-full" />
          {contrato?.pdf_url && (
            <a href={contrato.pdf_url} target="_blank" rel="noreferrer" className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
              <Eye size={12} /> Ver contrato actual
            </a>
          )}
        </Field>
        <Field label="Observaciones">
          <Textarea value={form.observaciones} onChange={e => set('observaciones', e.target.value)} placeholder="Cláusulas adicionales, notas..." />
        </Field>
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
      <div className="flex gap-2 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
        <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-[#001e33] text-white rounded-lg text-sm font-semibold hover:bg-[#002d4d] disabled:opacity-50 flex items-center justify-center gap-2">
          <Save size={14} />{saving ? 'Guardando...' : isEdit ? 'Actualizar contrato' : 'Crear contrato'}
        </button>
      </div>
    </form>
  );
};

// ── Formulario de Seguridad Social ────────────────────────────────────────────

const SeguridadSocialForm = ({ empleado, afiliacion, onSaved }) => {
  const [eps,   setEps]   = useState([]);
  const [afp,   setAfp]   = useState([]);
  const [arl,   setArl]   = useState([]);
  const [cajas, setCajas] = useState([]);
  const [form, setForm]   = useState({
    empleado: empleado.id_empleado,
    eps: afiliacion?.eps || '',
    numero_afiliacion_eps: afiliacion?.numero_afiliacion_eps || '',
    fecha_afiliacion_eps: afiliacion?.fecha_afiliacion_eps || '',
    afp: afiliacion?.afp || '',
    numero_afiliacion_afp: afiliacion?.numero_afiliacion_afp || '',
    fecha_afiliacion_afp: afiliacion?.fecha_afiliacion_afp || '',
    arl: afiliacion?.arl || '',
    nivel_riesgo_arl: afiliacion?.nivel_riesgo_arl || '',
    numero_poliza_arl: afiliacion?.numero_poliza_arl || '',
    fecha_afiliacion_arl: afiliacion?.fecha_afiliacion_arl || '',
    caja_compensacion: afiliacion?.caja_compensacion || '',
    numero_afiliacion_caja: afiliacion?.numero_afiliacion_caja || '',
    fecha_afiliacion_caja: afiliacion?.fecha_afiliacion_caja || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  useEffect(() => {
    Promise.all([getEntidadesEPS(), getEntidadesAFP(), getEntidadesARL(), getCajasCompensacion()])
      .then(([e, a, r, c]) => { setEps(e); setAfp(a); setArl(r); setCajas(c); })
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      if (afiliacion?.id) await updateAfiliacionSS(afiliacion.id, form);
      else                 await createAfiliacionSS(form);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const SectionTitle = ({ label }) => (
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-3 pb-1 border-t border-slate-100">{label}</p>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <SectionTitle label="EPS — Salud" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="EPS">
          <Select value={form.eps} onChange={e => set('eps', e.target.value)}>
            <option value="">Seleccionar...</option>
            {eps.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </Select>
        </Field>
        <Field label="N° afiliación">
          <Input value={form.numero_afiliacion_eps} onChange={e => set('numero_afiliacion_eps', e.target.value)} placeholder="Número de carnet / afiliación" />
        </Field>
        <Field label="Fecha afiliación">
          <Input type="date" value={form.fecha_afiliacion_eps} onChange={e => set('fecha_afiliacion_eps', e.target.value)} />
        </Field>
      </div>

      <SectionTitle label="AFP — Pensión" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="AFP">
          <Select value={form.afp} onChange={e => set('afp', e.target.value)}>
            <option value="">Seleccionar...</option>
            {afp.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="N° afiliación">
          <Input value={form.numero_afiliacion_afp} onChange={e => set('numero_afiliacion_afp', e.target.value)} placeholder="Número de cuenta pensión" />
        </Field>
        <Field label="Fecha afiliación">
          <Input type="date" value={form.fecha_afiliacion_afp} onChange={e => set('fecha_afiliacion_afp', e.target.value)} />
        </Field>
      </div>

      <SectionTitle label="ARL — Riesgos Laborales" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="ARL">
          <Select value={form.arl} onChange={e => set('arl', e.target.value)}>
            <option value="">Seleccionar...</option>
            {arl.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </Select>
        </Field>
        <Field label="Nivel de riesgo">
          <Select value={form.nivel_riesgo_arl} onChange={e => set('nivel_riesgo_arl', e.target.value)}>
            <option value="">Seleccionar...</option>
            {NIVEL_RIESGO.map(n => <option key={n} value={n}>Nivel {n}</option>)}
          </Select>
        </Field>
        <Field label="N° póliza">
          <Input value={form.numero_poliza_arl} onChange={e => set('numero_poliza_arl', e.target.value)} placeholder="Número de póliza ARL" />
        </Field>
        <Field label="Fecha afiliación">
          <Input type="date" value={form.fecha_afiliacion_arl} onChange={e => set('fecha_afiliacion_arl', e.target.value)} />
        </Field>
      </div>

      <SectionTitle label="Caja de Compensación Familiar" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Caja">
          <Select value={form.caja_compensacion} onChange={e => set('caja_compensacion', e.target.value)}>
            <option value="">Seleccionar...</option>
            {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </Select>
        </Field>
        <Field label="N° afiliación">
          <Input value={form.numero_afiliacion_caja} onChange={e => set('numero_afiliacion_caja', e.target.value)} placeholder="Número de afiliación caja" />
        </Field>
        <Field label="Fecha afiliación">
          <Input type="date" value={form.fecha_afiliacion_caja} onChange={e => set('fecha_afiliacion_caja', e.target.value)} />
        </Field>
      </div>

      {error && <p className="text-red-500 text-xs bg-red-50 p-2 rounded-lg">{error}</p>}
      <button type="submit" disabled={saving} className="w-full py-2.5 bg-[#001e33] text-white rounded-lg text-sm font-semibold hover:bg-[#002d4d] disabled:opacity-50 flex items-center justify-center gap-2 mt-4">
        <Save size={14} />{saving ? 'Guardando...' : afiliacion ? 'Actualizar afiliaciones' : 'Guardar afiliaciones'}
      </button>
    </form>
  );
};

// ── Panel de detalle del empleado ─────────────────────────────────────────────

const EmpleadoPanel = ({ empleado, onClose, onRefresh }) => {
  const [tab, setTab]           = useState('contrato');
  const [contrato, setContrato] = useState(undefined);
  const [afiliacion, setAfiliacion] = useState(null);
  const [mode, setMode]         = useState('ver'); // ver | crear | editar | renovar | terminar
  const [loading, setLoading]   = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, ss] = await Promise.all([
        getContratoActivo(empleado.id_empleado).catch(() => null),
        getAfiliacionSS(empleado.id_empleado).catch(() => null),
      ]);
      setContrato(c);
      setAfiliacion(ss);
      setMode(c ? 'ver' : 'crear');
    } finally {
      setLoading(false);
    }
  }, [empleado.id_empleado]);

  useEffect(() => { load(); }, [load]);

  const handleSaved = () => { load(); onRefresh(); setMode('ver'); };

  const badge = estadoBadge(contrato);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between p-5 border-b border-slate-100">
        <div>
          <p className="font-bold text-slate-800 text-base">{empleado.nombre_completo}</p>
          <p className="text-xs text-slate-400 mt-0.5">{empleado.nombre_cargo || 'Sin cargo'} · {empleado.nombre_area || 'Sin área'}</p>
          <span className={`mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
            {badge.icon}{badge.label}
          </span>
        </div>
        <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400"><X size={16} /></button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-5 gap-4">
        {[{ k: 'contrato', label: 'Contrato', icon: <FileText size={13} /> },
          { k: 'ss', label: 'Seguridad Social', icon: <Shield size={13} /> }
        ].map(t => (
          <button key={t.k} onClick={() => { setTab(t.k); setMode('ver'); }}
            className={`flex items-center gap-1.5 py-3 text-xs font-semibold border-b-2 transition-colors ${tab === t.k ? 'border-[#001e33] text-[#001e33]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Cargando...</div>
        ) : tab === 'contrato' ? (
          <>
            {mode === 'ver' && contrato && (
              <div className="space-y-4">
                {/* Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => setMode('editar')} className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50">
                    <Edit3 size={12} /> Editar
                  </button>
                  {['termino_fijo', 'obra_labor'].includes(contrato.tipo_contrato) && (
                    <button onClick={() => setMode('renovar')} className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 bg-blue-50 rounded-lg text-xs font-semibold text-blue-700 hover:bg-blue-100">
                      <RotateCcw size={12} /> Renovar
                    </button>
                  )}
                  <button onClick={() => setMode('terminar')} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 bg-red-50 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-100">
                    <Ban size={12} /> Terminar
                  </button>
                </div>

                {/* Datos del contrato */}
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  {[
                    ['Tipo',          contrato.tipo_contrato_display],
                    ['Fecha inicio',  contrato.fecha_inicio],
                    ['Fecha fin',     contrato.fecha_fin || 'Indefinido'],
                    ['Salario',       `$${Number(contrato.salario).toLocaleString('es-CO')}`],
                    ['Tipo salario',  contrato.tipo_salario === 'integral' ? 'Integral' : 'Ordinario'],
                    ['Auxilio transp',contrato.auxilio_transporte ? 'Sí' : 'No'],
                    ['Jornada',       contrato.jornada],
                    ['Modalidad',     contrato.modalidad],
                    ['Lugar trabajo', contrato.lugar_trabajo || '—'],
                    ['Período prueba',`${contrato.periodo_prueba_dias} días`],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between text-sm">
                      <span className="text-slate-500 text-xs">{k}</span>
                      <span className="font-medium text-slate-800 text-xs text-right">{v}</span>
                    </div>
                  ))}
                </div>

                {contrato.pdf_url && (
                  <a href={contrato.pdf_url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700 hover:bg-blue-100 transition-colors">
                    <FileText size={14} /> Ver PDF del contrato
                  </a>
                )}

                {contrato.renovaciones?.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Renovaciones</p>
                    {contrato.renovaciones.map(r => (
                      <div key={r.id} className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 mb-2">
                        <span className="font-semibold">{r.fecha_renovacion}</span>
                        {r.nueva_fecha_fin && <span className="ml-2">→ Vence: {r.nueva_fecha_fin}</span>}
                        {r.nuevo_salario && <span className="ml-2">| Salario: ${Number(r.nuevo_salario).toLocaleString('es-CO')}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {mode === 'crear' && (
              <ContratoForm empleado={empleado} contrato={null} mode="crear" onSaved={handleSaved} onCancel={() => setMode('ver')} />
            )}
            {mode === 'editar' && (
              <ContratoForm empleado={empleado} contrato={contrato} mode="editar" onSaved={handleSaved} onCancel={() => setMode('ver')} />
            )}
            {mode === 'renovar' && (
              <ContratoForm empleado={empleado} contrato={contrato} mode="renovar" onSaved={handleSaved} onCancel={() => setMode('ver')} />
            )}
            {mode === 'terminar' && (
              <ContratoForm empleado={empleado} contrato={contrato} mode="terminar" onSaved={handleSaved} onCancel={() => setMode('ver')} />
            )}

            {mode === 'ver' && !contrato && (
              <div className="text-center py-10">
                <FileText size={36} className="mx-auto text-slate-200 mb-3" />
                <p className="text-slate-400 text-sm mb-4">Este empleado no tiene contrato activo</p>
                <button onClick={() => setMode('crear')} className="px-5 py-2 bg-[#001e33] text-white rounded-lg text-sm font-semibold hover:bg-[#002d4d] flex items-center gap-2 mx-auto">
                  <Plus size={14} /> Crear contrato
                </button>
              </div>
            )}
          </>
        ) : (
          /* Seguridad Social */
          <SeguridadSocialForm empleado={empleado} afiliacion={afiliacion} onSaved={() => { load(); onRefresh(); }} />
        )}
      </div>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────

export default function ContratosSection() {
  const [empleados,     setEmpleados]     = useState([]);
  const [contratos,     setContratos]     = useState({});   // { empleadoId: contrato|null }
  const [selected,      setSelected]      = useState(null);
  const [search,        setSearch]        = useState('');
  const [filtro,        setFiltro]        = useState('todos'); // todos|sin_contrato|por_vencer|activos
  const [loading,       setLoading]       = useState(true);
  const [loadingContr,  setLoadingContr]  = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const emps = await getAllEmpleados();
      const activos = emps.filter(e => e.estado === 'ACTIVA');
      setEmpleados(activos);

      // Cargar contratos en paralelo (máximo 8 a la vez para no saturar)
      setLoadingContr(true);
      const chunks = [];
      for (let i = 0; i < activos.length; i += 8) chunks.push(activos.slice(i, i + 8));
      const mapa = {};
      for (const chunk of chunks) {
        const results = await Promise.all(
          chunk.map(e => getContratoActivo(e.id_empleado).catch(() => null))
        );
        chunk.forEach((e, i) => { mapa[e.id_empleado] = results[i]; });
      }
      setContratos(mapa);
    } finally {
      setLoading(false);
      setLoadingContr(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRefresh = useCallback(() => {
    if (selected) {
      getContratoActivo(selected.id_empleado).catch(() => null)
        .then(c => setContratos(prev => ({ ...prev, [selected.id_empleado]: c })));
    }
  }, [selected]);

  // Estadísticas
  const sinContrato  = empleados.filter(e => !contratos[e.id_empleado]).length;
  const porVencer    = empleados.filter(e => {
    const c = contratos[e.id_empleado];
    if (!c) return false;
    const dias = diasParaVencer(c.fecha_fin);
    return dias !== null && dias <= 30 && dias > 0;
  }).length;
  const activos = empleados.filter(e => contratos[e.id_empleado]?.estado === 'ACTIVO').length;

  const filtrados = empleados.filter(e => {
    const c = contratos[e.id_empleado];
    const nombre = (e.nombre_completo || '').toLowerCase();
    const area   = (e.nombre_area || '').toLowerCase();
    const matchSearch = !search || nombre.includes(search.toLowerCase()) || area.includes(search.toLowerCase());

    if (!matchSearch) return false;
    if (filtro === 'sin_contrato') return !c;
    if (filtro === 'por_vencer') {
      const dias = diasParaVencer(c?.fecha_fin);
      return dias !== null && dias <= 30 && dias > 0;
    }
    if (filtro === 'activos') return c?.estado === 'ACTIVO';
    return true;
  });

  return (
    <div className="flex h-full overflow-hidden">
      {/* Lista izquierda */}
      <div className={`flex flex-col ${selected ? 'w-96' : 'flex-1'} border-r border-slate-100 transition-all`}>
        {/* Header */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Contratos Laborales</h2>
              <p className="text-xs text-slate-400 mt-0.5">{empleados.length} empleados activos</p>
            </div>
            <button onClick={loadAll} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
              <RefreshCw size={15} className={loading || loadingContr ? 'animate-spin' : ''} />
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {[
              { label: 'Sin contrato', value: sinContrato,  color: 'bg-red-50 text-red-700 border-red-100',    key: 'sin_contrato' },
              { label: 'Por vencer',   value: porVencer,    color: 'bg-amber-50 text-amber-700 border-amber-100', key: 'por_vencer' },
              { label: 'Activos',      value: activos,      color: 'bg-emerald-50 text-emerald-700 border-emerald-100', key: 'activos' },
            ].map(s => (
              <button key={s.key} onClick={() => setFiltro(filtro === s.key ? 'todos' : s.key)}
                className={`border rounded-xl p-2.5 text-center transition-all ${s.color} ${filtro === s.key ? 'ring-2 ring-offset-1 ring-current/30' : 'hover:opacity-80'}`}>
                <p className="text-lg font-bold">{loading ? '—' : s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide">{s.label}</p>
              </button>
            ))}
          </div>

          {/* Alerta si hay sin contrato */}
          {!loading && sinContrato > 0 && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-xs text-red-700 mb-3">
              <AlertTriangle size={13} className="shrink-0" />
              <span><strong>{sinContrato} empleado{sinContrato > 1 ? 's' : ''}</strong> sin contrato registrado</span>
            </div>
          )}

          {/* Buscador */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o área..."
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400 text-sm">Cargando empleados...</div>
          ) : filtrados.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No hay empleados que coincidan</div>
          ) : (
            filtrados.map(emp => {
              const c     = contratos[emp.id_empleado];
              const badge = estadoBadge(c);
              const isSelected = selected?.id_empleado === emp.id_empleado;
              return (
                <button key={emp.id_empleado} onClick={() => setSelected(isSelected ? null : emp)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 border-b border-slate-50 text-left transition-colors ${isSelected ? 'bg-slate-50' : 'hover:bg-slate-50/80'}`}>
                  <div className="w-8 h-8 rounded-full bg-[#001e33] flex items-center justify-center shrink-0">
                    <span className="text-white text-xs font-bold">{(emp.primer_nombre?.[0] || '?')}{(emp.primer_apellido?.[0] || '')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 truncate">{emp.nombre_completo}</p>
                    <p className="text-xs text-slate-400 truncate">{emp.nombre_cargo || 'Sin cargo'} · {emp.nombre_area || 'Sin área'}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.color}`}>
                      {badge.icon}{badge.label}
                    </span>
                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${isSelected ? 'rotate-90' : ''}`} />
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Panel derecho */}
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <EmpleadoPanel
            empleado={selected}
            onClose={() => setSelected(null)}
            onRefresh={handleRefresh}
          />
        </div>
      )}

      {/* Estado vacío sin selección */}
      {!selected && !loading && (
        <div className="hidden lg:flex flex-1 items-center justify-center text-slate-300 flex-col gap-3">
          <FileText size={40} />
          <p className="text-sm font-medium">Selecciona un empleado para gestionar su contrato</p>
        </div>
      )}
    </div>
  );
}
