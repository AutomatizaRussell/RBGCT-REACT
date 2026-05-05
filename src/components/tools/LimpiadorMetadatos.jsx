import { useState, useRef } from 'react';
import { FileText, Download, FileUp, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { convertirArchivoMarkdown } from '../../lib/api.js';

export default function LimpiadorMetadatos() {
  const [expandido, setExpandido] = useState(false);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [error, setError] = useState(null);
  const [exitoso, setExitoso] = useState(false);
  const fileInputRef = useRef(null);

  const extensionesSoportadas = ['.pdf', '.docx', '.xlsx', '.pptx', '.doc', '.xls', '.ppt', '.html', '.txt', '.csv', '.json', '.xml'];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivoSeleccionado(file);
      setError(null);
      setExitoso(false);
    }
  };

  // Función para limpiar metadatos y descargar automáticamente
  const procesarYDescargar = async () => {
    if (!archivoSeleccionado) return;
    
    setConvirtiendo(true);
    setError(null);
    setExitoso(false);
    
    try {
      // 1. Convertir con MarkItDown
      const formData = new FormData();
      formData.append('archivo', archivoSeleccionado);
      
      const response = await convertirArchivoMarkdown(formData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.markdown) {
        throw new Error('No se pudo convertir el archivo');
      }
      
      // 2. Limpiar metadatos
      let limpio = response.markdown;
      
      const patrones = [
        { regex: /^\{\rtf1.*$/gm, nombre: 'RTF' },
        { regex: /Author:\s*.+/gi, nombre: 'Autor' },
        { regex: /Title:\s*.+/gi, nombre: 'Título' },
        { regex: /Subject:\s*.+/gi, nombre: 'Asunto' },
        { regex: /Keywords:\s*.+/gi, nombre: 'Keywords' },
        { regex: /Creator:\s*.+/gi, nombre: 'Creador' },
        { regex: /Producer:\s*.+/gi, nombre: 'Productor' },
        { regex: /CreationDate:\s*.+/gi, nombre: 'FechaCreación' },
        { regex: /ModDate:\s*.+/gi, nombre: 'FechaMod' },
        { regex: /Company:\s*.+/gi, nombre: 'Empresa' },
        { regex: /Category:\s*.+/gi, nombre: 'Categoría' },
        { regex: /Template:\s*.+/gi, nombre: 'Template' },
        { regex: /TotalPages?:\s*.+/gi, nombre: 'Páginas' },
      ];
      
      patrones.forEach(p => {
        limpio = limpio.replace(p.regex, '');
      });
      
      // Limpiar espacios
      limpio = limpio.replace(/\n{3,}/g, '\n\n').replace(/[ \t]+/g, ' ').trim();
      
      // 3. Descargar archivo automáticamente
      const nombreBase = archivoSeleccionado.name.replace(/\.[^.]+$/, '');
      const blob = new Blob([limpio], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${nombreBase}-limpio.md`;
      a.click();
      URL.revokeObjectURL(url);
      
      setExitoso(true);
      
      // Reset después de 3 segundos
      setTimeout(() => {
        setArchivoSeleccionado(null);
        setExitoso(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }, 3000);
      
    } catch (err) {
      setError(err.message || 'Error al procesar archivo');
    } finally {
      setConvirtiendo(false);
    }
  };

  const limpiarSeleccion = () => {
    setArchivoSeleccionado(null);
    setError(null);
    setExitoso(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Vista colapsada - solo icono
  if (!expandido) {
    return (
      <button
        onClick={() => setExpandido(true)}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all group"
        title="Limpiador de Metadatos + MarkItDown"
      >
        <div className="p-1.5 bg-[#001e33] rounded-lg">
          <FileText size={16} className="text-white" />
        </div>
        <span className="text-sm font-medium text-slate-700 group-hover:text-[#001e33]">
          Limpiar Metadatos
        </span>
        <ChevronDown size={16} className="text-slate-400" />
      </button>
    );
  }

  // Vista expandida
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
      {/* Header con botón cerrar */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#001e33] rounded-lg">
            <FileText size={16} className="text-white" />
          </div>
          <span className="font-bold text-[#001e33] text-sm">Limpiador de Metadatos</span>
        </div>
        <button
          onClick={() => setExpandido(false)}
          className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
        >
          <ChevronUp size={18} className="text-slate-500" />
        </button>
      </div>

      {/* Contenido */}
      <div className="p-4 space-y-4">
        {/* Input archivo */}
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileSelect}
          accept={extensionesSoportadas.join(',')}
          className="hidden"
        />
        
        {!archivoSeleccionado ? (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex flex-col items-center justify-center gap-2 px-6 py-8 border-2 border-dashed border-slate-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all"
          >
            <FileUp size={32} className="text-slate-400" />
            <span className="text-sm font-medium text-slate-600">Seleccionar archivo</span>
            <span className="text-xs text-slate-400">
              {extensionesSoportadas.join(', ')}
            </span>
          </button>
        ) : (
          <div className="flex items-center justify-between p-3 bg-slate-100 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{archivoSeleccionado.name}</p>
                <p className="text-xs text-slate-500">{(archivoSeleccionado.size / 1024).toFixed(1)} KB</p>
              </div>
            </div>
            <button
              onClick={limpiarSeleccion}
              disabled={convirtiendo}
              className="p-2 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
            >
              <X size={18} className="text-red-500" />
            </button>
          </div>
        )}

        {/* Botón procesar */}
        {archivoSeleccionado && (
          <button
            onClick={procesarYDescargar}
            disabled={convirtiendo || exitoso}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-bold uppercase tracking-wider transition-all ${
              exitoso
                ? 'bg-emerald-500 text-white'
                : 'bg-[#001e33] text-white hover:bg-slate-800 disabled:opacity-50'
            }`}
          >
            {convirtiendo ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Procesando...
              </>
            ) : exitoso ? (
              <>
                <Download size={18} />
                ¡Archivo descargado!
              </>
            ) : (
              <>
                <FileUp size={18} />
                Convertir y Limpiar
              </>
            )}
          </button>
        )}

        {/* Error */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Info */}
        <p className="text-[10px] text-slate-400 text-center">
          Convierte a Markdown, limpia metadatos y descarga automáticamente
        </p>
      </div>
    </div>
  );
}
