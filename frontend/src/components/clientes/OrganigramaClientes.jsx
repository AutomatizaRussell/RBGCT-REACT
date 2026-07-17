/**
 * OrganigramaClientes — Visualización interactiva de la cartera de clientes
 * Basado en @xyflow/react con filtros dinámicos de administrador,
 * panel lateral y navegación tipo Microsoft Viva / Entra ID.
 */
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
} from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  useReactFlow,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { getOrganigramaClientes } from '../../lib/api';
import { Network } from 'lucide-react';
import {
  useOrganigramaData,
  VIEW_MODES,
  NODE_TYPES,
} from './useOrganigramaData';
import { nodeTypes } from './OrganigramaNodeTypes';
import OrganigramaFilters from './OrganigramaFilters';
import { OrganigramaDrawer } from './OrganigramaDrawer';

const ZOOM_MIN = 0.25;
const ZOOM_MAX = 2.5;

function buildFilterOptions(data, filters = {}) {
  if (!data) return { areas: [], clientes: [], equipos: [] };

  const { areaId, clienteId } = filters;

  const areas = new Map();
  (data.por_area || []).forEach((a) => {
    if (!areas.has(a.area_id)) {
      areas.set(a.area_id, { id: a.area_id, nombre: a.area_nombre });
    }
  });

  const clientes = new Map();
  (data.por_cliente || []).forEach((c) => {
    if (!c || !c.id) return;
    if (areaId && !(c.areas || []).some((a) => String(a.area_id) === String(areaId))) {
      return;
    }
    if (!clientes.has(c.id)) {
      clientes.set(c.id, { id: c.id, nombre: c.razon_social || `Cliente #${c.id}` });
    }
  });

  const equipos = new Map();
  (data.por_equipo || []).forEach((e) => {
    if (areaId && String(e.area_id) !== String(areaId)) return;
    if (clienteId && String(e.cliente?.id) !== String(clienteId)) return;
    if (!equipos.has(e.id)) {
      equipos.set(e.id, { id: e.id, nombre: e.nombre });
    }
  });

  return {
    areas: Array.from(areas.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    clientes: Array.from(clientes.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
    equipos: Array.from(equipos.values()).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  };
}

function Flow({
  nodes: initialNodes,
  edges: initialEdges,
  selectedNode,
  highlightedIds,
  onNodeClick,
}) {
  const { fitView, setCenter } = useReactFlow();
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    const nextNodes = initialNodes.map((n) => {
      const isHighlighted = highlightedIds ? highlightedIds.has(n.id) : false;
      const dimmed = highlightedIds ? !isHighlighted && n.type !== NODE_TYPES.ROOT : false;
      return {
        ...n,
        data: {
          ...n.data,
          dimmed,
        },
      };
    });
    setNodes(nextNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges, highlightedIds]);

  useEffect(() => {
    if (initialNodes.length > 0) {
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 400 });
      });
    }
  }, [initialNodes, fitView]);

  useEffect(() => {
    if (selectedNode && nodes.find((n) => n.id === selectedNode.id)) {
      const n = nodes.find((n) => n.id === selectedNode.id);
      if (n) {
        requestAnimationFrame(() => {
          setCenter(n.position.x + (n.width || 200) / 2, n.position.y + (n.height || 60) / 2, {
            zoom: 1.2,
            duration: 500,
          });
        });
      }
    }
  }, [selectedNode, nodes, setCenter]);

  const handleNodeClick = useCallback(
    (_event, node) => {
      onNodeClick(node);
    },
    [onNodeClick]
  );

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      nodeTypes={nodeTypes}
      minZoom={ZOOM_MIN}
      maxZoom={ZOOM_MAX}
      fitView
      fitViewOptions={{ padding: 0.2, duration: 400 }}
      proOptions={{ hideAttribution: true }}
      defaultEdgeOptions={{ type: 'smoothstep', animated: true }}
    >
      <Background color="#f8fafc" gap={16} />
    </ReactFlow>
  );
}

export default function OrganigramaClientes({ areaId = null, isAdmin = false }) {
  const [data, setData] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [filters, setFilters] = useState({
    areaId: null,
    clienteId: null,
    equipoId: null,
    empleadoId: null,
    estado: null,
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedNode, setSelectedNode] = useState(null);
  const [highlightedId, setHighlightedId] = useState(null);
  const [pendingSearchId, setPendingSearchId] = useState(null);
  const [filtersCollapsed, setFiltersCollapsed] = useState(false);

  useEffect(() => {
    if (areaId != null) {
      setFilters((prev) => ({ ...prev, areaId: String(areaId) }));
    }
  }, [areaId]);

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const res = await getOrganigramaClientes({});
      setData(res);
    } catch (err) {
      console.error('[OrganigramaClientes] error:', err);
    } finally {
      setLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Al cambiar área, reiniciar filtros dependientes para evitar combinaciones inválidas
  useEffect(() => {
    setFilters((prev) =>
      prev.clienteId || prev.equipoId
        ? { ...prev, clienteId: null, equipoId: null }
        : prev
    );
  }, [filters.areaId]);

  useEffect(() => {
    setFilters((prev) =>
      prev.equipoId ? { ...prev, equipoId: null } : prev
    );
  }, [filters.clienteId]);

  const { nodes, edges, flatNodes, parentMap, stats, loading: loadingLayout } = useOrganigramaData(
    data,
    VIEW_MODES.AREA,
    filters,
    debouncedSearch
  );

  const highlightedIds = useMemo(() => {
    if (!highlightedId) return null;
    const ids = new Set([highlightedId]);
    let current = highlightedId;
    while (parentMap.has(current)) {
      const parentId = parentMap.get(current);
      ids.add(parentId);
      current = parentId;
    }
    return ids;
  }, [highlightedId, parentMap]);

  const options = useMemo(() => buildFilterOptions(data, filters), [data, filters]);

  const searchResults = useMemo(() => {
    if (!debouncedSearch) return [];
    const term = debouncedSearch.toLowerCase();
    return flatNodes.filter(
      (n) =>
        n.type !== NODE_TYPES.ROOT &&
        (n.label?.toLowerCase().includes(term) || n.subtitulo?.toLowerCase().includes(term))
    );
  }, [debouncedSearch, flatNodes]);

  const handleFilterChange = useCallback((campo, valor) => {
    if (campo === 'reset') {
      setFilters({
        areaId: null,
        clienteId: null,
        equipoId: null,
        empleadoId: null,
        estado: null,
      });
      setSearchTerm('');
      setDebouncedSearch('');
      setHighlightedId(null);
      setSelectedNode(null);
      setPendingSearchId(null);
    } else {
      setFilters((prev) => ({ ...prev, [campo]: valor }));
      setHighlightedId(null);
      setPendingSearchId(null);
    }
  }, [areaId]);

  const handleNodeClick = useCallback((node) => {
    if (!node) return;
    setSelectedNode(node);
    setHighlightedId(node.id);
    setPendingSearchId(null);
  }, []);

  const handleSearchSelect = useCallback((result) => {
    setSearchTerm(result.label);
    const nodeId = result.id;
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setSelectedNode(node);
      setHighlightedId(node.id);
      setPendingSearchId(null);
    } else {
      // Si el nodo filtrado no está visible, despejamos filtros para mostrarlo
      setFilters({
        areaId: null,
        clienteId: null,
        equipoId: null,
        empleadoId: null,
        estado: null,
      });
      setPendingSearchId(nodeId);
    }
  }, [nodes, areaId]);

  useEffect(() => {
    if (!pendingSearchId) return;
    const node = nodes.find((n) => n.id === pendingSearchId);
    if (node) {
      setSelectedNode(node);
      setHighlightedId(node.id);
      setPendingSearchId(null);
    }
  }, [pendingSearchId, nodes]);

  const handleCenterNode = useCallback((node) => {
    setSelectedNode(node);
    setHighlightedId(node.id);
    setPendingSearchId(null);
  }, []);

  const isLoading = loadingData || loadingLayout;
  const hasData = nodes.length > 1;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f8fafc]">
      <OrganigramaFilters
        areas={options.areas}
        clientes={options.clientes}
        equipos={options.equipos}
        filters={filters}
        onFilterChange={handleFilterChange}
        isAdmin={isAdmin}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchResults={searchResults}
        onSearchSelect={handleSearchSelect}
        stats={stats}
        collapsed={filtersCollapsed}
        onToggleCollapse={() => setFiltersCollapsed((c) => !c)}
      />

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative">
          <ReactFlowProvider>
            <Flow
              nodes={nodes}
              edges={edges}
              selectedNode={selectedNode}
              highlightedIds={highlightedIds}
              onNodeClick={handleNodeClick}
            />
          </ReactFlowProvider>

          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#f8fafc]/80 z-20">
              <div className="w-10 h-10 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-400">Cargando organigrama…</p>
            </div>
          )}

          {!isLoading && !hasData && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 z-10">
              <Network size={40} className="mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {filters.areaId || filters.clienteId || filters.equipoId || filters.empleadoId || filters.estado || debouncedSearch
                  ? 'No hay resultados con los filtros seleccionados'
                  : 'No hay datos para el organigrama'}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                {filters.areaId || filters.clienteId || filters.equipoId || filters.empleadoId || filters.estado || debouncedSearch
                  ? 'Prueba ajustando o limpiando los filtros superiores.'
                  : 'Aún no hay clientes asignados a áreas o contratos.'}
              </p>
            </div>
          )}
        </div>

        {selectedNode && (
          <div className="w-80 shrink-0 border-l border-slate-200 bg-white z-20 slide-in-right"
            style={{
              animation: 'rb-slide-in-right 280ms ease-out both',
            }}
          >
            <OrganigramaDrawer
              node={selectedNode}
              onClose={() => {
                setSelectedNode(null);
                setHighlightedId(null);
              }}
              onCenterNode={handleCenterNode}
            />
          </div>
        )}
      </div>

      <style>{`
        @keyframes rb-slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .react-flow__attribution { display: none !important; }
      `}</style>
    </div>
  );
}
