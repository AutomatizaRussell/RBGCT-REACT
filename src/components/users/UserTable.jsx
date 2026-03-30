import { useState, useEffect } from 'react';
import { Edit2, Trash2, Mail, AlertTriangle, X, Check, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);

  // --- CARGAR DATOS DESDE SUPABASE ---
  const fetchUsers = async () => {
    try {
      setLoading(true);
      console.log("Conectando a:", import.meta.env.VITE_SUPABASE_URL); 
      
      const { data, error } = await supabase
        .from('datos_personales') 
        .select('*');

      if (error) {
        console.error('Error de Supabase:', error.message);
        return;
      }

      console.log("Datos capturados:", data);
      setUsers(data || []);
    } catch (err) {
      console.error('Error inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // --- LÓGICA PARA ELIMINAR ---
  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .from('datos_personales') // Nombre corregido a plural
        .delete()
        .eq('id_cc', id);

      if (error) throw error;
      
      setUsers(users.filter(user => user.id_cc !== id));
      setDeletingUser(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400">
        <Loader2 className="animate-spin mb-4" size={40} />
        <p className="font-bold uppercase tracking-widest text-[10px]">Sincronizando con la base de datos...</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 relative">
      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Cédula / ID</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Teléfono</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {users.map((user) => (
              <tr key={user.id_cc} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center font-bold text-[#001e33] text-xs">
                      {user.nom_empleado?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 tracking-tight">
                        {user.nom_empleado} {user.ape_empleado}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium flex items-center gap-1">
                        <Mail size={10} /> {user.correo}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    {user.id_cc}
                  </span>
                </td>
                <td className="px-8 py-6 text-xs font-semibold text-slate-600">
                  {user.telefono || 'Sin asignar'}
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => setEditingUser(user)}
                      className="p-2 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => setDeletingUser(user)}
                      className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE ELIMINACIÓN --- */}
      {deletingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001e33]/40 backdrop-blur-sm" onClick={() => setDeletingUser(null)}></div>
          <div className="bg-white rounded-[32px] p-8 max-w-sm w-full relative z-10 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6">
              <AlertTriangle size={32} />
            </div>
            <h3 className="text-xl font-black text-[#001e33] mb-2">¿Eliminar registro?</h3>
            <p className="text-slate-500 text-sm mb-8 leading-relaxed">
              Estás a punto de eliminar a <span className="font-bold text-slate-800">{deletingUser.nom_empleado}</span>. Esta acción no se puede deshacer.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => setDeletingUser(null)}
                className="py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button 
                className="py-3 bg-red-500 text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow-lg shadow-red-200 hover:bg-red-600 transition-colors"
                onClick={() => handleDelete(deletingUser.id_cc)}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DE EDICIÓN --- */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001e33]/40 backdrop-blur-sm" onClick={() => setEditingUser(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-lg relative z-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-[#001e33]">Editar Colaborador</h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Cédula: {editingUser.id_cc}</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            <form className="p-8 space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                  <input type="text" defaultValue={editingUser.nom_empleado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Apellido</label>
                  <input type="text" defaultValue={editingUser.ape_empleado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
                <input type="email" defaultValue={editingUser.correo} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none text-sm font-medium" />
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full bg-[#001e33] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.01] transition-all">
                  <Check size={16} /> Actualizar Información
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserTable;