import { useState, useEffect, useRef } from 'react';
import {
  CheckCircle2, XCircle, Clock, Send, RotateCcw,
  Trophy, AlertCircle, Loader2, AlignLeft, Lock,
} from 'lucide-react';
import { enviarRespuestasCuestionario, getMisIntentosCuestionario } from '../../../lib/api';

export default function CuestionarioViewer({ contenido: contenidoItem, onAgotado, onCompletado }) {
  const rawData = (() => {
    try { return contenidoItem.contenido ? JSON.parse(contenidoItem.contenido) : null; }
    catch { return null; }
  })();

  const maxIntentos = contenidoItem.max_intentos || 0;

  const [respuestas, setRespuestas]     = useState({});
  const [resultado, setResultado]       = useState(null);
  const [mejorIntento, setMejorIntento] = useState(null);
  const [numIntentos, setNumIntentos]   = useState(0);
  const [loading, setLoading]           = useState(true);
  const [enviando, setEnviando]         = useState(false);
  const [segundos, setSegundos]         = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    getMisIntentosCuestionario(contenidoItem.id)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNumIntentos(data.length);
          const mejor = data.reduce((a, b) => a.puntaje > b.puntaje ? a : b);
          setMejorIntento(mejor);
          if (maxIntentos > 0 && data.length >= maxIntentos) onAgotado?.();
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contenidoItem.id]);

  useEffect(() => {
    if (!resultado && !loading) {
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [resultado, loading]);

  if (!rawData || !rawData.preguntas?.length) return (
    <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-medium">
      Este cuestionario aún no tiene preguntas configuradas.
    </div>
  );

  const { preguntas, puntaje_aprobacion = 70 } = rawData;
  const agotado = maxIntentos > 0 && numIntentos >= maxIntentos;
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  const respondidas = preguntas.filter(p =>
    p.tipo === 'texto_libre'
      ? (respuestas[p.id] ?? '').toString().trim() !== ''
      : respuestas[p.id] !== undefined
  ).length;

  const handleResponder = (id, val) => setRespuestas(prev => ({ ...prev, [id]: val }));

  const handleEnviar = async () => {
    clearInterval(timerRef.current);
    setEnviando(true);
    try {
      const res = await enviarRespuestasCuestionario(contenidoItem.id, {
        respuestas, tiempo_segundos: segundos,
      });
      const nuevos = numIntentos + 1;
      setNumIntentos(nuevos);
      setResultado({ ...res, respuestas_enviadas: { ...respuestas } });
      if (!mejorIntento || res.puntaje > mejorIntento.puntaje)
        setMejorIntento({ puntaje: res.puntaje, aprobado: res.aprobado });
      if (res.marcado_completado) onCompletado?.(contenidoItem.id);
      if (maxIntentos > 0 && nuevos >= maxIntentos) onAgotado?.();
    } catch {
      alert('Error al enviar las respuestas. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleReintentar = () => { setRespuestas({}); setResultado(null); setSegundos(0); };

  if (loading) return (
    <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
      <Loader2 size={15} className="animate-spin text-[#001871]"/> Cargando...
    </div>
  );

  /* ── Agotado sin resultado pendiente ── */
  if (agotado && !resultado) return (
    <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl">
      <div className="w-10 h-10 bg-slate-200 rounded-xl flex items-center justify-center flex-shrink-0">
        <Lock size={16} className="text-slate-400"/>
      </div>
      <div>
        <p className="text-sm font-bold text-slate-600">Sin más intentos disponibles</p>
        <p className="text-[11px] text-slate-400 mt-0.5">
          {mejorIntento ? `Mejor puntaje: ${mejorIntento.puntaje?.toFixed(1)}%` : ''}
          {mejorIntento ? ' · ' : ''}
          {numIntentos} de {maxIntentos} intento{maxIntentos !== 1 ? 's' : ''} usados
        </p>
      </div>
    </div>
  );

  /* ── Pantalla de resultado ── */
  if (resultado) {
    const aprobado = resultado.aprobado;
    const ahoraAgotado = maxIntentos > 0 && numIntentos >= maxIntentos;
    return (
      <div className="space-y-4 animate-in fade-in duration-300">

        {/* Resultado principal */}
        <div className={`rounded-2xl p-6 text-center ${
          aprobado
            ? 'bg-gradient-to-br from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-br from-[#001871] to-[#981d97]'
        }`}>
          {aprobado
            ? <Trophy size={44} className="mx-auto text-white/90 mb-3"/>
            : <XCircle size={44} className="mx-auto text-white/70 mb-3"/>
          }
          <p className="text-4xl font-black text-white">{resultado.puntaje.toFixed(1)}%</p>
          <p className="text-white/80 font-bold text-sm mt-1">
            {aprobado ? '¡Aprobado!' : 'No aprobado'}
          </p>
          <div className="flex items-center justify-center gap-4 mt-3 text-white/60 text-[11px]">
            <span>{resultado.correctas}/{resultado.total_autogradable} correctas</span>
            <span>·</span>
            <span>Mínimo {resultado.puntaje_aprobacion}%</span>
            {segundos > 0 && <><span>·</span><span className="flex items-center gap-1"><Clock size={10}/> {fmtTime(segundos)}</span></>}
            {maxIntentos > 0 && <><span>·</span><span>Intento {numIntentos}/{maxIntentos}</span></>}
          </div>
        </div>

        {/* Revisión pregunta por pregunta */}
        <div className="space-y-2">
          {preguntas.map((p, idx) => {
            if (p.tipo === 'texto_libre') return (
              <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Pregunta {idx + 1} · Respuesta libre
                </p>
                <p className="text-sm font-semibold text-slate-700 mb-2">{p.texto}</p>
                <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic border border-slate-100">
                  "{resultado.respuestas_enviadas[p.id] || '(sin respuesta)'}"
                </div>
              </div>
            );

            const enviada  = resultado.respuestas_enviadas[p.id];
            // Las respuestas correctas llegan en la respuesta POST (no en el quiz GET)
            const correcta = resultado.respuestas_correctas?.[String(p.id)];
            let esCorrecta = false;
            if (p.tipo === 'multiple')       esCorrecta = correcta !== undefined && Number(enviada) === Number(correcta);
            if (p.tipo === 'verdadero_falso') esCorrecta = correcta !== undefined && String(enviada).toLowerCase() === String(correcta).toLowerCase();

            return (
              <div key={p.id} className={`rounded-2xl p-4 border ${
                esCorrecta ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'
              }`}>
                <div className="flex items-start gap-2.5 mb-3">
                  {esCorrecta
                    ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0"/>
                    : <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0"/>
                  }
                  <p className="text-sm font-semibold text-slate-700">{p.texto}</p>
                </div>

                {p.tipo === 'multiple' && (
                  <div className="space-y-1 pl-7">
                    {p.opciones.map((op, oIdx) => {
                      const isCorrecta = correcta !== undefined && oIdx === Number(correcta);
                      const isSelected = Number(enviada) === oIdx;
                      return (
                        <div key={oIdx} className={`text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 ${
                          isCorrecta ? 'bg-emerald-100 text-emerald-800'
                          : isSelected ? 'bg-red-100 text-red-700'
                          : 'text-slate-400'
                        }`}>
                          <span>{isCorrecta ? '✓' : isSelected ? '✗' : '·'}</span>
                          {op}
                        </div>
                      );
                    })}
                  </div>
                )}

                {p.tipo === 'verdadero_falso' && (
                  <p className="text-xs pl-7 text-slate-600">
                    Tu respuesta: <strong>{String(enviada) === 'true' ? 'Verdadero' : 'Falso'}</strong>
                    {!esCorrecta && correcta !== undefined && <> · Correcta: <strong>{correcta ? 'Verdadero' : 'Falso'}</strong></>}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {!ahoraAgotado ? (
          <button onClick={handleReintentar}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#001871] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all">
            <RotateCcw size={13}/> Intentar de nuevo
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Lock size={12}/> No hay más intentos
          </div>
        )}
      </div>
    );
  }

  /* ── Pantalla del cuestionario ── */
  const pctRespondido = preguntas.length > 0 ? Math.round((respondidas / preguntas.length) * 100) : 0;

  return (
    <div className="space-y-4">

      {/* Barra de estado */}
      <div className="bg-white border border-slate-100 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-slate-500">{respondidas}/{preguntas.length} respondidas</span>
          <span className="flex items-center gap-1.5 text-slate-400">
            <Clock size={12}/> {fmtTime(segundos)}
          </span>
        </div>
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-[#001871] rounded-full transition-all duration-300"
            style={{ width: `${pctRespondido}%` }}/>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400 flex-wrap">
          <span>Mínimo para aprobar: <strong className="text-slate-600">{puntaje_aprobacion}%</strong></span>
          {maxIntentos > 0 && <><span>·</span><span>Intento <strong className="text-slate-600">{numIntentos + 1}/{maxIntentos}</strong></span></>}
        </div>
      </div>

      {/* Banner mejor intento */}
      {mejorIntento && (
        <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-[11px] font-semibold border ${
          mejorIntento.aprobado
            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
            : 'bg-amber-50 text-amber-700 border-amber-100'
        }`}>
          {mejorIntento.aprobado
            ? <CheckCircle2 size={13}/>
            : <AlertCircle size={13}/>
          }
          Mejor intento: {mejorIntento.puntaje?.toFixed(1)}%
          {mejorIntento.aprobado ? ' — Aprobado' : ' — Puedes mejorar tu puntaje'}
        </div>
      )}

      {/* Preguntas */}
      <div className="space-y-3">
        {preguntas.map((p, idx) => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            {/* Cabecera pregunta */}
            <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-[#001871] text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              <p className="text-sm font-semibold text-slate-700">{p.texto}</p>
            </div>

            <div className="p-4">
              {/* Opción múltiple */}
              {p.tipo === 'multiple' && (
                <div className="space-y-2">
                  {p.opciones.map((op, oIdx) => {
                    const sel = respuestas[p.id] !== undefined && Number(respuestas[p.id]) === oIdx;
                    return (
                      <button key={oIdx} type="button" onClick={() => handleResponder(p.id, oIdx)}
                        className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                          sel
                            ? 'bg-[#001871] text-white border-[#001871] font-semibold shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-[#001871]/30 hover:bg-[#001871]/5'
                        }`}>
                        <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          sel ? 'border-white' : 'border-slate-300'
                        }`}>
                          {sel && <span className="w-2.5 h-2.5 rounded-full bg-white"/>}
                        </span>
                        {op}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Verdadero / Falso */}
              {p.tipo === 'verdadero_falso' && (
                <div className="flex gap-3">
                  {[{ val: true, label: 'Verdadero' }, { val: false, label: 'Falso' }].map(({ val, label }) => {
                    const sel = respuestas[p.id] !== undefined && String(respuestas[p.id]) === String(val);
                    return (
                      <button key={label} type="button" onClick={() => handleResponder(p.id, val)}
                        className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                          sel
                            ? val
                              ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
                              : 'bg-red-500 text-white border-red-500 shadow-sm'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-white'
                        }`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Texto libre */}
              {p.tipo === 'texto_libre' && (
                <div>
                  <textarea value={respuestas[p.id] || ''} onChange={e => handleResponder(p.id, e.target.value)}
                    placeholder="Escribe tu respuesta aquí..." rows={3}
                    className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#001871] focus:ring-2 focus:ring-[#001871]/10 resize-none transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <AlignLeft size={10}/> Esta respuesta no se autocalifica
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Botón enviar */}
      <button onClick={handleEnviar} disabled={enviando || respondidas === 0}
        className="w-full flex items-center justify-center gap-2 py-4 bg-[#001871] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm">
        {enviando
          ? <><Loader2 size={14} className="animate-spin"/> Enviando...</>
          : <><Send size={14}/> Enviar respuestas</>
        }
      </button>
    </div>
  );
}
