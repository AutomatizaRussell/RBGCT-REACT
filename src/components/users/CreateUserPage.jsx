import { ArrowLeft, Save, User, Mail, Shield, Briefcase } from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // 1. Importamos el hook de navegación

const CreateUserPage = () => {
  const navigate = useNavigate(); // 2. Inicializamos el navegador

  // 3. Función para manejar el regreso
  const handleBack = () => {
    navigate('/admin'); // Nos manda de vuelta a la tabla
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Guardando usuario...");
    // Aquí iría tu lógica de guardado
    handleBack(); // Después de guardar, regresamos a la lista
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

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        {/* CABECERA FORMULARIO */}
        <div className="p-10 border-b border-slate-50">
          <h3 className="text-xl font-black text-[#001e33]">Nuevo Registro</h3>
          <p className="text-slate-400 text-sm mt-1">Alta de colaborador en el sistema GCT.</p>
        </div>

        {/* CUERPO FORMULARIO */}
        <form className="p-10 space-y-8" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-8">
            
            {/* NOMBRE */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <User size={12} /> Nombre Completo
              </label>
              <input 
                required
                type="text" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                placeholder="Ej. John Stiben Garcia" 
              />
            </div>

            {/* EMAIL */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Mail size={12} /> Correo Corporativo
              </label>
              <input 
                required
                type="email" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                placeholder="usuario@russellbedford.com.co" 
              />
            </div>

            {/* ROL / CARGO */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Shield size={12} /> Asignar Rol
              </label>
              <div className="relative">
                <select className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] appearance-none text-sm font-medium cursor-pointer">
                  <option>Consultor</option>
                  <option>Auditor</option>
                  <option>Super Admin</option>
                </select>
                {/* Decoración para el select */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                  <Briefcase size={14} />
                </div>
              </div>
            </div>

            {/* DEPARTAMENTO */}
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">
                <Briefcase size={12} /> Departamento
              </label>
              <input 
                type="text" 
                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-[#001e33] focus:bg-white transition-all text-sm font-medium" 
                placeholder="Ej. IT Global / Finanzas" 
              />
            </div>
          </div>

          {/* ACCIONES FINAL */}
          <div className="flex justify-end items-center gap-6 pt-6 border-t border-slate-50">
            <button 
              type="button" 
              onClick={handleBack} 
              className="text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="bg-[#001e33] text-white px-10 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-blue-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <Save size={16} /> Guardar Registro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateUserPage;