import { useState, useRef, useEffect, memo } from 'react';
import {
  Building2,
  Briefcase,
  Users,
  Search,
  User,
  LayoutGrid,
  Network,
  X,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const ESTADOS_CLIENTE = [
  { value: '', label: 'Todos' },
  { value: 'activo', label: 'Activos' },
  { value: 'prospecto', label: 'Prospectos' },
  { value: 'inactivo', label: 'Inactivos' },
  { value: 'suspendido', label: 'Suspendidos' },
  { value: 'retirado', label: 'Retirados' },
];

function Select({ label, value, options, onChange, icon: Icon }) {
  return (
    <div className="relative w-48 shrink-0">
      {Icon && <Icon size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value || null)}
        className={`w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#001871]/20 focus:border-[#001871] cursor-pointer ${
          Icon ? 'pl-8' : ''
        }`}
      >
        <option value="">{label}</option>
        {options.map((o) => (
          <option key={o.value || o.id} value={o.value || o.id}>
            {o.label || o.nombre}
          </option>
        ))}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
    </div>
  );
}

function SearchWithAutocomplete({ value, onChange, results, onSelect, placeholder }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full max-w-xs">
      <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 focus-within:border-[#001871] focus-within:ring-1 focus-within:ring-[#001871]/20">
        <Search size={16} className="text-slate-400" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className="flex-1 bg-transparent text-sm text-slate-700 placeholder:text-slate-400 outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange('');
              setOpen(false);
            }}
            className="text-slate-400 hover:text-slate-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {open && value && results.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 overflow-auto z-50">
          {results.slice(0, 8).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                onSelect(r);
                setOpen(false);
              }}
              className="flex items-center gap-3 w-full px-3 py-2 hover:bg-slate-50 text-left"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: r.color || '#64748b' }}
              >
                {r.type === 'empleado' ? r.label?.charAt(0)?.toUpperCase() : '•'}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-700 truncate">{r.label}</p>
                <p className="text-[10px] text-slate-400 truncate">
                  {r.type === 'empleado' ? r.subtitulo || 'Empleado' : r.type === 'cliente' ? 'Cliente' : r.type === 'equipo' ? 'Contrato' : r.type === 'area' ? 'Área' : ''}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const OrganigramaFilters = memo(function OrganigramaFilters({
  areas = [],
  clientes = [],
  equipos = [],
  filters,
  onFilterChange,
  isAdmin = false,
  searchTerm,
  onSearchChange,
  searchResults,
  onSearchSelect,
  stats,
  collapsed = false,
  onToggleCollapse,
}) {
  const hasFilters = filters.areaId || filters.clienteId || filters.equipoId || filters.empleadoId || filters.estado || searchTerm;

  return (
    <div className="flex flex-col gap-3 px-5 py-3 bg-white border-b border-slate-200 shadow-sm z-10 transition-all">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#001871] to-[#00a9ce] flex items-center justify-center text-white shadow-lg">
            <Network size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#001871]">Organigrama de clientes</h2>
            <p className="text-[11px] text-slate-500">
              {stats.clientes} clientes · {stats.equipos} contratos · {stats.empleados} empleados
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <SearchWithAutocomplete
            value={searchTerm}
            onChange={onSearchChange}
            results={searchResults}
            onSelect={onSearchSelect}
            placeholder="Buscar empleado, cliente..."
          />
          <button
            type="button"
            onClick={onToggleCollapse}
            className="p-2 rounded-lg text-slate-500 hover:text-[#001871] hover:bg-slate-100 transition-colors"
            title={collapsed ? 'Expandir filtros' : 'Minimizar filtros'}
          >
            {collapsed ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="flex flex-row flex-wrap items-center gap-3">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Filtrar por:</span>

          <Select
            label="Todas las áreas"
            value={filters.areaId}
            options={areas.map((a) => ({ id: a.id, nombre: a.nombre }))}
            onChange={(v) => onFilterChange('areaId', v)}
            icon={Building2}
          />

          <Select
            label="Todos los clientes"
            value={filters.clienteId}
            options={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
            onChange={(v) => onFilterChange('clienteId', v)}
            icon={Briefcase}
          />

          <Select
            label="Todos los contratos"
            value={filters.equipoId}
            options={equipos.map((e) => ({ id: e.id, nombre: e.nombre }))}
            onChange={(v) => onFilterChange('equipoId', v)}
            icon={Users}
          />

          {isAdmin && (
            <Select
              label="Todos los estados"
              value={filters.estado}
              options={ESTADOS_CLIENTE}
              onChange={(v) => onFilterChange('estado', v)}
              icon={LayoutGrid}
            />
          )}

          {hasFilters && (
            <button
              type="button"
              onClick={() => onFilterChange('reset')}
              className="text-[11px] font-medium text-slate-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
});

export default OrganigramaFilters;
