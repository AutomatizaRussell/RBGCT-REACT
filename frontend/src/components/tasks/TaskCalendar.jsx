import { useState, useEffect } from 'react';
import { getAllTareas, getTareasByRol } from '../../lib/api';
import { useAuth } from '../../hooks/useAuth';
import { ChevronLeft, ChevronRight, Calendar, Plus, Loader2 } from 'lucide-react';

const AREAS = [
  { id: 1, nombre: 'Revisoría Fiscal y Auditoría', color: 'bg-blue-500' },
  { id: 2, nombre: 'Contabilidad', color: 'bg-emerald-500' },
  { id: 3, nombre: 'BPO', color: 'bg-purple-500' },
  { id: 4, nombre: 'Legal', color: 'bg-red-500' },
  { id: 5, nombre: 'Impuestos', color: 'bg-amber-500' },
  { id: 6, nombre: 'Administración', color: 'bg-slate-500' },
  { id: 7, nombre: 'Financiera', color: 'bg-cyan-500' },
];

const TaskCalendar = ({
  onSelectDate,
  onSelectTask,
  canCreateTask = false,
  refreshTrigger = 0
}) => {
  const { empleadoData, isSuperAdmin, isAdmin, isEditor, isUsuario } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  useEffect(() => {
    console.log('[TaskCalendar] refreshTrigger changed:', refreshTrigger);
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const startOfMonth = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonth = new Date(year, month + 1, 0).toISOString().split('T')[0];

        let allTasks = [];

        // Obtener tareas según el rol del usuario
        if (isUsuario) {
          // Usuario: solo sus tareas personales
          const userId = empleadoData?.id_empleado;
          allTasks = await getTareasByRol('usuario', userId);
        } else if (isEditor) {
          // Editor: tareas de su área + personales
          const userId = empleadoData?.id_empleado;
          const areaId = empleadoData?.area_id;
          allTasks = await getTareasByRol('editor', userId, areaId);
        } else if (isAdmin || isSuperAdmin) {
          // Admin/SuperAdmin: todas las tareas
          allTasks = await getAllTareas();
        } else {
          // Fallback
          allTasks = await getAllTareas();
        }

        // Mostrar todas las tareas sin filtro de fechas (temporal para debug)
        // const filteredTasks = allTasks.filter(task =>
        //   task.fecha_vencimiento >= startOfMonth &&
        //   task.fecha_vencimiento <= endOfMonth
        // );

        setTasks(allTasks || []);
      } catch (err) {
        console.error('Error cargando tareas:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTasks();
  }, [year, month, refreshTrigger, empleadoData, isUsuario, isEditor, isAdmin, isSuperAdmin]);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfMonth = getFirstDayOfMonth(year, month);
  const daysOfWeek = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(currentDate);

  const getTasksForDay = (day) => {
    const dateStr = new Date(year, month, day).toISOString().split('T')[0];
    return tasks.filter(task => task.fecha_vencimiento === dateStr);
  };

  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           month === today.getMonth() && 
           year === today.getFullYear();
  };

  const isSelected = (day) => {
    if (!selectedDate) return false;
    return day === selectedDate.getDate() &&
           month === selectedDate.getMonth() &&
           year === selectedDate.getFullYear();
  };

  const handleDayClick = (day) => {
    const clickedDate = new Date(year, month, day);
    setSelectedDate(clickedDate);
    if (onSelectDate) onSelectDate(clickedDate);
  };

  const handleTaskClick = (task, e) => {
    e.stopPropagation();
    if (onSelectTask) onSelectTask(task);
  };

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  return (
    <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-[#001e33] rounded-xl">
            <Calendar size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#001e33] capitalize">
              {monthName} {year}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
              {tasks.length} tareas programadas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={goToToday}
            className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase hover:bg-slate-200 transition-colors"
          >
            Hoy
          </button>
          <button 
            onClick={prevMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={24} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <>
          {/* Days of week */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} className="h-24 bg-slate-50/50 rounded-xl" />
            ))}

            {/* Days */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = getTasksForDay(day);
              const today = isToday(day);
              const selected = isSelected(day);

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className={`h-24 border rounded-xl p-2 cursor-pointer transition-all relative overflow-hidden
                    ${today 
                      ? 'border-[#001e33] bg-[#001e33]/5' 
                      : selected
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                >
                  <span className={`text-sm font-bold ${today ? 'text-[#001e33]' : 'text-slate-600'}`}>
                    {day}
                  </span>

                  {/* Tasks indicator */}
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((task) => {
                      const area = AREAS.find(a => a.id === task.id_area) || AREAS[0];
                      return (
                        <div
                          key={task.id}
                          onClick={(e) => handleTaskClick(task, e)}
                          className={`h-1.5 rounded-full ${area.color} cursor-pointer hover:opacity-80`}
                          title={task.titulo}
                        />
                      );
                    })}
                    {dayTasks.length > 3 && (
                      <div className="text-[8px] text-slate-400 font-medium">
                        +{dayTasks.length - 3} más
                      </div>
                    )}
                  </div>

                  {/* Add button for authorized users */}
                  {canCreateTask && selected && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onSelectDate) onSelectDate(selectedDate, true);
                      }}
                      className="absolute bottom-2 right-2 p-1.5 bg-[#001e33] text-white rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap gap-3">
            {AREAS.map(area => (
              <div key={area.id} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${area.color}`} />
                <span className="text-[9px] font-medium text-slate-500">{area.nombre}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default TaskCalendar;
