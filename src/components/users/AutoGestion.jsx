import React, { useState, useEffect } from 'react';
import { CheckCircle2, Clock, AlertCircle, FileText, RefreshCw, ChevronDown } from 'lucide-react';
import { useDatabase } from '../../hooks/useDatabase';
import { useAuth } from '../../hooks/useAuth';

const AutoGestion = () => {
  const { empleadoData } = useAuth();
  const { tareas: tareasDB, dbReady } = useDatabase();
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actualizando, setActualizando] = useState(null);

  // Cargar tareas del usuario
  useEffect(() => {
    fetchTareas();
  }, [empleadoData]);

  const fetchTareas = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!dbReady) {
        setError('Base de datos no lista');
        return;
      }

      if (!empleadoData?.id_empleado) {
        setError('No se encontró información del empleado');
        return;
      }

      const data = await tareasDB.selectByEmpleado(empleadoData.id_empleado);
      setTareas(data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Error inesperado al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  // Actualizar estado de una tarea
  const actualizarEstado = async (tareaId, nuevoEstado) => {
    try {
      setActualizando(tareaId);

      await tareasDB.update(tareaId, { estado: nuevoEstado });

      // Actualizar estado local
      setTareas(tareas.map(t => 
        t.id === tareaId ? { ...t, estado: nuevoEstado } : t
      ));
    } catch (err) {
      console.error('Error:', err);
      alert('Error al actualizar la tarea');
    } finally {
      setActualizando(null);
    }
  };

  // Formatear fecha
  const formatearFecha = (fechaStr) => {
    if (!fechaStr) return '-';
    const fecha = new Date(fechaStr);
    return fecha.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  // Verificar si una tarea está vencida
  const estaVencida = (fechaVencimiento, estado) => {
    if (estado === 'completada') return false;
    const hoy = new Date();
    const vencimiento = new Date(fechaVencimiento);
    return vencimiento < hoy;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Cargando tus tareas...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={fetchTareas}
            className="text-xs font-bold text-indigo-600 uppercase hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header con estadísticas */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-[#001e33]">Mis Tareas Asignadas</h3>
          <p className="text-xs text-slate-500 mt-1">
            Gestiona tus actividades y actualiza su estado
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={fetchTareas}
            disabled={loading}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-indigo-600 uppercase transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Actualizar
          </button>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full">
            {tareas.length} Tareas
          </span>
        </div>
      </div>

      {/* Resumen de tareas */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Pendientes</p>
          <p className="text-2xl font-black text-amber-600">
            {tareas.filter(t => t.estado === 'pendiente').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">En Proceso</p>
          <p className="text-2xl font-black text-blue-600">
            {tareas.filter(t => t.estado === 'en_proceso').length}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase">Completadas</p>
          <p className="text-2xl font-black text-emerald-600">
            {tareas.filter(t => t.estado === 'completada').length}
          </p>
        </div>
      </div>

      {/* Lista de tareas */}
      {tareas.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center">
          <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-[#001e33] mb-2">¡No tienes tareas pendientes!</h4>
          <p className="text-sm text-slate-500">Todas tus actividades están al día.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tarea</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Prioridad</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vencimiento</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-wider text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {tareas.map((tarea) => (
                <tr key={tarea.id} className={`hover:bg-slate-50/50 transition-colors group ${estaVencida(tarea.fecha_vencimiento, tarea.estado) ? 'bg-red-50/30' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg group-hover:scale-110 transition-transform ${
                        tarea.estado === 'completada' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-600'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <span className={`text-sm font-bold block ${tarea.estado === 'completada' ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                          {tarea.titulo}
                        </span>
                        {tarea.descripcion && (
                          <span className="text-[10px] text-slate-400 line-clamp-1">{tarea.descripcion}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${
                      tarea.prioridad === 'alta' ? 'bg-red-50 text-red-600' : 
                      tarea.prioridad === 'media' ? 'bg-amber-50 text-amber-600' :
                      'bg-blue-50 text-blue-600'
                    }`}>
                      {tarea.prioridad}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {tarea.estado === 'completada' ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : tarea.estado === 'en_proceso' ? (
                        <Clock size={14} className="text-blue-500" />
                      ) : (
                        <Clock size={14} className="text-amber-500" />
                      )}
                      <span className={`text-xs font-medium ${
                        tarea.estado === 'completada' ? 'text-emerald-600' : 
                        tarea.estado === 'en_proceso' ? 'text-blue-600' :
                        'text-amber-600'
                      }`}>
                        {tarea.estado === 'completada' ? 'Completada' : 
                         tarea.estado === 'en_proceso' ? 'En Proceso' : 'Pendiente'}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs font-medium">
                      <span className={estaVencida(tarea.fecha_vencimiento, tarea.estado) ? 'text-red-600 font-bold' : 'text-slate-500'}>
                        {formatearFecha(tarea.fecha_vencimiento)}
                      </span>
                      {estaVencida(tarea.fecha_vencimiento, tarea.estado) && (
                        <span className="text-[9px] text-red-500 block">¡Vencida!</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {actualizando === tarea.id ? (
                      <RefreshCw size={16} className="animate-spin text-indigo-600 inline" />
                    ) : (
                      <select
                        value={tarea.estado}
                        onChange={(e) => actualizarEstado(tarea.id, e.target.value)}
                        disabled={tarea.estado === 'completada'}
                        className={`text-[10px] font-bold uppercase border rounded-lg px-2 py-1 outline-none focus:ring-2 focus:ring-indigo-500 ${
                          tarea.estado === 'completada' 
                            ? 'bg-emerald-50 text-emerald-600 border-emerald-200 cursor-not-allowed' 
                            : 'bg-white text-slate-700 border-slate-200 hover:border-indigo-300'
                        }`}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="en_proceso">En Proceso</option>
                        <option value="completada">Completada</option>
                      </select>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AutoGestion;