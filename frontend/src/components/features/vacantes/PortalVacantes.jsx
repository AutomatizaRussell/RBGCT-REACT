import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    LockKey, Buildings, GlobeHemisphereWest, Handshake, UsersThree,
    CurrencyDollar, SunDim, ClockCountdown, HouseLine, GraduationCap, Cake,
    SpinnerGap, MagnifyingGlass, ArrowUpRight, MapPin, Briefcase, X, Clock,
    CalendarCheck, PaperPlaneTilt, FilePdf, CheckCircle,
} from '@phosphor-icons/react';
import { supabaseVacantes } from '../../../lib/supabaseVacantes';

const LOGO_URL = 'https://raw.githubusercontent.com/AutomatizaRussell/Resourse_GestionHumana/main/Logo_RB2021.png';
const FILTROS = ['Todas', 'Revisoría', 'Legal', 'Administración', 'Contabilidad', 'Impuestos', 'BPO'];

const BENEFICIOS = [
    { Icon: CurrencyDollar, color: 'bg-green-50 text-green-600',   label: 'Salario Competitivo' },
    { Icon: SunDim,         color: 'bg-yellow-50 text-yellow-500', label: 'Excelente clima' },
    { Icon: ClockCountdown, color: 'bg-blue-50 text-blue-600',     label: 'Viernes corto' },
    { Icon: HouseLine,      color: 'bg-indigo-50 text-indigo-600', label: 'Trabajo en casa' },
    { Icon: GraduationCap,  color: 'bg-orange-50 text-brand-primary', label: 'Capacitaciones' },
    { Icon: Cake,           color: 'bg-pink-50 text-pink-500',     label: 'Cumpleaños libre' },
];

export default function PortalVacantes() {
    const [allVacantes, setAllVacantes] = useState([]);
    const [filtro, setFiltro] = useState('Todas');
    const [estado, setEstado] = useState('loading'); // loading | ok | error

    const [preview, setPreview] = useState(null);     // vacante en modal de detalle
    const [applyOpen, setApplyOpen] = useState(false);
    const [currentVacante, setCurrentVacante] = useState(null); // {id, titulo}

    const [form, setForm] = useState({ nombre: '', cedula: '', celular: '', email: '' });
    const [terms, setTerms] = useState(false);
    const [showTerms, setShowTerms] = useState(false);
    const [cvName, setCvName] = useState('Máximo 5MB');
    const cvRef = useRef(null);
    const [sending, setSending] = useState(false);

    const cargarVacantes = useCallback(async () => {
        setEstado('loading');
        try {
            const { data, error } = await supabaseVacantes
                .schema('rbgct').from('vacantes')
                .select('*')
                .eq('estado', 'abierta')
                .order('fecha_publicacion', { ascending: false });
            if (error) throw error;
            setAllVacantes(data || []);
            setEstado('ok');
        } catch (err) {
            console.error('Error cargando vacantes:', err);
            setEstado('error');
        }
    }, []);

    useEffect(() => { cargarVacantes(); }, [cargarVacantes]);

    const vacantesFiltradas = filtro === 'Todas'
        ? allVacantes
        : allVacantes.filter(v => v.area_solicitante && v.area_solicitante.toLowerCase().includes(filtro.toLowerCase()));

    const openPreview = (v) => setPreview(v);
    const closePreview = () => setPreview(null);

    const applyFromPreview = () => {
        if (!preview) return;
        setCurrentVacante({ id: preview.id, titulo: preview.titulo });
        setPreview(null);
        setApplyOpen(true);
    };

    const openApplyFromCard = (v) => {
        setCurrentVacante({ id: v.id, titulo: v.titulo });
        setApplyOpen(true);
    };

    const closeModal = () => {
        setApplyOpen(false);
        setForm({ nombre: '', cedula: '', celular: '', email: '' });
        setTerms(false);
        setCvName('Máximo 5MB');
        if (cvRef.current) cvRef.current.value = '';
    };

    const updateFileName = (e) => {
        const f = e.target.files?.[0];
        setCvName(f ? f.name : 'Máximo 5MB');
    };

    const submitApplication = async (e) => {
        e.preventDefault();
        if (!terms) { alert('Debes aceptar la política de tratamiento de datos.'); return; }
        const file = cvRef.current?.files?.[0];
        if (!file || !currentVacante) return;

        setSending(true);
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}_${form.cedula}_${form.nombre.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;
            const filePath = `postulaciones/${fileName}`;

            // 1. Subir a Storage
            const { error: uploadError } = await supabaseVacantes.storage
                .from('curriculums')
                .upload(filePath, file);
            if (uploadError) throw uploadError;

            // 2. Obtener link público
            const { data: { publicUrl } } = supabaseVacantes.storage
                .from('curriculums')
                .getPublicUrl(filePath);

            // 3. Guardar en la BD
            const nombreCompleto = `${form.nombre} (CC: ${form.cedula})`;
            const { error: insertError } = await supabaseVacantes
                .schema('rbgct').from('postulaciones')
                .insert([{
                    vacante_id: currentVacante.id,
                    nombre_candidato: nombreCompleto,
                    correo: form.email,
                    telefono: form.celular,
                    url_cv: publicUrl,
                }]);
            if (insertError) throw insertError;

            alert('¡Excelente! Hemos recibido tu postulación con éxito.');
            closeModal();
        } catch (err) {
            console.error('Error:', err);
            alert('Hubo un error subiendo tu postulación. Por favor verifica tu conexión e intenta nuevamente.');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="bg-slate-50 text-slate-800 antialiased min-h-screen" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {/* NAVBAR */}
            <nav className="fixed w-full z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 transition-all duration-300">
                <div className="container mx-auto px-6 h-20 flex justify-between items-center">
                    <a href="/" className="flex items-center gap-3">
                        <img src={LOGO_URL} alt="Russell Bedford" className="h-12 w-auto" />
                    </a>
                    <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600">
                        <a href="#cultura" className="hover:text-brand-dark transition-colors">Cultura</a>
                        <a href="#beneficios" className="hover:text-brand-dark transition-colors">Beneficios</a>
                        <a href="#vacantes" className="hover:text-brand-dark transition-colors">Vacantes</a>
                        <div className="h-4 w-px bg-gray-300 mx-2"></div>
                        <a href="/" className="text-gray-400 hover:text-brand-primary transition-colors p-2" title="Acceso Administrativo">
                            <LockKey className="text-lg" />
                        </a>
                    </div>
                    <a href="#vacantes" className="bg-brand-dark text-white px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-slate-800 transition-all shadow-lg shadow-brand-dark/20 hidden md:block">
                        Ver Oportunidades
                    </a>
                </div>
            </nav>

            <section id="contenido" className="pt-28 pb-12">
                <div className="container mx-auto px-6 grid gap-10 lg:grid-cols-[1.5fr_1fr] items-start min-h-screen pt-10 lg:pt-24">
                    <div className="space-y-12">
                        <div>
                            <span className="inline-block py-1 px-3 rounded-full bg-blue-50 text-brand-dark text-xs font-bold tracking-wide mb-4 border border-blue-100">
                                MEDELLÍN, COLOMBIA
                            </span>
                            <h1 className="text-4xl lg:text-6xl font-bold text-slate-900 mb-4 tracking-tight leading-tight">
                                Tu futuro empieza
                                <span className="block text-brand-dark">en Russell Bedford</span>
                            </h1>
                            <p className="text-lg text-slate-500 max-w-2xl leading-relaxed">
                                Somos una firma global que valora la pasión y el crecimiento. Encuentra tu lugar en nuestras oficinas de Medellín.
                            </p>
                        </div>

                        {/* Cultura */}
                        <section id="cultura" className="bg-white border border-slate-100 rounded-2xl p-6">
                            <div className="flex flex-col md:flex-row items-center gap-8">
                                <div className="md:w-1/2">
                                    <span className="text-brand-primary font-bold tracking-wider text-sm uppercase mb-2 block">Nuestra Historia</span>
                                    <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-4">35 Años de Pasión y Excelencia</h2>
                                    <p className="text-slate-600 leading-relaxed mb-4 text-sm">
                                        Somos una firma con más de 35 años de experiencia, buscando talento apasionado que quiera crecer con nosotros. En Russell Bedford, no solo construimos carreras, construimos legados.
                                    </p>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-1 bg-brand-dark rounded-full"></div>
                                        <p className="text-brand-dark font-medium italic">"Conviértete en tu mejor versión"</p>
                                    </div>
                                </div>
                                <div className="md:w-1/2 grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                                        <Buildings className="text-3xl text-brand-teal mb-1 mx-auto" />
                                        <h3 className="text-2xl font-bold text-slate-800">+393</h3>
                                        <p className="text-slate-500 text-sm">Oficinas</p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                                        <GlobeHemisphereWest className="text-3xl text-brand-primary mb-1 mx-auto" />
                                        <h3 className="text-2xl font-bold text-slate-800">+106</h3>
                                        <p className="text-slate-500 text-sm">Países</p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                                        <Handshake className="text-3xl text-purple-600 mb-1 mx-auto" />
                                        <h3 className="text-2xl font-bold text-slate-800">+700</h3>
                                        <p className="text-slate-500 text-sm">Socios</p>
                                    </div>
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-center">
                                        <UsersThree className="text-3xl text-brand-dark mb-1 mx-auto" />
                                        <h3 className="text-2xl font-bold text-slate-800">+10.618</h3>
                                        <p className="text-slate-500 text-sm">Empleados</p>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Beneficios */}
                        <section id="beneficios" className="bg-white border border-slate-100 rounded-2xl p-6">
                            <div className="text-left mb-8 max-w-3xl">
                                <span className="text-brand-teal font-bold tracking-wider text-sm uppercase mb-2 block">Lo que tenemos para ti</span>
                                <h2 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Beneficios de Trabajar con Nosotros</h2>
                                <p className="text-slate-600 text-sm">Diseñamos un ecosistema de bienestar para apoyarte en cada paso de tu vida personal y profesional.</p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                {BENEFICIOS.map(({ Icon, color, label }) => (
                                    <div key={label} className="bg-white p-5 rounded-xl border border-gray-100 hover:border-brand-primary/30 hover:shadow-md transition-all group">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform ${color}`}>
                                            <Icon className="text-xl" />
                                        </div>
                                        <h3 className="font-bold text-slate-800 text-sm">{label}</h3>
                                    </div>
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* Vacantes */}
                    <aside className="w-full lg:w-[420px] lg:h-[calc(100vh-7rem)] overflow-y-auto pr-0 lg:pr-2 pb-10" id="vacantes">
                        <div className="lg:sticky lg:top-0 space-y-4">
                            <div className="flex flex-wrap items-center bg-white p-3 rounded-2xl shadow-sm border border-gray-100 gap-2">
                                {FILTROS.map((f) => {
                                    const active = filtro === f;
                                    return (
                                        <button
                                            key={f}
                                            onClick={() => setFiltro(f)}
                                            className={active
                                                ? 'px-4 py-2 rounded-lg bg-brand-dark text-white shadow-sm text-sm font-semibold transition-all'
                                                : 'px-4 py-2 rounded-lg text-slate-500 hover:text-brand-primary hover:bg-orange-50 text-sm font-medium transition-all'}
                                        >
                                            {f}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                {estado === 'loading' && (
                                    <div className="text-center py-10 text-gray-400">
                                        <SpinnerGap className="text-3xl animate-spin mx-auto" />
                                    </div>
                                )}
                                {estado === 'error' && (
                                    <div className="text-center py-10 text-red-500 font-medium">Error conectando con el servidor. Intenta nuevamente.</div>
                                )}
                                {estado === 'ok' && vacantesFiltradas.length === 0 && (
                                    <div className="p-12 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200 mt-2">
                                        <MagnifyingGlass className="text-4xl text-slate-300 mb-3 mx-auto" />
                                        <h3 className="text-lg font-bold text-slate-600">No hay vacantes en esta área</h3>
                                        <p className="text-sm text-slate-400 mt-1">Intenta seleccionando otra categoría en los filtros.</p>
                                    </div>
                                )}
                                {estado === 'ok' && vacantesFiltradas.map((v) => (
                                    <div
                                        key={v.id}
                                        onClick={() => openPreview(v)}
                                        className="bg-white p-5 rounded-2xl border border-slate-100 hover:border-brand-primary/30 hover:shadow-lg transition-all group flex flex-col gap-4 cursor-pointer relative overflow-hidden"
                                    >
                                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-dark to-brand-primary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <span className="inline-block px-3 py-1 bg-blue-50 text-brand-dark text-[10px] font-bold rounded-md mb-2 uppercase tracking-wider">{v.area_solicitante || 'General'}</span>
                                                <h3 className="text-xl font-bold text-slate-800 leading-tight group-hover:text-brand-primary transition-colors">{v.titulo}</h3>
                                            </div>
                                            <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-brand-dark group-hover:bg-orange-50 group-hover:text-brand-primary transition-colors">
                                                <ArrowUpRight className="text-xl" />
                                            </div>
                                        </div>
                                        <p className="text-sm text-slate-500 line-clamp-2 leading-relaxed flex-1">{v.descripcion}</p>
                                        <div className="flex items-center gap-4 text-xs font-semibold text-slate-500 pt-3 border-t border-slate-50">
                                            <span className="flex items-center gap-1.5"><MapPin className="text-brand-teal text-base" /> Medellín</span>
                                            <span className="flex items-center gap-1.5"><Briefcase className="text-brand-teal text-base" /> Tiempo Completo</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </aside>
                </div>
            </section>

            {/* MODAL PREVIEW */}
            {preview && (
                <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closePreview}></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-2xl">
                                <div className="bg-brand-dark px-6 py-6 flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                                            <Briefcase className="text-3xl text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-bold text-white">{preview.titulo}</h3>
                                            <p className="text-blue-200 mt-1 text-sm">{preview.area_solicitante || 'General'}</p>
                                        </div>
                                    </div>
                                    <button onClick={closePreview} className="text-white hover:text-brand-primary transition">
                                        <X className="text-2xl" />
                                    </button>
                                </div>
                                <div className="px-6 py-6">
                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1 text-brand-primary"><MapPin className="text-lg" /> <span className="font-semibold text-sm text-slate-700">Ubicación</span></div>
                                            <p className="text-slate-500 text-sm">Medellín</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1 text-brand-primary"><Clock className="text-lg" /> <span className="font-semibold text-sm text-slate-700">Modalidad</span></div>
                                            <p className="text-slate-500 text-sm">Tiempo Completo</p>
                                        </div>
                                        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 col-span-2 md:col-span-1">
                                            <div className="flex items-center gap-2 mb-1 text-brand-primary"><CalendarCheck className="text-lg" /> <span className="font-semibold text-sm text-slate-700">Estado</span></div>
                                            <p className="text-green-600 font-medium text-sm">Vigente</p>
                                        </div>
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-800 mb-3">Descripción del Cargo</h4>
                                    <div className="text-slate-600 text-sm leading-relaxed mb-8 bg-slate-50 p-5 rounded-xl border border-slate-100 whitespace-pre-line">{preview.descripcion}</div>
                                    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                        <button onClick={closePreview} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
                                        <button onClick={applyFromPreview} className="px-6 py-2.5 rounded-xl bg-brand-primary text-white font-bold hover:bg-orange-600 transition-colors shadow-md flex items-center gap-2">
                                            <PaperPlaneTilt /> Postularme Ahora
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL POSTULACIÓN */}
            {applyOpen && (
                <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeModal}></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
                            <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg">
                                <div className="bg-brand-dark px-6 py-5 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">Envía tus datos</h3>
                                        <p className="mt-1 text-sm text-blue-200">Cargo: <span className="font-bold text-white">{currentVacante?.titulo}</span></p>
                                    </div>
                                    <button onClick={closeModal} className="text-white hover:text-brand-primary"><X className="text-2xl" /></button>
                                </div>
                                <form className="px-6 py-6 space-y-4" onSubmit={submitApplication}>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo</label>
                                        <input type="text" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                                            className="block w-full rounded-xl border-slate-200 bg-slate-50 border py-3 px-4 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula</label>
                                            <input type="number" required value={form.cedula} onChange={(e) => setForm({ ...form, cedula: e.target.value })}
                                                className="block w-full rounded-xl border-slate-200 bg-slate-50 border py-3 px-4 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-1">Celular</label>
                                            <input type="tel" required value={form.celular} onChange={(e) => setForm({ ...form, celular: e.target.value })}
                                                className="block w-full rounded-xl border-slate-200 bg-slate-50 border py-3 px-4 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                                        <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                                            className="block w-full rounded-xl border-slate-200 bg-slate-50 border py-3 px-4 focus:border-brand-primary focus:ring-1 focus:ring-brand-primary outline-none transition-all" />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Hoja de Vida (PDF)</label>
                                        <div className="mt-1 flex justify-center rounded-xl border-2 border-dashed border-slate-300 px-6 pt-5 pb-6 hover:bg-slate-50 hover:border-brand-primary transition-all cursor-pointer relative group">
                                            <input ref={cvRef} type="file" accept=".pdf" required onChange={updateFileName}
                                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                                            <div className="space-y-2 text-center relative z-0">
                                                <FilePdf className="text-4xl text-slate-400 group-hover:text-brand-primary transition-colors mx-auto" />
                                                <div className="text-sm text-slate-600">
                                                    <span className="font-bold text-brand-dark">Selecciona un archivo</span>
                                                </div>
                                                <p className="text-xs text-slate-500 font-medium bg-white px-2 py-1 rounded-md shadow-sm border border-slate-100 inline-block">
                                                    {cvName !== 'Máximo 5MB'
                                                        ? <span className="text-green-600 font-bold inline-flex items-center gap-1"><CheckCircle /> {cvName}</span>
                                                        : 'Máximo 5MB'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-start pt-2 pb-2">
                                        <input id="terms" type="checkbox" required checked={terms} onChange={(e) => setTerms(e.target.checked)}
                                            className="h-4 w-4 rounded border-slate-300 text-brand-primary focus:ring-brand-primary mt-0.5" />
                                        <label htmlFor="terms" className="ml-3 text-sm text-slate-600">Acepto la <button type="button" onClick={() => setShowTerms(true)} className="text-brand-primary hover:underline font-bold">política de datos personales</button>.</label>
                                    </div>
                                    <button type="submit" disabled={sending}
                                        className="w-full rounded-xl bg-brand-dark hover:bg-blue-900 px-4 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-dark/20 transition-all flex justify-center items-center gap-2 disabled:opacity-70">
                                        {sending ? <><SpinnerGap className="text-xl animate-spin" /> Procesando...</> : 'Enviar Postulación'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL TÉRMINOS */}
            {showTerms && (
                <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true">
                    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => setShowTerms(false)}></div>
                    <div className="fixed inset-0 z-10 overflow-y-auto">
                        <div className="flex min-h-full items-center justify-center p-4">
                            <div className="relative rounded-2xl bg-white text-left shadow-2xl w-full max-w-2xl overflow-hidden">
                                <div className="border-b border-gray-100 px-6 py-5 bg-slate-50 flex justify-between items-center">
                                    <h3 className="text-lg font-bold text-brand-dark">Política de Tratamiento de Datos</h3>
                                    <button type="button" onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-brand-primary"><X className="text-xl" /></button>
                                </div>
                                <div className="p-6 max-h-[60vh] overflow-y-auto text-sm text-slate-600 space-y-3">
                                    <p>Al aceptar la política de tratamiento de datos, autorizo a <strong>RUSSELL BEDFORD</strong> para tratar mis datos personales para fines de reclutamiento y selección.</p>
                                    <p>Fui advertido sobre el derecho que tengo a conocer, actualizar, rectificar y suprimir mi información personal, así como el derecho a revocar el consentimiento otorgado.</p>
                                    <p>Para ejercer mis derechos, puedo comunicarme al correo: <a href="mailto:info@russellbedford.com.co" className="text-brand-primary">info@russellbedford.com.co</a></p>
                                </div>
                                <div className="px-6 py-4 bg-slate-50 flex justify-end gap-3 rounded-b-2xl">
                                    <button onClick={() => setShowTerms(false)} className="px-6 py-2 rounded-lg border border-gray-300 font-medium text-slate-600 hover:bg-white">Cerrar</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
