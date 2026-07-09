import { useState, useEffect, useRef } from 'react';
import {
  UserCircle, Mail, Building2, Briefcase, CalendarDays, Phone,
  MapPin, Shield, RefreshCw, Edit3, Save, X, Heart, User, Hash,
  ClipboardList, CheckCircle2, AlertCircle, FileText, Lock, GraduationCap, Plus, Trash2,
  Network, History, ArrowRightLeft, TrendingUp, DollarSign, FileSignature, ToggleLeft, LogIn, LogOut,
  Upload, ExternalLink,
} from 'lucide-react';
import {
  getEmpleadoById, actualizarMiContacto, actualizarMiPersona,
  getMisAcademicos, crearDatoAcademico, actualizarDatoAcademico, eliminarDatoAcademico,
  getMiOrganigrama, getHistorialEmpleado,
  subirCertificadoDiscapacidad, eliminarCertificadoDiscapacidad,
  getMisHijos, crearHijo, actualizarHijo, eliminarHijo,
} from '../../../lib/api';
import { useAuth } from '../../../hooks/useAuth';
import { COLOMBIA } from '../../../lib/colombiaData';

const NIVEL_LABELS = {
  bachiller: 'Bachiller', tecnico: 'Técnico', tecnologo: 'Tecnólogo',
  profesional: 'Profesional', especializacion: 'Especialización',
  maestria: 'Maestría', doctorado: 'Doctorado', otro: 'Otro',
};

const ROLE_LABELS = {
  superadmin: 'Super Admin',
  admin: 'Administrador',
  editor: 'Editor / Supervisor',
  usuario: 'Empleado',
};

const TIPO_DOC_LABELS = { CC: 'Cédula de Ciudadanía', CE: 'Cédula de Extranjería', PA: 'Pasaporte', TI: 'Tarjeta de Identidad' };

const formatDateOnly = (value, locale = 'es-ES', options = { year: 'numeric', month: 'long', day: 'numeric' }) => {
  if (!value) return 'No registrada';
  const normalized = String(value).includes('T') ? value : `${value}T00:00:00`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(locale, options);
};

const UserProfile = () => {
  const { empleadoData, userRole, completarDatos } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [empleado, setEmpleado] = useState(null);
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({});
  const [editandoPersona, setEditandoPersona] = useState(false);
  const [savingPersona, setSavingPersona] = useState(false);
  const [personaStatus, setPersonaStatus] = useState(null);
  const [formPersona, setFormPersona] = useState({});
  const [editandoIdentidad, setEditandoIdentidad] = useState(false);
  const [savingIdentidad, setSavingIdentidad] = useState(false);
  const [identidadStatus, setIdentidadStatus] = useState(null);
  const [formIdentidad, setFormIdentidad] = useState({});
  // Organigrama
  const [showOrganigrama, setShowOrganigrama] = useState(false);
  const [organigrama, setOrganigrama] = useState(null);
  const [loadingOrg, setLoadingOrg] = useState(false);
  // Datos académicos
  const [academicos, setAcademicos] = useState([]);
  const [academicoStatus, setAcademicoStatus] = useState(null);
  const [editandoAcademico, setEditandoAcademico] = useState(null); // id del registro en edición, o 'nuevo'
  const [formAcademico, setFormAcademico] = useState({});
  const [historial, setHistorial] = useState([]);
  const [subiendoCert, setSubiendoCert] = useState(false)
  const [certStatus, setCertStatus] = useState(null)
  const [hijos, setHijos] = useState([])
  const [editandoHijo, setEditandoHijo] = useState(null) // id o 'nuevo'
  const [formHijo, setFormHijo] = useState({})
  const [savingHijo, setSavingHijo] = useState(false)
  const seccionPersonaRef = useRef(null);
  const seccionIdentidadRef = useRef(null);
  const seccionAcademicosRef = useRef(null);

  useEffect(() => {
    if (empleadoData?.id_empleado) fetchEmpleado();
    else setLoading(false);
  }, [empleadoData?.id_empleado]);

  const fetchEmpleado = async () => {
    try {
      setLoading(true);
      // Primero cargamos el perfil (crítico). Si falla, mostramos error.
      const data = await getEmpleadoById(empleadoData.id_empleado);
      setEmpleado(data);
      // Datos secundarios: fallan silenciosamente para no bloquear el perfil
      const [academicosResult, historialResult, hijosResult] = await Promise.allSettled([
        getMisAcademicos(),
        getHistorialEmpleado(empleadoData.id_empleado),
        getMisHijos(),
      ]);
      const academicosData = academicosResult.status === 'fulfilled' ? academicosResult.value : [];
      const historialData  = historialResult.status  === 'fulfilled' ? historialResult.value  : [];
      const hijosData      = hijosResult.status      === 'fulfilled' ? hijosResult.value      : [];
      setAcademicos(Array.isArray(academicosData) ? academicosData : []);
      setHistorial(Array.isArray(historialData) ? historialData : []);
      setHijos(Array.isArray(hijosData) ? hijosData : []);
      setForm({
        telefono: data?.telefono || '',
        correo_personal: data?.correo_personal || '',
        pais_residencia: data?.pais_residencia || 'Colombia',
        departamento_residencia: data?.departamento_residencia || '',
        municipio_residencia: data?.municipio_residencia || '',
        direccion: data?.direccion || '',
        detalles_residencia: data?.detalles_residencia || '',
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
        tiene_vehiculo: data?.tiene_vehiculo ?? false,
        tipo_vehiculo: data?.tipo_vehiculo || '',
        placa_vehiculo: data?.placa_vehiculo || '',
        fecha_ingreso: data?.fecha_ingreso || '',
      });
      setFormIdentidad({
        primer_nombre: data?.primer_nombre || '',
        segundo_nombre: data?.segundo_nombre || '',
        primer_apellido: data?.primer_apellido || '',
        segundo_apellido: data?.segundo_apellido || '',
        tipo_documento: data?.tipo_documento || 'CC',
        numero_documento: data?.numero_documento || '',
        lugar_expedicion: data?.lugar_expedicion || '',
        fecha_expedicion: data?.fecha_expedicion || '',
        fecha_nacimiento: data?.fecha_nacimiento || '',
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
        pais_residencia: form.pais_residencia,
        departamento_residencia: form.departamento_residencia,
        municipio_residencia: form.municipio_residencia,
        direccion: form.direccion,
        detalles_residencia: form.detalles_residencia,
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
      setEmpleado(prev => ({
        ...prev,
        ...formPersona,
        datos_persona_completados: true,
      }));
      setEditandoPersona(false);
      setPersonaStatus('ok');
    } catch {
      setPersonaStatus('error');
    } finally {
      setSavingPersona(false);
      setTimeout(() => setPersonaStatus(null), 4000);
    }
  };

  const handleSubirCertificado = async (file) => {
    try {
      setSubiendoCert(true)
      const res = await subirCertificadoDiscapacidad(file)
      setEmpleado(prev => ({ ...prev, certificado_discapacidad: res.url }))
      setCertStatus('ok')
    } catch {
      setCertStatus('error')
    } finally {
      setSubiendoCert(false)
      setTimeout(() => setCertStatus(null), 4000)
    }
  }

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const hoy = new Date();
    const nac = new Date(fechaNacimiento + 'T00:00:00');
    let edad = hoy.getFullYear() - nac.getFullYear();
    const m = hoy.getMonth() - nac.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < nac.getDate())) edad--;
    return edad >= 0 ? edad : null;
  }

  const hijoVacio = () => ({ nombre: '', tipo_documento: 'RC', numero_identificacion: '', fecha_nacimiento: '', sexo: '' })

  const handleGuardarHijo = async () => {
    if (!formHijo.nombre?.trim()) return
    try {
      setSavingHijo(true)
      if (editandoHijo === 'nuevo') {
        const nuevo = await crearHijo(formHijo)
        setHijos(prev => [...prev, nuevo])
      } else {
        await actualizarHijo(editandoHijo, formHijo)
        setHijos(prev => prev.map(h => h.id === editandoHijo ? { ...h, ...formHijo } : h))
      }
      setEditandoHijo(null)
      setFormHijo({})
    } catch { /* silencioso */ } finally {
      setSavingHijo(false)
    }
  }

  const handleEliminarHijo = async (id) => {
    if (!window.confirm('¿Eliminar este hijo?')) return
    try {
      await eliminarHijo(id)
      setHijos(prev => prev.filter(h => h.id !== id))
    } catch { /* silencioso */ }
  }

  const handleEliminarCertificado = async () => {
    if (!window.confirm('¿Eliminar el certificado de discapacidad?')) return
    try {
      setSubiendoCert(true)
      await eliminarCertificadoDiscapacidad()
      setEmpleado(prev => ({ ...prev, certificado_discapacidad: null }))
    } catch {
      setCertStatus('error')
    } finally {
      setSubiendoCert(false)
    }
  }

  const handleGuardarIdentidad = async () => {
    // Validar años de fechas antes de enviar
    const fechasIdentidad = [
      { val: formIdentidad.fecha_expedicion, label: 'Fecha de expedición' },
      { val: formIdentidad.fecha_nacimiento, label: 'Fecha de nacimiento' },
    ];
    for (const { val, label } of fechasIdentidad) {
      if (!val) continue;
      const anio = parseInt(val.split('-')[0], 10);
      if (isNaN(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
        setIdentidadStatus('error');
        setTimeout(() => setIdentidadStatus(null), 5000);
        alert(`${label}: el año "${anio}" no es válido. Asegúrate de ingresar 4 dígitos (ej: 1990).`);
        return;
      }
    }
    try {
      setSavingIdentidad(true);
      await completarDatos({
        primer_nombre: formIdentidad.primer_nombre,
        segundo_nombre: formIdentidad.segundo_nombre,
        primer_apellido: formIdentidad.primer_apellido,
        segundo_apellido: formIdentidad.segundo_apellido,
        tipo_documento: formIdentidad.tipo_documento,
        numero_documento: formIdentidad.numero_documento,
        lugar_expedicion: formIdentidad.lugar_expedicion || null,
        fecha_expedicion: formIdentidad.fecha_expedicion || null,
        fecha_nacimiento: formIdentidad.fecha_nacimiento || null,
        apodo: empleado.apodo,
        correo_personal: empleado.correo_personal,
        telefono: empleado.telefono,
        telefono_emergencia: empleado.telefono_emergencia,
        nombre_contacto_emergencia: empleado.nombre_contacto_emergencia,
        parentesco_emergencia: empleado.parentesco_emergencia,
        fecha_ingreso: empleado.fecha_ingreso || null,
        direccion: empleado.direccion,
        sexo: empleado.sexo,
        tipo_sangre: empleado.tipo_sangre,
        area_id: empleado.area_id ? parseInt(empleado.area_id) : null,
        cargo_id: empleado.cargo_id ? parseInt(empleado.cargo_id) : null,
      });
      setEmpleado(prev => ({ ...prev, ...formIdentidad, permitir_edicion_datos: false }));
      setEditandoIdentidad(false);
      setIdentidadStatus('ok');
    } catch (err) {
      console.error('Error guardando datos de identidad:', err);
      setIdentidadStatus('error');
    } finally {
      setSavingIdentidad(false);
      setTimeout(() => setIdentidadStatus(null), 4000);
    }
  };

  const handleVerOrganigrama = async () => {
    setShowOrganigrama(true);
    if (organigrama) return;
    setLoadingOrg(true);
    try {
      const data = await getMiOrganigrama();
      setOrganigrama(data);
    } catch {
      setOrganigrama(null);
    } finally {
      setLoadingOrg(false);
    }
  };

  const [diplomaFile, setDiplomaFile] = useState(null);

  const ACADEMICO_VACIO = {
    nivel_educativo: '', titulo_obtenido: '', institucion: '',
    ciudad_institucion: '', fecha_inicio: '', fecha_graduacion: '', en_curso: false, graduado: true,
  };

  const handleNuevoAcademico = () => {
    setFormAcademico(ACADEMICO_VACIO);
    setDiplomaFile(null);
    setEditandoAcademico('nuevo');
    setTimeout(() => seccionAcademicosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleEditarAcademico = (reg) => {
    setFormAcademico({
      nivel_educativo: reg.nivel_educativo || '',
      titulo_obtenido: reg.titulo_obtenido || '',
      institucion: reg.institucion || '',
      ciudad_institucion: reg.ciudad_institucion || '',
      fecha_inicio: reg.fecha_inicio || '',
      fecha_graduacion: reg.fecha_graduacion || '',
      en_curso: reg.en_curso ?? false,
      graduado: reg.graduado ?? true,
    });
    setDiplomaFile(null);
    setEditandoAcademico(reg.id);
    setTimeout(() => seccionAcademicosRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const handleGuardarAcademico = async () => {
    if (!formAcademico.nivel_educativo || !formAcademico.titulo_obtenido || !formAcademico.institucion) {
      setAcademicoStatus('error-campos');
      setTimeout(() => setAcademicoStatus(null), 3000);
      return;
    }
    try {
      setAcademicoStatus('saving');
      const payload = {
        ...formAcademico,
        fecha_inicio: formAcademico.fecha_inicio || null,
        fecha_graduacion: formAcademico.en_curso ? null : (formAcademico.fecha_graduacion || null),
      };
      if (editandoAcademico === 'nuevo') {
        const nuevo = await crearDatoAcademico(payload, diplomaFile);
        setAcademicos(prev => [nuevo, ...prev]);
        setEmpleado(prev => ({ ...prev, datos_academicos_completados: true }));
      } else {
        const actualizado = await actualizarDatoAcademico(editandoAcademico, payload, diplomaFile);
        setAcademicos(prev => prev.map(r => r.id === editandoAcademico ? actualizado : r));
      }
      setDiplomaFile(null);
      setEditandoAcademico(null);
      setAcademicoStatus('ok');
    } catch {
      setAcademicoStatus('error');
    } finally {
      setTimeout(() => setAcademicoStatus(null), 3000);
    }
  };

  const handleEliminarAcademico = async (id) => {
    if (!window.confirm('¿Eliminar este registro académico?')) return;
    try {
      await eliminarDatoAcademico(id);
      const restantes = academicos.filter(r => r.id !== id);
      setAcademicos(restantes);
      if (restantes.length === 0) setEmpleado(prev => ({ ...prev, datos_academicos_completados: false }));
    } catch {
      alert('Error al eliminar el registro');
    }
  };

  const irACompletarDatos = () => {
    setEditandoPersona(true);
    setTimeout(() => seccionPersonaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const irAEditarIdentidad = () => {
    setEditandoIdentidad(true);
    setTimeout(() => seccionIdentidadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const personaCompletada = empleado?.datos_persona_completados ?? false;
  const puedeEditarPersona = empleado?.permitir_edicion_datos ?? false;
  const mostrarFormPersona = !personaCompletada || puedeEditarPersona;
  const academicosCompletados = empleado?.datos_academicos_completados ?? false;

  const camposPersonaVacios = empleado ? [
    empleado.sexo, empleado.tipo_sangre, empleado.estado_civil,
    empleado.ciudad_nacimiento, empleado.estrato_socioeconomico, empleado.tipo_vivienda,
    empleado.fecha_ingreso,
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

  // Cuenta de sistema (superadmin de plataforma) — no tiene ficha de empleado
  if (!empleadoData?.id_empleado) return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="bg-gradient-to-br from-[#001871] to-slate-800 rounded-3xl p-8 text-white shadow-xl">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
          <div className="w-24 h-24 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Shield size={40} className="text-white/80" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-2xl font-bold mb-1">
              {empleadoData?.nombre
                ? `${empleadoData.nombre} ${empleadoData.apellido || ''}`.trim()
                : 'Administrador del Sistema'}
            </h2>
            <p className="text-slate-300 text-sm mb-4">{empleadoData?.email || ''}</p>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-xs font-medium flex items-center gap-1 w-fit mx-auto md:mx-0">
              <Shield size={10} /> Super Administrador · Cuenta de Sistema
            </span>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex items-center gap-3">
        <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
        <p className="text-sm text-slate-600">
          La cuenta de sistema no tiene ficha de empleado. Los perfiles de empleado corresponden a los colaboradores registrados en la plataforma.
        </p>
      </div>
    </div>
  );

  if (!empleado) return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center px-4">
      <AlertCircle size={32} className="text-amber-400" />
      <p className="text-sm font-semibold text-slate-600">No se pudo cargar el perfil.</p>
      <button
        onClick={fetchEmpleado}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors"
      >
        <RefreshCw size={13} /> Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {showOrganigrama && (
        <OrganigramaModal
          data={organigrama}
          loading={loadingOrg}
          onClose={() => setShowOrganigrama(false)}
        />
      )}
      {/* Controles */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#001871]">Mi Perfil</h3>
          <p className="text-xs text-slate-500 mt-0.5">Gestiona tu información de contacto</p>
        </div>
        {!editando ? (
          <div className="flex items-center gap-2">
            <button
              onClick={handleVerOrganigrama}
              title="Ver mi organigrama"
              className="flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
            >
              <Network size={15} />
            </button>
            <button
              onClick={handleNuevoAcademico}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors"
            >
              <GraduationCap size={14} /> {academicosCompletados ? 'Agregar estudio' : 'Completar académicos'}
              {!academicosCompletados && (
                <span className="w-4 h-4 bg-emerald-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">!</span>
              )}
            </button>
            {mostrarFormPersona && (
              <button
                onClick={irACompletarDatos}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-xs font-bold uppercase hover:bg-amber-100 transition-colors"
              >
                <ClipboardList size={14} /> {personaCompletada ? 'Editar datos' : 'Completar datos'}
                {!personaCompletada && camposPersonaVacios > 0 && (
                  <span className="w-4 h-4 bg-amber-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{camposPersonaVacios}</span>
                )}
              </button>
            )}
            {puedeEditarPersona && (
              <button
                onClick={irAEditarIdentidad}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors"
              >
                <Edit3 size={14} /> Editar identidad
              </button>
            )}
          </div>
        ) : null}
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

        {/* ── Datos de Identidad ── */}
        <div ref={seccionIdentidadRef} className={`bg-white rounded-2xl border-2 p-6 shadow-sm col-span-1 md:col-span-2 ${puedeEditarPersona ? 'border-indigo-200' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <FileText size={16} className="text-indigo-600" /> Datos de Identidad
              {puedeEditarPersona && !editandoIdentidad && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">Edición habilitada</span>
              )}
            </h4>
            {!editandoIdentidad ? (
              puedeEditarPersona && (
                <button
                  onClick={() => setEditandoIdentidad(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors"
                >
                  <Edit3 size={14} /> Editar
                </button>
              )
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleGuardarIdentidad}
                  disabled={savingIdentidad}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors disabled:opacity-50"
                >
                  <Save size={14} /> {savingIdentidad ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditandoIdentidad(false); setIdentidadStatus(null); }}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors"
                >
                  <X size={14} /> Cancelar
                </button>
              </div>
            )}
          </div>

          {identidadStatus === 'ok' && (
            <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <CheckCircle2 size={13} /> Datos de identidad actualizados correctamente. El permiso de edición ha sido revocado.
            </div>
          )}
          {identidadStatus === 'error' && (
            <div className="mb-4 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <AlertCircle size={13} /> Error al guardar. Intenta de nuevo.
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PersonaField label="Primer Nombre" editando={editandoIdentidad}
              displayValue={empleado.primer_nombre || 'No registrado'}
              input={<input type="text" value={formIdentidad.primer_nombre} onChange={e => setFormIdentidad(p => ({ ...p, primer_nombre: e.target.value }))} placeholder="Ej. Juan" className="input-modern text-sm" />}
            />
            <PersonaField label="Segundo Nombre" editando={editandoIdentidad}
              displayValue={empleado.segundo_nombre || '—'}
              input={<input type="text" value={formIdentidad.segundo_nombre} onChange={e => setFormIdentidad(p => ({ ...p, segundo_nombre: e.target.value }))} placeholder="Ej. Carlos" className="input-modern text-sm" />}
            />
            <PersonaField label="Primer Apellido" editando={editandoIdentidad}
              displayValue={empleado.primer_apellido || 'No registrado'}
              input={<input type="text" value={formIdentidad.primer_apellido} onChange={e => setFormIdentidad(p => ({ ...p, primer_apellido: e.target.value }))} placeholder="Ej. García" className="input-modern text-sm" />}
            />
            <PersonaField label="Segundo Apellido" editando={editandoIdentidad}
              displayValue={empleado.segundo_apellido || '—'}
              input={<input type="text" value={formIdentidad.segundo_apellido} onChange={e => setFormIdentidad(p => ({ ...p, segundo_apellido: e.target.value }))} placeholder="Ej. López" className="input-modern text-sm" />}
            />
            <PersonaField label="Tipo de Documento" editando={editandoIdentidad}
              displayValue={TIPO_DOC_LABELS[empleado.tipo_documento] || empleado.tipo_documento || 'No registrado'}
              input={
                <select value={formIdentidad.tipo_documento} onChange={e => setFormIdentidad(p => ({ ...p, tipo_documento: e.target.value }))} className="input-modern text-sm">
                  <option value="CC">Cédula de Ciudadanía (CC)</option>
                  <option value="CE">Cédula de Extranjería (CE)</option>
                  <option value="PA">Pasaporte (PA)</option>
                  <option value="TI">Tarjeta de Identidad (TI)</option>
                </select>
              }
            />
            <PersonaField label="Número de Documento" editando={editandoIdentidad}
              displayValue={empleado.numero_documento || 'No registrado'}
              input={<input type="text" value={formIdentidad.numero_documento} onChange={e => setFormIdentidad(p => ({ ...p, numero_documento: e.target.value }))} placeholder="Ej. 1234567890" className="input-modern text-sm" />}
            />
            <PersonaField label="Lugar de Expedición" editando={editandoIdentidad}
              displayValue={empleado.lugar_expedicion || 'No registrado'}
              input={<input type="text" value={formIdentidad.lugar_expedicion} onChange={e => setFormIdentidad(p => ({ ...p, lugar_expedicion: e.target.value }))} placeholder="Ej. Medellín" className="input-modern text-sm" />}
            />
            <PersonaField label="Fecha de Expedición" editando={editandoIdentidad}
              displayValue={formatDateOnly(empleado.fecha_expedicion)}
              input={<input type="date" value={formIdentidad.fecha_expedicion} onChange={e => setFormIdentidad(p => ({ ...p, fecha_expedicion: e.target.value }))} className="input-modern text-sm" />}
            />
            <PersonaField label="Fecha de Nacimiento" editando={editandoIdentidad}
              displayValue={formatDateOnly(empleado.fecha_nacimiento)}
              input={<input type="date" value={formIdentidad.fecha_nacimiento} onChange={e => setFormIdentidad(p => ({ ...p, fecha_nacimiento: e.target.value }))} className="input-modern text-sm" />}
            />
          </div>

          {editandoIdentidad && (
            <p className="mt-3 text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
              Esta es una actualización única — el permiso se revocará automáticamente al guardar.
            </p>
          )}

          {!puedeEditarPersona && (
            <p className="mt-4 text-[10px] text-slate-400">
              Datos de identidad bloqueados. Para solicitar cambios, contacta al administrador.
            </p>
          )}
        </div>

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

        {/* Información de contacto (editable) */}
        <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${puedeEditarPersona ? 'border-indigo-200' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Información de Contacto
              {puedeEditarPersona && !editando && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">Edición habilitada</span>
              )}
            </h4>
            {puedeEditarPersona && !editando && (
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors"
              >
                <Edit3 size={14} /> Editar
              </button>
            )}
            {editando && (
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
              label="País de residencia"
              value={form.pais_residencia}
              displayValue={empleado.pais_residencia || 'Colombia'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, pais_residencia: v }))}
              type="text"
              placeholder="Ej: Colombia"
            />
            <EditableSelectRow
              icon={<MapPin size={16} />}
              label="Departamento"
              value={form.departamento_residencia}
              displayValue={empleado.departamento_residencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, departamento_residencia: v, municipio_residencia: '' }))}
              options={COLOMBIA.map(d => d.departamento)}
              placeholder="-- Selecciona departamento --"
            />
            <EditableSelectRow
              icon={<MapPin size={16} />}
              label="Municipio"
              value={form.municipio_residencia}
              displayValue={empleado.municipio_residencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, municipio_residencia: v }))}
              options={COLOMBIA.find(d => d.departamento === form.departamento_residencia)?.ciudades ?? []}
              disabled={!form.departamento_residencia}
              placeholder={form.departamento_residencia ? '-- Selecciona municipio --' : '-- Selecciona departamento primero --'}
            />
            <EditableRow
              icon={<MapPin size={16} />}
              label="Dirección de residencia"
              value={form.direccion}
              displayValue={empleado.direccion || 'No registrada'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, direccion: v }))}
              type="text"
              placeholder="Ej: Calle 123 # 45-67"
            />
            <EditableRow
              icon={<MapPin size={16} />}
              label="Detalles de residencia"
              value={form.detalles_residencia}
              displayValue={empleado.detalles_residencia || 'No registrado'}
              editando={editando}
              onChange={v => setForm(f => ({ ...f, detalles_residencia: v }))}
              type="text"
              placeholder="Ej: Apto 301, Torre B, Unidad Residencial Los Pinos"
            />
          </div>
          {!puedeEditarPersona && (
            <p className="mt-4 text-[10px] text-slate-400">
              Para actualizar tu información de contacto, contacta al administrador.
            </p>
          )}
        </div>

        {/* ── Termina de llenar tus datos (siempre visible) ── */}
        <div ref={seccionPersonaRef} className={`bg-white rounded-2xl border-2 p-6 shadow-sm col-span-1 md:col-span-2 ${camposPersonaVacios > 0 ? 'border-amber-300' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <ClipboardList size={16} className="text-indigo-600" /> Datos Personales
              {camposPersonaVacios > 0
                ? <span className="ml-2 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full flex items-center gap-1"><AlertCircle size={10}/> {camposPersonaVacios} pendientes</span>
                : <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={10}/> Completo</span>
              }
            </h4>
            {!editandoPersona ? (
              (!personaCompletada || puedeEditarPersona) && (
                <button onClick={() => setEditandoPersona(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors">
                  <Edit3 size={14}/> {personaCompletada ? 'Editar' : 'Completar'}
                </button>
              )
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
              displayValue={empleado.tiene_hijos ? `Sí — ${hijos.length || empleado.numero_hijos || 0} hijo(s)` : 'No'}
              input={
                <select value={formPersona.tiene_hijos ? 'si' : 'no'} onChange={e=>setFormPersona(p=>({...p,tiene_hijos:e.target.value==='si',numero_hijos:e.target.value==='no'?'':p.numero_hijos}))} className="input-modern text-sm w-full"><option value="no">No</option><option value="si">Sí</option></select>
              }
            />
            {(empleado.tiene_hijos || formPersona.tiene_hijos) && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-[#001871]">Datos de hijos ({hijos.length})</p>
                  {editandoHijo !== 'nuevo' && (
                    <button onClick={() => { setEditandoHijo('nuevo'); setFormHijo(hijoVacio()) }}
                      className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors">
                      <Plus size={13}/> Agregar hijo
                    </button>
                  )}
                </div>
                {hijos.length === 0 && editandoHijo !== 'nuevo' && (
                  <p className="text-xs text-slate-400 italic">No hay hijos registrados. Haz clic en "Agregar hijo" para añadir.</p>
                )}
                <div className="space-y-2">
                  {hijos.map(h => (
                    <div key={h.id} className="bg-slate-50 rounded-xl border border-slate-100 px-4 py-3">
                      {editandoHijo === h.id ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nombre completo *</label>
                            <input type="text" value={formHijo.nombre} onChange={e=>setFormHijo(p=>({...p,nombre:e.target.value}))} className="input-modern text-sm mt-1 w-full" placeholder="Nombre completo"/></div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo de documento</label>
                            <select value={formHijo.tipo_documento} onChange={e=>setFormHijo(p=>({...p,tipo_documento:e.target.value}))} className="input-modern text-sm mt-1 w-full">
                              <option value="RC">Registro Civil</option><option value="TI">Tarjeta de Identidad</option>
                              <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="PA">Pasaporte</option>
                            </select></div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Número de identificación</label>
                            <input type="text" value={formHijo.numero_identificacion} onChange={e=>setFormHijo(p=>({...p,numero_identificacion:e.target.value}))} className="input-modern text-sm mt-1 w-full" placeholder="Número"/></div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Fecha de nacimiento</label>
                            <input type="date" value={formHijo.fecha_nacimiento} onChange={e=>setFormHijo(p=>({...p,fecha_nacimiento:e.target.value}))} className="input-modern text-sm mt-1 w-full"/>
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Edad</label>
                            <div className="input-modern text-sm mt-1 w-full flex items-center">
                              {formHijo.fecha_nacimiento && calcularEdad(formHijo.fecha_nacimiento) !== null
                                ? <span className="font-bold text-indigo-700">{calcularEdad(formHijo.fecha_nacimiento)} años</span>
                                : <span className="text-slate-400">Se calcula automáticamente</span>}
                            </div>
                          </div>
                          <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sexo</label>
                            <select value={formHijo.sexo} onChange={e=>setFormHijo(p=>({...p,sexo:e.target.value}))} className="input-modern text-sm mt-1 w-full">
                              <option value="">— Seleccionar —</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
                            </select></div>
                          <div className="flex items-end gap-2">
                            <button onClick={handleGuardarHijo} disabled={savingHijo} className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"><Save size={13}/> {savingHijo ? 'Guardando...' : 'Guardar'}</button>
                            <button onClick={()=>{setEditandoHijo(null);setFormHijo({})}} className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><X size={13}/> Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{h.nombre}</p>
                              {h.fecha_nacimiento && calcularEdad(h.fecha_nacimiento) !== null && (
                                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                  {calcularEdad(h.fecha_nacimiento)} años
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {h.tipo_documento}{h.numero_identificacion ? ` ${h.numero_identificacion}` : ''}{h.fecha_nacimiento ? ` · ${new Date(h.fecha_nacimiento+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'short',year:'numeric'})}` : ''}{h.sexo ? ` · ${{M:'Masculino',F:'Femenino',O:'Otro'}[h.sexo]}` : ''}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={()=>{setEditandoHijo(h.id);setFormHijo({nombre:h.nombre||'',tipo_documento:h.tipo_documento||'RC',numero_identificacion:h.numero_identificacion||'',fecha_nacimiento:h.fecha_nacimiento||'',sexo:h.sexo||''})}}
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 size={13}/></button>
                            <button onClick={()=>handleEliminarHijo(h.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {editandoHijo === 'nuevo' && (
                    <div className="bg-indigo-50 rounded-xl border border-indigo-100 px-4 py-3">
                      <p className="text-xs font-bold text-indigo-700 mb-3">Nuevo hijo</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Nombre completo *</label>
                          <input type="text" value={formHijo.nombre} onChange={e=>setFormHijo(p=>({...p,nombre:e.target.value}))} className="input-modern text-sm mt-1 w-full" placeholder="Nombre completo"/></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Tipo de documento</label>
                          <select value={formHijo.tipo_documento} onChange={e=>setFormHijo(p=>({...p,tipo_documento:e.target.value}))} className="input-modern text-sm mt-1 w-full">
                            <option value="RC">Registro Civil</option><option value="TI">Tarjeta de Identidad</option>
                            <option value="CC">Cédula de Ciudadanía</option><option value="CE">Cédula de Extranjería</option><option value="PA">Pasaporte</option>
                          </select></div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Número de identificación</label>
                          <input type="text" value={formHijo.numero_identificacion} onChange={e=>setFormHijo(p=>({...p,numero_identificacion:e.target.value}))} className="input-modern text-sm mt-1 w-full" placeholder="Número"/></div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Fecha de nacimiento</label>
                          <input type="date" value={formHijo.fecha_nacimiento} onChange={e=>setFormHijo(p=>({...p,fecha_nacimiento:e.target.value}))} className="input-modern text-sm mt-1 w-full"/>
                        </div>
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Edad</label>
                          <div className="input-modern text-sm mt-1 w-full flex items-center">
                            {formHijo.fecha_nacimiento && calcularEdad(formHijo.fecha_nacimiento) !== null
                              ? <span className="font-bold text-indigo-700">{calcularEdad(formHijo.fecha_nacimiento)} años</span>
                              : <span className="text-slate-400">Se calcula automáticamente</span>}
                          </div>
                        </div>
                        <div><label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Sexo</label>
                          <select value={formHijo.sexo} onChange={e=>setFormHijo(p=>({...p,sexo:e.target.value}))} className="input-modern text-sm mt-1 w-full">
                            <option value="">— Seleccionar —</option><option value="M">Masculino</option><option value="F">Femenino</option><option value="O">Otro</option>
                          </select></div>
                        <div className="flex items-end gap-2">
                          <button onClick={handleGuardarHijo} disabled={savingHijo} className="flex items-center gap-1 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors disabled:opacity-50"><Save size={13}/> {savingHijo ? 'Guardando...' : 'Guardar'}</button>
                          <button onClick={()=>{setEditandoHijo(null);setFormHijo({})}} className="flex items-center gap-1 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-colors"><X size={13}/> Cancelar</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            <PersonaField label="¿Tiene discapacidad?" editando={editandoPersona}
              displayValue={empleado.tiene_discapacidad ? `Sí${empleado.descripcion_discapacidad ? ` — ${empleado.descripcion_discapacidad}` : ''}` : 'No'}
              input={
                <div className="space-y-2">
                  <select value={formPersona.tiene_discapacidad ? 'si' : 'no'} onChange={e=>setFormPersona(p=>({...p,tiene_discapacidad:e.target.value==='si',descripcion_discapacidad:e.target.value==='no'?'':p.descripcion_discapacidad}))} className="input-modern text-sm w-full"><option value="no">No</option><option value="si">Sí</option></select>
                  {formPersona.tiene_discapacidad && <input type="text" value={formPersona.descripcion_discapacidad} onChange={e=>setFormPersona(p=>({...p,descripcion_discapacidad:e.target.value}))} placeholder="Descripción" className="input-modern text-sm w-full"/>}
                </div>
              }
            />
            {(empleado.tiene_discapacidad || formPersona.tiene_discapacidad) && (
              <div className="col-span-1 sm:col-span-2 lg:col-span-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">Certificado de discapacidad</p>
                {certStatus === 'ok' && <p className="text-xs text-emerald-600 mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Certificado guardado correctamente</p>}
                {certStatus === 'error' && <p className="text-xs text-red-600 mb-2 flex items-center gap-1"><AlertCircle size={12}/> Error al procesar el certificado</p>}
                {empleado.certificado_discapacidad ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <a href={empleado.certificado_discapacidad} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition-colors">
                      <ExternalLink size={13}/> Ver certificado
                    </a>
                    <label className={`flex items-center gap-2 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-200 transition-colors cursor-pointer ${subiendoCert ? 'opacity-50 pointer-events-none' : ''}`}>
                      <Upload size={13}/> Reemplazar
                      <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files[0] && handleSubirCertificado(e.target.files[0])} disabled={subiendoCert}/>
                    </label>
                    <button onClick={handleEliminarCertificado} disabled={subiendoCert}
                      className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors disabled:opacity-50">
                      <Trash2 size={13}/> Eliminar
                    </button>
                  </div>
                ) : (
                  <label className={`inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-900 rounded-lg text-xs font-semibold hover:bg-indigo-200 transition-colors cursor-pointer ${subiendoCert ? 'opacity-50 pointer-events-none' : ''}`}>
                    <Upload size={14}/> {subiendoCert ? 'Subiendo...' : 'Subir certificado (PDF, JPG, PNG)'}
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => e.target.files[0] && handleSubirCertificado(e.target.files[0])} disabled={subiendoCert}/>
                  </label>
                )}
              </div>
            )}
            <PersonaField label="Fecha de ingreso" editando={editandoPersona}
              displayValue={formatDateOnly(empleado.fecha_ingreso)}
              input={<input type="date" value={formPersona.fecha_ingreso} onChange={e=>setFormPersona(p=>({...p,fecha_ingreso:e.target.value}))} className="input-modern text-sm"/>}
            />
            <PersonaField label="Vehículo propio" editando={editandoPersona}
              displayValue={
                !empleado.tiene_vehiculo ? 'No'
                : [{'moto':'Moto','carro':'Carro','ambos':'Moto y Carro'}[empleado.tipo_vehiculo], empleado.placa_vehiculo]
                    .filter(Boolean).join(' · ') || 'Sí'
              }
              input={
                <div className="space-y-2">
                  <select
                    value={formPersona.tiene_vehiculo ? 'si' : 'no'}
                    onChange={e=>setFormPersona(p=>({...p,tiene_vehiculo:e.target.value==='si',tipo_vehiculo:e.target.value==='no'?'':p.tipo_vehiculo,placa_vehiculo:e.target.value==='no'?'':p.placa_vehiculo}))}
                    className="input-modern text-sm w-full"
                  >
                    <option value="no">No</option>
                    <option value="si">Sí</option>
                  </select>
                  {formPersona.tiene_vehiculo && (
                    <div className="grid grid-cols-2 gap-2">
                      <select value={formPersona.tipo_vehiculo} onChange={e=>setFormPersona(p=>({...p,tipo_vehiculo:e.target.value}))} className="input-modern text-sm">
                        <option value="">— Tipo —</option>
                        <option value="moto">Moto</option>
                        <option value="carro">Carro</option>
                        <option value="ambos">Moto y Carro</option>
                      </select>
                      <input type="text" value={formPersona.placa_vehiculo} onChange={e=>setFormPersona(p=>({...p,placa_vehiculo:e.target.value.toUpperCase()}))} placeholder="ABC-123" className="input-modern text-sm"/>
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </div>

        {/* ── Datos Académicos ── */}
        <div ref={seccionAcademicosRef} className={`bg-white rounded-2xl border-2 p-6 shadow-sm col-span-1 md:col-span-2 ${!academicosCompletados ? 'border-emerald-300' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <GraduationCap size={16} className="text-emerald-600" /> Datos Académicos
              {!academicosCompletados
                ? <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1"><AlertCircle size={10}/> Pendiente</span>
                : <span className="ml-2 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1"><CheckCircle2 size={10}/> Completo</span>
              }
            </h4>
            {editandoAcademico !== 'nuevo' && (
              <button onClick={handleNuevoAcademico} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors">
                <Plus size={14}/> Agregar
              </button>
            )}
          </div>

          {academicoStatus === 'ok' && <div className="mb-4 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"><CheckCircle2 size={13}/> Registro guardado correctamente</div>}
          {academicoStatus === 'error' && <div className="mb-4 flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2"><AlertCircle size={13}/> Error al guardar. Intenta de nuevo.</div>}
          {academicoStatus === 'error-campos' && <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><AlertCircle size={13}/> Nivel, título e institución son obligatorios.</div>}

          {/* Lista de registros existentes */}
          {academicos.length > 0 && (
            <div className="space-y-3 mb-4">
              {academicos.map(reg => (
                <div key={reg.id} className={`rounded-xl border p-4 ${editandoAcademico === reg.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                  {editandoAcademico === reg.id ? (
                    <FormAcademico
                      form={formAcademico}
                      onChange={setFormAcademico}
                      onGuardar={handleGuardarAcademico}
                      onCancelar={() => setEditandoAcademico(null)}
                      saving={academicoStatus === 'saving'}
                      diploma={diplomaFile}
                      onDiplomaChange={setDiplomaFile}
                    />
                  ) : (
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-500 uppercase">{NIVEL_LABELS[reg.nivel_educativo] || reg.nivel_educativo}</p>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{reg.titulo_obtenido}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{reg.institucion}{reg.ciudad_institucion ? ` · ${reg.ciudad_institucion}` : ''}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {reg.fecha_inicio ? reg.fecha_inicio.slice(0,4) : '—'}
                          {' → '}
                          {reg.en_curso ? <span className="text-emerald-600 font-medium">En curso</span> : (reg.fecha_graduacion ? reg.fecha_graduacion.slice(0,4) : '—')}
                          {reg.graduado && !reg.en_curso && <span className="ml-2 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded">Graduado</span>}
                        </p>
                        {reg.diploma_url && (
                          <a href={reg.diploma_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1.5 text-[10px] font-medium text-indigo-600 hover:text-indigo-800">
                            <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
                            Ver diploma
                          </a>
                        )}
                      </div>
                      {puedeEditarPersona && (
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button onClick={() => handleEditarAcademico(reg)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit3 size={13}/></button>
                          <button onClick={() => handleEliminarAcademico(reg.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13}/></button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Formulario de nuevo registro */}
          {editandoAcademico === 'nuevo' && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-4">
              <FormAcademico
                form={formAcademico}
                onChange={setFormAcademico}
                onGuardar={handleGuardarAcademico}
                onCancelar={() => setEditandoAcademico(null)}
                saving={academicoStatus === 'saving'}
                diploma={diplomaFile}
                onDiplomaChange={setDiplomaFile}
              />
            </div>
          )}

          {academicos.length === 0 && editandoAcademico !== 'nuevo' && (
            <p className="text-sm text-slate-400 text-center py-6">
              Aún no has registrado estudios. Usa "Agregar" para comenzar.
            </p>
          )}

          {!puedeEditarPersona && academicosCompletados && (
            <p className="mt-2 text-[10px] text-slate-400">
              Para editar o eliminar un registro existente, contacta al administrador.
            </p>
          )}
        </div>

        {/* ── Plan Carrera ── */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm col-span-1 md:col-span-2">
          <h4 className="text-sm font-bold text-[#001871] mb-5 flex items-center gap-2">
            <History size={16} className="text-[#001871]" /> Plan Carrera
          </h4>
          {historial.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">
              Aún no hay movimientos registrados.
            </p>
          ) : (
            <div className="relative">
              <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200" />
              <div className="space-y-4">
                {historial.map((mov) => (
                  <MovimientoItem key={mov.id} mov={mov} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Contacto de emergencia */}
        <div className={`bg-white rounded-2xl border-2 p-6 shadow-sm ${puedeEditarPersona ? 'border-indigo-200' : 'border-slate-100'}`}>
          <div className="flex items-center justify-between mb-5">
            <h4 className="text-sm font-bold text-[#001871] flex items-center gap-2">
              <Heart size={16} className="text-rose-500" /> Contacto de Emergencia
              {puedeEditarPersona && !editando && (
                <span className="ml-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">Edición habilitada</span>
              )}
            </h4>
            {puedeEditarPersona && !editando && (
              <button
                onClick={() => setEditando(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold uppercase hover:bg-indigo-100 transition-colors"
              >
                <Edit3 size={14} /> Editar
              </button>
            )}
            {editando && (
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
          {!puedeEditarPersona && (
            <p className="mt-4 text-[10px] text-slate-400">
              Para actualizar el contacto de emergencia, contacta al administrador.
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

const EditableSelectRow = ({ icon, label, value, displayValue, editando, onChange, options, disabled, placeholder }) => (
  <div className="flex items-center gap-3">
    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 flex-shrink-0">
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] text-slate-400 uppercase font-bold">{label}</p>
      {editando ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          disabled={disabled}
          className="w-full text-sm border border-slate-200 rounded-lg px-2 py-1 mt-0.5 outline-none focus:ring-2 focus:ring-indigo-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed bg-white"
        >
          <option value="">{placeholder || '-- Selecciona --'}</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
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

const NIVEL_COLORS = {
  0: { bg: 'bg-[#001871]', text: 'text-white', border: 'border-[#001871]', dot: 'bg-[#001871]' },
  1: { bg: 'bg-[#981d97]', text: 'text-white', border: 'border-[#981d97]', dot: 'bg-[#981d97]' },
  2: { bg: 'bg-[#00a9ce]', text: 'text-white', border: 'border-[#00a9ce]', dot: 'bg-[#00a9ce]' },
  3: { bg: 'bg-[#00bfb3]', text: 'text-white', border: 'border-[#00bfb3]', dot: 'bg-[#00bfb3]' },
  4: { bg: 'bg-[#ed8b00]', text: 'text-white', border: 'border-[#ed8b00]', dot: 'bg-[#ed8b00]' },
};

const OrganigramaModal = ({ data, loading, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
    <div
      className="relative bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-base font-bold text-[#001871] flex items-center gap-2">
            <Network size={16} /> Mi Organigrama
          </h3>
          {data?.area && <p className="text-xs text-slate-400 mt-0.5">Área: {data.area}</p>}
        </div>
        <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
          <X size={16} />
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center gap-3 py-10">
          <RefreshCw size={22} className="text-indigo-500 animate-spin" />
          <p className="text-xs text-slate-400">Cargando estructura...</p>
        </div>
      )}

      {!loading && !data && (
        <p className="text-sm text-slate-400 text-center py-8">No se pudo cargar el organigrama.</p>
      )}

      {!loading && data && (
        <div className="flex flex-col items-center gap-0">
          {data.cadena.map((nivel, i) => {
            const colors = NIVEL_COLORS[nivel.nivel] || NIVEL_COLORS[4];
            const esMiNivel = nivel.nivel === data.mi_nivel;
            return (
              <div key={nivel.nivel} className="flex flex-col items-center w-full">
                {/* Línea conectora superior */}
                {i > 0 && (
                  <div className="w-0.5 h-6 bg-slate-300" />
                )}
                {/* Nodo */}
                <div className={`w-full rounded-2xl border-2 p-3 transition-all ${
                  esMiNivel
                    ? `${colors.border} shadow-lg ring-2 ring-offset-2 ring-opacity-30`
                    : 'border-slate-200 bg-slate-50'
                }`}>
                  {/* Header del nivel */}
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide mb-2 ${
                    esMiNivel ? `${colors.bg} ${colors.text}` : 'bg-slate-200 text-slate-600'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${esMiNivel ? 'bg-white' : colors.dot}`} />
                    {nivel.label}
                    {esMiNivel && <span className="ml-1 opacity-80">← Tú</span>}
                  </div>
                  {/* Personas */}
                  <div className="space-y-1">
                    {nivel.personas.map(p => (
                      <div key={p.id} className={`flex items-center gap-2 px-2 py-1 rounded-lg ${
                        p.es_yo ? `${colors.bg} ${colors.text}` : 'text-slate-700'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                          p.es_yo ? 'bg-white/20' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {p.nombre.charAt(0)}
                        </div>
                        <span className={`text-xs font-medium truncate ${p.es_yo ? 'font-bold' : ''}`}>
                          {p.nombre}
                        </span>
                        {p.es_yo && <span className="ml-auto text-[9px] opacity-70 flex-shrink-0">Tú</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[10px] text-slate-300 mt-5 uppercase tracking-widest">
        Organigrama del área · {data?.area || '—'}
      </p>
    </div>
  </div>
);

const MOVIMIENTO_CONFIG = {
  INGRESO:          { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', Icon: LogIn,         label: 'Ingreso' },
  CAMBIO_CARGO:     { color: 'bg-[#001871]/10 text-[#001871]',  dot: 'bg-[#001871]',   Icon: TrendingUp,    label: 'Cambio de Cargo' },
  TRASLADO:         { color: 'bg-[#981d97]/10 text-[#981d97]',  dot: 'bg-[#981d97]',   Icon: ArrowRightLeft,label: 'Traslado de Área' },
  AJUSTE_SALARIAL:  { color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',    Icon: DollarSign,    label: 'Ajuste Salarial' },
  CAMBIO_CONTRATO:  { color: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-500',    Icon: FileSignature, label: 'Cambio de Contrato' },
  CAMBIO_MODALIDAD: { color: 'bg-[#00a9ce]/10 text-[#00a9ce]', dot: 'bg-[#00a9ce]',   Icon: ToggleLeft,    label: 'Cambio de Modalidad' },
  NUEVO_CONTRATO:   { color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500',   Icon: FileText,      label: 'Nuevo Contrato' },
  RENOVACION:       { color: 'bg-[#00bfb3]/10 text-[#00bfb3]', dot: 'bg-[#00bfb3]',   Icon: RefreshCw,     label: 'Renovación' },
  RETIRO:           { color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',      Icon: LogOut,        label: 'Retiro' },
  REINTEGRO:        { color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500',  Icon: LogIn,         label: 'Reintegro' },
};

const MODALIDAD_LABELS = { presencial: 'Presencial', remoto: 'Remoto', hibrido: 'Híbrido' };
const CONTRATO_LABELS  = {
  termino_fijo: 'Término Fijo', termino_indefinido: 'Término Indefinido',
  obra_labor: 'Obra o Labor', prestacion_servicios: 'Prestación de Servicios', aprendizaje: 'Aprendizaje',
};

const formatMovValue = (campo, valor) => {
  if (!valor || valor === 'None' || valor === 'null') return '—';
  if (campo === 'modalidad') return MODALIDAD_LABELS[valor] || valor;
  if (campo === 'tipo_contrato') return CONTRATO_LABELS[valor] || valor;
  return valor;
};

const MovimientoItem = ({ mov }) => {
  const cfg = MOVIMIENTO_CONFIG[mov.tipo] || { color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', Icon: History, label: mov.tipo };
  const { Icon } = cfg;
  const fecha = mov.fecha_movimiento
    ? new Date(`${mov.fecha_movimiento}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  return (
    <div className="flex gap-4 relative pl-1">
      <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center z-10 ${cfg.color}`}>
        <Icon size={15} />
      </div>
      <div className="flex-1 pb-2">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
          <span className="text-[10px] text-slate-400">{fecha}</span>
        </div>
        {mov.valor_anterior && mov.valor_nuevo ? (
          <p className="text-xs text-slate-600">
            <span className="text-slate-400 line-through mr-1">{formatMovValue(mov.campo, mov.valor_anterior)}</span>
            <span className="text-slate-300 mx-1">→</span>
            <span className="font-semibold text-slate-700">{formatMovValue(mov.campo, mov.valor_nuevo)}</span>
          </p>
        ) : mov.valor_nuevo ? (
          <p className="text-xs font-semibold text-slate-700">{formatMovValue(mov.campo, mov.valor_nuevo)}</p>
        ) : null}
        {mov.observaciones && (
          <p className="text-[11px] text-slate-400 mt-0.5">{mov.observaciones}</p>
        )}
      </div>
    </div>
  );
};

const FormAcademico = ({ form, onChange, onGuardar, onCancelar, saving, diploma, onDiplomaChange }) => {
  const set = (field, value) => onChange(prev => ({ ...prev, [field]: value }));
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Nivel educativo *</p>
          <select value={form.nivel_educativo} onChange={e => set('nivel_educativo', e.target.value)} className="input-modern text-sm w-full">
            <option value="">— Seleccionar —</option>
            {Object.entries(NIVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Título obtenido *</p>
          <input type="text" value={form.titulo_obtenido} onChange={e => set('titulo_obtenido', e.target.value)} placeholder="Ej. Ingeniería de Sistemas" className="input-modern text-sm w-full"/>
        </div>
        <div className="space-y-1 sm:col-span-2">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Institución *</p>
          <input type="text" value={form.institucion} onChange={e => set('institucion', e.target.value)} placeholder="Ej. Universidad de Antioquia" className="input-modern text-sm w-full"/>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Ciudad</p>
          <input type="text" value={form.ciudad_institucion} onChange={e => set('ciudad_institucion', e.target.value)} placeholder="Ej. Medellín" className="input-modern text-sm w-full"/>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha inicio</p>
          <input type="date" value={form.fecha_inicio} onChange={e => set('fecha_inicio', e.target.value)} className="input-modern text-sm w-full"/>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Fecha graduación</p>
          <input type="date" value={form.fecha_graduacion} onChange={e => set('fecha_graduacion', e.target.value)} disabled={form.en_curso} className="input-modern text-sm w-full disabled:opacity-50"/>
        </div>
        <div className="flex items-center gap-4 col-span-full">
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.en_curso} onChange={e => set('en_curso', e.target.checked)} className="rounded"/>
            En curso
          </label>
          <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.graduado} onChange={e => set('graduado', e.target.checked)} className="rounded"/>
            Graduado/a
          </label>
        </div>
        <div className="col-span-full space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase">Diploma / Certificado <span className="font-normal text-slate-400">(opcional)</span></p>
          <label className="flex items-center gap-2 cursor-pointer w-fit px-3 py-2 rounded-xl border border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50 transition-colors text-xs text-slate-500 hover:text-indigo-600">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            {diploma ? diploma.name : 'Subir diploma'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={e => onDiplomaChange(e.target.files[0] || null)}/>
          </label>
          {diploma && (
            <button onClick={() => onDiplomaChange(null)} className="text-[10px] text-red-500 hover:text-red-700 mt-0.5">× quitar archivo</button>
          )}
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button onClick={onGuardar} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-xs font-bold uppercase hover:bg-emerald-100 transition-colors disabled:opacity-50">
          <Save size={13}/> {saving ? 'Guardando...' : 'Guardar'}
        </button>
        <button onClick={onCancelar} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold uppercase hover:bg-slate-200 transition-colors">
          <X size={13}/> Cancelar
        </button>
      </div>
    </div>
  );
};

export default UserProfile;
