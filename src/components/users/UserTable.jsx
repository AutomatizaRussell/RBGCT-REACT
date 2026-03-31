import { useState, useEffect } from 'react';
import { Edit2, Trash2, Mail, AlertTriangle, X, Check, Loader2, Search, Calendar, Briefcase, Activity } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const UserTable = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [deletingUser, setDeletingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updating, setUpdating] = useState(false); // Estado necesario para el feedback del botón

  const fetchUsers = async () => {
    try {
      setLoading(true);
        const { data, error } = await supabase
          .schema('rbgct')
          .from('datos_empleado')
          .select(`
            id_empleado,
            correo_corporativo,
            fecha_ingreso,
            estado,
            datos_personales:id_personales (
              id_cc,
              nom_empleado,
              ape_empleado,
              telefono,
              rh,
              genero,
              direccion
            ),
            administracion:id_admin (
              id_rev,
              nom_area,
              salario
            )
          `);
          
      if (error) {
        console.error('Error de Supabase:', error.message);
        return;
      }
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

  const handleDelete = async (id) => {
    try {
      const { error } = await supabase
        .schema('rbgct')
        .from('datos_personales')
        .delete()
        .eq('id_cc', id);

      if (error) throw error;
      setUsers(users.filter(user => user.datos_personales.id_cc !== id));
      setDeletingUser(null);
    } catch (error) {
      alert("Error al eliminar: " + error.message);
    }
  };

  // Función handleUpdate añadida para que el formulario funcione
  const handleUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const formData = new FormData(e.target);
    const form = Object.fromEntries(formData);

    try {
      // Update datos_personales
      const { error: err1 } = await supabase
        .schema('rbgct')
        .from('datos_personales')
        .update({
          nom_empleado: form.nom_empleado,
          ape_empleado: form.ape_empleado,
          telefono: form.telefono,
          rh: form.rh,
          genero: form.genero
        })
        .eq('id_cc', editingUser.datos_personales.id_cc);

      if (err1) throw err1;

      // Update datos_empleado
      const { error: err2 } = await supabase
        .schema('rbgct')
        .from('datos_empleado')
        .update({
          correo_corporativo: form.correo_corporativo,
          estado: form.estado
        })
        .eq('id_empleado', editingUser.id_empleado);

      if (err2) throw err2;

      await fetchUsers();
      setEditingUser(null);
    } catch (error) {
      alert("Error al actualizar: " + error.message);
    } finally {
      setUpdating(false);
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
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-50">
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Colaborador</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Área</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Estado</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Correo Corp.</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Fecha Ingreso</th>
              <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filteredUsers.map((user) => (
              <tr key={user.id_empleado} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-[#f1f5f9] rounded-full flex items-center justify-center font-bold text-[#001e33] text-xs">
                      {user.datos_personales?.nom_empleado?.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-800 tracking-tight">
                        {user.datos_personales?.nom_empleado} {user.datos_personales?.ape_empleado}
                      </p>
                      <p className="text-[11px] text-slate-400 font-medium">ID: {user.datos_personales?.id_cc}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <Briefcase size={14} className="text-slate-400" />
                    {user.administracion?.nom_area || 'N/A'}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter px-3 py-1 rounded-full ${
                    user.estado?.toLowerCase() === 'activa' || user.estado?.toLowerCase() === 'activo'
                      ? 'bg-green-50 text-green-600' 
                      : 'bg-slate-100 text-slate-500'
                  }`}>
                    <Activity size={10} />
                    {user.estado || 'N/A'}
                  </span>
                </td>
                <td className="px-8 py-6 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    <Mail size={12} className="text-slate-400" />
                    {user.correo_corporativo}
                  </div>
                </td>
                <td className="px-8 py-6 text-xs font-semibold text-slate-600">
                  <div className="flex items-center gap-1">
                    <Calendar size={12} className="text-slate-400" />
                    {user.fecha_ingreso}
                  </div>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingUser(user)} className="p-2 hover:bg-blue-50 hover:text-blue-600 text-slate-400 rounded-lg transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => setDeletingUser(user)} className="p-2 hover:bg-red-50 hover:text-red-600 text-slate-400 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MODAL DE EDICIÓN COMPLETO */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[#001e33]/40 backdrop-blur-sm" onClick={() => !updating && setEditingUser(null)}></div>
          <div className="bg-white rounded-[32px] w-full max-w-2xl relative z-10 shadow-2xl animate-in slide-in-from-bottom-8 duration-300 overflow-hidden">
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-black text-[#001e33]">Expediente del Colaborador</h3>
                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">
                  Modificando Registro ID: {editingUser.datos_personales?.id_cc}
                </p>
              </div>
              <button onClick={() => setEditingUser(null)} className="p-2 hover:bg-white rounded-xl text-slate-400 shadow-sm transition-all">
                <X size={20} />
              </button>
            </div>

            <form className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar" onSubmit={handleUpdate}>
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-4 h-[1px] bg-blue-500"></span> Información Personal
                </h4>
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Correo Corporativo</label>
                    <input name="correo_corporativo" type="email" defaultValue={editingUser.correo_corporativo} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm" required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Estado Contrato</label>
                    <select name="estado" defaultValue={editingUser.estado} className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm outline-none">
                      <option value="ACTIVO">ACTIVO</option>
                      <option value="INACTIVO">INACTIVO</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Área / Departamento</label>
                    <input name="nom_area" type="text" defaultValue={editingUser.administracion?.nom_area} className="w-full p-4 bg-slate-100 border border-slate-100 rounded-2xl text-sm cursor-not-allowed" readOnly />
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
                  className="w-full bg-[#001e33] text-white py-5 rounded-[20px] font-bold text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl hover:bg-blue-600 hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-50 disabled:cursor-wait"
                >
                  {updating ? (
                    <><Loader2 className="animate-spin" size={18} /> Guardando...</>
                  ) : (
                    <><Check size={18} /> Guardar Cambios en el Sistema</>
                  )}
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