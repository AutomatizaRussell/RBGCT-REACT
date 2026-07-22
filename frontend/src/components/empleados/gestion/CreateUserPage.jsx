import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Mail, Shield, Briefcase, Loader2, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { getAllAreas, crearUsuarioSuperAdmin, getAllCargos } from '../../../lib/api';

// Roles del sistema según id_permisos
const ROLES = [
  { id: 1, nombre: 'Administrador', descripcion: 'Gestión completa de usuarios y sistema' },
  { id: 2, nombre: 'Editor', descripcion: 'Edición de contenido y gestión limitada' },
  { id: 3, nombre: 'Usuario', descripcion: 'Acceso estándar al portal' }
];

const TIPOS_DOCUMENTO = [
  { id: 'CC', nombre: 'Cédula de Ciudadanía' },
  { id: 'CE', nombre: 'Cédula de Extranjería' },
  { id: 'PA', nombre: 'Pasaporte' },
  { id: 'TI', nombre: 'Tarjeta de Identidad' }
];

const CreateUserPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, empleadoData } = useAuth();

  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingCargos, setLoadingCargos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [codigoVerificacion, setCodigoVerificacion] = useState('');
  const [nuevoUsuarioEmail, setNuevoUsuarioEmail] = useState('');

  // Form data: datos de autenticación + opcionales datos básicos
  const [formData, setFormData] = useState({
    admin_password: '',
    correo_corporativo: '',
    password: '',
    confirmPassword: '',
    id_permisos: 3, // Default: Usuario
    crearConDatosBasicos: false,
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    apodo: '',
    tipo_documento: 'CC',
    numero_documento: '',
    fecha_ingreso: '',
    area_id: '',
    cargo_id: ''
  });

  // Cargar áreas y cargos al montar
  useEffect(() => {
    const loadAreas = async () => {
      try {
        const areasData = await getAllAreas();
        setAreas(areasData);
      } catch (err) {
        console.error('Error cargando áreas:', err);
      } finally {
        setLoadingAreas(false);
      }
    };
    const loadCargos = async () => {
      try {
        const cargosData = await getAllCargos();
        setCargos(cargosData);
      } catch (err) {
        console.error('Error cargando cargos:', err);
      } finally {
        setLoadingCargos(false);
      }
    };
    loadAreas();
    loadCargos();
  }, []);

  const getBackPath = () => {
    if (location.pathname.startsWith('/superadmin')) return '/superadmin';
    return '/admin';
  };

  const handleBack = () => {
    navigate(getBackPath());
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
      // Resetear cargo cuando cambia el área para evitar cargos inválidos
      ...(name === 'area_id' ? { cargo_id: '' } : {})
    }));
  };

  const areaSeleccionada = areas.find(a => String(a.id_area) === String(formData.area_id));
  const esRevisoria = areaSeleccionada?.nombre_area?.toLowerCase().includes('revisoría') || false;

  const NIVELNES_REVISORIA = ['Semi-Senior', 'Asistente'];
  const NIVELES_OTRAS = ['Líder de Equipo', 'Analista'];

  const filteredCargos = formData.area_id
    ? cargos.filter(c => {
        if (esRevisoria) return !NIVELES_OTRAS.some(n => c.nivel?.startsWith(n));
        return !NIVELNES_REVISORIA.some(n => c.nivel?.startsWith(n));
      })
    : cargos;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validaciones comunes de autenticación
    if (!formData.admin_password) {
      setError('Debe ingresar su contraseña de administrador para confirmar');
      return;
    }
    if (!formData.correo_corporativo || !formData.password) {
      setError('Correo corporativo y contraseña del nuevo usuario son obligatorios');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas del nuevo usuario no coinciden');
      return;
    }
    if (formData.password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres');
      return;
    }
    // Validar política de contraseña del backend
    const hasLower = /[a-z]/.test(formData.password);
    const hasUpper = /[A-Z]/.test(formData.password);
    const hasDigit = /\d/.test(formData.password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>[\]\\\-_=+`~'";]/.test(formData.password);
    if (!hasLower || !hasUpper || !hasDigit || !hasSpecial) {
      setError('La contraseña debe incluir mayúscula, minúscula, número y carácter especial');
      return;
    }

    // Validaciones de datos básicos solo si se seleccionó esa opción
    if (formData.crearConDatosBasicos) {
      if (!formData.primer_nombre || !formData.primer_apellido) {
        setError('Nombre y apellido del colaborador son obligatorios');
        return;
      }
      if (!formData.tipo_documento || !formData.numero_documento) {
        setError('Tipo y número de documento son obligatorios');
        return;
      }
      if (!formData.area_id) {
        setError('Debe seleccionar un área/departamento');
        return;
      }
      if (!formData.cargo_id) {
        setError('Debe seleccionar un cargo');
        return;
      }
    }

    setSaving(true);

    try {
      // Preparar datos base
      const userData = {
        correo_corporativo: formData.correo_corporativo,
        password: formData.password,
        id_permisos: parseInt(formData.id_permisos)
      };

      // Si eligió datos básicos, agregarlos
      if (formData.crearConDatosBasicos) {
        Object.assign(userData, {
          primer_nombre: formData.primer_nombre,
          segundo_nombre: formData.segundo_nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido,
          apodo: formData.apodo,
          tipo_documento: formData.tipo_documento,
          numero_documento: formData.numero_documento,
          fecha_ingreso: formData.fecha_ingreso || null,
          area_id: formData.area_id ? parseInt(formData.area_id) : null,
          cargo_id: formData.cargo_id ? parseInt(formData.cargo_id) : null
        });
      }

      const result = await crearUsuarioSuperAdmin(
        empleadoData?.correo_corporativo || user?.email,
        formData.admin_password,
        userData
      );

      setSuccess(true);
      setCodigoVerificacion(result.codigo_verificacion || '');
      setNuevoUsuarioEmail(result.correo_corporativo || '');
    } catch (err) {
      setError(err.message || 'Error al crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 sm:p-10 animate-in fade-in duration-500">
      {/* BOTÓN REGRESAR */}
      <button
        type="button"
        onClick={handleBack}
        className="flex items-center gap-2 text-slate-400 hover:text-[#001871] mb-6 text-sm font-bold transition-colors group"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        Volver a la lista
      </button>

      {/* MENSAJES */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-6">
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm flex items-center gap-2 mb-4">
            <Check size={16} />
            Usuario creado exitosamente
          </div>

          {codigoVerificacion && (
            <div className="p-6 bg-[#001871] rounded-2xl text-white">
              <p className="text-sm text-white/70 mb-3">
                Comparte este código con el usuario para su primer login:
              </p>
              <div className="flex items-center justify-between bg-white/10 rounded-xl p-4 mb-4">
                <span className="text-4xl font-bold tracking-[0.3em]">
                  {codigoVerificacion}
                </span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(codigoVerificacion);
                    alert('Código copiado al portapapeles');
                  }}
                  className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-semibold transition-colors"
                >
                  Copiar
                </button>
              </div>
              <p className="text-xs text-white/60">
                Email: {nuevoUsuarioEmail}
              </p>
              <button
                onClick={handleBack}
                className="mt-4 w-full py-3 bg-white text-[#001871] rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                Volver a usuarios
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {/* CABECERA FORMULARIO */}
        <div className="p-5 sm:p-10 border-b border-slate-50">
          <h3 className="text-xl font-black text-[#001871]">Nuevo Registro</h3>
          <p className="text-slate-400 text-sm mt-1">Alta de colaborador en el sistema GCT.</p>
        </div>

        {/* CUERPO FORMULARIO */}
        <form className="p-4 sm:p-10 space-y-6 sm:space-y-8" onSubmit={handleSubmit} autoComplete="off" translate="no">

          {/* OPCIÓN: CREAR CON DATOS BÁSICOS O MÍNIMOS */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="crearConDatosBasicos"
                checked={formData.crearConDatosBasicos}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-[#001871] rounded border-slate-300 focus:ring-[#001871]"
              />
              <div>
                <span className="font-medium text-[#001871]">Crear usuario con datos básicos</span>
                <p className="text-xs text-slate-500 mt-1">
                  Si no se selecciona, se creará solo con correo y contraseña.
                  El usuario deberá completar sus datos en el primer login.
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
            {/* EMAIL - SIEMPRE REQUERIDO */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Mail size={12} /> Correo Corporativo *
              </label>
              <input
                required
                type="email"
                name="correo_corporativo"
                value={formData.correo_corporativo}
                onChange={handleChange} autoComplete="off"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                placeholder="usuario@russellbedford.com.co"
              />
            </div>

            {/* CONTRASEÑA - SIEMPRE REQUERIDA */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Shield size={12} /> Contraseña Temporal *
              </label>
              <input
                required
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange} autoComplete="new-password"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                placeholder="Mínimo 8 caracteres, mayúscula, minúscula, número y especial"
              />
            </div>

            {/* CONFIRMAR CONTRASEÑA */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Shield size={12} /> Confirmar Contraseña *
              </label>
              <input
                required
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange} autoComplete="new-password"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                placeholder="Repite la contraseña"
              />
            </div>

            {/* CONTRASEÑA DEL ADMIN - PARA VERIFICAR IDENTIDAD */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Shield size={12} /> Tu Contraseña (Verificación) *
              </label>
              <input
                required
                type="password"
                name="admin_password"
                value={formData.admin_password}
                onChange={handleChange} autoComplete="current-password"
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                placeholder="Ingresa tu contraseña de SuperAdmin"
              />
              <p className="text-[10px] text-slate-400 ml-1">Requerida para verificar tu identidad</p>
            </div>

            {/* ROL - SIEMPRE REQUERIDO */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Shield size={12} /> Rol del Sistema *
              </label>
              <div className="relative">
                <select
                  required
                  name="id_permisos"
                  value={formData.id_permisos}
                  onChange={handleChange}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] appearance-none text-sm font-medium cursor-pointer"
                >
                  {ROLES.map(rol => (
                    <option key={rol.id} value={rol.id}>
                      {rol.nombre}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Shield size={14} />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 ml-1">
                {ROLES.find(r => r.id === parseInt(formData.id_permisos))?.descripcion}
              </p>
            </div>
          </div>

          {/* DATOS BÁSICOS - SOLO SI SE SELECCIONÓ */}
          {formData.crearConDatosBasicos && (
            <div className="pt-6 border-t border-slate-100">
              <h4 className="text-sm font-bold text-[#001871] mb-6">Datos Básicos del Colaborador</h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
                {/* NOMBRES */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Primer Nombre *
                  </label>
                  <input
                    required={formData.crearConDatosBasicos}
                    type="text"
                    name="primer_nombre"
                    value={formData.primer_nombre}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. Juan"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Segundo Nombre
                  </label>
                  <input
                    type="text"
                    name="segundo_nombre"
                    value={formData.segundo_nombre}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. Carlos"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Apodo / Nombre de Usuario
                  </label>
                  <input
                    type="text"
                    name="apodo"
                    value={formData.apodo}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. Juancho, JG, Stiben..."
                  />
                  <p className="text-[10px] text-slate-400 ml-1">Cómo prefiere ser llamado/a en el sistema</p>
                </div>

                {/* APELLIDOS */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Primer Apellido *
                  </label>
                  <input
                    required={formData.crearConDatosBasicos}
                    type="text"
                    name="primer_apellido"
                    value={formData.primer_apellido}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. García"
                  />
                </div>

                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Segundo Apellido
                  </label>
                  <input
                    type="text"
                    name="segundo_apellido"
                    value={formData.segundo_apellido}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. López"
                  />
                </div>

                {/* TIPO DE DOCUMENTO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Tipo de Documento *
                  </label>
                  <div className="relative">
                    <select
                      required={formData.crearConDatosBasicos}
                      name="tipo_documento"
                      value={formData.tipo_documento}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] appearance-none text-sm font-medium cursor-pointer"
                    >
                      {TIPOS_DOCUMENTO.map(tipo => (
                        <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <User size={14} />
                    </div>
                  </div>
                </div>

                {/* NÚMERO DE DOCUMENTO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <User size={12} /> Número de Documento *
                  </label>
                  <input
                    required={formData.crearConDatosBasicos}
                    type="text"
                    name="numero_documento"
                    value={formData.numero_documento}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                    placeholder="Ej. 1234567890"
                  />
                </div>

                {/* FECHA DE INGRESO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <Briefcase size={12} /> Fecha de Ingreso
                  </label>
                  <input
                    type="date"
                    name="fecha_ingreso"
                    value={formData.fecha_ingreso}
                    onChange={handleChange} autoComplete="off"
                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] focus:bg-white transition-all text-sm font-medium"
                  />
                </div>

                {/* ÁREA/DEPARTAMENTO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <Briefcase size={12} /> Área / Departamento *
                  </label>
                  <div className="relative">
                    {loadingAreas ? (
                      <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Cargando áreas...
                      </div>
                    ) : (
                      <select
                        required={formData.crearConDatosBasicos}
                        name="area_id"
                        value={formData.area_id}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] appearance-none text-sm font-medium cursor-pointer"
                      >
                        <option value="">Seleccionar área...</option>
                        {areas.map(area => (
                          <option key={area.id_area} value={area.id_area}>
                            {area.nombre_area}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Briefcase size={14} />
                    </div>
                  </div>
                </div>

                {/* CARGO */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                    <Briefcase size={12} /> Cargo *
                  </label>
                  <div className="relative">
                    {loadingCargos ? (
                      <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400 flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        Cargando cargos...
                      </div>
                    ) : (
                      <select
                        required={formData.crearConDatosBasicos}
                        name="cargo_id"
                        value={formData.cargo_id}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001871] appearance-none text-sm font-medium cursor-pointer"
                      >
                        <option value="">
                          {formData.area_id ? 'Seleccionar cargo...' : 'Primero selecciona un área'}
                        </option>
                        {filteredCargos.map(cargo => (
                          <option key={cargo.id_cargo} value={cargo.id_cargo}>
                            {cargo.nombre_cargo}
                          </option>
                        ))}
                      </select>
                    )}
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <Briefcase size={14} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ACCIONES FINAL */}
          <div className="flex justify-end items-center gap-6 pt-6 border-t border-slate-50">
            <button
              type="button"
              onClick={handleBack}
              disabled={saving}
              className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#001871] text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {formData.crearConDatosBasicos ? 'Crear Usuario' : 'Crear Usuario (Datos Mínimos)'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserPage;
