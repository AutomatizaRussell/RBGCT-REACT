import { useState, useEffect, useMemo } from 'react';
import {
  Search, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Trophy, BarChart2, Users, BookOpen, Loader2, RefreshCw,
  GraduationCap, ClipboardList, XCircle, Filter, X,
} from 'lucide-react';
import { getResumenEmpleadosFormacion, getAllAreas, getAllCargos } from '../../../lib/api';

const TIPO_BADGE = {
  curso:       'bg-blue-100 text-blue-700',
  capacitacion:'bg-[#ed8b00]/15 text-[#ed8b00]',
};

function inicial(nombre) {
  return (nombre || '?').charAt(0).toUpperCase();
}

function PctRing({ pct, completo }) {
  const r = 14, circ = 2 * Math.PI * r;
  const off = circ - (Math.min(pct, 100) / 100) * circ;
  const color = completo ? '#10b981' : pct > 0 ? '#001871' : '#e2e8f0';
  return (
    <svg width={36} height={36} className="flex-shrink-0">
      <circle cx={18} cy={18} r={r} fill="none" stroke="#f1f5f9" strokeWidth={3.5} />
      <circle cx={18} cy={18} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 18 18)" style={{ transition: 'stroke-dashoffset .5s ease' }}
      />
      <text x="50%" y="54%" textAnchor="middle" fontSize={9}
        fill={color} fontWeight="800">
        {completo ? '✓' : pct > 0 ? `${pct}%` : '—'}
      </text>
    </svg>
  );
}

function CursoCard({ c }) {
  const badge = TIPO_BADGE[c.tipo] || TIPO_BADGE.curso;
  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${
      c.completo
        ? 'bg-emerald-50 border-emerald-100'
        : c.completados > 0
          ? 'bg-white border-slate-100'
          : 'bg-slate-50 border-slate-100'
    }`}>
      {/* Cabecera curso */}
      <div className="flex items-center gap-3">
        <PctRing pct={c.pct} completo={c.completo} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-[#001871] truncate">{c.nombre}</p>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${badge}`}>
              {c.tipo === 'capacitacion' ? 'Capacitación' : 'Curso'}
            </span>
            {c.completo && (
              <span className="flex items-center gap-1 text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md">
                <CheckCircle2 size={9} /> Completado
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {c.completados}/{c.total_contenidos} recursos completados
          </p>
        </div>
      </div>

      {/* Barra progreso */}
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${c.pct}%`, backgroundColor: c.completo ? '#10b981' : '#001871' }}
        />
      </div>

      {/* Quizzes */}
      {c.quizzes.length > 0 && (
        <div className="space-y-1.5 pt-1">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Cuestionarios</p>
          {c.quizzes.map((q, i) => (
            <div key={i} className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold border ${
              q.aprobado
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-700'
            }`}>
              {q.aprobado
                ? <CheckCircle2 size={12} className="flex-shrink-0" />
                : <XCircle size={12} className="flex-shrink-0" />
              }
              <span className="flex-1 truncate">{q.cuestionario}</span>
              <span className="font-black tabular-nums">{q.mejor_puntaje}%</span>
              <span className="text-[10px] opacity-60">{q.num_intentos} int.</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilaEmpleado({ emp, expandido, onToggle }) {
  const tieneActividad = emp.cursos_iniciados > 0;

  return (
    <div className={`rounded-2xl border transition-all duration-200 ${
      expandido ? 'border-[#001871]/20 shadow-sm' : 'border-slate-100 hover:border-slate-200'
    }`}>
      {/* Fila principal */}
      <button
        type="button"
        onClick={onToggle}
        disabled={!tieneActividad}
        className="w-full flex items-center gap-4 p-4 text-left"
      >
        {/* Avatar */}
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#001871] to-[#981d97] flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">{inicial(emp.nombre)}</span>
        </div>

        {/* Nombre + datos */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-[#001871] truncate">{emp.nombre}</p>
          <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
            {emp.cargo && <span className="text-[11px] text-slate-500 font-medium">{emp.cargo}</span>}
            {emp.area  && <span className="text-[11px] text-slate-400">· {emp.area}</span>}
          </div>
        </div>

        {/* Stats resumen */}
        <div className="hidden sm:flex items-center gap-4 flex-shrink-0">
          <div className="text-center">
            <p className="text-base font-black text-[#001871] leading-none">{emp.cursos_completados}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Completados</p>
          </div>
          <div className="text-center">
            <p className="text-base font-black text-slate-500 leading-none">{emp.cursos_iniciados}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">En progreso</p>
          </div>
          <div className="text-center">
            <p className="text-base font-black text-slate-300 leading-none">
              {emp.cursos_totales - emp.cursos_iniciados}
            </p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">Pendientes</p>
          </div>
        </div>

        {/* Chevron */}
        <div className="flex-shrink-0 ml-2">
          {!tieneActividad ? (
            <span className="text-[10px] font-bold text-slate-300 italic">Sin actividad</span>
          ) : expandido ? (
            <ChevronDown size={16} className="text-[#001871]" />
          ) : (
            <ChevronRight size={16} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Panel expandido: tarjetas de cursos */}
      {expandido && tieneActividad && (
        <div className="px-4 pb-4 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
            {emp.cursos.length} curso{emp.cursos.length !== 1 ? 's' : ''} con actividad
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {emp.cursos.map(c => (
              <CursoCard key={c.curso_id} c={c} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ResultadosFormacion() {
  const [datos, setDatos]       = useState([]);
  const [areas, setAreas]       = useState([]);
  const [cargos, setCargos]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filtroArea, setFiltroArea]   = useState('');
  const [filtroCargo, setFiltroCargo] = useState('');
  const [busqueda, setBusqueda]       = useState('');
  const [expandido, setExpandido]     = useState(null);
  const [soloActivos, setSoloActivos] = useState(false);

  const fetchDatos = async () => {
    setLoading(true);
    try {
      const [d, a, c] = await Promise.all([
        getResumenEmpleadosFormacion(),
        getAllAreas(),
        getAllCargos(),
      ]);
      setDatos(Array.isArray(d) ? d : []);
      setAreas(Array.isArray(a) ? a : []);
      setCargos(Array.isArray(c) ? c : (c?.results || []));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDatos(); }, []);

  const filtrados = useMemo(() => {
    let d = datos;
    if (filtroArea)   d = d.filter(e => String(e.area_id)  === filtroArea);
    if (filtroCargo)  d = d.filter(e => String(e.cargo_id) === filtroCargo);
    if (soloActivos)  d = d.filter(e => e.cursos_iniciados > 0);
    if (busqueda) {
      const q = busqueda.toLowerCase();
      d = d.filter(e =>
        e.nombre.toLowerCase().includes(q) ||
        (e.correo || '').toLowerCase().includes(q) ||
        (e.area   || '').toLowerCase().includes(q) ||
        (e.cargo  || '').toLowerCase().includes(q)
      );
    }
    return d;
  }, [datos, filtroArea, filtroCargo, busqueda, soloActivos]);

  const stats = useMemo(() => ({
    total:        filtrados.length,
    conActividad: filtrados.filter(e => e.cursos_iniciados  > 0).length,
    completaron:  filtrados.filter(e => e.cursos_completados > 0).length,
    sinActividad: filtrados.filter(e => e.cursos_iniciados  === 0).length,
  }), [filtrados]);

  const hayFiltros = filtroArea || filtroCargo || busqueda || soloActivos;

  const limpiarFiltros = () => {
    setFiltroArea('');
    setFiltroCargo('');
    setBusqueda('');
    setSoloActivos(false);
  };

  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-black text-[#001871]">Resultados de Formación</h2>
          <p className="text-xs text-slate-400 mt-0.5">Progreso y calificaciones por empleado</p>
        </div>
        <button onClick={fetchDatos} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-500 hover:text-[#001871] hover:border-[#001871]/30 transition-all disabled:opacity-40">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </button>
      </div>

      {/* ── Estadísticas ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Empleados',      value: stats.total,        Icon: Users,         hex: '#001871' },
          { label: 'Con actividad',  value: stats.conActividad, Icon: BookOpen,      hex: '#00bfb3' },
          { label: 'Completaron',    value: stats.completaron,  Icon: Trophy,        hex: '#981d97' },
          { label: 'Sin actividad',  value: stats.sinActividad, Icon: Circle,        hex: '#ed8b00' },
        ].map(({ label, value, Icon, hex }) => (
          <div key={label} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-slate-100 shadow-sm">
            <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: hex + '15' }}>
              <Icon size={14} style={{ color: hex }} />
            </div>
            <div>
              <p className="text-xl font-black text-slate-800 leading-none">{value}</p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Filter size={13} className="text-slate-400" />
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Filtros</span>
          {hayFiltros && (
            <button onClick={limpiarFiltros}
              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition-colors">
              <X size={11} /> Limpiar
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Búsqueda */}
          <div className="relative sm:col-span-1">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
              placeholder="Buscar empleado..."
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all"
            />
          </div>
          {/* Filtro área */}
          <select value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setExpandido(null); }}
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all text-slate-600">
            <option value="">Todas las áreas</option>
            {areas.map(a => (
              <option key={a.id_area} value={String(a.id_area)}>{a.nombre_area}</option>
            ))}
          </select>
          {/* Filtro cargo */}
          <select value={filtroCargo} onChange={e => { setFiltroCargo(e.target.value); setExpandido(null); }}
            className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all text-slate-600">
            <option value="">Todos los cargos</option>
            {cargos.map(c => (
              <option key={c.id_cargo || c.id} value={String(c.id_cargo || c.id)}>{c.nombre_cargo}</option>
            ))}
          </select>
        </div>
        {/* Toggle solo activos */}
        <button type="button" onClick={() => setSoloActivos(v => !v)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all ${
            soloActivos
              ? 'bg-[#001871] text-white border-[#001871]'
              : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-[#001871]/30'
          }`}>
          <BookOpen size={11} />
          Solo con actividad de formación
        </button>
      </div>

      {/* ── Lista de empleados ── */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 size={26} className="text-[#001871] animate-spin" />
          <p className="text-sm text-slate-400">Cargando resultados...</p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <GraduationCap size={32} className="text-slate-200" />
          <p className="text-sm font-semibold text-slate-400">
            {hayFiltros ? 'Sin resultados para los filtros aplicados' : 'No hay empleados activos'}
          </p>
          {hayFiltros && (
            <button onClick={limpiarFiltros} className="text-xs font-bold text-[#001871] hover:underline">
              Limpiar filtros
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {filtrados.length} empleado{filtrados.length !== 1 ? 's' : ''}
            {hayFiltros ? ' (filtrados)' : ''}
          </p>
          {filtrados.map(emp => (
            <FilaEmpleado
              key={emp.id_empleado}
              emp={emp}
              expandido={expandido === emp.id_empleado}
              onToggle={() => setExpandido(p => p === emp.id_empleado ? null : emp.id_empleado)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
