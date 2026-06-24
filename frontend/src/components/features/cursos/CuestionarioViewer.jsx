import { useState, useEffect, useRef } from 'react';
import { CheckCircle2, XCircle, Clock, Send, RotateCcw, Trophy, AlertCircle, Loader2, AlignLeft, Lock } from 'lucide-react';
import { enviarRespuestasCuestionario, getMisIntentosCuestionario } from '../../../lib/api';

export default function CuestionarioViewer({ contenido: contenidoItem, onAgotado, onCompletado }) {
  const rawData = (() => {
    try { return contenidoItem.contenido ? JSON.parse(contenidoItem.contenido) : null; }
    catch { return null; }
  })();

  const maxIntentos = contenidoItem.max_intentos || 0; // 0 = sin límite

  const [respuestas, setRespuestas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [mejorIntento, setMejorIntento] = useState(null);
  const [numIntentos, setNumIntentos] = useState(0);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    getMisIntentosCuestionario(contenidoItem.id)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setNumIntentos(data.length);
          const mejor = data.reduce((a, b) => a.puntaje > b.puntaje ? a : b);
          setMejorIntento(mejor);
          // Notificar al padre si ya está agotado al cargar
          if (maxIntentos > 0 && data.length >= maxIntentos) {
            onAgotado?.();
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [contenidoItem.id]);

  useEffect(() => {
    if (!resultado) {
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [resultado]);

  if (!rawData || !rawData.preguntas?.length) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-700 font-medium">
        Este cuestionario aún no tiene preguntas configuradas.
      </div>
    );
  }

  const { preguntas, puntaje_aprobacion = 70 } = rawData;
  const agotado = maxIntentos > 0 && numIntentos >= maxIntentos;

  const handleResponder = (preguntaId, valor) => {
    setRespuestas(prev => ({ ...prev, [preguntaId]: valor }));
  };

  const preguntasRespondidas = preguntas.filter(p =>
    p.tipo === 'texto_libre'
      ? (respuestas[p.id] ?? '').toString().trim() !== ''
      : respuestas[p.id] !== undefined
  ).length;

  const handleEnviar = async () => {
    clearInterval(timerRef.current);
    setEnviando(true);
    try {
      const res = await enviarRespuestasCuestionario(contenidoItem.id, {
        respuestas,
        tiempo_segundos: segundos,
      });
      const nuevosIntentos = numIntentos + 1;
      setNumIntentos(nuevosIntentos);
      setResultado({ ...res, respuestas_enviadas: { ...respuestas } });
      if (!mejorIntento || res.puntaje > mejorIntento.puntaje) {
        setMejorIntento({ puntaje: res.puntaje, aprobado: res.aprobado });
      }
      // Notificar completado si el backend lo marcó
      if (res.marcado_completado) {
        onCompletado?.(contenidoItem.id);
      }
      // Notificar al padre si con este intento se agota el límite
      if (maxIntentos > 0 && nuevosIntentos >= maxIntentos) {
        onAgotado?.();
      }
    } catch (e) {
      alert('Error al enviar las respuestas. Intenta nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  const handleReintentar = () => {
    setRespuestas({});
    setResultado(null);
    setSegundos(0);
  };

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-4 text-sm text-slate-400">
        <Loader2 size={16} className="animate-spin" /> Cargando cuestionario...
      </div>
    );
  }

  /* ── Límite de intentos alcanzado ── */
  if (agotado && !resultado) {
    return (
      <div className="flex items-center gap-3 p-4 bg-slate-100 border border-slate-200 rounded-2xl">
        <Lock size={18} className="text-slate-400 flex-shrink-0"/>
        <div>
          <p className="text-sm font-bold text-slate-500">Límite de intentos alcanzado</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Usaste {numIntentos} de {maxIntentos} intento{maxIntentos !== 1 ? 's' : ''} ·{' '}
            {mejorIntento
              ? `Mejor puntaje: ${mejorIntento.puntaje?.toFixed(1)}%`
              : 'Sin intentos registrados'}
          </p>
        </div>
      </div>
    );
  }

  /* ── Pantalla de resultado ── */
  if (resultado) {
    const aprobado = resultado.aprobado;
    const ahoraAgotado = maxIntentos > 0 && numIntentos >= maxIntentos;
    return (
      <div className="space-y-4 animate-in fade-in duration-300">
        <div className={`rounded-2xl p-6 text-center border-2 ${aprobado ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
          {aprobado
            ? <Trophy size={40} className="mx-auto text-emerald-500 mb-2" />
            : <XCircle size={40} className="mx-auto text-red-400 mb-2" />
          }
          <p className={`text-2xl font-black ${aprobado ? 'text-emerald-700' : 'text-red-700'}`}>
            {resultado.puntaje.toFixed(1)}%
          </p>
          <p className={`text-sm font-bold mt-1 ${aprobado ? 'text-emerald-600' : 'text-red-600'}`}>
            {aprobado ? '¡Aprobado!' : 'No aprobado'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {resultado.correctas} de {resultado.total_autogradable} preguntas correctas · Mínimo: {resultado.puntaje_aprobacion}%
          </p>
          {maxIntentos > 0 && (
            <p className="text-[11px] text-slate-400 mt-1">
              Intento {numIntentos} de {maxIntentos}
            </p>
          )}
          {segundos > 0 && (
            <p className="text-[11px] text-slate-400 mt-1 flex items-center justify-center gap-1">
              <Clock size={11} /> Tiempo: {fmtTime(segundos)}
            </p>
          )}
        </div>

        {/* Revisión pregunta por pregunta */}
        <div className="space-y-3">
          {preguntas.map((p, idx) => {
            if (p.tipo === 'texto_libre') {
              return (
                <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4">
                  <p className="text-xs font-bold text-slate-400 mb-1">Pregunta {idx + 1} · Respuesta libre</p>
                  <p className="text-sm font-semibold text-slate-700 mb-2">{p.texto}</p>
                  <div className="p-3 bg-slate-50 rounded-xl text-sm text-slate-600 italic">
                    "{resultado.respuestas_enviadas[p.id] || '(sin respuesta)'}"
                  </div>
                </div>
              );
            }
            const enviada = resultado.respuestas_enviadas[p.id];
            let esCorrecta = false;
            if (p.tipo === 'multiple') esCorrecta = Number(enviada) === Number(p.correcta);
            if (p.tipo === 'verdadero_falso') esCorrecta = String(enviada).toLowerCase() === String(p.correcta).toLowerCase();
            return (
              <div key={p.id} className={`rounded-2xl p-4 border ${esCorrecta ? 'bg-emerald-50 border-emerald-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-start gap-2 mb-2">
                  {esCorrecta
                    ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                    : <XCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                  }
                  <p className="text-sm font-semibold text-slate-700">{p.texto}</p>
                </div>
                {p.tipo === 'multiple' && (
                  <div className="space-y-1 pl-6">
                    {p.opciones.map((op, oIdx) => {
                      const isCorrectaIdx = oIdx === Number(p.correcta);
                      const isSelected = Number(enviada) === oIdx;
                      return (
                        <div key={oIdx} className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                          isCorrectaIdx ? 'bg-emerald-100 text-emerald-800' :
                          isSelected ? 'bg-red-100 text-red-700' : 'text-slate-500'
                        }`}>
                          {isCorrectaIdx ? '✓ ' : isSelected ? '✗ ' : '  '}{op}
                        </div>
                      );
                    })}
                  </div>
                )}
                {p.tipo === 'verdadero_falso' && (
                  <p className="text-xs pl-6 text-slate-600">
                    Tu respuesta: <strong>{String(enviada) === 'true' ? 'Verdadero' : 'Falso'}</strong>
                    {!esCorrecta && <> · Correcta: <strong>{p.correcta ? 'Verdadero' : 'Falso'}</strong></>}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Reintentar solo si no está agotado */}
        {!ahoraAgotado ? (
          <button
            onClick={handleReintentar}
            className="w-full flex items-center justify-center gap-2 py-3 bg-[#001871] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all"
          >
            <RotateCcw size={14} /> Intentar de nuevo
          </button>
        ) : (
          <div className="flex items-center justify-center gap-2 py-3 bg-slate-100 border border-slate-200 rounded-2xl text-xs font-bold text-slate-400 uppercase tracking-widest">
            <Lock size={13} /> No hay más intentos disponibles
          </div>
        )}
      </div>
    );
  }

  /* ── Pantalla del cuestionario ── */
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
        <div className="flex items-center gap-3">
          <span>{preguntasRespondidas}/{preguntas.length} respondidas</span>
          <span className="text-slate-300">·</span>
          <span>Mínimo para aprobar: {puntaje_aprobacion}%</span>
          {maxIntentos > 0 && (
            <>
              <span className="text-slate-300">·</span>
              <span>{numIntentos + 1}/{maxIntentos} intento</span>
            </>
          )}
        </div>
        <span className="flex items-center gap-1">
          <Clock size={12} /> {fmtTime(segundos)}
        </span>
      </div>

      {mejorIntento && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-semibold ${
          mejorIntento.aprobado ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
        }`}>
          {mejorIntento.aprobado ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
          Tu mejor intento: {mejorIntento.puntaje?.toFixed(1)}%
          {mejorIntento.aprobado ? ' · Aprobado' : ' · No aprobado — puedes reintentar'}
        </div>
      )}

      <div className="space-y-4">
        {preguntas.map((p, idx) => (
          <div key={p.id} className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Pregunta {idx + 1}</p>
            <p className="text-sm font-semibold text-slate-800 mb-3">{p.texto}</p>

            {p.tipo === 'multiple' && (
              <div className="space-y-2">
                {p.opciones.map((op, oIdx) => {
                  const selected = respuestas[p.id] !== undefined && Number(respuestas[p.id]) === oIdx;
                  return (
                    <button
                      key={oIdx}
                      type="button"
                      onClick={() => handleResponder(p.id, oIdx)}
                      className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl border text-sm transition-all ${
                        selected
                          ? 'bg-[#001871] text-white border-[#001871] font-semibold'
                          : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        selected ? 'border-white bg-white' : 'border-slate-300'
                      }`}>
                        {selected && <span className="w-2.5 h-2.5 rounded-full bg-[#001871]" />}
                      </span>
                      {op}
                    </button>
                  );
                })}
              </div>
            )}

            {p.tipo === 'verdadero_falso' && (
              <div className="flex gap-3">
                {[{ val: true, label: 'Verdadero' }, { val: false, label: 'Falso' }].map(({ val, label }) => {
                  const selected = respuestas[p.id] !== undefined && String(respuestas[p.id]) === String(val);
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => handleResponder(p.id, val)}
                      className={`flex-1 py-3 rounded-xl border text-sm font-bold transition-all ${
                        selected
                          ? (val ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-red-400 text-white border-red-400')
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {p.tipo === 'texto_libre' && (
              <div>
                <textarea
                  value={respuestas[p.id] || ''}
                  onChange={e => handleResponder(p.id, e.target.value)}
                  placeholder="Escribe tu respuesta aquí..."
                  rows={3}
                  className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 resize-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                  <AlignLeft size={11} /> Esta respuesta no se autocalifica
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={handleEnviar}
        disabled={enviando || preguntasRespondidas === 0}
        className="w-full flex items-center justify-center gap-2 py-4 bg-[#001871] text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
      >
        {enviando
          ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
          : <><Send size={15} /> Enviar respuestas</>
        }
      </button>
    </div>
  );
}
