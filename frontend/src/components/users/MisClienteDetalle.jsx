import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Loader2, AlertTriangle, Mail, Phone, MapPin,
  Users, Briefcase,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { getMisClientes, getEmpresa } from '../../lib/api';

const Badge = ({ children, className = '' }) => (
  <span
    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${className}`}
  >
    {children}
  </span>
);

const ESTADO_STYLES = {
  activo:     'border-blue-200 bg-blue-50 text-blue-700',
  prospecto:  'border-slate-200 bg-slate-100 text-slate-700',
  inactivo:   'border-slate-200 bg-slate-50 text-slate-600',
  suspendido: 'border-blue-200 bg-blue-100 text-blue-800',
  retirado:   'border-slate-200 bg-slate-50 text-slate-600',
};

export default function MisClienteDetalle() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { empleadoData } = useAuth();
  const [empresa, setEmpresa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!empleadoData?.id_empleado || !id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        setForbidden(false);

        const mis = await getMisClientes(empleadoData.id_empleado);
        const permitidos = new Set((mis?.clientes || []).map((c) => String(c.id)));
        if (!permitidos.has(String(id))) {
          setForbidden(true);
          setEmpresa(null);
          return;
        }

        const data = await getEmpresa(id);
        setEmpresa(data);
      } catch (err) {
        console.error('Error cargando cliente:', err);
        setError('No se pudo cargar la información del cliente');
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [empleadoData?.id_empleado, id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-sm">
          <Loader2 size={22} className="animate-spin text-blue-600" strokeWidth={2} />
        </div>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Cargando ficha</p>
        <p className="mt-1 text-sm text-slate-600">Obteniendo datos del cliente…</p>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-blue-200 bg-blue-50/80">
          <AlertTriangle size={26} className="text-blue-600" strokeWidth={1.75} />
        </div>
        <p className="mt-5 text-sm font-semibold text-slate-800">Sin acceso a este cliente</p>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Solo puede consultar empresas asignadas a su cartera.
        </p>
        <button
          type="button"
          onClick={() => navigate('/app/mis-clientes')}
          className="mt-8 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-colors hover:text-[#001e33]"
        >
          Volver a mis clientes
        </button>
      </div>
    );
  }

  if (error || !empresa) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <p className="text-sm text-slate-600">{error || 'Cliente no encontrado'}</p>
        <button
          type="button"
          onClick={() => navigate('/app/mis-clientes')}
          className="mt-6 text-[10px] font-bold uppercase tracking-widest text-blue-600 transition-colors hover:text-[#001e33]"
        >
          Volver a mis clientes
        </button>
      </div>
    );
  }

  const estadoKey = empresa.estado || 'inactivo';
  const estadoClass = ESTADO_STYLES[estadoKey] || ESTADO_STYLES.inactivo;

  return (
    <div className="animate-in fade-in duration-500">
      <button
        type="button"
        onClick={() => navigate('/app/mis-clientes')}
        className="mb-6 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 transition-colors hover:text-blue-600"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Mis clientes
      </button>

      <div className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/80 to-white px-6 py-6 sm:px-8">
          <div className="flex flex-wrap items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-100 bg-blue-50 text-lg font-bold text-blue-600 shadow-sm">
              {(empresa.razon_social || 'C').charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-[#001e33] sm:text-xl">{empresa.razon_social}</h2>
                <Badge className={estadoClass}>{empresa.estado_display || estadoKey}</Badge>
                {empresa.nivel_riesgo && empresa.nivel_riesgo !== 'bajo' && (
                  <Badge className="border-blue-200 bg-blue-50 text-blue-700">
                    <AlertTriangle size={10} strokeWidth={2.5} />
                    {empresa.nivel_riesgo_display || empresa.nivel_riesgo}
                  </Badge>
                )}
              </div>
              <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                <span className="font-mono font-medium text-slate-800">NIT {empresa.nit}</span>
                {empresa.tipo_empresa_display && (
                  <span className="capitalize text-slate-500">{empresa.tipo_empresa_display}</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-8 p-6 sm:grid-cols-2 sm:p-8">
          <div>
            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Building2 size={14} className="text-blue-600" strokeWidth={2} />
              Datos generales
            </h3>
            <dl className="space-y-4 text-sm">
              {(empresa.ciudad || empresa.departamento) && (
                <div className="flex gap-3">
                  <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600/70" strokeWidth={2} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Ubicación</dt>
                    <dd className="mt-0.5 text-slate-800">
                      {[empresa.ciudad, empresa.departamento].filter(Boolean).join(', ')}
                    </dd>
                  </div>
                </div>
              )}
              {empresa.direccion && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Dirección</dt>
                  <dd className="mt-0.5 text-slate-800">{empresa.direccion}</dd>
                </div>
              )}
              {empresa.email_principal && (
                <div className="flex gap-3">
                  <Mail size={16} className="mt-0.5 shrink-0 text-blue-600/70" strokeWidth={2} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Correo</dt>
                    <dd className="mt-0.5">
                      <a href={`mailto:${empresa.email_principal}`} className="font-medium text-blue-600 hover:text-[#001e33] hover:underline">
                        {empresa.email_principal}
                      </a>
                    </dd>
                  </div>
                </div>
              )}
              {empresa.telefono && (
                <div className="flex gap-3">
                  <Phone size={16} className="mt-0.5 shrink-0 text-blue-600/70" strokeWidth={2} />
                  <div>
                    <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Teléfono</dt>
                    <dd className="mt-0.5 text-slate-800">{empresa.telefono}</dd>
                  </div>
                </div>
              )}
              {empresa.fecha_inicio_relacion && (
                <div>
                  <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Inicio de relación</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {new Date(empresa.fecha_inicio_relacion).toLocaleDateString('es-CO', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {Array.isArray(empresa.contactos) && empresa.contactos.length > 0 && (
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <Users size={14} className="text-blue-600" strokeWidth={2} />
                Contactos
              </h3>
              <ul className="space-y-3">
                {empresa.contactos.filter((c) => c.activo !== false).map((c) => (
                  <li key={c.id} className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 text-sm">
                    <p className="font-semibold text-[#001e33]">
                      {c.nombre}
                      {c.es_principal && (
                        <Badge className="ml-2 border-blue-200 bg-blue-50 text-blue-700">Principal</Badge>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-600">{c.cargo_display || c.cargo}</p>
                    {c.email && <p className="mt-1 text-xs text-blue-600">{c.email}</p>}
                    {c.telefono && <p className="mt-0.5 text-xs text-slate-600">{c.telefono}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {Array.isArray(empresa.servicios) && empresa.servicios.length > 0 && (
          <div className="border-t border-slate-100 px-6 py-6 sm:px-8">
            <h3 className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <Briefcase size={14} className="text-blue-600" strokeWidth={2} />
              Servicios
            </h3>
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-lg border border-slate-200">
              {empresa.servicios.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 bg-white px-4 py-3 text-sm">
                  <span className="text-slate-800">
                    {(s.descripcion && s.descripcion.trim()) || s.area_nombre || 'Servicio contratado'}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
                    {s.estado_display || s.estado}
                    {s.area_nombre ? ` · ${s.area_nombre}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
