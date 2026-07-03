import { useState, useEffect, useCallback } from 'react';
import {
  Search, RefreshCw, CheckCircle2, Circle, Loader2,
  Building2, Users, X, ChevronDown, BookOpen,
  GraduationCap, AlertCircle, Check, Eye, Ban,
} from 'lucide-react';
import {
  getAllEmpleados, getAllAreas, getCursosPorArea,
  getResumenAreaFormacion, toggleAsignacionFormacion,
  toggleExclusionFormacion, batchAsignarFormacion,
  getResumenAreaOnboarding, toggleAsignacionOnboarding, batchAsignarOnboarding,
} from '../../../lib/api';
import { ClipboardList } from 'lucide-react';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TIPO_COLOR = {
  curso:        { bg: 'bg-[#001871]',  label: 'Curso',        Icon: BookOpen },
  capacitacion: { bg: 'bg-[#00bfb3]',  label: 'Capacitación', Icon: GraduationCap },
};

// Niveles del organigrama (misma lógica que backend)
function nivelDeCargo(nombre = '') {
  const n = nombre.toUpperCase();
  if (n.includes('SOCIO'))                                    return 0;
  if (n.includes('GERENTE'))                                  return 1;
  if (n.includes('LÍDER') || n.includes('LIDER') || n.includes('SEMI')) return 3;
  if (n.includes('SENIOR'))                                   return 2;
  if (n.includes('ANALISTA') || n.includes('ASISTENTE'))     return 4;
  return 99;
}

// Calcula si un empleado tiene acceso a un curso por reglas de visibilidad
function tieneAccesoPorVisibilidad(empleado, curso) {
  if (curso.visibilidad === 'todos') return true;
  if (curso.visibilidad === 'area') {
    return (curso.area_ids || []).includes(empleado.area_id);
  }
  if (curso.visibilidad === 'cargo') {
    const nivelEmp = nivelDeCargo(empleado.nombre_cargo || '');
    return nivelEmp !== 99 && nivelEmp === curso.nivel_cargo;
  }
  if (curso.visibilidad === 'persona') {
    return curso.empleado_asignado === empleado.id_empleado;
  }
  return false;
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UsuariosFormacion() {
  const [areas, setAreas]           = useState([]);
  const [empleados, setEmpleados]   = useState([]);
  const [cursos, setCursos]         = useState([]);
  const [areaSeleccionada, setAreaSeleccionada] = useState('');
  const [busqueda, setBusqueda]     = useState('');
  const [loading, setLoading]       = useState(true);
  const [loadingArea, setLoadingArea] = useState(false);
  // mapa: { empleado_id: [{ curso_id, id }] }
  const [asignaciones, setAsignaciones] = useState({});   // { emp_id: [curso_id] }
  const [exclusiones, setExclusiones]   = useState({});   // { emp_id: [curso_id] }
  // onboarding
  const [planes, setPlanes]                         = useState([]);
  const [asignacionesOnboarding, setAsignacionesOnboarding] = useState({});  // { emp_id: [plan_id] }
  // celdas en proceso de toggle
  const [toggling, setToggling]     = useState(new Set());
  const [togglingOb, setTogglingOb] = useState(new Set());
  // selección múltiple de empleados
  const [seleccionados, setSeleccionados] = useState(new Set());

  // ── Carga inicial (áreas y empleados) ────────────────────────────────────
  useEffect(() => {
    Promise.all([getAllAreas(), getAllEmpleados()])
      .then(([a, e]) => {
        setAreas(Array.isArray(a) ? a : []);
        setEmpleados(Array.isArray(e) ? e : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // ── Carga cursos del área + asignaciones ─────────────────────────────────
  const cargarArea = useCallback(async (areaId) => {
    if (!areaId) {
      setCursos([]); setAsignaciones({}); setExclusiones({});
      setPlanes([]); setAsignacionesOnboarding({});
      return;
    }
    setLoadingArea(true);
    try {
      const [cursosData, resumen, resumenOb] = await Promise.all([
        getCursosPorArea(areaId),
        getResumenAreaFormacion(areaId),
        getResumenAreaOnboarding(areaId),
      ]);
      const lista = Array.isArray(cursosData) ? cursosData : (cursosData?.results || []);
      setCursos(lista.filter(x => x.activo !== false));
      setAsignaciones(resumen?.asignaciones || {});
      setExclusiones(resumen?.exclusiones   || {});
      setPlanes(resumenOb?.planes           || []);
      setAsignacionesOnboarding(resumenOb?.asignaciones || {});
    } catch {
      setCursos([]); setAsignaciones({}); setExclusiones({});
      setPlanes([]); setAsignacionesOnboarding({});
    }
    finally { setLoadingArea(false); }
  }, []);

  useEffect(() => {
    setSeleccionados(new Set());
    cargarArea(areaSeleccionada);
  }, [areaSeleccionada]);

  // ── Empleados filtrados ───────────────────────────────────────────────────
  const empleadosDelArea = empleados.filter(e => {
    if (areaSeleccionada && String(e.area_id) !== String(areaSeleccionada)) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      const nombre = (e.nombre_completo || `${e.primer_nombre} ${e.primer_apellido}`).toLowerCase();
      return nombre.includes(q) || (e.nombre_cargo || '').toLowerCase().includes(q);
    }
    return true;
  });

  // ── Toggle individual ─────────────────────────────────────────────────────
  // ── Toggle inteligente según estado actual ────────────────────────────────
  const handleToggle = async (empleadoId, cursoId, estadoActual) => {
    // estadoActual: 'asignado' | 'acceso_regla' | 'bloqueado' | 'sin_acceso'
    const key = `${empleadoId}-${cursoId}`;
    if (toggling.has(key)) return;
    setToggling(prev => new Set([...prev, key]));

    const prevAsig = { ...asignaciones };
    const prevExcl = { ...exclusiones };

    try {
      if (estadoActual === 'bloqueado') {
        // Desbloquear → quitar exclusión
        setExclusiones(prev => {
          const n = { ...prev };
          n[String(empleadoId)] = (n[String(empleadoId)] || []).filter(id => id !== cursoId);
          return n;
        });
        await toggleExclusionFormacion(empleadoId, cursoId);
      } else if (estadoActual === 'acceso_regla') {
        // Bloquear → crear exclusión
        setExclusiones(prev => {
          const n = { ...prev };
          n[String(empleadoId)] = [...(n[String(empleadoId)] || []), cursoId];
          return n;
        });
        await toggleExclusionFormacion(empleadoId, cursoId);
      } else if (estadoActual === 'asignado') {
        // Quitar asignación directa
        setAsignaciones(prev => {
          const n = { ...prev };
          n[String(empleadoId)] = (n[String(empleadoId)] || []).filter(id => id !== cursoId);
          return n;
        });
        await toggleAsignacionFormacion(empleadoId, cursoId);
      } else {
        // sin_acceso → asignar directamente
        setAsignaciones(prev => {
          const n = { ...prev };
          n[String(empleadoId)] = [...(n[String(empleadoId)] || []), cursoId];
          return n;
        });
        await toggleAsignacionFormacion(empleadoId, cursoId);
      }
    } catch {
      setAsignaciones(prevAsig);
      setExclusiones(prevExcl);
    } finally {
      setToggling(prev => { const s = new Set(prev); s.delete(key); return s; });
    }
  };

  // ── Asignar curso a seleccionados ─────────────────────────────────────────
  const handleAsignarATodos = async (cursoId) => {
    if (seleccionados.size === 0) return;
    const ids = [...seleccionados];
    try {
      await batchAsignarFormacion(cursoId, ids);
      await cargarArea(areaSeleccionada);
    } catch (e) { alert('Error al asignar: ' + e.message); }
  };

  // ── Onboarding toggle ─────────────────────────────────────────────────────
  const estaAsignadoOnboarding = (empleadoId, planId) =>
    (asignacionesOnboarding[String(empleadoId)] || []).includes(planId);

  const handleToggleOnboarding = async (empleadoId, planId) => {
    const key = `ob-${empleadoId}-${planId}`;
    if (togglingOb.has(key)) return;
    setTogglingOb(prev => new Set([...prev, key]));
    const prev = { ...asignacionesOnboarding };
    const asignado = estaAsignadoOnboarding(empleadoId, planId);
    setAsignacionesOnboarding(p => {
      const n = { ...p };
      const empKey = String(empleadoId);
      n[empKey] = asignado
        ? (n[empKey] || []).filter(id => id !== planId)
        : [...(n[empKey] || []), planId];
      return n;
    });
    try {
      await toggleAsignacionOnboarding(empleadoId, planId);
    } catch {
      setAsignacionesOnboarding(prev);
    } finally {
      setTogglingOb(p => { const s = new Set(p); s.delete(key); return s; });
    }
  };

  const handleAsignarOnboardingATodos = async (planId) => {
    if (seleccionados.size === 0) return;
    try {
      await batchAsignarOnboarding(planId, [...seleccionados]);
      await cargarArea(areaSeleccionada);
    } catch (e) { alert('Error al asignar: ' + e.message); }
  };

  // ── Helpers de estado ─────────────────────────────────────────────────────
  const estaAsignado = (empleadoId, cursoId) =>
    (asignaciones[String(empleadoId)] || []).includes(cursoId);

  const estaBloqueado = (empleadoId, cursoId) =>
    (exclusiones[String(empleadoId)] || []).includes(cursoId);

  // Devuelve el estado real de la celda
  const getEstado = (emp, curso) => {
    if (estaBloqueado(emp.id_empleado, curso.id)) return 'bloqueado';
    if (estaAsignado(emp.id_empleado, curso.id))  return 'asignado';
    if (tieneAccesoPorVisibilidad(emp, curso))      return 'acceso_regla';
    return 'sin_acceso';
  };

  const toggleSeleccion = (id) => {
    setSeleccionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const seleccionarTodos = () => {
    if (seleccionados.size === empleadosDelArea.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(empleadosDelArea.map(e => e.id_empleado)));
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={28} className="text-[#001871] animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── Filtros ── */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Selector de área */}
        <div className="relative">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <select
            value={areaSeleccionada}
            onChange={e => setAreaSeleccionada(e.target.value)}
            className="pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all appearance-none min-w-[180px]"
          >
            <option value="">Todas las áreas</option>
            {areas.map(a => (
              <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
        </div>

        {/* Búsqueda */}
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar colaborador..."
            className="w-full pl-9 pr-8 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-all"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={13}/>
            </button>
          )}
        </div>

        {/* Refresh */}
        <button
          onClick={() => cargarArea(areaSeleccionada)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#001871] hover:border-[#001871]/30 transition-all"
        >
          <RefreshCw size={15} className={loadingArea ? 'animate-spin' : ''}/>
        </button>

        {/* Info de selección + acción batch */}
        {seleccionados.size > 0 && (
          <div className="flex items-center gap-2 ml-auto px-3 py-2 bg-[#001871]/5 border border-[#001871]/20 rounded-xl">
            <span className="text-xs font-bold text-[#001871]">{seleccionados.size} seleccionado{seleccionados.size > 1 ? 's' : ''}</span>
            <button onClick={() => setSeleccionados(new Set())} className="text-slate-400 hover:text-slate-600">
              <X size={12}/>
            </button>
          </div>
        )}
      </div>

      {/* ── Nota si no hay área seleccionada ── */}
      {!areaSeleccionada && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-[#00a9ce]/10 border border-[#00a9ce]/30 rounded-2xl">
          <AlertCircle size={14} className="text-[#00a9ce] flex-shrink-0"/>
          <p className="text-[11px] font-semibold text-[#00a9ce]">
            Selecciona un área para ver y gestionar las asignaciones de formación de sus colaboradores.
          </p>
        </div>
      )}

      {/* ── Tabla tipo Monday ── */}
      {areaSeleccionada && (
        <>
          {empleadosDelArea.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={28} className="mx-auto text-slate-200 mb-2"/>
              <p className="text-sm text-slate-400">Sin colaboradores en esta área</p>
            </div>
          ) : cursos.length === 0 ? (
            <div className="py-16 text-center">
              <BookOpen size={28} className="mx-auto text-slate-200 mb-2"/>
              <p className="text-sm text-slate-400">No hay cursos o capacitaciones creados aún</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm bg-white">
              <table className="w-full border-collapse text-sm">
                <thead>
                  {/* Header de cursos */}
                  <tr className="border-b border-slate-100">
                    {/* Checkbox col */}
                    <th className="w-10 px-3 py-3 text-left">
                      <button onClick={seleccionarTodos} className="w-5 h-5 rounded border-2 border-slate-300 flex items-center justify-center hover:border-[#001871] transition-all">
                        {seleccionados.size === empleadosDelArea.length && empleadosDelArea.length > 0 && (
                          <Check size={11} className="text-[#001871]"/>
                        )}
                      </button>
                    </th>
                    {/* Empleado col */}
                    <th className="px-4 py-3 text-left min-w-[200px] sticky left-10 bg-white z-10 border-r border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Colaborador ({empleadosDelArea.length})
                      </span>
                    </th>
                    {/* Una columna por curso */}
                    {cursos.map(curso => {
                      const ti = TIPO_COLOR[curso.tipo] || TIPO_COLOR.curso;
                      const { Icon } = ti;
                      return (
                        <th key={curso.id} className="px-3 py-2 text-center min-w-[120px] border-l border-slate-100">
                          <div className="flex flex-col items-center gap-1">
                            <div className={`w-6 h-6 ${ti.bg} rounded-lg flex items-center justify-center`}>
                              <Icon size={12} className="text-white"/>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 leading-snug line-clamp-2 max-w-[100px]">
                              {curso.nombre}
                            </span>
                            {seleccionados.size > 0 && (
                              <button
                                onClick={() => handleAsignarATodos(curso.id)}
                                className="text-[9px] font-bold text-[#001871] hover:underline mt-0.5"
                                title={`Asignar a ${seleccionados.size} seleccionados`}
                              >
                                + Asignar {seleccionados.size}
                              </button>
                            )}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {empleadosDelArea.map((emp, idx) => {
                    const nombre = emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`;
                    const esSel  = seleccionados.has(emp.id_empleado);
                    return (
                      <tr
                        key={emp.id_empleado}
                        className={`border-b border-slate-50 transition-colors ${
                          esSel ? 'bg-[#001871]/5' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        } hover:bg-[#001871]/5`}
                      >
                        {/* Checkbox */}
                        <td className="w-10 px-3 py-3">
                          <button
                            onClick={() => toggleSeleccion(emp.id_empleado)}
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                              esSel ? 'border-[#001871] bg-[#001871]' : 'border-slate-300 hover:border-[#001871]'
                            }`}
                          >
                            {esSel && <Check size={11} className="text-white"/>}
                          </button>
                        </td>

                        {/* Empleado */}
                        <td className="px-4 py-3 sticky left-10 bg-inherit z-10 border-r border-slate-100">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#001871] to-[#00a9ce] flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                              {nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-[#001871] truncate">{nombre}</p>
                              {emp.nombre_cargo && (
                                <p className="text-[10px] text-slate-400 truncate">{emp.nombre_cargo}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Celda por curso — 4 estados */}
                        {cursos.map(curso => {
                          const key     = `${emp.id_empleado}-${curso.id}`;
                          const estado  = getEstado(emp, curso);
                          const cargando = toggling.has(key);

                          const ESTADO_CONFIG = {
                            asignado:     { icon: <CheckCircle2 size={20} className="text-emerald-500"/>,       title: 'Asignado — clic para quitar',            bg: '' },
                            acceso_regla: { icon: <Eye size={18} className="text-[#00a9ce]"/>,                   title: 'Acceso por área/cargo — clic para bloquear', bg: '' },
                            bloqueado:    { icon: <Ban size={18} className="text-red-400"/>,                     title: 'Bloqueado — clic para restaurar acceso',    bg: 'bg-red-50' },
                            sin_acceso:   { icon: <Circle size={20} className="text-slate-200 hover:text-[#001871]"/>, title: 'Sin acceso — clic para asignar',     bg: '' },
                          };
                          const cfg = ESTADO_CONFIG[estado];

                          return (
                            <td key={curso.id} className={`px-3 py-2 text-center border-l border-slate-100 ${estado === 'bloqueado' ? 'bg-red-50/30' : ''}`}>
                              <button
                                onClick={() => handleToggle(emp.id_empleado, curso.id, estado)}
                                disabled={cargando}
                                className={`mx-auto flex items-center justify-center w-8 h-8 rounded-xl transition-all disabled:opacity-50 hover:scale-110 ${cfg.bg}`}
                                title={cfg.title}
                              >
                                {cargando
                                  ? <Loader2 size={16} className="animate-spin text-slate-400"/>
                                  : cfg.icon
                                }
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Leyenda cursos */}
          <div className="flex items-center gap-5 text-[10px] text-slate-400 font-semibold flex-wrap">
            <span className="flex items-center gap-1.5"><CheckCircle2 size={13} className="text-emerald-500"/> Asignado directamente</span>
            <span className="flex items-center gap-1.5"><Eye size={13} className="text-[#00a9ce]"/> Acceso por área/cargo</span>
            <span className="flex items-center gap-1.5"><Ban size={13} className="text-red-400"/> Bloqueado</span>
            <span className="flex items-center gap-1.5"><Circle size={13} className="text-slate-300"/> Sin acceso</span>
            <span className="flex items-center gap-1.5 ml-auto">
              {loadingArea && <><Loader2 size={11} className="animate-spin"/> Actualizando...</>}
            </span>
          </div>

          {/* ── Tabla Onboarding ── */}
          {planes.length > 0 && empleadosDelArea.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <ClipboardList size={14} className="text-[#981d97]"/>
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest">
                  Planes de Onboarding del área
                </h3>
              </div>
              <div className="overflow-x-auto rounded-2xl border border-[#981d97]/20 shadow-sm bg-white">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-4 py-3 text-left min-w-[200px] sticky left-0 bg-white z-10 border-r border-slate-100">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Colaborador
                        </span>
                      </th>
                      {planes.map(plan => (
                        <th key={plan.id} className="px-3 py-2 text-center min-w-[130px] border-l border-slate-100">
                          <div className="flex flex-col items-center gap-1">
                            <div className="w-6 h-6 bg-[#981d97] rounded-lg flex items-center justify-center">
                              <ClipboardList size={12} className="text-white"/>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600 leading-snug line-clamp-2 max-w-[110px]">
                              {plan.nombre}
                            </span>
                            {plan.nivel_cargo_label && (
                              <span className="text-[9px] text-[#981d97] font-semibold">{plan.nivel_cargo_label}</span>
                            )}
                            {seleccionados.size > 0 && (() => {
                              // Contar solo los seleccionados que aplican al nivel del plan
                              const aplicables = plan.nivel_cargo !== null && plan.nivel_cargo !== undefined
                                ? empleadosDelArea.filter(e =>
                                    seleccionados.has(e.id_empleado) &&
                                    nivelDeCargo(e.nombre_cargo || '') === plan.nivel_cargo
                                  ).length
                                : seleccionados.size;
                              return aplicables > 0 ? (
                                <button
                                  onClick={() => handleAsignarOnboardingATodos(plan.id)}
                                  className="text-[9px] font-bold text-[#981d97] hover:underline mt-0.5"
                                >
                                  + Asignar {aplicables}
                                </button>
                              ) : null;
                            })()}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {empleadosDelArea.map((emp, idx) => {
                      const nombre = emp.nombre_completo || `${emp.primer_nombre} ${emp.primer_apellido}`;
                      return (
                        <tr key={emp.id_empleado}
                          className={`border-b border-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'} hover:bg-[#981d97]/5`}>
                          <td className="px-4 py-3 sticky left-0 bg-inherit z-10 border-r border-slate-100">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#981d97] to-[#001871] flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                                {nombre.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-slate-700 truncate">{nombre}</p>
                                {emp.nombre_cargo && (
                                  <p className="text-[10px] text-slate-400 truncate">{emp.nombre_cargo}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          {planes.map(plan => {
                            const key      = `ob-${emp.id_empleado}-${plan.id}`;
                            const asignado = estaAsignadoOnboarding(emp.id_empleado, plan.id);
                            const cargando = togglingOb.has(key);

                            // Si el plan tiene nivel_cargo, solo aplica a empleados de ese nivel
                            const nivelEmp = nivelDeCargo(emp.nombre_cargo || '');
                            const nivelNoAplica = plan.nivel_cargo !== null &&
                                                  plan.nivel_cargo !== undefined &&
                                                  nivelEmp !== plan.nivel_cargo;

                            if (nivelNoAplica) {
                              return (
                                <td key={plan.id} className="px-3 py-2 text-center border-l border-slate-100 bg-slate-50/60">
                                  <span className="text-[10px] text-slate-300 select-none">—</span>
                                </td>
                              );
                            }

                            return (
                              <td key={plan.id} className="px-3 py-2 text-center border-l border-slate-100">
                                <button
                                  onClick={() => handleToggleOnboarding(emp.id_empleado, plan.id)}
                                  disabled={cargando}
                                  className="mx-auto flex items-center justify-center w-8 h-8 rounded-xl transition-all disabled:opacity-50 hover:scale-110"
                                  title={asignado ? 'Asignado — clic para quitar' : 'No asignado — clic para asignar'}
                                >
                                  {cargando
                                    ? <Loader2 size={16} className="animate-spin text-slate-400"/>
                                    : asignado
                                      ? <CheckCircle2 size={20} className="text-[#981d97]"/>
                                      : <Circle size={20} className="text-slate-200 hover:text-[#981d97]"/>
                                  }
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-slate-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 size={11} className="text-[#981d97]"/> Asignado &nbsp;·&nbsp;
                <Circle size={11} className="text-slate-300"/> No asignado
              </p>
            </div>
          )}

        </>
      )}
    </div>
  );
}
