import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import TaskCalendar from './TaskCalendar';
import TaskManager from './TaskManager';
import { Calendar, List, Plus } from 'lucide-react';

const AREAS = [
  { id: 1, nombre: 'Revisoría Fiscal y Auditoría', color: 'bg-blue-500' },
  { id: 2, nombre: 'Contabilidad', color: 'bg-emerald-500' },
  { id: 3, nombre: 'BPO', color: 'bg-purple-500' },
  { id: 4, nombre: 'Legal', color: 'bg-red-500' },
  { id: 5, nombre: 'Impuestos', color: 'bg-amber-500' },
  { id: 6, nombre: 'Administración', color: 'bg-slate-500' },
  { id: 7, nombre: 'Financiera', color: 'bg-cyan-500' },
];

const TaskDashboard = ({ userArea = null }) => {
  const { userRole, user } = useAuth();
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' | 'list'
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskManager, setShowTaskManager] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canCreateTask = userRole === 'superadmin' || userRole === 'admin' || userRole === 'editor';
  const canManageAll = userRole === 'superadmin' || userRole === 'admin';

  // Obtener el área del usuario desde metadata si no se pasó como prop
  const effectiveUserArea = userArea || user?.user_metadata?.id_area || null;

  const handleSelectDate = (date, openForm = false) => {
    setSelectedDate(date);
    if (openForm) {
      setSelectedTask(null);
      setShowTaskManager(true);
    }
  };

  const handleSelectTask = (task) => {
    setSelectedTask(task);
    setShowTaskManager(true);
  };

  const handleTaskSaved = () => {
    setRefreshTrigger(prev => prev + 1);
    setShowTaskManager(false);
    setSelectedTask(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#001e33]">Calendario de Tareas</h3>
          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
            {canManageAll 
              ? 'Gestión completa de todas las áreas' 
              : `Gestión de tareas - ${AREAS.find(a => a.id === effectiveUserArea)?.nombre || 'Sin área asignada'}`}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                viewMode === 'calendar' 
                  ? 'bg-white text-[#001e33] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Calendar size={14} />
              Calendario
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-[#001e33] shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <List size={14} />
              Lista
            </button>
          </div>

          {canCreateTask && (
            <button
              onClick={() => {
                setSelectedDate(new Date());
                setSelectedTask(null);
                setShowTaskManager(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg shadow-blue-900/10"
            >
              <Plus size={16} />
              Nueva Tarea
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {viewMode === 'calendar' ? (
        <TaskCalendar
          onSelectDate={handleSelectDate}
          onSelectTask={handleSelectTask}
          canCreateTask={canCreateTask}
          userArea={effectiveUserArea}
          refreshTrigger={refreshTrigger}
        />
      ) : (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm min-h-[400px]">
          <TaskManager
            onClose={() => setViewMode('calendar')}
            onTaskSaved={handleTaskSaved}
            userArea={effectiveUserArea}
            readOnly={false}
          />
        </div>
      )}

      {/* Task Manager Modal */}
      {showTaskManager && (
        <TaskManager
          selectedDate={selectedDate}
          selectedTask={selectedTask}
          onClose={() => {
            setShowTaskManager(false);
            setSelectedTask(null);
          }}
          onTaskSaved={handleTaskSaved}
          userArea={effectiveUserArea}
          readOnly={!canCreateTask}
        />
      )}
    </div>
  );
};

export default TaskDashboard;
