import { useState, useEffect } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown, CheckCircle2, Circle, ToggleLeft, AlignLeft, ClipboardList } from 'lucide-react';

const TIPOS = [
  { key: 'multiple',       label: 'Opción múltiple', Icon: ClipboardList },
  { key: 'verdadero_falso',label: 'Verdadero / Falso', Icon: ToggleLeft },
  { key: 'texto_libre',    label: 'Respuesta libre',  Icon: AlignLeft },
];

const emptyPregunta = () => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  tipo: 'multiple',
  texto: '',
  opciones: ['', '', '', ''],
  correcta: 0,
});

export default function CuestionarioBuilder({ value, onChange }) {
  const [data, setData] = useState(() => {
    try { return value ? JSON.parse(value) : { puntaje_aprobacion: 70, preguntas: [] }; }
    catch { return { puntaje_aprobacion: 70, preguntas: [] }; }
  });

  useEffect(() => {
    onChange(JSON.stringify(data));
  }, [data]);

  const update = (fn) => setData(prev => { const next = fn(prev); return { ...next }; });

  const addPregunta = () => update(d => ({ ...d, preguntas: [...d.preguntas, emptyPregunta()] }));

  const removePregunta = (idx) => update(d => ({
    ...d, preguntas: d.preguntas.filter((_, i) => i !== idx),
  }));

  const movePregunta = (idx, dir) => update(d => {
    const arr = [...d.preguntas];
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return d;
    [arr[idx], arr[target]] = [arr[target], arr[idx]];
    return { ...d, preguntas: arr };
  });

  const updatePregunta = (idx, patch) => update(d => {
    const arr = [...d.preguntas];
    arr[idx] = { ...arr[idx], ...patch };
    return { ...d, preguntas: arr };
  });

  const updateOpcion = (pIdx, oIdx, val) => update(d => {
    const arr = [...d.preguntas];
    const opciones = [...arr[pIdx].opciones];
    opciones[oIdx] = val;
    arr[pIdx] = { ...arr[pIdx], opciones };
    return { ...d, preguntas: arr };
  });

  const addOpcion = (pIdx) => update(d => {
    const arr = [...d.preguntas];
    if (arr[pIdx].opciones.length >= 5) return d;
    arr[pIdx] = { ...arr[pIdx], opciones: [...arr[pIdx].opciones, ''] };
    return { ...d, preguntas: arr };
  });

  const removeOpcion = (pIdx, oIdx) => update(d => {
    const arr = [...d.preguntas];
    if (arr[pIdx].opciones.length <= 2) return d;
    const opciones = arr[pIdx].opciones.filter((_, i) => i !== oIdx);
    const correcta = arr[pIdx].correcta >= opciones.length ? 0 : arr[pIdx].correcta;
    arr[pIdx] = { ...arr[pIdx], opciones, correcta };
    return { ...d, preguntas: arr };
  });

  return (
    <div className="space-y-4">
      {/* Puntaje de aprobación */}
      <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-100 rounded-xl">
        <CheckCircle2 size={16} className="text-amber-600 flex-shrink-0" />
        <label className="text-xs font-bold text-amber-700 flex-shrink-0">Puntaje mínimo para aprobar:</label>
        <input
          type="number"
          min={0} max={100}
          value={data.puntaje_aprobacion}
          onChange={e => update(d => ({ ...d, puntaje_aprobacion: Number(e.target.value) }))}
          className="w-20 px-3 py-1.5 text-sm font-bold text-center bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-amber-400"
        />
        <span className="text-xs text-amber-600 font-semibold">%</span>
        <span className="text-[10px] text-amber-500 ml-auto">
          {data.preguntas.length} pregunta{data.preguntas.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Preguntas */}
      {data.preguntas.length === 0 && (
        <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
          <ClipboardList size={28} className="mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-medium">Sin preguntas aún</p>
          <p className="text-[11px] mt-0.5">Haz clic en "Agregar pregunta" para comenzar</p>
        </div>
      )}

      <div className="space-y-3">
        {data.preguntas.map((p, idx) => (
          <div key={p.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            {/* Cabecera de la pregunta */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="w-6 h-6 rounded-full bg-[#001871] text-white text-[11px] font-black flex items-center justify-center flex-shrink-0">
                {idx + 1}
              </span>
              {/* Selector de tipo */}
              <div className="flex gap-1 flex-wrap">
                {TIPOS.map(t => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => updatePregunta(idx, {
                      tipo: t.key,
                      correcta: t.key === 'verdadero_falso' ? true : (t.key === 'texto_libre' ? null : 0),
                      opciones: t.key === 'multiple' ? (p.opciones?.length >= 2 ? p.opciones : ['', '', '', '']) : [],
                    })}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border transition-all ${
                      p.tipo === t.key
                        ? 'bg-[#001871] text-white border-[#001871]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <t.Icon size={11} /> {t.label}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={() => movePregunta(idx, -1)} disabled={idx === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
                  <ChevronUp size={14} />
                </button>
                <button type="button" onClick={() => movePregunta(idx, 1)} disabled={idx === data.preguntas.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 transition-colors">
                  <ChevronDown size={14} />
                </button>
                <button type="button" onClick={() => removePregunta(idx)}
                  className="p-1 text-slate-400 hover:text-red-500 transition-colors ml-1">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Cuerpo de la pregunta */}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={p.texto}
                onChange={e => updatePregunta(idx, { texto: e.target.value })}
                placeholder="Escribe la pregunta aquí..."
                className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 font-medium transition-all"
              />

              {/* Opciones múltiples */}
              {p.tipo === 'multiple' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Opciones — selecciona la correcta</p>
                  {p.opciones.map((op, oIdx) => (
                    <div key={oIdx} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updatePregunta(idx, { correcta: oIdx })}
                        className="flex-shrink-0 transition-colors"
                      >
                        {p.correcta === oIdx
                          ? <CheckCircle2 size={18} className="text-emerald-500" />
                          : <Circle size={18} className="text-slate-300 hover:text-emerald-400" />
                        }
                      </button>
                      <input
                        type="text"
                        value={op}
                        onChange={e => updateOpcion(idx, oIdx, e.target.value)}
                        placeholder={`Opción ${oIdx + 1}...`}
                        className={`flex-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:border-purple-400 transition-all ${
                          p.correcta === oIdx
                            ? 'bg-emerald-50 border-emerald-200 font-semibold'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => removeOpcion(idx, oIdx)}
                        disabled={p.opciones.length <= 2}
                        className="p-1 text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                  {p.opciones.length < 5 && (
                    <button
                      type="button"
                      onClick={() => addOpcion(idx)}
                      className="flex items-center gap-1 text-[11px] font-bold text-purple-600 hover:text-purple-700 transition-colors mt-1"
                    >
                      <Plus size={12} /> Agregar opción
                    </button>
                  )}
                </div>
              )}

              {/* Verdadero / Falso */}
              {p.tipo === 'verdadero_falso' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Selecciona la respuesta correcta</p>
                  <div className="flex gap-3">
                    {[true, false].map(val => (
                      <button
                        key={String(val)}
                        type="button"
                        onClick={() => updatePregunta(idx, { correcta: val })}
                        className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                          p.correcta === val
                            ? (val ? 'bg-emerald-50 border-emerald-400 text-emerald-700' : 'bg-red-50 border-red-400 text-red-700')
                            : 'bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300'
                        }`}
                      >
                        {p.correcta === val ? <CheckCircle2 size={14} /> : <Circle size={14} />}
                        {val ? 'Verdadero' : 'Falso'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Respuesta libre */}
              {p.tipo === 'texto_libre' && (
                <div className="px-3 py-2 bg-blue-50 border border-blue-100 rounded-xl">
                  <p className="text-[11px] text-blue-600 font-medium">
                    El empleado escribirá su respuesta libremente. No se autocalifica.
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addPregunta}
        className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-purple-200 rounded-xl text-xs font-bold text-purple-600 hover:border-purple-400 hover:bg-purple-50 transition-all"
      >
        <Plus size={14} /> Agregar pregunta
      </button>
    </div>
  );
}
