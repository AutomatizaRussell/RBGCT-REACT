import { useState, useEffect } from 'react';
import { Edit2, Trash2, Mail, AlertTriangle, X, Check, Loader2, Search, Calendar, Briefcase, Activity, History, ArrowRight, ArrowLeft, TrendingUp, UserCheck, UserX, RefreshCw, FileText, DollarSign, BookOpen } from 'lucide-react';
import { fetchApi, getAllAreas, getAllCargos, getHistorialEmpleado, toggleEncargadoCursos } from '../../../lib/api.js';

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);
  const [areas, setAreas] = useState([]);
  const [cargos, setCargos] = useState([]);
  const [selAreaId, setSelAreaId] = useState('');
  const [selCargoId, setSelCargoId] = useState('');
  const [modalTab, setModalTab] = useState('info');
  const [historial, setHistorial] = useState([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await fetchApi('/empleados/');
      
      if (data.error) {
        console.error('Error de API:', data.error);
        return;
      }
      
      // Transformar datos de la API al formato esperado por el componente
      const transformedData = (data || []).map(emp => ({
        id_empleado: emp.id_empleado,
        correo_corporativo: emp.correo_corporativo,
        fecha_ingreso: emp.fecha_ingreso,
        estado: emp.estado,
        es_encargado_cursos: emp.es_encargado_cursos || false,
        datos_personales: {
          id_cc: emp.numero_documento,
          nom_empleado: emp.primer_nombre,
          ape_empleado: emp.primer_apellido,
          telefono: emp.telefono,
          rh: emp.tipo_sangre,
          genero: emp.sexo,
          direccion: emp.direccion
        },
        administracion: {
          area_id: emp.area_id,
          nom_area: emp.nombre_area,
          cargo_id: emp.cargo_id,
          nom_cargo: emp.nombre_cargo,
          salario: emp.salario
        }
      }));
      
      setUsers(transformedData);
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    getAllAreas().then(data => setAreas(Array.isArray(data) ? data : [])).catch(() => {});
    getAllCargos().then(data => setCargos(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  // Inicializar selects controlados cuando se abre el modal de edición
  useEffect(() => {
    if (editingUser) {
      setSelAreaId(editingUser.administracion?.area_id?.toString() || '');
      setSelCargoId(editingUser.administracion?.cargo_id?.toString() || '');
      setModalTab('info');
      setHistorial([]);
    }
  }, [editingUser?.id_empleado]);

  const handleTabHistorial = async () => {
    setModalTab('historial');
    if (historial.length > 0) return;
    setLoadingHistorial(true);
    try {
      const data = await getHistorialEmpleado(editingUser.id_empleado);
      setHistorial(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const userToDelete = users.find(u => u.datos_personales?.id_cc === id);
      if (!userToDelete) return;
      
      const response = await fetchApi(`/empleados/${userToDelete.id_empleado}/`, {
        method: 'DELETE'
      });

      if (response.error) throw new Error(response.error);
      setUsers(users.filter(user => user.datos_personales?.id_cc !== id));
      setDeletingUser(null);
    } catch (err) {
      alert("Error al eliminar: " + err.message);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData(e.target);
    const form = Object.fromEntries(formData);

    const payload = {
      primer_nombre: form.nom_empleado,
      primer_apellido: form.ape_empleado,
      telefono: form.telefono || null,
      tipo_sangre: form.rh || null,
      sexo: form.genero || null,
      correo_corporativo: form.correo_corporativo,
      estado: form.estado,
      ...(selAreaId ? { area: parseInt(selAreaId, 10) } : {}),
      ...(selCargoId ? { cargo: parseInt(selCargoId, 10) } : {}),
      ...(form.fecha_ingreso ? { fecha_ingreso: form.fecha_ingreso } : {}),
    };

    try {
      await fetchApi(`/empleados/${editingUser.id_empleado}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      await fetchUsers(true);
      setEditingUser(null);
    } catch (error) {
      console.error('Error guardando perfil:', error);
      alert('Error al guardar: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleToggleEncargado = async (user) => {
    const nuevoValor = !user.es_encargado_cursos;
    try {
      await toggleEncargadoCursos(user.id_empleado, nuevoValor);
      setUsers(prev => prev.map(u =>
        u.id_empleado === user.id_empleado ? { ...u, es_encargado_cursos: nuevoValor } : u
      ));
    } catch (err) {
      alert('Error al actualizar permiso: ' + err.message);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    const personal = user.datos_personales;
    const admin = user.administracion;
    return (
      personal?.nom_empleado?.toLowerCase().includes(term) ||
      personal?.ape_empleado?.toLowerCase().includes(term) ||
      user.correo_corporativo?.toLowerCase().includes(term) ||
      admin?.nom_area?.toLowerCase().includes(term) ||
      user.estado?.toLowerCase().includes(term) ||
      personal?.id_cc?.toString().includes(term)
    );
  });

  const MOV_CFG = {
    INGRESO:          { label: 'Ingreso',               color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500', Icon: UserCheck },
    CAMBIO_CARGO:     { label: 'Cambio de Cargo',       color: 'bg-blue-100 text-blue-700',       dot: 'bg-blue-500',    Icon: Briefcase },
    TRASLADO:         { label: 'Traslado de Área',      color: 'bg-violet-100 text-violet-700',   dot: 'bg-violet-500',  Icon: ArrowRight },
    AJUSTE_SALARIAL:  { label: 'Ajuste Salarial',       color: 'bg-amber-100 text-amber-700',     dot: 'bg-amber-500',   Icon: DollarSign },
    CAMBIO_CONTRATO:  { label: 'Cambio de Contrato',    color: 'bg-cyan-100 text-cyan-700',       dot: 'bg-cyan-500',    Icon: FileText },
    CAMBIO_MODALIDAD: { label: 'Cambio de Modalidad',   color: 'bg-slate-100 text-slate-700',     dot: 'bg-slate-400',   Icon: RefreshCw },
    RETIRO:           { label: 'Retiro',                color: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     Icon: UserX },
    REINTEGRO:        { label: 'Reintegro',             color: 'bg-teal-100 text-teal-700',       dot: 'bg-teal-500',    Icon: UserCheck },
    NUEVO_CONTRATO:   { label: 'Nuevo Contrato',        color: 'bg-indigo-100 text-indigo-700',   dot: 'bg-indigo-500',  Icon: FileText },
    RENOVACION:       { label: 'Renovación',            color: 'bg-orange-100 text-orange-700',   dot: 'bg-orange-500',  Icon: TrendingUp },
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative space-y-4">
      {/* BUSCADOR */}
      <div className="relative max-w-sm">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400">
          <Search size={16} />
        </div>
        <input
          type="text"
          placeholder="Buscar colaborador..."
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-sm font-medium shadow-sm focus:border-blue-200 transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[520px]">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden sm:table-cell">Área</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden md:table-cell">Estado</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden lg:table-cell">Correo Corp.</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] hidden lg:table-cell">Ingreso</th>
              <th className="px-4 sm:px-8 py-4 sm:py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr key={user.id_empleado} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-4 sm:px-8 py-4 sm:py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#f1f5f9] rounded-full flex items-center justify-center font-bold text-[#001871] text-xs shrink-0">
                      {user.datos_personales?.nom_empleado?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-800 tracking-tight truncate">
                        {user.datos_personales?.nom_empleado} {user.datos_personales?.ape_empleado}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">ID: {user.datos_personales?.id_cc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 hidden sm:table-cell">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Briefcase size={14} className="text-slate-400" />
                    {user.administracion?.nom_area || 'N/A'}
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 hidden md:table-cell">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full ${
                    user.estado?.toLowerCase() === 'activa' || user.estado?.toLowerCase() === 'activo'
                      ? 'bg-green-50 text-green-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Activity size={10} />
                    {user.estado || 'N/A'}
                  </span>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 text-xs font-semibold text-slate-600 hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    <span className="truncate max-w-[140px]">{user.correo_corporativo}</span>
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6 text-xs font-semibold text-slate-600 hidden lg:table-cell">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {user.fecha_ingreso}
                  </div>
                </td>
                <td className="px-4 sm:px-8 py-4 sm:py-6">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleEncargado(user)}
                      title={user.es_encargado_cursos ? 'Quitar encargado de cursos' : 'Asignar como encargado de cursos'}
                      className={`p-2 rounded-lg transition-colors ${
                        user.es_encargado_cursos
                          ? 'bg-purple-100 text-purple-600 hover:bg-purple-200'
                          : 'text-slate-300 hover:bg-purple-50 hover:text-purple-400'
                      }`}
                    >
                      <BookOpen size={14} />
                    </button>
                    <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => { setDeletingUser(user); if(deletingUser || confirm('¿Eliminar este usuario?')) handleDelete(user.datos_personales.id_cc); }} className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {/* MODAL DE EDICIÓN COMPLETO */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001871]/40 backdrop-blur-sm" onClick={() => !updating && setEditingUser(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-2xl relative z-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-[#001871]">Expediente del Colaborador</h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">
                  Modificando Registro ID: {editingUser.datos_personales?.id_cc}
                </p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            {/* TABS */}
            <div className="flex border-b border-slate-100 px-8 bg-white">
              <button
                type="button"
                onClick={() => setModalTab('info')}
                className={`px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                  modalTab === 'info'
                    ? 'border-[#001871] text-[#001871]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Información
              </button>
              <button
                type="button"
                onClick={handleTabHistorial}
                className={`flex items-center gap-1.5 px-4 py-3 text-[11px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                  modalTab === 'historial'
                    ? 'border-[#001871] text-[#001871]'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <History size={12}/> Historial Laboral
              </button>
            </div>

            {modalTab === 'historial' ? (
              <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                {loadingHistorial ? (
                  <div className="flex items-center justify-center py-16 text-slate-400">
                    <Loader2 size={24} className="animate-spin mr-2"/> Cargando historial...
                  </div>
                ) : historial.length === 0 ? (
                  <div className="text-center py-16 text-slate-400">
                    <History size={32} className="mx-auto mb-3 text-slate-200"/>
                    <p className="text-sm">Sin movimientos registrados aún.</p>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="absolute left-[19px] top-0 bottom-0 w-px bg-slate-100"/>
                    <div className="space-y-4">
                      {historial.map(mov => {
                        const cfg = MOV_CFG[mov.tipo] || { label: mov.tipo, color: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', Icon: History };
                        const { Icon } = cfg;
                        const fecha = mov.fecha_movimiento
                          ? new Date(`${mov.fecha_movimiento}T00:00:00`).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
                          : '—';
                        return (
                          <div key={mov.id} className="flex gap-4 relative pl-1">
                            <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                              <Icon size={14}/>
                            </div>
                            <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
                              <div className="flex items-start justify-between gap-2">
                                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded-full ${cfg.color}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>
                                  {cfg.label}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium shrink-0">{fecha}</span>
                              </div>
                              {(mov.valor_anterior || mov.valor_nuevo) && (
                                <div className="flex items-center gap-2 mt-2 text-xs">
                                  {mov.valor_anterior && (
                                    <span className="text-slate-400 line-through">{mov.valor_anterior}</span>
                                  )}
                                  {mov.valor_anterior && mov.valor_nuevo && (
                                    <ArrowRight size={12} className="text-slate-300 flex-shrink-0"/>
                                  )}
                                  {mov.valor_nuevo && (
                                    <span className="font-semibold text-slate-700">{mov.valor_nuevo}</span>
                                  )}
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
            ) : (

            <form className="p-4 sm:p-8 space-y-6 sm:space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar" onSubmit={handleUpdate}>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-blue-500"></span> Información Personal
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Nombres</label>
                    <input name="nom_empleado" type="text" defaultValue={editingUser.datos_personales?.nom_empleado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none transition-all focus:bg-white focus:border-blue-200" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Apellidos</label>
                    <input name="ape_empleado" type="text" defaultValue={editingUser.datos_personales?.ape_empleado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none transition-all focus:bg-white focus:border-blue-200" required />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Teléfono</label>
                    <input name="telefono" type="text" defaultValue={editingUser.datos_personales?.telefono} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">RH</label>
                    <input name="rh" type="text" defaultValue={editingUser.datos_personales?.rh} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Género</label>
                    <select name="genero" defaultValue={editingUser.datos_personales?.genero} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none">
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-purple-500"></span> Información Administrativa
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Correo Corporativo</label>
                    <input name="correo_corporativo" type="email" defaultValue={editingUser.correo_corporativo} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado Contrato</label>
                    <select name="estado" defaultValue={editingUser.estado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none">
                      <option value="ACTIVA">ACTIVA</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Área / Departamento</label>
                    <select
                      value={selAreaId}
                      onChange={e => setSelAreaId(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-purple-200"
                    >
                      <option value="">Sin área</option>
                      {areas.map(a => (
                        <option key={a.id_area} value={String(a.id_area)}>{a.nombre_area}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Cargo</label>
                    <select
                      value={selCargoId}
                      onChange={e => setSelCargoId(e.target.value)}
                      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-purple-200"
                    >
                      <option value="">Sin cargo</option>
                      {cargos.map(c => (
                        <option key={c.id_cargo} value={String(c.id_cargo)}>{c.nombre_cargo}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Fecha de Ingreso</label>
                    <input name="fecha_ingreso" type="date" defaultValue={editingUser.fecha_ingreso || ''} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none focus:border-purple-200" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Salario Mensual</label>
                    <input name="salario" type="number" step="0.01" defaultValue={editingUser.administracion?.salario} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono text-green-600" />
                  </div>
                </div>
              </div>

              <div className="pt-4 pb-2">
                <button 
                  type="submit" 
                  disabled={updating}
                  className="w-full bg-[#001871] text-white py-5 rounded-[20px] font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:bg-blue-600 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {updating ? (
                    <><Loader2 className="animate-spin" size={18} /> Guardando...</>
                  ) : (
                    <><Check size={18} /> Guardar Cambios en el Sistema</>
                  )}
                </button>
              </div>
            </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;