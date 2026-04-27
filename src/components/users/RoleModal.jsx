import { useState } from 'react';
import { Shield, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase'; // Verifica que la ruta sea correcta según tu imagen

const RoleModal = ({ user, onClose, onUpdate }) => {
  // id_permisos según tu tabla datos_empleado
  const [selectedRoleId, setSelectedRoleId] = useState(user?.id_permisos || 3);
  const [isSaving, setIsSaving] = useState(false);

  const roles = [
    { id: 1, name: 'Administrador', color: 'text-red-600' },
    { id: 2, name: 'Editor', color: 'text-blue-600' },
    { id: 3, name: 'Usuario', color: 'text-slate-600' }
  ];

  const updateRole = async () => {
    try {
      setIsSaving(true);
      const { error } = await supabase
        .schema('rbgct')
        .from('datos_empleado')
        .update({ id_permisos: selectedRoleId })
        .eq('auth_id', user.auth_id); // Vinculación por auth_id

      if (error) throw error;
      
      onUpdate(); 
      onClose();
    } catch (err) {
      alert("Error al actualizar: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-[#001e33]/60 backdrop-blur-sm">
      <div className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-[#001e33] flex items-center gap-2">
            <Shield size={20} className="text-blue-500" /> Gestionar Rol
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="space-y-3">
          {roles.map((rol) => (
            <button
              key={rol.id}
              onClick={() => setSelectedRoleId(rol.id)}
              className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${
                selectedRoleId === rol.id ? 'border-blue-500 bg-blue-50/30' : 'border-slate-50'
              }`}
            >
              <span className={`text-sm font-bold ${rol.color}`}>{rol.name}</span>
              {selectedRoleId === rol.id && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
            </button>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <button onClick={onClose} className="flex-1 py-4 font-bold text-xs uppercase text-slate-400">Cancelar</button>
          <button 
            onClick={updateRole}
            disabled={isSaving}
            className="flex-1 py-4 bg-[#001e33] text-white rounded-2xl font-bold text-xs uppercase flex items-center justify-center gap-2"
          >
            {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleModal;