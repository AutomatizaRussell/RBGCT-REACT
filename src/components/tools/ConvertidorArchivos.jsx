import { useState, useRef } from 'react';
import { FileUp, Download, X, Loader2, ChevronDown, ChevronUp, ArrowRight, FileText, FileSpreadsheet, FileImage, File } from 'lucide-react';
import { fetchApi } from '../../lib/api.js';

const FORMATOS = {
  pdf: { icono: FileText, color: 'bg-red-100 text-red-600', label: 'PDF' },
  docx: { icono: FileText, color: 'bg-blue-100 text-blue-600', label: 'Word' },
  xlsx: { icono: FileSpreadsheet, color: 'bg-green-100 text-green-600', label: 'Excel' },
  txt: { icono: FileText, color: 'bg-slate-100 text-slate-600', label: 'Texto' },
  html: { icono: FileText, color: 'bg-orange-100 text-orange-600', label: 'HTML' },
  md: { icono: FileText, color: 'bg-purple-100 text-purple-600', label: 'Markdown' },
  png: { icono: FileImage, color: 'bg-pink-100 text-pink-600', label: 'PNG' },
  jpg: { icono: FileImage, color: 'bg-yellow-100 text-yellow-600', label: 'JPG' },
  jpeg: { icono: FileImage, color: 'bg-yellow-100 text-yellow-600', label: 'JPEG' },
  gif: { icono: FileImage, color: 'bg-cyan-100 text-cyan-600', label: 'GIF' },
  bmp: { icono: FileImage, color: 'bg-indigo-100 text-indigo-600', label: 'BMP' },
  webp: { icono: FileImage, color: 'bg-teal-100 text-teal-600', label: 'WebP' },
};

const CONVERSIONES_SOPORTADAS = [
  { desde: 'pdf', hasta: 'docx', descripcion: 'PDF a Word' },
  { desde: 'pdf', hasta: 'txt', descripcion: 'PDF a Texto' },
  { desde: 'docx', hasta: 'pdf', descripcion: 'Word a PDF' },
  { desde: 'docx', hasta: 'html', descripcion: 'Word a HTML' },
  { desde: 'docx', hasta: 'txt', descripcion: 'Word a Texto' },
  { desde: 'xlsx', hasta: 'pdf', descripcion: 'Excel a PDF' },
  { desde: 'xlsx', hasta: 'csv', descripcion: 'Excel a CSV' },
  { desde: 'xlsx', hasta: 'txt', descripcion: 'Excel a Texto' },
  { desde: 'csv', hasta: 'xlsx', descripcion: 'CSV a Excel' },
  { desde: 'txt', hasta: 'docx', descripcion: 'Texto a Word' },
  { desde: 'txt', hasta: 'pdf', descripcion: 'Texto a PDF' },
  { desde: 'html', hasta: 'pdf', descripcion: 'HTML a PDF' },
  { desde: 'html', hasta: 'docx', descripcion: 'HTML a Word' },
  { desde: 'png', hasta: 'pdf', descripcion: 'Imagen a PDF' },
  { desde: 'jpg', hasta: 'pdf', descripcion: 'Imagen a PDF' },
  { desde: 'jpeg', hasta: 'pdf', descripcion: 'Imagen a PDF' },
  { desde: 'gif', hasta: 'pdf', descripcion: 'Imagen a PDF' },
  { desde: 'bmp', hasta: 'pdf', descripcion: 'Imagen a PDF' },
  { desde: 'webp', hasta: 'pdf', descripcion: 'Imagen a PDF' },
];

export default function ConvertidorArchivos() {
  const [expandido, setExpandido] = useState(false);
  const [archivo, setArchivo] = useState(null);
  const [formatoDestino, setFormatoDestino] = useState('');
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exitoso, setExitoso] = useState(false);
  const fileInputRef = useRef(null);

  const detectarFormato = (nombre) => {
    const ext = nombre.split('.').pop().toLowerCase();
    return FORMATOS[ext] ? ext : 'txt';
  };

  const formatosDisponibles = archivo
    ? CONVERSIONES_SOPORTADAS.filter(c => c.desde === detectarFormato(archivo.name))
    : [];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setFormatoDestino('');
      setError(null);
      setExitoso(false);
    }
  };

  const convertirArchivo = async () => {
    if (!archivo || !formatoDestino) return;

    setConvirtiendo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('archivo', archivo);
      formData.append('formato_destino', formatoDestino);

      const response = await fetchApi('/convertir-archivo/', {
        method: 'POST',
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      // Descargar archivo convertido
      const byteCharacters = atob(response.archivo_base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: response.mime_type });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = response.nombre_archivo;
      a.click();
      URL.revokeObjectURL(url);

      setExitoso(true);
      setTimeout(() => {
        setArchivo(null);
        setFormatoDestino('');
        setExitoso(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);

    } catch (err) {
      setError(err.message || 'Error al convertir archivo');
    } finally {
      setConvirtiendo(false);
    }
  };

  const limpiar = () => {
    setArchivo(null);
    setFormatoDestino('');
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Vista colapsada
  if (!expandido) {
    return (
      <button
        onClick={() => setExpandido(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all group"
        title="Convertidor de Archivos"
      >
        <div className="p-1.5 bg-emerald-600 rounded-lg">
          <ArrowRight size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-600">
          Convertir Archivos
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
    );
  }

  const formatoActual = archivo ? detectarFormato(archivo.name) : null;
  const IconoActual = formatoActual ? FORMATOS[formatoActual]?.icono || File : File;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-emerald-600 rounded-lg">
            <ArrowRight size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#001e33] text-sm">Convertidor de Archivos</span>
        </div>
        <button
          onClick={() => setExpandido(false)}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ChevronDown size={18} className="text-slate-500 rotate-180" />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-4">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />

        {!archivo ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-400 hover:bg-emerald-50 transition-all"
          >
            <FileUp size={32} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Seleccionar archivo</span>
            <span className="text-xs text-slate-400">PDF, Word, Excel, CSV, TXT, HTML, Imágenes</span>
          </button>
        ) : (
          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${FORMATOS[formatoActual]?.color || 'bg-slate-200'}`}>
                <IconoActual size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{archivo.name}</p>
                <p className="text-xs text-slate-500">{(archivo.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={limpiar}
              disabled={convirtiendo}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={18} className="text-red-500" />
            </button>
          </div>
        )}

        {/* Selector de formato destino */}
        {archivo && formatosDisponibles.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-500 uppercase">Convertir a:</p>
            <div className="grid grid-cols-2 gap-2">
              {formatosDisponibles.map((conv) => {
                const IconoDestino = FORMATOS[conv.hasta]?.icono || File;
                const isSelected = formatoDestino === conv.hasta;
                return (
                  <button
                    key={conv.hasta}
                    onClick={() => setFormatoDestino(conv.hasta)}
                    disabled={convirtiendo}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-50'
                        : 'border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    <div className={`p-1.5 rounded ${FORMATOS[conv.hasta]?.color}`}>
                      <IconoDestino size={16} />
                    </div>
                    <div className="text-left">
                      <p className="text-xs font-bold text-slate-700">{conv.descripcion}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Botón convertir */}
        {formatoDestino && (
          <button
            onClick={convertirArchivo}
            disabled={convirtiendo || exitoso}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
              exitoso
                ? 'bg-emerald-500 text-white'
                : 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50'
            }`}
          >
            {convirtiendo ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Convirtiendo...
              </>
            ) : exitoso ? (
              <>
                <Download size={18} />
                ¡Descargado!
              </>
            ) : (
              <>
                <ArrowRight size={18} />
                Convertir y Descargar
              </>
            )}
          </button>
        )}

        {archivo && formatosDisponibles.length === 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
            No hay conversiones disponibles para este tipo de archivo
          </div>
        )}

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <p className="text-[10px] text-slate-400 text-center">
          Soporta: PDF ↔ Word, Excel ↔ CSV, HTML ↔ PDF, Imágenes → PDF
        </p>
      </div>
    </div>
  );
}
