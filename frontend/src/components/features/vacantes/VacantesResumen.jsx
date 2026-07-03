import React, { useEffect, useState } from 'react';
import { Briefcase, MapPin, ArrowUpRight, ExternalLink } from 'lucide-react';
import { supabaseVacantes } from '../../../lib/supabaseVacantes';

// Widget para la página principal del empleado: muestra las vacantes abiertas
// (Supabase) y un acceso al portal público. Visible para todos los usuarios.
export default function VacantesResumen() {
    const [vacantes, setVacantes] = useState(null); // null = cargando

    useEffect(() => {
        let activo = true;
        (async () => {
            try {
                const { data, error } = await supabaseVacantes
                    .schema('rbgct').from('vacantes')
                    .select('id, titulo, area_solicitante, estado, fecha_publicacion')
                    .eq('estado', 'abierta')
                    .order('fecha_publicacion', { ascending: false });
                if (error) throw error;
                if (activo) setVacantes(data || []);
            } catch (e) {
                console.error('Error cargando vacantes (resumen):', e);
                if (activo) setVacantes([]);
            }
        })();
        return () => { activo = false; };
    }, []);

    const abrirPortal = () => window.open('/vacantes', '_blank', 'noopener');

    return (
        <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm lg:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-4">
                <div>
                    <h3 className="text-base font-semibold text-[#001871]">Vacantes disponibles</h3>
                    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-500">
                        Oportunidades internas
                    </p>
                </div>
                <button
                    type="button"
                    onClick={abrirPortal}
                    className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 transition-colors hover:text-[#001871]"
                >
                    Ver vacantes <ExternalLink size={12} strokeWidth={2} />
                </button>
            </div>

            {vacantes === null && (
                <p className="py-6 text-center text-xs text-slate-500">Cargando vacantes…</p>
            )}

            {vacantes !== null && vacantes.length === 0 && (
                <p className="py-6 text-center text-xs text-slate-500">No hay vacantes abiertas en este momento.</p>
            )}

            {vacantes !== null && vacantes.length > 0 && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {vacantes.map((v) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={abrirPortal}
                            className="group flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 text-left transition-all hover:border-[#F26822]/40 hover:shadow-md"
                        >
                            <div className="flex items-start justify-between gap-2">
                                <span className="inline-block rounded-md bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#001871]">
                                    {v.area_solicitante || 'General'}
                                </span>
                                <ArrowUpRight size={16} className="shrink-0 text-slate-300 transition-colors group-hover:text-[#F26822]" />
                            </div>
                            <h4 className="text-sm font-bold leading-tight text-slate-800 transition-colors group-hover:text-[#F26822]">
                                {v.titulo}
                            </h4>
                            <div className="mt-auto flex items-center gap-3 border-t border-slate-50 pt-3 text-[11px] font-semibold text-slate-500">
                                <span className="flex items-center gap-1"><MapPin size={13} className="text-[#528F70]" /> Medellín</span>
                                <span className="flex items-center gap-1"><Briefcase size={13} className="text-[#528F70]" /> Tiempo Completo</span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
