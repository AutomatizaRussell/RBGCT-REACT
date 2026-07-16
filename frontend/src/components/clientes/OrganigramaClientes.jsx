import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import {
  Network,
  Building2,
  Briefcase,
  Users,
  User,
  Search,
  Plus,
  Minus,
  Maximize2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Mail,
  Phone,
  X,
  Move,
  FolderTree,
} from 'lucide-react';
import { getOrganigramaClientes, getMisClientes } from '../../lib/api';

// ── Constantes de marca y estado ───────────────────────────────────────────

const BRAND = {
  area: '#001871',
  empleado: '#981d97',
  cliente: {
    activo: '#10b981',
    prospecto: '#3b82f6',
    inactivo: '#94a3b8',
    suspendido: '#f59e0b',
    retirado: '#ef4444',
  },
  servicio: { activo: '#10b981', pausado: '#f59e0b', terminado: '#94a3b8' },
};

const VISTAS = [
  { key: 'por_area', label: 'Por área', icon: Building2 },
  { key: 'por_cliente', label: 'Por cliente', icon: Briefcase },
  { key: 'por_equipo', label: 'Por equipo', icon: Users },
];

const ESTADO_CLIENTE_CLASSES = {
  activo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  prospecto: 'bg-blue-100 text-blue-700 border-blue-200',
  inactivo: 'bg-slate-100 text-slate-600 border-slate-200',
  suspendido: 'bg-amber-100 text-amber-700 border-amber-200',
  retirado: 'bg-red-100 text-red-700 border-red-200',
};

const ESTADO_SERVICIO_CLASSES = {
  activo: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  pausado: 'bg-amber-100 text-amber-700 border-amber-200',
  terminado: 'bg-slate-100 text-slate-600 border-slate-200',
};

const NIVEL_COLORES = {
  0: '#001871',
  1: '#981d97',
  2: '#00a9ce',
  3: '#00bfb3',
  4: '#ed8b00',
  5: '#64748b',
};

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.15;

// ── Helpers ─────────────────────────────────────────────────────────────────

// Mapa exacto por valor de rol del MiembroEquipo
const ROL_NIVEL = {
  gerente:     1,
  senior:      2,
  lider_equipo: 3,
  semi_senior: 3,
  revisor:     3,
  analista:    4,
  asistente:   4,
  apoyo:       4,
};

function nivelEmpleado(rol = '') {
  if (ROL_NIVEL[rol] !== undefined) return ROL_NIVEL[rol];
  // Fallback para cargos en texto libre (nombre del cargo del empleado)
  const t = rol.toUpperCase();
  if (t.includes('SOCIO')) return 0;
  if (t.includes('GERENTE')) return 1;
  // Importante: SEMI antes que SENIOR para que 'semi_senior' no caiga en nivel 2
  if (t.includes('SEMI') || t.includes('LIDER') || t.includes('LÍDER') || t.includes('REVISOR')) return 3;
  if (t.includes('SENIOR')) return 2;
  if (t.includes('ANALISTA') || t.includes('ASISTENTE') || t.includes('APOYO')) return 4;
  return 5;
}

function colorServicio(estado) {
  if (estado === 'activo') return '#10b981';
  if (estado === 'pausado') return '#f59e0b';
  return '#94a3b8';
}

function colorCliente(estado) {
  return BRAND.cliente[estado] || BRAND.cliente.inactivo;
}

function textMatch(texto, termino) {
  if (!termino || texto == null) return false;
  return String(texto).toLowerCase().includes(termino.toLowerCase());
}

function Badge({ children, className = '' }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

// ── Construcción de nodos y filtros ─────────────────────────────────────────

function buildJerarquiaEmpleados(members = [], clienteId, areaId, equipoId = null) {
  if (!members.length) return [];

  // 1. Asignar nivel y crear nodos
  const withLevel = members.map((m) => ({
    nivel: nivelEmpleado(m.rol),
    node: {
      key: `emp-${m.empleado_id}-c${clienteId}-a${areaId}-eq${equipoId || 0}-${m.rol}`,
      tipo: 'empleado',
      id: m.empleado_id,
      nombre: m.empleado_nombre,
      subtitulo: m.empleado_cargo || m.rol_display,
      color: NIVEL_COLORES[nivelEmpleado(m.rol)] || BRAND.empleado,
      icon: <User size={14} />,
      data: m,
      badge: (
        <Badge className="bg-purple-50 text-purple-700 border border-purple-100">
          {m.rol_display}
        </Badge>
      ),
      children: [],
    },
  }));

  // 2. Ordenar por nivel y agrupar niveles consecutivos (mismos niveles = paralelos)
  withLevel.sort((a, b) => a.nivel - b.nivel);

  const levelGroups = [];
  for (const { nivel, node } of withLevel) {
    const last = levelGroups[levelGroups.length - 1];
    if (last && last.nivel === nivel) {
      last.nodes.push(node);
    } else {
      levelGroups.push({ nivel, nodes: [node] });
    }
  }

  if (!levelGroups.length) return [];

  // 3. Conectar niveles: los nodos de cada grupo son hijos de los del grupo anterior.
  //    Si hay varios padres, distribuimos los hijos entre ellos (round-robin).
  for (let i = 1; i < levelGroups.length; i++) {
    const parents = levelGroups[i - 1].nodes;
    const children = levelGroups[i].nodes;
    if (parents.length === 1) {
      parents[0].children.push(...children);
    } else {
      // Repartir children en round-robin entre los padres
      children.forEach((child, idx) => {
        parents[idx % parents.length].children.push(child);
      });
    }
  }

  return levelGroups[0].nodes;
}

function buildEquipoNode(equipo, clienteId, areaId) {
  const subEquipos = equipo.sub_equipos || [];
  return {
    key: `eq-${equipo.id}-c${clienteId}`,
    tipo: 'equipo',
    id: equipo.id,
    nombre: equipo.nombre,
    subtitulo: equipo.servicio_nombre || equipo.area_nombre || 'Sin servicio asignado',
    color: colorServicio(equipo.estado),
    icon: <Users size={15} />,
    data: equipo,
    badge: (
      <Badge className={ESTADO_SERVICIO_CLASSES[equipo.estado] || ESTADO_SERVICIO_CLASSES.terminado}>
        {equipo.estado_display}
      </Badge>
    ),
    children: [
      ...buildJerarquiaEmpleados(equipo.miembros, clienteId, areaId, equipo.id),
      ...subEquipos.map((sub) => buildEquipoNode(sub, clienteId, areaId)),
    ],
  };
}

function applyFilters(data, filters, vista) {
  const areaId = filters.area == null ? null : String(filters.area);
  const clienteId = filters.cliente == null ? null : String(filters.cliente);
  const empleadoId = filters.empleado == null ? null : String(filters.empleado);
  const termino = filters.search ? String(filters.search).trim().toLowerCase() : '';

  const matchText = (item) => {
    if (!termino || !item) return false;
    return (
      textMatch(item.area_nombre, termino) ||
      textMatch(item.razon_social, termino) ||
      textMatch(item.nombre, termino) ||
      textMatch(item.empleado_nombre, termino) ||
      textMatch(item.servicio_nombre, termino) ||
      textMatch(item.cargo, termino) ||
      textMatch(item.nit, termino)
    );
  };

  if (vista === 'por_area') {
    const porArea = (data?.por_area || [])
      .filter((a) => !areaId || String(a.area_id) === areaId)
      .map((a) => ({
        ...a,
        clientes: (a.clientes || [])
          .filter((c) => !clienteId || String(c.id) === clienteId)
          .map((c) => ({
            ...c,
            equipos: (c.equipos || [])
              .map((e) => ({
                ...e,
                miembros: (e.miembros || []).filter(
                  (m) => !empleadoId || String(m.empleado_id) === empleadoId
                ),
              }))
              .filter((e) => e.miembros.length > 0 || !empleadoId),
          }))
          .filter((c) => c.equipos.length > 0 || !empleadoId),
      }));

    if (!termino) return { ...data, por_area: porArea };

    const filtered = porArea
      .map((a) => ({
        ...a,
        clientes: a.clientes
          .map((c) => ({
            ...c,
            equipos: c.equipos
              .map((e) => ({
                ...e,
                miembros: e.miembros.filter((m) => matchText(m)),
              }))
              .filter((e) => matchText(e) || e.miembros.length > 0),
          }))
          .filter((c) => matchText(c) || c.equipos.length > 0),
      }))
      .filter((a) => matchText(a) || a.clientes.length > 0);

    return { ...data, por_area: filtered };
  }

  if (vista === 'por_cliente') {
    const porCliente = (data?.por_cliente || [])
      .filter((c) => !clienteId || String(c.id) === clienteId)
      .map((c) => ({
        ...c,
        areas: (c.areas || [])
          .filter((a) => !areaId || String(a.area_id) === areaId)
          .map((a) => ({
            ...a,
            equipos: (a.equipos || [])
              .map((e) => ({
                ...e,
                miembros: (e.miembros || []).filter(
                  (m) => !empleadoId || String(m.empleado_id) === empleadoId
                ),
              }))
              .filter((e) => e.miembros.length > 0 || !empleadoId),
          }))
          .filter((a) => a.equipos.length > 0 || !empleadoId),
      }));

    if (!termino) return { ...data, por_cliente: porCliente };

    const filtered = porCliente
      .map((c) => ({
        ...c,
        areas: c.areas
          .map((a) => ({
            ...a,
            equipos: a.equipos
              .map((e) => ({
                ...e,
                miembros: e.miembros.filter((m) => matchText(m)),
              }))
              .filter((e) => matchText(e) || e.miembros.length > 0),
          }))
          .filter((a) => matchText(a) || a.equipos.length > 0),
      }))
      .filter((c) => matchText(c) || c.areas.length > 0);

    return { ...data, por_cliente: filtered };
  }

  // por_equipo
  const porEquipo = (data?.por_equipo || [])
    .filter((e) => !empleadoId || e.miembros?.some((m) => String(m.empleado_id) === empleadoId))
    .filter((e) => !areaId || String(e.area_id) === areaId)
    .filter((e) => !clienteId || String(e.cliente?.id) === clienteId);

  if (!termino) return { ...data, por_equipo: porEquipo };

  return {
    ...data,
    por_equipo: porEquipo.filter(
      (e) => matchText(e) || e.miembros.some(matchText) || matchText(e.cliente)
    ),
  };
}

function buildTreePorArea(data) {
  if (!data?.por_area?.length) return null;

  return {
    key: 'root-area',
    tipo: 'root',
    nombre: 'Cartera por área',
    color: '#001871',
    icon: <Network size={18} />,
    children: data.por_area.map((a) => ({
      key: `area-${a.area_id}`,
      tipo: 'area',
      id: a.area_id,
      nombre: a.area_nombre,
      color: BRAND.area,
      icon: <Building2 size={16} />,
      badge: (
        <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
          {a.clientes?.length || 0} clientes
        </Badge>
      ),
      children: (a.clientes || []).map((c) => ({
        key: `cli-${c.id}`,
        tipo: 'cliente',
        id: c.id,
        nombre: c.razon_social,
        subtitulo: `NIT: ${c.nit}`,
        color: colorCliente(c.estado),
        icon: <Briefcase size={15} />,
        data: c,
        badge: (
          <Badge className={ESTADO_CLIENTE_CLASSES[c.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
            {c.estado_display}
          </Badge>
        ),
        children: (c.equipos || []).map((e) => buildEquipoNode(e, c.id, a.area_id)),
      })),
    })),
  };
}

function buildTreePorCliente(data) {
  if (!data?.por_cliente?.length) return null;
  return {
    key: 'root-cliente',
    tipo: 'root',
    nombre: 'Cartera por cliente',
    color: '#001871',
    icon: <Network size={18} />,
    children: data.por_cliente.map((c) => ({
      key: `cli-${c.id}`,
      tipo: 'cliente',
      id: c.id,
      nombre: c.razon_social,
      subtitulo: `NIT: ${c.nit}`,
      color: colorCliente(c.estado),
      icon: <Briefcase size={15} />,
      data: c,
      badge: (
        <Badge className={ESTADO_CLIENTE_CLASSES[c.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
          {c.estado_display}
        </Badge>
      ),
      children: (c.areas || []).map((a) => ({
        key: `area-${a.area_id}-c${c.id}`,
        tipo: 'area',
        id: a.area_id,
        nombre: a.area_nombre,
        color: BRAND.area,
        icon: <Building2 size={16} />,
        badge: (
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
            {a.equipos?.length || 0} equipos
          </Badge>
        ),
        children: (a.equipos || []).map((e) => buildEquipoNode(e, c.id, a.area_id)),
      })),
    })),
  };
}

function buildTreePorEquipo(data) {
  if (!data?.por_equipo?.length) return null;
  return {
    key: 'root-equipo',
    tipo: 'root',
    nombre: 'Cartera por equipo',
    color: '#001871',
    icon: <Network size={18} />,
    children: data.por_equipo.map((e) => buildEquipoNode(e, e.cliente?.id, e.area_id)),
  };
}

// ── Sub-componentes visuales ───────────────────────────────────────────────

function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-white/90 backdrop-blur rounded-xl shadow-sm border border-slate-200 p-1 z-20">
      <button
        type="button"
        onClick={onZoomIn}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-[#001871]"
        title="Acercar"
        aria-label="Acercar"
      >
        <Plus size={16} />
      </button>
      <div className="px-2 py-1 text-[10px] font-medium text-slate-500 text-center min-w-[2.5rem]">
        {Math.round(zoom * 100)}%
      </div>
      <button
        type="button"
        onClick={onZoomOut}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-[#001871]"
        title="Alejar"
        aria-label="Alejar"
      >
        <Minus size={16} />
      </button>
      <button
        type="button"
        onClick={onReset}
        className="p-2 rounded-lg hover:bg-slate-100 text-slate-600 hover:text-[#001871]"
        title="Restablecer vista"
        aria-label="Restablecer vista"
      >
        <Maximize2 size={16} />
      </button>
    </div>
  );
}

function SearchWithDropdown({ value, onChange, results, onSelect }) {
  const [open, setOpen] = useState(false);
  const blurTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  return (
    <div className="relative w-full max-w-md">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-[#001871] focus-within:ring-1 focus-within:ring-[#001871]/20">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder="Buscar cliente, área o empleado..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimeoutRef.current = setTimeout(() => setOpen(false), 200);
          }}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        />
      </div>
      {open && value && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
          {results.slice(0, 8).map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 text-left"
            >
              {r.icon}
              <div>
                <p className="text-xs font-medium text-slate-700">{r.nombre}</p>
                <p className="text-[10px] text-slate-400">{r.subtitulo || r.tipo}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Filters({ areas, clientes, empleados, filtros, onChange }) {
  const selectClass =
    'appearance-none bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-[#001871]/20 focus:border-[#001871] cursor-pointer min-w-[10rem]';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        className={selectClass}
        value={filtros.area || ''}
        onChange={(e) => onChange('area', e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todas las áreas</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>{a.nombre}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filtros.cliente || ''}
        onChange={(e) => onChange('cliente', e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos los clientes</option>
        {clientes.map((c) => (
          <option key={c.id} value={c.id}>{c.nombre}</option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filtros.empleado || ''}
        onChange={(e) => onChange('empleado', e.target.value ? Number(e.target.value) : null)}
      >
        <option value="">Todos los empleados</option>
        {empleados.map((e) => (
          <option key={e.id} value={e.id}>{e.nombre}</option>
        ))}
      </select>

      {(filtros.area || filtros.cliente || filtros.empleado) && (
        <button
          type="button"
          onClick={() => onChange('reset')}
          className="text-[11px] font-medium text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          Limpiar filtros
        </button>
      )}
    </div>
  );
}

function Legend() {
  const items = [
    { label: 'Área', color: BRAND.area },
    { label: 'Cliente activo', color: BRAND.cliente.activo },
    { label: 'Cliente prospecto', color: BRAND.cliente.prospecto },
    { label: 'Contrato activo', color: '#10b981' },
    { label: 'Empleado', color: BRAND.empleado },
  ];

  return (
    <div className="absolute top-4 left-4 flex flex-wrap items-center gap-3 bg-white/80 backdrop-blur rounded-full px-3 py-1.5 shadow-sm border border-slate-100 z-10">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
          <span className="text-[10px] text-slate-600">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function Tooltip({ node, mousePos }) {
  if (!node) return null;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;

  return (
    <div
      className="fixed z-50 w-60 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden pointer-events-none"
      style={{
        left: Math.min(Math.max(mousePos.x + 16, 8), vw - 256 - 8),
        top: Math.min(Math.max(mousePos.y - 10, 8), vh - 200 - 8),
      }}
    >
      <div className="px-4 py-3 flex items-center gap-3" style={{ background: node.color || '#64748b' }}>
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white"
          style={{ background: node.color || '#64748b' }}
        >
          {node.icon}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-sm text-white truncate">{node.nombre}</p>
          <p className="text-xs text-white/70 truncate">{node.subtitulo || node.tipo}</p>
        </div>
      </div>
      <div className="p-3 space-y-1.5">
        {node.tipo === 'cliente' && node.data?.estado_display && (
          <div>
            <Badge className={ESTADO_CLIENTE_CLASSES[node.data.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
              {node.data.estado_display}
            </Badge>
          </div>
        )}
        {node.tipo === 'empleado' && node.data?.area_nombre && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Building2 size={12} className="text-slate-400" />
            <span>{node.data.area_nombre}</span>
          </div>
        )}
        {node.data?.telefono && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Phone size={12} className="text-slate-400" />
            <span>{node.data.telefono}</span>
          </div>
        )}
        {node.data?.email_principal && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <Mail size={12} className="text-slate-400" />
            <span>{node.data.email_principal}</span>
          </div>
        )}
        {node.data?.ciudad && (
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <MapPin size={12} className="text-slate-400" />
            <span>{node.data.ciudad}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Paneles laterales (drawers) ────────────────────────────────────────────

function EmpleadoDrawer({ emp, onClose }) {
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getMisClientes(emp.empleado_id)
      .then((res) => {
        if (!cancelled) setClientes(res.clientes || []);
      })
      .catch((err) => {
        if (!cancelled) console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [emp.empleado_id]);

  const servicios = useMemo(() => {
    const map = new Map();
    clientes.forEach(({ contratos = [] }) => {
      contratos.forEach((c) => {
        if (c.servicio_nombre && !map.has(c.servicio_nombre)) {
          map.set(c.servicio_nombre, c.servicio_nombre);
        }
      });
    });
    return Array.from(map.values());
  }, [clientes]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl border-l border-slate-200 slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#981d97]/10 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: BRAND.empleado }}
          >
            {emp.empleado_nombre?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{emp.empleado_nombre}</h3>
            <p className="text-xs text-slate-500 truncate">{emp.cargo} · {emp.area_nombre || 'Sin área'}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {servicios.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Servicios asociados</p>
                <div className="flex flex-wrap gap-1.5">
                  {servicios.slice(0, 8).map((s) => (
                    <Badge key={s} className="bg-blue-50 text-blue-700 border border-blue-100 truncate max-w-[12rem]">
                      {s}
                    </Badge>
                  ))}
                  {servicios.length > 8 && (
                    <Badge className="bg-slate-100 text-slate-500">+{servicios.length - 8}</Badge>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Clientes asignados ({clientes.length})
            </p>

            {clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Building2 size={28} className="mb-2 opacity-30" />
                <p className="text-sm">Sin clientes asignados</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {clientes.map(({ empresa, contratos }, idx) => (
                  <div
                    key={empresa.id}
                    className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm hover:shadow-md transition-all fade-in-up"
                    style={{ animationDelay: `${idx * 50}ms` }}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-slate-800 truncate">{empresa.razon_social}</p>
                        <p className="text-[11px] text-slate-400 truncate">NIT: {empresa.nit}</p>
                      </div>
                      <Badge className={ESTADO_CLIENTE_CLASSES[empresa.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
                        {empresa.estado_display}
                      </Badge>
                    </div>
                    <div className="space-y-1.5">
                      {contratos.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between text-xs bg-slate-50 rounded-lg px-2 py-1.5 border border-slate-100"
                        >
                          <span className="text-slate-700 truncate">{c.nombre}</span>
                          <Badge className="bg-purple-50 text-purple-700 border border-purple-100">
                            {c.rol_display || c.rol}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ClienteDrawer({ node, onClose }) {
  const cliente = node.data;
  const areas = cliente.areas || [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl border-l border-slate-200 slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#10b981]/10 to-transparent">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 truncate">{cliente.razon_social}</h3>
          <p className="text-xs text-slate-500">NIT: {cliente.nit}</p>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={ESTADO_CLIENTE_CLASSES[cliente.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
            {cliente.estado_display}
          </Badge>
          {areas.length > 0 && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
              {areas.length} área{areas.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        <div className="space-y-1">
          {cliente.ciudad && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <MapPin size={12} /> {cliente.ciudad}
            </p>
          )}
          {cliente.email_principal && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Mail size={12} /> {cliente.email_principal}
            </p>
          )}
          {cliente.telefono && (
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <Phone size={12} /> {cliente.telefono}
            </p>
          )}
        </div>

        {areas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contratos por área</p>
            {areas.map((a) => (
              <div key={a.area_id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                <p className="text-xs font-bold text-slate-700 mb-2">{a.area_nombre}</p>
                <div className="flex flex-wrap gap-1.5">
                  {a.empleados?.map((e) => (
                    <Badge key={e.empleado_id} className="bg-purple-50 text-purple-700 border border-purple-100">
                      {e.empleado_nombre} · {e.rol_display}
                    </Badge>
                  ))}
                  {!a.empleados?.length && (
                    <span className="text-[11px] text-slate-400">Sin contrato asignado</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EquipoDrawer({ node, onClose }) {
  const equipo = node.data;
  const miembros = equipo.miembros || [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white/95 backdrop-blur-xl border-l border-slate-200 slide-in-right">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-[#00a9ce]/10 to-transparent">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ background: colorServicio(equipo.estado) }}
          >
            <Users size={18} />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 truncate">{equipo.nombre}</h3>
            <p className="text-xs text-slate-500 truncate">
              {equipo.servicio_nombre || equipo.area_nombre || 'Sin servicio/área'}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge className={ESTADO_SERVICIO_CLASSES[equipo.estado] || ESTADO_SERVICIO_CLASSES.terminado}>
            {equipo.estado_display}
          </Badge>
          {miembros.length > 0 && (
            <Badge className="bg-blue-50 text-blue-700 border border-blue-100">
              {miembros.length} miembro{miembros.length === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        {equipo.descripcion && (
          <p className="text-xs text-slate-600 leading-relaxed">{equipo.descripcion}</p>
        )}

        {miembros.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Miembros del contrato</p>
            <div className="grid grid-cols-1 gap-2">
              {miembros.map((m, idx) => (
                <div
                  key={m.empleado_id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3 fade-in-up"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: NIVEL_COLORES[nivelEmpleado(m.rol)] || BRAND.empleado }}
                  >
                    {m.empleado_nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{m.empleado_nombre}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.cargo} · {m.rol_display}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailDrawer({ node, onClose }) {
  if (!node) return null;
  if (node.tipo === 'empleado') return <EmpleadoDrawer emp={node.data} onClose={onClose} />;
  if (node.tipo === 'cliente') return <ClienteDrawer node={node} onClose={onClose} />;
  if (node.tipo === 'equipo') return <EquipoDrawer node={node} onClose={onClose} />;
  return null;
}

// ── Renderizado del árbol (sin librerías externas) ─────────────────────────

function TreeNodeCard({ node, expandedMap, onToggle, onNodeClick, onHover, onHoverEnd, searchTerm }) {
  const expanded = expandedMap[node.key] !== false;
  const hasChildren = node.children?.length > 0;
  const highlighted = searchTerm && textMatch(node.nombre, searchTerm);
  const initial = node.nombre?.charAt(0)?.toUpperCase();

  if (node.tipo === 'root') {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#001871] to-[#00a9ce] text-white font-bold text-sm shadow-lg">
        {node.icon}
        <span>{node.nombre}</span>
      </div>
    );
  }

  return (
    <div
      className={`inline-flex flex-col items-center gap-2 ${highlighted ? 'ring-2 ring-[#00a9ce] ring-offset-2 rounded-2xl' : ''}`}
      onClick={() => onNodeClick(node)}
      onMouseMove={(e) => onHover(node, { x: e.clientX, y: e.clientY })}
      onMouseLeave={onHoverEnd}
    >
      <div
        className="relative flex items-center gap-3 min-w-[14rem] max-w-[18rem] text-left rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
        style={{ '--oc-color': node.color }}
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: node.color }}
        >
          {node.tipo === 'empleado' ? (
            <span className="text-sm font-bold">{initial}</span>
          ) : (
            node.icon
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold text-slate-800 truncate">{node.nombre}</p>
          {node.subtitulo && (
            <p className="text-[10px] text-slate-500 truncate">{node.subtitulo}</p>
          )}
          {node.badge && <div className="mt-1">{node.badge}</div>}
        </div>
        {hasChildren && (
          <button
            type="button"
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(node.key);
            }}
            title={expanded ? 'Contraer' : 'Expandir'}
          >
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>
    </div>
  );
}

function TreeRenderer({ node, renderProps }) {
  if (!node) return null;
  const expanded = renderProps.expandedMap[node.key] !== false;
  const hasChildren = node.children?.length > 0;
  const label = <TreeNodeCard node={node} {...renderProps} />;

  return (
    <div className="tree-node-wrapper">
      <div className="tree-label">{label}</div>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children.map((child) => (
            <TreeRenderer key={child.key} node={child} renderProps={renderProps} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vistas de lista (cliente/equipo) ───────────────────────────────────────

function MiembroCard({ m, onClick }) {
  return (
    <div
      onClick={() => onClick(m)}
      className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white px-3 py-2 shadow-sm hover:shadow-md transition-all cursor-pointer"
    >
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
        style={{ background: NIVEL_COLORES[nivelEmpleado(m.rol)] || BRAND.empleado }}
      >
        {m.empleado_nombre?.charAt(0)?.toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-800 truncate">{m.empleado_nombre}</p>
        <p className="text-[10px] text-slate-500 truncate">{m.cargo} · {m.rol_display}</p>
      </div>
    </div>
  );
}

function EquipoLista({ equipo, onNodeClick, prefix }) {
  const key = `${prefix}-${equipo.id}`;
  return (
    <div key={key} className="ml-6 pl-4 border-l-2 border-slate-200 space-y-2">
      <div
        onClick={() => onNodeClick({ ...equipo, tipo: 'equipo', key, data: equipo })}
        className="flex items-center gap-2 rounded-lg bg-white border border-slate-200 px-3 py-2 shadow-sm hover:border-[#00a9ce]/50 cursor-pointer"
      >
        <div className="w-8 h-8 rounded-md bg-[#001871]/10 text-[#001871] flex items-center justify-center">
          <Users size={14} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#001871] truncate">{equipo.nombre}</p>
          <p className="text-[10px] text-slate-500 truncate">{equipo.servicio_nombre || equipo.area_nombre}</p>
        </div>
        <Badge className={ESTADO_SERVICIO_CLASSES[equipo.estado] || ESTADO_SERVICIO_CLASSES.terminado}>
          {equipo.estado_display}
        </Badge>
      </div>
      {equipo.miembros?.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {equipo.miembros.map((m, i) => (
            <MiembroCard key={`${key}-m-${m.empleado_id || i}`} m={m} onClick={() => onNodeClick({ ...m, tipo: 'empleado', data: m })} />
          ))}
        </div>
      )}
    </div>
  );
}

function VistaPorCliente({ data, onNodeClick }) {
  return (
    <div className="space-y-4">
      {data.por_cliente.map((c) => (
        <div key={`c-${c.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            onClick={() => onNodeClick({ tipo: 'cliente', data: c, key: `cli-${c.id}` })}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#001871] to-[#00a9ce] text-white flex items-center justify-center">
              <Briefcase size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#001871] truncate">{c.razon_social}</p>
              <p className="text-[11px] text-slate-500 truncate">NIT {c.nit} · {c.ciudad}</p>
            </div>
            <Badge className={ESTADO_CLIENTE_CLASSES[c.estado] || ESTADO_CLIENTE_CLASSES.inactivo}>
              {c.estado_display}
            </Badge>
          </div>
          {c.areas?.length > 0 && (
            <div className="mt-3 ml-4 pl-4 border-l-2 border-slate-200 space-y-3">
              {c.areas.map((a) => (
                <div key={`a-${a.area_id}-c${c.id}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 size={14} className="text-[#001871]" />
                    <p className="text-xs font-bold text-slate-700">{a.area_nombre}</p>
                  </div>
                  {a.equipos?.map((e) => (
                    <EquipoLista key={e.id} equipo={e} onNodeClick={onNodeClick} prefix={`c${c.id}-a${a.area_id}`} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function VistaPorEquipo({ data, onNodeClick }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {data.por_equipo.map((eq) => (
        <div key={`e-${eq.id}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div
            onClick={() => onNodeClick({ tipo: 'equipo', data: eq, key: `eq-${eq.id}` })}
            className="flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-lg bg-[#001871]/10 text-[#001871] flex items-center justify-center">
                <Users size={18} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#001871] truncate">{eq.nombre}</p>
                <p className="text-[11px] text-slate-500 truncate">{eq.area_nombre} · {eq.servicio_nombre}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-semibold text-slate-700 truncate">{eq.cliente?.razon_social}</p>
              <p className="text-[10px] text-slate-400">NIT {eq.cliente?.nit}</p>
            </div>
          </div>
          {eq.miembros?.length > 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {eq.miembros.map((m, i) => (
                <MiembroCard key={`e-${eq.id}-m-${m.empleado_id || i}`} m={m} onClick={() => onNodeClick({ tipo: 'empleado', data: m })} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────

export default function OrganigramaClientes({ areaId = null }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [vista, setVista] = useState('por_area');
  const [search, setSearch] = useState('');
  const [hoverNode, setHoverNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [expandedMap, setExpandedMap] = useState({});
  const [filterArea, setFilterArea] = useState(areaId ? String(areaId) : null);
  const [filterCliente, setFilterCliente] = useState(null);
  const [filterEmpleado, setFilterEmpleado] = useState(null);
  const canvasRef = useRef(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (areaId) params.area = areaId;
      const res = await getOrganigramaClientes(params);
      setData(res);
    } catch (err) {
      console.error('[OrganigramaClientes] error:', err);
    } finally {
      setLoading(false);
    }
  }, [areaId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (data && !loading) {
      const t = setTimeout(() => setReady(true), 100);
      return () => clearTimeout(t);
    }
  }, [data, loading]);

  // Reset zoom/pan cuando cambia la vista
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [vista]);

  const filters = useMemo(
    () => ({ area: filterArea, cliente: filterCliente, empleado: filterEmpleado, search }),
    [filterArea, filterCliente, filterEmpleado, search]
  );

  const filteredData = useMemo(() => (data ? applyFilters(data, filters, vista) : null), [data, filters, vista]);

  const options = useMemo(() => {
    if (!data) return { areas: [], clientes: [], empleados: [] };
    const map = new Map();
    (data.por_equipo || []).forEach((eq) => {
      (eq.miembros || []).forEach((m) => {
        if (!map.has(m.empleado_id)) {
          map.set(m.empleado_id, { id: m.empleado_id, nombre: m.empleado_nombre });
        }
      });
    });
    return {
      areas: data.por_area.map((a) => ({ id: a.area_id, nombre: a.area_nombre })),
      clientes: data.por_cliente.map((c) => ({ id: c.id, nombre: c.razon_social })),
      empleados: Array.from(map.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    };
  }, [data]);

  const tree = useMemo(() => {
    if (!filteredData) return null;
    if (vista === 'por_area') return buildTreePorArea(filteredData);
    if (vista === 'por_cliente') return buildTreePorCliente(filteredData);
    if (vista === 'por_equipo') return buildTreePorEquipo(filteredData);
    return null;
  }, [filteredData, vista]);

  const flatNodes = useMemo(() => {
    const list = [];
    const walk = (n) => {
      if (!n) return;
      list.push(n);
      n.children?.forEach(walk);
    };
    walk(tree);
    return list;
  }, [tree]);

  const searchResults = useMemo(() => {
    if (!search) return [];
    return flatNodes.filter(
      (n) =>
        n.tipo !== 'root' &&
        n.tipo !== 'servicio' &&
        (textMatch(n.nombre, search) || textMatch(n.subtitulo, search))
    );
  }, [search, flatNodes]);

  const expandibleKeys = useMemo(
    () => flatNodes.filter((n) => n.children?.length > 0).map((n) => n.key),
    [flatNodes]
  );

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, ZOOM_MAX));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, ZOOM_MIN));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z + delta)));
  }, []);

  const handleMouseDown = useCallback(
    (e) => {
      if (e.button === 0) {
        setDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      }
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e) => {
      setMousePos({ x: e.clientX, y: e.clientY });
      if (dragging) {
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      }
    },
    [dragging, dragStart]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleNodeClick = useCallback((node) => {
    if (node.tipo === 'empleado' || node.tipo === 'cliente' || node.tipo === 'equipo') {
      setSelectedNode(node);
    }
  }, []);

  const handleToggle = useCallback((key) => {
    setExpandedMap((prev) => ({ ...prev, [key]: prev[key] === false }));
  }, []);

  const expandAll = useCallback(() => {
    const next = {};
    expandibleKeys.forEach((k) => {
      next[k] = true;
    });
    setExpandedMap(next);
  }, [expandibleKeys]);

  const collapseAll = useCallback(() => {
    const next = {};
    expandibleKeys.forEach((k) => {
      next[k] = false;
    });
    setExpandedMap(next);
  }, [expandibleKeys]);

  const handleFilterChange = useCallback(
    (campo, valor) => {
      if (campo === 'reset') {
        setFilterArea(areaId ? String(areaId) : null);
        setFilterCliente(null);
        setFilterEmpleado(null);
      } else if (campo === 'area') {
        setFilterArea(valor);
      } else if (campo === 'cliente') {
        setFilterCliente(valor);
      } else if (campo === 'empleado') {
        setFilterEmpleado(valor);
      }
    },
    [areaId]
  );

  const renderProps = useMemo(
    () => ({
      expandedMap,
      onToggle: handleToggle,
      onNodeClick: handleNodeClick,
      onHover: (node, pos) => {
        setHoverNode(node);
        if (pos) setMousePos(pos);
      },
      onHoverEnd: () => setHoverNode(null),
      searchTerm: search,
    }),
    [expandedMap, handleToggle, handleNodeClick, search]
  );

  const hasTree = tree && tree.children?.length > 0;
  const hasList =
    (vista === 'por_area' && filteredData?.por_area?.length > 0) ||
    (vista === 'por_cliente' && filteredData?.por_cliente?.length > 0) ||
    (vista === 'por_equipo' && filteredData?.por_equipo?.length > 0);

  const isCanvas = vista === 'por_area' || vista === 'por_cliente';

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <style>{`
        .slide-in-right { animation: rb-slide-in-right 280ms ease-out both; }
        .fade-in-up { animation: rb-fade-in-up 300ms ease-out both; }
        @keyframes rb-slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes rb-fade-in-up {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        .tree-node-wrapper {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding-top: 1rem;
        }
        .tree-label { position: relative; z-index: 1; }
        .tree-children {
          display: flex;
          justify-content: center;
          padding-top: 1.25rem;
          position: relative;
        }
        .tree-children::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 1.25rem;
          border-left: 2px solid #cbd5e1;
          transform: translateX(-50%);
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper {
          padding: 0 0.75rem;
          margin-top: 0;
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1rem;
          border-top: 2px solid #cbd5e1;
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper:first-child::before {
          left: 50%;
          width: 50%;
          border-top-left-radius: 8px;
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper:last-child::before {
          width: 50%;
          border-top-right-radius: 8px;
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper:only-child::before {
          display: none;
        }
        .tree-node-wrapper > .tree-children > .tree-node-wrapper::after {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          width: 0;
          height: 1rem;
          border-left: 2px solid #cbd5e1;
          transform: translateX(-50%);
        }
      `}</style>

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#001871] to-[#00a9ce] flex items-center justify-center text-white shadow-lg">
            <Network size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#001871]">Organigrama de clientes</h2>
            <p className="text-[11px] text-slate-500">Vista interactiva de la cartera</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-wrap">
          {/* Selector de vistas */}
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-0.5">
            {VISTAS.map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setVista(v.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold rounded-md transition-colors ${
                    vista === v.key
                      ? 'bg-[#001871] text-white'
                      : 'text-slate-600 hover:text-[#001871] hover:bg-white'
                  }`}
                >
                  <Icon size={13} /> {v.label}
                </button>
              );
            })}
          </div>

          {hasTree && isCanvas && (
            <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
              <button
                type="button"
                onClick={expandAll}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-[#001871] hover:bg-white rounded-md transition-colors"
                title="Expandir todo"
              >
                Expandir
              </button>
              <button
                type="button"
                onClick={collapseAll}
                className="px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-[#001871] hover:bg-white rounded-md transition-colors"
                title="Contraer todo"
              >
                Contraer
              </button>
            </div>
          )}

          <SearchWithDropdown
            value={search}
            onChange={setSearch}
            results={searchResults}
            onSelect={(n) => {
              setSearch(n.nombre);
              setSelectedNode(n);
            }}
          />
        </div>
      </div>

      {/* Filtros */}
      {data && !areaId && (
        <div className="flex items-center gap-3 px-5 py-2.5 bg-white border-b border-slate-100 z-10 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filtrar por:</span>
          <Filters
            areas={options.areas}
            clientes={options.clientes}
            empleados={options.empleados}
            filtros={filters}
            onChange={handleFilterChange}
          />
        </div>
      )}

      {/* Contenido */}
      <div className="flex flex-1 overflow-hidden">
        <div
          ref={canvasRef}
          className={`flex-1 relative overflow-hidden bg-[#f8fafc] ${isCanvas ? 'cursor-grab active:cursor-grabbing' : 'overflow-y-auto'}`}
          onWheel={isCanvas ? handleWheel : undefined}
          onMouseDown={isCanvas ? handleMouseDown : undefined}
          onMouseMove={isCanvas ? handleMouseMove : undefined}
          onMouseUp={isCanvas ? handleMouseUp : undefined}
          onMouseLeave={isCanvas ? handleMouseUp : undefined}
        >
          {isCanvas && (
            <>
              <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full text-[10px] text-slate-400 shadow-sm z-10">
                <Move size={12} />
                Arrastra para navegar · Rueda para zoom
              </div>
              <ZoomControls zoom={zoom} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} onReset={handleReset} />
              <Legend />
            </>
          )}

          <div
            className={`min-h-full ${isCanvas ? 'absolute inset-0 flex items-start justify-center pt-16 pb-20 px-10 transition-opacity duration-500' : 'p-5'}`}
            style={
              isCanvas
                ? {
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: 'top center',
                    transition: dragging ? 'none' : 'transform 0.2s ease-out, opacity 0.5s ease',
                    opacity: ready ? 1 : 0,
                  }
                : undefined
            }
          >
            {loading && (
              <div className="flex flex-col items-center gap-3 py-20">
                <div className="w-10 h-10 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-slate-400">Cargando organigrama…</p>
              </div>
            )}

            {!loading && !hasList && (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <Network size={40} className="mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {filterArea || filterCliente || filterEmpleado || search
                    ? 'No hay resultados con los filtros seleccionados'
                    : 'No hay datos para el organigrama'}
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                  {filterArea || filterCliente || filterEmpleado || search
                    ? 'Prueba ajustando o limpiando los filtros superiores.'
                    : 'Aún no hay clientes asignados a áreas o contratos. Asigna áreas y contratos desde el directorio.'}
                </p>
              </div>
            )}

            {!loading && hasList && vista === 'por_area' && (
              <div className="tree-canvas">
                <TreeRenderer node={tree} renderProps={renderProps} />
              </div>
            )}

            {!loading && hasList && vista === 'por_cliente' && (
              <VistaPorCliente data={filteredData} onNodeClick={handleNodeClick} />
            )}

            {!loading && hasList && vista === 'por_equipo' && (
              <VistaPorEquipo data={filteredData} onNodeClick={handleNodeClick} />
            )}
          </div>

          <Tooltip node={hoverNode} mousePos={mousePos} />
        </div>

        {selectedNode && ['empleado', 'cliente', 'equipo'].includes(selectedNode.tipo) && (
          <div className="w-80 shrink-0 border-l border-slate-200 bg-white shadow-lg z-20">
            <DetailDrawer node={selectedNode} onClose={() => setSelectedNode(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
