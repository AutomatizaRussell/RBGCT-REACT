import { useState, useRef, useEffect } from 'react';
import { X, Send, Bot, Loader2, Sparkles } from 'lucide-react';
import { fetchApi } from '../../lib/api';

const GeminiChat = () => {
  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte hoy?' },
  ]);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text }]);
    setLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        text: m.text,
      }));

      const data = await fetchApi('/gemini-chat/', {
        method: 'POST',
        body: JSON.stringify({ message: text, history }),
      });

      setMessages(prev => [...prev, { role: 'assistant', text: data.reply || 'Sin respuesta.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error al conectar con el asistente.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* ── Botón flotante ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          title="Asistente IA"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-[#001871] text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-[#002a9e] hover:scale-105 transition-all"
        >
          <Sparkles size={22} />
        </button>
      )}

      {/* ── Ventana de chat ── */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[360px] h-[520px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 overflow-hidden">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-[#001871] text-white flex-shrink-0">
            <div className="flex items-center gap-2">
              <Bot size={18} />
              <div>
                <p className="text-sm font-bold leading-tight">Asistente RBG CT</p>
                <p className="text-[10px] text-blue-200 font-medium">Gemini 2.5 Flash</p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-white/20 transition-colors">
              <X size={16} />
            </button>
          </div>

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user'
                    ? 'bg-[#001871] text-white rounded-br-none'
                    : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-3 py-2 shadow-sm flex gap-1 items-center">
                  <Loader2 size={14} className="animate-spin text-[#001871]" />
                  <span className="text-xs text-slate-400">Escribiendo...</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white flex gap-2 flex-shrink-0">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Escribe tu pregunta..."
              className="flex-1 px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] transition-colors"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="p-2 bg-[#001871] text-white rounded-xl hover:bg-[#002a9e] disabled:opacity-40 transition-colors flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>

        </div>
      )}
    </>
  );
};

export default GeminiChat;
