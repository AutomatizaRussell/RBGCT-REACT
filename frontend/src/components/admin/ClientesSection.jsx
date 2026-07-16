import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Building2, Plus, Search, X, List, Users, BookOpen, Phone, Mail, Globe, MapPin,
  AlertTriangle, ExternalLink, Briefcase, ChevronDown, ChevronUp,
  Clock, Download, Sheet, Trash2, RefreshCw, Network, GitBranch, User,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OrganigramaClientes from '../clientes/OrganigramaClientes';
import {
  fetchApi,
  getEmpresas,
  getEmpresaPorAreas,
  getEmpresaContactos,
  getEmpresaBitacora,
  getAllAreas,
  getAllEmpleados,
  getEmpleadoById,
  createContacto,
  deleteContacto,
  updateServicio,
  deleteServicio,
  createBitacora,
  deleteBitacora,
} from '../../lib/api';
import {
  exportClientesListaExcel,
  exportClientesListaPDF,
  exportClienteExcel,
  exportClientePDF,
} from '../../lib/exports';

// ── Helpers de API que no están exportados en api.js ─────────────────────────
// Se infieren los endpoints del bundle; ajustar si el backend usa rutas distintas.

const createServicio = (data) =>
  fetchApi('/clientes/servicios/', { method: 'POST', body: JSON.stringify(data) });

const createEquipo = (data) =>
  fetchApi('/clientes/equipos/', { method: 'POST', body: JSON.stringify(data) });

const createEquipoMiembro = (equipoId, data) =>
  fetchApi(`/clientes/equipos/${equipoId}/agregar_miembro/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

const deactivateEquipoMiembro = (equipoId, miembroId) =>
  fetchApi(`/clientes/equipos/${equipoId}/quitar_miembro/`, {
    method: 'POST',
    body: JSON.stringify({ miembro_id: miembroId }),
  });

const deleteEquipo = (id) =>
  fetchApi(`/clientes/equipos/${id}/`, { method: 'DELETE' });

const assignAreasToCliente = (empresaId, areaIds) =>
  fetchApi(`/clientes/empresas/${empresaId}/asignar_areas/`, {
    method: 'POST',
    body: JSON.stringify({ areas: areaIds }),
  });

const desasignarArea = (empresaId, areaId) =>
  fetchApi(`/clientes/empresas/${empresaId}/desasignar_area/`, {
    method: 'POST',
    body: JSON.stringify({ area_id: areaId }),
  });

const importarClientesDesdeSQF = (soloNuevos = true) =>
  fetchApi(`/clientes/empresas/importar_desde_n8n/`, {
    method: 'POST',
    body: JSON.stringify({ solo_nuevos: soloNuevos }),
  });

// ── Paletas y constantes ──────────────────────────────────────────────────────

const ESTADO_C = {
  activo: { bg: 'bg-emerald-100', text: 'text-emerald-700', hex: '#10b981' },
  prospecto: { bg: 'bg-blue-100', text: 'text-blue-700', hex: '#3b82f6' },
  inactivo: { bg: 'bg-slate-100', text: 'text-slate-500', hex: '#94a3b8' },
  suspendido: { bg: 'bg-amber-100', text: 'text-amber-700', hex: '#f59e0b' },
  retirado: { bg: 'bg-red-100', text: 'text-red-600', hex: '#ef4444' },
};

const RIESGO_C = {
  bajo: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', hex: '#10b981' },
  medio: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', hex: '#f59e0b' },
  alto: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', hex: '#f97316' },
  critico: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', hex: '#ef4444' },
};

const AREA_PAL = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#6366f1'];

const ROL_LABELS = {
  gerente: 'Gerente',
  senior: 'Senior',
  lider_equipo: 'Líder de contrato',
  semi_senior: 'Semi-senior',
  analista: 'Analista',
  asistente: 'Asistente',
  revisor: 'Revisor',
  apoyo: 'Apoyo',
};

const SERV_ESTADO_C = {
  activo: 'bg-emerald-100 text-emerald-700',
  pausado: 'bg-amber-100 text-amber-700',
  terminado: 'bg-slate-100 text-slate-600',
};

const BIT_C = {
  reunion: 'bg-blue-100 text-blue-700',
  llamada: 'bg-emerald-100 text-emerald-700',
  visita: 'bg-purple-100 text-purple-700',
  email: 'bg-slate-100 text-slate-600',
  entrega: 'bg-amber-100 text-amber-700',
  novedad: 'bg-orange-100 text-orange-700',
  otro: 'bg-slate-100 text-slate-500',
};

const BIT_L = {
  reunion: 'Reunión',
  llamada: 'Llamada',
  visita: 'Visita',
  email: 'Correo',
  entrega: 'Entrega',
  novedad: 'Novedad',
  otro: 'Otro',
};

const CARGOS_OPTIONS = [
  ['representante_legal', 'Representante Legal'],
  ['gerente', 'Gerente General'],
  ['contador', 'Contador'],
  ['auxiliar_contable', 'Auxiliar Contable'],
  ['abogado', 'Abogado'],
  ['tesoreria', 'Tesorería'],
  ['rrhh', 'RRHH'],
  ['revisor_fiscal', 'Revisor Fiscal'],
  ['otro', 'Otro'],
];

// ── Utilidades ────────────────────────────────────────────────────────────────

function Badge({ children, className = '' }) {
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>{children}</span>;
}

function isGerenteOSocio(empleado) {
  const cargo = (empleado?.nombre_cargo || empleado?.cargo_nombre || '').toLowerCase();
  const nivel = (empleado?.cargo_nivel || '').toLowerCase();
  return cargo.includes('gerente') || nivel.includes('gerente') || cargo.includes('socio') || nivel.includes('socio');
}

function isGerente(empleado) {
  const t = (empleado?.cargo_nivel || '').toLowerCase();
  const n = (empleado?.nombre_cargo || empleado?.cargo_nombre || '').toLowerCase();
  return t.includes('gerente') || n.includes('gerente');
}

function inferRole(empleado) {
  const t = (empleado?.cargo_nivel || '').toLowerCase();
  const n = (empleado?.nombre_cargo || '').toLowerCase();
  if (t.includes('gerente') || n.includes('gerente')) return 'gerente';
  if (n.includes('lider') || n.includes('líder')) return 'lider_equipo';
  if (n.includes('semi')) return 'semi_senior';
  if (n.includes('senior')) return 'senior';
  if (n.includes('analista')) return 'analista';
  if (n.includes('asistente')) return 'asistente';
  if (n.includes('revisor')) return 'revisor';
  return 'apoyo';
}

function countRoles(roles) {
  const counts = {
    gerente: 0, senior: 0, analista: 0, asistente: 0, lider_equipo: 0,
    semi_senior: 0, revisor: 0, apoyo: 0,
  };
  roles.forEach((r) => { counts[r] = (counts[r] || 0) + 1; });
  return counts;
}

function checkTriarchy(roles) {
  const counts = countRoles(roles);
  const missing = [];
  if (counts.gerente < 1) missing.push('1 gerente');
  if (counts.senior < 1) missing.push('1 senior');
  if (counts.analista + counts.asistente < 1) missing.push('1 analista o asistente');
  return { ok: missing.length === 0, missing, counts };
}

function checkTriarchyForEmpleados(empleados) {
  return checkTriarchy(empleados.map(inferRole));
}

function triarchyMessage(missing) {
  return `El contrato no cumple la triarquía mínima. Faltan: ${missing.join(', ')}. Activa “Contrato especial” si es una excepción.`;
}

function initials(name) {
  return (name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ── ServicioRow ───────────────────────────────────────────────────────────────

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
          {s.valor_mensual && (
            <span className="text-emerald-600 font-semibold">$ {Number(s.valor_mensual).toLocaleString('es-CO')}</span>
          )}
        </div>
      </div>
      <div className="flex gap-1 ml-2 flex-shrink-0">
        <button
          onClick={() => onToggle(s)}
          title={s.estado === 'activo' ? 'Pausar' : 'Activar'}
          className="p-1 text-slate-300 hover:text-amber-500 rounded hover:bg-amber-50 transition-colors"
        >
          <Clock size={13} />
        </button>
        <button
          onClick={() => onDelete(s.id)}
          className="p-1 text-slate-300 hover:text-red-400 rounded hover:bg-red-50 transition-colors"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ── NuevoServicioModal ────────────────────────────────────────────────────────

function NuevoServicioModal({ empresaId, areaId, areaNombre, onCreated, onClose }) {
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('El nombre del servicio es obligatorio.');
      return;
    }
    setSaving(true);
    try {
      const nuevo = await createServicio({
        empresa: empresaId,
        area: areaId,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        fecha_inicio: new Date().toISOString().slice(0, 10),
        estado: 'activo',
        periodicidad: 'mensual',
      });
      onCreated(nuevo);
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Nuevo servicio · {areaNombre}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del servicio *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Outsourcing de nómina"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Detalle del servicio"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 resize-none"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !nombre.trim()}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : 'Crear servicio'}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── CrearContratoModal ───────────────────────────────────────────────────────

function CrearContratoModal({ empresaId, bloque, equipoPadreId = null, equipoPadreNombre = '', empleados, puedeGestionar, onSaved, onClose, onRefresh }) {
  const esSubcontrato = !!equipoPadreId;
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [servicios, setServicios] = useState(bloque.servicios || []);
  const [servicioSeleccionado, setServicioSeleccionado] = useState('');
  const [showNuevoServicio, setShowNuevoServicio] = useState(false);
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [especial, setEspecial] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setServicios(bloque.servicios || []);
  }, [bloque.servicios]);

  const filtrados = empleados.filter((em) =>
    em.area == bloque.area_id &&
    (!busqueda || `${em.primer_nombre} ${em.primer_apellido}`.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const toggle = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const idsFiltrados = filtrados.map((e) => e.id_empleado);
  const todosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => seleccionados.has(id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { alert('Escribe un nombre para el contrato.'); return; }
    if (seleccionados.size === 0) { alert('Selecciona al menos un empleado.'); return; }

    const seleccionadosList = Array.from(seleccionados)
      .map((id) => empleados.find((em) => em.id_empleado == id))
      .filter(Boolean);

    if (!especial) {
      const { ok, missing } = checkTriarchyForEmpleados(seleccionadosList);
      if (!ok) { alert(triarchyMessage(missing)); return; }
    }

    setSaving(true);
    try {
      const empleadosMap = new Map(empleados.map((em) => [em.id_empleado, em]));
      const nuevoEquipo = await createEquipo({
        empresa: empresaId,
        area: bloque.area_id,
        servicio: servicioSeleccionado || null,
        equipo_padre: equipoPadreId || null,
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined,
        estado: 'activo',
        fecha_inicio: fechaInicio,
        activo: true,
        especial,
      });

      let agregados = 0;
      for (const id of seleccionados) {
        const em = empleadosMap.get(id) || {};
        try {
          await createEquipoMiembro(nuevoEquipo.id, {
            empleado: id,
            rol: inferRole(em),
            fecha_inicio: fechaInicio,
            activo: true,
          });
          agregados += 1;
        } catch (err) {
          console.error('Error agregando miembro', id, err);
        }
      }
      if (agregados < seleccionados.size) {
        alert(`Contrato creado, pero solo se agregaron ${agregados} de ${seleccionados.size} miembros.`);
      }
      onSaved();
      onRefresh?.();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">
            {esSubcontrato ? `Crear sub-contrato · ${equipoPadreNombre || ''}` : `Crear contrato · ${bloque.area_nombre}`}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Nombre del contrato *</label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej. Contrato de contabilidad gerente A"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Descripción</label>
            <textarea
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              rows={2}
              placeholder="Propósito o proceso del contrato"
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30 resize-none"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Empleados</label>
              <span className="text-[11px] text-purple-600 font-medium">Pueden pertenecer a varios contratos</span>
            </div>
            <div className="relative mb-2">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder={`Buscar en ${filtrados.length} empleados…`}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            {filtrados.length === 0 ? (
              <p className="text-xs text-amber-600 py-2 flex items-center gap-1.5">
                <AlertTriangle size={11} /> No hay empleados disponibles para asignar.
              </p>
            ) : (
              <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 pb-1 border-b border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={() => {
                      setSeleccionados((prev) => {
                        const next = new Set(prev);
                        if (todosSeleccionados) idsFiltrados.forEach((id) => next.delete(id));
                        else idsFiltrados.forEach((id) => next.add(id));
                        return next;
                      });
                    }}
                  />
                  Seleccionar todos
                </label>
                {filtrados.map((em) => {
                  const esDelArea = em.area == bloque.area_id;
                  return (
                    <label key={em.id_empleado} className={`flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer ${esDelArea ? 'bg-purple-50/60 hover:bg-purple-50' : 'hover:bg-slate-50'}`}>
                      <input
                        type="checkbox"
                        checked={seleccionados.has(em.id_empleado)}
                        onChange={() => toggle(em.id_empleado)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-slate-700 truncate">{em.primer_nombre} {em.primer_apellido}</p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {em.nombre_cargo || 'Sin cargo'}
                          {em.area_nombre ? ` · ${em.area_nombre}` : ''}
                          {esDelArea && <span className="ml-1 text-purple-600 font-medium">· área</span>}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
            {seleccionados.size > 0 && (
              <p className="text-[11px] text-purple-600 mt-1">{seleccionados.size} seleccionado(s)</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de inicio *</label>
            <input
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          {seleccionados.size > 0 && (
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500 mb-1">Roles asignados según cargo actual:</p>
              <div className="space-y-1">
                {Array.from(seleccionados).map((id) => {
                  const em = empleados.find((x) => x.id_empleado == id);
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span className="text-slate-700">{em?.primer_nombre} {em?.primer_apellido}</span>
                      <Badge className="bg-purple-100 text-purple-700">{ROL_LABELS[inferRole(em)]}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Servicio (opcional)</label>
            <select
              value={servicioSeleccionado}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__crear__') { setShowNuevoServicio(true); setServicioSeleccionado(''); }
                else setServicioSeleccionado(v);
              }}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            >
              <option value="">— Sin servicio específico —</option>
              {servicios.map((s) => (
                <option key={s.id} value={s.id}>{s.descripcion || s.nombre || `Servicio #${s.id}`}</option>
              ))}
              {puedeGestionar && <option value="__crear__">+ Agregar nuevo servicio…</option>}
            </select>
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer">
            <input type="checkbox" checked={especial} onChange={(e) => setEspecial(e.target.checked)} className="mt-0.5" />
            <span>
              <span className="font-medium">Contrato especial</span>
              {' — no requiere la triarquía mínima (1 gerente, 1 senior y 1 analista/asistente).'}
            </span>
          </label>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || !nombre.trim() || seleccionados.size === 0}
              className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {saving
                ? 'Guardando…'
                : `${esSubcontrato ? 'Crear sub-contrato' : 'Crear contrato'} ${seleccionados.size ? `(${seleccionados.size})` : ''}`
              }
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      </div>
      {showNuevoServicio && (
        <NuevoServicioModal
          empresaId={empresaId}
          areaId={bloque.area_id}
          areaNombre={bloque.area_nombre}
          onCreated={(nuevo) => {
            setServicios((prev) => [nuevo, ...prev]);
            setServicioSeleccionado(String(nuevo.id));
            setShowNuevoServicio(false);
            onRefresh?.();
          }}
          onClose={() => setShowNuevoServicio(false)}
        />
      )}
    </div>
  );
}

// ── AgregarMiembrosForm ──────────────────────────────────────────────────────

function AgregarMiembrosForm({ equipo, empleados, onSaved, onClose }) {
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [busqueda, setBusqueda] = useState('');
  const [fechaInicio, setFechaInicio] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const filtrados = empleados.filter((em) =>
    em.area == equipo.area_id &&
    (!busqueda || `${em.primer_nombre} ${em.primer_apellido}`.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const toggle = (id) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const idsFiltrados = filtrados.map((e) => e.id_empleado);
  const todosSeleccionados = idsFiltrados.length > 0 && idsFiltrados.every((id) => seleccionados.has(id));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seleccionados.size === 0) { alert('Selecciona al menos un empleado.'); return; }

    const seleccionadosList = Array.from(seleccionados)
      .map((id) => empleados.find((em) => em.id_empleado == id))
      .filter(Boolean);

    if (!equipo.especial) {
      const actuales = (equipo.miembros || []).map((m) => m.rol);
      const nuevos = seleccionadosList.map(inferRole);
      const { ok, missing } = checkTriarchy([...actuales, ...nuevos]);
      if (!ok) { alert(triarchyMessage(missing)); return; }
    }

    setSaving(true);
    const empleadosMap = new Map(empleados.map((em) => [em.id_empleado, em]));
    let agregados = 0;
    try {
      for (const id of seleccionados) {
        const em = empleadosMap.get(id) || {};
        try {
          await createEquipoMiembro(equipo.id, {
            empleado: id,
            rol: inferRole(em),
            fecha_inicio: fechaInicio,
            activo: true,
          });
          agregados += 1;
        } catch (err) {
          console.error('Error agregando miembro', id, err);
        }
      }
      setSaving(false);
      if (agregados < seleccionados.size) alert(`Se agregaron ${agregados} de ${seleccionados.size} miembros.`);
      onSaved();
    } catch (err) {
      setSaving(false);
      alert(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Agregar miembros al contrato</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Empleados</label>
            <div className="relative my-1.5">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar empleado…"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
            </div>
            {filtrados.length === 0 ? (
              <p className="text-xs text-slate-400">Sin empleados disponibles.</p>
            ) : (
              <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600 pb-1 border-b border-slate-100 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={todosSeleccionados}
                    onChange={() => {
                      setSeleccionados((prev) => {
                        const next = new Set(prev);
                        if (todosSeleccionados) idsFiltrados.forEach((id) => next.delete(id));
                        else idsFiltrados.forEach((id) => next.add(id));
                        return next;
                      });
                    }}
                  />
                  Seleccionar todos
                </label>
                {filtrados.map((em) => (
                  <label key={em.id_empleado} className="flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer hover:bg-purple-50">
                    <input
                      type="checkbox"
                      checked={seleccionados.has(em.id_empleado)}
                      onChange={() => toggle(em.id_empleado)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-700 truncate">{em.primer_nombre} {em.primer_apellido}</p>
                      <p className="text-[10px] text-slate-400 truncate">
                        {em.nombre_cargo || 'Sin cargo'}
                        {em.area_nombre ? ` · ${em.area_nombre}` : ''}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Fecha de inicio *</label>
            <input
              type="date"
              required
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
              className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/30"
            />
          </div>
          {seleccionados.size > 0 && (
            <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
              <p className="text-[11px] font-medium text-slate-500 mb-1">Roles inferidos:</p>
              <div className="space-y-1">
                {Array.from(seleccionados).map((id) => {
                  const em = empleados.find((x) => x.id_empleado == id);
                  return (
                    <div key={id} className="flex justify-between text-xs">
                      <span className="text-slate-700">{em?.primer_nombre} {em?.primer_apellido}</span>
                      <Badge className="bg-purple-100 text-purple-700">{ROL_LABELS[inferRole(em)]}</Badge>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || seleccionados.size === 0}
              className="flex-1 px-3 py-1.5 bg-purple-600 text-white text-xs rounded-lg hover:bg-purple-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : `Agregar ${seleccionados.size ? `(${seleccionados.size})` : ''}`}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── EmpleadoModal ─────────────────────────────────────────────────────────────-

function EmpleadoModal({ empleado, onClose }) {
  const [detalle, setDetalle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getEmpleadoById(empleado.empleado_id || empleado.id)
      .then((data) => { if (!cancelled) setDetalle(data); })
      .catch((err) => { if (!cancelled) alert(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [empleado]);

  const o = detalle?.empleado || {};
  const clientes = detalle?.clientes || [];
  const nombre = o.nombre || empleado.empleado_nombre || `Empleado #${empleado.empleado_id}`;
  const cargo = o.cargo || empleado.empleado_cargo || 'Sin cargo';
  const area = o.area || empleado.area_nombre || '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Tarjeta del colaborador</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
              {initials(nombre)}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800">{nombre}</p>
              <p className="text-xs text-slate-500">{cargo}{area ? ` · ${area}` : ''}</p>
              {o.correo && <p className="text-[11px] text-slate-400">{o.correo}</p>}
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-8"><div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
          ) : clientes.length === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <User size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-xs">Sin clientes asignados</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Clientes asignados</p>
              {clientes.map(({ empresa: emp, contratos: cts }) => (
                <div key={emp.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold text-slate-700">{emp.razon_social}</p>
                    <Badge className={`${ESTADO_C[emp.estado]?.bg} ${ESTADO_C[emp.estado]?.text}`}>{emp.estado_display}</Badge>
                  </div>
                  <div className="space-y-1">
                    {cts.map((ct) => (
                      <div key={ct.id} className="flex items-center justify-between text-xs bg-white rounded-lg px-2 py-1.5 border border-slate-100">
                        <span className="text-slate-700 truncate">{ct.nombre}</span>
                        <Badge className="bg-purple-100 text-purple-700">{ROL_LABELS[ct.rol] || ct.rol}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── EquipoTree (contrato recursivo) ───────────────────────────────────────────

function EquipoTree({ equipo, bloque, empresaId, empleados, onRefresh, puedeGestionar, nivel = 0 }) {
  const [open, setOpen] = useState(true);
  const [showAddMembers, setShowAddMembers] = useState(false);
  const [showSubcontract, setShowSubcontract] = useState(false);
  const [selectedEmpleado, setSelectedEmpleado] = useState(null);

  const handleDeactivateMember = async (miembroId) => {
    if (!confirm('¿Desactivar este miembro del contrato?')) return;
    try {
      await deactivateEquipoMiembro(equipo.id, miembroId);
      onRefresh();
    } catch (err) { alert(err.message); }
  };

  const handleDeleteContract = async () => {
    if (!confirm('¿Eliminar este contrato? También se desactivarán sus sub-contratos.')) return;
    try { await deleteEquipo(equipo.id); onRefresh(); } catch (err) { alert(err.message); }
  };

  const miembros = equipo.miembros || [];
  const subEquipos = equipo.sub_equipos || [];

  return (
    <div className={`rounded-xl border border-slate-100 bg-white overflow-hidden ${nivel > 0 ? 'ml-4' : ''}`}>
      <div className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 gap-2">
        <button type="button" onClick={() => setOpen((o) => !o)} className="flex-1 flex items-center gap-2 text-left min-w-0">
          <Briefcase size={14} className={`flex-shrink-0 ${nivel > 0 ? 'text-teal-600' : 'text-purple-600'}`} />
          <span className="text-xs font-semibold text-slate-700 truncate">{equipo.nombre}</span>
          {equipo.especial && <Badge className="bg-amber-100 text-amber-700 border border-amber-200 flex-shrink-0">Especial</Badge>}
          <span className="text-[10px] text-slate-400 flex-shrink-0">
            {miembros.length} miembro{miembros.length === 1 ? '' : 's'}
            {subEquipos.length > 0 && ` · ${subEquipos.length} sub-contrato${subEquipos.length === 1 ? '' : 's'}`}
          </span>
        </button>
        <div className="flex items-center justify-end gap-1 flex-shrink-0">
          {puedeGestionar && (
            <>
              <button
                type="button"
                onClick={() => setShowAddMembers(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded-md whitespace-nowrap"
                title="Agregar miembro"
              >
                <Plus size={12} />
                <span>Miembro</span>
              </button>
              <button
                type="button"
                onClick={() => setShowSubcontract(true)}
                className="inline-flex items-center gap-1 px-2 py-1 text-[11px] text-teal-600 hover:text-teal-800 hover:bg-teal-50 rounded-md whitespace-nowrap"
                title="Crear sub-contrato"
              >
                <GitBranch size={12} />
                <span>Sub-contrato</span>
              </button>
              <button
                type="button"
                onClick={handleDeleteContract}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md"
                title="Eliminar contrato"
              >
                <Trash2 size={12} />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
            title={open ? 'Contraer' : 'Expandir'}
          >
            {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="px-3 pb-3 space-y-1.5">
          {miembros.length === 0 && subEquipos.length === 0 && (
            <p className="text-xs text-slate-300 italic">Sin miembros ni sub-contratos</p>
          )}
          {miembros.map((m) => (
            <div key={m.id} className="flex items-center justify-between py-1.5 px-2 bg-slate-50 rounded-lg">
              <button type="button" onClick={() => setSelectedEmpleado(m)} className="flex items-center gap-2 text-left">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-[9px] font-bold">
                  {initials(m.empleado_nombre)}
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-700">{m.empleado_nombre}</p>
                  <Badge className="bg-purple-100 text-purple-700">{ROL_LABELS[m.rol] || m.rol}</Badge>
                </div>
              </button>
              {puedeGestionar && (
                <button
                  type="button"
                  onClick={() => handleDeactivateMember(m.id)}
                  className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                  title="Quitar miembro"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          ))}
          {subEquipos.map((sub) => (
            <EquipoTree
              key={sub.id}
              equipo={sub}
              bloque={bloque}
              empresaId={empresaId}
              empleados={empleados}
              onRefresh={onRefresh}
              puedeGestionar={puedeGestionar}
              nivel={nivel + 1}
            />
          ))}
        </div>
      )}
      {showAddMembers && (
        <AgregarMiembrosForm
          equipo={equipo}
          empleados={empleados}
          onSaved={() => { setShowAddMembers(false); onRefresh(); }}
          onClose={() => setShowAddMembers(false)}
        />
      )}
      {showSubcontract && (
        <CrearContratoModal
          empresaId={empresaId}
          bloque={bloque}
          equipoPadreId={equipo.id}
          equipoPadreNombre={equipo.nombre}
          empleados={empleados}
          puedeGestionar={puedeGestionar}
          onSaved={() => { setShowSubcontract(false); onRefresh(); }}
          onClose={() => setShowSubcontract(false)}
          onRefresh={onRefresh}
        />
      )}
      {selectedEmpleado && (
        <EmpleadoModal
          empleado={selectedEmpleado}
          onClose={() => setSelectedEmpleado(null)}
        />
      )}
    </div>
  );
}

// ── AreaCard ──────────────────────────────────────────────────────────────────

function AreaCard({ bloque, empresaId, empleados, onRefresh, colorIdx, puedeGestionarGlobal, empleadoData }) {
  const [open, setOpen] = useState(true);
  const [showCrearContrato, setShowCrearContrato] = useState(false);
  const [showNuevoServicio, setShowNuevoServicio] = useState(false);
  const color = AREA_PAL[colorIdx % AREA_PAL.length];

  const puedeGestionar = puedeGestionarGlobal || (isGerente(empleadoData) && empleadoData.area == bloque.area_id);

  const handleDesasignarArea = async (e) => {
    e.stopPropagation();
    if (!confirm(`¿Desasignar el área "${bloque.area_nombre}"? Se terminarán sus servicios y se desactivarán sus contratos.`)) return;
    try {
      await desasignarArea(empresaId, bloque.area_id);
      onRefresh();
    } catch (err) { alert(err.message); }
  };

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

  const totalFacturacion = bloque.servicios
    .filter((s) => s.estado === 'activo' && s.valor_mensual)
    .reduce((sum, s) => sum + Number(s.valor_mensual), 0);

  const equipos = bloque.equipos || [];

  return (
    <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer select-none hover:bg-slate-50 transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
          <div>
            <p className="text-sm font-bold text-slate-800">{bloque.area_nombre}</p>
            <p className="text-[11px] text-slate-400">
              {bloque.servicios.length} servicio(s) · {equipos.length} contrato(s)
              {totalFacturacion > 0 && <span className="ml-2 text-emerald-600 font-semibold">· ${totalFacturacion.toLocaleString('es-CO')}/mes</span>}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {puedeGestionar && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowCrearContrato(true); }}
                className="flex items-center gap-1 text-[11px] text-purple-600 hover:text-purple-800 font-medium"
              >
                <Plus size={11} /> Crear contrato
              </button>
              <button
                onClick={handleDesasignarArea}
                className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded"
                title="Desasignar área"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
          {bloque.servicios.some((s) => s.estado === 'activo') && <Badge className="bg-emerald-100 text-emerald-700">Activo</Badge>}
          {open ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </div>
      </div>
      {open && (
        <div className="px-4 pb-4 border-t border-slate-50">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Briefcase size={11} /> Servicios
                </p>
                {puedeGestionar && (
                  <button onClick={() => setShowNuevoServicio(true)} className="flex items-center gap-1 text-[11px] text-blue-600 hover:text-blue-800 font-medium">
                    <Plus size={11} /> Agregar servicio
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                {bloque.servicios.length === 0
                  ? <p className="text-xs text-slate-300 italic py-2">Sin servicios registrados</p>
                  : bloque.servicios.map((s) => <ServicioRow key={s.id} s={s} onDelete={handleDeleteServicio} onToggle={handleToggleServicio} />)
                }
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5">
                  <Users size={11} /> Contratos
                </p>
              </div>
              <div className="space-y-2">
                {equipos.length === 0
                  ? <p className="text-xs text-slate-300 italic py-2">Sin contratos creados</p>
                  : equipos.map((eq) => (
                    <EquipoTree
                      key={eq.id}
                      equipo={eq}
                      bloque={bloque}
                      empresaId={empresaId}
                      empleados={empleados}
                      onRefresh={onRefresh}
                      puedeGestionar={puedeGestionar}
                    />
                  ))
                }
              </div>
            </div>
          </div>
        </div>
      )}
      {showCrearContrato && (
        <CrearContratoModal
          empresaId={empresaId}
          bloque={bloque}
          empleados={empleados}
          puedeGestionar={puedeGestionar}
          onSaved={() => { setShowCrearContrato(false); onRefresh(); }}
          onClose={() => setShowCrearContrato(false)}
          onRefresh={onRefresh}
        />
      )}
      {showNuevoServicio && (
        <NuevoServicioModal
          empresaId={empresaId}
          areaId={bloque.area_id}
          areaNombre={bloque.area_nombre}
          onCreated={() => { setShowNuevoServicio(false); onRefresh(); }}
          onClose={() => setShowNuevoServicio(false)}
        />
      )}
    </div>
  );
}

// ── AsignarAreasModal ────────────────────────────────────────────────────────

function AsignarAreasModal({ empresaId, areasAsignadas, todasLasAreas, onSaved, onClose }) {
  const [seleccionadas, setSeleccionadas] = useState(new Set());
  const [saving, setSaving] = useState(false);

  const disponibles = (todasLasAreas || []).filter((a) => !areasAsignadas.includes(a.id_area));

  const toggle = (id) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (seleccionadas.size === 0) { alert('Selecciona al menos un área.'); return; }
    setSaving(true);
    try {
      await assignAreasToCliente(empresaId, Array.from(seleccionadas));
      onSaved();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-800">Asignar áreas al cliente</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {disponibles.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4">No hay áreas disponibles para asignar.</p>
          ) : (
            <div className="max-h-56 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1">
              {disponibles.map((a) => (
                <label key={a.id_area} className="flex items-center gap-2 text-xs p-1.5 rounded cursor-pointer hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={seleccionadas.has(a.id_area)}
                    onChange={() => toggle(a.id_area)}
                  />
                  <span className="text-slate-700">{a.nombre_area}</span>
                </label>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={saving || seleccionadas.size === 0 || disponibles.length === 0}
              className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Guardando…' : `Asignar ${seleccionadas.size ? `(${seleccionadas.size})` : ''}`}
            </button>
            <button type="button" onClick={onClose} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── AreasTab ───────────────────────────────────────────────────────────────────

function AreasTab({ empresaId, empresaEstado, onAreasCount, areaId = null }) {
  const { isAdmin, isSuperAdmin, empleadoData } = useAuth();
  const puedeGestionarGlobal = isAdmin || isSuperAdmin || isGerente(empleadoData);

  const [bloques, setBloques] = useState([]);
  const [todasLasAreas, setTodasLasAreas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAsignarAreas, setShowAsignarAreas] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, , e] = await Promise.all([
        getEmpresaPorAreas(empresaId),
        getAllAreas().then(setTodasLasAreas),
        getAllEmpleados(),
      ]);
      setBloques(b);
      setEmpleados(e);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  const bloquesFiltrados = useMemo(() =>
    areaId ? bloques.filter((b) => String(b.area_id) === String(areaId)) : bloques,
  [bloques, areaId]);

  useEffect(() => { onAreasCount?.(bloquesFiltrados.length); }, [bloquesFiltrados, onAreasCount]);

  if (loading) return (
    <div className="flex items-center justify-center py-10">
      <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const esActivo = empresaEstado === 'activo';
  const sinAreas = bloquesFiltrados.length === 0;
  const idsAsignados = bloques.map((b) => b.area_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">{sinAreas ? 'Sin áreas asignadas.' : `${bloquesFiltrados.length} área(s) prestando servicios`}</p>
        {puedeGestionarGlobal && (
          <button onClick={() => setShowAsignarAreas(true)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">
            <Plus size={13} /> Asignar áreas
          </button>
        )}
      </div>
      {esActivo && sinAreas && (
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-amber-700">Cliente activo sin área asignada</p>
            <p className="text-[11px] text-amber-600 mt-0.5">Asigna una o varias áreas para poder gestionar el contrato de este cliente.</p>
          </div>
          {puedeGestionarGlobal && (
            <button onClick={() => setShowAsignarAreas(true)} className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-100 text-amber-700 text-[11px] font-medium rounded-lg hover:bg-amber-200 flex-shrink-0">
              <Plus size={12} /> Asignar
            </button>
          )}
        </div>
      )}
      {sinAreas && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <Briefcase size={28} className="mb-2 opacity-30" />
          <p className="text-sm">Sin áreas de servicio</p>
        </div>
      )}
      {bloquesFiltrados.map((bloque, idx) => (
        <AreaCard
          key={bloque.area_id}
          bloque={bloque}
          empresaId={empresaId}
          empleados={empleados}
          onRefresh={load}
          colorIdx={idx}
          puedeGestionarGlobal={puedeGestionarGlobal}
          empleadoData={empleadoData}
        />
      ))}
      {showAsignarAreas && (
        <AsignarAreasModal
          empresaId={empresaId}
          areasAsignadas={idsAsignados}
          todasLasAreas={todasLasAreas}
          onSaved={() => { setShowAsignarAreas(false); load(); }}
          onClose={() => setShowAsignarAreas(false)}
        />
      )}
    </div>
  );
}

// ── ContactosTab ──────────────────────────────────────────────────────────────

function ContactosTab({ empresaId }) {
  const [contactos, setContactos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ nombre: '', cargo: '', email: '', telefono: '', es_principal: false });

  const load = useCallback(() => {
    getEmpresaContactos(empresaId).then(setContactos).catch(console.error);
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createContacto({ ...form, empresa: empresaId });
      setForm({ nombre: '', cargo: '', email: '', telefono: '', es_principal: false });
      setShowForm(false);
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{contactos.length} contacto(s)</span>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700">
          <Plus size={13} /> Agregar
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <input
              placeholder="Nombre *"
              required
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <select
              value={form.cargo}
              onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
              required
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            >
              <option value="">Cargo *</option>
              {CARGOS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
            <input
              placeholder="Teléfono"
              value={form.telefono}
              onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            />
          </div>
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={form.es_principal}
              onChange={(e) => setForm((f) => ({ ...f, es_principal: e.target.checked }))}
            />
            Contacto Principal
          </label>
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg hover:bg-slate-50">Cancelar</button>
          </div>
        </form>
      )}
      {contactos.map((c) => (
        <div key={c.id} className="flex items-start justify-between p-3 bg-white border border-slate-100 rounded-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-800">{c.nombre}</span>
              {c.es_principal && <Badge className="bg-blue-100 text-blue-700">Principal</Badge>}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{c.cargo_display}</p>
            <div className="flex gap-3 mt-1">
              {c.email && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10} />{c.email}</span>}
              {c.telefono && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={10} />{c.telefono}</span>}
            </div>
          </div>
          <button
            onClick={async () => { if (!confirm('¿Eliminar?')) return; await deleteContacto(c.id); setContactos((x) => x.filter((i) => i.id !== c.id)); }}
            className="text-slate-300 hover:text-red-400 p-1 rounded hover:bg-red-50"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ))}
      {!contactos.length && !showForm && <p className="text-sm text-slate-400 text-center py-6">Sin contactos registrados</p>}
    </div>
  );
}

// ── BitacoraTab ───────────────────────────────────────────────────────────────

function BitacoraTab({ empresaId }) {
  const [entradas, setEntradas] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ tipo: '', descripcion: '', fecha: '' });

  const load = useCallback(() => {
    getEmpresaBitacora(empresaId).then(setEntradas).catch(console.error);
  }, [empresaId]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createBitacora({ ...form, empresa: empresaId });
      setShowForm(false);
      setForm({ tipo: '', descripcion: '', fecha: '' });
      load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-sm font-medium text-slate-700">{entradas.length} registro(s)</span>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-xl hover:bg-blue-700">
          <Plus size={13} /> Registrar
        </button>
      </div>
      {showForm && (
        <form onSubmit={handleCreate} className="p-3 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <select
              value={form.tipo}
              onChange={(e) => setForm((f) => ({ ...f, tipo: e.target.value }))}
              required
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white"
            >
              <option value="">Tipo *</option>
              {Object.entries(BIT_L).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <input
              type="datetime-local"
              required
              value={form.fecha}
              onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
              className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
            />
          </div>
          <textarea
            placeholder="Descripción *"
            required
            rows={3}
            value={form.descripcion}
            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg resize-none"
          />
          <div className="flex gap-2">
            <button type="submit" className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg">Guardar</button>
            <button type="button" onClick={() => setShowForm(false)} className="px-3 py-1.5 border border-slate-200 text-xs rounded-lg">Cancelar</button>
          </div>
        </form>
      )}
      {entradas.map((e) => (
        <div key={e.id} className="p-3 bg-white border border-slate-100 rounded-xl">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <Badge className={BIT_C[e.tipo] || 'bg-slate-100 text-slate-600'}>{e.tipo_display}</Badge>
                <span className="text-xs text-slate-400">{new Date(e.fecha).toLocaleString('es-CO')}</span>
              </div>
              <p className="text-sm text-slate-700 mt-1 leading-snug">{e.descripcion}</p>
              {e.empleado_nombre && <p className="text-xs text-slate-400 mt-0.5">Por: {e.empleado_nombre}</p>}
            </div>
            <button
              onClick={async () => { if (!confirm('¿Eliminar?')) return; await deleteBitacora(e.id); setEntradas((x) => x.filter((i) => i.id !== e.id)); }}
              className="text-slate-300 hover:text-red-400 p-1 ml-2 rounded hover:bg-red-50"
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      ))}
      {!entradas.length && !showForm && <p className="text-sm text-slate-400 text-center py-6">Sin registros en bitácora</p>}
    </div>
  );
}

// ── EmpresaPanel ─────────────────────────────────────────────────────────────

const DETAIL_TABS = [
  { id: 'areas', label: 'Áreas & Servicios', icon: Briefcase },
  { id: 'contactos', label: 'Contactos', icon: Users },
  { id: 'bitacora', label: 'Bitácora', icon: BookOpen },
];

function EmpresaPanel({ empresa, onClose, areaId }) {
  const [tab, setTab] = useState('areas');
  const [areasCount, setAreasCount] = useState(0);

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-4 border-b border-slate-100 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-900 truncate">{empresa.razon_social}</h2>
            <p className="text-xs text-slate-500">NIT: {empresa.nit}{empresa.digito_verificacion ? `-${empresa.digito_verificacion}` : ''}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge className={`${ESTADO_C[empresa.estado]?.bg} ${ESTADO_C[empresa.estado]?.text}`}>{empresa.estado_display}</Badge>
              <Badge className={`${RIESGO_C[empresa.nivel_riesgo]?.bg} ${RIESGO_C[empresa.nivel_riesgo]?.text} border ${RIESGO_C[empresa.nivel_riesgo]?.border}`}>{empresa.nivel_riesgo_display}</Badge>
              <Badge className="bg-slate-100 text-slate-600">{empresa.tipo_empresa_display}</Badge>
            </div>
            <div className="flex gap-3 mt-2 flex-wrap">
              {empresa.ciudad && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10} />{empresa.ciudad}</span>}
              {empresa.direccion && <span className="flex items-center gap-1 text-xs text-slate-400"><MapPin size={10} />{empresa.direccion}</span>}
              {empresa.email_principal && <span className="flex items-center gap-1 text-xs text-slate-400"><Mail size={10} />{empresa.email_principal}</span>}
              {empresa.telefono && <span className="flex items-center gap-1 text-xs text-slate-400"><Phone size={10} />{empresa.telefono}</span>}
              {empresa.website && <a href={empresa.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-500 hover:underline"><Globe size={10} />Web</a>}
            </div>
          </div>
          <div className="flex gap-1 ml-3 items-center">
            <button
              onClick={() => exportClienteExcel(empresa, `cliente_${empresa.nit}`)}
              title="Descargar Excel"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors"
            >
              <Sheet size={11} /> Excel
            </button>
            <button
              onClick={() => exportClientePDF(empresa, `cliente_${empresa.nit}`)}
              title="Descargar PDF"
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors"
            >
              <Download size={11} /> PDF
            </button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"><X size={14} /></button>
          </div>
        </div>
      </div>
      <div className="flex border-b border-slate-100 bg-white overflow-x-auto">
        {DETAIL_TABS.map((t) => {
          const Icon = t.icon;
          const label = t.id === 'areas' ? `Áreas & Servicios · ${areasCount} área${areasCount === 1 ? '' : 's'}` : t.label;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${tab === t.id ? 'text-blue-600 border-blue-600 bg-blue-50/50' : 'text-slate-500 border-transparent hover:text-slate-700 hover:bg-slate-50'}`}
            >
              <Icon size={12} /> {label}
            </button>
          );
        })}
      </div>
      <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
        {tab === 'areas' && <AreasTab empresaId={empresa.id} empresaEstado={empresa.estado} onAreasCount={setAreasCount} areaId={areaId} />}
        {tab === 'contactos' && <ContactosTab empresaId={empresa.id} />}
        {tab === 'bitacora' && <BitacoraTab empresaId={empresa.id} />}
      </div>
    </div>
  );
}

// ── Directorio ───────────────────────────────────────────────────────────────

function Directorio({ areaId = null, readOnly = false }) {
  const { isAdmin, isSuperAdmin } = useAuth();
  const puedeImportar = isAdmin || isSuperAdmin;

  const [empresas, setEmpresas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('activo');
  const [selected, setSelected] = useState(null);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (filterEstado) params.estado = filterEstado;
      if (areaId) params.area = areaId;
      setEmpresas(await getEmpresas(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, filterEstado, areaId]);

  useEffect(() => { load(); }, [load]);

  const handleImport = async () => {
    if (!confirm('¿Importar clientes desde n8n? Se omitirán los NIT que ya existan.')) return;
    setImporting(true);
    try {
      const res = await importarClientesDesdeSQF(true);
      alert(
        `Importación finalizada:\n- Recibidos: ${res.recibidos}\n- Creados: ${res.creados}\n- Actualizados: ${res.actualizados}\n- Contactos: ${res.contactos_creados}\n- Errores: ${res.errores}\n- Omitidos: ${res.omitidos}`
      );
      load();
    } catch (err) { alert(err.message); }
    finally { setImporting(false); }
  };

  const filters = readOnly ? [['activo', 'Activos']] : [['activo', 'Activos'], ['inactivo', 'Inactivos']];

  return (
    <div className="flex h-full overflow-hidden">
      <div className={`flex flex-col bg-slate-50/60 border-r border-slate-200 transition-all ${selected ? 'w-[45%] min-w-[28rem] max-w-[45rem]' : 'flex-1'}`}>
        <div className="px-6 py-4 bg-white border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Directorio de clientes</h3>
              <p className="text-xs text-slate-400 mt-0.5">{empresas.length} cliente{empresas.length === 1 ? '' : 's'} registrado{empresas.length === 1 ? '' : 's'}</p>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => exportClientesListaExcel(empresas)}
                disabled={!empresas.length}
                title={`Exportar Excel (${empresas.length})`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors disabled:opacity-40"
              >
                <Sheet size={11} /> Excel
              </button>
              <button
                onClick={() => exportClientesListaPDF(empresas)}
                disabled={!empresas.length}
                title={`Exportar PDF (${empresas.length})`}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 transition-colors disabled:opacity-40"
              >
                <Download size={11} /> PDF
              </button>
              {puedeImportar && !readOnly && (
                <button
                  onClick={handleImport}
                  disabled={importing}
                  title="Actualizar clientes desde n8n"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors disabled:opacity-40"
                >
                  <RefreshCw size={11} className={importing ? 'animate-spin' : ''} />
                  {importing ? 'Importando…' : 'Actualizar'}
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 mb-3 flex-wrap">
            {filters.map(([v, l]) => (
              <button
                key={v}
                onClick={() => setFilterEstado(v)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${filterEstado === v ? 'bg-blue-600 text-white border-transparent' : 'border-slate-200 text-slate-600 hover:border-slate-300 bg-white'}`}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar razón social, NIT, ciudad..."
              className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : empresas.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-center">
              <Building2 size={36} className="mb-2 opacity-30" />
              <p className="text-sm font-medium">Sin clientes</p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">No hay clientes en el CRM. Puedes importarlos desde FormulariosSQF.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {empresas.map((em) => (
                <div
                  key={em.id}
                  onClick={() => setSelected(em)}
                  className={`bg-white rounded-2xl border p-4 cursor-pointer transition-all hover:shadow-md ${selected?.id === em.id ? 'border-blue-500 ring-1 ring-blue-500 shadow-sm' : 'border-slate-200'}`}
                >
                  <div className="min-w-0 mb-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-800 truncate">{em.razon_social}</p>
                      <p className="text-xs text-slate-400 truncate">NIT: {em.nit}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap mb-2">
                    {em.nivel_riesgo !== 'bajo' && (
                      <Badge className={`${RIESGO_C[em.nivel_riesgo]?.bg} ${RIESGO_C[em.nivel_riesgo]?.text} border ${RIESGO_C[em.nivel_riesgo]?.border}`}>{em.nivel_riesgo_display}</Badge>
                    )}
                    {em.estado === 'activo' && em.areas_count === 0 && (
                      <Badge className="bg-amber-100 text-amber-700 border border-amber-200" title="Sin área asignada">
                        <AlertTriangle size={9} className="inline mr-0.5" />Sin área
                      </Badge>
                    )}
                    {em.ciudad && <span className="text-[10px] text-slate-400">{em.ciudad}</span>}
                  </div>
                  {em.contacto_principal && (
                    <p className="text-[11px] text-slate-500 truncate mb-1">
                      <span className="font-medium">Contacto:</span> {em.contacto_principal.nombre} · {em.contacto_principal.cargo}
                    </p>
                  )}
                  <div className="flex flex-col gap-0.5">
                    {em.email_principal && <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Mail size={10} />{em.email_principal}</p>}
                    {em.telefono && <p className="text-[11px] text-slate-400 truncate flex items-center gap-1"><Phone size={10} />{em.telefono}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      {selected && (
        <div className="flex-1 flex flex-col overflow-hidden bg-white">
          <EmpresaPanel empresa={selected} onClose={() => setSelected(null)} areaId={areaId} />
        </div>
      )}
    </div>
  );
}

// ── ClientesSection (root) ────────────────────────────────────────────────────

export default function ClientesSection({ onGoToSQF, modoEmpleado }) {
  const { empleadoData } = useAuth();
  const esGerente = isGerente(empleadoData);
  const esGerenteOSocio = isGerenteOSocio(empleadoData);
  const [view, setView] = useState('directorio');

  const TABS = [
    { id: 'directorio', label: 'Directorio', icon: List },
    { id: 'organigrama', label: 'Organigrama', icon: Network },
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">
      <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-100 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 mr-4">
            <Building2 size={17} className="text-blue-600" />
            <span className="text-sm font-bold text-slate-800">Clientes</span>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${view === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  <Icon size={12} /> {t.label}
                </button>
              );
            })}
          </div>
        </div>
        {!modoEmpleado && (
          <button
            onClick={() => onGoToSQF?.()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all bg-slate-100 text-slate-600 hover:bg-slate-200"
          >
            <ExternalLink size={14} /> Abrir Formulario SQF
          </button>
        )}
      </div>
      <div className="flex-1 overflow-hidden">
        {view === 'directorio' && <Directorio areaId={null} readOnly={modoEmpleado && !esGerenteOSocio} />}
        {view === 'organigrama' && <OrganigramaClientes areaId={esGerenteOSocio ? null : empleadoData?.area_id} />}
      </div>
    </div>
  );
}
