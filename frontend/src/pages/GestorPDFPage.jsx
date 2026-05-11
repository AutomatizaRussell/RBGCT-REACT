import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FileText, Upload, Download, X, Loader2, 
  Merge, Scissors, RotateCw, Lock, Unlock, Droplet, 
  FilePlus, Check, AlertCircle, ArrowLeft, Home,
  PlusCircle, Edit3, Type, Image, Save, Trash2, Move,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  ZoomIn, ZoomOut, ChevronLeft, ChevronRight, PenTool,
  Square, Circle, Minus, Highlighter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchApi } from '../lib/api.js';

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

export default function GestorPDFPage() {
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
  const marcaImagenRef = useRef(null);
  const imagenInputRef = useRef(null);
  const [pestañaActiva, setPestañaActiva] = useState('inicio');

  // Estado para el Editor Visual tipo Word
  const [editorVisual, setEditorVisual] = useState({
    pdfCargado: null,
    pdfUrl: null,
    paginaActual: 0,
    totalPaginas: 0,
    zoom: 1,
    elementos: [],
    herramientaActiva: 'seleccionar',
    colorActivo: '#000000',
    fontSizeActivo: 14,
    fontFamilyActivo: 'Helvetica',
    bold: false,
    italic: false,
    underline: false,
    align: 'left',
  });
  const editorCanvasRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

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
    setOpciones({
      rotacion: 90,
      paginas: '',
      marcaTexto: '',
      marcaImagen: null,
      password: '',
    });
    setEditorPDF({
      paginas: [{ contenido: '', elementos: [] }],
      paginaActual: 0,
      titulo: 'documento',
    });
    setElementoSeleccionado(null);
    setNuevoElemento({ tipo: 'texto', contenido: '', x: 50, y: 50, fontSize: 12, color: '#000000' });
    setEditorVisual({
      pdfCargado: null,
      pdfUrl: null,
      paginaActual: 0,
      totalPaginas: 0,
      zoom: 1,
      elementos: [],
      herramientaActiva: 'seleccionar',
      colorActivo: '#000000',
      fontSizeActivo: 14,
      fontFamilyActivo: 'Helvetica',
      bold: false,
      italic: false,
      underline: false,
      align: 'left',
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const agregarPagina = () => {
    setEditorPDF(prev => ({
      ...prev,
      paginas: [...prev.paginas, { contenido: '', elementos: [] }],
      paginaActual: prev.paginas.length,
    }));
  };

  const eliminarPagina = (index) => {
    if (editorPDF.paginas.length <= 1) return;
    setEditorPDF(prev => ({
      ...prev,
      paginas: prev.paginas.filter((_, i) => i !== index),
      paginaActual: Math.min(prev.paginaActual, prev.paginas.length - 2),
    }));
  };

  const agregarElemento = () => {
    if (!nuevoElemento.contenido) return;
    setEditorPDF(prev => {
      const nuevasPaginas = [...prev.paginas];
      nuevasPaginas[prev.paginaActual] = {
        ...nuevasPaginas[prev.paginaActual],
        elementos: [...nuevasPaginas[prev.paginaActual].elementos, { ...nuevoElemento, id: Date.now() }],
      };
      return { ...prev, paginas: nuevasPaginas };
    });
    setNuevoElemento({ tipo: 'texto', contenido: '', x: 50, y: 50, fontSize: 12, color: '#000000' });
  };

  const eliminarElemento = (id) => {
    setEditorPDF(prev => {
      const nuevasPaginas = [...prev.paginas];
      nuevasPaginas[prev.paginaActual] = {
        ...nuevasPaginas[prev.paginaActual],
        elementos: nuevasPaginas[prev.paginaActual].elementos.filter(e => e.id !== id),
      };
      return { ...prev, paginas: nuevasPaginas };
    });
    setElementoSeleccionado(null);
  };

  const handleImagenSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setNuevoElemento(prev => ({ ...prev, tipo: 'imagen', contenido: event.target.result, imagenNombre: file.name }));
      };
      reader.readAsDataURL(file);
    }
  };

  const crearPDF = async () => {
    setProcesando(true);
    setError(null);

    try {
      const response = await fetchApi('/gestor-pdf/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          herramienta: 'crear',
          titulo: editorPDF.titulo,
          paginas: editorPDF.paginas,
        }),
      });

      if (response.error) throw new Error(response.error);

      setResultado(response);
      if (response.archivos?.length === 1) {
        descargarArchivo(response.archivos[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al crear PDF');
    } finally {
      setProcesando(false);
    }
  };

  const editarPDF = async () => {
    if (archivos.length === 0) return;
    
    setProcesando(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('archivo_0', archivos[0]);
      formData.append('cantidad_archivos', '1');
      formData.append('herramienta', 'editar');
      formData.append('elementos', JSON.stringify(editorPDF.paginas[0].elementos));

      const response = await fetchApi('/gestor-pdf/', {
        method: 'POST',
        body: formData,
      });

      if (response.error) throw new Error(response.error);

      setResultado(response);
      if (response.archivos?.length === 1) {
        descargarArchivo(response.archivos[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al editar PDF');
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
      
      archivos.forEach((file, index) => {
        formData.append(`archivo_${index}`, file);
      });
      formData.append('cantidad_archivos', archivos.length.toString());
      formData.append('herramienta', herramientaActiva);

      switch (herramientaActiva) {
        case 'rotar':
          formData.append('rotacion', opciones.rotacion.toString());
          break;
        case 'extraer':
          formData.append('paginas', opciones.paginas);
          break;
        case 'marca':
          formData.append('texto', opciones.marcaTexto);
          if (opciones.marcaImagen) {
            formData.append('marca_imagen', opciones.marcaImagen);
          }
          break;
        case 'proteger':
        case 'desbloquear':
          formData.append('password', opciones.password);
          break;
      }

      const response = await fetchApi('/gestor-pdf/', {
        method: 'POST',
        body: formData,
      });

      if (response.error) {
        throw new Error(response.error);
      }

      setResultado(response);
      
      if (response.archivos && response.archivos.length === 1) {
        descargarArchivo(response.archivos[0]);
      }

    } catch (err) {
      setError(err.message || 'Error al procesar PDF');
    } finally {
      setProcesando(false);
    }
  };

  const descargarArchivo = (archivo) => {
    const byteCharacters = atob(archivo.contenido_base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'application/pdf' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = archivo.nombre;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ========== EDITOR VISUAL FUNCIONES ==========
  const cargarPDFParaEditar = (file) => {
    const url = URL.createObjectURL(file);
    setEditorVisual(prev => ({
      ...prev,
      pdfCargado: file,
      pdfUrl: url,
      paginaActual: 0,
      elementos: [],
    }));
  };

  const agregarElementoVisual = (tipo, x = 50, y = 50) => {
    const nuevoId = Date.now();
    const elemento = {
      id: nuevoId,
      tipo,
      x,
      y,
      width: tipo === 'texto' ? 200 : tipo === 'linea' ? 100 : 80,
      height: tipo === 'texto' ? 30 : 80,
      contenido: tipo === 'texto' ? 'Nuevo texto' : '',
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
    setEditorVisual(prev => ({
      ...prev,
      elementos: [...prev.elementos, elemento],
    }));
    return nuevoId;
  };

  const actualizarElemento = (id, cambios) => {
    setEditorVisual(prev => ({
      ...prev,
      elementos: prev.elementos.map(el => el.id === id ? { ...el, ...cambios } : el),
    }));
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
    agregarElementoVisual(editorVisual.herramientaActiva, x, y);
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
      const response = await fetchApi('/gestor-pdf/', {
        method: 'POST',
        body: formData,
      });
      if (response.error) throw new Error(response.error);
      setResultado(response);
      if (response.archivos?.length === 1) {
        descargarArchivo(response.archivos[0]);
      }
    } catch (err) {
      setError(err.message || 'Error al guardar PDF');
    } finally {
      setProcesando(false);
    }
  };

  const renderEditorVisual = () => (
    <div className="space-y-0">
      {!editorVisual.pdfCargado ? (
        <div className="bg-white rounded-2xl p-12 border-2 border-dashed border-slate-300 text-center">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) cargarPDFParaEditar(file);
            }}
            className="hidden"
            id="pdf-edit-input"
          />
          <label htmlFor="pdf-edit-input" className="cursor-pointer flex flex-col items-center gap-4">
            <div className="p-4 bg-violet-100 rounded-2xl">
              <Upload size={40} className="text-violet-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-700">Cargar PDF para editar</p>
              <p className="text-sm text-slate-400 mt-1">Haz clic para seleccionar un archivo PDF</p>
            </div>
          </label>
        </div>
      ) : (
        <div className="bg-[#f3f2f1] rounded-2xl overflow-hidden shadow-xl">
          {/* Ribbon */}
          <div className="bg-[#f3f2f1] border-b border-slate-300">
            <div className="flex">
              {['archivo', 'inicio', 'insertar', 'diseño'].map((pestana) => (
                <button
                  key={pestana}
                  onClick={() => setPestañaActiva(pestana)}
                  className={`px-6 py-2 text-sm font-medium transition-all ${
                    pestañaActiva === pestana
                      ? 'bg-white text-[#185abd] border-t-2 border-[#185abd]'
                      : 'bg-[#f3f2f1] text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pestana.charAt(0).toUpperCase() + pestana.slice(1)}
                </button>
              ))}
            </div>
            <div className="bg-white p-3 border-b border-slate-200">
              {pestañaActiva === 'inicio' && (
                <div className="flex flex-wrap items-center gap-4">
                  <select
                    value={editorVisual.fontFamilyActivo}
                    onChange={(e) => setEditorVisual(prev => ({ ...prev, fontFamilyActivo: e.target.value }))}
                    className="px-2 py-1 bg-white border border-slate-300 rounded text-sm min-w-[120px]"
                  >
                    <option value="Helvetica">Helvetica</option>
                    <option value="Times-Roman">Times New Roman</option>
                    <option value="Courier">Courier New</option>
                  </select>
                  <input
                    type="number"
                    value={editorVisual.fontSizeActivo}
                    onChange={(e) => setEditorVisual(prev => ({ ...prev, fontSizeActivo: parseInt(e.target.value) || 12 }))}
                    className="w-14 px-2 py-1 bg-white border border-slate-300 rounded text-sm text-center"
                    min="8"
                    max="72"
                  />
                  <div className="flex gap-0.5">
                    <button onClick={() => setEditorVisual(prev => ({ ...prev, bold: !prev.bold }))} className={`p-1.5 rounded ${editorVisual.bold ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Bold size={16} /></button>
                    <button onClick={() => setEditorVisual(prev => ({ ...prev, italic: !prev.italic }))} className={`p-1.5 rounded ${editorVisual.italic ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Italic size={16} /></button>
                    <button onClick={() => setEditorVisual(prev => ({ ...prev, underline: !prev.underline }))} className={`p-1.5 rounded ${editorVisual.underline ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Underline size={16} /></button>
                  </div>
                  <input
                    type="color"
                    value={editorVisual.colorActivo}
                    onChange={(e) => setEditorVisual(prev => ({ ...prev, colorActivo: e.target.value }))}
                    className="w-8 h-8 rounded cursor-pointer border border-slate-300"
                  />
                </div>
              )}
              {pestañaActiva === 'insertar' && (
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: 'texto' }))} className={`p-2 rounded ${editorVisual.herramientaActiva === 'texto' ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Type size={20} /></button>
                  <button onClick={() => imagenInputRef.current?.click()} className="p-2 hover:bg-slate-100 rounded"><Image size={20} /></button>
                  <button onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: 'rectangulo' }))} className={`p-2 rounded ${editorVisual.herramientaActiva === 'rectangulo' ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Square size={20} /></button>
                  <button onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: 'circulo' }))} className={`p-2 rounded ${editorVisual.herramientaActiva === 'circulo' ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Circle size={20} /></button>
                  <button onClick={() => setEditorVisual(prev => ({ ...prev, herramientaActiva: 'linea' }))} className={`p-2 rounded ${editorVisual.herramientaActiva === 'linea' ? 'bg-[#e1dfdd]' : 'hover:bg-slate-100'}`}><Minus size={20} /></button>
                </div>
              )}
            </div>
          </div>
          {/* Canvas */}
          <div className="bg-slate-100 rounded-b-2xl p-6 overflow-auto" style={{ maxHeight: '60vh' }}>
            <div
              ref={editorCanvasRef}
              className="relative bg-white shadow-lg mx-auto"
              style={{ width: `${612 * editorVisual.zoom}px`, height: `${792 * editorVisual.zoom}px` }}
              onClick={manejarClickCanvas}
            >
              <iframe
                src={`${editorVisual.pdfUrl}#page=${editorVisual.paginaActual + 1}`}
                className="absolute inset-0 w-full h-full pointer-events-none"
                title="PDF Preview"
              />
              {editorVisual.elementos
                .filter(el => el.pagina === editorVisual.paginaActual)
                .map((el) => (
                  <div
                    key={el.id}
                    className={`absolute cursor-move ${elementoSeleccionado === el.id ? 'ring-2 ring-violet-500' : ''}`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: el.width,
                      height: el.height,
                      color: el.estilo?.color,
                      fontSize: el.estilo?.fontSize,
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      setElementoSeleccionado(el.id);
                    }}
                  >
                    {el.tipo === 'texto' ? (
                      <div contentEditable suppressContentEditableWarning className="w-full h-full outline-none p-1" onBlur={(e) => actualizarElemento(el.id, { contenido: e.target.innerText })}>
                        {el.contenido}
                      </div>
                    ) : el.tipo === 'imagen' ? (
                      <img src={el.contenido} alt="element" className="max-w-full max-h-full object-contain" />
                    ) : el.tipo === 'rectangulo' ? (
                      <div className="w-full h-full border-2" style={{ borderColor: el.estilo?.color }} />
                    ) : el.tipo === 'circulo' ? (
                      <div className="w-full h-full border-2 rounded-full" style={{ borderColor: el.estilo?.color }} />
                    ) : el.tipo === 'linea' ? (
                      <div className="w-full h-0.5" style={{ backgroundColor: el.estilo?.color }} />
                    ) : null}
                  </div>
                ))}
            </div>
            <div className="flex items-center justify-center gap-4 mt-4">
              <button onClick={() => setEditorVisual(prev => ({ ...prev, paginaActual: Math.max(0, prev.paginaActual - 1) }))} disabled={editorVisual.paginaActual === 0} className="p-2 bg-white rounded-lg disabled:opacity-50"><ChevronLeft size={20} /></button>
              <span className="text-sm font-medium text-slate-600">Página {editorVisual.paginaActual + 1}</span>
              <button onClick={() => setEditorVisual(prev => ({ ...prev, paginaActual: prev.paginaActual + 1 }))} className="p-2 bg-white rounded-lg"><ChevronRight size={20} /></button>
            </div>
          </div>
          <div className="p-4 bg-white border-t border-slate-200">
            <button onClick={guardarPDFEditado} disabled={procesando} className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-xl text-sm font-bold uppercase shadow-lg disabled:opacity-50">
              {procesando ? <><Loader2 size={20} className="animate-spin" /> Guardando...</> : <><Save size={20} /> Guardar PDF</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const renderEditorCrearPDF = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
        <label className="text-sm font-bold text-slate-600 uppercase">Nombre</label>
        <input type="text" value={editorPDF.titulo} onChange={(e) => setEditorPDF(prev => ({ ...prev, titulo: e.target.value }))} className="w-full mt-2 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-sm" placeholder="documento" />
      </div>
      <button onClick={crearPDF} disabled={procesando} className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-2xl text-sm font-bold uppercase shadow-lg disabled:opacity-50">
        {procesando ? <><Loader2 size={20} className="animate-spin" /> Creando...</> : <><Save size={20} /> Crear PDF</>}
      </button>
    </div>
  );

  const renderOpcionesHerramienta = () => {
    switch (herramientaActiva) {
      case 'editor':
        return renderEditorVisual();
      case 'crear':
        return renderEditorCrearPDF();
      case 'rotar':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Grados</label>
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
            <label className="text-sm font-bold text-slate-600 uppercase">Páginas</label>
            <input type="text" placeholder="Ej: 1-3, 5" value={opciones.paginas} onChange={(e) => setOpciones({ ...opciones, paginas: e.target.value })} className="w-full p-4 bg-white border-2 border-slate-200 rounded-xl text-sm" />
          </div>
        );
      case 'marca':
        return (
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-600 uppercase">Texto</label>
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
      <div className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/app/utilidades" className="p-2 hover:bg-slate-100 rounded-xl"><ArrowLeft size={20} className="text-slate-500" /></Link>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-red-500 to-red-600 rounded-xl"><FileText size={24} className="text-white" /></div>
              <div><h1 className="text-xl font-black text-[#001e33]">Gestor de PDFs</h1><p className="text-xs text-slate-400">Editor profesional</p></div>
            </div>
          </div>
          <Link to="/app" className="p-2 hover:bg-slate-100 rounded-xl"><Home size={20} className="text-slate-500" /></Link>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-8">
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
            <button onClick={limpiar} className="text-sm text-slate-500 hover:text-slate-700">← Cambiar herramienta</button>
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
                {herramientaActiva !== 'editor' && herramientaActiva !== 'crear' && (
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
                )}
                {archivos.length > 0 && renderOpcionesHerramienta() && (
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">{renderOpcionesHerramienta()}</div>
                )}
              </div>
              <div className="space-y-6">
                {archivos.length > 0 && !resultado && herramientaActiva !== 'editor' && herramientaActiva !== 'crear' && (
                  <button onClick={procesarPDF} disabled={procesando} className={`w-full flex items-center justify-center gap-3 px-6 py-5 bg-gradient-to-r ${HERRAMIENTAS.find(h => h.id === herramientaActiva)?.color || 'from-emerald-500 to-emerald-600'} text-white rounded-2xl text-sm font-bold uppercase shadow-lg disabled:opacity-50`}>
                    {procesando ? <><Loader2 size={20} className="animate-spin" /> Procesando...</> : <><Check size={20} /> Procesar PDF</>}
                  </button>
                )}
                {error && <div className="p-5 bg-red-50 border-2 border-red-200 rounded-2xl text-red-700"><AlertCircle size={20} /><p className="font-bold">Error</p><p className="text-sm">{error}</p></div>}
                {resultado && (
                  <div className="bg-white rounded-2xl p-6 border-2 border-green-200 shadow-sm">
                    <div className="flex items-center gap-3 mb-4 text-green-600"><Check size={24} /><span className="text-lg font-bold">Exitoso</span></div>
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
                {herramientaActiva === 'editor' && renderEditorVisual()}
                {herramientaActiva === 'crear' && renderEditorCrearPDF()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
