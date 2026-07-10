/**
 * OrganigramaModerno — Visualización interactiva del organigrama corporativo
 * Features: zoom, pan, drag, search, tooltips, animations, responsive
 * Soporta: Vista por Área (mi-organigrama) y Vista General (todas las áreas)
 * Sin dependencias externas — puro React + CSS
 */
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X, ZoomIn, ZoomOut, RotateCcw, Search, Move,
  Network, ChevronDown, ChevronUp, User, Briefcase,
  Building2, Mail, Phone, MapPin, LayoutGrid, Users
} from 'lucide-react';

const NIVEL_COLORS = {
  0: { bg: '#001871', text: '#ffffff', border: '#001871', dot: '#001871', label: 'Directivo' },
  1: { bg: '#981d97', text: '#ffffff', border: '#981d97', dot: '#981d97', label: 'Gerencia' },
  2: { bg: '#00a9ce', text: '#ffffff', border: '#00a9ce', dot: '#00a9ce', label: 'Coordinación' },
  3: { bg: '#00bfb3', text: '#ffffff', border: '#00bfb3', dot: '#00bfb3', label: 'Profesional' },
  4: { bg: '#ed8b00', text: '#ffffff', border: '#ed8b00', dot: '#ed8b00', label: 'Operativo' },
};

const INITIAL_ZOOM = 1;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 2.5;
const ZOOM_STEP = 0.15;

/** Card de persona individual */
function PersonCard({ person, searchTerm, onHover, onLeave }) {
  const colors = NIVEL_COLORS[person.nivel] || NIVEL_COLORS[4];
  const isHighlighted = searchTerm &&
    (person.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     person.cargo?.toLowerCase().includes(searchTerm.toLowerCase()));
  const isYo = person.es_yo;

  return (
    <div
      className={`rb-org-person-card ${isYo ? 'rb-org-person-me' : ''} ${isHighlighted ? 'rb-org-highlighted' : ''}`}
      style={{ '--person-color': colors.bg }}
      onMouseEnter={() => onHover?.(person)}
      onMouseLeave={onLeave}
    >
      <div
        className="rb-org-avatar"
        style={{
          background: isYo ? colors.bg : '#e2e8f0',
          color: isYo ? '#fff' : '#64748b',
        }}
      >
        {person.nombre?.charAt(0)?.toUpperCase() || '?'}
      </div>
      <div className="rb-org-person-info">
        <p className="rb-org-person-name">
          {person.nombre}
          {isYo && <span className="rb-org-me-badge">Tú</span>}
        </p>
        {person.cargo && (
          <p className="rb-org-person-role">
            <Briefcase size={10} />
            {person.cargo}
          </p>
        )}
      </div>
      <div className="rb-org-level-indicator" style={{ background: colors.bg }} />
    </div>
  );
}

/** Nivel del organigrama (header + personas) */
function NivelOrg({ nivelData, searchTerm, onHover, onLeave }) {
  const colors = NIVEL_COLORS[nivelData.nivel] || NIVEL_COLORS[4];
  const hasPersonas = nivelData.personas?.length > 0;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="rb-org-level-header" style={{ '--level-color': colors.bg }}>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: colors.dot }} />
          <span className="font-bold text-xs uppercase tracking-wider">{nivelData.label}</span>
        </div>
        <span className="text-[10px] text-slate-400 font-medium">
          {nivelData.personas?.length || 0} personas
        </span>
      </div>

      {hasPersonas && <div className="rb-org-connector-down" />}

      {hasPersonas && (
        <div className="rb-org-persons-row">
          {nivelData.personas.map((person, idx) => (
            <div key={person.id} className="flex flex-col items-center relative">
              {idx === 0 && nivelData.personas.length > 1 && (
                <div className="rb-org-connector-h-line" style={{ width: `${(nivelData.personas.length - 1) * 200 + 40}px` }} />
              )}
              {nivelData.personas.length === 1 && (
                <div className="rb-org-connector-down-short" />
              )}
              {idx > 0 && nivelData.personas.length > 1 && (
                <div className="rb-org-connector-v-stub" />
              )}
              <PersonCard
                person={{ ...person, nivel: nivelData.nivel }}
                searchTerm={searchTerm}
                onHover={onHover}
                onLeave={onLeave}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Área individual en vista general — columna vertical */
function AreaOrg({ areaData, searchTerm, onHover, onLeave }) {
  const [expanded, setExpanded] = useState(true);
  const cadena = areaData.cadena || [];

  return (
    <div className="rb-org-area-column">
      {/* Header del área */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="rb-org-area-header rb-org-area-header-column"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#001871] to-[#00a9ce] flex items-center justify-center shrink-0">
            <Building2 size={16} className="text-white" />
          </div>
          <div className="text-left min-w-0">
            <p className="font-bold text-sm text-[#001871] truncate">{areaData.nombre}</p>
            <p className="text-[10px] text-slate-400">{cadena.length} niveles · {cadena.reduce((sum, n) => sum + (n.personas?.length || 0), 0)} personas</p>
          </div>
        </div>
        <div className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
          <ChevronDown size={18} className="text-slate-400" />
        </div>
      </button>

      {/* Cadena de niveles del área */}
      {expanded && cadena.length > 0 && (
        <div className="rb-org-area-levels">
          {cadena.map((nivel) => (
            <div key={nivel.nivel} className="flex flex-col items-center w-full">
              <NivelOrg
                nivelData={nivel}
                searchTerm={searchTerm}
                onHover={onHover}
                onLeave={onLeave}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tooltip flotante con info del empleado */
function Tooltip({ node, mousePos }) {
  if (!node) return null;

  const colors = NIVEL_COLORS[node.nivel] || NIVEL_COLORS[4];

  return (
    <div
      className="rb-org-tooltip"
      style={{
        left: mousePos.x + 16,
        top: mousePos.y - 10,
      }}
    >
      <div className="rb-org-tooltip-header" style={{ background: colors.bg }}>
        <div className="rb-org-tooltip-avatar" style={{ background: colors.bg }}>
          {node.nombre?.charAt(0)?.toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-sm text-white">{node.nombre}</p>
          <p className="text-xs text-white/70">{node.cargo || '—'}</p>
        </div>
      </div>
      <div className="rb-org-tooltip-body">
        {node.correo && (
          <div className="rb-org-tooltip-row">
            <Mail size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600">{node.correo}</span>
          </div>
        )}
        {node.telefono && (
          <div className="rb-org-tooltip-row">
            <Phone size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600">{node.telefono}</span>
          </div>
        )}
        {node.area && (
          <div className="rb-org-tooltip-row">
            <Building2 size={12} className="text-slate-400" />
            <span className="text-xs text-slate-600">{node.area}</span>
          </div>
        )}
        <div className="rb-org-tooltip-row">
          <MapPin size={12} className="text-slate-400" />
          <span className="text-xs text-slate-500">Nivel {node.nivel + 1}</span>
        </div>
      </div>
    </div>
  );
}

/** Controles de zoom */
function ZoomControls({ zoom, onZoomIn, onZoomOut, onReset }) {
  return (
    <div className="rb-org-zoom-controls">
      <button onClick={onZoomIn} className="rb-org-zoom-btn" title="Acercar">
        <ZoomIn size={16} />
      </button>
      <div className="rb-org-zoom-level">{Math.round(zoom * 100)}%</div>
      <button onClick={onZoomOut} className="rb-org-zoom-btn" title="Alejar">
        <ZoomOut size={16} />
      </button>
      <button onClick={onReset} className="rb-org-zoom-btn" title="Restablecer vista">
        <RotateCcw size={16} />
      </button>
    </div>
  );
}

/** Buscador de empleados */
function SearchBar({ value, onChange, results, onSelect }) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="rb-org-search">
      <Search size={16} className="text-slate-400" />
      <input
        type="text"
        placeholder="Buscar empleado..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 200)}
        className="rb-org-search-input"
      />
      {value && focused && results.length > 0 && (
        <div className="rb-org-search-dropdown">
          {results.slice(0, 8).map((r) => (
            <button
              key={r.id}
              onClick={() => { onSelect(r); setFocused(false); }}
              className="rb-org-search-result"
            >
              <User size={14} className="text-slate-400" />
              <div className="text-left">
                <p className="text-xs font-medium text-slate-700">{r.nombre}</p>
                <p className="text-[10px] text-slate-400">{r.cargo || '—'}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Toggle de vistas */
function VistaToggle({ vista, onChange }) {
  return (
    <div className="flex items-center bg-slate-100 rounded-xl p-1 gap-1">
      <button
        onClick={() => onChange('area')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          vista === 'area'
            ? 'bg-white text-[#001871] shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <LayoutGrid size={13} />
        Vista por Área
      </button>
      <button
        onClick={() => onChange('general')}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          vista === 'general'
            ? 'bg-white text-[#001871] shadow-sm'
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Users size={13} />
        Vista General
      </button>
    </div>
  );
}

/** Componente principal */
export default function OrganigramaModerno({
  data,
  loading,
  onClose,
  vista = 'area',
  onCambiarVista,
}) {
  const [zoom, setZoom] = useState(INITIAL_ZOOM);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [hoveredNode, setHoveredNode] = useState(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [animationReady, setAnimationReady] = useState(false);

  const containerRef = useRef(null);

  // Animación inicial
  useEffect(() => {
    if (data && !loading) {
      const timer = setTimeout(() => setAnimationReady(true), 100);
      return () => clearTimeout(timer);
    }
  }, [data, loading]);

  // Reset zoom/pan cuando cambia la vista
  useEffect(() => {
    setZoom(INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
    setSearchTerm('');
  }, [vista]);

  // Zoom handlers
  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const handleReset = useCallback(() => {
    setZoom(INITIAL_ZOOM);
    setPan({ x: 0, y: 0 });
  }, []);

  // Wheel zoom
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z + delta)));
  }, []);

  // Drag (pan) handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    setMousePos({ x: e.clientX, y: e.clientY });
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Touch support
  const handleTouchStart = useCallback((e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  }, [pan]);

  const handleTouchMove = useCallback((e) => {
    if (e.touches.length === 1 && isDragging) {
      setPan({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y,
      });
    }
  }, [isDragging, dragStart]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Flatten people for search
  const allPeople = useMemo(() => {
    const people = [];
    if (vista === 'area' && data?.cadena) {
      data.cadena.forEach((nivel) => {
        nivel.personas.forEach((p) => {
          people.push({ ...p, nivel: nivel.nivel });
        });
      });
    } else if (vista === 'general' && data?.areas) {
      data.areas.forEach((area) => {
        area.cadena.forEach((nivel) => {
          nivel.personas.forEach((p) => {
            people.push({ ...p, nivel: nivel.nivel, area: area.nombre });
          });
        });
      });
    }
    return people;
  }, [data, vista]);

  const searchResults = useMemo(() => {
    if (!searchTerm) return [];
    return allPeople.filter((p) =>
      p.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, allPeople]);

  const handleSelectResult = useCallback((person) => {
    setSearchTerm(person.nombre);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose?.();
      if (e.key === '+' || e.key === '=') handleZoomIn();
      if (e.key === '-') handleZoomOut();
      if (e.key === '0') handleReset();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, handleZoomIn, handleZoomOut, handleReset]);

  // Datos según vista
  const isAreaVista = vista === 'area';
  const hasData = isAreaVista
    ? (data?.cadena?.length > 0)
    : (data?.areas?.length > 0);
  const cadena = data?.cadena || [];
  const areas = data?.areas || [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        className="relative flex flex-col bg-white rounded-2xl shadow-2xl m-4 md:m-6 overflow-hidden"
        style={{ height: 'calc(100vh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#001871] to-[#00a9ce] flex items-center justify-center">
              <Network size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#001871]">Organigrama</h2>
              <p className="text-xs text-slate-400">
                {isAreaVista
                  ? (data?.area || 'Área corporativa')
                  : `${data?.total_areas || 0} áreas · Vista General`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <VistaToggle vista={vista} onChange={onCambiarVista} />
            <SearchBar
              value={searchTerm}
              onChange={setSearchTerm}
              results={searchResults}
              onSelect={handleSelectResult}
            />
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={containerRef}
          className="flex-1 relative overflow-hidden bg-[#f8fafc] cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div className="absolute top-4 left-4 flex items-center gap-1.5 px-3 py-1.5 bg-white/80 backdrop-blur rounded-full text-[10px] text-slate-400 shadow-sm">
            <Move size={12} />
            Arrastra para navegar · Rueda para zoom
          </div>

          <ZoomControls
            zoom={zoom}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onReset={handleReset}
          />

          <div
            className={`absolute inset-0 flex items-start justify-center pt-16 pb-20 px-10 transition-opacity duration-500 ${animationReady ? 'opacity-100' : 'opacity-0'}`}
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top center',
              transition: isDragging ? 'none' : 'transform 0.2s ease-out, opacity 0.5s ease',
            }}
          >
            {loading && (
              <div className="flex flex-col items-center gap-3 py-20">
                <div className="rb-skeleton rb-skeleton-avatar" style={{ width: 48, height: 48 }} />
                <div className="rb-skeleton rb-skeleton-title" style={{ width: 200 }} />
                <div className="rb-skeleton rb-skeleton-text" style={{ width: 150 }} />
              </div>
            )}

            {!loading && !hasData && (
              <p className="text-sm text-slate-400 text-center py-20">No se pudo cargar el organigrama.</p>
            )}

            {/* VISTA POR ÁREA */}
            {!loading && isAreaVista && hasData && (
              <div className="rb-org-tree">
                <div className="rb-org-root">
                  <Building2 size={18} />
                  <span className="font-bold text-sm">{data.area || 'Organización'}</span>
                </div>

                {cadena.map((nivel) => (
                  <div key={nivel.nivel} className="flex flex-col items-center w-full">
                    <div className="rb-org-connector-down" />
                    <NivelOrg
                      nivelData={nivel}
                      searchTerm={searchTerm}
                      onHover={setHoveredNode}
                      onLeave={() => setHoveredNode(null)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* VISTA GENERAL */}
            {!loading && !isAreaVista && hasData && (
              <div className="rb-org-general-layout">
                {/* Nodo raíz centrado */}
                <div className="rb-org-general-root">
                  <Users size={18} />
                  <span className="font-bold text-sm">Organigrama General</span>
                </div>

                {/* Áreas en fila horizontal */}
                <div className="rb-org-general-areas">
                  {areas.map((area) => (
                    <AreaOrg
                      key={area.id}
                      areaData={area}
                      searchTerm={searchTerm}
                      onHover={setHoveredNode}
                      onLeave={() => setHoveredNode(null)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {hoveredNode && (
            <Tooltip node={hoveredNode} mousePos={mousePos} />
          )}
        </div>
      </div>
    </div>
  );
}
