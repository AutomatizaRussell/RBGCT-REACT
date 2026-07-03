import { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Plus, ArrowLeft, Trash2, Pencil,
  Search, Building2, BookOpen, GraduationCap,
  Loader2, X, ChevronUp, ChevronDown, Clock, Check,
  ToggleLeft, ToggleRight, Users,
} from 'lucide-react';

const NIVELES_CARGO = [
  { valor: 0, label: 'Socio' },
  { valor: 1, label: 'Gerente Asociado' },
  { valor: 2, label: 'Senior' },
  { valor: 3, label: 'Líder de equipo' },
  { valor: 4, label: 'Analista' },
];
import {
  getAllPlanesOnboarding, createPlanOnboarding, updatePlanOnboarding,
  deletePlanOnboarding, agregarPasoOnboarding, eliminarPasoOnboarding,
  reordenarPasosOnboarding, getAllCursos, getAllAreas,
} from '../../../lib/api';

const GRADIENTS = [
  'from-[#001871] to-[#00bfb3]',
  'from-[#001871] to-[#981d97]',
  'from-[#00bfb3] to-[#001871]',
  'from-[#981d97] to-[#001871]',
  'from-[#001871] to-[#ed8b00]',
];

const TIPO_BADGE = {
  curso:        { label: 'Curso',         cls: 'bg-blue-100 text-blue-700' },
  capacitacion: { label: 'Capacitación',  cls: 'bg-purple-100 text-purple-700' },
};

function TipoBadgePaso({ tipo }) {
  const cfg = TIPO_BADGE[tipo] || { label: tipo, cls: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cls}`}>{cfg.label}</span>
  );
}

function PlanCard({ plan, onClick }) {
  const grad = GRADIENTS[plan.id % GRADIENTS.length];
  return (
    <button onClick={onClick}
      className="group bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all text-left overflow-hidden">
      <div className={`bg-gradient-to-r ${grad} px-6 py-5`}>
        <div className="flex items-center justify-between">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-black text-2xl border border-white/30">
            {plan.nombre.charAt(0).toUpperCase()}
          </div>
          {!plan.activo && (
            <span className="text-[10px] font-bold px-2 py-1 bg-white/20 text-white rounded-full">Inactivo</span>
          )}
        </div>
        <h3 className="text-white font-black text-base mt-3 leading-tight">{plan.nombre}</h3>
        {plan.descripcion && (
          <p className="text-white/70 text-xs mt-1 line-clamp-2">{plan.descripcion}</p>
        )}
      </div>
      <div className="px-6 py-4 space-y-1.5">
        {plan.nombre_area && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Building2 size={11}/> <span>{plan.nombre_area}</span>
          </div>
        )}
        {plan.nivel_cargo_label && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Users size={11}/> <span>{plan.nivel_cargo_label}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
          <BookOpen size={11}/>
          <span>{plan.total_pasos} curso{plan.total_pasos !== 1 ? 's' : ''} en el plan</span>
        </div>
      </div>
    </button>
  );
}

const BLANK_FORM = { nombre: '', descripcion: '', area: '', nivel_cargo: '', activo: true };

export default function OnboardingAdmin() {
  const [planes, setPlanes]         = useState([]);
  const [cursos, setCursos]         = useState([]);
  const [areas, setAreas]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [busqueda, setBusqueda]     = useState('');

  const [vista, setVista]           = useState('grid');   // 'grid' | 'detail'
  const [planActivo, setPlanActivo] = useState(null);

  const [showNuevo, setShowNuevo]   = useState(false);
  const [form, setForm]             = useState(BLANK_FORM);
  const [editingPlan, setEditingPlan] = useState(null);

  // Para agregar un paso al plan activo
  const [showAddPaso, setShowAddPaso]     = useState(false);
  const [cursoSeleccionado, setCursoSeleccionado] = useState('');
  const [diasLimite, setDiasLimite]       = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pData, cData, aData] = await Promise.all([
        getAllPlanesOnboarding(),
        getAllCursos(1, 200),
        getAllAreas(),
      ]);
      setPlanes(Array.isArray(pData) ? pData : (pData?.results || []));
      setCursos(Array.isArray(cData) ? cData : (cData?.results || []));
      setAreas(Array.isArray(aData) ? aData : []);
      if (planActivo) {
        const act = (Array.isArray(pData) ? pData : (pData?.results || [])).find(p => p.id === planActivo.id);
        if (act) setPlanActivo(act);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [planActivo?.id]);

  useEffect(() => { fetchAll(); }, []);

  const handleCrear = async () => {
    if (!form.nombre.trim()) return;
    setSaving(true);
    try {
      await createPlanOnboarding({
        nombre: form.nombre,
        descripcion: form.descripcion,
        area: form.area || null,
        nivel_cargo: form.nivel_cargo !== '' ? Number(form.nivel_cargo) : null,
        activo: form.activo,
      });
      setForm(BLANK_FORM);
      setShowNuevo(false);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEditar = async () => {
    if (!editingPlan?.nombre?.trim()) return;
    setSaving(true);
    try {
      await updatePlanOnboarding(editingPlan.id, {
        nombre: editingPlan.nombre,
        descripcion: editingPlan.descripcion,
        area: editingPlan.area || null,
        nivel_cargo: editingPlan.nivel_cargo !== '' ? Number(editingPlan.nivel_cargo) : null,
        activo: editingPlan.activo,
      });
      setEditingPlan(null);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEliminar = async (id) => {
    if (!confirm('¿Eliminar este plan de onboarding?')) return;
    try {
      await deletePlanOnboarding(id);
      if (planActivo?.id === id) { setVista('grid'); setPlanActivo(null); }
      fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleAgregarPaso = async () => {
    if (!cursoSeleccionado) return;
    const maxOrden = (planActivo?.pasos || []).reduce((m, p) => Math.max(m, p.orden), -1) + 1;
    setSaving(true);
    try {
      const updated = await agregarPasoOnboarding(planActivo.id, {
        curso_id: Number(cursoSeleccionado),
        orden: maxOrden,
        dias_limite: diasLimite ? Number(diasLimite) : null,
      });
      setPlanActivo(updated);
      setCursoSeleccionado('');
      setDiasLimite('');
      setShowAddPaso(false);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleEliminarPaso = async (pasoId) => {
    if (!confirm('¿Quitar este curso del plan?')) return;
    try {
      const updated = await eliminarPasoOnboarding(planActivo.id, pasoId);
      setPlanActivo(updated);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const moverPaso = async (index, direction) => {
    const pasos = [...(planActivo.pasos || [])];
    const target = index + direction;
    if (target < 0 || target >= pasos.length) return;
    [pasos[index], pasos[target]] = [pasos[target], pasos[index]];
    const nuevosOrdenes = pasos.map((p, i) => ({ id: p.id, orden: i }));
    try {
      const updated = await reordenarPasosOnboarding(planActivo.id, nuevosOrdenes);
      setPlanActivo(updated);
      await fetchAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const abrirDetalle = (plan) => { setPlanActivo(plan); setVista('detail'); setEditingPlan(null); };
  const volverGrid   = () => { setVista('grid'); setPlanActivo(null); setEditingPlan(null); setShowAddPaso(false); };

  const planesFiltrados = planes.filter(p =>
    p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.descripcion || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.nombre_cargo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (p.nombre_area || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  // Cursos que ya están en el plan (para excluirlos del selector)
  const cursosEnPlan = new Set((planActivo?.pasos || []).map(p => p.curso));

  if (loading) return (
    <div className="flex flex-col items-center justify-center py-28 gap-3">
      <Loader2 size={32} className="text-[#001871] animate-spin" />
      <p className="text-sm text-slate-400 font-medium">Cargando planes de onboarding...</p>
    </div>
  );

  // ── Vista detalle ─────────────────────────────────────────────────────────────
  if (vista === 'detail' && planActivo) {
    const grad = GRADIENTS[planActivo.id % GRADIENTS.length];
    const pasos = planActivo.pasos || [];

    return (
      <div className="space-y-6 max-w-3xl mx-auto animate-in fade-in duration-300">
        <button onClick={volverGrid}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-[#001871] uppercase tracking-widest transition-colors">
          <ArrowLeft size={14}/> Volver a planes
        </button>

        {/* Header del plan */}
        {editingPlan?.id === planActivo.id ? (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <p className="text-xs font-bold text-amber-600 uppercase tracking-widest flex items-center gap-2">
              <Pencil size={13}/> Editando plan
            </p>
            <input autoFocus value={editingPlan.nombre}
              onChange={e => setEditingPlan(p => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre del plan"
              className="w-full px-4 py-3 text-lg font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]"
            />
            <textarea value={editingPlan.descripcion || ''}
              onChange={e => setEditingPlan(p => ({ ...p, descripcion: e.target.value }))}
              rows={2} placeholder="Descripción (opcional)"
              className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Área</label>
                <select value={editingPlan.area || ''}
                  onChange={e => setEditingPlan(p => ({ ...p, area: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]">
                  <option value="">Sin área específica</option>
                  {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nivel de cargo</label>
                <select value={editingPlan.nivel_cargo ?? ''}
                  onChange={e => setEditingPlan(p => ({ ...p, nivel_cargo: e.target.value }))}
                  className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]">
                  <option value="">Sin nivel específico</option>
                  {NIVELES_CARGO.map(n => <option key={n.valor} value={n.valor}>{n.label}</option>)}
                </select>
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <button type="button" onClick={() => setEditingPlan(p => ({ ...p, activo: !p.activo }))}>
                {editingPlan.activo
                  ? <ToggleRight size={28} className="text-[#001871]"/>
                  : <ToggleLeft size={28} className="text-slate-300"/>}
              </button>
              <span className="text-sm font-semibold text-slate-600">Plan activo</span>
            </label>
            <div className="flex gap-3">
              <button onClick={handleEditar} disabled={saving}
                className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
                {saving ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button onClick={() => setEditingPlan(null)}
                className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className={`bg-gradient-to-r ${grad} px-8 py-8`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center font-black text-3xl text-white border border-white/30">
                    {planActivo.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {planActivo.nombre_area && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full">
                          <Building2 size={9}/> {planActivo.nombre_area}
                        </span>
                      )}
                      {planActivo.nivel_cargo_label && (
                        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full">
                          <Users size={9}/> {planActivo.nivel_cargo_label}
                        </span>
                      )}
                      {!planActivo.activo && (
                        <span className="text-[11px] font-bold px-2 py-0.5 bg-white/20 text-white rounded-full">Inactivo</span>
                      )}
                    </div>
                    <h2 className="text-2xl font-black text-white mt-2">{planActivo.nombre}</h2>
                    {planActivo.descripcion && (
                      <p className="text-white/70 text-sm mt-1">{planActivo.descripcion}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditingPlan({
                      id: planActivo.id,
                      nombre: planActivo.nombre,
                      descripcion: planActivo.descripcion || '',
                      area: planActivo.area || '',
                      nivel_cargo: planActivo.nivel_cargo ?? '',
                      activo: planActivo.activo,
                    })}
                    className="p-2.5 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all" title="Editar">
                    <Pencil size={15}/>
                  </button>
                  <button onClick={() => handleEliminar(planActivo.id)}
                    className="p-2.5 bg-white/20 hover:bg-red-400/50 text-white rounded-xl transition-all" title="Eliminar">
                    <Trash2 size={15}/>
                  </button>
                </div>
              </div>
            </div>

            {/* Lista de pasos */}
            <div className="bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <GraduationCap size={14}/> Cursos del plan ({pasos.length})
                </h3>
                <button onClick={() => setShowAddPaso(v => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-[#001871] text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all">
                  <Plus size={13}/> Agregar curso
                </button>
              </div>

              {/* Formulario agregar paso */}
              {showAddPaso && (
                <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                  <select value={cursoSeleccionado}
                    onChange={e => setCursoSeleccionado(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]">
                    <option value="">Seleccionar curso o capacitación...</option>
                    {cursos
                      .filter(c => !cursosEnPlan.has(c.id))
                      .map(c => (
                        <option key={c.id} value={c.id}>
                          [{c.tipo === 'capacitacion' ? 'Cap.' : 'Curso'}] {c.nombre}
                        </option>
                      ))}
                  </select>
                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Días límite (opcional)</label>
                      <input type="number" min="1" value={diasLimite}
                        onChange={e => setDiasLimite(e.target.value)}
                        placeholder="Ej: 30"
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]"
                      />
                    </div>
                    <div className="flex gap-2 pt-5">
                      <button onClick={handleAgregarPaso} disabled={!cursoSeleccionado || saving}
                        className="px-4 py-2 bg-[#001871] text-white rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-slate-800 transition-all">
                        {saving ? 'Agregando...' : 'Agregar'}
                      </button>
                      <button onClick={() => { setShowAddPaso(false); setCursoSeleccionado(''); setDiasLimite(''); }}
                        className="px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {pasos.length === 0 ? (
                <div className="py-12 text-center">
                  <GraduationCap size={28} className="mx-auto text-slate-200 mb-3"/>
                  <p className="text-sm text-slate-400 font-medium">Este plan no tiene cursos aún</p>
                  <p className="text-xs text-slate-300 mt-1">Agrega cursos o capacitaciones al plan</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pasos.map((paso, idx) => (
                    <div key={paso.id}
                      className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100 group hover:border-slate-200 transition-all">
                      <div className="flex flex-col gap-0.5">
                        <button onClick={() => moverPaso(idx, -1)} disabled={idx === 0}
                          className="p-0.5 text-slate-300 hover:text-[#001871] disabled:opacity-20 transition-colors">
                          <ChevronUp size={14}/>
                        </button>
                        <button onClick={() => moverPaso(idx, 1)} disabled={idx === pasos.length - 1}
                          className="p-0.5 text-slate-300 hover:text-[#001871] disabled:opacity-20 transition-colors">
                          <ChevronDown size={14}/>
                        </button>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#001871] text-white text-xs font-black flex items-center justify-center shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <TipoBadgePaso tipo={paso.tipo_curso}/>
                          <span className="text-sm font-semibold text-slate-700 truncate">{paso.nombre_curso}</span>
                        </div>
                        {paso.dias_limite && (
                          <p className="flex items-center gap-1 text-xs text-slate-400 mt-0.5">
                            <Clock size={10}/> {paso.dias_limite} días límite
                          </p>
                        )}
                      </div>
                      <button onClick={() => handleEliminarPaso(paso.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50">
                        <X size={14}/>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── Vista grid ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <ClipboardList size={20} className="text-[#001871]"/> Planes de Onboarding
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Rutas de formación inicial para nuevos empleados</p>
        </div>
        <button onClick={() => { setForm(BLANK_FORM); setShowNuevo(true); }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-sm">
          <Plus size={14}/> Nuevo plan
        </button>
      </div>

      {/* Formulario nuevo plan */}
      {showNuevo && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-bold text-[#001871] uppercase tracking-widest flex items-center gap-2">
            <Plus size={13}/> Nuevo plan de onboarding
          </p>
          <input autoFocus value={form.nombre}
            onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
            placeholder="Nombre del plan (ej: Formación Inicial, Inducción General...)"
            className="w-full px-4 py-3 font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]"
          />
          <textarea value={form.descripcion}
            onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
            rows={2} placeholder="Descripción (opcional)"
            className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] resize-none"
          />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Área</label>
              <select value={form.area}
                onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]">
                <option value="">Sin área específica</option>
                {areas.map(a => <option key={a.id_area} value={a.id_area}>{a.nombre_area}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wider">Nivel de cargo</label>
              <select value={form.nivel_cargo}
                onChange={e => setForm(p => ({ ...p, nivel_cargo: e.target.value }))}
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]">
                <option value="">Sin nivel específico</option>
                {NIVELES_CARGO.map(n => <option key={n.valor} value={n.valor}>{n.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCrear} disabled={saving || !form.nombre.trim()}
              className="px-5 py-2.5 bg-[#001871] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all">
              {saving ? 'Creando...' : 'Crear plan'}
            </button>
            <button onClick={() => setShowNuevo(false)}
              className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300"/>
        <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre, área o cargo..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871]"
        />
      </div>

      {/* Grid */}
      {planesFiltrados.length === 0 ? (
        <div className="py-20 text-center">
          <ClipboardList size={32} className="mx-auto text-slate-200 mb-3"/>
          <p className="text-sm text-slate-400 font-medium">
            {busqueda ? 'No se encontraron planes' : 'Aún no hay planes de onboarding'}
          </p>
          {!busqueda && (
            <button onClick={() => { setForm(BLANK_FORM); setShowNuevo(true); }}
              className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#001871] text-white rounded-xl text-xs font-bold mx-auto hover:bg-slate-800 transition-all">
              <Plus size={13}/> Crear primer plan
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {planesFiltrados.map(plan => (
            <PlanCard key={plan.id} plan={plan} onClick={() => abrirDetalle(plan)}/>
          ))}
        </div>
      )}
    </div>
  );
}
