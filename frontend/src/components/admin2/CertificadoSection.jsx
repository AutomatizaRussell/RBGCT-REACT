import { useState, useEffect } from 'react';
import { getAllEmpleados, enviarCertificadoEmpleo } from '../../lib/api';
import { Printer, User, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const hoy = () => {
  const d = new Date();
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const limpiarCargo = (cargo) => {
  if (!cargo) return '';
  const primeraParte = cargo.split(/[/\-]/)[0];
  return primeraParte.replace(/\s+\d+\s*$/, '').trim().toUpperCase();
};

const numeroALetras = (n) => {
  n = Math.round(n);
  if (isNaN(n) || n < 0) return null;
  const U = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
    'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
  const VEINTI = ['', 'VEINTIÚN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO', 'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
  const D = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
  const C = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
  const m1k = (n) => {
    if (n === 0) return '';
    if (n === 100) return 'CIEN';
    if (n < 20) return U[n];
    if (n < 30) return VEINTI[n - 20];
    if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return u === 0 ? D[d] : `${D[d]} Y ${U[u]}`; }
    const c = Math.floor(n / 100), r = n % 100;
    return r === 0 ? C[c] : `${C[c]} ${m1k(r)}`;
  };
  if (n === 0) return 'CERO PESOS ($0)';
  let partes = [], r = n;
  if (r >= 1000000) { const m = Math.floor(r / 1000000); r %= 1000000; partes.push(m === 1 ? 'UN MILLÓN' : `${m1k(m)} MILLONES`); }
  if (r >= 1000)    { const k = Math.floor(r / 1000);    r %= 1000;    partes.push(k === 1 ? 'MIL' : `${m1k(k)} MIL`); }
  if (r > 0) partes.push(m1k(r));
  const letras = partes.join(' ');
  const esExacto = n >= 1000000 && n % 1000000 === 0;
  const fmt = n.toLocaleString('es-CO');
  return `${letras}${esExacto ? ' DE' : ''} PESOS ($${fmt})`;
};

// ─── Componente principal ────────────────────────────────────────────────────

const CertificadoSection = ({ prefill = null, onPrefillUsed }) => {
  const [empleados, setEmpleados]     = useState([]);
  const [loadingEmp, setLoadingEmp]   = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [areaFiltro, setAreaFiltro]     = useState('');
  const [emailDestino, setEmailDestino] = useState('');
  const [enviando, setEnviando]         = useState(false);
  const [envioStatus, setEnvioStatus]   = useState(null); // 'ok' | 'error' | null

  // Campos que vienen del formulario (externos)
  const [form, setForm] = useState({
    fecha:                hoy(),
    consecutivo:          '',
    destinatario:         '',
    tipo_entidad:         '',
    tipo_contrato:        '',
    incluir_salario:      'Sí',
    salario:              'DOS MILLONES DE PESOS ($2.000.000)',
    auxilio_transporte:  'No',
    ingresos_adicionales: '',
    // Empresa
    nombre_empresa:       'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S',
    nit_empresa:          '900.930.391-1',
    // Firma
    firmante_nombre:      'PAOLA ANDREA AGUILAR TAMAYO',
    firmante_cc:          '21468161',
    firmante_cargo:       'LIDER DE GESTIÓN HUMANA',
  });

  // ── Carga empleados ────────────────────────────────────────────────────────
  useEffect(() => {
    getAllEmpleados()
      .then(data => setEmpleados(Array.isArray(data) ? data : data.results || []))
      .catch(() => setEmpleados([]))
      .finally(() => setLoadingEmp(false));
  }, []);

  // ── Pre-llenado desde solicitud (AutoGestion) ──────────────────────────────
  useEffect(() => {
    if (!prefill || empleados.length === 0) return;
    setForm(prev => ({
      ...prev,
      fecha:                prefill.fecha               || hoy(),
      destinatario:         prefill.nombre_entidad      || prefill.destinatario || '',
      tipo_entidad:         prefill.tipo_entidad        || '',
      tipo_contrato:        prefill.tipo_contrato       || '',
      incluir_salario:      prefill.incluir_salario     || 'Sí',
      salario:              prefill.salario             || 'DOS MILLONES DE PESOS ($2.000.000)',
      auxilio_transporte:  prefill.auxilio_transporte  || 'No',
      ingresos_adicionales: prefill.ingresos_adicionales || '',
    }));
    if (prefill.id_empleado) {
      const emp = empleados.find(e => String(e.id_empleado) === String(prefill.id_empleado));
      if (emp) {
        setSeleccionado(emp);
        setEmailDestino(emp.correo_corporativo || '');
        setAreaFiltro(emp.nombre_area || '');
      }
    }
    if (onPrefillUsed) onPrefillUsed();
  }, [prefill, empleados]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSalarioBlur = (e) => {
    const raw = e.target.value.trim().replace(/[.\s]/g, '').replace(/,/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0 && /^\d+$/.test(raw)) {
      const letras = numeroALetras(num);
      if (letras) setForm(prev => ({ ...prev, salario: letras }));
    }
  };

  const handleEmpresaSelect = (e) => {
    const v = e.target.value;
    if (v === 'GLT') setForm(prev => ({ ...prev, nombre_empresa: 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S', nit_empresa: '900.930.391-1' }));
    else if (v === 'GCT') setForm(prev => ({ ...prev, nombre_empresa: 'GCT RUSSELL BEDFORD', nit_empresa: '' }));
  };

  const handleEmpleado = (e) => {
    const emp = empleados.find(em => String(em.id_empleado) === e.target.value);
    setSeleccionado(emp || null);
    // Auto-rellenar con el correo corporativo del empleado
    setEmailDestino(emp?.correo_corporativo || '');
  };

  // Áreas únicas derivadas de la lista de empleados activos
  const areas = [...new Set(
    empleados.filter(e => e.estado === 'ACTIVA' && e.nombre_area).map(e => e.nombre_area)
  )].sort();

  // Empleados filtrados por área seleccionada
  const empleadosFiltrados = empleados
    .filter(e => e.estado === 'ACTIVA')
    .filter(e => !areaFiltro || e.nombre_area === areaFiltro);

  // ── Datos del certificado ─────────────────────────────────────────────────
  const emp = seleccionado;
  const nombreEmp   = emp?.nombre_completo         || '[NOMBRE COMPLETO DEL EMPLEADO]';
  const tipoDoc     = emp?.tipo_documento           || '[TIPO DE DOCUMENTO]';
  const numDoc      = emp?.numero_documento         || '[NÚMERO DE DOCUMENTO]';
  
  // Aplicación del filtro de formato formal al cargo del empleado
  const cargoRaw    = emp?.nombre_cargo || '';
  const cargo       = cargoRaw ? limpiarCargo(cargoRaw) : '[CARGO]';

  const fechaIngreso= emp?.fecha_ingreso
    ? new Date(emp.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '[FECHA DE INGRESO]';

  const handlePrint = () => window.print();

  const handleEnviarCorreo = async () => {
    if (!emailDestino.trim()) return;
    setEnviando(true);
    setEnvioStatus(null);
    try {
      // 1. Capturar el elemento del certificado como imagen
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');

      const elemento = document.querySelector('.certificado-preview');
      const canvas   = await html2canvas(elemento, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData  = canvas.toDataURL('image/png');

      // 2. Generar PDF tamaño carta
      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
      const pdfW   = pdf.internal.pageSize.getWidth();
      const pdfH   = (canvas.height * pdfW) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

      // 3. Convertir a base64 via ArrayBuffer (compatible con jsPDF v4)
      const arrayBuffer = pdf.output('arraybuffer');
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      bytes.forEach(b => { binary += String.fromCharCode(b); });
      const pdfBase64 = btoa(binary);

      // 4. Enviar al backend con el PDF adjunto
      await enviarCertificadoEmpleo({
        email_destino:        emailDestino.trim(),
        nombre_empleado:      nombreEmp,
        tipo_documento:       tipoDoc,
        numero_documento:     numDoc,
        cargo,
        fecha_ingreso:        fechaIngreso,
        destinatario:         form.destinatario,
        tipo_entidad:         form.tipo_entidad,
        nombre_empresa:       form.nombre_empresa,
        nit_empresa:          form.nit_empresa,
        tipo_contrato:        form.tipo_contrato,
        incluir_salario:      form.incluir_salario,
        salario:              form.salario,
        auxilio_transporte:   form.auxilio_transporte,
        ingresos_adicionales: form.ingresos_adicionales,
        fecha:                form.fecha,
        consecutivo:          form.consecutivo,
        firmante_nombre:      form.firmante_nombre,
        firmante_cc:          form.firmante_cc,
        firmante_cargo:       form.firmante_cargo,
        // PDF adjunto
        pdf_base64:           pdfBase64,
        pdf_nombre:           `Certificado_${nombreEmp.replace(/\s+/g, '_')}_${form.consecutivo || 'SN'}.pdf`,
      });
      setEnvioStatus('ok');
    } catch (err) {
      console.error('[Certificado] Error al generar/enviar PDF:', err);
      setEnvioStatus('error');
    } finally {
      setEnviando(false);
      setTimeout(() => setEnvioStatus(null), 4000);
    }
  };

  return (
    <>
      {/* ── CSS de impresión ── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .solo-print { display: block !important; }
          body { background: white !important; margin: 0; }
          .certificado-preview {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 40px 60px !important;
            max-width: 100% !important;
            width: 100% !important;
          }
        }
        @media screen {
          .solo-print { display: none; }
        }
      `}</style>

      <div className="flex gap-6 h-full no-print">

        {/* ── Panel izquierdo: formulario ─────────────────────────────────── */}
        <div className="w-80 flex-shrink-0 space-y-4 overflow-y-auto pb-6">

          {/* Selector de empleado */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <User size={13}/> Empleado
            </p>
            {loadingEmp ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <RefreshCw size={14} className="animate-spin"/> Cargando...
              </div>
            ) : (
              <>
                {/* Filtro por área */}
                <select
                  value={areaFiltro}
                  onChange={e => { setAreaFiltro(e.target.value); setSeleccionado(null); setEmailDestino(''); }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 bg-slate-50"
                >
                  <option value="">— Todas las áreas —</option>
                  {areas.map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>

                {/* Selector de empleado */}
                <select
                  onChange={handleEmpleado}
                  value={emp?.id_empleado || ''}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10"
                >
                  <option value="">— Seleccionar empleado —</option>
                  {empleadosFiltrados.map(e => (
                    <option key={e.id_empleado} value={e.id_empleado}>
                      {e.nombre_completo}
                    </option>
                  ))}
                </select>
              </>
            )}

            {/* Datos auto-llenados del empleado */}
            {emp && (
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs text-slate-600">
                <div><span className="font-semibold">Correo:</span> {emp.correo_corporativo}</div>
                <div><span className="font-semibold">Doc:</span> {tipoDoc} {numDoc}</div>
                <div><span className="font-semibold">Cargo original:</span> {cargoRaw}</div>
                <div><span className="font-semibold">Cargo certificado:</span> <span className="text-emerald-700 font-medium">{cargo}</span></div>
                <div><span className="font-semibold">Ingreso:</span> {fechaIngreso}</div>
              </div>
            )}
          </div>

          {/* Campos externos */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encabezado</p>
            <Field label="Fecha" name="fecha" value={form.fecha} onChange={handleChange} />
            <Field label="Consecutivo" name="consecutivo" value={form.consecutivo} onChange={handleChange} placeholder="Ej: AD-26-151" />
            <Field label="Nombre entidad destinataria" name="destinatario" value={form.destinatario} onChange={handleChange} placeholder="Ej: BANCOLOMBIA" />
            <FieldSelect label="Tipo de entidad" name="tipo_entidad" value={form.tipo_entidad} onChange={handleChange}>
              <option value="">— Sin especificar —</option>
              <option value="Financiera">Financiera</option>
              <option value="Universitaria">Universitaria</option>
              <option value="Gobierno">Gobierno / Entidad Pública</option>
              <option value="Empresa">Empresa Privada</option>
              <option value="Salud">Salud / EPS</option>
              <option value="Otra">Otra</option>
            </FieldSelect>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Empresa emisora</p>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Seleccionar empresa</label>
              <select onChange={handleEmpresaSelect} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 bg-white">
                <option value="GLT">GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S</option>
                <option value="GCT">GCT RUSSELL BEDFORD</option>
              </select>
            </div>
            <Field label="Nombre empresa (editable)" name="nombre_empresa" value={form.nombre_empresa} onChange={handleChange} />
            <Field label="NIT" name="nit_empresa" value={form.nit_empresa} onChange={handleChange} placeholder="Ej: 900.930.391-1" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuerpo</p>
            <FieldSelect label="Tipo de contrato" name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange}>
              <option value="">— Seleccionar tipo —</option>
              <option value="término indefinido">Término Indefinido</option>
              <option value="término fijo">Término Fijo</option>
              <option value="obra o labor">Obra o Labor</option>
              <option value="prestación de servicios">Prestación de Servicios</option>
              <option value="aprendizaje">Aprendizaje</option>
            </FieldSelect>
            <FieldSelect label="¿Incluir salario?" name="incluir_salario" value={form.incluir_salario} onChange={handleChange}>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </FieldSelect>
            {form.incluir_salario === 'Sí' && (
              <Field label="Salario — escribe número y sal del campo para convertir" name="salario" value={form.salario} onChange={handleChange} onBlur={handleSalarioBlur} placeholder="Ej: 3000000 o DOS MILLONES..." />
            )}
            <FieldSelect label="¿Auxilio de transporte aplica?" name="auxilio_transporte" value={form.auxilio_transporte} onChange={handleChange}>
              <option value="Sí">Sí</option>
              <option value="No">No</option>
            </FieldSelect>
            <FieldArea label="Ingresos adicionales" name="ingresos_adicionales" value={form.ingresos_adicionales} onChange={handleChange} placeholder="Ej: comisiones, bonificaciones..." />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma</p>
            <Field label="Nombre del firmante" name="firmante_nombre" value={form.firmante_nombre} onChange={handleChange} placeholder="PAOLA ANDREA AGUILAR TAMAYO" />
            <Field label="C.C. firmante" name="firmante_cc" value={form.firmante_cc} onChange={handleChange} placeholder="21468161" />
            <Field label="Cargo firmante" name="firmante_cargo" value={form.firmante_cargo} onChange={handleChange} placeholder="LIDER DE GESTIÓN HUMANA" />
          </div>

          {/* Enviar por correo */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Send size={13}/> Enviar por correo
            </p>
            <input
              type="email"
              value={emailDestino}
              onChange={e => setEmailDestino(e.target.value)}
              placeholder="correo@destino.com"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10"
            />
            <button
              onClick={handleEnviarCorreo}
              disabled={enviando || !emailDestino.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {enviando
                ? <><RefreshCw size={14} className="animate-spin"/> Enviando...</>
                : <><Send size={14}/> Enviar certificado</>}
            </button>

            {/* Feedback */}
            {envioStatus === 'ok' && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <CheckCircle size={14}/> Certificado enviado correctamente
              </div>
            )}
            {envioStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle size={14}/> No se pudo enviar. Verifica la conexión con n8n.
              </div>
            )}
          </div>

          {/* Botón imprimir */}
          <button
            onClick={handlePrint}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#001e33] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg"
          >
            <Printer size={16}/> Imprimir / Exportar PDF
          </button>

          {/* Lista de campos */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2">Campos a completar</p>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside leading-relaxed">
              <li>Fecha del certificado</li>
              <li>Consecutivo del documento</li>
              <li>Nombre y tipo de entidad</li>
              <li>Nombre completo del empleado <span className="text-amber-500">(auto)</span></li>
              <li>Tipo de documento <span className="text-amber-500">(auto)</span></li>
              <li>Número de documento <span className="text-amber-500">(auto)</span></li>
              <li>Cargo <span className="text-amber-500">(auto cleaned)</span></li>
              <li>Fecha de ingreso <span className="text-amber-500">(auto)</span></li>
              <li>Tipo de contrato</li>
              <li>¿Incluir salario? + monto</li>
              <li>¿Auxilio de transporte?</li>
              <li>Nombre del firmante</li>
              <li>C.C. del firmante</li>
              <li>Cargo del firmante</li>
            </ol>
          </div>
        </div>

        {/* ── Panel derecho: previsualización ─────────────────────────────── */}
        <div className="flex-1 overflow-auto pb-6">
          <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} area={emp?.nombre_area || ''} />
        </div>
      </div>

      {/* Versión solo para impresión */}
      <div className="solo-print">
        <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} area={emp?.nombre_area || ''} />
      </div>
    </>
  );
};

// ─── Sub-componente: el certificado en sí (solo inline styles para html2canvas) ──

const Certificado = ({ form, nombreEmp, tipoDoc, numDoc, cargo, fechaIngreso, area }) => {
  const val = (v, placeholder) => v?.trim() || placeholder;
  const cargoCert = limpiarCargo(cargo);

  const S = {
    wrap: {
      position: 'relative', overflow: 'hidden', backgroundColor: '#ffffff',
      borderRadius: '1rem', border: '1px solid #f1f5f9',
      boxShadow: '0 1px 8px rgba(0,0,0,0.07)', padding: '2.5rem',
      maxWidth: '672px', margin: '0 auto', minHeight: '800px',
      fontFamily: 'Georgia, "Times New Roman", serif', color: '#1a1a1a',
    },
    barra: {
      position: 'absolute', right: 0, top: 0, bottom: 0, width: '2rem',
      backgroundColor: '#001e33', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'flex-end', paddingBottom: '1rem',
    },
    barraTexto: {
      color: '#ffffff', fontSize: '7px', fontFamily: 'sans-serif',
      letterSpacing: '0.1em', writingMode: 'vertical-rl',
      transform: 'rotate(180deg)', whiteSpace: 'nowrap', opacity: 0.6,
    },
    inner:      { marginRight: '2.5rem' },
    header:     { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
    fecha:      { fontSize: '14px', color: '#475569', margin: 0 },
    logoWrap:   { textAlign: 'right' },
    consecutivo:{ display: 'inline-block', backgroundColor: '#f1f5f9', padding: '2px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: '700', color: '#475569', letterSpacing: '0.1em' },
    russell:    { fontSize: '20px', fontWeight: '900', color: '#001e33', lineHeight: 1, letterSpacing: '-0.5px', margin: '6px 0 0', fontFamily: 'sans-serif' },
    bedford:    { fontSize: '13px', color: '#64748b', fontWeight: '300', letterSpacing: '0.2em', margin: 0, fontFamily: 'sans-serif' },
    tagline:    { fontSize: '9px', color: '#94a3b8', letterSpacing: '0.1em', margin: 0, fontFamily: 'sans-serif' },
    destWrap:   { marginBottom: '1.5rem' },
    senores:    { fontSize: '14px', color: '#334155', margin: '0 0 2px' },
    destNombre: { fontSize: '14px', fontWeight: '700', color: '#001e33', textTransform: 'uppercase', margin: '0 0 2px' },
    ciudad:     { fontSize: '14px', color: '#475569', margin: 0 },
    cuerpo:     { fontSize: '14px', lineHeight: '1.8', textAlign: 'justify' },
    parrafo:    { margin: '0 0 1rem' },
    cordial:    { fontSize: '14px', color: '#334155', margin: '2rem 0 0' },
    firmaWrap:  { borderTop: '1px solid #cbd5e1', paddingTop: '0.75rem', marginTop: '3rem', width: '220px' },
    firmaNombre:{ fontSize: '13px', fontWeight: '700', color: '#001e33', textTransform: 'uppercase', margin: '0 0 2px' },
    firmaCC:    { fontSize: '12px', color: '#475569', margin: '0 0 2px' },
    firmaCargo: { fontSize: '12px', color: '#475569', margin: '0 0 4px' },
    firmaEmp:   { fontSize: '12px', fontWeight: '600', color: '#334155', margin: 0 },
  };

  return (
    <div className="certificado-preview" style={S.wrap}>

      <div style={S.barra}>
        <span style={S.barraTexto}>
          GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S · NIT 900.930.391-1 · MEDELLÍN, COLOMBIA
        </span>
      </div>

      <div style={S.inner}>

        {/* Encabezado */}
        <div style={S.header}>
          <p style={S.fecha}>Medellín, {val(form.fecha, '[FECHA]')}</p>
          <div style={S.logoWrap}>
            <span style={S.consecutivo}>{val(form.consecutivo, 'AD-XX-XXX')}</span>
            <p style={S.russell}>RUSSELL</p>
            <p style={S.bedford}>BEDFORD</p>
            <p style={S.tagline}>taking you further</p>
          </div>
        </div>

        {/* Destinatario */}
        <div style={S.destWrap}>
          <p style={S.senores}>Señores</p>
          <p style={S.destNombre}>{val(form.destinatario, '[NOMBRE DEL DESTINATARIO]')}.</p>
          {form.tipo_entidad && (
            <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 2px', fontStyle: 'italic' }}>
              Entidad {form.tipo_entidad}
            </p>
          )}
          <p style={S.ciudad}>Medellín</p>
        </div>

        {/* Cuerpo */}
        <div style={S.cuerpo}>
          <p style={S.parrafo}>
            Certificamos que{' '}
            <strong style={{ color: '#001e33' }}>{(nombreEmp || '').toUpperCase()} identificado(a)</strong>{' '}
            con {tipoDoc} No. <strong>{numDoc}</strong>, labora en{' '}
            <strong>{val(form.nombre_empresa, 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S')}</strong>
            {form.nit_empresa ? <> con Nit. <strong>{form.nit_empresa}</strong></> : ''}, desde el {fechaIngreso}, con contrato a{' '}
            <strong>{val(form.tipo_contrato, '[TIPO DE CONTRATO]')}</strong>,
            desempeñando el cargo de{' '}
            <strong>{val(cargoCert, '[CARGO]')}</strong>
            {area ? <> en el área de <strong>{area.toUpperCase()}</strong></> : ''}.
          </p>

          {form.incluir_salario === 'Sí' && (
            <p style={S.parrafo}>
              Devenga un salario mensual de{' '}
              <strong>{val(form.salario, '[SALARIO EN LETRAS Y CIFRAS]')}</strong>
              {form.auxilio_transporte === 'Sí'
                ? <>, más auxilio de transporte según la normativa vigente{form.ingresos_adicionales ? `, ${form.ingresos_adicionales}` : ''}.</>
                : form.ingresos_adicionales
                  ? <>, {form.ingresos_adicionales}.</>
                  : '.'
              }
            </p>
          )}

          {form.incluir_salario !== 'Sí' && form.auxilio_transporte === 'Sí' && (
            <p style={S.parrafo}>
              Recibe auxilio de transporte según la normativa vigente
              {form.ingresos_adicionales ? `, ${form.ingresos_adicionales}` : ''}.
            </p>
          )}

          <p style={S.parrafo}>
            La presente certificación se expide a solicitud del interesado(a)
            para los fines que estime convenientes.
          </p>
        </div>

        <p style={S.cordial}>Cordialmente,</p>

        {/* Firma */}
        <div style={S.firmaWrap}>
          <p style={{ ...S.firmaNombre, fontStyle: 'italic' }}>{val(form.firmante_nombre, '[NOMBRE DEL FIRMANTE]')}</p>
          {form.firmante_cc && <p style={S.firmaCC}>C.C. {form.firmante_cc}</p>}
          <p style={S.firmaCargo}>{val(form.firmante_cargo, '[CARGO DEL FIRMANTE]')}</p>
          <p style={S.firmaEmp}>{val(form.nombre_empresa, 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S')}</p>
        </div>

      </div>
    </div>
  );
};

// ─── Inputs reutilizables ────────────────────────────────────────────────────

const Field = ({ label, name, value, onChange, onBlur, placeholder }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10"
    />
  </div>
);

const FieldArea = ({ label, name, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <textarea
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={3}
      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 resize-none"
    />
  </div>
);

const FieldSelect = ({ label, name, value, onChange, children }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 bg-white"
    >
      {children}
    </select>
  </div>
);

export default CertificadoSection;