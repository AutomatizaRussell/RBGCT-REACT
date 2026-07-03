import { useState, useEffect, useCallback, useMemo } from 'react';
import useAuth from '../../../hooks/useAuth';
import {
  BookOpen, PlayCircle, FileText, ExternalLink, Download,
  ChevronDown, ChevronRight, RefreshCw, Link2, AlignLeft,
  CheckCircle2, Circle, Loader2, Lock, Search, X,
  ArrowLeft, ClipboardList, GraduationCap, Layers, Trophy,
  Zap, Star, Target, Award, TrendingUp, BarChart2, Calendar, Clock, AlertCircle,
} from 'lucide-react';
import {
  getAllCursos, getContenidosByCurso, getMiProgresoCurso,
  marcarProgresoCurso, getMiProgresoGlobal, getMisOnboardings,
} from '../../../lib/api';
import CuestionarioViewer from '../shared/CuestionarioViewer';

// ── Paleta RB ────────────────────────────────────────────────────────────────
const GRADIENTS = [
  'from-[#001871] to-[#981d97]',
  'from-[#001871] to-[#00bfb3]',
  'from-[#001871] to-[#ed8b00]',
  'from-[#981d97] to-[#001871]',
  'from-[#00bfb3] to-[#001871]',
];

const TIPO_CONFIG = {
  youtube:      { Icon: PlayCircle,    label: 'YouTube',    color: 'text-red-500',    bg: 'bg-red-50 border-red-100' },
  video:        { Icon: PlayCircle,    label: 'Video',      color: 'text-red-500',    bg: 'bg-red-50 border-red-100' },
  documento:    { Icon: FileText,      label: 'Documento',  color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-100' },
  texto:        { Icon: AlignLeft,     label: 'Texto',      color: 'text-slate-500',  bg: 'bg-slate-50 border-slate-200' },
  enlace:       { Icon: Link2,         label: 'Enlace',     color: 'text-[#00bfb3]',  bg: 'bg-teal-50 border-teal-100' },
  cuestionario: { Icon: ClipboardList, label: 'Quiz',       color: 'text-[#981d97]',  bg: 'bg-purple-50 border-purple-100' },
};

// ── Logros definidos (se evalúan en frontend) ────────────────────────────────
const LOGROS = [
  {
    id: 'primer_paso',
    nombre: 'Primer paso',
    desc: 'Completa tu primer recurso',
    Icon: Zap,
    color: '#00bfb3',
    condition: (s) => s.items_completados >= 1,
  },
  {
    id: 'explorador',
    nombre: 'Explorador',
    desc: 'Inicia 3 cursos diferentes',
    Icon: Target,
    color: '#00a9ce',
    condition: (s) => s.cursos_iniciados >= 3,
  },
  {
    id: 'quiz_master',
    nombre: 'Quiz Master',
    desc: 'Aprueba tu primer cuestionario',
    Icon: Star,
    color: '#ed8b00',
    condition: (s) => s.quizzes_aprobados >= 1,
  },
  {
    id: 'completista',
    nombre: 'Completista',
    desc: 'Termina un curso al 100%',
    Icon: Trophy,
    color: '#981d97',
    condition: (s) => s.cursos_completados >= 1,
  },
  {
    id: 'maratonista',
    nombre: 'Maratonista',
    desc: 'Completa 3 cursos',
    Icon: Award,
    color: '#001871',
    condition: (s) => s.cursos_completados >= 3,
  },
];

// ── Helpers de fecha ─────────────────────────────────────────────────────────
function fmtFecha(iso) {
  if (!iso) return null;
  return new Date(iso + 'T12:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}
function diasRestantes(fechaFin) {
  if (!fechaFin) return null;
  return Math.ceil((new Date(fechaFin + 'T23:59:59') - new Date()) / 86400000);
}

function getYoutubeId(url = '') {
  const m = url.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

function YouTubeThumbnail({ url, titulo }) {
  const [abierto, setAbierto] = useState(false);
  const id = getYoutubeId(url);
  if (!id) return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-xs text-red-600 hover:underline mt-2">
      <ExternalLink size={11}/> Ver en YouTube
    </a>
  );
  return (
    <div className="mt-2 rounded-xl overflow-hidden border border-red-100 shadow-sm">
      <button type="button" onClick={() => setAbierto(v => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 bg-red-50 hover:bg-red-100/80 transition-colors text-left">
        <div className="w-6 h-6 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
          <PlayCircle size={13} className="text-white"/>
        </div>
        <span className="flex-1 text-xs font-semibold text-red-700 truncate">{titulo || 'Ver video'}</span>
        <ChevronDown size={14} className={`text-red-400 flex-shrink-0 transition-transform duration-200 ${abierto ? 'rotate-180' : ''}`}/>
      </button>
      {abierto && (
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${id}?autoplay=1`}
            title={titulo || 'YouTube'}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      )}
    </div>
  );
}

// ── Anillo de progreso SVG ───────────────────────────────────────────────────
function ProgressRing({ pct, size = 52, stroke = 4.5, completo = false }) {
  const r    = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const off  = circ - (Math.min(pct, 100) / 100) * circ;
  const color = completo ? '#10b981' : pct > 0 ? '#001871' : '#e2e8f0';

  return (
    <svg width={size} height={size} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={off}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      {completo ? (
        <text x="50%" y="54%" textAnchor="middle" fontSize={size * 0.28}
          fill="#10b981" fontWeight="900">✓</text>
      ) : (
        <text x="50%" y="54%" textAnchor="middle" fontSize={size * 0.22}
          fill={pct > 0 ? '#001871' : '#cbd5e1'} fontWeight="800">
          {pct > 0 ? `${pct}%` : '—'}
        </text>
      )}
    </svg>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function ManualesCargo() {
  const { user } = useAuth();

  // Helpers de sessionStorage para recordar qué planes de onboarding ya vio el usuario.
  // Se usa sessionStorage (no state) para que persista entre navegaciones dentro de la SPA
  // y se limpie automáticamente al cerrar sesión (el logout llama sessionStorage.clear()).
  const ssKey = useMemo(() => `onboarding_vistos_${user?.id ?? 'anon'}`, [user?.id]);
  const getPlanesVistos = useCallback(() => {
    try { return new Set(JSON.parse(sessionStorage.getItem(ssKey) || '[]')); }
    catch { return new Set(); }
  }, [ssKey]);
  const marcarPlanesVistos = useCallback((ids) => {
    const prev = getPlanesVistos();
    ids.forEach(id => prev.add(id));
    sessionStorage.setItem(ssKey, JSON.stringify([...prev]));
  }, [ssKey, getPlanesVistos]);

  const [cursos, setCursos]           = useState([]);
  const [progresoGlobal, setProgresoGlobal] = useState({ por_curso: {}, stats: {} });
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError]             = useState(null);
  const [busqueda, setBusqueda]       = useState('');
  const [page, setPage]               = useState(1);
  const [hasMore, setHasMore]         = useState(false);
  const [cursoActivo, setCursoActivo] = useState(null);
  const [onboardings, setOnboardings] = useState([]);
  const [tabActivo, setTabActivo]     = useState('cursos');
  // Se re-renderiza al cambiar el tab para recalcular el badge desde sessionStorage
  const [, forceUpdate]               = useState(0);

  const fetchTodo = useCallback(async (p = 1, reset = false) => {
    try {
      reset ? setLoading(true) : setLoadingMore(true);
      setError(null);
      const [cursoData, progData] = await Promise.all([
        getAllCursos(p, 20),
        reset ? getMiProgresoGlobal().catch(() => ({ por_curso: {}, stats: {} })) : Promise.resolve(null),
      ]);
      const lista = (Array.isArray(cursoData) ? cursoData : (cursoData?.results || []))
        .filter(c => c.activo !== false);
      setCursos(prev => reset ? lista : [...prev, ...lista]);
      setHasMore(!!cursoData?.next);
      setPage(p);
      if (progData) setProgresoGlobal(progData);
    } catch {
      setError('No se pudieron cargar los cursos');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { fetchTodo(1, true); }, []);
  useEffect(() => {
    getMisOnboardings().then(d => setOnboardings(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  // Refresca solo el progreso global (al volver del detalle)
  const refrescarProgreso = useCallback(async () => {
    const data = await getMiProgresoGlobal().catch(() => null);
    if (data) setProgresoGlobal(data);
  }, []);

  const stats      = progresoGlobal.stats || {};
  const porCurso   = progresoGlobal.por_curso || {};
  const logrosData = LOGROS.map(l => ({ ...l, desbloqueado: l.condition(stats) }));
  const desbloqueados = logrosData.filter(l => l.desbloqueado).length;

  // Badge: planes de onboarding que el usuario aún no ha visitado en esta sesión.
  // Una vez que hace click en "Mi Onboarding", todos los IDs actuales se guardan en
  // sessionStorage y el badge desaparece hasta que se asigne un plan nuevo.
  const planesNoVistos = onboardings.filter(p => !getPlanesVistos().has(p.id)).length;

  const cursosFiltrados = cursos.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (c.descripcion || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // Vista detalle
  if (cursoActivo) {
    return (
      <CursoDetalle
        curso={cursoActivo}
        porCurso={porCurso}
        onVolver={() => { setCursoActivo(null); refrescarProgreso(); }}
      />
    );
  }

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-28 gap-3">
      <Loader2 size={28} className="text-[#001871] animate-spin"/>
      <p className="text-sm text-slate-400">Cargando cursos...</p>
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-28 gap-3">
      <BookOpen size={32} className="text-slate-200"/>
      <p className="text-sm text-red-500 font-medium">{error}</p>
      <button onClick={() => fetchTodo(1, true)} className="text-xs font-bold text-[#001871] uppercase hover:underline">
        Reintentar
      </button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">

      {/* ── Tabs Formación / Onboarding ── */}
      {onboardings.length > 0 && (
        <div className="flex items-center gap-1 bg-slate-100 rounded-2xl p-1 w-fit">
          {[
            { key: 'cursos',     label: 'Formación',     Icon: BookOpen,      badge: null },
            { key: 'onboarding', label: 'Mi Onboarding', Icon: ClipboardList, badge: planesNoVistos || null },
          ].map(({ key, label, Icon, badge }) => (
            <button key={key} type="button" onClick={() => {
              setTabActivo(key);
              if (key === 'onboarding') {
                marcarPlanesVistos(onboardings.map(p => p.id));
                forceUpdate(n => n + 1);
              }
            }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${tabActivo === key ? 'bg-white text-[#001871] shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
              <Icon size={13}/> {label}
              {badge && tabActivo !== key && <span className="bg-[#981d97] text-white text-[9px] font-black px-1.5 py-0.5 rounded-full leading-none">{badge}</span>}
            </button>
          ))}
        </div>
      )}

      {tabActivo === 'onboarding' && (
        <OnboardingPortal planes={onboardings} onAbrirCurso={setCursoActivo} porCurso={porCurso} />
      )}

      {tabActivo === 'cursos' ? (<>

      {/* ── Panel de estadísticas ── */}
      {(stats.cursos_accesibles > 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Cursos completados', value: `${stats.cursos_completados ?? 0}/${stats.cursos_accesibles ?? 0}`, Icon: GraduationCap, hex: '#001871' },
            { label: 'Recursos completados', value: stats.items_completados ?? 0,  Icon: Layers,    hex: '#00bfb3' },
            { label: 'Quizzes aprobados',    value: stats.quizzes_aprobados ?? 0,  Icon: Target,    hex: '#981d97' },
            { label: 'Puntaje promedio',     value: stats.promedio_puntaje ? `${stats.promedio_puntaje}%` : '—', Icon: BarChart2, hex: '#ed8b00' },
          ].map(({ label, value, Icon, hex }) => (
            <div key={label} className="bg-white rounded-2xl px-4 py-4 flex items-center gap-3 border border-slate-100 shadow-sm">
              <div className="p-2 rounded-xl flex-shrink-0" style={{ backgroundColor: hex + '15' }}>
                <Icon size={15} style={{ color: hex }}/>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-slate-800 leading-none">{value}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-0.5 leading-snug">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Logros ── */}
      {cursos.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy size={15} className="text-[#ed8b00]"/>
              <p className="text-xs font-bold text-slate-700 uppercase tracking-widest">Logros</p>
            </div>
            <span className="text-[10px] font-bold text-slate-400">
              {desbloqueados}/{LOGROS.length} desbloqueados
            </span>
          </div>

          {/* Barra de progreso de logros */}
          <div className="mb-4 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${(desbloqueados / LOGROS.length) * 100}%`,
                background: 'linear-gradient(to right, #001871, #981d97)',
              }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {logrosData.map(({ id, nombre, desc, Icon, color, desbloqueado }) => (
              <div key={id}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border text-center transition-all ${
                  desbloqueado
                    ? 'border-slate-100 bg-white shadow-sm'
                    : 'border-dashed border-slate-200 bg-slate-50 opacity-50'
                }`}>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: desbloqueado ? color + '18' : '#f1f5f9' }}>
                  <Icon size={18} style={{ color: desbloqueado ? color : '#cbd5e1' }}/>
                </div>
                <div>
                  <p className={`text-[11px] font-bold leading-tight ${desbloqueado ? 'text-slate-700' : 'text-slate-400'}`}>
                    {nombre}
                  </p>
                  <p className="text-[9px] text-slate-400 mt-0.5 leading-tight">{desc}</p>
                </div>
                {desbloqueado && (
                  <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                    ✓ Desbloqueado
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Buscador + refresh ── */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/>
          <input type="text" value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar cursos..."
            className="w-full pl-10 pr-9 py-2.5 bg-white border border-slate-200 rounded-2xl text-sm focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 transition-all"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
              <X size={13}/>
            </button>
          )}
        </div>
        <button onClick={() => fetchTodo(1, true)}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-[#001871] hover:border-[#001871]/30 transition-all">
          <RefreshCw size={15}/>
        </button>
      </div>

      {/* ── Grid de cursos ── */}
      {cursosFiltrados.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100">
            <GraduationCap size={28} className="text-slate-300"/>
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-500">
              {busqueda ? 'Sin resultados' : 'No hay cursos disponibles aún'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {busqueda ? 'Intenta con otro término' : 'El administrador publicará cursos próximamente'}
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            {cursosFiltrados.length} curso{cursosFiltrados.length !== 1 ? 's' : ''} disponible{cursosFiltrados.length !== 1 ? 's' : ''}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cursosFiltrados.map(curso => {
              const completados = porCurso[String(curso.id)] ?? 0;
              const total       = curso.total_contenidos || 0;
              const pct         = total > 0 ? Math.round((completados / total) * 100) : 0;
              const completo    = total > 0 && completados >= total;
              const iniciado    = completados > 0;

              return (
                <CursoCard
                  key={curso.id}
                  curso={curso}
                  gradient={GRADIENTS[curso.id % GRADIENTS.length]}
                  completados={completados}
                  total={total}
                  pct={pct}
                  completo={completo}
                  iniciado={iniciado}
                  onAbrir={() => setCursoActivo(curso)}
                />
              );
            })}
          </div>

          {hasMore && !busqueda && (
            <button onClick={() => fetchTodo(page + 1)} disabled={loadingMore}
              className="w-full py-3 flex items-center justify-center gap-2 border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 hover:bg-white transition-all disabled:opacity-50">
              {loadingMore
                ? <><RefreshCw size={12} className="animate-spin"/> Cargando...</>
                : 'Cargar más cursos'
              }
            </button>
          )}
        </>
      )}
      </>) : null}
    </div>
  );
}

// ── Onboarding portal (empleado) ─────────────────────────────────────────────

function OnboardingPortal({ planes, onAbrirCurso, porCurso }) {
  return (
    <div className="space-y-4">
      {planes.map(plan => (
        <OnboardingPlanCard key={plan.id} plan={plan} onAbrirCurso={onAbrirCurso} porCurso={porCurso} />
      ))}
    </div>
  );
}

function OnboardingPlanCard({ plan, onAbrirCurso, porCurso }) {
  const pasos = (plan.pasos || []).slice().sort((a, b) => a.orden - b.orden);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#001871] to-[#981d97] px-6 py-5">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-xl flex-shrink-0">
            <ClipboardList size={16} className="text-white"/>
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-white text-base truncate">{plan.nombre}</h3>
            {plan.descripcion && <p className="text-white/70 text-xs mt-0.5">{plan.descripcion}</p>}
          </div>
        </div>
        <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest mt-3">
          {pasos.length} paso{pasos.length !== 1 ? 's' : ''} de formación
          {plan.nombre_area && ` · ${plan.nombre_area}`}
        </p>
      </div>

      {/* Lista de pasos */}
      <div className="p-4 space-y-2">
        {pasos.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">Este plan no tiene pasos configurados aún.</p>
        ) : pasos.map((paso, idx) => {
          const total        = paso.total_contenidos ?? 0;
          const completados  = porCurso[String(paso.curso)] ?? 0;
          const pasoCompleto = total > 0 && completados >= total;
          const iniciado     = completados > 0 && !pasoCompleto;
          return (
            <div key={paso.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-[#001871]/20 hover:bg-blue-50/20 transition-all">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs flex-shrink-0 ${
                pasoCompleto ? 'bg-emerald-100 text-emerald-600' :
                iniciado     ? 'bg-blue-100 text-[#001871]' :
                               'bg-slate-100 text-slate-400'
              }`}>
                {pasoCompleto ? <CheckCircle2 size={14}/> : iniciado ? <TrendingUp size={13}/> : idx + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#001871] truncate">{paso.nombre_curso}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {total > 0 && (
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {completados}/{total} recursos
                    </p>
                  )}
                  {paso.dias_limite && (
                    <p className="text-[10px] text-amber-500 font-semibold">
                      · Límite: {paso.dias_limite} día{paso.dias_limite !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => onAbrirCurso({
                  id: paso.curso, nombre: paso.nombre_curso,
                  tipo: paso.tipo_curso || 'curso', descripcion: '', visibilidad: 'todos',
                  total_contenidos: total,
                })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#001871] text-white rounded-xl text-[10px] font-bold uppercase tracking-wide hover:bg-slate-800 transition-all flex-shrink-0">
                <BookOpen size={10}/> Ver curso
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tarjeta de curso ──────────────────────────────────────────────────────────
function CursoCard({ curso, gradient, completados, total, pct, completo, iniciado, onAbrir }) {
  const contenidos   = curso.contenidos || [];
  const tieneVideos  = contenidos.some(c => ['youtube', 'video'].includes(c.tipo));
  const tieneDocs    = contenidos.some(c => c.tipo === 'documento');
  const tieneQuizzes = contenidos.some(c => c.tipo === 'cuestionario');

  return (
    <div
      onClick={onAbrir}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer">

      {/* Header con gradiente */}
      <div className={`bg-gradient-to-br ${gradient} p-5 relative`}>
        {/* Badge de estado */}
        <div className="absolute top-3 right-3">
          {completo ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-emerald-500 rounded-lg text-[9px] font-black text-white uppercase tracking-wide">
              <CheckCircle2 size={9}/> Completado
            </span>
          ) : iniciado ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-white/20 rounded-lg text-[9px] font-black text-white uppercase tracking-wide border border-white/25">
              En progreso
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-white/10 rounded-lg text-[9px] font-bold text-white/70 uppercase tracking-wide border border-white/15">
              No iniciado
            </span>
          )}
        </div>

        {/* Inicial + anillo de progreso */}
        <div className="flex items-end gap-3 mt-1">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center font-black text-xl text-white border border-white/25 flex-shrink-0">
            {curso.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="bg-white rounded-xl p-1 shadow-sm">
            <ProgressRing pct={pct} size={44} stroke={4} completo={completo}/>
          </div>
        </div>

        <div className="mt-3">
          <h3 className="font-black text-white text-sm leading-snug line-clamp-2">{curso.nombre}</h3>
          {curso.descripcion && (
            <p className="text-white/60 text-[11px] mt-1 line-clamp-1">{curso.descripcion}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col flex-1 gap-3">
        {/* Barra de progreso lineal */}
        {total > 0 && (
          <div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${pct}%`,
                  backgroundColor: completo ? '#10b981' : '#001871',
                }}
              />
            </div>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">
              {completados}/{total} recursos completados
            </p>
          </div>
        )}

        {/* Chips de tipo */}
        <div className="flex flex-wrap gap-1.5">
          {total === 0 ? (
            <span className="text-[10px] text-slate-300 italic">Sin recursos aún</span>
          ) : (
            <>
              {tieneVideos  && <span className="flex items-center gap-1 px-2 py-0.5 bg-red-50 border border-red-100 rounded-md text-[10px] font-bold text-red-500"><PlayCircle size={9}/> Video</span>}
              {tieneDocs    && <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-50 border border-blue-100 rounded-md text-[10px] font-bold text-blue-600"><FileText size={9}/> Docs</span>}
              {tieneQuizzes && <span className="flex items-center gap-1 px-2 py-0.5 bg-purple-50 border border-purple-100 rounded-md text-[10px] font-bold text-[#981d97]"><ClipboardList size={9}/> Quiz</span>}
            </>
          )}
        </div>

        {/* CTA */}
        {/* Chip de plazo */}
        {(() => {
          const dias = diasRestantes(curso.fecha_fin);
          if (!curso.fecha_fin) return null;
          if (dias !== null && dias <= 7 && dias >= 0) return (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 border border-red-100 rounded-xl text-[10px] font-bold text-red-600">
              <Clock size={10}/> Vence en {dias} día{dias !== 1 ? 's' : ''}
            </div>
          );
          return (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-500">
              <Calendar size={10}/> Hasta {fmtFecha(curso.fecha_fin)}
            </div>
          );
        })()}

        <div className="mt-auto pt-2 border-t border-slate-100">
          <span className="text-[11px] font-bold text-[#001871] group-hover:underline">
            {completo ? 'Revisar curso →' : iniciado ? 'Continuar →' : 'Empezar →'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ── Vista detalle de un curso ─────────────────────────────────────────────────
function CursoDetalle({ curso, porCurso, onVolver }) {
  const gradient  = GRADIENTS[curso.id % GRADIENTS.length];
  const [contenidos, setContenidos]     = useState([]);
  const [completados, setCompletados]   = useState(new Set());
  const [loading, setLoading]           = useState(true);
  const [toggling, setToggling]         = useState(null);
  const [expandedQuiz, setExpandedQuiz] = useState(null);
  const [agotados, setAgotados]         = useState(new Set());
  const [celebracion, setCelebracion]   = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getContenidosByCurso(curso.id),
      getMiProgresoCurso(curso.id),
    ]).then(([cData, pData]) => {
      setContenidos(Array.isArray(cData) ? cData : (cData?.results || []));
      setCompletados(new Set(pData?.completados || []));
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [curso.id]);

  const total        = contenidos.length;
  const hechos       = contenidos.filter(c => completados.has(c.id)).length;
  const pct          = total > 0 ? Math.round((hechos / total) * 100) : 0;
  const completo     = total > 0 && hechos === total;
  const esCapacitacion = curso.tipo === 'capacitacion';

  // Para capacitaciones: un recurso está bloqueado si alguno anterior no está completado
  const estaBloqueado = (idx) => {
    if (!esCapacitacion) return false;
    for (let i = 0; i < idx; i++) {
      if (!completados.has(contenidos[i].id)) return true;
    }
    return false;
  };

  const handleToggleCompletado = async (contenidoId) => {
    if (toggling) return;
    setToggling(contenidoId);
    try {
      const res = await marcarProgresoCurso(curso.id, contenidoId);
      setCompletados(prev => {
        const next = new Set(prev);
        res.completado ? next.add(contenidoId) : next.delete(contenidoId);
        return next;
      });
      if (res.curso_completado) setCelebracion(true);
    } catch (e) { console.error(e); }
    finally { setToggling(null); }
  };

  const handleAgotado    = (id) => { setAgotados(prev => new Set([...prev, id])); setExpandedQuiz(p => p === id ? null : p); };
  const handleCompletado = (id) => {
    setCompletados(prev => {
      const next = new Set([...prev, id]);
      if (contenidos.length > 0 && next.size >= contenidos.length) setCelebracion(true);
      return next;
    });
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300 max-w-3xl mx-auto">

      {/* Celebración */}
      {celebracion && (
        <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-5 flex items-center gap-4 shadow-md animate-in slide-in-from-top-2 duration-500">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0">
            🏆
          </div>
          <div className="flex-1">
            <p className="font-black text-white text-base">¡Curso completado!</p>
            <p className="text-emerald-100 text-sm mt-0.5">Terminaste "{curso.nombre}" al 100%. ¡Excelente trabajo!</p>
          </div>
          <button onClick={() => setCelebracion(false)} className="text-white/60 hover:text-white transition-colors">
            <X size={18}/>
          </button>
        </div>
      )}

      {/* Botón volver */}
      <button onClick={onVolver}
        className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#001871] uppercase tracking-widest transition-colors">
        <ArrowLeft size={13}/> Todos los cursos
      </button>

      {/* Header del curso */}
      <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-6 shadow-sm`}>
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center font-black text-2xl text-white border border-white/25 flex-shrink-0 shadow-sm">
            {curso.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-black text-white text-lg leading-snug">{curso.nombre}</h2>
            {curso.descripcion && (
              <p className="text-white/65 text-sm mt-1 leading-relaxed">{curso.descripcion}</p>
            )}
          </div>
          {completo && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 rounded-xl text-white text-[10px] font-black border border-white/25 flex-shrink-0">
              <CheckCircle2 size={11}/> Completado
            </div>
          )}
        </div>

        {/* Plazo del curso */}
        {(curso.fecha_inicio || curso.fecha_fin) && (
          <div className="flex items-center gap-2 mt-4 px-3 py-2 bg-white/15 rounded-xl border border-white/20 w-fit">
            <Calendar size={12} className="text-white/70"/>
            <span className="text-white/80 text-[11px] font-semibold">
              {curso.fecha_inicio && curso.fecha_fin
                ? `${fmtFecha(curso.fecha_inicio)} → ${fmtFecha(curso.fecha_fin)}`
                : curso.fecha_fin
                  ? `Disponible hasta ${fmtFecha(curso.fecha_fin)}`
                  : `Disponible desde ${fmtFecha(curso.fecha_inicio)}`
              }
            </span>
            {(() => {
              const dias = diasRestantes(curso.fecha_fin);
              if (dias !== null && dias <= 7 && dias >= 0) return (
                <span className="text-[10px] font-black text-red-200 bg-red-500/40 px-2 py-0.5 rounded-md">
                  ¡{dias}d restantes!
                </span>
              );
              return null;
            })()}
          </div>
        )}

        {/* Progreso */}
        {total > 0 && (
          <div className="mt-5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-white/70 font-semibold">Tu progreso</span>
              <div className="flex items-center gap-3 text-white">
                <span className="font-black text-sm">{pct}%</span>
                <span className="text-white/50 text-xs">{hechos}/{total} recursos</span>
              </div>
            </div>
            <div className="h-2.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${pct}%`,
                  backgroundColor: completo ? '#10b981' : 'white',
                }}
              />
            </div>
            {/* Hitos de progreso */}
            <div className="flex justify-between text-[9px] text-white/40 font-bold px-0.5">
              {[25, 50, 75, 100].map(h => (
                <span key={h} className={pct >= h ? 'text-white/70' : ''}>{h}%</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Banner plan secuencial para capacitaciones */}
      {esCapacitacion && !loading && contenidos.length > 0 && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-[#ed8b00]/10 border border-[#ed8b00]/30 rounded-2xl">
          <AlertCircle size={14} className="text-[#ed8b00] flex-shrink-0 mt-0.5"/>
          <p className="text-[11px] font-semibold text-[#ed8b00] leading-snug">
            Esta capacitación tiene un plan estructurado — completa cada recurso en orden para avanzar al siguiente.
          </p>
        </div>
      )}

      {/* Lista de contenidos */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3">
            <Loader2 size={24} className="text-[#001871] animate-spin"/>
            <p className="text-sm text-slate-400">Cargando recursos...</p>
          </div>
        ) : contenidos.length === 0 ? (
          <div className="py-12 text-center">
            <Layers size={28} className="mx-auto text-slate-200 mb-2"/>
            <p className="text-sm text-slate-400">Este plan no tiene recursos aún</p>
          </div>
        ) : (
          contenidos.map((c, idx) => (
            <RecursoItem
              key={c.id}
              item={c}
              num={idx + 1}
              completado={completados.has(c.id)}
              toggling={toggling === c.id}
              agotado={agotados.has(c.id)}
              bloqueadoPorPlan={estaBloqueado(idx)}
              quizExpandido={expandedQuiz === c.id}
              onToggleCompletado={() => handleToggleCompletado(c.id)}
              onToggleQuiz={() => { if (!agotados.has(c.id) && !estaBloqueado(idx)) setExpandedQuiz(p => p === c.id ? null : c.id); }}
              onAgotado={() => handleAgotado(c.id)}
              onCompletado={() => handleCompletado(c.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Item de recurso ───────────────────────────────────────────────────────────
function RecursoItem({ item, num, completado, toggling, agotado, bloqueadoPorPlan = false, quizExpandido, onToggleCompletado, onToggleQuiz, onAgotado, onCompletado }) {
  const cfg = TIPO_CONFIG[item.tipo] || TIPO_CONFIG.enlace;
  const { Icon } = cfg;
  const esCuestionario = item.tipo === 'cuestionario';

  // Bloqueado por plan secuencial de capacitación
  if (bloqueadoPorPlan) {
    return (
      <div className="bg-slate-50 rounded-2xl border border-slate-200 border-dashed overflow-hidden">
        <div className="flex items-center gap-3 p-4 opacity-50">
          <span className="text-[9px] font-black text-slate-300 flex-shrink-0">{String(num).padStart(2, '0')}</span>
          <div className="p-2 rounded-xl border bg-slate-100 border-slate-200 flex-shrink-0">
            <Lock size={14} className="text-slate-400"/>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-400">{item.titulo}</p>
            {item.descripcion && <p className="text-[11px] text-slate-300 mt-0.5">{item.descripcion}</p>}
          </div>
        </div>
        <div className="px-4 pb-3 flex items-center gap-1.5">
          <Lock size={10} className="text-[#ed8b00]"/>
          <p className="text-[10px] font-bold text-[#ed8b00]">Completa el recurso anterior para desbloquear</p>
        </div>
      </div>
    );
  }
  const url = item.url || item.archivo_url;

  return (
    <div className={`bg-white rounded-2xl border transition-all ${
      agotado       ? 'border-slate-100 opacity-55' :
      completado    ? 'border-emerald-100 bg-emerald-50/30' :
                      'border-slate-100 hover:border-slate-200'
    }`}>
      <div className="flex items-start gap-3 p-4">
        {/* Número + indicador */}
        <div className="flex flex-col items-center gap-1.5 flex-shrink-0 pt-0.5">
          <span className="text-[9px] font-black text-slate-300 tabular-nums">
            {String(num).padStart(2, '0')}
          </span>
          {esCuestionario ? (
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              completado ? 'border-emerald-400 bg-emerald-400' :
              agotado    ? 'border-slate-300 bg-slate-100' :
                           'border-[#981d97]'
            }`}>
              {completado && <CheckCircle2 size={11} className="text-white"/>}
              {agotado && !completado && <Lock size={9} className="text-slate-400"/>}
            </div>
          ) : (
            <button onClick={onToggleCompletado} disabled={toggling} className="transition-colors"
              title={completado ? 'Marcar como pendiente' : 'Marcar como completado'}>
              {toggling
                ? <Loader2 size={18} className="animate-spin text-emerald-400"/>
                : completado
                  ? <CheckCircle2 size={18} className="text-emerald-500"/>
                  : <Circle size={18} className="text-slate-200 hover:text-[#001871]"/>
              }
            </button>
          )}
        </div>

        {/* Icono tipo */}
        <div className={`p-2 rounded-xl border flex-shrink-0 ${agotado ? 'bg-slate-50 border-slate-200' : cfg.bg}`}>
          {agotado
            ? <Lock size={14} className="text-slate-300"/>
            : <Icon size={14} className={cfg.color}/>
          }
        </div>

        {/* Contenido */}
        <div className="flex-1 min-w-0">
          {esCuestionario ? (
            <button onClick={onToggleQuiz} disabled={agotado}
              className={`text-left w-full flex items-center gap-2 group ${agotado ? 'cursor-default' : ''}`}>
              <span className={`text-sm font-semibold ${
                agotado    ? 'text-slate-400 line-through' :
                completado ? 'text-emerald-700' :
                             'text-[#001871]'
              }`}>
                {item.titulo}
              </span>
              {!agotado && (quizExpandido
                ? <ChevronDown size={13} className="text-slate-400 flex-shrink-0"/>
                : <ChevronRight size={13} className="text-slate-400 flex-shrink-0"/>
              )}
              {agotado && (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">Límite</span>
              )}
              {!agotado && item.max_intentos > 0 && (
                <span className="text-[10px] font-bold text-[#981d97] bg-purple-50 border border-purple-100 px-2 py-0.5 rounded-md">
                  {item.max_intentos} intento{item.max_intentos !== 1 ? 's' : ''}
                </span>
              )}
            </button>
          ) : (
            <p className={`text-sm font-semibold ${completado ? 'text-slate-400 line-through' : 'text-[#001871]'}`}>
              {item.titulo}
            </p>
          )}

          {item.descripcion && (
            <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.descripcion}</p>
          )}

          {item.tipo === 'youtube' && item.url && <YouTubeThumbnail url={item.url} titulo={item.titulo} />}

          {item.tipo === 'texto' && item.contenido && (
            <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {item.contenido}
            </div>
          )}

          {esCuestionario && quizExpandido && !agotado && (
            <div className="mt-4">
              <CuestionarioViewer
                contenido={item}
                onAgotado={onAgotado}
                onCompletado={onCompletado}
              />
            </div>
          )}
        </div>

        {/* Acción externa */}
        {url && !esCuestionario && item.tipo !== 'youtube' && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-[#001871] text-white rounded-xl text-[10px] font-bold uppercase tracking-wide hover:bg-slate-800 transition-all shadow-sm">
            {item.tipo === 'documento' || item.tipo === 'video'
              ? <><Download size={10}/> Abrir</>
              : <><ExternalLink size={10}/> Ver</>
            }
          </a>
        )}
      </div>
    </div>
  );
}
