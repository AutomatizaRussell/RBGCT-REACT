import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Network,
  FileText,
  ChevronRight,
  AlertTriangle,
  Loader2,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { getEmpresas, fetchApi } from '../../../lib/api';
import OrganigramaClientes from '../../clientes/OrganigramaClientes';

const BRAND = '#0a2540';

const Badge = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] font-semibold tracking-wide uppercase ${className}`}
  >
    {children}
  </span>
);

const ESTADO_STYLES = {
  activo: 'bg-emerald-50/90 text-emerald-900 border-emerald-200/80',
  prospecto: 'bg-sky-50/90 text-sky-900 border-sky-200/80',
  inactivo: 'bg-slate-50 text-slate-700 border-slate-200/80',
  suspendido: 'bg-rose-50/90 text-rose-900 border-rose-200/80',
  retirado: 'bg-slate-50 text-slate-600 border-slate-200/80',
};

const esGerenteOSocio = (empleado) => {
  const cargo = (empleado?.nombre_cargo || empleado?.cargo_nombre || '').toLowerCase();
  const nivel = (empleado?.cargo_nivel || '').toLowerCase();
  return cargo.includes('gerente') || nivel.includes('gerente') || cargo.includes('socio') || nivel.includes('socio');
};

export default function MisClientes() {
  const navigate = useNavigate();
  const { empleadoData } = useAuth();
  const gerenteOSocio = esGerenteOSocio(empleadoData);

  const [activeTab, setActiveTab] = useState('lista');
  const [estadoFiltro, setEstadoFiltro] = useState('activo');
  const [clientes, setClientes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const tabs = [
    { id: 'lista', label: 'Lista', icon: Building2 },
    { id: 'organigrama', label: 'Organigrama', icon: Network },
  ];

  const filtros = gerenteOSocio
    ? [
        { value: 'todos', label: 'Todos' },
        { value: 'activo', label: 'Activos' },
        { value: 'inactivo', label: 'Inactivos' },
      ]
    : [{ value: 'activo', label: 'Activos' }];

  useEffect(() => {
    const loadClientes = async () => {
      if (!empleadoData?.id_empleado) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const params = {};
        if (estadoFiltro && estadoFiltro !== 'todos') {
          params.estado = estadoFiltro;
        }

        let data;
        if (gerenteOSocio) {
          data = await getEmpresas(params);
        } else {
          // getMisClientes exportado no acepta params; usamos fetchApi con el mismo endpoint
          const q = new URLSearchParams();
          q.set('empleado_id', empleadoData.id_empleado);
          if (params.estado) q.set('estado', params.estado);
          data = await fetchApi(`/clientes/empresas/mis_clientes/?${q.toString()}`);
        }

        setClientes(data?.clientes || data?.results || data || []);
      } catch (err) {
        console.error('Error cargando clientes:', err);
        setError('No se pudieron cargar los clientes asignados');
      } finally {
        setLoading(false);
      }
    };

    loadClientes();
  }, [empleadoData?.id_empleado, gerenteOSocio, estadoFiltro]);

  const clientesFiltrados = useMemo(() => {
    if (!clientes) return [];
    const list = Array.isArray(clientes) ? clientes : clientes.results || [];

    if (estadoFiltro === 'todos') return list;
    if (estadoFiltro === 'activo') {
      return list.filter((c) => ['activo', 'prospecto'].includes(c.estado));
    }
    if (estadoFiltro === 'inactivo') {
      return list.filter((c) => ['inactivo', 'suspendido', 'retirado'].includes(c.estado));
    }
    return list;
  }, [clientes, estadoFiltro]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
          <Loader2 size={22} className="animate-spin text-[#0a2540]" strokeWidth={2} />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Cargando cartera
        </p>
        <p className="mt-1 text-sm text-slate-600">Obteniendo clientes asignados…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-amber-200/80 bg-amber-50/50">
          <AlertTriangle size={26} className="text-amber-700" strokeWidth={1.75} />
        </div>
        <p className="mt-5 text-sm font-medium text-slate-800">{error}</p>
        <p className="mt-1 max-w-sm text-xs text-slate-500 leading-relaxed">
          Verifica tu conexión o inténtalo de nuevo en unos minutos.
        </p>
      </div>
    );
  }

  if (clientesFiltrados.length === 0) {
    return (
      <div className="relative animate-in fade-in duration-500">
        {empleadoData?.acceso_formularios_sqf && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => navigate('/app/sqf')}
              className="flex items-center gap-2 rounded-lg border border-[#001871]/20 bg-[#001871] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#002a9e] transition-colors"
            >
              <FileText size={14} />
              Formulario creacion clientes/contratos
            </button>
          </div>
        )}
        <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
            <Briefcase size={28} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <p className="mt-6 text-sm font-semibold text-slate-800">
            {gerenteOSocio ? 'Sin clientes en el directorio' : 'Sin clientes en cartera'}
          </p>
          <p className="mt-2 max-w-md text-xs text-slate-500 leading-relaxed">
            {gerenteOSocio
              ? 'No se encontraron clientes con el filtro seleccionado.'
              : 'Aún no tienes empresas asignadas. Si deberías verlas aquí, contacta a tu supervisor o al área comercial.'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="border-b border-slate-200/90 pb-6 mb-8">
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
          Relaciones comerciales
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2
              className="text-xl font-semibold tracking-tight sm:text-2xl"
              style={{ color: BRAND }}
            >
              {gerenteOSocio ? 'Directorio de clientes' : 'Mis clientes asignados'}
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              <span className="font-medium text-slate-800">{clientesFiltrados.length}</span>
              {clientesFiltrados.length === 1 ? ' cliente' : ' clientes'}
              {gerenteOSocio ? ' en el directorio' : ' bajo su responsabilidad'}
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {filtros.map((f) => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => setEstadoFiltro(f.value)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    estadoFiltro === f.value
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-white text-blue-600 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Icon size={12} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {empleadoData?.acceso_formularios_sqf && (
              <button
                type="button"
                onClick={() => navigate('/app/sqf')}
                className="flex items-center gap-2 rounded-lg border border-[#001871]/20 bg-[#001871] px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#002a9e] transition-colors"
              >
                <FileText size={14} />
                Formulario creacion clientes/contratos
              </button>
            )}
          </div>
        </div>
      </div>

      {activeTab === 'organigrama' ? (
        <div
          className="rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden"
          style={{ height: 'calc(100vh - 16rem)' }}
        >
          <OrganigramaClientes areaId={null} />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <div className="grid grid-cols-[1fr_auto] gap-0 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:px-5">
            <span>Empresa</span>
            <span className="hidden sm:inline text-right pr-1">Acción</span>
          </div>

          <ul className="divide-y divide-slate-100">
            {clientesFiltrados.map((cliente) => {
              const estadoKey = cliente.estado || 'inactivo';
              const estadoClass = ESTADO_STYLES[estadoKey] || ESTADO_STYLES.inactivo;

              return (
                <li key={cliente.id}>
                  <button
                    type="button"
                    onClick={() => navigate(`/app/cliente/${cliente.id}`)}
                    className="group flex w-full items-stretch gap-0 text-left transition-colors hover:bg-slate-50/90 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0a2540]/20"
                  >
                    <span
                      className="w-1 shrink-0 bg-transparent transition-colors group-hover:bg-[#0a2540]"
                      aria-hidden
                    />
                    <div className="flex min-w-0 flex-1 items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-sm font-semibold tracking-tight text-[#0a2540] shadow-sm"
                        aria-hidden
                      >
                        {(cliente.razon_social || 'C').charAt(0).toUpperCase()}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
                          <h3 className="truncate text-[15px] font-semibold text-slate-900 sm:text-base">
                            {cliente.razon_social}
                          </h3>
                          <Badge className={estadoClass}>
                            {cliente.estado_display || estadoKey}
                          </Badge>
                          {cliente.nivel_riesgo !== 'bajo' && (
                            <Badge className="border-amber-300/70 bg-amber-50/80 text-amber-900">
                              <AlertTriangle size={10} className="opacity-80" strokeWidth={2.5} />
                              {cliente.nivel_riesgo_display}
                            </Badge>
                          )}
                        </div>

                        <dl className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                          <div>
                            <dt className="sr-only">NIT</dt>
                            <dd>
                              <span className="font-medium text-slate-600">NIT</span>{' '}
                              <span className="font-mono text-slate-700">{cliente.nit}</span>
                            </dd>
                          </div>
                          {cliente.ciudad && (
                            <>
                              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                                ·
                              </span>
                              <div>
                                <dt className="sr-only">Ciudad</dt>
                                <dd>{cliente.ciudad}</dd>
                              </div>
                            </>
                          )}
                          {cliente.tipo_empresa && (
                            <>
                              <span className="hidden text-slate-300 sm:inline" aria-hidden>
                                ·
                              </span>
                              <div>
                                <dt className="sr-only">Tipo</dt>
                                <dd className="capitalize text-slate-600">
                                  {cliente.tipo_empresa_display || cliente.tipo_empresa}
                                </dd>
                              </div>
                            </>
                          )}
                        </dl>

                        {cliente.contacto_principal && (
                          <p className="mt-2 border-t border-slate-100 pt-2 text-[11px] leading-snug text-slate-500 sm:border-0 sm:pt-0">
                            <span className="font-medium text-slate-600">Contacto principal:</span>{' '}
                            {cliente.contacto_principal.nombre}
                            {cliente.contacto_principal.cargo && (
                              <span className="text-slate-400">
                                {' '}
                                · {cliente.contacto_principal.cargo}
                              </span>
                            )}
                          </p>
                        )}
                      </div>

                      <div className="hidden shrink-0 items-center sm:flex">
                        <span className="rounded-md border border-transparent px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 transition-colors group-hover:border-slate-200 group-hover:bg-white group-hover:text-[#0a2540]">
                          Ver ficha
                        </span>
                        <ChevronRight
                          size={18}
                          className="ml-1 text-slate-300 transition-colors group-hover:text-[#0a2540]"
                          strokeWidth={2}
                        />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
