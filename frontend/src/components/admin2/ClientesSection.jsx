import { useState, useEffect, useCallback } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area,
} from 'recharts';
import {
  Building2, Plus, Search, X, ChevronRight, Users, FileText,
  BookOpen, Phone, Mail, Globe, MapPin, AlertTriangle, Pencil,
  Trash2, Upload, ExternalLink, UserPlus, DollarSign, Activity,
  ShieldAlert, LayoutDashboard, List, ArrowRight, ChevronDown,
  ChevronUp, Briefcase, Clock,
} from 'lucide-react';
import {
  getClientesStats, getEmpresas, getEmpresa,
  createEmpresa, updateEmpresa, deleteEmpresa,
  getEmpresaPorAreas, getEmpresaContactos, getEmpresaDocumentos, getEmpresaBitacora,
  createContacto, deleteContacto,
  createServicio, updateServicio, deleteServicio,
  createAsignacion, updateAsignacion,
  createDocumentoCliente, deleteDocumentoCliente,
  createBitacora, deleteBitacora,
  getAllAreas, getAllEmpleados,
} from '../../lib/api';

// ── Palettes ──────────────────────────────────────────────────────────────────

const ESTADO_C = {
  activo:     { bg: 'bg-emerald-100', text: 'text-emerald-700', hex: '#10b981' },
  prospecto:  { bg: 'bg-blue-100',    text: 'text-blue-700',    hex: '#3b82f6' },
  inactivo:   { bg: 'bg-slate-100',   text: 'text-slate-500',   hex: '#94a3b8' },
  suspendido: { bg: 'bg-amber-100',   text: 'text-amber-700',   hex: '#f59e0b' },
  retirado:   { bg: 'bg-red-100',     text: 'text-red-600',     hex: '#ef4444' },
};
const RIESGO_C = {
  bajo:    { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
  medio:   { bg: 'bg-amber-50',   text: 'text-amber-600',   border: 'border-amber-200',   hex: '#f59e0b' },
  alto:    { bg: 'bg-orange-50',  text: 'text-orange-600',  border: 'border-orange-200',  hex: '#f97316' },
  critico: { bg: 'bg-red-50',     text: 'text-red-600',     border: 'border-red-200',     hex: '#ef4444' },
};
const AREA_PAL = ['#3b82f6','#8b5cf6','#10b981','#f59e0b','#ef4444','#06b6d4','#ec4899','#6366f1'];
const TIPO_EMP = { microempresa:'Microempresa', pyme:'PYME', grande:'Empresa Grande', grupo_empresarial:'Grupo Emp.' };
const ROL_LABELS = { responsable_principal:'Responsable Principal', gerente:'Gerente', senior:'Senior', analista:'Analista/Asistente', revisor:'Revisor', apoyo:'Apoyo' };
const SERV_ESTADO_C = { activo:'bg-emerald-100 text-emerald-700', pausado:'bg-amber-100 text-amber-700', terminado:'bg-slate-100 text-slate-600' };
const BIT_C = { reunion:'bg-blue-100 text-blue-700', llamada:'bg-emerald-100 text-emerald-700', visita:'bg-purple-100 text-purple-700', email:'bg-slate-100 text-slate-600', entrega:'bg-amber-100 text-amber-700', novedad:'bg-orange-100 text-orange-700', otro:'bg-slate-100 text-slate-500' };
const BIT_L = { reunion:'Reunión', llamada:'Llamada', visita:'Visita', email:'Correo', entrega:'Entrega', novedad:'Novedad', otro:'Otro' };
const DOC_L = { rut:'RUT', camara_comercio:'Cámara de Comercio', estado_financiero:'Estado Financiero', contrato_servicio:'Contrato Servicio', certificado:'Certificado', declaracion:'Declaración', poder:'Poder', otro:'Otro' };

function Badge({ children, className = '' }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

// ── KpiCard ───────────────────────────────────────────────────────────────────

const KPI_PAL = {
  blue:    ['ring-blue-100',    'bg-blue-50',    'text-blue-500',    'text-blue-700'],
  emerald: ['ring-emerald-100', 'bg-emerald-50', 'text-emerald-500', 'text-emerald-700'],
  amber:   ['ring-amber-100',   'bg-amber-50',   'text-amber-500',   'text-amber-700'],
  red:     ['ring-red-100',     'bg-red-50',     'text-red-400',     'text-red-700'],
  purple:  ['ring-purple-100',  'bg-purple-50',  'text-purple-500',  'text-purple-700'],
};
function KpiCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const [ring, bg, ic, val] = KPI_PAL[color] || KPI_PAL.blue;
  return (
    <div className={`bg-white rounded-2xl p-5 ring-1 ${ring} flex items-start gap-4`}>
      <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
        <Icon size={20} className={ic} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 font-medium">{label}</p>
        <p className={`text-2xl font-black mt-0.5 ${val}`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

const CTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label && <p className="font-semibold text-slate-700 mb-1">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || p.fill }}>
          {p.name}: <span className="font-bold">{typeof p.value === 'number' && p.value > 9999 ? `$${p.value.toLocaleString('es-CO')}` : p.value}</span>
        </p>
      ))}
    </div>
  );
};

// ── Dashboard CRM ─────────────────────────────────────────────────────────────

function ChartCard({ title, sub, children, isEmpty, emptyMsg }) {
  if (isEmpty) return null;
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-slate-100">
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
      {sub && <p className="text-xs text-slate-400 mb-3">{sub}</p>}
      {children}
    </div>
  );
}

function ProgressList({ data, total }) {
  if (!data.length) return null;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
        return (
          <div key={d.name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-medium" style={{ color: d.color || '#64748b' }}>{d.name}</span>
              <span className="text-slate-400">{d.value} ({pct}%)</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: d.color || AREA_PAL[i] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CrmDashboard({ onGo }) {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [areas, setAreas]         = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [filtroArea, setFiltroArea]         = useState('');
  const [filtroEmpleado, setFiltroEmpleado] = useState('');

  const loadStats = useCallback(async () => {
    setLoading(true);
    const params = {};
    if (filtroArea)     params.area_id     = filtroArea;
    if (filtroEmpleado) params.empleado_id = filtroEmpleado;
    try {
      const [s, a, e] = await Promise.all([
        getClientesStats(params),
        areas.length ? Promise.resolve(areas) : getAllAreas(),
        empleados.length ? Promise.resolve(empleados) : getAllEmpleados(),
      ]);
      setStats(s);
      if (!areas.length)    setAreas(a);
      if (!empleados.length) setEmpleados(e);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filtroArea, filtroEmpleado]);

  useEffect(() => { loadStats(); }, [loadStats]);

  const resetFiltros = () => { setFiltroArea(''); setFiltroEmpleado(''); };
  const hayFiltro    = filtroArea || filtroEmpleado;

  // ── Preparar datos solo con valores reales ──────────────────────────────
  const estadoData = Object.entries(stats?.por_estado || {})
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, fill: ESTADO_C[k]?.hex || '#94a3b8' }));

  const riesgoList = Object.entries(stats?.por_riesgo || {})
    .map(([k, v]) => ({ name: k.charAt(0).toUpperCase() + k.slice(1), value: v, color: RIESGO_C[k]?.hex }));

  const tipoList = Object.entries(stats?.por_tipo || {})
    .map(([k, v]) => ({ name: TIPO_EMP[k] || k, value: v }));

  const areaData = (stats?.por_area || [])
    .map((a, i) => ({ name: a.area__nombre_area || 'Sin área', clientes: a.total, fill: AREA_PAL[i % AREA_PAL.length] }));

  const facData = (stats?.facturacion_area || [])
    .filter(a => Number(a.total) > 0)
    .map((a, i) => ({ name: a.area__nombre_area || 'Sin área', valor: Number(a.total), fill: AREA_PAL[i % AREA_PAL.length] }));

  const mesData = (stats?.por_mes || []).map(m => ({ name: m.mes, nuevos: m.total }));

  const riesgoAlto = (stats?.por_riesgo?.alto || 0) + (stats?.por_riesgo?.critico || 0);
  const totalScope = stats?.total ?? 0;

  const contextLabel = stats?.filtro_info?.area_nombre
    ? `Área: ${stats.filtro_info.area_nombre}`
    : stats?.filtro_info?.empleado_nombre
      ? `Colaborador: ${stats.filtro_info.empleado_nombre}`
      : 'Vista global';

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Barra de filtros */}
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Filtrar por:</span>

        <select value={filtroArea} onChange={e => { setFiltroArea(e.target.value); setFiltroEmpleado(''); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700">
          <option value="">Todas las áreas</option>
          {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
        </select>

        <select value={filtroEmpleado} onChange={e => { setFiltroEmpleado(e.target.value); setFiltroArea(''); }}
          className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-slate-700">
          <option value="">Todo el equipo</option>
          {empleados.map(em => (
            <option key={em.id_empleado} value={em.id_empleado}>
              {em.primer_nombre} {em.primer_apellido}
            </option>
          ))}
        </select>

        {hayFiltro && (
          <button onClick={resetFiltros}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-red-500 border border-slate-200 rounded-lg px-2.5 py-1.5 hover:border-red-200 transition-colors">
            <X size={11}/> Quitar filtro
          </button>
        )}

        <span className="ml-auto text-xs text-slate-400 italic">{contextLabel}</span>
      </div>

      {/* Contenido scrolleable */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-slate-400">
              <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"/>
              <p className="text-sm">Actualizando...</p>
            </div>
          </div>
        ) : !stats || totalScope === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Building2 size={32} className="mb-3 opacity-20"/>
            <p className="text-sm font-medium">Sin datos para este filtro</p>
            {hayFiltro && <button onClick={resetFiltros} className="mt-2 text-xs text-blue-500 hover:underline">Ver todos los clientes</button>}
          </div>
        ) : (
          <>
            {/* Alerta: activos sin área */}
            {(stats.sin_area_count > 0) && (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5"/>
                <div>
                  <p className="text-sm font-semibold text-amber-800">
                    {stats.sin_area_count} cliente{stats.sin_area_count > 1 ? 's' : ''} activo{stats.sin_area_count > 1 ? 's' : ''} sin área asignada
                  </p>
                  <p className="text-xs text-amber-600 mt-0.5">Los clientes activos deben tener al menos un área de servicio. Revísalos en el Directorio.</p>
                </div>
                <button onClick={() => onGo('directorio')} className="ml-auto text-xs text-amber-700 font-medium hover:underline whitespace-nowrap">Ver directorio →</button>
              </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
              <KpiCard icon={Building2}   label="Clientes en alcance"   value={totalScope}
                sub={`${stats.por_estado?.activo || 0} activos · ${stats.por_estado?.prospecto || 0} prospectos`} color="blue"/>
              <KpiCard icon={DollarSign}  label="Facturación Mensual"   value={`$${(stats.ingresos_total || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 })}`}
                sub="servicios activos" color="emerald"/>
              <KpiCard icon={ShieldAlert} label="Riesgo Alto/Crítico"   value={riesgoAlto}
                sub="clientes en vigilancia" color={riesgoAlto > 0 ? 'red' : 'emerald'}/>
              <KpiCard icon={Users}       label="Colaboradores activos" value={(stats.top_equipo || []).length}
                sub="con clientes asignados" color="purple"/>
            </div>

            {/* Fila: área + estado */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {areaData.length > 0 && (
                <ChartCard title="Clientes por Área" sub="Empresas con servicios activos por área" isEmpty={false}>
                  <ResponsiveContainer width="100%" height={Math.max(120, areaData.length * 36)}>
                    <BarChart data={areaData} layout="vertical" margin={{ left: 8, right: 32 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9"/>
                      <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={120}/>
                      <Tooltip content={<CTip/>}/>
                      <Bar dataKey="clientes" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 10, fill: '#64748b' }}>
                        {areaData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}

              {estadoData.length > 0 && (
                <ChartCard title="Estado de Clientes" sub="Distribución actual" isEmpty={false}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={estadoData} cx="50%" cy="44%" innerRadius={48} outerRadius={74} paddingAngle={3} dataKey="value">
                        {estadoData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                      </Pie>
                      <Tooltip content={<CTip/>}/>
                      <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }}/>
                    </PieChart>
                  </ResponsiveContainer>
                </ChartCard>
              )}
            </div>

            {/* Facturación — solo si hay datos */}
            {facData.length > 0 && (
              <ChartCard title="Facturación Estimada por Área (COP)" sub="Suma de valores mensuales de servicios activos" isEmpty={false}>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={facData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={v => `$${(v / 1e6).toFixed(1)}M`}/>
                    <Tooltip content={<CTip/>}/>
                    <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                      {facData.map((d, i) => <Cell key={i} fill={d.fill}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Riesgo + Tipo en paralelo — solo si hay datos */}
            {(riesgoList.some(d => d.value > 0) || tipoList.some(d => d.value > 0)) && (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                {riesgoList.some(d => d.value > 0) && (
                  <ChartCard title="Nivel de Riesgo" isEmpty={false}>
                    <ProgressList data={riesgoList} total={totalScope}/>
                  </ChartCard>
                )}
                {tipoList.some(d => d.value > 0) && (
                  <ChartCard title="Tipo de Empresa" isEmpty={false}>
                    <ProgressList data={tipoList} total={totalScope}/>
                  </ChartCard>
                )}
              </div>
            )}

            {/* Nuevos por mes — solo si hay entradas */}
            {mesData.length > 0 && (
              <ChartCard title="Nuevos Clientes — Últimos 6 Meses" sub="Incorporaciones al portafolio" isEmpty={false}>
                <ResponsiveContainer width="100%" height={130}>
                  <AreaChart data={mesData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
                    <defs>
                      <linearGradient id="gNuevos" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} tickLine={false} axisLine={false}/>
                    <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false}/>
                    <Tooltip content={<CTip/>}/>
                    <Area type="monotone" dataKey="nuevos" stroke="#3b82f6" strokeWidth={2} fill="url(#gNuevos)"/>
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            )}

            {/* Actividad + equipo + alertas */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {(stats.actividad_reciente || []).length > 0 && (
                <div className="xl:col-span-2 bg-white rounded-2xl p-5 ring-1 ring-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Actividad Reciente</h3>
                      <p className="text-xs text-slate-400">Últimos registros de bitácora</p>
                    </div>
                    <button onClick={() => onGo('directorio')} className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                      Ver directorio <ArrowRight size={11}/>
                    </button>
                  </div>
                  <div className="space-y-1">
                    {(stats.actividad_reciente || []).map(e => (
                      <div key={e.id} className="flex items-start gap-2.5 px-2 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <Badge className={BIT_C[e.tipo] || 'bg-slate-100 text-slate-600'}>{BIT_L[e.tipo] || e.tipo}</Badge>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-700 truncate">{e.empresa_nombre}</p>
                          <p className="text-xs text-slate-400 truncate">{e.descripcion}</p>
                        </div>
                        <span className="text-[10px] text-slate-300 whitespace-nowrap">
                          {e.fecha ? new Date(e.fecha).toLocaleDateString('es-CO') : ''}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {(stats.top_equipo || []).length > 0 && (
                  <div className="bg-white rounded-2xl p-5 ring-1 ring-slate-100">
                    <h3 className="text-sm font-bold text-slate-800 mb-3">Equipo más Activo</h3>
                    <div className="space-y-2.5">
                      {(stats.top_equipo || []).map((e, i) => (
                        <div key={e.id || i} className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                            {(e.nombre || '?').charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{e.nombre}</p>
                            <p className="text-[10px] text-slate-400 truncate">{e.cargo}</p>
                          </div>
                          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{e.clientes}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(stats.clientes_riesgo || []).length > 0 && (
                  <div className="bg-white rounded-2xl p-5 ring-1 ring-red-100">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle size={14} className="text-red-500"/>
                      <h3 className="text-sm font-bold text-slate-800">Alertas de Riesgo</h3>
                    </div>
                    <div className="space-y-2">
                      {(stats.clientes_riesgo || []).slice(0, 5).map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-red-50 rounded-xl">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-700 truncate">{c.razon_social}</p>
                            <p className="text-[10px] text-slate-400">{c.ciudad || 'Sin ciudad'}</p>
                          </div>
                          <Badge className={`${RIESGO_C[c.nivel_riesgo]?.bg} ${RIESGO_C[c.nivel_riesgo]?.text} border ${RIESGO_C[c.nivel_riesgo]?.border} ml-2 whitespace-nowrap`}>
                            {c.nivel_riesgo}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── AreasTab ──────────────────────────────────────────────────────────────────
// Vista principal del cliente: cada área que lo atiende, con sus servicios y equipo

function ServicioRow({ s, onDelete, onToggle }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-slate-100 text-xs">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-slate-700">{s.descripcion || 'Servicio sin descripción'}</span>
          <Badge className={SERV_ESTADO_C[s.estado]}>{s.estado_display}</Badge>
          <Badge className="bg-slate-100 text-slate-500">{s.periodicidad_display}</Badge>
        </div>
        <div className="flex gap-3 mt-0.5 text-slate-400">
          <span>Inicio: {s.fecha_inicio}</span>
          {s.valor_mensual && <span className="text-emerald-600 font-semibold">$ {Number(s.valor_mensual).toLocaleString('es-CO')}</span>}
        </div>
      </div>
      <div className="flex gap-1 ml-2 flex-shrink-0">
        <button onClick={() => onToggle(s)} title={s.estado==='activo'?'Pausar':'Activar'}
          className="p-1 text-slate-300 hover:text-amber-500 rounded hover:bg-amber-50 transition-colors"><Clock size={13}/></button>
        <button onClick={() => onDelete(s.id)}
          className="p-1 text-slate-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors"><Trash2 size={13}/></button>
      </div>
    </div>
  );
}

function EmpleadoRow({ a, onRemove }) {
  const initials = (a.empleado_nombre||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  return (
    <div className="flex items-center justify-between py-2 px-3 bg-white rounded-xl border border-slate-100">
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-xs font-medium text-slate-700">{a.empleado_nombre || `Empleado #${a.empleado}`}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            <Badge className="bg-purple-100 text-purple-700">{ROL_LABELS[a.rol]||a.rol}</Badge>
            {a.empleado_cargo && <span className="text-[10px] text-slate-400">{a.empleado_cargo}</span>}
          </div>
        </div>
      </div>
      <button onClick={() => onRemove(a.id)} className="p-1 text-slate-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors ml-2"><X size={13}/></button>
    </div>
  );
}

function AgregarServicioForm({ areaId, empresaId, onSaved, onCancel }) {
  const [form, setForm] = useState({ descripcion:'', fecha_inicio:'', valor_mensual:'', periodicidad:'mensual' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createServicio({ ...form, empresa: empresaId, area: areaId, valor_mensual: form.valor_mensual || null });
      onSaved();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-blue-700 mb-1">Nuevo servicio</p>
      <textarea placeholder="Descripción del servicio" rows={2} value={form.descripcion}
        onChange={e=>set('descripcion',e.target.value)}
        className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
      <div className="grid grid-cols-3 gap-2">
        <input type="date" required value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <input type="number" placeholder="Valor mensual (COP)" value={form.valor_mensual}
          onChange={e=>set('valor_mensual',e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30" />
        <select value={form.periodicidad} onChange={e=>set('periodicidad',e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
          {[['mensual','Mensual'],['bimestral','Bimestral'],['trimestral','Trimestral'],['semestral','Semestral'],['anual','Anual'],['unico','Único']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving?'Guardando...':'Agregar'}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  );
}

function AgregarEmpleadoForm({ areaId, empresaId, onSaved, onCancel, empleados }) {
  const [form, setForm] = useState({ empleado:'', rol:'', fecha_inicio:'' });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createAsignacion({ ...form, empresa: empresaId, area: areaId });
      onSaved();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 p-3 bg-purple-50 border border-purple-100 rounded-xl space-y-2">
      <p className="text-xs font-semibold text-purple-700 mb-1">Asignar empleado</p>
      <div className="grid grid-cols-3 gap-2">
        <select value={form.empleado} onChange={e=>set('empleado',e.target.value)} required
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30">
          <option value="">Empleado *</option>
          {empleados.map(em=>(
            <option key={em.id_empleado} value={em.id_empleado}>
              {em.primer_nombre} {em.primer_apellido}
            </option>
          ))}
        </select>
        <select value={form.rol} onChange={e=>set('rol',e.target.value)} required
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30">
          <option value="">Rol *</option>
          {Object.entries(ROL_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
        </select>
        <input type="date" required value={form.fecha_inicio} onChange={e=>set('fecha_inicio',e.target.value)}
          className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30" />
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50">{saving?'Asignando...':'Asignar'}</button>
        <button type="button" onClick={onCancel} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  );
}

function AreaCard({ bloque, empresaId, empleados, onRefresh, colorIdx }) {
  const [open, setOpen]       = useState(true);
  const [addServ, setAddServ] = useState(false);
  const [addEmp, setAddEmp]   = useState(false);
  const color = AREA_PAL[colorIdx % AREA_PAL.length];

  const handleToggleServicio = async (s) => {
    const nuevo = s.estado === 'activo' ? 'pausado' : 'activo';
    await updateServicio(s.id, { estado: nuevo });
    onRefresh();
  };

  const handleDeleteServicio = async (id) => {
    if (!confirm('¿Eliminar servicio?')) return;
    await deleteServicio(id);
    onRefresh();
  };

  const handleRemoveEmpleado = async (id) => {
    if (!confirm('¿Remover del equipo?')) return;
    await updateAsignacion(id, { activo: false });
    onRefresh();
  };

  const totalFac = bloque.servicios
    .filter(s => s.estado === 'activo' && s.valor_mensual)
    .reduce((sum, s) => sum + Number(s.valor_mensual), 0);

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header del área */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <p className="text-sm font-bold text-slate-800">{bloque.area_nombre}</p>
            <p className="text-[11px] text-slate-400">
              {bloque.servicios.length} servicio(s) · {bloque.equipo.length} empleado(s)
              {totalFac > 0 && <span className="ml-2 text-emerald-600 font-semibold">· ${totalFac.toLocaleString('es-CO')}/mes</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {bloque.servicios.some(s=>s.estado==='activo') && <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>}
          {open ? <ChevronUp size={15} className="text-slate-400"/> : <ChevronDown size={15} className="text-slate-400"/>}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 border-t border-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">

            {/* Servicios */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Briefcase size={11}/> Servicios
                </p>
                <button onClick={e=>{e.stopPropagation();setAddServ(v=>!v);setAddEmp(false);}}
                  className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                  <Plus size={11}/> Agregar
                </button>
              </div>

              <div className="space-y-1.5">
                {bloque.servicios.length === 0
                  ? <p className="text-xs text-slate-300 italic py-2">Sin servicios registrados</p>
                  : bloque.servicios.map(s => (
                    <ServicioRow key={s.id} s={s} onDelete={handleDeleteServicio} onToggle={handleToggleServicio}/>
                  ))
                }
              </div>

              {addServ && (
                <AgregarServicioForm
                  areaId={bloque.area_id} empresaId={empresaId}
                  onSaved={() => { setAddServ(false); onRefresh(); }}
                  onCancel={() => setAddServ(false)}
                />
              )}
            </div>

            {/* Equipo */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={11}/> Equipo Asignado
                </p>
                <button onClick={e=>{e.stopPropagation();setAddEmp(v=>!v);setAddServ(false);}}
                  className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-medium">
                  <UserPlus size={11}/> Asignar
                </button>
              </div>

              <div className="space-y-1.5">
                {bloque.equipo.length === 0
                  ? <p className="text-xs text-slate-300 italic py-2">Sin empleados asignados</p>
                  : bloque.equipo.map(a => (
                    <EmpleadoRow key={a.id} a={a} onRemove={handleRemoveEmpleado}/>
                  ))
                }
              </div>

              {addEmp && (
                <AgregarEmpleadoForm
                  areaId={bloque.area_id} empresaId={empresaId} empleados={empleados}
                  onSaved={() => { setAddEmp(false); onRefresh(); }}
                  onCancel={() => setAddEmp(false)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AreasTab({ empresaId, empresaEstado }) {
  const [bloques, setBloques]     = useState([]);
  const [areas, setAreas]         = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showAddArea, setShowAddArea] = useState(false);
  const [newAreaId, setNewAreaId] = useState('');
  const [newAreaForm, setNewAreaForm] = useState({ descripcion:'', fecha_inicio:'', valor_mensual:'', periodicidad:'mensual' });
  const [saving, setSaving]       = useState(false);

  const areasEnUso = new Set(bloques.map(b => b.area_id));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, a, e] = await Promise.all([
        getEmpresaPorAreas(empresaId),
        getAllAreas(),
        getAllEmpleados(),
      ]);
      setBloques(b);
      setAreas(a);
      setEmpleados(e);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  const handleAgregarArea = async (e) => {
    e.preventDefault();
    if (!newAreaId) return;
    setSaving(true);
    try {
      await createServicio({
        empresa: empresaId,
        area: newAreaId,
        descripcion: newAreaForm.descripcion || null,
        fecha_inicio: newAreaForm.fecha_inicio,
        valor_mensual: newAreaForm.valor_mensual || null,
        periodicidad: newAreaForm.periodicidad,
      });
      setShowAddArea(false);
      setNewAreaId('');
      setNewAreaForm({ descripcion:'', fecha_inicio:'', valor_mensual:'', periodicidad:'mensual' });
      load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const areasDisponibles = areas.filter(a => !areasEnUso.has(a.id_area));

  const esActivo = empresaEstado === 'activo';
  const sinAreas = bloques.length === 0;

  return (
    <div className="space-y-3">
      {/* Warning: Cliente activo sin áreas */}
      {esActivo && sinAreas && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5"/>
          <div>
            <p className="text-xs font-semibold text-amber-700">Cliente activo sin área asignada</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              Los clientes activos deben tener al menos un área de servicio asignada.
            </p>
          </div>
        </div>
      )}

      {/* Botón agregar área */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {sinAreas ? 'Este cliente no tiene áreas asignadas aún.' : `${bloques.length} área(s) prestando servicios`}
        </p>
        <button onClick={() => setShowAddArea(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 transition-colors">
          <Plus size={13}/> Agregar área
        </button>
      </div>

      {/* Form para agregar nueva área */}
      {showAddArea && (
        <form onSubmit={handleAgregarArea} className="p-4 bg-blue-50 border border-blue-100 rounded-2xl space-y-3">
          <p className="text-xs font-bold text-blue-800">Nueva área de servicio para este cliente</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Área *</label>
              <select value={newAreaId} onChange={e=>setNewAreaId(e.target.value)} required
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                <option value="">— Seleccionar área —</option>
                {areasDisponibles.map(a=><option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
              </select>
              {areasDisponibles.length === 0 && <p className="text-xs text-amber-600 mt-1">Todas las áreas ya están asignadas a este cliente.</p>}
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-slate-500 mb-1">Descripción del servicio</label>
              <textarea rows={2} value={newAreaForm.descripcion}
                onChange={e=>setNewAreaForm(f=>({...f,descripcion:e.target.value}))}
                placeholder="Ej: Revisoría Fiscal mensual, Contabilidad general..."
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Fecha inicio *</label>
              <input type="date" required value={newAreaForm.fecha_inicio}
                onChange={e=>setNewAreaForm(f=>({...f,fecha_inicio:e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Valor mensual (COP)</label>
              <input type="number" placeholder="0" value={newAreaForm.valor_mensual}
                onChange={e=>setNewAreaForm(f=>({...f,valor_mensual:e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Periodicidad</label>
              <select value={newAreaForm.periodicidad} onChange={e=>setNewAreaForm(f=>({...f,periodicidad:e.target.value}))}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                {[['mensual','Mensual'],['bimestral','Bimestral'],['trimestral','Trimestral'],['semestral','Semestral'],['anual','Anual'],['unico','Único']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving||!areasDisponibles.length}
              className="px-4 py-2 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium">
              {saving ? 'Guardando...' : 'Agregar área'}
            </button>
            <button type="button" onClick={()=>setShowAddArea(false)}
              className="px-4 py-2 border border-slate-200 text-xs rounded-xl hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}

      {/* Tarjetas por área */}
      {bloques.length === 0 && !showAddArea && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Briefcase size={28} className="mb-2 opacity-30"/>
          <p className="text-sm">Sin áreas de servicio</p>
          <button onClick={() => setShowAddArea(true)} className="mt-2 text-xs text-blue-500 hover:underline">Agregar la primera área</button>
        </div>
      )}

      {bloques.map((bloque, idx) => (
        <AreaCard
          key={bloque.area_id}
          bloque={bloque}
          empresaId={empresaId}
          empleados={empleados}
          onRefresh={load}
          colorIdx={idx}
        />
      ))}
    </div>
  );
}

// ── ContactosTab ──────────────────────────────────────────────────────────────

function ContactosTab({ empresaId }) {
  const [contactos, setContactos] = useState([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ nombre:'', cargo:'', email:'', telefono:'', es_principal:false });

  useEffect(() => { getEmpresaContactos(empresaId).then(setContactos).catch(console.error); }, [empresaId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createContacto({ ...form, empresa: empresaId });
      setForm({ nombre:'', cargo:'', email:'', telefono:'', es_principal:false });
      setShowForm(false);
      getEmpresaContactos(empresaId).then(setContactos);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{contactos.length} contacto(s)</span>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700"><Plus size={13}/> Agregar</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nombre *" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            <select value={form.cargo} onChange={e=>setForm(f=>({...f,cargo:e.target.value}))} required className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30">
              <option value="">Cargo *</option>
              {[['representante_legal','Representante Legal'],['gerente','Gerente General'],['contador','Contador'],['auxiliar_contable','Auxiliar Contable'],['abogado','Abogado'],['tesoreria','Tesorería'],['rrhh','RRHH'],['revisor_fiscal','Revisor Fiscal'],['otro','Otro']].map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <input placeholder="Email" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
            <input placeholder="Teléfono" value={form.telefono} onChange={e=>setForm(f=>({...f,telefono:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"/>
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={form.es_principal} onChange={e=>setForm(f=>({...f,es_principal:e.target.checked}))}/>
            Contacto Principal
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Guardar</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}
      {contactos.map(c => (
        <div key={c.id} className="flex items-start justify-between p-3 bg-white border border-slate-100 rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{c.nombre}</span>
              {c.es_principal && <Badge className="bg-blue-100 text-blue-700">Principal</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{c.cargo_display}</p>
            <div className="flex gap-3 mt-1">
              {c.email    && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10}/>{c.email}</span>}
              {c.telefono && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={10}/>{c.telefono}</span>}
            </div>
          </div>
          <button onClick={async()=>{if(!confirm('¿Eliminar?'))return;await deleteContacto(c.id);setContactos(x=>x.filter(i=>i.id!==c.id));}} className="text-slate-300 hover:text-red-400 p-1 rounded hover:bg-red-50"><Trash2 size={13}/></button>
        </div>
      ))}
      {!contactos.length && !showForm && <p className="text-sm text-slate-400 text-center py-6">Sin contactos registrados</p>}
    </div>
  );
}

// ── DocumentosTab ─────────────────────────────────────────────────────────────

function DocumentosTab({ empresaId }) {
  const [docs, setDocs]       = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]       = useState({ tipo:'', nombre:'', fecha_documento:'', archivo:null });
  const [uploading, setUploading] = useState(false);

  useEffect(() => { getEmpresaDocumentos(empresaId).then(setDocs).catch(console.error); }, [empresaId]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!form.archivo) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('empresa', empresaId); fd.append('tipo', form.tipo);
      fd.append('nombre', form.nombre); fd.append('archivo', form.archivo);
      if (form.fecha_documento) fd.append('fecha_documento', form.fecha_documento);
      await createDocumentoCliente(fd);
      setShowForm(false);
      setForm({ tipo:'', nombre:'', fecha_documento:'', archivo:null });
      getEmpresaDocumentos(empresaId).then(setDocs);
    } catch (err) { alert(err.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{docs.length} documento(s)</span>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700"><Upload size={13}/> Subir</button>
      </div>
      {showForm && (
        <form onSubmit={handleUpload} className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} required className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
              <option value="">Tipo *</option>
              {Object.entries(DOC_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <input placeholder="Nombre *" required value={form.nombre} onChange={e=>setForm(f=>({...f,nombre:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"/>
            <input type="date" value={form.fecha_documento} onChange={e=>setForm(f=>({...f,fecha_documento:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"/>
            <input type="file" required onChange={e=>setForm(f=>({...f,archivo:e.target.files[0]}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"/>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={uploading} className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg disabled:opacity-50">{uploading?'Subiendo...':'Subir'}</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg">Cancelar</button>
          </div>
        </form>
      )}
      {docs.map(d => (
        <div key={d.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <FileText size={13} className="text-blue-400"/>
              <span className="text-sm font-medium text-slate-800">{d.nombre}</span>
              <Badge className="bg-slate-100 text-slate-600">{d.tipo_display}</Badge>
              {!d.vigente && <Badge className="bg-red-100 text-red-600">Vencido</Badge>}
            </div>
            {d.fecha_documento && <p className="text-xs text-slate-400 mt-0.5">Fecha: {d.fecha_documento}</p>}
          </div>
          <div className="flex gap-1">
            {d.archivo_url && <a href={d.archivo_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-600 p-1 rounded hover:bg-blue-50"><ExternalLink size={13}/></a>}
            <button onClick={async()=>{if(!confirm('¿Eliminar?'))return;await deleteDocumentoCliente(d.id);setDocs(x=>x.filter(i=>i.id!==d.id));}} className="text-slate-300 hover:text-red-400 p-1 rounded hover:bg-red-50"><Trash2 size={13}/></button>
          </div>
        </div>
      ))}
      {!docs.length && !showForm && <p className="text-sm text-slate-400 text-center py-6">Sin documentos</p>}
    </div>
  );
}

// ── BitacoraTab ───────────────────────────────────────────────────────────────

function BitacoraTab({ empresaId }) {
  const [entradas, setEntradas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ tipo:'', descripcion:'', fecha:'' });

  useEffect(() => { getEmpresaBitacora(empresaId).then(setEntradas).catch(console.error); }, [empresaId]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createBitacora({ ...form, empresa: empresaId });
      setShowForm(false);
      setForm({ tipo:'', descripcion:'', fecha:'' });
      getEmpresaBitacora(empresaId).then(setEntradas);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{entradas.length} registro(s)</span>
        <button onClick={()=>setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700"><Plus size={13}/> Registrar</button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select value={form.tipo} onChange={e=>setForm(f=>({...f,tipo:e.target.value}))} required className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white">
              <option value="">Tipo *</option>
              {Object.entries(BIT_L).map(([v,l])=><option key={v} value={v}>{l}</option>)}
            </select>
            <input type="datetime-local" required value={form.fecha} onChange={e=>setForm(f=>({...f,fecha:e.target.value}))} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"/>
          </div>
          <textarea placeholder="Descripción *" required rows={3} value={form.descripcion} onChange={e=>setForm(f=>({...f,descripcion:e.target.value}))} className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg resize-none"/>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Guardar</button>
            <button type="button" onClick={()=>setShowForm(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg">Cancelar</button>
          </div>
        </form>
      )}
      {entradas.map(e => (
        <div key={e.id} className="p-3 bg-white border border-slate-100 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge className={BIT_C[e.tipo]||'bg-slate-100 text-slate-600'}>{e.tipo_display}</Badge>
                <span className="text-xs text-slate-400">{new Date(e.fecha).toLocaleString('es-CO')}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1 leading-snug">{e.descripcion}</p>
              {e.empleado_nombre && <p className="text-xs text-slate-400 mt-0.5">Por: {e.empleado_nombre}</p>}
            </div>
            <button onClick={async()=>{if(!confirm('¿Eliminar?'))return;await deleteBitacora(e.id);setEntradas(x=>x.filter(i=>i.id!==e.id));}} className="text-slate-300 hover:text-red-400 p-1 ml-2 rounded hover:bg-red-50"><Trash2 size={13}/></button>
          </div>
        </div>
      ))}
      {!entradas.length && !showForm && <p className="text-sm text-slate-400 text-center py-6">Sin registros en bitácora</p>}
    </div>
  );
}

// ── EmpresaForm ───────────────────────────────────────────────────────────────

function EmpresaForm({ empresa, onSave, onCancel }) {
  const [form, setForm] = useState({
    razon_social:'', nit:'', digito_verificacion:'', tipo_empresa:'pyme', tamano_empresa:'',
    actividad_economica:'', descripcion_actividad:'', regimen_tributario:'',
    ciudad:'', departamento:'', direccion:'', telefono:'', email_principal:'', website:'',
    estado:'activo', nivel_riesgo:'bajo', fecha_inicio_relacion:'', observaciones:'',
    ...empresa,
  });
  const [saving, setSaving] = useState(false);
  const set = (k,v) => setForm(f=>({...f,[k]:v}));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p = { ...form };
      if (!p.digito_verificacion) delete p.digito_verificacion;
      if (!p.fecha_inicio_relacion) delete p.fecha_inicio_relacion;
      if (!p.website) delete p.website;
      empresa?.id ? await updateEmpresa(empresa.id, p) : await createEmpresa(p);
      onSave();
    } catch (err) { alert('Error: '+err.message); }
    finally { setSaving(false); }
  };

  const F = (label,key,type='text',req=false) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}{req&&' *'}</label>
      <input type={type} value={form[key]||''} onChange={e=>set(key,e.target.value)} required={req}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"/>
    </div>
  );
  const S = (label,key,opts,req=false) => (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}{req&&' *'}</label>
      <select value={form[key]||''} onChange={e=>set(key,e.target.value)} required={req}
        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 bg-white">
        {!req && <option value="">— Seleccionar —</option>}
        {opts.map(([v,l])=><option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {F('Razón Social','razon_social','text',true)}
        <div className="grid grid-cols-3 gap-2">
          <div className="col-span-2">{F('NIT','nit','text',true)}</div>
          {F('DV','digito_verificacion')}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {S('Tipo Empresa','tipo_empresa',[['microempresa','Microempresa'],['pyme','PYME'],['grande','Empresa Grande'],['grupo_empresarial','Grupo Empresarial']],true)}
        {S('Tamaño','tamano_empresa',[['micro','Micro (< 10)'],['pequena','Pequeña (10–50)'],['mediana','Mediana (51–200)'],['grande','Grande (> 200)']])}
      </div>
      <div className="grid grid-cols-2 gap-3">{F('Actividad Económica (CIIU)','actividad_economica')} {F('Descripción Actividad','descripcion_actividad')}</div>
      {S('Régimen Tributario','regimen_tributario',[['simplificado','Régimen Simplificado'],['comun','Régimen Común'],['gran_contribuyente','Gran Contribuyente'],['no_responsable','No Responsable de IVA'],['especial','Régimen Especial']])}
      <div className="grid grid-cols-2 gap-3">{F('Ciudad','ciudad')} {F('Departamento','departamento')}</div>
      {F('Dirección','direccion')}
      <div className="grid grid-cols-2 gap-3">{F('Teléfono','telefono')} {F('Email Principal','email_principal','email')}</div>
      {F('Sitio Web','website','url')}
      <div className="grid grid-cols-2 gap-3">
        {S('Estado','estado',[['prospecto','Prospecto'],['activo','Activo'],['inactivo','Inactivo'],['suspendido','Suspendido'],['retirado','Retirado']],true)}
        {S('Nivel de Riesgo','nivel_riesgo',[['bajo','Bajo'],['medio','Medio'],['alto','Alto'],['critico','Crítico']],true)}
      </div>
      {F('Fecha Inicio Relación','fecha_inicio_relacion','date')}
      <div>
        <label className="block text-xs font-medium text-slate-500 mb-1">Observaciones</label>
        <textarea value={form.observaciones||''} onChange={e=>set('observaciones',e.target.value)} rows={3}
          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"/>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" disabled={saving} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Guardando...' : empresa?.id ? 'Actualizar' : 'Crear Cliente'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50">Cancelar</button>
      </div>
    </form>
  );
}

// ── EmpresaPanel ──────────────────────────────────────────────────────────────

const DETAIL_TABS = [
  { id:'areas',       label:'Áreas & Servicios', icon:Briefcase  },
  { id:'contactos',   label:'Contactos',          icon:Users      },
  { id:'documentos',  label:'Documentos',         icon:FileText   },
  { id:'bitacora',    label:'Bitácora',            icon:BookOpen   },
];

function EmpresaPanel({ empresa, onClose, onUpdate }) {
  const [tab, setTab]         = useState('areas');
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">{empresa.razon_social}</h2>
            <p className="text-xs text-slate-500">NIT: {empresa.nit}{empresa.digito_verificacion?`-${empresa.digito_verificacion}`:''}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`${ESTADO_C[empresa.estado]?.bg} ${ESTADO_C[empresa.estado]?.text}`}>{empresa.estado_display}</Badge>
              <Badge className={`${RIESGO_C[empresa.nivel_riesgo]?.bg} ${RIESGO_C[empresa.nivel_riesgo]?.text} border ${RIESGO_C[empresa.nivel_riesgo]?.border}`}>{empresa.nivel_riesgo_display}</Badge>
              <Badge className="bg-slate-100 text-slate-600">{empresa.tipo_empresa_display}</Badge>
            </div>
            {!editing && (
              <div className="flex gap-3 mt-2 flex-wrap">
                {empresa.ciudad       && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10}/>{empresa.ciudad}</span>}
                {empresa.email_principal && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10}/>{empresa.email_principal}</span>}
                {empresa.telefono     && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={10}/>{empresa.telefono}</span>}
                {empresa.website      && <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline"><Globe size={10}/>Web</a>}
              </div>
            )}
          </div>
          <div className="flex gap-1 ml-3">
            <button onClick={()=>setEditing(!editing)} className="p-2 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><Pencil size={14}/></button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={14}/></button>
          </div>
        </div>
      </div>

      {editing ? (
        <div className="flex-1 overflow-y-auto p-5 bg-slate-50">
          <EmpresaForm empresa={empresa} onSave={()=>{setEditing(false);onUpdate();}} onCancel={()=>setEditing(false)}/>
        </div>
      ) : (
        <>
          <div className="flex border-b border-slate-100 bg-white overflow-x-auto">
            {DETAIL_TABS.map(t => {
              const Icon = t.icon;
              return (
                <button key={t.id} onClick={()=>setTab(t.id)}
                  className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab===t.id?'text-blue-600 border-blue-600 bg-blue-50/50':'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}>
                  <Icon size={12}/>{t.label}
                </button>
              );
            })}
          </div>
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {tab==='areas'      && <AreasTab      empresaId={empresa.id} empresaEstado={empresa.estado}/>}
            {tab==='contactos'  && <ContactosTab  empresaId={empresa.id}/>}
            {tab==='documentos' && <DocumentosTab empresaId={empresa.id}/>}
            {tab==='bitacora'   && <BitacoraTab   empresaId={empresa.id}/>}
          </div>
        </>
      )}
    </div>
  );
}

// ── Directorio ────────────────────────────────────────────────────────────────

function Directorio() {
  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = {};
      if (search)       p.search = search;
      if (filterEstado) p.estado = filterEstado;
      setEmpresas(await getEmpresas(p));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterEstado]);

  useEffect(() => { load(); }, [load]);

  const refreshSelected = async () => {
    if (!selected) return;
    try { setSelected(await getEmpresa(selected.id)); } catch {}
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('¿Eliminar cliente? Esta acción no se puede deshacer.')) return;
    await deleteEmpresa(id);
    if (selected?.id === id) setSelected(null);
    load();
  };

  return (
    <div className="flex h-full overflow-hidden">
      {/* List */}
      <div className={`flex flex-col bg-white border-r border-slate-100 transition-all ${selected||showCreate?'w-96 min-w-[22rem]':'flex-1'}`}>
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-800">Directorio</h3>
            <button onClick={()=>{setShowCreate(true);setSelected(null);}}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700">
              <Plus size={13}/> Nuevo cliente
            </button>
          </div>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {[['','Todos'],['activo','Activos'],['prospecto','Prospectos'],['inactivo','Inactivos'],['suspendido','Suspendidos']].map(([v,l])=>(
              <button key={v} onClick={()=>setFilterEstado(f=>f===v?'':v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${filterEstado===v?'bg-blue-600 text-white border-transparent':'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar razón social, NIT, ciudad..."
              className="w-full pl-8 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"/>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading
            ? <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/></div>
            : empresas.length === 0
              ? <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <Building2 size={28} className="mb-2 opacity-30"/>
                  <p className="text-sm">Sin clientes</p>
                  <button onClick={()=>setShowCreate(true)} className="mt-2 text-xs text-blue-500 hover:underline">Agregar el primero</button>
                </div>
              : empresas.map(em => (
                <div key={em.id}
                  onClick={()=>{setSelected(em);setShowCreate(false);}}
                  className={`flex items-start gap-3 px-4 py-3.5 border-b border-slate-50 cursor-pointer transition-colors hover:bg-slate-50 ${selected?.id===em.id?'bg-blue-50/60 border-l-2 border-l-blue-500 pl-[14px]':''}`}>
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {(em.razon_social||'C').charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">{em.razon_social}</p>
                    <p className="text-xs text-slate-400">NIT: {em.nit}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <Badge className={`${ESTADO_C[em.estado]?.bg} ${ESTADO_C[em.estado]?.text}`}>{em.estado_display}</Badge>
                      {em.nivel_riesgo !== 'bajo' && <Badge className={`${RIESGO_C[em.nivel_riesgo]?.bg} ${RIESGO_C[em.nivel_riesgo]?.text} border ${RIESGO_C[em.nivel_riesgo]?.border}`}>{em.nivel_riesgo_display}</Badge>}
                      {em.estado === 'activo' && em.areas_count === 0 && (
                        <Badge className="bg-amber-100 text-amber-700 border border-amber-200" title="Sin área asignada">
                          <AlertTriangle size={9} className="inline mr-0.5"/>Sin área
                        </Badge>
                      )}
                      {em.ciudad && <span className="text-[10px] text-slate-400">{em.ciudad}</span>}
                    </div>
                    {em.contacto_principal && <p className="text-[10px] text-slate-400 mt-0.5 truncate">{em.contacto_principal.nombre} · {em.contacto_principal.cargo}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0 mt-0.5">
                    <button onClick={e=>handleDelete(em.id,e)} className="p-1 text-slate-200 hover:text-red-400 rounded hover:bg-red-50"><Trash2 size={12}/></button>
                    <ChevronRight size={14} className="text-slate-300 mt-0.5"/>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* Detail */}
      {(selected||showCreate) && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {showCreate ? (
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-bold text-slate-900">Nuevo Cliente</h3>
                <button onClick={()=>setShowCreate(false)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={14}/></button>
              </div>
              <EmpresaForm onSave={()=>{setShowCreate(false);load();}} onCancel={()=>setShowCreate(false)}/>
            </div>
          ) : (
            <EmpresaPanel empresa={selected} onClose={()=>setSelected(null)} onUpdate={()=>{load();refreshSelected();}}/>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

export default function ClientesSection() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      <div className="flex items-center gap-1 px-6 py-3 bg-white border-b border-slate-100 shadow-sm z-10">
        <div className="flex items-center gap-2 mr-4">
          <Building2 size={17} className="text-blue-600"/>
          <span className="text-sm font-bold text-slate-800">CRM Clientes</span>
        </div>
        {[
          { id:'dashboard',  label:'Dashboard', icon:LayoutDashboard },
          { id:'directorio', label:'Directorio', icon:List },
        ].map(n => {
          const Icon = n.icon;
          return (
            <button key={n.id} onClick={()=>setView(n.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all ${view===n.id?'bg-blue-600 text-white shadow-sm':'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}>
              <Icon size={14}/>{n.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-hidden">
        {view==='dashboard'  && <CrmDashboard onGo={setView}/>}
        {view==='directorio' && <Directorio/>}
      </div>
    </div>
  );
}
