import {
  Network,
  Building2,
  Briefcase,
  Users,
} from 'lucide-react';
import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

function Badge({ children, className = '' }) {
  if (!children) return null;
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold truncate max-w-[8rem] ${className}`}
    >
      {children}
    </span>
  );
}

function NodeWrapper({ children, color, selected, dimmed, onClick, className = '' }) {
  return (
    <div
      className={`relative group rounded-2xl border bg-white shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden ${
        selected ? 'ring-2 ring-offset-2' : ''
      } ${dimmed ? 'opacity-30' : 'opacity-100'} ${className}`}
      style={{
        borderColor: color,
        '--node-color': color,
        ...(selected ? { '--tw-ring-color': color } : {}),
      }}
      onClick={onClick}
    >
      {children}
      <Handle type="target" position={Position.Top} className="!bg-transparent !border-0" />
      <Handle type="source" position={Position.Bottom} className="!bg-transparent !border-0" />
    </div>
  );
}

function NodeIcon({ icon, color }) {
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
      style={{ background: color }}
    >
      {icon}
    </div>
  );
}

function NodeContent({ title, subtitle, badge, badgeClass }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-xs font-bold text-slate-800 truncate">{title}</p>
      {subtitle && <p className="text-[10px] text-slate-500 truncate">{subtitle}</p>}
      {badge && (
        <div className="mt-1">
          <Badge className={badgeClass}>{badge}</Badge>
        </div>
      )}
    </div>
  );
}

export const RootNode = memo(function RootNode({ data, selected }) {
  return (
    <NodeWrapper
      color="#001871"
      selected={selected}
      dimmed={data.dimmed}
      className="px-4 py-3"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
          style={{ background: 'linear-gradient(135deg, #001871, #00a9ce)' }}
        >
          <Network size={18} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#001871] truncate">{data.label}</p>
          <p className="text-[10px] text-slate-500">{data.subtitulo}</p>
        </div>
      </div>
    </NodeWrapper>
  );
});

export const AreaNode = memo(function AreaNode({ data, selected }) {
  return (
    <NodeWrapper
      color="#001871"
      selected={selected}
      dimmed={data.dimmed}
      className="px-3 py-3"
    >
      <div className="flex items-center gap-3">
        <NodeIcon icon={<Building2 size={16} />} color="#001871" />
        <NodeContent
          title={data.label}
          subtitle={data.subtitulo}
          badge={data.badge}
          badgeClass="bg-blue-50 text-blue-700 border border-blue-100"
        />
      </div>
    </NodeWrapper>
  );
});

export const ClienteNode = memo(function ClienteNode({ data, selected }) {
  const badgeClass = {
    activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    prospecto: 'bg-blue-50 text-blue-700 border border-blue-100',
    inactivo: 'bg-slate-50 text-slate-600 border border-slate-100',
    suspendido: 'bg-amber-50 text-amber-700 border border-amber-100',
    retirado: 'bg-red-50 text-red-700 border border-red-100',
  }[data.estado] || 'bg-slate-50 text-slate-600 border border-slate-100';

  return (
    <NodeWrapper
      color={data.color}
      selected={selected}
      dimmed={data.dimmed}
      className="px-3 py-3"
    >
      <div className="flex items-center gap-3">
        <NodeIcon icon={<Briefcase size={16} />} color={data.color} />
        <NodeContent
          title={data.label}
          subtitle={data.subtitulo}
          badge={data.badge}
          badgeClass={badgeClass}
        />
      </div>
    </NodeWrapper>
  );
});

export const EquipoNode = memo(function EquipoNode({ data, selected }) {
  const badgeClass = {
    activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    pausado: 'bg-amber-50 text-amber-700 border border-amber-100',
    terminado: 'bg-slate-50 text-slate-600 border border-slate-100',
  }[data.estado] || 'bg-slate-50 text-slate-600 border border-slate-100';

  return (
    <NodeWrapper
      color={data.color}
      selected={selected}
      dimmed={data.dimmed}
      className="px-3 py-3"
    >
      <div className="flex items-center gap-3">
        <NodeIcon icon={<Users size={16} />} color={data.color} />
        <NodeContent
          title={data.label}
          subtitle={data.subtitulo}
          badge={data.badge}
          badgeClass={badgeClass}
        />
      </div>
    </NodeWrapper>
  );
});

export const EmpleadoNode = memo(function EmpleadoNode({ data, selected }) {
  const initial = data.label?.charAt(0)?.toUpperCase() || '?';

  return (
    <NodeWrapper
      color={data.color}
      selected={selected}
      dimmed={data.dimmed}
      className="px-3 py-2.5"
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: data.color }}
        >
          {initial}
        </div>
        <NodeContent
          title={data.label}
          subtitle={data.subtitulo}
          badge={data.badge}
          badgeClass="bg-purple-50 text-purple-700 border border-purple-100"
        />
      </div>
    </NodeWrapper>
  );
});
