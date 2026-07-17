import { useState, useEffect, useMemo } from 'react';
import {
  X,
  Building2,
  Briefcase,
  Users,
  User,
  MapPin,
  Mail,
  Phone,
  Target,
  ExternalLink,
} from 'lucide-react';
import { getMisClientes } from '../../lib/api';
import { NODE_TYPES, NIVEL_COLORES, nivelEmpleado } from './useOrganigramaData';

function Badge({ children, className = '' }) {
  if (!children) return null;
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${className}`}>
      {children}
    </span>
  );
}

function DrawerHeader({ title, subtitle, color, icon, onClose }) {
  const initial = title?.charAt(0)?.toUpperCase() || '?';

  return (
    <div
      className="flex items-center justify-between px-5 py-4 border-b border-slate-100"
      style={{ background: `linear-gradient(135deg, ${color}15, transparent)` }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0"
          style={{ background: color }}
        >
          {icon || initial}
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-800 truncate">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      <button
        onClick={onClose}
        className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function InfoRow({ icon, value }) {
  if (!value) return null;
  const Icon = icon;
  return (
    <div className="flex items-center gap-2 text-xs text-slate-600">
      <Icon size={14} className="text-slate-400 shrink-0" />
      <span className="truncate">{value}</span>
    </div>
  );
}

function Acciones({ onCenter, onVerClientes, onVerPerfil }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onCenter}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#001871] text-white text-xs font-medium hover:bg-[#002a9e] transition-colors"
      >
        <Target size={13} />
        Centrar nodo
      </button>
      {onVerClientes && (
        <button
          type="button"
          onClick={onVerClientes}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <Briefcase size={13} />
          Ver clientes
        </button>
      )}
      {onVerPerfil && (
        <button
          type="button"
          onClick={onVerPerfil}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200 transition-colors"
        >
          <ExternalLink size={13} />
          Ver perfil
        </button>
      )}
    </div>
  );
}

function ClienteDrawer({ node, onClose, onCenter }) {
  const c = node.data;
  const areas = c.areas || [];
  const equipos = c.equipos || [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-slate-200 shadow-lg">
      <DrawerHeader
        title={c.label}
        subtitle={c.subtitulo}
        color={c.color}
        icon={<Briefcase size={18} />}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Acciones onCenter={onCenter} />

        <div className="flex flex-wrap gap-2">
          <Badge className={{
            activo: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
            prospecto: 'bg-blue-50 text-blue-700 border border-blue-200',
            inactivo: 'bg-slate-50 text-slate-600 border border-slate-200',
            suspendido: 'bg-amber-50 text-amber-700 border border-amber-200',
            retirado: 'bg-red-50 text-red-700 border border-red-200',
          }[c.estado] || 'bg-slate-50 text-slate-600 border border-slate-200'}>
            {c.estado_display || c.estado}
          </Badge>
          {areas.length > 0 && <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{areas.length} área{areas.length === 1 ? '' : 's'}</Badge>}
        </div>

        <div className="space-y-1.5">
          <InfoRow icon={MapPin} value={c.ciudad} />
          <InfoRow icon={Mail} value={c.email_principal} />
          <InfoRow icon={Phone} value={c.telefono} />
        </div>

        {areas.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Áreas asignadas</p>
            <div className="flex flex-wrap gap-1.5">
              {areas.map((a) => (
                <Badge key={a.area_id} className="bg-blue-50 text-blue-700 border border-blue-100">
                  {a.area_nombre}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {equipos.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Contratos ({equipos.length})</p>
            <div className="grid grid-cols-1 gap-2">
              {equipos.map((e) => (
                <div key={e.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-700 truncate">{e.nombre}</span>
                    <Badge className={{
                      activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                      pausado: 'bg-amber-50 text-amber-700 border border-amber-100',
                      terminado: 'bg-slate-50 text-slate-600 border border-slate-100',
                    }[e.estado] || 'bg-slate-50 text-slate-600 border border-slate-100'}>
                      {e.estado_display || e.estado}
                    </Badge>
                  </div>
                  {e.servicio_nombre && <p className="text-[10px] text-slate-500 truncate">{e.servicio_nombre}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmpleadoDrawer({ node, onClose, onCenter }) {
  const emp = node.data;
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showClientes, setShowClientes] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const res = await getMisClientes(emp.empleado_id);
        if (!cancelled) setClientes(res.clientes || []);
      } catch (err) {
        if (!cancelled) console.error('[EmpleadoDrawer] error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [emp.empleado_id]);

  const servicios = useMemo(() => {
    const map = new Map();
    clientes.forEach((c) => {
      (c?.equipos || []).forEach((e) => {
        if (e?.servicio_nombre && !map.has(e.servicio_nombre)) {
          map.set(e.servicio_nombre, e.servicio_nombre);
        }
      });
    });
    return Array.from(map.values());
  }, [clientes]);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-slate-200 shadow-lg">
      <DrawerHeader
        title={emp.label}
        subtitle={emp.subtitulo}
        color={emp.color || NIVEL_COLORES[nivelEmpleado(emp.rol)] || '#64748b'}
        icon={<User size={18} />}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Acciones
          onCenter={onCenter}
          onVerClientes={() => setShowClientes((s) => !s)}
        />

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{emp.rol_display || emp.rol}</Badge>
          {emp.area_nombre && <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{emp.area_nombre}</Badge>}
        </div>

        <div className="space-y-1.5">
          <InfoRow icon={Building2} value={emp.area_nombre} />
          <InfoRow icon={Mail} value={emp.correo} />
          <InfoRow icon={Phone} value={emp.telefono} />
        </div>

        {servicios.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Servicios asociados</p>
            <div className="flex flex-wrap gap-1.5">
              {servicios.map((s) => (
                <Badge key={s} className="bg-emerald-50 text-emerald-700 border border-emerald-100 truncate max-w-[12rem]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Clientes asignados ({clientes.length})
            </p>
          </div>
          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-6 h-6 border-2 border-[#001871] border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          {!loading && clientes.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">Sin clientes asignados</p>
          )}
          {!loading && clientes.length > 0 && showClientes && (
            <div className="grid grid-cols-1 gap-2">
              {clientes
                .filter((c) => c && c.id)
                .map((cliente) => {
                  const contratos = cliente.equipos || [];
                  return (
                    <div key={cliente.id} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-bold text-slate-800 truncate">{cliente.razon_social}</p>
                        <Badge className={{
                          activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                          prospecto: 'bg-blue-50 text-blue-700 border border-blue-100',
                          inactivo: 'bg-slate-50 text-slate-600 border border-slate-100',
                          suspendido: 'bg-amber-50 text-amber-700 border border-amber-100',
                          retirado: 'bg-red-50 text-red-700 border border-red-100',
                        }[cliente.estado] || 'bg-slate-50 text-slate-600 border border-slate-100'}
                        >
                          {cliente.estado_display || cliente.estado}
                        </Badge>
                      </div>
                      {cliente.nit && <p className="text-[10px] text-slate-400">NIT: {cliente.nit}</p>}

                      {contratos.length > 0 && (
                        <div className="mt-2 space-y-1.5">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Contratos ({contratos.length})</p>
                          <div className="flex flex-col gap-1">
                            {contratos.map((ct) => (
                              <div
                                key={ct.id}
                                className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 bg-white px-2 py-1.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-[10px] font-medium text-slate-700 truncate">{ct.nombre || ct.servicio_nombre || 'Contrato'}</p>
                                  {ct.area_nombre && <p className="text-[9px] text-slate-400 truncate">{ct.area_nombre}</p>}
                                </div>
                                <Badge className={{
                                  activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
                                  pausado: 'bg-amber-50 text-amber-700 border border-amber-100',
                                  terminado: 'bg-slate-50 text-slate-600 border border-slate-100',
                                }[ct.estado] || 'bg-slate-50 text-slate-600 border border-slate-100'}
                                >
                                  {ct.estado_display || ct.estado}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EquipoDrawer({ node, onClose, onCenter }) {
  const eq = node.data;
  const miembros = eq.miembros || [];

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-slate-200 shadow-lg">
      <DrawerHeader
        title={eq.label}
        subtitle={eq.subtitulo}
        color={eq.color}
        icon={<Users size={18} />}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Acciones onCenter={onCenter} />

        <div className="flex flex-wrap gap-2">
          <Badge className={{
            activo: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
            pausado: 'bg-amber-50 text-amber-700 border border-amber-100',
            terminado: 'bg-slate-50 text-slate-600 border border-slate-100',
          }[eq.estado] || 'bg-slate-50 text-slate-600 border border-slate-100'}>
            {eq.estado_display || eq.estado}
          </Badge>
          {miembros.length > 0 && <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{miembros.length} miembro{miembros.length === 1 ? '' : 's'}</Badge>}
        </div>

        {eq.descripcion && <p className="text-xs text-slate-600 leading-relaxed">{eq.descripcion}</p>}

        {miembros.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Miembros del contrato</p>
            <div className="grid grid-cols-1 gap-2">
              {miembros.map((m) => (
                <div key={m.empleado_id} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: NIVEL_COLORES[nivelEmpleado(m.rol)] || '#64748b' }}
                  >
                    {m.empleado_nombre?.charAt(0)?.toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-700 truncate">{m.empleado_nombre}</p>
                    <p className="text-[10px] text-slate-500 truncate">{m.cargo || m.rol_display || m.rol}</p>
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

function AreaDrawer({ node, onClose, onCenter }) {
  const a = node.data;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-white border-l border-slate-200 shadow-lg">
      <DrawerHeader
        title={a.label}
        subtitle={a.subtitulo}
        color="#001871"
        icon={<Building2 size={18} />}
        onClose={onClose}
      />
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <Acciones onCenter={onCenter} />

        <div className="flex flex-wrap gap-2">
          <Badge className="bg-blue-50 text-blue-700 border border-blue-100">{a.clientes?.length || 0} clientes</Badge>
          <Badge className="bg-purple-50 text-purple-700 border border-purple-100">{a.equipos?.length || 0} contratos</Badge>
        </div>
      </div>
    </div>
  );
}

export function OrganigramaDrawer({ node, onClose, onCenterNode }) {
  if (!node) return null;

  const handleCenter = () => {
    onCenterNode?.(node);
  };

  switch (node.type) {
    case NODE_TYPES.CLIENTE:
      return <ClienteDrawer node={node} onClose={onClose} onCenter={handleCenter} />;
    case NODE_TYPES.EMPLEADO:
      return <EmpleadoDrawer node={node} onClose={onClose} onCenter={handleCenter} />;
    case NODE_TYPES.EQUIPO:
      return <EquipoDrawer node={node} onClose={onClose} onCenter={handleCenter} />;
    case NODE_TYPES.AREA:
      return <AreaDrawer node={node} onClose={onClose} onCenter={handleCenter} />;
    default:
      return null;
  }
}

export default OrganigramaDrawer;
