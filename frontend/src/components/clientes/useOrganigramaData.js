import { useState, useEffect, useMemo, useRef } from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';

const elk = new ELK();

export const NODE_TYPES = {
  ROOT: 'root',
  AREA: 'area',
  CLIENTE: 'cliente',
  EQUIPO: 'equipo',
  EMPLEADO: 'empleado',
};

export const VIEW_MODES = {
  AREA: 'area',
  CLIENTE: 'cliente',
  EQUIPO: 'equipo',
  COMPLETE: 'complete',
};

const NODE_SIZES = {
  [NODE_TYPES.ROOT]: { width: 220, height: 56 },
  [NODE_TYPES.AREA]: { width: 200, height: 68 },
  [NODE_TYPES.CLIENTE]: { width: 230, height: 78 },
  [NODE_TYPES.EQUIPO]: { width: 240, height: 68 },
  [NODE_TYPES.EMPLEADO]: { width: 190, height: 60 },
};

const LEVEL_HEIGHT = 110;
const SIBLING_GAP = 40;

const ESTADO_CLIENTE = {
  activo: 'activo',
  prospecto: 'prospecto',
  inactivo: 'inactivo',
  suspendido: 'suspendido',
  retirado: 'retirado',
};

const ROL_NIVEL = {
  gerente: 1,
  senior: 2,
  lider_equipo: 3,
  semi_senior: 3,
  revisor: 3,
  analista: 4,
  asistente: 4,
  apoyo: 4,
};

export function nivelEmpleado(rol = '') {
  if (ROL_NIVEL[rol] !== undefined) return ROL_NIVEL[rol];
  return _nivelPorTexto(rol);
}

function _nivelPorTexto(texto = '') {
  const t = String(texto).toUpperCase();
  if (t.includes('SOCIO')) return 0;
  if (t.includes('GERENTE')) return 1;
  if (t.includes('SEMI') || t.includes('LIDER') || t.includes('LÍDER') || t.includes('REVISOR')) return 3;
  if (t.includes('SENIOR')) return 2;
  if (t.includes('ANALISTA') || t.includes('ASISTENTE') || t.includes('APOYO')) return 4;
  return 5;
}

function nivelEmpleadoReal(m) {
  if (!m) return 5;
  const rol = m.rol || '';
  const cargo = m.cargo || '';
  const nivelRol = nivelEmpleado(rol);
  const nivelCargo = _nivelPorTexto(cargo);
  return Math.min(nivelRol, nivelCargo);
}

function badgeEmpleado(m) {
  const rolDisplay = m.rol_display || m.rol || '';
  if (rolDisplay.toLowerCase() !== 'apoyo') return rolDisplay;
  return m.cargo || rolDisplay;
}

export function colorCliente(estado) {
  const map = {
    activo: '#10b981',
    prospecto: '#3b82f6',
    inactivo: '#94a3b8',
    suspendido: '#f59e0b',
    retirado: '#ef4444',
  };
  return map[estado] || map.inactivo;
}

export function colorServicio(estado) {
  if (estado === 'activo') return '#10b981';
  if (estado === 'pausado') return '#f59e0b';
  return '#94a3b8';
}

export const NIVEL_COLORES = {
  0: '#001871',
  1: '#981d97',
  2: '#00a9ce',
  3: '#00bfb3',
  4: '#ed8b00',
  5: '#64748b',
};

function textMatch(texto, termino) {
  if (!termino || texto == null) return false;
  return String(texto).toLowerCase().includes(String(termino).toLowerCase());
}

function uniqueId(parts) {
  return parts.filter(Boolean).join('-');
}

function createGraphNode(type, id, label, data, options = {}) {
  const meta = options.meta || {};
  return {
    id,
    type,
    label,
    subtitulo: options.subtitulo || '',
    badge: options.badge || null,
    color: options.color || '#64748b',
    icon: options.icon || null,
    data: data || {},
    children: meta.children ?? options.children ?? [],
    ...meta,
  };
}

function buildEmpleadoNode(m, equipoId, clienteId, areaId) {
  const empId = uniqueId(['emp', m.empleado_id, 'eq', equipoId, 'cli', clienteId, 'a', areaId]);
  const nivel = nivelEmpleadoReal(m);
  return createGraphNode(
    NODE_TYPES.EMPLEADO,
    empId,
    m.empleado_nombre || `Empleado #${m.empleado_id}`,
    { ...m, cliente_id: clienteId, area_id: areaId, equipo_id: equipoId },
    {
      subtitulo: m.cargo || m.rol_display || m.rol,
      color: NIVEL_COLORES[nivel] || '#64748b',
      badge: badgeEmpleado(m),
      meta: { empleado_id: m.empleado_id },
    }
  );
}

function buildEmpleadoCascada(miembros, equipoId, clienteId, areaId) {
  if (!miembros || miembros.length === 0) return [];

  const porNivel = {};
  miembros.forEach((m) => {
    const nivel = nivelEmpleadoReal(m);
    if (!porNivel[nivel]) porNivel[nivel] = [];
    porNivel[nivel].push(m);
  });

  const nivelesOrdenados = Object.keys(porNivel).map(Number).sort((a, b) => a - b);

  const topLevelNodes = [];
  let previousLevelNodes = [];

  nivelesOrdenados.forEach((nivel) => {
    const currentLevelNodes = porNivel[nivel].map((m) =>
      buildEmpleadoNode(m, equipoId, clienteId, areaId)
    );

    if (previousLevelNodes.length === 0) {
      topLevelNodes.push(...currentLevelNodes);
    } else {
      // Los empleados de menor rango se cuelgan del último empleado del rango inmediato superior.
      const parent = previousLevelNodes[previousLevelNodes.length - 1];
      parent.children.push(...currentLevelNodes);
    }

    previousLevelNodes = currentLevelNodes;
  });

  return topLevelNodes;
}

function buildEquipoChildren(equipo, clienteId, areaId) {
  const children = buildEmpleadoCascada(equipo.miembros || [], equipo.id, clienteId, areaId);

  const subEquipos = equipo.sub_equipos || [];
  subEquipos.forEach((sub) => {
    const subId = uniqueId(['eq', sub.id, 'parent', equipo.id, 'cli', clienteId, 'a', areaId]);
    children.push(
      createGraphNode(
        NODE_TYPES.EQUIPO,
        subId,
        sub.nombre || 'Sub-equipo',
        { ...sub, cliente_id: clienteId, area_id: areaId, equipo_padre_id: equipo.id },
        {
          subtitulo: sub.servicio_nombre || sub.area_nombre || 'Sub-equipo',
          color: colorServicio(sub.estado),
          badge: sub.estado_display || sub.estado,
        }
      )
    );
  });

  return children;
}

function buildEquipoNode(equipo, clienteId, areaId, childrenOnly = false) {
  const id = uniqueId(['eq', equipo.id, 'cli', clienteId, 'a', areaId]);
  const children = buildEquipoChildren(equipo, clienteId, areaId);
  if (childrenOnly) return children;

  return createGraphNode(
    NODE_TYPES.EQUIPO,
    id,
    equipo.nombre || 'Equipo',
    { ...equipo, cliente_id: clienteId, area_id: areaId },
    {
      subtitulo: equipo.servicio_nombre || equipo.area_nombre || 'Sin servicio',
      color: colorServicio(equipo.estado),
      badge: equipo.estado_display || equipo.estado,
      children,
    }
  );
}

function buildAreaNode(area, clienteId, withChildren = true) {
  const id = uniqueId(['area', area.area_id, 'cli', clienteId]);
  const children = withChildren
    ? (area.equipos || []).map((e) => buildEquipoNode(e, clienteId, area.area_id))
    : [];
  return createGraphNode(
    NODE_TYPES.AREA,
    id,
    area.area_nombre || 'Área',
    { ...area, cliente_id: clienteId },
    {
      subtitulo: `${area.equipos?.length || 0} equipos`,
      color: '#001871',
      badge: `${area.equipos?.length || 0} equipos`,
      children,
      meta: { area_id: area.area_id },
    }
  );
}

function buildClienteNode(cliente, withChildren = true, customId = null, areaId = null) {
  const id = customId || uniqueId(['cli', cliente.id]);
  const data = areaId != null ? { ...cliente, area_id: areaId } : cliente;
  return createGraphNode(
    NODE_TYPES.CLIENTE,
    id,
    cliente.razon_social || 'Cliente',
    data,
    {
      subtitulo: `NIT: ${cliente.nit || '—'}`,
      color: colorCliente(cliente.estado),
      badge: cliente.estado_display || cliente.estado,
      children: withChildren ? [] : [],
      meta: { cliente_id: cliente.id },
    }
  );
}

function buildTreePorArea(data) {
  const root = createGraphNode(NODE_TYPES.ROOT, 'root', 'Cartera por área', {}, { color: '#001871' });

  (data?.por_area || []).forEach((area) => {
    const areaNode = createGraphNode(
      NODE_TYPES.AREA,
      uniqueId(['area', area.area_id]),
      area.area_nombre || 'Área',
      area,
      {
        subtitulo: `${area.clientes?.length || 0} clientes`,
        color: '#001871',
        badge: `${area.clientes?.length || 0} clientes`,
        meta: { area_id: area.area_id },
      }
    );

    (area.clientes || []).forEach((cliente) => {
      const clienteNode = buildClienteNode(cliente, false, uniqueId(['cli', cliente.id, 'area', area.area_id]), area.area_id);
      (cliente.equipos || []).forEach((equipo) => {
        clienteNode.children.push(buildEquipoNode(equipo, cliente.id, area.area_id));
      });
      if (clienteNode.children.length > 0) {
        areaNode.children.push(clienteNode);
      }
    });

    if (areaNode.children.length > 0) {
      root.children.push(areaNode);
    }
  });

  return root;
}

function buildTreePorCliente(data) {
  const root = createGraphNode(NODE_TYPES.ROOT, 'root', 'Cartera por cliente', {}, { color: '#001871' });

  (data?.por_cliente || []).forEach((cliente) => {
    const clienteNode = buildClienteNode(cliente, false);
    (cliente.areas || []).forEach((area) => {
      const areaNode = buildAreaNode(area, cliente.id, true);
      if (areaNode.children.length > 0) {
        clienteNode.children.push(areaNode);
      }
    });
    if (clienteNode.children.length > 0) {
      root.children.push(clienteNode);
    }
  });

  return root;
}

function buildTreePorEquipo(data) {
  const root = createGraphNode(NODE_TYPES.ROOT, 'root', 'Cartera por equipo', {}, { color: '#001871' });

  (data?.por_equipo || []).forEach((equipo) => {
    const equipoNode = buildEquipoNode(equipo, equipo.cliente?.id, equipo.area_id, false);

    if (equipo.cliente) {
      const clienteNode = buildClienteNode(equipo.cliente, false);
      equipoNode.children.push(clienteNode);
    }

    const miembros = equipo.miembros || [];
    miembros.forEach((m) => {
      const empId = uniqueId(['emp', m.empleado_id, 'eq', equipo.id, 'mode', 'equipo']);
      const nivel = nivelEmpleadoReal(m);
      equipoNode.children.push(
        createGraphNode(
          NODE_TYPES.EMPLEADO,
          empId,
          m.empleado_nombre || `Empleado #${m.empleado_id}`,
          { ...m, equipo_id: equipo.id, cliente_id: equipo.cliente?.id, area_id: equipo.area_id },
          {
            subtitulo: m.cargo || m.rol_display || m.rol,
            color: NIVEL_COLORES[nivel] || '#64748b',
            badge: badgeEmpleado(m),
            meta: { empleado_id: m.empleado_id },
          }
        )
      );
    });

    root.children.push(equipoNode);
  });

  return root;
}

function buildTreeComplete(data) {
  return buildTreePorArea(data);
}

function buildTree(viewMode, data) {
  switch (viewMode) {
    case VIEW_MODES.AREA:
      return buildTreePorArea(data);
    case VIEW_MODES.CLIENTE:
      return buildTreePorCliente(data);
    case VIEW_MODES.EQUIPO:
      return buildTreePorEquipo(data);
    case VIEW_MODES.COMPLETE:
    default:
      return buildTreeComplete(data);
  }
}

function nodeMatches(node, filters, searchTerm) {
  const { areaId, clienteId, equipoId, empleadoId, estado } = filters;

  // Filtrado por área: cualquier nodo que tenga un área asignada debe coincidir.
  if (areaId) {
    const nodeAreaId = node.data?.area_id ?? node.meta?.area_id ?? null;
    if (nodeAreaId != null && String(nodeAreaId) !== String(areaId)) {
      return false;
    }
  }

  // Filtrado por cliente: cualquier nodo que tenga un cliente asignado debe coincidir.
  if (clienteId) {
    const nodeClienteId = node.meta?.cliente_id ?? node.data?.cliente_id ?? node.data?.id ?? null;
    if (nodeClienteId != null && String(nodeClienteId) !== String(clienteId)) {
      return false;
    }
  }

  // Filtrado por estado: solo aplica a nodos de cliente.
  if (node.type === NODE_TYPES.CLIENTE && estado && node.data?.estado !== estado) {
    return false;
  }

  // Filtrado por equipo: solo aplica a nodos de equipo y empleados.
  if (equipoId) {
    if (node.type === NODE_TYPES.EQUIPO) {
      const nodeEquipoId = node.data?.id ?? null;
      if (nodeEquipoId != null && String(nodeEquipoId) !== String(equipoId)) {
        return false;
      }
    } else if (node.type === NODE_TYPES.EMPLEADO) {
      const nodeEquipoId = node.data?.equipo_id ?? null;
      if (nodeEquipoId != null && String(nodeEquipoId) !== String(equipoId)) {
        return false;
      }
    }
  }

  // Filtrado por empleado: el nodo empleado debe coincidir por su id.
  if (empleadoId) {
    const nodeEmpleadoId = node.meta?.empleado_id ?? node.data?.empleado_id ?? null;
    if (nodeEmpleadoId != null && String(nodeEmpleadoId) !== String(empleadoId)) {
      return false;
    }
  }

  if (searchTerm) {
    const term = String(searchTerm).toLowerCase();
    return (
      textMatch(node.label, term) ||
      textMatch(node.subtitulo, term) ||
      textMatch(node.data?.razon_social, term) ||
      textMatch(node.data?.area_nombre, term) ||
      textMatch(node.data?.empleado_nombre, term) ||
      textMatch(node.data?.nombre, term)
    );
  }

  return true;
}

function filterTree(node, filters, searchTerm) {
  const matchesSelf = nodeMatches(node, filters, searchTerm);
  const filteredChildren = [];

  (node.children || []).forEach((child) => {
    const filteredChild = filterTree(child, filters, searchTerm);
    if (filteredChild) {
      filteredChildren.push(filteredChild);
    }
  });

  // Si tiene hijos que coinciden, siempre mantener el nodo padre para conservar la jerarquía.
  if (filteredChildren.length > 0) {
    return { ...node, children: filteredChildren };
  }

  // Nodo hoja que coincide con el filtro: mantenerlo solo si es un tipo terminal.
  // Las áreas vacías no deben quedar colgadas.
  const canBeLeaf = [NODE_TYPES.CLIENTE, NODE_TYPES.EQUIPO, NODE_TYPES.EMPLEADO].includes(node.type);
  if (matchesSelf && canBeLeaf) {
    return { ...node, children: [] };
  }

  return null;
}

function flattenTree(node, list = [], parentMap = new Map(), parentId = null) {
  list.push(node);
  if (parentId) parentMap.set(node.id, parentId);
  (node.children || []).forEach((child) => flattenTree(child, list, parentMap, node.id));
  return { list, parentMap };
}

function treeToNodesEdges(tree) {
  const nodes = [];
  const edges = [];

  const walk = (node, parentId = null) => {
    const rfNode = {
      id: node.id,
      type: node.type,
      position: { x: 0, y: 0 },
      data: {
        label: node.label,
        subtitulo: node.subtitulo,
        badge: node.badge,
        color: node.color,
        icon: node.icon,
        ...node.data,
      },
      style: {
        width: NODE_SIZES[node.type].width,
        height: NODE_SIZES[node.type].height,
      },
    };
    nodes.push(rfNode);

    if (parentId) {
      edges.push({
        id: `${parentId}->${node.id}`,
        source: parentId,
        target: node.id,
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#cbd5e1', strokeWidth: 2 },
      });
    }

    (node.children || []).forEach((child) => walk(child, node.id));
  };

  walk(tree);
  return { nodes, edges };
}

async function applyElkLayout(nodes, edges) {
  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '24',
      'elk.layered.spacing.nodeNodeBetweenLayers': '56',
      'elk.layered.nodePlacement.strategy': 'NETWORK_SIMPLEX',
      'elk.layered.nodePlacement.networkSimplex.nodeNodeBetweenLayers': '56',
      'elk.edgeRouting': 'ORTHOGONAL',
      'elk.layered.considerModelOrder': 'NODES_AND_EDGES',
    },
    children: nodes.map((n) => ({
      id: n.id,
      width: NODE_SIZES[n.type].width,
      height: NODE_SIZES[n.type].height,
    })),
    edges: edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    })),
  };

  try {
    const result = await elk.layout(elkGraph);
    const positions = new Map();
    (result.children || []).forEach((child) => {
      positions.set(child.id, { x: child.x ?? 0, y: child.y ?? 0 });
    });
    return nodes.map((n) => ({
      ...n,
      position: positions.get(n.id) || { x: 0, y: 0 },
    }));
  } catch (err) {
    console.error('[useOrganigramaData] ELK layout failed, falling back to manual:', err);
    return manualLayout(nodes, edges);
  }
}

function manualLayout(nodes, edges) {
  const childrenMap = new Map();
  edges.forEach((e) => {
    if (!childrenMap.has(e.source)) childrenMap.set(e.source, []);
    childrenMap.get(e.source).push(e.target);
  });

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const positions = new Map();

  const place = (id, x, y) => {
    if (positions.has(id)) return;
    positions.set(id, { x, y });
    const children = childrenMap.get(id) || [];
    if (children.length === 0) return;

    const childWidth = NODE_SIZES[nodeMap.get(children[0])?.type || NODE_TYPES.EMPLEADO].width;
    const totalWidth = children.length * (childWidth + SIBLING_GAP) - SIBLING_GAP;
    children.forEach((childId, idx) => {
      const cx = x - totalWidth / 2 + idx * (childWidth + SIBLING_GAP) + childWidth / 2;
      const cy = y + LEVEL_HEIGHT;
      place(childId, cx, cy);
    });
  };

  const rootId = nodes.find((n) => n.type === NODE_TYPES.ROOT)?.id;
  if (rootId) place(rootId, 0, 0);

  return nodes.map((n) => ({
    ...n,
    position: positions.get(n.id) || { x: 0, y: 0 },
  }));
}

function filterData(data, filters) {
  const { areaId, clienteId, equipoId } = filters || {};
  if (!areaId && !clienteId && !equipoId) return data;

  const filtered = { ...data };

  if (data?.por_area) {
    filtered.por_area = data.por_area
      .filter((a) => !areaId || String(a.area_id) === String(areaId))
      .map((a) => ({
        ...a,
        clientes: (a.clientes || [])
          .filter((c) => !clienteId || String(c.id) === String(clienteId))
          .map((c) => ({
            ...c,
            equipos: (c.equipos || []).filter((e) => !equipoId || String(e.id) === String(equipoId)),
          }))
          .filter((c) => c.equipos.length > 0),
      }))
      .filter((a) => a.clientes.length > 0);
  }

  if (data?.por_cliente) {
    filtered.por_cliente = data.por_cliente
      .filter((c) => !clienteId || String(c.id) === String(clienteId))
      .map((c) => ({
        ...c,
        areas: (c.areas || [])
          .filter((a) => !areaId || String(a.area_id) === String(areaId))
          .map((a) => ({
            ...a,
            equipos: (a.equipos || []).filter((e) => !equipoId || String(e.id) === String(equipoId)),
          }))
          .filter((a) => a.equipos.length > 0),
      }))
      .filter((c) => c.areas.length > 0);
  }

  if (data?.por_equipo) {
    filtered.por_equipo = data.por_equipo.filter(
      (e) =>
        (!areaId || String(e.area_id) === String(areaId)) &&
        (!clienteId || String(e.cliente?.id) === String(clienteId)) &&
        (!equipoId || String(e.id) === String(equipoId))
    );
  }

  return filtered;
}

export function useOrganigramaData(data, viewMode, filters, searchTerm) {
  const [layoutResult, setLayoutResult] = useState({ nodes: [], edges: [], flatNodes: [], parentMap: new Map(), stats: {} });
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  const filteredData = useMemo(() => filterData(data, filters), [data, filters]);

  const tree = useMemo(() => {
    if (!filteredData) return null;
    return buildTree(viewMode, filteredData);
  }, [filteredData, viewMode]);

  const filteredTree = useMemo(() => {
    if (!tree) return null;
    return filterTree(tree, filters, searchTerm);
  }, [tree, filters, searchTerm]);

  const flatNodes = useMemo(() => {
    if (!filteredTree) return [];
    const { list } = flattenTree(filteredTree);
    return list.map((n) => ({
      id: n.id,
      type: n.type,
      label: n.label,
      subtitulo: n.subtitulo,
      color: n.color,
      empleado_id: n.meta?.empleado_id || n.data?.empleado_id,
      cliente_id: n.meta?.cliente_id || n.data?.id,
      area_id: n.meta?.area_id || n.data?.area_id,
      equipo_id: n.data?.id,
      data: n.data,
    }));
  }, [filteredTree]);

  const parentMap = useMemo(() => {
    if (!filteredTree) return new Map();
    const { parentMap: map } = flattenTree(filteredTree);
    return map;
  }, [filteredTree]);

  const stats = useMemo(() => {
    return {
      areas: flatNodes.filter((n) => n.type === NODE_TYPES.AREA).length,
      clientes: flatNodes.filter((n) => n.type === NODE_TYPES.CLIENTE).length,
      equipos: flatNodes.filter((n) => n.type === NODE_TYPES.EQUIPO).length,
      empleados: flatNodes.filter((n) => n.type === NODE_TYPES.EMPLEADO).length,
    };
  }, [flatNodes]);

  useEffect(() => {
    if (!filteredTree) return;

    let cancelled = false;
    if (abortRef.current) abortRef.current();
    abortRef.current = () => { cancelled = true; };

    const run = async () => {
      setLoading(true);
      const { nodes, edges } = treeToNodesEdges(filteredTree);
      const positionedNodes = await applyElkLayout(nodes, edges);

      if (cancelled) return;

      setLayoutResult({
        nodes: positionedNodes,
        edges,
        flatNodes,
        parentMap,
        stats,
      });
      setLoading(false);
    };

    run();

    return () => { cancelled = true; };
  }, [filteredTree, flatNodes, parentMap, stats]);

  return {
    ...layoutResult,
    loading,
  };
}

export default useOrganigramaData;
