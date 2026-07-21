import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseVacantes } from '../../../lib/supabaseVacantes';

// Réplica del admin de intranet-russell (admin/index.html + rrhh.js): Supabase,
// iconos Font Awesome y colores corporate. El acceso lo controla el login de GCT
// (este panel vive dentro de Admin2Dashboard), por eso no se usa Supabase Auth.

const AREAS = ['Revisoría', 'Legal', 'Administración', 'Contabilidad', 'Impuestos', 'Bpo'];

export default function VacantesAdmin() {
    const [tab, setTab] = useState('postulaciones'); // postulaciones | gestion-vacantes

    const [postulaciones, setPostulaciones] = useState(null); // null = cargando
    const [vacantes, setVacantes] = useState(null);

    const [modalOpen, setModalOpen] = useState(false);
    const [form, setForm] = useState({ id: '', titulo: '', area_solicitante: 'Revisoría', descripcion: '', estado: 'abierta' });
    const [saving, setSaving] = useState(false);

    const [toast, setToast] = useState(null); // { mensaje, tipo }
    const toastTimer = useRef(null);

    const notificar = (mensaje, tipo = 'exito') => {
        setToast({ mensaje, tipo });
        if (toastTimer.current) clearTimeout(toastTimer.current);
        toastTimer.current = setTimeout(() => setToast(null), 4000);
    };

    // ── Cargar datos ──────────────────────────────────────────────────────────
    const cargarPostulaciones = useCallback(async () => {
        try {
            const { data, error } = await supabaseVacantes
                .schema('rbgct').from('postulaciones')
                .select('id, nombre_candidato, correo, telefono, url_cv, vacantes(titulo)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            setPostulaciones(data || []);
        } catch (err) { console.error('Error:', err); setPostulaciones([]); }
    }, []);

    const cargarGestionVacantes = useCallback(async () => {
        try {
            const { data, error } = await supabaseVacantes
                .schema('rbgct').from('vacantes')
                .select('*')
                .order('fecha_publicacion', { ascending: false });
            if (error) throw error;
            setVacantes(data || []);
        } catch (err) { console.error('Error:', err); setVacantes([]); }
    }, []);

    useEffect(() => { cargarPostulaciones(); cargarGestionVacantes(); }, [cargarPostulaciones, cargarGestionVacantes]);

    // ── CRUD vacantes ───────────────────────────────────────────────────────────
    const abrirModalVacante = (id = null) => {
        if (id) {
            const v = (vacantes || []).find((x) => x.id === id);
            if (!v) return;
            setForm({ id: v.id, titulo: v.titulo, area_solicitante: v.area_solicitante, descripcion: v.descripcion, estado: v.estado });
        } else {
            setForm({ id: '', titulo: '', area_solicitante: 'Revisoría', descripcion: '', estado: 'abierta' });
        }
        setModalOpen(true);
    };

    const guardarVacante = async (e) => {
        e.preventDefault();
        setSaving(true);
        const payload = {
            titulo: form.titulo.trim(),
            area_solicitante: form.area_solicitante,
            descripcion: form.descripcion.trim(),
            estado: form.estado,
        };
        try {
            let error;
            if (form.id) {
                ({ error } = await supabaseVacantes.schema('rbgct').from('vacantes').update(payload).eq('id', form.id));
            } else {
                ({ error } = await supabaseVacantes.schema('rbgct').from('vacantes').insert([payload]));
            }
            if (error) throw error;
            notificar('Vacante guardada correctamente', 'exito');
            setModalOpen(false);
            cargarGestionVacantes();
        } catch (err) {
            console.error('Error guardando vacante:', err);
            notificar(err?.message || 'Error al guardar la vacante', 'error');
        } finally {
            setSaving(false);
        }
    };

    const eliminarVacante = async (id) => {
        if (!confirm('⚠️ ¡ADVERTENCIA!\n\nSi eliminas esta vacante, también SE BORRARÁN todas las postulaciones asociadas a ella.\n\n¿Estás seguro?')) return;
        try {
            const { error } = await supabaseVacantes.schema('rbgct').from('vacantes').delete().eq('id', id);
            if (error) throw error;
            notificar('Vacante eliminada', 'exito');
            cargarGestionVacantes();
            cargarPostulaciones();
        } catch (err) { console.error(err); notificar('Error al eliminar', 'error'); }
    };

    return (
        <div className="bg-corporate-bg -m-8 min-h-[calc(100vh-8rem)]" style={{ fontFamily: "'Inter', sans-serif" }}>
            <div className="flex min-h-[calc(100vh-8rem)]">
                {/* Sidebar de pestañas */}
                <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col shadow-sm">
                    <div className="px-6 py-6 flex-1">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Gestión de Vacantes y Solicitudes</p>
                        <nav className="space-y-2">
                            <button onClick={() => setTab('postulaciones')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${tab === 'postulaciones' ? 'bg-corporate-blue text-white shadow-md' : 'text-gray-600 hover:bg-blue-50 hover:text-corporate-blue'}`}>
                                <i className="fa-solid fa-inbox w-5"></i> Postulaciones
                            </button>
                            <button onClick={() => setTab('gestion-vacantes')}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium ${tab === 'gestion-vacantes' ? 'bg-corporate-blue text-white shadow-md' : 'text-gray-600 hover:bg-blue-50 hover:text-corporate-blue'}`}>
                                <i className="fa-solid fa-briefcase w-5"></i> Vacantes
                            </button>
                            <a href="/vacantes" target="_blank" rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-gray-600 hover:bg-blue-50 hover:text-corporate-blue">
                                <i className="fa-solid fa-arrow-up-right-from-square w-5"></i> Portal
                            </a>
                        </nav>
                    </div>
                </aside>

                {/* Pestañas móvil */}
                <div className="md:hidden absolute top-2 right-2 left-2 flex gap-2 z-10">
                    <button onClick={() => setTab('postulaciones')} className={`flex-1 rounded-xl text-sm font-medium px-4 py-2 ${tab === 'postulaciones' ? 'bg-corporate-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>Postulaciones</button>
                    <button onClick={() => setTab('gestion-vacantes')} className={`flex-1 rounded-xl text-sm font-medium px-4 py-2 ${tab === 'gestion-vacantes' ? 'bg-corporate-blue text-white shadow-sm' : 'bg-slate-100 text-slate-600'}`}>Vacantes</button>
                    <a href="/vacantes" target="_blank" rel="noopener noreferrer" className={`flex-1 rounded-xl text-sm font-medium px-4 py-2 text-center bg-slate-100 text-slate-600`}>Portal</a>
                </div>

                <main className="flex-1 overflow-auto p-4 md:p-8">
                    {/* POSTULACIONES */}
                    {tab === 'postulaciones' && (
                        <div>
                            <h2 className="text-3xl font-bold text-[#001871] tracking-tight mb-6">Postulaciones Recibidas</h2>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                                                <th className="py-4 px-6 font-semibold">Candidato</th>
                                                <th className="py-4 px-6 font-semibold">Contacto</th>
                                                <th className="py-4 px-6 font-semibold">Vacante Aplicada</th>
                                                <th className="py-4 px-6 font-semibold text-right">Hoja de Vida</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {postulaciones === null && (
                                                <tr><td colSpan={4} className="text-center py-6 text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Cargando postulaciones...</td></tr>
                                            )}
                                            {postulaciones !== null && postulaciones.length === 0 && (
                                                <tr><td colSpan={4} className="text-center py-6 text-gray-500">Aún no hay postulaciones recibidas.</td></tr>
                                            )}
                                            {postulaciones !== null && postulaciones.map((post) => (
                                                <tr key={post.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition">
                                                    <td className="py-4 px-6 font-bold text-gray-800">{post.nombre_candidato}</td>
                                                    <td className="py-4 px-6">
                                                        <div className="text-sm text-gray-600"><i className="fa-solid fa-envelope mr-1 text-gray-400"></i> {post.correo}</div>
                                                        <div className="text-sm text-gray-600 mt-1"><i className="fa-solid fa-phone mr-1 text-gray-400"></i> {post.telefono || 'No registrado'}</div>
                                                    </td>
                                                    <td className="py-4 px-6"><span className="px-3 py-1 bg-orange-50 text-orange-500 border border-orange-100 rounded-lg text-xs font-bold uppercase tracking-wide">{post.vacantes ? post.vacantes.titulo : 'Vacante cerrada/eliminada'}</span></td>
                                                    <td className="py-4 px-6 text-right">
                                                        <a href={post.url_cv} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center bg-gray-50 hover:bg-[#001871] text-[#001871] hover:text-white font-medium text-sm px-4 py-2 rounded-lg border border-gray-200 hover:border-transparent transition-colors">
                                                            <i className="fa-solid fa-file-pdf mr-2 text-red-500"></i> Ver CV
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* GESTIÓN VACANTES */}
                    {tab === 'gestion-vacantes' && (
                        <div>
                            <div className="flex flex-col gap-4 sm:flex-row justify-between items-start mb-8">
                                <h2 className="text-3xl font-bold text-corporate-blue tracking-tight">Gestión de Vacantes</h2>
                                <button onClick={() => abrirModalVacante()} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2.5 px-5 rounded-xl shadow-md transition-colors flex items-center gap-2">
                                    <i className="fa-solid fa-plus"></i> Nueva Vacante
                                </button>
                            </div>
                            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-100">
                                                <th className="py-4 px-6 font-semibold">Estado</th>
                                                <th className="py-4 px-6 font-semibold">Título de la Vacante</th>
                                                <th className="py-4 px-6 font-semibold">Área</th>
                                                <th className="py-4 px-6 font-semibold text-right">Acciones</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {vacantes === null && (
                                                <tr><td colSpan={4} className="text-center py-6 text-gray-500"><i className="fa-solid fa-spinner fa-spin mr-2"></i> Cargando vacantes...</td></tr>
                                            )}
                                            {vacantes !== null && vacantes.length === 0 && (
                                                <tr><td colSpan={4} className="text-center py-6 text-gray-500">No tienes vacantes creadas.</td></tr>
                                            )}
                                            {vacantes !== null && vacantes.map((v) => (
                                                <tr key={v.id} className="border-b border-gray-50 hover:bg-blue-50/50 transition">
                                                    <td className="py-4 px-6">
                                                        {v.estado === 'abierta'
                                                            ? <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold uppercase"><i className="fa-solid fa-check-circle mr-1"></i> Abierta</span>
                                                            : <span className="px-3 py-1 bg-gray-200 text-gray-600 rounded-lg text-xs font-bold uppercase"><i className="fa-solid fa-lock mr-1"></i> Cerrada</span>}
                                                    </td>
                                                    <td className="py-4 px-6 font-bold text-gray-800">{v.titulo}</td>
                                                    <td className="py-4 px-6 text-sm text-gray-600">{v.area_solicitante}</td>
                                                    <td className="py-4 px-6 text-right space-x-2">
                                                        <button onClick={() => abrirModalVacante(v.id)} className="text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition" title="Editar"><i className="fa-solid fa-pencil"></i></button>
                                                        <button onClick={() => eliminarVacante(v.id)} className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition" title="Eliminar definitivamente"><i className="fa-solid fa-trash"></i></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {/* MODAL VACANTE */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all">
                        <div className="bg-corporate-blue p-5 text-white flex justify-between items-center">
                            <h3 className="font-bold text-lg">{form.id ? 'Editar Vacante' : 'Nueva Vacante'}</h3>
                            <button onClick={() => setModalOpen(false)} className="text-white/70 hover:text-white transition-colors"><i className="fa-solid fa-xmark text-xl"></i></button>
                        </div>
                        <form className="p-6 space-y-4" onSubmit={guardarVacante}>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Título de la Oferta <span className="text-red-500">*</span></label>
                                <input type="text" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-corporate-blue outline-none text-sm bg-gray-50 focus:bg-white transition-colors" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Área Solicitante <span className="text-red-500">*</span></label>
                                    <select required value={form.area_solicitante} onChange={(e) => setForm({ ...form, area_solicitante: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-corporate-blue outline-none text-sm bg-gray-50 focus:bg-white transition-colors">
                                        {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Estado de la Vacante</label>
                                    <select value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-corporate-blue outline-none text-sm bg-gray-50 focus:bg-white transition-colors">
                                        <option value="abierta">Abierta (Visible al público)</option>
                                        <option value="cerrada">Cerrada (Oculta)</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Descripción y Requisitos <span className="text-red-500">*</span></label>
                                <textarea rows={4} required value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-corporate-blue outline-none text-sm bg-gray-50 focus:bg-white transition-colors resize-none"></textarea>
                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                                <button type="button" onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors">Cancelar</button>
                                <button type="submit" disabled={saving} className="px-6 py-2.5 rounded-xl bg-corporate-blue text-white font-bold hover:bg-blue-900 shadow-md transition-colors flex items-center gap-2 disabled:opacity-70">
                                    {saving ? <><i className="fa-solid fa-spinner fa-spin"></i> Guardando...</> : <><i className="fa-solid fa-save"></i> Guardar Vacante</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* TOAST */}
            {toast && (
                <div className={`fixed bottom-8 right-8 flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl z-[100] text-white font-medium text-sm ${toast.tipo === 'exito' ? 'bg-green-600' : 'bg-red-500'}`}>
                    <i className={`fa-solid ${toast.tipo === 'exito' ? 'fa-circle-check' : 'fa-circle-exclamation'} text-xl`}></i>
                    <span>{toast.mensaje}</span>
                </div>
            )}
        </div>
    );
}
