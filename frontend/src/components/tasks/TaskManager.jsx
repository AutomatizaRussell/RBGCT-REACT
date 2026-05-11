import { useState, useEffect } from 'react';
import { getAllTareas, createTarea, updateTarea, updateTareaEstado, deleteTarea, getAllEmpleados } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { 
  X, Plus, Trash2, Edit2, Calendar, Clock, Users, 
  CheckCircle2, AlertCircle, Loader2, Building2, Filter 
} from 'lucide-react';

const AREAS = [
  { id: 1, nombre: 'Revisoría Fiscal y Auditoría', color: 'bg-blue-500', textColor: 'text-blue-600', bgColor: 'bg-blue-50' },
  { id: 2, nombre: 'Contabilidad', color: 'bg-emerald-500', textColor: 'text-emerald-600', bgColor: 'bg-emerald-50' },
  { id: 3, nombre: 'BPO', color: 'bg-purple-500', textColor: 'text-purple-600', bgColor: 'bg-purple-50' },
  { id: 4, nombre: 'Legal', color: 'bg-red-500', textColor: 'text-red-600', bgColor: 'bg-red-50' },
  { id: 5, nombre: 'Impuestos', color: 'bg-amber-500', textColor: 'text-amber-600', bgColor: 'bg-amber-50' },
  { id: 6, nombre: 'Administración', color: 'bg-slate-500', textColor: 'text-slate-600', bgColor: 'bg-slate-50' },
  { id: 7, nombre: 'Financiera', color: 'bg-cyan-500', textColor: 'text-cyan-600', bgColor: 'bg-cyan-50' },
];

const PRIORIDADES = [
  { id: 'alta', nombre: 'Alta', color: 'bg-red-500', textColor: 'text-red-600' },
  { id: 'media', nombre: 'Media', color: 'bg-amber-500', textColor: 'text-amber-600' },
  { id: 'baja', nombre: 'Baja', color: 'bg-blue-500', textColor: 'text-blue-600' },
];

const TaskManager = ({ 
  selectedDate = null, 
  selectedTask = null, 
  onClose, 
  onTaskSaved,
  userArea = null,
  readOnly = false
}) => {
  const { userRole, user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filterArea, setFilterArea] = useState('all');
  const [empleados, setEmpleados] = useState([]);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    titulo: '',
    descripcion: '',
    id_area: userArea || 1,
    id_empleado: '',
    prioridad: 'media',
    fecha_vencimiento: '',
    asignado_a: '',
    estado: 'pendiente'
  });

  const canManageAll = userRole === 'superadmin' || userRole === 'admin';
  const canManageArea = userRole === 'editor' || canManageAll;

  useEffect(() => {
    fetchTasks();
  }, [selectedDate, filterArea]);

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        fecha_vencimiento: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedTask) {
      setEditingTask(selectedTask);
      setFormData({
        titulo: selectedTask.titulo,
        descripcion: selectedTask.descripcion || '',
        id_area: selectedTask.area_id,
        id_empleado: selectedTask.empleado_id || '',
        prioridad: selectedTask.prioridad,
        fecha_vencimiento: selectedTask.fecha_vencimiento,
        asignado_a: selectedTask.asignado_a || '',
        estado: selectedTask.estado
      });
      setShowForm(true);
    }
  }, [selectedTask]);

  // Cargar empleados del área seleccionada
  useEffect(() => {
    const fetchEmpleados = async () => {
      try {
        setLoadingEmpleados(true);
        const data = await getAllEmpleados();
        setEmpleados(data || []);
      } catch (err) {
        console.error('Error cargando empleados:', err);
      } finally {
        setLoadingEmpleados(false);
      }
    };
    fetchEmpleados();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      let data = await getAllTareas();

      if (selectedDate) {
        const dateStr = selectedDate.toISOString().split('T')[0];
        data = data.filter(t => t.fecha_vencimiento === dateStr);
      }

      if (!canManageAll && userArea) {
        data = data.filter(t => t.id_area === userArea);
      }

      if (filterArea !== 'all') {
        data = data.filter(t => t.id_area === parseInt(filterArea));
      }

      setTasks(data || []);
    } catch (err) {
      console.error('Error cargando tareas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // Mapear campos del frontend a los nombres que espera el backend
      // Convertir strings vacíos a null para que el backend lo interprete correctamente
      const taskData = {
        titulo: formData.titulo,
        descripcion: formData.descripcion,
        area_id: formData.id_area || null,
        empleado_id: formData.id_empleado || null,
        asignado_a: formData.asignado_a || null,
        prioridad: formData.prioridad,
        fecha_vencimiento: formData.fecha_vencimiento,
        estado: formData.estado || 'pendiente',
        creado_por: user?.id,
        fecha_creacion: new Date().toISOString()
      };

      // DEBUG: Ver qué se está enviando
      console.log('=== DEBUG TASK DATA ===');
      console.log('formData.id_area:', formData.id_area, 'type:', typeof formData.id_area);
      console.log('formData.id_empleado:', formData.id_empleado, 'type:', typeof formData.id_empleado);
      console.log('taskData.area_id:', taskData.area_id);
      console.log('taskData.empleado_id:', taskData.empleado_id);
      console.log('=======================');

      // Obtener datos del usuario para permisos
      const userId = user?.user?.id_empleado;
      const userAreaId = user?.user?.area_id;

      if (editingTask) {
        // Actualizar tarea completa existente
        await updateTarea(editingTask.id, taskData);
      } else {
        // Crear nueva tarea con rol para validación backend
        await createTarea(taskData, userRole, userAreaId);
      }

      await fetchTasks();
      resetForm();
      console.log('[DEBUG] onTaskSaved called:', onTaskSaved);
      if (onTaskSaved) {
        console.log('[DEBUG] Calling onTaskSaved...');
        onTaskSaved();
      }
    } catch (err) {
      alert('Error guardando tarea: ' + err.message);
    }
  };

  const handleDelete = async (taskId) => {
    if (!confirm('¿Eliminar esta tarea permanentemente?')) return;
    try {
      await deleteTarea(taskId);
      await fetchTasks();
      if (onTaskSaved) onTaskSaved();
    } catch (err) {
      alert('Error eliminando tarea: ' + err.message);
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await updateTareaEstado(taskId, newStatus);
      await fetchTasks();
    } catch (err) {
      alert('Error actualizando estado: ' + err.message);
    }
  };

  const resetForm = () => {
    setFormData({
      titulo: '',
      descripcion: '',
      id_area: userArea || 1,
      id_empleado: '',
      prioridad: 'media',
      fecha_vencimiento: selectedDate ? selectedDate.toISOString().split('T')[0] : '',
      asignado_a: '',
      estado: 'pendiente'
    });
    setEditingTask(null);
    setShowForm(false);
  };

  // Filtrar empleados según rol y área seleccionada
  const empleadosFiltrados = empleados.filter(emp => {
    if (canManageAll) {
      // Admin/SuperAdmin: si es tarea general, mostrar todos; si no, filtrar por área
      if (!formData.id_area) return true; // Tarea general
      return emp.area_id === formData.id_area;
    } else {
      // Editor: solo empleados de su área
      return emp.area_id === (userArea || 1);
    }
  });

  console.log('[DEBUG] Empleados filtrados:', empleadosFiltrados.length, 'for area:', formData.id_area);
  console.log('[DEBUG] Total empleados:', empleados.length);

  const getAreaById = (id) => AREAS.find(a => a.id === id) || AREAS[0];
  const getPrioridadById = (id) => PRIORIDADES.find(p => p.id === id) || PRIORIDADES[1];

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#001e33]/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-[32px] w-full max-w-4xl max-h-[90vh] relative z-10 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-[#001e33] p-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-white/10 rounded-xl">
              <Calendar size={24} className="text-white" />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">
                {selectedDate 
                  ? `Tareas del ${selectedDate.toLocaleDateString('es-ES')}` 
                  : 'Gestión de Tareas'}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {tasks.length} tareas encontradas
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-400" />
              <select
                value={filterArea}
                onChange={(e) => setFilterArea(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 outline-none focus:border-[#001e33]"
              >
                <option value="all">Todas las áreas</option>
                {AREAS.map(area => (
                  <option key={area.id} value={area.id}>{area.nombre}</option>
                ))}
              </select>
            </div>

            {canManageArea && !readOnly && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
              >
                <Plus size={16} />
                Nueva Tarea
              </button>
            )}
          </div>

          {/* Task Form */}
          {showForm && !readOnly && (
            <div className="mb-6 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-[#001e33]">
                  {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                </h4>
                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600">
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Título
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.titulo}
                    onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
                    placeholder="Nombre de la tarea..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Descripción
                  </label>
                  <textarea
                    rows={2}
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33] resize-none"
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Tipo de Asignación
                  </label>
                  <select
                    value={formData.id_area || 'general'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setFormData({
                        ...formData,
                        id_area: value === 'general' ? null : parseInt(value),
                        id_empleado: '' // Reset empleado al cambiar área
                      });
                    }}
                    disabled={!canManageAll && userArea}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33] disabled:bg-slate-100"
                  >
                    {/* Opción Tarea General solo para Admin/SuperAdmin */}
                    {canManageAll && (
                      <option value="general">🌐 Tarea General (Todas las áreas)</option>
                    )}
                    {/* Áreas disponibles */}
                    {canManageAll ? (
                      // Admin/SuperAdmin: todas las áreas
                      AREAS.map(area => (
                        <option key={area.id} value={area.id}>{area.nombre}</option>
                      ))
                    ) : (
                      // Editor: solo su área
                      AREAS.filter(area => area.id === (userArea || 1)).map(area => (
                        <option key={area.id} value={area.id}>{area.nombre}</option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Prioridad
                  </label>
                  <select
                    value={formData.prioridad}
                    onChange={(e) => setFormData({...formData, prioridad: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
                  >
                    {PRIORIDADES.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Fecha de Vencimiento
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.fecha_vencimiento}
                    onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33]"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 block">
                    Asignar a Empleado
                  </label>
                  <select
                    value={formData.id_empleado}
                    onChange={(e) => {
                      const idEmpleado = e.target.value;
                      const empleado = empleados.find(emp => emp.id_empleado.toString() === idEmpleado);
                      setFormData({
                        ...formData,
                        id_empleado: idEmpleado ? parseInt(idEmpleado) : '',
                        asignado_a: empleado ? empleado.correo_corporativo : ''
                      });
                    }}
                    disabled={loadingEmpleados}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium outline-none focus:border-[#001e33] disabled:bg-slate-100"
                  >
                    <option value="">Tarea general del área</option>
                    {empleadosFiltrados.map(emp => (
                      <option key={emp.id_empleado} value={emp.id_empleado}>
                        {emp.datos_personales?.nom_empleado} {emp.datos_personales?.ape_empleado} - {emp.correo_corporativo}
                      </option>
                    ))}
                  </select>
                  {loadingEmpleados && (
                    <p className="text-[10px] text-slate-400 mt-1">Cargando empleados...</p>
                  )}
                </div>

                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-3 bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors"
                  >
                    {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tasks List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl">
              <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-medium text-slate-500">No hay tareas programadas</p>
              <p className="text-[10px] text-slate-400 mt-1">Crea una nueva tarea para comenzar</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map(task => {
                const area = getAreaById(task.id_area);
                const prioridad = getPrioridadById(task.prioridad);
                const canEdit = canManageAll || (userArea === task.id_area);

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl border transition-all ${
                      task.estado === 'completada' 
                        ? 'bg-slate-50 border-slate-200 opacity-60' 
                        : 'bg-white border-slate-200 hover:border-[#001e33]/30'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${area.bgColor} ${area.textColor}`}>
                            {area.nombre}
                          </span>
                          <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${prioridad.textColor.replace('text', 'bg').replace('600', '50')} ${prioridad.textColor}`}>
                            {prioridad.nombre}
                          </span>
                        </div>
                        <h4 className={`font-bold text-slate-800 truncate ${task.estado === 'completada' ? 'line-through' : ''}`}>
                          {task.titulo}
                        </h4>
                        {task.descripcion && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{task.descripcion}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar size={12} />
                            {new Date(task.fecha_vencimiento).toLocaleDateString('es-ES')}
                          </span>
                          {task.id_empleado ? (
                            <span className="flex items-center gap-1 text-indigo-600">
                              <Users size={12} />
                              Asignada: {task.asignado_a || 'Empleado #' + task.id_empleado}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-slate-500">
                              <Building2 size={12} />
                              Tarea general del área
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canEdit && !readOnly && (
                          <>
                            <button
                              onClick={() => {
                                setEditingTask(task);
                                setFormData({
                                  titulo: task.titulo,
                                  descripcion: task.descripcion || '',
                                  id_area: task.area_id,
                                  id_empleado: task.empleado_id || '',
                                  prioridad: task.prioridad,
                                  fecha_vencimiento: task.fecha_vencimiento,
                                  asignado_a: task.asignado_a || '',
                                  estado: task.estado
                                });
                                setShowForm(true);
                              }}
                              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <Edit2 size={16} className="text-slate-500" />
                            </button>
                            <button
                              onClick={() => handleDelete(task.id)}
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                              title="Eliminar"
                            >
                              <Trash2 size={16} className="text-red-500" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleStatusChange(task.id, task.estado === 'completada' ? 'pendiente' : 'completada')}
                          className={`p-2 rounded-lg transition-colors ${
                            task.estado === 'completada' 
                              ? 'bg-emerald-100 text-emerald-600' 
                              : 'hover:bg-emerald-50 text-slate-400'
                          }`}
                          title={task.estado === 'completada' ? 'Marcar pendiente' : 'Completar'}
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskManager;
