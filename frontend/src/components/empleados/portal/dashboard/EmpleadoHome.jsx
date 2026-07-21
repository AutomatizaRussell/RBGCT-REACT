import React from 'react';
import {
  ClipboardList,
  Clock,
  CheckCircle2,
  PlayCircle,
  BookOpen,
  Wrench,
  Briefcase,
  Activity,
} from 'lucide-react';

import KpiStatCard from './KpiStatCard';
import TaskProgressCard from './TaskProgressCard';
import QuickAccessCard from './QuickAccessCard';
import VacantesResumen from '../../../features/vacantes/VacantesResumen';

/**
 * Vista principal del portal del empleado con estilo minimalista SaaS.
 *
 * Muestra KPIs de tareas, progreso de tareas, accesos rápidos y resumen de vacantes.
 */
const EmpleadoHome = ({
  taskStats,
  loadingStats,
  empleadoData,
  setActiveTab,
  navigate,
}) => {
  const nombreCargo = empleadoData?.nombre_cargo || 'Cartera de tareas';

  const kpiCards = [
    {
      id: 'pending',
      label: 'Pendientes',
      value: loadingStats ? '…' : taskStats.pending,
      sub: 'Por completar',
      icon: <Clock size={20} strokeWidth={1.75} />,
      accentColor: 'text-slate-700',
      onClick: () => {
        setActiveTab('tasks');
        navigate('/app/auto-gestion');
      },
    },
    {
      id: 'inProgress',
      label: 'En proceso',
      value: loadingStats ? '…' : taskStats.inProgress,
      sub: 'En curso',
      icon: <Activity size={20} strokeWidth={1.75} />,
      accentColor: 'text-[#00a9ce]',
      onClick: () => {
        setActiveTab('tasks');
        navigate('/app/auto-gestion');
      },
    },
    {
      id: 'completed',
      label: 'Completadas',
      value: loadingStats ? '…' : taskStats.completed,
      sub: 'Cerradas en el periodo',
      icon: <CheckCircle2 size={20} strokeWidth={1.75} />,
      accentColor: 'text-emerald-600',
    },
    {
      id: 'total',
      label: 'Total',
      value: loadingStats ? '…' : taskStats.total,
      sub: nombreCargo,
      icon: <ClipboardList size={20} strokeWidth={1.75} />,
      accentColor: 'text-[#001871]',
    },
  ];

  const quickActions = [
    {
      id: 'vacantes',
      label: 'Vacantes',
      icon: <Briefcase size={18} strokeWidth={1.75} />,
      onClick: () => window.open('/vacantes', '_blank', 'noopener'),
    },
    {
      id: 'auto-gestion',
      label: 'Auto gestión',
      icon: <ClipboardList size={18} strokeWidth={1.75} />,
      onClick: () => {
        setActiveTab('tasks');
        navigate('/app/auto-gestion');
      },
    },
    {
      id: 'cursos',
      label: 'Cursos',
      icon: <PlayCircle size={18} strokeWidth={1.75} />,
      onClick: () => {
        setActiveTab('cursos');
        navigate('/app/manuales');
      },
    },
    {
      id: 'reglamento',
      label: 'Reglamento',
      icon: <BookOpen size={18} strokeWidth={1.75} />,
      onClick: () => {
        setActiveTab('reglamento');
        navigate('/app/comunicados');
      },
    },
    {
      id: 'herramientas',
      label: 'Herramientas',
      icon: <Wrench size={18} strokeWidth={1.75} />,
      onClick: () => {
        setActiveTab('utilidades');
        navigate('/app/utilidades');
      },
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8 animate-in fade-in duration-500">
      {/* Grid de KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
        {kpiCards.map((card) => (
          <KpiStatCard
            key={card.id}
            label={card.label}
            value={card.value}
            sub={card.sub}
            icon={card.icon}
            accentColor={card.accentColor}
            onClick={card.onClick}
          />
        ))}
      </div>

      {/* Progreso de tareas + Accesos rápidos */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <TaskProgressCard
          taskStats={taskStats}
          loading={loadingStats}
          onViewAll={() => {
            setActiveTab('tasks');
            navigate('/app/auto-gestion');
          }}
        />

        <QuickAccessCard actions={quickActions} />
      </div>

      {/* Resumen de vacantes */}
      <VacantesResumen />
    </div>
  );
};

export default EmpleadoHome;
