import { useState, useEffect, useContext } from 'react';
import { Trash2, Shield, ShieldCheck, UserX, UserCheck, X, Check, Loader2, Search, Mail, Calendar, Hash, Briefcase, Info, AlertTriangle, Activity, Edit3, Save, UserPlus, Lock, KeyRound } from 'lucide-react';
import { getAllEmpleados, updateEmpleado, cambiarEstadoEmpleado, deleteEmpleado, getAllCargos, getAllAreas, actualizarPasswordEmpleado } from '../../lib/api';
import RoleModal from './RoleModal';
import AuthContext from '../../context/AuthContext';

const UserTable = () => {
  const { 
    isSuperAdmin, 
    isAdmin,
    isEditor,
    canViewInactiveUsers, 
    canReactivateUsers, 
    canDeleteUsers,
    canEditUsers,
    canChangeRoles,
    canDeactivateUsers,
    user
  } = useContext(AuthContext);
  
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingUser, setManagingUser] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null); 
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [filterTab, setFilterTab] = useState('activos'); // 'activos' | 'inactivos'
  
  // Estado único para el modal de Roles
  const [roleModalUser, setRoleModalUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [cargos, setCargos] = useState([]);
  const [areas, setAreas] = useState([]);

  // Estados para cambio de contraseña
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await getAllEmpleados();
      setUsers(data || []);
    } catch (err) {
      console.error('Error cargando empleados:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCargos = async () => {
    try {
      const data = await getAllCargos();
      setCargos(data || []);
    } catch (err) {
      console.error('Error cargando cargos:', err);
    }
  };

  const fetchAreas = async () => {
    try {
      const data = await getAllAreas();
      setAreas(data || []);
    } catch (err) {
      console.error('Error cargando áreas:', err);
    }
  };

  useEffect(() => { 
    fetchUsers();
    fetchCargos();
    fetchAreas();
  }, []);

  const toggleUserStatus = async (user) => {
    // Verificar permisos
    const isActivating = user.estado === 'INACTIVA';
    
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
    const nuevoEstado = user.estado === 'ACTIVA' ? 'INACTIVA' : 'ACTIVA';
    try {
      await cambiarEstadoEmpleado(user.id_empleado, nuevoEstado);
      await fetchUsers();
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
      await fetchUsers();
      setConfirmDelete(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    } finally {
      setDeleting(false);
    }
  };

  // Funciones para editar perfil
  const handleEditClick = (user, e) => {
    e.stopPropagation();
    setEditingUser(user);
    setEditFormData({
      // Datos básicos
      primer_nombre: user.primer_nombre || '',
      segundo_nombre: user.segundo_nombre || '',
      primer_apellido: user.primer_apellido || '',
      segundo_apellido: user.segundo_apellido || '',
      apodo: user.apodo || '',
      
      // Contacto
      correo_corporativo: user.correo_corporativo || '',
      correo_personal: user.correo_personal || '',
      telefono: user.telefono || '',
      telefono_emergencia: user.telefono_emergencia || '',
      direccion: user.direccion || '',
      
      // Datos personales
      fecha_nacimiento: user.fecha_nacimiento || '',
      sexo: user.sexo || '',
      tipo_sangre: user.tipo_sangre || '',
      
      // Asignación
      area_id: user.area_id || null,
      cargo_id: user.cargo_id || null,
      fecha_ingreso: user.fecha_ingreso || '',
      
      // Permisos y estado
      id_permisos: user.id_permisos || 3,
      estado: user.estado || 'ACTIVA',
      permitir_edicion_datos: user.permitir_edicion_datos || false
    });
  };

  const handleSaveEdit = async () => {
    try {
      setUpdating(true);
      console.log('[SAVE EDIT] Datos a enviar:', editFormData);
      console.log('[SAVE EDIT] permitir_edicion_datos:', editFormData.permitir_edicion_datos);
      await updateEmpleado(editingUser.id_empleado, editFormData);
      await fetchUsers();
      setEditingUser(null);
      alert('Perfil actualizado correctamente');
    } catch (error) {
      alert('Error guardando cambios: ' + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
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

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-bold uppercase tracking-widest text-[10px]">Cargando Panel de Control...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="flex justify-between items-center gap-4">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-sm shadow-sm focus:ring-2 ring-blue-500/5 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        {/* Tabs de filtro - Solo visible para Super Admin */}
        {canViewInactiveUsers && (
          <div className="flex bg-white rounded-2xl border border-slate-100 p-1 shadow-sm">
            <button
              onClick={() => setFilterTab('activos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                filterTab === 'activos' 
                  ? 'bg-emerald-500 text-white' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFilterTab('inactivos')}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
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

      {/* TABLA CENTRALIZADA */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permisos/Área</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Gestión de Seguridad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr 
                key={user.id_empleado} 
                className="hover:bg-slate-50/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedUser(user)}
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${user.estado === 'ACTIVA' ? 'bg-[#001e33] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {user.primer_nombre?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.primer_nombre} {user.segundo_nombre} {user.primer_apellido} {user.segundo_apellido}</p>
                      <p className="text-[11px] text-slate-400">{user.correo_corporativo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{user.nombre_area || 'Sin Área'}</span>
                    <span className="text-[10px] font-black uppercase text-blue-500 mt-1 flex items-center gap-1">
                      <Shield size={10} />
                      {user.id_permisos === 1 ? 'Administrador' : user.id_permisos === 2 ? 'Editor' : 'Usuario'}
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase flex items-center w-fit gap-1.5 ${user.estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.estado === 'ACTIVA' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.estado === 'ACTIVA' ? 'Habilitado' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-8 py-6 text-right" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-2">
                    {/* ACCIÓN: REACTIVAR - Solo Super Admin para usuarios inactivos */}
                    {user.estado === 'INACTIVA' && canReactivateUsers && (
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

      {/* MODALES MANTENIDOS */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001e33]/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedUser(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-2xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#001e33] p-8 text-white flex justify-between items-start">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-2xl font-black">{selectedUser.primer_nombre?.charAt(0)}</div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">{selectedUser.primer_nombre} {selectedUser.segundo_nombre} {selectedUser.primer_apellido} {selectedUser.segundo_apellido}</h3>
                  <p className="text-slate-400 text-sm">{selectedUser.correo_corporativo}</p>
                </div>
              </div>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24}/></button>
            </div>
            <div className="p-10 grid grid-cols-2 gap-8">
              <DetailItem icon={<Hash size={16}/>} label="ID Empleado" value={selectedUser.id_empleado} />
              <DetailItem icon={<Info size={16}/>} label="Área" value={selectedUser.nombre_area} />
              <DetailItem icon={<Briefcase size={16}/>} label="Cargo" value={selectedUser.nombre_cargo} />
              <DetailItem icon={<Calendar size={16}/>} label="Ingreso" value={selectedUser.fecha_ingreso} />
              <DetailItem icon={<Activity size={16}/>} label="Estado" value={selectedUser.estado} isStatus status={selectedUser.estado} />
              <DetailItem icon={<Mail size={16}/>} label="Email" value={selectedUser.correo_corporativo} />
              <DetailItem icon={<Shield size={16}/>} label="UUID Autenticación" value={selectedUser.auth_id} colSpan />
            </div>
            <div className="bg-slate-50 p-6 flex justify-end">
              <button onClick={() => setSelectedUser(null)} className="px-8 py-3 bg-[#001e33] text-white rounded-2xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-transform">Cerrar Ficha</button>
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
            <h3 className="text-2xl font-black text-[#001e33]">Control de Acceso</h3>
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
          <div className="absolute inset-0 bg-[#001e33]/80 backdrop-blur-md" onClick={() => setEditingUser(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-4xl relative z-10 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-[#001e33] p-6 flex justify-between items-center">
              <h3 className="text-xl font-black text-white">Editar Perfil Completo de Empleado</h3>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X size={24} className="text-white"/></button>
            </div>
            <div className="p-8 space-y-8 max-h-[80vh] overflow-y-auto">
              {/* SECCIÓN: DATOS BÁSICOS */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest border-b border-slate-200 pb-2">Datos Básicos</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primer Nombre *</label>
                    <input 
                      name="primer_nombre" 
                      value={editFormData.primer_nombre} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Segundo Nombre</label>
                    <input 
                      name="segundo_nombre" 
                      value={editFormData.segundo_nombre} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Primer Apellido *</label>
                    <input 
                      name="primer_apellido" 
                      value={editFormData.primer_apellido} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Segundo Apellido</label>
                    <input 
                      name="segundo_apellido" 
                      value={editFormData.segundo_apellido} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Apodo / Nombre de Usuario</label>
                    <input 
                      name="apodo" 
                      value={editFormData.apodo} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                      placeholder="Cómo desea ser llamado/a"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: CONTACTO */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest border-b border-slate-200 pb-2">Información de Contacto</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Correo Corporativo *</label>
                    <input 
                      name="correo_corporativo" 
                      type="email"
                      value={editFormData.correo_corporativo} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Correo Personal</label>
                    <input 
                      name="correo_personal" 
                      type="email"
                      value={editFormData.correo_personal} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Teléfono</label>
                    <input 
                      name="telefono" 
                      value={editFormData.telefono} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Teléfono Emergencia</label>
                    <input 
                      name="telefono_emergencia" 
                      value={editFormData.telefono_emergencia} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dirección</label>
                    <input 
                      name="direccion" 
                      value={editFormData.direccion} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                      placeholder="Calle, número, ciudad..."
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: DATOS PERSONALES */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest border-b border-slate-200 pb-2">Datos Personales</h4>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fecha de Nacimiento</label>
                    <input 
                      name="fecha_nacimiento" 
                      type="date"
                      value={editFormData.fecha_nacimiento} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Sexo</label>
                    <select 
                      name="sexo" 
                      value={editFormData.sexo} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      <option value="M">Masculino</option>
                      <option value="F">Femenino</option>
                      <option value="O">Otro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Tipo de Sangre</label>
                    <select 
                      name="tipo_sangre" 
                      value={editFormData.tipo_sangre} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
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
                </div>
              </div>

              {/* SECCIÓN: ASIGNACIÓN */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest border-b border-slate-200 pb-2">Asignación</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Área / Departamento</label>
                    <select 
                      name="area_id" 
                      value={editFormData.area_id || ''} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    >
                      <option value="">Seleccionar área...</option>
                      {areas.map(area => (
                        <option key={area.id_area} value={area.id_area}>
                          {area.nombre_area}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Cargo</label>
                    <select 
                      name="cargo_id" 
                      value={editFormData.cargo_id || ''} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    >
                      <option value="">Seleccionar cargo...</option>
                      {cargos.map(cargo => (
                        <option key={cargo.id_cargo} value={cargo.id_cargo}>
                          {cargo.nombre_cargo}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Fecha de Ingreso</label>
                    <input 
                      name="fecha_ingreso" 
                      type="date"
                      value={editFormData.fecha_ingreso} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECCIÓN: PERMISOS Y CONFIGURACIÓN */}
              <div className="space-y-4">
                <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest border-b border-slate-200 pb-2">Permisos y Configuración</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Rol/Permisos</label>
                    <select 
                      name="id_permisos" 
                      value={editFormData.id_permisos} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    >
                      <option value={1}>Administrador</option>
                      <option value={2}>Editor</option>
                      <option value={3}>Usuario</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Estado</label>
                    <select 
                      name="estado" 
                      value={editFormData.estado} 
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                    >
                      <option value="ACTIVA">Activa</option>
                      <option value="INACTIVO">Inactivo</option>
                    </select>
                  </div>
                </div>
                
                {/* Toggle para permitir edición de datos */}
                <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                  <input 
                    type="checkbox"
                    id="permitir_edicion"
                    name="permitir_edicion_datos"
                    checked={editFormData.permitir_edicion_datos}
                    onChange={(e) => setEditFormData(prev => ({...prev, permitir_edicion_datos: e.target.checked}))}
                    className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <label htmlFor="permitir_edicion" className="text-sm font-medium text-indigo-900 cursor-pointer">
                    Permitir que el usuario edite su propio perfil
                  </label>
                </div>
              </div>

              {/* SECCIÓN: SEGURIDAD - Solo visible para SuperAdmin */}
              {isSuperAdmin && (
                <div className="space-y-4 border-t border-slate-200 pt-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-[#001e33] uppercase tracking-widest flex items-center gap-2">
                      <Lock size={16} />
                      Seguridad - Cambiar Contraseña
                    </h4>
                    <button
                      type="button"
                      onClick={() => setShowPasswordSection(!showPasswordSection)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                    >
                      {showPasswordSection ? 'Ocultar' : 'Mostrar'} opciones
                    </button>
                  </div>
                  
                  {showPasswordSection && (
                    <div className="bg-amber-50/50 border border-amber-100 rounded-2xl p-6 space-y-4">
                      <p className="text-xs text-amber-700 mb-4">
                        <AlertTriangle size={12} className="inline mr-1" />
                        Esta acción cambiará la contraseña del usuario. Debes validar tus credenciales de SuperAdmin.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Nueva Contraseña
                          </label>
                          <input
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Mínimo 6 caracteres"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                            minLength={6}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                            Tu Contraseña (SuperAdmin)
                          </label>
                          <input
                            type="password"
                            value={adminPassword}
                            onChange={(e) => setAdminPassword(e.target.value)}
                            placeholder="Validar identidad"
                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 ring-blue-500/20 outline-none"
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewPassword('');
                            setAdminPassword('');
                          }}
                          className="px-4 py-2 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-300 transition-colors"
                        >
                          Limpiar
                        </button>
                        <button
                          type="button"
                          onClick={handleChangePassword}
                          disabled={changingPassword || !newPassword || !adminPassword}
                          className="flex-1 px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-[#002a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          {changingPassword ? (
                            <>
                              <Loader2 size={14} className="animate-spin" />
                              Actualizando...
                            </>
                          ) : (
                            <>
                              <KeyRound size={14} />
                              Cambiar Contraseña
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="bg-slate-50 p-6 flex justify-between items-center">
              <div className="text-xs text-slate-400">
                ID Empleado: {editingUser.id_empleado}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingUser(null)} 
                  className="px-6 py-3 bg-slate-200 text-slate-700 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit} 
                  disabled={updating}
                  className="px-6 py-3 bg-[#001e33] text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-[#002a4a] transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {updating ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Cambios
                </button>
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
      <h3 className="text-xl font-black text-[#001e33]">¿Eliminar Registro?</h3>
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