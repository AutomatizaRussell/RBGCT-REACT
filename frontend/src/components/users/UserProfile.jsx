import { useState, useEffect } from 'react';
import {
  UserCircle, Mail, Building2, Briefcase, CalendarDays, Phone,
  MapPin, Shield, RefreshCw, Edit3, Save, X, Heart, User, Hash,
  ClipboardList, CheckCircle2, AlertCircle
} from 'lucide-react';
import { getEmpleadoById, actualizarMiContacto, actualizarMiPersona } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor / Supervisor',
  usuario: 'Empleado',
};

const formatDateOnly = (value, locale = 'es-ES', options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!value) return 'No registrada';
  const normalized = String(value).includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, options);
};

const UserProfile = () => {
  const { empleadoData, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [editandoPersona, setEditandoPersona] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaStatus, setPersonaStatus] = useState(null);
  const [formPersona, setFormPersona] = useState({});

  useEffect(() => {
    if (empleadoData?.id_empleado) fetchEmpleado();
    else setLoading(false);
  }, [empleadoData?.id_empleado]);

  const fetchEmpleado = async () => {
    try {
      setLoading(true);
      const data = await getEmpleadoById(empleadoData.id_empleado);
      setEmpleado(data);
      setForm({
        telefono: data?.telefono || '',
        correo_personal: data?.correo_personal || '',
        direccion: data?.direccion || '',
        nombre_contacto_emergencia: data?.nombre_contacto_emergencia || '',
        telefono_emergencia: data?.telefono_emergencia || '',
        parentesco_emergencia: data?.parentesco_emergencia || '',
      });
      setFormPersona({
        apodo: data?.apodo || '',
        sexo: data?.sexo || '',
        tipo_sangre: data?.tipo_sangre || '',
        estado_civil: data?.estado_civil || '',
        ciudad_nacimiento: data?.ciudad_nacimiento || '',
        departamento_nacimiento: data?.departamento_nacimiento || '',
        pais_nacimiento: data?.pais_nacimiento || 'Colombia',
        nacionalidad: data?.nacionalidad || 'Colombiana',
        estrato_socioeconomico: data?.estrato_socioeconomico ?? '',
        tipo_vivienda: data?.tipo_vivienda || '',
        tiene_discapacidad: data?.tiene_discapacidad ?? false,
        descripcion_discapacidad: data?.descripcion_discapacidad || '',
        tiene_hijos: data?.tiene_hijos ?? false,
        numero_hijos: data?.numero_hijos ?? '',
      });
    } catch (err) {
      console.error('Error cargando perfil:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuardar = async () => {
    try {
      setSaving(true);
      await actualizarMiContacto({
        telefono: form.telefono,
        correo_personal: form.correo_personal,
        direccion: form.direccion,
        nombre_contacto_emergencia: form.nombre_contacto_emergencia,
        telefono_emergencia: form.telefono_emergencia,
        parentesco_emergencia: form.parentesco_emergencia,
      });
      setEmpleado(prev => ({ ...prev, ...form }));
      setEditando(false);
    } catch (err) {
      console.error('Error guardando:', err);
      alert('Error al guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  const handleGuardarPersona = async () => {
    try {
      setSavingPersona(true);
      await actualizarMiPersona(formPersona);
      setEmpleado(prev => ({ ...prev, ...formPersona }));
      setEditandoPersona(false);
      setPersonaStatus('ok');
    } catch {
      setPersonaStatus('error');
    } finally {
      setSavingPersona(false);
      setTimeout(() => setPersonaStatus(null), 4000);
    }
  };

  const camposPersonaVacios = empleado ? [
    empleado.sexo, empleado.tipo_sangre, empleado.estado_civil,
    empleado.ciudad_nacimiento, empleado.estrato_socioeconomico, empleado.tipo_vivienda,
  ].filter(v => v == null || v === '').length : 0;

  const nombreCompleto = empleado
    ? [empleado.primer_nombre, empleado.segundo_nombre, empleado.primer_apellido, empleado.segundo_apellido]
        .filter(Boolean).join(' ')
    : '';

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <RefreshCw size={24} className="text-indigo-600 animate-spin" />
        <p className="text-sm text-slate-500">Cargando perfil...</p>
      </div>
    </div>
  );

  if (!empleado) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-sm text-slate-500">No se encontró información del perfil.</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Controles */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#001871]">Mi Perfil</h3>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona tu información de contacto</p>
        </div>
        {!editando ? (
          empleadoData?.permitir_edicion_datos ? (
            <button
              onClick={() => window.location.href = '/completar-perfil'}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors"
            >
              <Edit3 size={14} /> Editar
            </button>
          ) : (
            <div className="text-xs text-slate-400">
              <span className="px-3 py-1 bg-slate-100 rounded-lg">Edición bloqueada - Contacta al administrador</span>
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleGuardar}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors disabled:opacity-50"
            >
              <Save size={14} /> {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => setEditando(false)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors"
            >
              <X size={14} /> Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Card principal */}
      <div className="bg-gradient-to-br from-[#001871] to-slate-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <UserCircle size={48} className="text-white/80" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-1">{nombreCompleto || 'Sin nombre registrado'}</h2>
            {empleado.apodo && (
              <p className="text-slate-400 text-sm mb-1">"{empleado.apodo}"</p>
            )}
            <p className="text-slate-300 text-sm mb-4">
              {empleado.nombre_cargo || 'Cargo no asignado'}
            </p>
            <div className="flex flex-wrap gap-2 justify-center md:justify-start">
              <span className="px-3 py-1 bg-white/10 rounded-lg text-xs font-medium flex items-center gap-1">
                <Hash size={10} /> ID: {empleado.id_empleado}
              </span>
              <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                empleado.estado === 'ACTIVA' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
              }`}>
                {empleado.estado}
              </span>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1">
                <Shield size={10} /> {ROLE_LABELS[userRole] || userRole}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Información corporativa */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-[#001871] mb-5 flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600" /> Información Corporativa
          </h4>
          <div className="space-y-4">
            <InfoRow icon={<Mail size={16} />} label="Correo Corporativo" value={empleado.correo_corporativo} />
            <InfoRow icon={<Building2 size={16} />} label="Área" value={empleado.nombre_area || 'Sin área asignada'} />
            <InfoRow icon={<Briefcase size={16} />} label="Cargo" value={empleado.nombre_cargo || 'Sin cargo asignado'} />
            <InfoRow
              icon={<CalendarDays size={16} />}
              label="Fecha de Ingreso"
              value={formatDateOnly(empleado.fecha_ingreso)}
            />
          </div>
        </div>

        {/* Información personal (editable) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-[#001871] mb-5 flex items-center gap-2">
            <User size={16} className="text-indigo-600" /> Información Personal
          </h4>
          <div className="space-y-4">
            <EditableRow
              icon={<Phone size={16} />}
              label="Teléfono"
              value={form.telefono}
              displayValue={empleado.telefono || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, telefono: v }))}
              type="tel"
              placeholder="Ej: 3001234567"
            />
            <EditableRow
              icon={<Mail size={16} />}
              label="Correo Personal"
              value={form.correo_personal}
              displayValue={empleado.correo_personal || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, correo_personal: v }))}
              type="email"
              placeholder="Ej: nombre@gmail.com"
            />
            <EditableRow
              icon={<MapPin size={16} />}
              label="Dirección"
              value={form.direccion}
              displayValue={empleado.direccion || 'No registrada'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, direccion: v }))}
              type="text"
              placeholder="Ej: Calle 123 # 45-67"
            />
            {empleado.fecha_nacimiento && (
              <InfoRow
                icon={<Heart size={16} />}
                label="Fecha Nacimiento"
                value={formatDateOnly(empleado.fecha_nacimiento)}
              />
            )}
            {empleado.lugar_expedicion && (
              <InfoRow
                icon={<MapPin size={16} />}
                label="Lugar Expedición"
                value={empleado.lugar_expedicion}
              />
            )}
            {empleado.fecha_expedicion && (
              <InfoRow
                icon={<CalendarDays size={16} />}
                label="Fecha Expedición"
                value={formatDateOnly(empleado.fecha_expedicion)}
              />
            )}
          </div>
          {editando && (
            <p className="text-[10px] text-slate-400 mt-4">
              * Puedes editar teléfono, correo personal, dirección y contacto de emergencia. Para otros cambios contacta a RRHH.
            </p>
          )}
        </div>

        {/* ── Termina de llenar tus datos ── */}
        <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm col-span-1 md:col-span-2 ${camposPersonaVacios > 0 ? 'border-amber-300' : 'border-emerald-200'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <ClipboardList size={16} className="text-indigo-600" /> Termina de llenar tus datos
              {camposPersonaVacios > 0
                ? <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1"><AlertCircle size={10}/> {camposPersonaVacios} pendientes</span>
                : <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={10}/> Completo</span>
              }
            </h4>
            {!editandoPersona ? (
              <button onClick={() => setEditandoPersona(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors">
                <Edit3 size={14}/> Editar
              </button>
            ) : (
              <div className="flex gap-2">
                <button onClick={handleGuardarPersona} disabled={savingPersona} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors disabled:opacity-50">
                  <Save size={14}/> {savingPersona ? 'Guardando...' : 'Guardar'}
                </button>
                <button onClick={() => setEditandoPersona(false)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors">
                  <X size={14}/> Cancelar
                </button>
              </div>
            )}
          </div>

          {personaStatus === 'ok' && <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"><CheckCircle2 size={13}/> Datos guardados correctamente</div>}
          {personaStatus === 'error' && <div className="mb-4 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"><AlertCircle size={13}/> Error al guardar. Intenta de nuevo.</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <PersonaField label="Apodo / Nombre preferido" editando={editandoPersona}
              displayValue={empleado.apodo || 'No registrado'}
              input={<input type="text" value={formPersona.apodo} onChange={e => setFormPersona(p=>({...p,apodo:e.target.value}))} placeholder="Como te llaman" className="input-modern text-sm"/>}
            />
            <PersonaField label="Sexo" editando={editandoPersona}
              displayValue={{'M':'Masculino','F':'Femenino','O':'Otro'}[empleado.sexo] || 'No registrado'}
              input={<select value={formPersona.sexo} onChange={e=>setFormPersona(p=>({...p,sexo:e.target.value}))} className="input-modern text-sm"><option value="">— Seleccionar —</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option></select>}
            />
            <PersonaField label="Tipo de sangre" editando={editandoPersona}
              displayValue={empleado.tipo_sangre || 'No registrado'}
              input={<select value={formPersona.tipo_sangre} onChange={e=>setFormPersona(p=>({...p,tipo_sangre:e.target.value}))} className="input-modern text-sm"><option value="">— Seleccionar —</option>{['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t=><option key={t} value={t}>{t}</option>)}</select>}
            />
            <PersonaField label="Estado civil" editando={editandoPersona}
              displayValue={{'S':'Soltero/a','C':'Casado/a','UL':'Unión Libre','D':'Divorciado/a','V':'Viudo/a'}[empleado.estado_civil] || 'No registrado'}
              input={<select value={formPersona.estado_civil} onChange={e=>setFormPersona(p=>({...p,estado_civil:e.target.value}))} className="input-modern text-sm"><option value="">— Seleccionar —</option><option value="S">Soltero/a</option><option value="C">Casado/a</option><option value="UL">Unión Libre</option><option value="D">Divorciado/a</option><option value="V">Viudo/a</option></select>}
            />
            <PersonaField label="Ciudad de nacimiento" editando={editandoPersona}
              displayValue={empleado.ciudad_nacimiento || 'No registrada'}
              input={<input type="text" value={formPersona.ciudad_nacimiento} onChange={e=>setFormPersona(p=>({...p,ciudad_nacimiento:e.target.value}))} placeholder="Ej: Medellín" className="input-modern text-sm"/>}
            />
            <PersonaField label="Departamento de nacimiento" editando={editandoPersona}
              displayValue={empleado.departamento_nacimiento || 'No registrado'}
              input={<input type="text" value={formPersona.departamento_nacimiento} onChange={e=>setFormPersona(p=>({...p,departamento_nacimiento:e.target.value}))} placeholder="Ej: Antioquia" className="input-modern text-sm"/>}
            />
            <PersonaField label="País de nacimiento" editando={editandoPersona}
              displayValue={empleado.pais_nacimiento || 'Colombia'}
              input={<input type="text" value={formPersona.pais_nacimiento} onChange={e=>setFormPersona(p=>({...p,pais_nacimiento:e.target.value}))} placeholder="Colombia" className="input-modern text-sm"/>}
            />
            <PersonaField label="Nacionalidad" editando={editandoPersona}
              displayValue={empleado.nacionalidad || 'Colombiana'}
              input={<input type="text" value={formPersona.nacionalidad} onChange={e=>setFormPersona(p=>({...p,nacionalidad:e.target.value}))} placeholder="Colombiana" className="input-modern text-sm"/>}
            />
            <PersonaField label="Estrato socioeconómico" editando={editandoPersona}
              displayValue={empleado.estrato_socioeconomico != null ? `Estrato ${empleado.estrato_socioeconomico}` : 'No registrado'}
              input={<select value={formPersona.estrato_socioeconomico} onChange={e=>setFormPersona(p=>({...p,estrato_socioeconomico:e.target.value}))} className="input-modern text-sm"><option value="">— Seleccionar —</option>{[1,2,3,4,5,6].map(n=><option key={n} value={n}>Estrato {n}</option>)}</select>}
            />
            <PersonaField label="Tipo de vivienda" editando={editandoPersona}
              displayValue={{'propia':'Propia','arrendada':'Arrendada','familiar':'Familiar'}[empleado.tipo_vivienda] || 'No registrado'}
              input={<select value={formPersona.tipo_vivienda} onChange={e=>setFormPersona(p=>({...p,tipo_vivienda:e.target.value}))} className="input-modern text-sm"><option value="">— Seleccionar —</option><option value="propia">Propia</option><option value="arrendada">Arrendada</option><option value="familiar">Familiar</option></select>}
            />
            <PersonaField label="¿Tiene hijos?" editando={editandoPersona}
              displayValue={empleado.tiene_hijos ? `Sí — ${empleado.numero_hijos ?? 0}` : 'No'}
              input={
                <div className="flex gap-2 items-center">
                  <select value={formPersona.tiene_hijos ? 'si' : 'no'} onChange={e=>setFormPersona(p=>({...p,tiene_hijos:e.target.value==='si',numero_hijos:e.target.value==='no'?'':p.numero_hijos}))} className="input-modern text-sm flex-1"><option value="no">No</option><option value="si">Sí</option></select>
                  {formPersona.tiene_hijos && <input type="number" min="1" max="20" value={formPersona.numero_hijos} onChange={e=>setFormPersona(p=>({...p,numero_hijos:e.target.value}))} placeholder="Cuántos" className="input-modern text-sm w-24"/>}
                </div>
              }
            />
            <PersonaField label="¿Tiene discapacidad?" editando={editandoPersona}
              displayValue={empleado.tiene_discapacidad ? `Sí${empleado.descripcion_discapacidad ? ` — ${empleado.descripcion_discapacidad}` : ''}` : 'No'}
              input={
                <div className="space-y-2">
                  <select value={formPersona.tiene_discapacidad ? 'si' : 'no'} onChange={e=>setFormPersona(p=>({...p,tiene_discapacidad:e.target.value==='si',descripcion_discapacidad:e.target.value==='no'?'':p.descripcion_discapacidad}))} className="input-modern text-sm w-full"><option value="no">No</option><option value="si">Sí</option></select>
                  {formPersona.tiene_discapacidad && <input type="text" value={formPersona.descripcion_discapacidad} onChange={e=>setFormPersona(p=>({...p,descripcion_discapacidad:e.target.value}))} placeholder="Descripción" className="input-modern text-sm w-full"/>}
                </div>
              }
            />
          </div>
        </div>

        {/* Contacto de emergencia */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-[#001871] mb-5 flex items-center gap-2">
            <Heart size={16} className="text-rose-500" /> Contacto de Emergencia
          </h4>
          <div className="space-y-4">
            <EditableRow
              icon={<User size={16} />}
              label="Nombre"
              value={form.nombre_contacto_emergencia}
              displayValue={empleado.nombre_contacto_emergencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, nombre_contacto_emergencia: v }))}
              type="text"
              placeholder="Ej. María García"
            />
            <EditableRow
              icon={<Phone size={16} />}
              label="Teléfono"
              value={form.telefono_emergencia}
              displayValue={empleado.telefono_emergencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, telefono_emergencia: v }))}
              type="tel"
              placeholder="Ej: 3001234567"
            />
            <EditableRow
              icon={<Heart size={16} />}
              label="Parentesco"
              value={form.parentesco_emergencia}
              displayValue={empleado.parentesco_emergencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, parentesco_emergencia: v }))}
              type="text"
              placeholder="Ej. Madre, Esposo, Hermano..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoRow = ({ icon, label, value }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
      {icon}
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
      <p className="text-sm font-medium text-slate-700 truncate">{value}</p>
    </div>
  </div>
);

const EditableRow = ({ icon, label, value, displayValue, editando, onChange, type, placeholder }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
      {editando ? (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1 mt-0.5 outline-none focus:ring-2 focus:ring-indigo-400"
        />
      ) : (
        <p className="text-sm font-medium text-slate-700 truncate">{displayValue}</p>
      )}
    </div>
  </div>
);

const PersonaField = ({ label, editando, displayValue, input }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-slate-500 uppercase">{label}</p>
    {editando ? input : <p className="text-sm font-medium text-slate-700">{displayValue}</p>}
  </div>
);

export default UserProfile;
