import { useState, useEffect } from 'react';
import {
  UserCircle, Mail, Building2, Briefcase, CalendarDays, Phone,
  MapPin, Shield, RefreshCw, Edit3, Save, X, Heart, User, Hash
} from 'lucide-react';
import { getEmpleadoById, updateEmpleado } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor / Supervisor',
  usuario: 'Empleado',
};

const UserProfile = () => {
  const { empleadoData, userRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});

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
      await updateEmpleado(empleadoData.id_empleado, {
        telefono: form.telefono,
        correo_personal: form.correo_personal,
        direccion: form.direccion,
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
          <h3 className="text-lg font-bold text-[#001e33]">Mi Perfil</h3>
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
      <div className="bg-gradient-to-br from-[#001e33] to-slate-800 rounded-3xl p-8 text-white shadow-xl">
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
          <h4 className="text-sm font-bold text-[#001e33] mb-5 flex items-center gap-2">
            <Briefcase size={16} className="text-indigo-600" /> Información Corporativa
          </h4>
          <div className="space-y-4">
            <InfoRow icon={<Mail size={16} />} label="Correo Corporativo" value={empleado.correo_corporativo} />
            <InfoRow icon={<Building2 size={16} />} label="Área" value={empleado.nombre_area || 'Sin área asignada'} />
            <InfoRow icon={<Briefcase size={16} />} label="Cargo" value={empleado.nombre_cargo || 'Sin cargo asignado'} />
            <InfoRow
              icon={<CalendarDays size={16} />}
              label="Fecha de Ingreso"
              value={empleado.fecha_ingreso
                ? new Date(empleado.fecha_ingreso).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })
                : 'No registrada'}
            />
          </div>
        </div>

        {/* Información personal (editable) */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <h4 className="text-sm font-bold text-[#001e33] mb-5 flex items-center gap-2">
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
                value={new Date(empleado.fecha_nacimiento).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}
              />
            )}
          </div>
          {editando && (
            <p className="text-[10px] text-slate-400 mt-4">
              * Puedes editar teléfono, correo personal y dirección. Para otros cambios contacta a RRHH.
            </p>
          )}
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

export default UserProfile;
