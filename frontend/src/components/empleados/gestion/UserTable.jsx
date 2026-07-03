import { useState, useEffect, useContext, useCallback } from 'react';
import { Trash2, Shield, ShieldCheck, UserX, UserCheck, X, Check, Loader2, Search, Mail, Calendar, Hash, Briefcase, Info, AlertTriangle, Activity, Edit3, Save, UserPlus, Lock, KeyRound, FileSpreadsheet, Download, MessageSquareText, CheckCheck, History, ArrowRight, TrendingUp, DollarSign, FileText, RefreshCw, GraduationCap, HeartPulse, FileSignature, Plus, Trash } from 'lucide-react';
import {
  updateEmpleado, cambiarEstadoEmpleado, deleteEmpleado, actualizarPasswordEmpleado,
  getCertPermisosBackend, setCertPermisoBackend, getSugerencias, getHistorialEmpleado,
  getContratoActivo, createContrato, updateContrato,
  getAfiliacionSS, createAfiliacionSS, updateAfiliacionSS,
  getEntidadesEPS, getEntidadesAFP, getEntidadesARL, getCajasCompensacion,
  getAcademicosEmpleado, crearAcademicoEmpleado, actualizarAcademicoEmpleado, eliminarAcademicoEmpleado,
} from '../../../lib/api';
import { exportEmpleadosCSV, exportEmpleadosXLSX } from '../../../lib/exports';
import RoleModal from './RoleModal';
import AuthContext from '../../../context/AuthContext';
import { useDataCache } from '../../../context/DataCacheContext';


const UserTable = () => {
  const {
    isSuperAdmin,
    isAdmin,
    canViewInactiveUsers,
    canReactivateUsers,
    canDeleteUsers,
    canEditUsers,
    canDeactivateUsers,
    user
  } = useContext(AuthContext);

  const {
    empleados: cachedEmpleados,
    areas:     cachedAreas,
    cargos:    cachedCargos,
    fetchEmpleados,
    fetchAreas,
    fetchCargos,
    invalidate,
  } = useDataCache();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingUser, setManagingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterTab, setFilterTab] = useState('activos');

  const [roleModalUser, setRoleModalUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [cargos, setCargos] = useState([]);
  const [areas, setAreas] = useState([]);

  const [certPermEdit, setCertPermEdit] = useState(false);
  const [certPermisosBackend, setCertPermisosBackend] = useState([]);

  // Tabs del modal de edición
  const [activeEditTab, setActiveEditTab] = useState('personal');

  // Contrato
  const [contrato, setContrato]   = useState(null);
  const [loadingContrato, setLoadingContrato] = useState(false);
  const [savingContrato, setSavingContrato]   = useState(false);
  const [formContrato, setFormContrato] = useState({});

  // Seguridad Social
  const [ss, setSS]               = useState(null);
  const [loadingSS, setLoadingSS] = useState(false);
  const [savingSS, setSavingSS]   = useState(false);
  const [formSS, setFormSS]       = useState({});
  const [entEPS, setEntEPS] = useState([]);
  const [entAFP, setEntAFP] = useState([]);
  const [entARL, setEntARL] = useState([]);
  const [cajas, setCajas]   = useState([]);

  // Académicos
  const [academicos, setAcademicos]         = useState([]);
  const [loadingAcad, setLoadingAcad]       = useState(false);
  const [editandoAcad, setEditandoAcad]     = useState(null); // id o 'nuevo'
  const [formAcad, setFormAcad]             = useState({});
  const [diplomaFile, setDiplomaFile]       = useState(null);
  const [savingAcad, setSavingAcad]         = useState(false);

  const ACAD_VACIO = { nivel_educativo: '', titulo_obtenido: '', institucion: '', ciudad_institucion: '', fecha_inicio: '', fecha_graduacion: '', graduado: true, en_curso: false };
  const NIVEL_LABELS = { bachiller:'Bachiller', tecnico:'Técnico', tecnologo:'Tecnólogo', profesional:'Profesional', especializacion:'Especialización', maestria:'Maestría', doctorado:'Doctorado', otro:'Otro' };

  // Historial de sugerencias del colaborador (modal sobre la ficha)
  const [sugerenciasUser, setSugerenciasUser] = useState(null);
  const [loadingSugerencias, setLoadingSugerencias] = useState(false);

  // Historial laboral del colaborador
  const [historialUser, setHistorialUser] = useState(null);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const MOV_CFG = {
    INGRESO:          { label: 'Ingreso',             color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', Icon: UserCheck },
    CAMBIO_CARGO:     { label: 'Cambio de Cargo',     color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    Icon: Briefcase },
    TRASLADO:         { label: 'Traslado de Área',    color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500',  Icon: ArrowRight },
    AJUSTE_SALARIAL:  { label: 'Ajuste Salarial',     color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   Icon: DollarSign },
    CAMBIO_CONTRATO:  { label: 'Cambio de Contrato',  color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-500',    Icon: FileText },
    CAMBIO_MODALIDAD: { label: 'Cambio de Modalidad', color: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-400',   Icon: RefreshCw },
    RETIRO:           { label: 'Retiro',              color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     Icon: UserX },
    REINTEGRO:        { label: 'Reintegro',           color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500',    Icon: UserCheck },
    NUEVO_CONTRATO:   { label: 'Nuevo Contrato',      color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500',  Icon: FileText },
    RENOVACION:       { label: 'Renovación',          color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500',  Icon: TrendingUp },
  };

  const abrirHistorial = async (user) => {
    setLoadingHistorial(true);
    setHistorialUser({ user, lista: [] });
    try {
      const data = await getHistorialEmpleado(user.id_empleado);
      setHistorialUser({ user, lista: Array.isArray(data) ? data : [] });
    } catch (e) {
      setHistorialUser({ user, lista: [], error: true });
    } finally {
      setLoadingHistorial(false);
    }
  };

  const abrirSugerencias = async (user) => {
    setLoadingSugerencias(true);
    setSugerenciasUser({ user, lista: [] });
    try {
      const data = await getSugerencias({ empleado_id: user.id_empleado });
      setSugerenciasUser({ user, lista: data?.sugerencias || [] });
    } catch {
      setSugerenciasUser({ user, lista: [], error: true });
    } finally {
      setLoadingSugerencias(false);
    }
  };

  useEffect(() => {
    getCertPermisosBackend()
      .then(res => setCertPermisosBackend((res.permisos || []).map(String)))
      .catch(() => {});
  }, []);

  // Estados para cambio de contraseña
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchUsers = useCallback(async (force = false) => {
    setLoading(true);
    try {
      const data = await fetchEmpleados(force);
      setUsers(data || []);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchEmpleados]);

  useEffect(() => {
    // Usar datos del caché si ya están disponibles (carga instantánea)
    if (cachedEmpleados.length > 0) {
      setUsers(cachedEmpleados);
      setLoading(false);
    } else {
      fetchUsers();
    }
    // Áreas y cargos del caché o fetch si no hay
    if (cachedAreas.length > 0) setAreas(cachedAreas);
    else fetchAreas().then(d => setAreas(d));
    if (cachedCargos.length > 0) setCargos(cachedCargos);
    else fetchCargos().then(d => setCargos(d));
  }, [cachedAreas, cachedCargos, cachedEmpleados, fetchAreas, fetchCargos, fetchUsers]);

  const toggleUserStatus = async (user) => {
    // Verificar permisos
    const isActivating = user.estado === 'INACTIVO';
    
    // Solo superadmin puede reactivar usuarios inactivos
    if (isActivating && !isSuperAdmin) {
      alert('Solo el Super Administrador puede reactivar usuarios inactivos');
      return;
    }
    
    // Solo SuperAdmin y Admin pueden desactivar usuarios activos
    if (!canDeactivateUsers) {
      alert('No tienes permisos para cambiar el estado de los usuarios');
      return;
    }
    
    setUpdating(true);
    const nuevoEstado = user.estado === 'ACTIVA' ? 'INACTIVO' : 'ACTIVA';
    try {
      await cambiarEstadoEmpleado(user.id_empleado, nuevoEstado);
      invalidate('empleados');
      await fetchUsers(true);
      setManagingUser(null);
      alert(`Usuario ${nuevoEstado === 'ACTIVA' ? 'activado' : 'desactivado'} correctamente`);
    } catch (err) {
      console.error('Error al cambiar estado:', err);
      alert('Error al cambiar estado del usuario');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteUser = async (userToDelete) => {
    try {
      setDeleting(true);
      await deleteEmpleado(userToDelete.id_empleado);
      invalidate('empleados');
      await fetchUsers(true);
      setConfirmDelete(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Carga datos del modal de edición completo
  const cargarDatosModal = async (user) => {
    const id = user.id_empleado;
    // Contrato
    setLoadingContrato(true);
    getContratoActivo(id)
      .then(d => { setContrato(d); setFormContrato({ empleado: id, tipo_contrato: d.tipo_contrato || '', fecha_inicio: d.fecha_inicio || '', fecha_fin: d.fecha_fin || '', periodo_prueba_dias: d.periodo_prueba_dias ?? 60, salario: d.salario || '', tipo_salario: d.tipo_salario || 'ordinario', forma_pago: d.forma_pago || 'mensual', auxilio_transporte: d.auxilio_transporte ?? true, jornada: d.jornada || 'completa', modalidad: d.modalidad || 'presencial', lugar_trabajo: d.lugar_trabajo || '', fecha_firma: d.fecha_firma || '', observaciones: d.observaciones || '' }); })
      .catch(() => { setContrato(null); setFormContrato({ empleado: id, tipo_contrato: 'termino_indefinido', fecha_inicio: '', fecha_fin: '', periodo_prueba_dias: 60, salario: '', tipo_salario: 'ordinario', forma_pago: 'mensual', auxilio_transporte: true, jornada: 'completa', modalidad: 'presencial', lugar_trabajo: '', fecha_firma: '', observaciones: '' }); })
      .finally(() => setLoadingContrato(false));
    // Seguridad Social
    setLoadingSS(true);
    getAfiliacionSS(id)
      .then(d => { setSS(d); setFormSS({ eps: d.eps || '', numero_afiliacion_eps: d.numero_afiliacion_eps || '', fecha_afiliacion_eps: d.fecha_afiliacion_eps || '', afp: d.afp || '', numero_afiliacion_afp: d.numero_afiliacion_afp || '', fecha_afiliacion_afp: d.fecha_afiliacion_afp || '', arl: d.arl || '', nivel_riesgo_arl: d.nivel_riesgo_arl || 'I', numero_poliza_arl: d.numero_poliza_arl || '', fecha_afiliacion_arl: d.fecha_afiliacion_arl || '', caja_compensacion: d.caja_compensacion || '', numero_afiliacion_caja: d.numero_afiliacion_caja || '', fecha_afiliacion_caja: d.fecha_afiliacion_caja || '' }); })
      .catch(() => { setSS(null); setFormSS({ eps: '', numero_afiliacion_eps: '', fecha_afiliacion_eps: '', afp: '', numero_afiliacion_afp: '', fecha_afiliacion_afp: '', arl: '', nivel_riesgo_arl: 'I', numero_poliza_arl: '', fecha_afiliacion_arl: '', caja_compensacion: '', numero_afiliacion_caja: '', fecha_afiliacion_caja: '' }); })
      .finally(() => setLoadingSS(false));
    // Académicos
    setLoadingAcad(true);
    getAcademicosEmpleado(id).then(d => setAcademicos(Array.isArray(d) ? d : [])).catch(() => setAcademicos([])).finally(() => setLoadingAcad(false));
    // Entidades (solo si aún no están cargadas)
    if (!entEPS.length) getEntidadesEPS().then(d => setEntEPS(Array.isArray(d) ? d : d?.results || [])).catch(() => {});
    if (!entAFP.length) getEntidadesAFP().then(d => setEntAFP(Array.isArray(d) ? d : d?.results || [])).catch(() => {});
    if (!entARL.length) getEntidadesARL().then(d => setEntARL(Array.isArray(d) ? d : d?.results || [])).catch(() => {});
    if (!cajas.length)  getCajasCompensacion().then(d => setCajas(Array.isArray(d) ? d : d?.results || [])).catch(() => {});
  };

  const handleGuardarContrato = async () => {
    setSavingContrato(true);
    try {
      const payload = { ...formContrato };
      if (contrato?.id) await updateContrato(contrato.id, payload);
      else await createContrato(payload);
      const updated = await getContratoActivo(formContrato.empleado);
      setContrato(updated);
    } catch(e) { alert('Error guardando contrato'); }
    finally { setSavingContrato(false); }
  };

  const handleGuardarSS = async () => {
    setSavingSS(true);
    try {
      const payload = { ...formSS, empleado: editingUser.id_empleado };
      if (ss?.id) await updateAfiliacionSS(ss.id, payload);
      else await createAfiliacionSS(payload);
      const updated = await getAfiliacionSS(editingUser.id_empleado);
      setSS(updated);
    } catch(e) { alert('Error guardando seguridad social'); }
    finally { setSavingSS(false); }
  };

  const handleGuardarAcad = async () => {
    if (!formAcad.nivel_educativo || !formAcad.titulo_obtenido || !formAcad.institucion) return;
    setSavingAcad(true);
    try {
      const id = editingUser.id_empleado;
      const payload = { ...formAcad, fecha_graduacion: formAcad.en_curso ? null : (formAcad.fecha_graduacion || null) };
      if (editandoAcad === 'nuevo') {
        const nuevo = await crearAcademicoEmpleado(id, payload, diplomaFile);
        setAcademicos(p => [nuevo, ...p]);
      } else {
        const act = await actualizarAcademicoEmpleado(id, editandoAcad, payload, diplomaFile || null);
        setAcademicos(p => p.map(r => r.id === editandoAcad ? act : r));
      }
      setEditandoAcad(null); setFormAcad({}); setDiplomaFile(null);
    } catch(e) { alert('Error guardando académico'); }
    finally { setSavingAcad(false); }
  };

  const handleEliminarAcad = async (pk) => {
    if (!confirm('¿Eliminar este registro académico?')) return;
    await eliminarAcademicoEmpleado(editingUser.id_empleado, pk);
    setAcademicos(p => p.filter(r => r.id !== pk));
  };

  // Funciones para editar perfil
  const handleEditClick = (user, e) => {
    e.stopPropagation();
    setActiveEditTab('personal');
    setEditandoAcad(null);
    cargarDatosModal(user);
    setEditingUser(user);
    setEditFormData({
      // Nombres
      primer_nombre: user.primer_nombre || '',
      segundo_nombre: user.segundo_nombre || '',
      primer_apellido: user.primer_apellido || '',
      segundo_apellido: user.segundo_apellido || '',
      apodo: user.apodo || '',
      // Documento
      tipo_documento: user.tipo_documento || 'CC',
      numero_documento: user.numero_documento || '',
      lugar_expedicion: user.lugar_expedicion || '',
      fecha_expedicion: user.fecha_expedicion || '',
      // Nacimiento y personales
      fecha_nacimiento: user.fecha_nacimiento || '',
      ciudad_nacimiento: user.ciudad_nacimiento || '',
      departamento_nacimiento: user.departamento_nacimiento || '',
      pais_nacimiento: user.pais_nacimiento || 'Colombia',
      nacionalidad: user.nacionalidad || 'Colombiana',
      sexo: user.sexo || '',
      tipo_sangre: user.tipo_sangre || '',
      estado_civil: user.estado_civil || '',
      estrato_socioeconomico: user.estrato_socioeconomico ?? '',
      tipo_vivienda: user.tipo_vivienda || '',
      tiene_discapacidad: user.tiene_discapacidad || false,
      descripcion_discapacidad: user.descripcion_discapacidad || '',
      tiene_hijos: user.tiene_hijos || false,
      numero_hijos: user.numero_hijos ?? '',
      tiene_vehiculo: user.tiene_vehiculo || false,
      tipo_vehiculo: user.tipo_vehiculo || '',
      placa_vehiculo: user.placa_vehiculo || '',
      // Contacto
      correo_corporativo: user.correo_corporativo || '',
      correo_personal: user.correo_personal || '',
      telefono: user.telefono || '',
      telefono_emergencia: user.telefono_emergencia || '',
      nombre_contacto_emergencia: user.nombre_contacto_emergencia || '',
      parentesco_emergencia: user.parentesco_emergencia || '',
      direccion: user.direccion || '',
      // Asignación
      area_id: user.area_id || null,
      cargo_id: user.cargo_id || null,
      fecha_ingreso: user.fecha_ingreso || '',
      // Permisos y estado
      id_permisos: user.id_permisos || 3,
      estado: user.estado || 'ACTIVA',
      permitir_edicion_datos: user.permitir_edicion_datos || false,
      acceso_sqf_clientes: user.acceso_sqf_clientes || false,
      acceso_sqf_contratos: user.acceso_sqf_contratos || false,
      acceso_sqf_facturacion: user.acceso_sqf_facturacion || false,
      acceso_sqf_auditoria: user.acceso_sqf_auditoria || false
    });
    setCertPermEdit(certPermisosBackend.includes(String(user.id_empleado)));
  };

  const buildEmpleadoPayload = (form) => {
    const payload = { ...form };

    // El serializer espera 'area' y 'cargo' (no area_id/cargo_id)
    if (payload.area_id !== undefined) {
      payload.area = payload.area_id ? parseInt(payload.area_id, 10) : null;
      delete payload.area_id;
    }
    if (payload.cargo_id !== undefined) {
      payload.cargo = payload.cargo_id ? parseInt(payload.cargo_id, 10) : null;
      delete payload.cargo_id;
    }

    const intFields = ['id_permisos', 'estrato_socioeconomico', 'numero_hijos'];
    const dateFields = ['fecha_nacimiento', 'fecha_ingreso', 'fecha_expedicion'];
    const optionalText = ['sexo', 'tipo_sangre', 'estado_civil', 'tipo_vivienda', 'tipo_vehiculo', 'tipo_documento'];

    intFields.forEach((key) => {
      const v = payload[key];
      if (v === '' || v === undefined) payload[key] = null;
      else payload[key] = parseInt(v, 10);
    });
    dateFields.forEach((key) => {
      if (payload[key] === '') payload[key] = null;
    });
    optionalText.forEach((key) => {
      if (payload[key] === '') payload[key] = null;
    });
    return payload;
  };

  const handleSaveEdit = async () => {
    try {
      setUpdating(true);
      const payload = buildEmpleadoPayload(editFormData);
      await updateEmpleado(editingUser.id_empleado, payload);
      invalidate('empleados');

      // Seguridad: solo SuperAdmin puede modificar permisos de certificados.
      if (isSuperAdmin) {
        await setCertPermisoBackend(editingUser.id_empleado, certPermEdit);
        setCertPermisosBackend(prev => certPermEdit
          ? [...new Set([...prev, String(editingUser.id_empleado)])]
          : prev.filter(x => x !== String(editingUser.id_empleado))
        );
      }

      await fetchUsers(true);
      setEditingUser(null);
      alert('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error guardando perfil:', error);
      alert('Error guardando cambios: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    const parsed = ['area_id', 'cargo_id', 'id_permisos'].includes(name)
      ? (value === '' ? null : parseInt(value, 10))
      : value;
    setEditFormData(prev => ({ ...prev, [name]: parsed }));
  };

  // Función para cambiar contraseña (solo SuperAdmin)
  const handleChangePassword = async () => {
    // Validar que solo SuperAdmin pueda cambiar contraseñas
    if (!isSuperAdmin) {
      alert('Solo el Super Administrador puede cambiar contraseñas de usuarios');
      return;
    }

    // Validar campos
    if (!newPassword || newPassword.length < 6) {
      alert('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!adminPassword) {
      alert('Debes ingresar tu contraseña de SuperAdmin para autorizar el cambio');
      return;
    }

    setChangingPassword(true);
    try {
      const result = await actualizarPasswordEmpleado(
        editingUser.id_empleado,
        newPassword,
        user?.email,
        adminPassword
      );
      
      if (result.success) {
        alert('Contraseña actualizada exitosamente');
        setNewPassword('');
        setAdminPassword('');
        setShowPasswordSection(false);
      } else {
        alert('Error: ' + result.error);
      }
    } catch (err) {
      alert('Error al actualizar contraseña: ' + err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    // Normalizar estado (por defecto ACTIVA si no está definido)
    const estadoNormalizado = user.estado || 'ACTIVA';

    // Filtro por estado (tab)
    if (filterTab === 'activos' && estadoNormalizado !== 'ACTIVA') return false;
    if (filterTab === 'inactivos' && estadoNormalizado === 'ACTIVA') return false;

    const term = searchTerm.toLowerCase();
    const nombreCompleto = `${user.primer_nombre || ''} ${user.segundo_nombre || ''} ${user.primer_apellido || ''} ${user.segundo_apellido || ''}`.toLowerCase();
    return (
      nombreCompleto.includes(term) ||
      user.correo_corporativo?.toLowerCase().includes(term) ||
      user.id_empleado?.toString().includes(term)
    );
  });

  const handleExportCSV = () => {
    if (!filteredUsers.length) {
      alert('No hay empleados para exportar con los filtros actuales.');
      return;
    }
    setExporting(true);
    try {
      exportEmpleadosCSV(filteredUsers, 'empleados_rrhh');
    } finally {
      setExporting(false);
    }
  };

  const handleExportXLSX = () => {
    if (!filteredUsers.length) {
      alert('No hay empleados para exportar con los filtros actuales.');
      return;
    }
    setExporting(true);
    try {
      exportEmpleadosXLSX(filteredUsers, 'empleados_rrhh');
    } finally {
      setExporting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-bold uppercase tracking-widest text-[10px]">Cargando Panel de Control...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-sm shadow-sm focus:ring-2 ring-blue-500/5 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {(isSuperAdmin || isAdmin) && (
            <>
              <span className="hidden text-[10px] font-bold uppercase tracking-widest text-slate-400 sm:inline mr-1">
                Exportar listado
              </span>
              <button
                type="button"
                disabled={exporting || filteredUsers.length === 0}
                onClick={handleExportCSV}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-slate-600 shadow-sm transition-all hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                title="CSV con UTF-8 (compatible con Excel)"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                CSV
              </button>
              <button
                type="button"
                disabled={exporting || filteredUsers.length === 0}
                onClick={handleExportXLSX}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-[#001871] px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white shadow-sm transition-all hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
                title="Libro Excel (.xlsx)"
              >
                {exporting ? <Loader2 size={14} className="animate-spin" /> : <FileSpreadsheet size={14} />}
                Excel
              </button>
            </>
          )}

          {canViewInactiveUsers && (
            <div className="flex rounded-2xl border border-slate-100 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setFilterTab('activos')}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  filterTab === 'activos'
                    ? 'bg-emerald-500 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Activos
              </button>
              <button
                type="button"
                onClick={() => setFilterTab('inactivos')}
                className={`rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest transition-all ${
                  filterTab === 'inactivos'
                    ? 'bg-red-500 text-white'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                Inactivos
              </button>
            </div>
          )}
        </div>
      </div>

      {(isSuperAdmin || isAdmin) && (
        <p className="text-[10px] text-slate-400">
          La exportación incluye el mismo listado que ves aquí (búsqueda y pestaña activos/inactivos). Datos del esquema público / RRHH.
        </p>
      )}

      {/* TABLA CENTRALIZADA */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[560px]">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:table-cell">Permisos/Área</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:table-cell">Acceso</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr
                key={user.id_empleado}
                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-4 sm:px-8 py-4 sm:py-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${user.estado === 'ACTIVA' ? 'bg-[#001871] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {user.primer_nombre?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 truncate">{user.primer_nombre} {user.primer_apellido}</p>
                      <p className="text-[11px] text-slate-400 truncate hidden sm:block">{user.correo_corporativo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 hidden sm:table-cell">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{user.nombre_area || 'Sin Área'}</span>
                    <span className="text-[10px] font-black uppercase text-blue-500 mt-1 flex items-center gap-1">
                      <Shield size={10} />
                      {user.id_permisos === 1 ? 'Administrador' : user.id_permisos === 2 ? 'Editor' : 'Usuario'}
                    </span>
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 hidden md:table-cell">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center w-fit gap-1.5 ${user.estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.estado === 'ACTIVA' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.estado === 'ACTIVA' ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1 sm:gap-2">
                    {/* ACCIÓN: REACTIVAR - Solo Super Admin para usuarios inactivos */}
                    {user.estado === 'INACTIVO' && canReactivateUsers && (
                      <button 
                        onClick={() => setManagingUser(user)} 
                        className="p-2 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg transition-all" 
                        title="Reactivar Usuario"
                      >
                        <UserPlus size={18} />
                      </button>
                    )}
                    
                    {/* ACCIÓN: EDITAR - Solo para usuarios activos o si es Super Admin */}
                    {(user.estado === 'ACTIVA' || canEditUsers) && (
                      <button 
                        onClick={(e) => handleEditClick(user, e)} 
                        className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded-lg transition-all" 
                        title="Editar Perfil"
                      >
                        <Edit3 size={18} />
                      </button>
                    )}
                    
                    {/* ACCIÓN: DESACTIVAR - Solo SuperAdmin y Admin pueden desactivar */}
                    {canDeactivateUsers && user.estado === 'ACTIVA' && (
                      <button 
                        onClick={() => setManagingUser(user)} 
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all" 
                        title="Desactivar Usuario"
                      >
                        <UserX size={18} />
                      </button>
                    )}
                    
                    {/* ACCIÓN: ELIMINAR - Solo Super Admin */}
                    {canDeleteUsers && (
                      <button 
                        onClick={() => setConfirmDelete(user)} 
                        className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all" 
                        title="Eliminar del Sistema"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* MODALES MANTENIDOS */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001871]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedUser(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#001871] p-5 sm:p-8 text-white flex justify-between items-start">
              <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/10 rounded-2xl flex items-center justify-center text-xl sm:text-2xl font-black shrink-0">{selectedUser.primer_nombre?.charAt(0)}</div>
                <div className="min-w-0">
                  <h3 className="text-lg sm:text-2xl font-black tracking-tight truncate">{selectedUser.primer_nombre} {selectedUser.primer_apellido}</h3>
                  <p className="text-slate-400 text-xs sm:text-sm truncate">{selectedUser.correo_corporativo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors shrink-0"><X size={20}/></button>
            </div>
            <div className="p-4 sm:p-10 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8">
              <DetailItem icon={<Hash size={16}/>} label="ID Empleado" value={selectedUser.id_empleado} />
              <DetailItem icon={<Info size={16}/>} label="Área" value={selectedUser.nombre_area} />
              <DetailItem icon={<Briefcase size={16}/>} label="Cargo" value={selectedUser.nombre_cargo} />
              <DetailItem icon={<Calendar size={16}/>} label="Ingreso" value={selectedUser.fecha_ingreso} />
              <DetailItem icon={<Activity size={16}/>} label="Estado" value={selectedUser.estado} isStatus status={selectedUser.estado} />
              <DetailItem icon={<Mail size={16}/>} label="Email" value={selectedUser.correo_corporativo} />
              <DetailItem icon={<Shield size={16}/>} label="UUID Autenticación" value={selectedUser.auth_id} colSpan />
            </div>
            <div className="bg-slate-50 p-6 flex flex-wrap justify-between items-center gap-3">
              {(isSuperAdmin || isAdmin) && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => abrirSugerencias(selectedUser)}
                    className="flex items-center gap-2 px-5 py-3 bg-[#00a9ce] text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform hover:bg-[#0090b0]"
                  >
                    <MessageSquareText size={14} /> Sugerencias
                  </button>
                  <button
                    onClick={() => abrirHistorial(selectedUser)}
                    className="flex items-center gap-2 px-5 py-3 bg-[#981d97] text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform hover:bg-[#7a1679]"
                  >
                    <History size={14} /> Historial
                  </button>
                </div>
              )}
              <button onClick={() => setSelectedUser(null)} className="px-8 py-3 bg-[#001871] text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform ml-auto">Cerrar Ficha</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Historial de sugerencias del colaborador */}
      {sugerenciasUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSugerenciasUser(null)}></div>
          <div className="relative z-10 bg-white rounded-3xl w-full max-w-xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#00a9ce] px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <MessageSquareText size={18} />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">Sugerencias de {sugerenciasUser.user.primer_nombre} {sugerenciasUser.user.primer_apellido}</p>
                  <p className="text-[11px] text-cyan-100 truncate">{sugerenciasUser.user.correo_corporativo}</p>
                </div>
              </div>
              <button onClick={() => setSugerenciasUser(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors shrink-0"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-slate-50">
              {loadingSugerencias ? (
                <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#00a9ce]" /></div>
              ) : sugerenciasUser.lista.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquareText size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">{sugerenciasUser.error ? 'No se pudieron cargar las sugerencias' : 'Este colaborador no ha enviado sugerencias'}</p>
                </div>
              ) : (
                sugerenciasUser.lista.map(s => (
                  <div key={s.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="text-[11px] font-semibold text-slate-400">
                        {new Date(s.fecha_envio).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                      </p>
                      {s.recibida ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold uppercase"><CheckCheck size={11} /> Recibida</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold uppercase">Pendiente</span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap break-words">{s.sugerencia}</p>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button onClick={() => setSugerenciasUser(null)} className="w-full py-2.5 bg-[#001871] text-white rounded-xl font-semibold text-sm hover:bg-[#003366] transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Historial laboral del colaborador */}
      {historialUser && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setHistorialUser(null)}></div>
          <div className="relative z-10 bg-white rounded-3xl w-full max-w-xl max-h-[80vh] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="bg-[#981d97] px-6 py-4 text-white flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <History size={18} />
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate">Historial de {historialUser.user.primer_nombre} {historialUser.user.primer_apellido}</p>
                  <p className="text-[11px] text-purple-200 truncate">{historialUser.user.correo_corporativo}</p>
                </div>
              </div>
              <button onClick={() => setHistorialUser(null)} className="p-2 hover:bg-white/20 rounded-xl transition-colors shrink-0"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
              {loadingHistorial ? (
                <div className="flex justify-center py-12"><Loader2 size={22} className="animate-spin text-[#981d97]" /></div>
              ) : historialUser.lista.length === 0 ? (
                <div className="text-center py-12">
                  <History size={40} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-500">{historialUser.error ? 'No se pudo cargar el historial' : 'Este colaborador no tiene movimientos registrados'}</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-200" />
                  <div className="space-y-4">
                    {historialUser.lista.map(mov => {
                      const cfg = MOV_CFG[mov.tipo] || { label: mov.tipo, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', Icon: History };
                      const { Icon } = cfg;
                      const fecha = mov.fecha_movimiento
                        ? new Date(`${mov.fecha_movimiento}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                        : '—';
                      return (
                        <div key={mov.id} className="flex gap-4 relative pl-1">
                          <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                            <Icon size={14} />
                          </div>
                          <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                              <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${cfg.color}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {cfg.label}
                              </span>
                              <span className="text-[10px] text-slate-400 font-medium shrink-0">{fecha}</span>
                            </div>
                            {(mov.valor_anterior || mov.valor_nuevo) && (
                              <div className="flex items-center gap-2 mt-2 text-xs">
                                {mov.valor_anterior && <span className="text-slate-400 line-through">{mov.valor_anterior}</span>}
                                {mov.valor_anterior && mov.valor_nuevo && <ArrowRight size={12} className="text-slate-300 flex-shrink-0" />}
                                {mov.valor_nuevo && <span className="font-semibold text-slate-700">{mov.valor_nuevo}</span>}
                              </div>
                            )}
                            {mov.observaciones && (
                              <p className="text-[11px] text-slate-400 mt-1.5">{mov.observaciones}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex-shrink-0">
              <button onClick={() => setHistorialUser(null)} className="w-full py-2.5 bg-[#001871] text-white rounded-xl font-semibold text-sm hover:bg-[#003366] transition-colors">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {managingUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !updating && setManagingUser(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md relative z-10 shadow-2xl p-10 text-center space-y-6 animate-in slide-in-from-bottom-4">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${managingUser.estado === 'ACTIVA' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {managingUser.estado === 'ACTIVA' ? <UserCheck size={40} /> : <UserX size={40} />}
            </div>
            <h3 className="text-2xl font-black text-[#001871]">Control de Acceso</h3>
            <button 
              onClick={() => toggleUserStatus(managingUser)}
              disabled={updating}
              className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${managingUser.estado === 'ACTIVA' ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
            >
              {updating ? <Loader2 className="animate-spin mx-auto" size={18} /> : (managingUser.estado === 'ACTIVA' ? 'Inhabilitar Usuario' : 'Activar Usuario')}
            </button>
            <button onClick={() => setManagingUser(null)} className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmDeleteModal
          user={confirmDelete}
          onClose={() => setConfirmDelete(null)}
          onConfirm={handleDeleteUser}
          updating={deleting}
        />
      )}

      {roleModalUser && (
        <RoleModal 
          user={roleModalUser} 
          onClose={() => setRoleModalUser(null)} 
          onUpdate={fetchUsers} 
        />
      )}

      {/* MODAL DE EDICIÓN DE PERFIL COMPLETO */}
      {editingUser && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001871]/80 backdrop-blur-md" onClick={() => setEditingUser(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="bg-[#001871] px-6 py-4 flex justify-between items-center flex-shrink-0">
              <div>
                <h3 className="text-lg font-black text-white leading-tight">Editar Perfil de Empleado</h3>
                <p className="text-blue-300 text-xs mt-0.5">{editingUser.primer_nombre} {editingUser.primer_apellido} · ID {editingUser.id_empleado}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={22} className="text-white"/></button>
            </div>
            {/* Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50 flex-shrink-0 overflow-x-auto no-scrollbar">
              {[
                { id: 'personal',  label: 'Personal',    Icon: Mail },
                { id: 'contacto',  label: 'Contacto',    Icon: Activity },
                { id: 'laboral',   label: 'Laboral',     Icon: Briefcase },
                { id: 'contrato',  label: 'Contrato',    Icon: FileSignature },
                { id: 'ss',        label: 'Seg. Social', Icon: HeartPulse },
                { id: 'academico', label: 'Académico',   Icon: GraduationCap },
                { id: 'sistema',   label: 'Rol / Acceso', Icon: Shield },
              ].map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveEditTab(id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap border-b-2 transition-colors ${
                    activeEditTab === id
                      ? 'border-[#001871] text-[#001871] bg-white'
                      : id === 'sistema'
                        ? 'border-transparent text-[#981d97] hover:text-[#001871]'
                        : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon size={13} />{label}
                </button>
              ))}
            </div>
            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* ── TAB: PERSONAL ── */}
              <div style={{display: activeEditTab === 'personal' ? '' : 'none'}}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Nombres y Apellidos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      {[['primer_nombre','Primer Nombre *'],['segundo_nombre','Segundo Nombre'],['primer_apellido','Primer Apellido *'],['segundo_apellido','Segundo Apellido']].map(([name,lbl])=>(
                        <div key={name}>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{lbl}</label>
                          <input name={name} value={editFormData[name]} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                      ))}
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Apodo / Como desea ser llamado</label>
                        <input name="apodo" value={editFormData.apodo} onChange={handleInputChange} placeholder="Ej. Carlos, Caro..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Documento de Identidad</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de Documento</label>
                        <select name="tipo_documento" value={editFormData.tipo_documento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="CC">Cédula de Ciudadanía</option>
                          <option value="CE">Cédula de Extranjería</option>
                          <option value="PA">Pasaporte</option>
                          <option value="TI">Tarjeta de Identidad</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Número de Documento</label>
                        <input name="numero_documento" value={editFormData.numero_documento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Lugar de Expedición</label>
                        <input name="lugar_expedicion" value={editFormData.lugar_expedicion} onChange={handleInputChange} placeholder="Ciudad donde se expidió" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha de Expedición</label>
                        <input type="date" name="fecha_expedicion" value={editFormData.fecha_expedicion} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Datos de Nacimiento y Personales</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha de Nacimiento</label>
                        <input type="date" name="fecha_nacimiento" value={editFormData.fecha_nacimiento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Ciudad de Nacimiento</label>
                        <input name="ciudad_nacimiento" value={editFormData.ciudad_nacimiento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Departamento de Nacimiento</label>
                        <input name="departamento_nacimiento" value={editFormData.departamento_nacimiento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">País de Nacimiento</label>
                        <input name="pais_nacimiento" value={editFormData.pais_nacimiento} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Sexo</label>
                        <select name="sexo" value={editFormData.sexo} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar...</option>
                          <option value="M">Masculino</option>
                          <option value="F">Femenino</option>
                          <option value="O">Otro</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de Sangre</label>
                        <select name="tipo_sangre" value={editFormData.tipo_sangre} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar...</option>
                          {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(v=><option key={v} value={v}>{v}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estado Civil</label>
                        <select name="estado_civil" value={editFormData.estado_civil} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar...</option>
                          <option value="S">Soltero/a</option>
                          <option value="C">Casado/a</option>
                          <option value="UL">Unión Libre</option>
                          <option value="D">Divorciado/a</option>
                          <option value="V">Viudo/a</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estrato Socioeconómico</label>
                        <select name="estrato_socioeconomico" value={editFormData.estrato_socioeconomico} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar...</option>
                          {[1,2,3,4,5,6].map(n=><option key={n} value={n}>Estrato {n}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de Vivienda</label>
                        <select name="tipo_vivienda" value={editFormData.tipo_vivienda} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar...</option>
                          <option value="propia">Propia</option>
                          <option value="arrendada">Arrendada</option>
                          <option value="familiar">Familiar</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nacionalidad</label>
                        <input name="nacionalidad" value={editFormData.nacionalidad} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input type="checkbox" name="tiene_hijos" checked={editFormData.tiene_hijos} onChange={e=>setEditFormData(p=>({...p,tiene_hijos:e.target.checked}))} className="w-4 h-4 text-[#001871] rounded"/>
                        <span className="text-sm font-medium text-slate-700">Tiene hijos</span>
                        <input type="number" name="numero_hijos" value={editFormData.numero_hijos} onChange={handleInputChange} min={0} max={20} style={{display: editFormData.tiene_hijos ? '' : 'none'}} className="ml-auto w-16 px-2 py-1 border border-slate-200 rounded-lg text-sm text-center" placeholder="#"/>
                      </label>
                      <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                        <input type="checkbox" name="tiene_vehiculo" checked={editFormData.tiene_vehiculo} onChange={e=>setEditFormData(p=>({...p,tiene_vehiculo:e.target.checked}))} className="w-4 h-4 text-[#001871] rounded"/>
                        <span className="text-sm font-medium text-slate-700">Tiene vehículo</span>
                        <div style={{display: editFormData.tiene_vehiculo ? '' : 'none'}} className="ml-auto flex gap-2">
                          <select name="tipo_vehiculo" value={editFormData.tipo_vehiculo} onChange={handleInputChange} className="text-xs border border-slate-200 rounded-lg px-2 py-1">
                            <option value="">Tipo...</option>
                            <option value="moto">Moto</option>
                            <option value="carro">Carro</option>
                            <option value="ambos">Ambos</option>
                          </select>
                          <input type="text" name="placa_vehiculo" value={editFormData.placa_vehiculo} onChange={handleInputChange} className="w-24 text-xs border border-slate-200 rounded-lg px-2 py-1 uppercase" placeholder="Placa"/>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TAB: CONTACTO ── */}
              <div style={{display: activeEditTab === 'contacto' ? '' : 'none'}}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Correos Electrónicos</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Correo Corporativo *</label>
                        <input name="correo_corporativo" type="email" value={editFormData.correo_corporativo} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Correo Personal</label>
                        <input name="correo_personal" type="email" value={editFormData.correo_personal} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Teléfonos y Dirección</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Teléfono Principal</label>
                        <input name="telefono" value={editFormData.telefono} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div/>
                      <div className="col-span-2">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Dirección de Residencia</label>
                        <input name="direccion" value={editFormData.direccion} onChange={handleInputChange} placeholder="Calle, número, barrio, ciudad..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Contacto de Emergencia</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nombre Completo</label>
                        <input name="nombre_contacto_emergencia" value={editFormData.nombre_contacto_emergencia} onChange={handleInputChange} placeholder="Ej. María García" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Parentesco</label>
                        <input name="parentesco_emergencia" value={editFormData.parentesco_emergencia} onChange={handleInputChange} placeholder="Ej. Madre, Esposo..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Teléfono de Emergencia</label>
                        <input name="telefono_emergencia" value={editFormData.telefono_emergencia} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TAB: LABORAL ── */}
              <div style={{display: activeEditTab === 'laboral' ? '' : 'none'}}>
                <div className="space-y-6">
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Asignación Organizacional</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Área / Departamento</label>
                        <select name="area_id" value={editFormData.area_id || ''} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar área...</option>
                          {areas.map(a=><option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Cargo</label>
                        <select name="cargo_id" value={editFormData.cargo_id || ''} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="">Seleccionar cargo...</option>
                          {cargos.map(c=><option key={c.id_cargo} value={c.id_cargo}>{c.nombre_cargo}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha de Ingreso</label>
                        <input type="date" name="fecha_ingreso" value={editFormData.fecha_ingreso} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── TAB: CONTRATO ── */}
              <div style={{display: activeEditTab === 'contrato' ? '' : 'none'}}>
                <div className="space-y-4">
                  {loadingContrato ? (
                    <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#001871]"/></div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest">
                          {contrato ? `Contrato Activo #${contrato.id}` : 'Sin contrato activo — crear nuevo'}
                        </h4>
                        {contrato && <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">ACTIVO</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de Contrato</label>
                          <select value={formContrato.tipo_contrato||''} onChange={e=>setFormContrato(p=>({...p,tipo_contrato:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                            <option value="">Seleccionar...</option>
                            <option value="termino_indefinido">Término Indefinido</option>
                            <option value="termino_fijo">Término Fijo</option>
                            <option value="obra_labor">Obra o Labor</option>
                            <option value="prestacion_servicios">Prestación de Servicios</option>
                            <option value="aprendizaje">Aprendizaje</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tipo de Salario</label>
                          <select value={formContrato.tipo_salario||''} onChange={e=>setFormContrato(p=>({...p,tipo_salario:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                            <option value="ordinario">Ordinario</option>
                            <option value="integral">Integral</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Salario</label>
                          <input type="number" value={formContrato.salario||''} onChange={e=>setFormContrato(p=>({...p,salario:e.target.value}))} placeholder="$ 0" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Forma de Pago</label>
                          <select value={formContrato.forma_pago||''} onChange={e=>setFormContrato(p=>({...p,forma_pago:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                            <option value="mensual">Mensual</option>
                            <option value="quincenal">Quincenal</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha Inicio</label>
                          <input type="date" value={formContrato.fecha_inicio||''} onChange={e=>setFormContrato(p=>({...p,fecha_inicio:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha Fin (si aplica)</label>
                          <input type="date" value={formContrato.fecha_fin||''} onChange={e=>setFormContrato(p=>({...p,fecha_fin:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Periodo de Prueba (días)</label>
                          <input type="number" value={formContrato.periodo_prueba_dias??''} onChange={e=>setFormContrato(p=>({...p,periodo_prueba_dias:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha de Firma</label>
                          <input type="date" value={formContrato.fecha_firma||''} onChange={e=>setFormContrato(p=>({...p,fecha_firma:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Jornada</label>
                          <select value={formContrato.jornada||''} onChange={e=>setFormContrato(p=>({...p,jornada:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                            <option value="completa">Completa</option>
                            <option value="medio_tiempo">Medio Tiempo</option>
                            <option value="flexible">Flexible</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Modalidad</label>
                          <select value={formContrato.modalidad||''} onChange={e=>setFormContrato(p=>({...p,modalidad:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                            <option value="presencial">Presencial</option>
                            <option value="remoto">Remoto</option>
                            <option value="hibrido">Híbrido</option>
                          </select>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Lugar de Trabajo</label>
                          <input value={formContrato.lugar_trabajo||''} onChange={e=>setFormContrato(p=>({...p,lugar_trabajo:e.target.value}))} placeholder="Ej. Medellín, Oficina Central..." className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                        </div>
                        <div className="col-span-2">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input type="checkbox" checked={formContrato.auxilio_transporte??true} onChange={e=>setFormContrato(p=>({...p,auxilio_transporte:e.target.checked}))} className="w-4 h-4 text-[#001871] rounded"/>
                            <span className="text-sm font-medium text-slate-700">Aplica auxilio de transporte</span>
                          </label>
                        </div>
                        <div className="col-span-2">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Observaciones</label>
                          <textarea value={formContrato.observaciones||''} onChange={e=>setFormContrato(p=>({...p,observaciones:e.target.value}))} rows={3} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none resize-none"/>
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button onClick={handleGuardarContrato} disabled={savingContrato} className="flex items-center gap-2 px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#002a4a] transition-colors disabled:opacity-50">
                          {savingContrato ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                          {contrato ? 'Actualizar Contrato' : 'Crear Contrato'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── TAB: SEGURIDAD SOCIAL ── */}
              <div style={{display: activeEditTab === 'ss' ? '' : 'none'}}>
                <div className="space-y-6">
                  {loadingSS ? (
                    <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-[#00bfb3]"/></div>
                  ) : (
                    <>
                      {[
                        { title: 'EPS', color: 'text-blue-700', fields: [
                          { label:'Entidad EPS', key:'eps', type:'select', opts: entEPS, optKey:'id', optLabel:'nombre' },
                          { label:'Número Afiliación', key:'numero_afiliacion_eps', type:'text' },
                          { label:'Fecha Afiliación', key:'fecha_afiliacion_eps', type:'date' },
                        ]},
                        { title: 'AFP (Pensión)', color: 'text-purple-700', fields: [
                          { label:'Fondo de Pensión', key:'afp', type:'select', opts: entAFP, optKey:'id', optLabel:'nombre' },
                          { label:'Número Afiliación', key:'numero_afiliacion_afp', type:'text' },
                          { label:'Fecha Afiliación', key:'fecha_afiliacion_afp', type:'date' },
                        ]},
                        { title: 'ARL', color: 'text-orange-700', fields: [
                          { label:'Aseguradora ARL', key:'arl', type:'select', opts: entARL, optKey:'id', optLabel:'nombre' },
                          { label:'Nivel de Riesgo', key:'nivel_riesgo_arl', type:'select', opts:[{id:'I',nombre:'I'},{id:'II',nombre:'II'},{id:'III',nombre:'III'},{id:'IV',nombre:'IV'},{id:'V',nombre:'V'}], optKey:'id', optLabel:'nombre' },
                          { label:'Número Póliza', key:'numero_poliza_arl', type:'text' },
                          { label:'Fecha Afiliación', key:'fecha_afiliacion_arl', type:'date' },
                        ]},
                        { title: 'Caja de Compensación', color: 'text-teal-700', fields: [
                          { label:'Caja', key:'caja_compensacion', type:'select', opts: cajas, optKey:'id', optLabel:'nombre' },
                          { label:'Número Afiliación', key:'numero_afiliacion_caja', type:'text' },
                          { label:'Fecha Afiliación', key:'fecha_afiliacion_caja', type:'date' },
                        ]},
                      ].map(section => (
                        <div key={section.title}>
                          <h4 className={`text-xs font-black uppercase tracking-widest border-b border-slate-200 pb-2 mb-3 ${section.color}`}>{section.title}</h4>
                          <div className="grid grid-cols-2 gap-3">
                            {section.fields.map(f => (
                              <div key={f.key} className={f.type==='date' ? '' : ''}>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{f.label}</label>
                                {f.type === 'select' ? (
                                  <select value={formSS[f.key]||''} onChange={e=>setFormSS(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                                    <option value="">Seleccionar...</option>
                                    {(f.opts||[]).map(o=><option key={o[f.optKey]} value={o[f.optKey]}>{o[f.optLabel]}</option>)}
                                  </select>
                                ) : (
                                  <input type={f.type} value={formSS[f.key]||''} onChange={e=>setFormSS(p=>({...p,[f.key]:e.target.value}))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none"/>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-end pt-2">
                        <button onClick={handleGuardarSS} disabled={savingSS} className="flex items-center gap-2 px-5 py-2.5 bg-[#00bfb3] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-[#009e93] transition-colors disabled:opacity-50">
                          {savingSS ? <Loader2 size={14} className="animate-spin"/> : <Save size={14}/>}
                          {ss ? 'Actualizar Seguridad Social' : 'Guardar Seguridad Social'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* ── TAB: ACADÉMICO ── */}
              <div style={{display: activeEditTab === 'academico' ? '' : 'none'}}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest">Formación Académica</h4>
                    {!editandoAcad && (
                      <button onClick={()=>{setFormAcad(ACAD_VACIO);setEditandoAcad('nuevo');setDiplomaFile(null);}} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#001871] text-white rounded-xl text-xs font-bold hover:bg-[#002a4a] transition-colors">
                        <Plus size={13}/> Agregar
                      </button>
                    )}
                  </div>
                  {loadingAcad ? (
                    <div className="flex items-center justify-center py-12"><Loader2 size={24} className="animate-spin text-[#001871]"/></div>
                  ) : (
                    <>
                      {editandoAcad && (
                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-5 space-y-4">
                          <h5 className="text-xs font-black text-indigo-800 uppercase tracking-wider">{editandoAcad==='nuevo'?'Nuevo Registro Académico':'Editar Registro'}</h5>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nivel Educativo *</label>
                              <select value={formAcad.nivel_educativo||''} onChange={e=>setFormAcad(p=>({...p,nivel_educativo:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none">
                                <option value="">Seleccionar...</option>
                                {Object.entries(NIVEL_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Título Obtenido *</label>
                              <input value={formAcad.titulo_obtenido||''} onChange={e=>setFormAcad(p=>({...p,titulo_obtenido:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"/>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Institución *</label>
                              <input value={formAcad.institucion||''} onChange={e=>setFormAcad(p=>({...p,institucion:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"/>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Ciudad Institución</label>
                              <input value={formAcad.ciudad_institucion||''} onChange={e=>setFormAcad(p=>({...p,ciudad_institucion:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"/>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha Inicio</label>
                              <input type="date" value={formAcad.fecha_inicio||''} onChange={e=>setFormAcad(p=>({...p,fecha_inicio:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"/>
                            </div>
                            {!formAcad.en_curso && (
                              <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Fecha Graduación</label>
                                <input type="date" value={formAcad.fecha_graduacion||''} onChange={e=>setFormAcad(p=>({...p,fecha_graduacion:e.target.value}))} className="w-full px-3 py-2.5 bg-white border border-indigo-200 rounded-xl text-sm outline-none"/>
                              </div>
                            )}
                            <div className="col-span-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={formAcad.en_curso||false} onChange={e=>setFormAcad(p=>({...p,en_curso:e.target.checked}))} className="w-4 h-4 text-indigo-600 rounded"/>
                                <span className="text-sm text-slate-700">En curso actualmente</span>
                              </label>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Diploma / Certificado (PDF/imagen)</label>
                              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e=>setDiplomaFile(e.target.files[0]||null)} className="w-full text-sm text-slate-600 file:mr-3 file:px-3 file:py-1.5 file:bg-indigo-100 file:text-indigo-700 file:rounded-lg file:border-0 file:text-xs file:font-bold"/>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={()=>{setEditandoAcad(null);setFormAcad({});setDiplomaFile(null);}} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleGuardarAcad} disabled={savingAcad||!formAcad.nivel_educativo||!formAcad.titulo_obtenido||!formAcad.institucion} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50">
                              {savingAcad?<Loader2 size={13} className="animate-spin"/>:<Save size={13}/>} Guardar
                            </button>
                          </div>
                        </div>
                      )}
                      {academicos.length === 0 && !editandoAcad ? (
                        <div className="text-center py-10">
                          <GraduationCap size={36} className="mx-auto text-slate-300 mb-2"/>
                          <p className="text-sm text-slate-400">Sin registros académicos</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {academicos.map(r => (
                            <div key={r.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-black uppercase tracking-tight text-[#001871]">{NIVEL_LABELS[r.nivel_educativo]||r.nivel_educativo}</span>
                                  {r.en_curso && <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">En curso</span>}
                                </div>
                                <p className="text-sm font-semibold text-slate-800 truncate">{r.titulo_obtenido}</p>
                                <p className="text-xs text-slate-500 truncate">{r.institucion}{r.ciudad_institucion ? ` · ${r.ciudad_institucion}` : ''}</p>
                                {r.fecha_graduacion && <p className="text-[10px] text-slate-400 mt-0.5">Graduado: {r.fecha_graduacion}</p>}
                                {r.archivo_diploma && <a href={r.archivo_diploma} target="_blank" rel="noreferrer" className="text-[10px] text-blue-600 hover:underline">Ver diploma</a>}
                              </div>
                              <div className="flex gap-1 flex-shrink-0">
                                <button onClick={()=>{setFormAcad({...r});setEditandoAcad(r.id);setDiplomaFile(null);}} className="p-1.5 text-slate-400 hover:text-[#001871] hover:bg-slate-200 rounded-lg transition-colors"><Edit3 size={13}/></button>
                                <button onClick={()=>handleEliminarAcad(r.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash size={13}/></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* ── TAB: SISTEMA ── */}
              <div style={{display: activeEditTab === 'sistema' ? '' : 'none'}}>
                <div className="space-y-5">
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Rol y Estado</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Rol / Permisos</label>
                        <select name="id_permisos" value={editFormData.id_permisos} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value={1}>Administrador</option>
                          <option value={2}>Editor</option>
                          <option value={3}>Usuario</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Estado</label>
                        <select name="estado" value={editFormData.estado} onChange={handleInputChange} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-[#001871]/20 outline-none">
                          <option value="ACTIVA">Activa</option>
                          <option value="INACTIVO">Inactivo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-indigo-50 rounded-xl border border-indigo-100 cursor-pointer">
                      <input type="checkbox" checked={editFormData.permitir_edicion_datos} onChange={e=>setEditFormData(p=>({...p,permitir_edicion_datos:e.target.checked}))} className="w-4 h-4 text-indigo-600 rounded"/>
                      <span className="text-sm font-medium text-indigo-900">Permitir que el usuario edite su propio perfil</span>
                    </label>
                    {isSuperAdmin && (
                      <label className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl border border-emerald-100 cursor-pointer">
                        <input type="checkbox" checked={certPermEdit} onChange={e=>setCertPermEdit(e.target.checked)} className="w-4 h-4 text-emerald-600 rounded"/>
                        <span className="text-sm font-medium text-emerald-900">Puede expedir certificados de empleo</span>
                      </label>
                    )}
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest border-b border-slate-200 pb-2 mb-4">Accesos SQF</h4>
                    <div className="bg-amber-50 rounded-xl border border-amber-100 p-4 grid grid-cols-2 gap-3">
                      {[
                        { key:'acceso_sqf_clientes', label:'Clientes' },
                        { key:'acceso_sqf_contratos', label:'Contratos' },
                        { key:'acceso_sqf_facturacion', label:'Facturación' },
                        { key:'acceso_sqf_auditoria', label:'Auditoría' },
                      ].map(({key,label})=>(
                        <label key={key} className="flex items-center gap-3 cursor-pointer">
                          <input type="checkbox" checked={editFormData[key]} onChange={e=>setEditFormData(p=>({...p,[key]:e.target.checked}))} className="w-4 h-4 text-amber-600 rounded"/>
                          <span className="text-sm font-medium text-amber-900">{label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-xs font-black text-[#001871] uppercase tracking-widest flex items-center gap-2"><Lock size={13}/>Cambiar Contraseña</h4>
                        <button onClick={()=>setShowPasswordSection(p=>!p)} className="text-xs font-semibold text-blue-600 hover:text-blue-700">{showPasswordSection?'Ocultar':'Mostrar'}</button>
                      </div>
                      {showPasswordSection && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-5 space-y-4">
                          <p className="text-xs text-amber-700"><AlertTriangle size={11} className="inline mr-1"/>Debes validar tus credenciales de SuperAdmin para cambiar la contraseña.</p>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Nueva Contraseña</label>
                              <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none" minLength={6}/>
                            </div>
                            <div>
                              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Tu Contraseña (SuperAdmin)</label>
                              <input type="password" value={adminPassword} onChange={e=>setAdminPassword(e.target.value)} placeholder="Validar identidad" className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none"/>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button onClick={()=>{setNewPassword('');setAdminPassword('');}} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-300 transition-colors">Limpiar</button>
                            <button onClick={handleChangePassword} disabled={changingPassword||!newPassword||!adminPassword} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#002a4a] transition-colors disabled:opacity-50">
                              {changingPassword?<><Loader2 size={13} className="animate-spin"/>Actualizando...</>:<><KeyRound size={13}/>Cambiar Contraseña</>}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
              <span className="text-xs text-slate-400">ID: {editingUser.id_empleado}</span>
              <div className="flex gap-3">
                <button onClick={()=>setEditingUser(null)} className="px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors">Cancelar</button>
                {['personal','contacto','laboral','sistema'].includes(activeEditTab) && (
                  <button onClick={handleSaveEdit} disabled={updating} className="px-5 py-2.5 bg-[#001871] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#002a4a] transition-colors flex items-center gap-2 disabled:opacity-50">
                    {updating?<Loader2 size={14} className="animate-spin"/>:<Save size={14}/>} Guardar Cambios
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ConfirmDeleteModal = ({ user, onClose, onConfirm, updating }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-red-950/20 backdrop-blur-sm" onClick={onClose}></div>
    <div className="bg-white rounded-[32px] w-full max-w-sm relative z-10 shadow-2xl p-8 text-center">
      <div className="w-16 h-16 bg-red-50 text-red-500 mx-auto rounded-full flex items-center justify-center mb-4">
        <AlertTriangle size={32} />
      </div>
      <h3 className="text-xl font-black text-[#001871]">¿Eliminar Registro?</h3>
      <p className="text-sm text-slate-500 mt-2">
        {user?.primer_nombre} {user?.segundo_nombre} {user?.primer_apellido} {user?.segundo_apellido}
      </p>
      <div className="grid grid-cols-2 gap-3 mt-8">
        <button 
          onClick={onClose} 
          disabled={updating}
          className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase disabled:opacity-50"
        >
          Cancelar
        </button>
        <button 
          onClick={() => onConfirm(user)}
          disabled={updating}
          className="py-4 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-red-200 active:scale-95 transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {updating ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
        </button>
      </div>
    </div>
  </div>
);

const DetailItem = ({ icon, label, value, isStatus, status, colSpan }) => (
  <div className={`space-y-1 ${colSpan ? 'col-span-2' : ''}`}>
    <div className="flex items-center gap-2 text-slate-400">
      {icon}
      <span className="text-[10px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <p className={`text-sm font-bold truncate ${isStatus ? (status === 'ACTIVA' ? 'text-emerald-600' : 'text-red-600') : 'text-slate-700'}`}>
      {value || 'Sin información'}
    </p>
  </div>
);

export default UserTable;
