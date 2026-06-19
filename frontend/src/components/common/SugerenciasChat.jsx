import { useState, useRef, useEffect } from 'react';
import { X, Send, MessageSquarePlus, Loader2, CheckCheck, Check } from 'lucide-react';
import { enviarSugerencia, getMisSugerencias } from '../../lib/api';

const fechaCorta = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) +
    ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

/**
 * Botón flotante de sugerencias, disponible para todos los roles.
 * Despliega un chat donde el empleado envía sugerencias/dudas/problemas;
 * cada envío queda guardado y los admin lo reciben en su campanita.
 *
 * `desplazado`: corre el botón a la izquierda cuando convive con otro
 * botón flotante (p. ej. el Asistente GCT en admin2).
 */
const SugerenciasChat = ({ desplazado = false }) => {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [sugerencias, setSugerencias] = useState([]);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  const posicion = desplazado ? 'right-24' : 'right-6';

  useEffect(() => {
    if (!open) return;
    setTimeout(() => inputRef.current?.focus(), 100);
    setCargando(true);
    getMisSugerencias()
      .then(data => setSugerencias((data?.sugerencias || []).slice().reverse()))
      .catch(() => { })
      .finally(() => setCargando(false));
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [sugerencias, open]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t || enviando) return;
    setEnviando(true);
    setError('');
    try {
      const nueva = await enviarSugerencia(t);
      setSugerencias(prev => [...prev, nueva]);
      setTexto('');
    } catch (e) {
      setError(e.message || 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Sugerencias, dudas o problemas"
          className={`fixed bottom-6 ${posicion} z-50 w-14 h-14 bg-[#00a9ce] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#0090b0] hover:scale-105 transition-all`}
        >
          <MessageSquarePlus size={22} />
        </button>
      )}

      {open && (
        <div className={`fixed bottom-6 ${posicion} z-50 w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden`}>

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#00a9ce] text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <MessageSquarePlus size={18} />
              <div>
                <p className="text-sm font-bold leading-tight">Sugerencias</p>
                <p className="text-[10px] text-cyan-100 font-medium">Sugerencias · Dudas · Problemas</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Historial */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            <div className="text-center text-[11px] text-slate-400 leading-relaxed px-4">
              Escribe tu sugerencia, duda o problema. El equipo administrativo
              la recibirá y te llegará la confirmación aquí y en tu campanita.
            </div>

            {cargando && (
              <div className="flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            )}

            {sugerencias.map(s => (
              <div key={s.id} className="flex justify-end">
                <div className="max-w-[85%] bg-[#001871] text-white px-3 py-2 rounded-2xl rounded-br-none text-sm leading-relaxed whitespace-pre-wrap break-words shadow-sm">
                  {s.sugerencia}
                  <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-blue-200">
                    {fechaCorta(s.fecha_envio)}
                    {s.recibida
                      ? <span className="inline-flex items-center gap-0.5 text-emerald-300 font-semibold"><CheckCheck size={12} /> Recibida</span>
                      : <span className="inline-flex items-center gap-0.5"><Check size={12} /> Enviada</span>}
                  </div>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white flex-shrink-0">
            {error && <p className="mb-2 text-[11px] font-semibold text-red-600">{error}</p>}
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                rows={2}
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
                placeholder="Escribe aquí…"
                className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#00a9ce] transition-colors resize-none"
              />
              <button
                onClick={enviar}
                disabled={enviando || !texto.trim()}
                className="p-2 bg-[#00a9ce] text-white rounded-xl hover:bg-[#0090b0] disabled:opacity-40 transition-colors flex-shrink-0"
              >
                {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SugerenciasChat;
