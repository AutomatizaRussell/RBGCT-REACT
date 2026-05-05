import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { User, Mail, Phone, Calendar, MapPin, Briefcase, Loader2, Check, ArrowRight } from 'lucide-react';
import { getAllAreas, getAllCargos, getEmpleadoById } from '../lib/db';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { empleadoData, completarDatos, logout } = useAuth();
  
  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingCargos, setLoadingCargos] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [hasUpdated, setHasUpdated] = useState(false); // Controla si ya se actualizó con el permiso
  const [checkingPermission, setCheckingPermission] = useState(true);
  
  // Form data
  const [formData, setFormData] = useState({
    // Paso 1: Datos básicos obligatorios
    primer_nombre: empleadoData?.primer_nombre || '',
    segundo_nombre: empleadoData?.segundo_nombre || '',
    primer_apellido: empleadoData?.primer_apellido || '',
    segundo_apellido: empleadoData?.segundo_apellido || '',
    apodo: empleadoData?.apodo || '',
    
    // Paso 2: Datos de contacto
    correo_personal: empleadoData?.correo_personal || '',
    telefono: empleadoData?.telefono || '',
    telefono_emergencia: empleadoData?.telefono_emergencia || '',
    direccion: empleadoData?.direccion || '',
    
    // Paso 3: Datos personales
    fecha_nacimiento: empleadoData?.fecha_nacimiento || '',
    fecha_ingreso: empleadoData?.fecha_ingreso || '',
    sexo: empleadoData?.sexo || '',
    tipo_sangre: empleadoData?.tipo_sangre || '',
    area_id: empleadoData?.area_id || '',
    cargo_id: empleadoData?.cargo_id || '',
    // Contraseña (opcional, solo para cambiar en primer login)
    nueva_password: '',
    confirmar_password: '',
    // Contraseña actual (requerida cuando se edita con permiso)
    current_password: ''
  });

  // Debug empleadoData
  useEffect(() => {
    console.log('[COMPLETE PROFILE] empleadoData:', {
      primer_login: empleadoData?.primer_login,
      permitir_edicion_datos: empleadoData?.permitir_edicion_datos,
      datos_completados: empleadoData?.datos_completados,
      id_empleado: empleadoData?.id_empleado,
      correo: empleadoData?.correo_corporativo
    });
  }, [empleadoData]);

  // Verificar permisos en tiempo real desde el backend
  useEffect(() => {
    console.log('[COMPLETE PROFILE] Componente montado, empleadoData:', empleadoData);
    const checkPermission = async () => {
      if (!empleadoData?.id_empleado) {
        setCheckingPermission(false);
        return;
      }

      try {
        // Consultar estado actual en el backend
        const currentData = await getEmpleadoById(empleadoData.id_empleado);
        
        if (currentData) {
          console.log('[COMPLETE PROFILE] Permiso verificado desde backend:', {
            permitir_edicion_datos: currentData.permitir_edicion_datos,
            datos_completados: currentData.datos_completados,
            primer_login: currentData.primer_login
          });

          // Si NO tiene permiso y ya completó datos, mostrar mensaje de solo lectura
          // (No redirigir - permitir acceso a ver datos)
          if (currentData.datos_completados && !currentData.permitir_edicion_datos && !currentData.primer_login) {
            console.log('[COMPLETE PROFILE] Solo lectura - sin permiso de edición');
            setSoloLectura(true);
          }

          // Si ya usó el permiso (datos_completados=true y permitir_edicion_datos=false)
          // y no es primer login, significa que ya actualizó
          if (currentData.datos_completados && !currentData.permitir_edicion_datos && !currentData.primer_login) {
            setHasUpdated(true);
          }
        }
      } catch (err) {
        console.error('[COMPLETE PROFILE] Error verificando permisos:', err);
      } finally {
        setCheckingPermission(false);
      }
    };

    checkPermission();
  }, [empleadoData, navigate]);

  // Cargar áreas y cargos
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

  // Verificar si ya completó datos o tiene permiso para editar
  useEffect(() => {
    // Solo redirigir si datos_completados es true Y NO tiene permiso de edición
    if (empleadoData?.datos_completados && !empleadoData?.permitir_edicion_datos) {
      // Redirigir al dashboard correspondiente
      const role = localStorage.getItem('gct_role');
      switch (role) {
        case 'superadmin': navigate('/admin'); break;
        case 'admin': navigate('/admin2'); break;
        case 'editor': navigate('/editor'); break;
        default: navigate('/app');
      }
    }
  }, [empleadoData, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleNext = () => {
    // Validar paso 1
    if (step === 1) {
      if (!formData.primer_nombre || !formData.primer_apellido) {
        setError('Nombre y apellido son obligatorios');
        return;
      }
    }
    setError(null);
    setStep(step + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep(step - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!formData.area_id) {
      setError('Debe seleccionar un área/departamento');
      return;
    }
    if (!formData.cargo_id) {
      setError('Debe seleccionar un cargo');
      return;
    }

    setSaving(true);
    
    try {
      // Preparar datos a enviar
      const datosAEnviar = {
        primer_nombre: formData.primer_nombre,
        segundo_nombre: formData.segundo_nombre,
        primer_apellido: formData.primer_apellido,
        segundo_apellido: formData.segundo_apellido,
        apodo: formData.apodo,
        correo_personal: formData.correo_personal,
        telefono: formData.telefono,
        telefono_emergencia: formData.telefono_emergencia,
        direccion: formData.direccion,
        fecha_nacimiento: formData.fecha_nacimiento,
        fecha_ingreso: formData.fecha_ingreso || null,
        sexo: formData.sexo,
        tipo_sangre: formData.tipo_sangre,
        area_id: formData.area_id ? parseInt(formData.area_id) : null,
        cargo_id: formData.cargo_id ? parseInt(formData.cargo_id) : null,
      };

      // Agregar nueva contraseña solo si el usuario la ingresó y coincide
      console.log('[COMPLETE PROFILE] Passwords:', {
        nueva: formData.nueva_password,
        confirma: formData.confirmar_password,
        match: formData.nueva_password === formData.confirmar_password,
        hasValue: !!formData.nueva_password
      });
      if (formData.nueva_password && formData.nueva_password === formData.confirmar_password) {
        datosAEnviar.nueva_password = formData.nueva_password;
        console.log('[COMPLETE PROFILE] Password incluida en datos');
      } else {
        console.log('[COMPLETE PROFILE] Password NO incluida');
      }

      // Si NO es primer login y tiene permiso de edición, agregar contraseña actual
      const isEditingWithPermission = !empleadoData?.primer_login && empleadoData?.permitir_edicion_datos;
      if (isEditingWithPermission) {
        if (!formData.current_password) {
          setError('Debes ingresar tu contraseña actual para actualizar los datos');
          setSaving(false);
          return;
        }
        // El backend espera 'password', no 'current_password'
        datosAEnviar.password = formData.current_password;
        console.log('[COMPLETE PROFILE] Agregando password para validación');
      }

      console.log('[COMPLETE PROFILE] Datos a enviar:', datosAEnviar);
      const result = await completarDatos(datosAEnviar);
      
      // Si se revocó el permiso, mostrar mensaje
      if (result?.mensaje) {
        alert(result.mensaje);
      }
      
      // Redirigir al dashboard
      const role = localStorage.getItem('gct_role');
      switch (role) {
        case 'superadmin': navigate('/admin'); break;
        case 'admin': navigate('/admin2'); break;
        case 'editor': navigate('/editor'); break;
        default: navigate('/app');
      }
    } catch (err) {
      setError(err.message || 'Error al guardar los datos');
    } finally {
      setSaving(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#001e33]">Datos Básicos</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <User size={12} /> Primer Nombre *
          </label>
          <input
            required
            type="text"
            name="primer_nombre"
            value={formData.primer_nombre}
            onChange={handleChange}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
            placeholder="Ej. Juan"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <User size={12} /> Primer Apellido *
          </label>
          <input
            required
            type="text"
            name="primer_apellido"
            value={formData.primer_apellido}
            onChange={handleChange}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
            placeholder="Ej. García"
          />
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
        
        <div className="space-y-2 col-span-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <User size={12} /> Apodo / Cómo desea ser llamado
          </label>
          <input
            type="text"
            name="apodo"
            value={formData.apodo}
            onChange={handleChange}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
            placeholder="Ej. Juancho, JG, Stiben..."
          />
          <p className="text-[10px] text-slate-400">Este será su nombre de usuario visible en el sistema</p>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#001e33]">Datos de Contacto</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
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
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Phone size={12} /> Teléfono
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
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Phone size={12} /> Teléfono Emergencia
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
        
        <div className="space-y-2 col-span-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <MapPin size={12} /> Dirección
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
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-[#001e33]">Datos Personales</h3>
      
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Calendar size={12} /> Fecha de Nacimiento
          </label>
          <input
            type="date"
            name="fecha_nacimiento"
            value={formData.fecha_nacimiento}
            onChange={handleChange}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Calendar size={12} /> Fecha de Ingreso
          </label>
          <input
            type="date"
            name="fecha_ingreso"
            value={formData.fecha_ingreso}
            onChange={handleChange}
            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <User size={12} /> Sexo
          </label>
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
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <User size={12} /> Tipo de Sangre
          </label>
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
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Briefcase size={12} /> Área / Departamento *
          </label>
          <div className="relative">
            {loadingAreas ? (
              <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400">
                Cargando áreas...
              </div>
            ) : (
              <select
                required
                name="area_id"
                value={formData.area_id}
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
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <Briefcase size={12} /> Cargo *
          </label>
          <div className="relative">
            {loadingCargos ? (
              <div className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm text-slate-400">
                Cargando cargos...
              </div>
            ) : (
              <select
                required
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
          </div>
        </div>

        {/* Contraseña Actual - Requerida cuando se edita con permiso */}
        {!empleadoData?.primer_login && empleadoData?.permitir_edicion_datos && (
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
            <h4 className="text-sm font-bold text-[#001e33] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Validación Requerida
            </h4>
            <p className="text-xs text-amber-700 mb-4">
              Para actualizar tus datos, debes ingresar tu contraseña actual. 
              <strong>Nota:</strong> Después de esta actualización, el permiso se revocará automáticamente.
            </p>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Contraseña Actual <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                name="current_password"
                value={formData.current_password}
                onChange={handleChange}
                placeholder="Ingresa tu contraseña actual"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
                required={!empleadoData?.primer_login && empleadoData?.permitir_edicion_datos}
              />
            </div>
          </div>
        )}

        {/* Contraseña - Solo en primer login */}
        {empleadoData?.primer_login && (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
            <h4 className="text-sm font-bold text-[#001e33] mb-4 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Cambiar Contraseña (Opcional)
            </h4>
            <p className="text-xs text-slate-500 mb-4">
              Puedes cambiar tu contraseña temporal ahora. Si prefieres, puedes mantener la actual.
            </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Nueva Contraseña
              </label>
              <input
                type="password"
                value={formData.nueva_password}
                onChange={(e) => setFormData({...formData, nueva_password: e.target.value})}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                Confirmar Contraseña
              </label>
              <input
                type="password"
                value={formData.confirmar_password}
                onChange={(e) => setFormData({...formData, confirmar_password: e.target.value})}
                placeholder="Repite la contraseña"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
              />
            </div>
          </div>
          
          {formData.nueva_password && formData.nueva_password !== formData.confirmar_password && (
            <p className="text-xs text-red-500 mt-2">Las contraseñas no coinciden</p>
          )}
        </div>
        )}
        
      </div>
    </div>
  );

  // Mostrar loading mientras se verifica el permiso
  if (checkingPermission) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 size={40} className="animate-spin mx-auto mb-4 text-[#001e33]" />
          <p className="text-slate-500 text-sm">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  // Mostrar mensaje si ya usó el permiso y no es primer login
  if (hasUpdated || (!empleadoData?.primer_login && !empleadoData?.permitir_edicion_datos && empleadoData?.datos_completados)) {
    return (
      <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl p-8">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-[#001e33] tracking-tight mb-2">
              Actualización No Disponible
            </h1>
            <p className="text-slate-500 text-sm mb-6">
              Ya has actualizado tus datos con el permiso concedido. Para realizar nuevos cambios, contacta al administrador.
            </p>
            <button
              onClick={() => {
                const role = localStorage.getItem('gct_role');
                switch (role) {
                  case 'superadmin': navigate('/admin'); break;
                  case 'admin': navigate('/admin2'); break;
                  case 'editor': navigate('/editor'); break;
                  default: navigate('/app');
                }
              }}
              className="bg-[#001e33] text-white px-6 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all"
            >
              Volver al Inicio
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black text-[#001e33] tracking-tight">
            {!empleadoData?.primer_login && empleadoData?.permitir_edicion_datos 
              ? 'Actualizar Datos del Perfil' 
              : 'Completa tu Perfil'}
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            {!empleadoData?.primer_login && empleadoData?.permitir_edicion_datos
              ? 'El administrador te ha dado permiso para actualizar tus datos. Esta es una actualización única.'
              : 'Es la primera vez que ingresas. Necesitamos completar algunos datos.'}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className={`w-3 h-3 rounded-full transition-colors ${
              s === step ? 'bg-[#001e33]' : s < step ? 'bg-emerald-500' : 'bg-slate-300'
            }`} />
          ))}
        </div>

        {/* Form */}
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-xl p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}

            {/* Actions */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-bold text-slate-400 hover:text-[#001e33] transition-colors"
                >
                  ← Anterior
                </button>
              ) : (
                <button
                  type="button"
                  onClick={logout}
                  className="text-sm font-bold text-red-400 hover:text-red-600 transition-colors"
                >
                  Cerrar Sesión
                </button>
              )}

              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="bg-[#001e33] text-white px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                  Siguiente <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-emerald-600 text-white px-8 py-3 rounded-2xl font-bold text-sm uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-70 flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Check size={16} /> Completar Registro
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-6">
          Paso {step} de 3 • Russell Bedford RBG
        </p>
      </div>
    </div>
  );
};

export default CompleteProfile;
