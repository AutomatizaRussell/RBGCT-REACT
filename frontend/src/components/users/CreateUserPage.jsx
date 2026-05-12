import { useState, useEffect } from 'react';
import { ArrowLeft, Save, User, Mail, Shield, Briefcase, Loader2, Check } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getAllAreas, crearUsuarioSuperAdmin, getAllCargos } from '../../lib/api';

// Roles del sistema según id_permisos
const ROLES = [
  { id: 1, nombre: 'Administrador', descripcion: 'Gestión completa de usuarios y sistema' },
  { id: 2, nombre: 'Editor', descripcion: 'Edición de contenido y gestión limitada' },
  { id: 3, nombre: 'Usuario', descripcion: 'Acceso estándar al portal' }
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
  
  // Form data
  const [formData, setFormData] = useState({
    // Datos de autenticación del admin
    admin_password: '',
    // Datos mínimos requeridos del nuevo usuario
    correo_corporativo: '',
    password: '',
    confirmPassword: '',
    id_permisos: 3, // Default: Usuario
    
    // Datos completos (opcionales)
    crearCompleto: false,
    primer_nombre: '',
    segundo_nombre: '',
    primer_apellido: '',
    segundo_apellido: '',
    apodo: '',
    correo_personal: '',
    telefono: '',
    telefono_emergencia: '',
    nombre_contacto_emergencia: '',
    parentesco_emergencia: '',
    fecha_nacimiento: '',
    fecha_ingreso: '',
    direccion: '',
    sexo: '',
    tipo_sangre: '',
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
    if (location.pathname.startsWith('/admin2')) return '/admin2';
    return '/admin';
  };

  const handleBack = () => {
    navigate(getBackPath());
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validaciones
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

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    // Validar datos completos si se seleccionó crear completo
    if (formData.crearCompleto) {
      if (!formData.primer_nombre || !formData.primer_apellido) {
        setError('Nombre y apellido son obligatorios para creación completa');
        return;
      }
      if (!formData.area_id) {
        setError('Debe seleccionar un área/departamento');
        return;
      }
    }

    setSaving(true);

    try {
      // Preparar datos para enviar
      const userData = {
        correo_corporativo: formData.correo_corporativo,
        password: formData.password,
        id_permisos: parseInt(formData.id_permisos)
      };

      // Si es creación completa, agregar todos los datos
      if (formData.crearCompleto) {
        Object.assign(userData, {
          primer_nombre: formData.primer_nombre,
          segundo_nombre: formData.segundo_nombre,
          primer_apellido: formData.primer_apellido,
          segundo_apellido: formData.segundo_apellido,
          apodo: formData.apodo,
          correo_personal: formData.correo_personal,
          telefono: formData.telefono,
          telefono_emergencia: formData.telefono_emergencia,
          nombre_contacto_emergencia: formData.nombre_contacto_emergencia,
          parentesco_emergencia: formData.parentesco_emergencia,
          fecha_nacimiento: formData.fecha_nacimiento,
          fecha_ingreso: formData.fecha_ingreso,
          direccion: formData.direccion,
          sexo: formData.sexo,
          tipo_sangre: formData.tipo_sangre,
          area_id: formData.area_id ? parseInt(formData.area_id) : null,
          cargo_id: formData.cargo_id ? parseInt(formData.cargo_id) : null
        });
      }

      // Llamar a la API
      const result = await crearUsuarioSuperAdmin(
        empleadoData?.correo_corporativo || user?.email,
        formData.admin_password, // Contraseña del admin para verificar
        userData
      );

      setSuccess(true);
      setCodigoVerificacion(result.codigo_verificacion || '');
      setNuevoUsuarioEmail(result.correo_corporativo || '');
      console.log('Usuario creado:', result);
      // No redirigir automáticamente - mostrar código al admin

    } catch (err) {
      setError(err.message || 'Error al crear el usuario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-10 animate-in fade-in duration-500">
      {/* BOTÓN REGRESAR */}
      <button 
        type="button"
        onClick={handleBack} 
        className="flex items-center gap-2 text-slate-400 hover:text-[#001e33] mb-6 text-sm font-bold transition-colors group"
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
          {/* Éxito básico */}
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-600 text-sm flex items-center gap-2 mb-4">
            <Check size={16} />
            Usuario creado exitosamente
          </div>
          
          {/* Código de verificación */}
          {codigoVerificacion && (
            <div className="p-6 bg-[#001e33] rounded-2xl text-white">
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
                className="mt-4 w-full py-3 bg-white text-[#001e33] rounded-xl font-semibold hover:bg-white/90 transition-colors"
              >
                Volver a usuarios
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {/* CABECERA FORMULARIO */}
        <div className="p-10 border-b border-slate-50">
          <h3 className="text-xl font-black text-[#001e33]">Nuevo Registro</h3>
          <p className="text-slate-400 text-sm mt-1">Alta de colaborador en el sistema GCT.</p>
        </div>

        {/* CUERPO FORMULARIO */}
        <form className="p-10 space-y-8" onSubmit={handleSubmit}>
          
          {/* OPCIÓN: CREAR CON DATOS COMPLETOS O MÍNIMOS */}
          <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="crearCompleto"
                checked={formData.crearCompleto}
                onChange={handleChange}
                className="mt-1 w-4 h-4 text-[#001e33] rounded border-slate-300 focus:ring-[#001e33]"
              />
              <div>
                <span className="font-medium text-[#001e33]">Crear usuario con datos completos</span>
                <p className="text-xs text-slate-500 mt-1">
                  Si no se selecciona, se creará solo con correo y contraseña. 
                  El usuario deberá completar sus datos en el primer login.
                </p>
              </div>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-8">
            
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
                onChange={handleChange}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
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
                onChange={handleChange}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                placeholder="Mínimo 6 caracteres" 
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
                onChange={handleChange}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
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
                onChange={handleChange}
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
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
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer"
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

          {/* DATOS COMPLETOS - SOLO SI SE SELECCIONÓ */}
          {formData.crearCompleto && (
            <>
              <div className="pt-6 border-t border-slate-100">
                <h4 className="text-sm font-bold text-[#001e33] mb-6">Datos Personales Completos</h4>
                
                <div className="grid grid-cols-2 gap-8">
                  {/* NOMBRES */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Primer Nombre *
                    </label>
                    <input 
                      required={formData.crearCompleto}
                      type="text"
                      name="primer_nombre"
                      value={formData.primer_nombre}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Ej. Juan" 
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
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Ej. Juancho, JG, Stiben..." 
                    />
                    <p className="text-[10px] text-slate-400 ml-1">Cómo prefiere ser llamado/a en el sistema</p>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Segundo Nombre
                    </label>
                    <input 
                      type="text"
                      name="segundo_nombre"
                      value={formData.segundo_nombre}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Ej. Carlos" 
                    />
                  </div>

                  {/* APELLIDOS */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Primer Apellido *
                    </label>
                    <input 
                      required={formData.crearCompleto}
                      type="text"
                      name="primer_apellido"
                      value={formData.primer_apellido}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
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
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Ej. López" 
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
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
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
                          required={formData.crearCompleto}
                          name="area_id"
                          onChange={handleChange}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer"
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
                          required={formData.crearCompleto}
                          name="cargo_id"
                          value={formData.cargo_id}
                          onChange={handleChange}
                          className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer"
                        >
                          <option value="">Seleccionar cargo...</option>
                          {cargos.map(cargo => (
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

                  {/* TELÉFONO */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <Briefcase size={12} /> Teléfono
                    </label>
                    <input 
                      type="tel"
                      name="telefono"
                      value={formData.telefono}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Ej. 300 123 4567" 
                    />
                  </div>

                  {/* CONTACTO EMERGENCIA */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <Briefcase size={12} /> Nombre Contacto Emergencia
                    </label>
                    <input
                      type="text"
                      name="nombre_contacto_emergencia"
                      value={formData.nombre_contacto_emergencia}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
                      placeholder="Ej. María García"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <Briefcase size={12} /> Teléfono Emergencia
                    </label>
                    <input
                      type="tel"
                      name="telefono_emergencia"
                      value={formData.telefono_emergencia}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
                      placeholder="Ej. 300 999 8888"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <Briefcase size={12} /> Parentesco
                    </label>
                    <input
                      type="text"
                      name="parentesco_emergencia"
                      value={formData.parentesco_emergencia}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
                      placeholder="Ej. Madre, Esposo, Hermano..."
                    />
                  </div>

                  {/* FECHA NACIMIENTO */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Fecha de Nacimiento
                    </label>
                    <input 
                      type="date"
                      name="fecha_nacimiento"
                      value={formData.fecha_nacimiento}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                    />
                  </div>

                  {/* CORREO PERSONAL */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <Mail size={12} /> Correo Personal
                    </label>
                    <input 
                      type="email"
                      name="correo_personal"
                      value={formData.correo_personal}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="personal@email.com" 
                    />
                  </div>

                  {/* DIRECCIÓN */}
                  <div className="space-y-2 col-span-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Dirección
                    </label>
                    <input 
                      type="text"
                      name="direccion"
                      value={formData.direccion}
                      onChange={handleChange}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                      placeholder="Calle, número, ciudad..." 
                    />
                  </div>

                  {/* SEXO */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Sexo
                    </label>
                    <div className="relative">
                      <select
                        name="sexo"
                        value={formData.sexo}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Otro</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <User size={14} />
                      </div>
                    </div>
                  </div>

                  {/* TIPO DE SANGRE */}
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                      <User size={12} /> Tipo de Sangre
                    </label>
                    <div className="relative">
                      <select
                        name="tipo_sangre"
                        value={formData.tipo_sangre}
                        onChange={handleChange}
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer"
                      >
                        <option value="">Seleccionar...</option>
                        <option value="A+">A+</option>
                        <option value="A-">A-</option>
                        <option value="B+">B+</option>
                        <option value="B-">B-</option>
                        <option value="AB+">AB+</option>
                        <option value="AB-">AB-</option>
                        <option value="O+">O+</option>
                        <option value="O-">O-</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                        <User size={14} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
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
              className="bg-[#001e33] text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  {formData.crearCompleto ? 'Guardar Registro Completo' : 'Crear Usuario (Datos Mínimos)'}
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