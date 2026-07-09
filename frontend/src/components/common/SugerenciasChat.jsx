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
  const [position, setPosition] = useState(() => {
    if (typeof window === 'undefined') return { x: 24, y: 24 };
    return {
      x: Math.max(12, window.innerWidth - 72 - 24),
      y: Math.max(12, window.innerHeight - 72 - 24),
    };
  });
  const [lastBubblePosition, setLastBubblePosition] = useState(null);
  const [dragging, setDragging] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const panelRef = useRef(null);
  const dragStateRef = useRef({ pointerId: null, offsetX: 0, offsetY: 0, startX: 0, startY: 0, moved: false, source: null });
  const suppressOpenRef = useRef(false);

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  useEffect(() => {
    if (!open) return;
    setLastBubblePosition(position);
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

  useEffect(() => {
    if (!open) return;

    const keepInsideViewport = () => {
      const width = panelRef.current?.offsetWidth || 360;
      const height = panelRef.current?.offsetHeight || 520;
      setPosition(prev => ({
        x: clamp(prev.x, 12, Math.max(12, window.innerWidth - width - 12)),
        y: clamp(prev.y, 12, Math.max(12, window.innerHeight - height - 12)),
      }));
    };

    keepInsideViewport();
    window.addEventListener('resize', keepInsideViewport);
    return () => window.removeEventListener('resize', keepInsideViewport);
  }, [open]);

  useEffect(() => {
    if (!dragging) return;

    const handlePointerMove = (event) => {
      if (event.pointerId !== dragStateRef.current.pointerId) return;
      const source = dragStateRef.current.source;
      const width = source === 'button' ? 56 : (panelRef.current?.offsetWidth || 360);
      const height = source === 'button' ? 56 : (panelRef.current?.offsetHeight || 520);
      const nextX = clamp(event.clientX - dragStateRef.current.offsetX, 12, Math.max(12, window.innerWidth - width - 12));
      const nextY = clamp(event.clientY - dragStateRef.current.offsetY, 12, Math.max(12, window.innerHeight - height - 12));
      const dx = event.clientX - dragStateRef.current.startX;
      const dy = event.clientY - dragStateRef.current.startY;
      const movedDistance = Math.hypot(dx, dy);
      if (!dragStateRef.current.moved && movedDistance > 6) {
        dragStateRef.current.moved = true;
        suppressOpenRef.current = true;
      }

      dragStateRef.current.lastX = event.clientX;
      dragStateRef.current.lastY = event.clientY;
      setPosition({ x: nextX, y: nextY });
    };

    const handlePointerUp = (event) => {
      if (dragStateRef.current.pointerId !== null && event.pointerId !== dragStateRef.current.pointerId) return;
      setDragging(false);
      dragStateRef.current.pointerId = null;
      dragStateRef.current.moved = false;
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [dragging]);

  const iniciarArrastre = (event, source) => {
    if (event.button !== 0) return;

    const rect = source === 'panel' && panelRef.current
      ? panelRef.current.getBoundingClientRect()
      : { left: event.clientX, top: event.clientY };
    suppressOpenRef.current = false;
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      moved: false,
      source,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

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
          onPointerDown={(event) => iniciarArrastre(event, 'button')}
          onClick={(event) => {
            event.preventDefault();
            if (event.button !== 2 && !suppressOpenRef.current) {
              setOpen(true);
            }
            suppressOpenRef.current = false;
          }}
          onContextMenu={(event) => event.preventDefault()}
          title="Sugerencias, dudas o problemas"
          className="fixed z-50 w-14 h-14 bg-[#00a9ce] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#0090b0] hover:scale-105 transition-all touch-none"
          style={{ left: `${position.x}px`, top: `${position.y}px`, transition: dragging ? 'none' : 'left 160ms ease-out, top 160ms ease-out, transform 160ms ease-out, box-shadow 160ms ease-out' }}
        >
          <MessageSquarePlus size={22} />
        </button>
      )}

      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 w-[min(92vw,360px)] h-[min(86vh,520px)] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden"
          style={{ left: `${position.x}px`, top: `${position.y}px` }}
        >

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 bg-[#00a9ce] text-white flex-shrink-0 cursor-grab active:cursor-grabbing"
            onPointerDown={(event) => iniciarArrastre(event, 'panel')}
          >
            <div className="flex items-center gap-2">
              <MessageSquarePlus size={18} />
              <div>
                <p className="text-sm font-bold leading-tight">Sugerencias</p>
                <p className="text-[10px] text-cyan-100 font-medium">Sugerencias · Dudas · Problemas</p>
              </div>
            </div>
            <button
              type="button"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (lastBubblePosition) {
                  setPosition(lastBubblePosition);
                }
                setOpen(false);
              }}
              className="p-1 rounded-lg hover:bg-white/20 transition-colors"
            >
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
