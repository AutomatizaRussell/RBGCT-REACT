import { useState } from 'react';
import { QrCode, Type, ExternalLink, Copy, Check, Download } from 'lucide-react';

// ── Herramientas externas populares ──────────────────────────────────────────

const HERRAMIENTAS_EXTERNAS = [
  { nombre: 'iLovePDF',       desc: 'Convertir, comprimir y editar PDFs',   url: 'https://www.ilovepdf.com/es',      color: 'bg-red-50 border-red-100 text-red-600' },
  { nombre: 'Convertio',      desc: 'Convertir cualquier tipo de archivo',   url: 'https://convertio.co/es/',         color: 'bg-blue-50 border-blue-100 text-blue-600' },
  { nombre: 'TinyPNG',        desc: 'Comprimir imágenes PNG y JPEG',         url: 'https://tinypng.com',              color: 'bg-emerald-50 border-emerald-100 text-emerald-600' },
  { nombre: 'Smallpdf',       desc: 'Suite completa para PDFs',              url: 'https://smallpdf.com/es',          color: 'bg-orange-50 border-orange-100 text-orange-600' },
  { nombre: 'Remove.bg',      desc: 'Eliminar fondo de imágenes',            url: 'https://www.remove.bg/es',         color: 'bg-purple-50 border-purple-100 text-purple-600' },
  { nombre: 'Canva',          desc: 'Diseño gráfico online',                 url: 'https://www.canva.com/es_co/',     color: 'bg-teal-50 border-teal-100 text-teal-600' },
];

// ── Generador de QR ───────────────────────────────────────────────────────────

function GeneradorQR() {
  const [texto, setTexto] = useState('');
  const [qrUrl, setQrUrl] = useState('');
  const [copied, setCopied] = useState(false);

  const generar = () => {
    if (!texto.trim()) return;
    const encoded = encodeURIComponent(texto.trim());
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?data=${encoded}&size=200x200&margin=10`);
  };

  const copiarUrl = () => {
    navigator.clipboard.writeText(texto);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-slate-100 rounded-xl"><QrCode size={18} className="text-[#001e33]"/></div>
        <div>
          <h4 className="font-bold text-[#001e33] text-sm">Generador de QR</h4>
          <p className="text-[10px] text-slate-400">Convierte cualquier texto o URL a código QR</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && generar()}
          placeholder="Texto o URL a convertir..."
          className="flex-1 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors"
        />
        <button
          onClick={generar}
          disabled={!texto.trim()}
          className="px-4 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-40 transition-all"
        >
          Generar
        </button>
      </div>

      {qrUrl && (
        <div className="flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
          <img src={qrUrl} alt="QR Code" className="w-40 h-40 rounded-lg border border-white shadow"/>
          <div className="flex gap-2">
            <button
              onClick={copiarUrl}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              {copied ? <Check size={12} className="text-emerald-500"/> : <Copy size={12}/>}
              {copied ? 'Copiado' : 'Copiar texto'}
            </button>
            <a
              href={qrUrl}
              download="qrcode.png"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-2 bg-[#001e33] text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-all"
            >
              <Download size={12}/> Descargar
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transformador de texto ────────────────────────────────────────────────────

const TRANSFORMACIONES = [
  { id: 'upper',    label: 'MAYÚSCULAS',    fn: t => t.toUpperCase() },
  { id: 'lower',    label: 'minúsculas',    fn: t => t.toLowerCase() },
  { id: 'title',    label: 'Título',        fn: t => t.replace(/\b\w/g, c => c.toUpperCase()) },
  { id: 'trim',     label: 'Sin espacios',  fn: t => t.trim().replace(/\s+/g, ' ') },
  { id: 'noaccent', label: 'Sin tildes',    fn: t => t.normalize('NFD').replace(/[̀-ͯ]/g, '') },
  { id: 'reverse',  label: 'Invertir',      fn: t => t.split('').reverse().join('') },
  { id: 'count',    label: 'Contar',        fn: t => `Caracteres: ${t.length} | Palabras: ${t.trim() ? t.trim().split(/\s+/).length : 0} | Líneas: ${t.split('\n').length}` },
];

function TransformadorTexto() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const aplicar = (fn) => {
    if (!input.trim()) return;
    setOutput(fn(input));
  };

  const copiar = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 bg-slate-100 rounded-xl"><Type size={18} className="text-[#001e33]"/></div>
        <div>
          <h4 className="font-bold text-[#001e33] text-sm">Transformador de Texto</h4>
          <p className="text-[10px] text-slate-400">Aplica transformaciones rápidas a cualquier texto</p>
        </div>
      </div>

      <textarea
        value={input}
        onChange={e => setInput(e.target.value)}
        placeholder="Pega tu texto aquí..."
        rows={3}
        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-400 transition-colors resize-none mb-3"
      />

      <div className="flex flex-wrap gap-1.5 mb-4">
        {TRANSFORMACIONES.map(t => (
          <button
            key={t.id}
            onClick={() => aplicar(t.fn)}
            disabled={!input.trim()}
            className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[11px] font-bold hover:bg-[#001e33] hover:text-white disabled:opacity-40 transition-all"
          >
            {t.label}
          </button>
        ))}
      </div>

      {output && (
        <div className="relative">
          <textarea
            value={output}
            readOnly
            rows={3}
            className="w-full px-4 py-3 text-sm bg-emerald-50 border border-emerald-100 rounded-xl resize-none focus:outline-none text-emerald-800 font-medium"
          />
          <button
            onClick={copiar}
            className="absolute top-2 right-2 flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:bg-slate-50 shadow-sm transition-all"
          >
            {copied ? <Check size={11} className="text-emerald-500"/> : <Copy size={11}/>}
            {copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function UtilidadesSection() {
  return (
    <div className="space-y-6">
      {/* Herramientas internas */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Herramientas Integradas</p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <GeneradorQR />
          <TransformadorTexto />
        </div>
      </div>

      {/* Herramientas externas */}
      <div>
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">Conversión y Edición de Archivos</p>
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {HERRAMIENTAS_EXTERNAS.map(h => (
            <a
              key={h.nombre}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex flex-col gap-2 p-4 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all group ${h.color.split(' ')[1]} ${h.color.split(' ')[0]}`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${h.color.split(' ')[2]}`}>{h.nombre}</span>
                <ExternalLink size={13} className="opacity-40 group-hover:opacity-100 transition-opacity text-slate-500"/>
              </div>
              <p className="text-[11px] text-slate-500 leading-snug">{h.desc}</p>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
