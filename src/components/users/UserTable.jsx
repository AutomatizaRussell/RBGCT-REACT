import { useState, useEffect } from 'react';
import { Trash2, Shield, ShieldCheck, UserX, UserCheck, X, Check, Loader2, Search, Mail, Activity, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingUser, setManagingUser] = useState(null); // Para gestionar permisos/estado
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .schema('rbgct')
        .from('datos_empleado')
        .select(`
          id_empleado, correo_corporativo, fecha_ingreso, estado,
          datos_personales:id_personales ( id_cc, nom_empleado, ape_empleado ),
          administracion:id_admin ( nom_area )
        `);
      if (!error) setUsers(data || []);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  // Cambiar estado de cuenta (Bloquear/Activar)
  const toggleUserStatus = async (user) => {
    setUpdating(true);
    const nuevoEstado = user.estado === 'ACTIVA' ? 'INACTIVO' : 'ACTIVA';
    try {
      const { error } = await supabase
        .schema('rbgct')
        .from('datos_empleado')
        .update({ estado: nuevoEstado })
        .eq('id_empleado', user.id_empleado);

      if (error) throw error;
      await fetchUsers();
      setManagingUser(null);
    } catch (error) {
      alert("Error: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const deleteUserRecord = async (id) => {
    try {
      const { error } = await supabase.schema('rbgct').from('datos_personales').delete().eq('id_cc', id);
      if (error) throw error;
      setUsers(users.filter(u => u.datos_personales.id_cc !== id));
      setConfirmDelete(null);
    } catch (error) {
      alert("Error crítico: " + error.message);
    }
  };

  const filteredUsers = users.filter((user) => {
    const term = searchTerm.toLowerCase();
    return (
      user.datos_personales?.nom_empleado?.toLowerCase().includes(term) ||
      user.correo_corporativo?.toLowerCase().includes(term) ||
      user.datos_personales?.id_cc?.toString().includes(term)
    );
  });

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-20 text-slate-400">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="font-bold uppercase tracking-widest text-[10px]">Cargando Control de Usuarios...</p>
    </div>
  );

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* BARRA DE HERRAMIENTAS */}
      <div className="flex justify-between items-center">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por nombre o ID..."
            className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none text-sm shadow-sm focus:ring-2 ring-blue-500/5 transition-all"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* TABLA DE GESTIÓN */}
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Permisos/Área</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acceso</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones de Seguridad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr key={user.id_empleado} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${user.estado === 'ACTIVA' ? 'bg-[#001e33] text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {user.datos_personales?.nom_empleado?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800">{user.datos_personales?.nom_empleado} {user.datos_personales?.ape_empleado}</p>
                      <p className="text-[11px] text-slate-400">{user.correo_corporativo}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-700">{user.administracion?.nom_area || 'Sin Área'}</span>
                    <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter flex items-center gap-1">
                      <Shield size={10} /> Privilegios Estándar
                    </span>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter flex items-center w-fit gap-1.5 ${
                    user.estado === 'ACTIVA' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                  }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${user.estado === 'ACTIVA' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    {user.estado === 'ACTIVA' ? 'Habilitado' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setManagingUser(user)}
                      className="p-2 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all"
                      title="Gestionar Acceso"
                    >
                      <ShieldCheck size={18} />
                    </button>
                    <button 
                      onClick={() => setConfirmDelete(user)}
                      className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-all"
                      title="Eliminar de la Base de Datos"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE GESTIÓN DE ACCESO (SUPER ADMIN) */}
      {managingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001e33]/60 backdrop-blur-md" onClick={() => !updating && setManagingUser(null)}></div>
          <div className="bg-white rounded-[40px] w-full max-w-md relative z-10 shadow-2xl p-10 text-center space-y-6">
            <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center ${managingUser.estado === 'ACTIVA' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
              {managingUser.estado === 'ACTIVA' ? <UserCheck size={40} /> : <UserX size={40} />}
            </div>
            
            <div>
              <h3 className="text-2xl font-black text-[#001e33]">Control de Acceso</h3>
              <p className="text-slate-500 text-sm mt-2">
                Usuario: <strong>{managingUser.datos_personales?.nom_empleado}</strong>
              </p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-black text-slate-400 uppercase">Estado Actual:</span>
                <span className={`text-[10px] font-black uppercase ${managingUser.estado === 'ACTIVA' ? 'text-emerald-600' : 'text-red-600'}`}>
                  {managingUser.estado}
                </span>
              </div>
              <button 
                onClick={() => toggleUserStatus(managingUser)}
                disabled={updating}
                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${
                  managingUser.estado === 'ACTIVA' 
                  ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                  : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                }`}
              >
                {updating ? <Loader2 className="animate-spin mx-auto" size={18} /> : (managingUser.estado === 'ACTIVA' ? 'Inhabilitar Usuario' : 'Activar Usuario')}
              </button>
            </div>

            <p className="text-[10px] text-slate-400 italic">Esta acción quedará registrada en el log de auditoría del sistema.</p>
          </div>
        </div>
      )}

      {/* MODAL DE ELIMINACIÓN CRÍTICA */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-red-950/20 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-sm relative z-10 shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-50 text-red-500 mx-auto rounded-full flex items-center justify-center mb-4">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-[#001e33]">¿Eliminar Registro?</h3>
            <p className="text-slate-500 text-sm mt-2">Esta acción es irreversible y borrará todo el historial de <strong>{confirmDelete.datos_personales?.nom_empleado}</strong>.</p>
            <div className="grid grid-cols-2 gap-3 mt-8">
              <button onClick={() => setConfirmDelete(null)} className="py-4 bg-slate-100 text-slate-600 rounded-2xl font-bold text-xs uppercase">Cancelar</button>
              <button onClick={() => deleteUserRecord(confirmDelete.datos_personales.id_cc)} className="py-4 bg-red-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-red-200">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;