import { useState, useRef } from 'react';
import {
  FileText, Upload, Download, X, Loader2,
  Merge, Scissors, RotateCw, Lock, Unlock, Droplet,
  Check, AlertCircle, ArrowLeft, Home,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../../lib/api.js';

const HERRAMIENTAS = [
  { id: 'fusionar',    icono: Merge,    label: 'Fusionar PDFs',   descripcion: 'Unir múltiples PDFs en uno solo',      color: 'from-blue-500 to-blue-600' },
  { id: 'dividir',     icono: Scissors, label: 'Dividir PDF',     descripcion: 'Separar páginas de un PDF',             color: 'from-purple-500 to-purple-600' },
  { id: 'rotar',       icono: RotateCw, label: 'Rotar Páginas',   descripcion: 'Girar páginas 90°, 180° o 270°',        color: 'from-orange-500 to-orange-600' },
  { id: 'extraer',     icono: FileText, label: 'Extraer Páginas', descripcion: 'Obtener páginas específicas',           color: 'from-pink-500 to-pink-600' },
  { id: 'marca',       icono: Droplet,  label: 'Marca de Agua',   descripcion: 'Agregar texto como marca de agua',      color: 'from-cyan-500 to-cyan-600' },
  { id: 'proteger',    icono: Lock,     label: 'Proteger PDF',    descripcion: 'Agregar contraseña al documento',       color: 'from-red-500 to-red-600' },
  { id: 'desbloquear', icono: Unlock,   label: 'Desbloquear PDF', descripcion: 'Quitar contraseña del documento',       color: 'from-amber-500 to-amber-600' },
];

export default function GestorPDFPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dashboardPath = location.pathname.startsWith('/admin') ? '/admin'
    : location.pathname.startsWith('/editor') ? '/editor'
    : '/app';

  const [herramientaActiva, setHerramientaActiva] = useState(null);
  const [archivos, setArchivos] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState(null);
  const [opciones, setOpciones] = useState({
    rotacion: 90,
    paginas: '',
    marcaTexto: '',
    password: '',
  });
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const pdfs = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length > 0) {
      setArchivos(prev => [...prev, ...pdfs]);
      setError(null);
      setResultado(null);
    }
  };

  const removeFile = (index) => setArchivos(archivos.filter((_, i) => i !== index));

  const limpiar = () => {
    setArchivos([]);
    setHerramientaActiva(null);
    setResultado(null);
    setError(null);
    setOpciones({ rotacion: 90, paginas: '', marcaTexto: '', password: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const procesarPDF = async () => {
    if (archivos.length === 0) return;
    setProcesando(true);
    setError(null);
    try {
      const formData = new FormData();
      archivos.forEach((file, index) => formData.append(`archivo_${index}`, file));
      formData.append('cantidad_archivos', archivos.length.toString());
      formData.append('herramienta', herramientaActiva);
      switch (herramientaActiva) {
        case 'rotar':   formData.append('rotacion', opciones.rotacion.toString()); break;
        case 'extraer': formData.append('paginas', opciones.paginas); break;
        case 'marca':   formData.append('texto', opciones.marcaTexto); break;
        case 'proteger':
        case 'desbloquear': formData.append('password', opciones.password); break;
      }
      const response = await fetchApi('/gestor-pdf/', { method: 'POST', body: formData });
      if (response.error) throw new Error(response.error);
      setResultado(response);
      if (response.archivos?.length === 1) descargarArchivo(response.archivos[0]);
    } catch (err) {
      setError(err.message || 'Error al procesar PDF');
    } finally {
      setProcesando(false);
    }
  };

  const descargarArchivo = (archivo) => {
    const byteCharacters = atob(archivo.contenido_base64);
    const byteArray = new Uint8Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteArray[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([byteArray], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = archivo.nombre; a.click();
    URL.revokeObjectURL(url);
  };

  const renderOpcionesHerramienta = () => {
    switch (herramientaActiva) {
      case 'rotar':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Grados de rotación</label>
            <div className="flex gap-3">
              {[90, 180, 270].map(grados => (
                <button key={grados} onClick={() => setOpciones({ ...opciones, rotacion: grados })}
                  className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold ${opciones.rotacion === grados ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border-2 border-slate-200'}`}>
                  {grados}°
                </button>
              ))}
            </div>
          </div>
        );
      case 'extraer':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Páginas a extraer</label>
            <input type="text" placeholder="Ej: 1-3, 5" value={opciones.paginas}
              onChange={(e) => setOpciones({ ...opciones, paginas: e.target.value })}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      case 'marca':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Texto de marca de agua</label>
            <input type="text" placeholder="CONFIDENCIAL" value={opciones.marcaTexto}
              onChange={(e) => setOpciones({ ...opciones, marcaTexto: e.target.value })}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      case 'proteger':
      case 'desbloquear':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Contraseña</label>
            <input type="password" placeholder="********" value={opciones.password}
              onChange={(e) => setOpciones({ ...opciones, password: e.target.value })}
              className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl">
              <ArrowLeft size={20} className="text-slate-500" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-xl">
                <FileText size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-[#001871]">Gestor de PDFs</h1>
                <p className="text-xs text-slate-400">Herramientas PDF</p>
              </div>
            </div>
          </div>
          <Link to={dashboardPath} className="p-2 hover:bg-slate-100 rounded-xl" title="Volver al dashboard">
            <Home size={20} className="text-slate-500" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Tool picker */}
        {!herramientaActiva && (
          <div className="mb-8">
            <h2 className="text-lg font-bold text-slate-700 mb-4">Selecciona una herramienta</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {HERRAMIENTAS.map((h) => {
                const Icono = h.icono;
                return (
                  <button key={h.id} onClick={() => setHerramientaActiva(h.id)}
                    className="p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all text-left">
                    <Icono size={28} className="mb-3 text-slate-600" />
                    <p className="text-sm font-bold text-slate-700">{h.label}</p>
                    <p className="text-xs text-slate-400 mt-1">{h.descripcion}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {herramientaActiva && (
          <div className="space-y-6">
            <button onClick={limpiar} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1">
              <ArrowLeft size={14} /> Cambiar herramienta
            </button>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {(() => {
                  const h = HERRAMIENTAS.find(x => x.id === herramientaActiva);
                  const Icono = h?.icono;
                  return (
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 bg-gradient-to-br ${h?.color} rounded-xl`}>
                          <Icono size={24} className="text-white" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-slate-700">{h?.label}</p>
                          <p className="text-sm text-slate-400">{h?.descripcion}</p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  multiple={herramientaActiva === 'fusionar'}
                  onChange={handleFileSelect}
                  className="hidden"
                />

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">Archivos</h3>
                  {archivos.length > 0 ? (
                    <div className="space-y-3">
                      {archivos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <FileText size={20} className="text-red-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-700">{file.name}</p>
                              <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                          </div>
                          <button onClick={() => removeFile(index)} className="p-2 hover:bg-red-100 rounded-lg">
                            <X size={18} className="text-red-500" />
                          </button>
                        </div>
                      ))}
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-full py-3 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-300">
                        + Agregar otro PDF
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()}
                      className="w-full flex flex-col items-center gap-3 px-6 py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-red-400 hover:bg-red-50">
                      <Upload size={40} className="text-slate-300" />
                      <span className="text-sm font-medium text-slate-600">Seleccionar PDF</span>
                    </button>
                  )}
                </div>

                {archivos.length > 0 && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    {renderOpcionesHerramienta()}
                  </div>
                )}
              </div>

              <div className="space-y-6">
                {archivos.length > 0 && !resultado && (
                  <button onClick={procesarPDF} disabled={procesando}
                    className={`w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r ${HERRAMIENTAS.find(h => h.id === herramientaActiva)?.color || 'from-blue-500 to-blue-600'} text-white rounded-2xl text-sm font-bold uppercase shadow-lg disabled:opacity-50`}>
                    {procesando
                      ? <><Loader2 size={20} className="animate-spin" /> Procesando...</>
                      : <><Check size={20} /> Procesar PDF</>}
                  </button>
                )}

                {error && (
                  <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700 flex gap-3">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <div><p className="font-bold">Error</p><p className="text-sm mt-1">{error}</p></div>
                  </div>
                )}

                {resultado && (
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-green-600">
                      <Check size={24} />
                      <span className="text-lg font-bold">Proceso exitoso</span>
                    </div>
                    <div className="space-y-3">
                      {resultado.archivos?.map((archivo, index) => (
                        <button key={index} onClick={() => descargarArchivo(archivo)}
                          className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100">
                          <div className="flex items-center gap-3">
                            <FileText size={20} className="text-red-600" />
                            <span className="text-sm font-medium text-slate-700">{archivo.nombre}</span>
                          </div>
                          <Download size={20} className="text-green-600" />
                        </button>
                      ))}
                    </div>
                    <button onClick={limpiar}
                      className="w-full mt-4 py-3 text-sm text-slate-500 hover:text-red-500 border-2 border-slate-200 rounded-xl">
                      Procesar otro
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
