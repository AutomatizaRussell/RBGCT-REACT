import { useState, useRef, useEffect } from 'react';
import {
  FileText, Upload, Download, X, Loader2,
  Merge, Scissors, RotateCw, Lock, Unlock, Droplet,
  FilePlus, Check, AlertCircle, ArrowLeft, Home,
  PlusCircle, Edit3, Type, Image, Save, Trash2, Move,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Square, Circle, Minus,
} from 'lucide-react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { fetchApi } from '../../lib/api.js';

const HERRAMIENTAS = [
  { id: 'editor', icono: Edit3, label: 'Editor Visual', descripcion: 'Editar PDF como en Word', color: 'from-violet-500 to-violet-600' },
  { id: 'crear', icono: PlusCircle, label: 'Crear PDF', descripcion: 'Crear un PDF desde cero', color: 'from-emerald-500 to-emerald-600' },
  { id: 'fusionar', icono: Merge, label: 'Fusionar PDFs', descripcion: 'Unir múltiples PDFs en uno solo', color: 'from-blue-500 to-blue-600' },
  { id: 'dividir', icono: Scissors, label: 'Dividir PDF', descripcion: 'Separar páginas de un PDF', color: 'from-purple-500 to-purple-600' },
  { id: 'comprimir', icono: FilePlus, label: 'Comprimir PDF', descripcion: 'Reducir tamaño del archivo', color: 'from-green-500 to-green-600' },
  { id: 'rotar', icono: RotateCw, label: 'Rotar Páginas', descripcion: 'Girar páginas 90°, 180° o 270°', color: 'from-orange-500 to-orange-600' },
  { id: 'extraer', icono: FileText, label: 'Extraer Páginas', descripcion: 'Obtener páginas específicas', color: 'from-pink-500 to-pink-600' },
  { id: 'marca', icono: Droplet, label: 'Marca de Agua', descripcion: 'Agregar texto o imagen como marca', color: 'from-cyan-500 to-cyan-600' },
  { id: 'proteger', icono: Lock, label: 'Proteger PDF', descripcion: 'Agregar contraseña al documento', color: 'from-red-500 to-red-600' },
  { id: 'desbloquear', icono: Unlock, label: 'Desbloquear PDF', descripcion: 'Quitar contraseña del documento', color: 'from-amber-500 to-amber-600' },
];

const TOOL_INFO = {
  seleccionar: {
    label: 'Seleccionar / Mover',
    hint: 'Haz clic sobre un elemento para seleccionarlo. Arrástralo para reposicionarlo.',
    cursor: 'cursor-default',
  },
  texto: {
    label: 'Agregar texto',
    hint: 'Haz clic en cualquier parte del PDF para insertar un cuadro de texto editable.',
    cursor: 'cursor-text',
  },
  rectangulo: {
    label: 'Dibujar rectángulo',
    hint: 'Haz clic en el PDF donde quieres colocar el rectángulo.',
    cursor: 'cursor-crosshair',
  },
  circulo: {
    label: 'Dibujar círculo',
    hint: 'Haz clic en el PDF donde quieres colocar el círculo.',
    cursor: 'cursor-crosshair',
  },
  linea: {
    label: 'Trazar línea',
    hint: 'Haz clic en el PDF donde quieres trazar la línea.',
    cursor: 'cursor-crosshair',
  },
};

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
    marcaImagen: null,
    password: '',
  });
  const [editorPDF, setEditorPDF] = useState({
    paginas: [{ contenido: '', elementos: [] }],
    paginaActual: 0,
    titulo: 'documento',
  });
  const [elementoSeleccionado, setElementoSeleccionado] = useState(null);
  const [nuevoElemento, setNuevoElemento] = useState({ tipo: 'texto', contenido: '', x: 50, y: 50, fontSize: 12, color: '#000000' });
  const fileInputRef = useRef(null);
  const _marcaImagenRef = useRef(null);
  const imagenInputRef = useRef(null);
  const newlyCreatedRef = useRef(null);
  const [pestañaActiva, setPestañaActiva] = useState('insertar');

  const [editorVisual, setEditorVisual] = useState({
    pdfCargado: null,
    pdfUrl: null,
    paginaActual: 0,
    totalPaginas: 0,
    zoom: 1,
    elementos: [],
    herramientaActiva: 'texto',
    colorActivo: '#000000',
    fontSizeActivo: 14,
    fontFamilyActivo: 'Helvetica',
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
  });
  const editorCanvasRef = useRef(null);
  const isDraggingRef = useRef(false);
  const draggingElementIdRef = useRef(null);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const pdfUrlRef = useRef(null);

  useEffect(() => {
    return () => { if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current); };
  }, []);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const pdfs = files.filter(f => f.name.toLowerCase().endsWith('.pdf'));
    if (pdfs.length > 0) {
      setArchivos(prev => [...prev, ...pdfs]);
      setError(null);
      setResultado(null);
    }
  };

  const removeFile = (index) => {
    setArchivos(archivos.filter((_, i) => i !== index));
  };

  const limpiar = () => {
    setArchivos([]);
    setHerramientaActiva(null);
    setResultado(null);
    setError(null);
    setOpciones({ rotacion: 90, paginas: '', marcaTexto: '', marcaImagen: null, password: '' });
    setEditorPDF({ paginas: [{ contenido: '', elementos: [] }], paginaActual: 0, titulo: 'documento' });
    setElementoSeleccionado(null);
    setNuevoElemento({ tipo: 'texto', contenido: '', x: 50, y: 50, fontSize: 12, color: '#000000' });
    setEditorVisual({
      pdfCargado: null, pdfUrl: null, paginaActual: 0, totalPaginas: 0, zoom: 1, elementos: [],
      herramientaActiva: 'texto', colorActivo: '#000000', fontSizeActivo: 14,
      fontFamilyActivo: 'Helvetica', bold: false, italic: false, underline: false, align: 'left',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const crearPDF = async () => {
    setProcesando(true);
    setError(null);
    try {
      const response = await fetchApi('/gestor-pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ herramienta: 'crear', titulo: editorPDF.titulo, paginas: editorPDF.paginas }),
      });
      if (response.error) throw new Error(response.error);
      setResultado(response);
      if (response.archivos?.length === 1) descargarArchivo(response.archivos[0]);
    } catch (err) {
      setError(err.message || 'Error al crear PDF');
    } finally {
      setProcesando(false);
    }
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
        case 'rotar': formData.append('rotacion', opciones.rotacion.toString()); break;
        case 'extraer': formData.append('paginas', opciones.paginas); break;
        case 'marca':
          formData.append('texto', opciones.marcaTexto);
          if (opciones.marcaImagen) formData.append('marca_imagen', opciones.marcaImagen);
          break;
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
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = archivo.nombre; a.click();
    URL.revokeObjectURL(url);
  };

  // ========== EDITOR VISUAL ==========

  const cargarPDFParaEditar = async (file) => {
    if (pdfUrlRef.current) URL.revokeObjectURL(pdfUrlRef.current);
    const url = URL.createObjectURL(file);
    pdfUrlRef.current = url;
    let totalPaginas = 1;
    try {
      const pdfjsLib = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      totalPaginas = pdfDoc.numPages;
    } catch (_) { /* fallback */ }
    setEditorVisual(prev => ({
      ...prev,
      pdfCargado: file, pdfUrl: url, paginaActual: 0, totalPaginas, elementos: [],
      herramientaActiva: 'texto',
    }));
    setPestañaActiva('insertar');
  };

  const agregarElementoVisual = (tipo, x = 50, y = 50) => {
    const nuevoId = Date.now();
    const elemento = {
      id: nuevoId, tipo, x, y,
      width: tipo === 'texto' ? 220 : tipo === 'linea' ? 120 : 90,
      height: tipo === 'texto' ? 38 : tipo === 'linea' ? 4 : 90,
      contenido: tipo === 'texto' ? '' : '',
      pagina: editorVisual.paginaActual,
      estilo: {
        color: editorVisual.colorActivo,
        fontSize: editorVisual.fontSizeActivo,
        fontFamily: editorVisual.fontFamilyActivo,
        bold: editorVisual.bold,
        italic: editorVisual.italic,
        underline: editorVisual.underline,
        align: editorVisual.align,
      },
    };
    setEditorVisual(prev => ({ ...prev, elementos: [...prev.elementos, elemento] }));
    return nuevoId;
  };

  const actualizarElemento = (id, cambios) => {
    setEditorVisual(prev => ({
      ...prev,
      elementos: prev.elementos.map(el => el.id === id ? { ...el, ...cambios } : el),
    }));
  };

  const eliminarElementoSeleccionado = () => {
    if (!elementoSeleccionado) return;
    setEditorVisual(prev => ({
      ...prev,
      elementos: prev.elementos.filter(el => el.id !== elementoSeleccionado),
    }));
    setElementoSeleccionado(null);
  };

  const handleElementMouseDown = (e, elId) => {
    if (editorVisual.herramientaActiva !== 'seleccionar') return;
    e.preventDefault();
    e.stopPropagation();
    setElementoSeleccionado(elId);
    const rect = editorCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const el = editorVisual.elementos.find(el => el.id === elId);
    if (!el) return;
    isDraggingRef.current = true;
    draggingElementIdRef.current = elId;
    dragOffsetRef.current = {
      x: (e.clientX - rect.left) - el.x,
      y: (e.clientY - rect.top) - el.y,
    };
  };

  const handleCanvasMouseMove = (e) => {
    if (!isDraggingRef.current || !draggingElementIdRef.current) return;
    const rect = editorCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    actualizarElemento(draggingElementIdRef.current, {
      x: (e.clientX - rect.left) - dragOffsetRef.current.x,
      y: (e.clientY - rect.top) - dragOffsetRef.current.y,
    });
  };

  const handleCanvasMouseUp = () => {
    isDraggingRef.current = false;
    draggingElementIdRef.current = null;
  };

  const manejarClickCanvas = (e) => {
    if (editorVisual.herramientaActiva === 'seleccionar') {
      setElementoSeleccionado(null);
      return;
    }
    const rect = editorCanvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const nuevoId = agregarElementoVisual(editorVisual.herramientaActiva, x, y);
    setElementoSeleccionado(nuevoId);
    if (editorVisual.herramientaActiva === 'texto') newlyCreatedRef.current = nuevoId;
    setEditorVisual(prev => ({ ...prev, herramientaActiva: 'seleccionar' }));
  };

  const guardarPDFEditado = async () => {
    if (!editorVisual.pdfCargado) return;
    setProcesando(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('archivo_0', editorVisual.pdfCargado);
      formData.append('cantidad_archivos', '1');
      formData.append('herramienta', 'editar');
      formData.append('elementos', JSON.stringify(editorVisual.elementos));
      const response = await fetchApi('/gestor-pdf/', { method: 'POST', body: formData });
      if (response.error) throw new Error(response.error);
      setResultado(response);
      if (response.archivos?.length === 1) descargarArchivo(response.archivos[0]);
    } catch (err) {
      setError(err.message || 'Error al guardar PDF');
    } finally {
      setProcesando(false);
    }
  };

  const toolInfo = TOOL_INFO[editorVisual.herramientaActiva] || TOOL_INFO.seleccionar;
  const elementoActual = editorVisual.elementos.find(el => el.id === elementoSeleccionado);

  const ToolBtn = ({ tool, icon: Icon, label }) => (
    <button
      onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: tool }))}
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium transition-all min-w-[56px] ${
        editorVisual.herramientaActiva === tool
          ? 'bg-[#dce6f5] text-[#2b579a] shadow-inner ring-1 ring-[#2b579a]/20'
          : 'hover:bg-slate-100 text-slate-600'
      }`}
    >
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );

  const renderEditorVisual = () => {
    if (!editorVisual.pdfCargado) {
      return (
        <div className="bg-white rounded-2xl p-16 border-2 border-dashed border-slate-300 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => { const f = e.target.files[0]; if (f) cargarPDFParaEditar(f); }}
            className="hidden"
            id="pdf-edit-input"
          />
          <label htmlFor="pdf-edit-input" className="cursor-pointer flex flex-col items-center gap-5">
            <div className="p-6 bg-violet-100 rounded-3xl">
              <Upload size={52} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-700">Cargar PDF para editar</p>
              <p className="text-sm text-slate-400 mt-2">Haz clic para seleccionar un archivo PDF</p>
            </div>
            <span className="px-6 py-3 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-colors">
              Seleccionar PDF
            </span>
          </label>
        </div>
      );
    }

    return (
      <div
        className="bg-[#f3f2f1] rounded-2xl overflow-hidden shadow-xl flex flex-col"
        style={{ height: 'calc(100vh - 180px)', minHeight: '640px' }}
      >
        {/* === RIBBON === */}
        <div className="shrink-0">
          {/* Tab bar */}
          <div className="flex bg-[#2b579a] items-end">
            {['insertar', 'inicio', 'diseño'].map((tab) => (
              <button
                key={tab}
                onClick={() => setPestañaActiva(tab)}
                className={`px-5 py-2 text-sm font-medium transition-all capitalize ${
                  pestañaActiva === tab
                    ? 'bg-white text-[#2b579a] rounded-t-lg mt-1'
                    : 'text-blue-100 hover:bg-[#3a6fc0]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
            <span className="ml-auto px-4 py-2 text-sm text-blue-200 truncate max-w-xs self-center">
              {editorVisual.pdfCargado?.name}
            </span>
          </div>
          {/* Ribbon content */}
          <div className="bg-white border-b border-slate-200 px-4 py-2 min-h-[52px] flex items-center">
            {pestañaActiva === 'insertar' && (
              <div className="flex flex-wrap items-center gap-1">
                <ToolBtn tool="seleccionar" icon={Move} label="Mover" />
                <div className="w-px h-10 bg-slate-200 mx-1" />
                <ToolBtn tool="texto" icon={Type} label="Texto" />
                <button
                  onClick={() => imagenInputRef.current?.click()}
                  className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-600 text-xs font-medium min-w-[56px]"
                >
                  <Image size={18} /><span>Imagen</span>
                </button>
                <input
                  ref={imagenInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (evt) => {
                      const nuevoId = agregarElementoVisual('imagen');
                      actualizarElemento(nuevoId, { contenido: evt.target.result });
                      setElementoSeleccionado(nuevoId);
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <div className="w-px h-10 bg-slate-200 mx-1" />
                <ToolBtn tool="rectangulo" icon={Square} label="Rect." />
                <ToolBtn tool="circulo" icon={Circle} label="Círculo" />
                <ToolBtn tool="linea" icon={Minus} label="Línea" />
              </div>
            )}
            {pestañaActiva === 'inicio' && (
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={editorVisual.fontFamilyActivo}
                  onChange={(e) => setEditorVisual(prev => ({ ...prev, fontFamilyActivo: e.target.value }))}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded text-sm min-w-[150px]"
                >
                  <option value="Helvetica">Helvetica</option>
                  <option value="Times-Roman">Times New Roman</option>
                  <option value="Courier">Courier New</option>
                </select>
                <input
                  type="number"
                  value={editorVisual.fontSizeActivo}
                  onChange={(e) => setEditorVisual(prev => ({ ...prev, fontSizeActivo: parseInt(e.target.value) || 12 }))}
                  className="w-16 px-2 py-1.5 bg-white border border-slate-300 rounded text-sm text-center"
                  min="8" max="96"
                />
                <div className="flex gap-0.5">
                  {[
                    { key: 'bold', Icon: Bold, title: 'Negrita' },
                    { key: 'italic', Icon: Italic, title: 'Cursiva' },
                    { key: 'underline', Icon: Underline, title: 'Subrayado' },
                  ].map(({ key, Icon, title }) => (
                    <button
                      key={key}
                      onClick={() => setEditorVisual(prev => ({ ...prev, [key]: !prev[key] }))}
                      title={title}
                      className={`p-2 rounded ${editorVisual[key] ? 'bg-[#dce6f5] text-[#2b579a]' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="flex gap-0.5">
                  {[
                    { val: 'left', Icon: AlignLeft },
                    { val: 'center', Icon: AlignCenter },
                    { val: 'right', Icon: AlignRight },
                  ].map(({ val, Icon }) => (
                    <button
                      key={val}
                      onClick={() => setEditorVisual(prev => ({ ...prev, align: val }))}
                      className={`p-2 rounded ${editorVisual.align === val ? 'bg-[#dce6f5] text-[#2b579a]' : 'hover:bg-slate-100 text-slate-600'}`}
                    >
                      <Icon size={16} />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 ml-1">
                  <span className="text-xs text-slate-500">Color</span>
                  <input
                    type="color"
                    value={editorVisual.colorActivo}
                    onChange={(e) => setEditorVisual(prev => ({ ...prev, colorActivo: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                  />
                </div>
              </div>
            )}
            {pestañaActiva === 'diseño' && (
              <div className="flex items-center gap-3">
                <button onClick={() => setEditorVisual(prev => ({ ...prev, zoom: Math.max(0.5, +(prev.zoom - 0.1).toFixed(1)) }))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomOut size={16} /></button>
                <span className="text-sm font-medium w-12 text-center">{Math.round(editorVisual.zoom * 100)}%</span>
                <button onClick={() => setEditorVisual(prev => ({ ...prev, zoom: Math.min(2.5, +(prev.zoom + 0.1).toFixed(1)) }))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomIn size={16} /></button>
                <div className="w-px h-8 bg-slate-200" />
                {[75, 100, 125, 150].map(pct => (
                  <button
                    key={pct}
                    onClick={() => setEditorVisual(prev => ({ ...prev, zoom: pct / 100 }))}
                    className={`px-3 py-1.5 text-xs rounded-lg border transition-all ${editorVisual.zoom === pct / 100 ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'border-slate-300 hover:bg-slate-50 text-slate-600'}`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* === ACTIVE TOOL HINT BAR === */}
        <div className={`shrink-0 px-5 py-2.5 flex items-center gap-3 text-sm ${
          editorVisual.herramientaActiva === 'seleccionar'
            ? 'bg-slate-100 text-slate-500 border-b border-slate-200'
            : 'bg-[#e8f0fe] text-[#1a3f8f] border-b border-blue-200'
        }`}>
          <span className={`text-lg leading-none ${editorVisual.herramientaActiva === 'seleccionar' ? '' : 'text-[#2b579a]'}`}>
            {editorVisual.herramientaActiva === 'seleccionar' ? '↖' : '✦'}
          </span>
          <span>
            <strong>{toolInfo.label}:</strong> {toolInfo.hint}
          </span>
          {editorVisual.herramientaActiva !== 'seleccionar' && (
            <button
              onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: 'seleccionar' }))}
              className="ml-auto shrink-0 text-xs bg-white border border-[#2b579a] text-[#2b579a] px-3 py-1 rounded-lg hover:bg-[#2b579a] hover:text-white transition-all font-medium"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* === MAIN WORK AREA === */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas scroll container */}
          <div className="flex-1 bg-[#525659] overflow-auto">
            <div className="p-8 flex justify-center">
              <div
                ref={editorCanvasRef}
                className={`relative bg-white shadow-2xl select-none ${toolInfo.cursor}`}
                style={{ width: `${612 * editorVisual.zoom}px`, height: `${792 * editorVisual.zoom}px`, flexShrink: 0 }}
                onClick={manejarClickCanvas}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
              >
                <iframe
                  src={`${editorVisual.pdfUrl}#page=${editorVisual.paginaActual + 1}&toolbar=0&navpanes=0`}
                  className="absolute inset-0 w-full h-full pointer-events-none"
                  title="PDF Preview"
                />
                {editorVisual.elementos
                  .filter(el => el.pagina === editorVisual.paginaActual)
                  .map((el) => (
                    <div
                      key={el.id}
                      className={`absolute group ${
                        elementoSeleccionado === el.id
                          ? 'ring-2 ring-[#2b579a] ring-offset-1 shadow-md'
                          : 'hover:ring-1 hover:ring-blue-300'
                      } ${editorVisual.herramientaActiva === 'seleccionar' ? 'cursor-move' : ''}`}
                      style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                      onClick={(e) => { e.stopPropagation(); setElementoSeleccionado(el.id); }}
                      onMouseDown={(e) => handleElementMouseDown(e, el.id)}
                    >
                      {el.tipo === 'texto' ? (
                        <div
                          contentEditable
                          suppressContentEditableWarning
                          className="w-full h-full outline-none px-1.5 py-1 leading-snug break-words"
                          style={{
                            color: el.estilo?.color,
                            fontSize: `${el.estilo?.fontSize}px`,
                            fontFamily: el.estilo?.fontFamily,
                            fontWeight: el.estilo?.bold ? 'bold' : 'normal',
                            fontStyle: el.estilo?.italic ? 'italic' : 'normal',
                            textDecoration: el.estilo?.underline ? 'underline' : 'none',
                            textAlign: el.estilo?.align || 'left',
                            cursor: 'text',
                            minHeight: `${el.estilo?.fontSize * 1.6}px`,
                          }}
                          ref={(node) => {
                            if (node && newlyCreatedRef.current === el.id) {
                              node.focus();
                              newlyCreatedRef.current = null;
                            }
                          }}
                          onBlur={(e) => actualizarElemento(el.id, { contenido: e.target.innerText })}
                        />
                      ) : el.tipo === 'imagen' ? (
                        <img src={el.contenido} alt="element" className="w-full h-full object-contain" />
                      ) : el.tipo === 'rectangulo' ? (
                        <div className="w-full h-full border-2" style={{ borderColor: el.estilo?.color }} />
                      ) : el.tipo === 'circulo' ? (
                        <div className="w-full h-full border-2 rounded-full" style={{ borderColor: el.estilo?.color }} />
                      ) : el.tipo === 'linea' ? (
                        <div className="w-full h-0.5 mt-0" style={{ backgroundColor: el.estilo?.color }} />
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* === PROPERTIES PANEL === */}
          {elementoActual && (
            <div className="w-64 bg-white border-l border-slate-200 shrink-0 flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-sm font-bold text-slate-700">Propiedades</span>
                  <span className="ml-2 px-2 py-0.5 bg-violet-100 text-violet-700 text-xs rounded-full capitalize font-medium">
                    {elementoActual.tipo}
                  </span>
                </div>
                <button
                  onClick={eliminarElementoSeleccionado}
                  title="Eliminar elemento"
                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={15} />
                </button>
              </div>
              <div className="p-4 space-y-4 overflow-y-auto flex-1">
                {elementoActual.tipo === 'texto' && (
                  <>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">Fuente</label>
                      <select
                        value={elementoActual.estilo?.fontFamily || 'Helvetica'}
                        onChange={(e) => actualizarElemento(elementoActual.id, { estilo: { ...elementoActual.estilo, fontFamily: e.target.value } })}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                      >
                        <option value="Helvetica">Helvetica</option>
                        <option value="Times-Roman">Times New Roman</option>
                        <option value="Courier">Courier New</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">Tamaño (px)</label>
                      <input
                        type="number"
                        value={elementoActual.estilo?.fontSize || 14}
                        onChange={(e) => actualizarElemento(elementoActual.id, { estilo: { ...elementoActual.estilo, fontSize: parseInt(e.target.value) || 14 } })}
                        className="w-full px-2.5 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        min="8" max="96"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">Estilo</label>
                      <div className="flex gap-1">
                        {[
                          { key: 'bold', Icon: Bold },
                          { key: 'italic', Icon: Italic },
                          { key: 'underline', Icon: Underline },
                        ].map(({ key, Icon }) => (
                          <button
                            key={key}
                            onClick={() => actualizarElemento(elementoActual.id, { estilo: { ...elementoActual.estilo, [key]: !elementoActual.estilo?.[key] } })}
                            className={`p-2 rounded-lg border flex-1 transition-all ${elementoActual.estilo?.[key] ? 'bg-[#dce6f5] border-[#2b579a] text-[#2b579a]' : 'border-slate-200 hover:bg-slate-50 text-slate-500'}`}
                          >
                            <Icon size={14} className="mx-auto" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">Color</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={elementoActual.estilo?.color || '#000000'}
                      onChange={(e) => actualizarElemento(elementoActual.id, { estilo: { ...elementoActual.estilo, color: e.target.value } })}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200"
                    />
                    <span className="text-sm text-slate-500 font-mono">{elementoActual.estilo?.color || '#000000'}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase block mb-1.5">Tamaño del elemento</label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Ancho</label>
                      <input
                        type="number"
                        value={Math.round(elementoActual.width)}
                        onChange={(e) => actualizarElemento(elementoActual.id, { width: Math.max(20, parseInt(e.target.value) || 80) })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        min="20"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-1">Alto</label>
                      <input
                        type="number"
                        value={Math.round(elementoActual.height)}
                        onChange={(e) => actualizarElemento(elementoActual.id, { height: Math.max(10, parseInt(e.target.value) || 30) })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 outline-none"
                        min="10"
                      />
                    </div>
                  </div>
                </div>
                <button
                  onClick={eliminarElementoSeleccionado}
                  className="w-full flex items-center justify-center gap-2 py-2.5 border-2 border-red-200 text-red-500 rounded-xl hover:bg-red-50 text-sm font-medium transition-all mt-2"
                >
                  <Trash2 size={15} /> Eliminar elemento
                </button>
              </div>
            </div>
          )}
        </div>

        {/* === BOTTOM BAR === */}
        <div className="shrink-0 bg-white border-t border-slate-200 px-4 py-2.5 flex items-center gap-4">
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setEditorVisual(prev => ({ ...prev, paginaActual: Math.max(0, prev.paginaActual - 1) }))}
              disabled={editorVisual.paginaActual === 0}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            ><ChevronLeft size={16} /></button>
            <span className="text-sm text-slate-600 font-medium px-2">
              Página {editorVisual.paginaActual + 1}{editorVisual.totalPaginas > 0 ? ` / ${editorVisual.totalPaginas}` : ''}
            </span>
            <button
              onClick={() => setEditorVisual(prev => ({ ...prev, paginaActual: Math.min(prev.totalPaginas - 1, prev.paginaActual + 1) }))}
              disabled={editorVisual.totalPaginas > 0 && editorVisual.paginaActual >= editorVisual.totalPaginas - 1}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            ><ChevronRight size={16} /></button>
          </div>
          <span className="text-xs text-slate-400 border-l border-slate-200 pl-4">
            {editorVisual.elementos.filter(el => el.pagina === editorVisual.paginaActual).length} elemento(s) en esta página
          </span>
          {/* Zoom compact */}
          <div className="flex items-center gap-1 border-l border-slate-200 pl-4">
            <button onClick={() => setEditorVisual(prev => ({ ...prev, zoom: Math.max(0.5, +(prev.zoom - 0.25).toFixed(2)) }))} className="p-1.5 hover:bg-slate-100 rounded"><ZoomOut size={14} /></button>
            <span className="text-xs font-medium w-10 text-center text-slate-600">{Math.round(editorVisual.zoom * 100)}%</span>
            <button onClick={() => setEditorVisual(prev => ({ ...prev, zoom: Math.min(2.5, +(prev.zoom + 0.25).toFixed(2)) }))} className="p-1.5 hover:bg-slate-100 rounded"><ZoomIn size={14} /></button>
          </div>
          {/* Save */}
          <button
            onClick={guardarPDFEditado}
            disabled={procesando}
            className="ml-auto flex items-center gap-2 px-6 py-2.5 bg-[#2b579a] hover:bg-[#1e3f7a] text-white rounded-xl text-sm font-bold shadow-md disabled:opacity-50 transition-all"
          >
            {procesando
              ? <><Loader2 size={16} className="animate-spin" /> Guardando...</>
              : <><Save size={16} /> Guardar PDF</>
            }
          </button>
        </div>
      </div>
    );
  };

  const renderEditorCrearPDF = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <label className="text-sm font-bold text-slate-600 uppercase">Nombre del documento</label>
        <input type="text" value={editorPDF.titulo} onChange={(e) => setEditorPDF(prev => ({ ...prev, titulo: e.target.value }))} className="w-full mt-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm" placeholder="documento" />
      </div>
      <button onClick={crearPDF} disabled={procesando} className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl text-sm font-bold uppercase shadow-lg disabled:opacity-50">
        {procesando ? <><Loader2 size={20} className="animate-spin" /> Creando...</> : <><Save size={20} /> Crear PDF</>}
      </button>
    </div>
  );

  const renderOpcionesHerramienta = () => {
    switch (herramientaActiva) {
      case 'rotar':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Grados de rotación</label>
            <div className="flex gap-3">
              {[90, 180, 270].map(grados => (
                <button key={grados} onClick={() => setOpciones({ ...opciones, rotacion: grados })} className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold ${opciones.rotacion === grados ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border-2 border-slate-200'}`}>
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
            <input type="text" placeholder="Ej: 1-3, 5" value={opciones.paginas} onChange={(e) => setOpciones({ ...opciones, paginas: e.target.value })} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      case 'marca':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Texto de marca de agua</label>
            <input type="text" placeholder="CONFIDENCIAL" value={opciones.marcaTexto} onChange={(e) => setOpciones({ ...opciones, marcaTexto: e.target.value })} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      case 'proteger':
      case 'desbloquear':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Contraseña</label>
            <input type="password" placeholder="********" value={opciones.password} onChange={(e) => setOpciones({ ...opciones, password: e.target.value })} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
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
                <p className="text-xs text-slate-400">Editor profesional</p>
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {HERRAMIENTAS.map((h) => {
                const Icono = h.icono;
                return (
                  <button key={h.id} onClick={() => setHerramientaActiva(h.id)} className="p-6 bg-white rounded-2xl border-2 border-slate-100 hover:border-slate-300 hover:shadow-xl transition-all text-left">
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

            {/* Editor visual: full width */}
            {herramientaActiva === 'editor' && renderEditorVisual()}

            {/* Crear PDF: simple form */}
            {herramientaActiva === 'crear' && (
              <div className="max-w-lg">{renderEditorCrearPDF()}</div>
            )}

            {/* All other tools: 2-column layout */}
            {herramientaActiva !== 'editor' && herramientaActiva !== 'crear' && (
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {(() => {
                    const h = HERRAMIENTAS.find(x => x.id === herramientaActiva);
                    const Icono = h?.icono;
                    return (
                      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 bg-gradient-to-br ${h?.color} rounded-xl`}><Icono size={24} className="text-white" /></div>
                          <div><p className="text-lg font-bold text-slate-700">{h?.label}</p><p className="text-sm text-slate-400">{h?.descripcion}</p></div>
                        </div>
                      </div>
                    );
                  })()}
                  <input ref={fileInputRef} type="file" accept=".pdf" multiple={herramientaActiva === 'fusionar'} onChange={handleFileSelect} className="hidden" />
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                    <h3 className="text-sm font-bold text-slate-600 uppercase mb-4">Archivos</h3>
                    {archivos.length > 0 ? (
                      <div className="space-y-3">
                        {archivos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-red-100 rounded-lg"><FileText size={20} className="text-red-600" /></div>
                              <div><p className="text-sm font-medium text-slate-700">{file.name}</p><p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p></div>
                            </div>
                            <button onClick={() => removeFile(index)} className="p-2 hover:bg-red-100 rounded-lg"><X size={18} className="text-red-500" /></button>
                          </div>
                        ))}
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-3 text-sm text-slate-500 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-300">+ Agregar otro PDF</button>
                      </div>
                    ) : (
                      <button onClick={() => fileInputRef.current?.click()} className="w-full flex flex-col items-center gap-3 px-6 py-12 border-2 border-dashed border-slate-300 rounded-xl hover:border-red-400 hover:bg-red-50">
                        <Upload size={40} className="text-slate-300" /><span className="text-sm font-medium text-slate-600">Seleccionar PDF</span>
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
                    <button onClick={procesarPDF} disabled={procesando} className={`w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r ${HERRAMIENTAS.find(h => h.id === herramientaActiva)?.color || 'from-emerald-500 to-emerald-600'} text-white rounded-2xl text-sm font-bold uppercase shadow-lg disabled:opacity-50`}>
                      {procesando ? <><Loader2 size={20} className="animate-spin" /> Procesando...</> : <><Check size={20} /> Procesar PDF</>}
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
                      <div className="flex items-center gap-3 mb-4 text-green-600"><Check size={24} /><span className="text-lg font-bold">Proceso exitoso</span></div>
                      <div className="space-y-3">
                        {resultado.archivos?.map((archivo, index) => (
                          <button key={index} onClick={() => descargarArchivo(archivo)} className="w-full flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-xl hover:bg-green-100">
                            <div className="flex items-center gap-3"><FileText size={20} className="text-red-600" /><span className="text-sm font-medium text-slate-700">{archivo.nombre}</span></div>
                            <Download size={20} className="text-green-600" />
                          </button>
                        ))}
                      </div>
                      <button onClick={limpiar} className="w-full mt-4 py-3 text-sm text-slate-500 hover:text-red-500 border-2 border-slate-200 rounded-xl">Procesar otro</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
