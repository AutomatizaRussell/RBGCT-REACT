import { useState, useEffect } from 'react';
import { getAllEmpleados, enviarCertificadoEmpleo } from '../../lib/api';
import { Printer, User, RefreshCw, Send, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import logoRB from '../../../img/image.png';

// ─── Helpers ────────────────────────────────────────────────────────────────

const hoy = () => {
  const d = new Date();
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

const limpiarCargo = (cargo) => {
  if (!cargo) return '';
  const primeraParte = cargo.split(/[/-]/)[0];
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
  const [envioStatus, setEnvioStatus]   = useState(null);

  const [form, setForm] = useState({
    fecha: hoy(),
    consecutivo: '',
    destinatario: '',
    tipo_entidad: '',
    tipo_contrato: '',
    incluir_salario: 'Sí',
    salario: '',
    auxilio_transporte: 'No',
    ingresos_adicionales: '',
    nombre_empresa: 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S',
    nit_empresa: '900.930.391-1',
    firmante_nombre: 'PAOLA ANDREA AGUILAR TAMAYO',
    firmante_cc: '21468161',
    firmante_cargo: 'LIDER DE GESTIÓN HUMANA',
  });

  useEffect(() => {
    getAllEmpleados()
      .then(data => setEmpleados(Array.isArray(data) ? data : data.results || []))
      .catch(() => setEmpleados([]))
      .finally(() => setLoadingEmp(false));
  }, []);

  useEffect(() => {
    if (!prefill || empleados.length === 0) return;
    setForm(prev => ({
      ...prev,
      fecha: prefill.fecha || hoy(),
      destinatario: (prefill.nombre_entidad || prefill.destinatario || '').toUpperCase(),
      tipo_entidad: prefill.tipo_entidad || '',
      tipo_contrato: prefill.tipo_contrato || '',
      incluir_salario: prefill.incluir_salario || 'Sí',
      salario: prefill.salario || '',
      auxilio_transporte: prefill.auxilio_transporte || 'No',
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
  }, [prefill, empleados, onPrefillUsed]);

  const SELECT_FIELDS = ['incluir_salario', 'auxilio_transporte', 'tipo_contrato'];
  const handleChange = (e) =>
    setForm(prev => ({
      ...prev,
      [e.target.name]: SELECT_FIELDS.includes(e.target.name)
        ? e.target.value
        : e.target.value.toUpperCase(),
    }));

  const handleSalarioBlur = (e) => {
    const raw = e.target.value.trim().replace(/[.\s]/g, '').replace(/,/g, '');
    const num = parseInt(raw, 10);
    if (!isNaN(num) && num > 0) {
      setForm(prev => ({ ...prev, salario: numeroALetras(num) }));
    }
  };

  const handleEmpresaSelect = (e) => {
    const v = e.target.value;
    if (v === 'GLT') setForm(prev => ({ ...prev, nombre_empresa: 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S', nit_empresa: '900.930.391-1' }));
    else if (v === 'GCT') setForm(prev => ({ ...prev, nombre_empresa: 'GCT RUSSELL BEDFORD', nit_empresa: '900.930.391-1' }));
  };

  const handleEmpleado = (e) => {
    const emp = empleados.find(em => String(em.id_empleado) === e.target.value);
    setSeleccionado(emp || null);
    setEmailDestino(emp?.correo_corporativo || '');
  };

  const areas = [...new Set(empleados.filter(e => e.estado === 'ACTIVA' && e.nombre_area).map(e => e.nombre_area))].sort();
  const empleadosFiltrados = empleados.filter(e => e.estado === 'ACTIVA').filter(e => !areaFiltro || e.nombre_area === areaFiltro);

  const emp = seleccionado;
  const nombreEmp = emp?.nombre_completo || '[NOMBRE COMPLETO DEL EMPLEADO]';
  const tipoDoc = emp?.tipo_documento || 'C.C.';
  const numDoc = emp?.numero_documento || '[NÚMERO]';
  const cargo = emp?.nombre_cargo ? limpiarCargo(emp.nombre_cargo) : '[CARGO]';
  const fechaIngreso = emp?.fecha_ingreso
    ? new Date(emp.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '[FECHA]';

  const handlePrint = () => window.print();

  const handleEnviarCorreo = async () => {
    if (!emailDestino.trim()) return;
    setEnviando(true);
    setEnvioStatus(null);
    try {
      const { default: html2canvas } = await import('html2canvas');
      const { jsPDF } = await import('jspdf');
      const elemento = document.querySelector('.no-print .certificado-preview') || document.querySelector('.certificado-preview');
      if (!elemento) throw new Error('No se encontró la vista previa del certificado');
      if (document.fonts?.ready) await document.fonts.ready;

      const canvas = await html2canvas(elemento, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        width: elemento.scrollWidth,
        height: elemento.scrollHeight,
        windowWidth: elemento.scrollWidth,
        windowHeight: elemento.scrollHeight,
      });

      const MARGIN = 25.4; // mm — margen estándar (1 pulgada)

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const pxPerMm = canvas.width / pageW;

      const cropAndPlace = (srcY, srcH, destYmm) => {
        const c = document.createElement('canvas');
        c.width  = canvas.width;
        c.height = srcH;
        c.getContext('2d').drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
        const renderH = (srcH / canvas.width) * pageW;
        pdf.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, destYmm, pageW, renderH, undefined, 'MEDIUM');
      };

      // Página 1: ocupa toda la hoja (el certificado ya lleva su propio margen interno)
      const p1H = Math.min(Math.round(pageH * pxPerMm), canvas.height);
      cropAndPlace(0, p1H, 0);

      // Páginas siguientes: margen superior e inferior de 25.4 mm
      const contPx = Math.round((pageH - 2 * MARGIN) * pxPerMm);
      let srcY = p1H;
      let left = canvas.height - p1H;

      while (left > 0) {
        pdf.addPage('letter', 'portrait');
        const chunk = Math.min(contPx, left);
        cropAndPlace(srcY, chunk, MARGIN);
        srcY += chunk;
        left -= chunk;
      }

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

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
        pdf_base64:           pdfBase64,
        pdf_nombre:           `Certificado_${nombreEmp.replace(/\s+/g, '_')}_${form.consecutivo || 'SN'}.pdf`,
      });
      setEnvioStatus('ok');
    } catch (err) {
      console.error('[Certificado] Error:', err);
      setEnvioStatus('error');
    } finally {
      setEnviando(false);
      setTimeout(() => setEnvioStatus(null), 4000);
    }
  };

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@400&display=swap" rel="stylesheet" />
      <style>{`
         .solo-print {
           display: none;
         }

         @media print {
           @page { 
             margin: 0;
             size: letter portrait;
           }

           html, body {
             margin: 0 !important;
             padding: 0 !important;
             background: white !important; 
             -webkit-print-color-adjust: exact;
             print-color-adjust: exact;
           }

           body * {
             visibility: hidden;
           }

           .no-print {
             display: none !important;
           }

           .solo-print,
           .solo-print * {
             visibility: visible;
           }

           .solo-print {
             display: block !important;
             position: fixed;
             inset: 0;
             background: #fff;
             padding: 0;
             margin: 0;
             z-index: 99999;
           }

           .solo-print .certificado-preview {
             box-shadow: none !important;
             border: none !important;
             margin: 0 !important;
             padding: 0 !important;
             width: 100% !important;
             min-height: auto !important;
           }

           .no-print .certificado-preview {
             display: none !important;
           }
         }
      `}</style>

      <div className="flex gap-6 h-full no-print bg-slate-50 p-6 overflow-hidden">
        {/* PANEL IZQUIERDO */}
        <div className="w-96 flex-shrink-0 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#001871] rounded-lg text-white"><FileText size={20}/></div>
            <h2 className="text-lg font-bold text-slate-800">Generador Legal</h2>
          </div>

          <Section icon={<User size={14}/>} title="Empleado">
            {loadingEmp ? <div className="animate-pulse text-xs">Cargando nómina...</div> : (
              <div className="space-y-3">
                <select value={areaFiltro} onChange={e => setAreaFiltro(e.target.value)} className="input-modern bg-slate-50">
                  <option value="">— Todas las áreas —</option>
                  {areas.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select onChange={handleEmpleado} value={emp?.id_empleado || ''} className="input-modern">
                  <option value="">— Seleccionar empleado —</option>
                  {empleadosFiltrados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombre_completo}</option>)}
                </select>
              </div>
            )}
          </Section>

          <Section title="Estructura del Documento">
            <Field label="Fecha Emisión" name="fecha" value={form.fecha} onChange={handleChange} />
            <Field label="Consecutivo" name="consecutivo" value={form.consecutivo} onChange={handleChange} placeholder="AD-26-XXX" />
            <Field label="Destinatario" name="destinatario" value={form.destinatario} onChange={handleChange} />
            <FieldSelect label="Empresa Emisora" name="emp_selector" onChange={handleEmpresaSelect}>
                <option value="GLT">GLT GESTIÓN LEGAL</option>
                <option value="GCT">GCT RUSSELL BEDFORD</option>
            </FieldSelect>
          </Section>

          <Section title="Condiciones Laborales">
            <FieldSelect label="Tipo Contrato" name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange}>
              <option value="">— Seleccionar —</option>
              <option value="término indefinido">Indefinido</option>
              <option value="término fijo">Fijo</option>
              <option value="obra o labor">Obra o Labor</option>
            </FieldSelect>
            <div className="flex gap-4">
              <FieldSelect label="Salario" name="incluir_salario" value={form.incluir_salario} onChange={handleChange}>
                <option value="Sí">Incluir</option>
                <option value="No">Omitir</option>
              </FieldSelect>
              <FieldSelect label="Auxilio" name="auxilio_transporte" value={form.auxilio_transporte} onChange={handleChange}>
                <option value="Sí">Sí</option>
                <option value="No">No</option>
              </FieldSelect>
            </div>
            {form.incluir_salario === 'Sí' && <Field label="Monto Salarial" name="salario" value={form.salario} onChange={handleChange} onBlur={handleSalarioBlur} />}
          </Section>

          <Section title="Responsable de Firma">
            <Field label="Nombre del Firmante" name="firmante_nombre" value={form.firmante_nombre} onChange={handleChange} />
            <Field label="Cargo del Firmante" name="firmante_cargo" value={form.firmante_cargo} onChange={handleChange} />
          </Section>

          <Section title="Enviar por correo">
            <input
              type="email"
              value={emailDestino}
              onChange={e => setEmailDestino(e.target.value)}
              placeholder="correo@destino.com"
              className="input-modern"
            />
            <button
              onClick={handleEnviarCorreo}
              disabled={enviando || !emailDestino.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
            >
              {enviando ? <><RefreshCw size={14} className="animate-spin"/> Enviando...</> : <><Send size={14}/> Enviar certificado</>}
            </button>
            {envioStatus === 'ok' && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                <CheckCircle size={13}/> Certificado enviado correctamente
              </div>
            )}
            {envioStatus === 'error' && (
              <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <AlertCircle size={13}/> No se pudo enviar. Verifica la conexión.
              </div>
            )}
          </Section>

          <button onClick={handlePrint} className="w-full py-4 bg-[#001871] hover:bg-[#002e4d] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
            <Printer size={18}/> IMPRIMIR DOCUMENTO
          </button>
        </div>

        {/* PANEL PREVISUALIZACIÓN */}
        <div className="flex-1 bg-white rounded-3xl shadow-2xl overflow-y-auto p-12 flex justify-center border border-slate-200">
          <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} area={emp?.nombre_area || ''} />
        </div>
      </div>

      {/* VERSIÓN IMPRESIÓN */}
      <div className="hidden solo-print">
        <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} area={emp?.nombre_area || ''} />
      </div>
    </>
  );
};

// ─── Sub-componente: Certificado Estilizado ──────────────────────────────────

const parseSalario = (val) => {
  const raw = (val || '').trim().replace(/\./g, '').replace(/,/g, '');
  const n = parseInt(raw, 10);
  return (!isNaN(n) && n > 0 && /^\d+$/.test(raw)) ? (numeroALetras(n) || val) : val;
};

const toTitleCase = (str) =>
  (str || '').toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

const Certificado = ({ form, nombreEmp, tipoDoc, numDoc, cargo, fechaIngreso, area }) => {
  const empresa      = form.nombre_empresa || 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S';
  const salarioText  = parseSalario(form.salario);
  const sans         = 'Arial, Helvetica, sans-serif';
  const serif        = '"Times New Roman", Times, serif';
  const script       = '"Dancing Script", cursive';

  const sn = (s) => ({ fontFamily: sans, ...s });
  const sr = (s) => ({ fontFamily: serif, ...s });

  return (
    <div className="certificado-preview" style={{
      width: '215.9mm', minHeight: '279.4mm', backgroundColor: '#fff',
      color: '#111', fontFamily: serif, fontSize: '9.5pt', lineHeight: '1.6',
      boxShadow: '0 0 0 1px #e5e7eb, 0 8px 32px rgba(0,0,0,0.10)',
      position: 'relative',
    }}>

      {/* ── Franja vertical derecha ───────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '10mm', height: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{
          fontFamily: sans, fontSize: '5.5pt', color: '#9ca3af',
          margin: 0, whiteSpace: 'nowrap', letterSpacing: '1.2pt',
          transform: 'rotate(90deg)',
          transformOrigin: 'center center',
        }}>
          CRA. 48 NO. 20 - 114 OFICINA 932 TORRE 2&nbsp;&nbsp;CENTRO EMPRESARIAL CIUDAD DEL RÍO&nbsp;&nbsp;PBX (574) 444 8883&nbsp;&nbsp;
          <span style={{ color: '#001871', fontWeight: '700' }}>MEDELLÍN, COLOMBIA</span>
          &nbsp;&nbsp;@RUSSELLBEDFORD.COM.CO&nbsp;&nbsp;WWW.RUSSELLBEDFORD.COM.CO
        </p>
      </div>

      {/* ── Membrete ─────────────────────────────────────────────── */}
      <div style={{ padding: '25.4mm 35mm 0 25.4mm' }}>
        {/* Logo pequeño arriba a la derecha */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10mm' }}>
          <img src={logoRB} alt="Russell Bedford" style={{ height: '42pt', width: 'auto', objectFit: 'contain' }} />
        </div>
        {/* Fecha izquierda — Consecutivo derecha */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <p style={sn({ margin: 0, fontSize: '8.5pt', color: '#374151' })}>
            Medellín, {form.fecha}
          </p>
          {form.consecutivo && (
            <p style={sn({ margin: 0, fontSize: '9pt', fontWeight: '700', color: '#111', letterSpacing: '1pt' })}>
              {form.consecutivo}
            </p>
          )}
        </div>
      </div>

      {/* ── Cuerpo del documento ─────────────────────────────────── */}
      <div style={{ padding: '8mm 35mm 10mm 25.4mm' }}>

        {/* Destinatario */}
        <div style={{ marginBottom: '18pt' }}>
          <p style={sr({ margin: 0, color: '#111' })}>Señores</p>
          <p style={sr({ margin: '1pt 0 0', fontWeight: '700', textTransform: 'uppercase' })}>
            {form.destinatario || 'A QUIEN CORRESPONDA'}
          </p>
          {form.tipo_entidad && (
            <p style={sr({ margin: 0, fontSize: '10pt', color: '#374151' })}>
              {form.tipo_entidad}
            </p>
          )}
          <p style={sr({ margin: '1pt 0 0', color: '#111' })}>Ciudad</p>
        </div>

        {/* Párrafo principal */}
        <p style={sr({ textAlign: 'justify', margin: '0 0 14pt' })}>
          Certificamos que el/la señor(a) <strong>{(nombreEmp || '').toUpperCase()}</strong>,
          identificado(a) con {tipoDoc === 'C.C.' ? 'cédula de ciudadanía' : tipoDoc === 'C.E.' ? 'cédula de extranjería' : tipoDoc} No <strong>{numDoc}</strong>,
          labora en <strong>{empresa}</strong>
          {form.nit_empresa ? <> con Nit. <strong>{form.nit_empresa}</strong></> : ''},
          desde el <strong>{fechaIngreso}</strong>, con contrato a{' '}
          <strong>{form.tipo_contrato || '[TIPO DE CONTRATO]'}</strong>, desempeñando
          el cargo de <strong>{cargo}{area ? ` DE ${area.toUpperCase()}` : ''}</strong>.
        </p>

        {/* Párrafo salario / auxilio / comisiones */}
        {(form.incluir_salario === 'Sí' || form.auxilio_transporte === 'Sí' || form.ingresos_adicionales) && (() => {
          const tieneSalario   = form.incluir_salario === 'Sí';
          const tieneAuxilio   = form.auxilio_transporte === 'Sí';
          const tieneComision  = !!form.ingresos_adicionales;
          const partes = [];
          if (tieneSalario)  partes.push(<>Devenga un salario mensual de <strong>{form.salario && form.salario.trim() ? salarioText : '[SALARIO]'}</strong></>);
          if (tieneAuxilio)  partes.push(<>un auxilio para medio de transporte no constitutivo de salario de conformidad con la normativa laboral vigente</>);
          if (tieneComision) partes.push(<>Y unas comisiones mensuales promedio de <strong>{form.ingresos_adicionales}</strong></>);
          return (
            <p style={sr({ textAlign: 'justify', margin: '0 0 28pt' })}>
              {partes.map((parte, i) => (
                <span key={i}>{i > 0 && i < partes.length - 1 ? ', ' : i > 0 ? ' ' : ''}{parte}</span>
              ))}.
            </p>
          );
        })()}

        <p style={sr({ margin: '0 0 4pt' })}>Cordialmente,</p>

        {/* ── Bloque de firma ── */}
        <div style={{ marginTop: '10pt', width: '95mm' }}>
          {/* Nombre en cursiva = firma */}
          <div style={{ minHeight: '34pt', display: 'flex', alignItems: 'flex-end' }}>
            <p style={{
              fontFamily: script, fontSize: '17pt', color: '#111',
              margin: 0, lineHeight: 1.1, fontWeight: 400,
            }}>
              {toTitleCase(form.firmante_nombre)}
            </p>
          </div>
          {/* Línea */}
          <div style={{ borderTop: '1pt solid #9ca3af', marginTop: '5pt', marginBottom: '7pt' }} />
          {/* Datos */}
          <p style={sn({ margin: '0 0 2pt', fontSize: '9.5pt', fontWeight: '700', textTransform: 'uppercase', color: '#111' })}>
            {form.firmante_nombre}
          </p>
          <p style={sn({ margin: '0 0 2pt', fontSize: '9pt', color: '#374151' })}>
            {form.firmante_cargo}
          </p>
          <p style={sn({ margin: '0 0 2pt', fontSize: '9pt', fontWeight: '700', color: '#111', textTransform: 'uppercase' })}>
            {empresa}
          </p>
          {form.firmante_cc && (
            <p style={sn({ margin: 0, fontSize: '8.5pt', color: '#6b7280' })}>
              C.C. {form.firmante_cc}
            </p>
          )}
        </div>
      </div>


    </div>
  );
};

// ─── Estilos Auxiliares ──────────────────────────────────────────────────────

const Section = ({ title, icon, children }) => (
  <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
    <div className="flex items-center gap-2 border-bottom pb-2">
        <span className="text-slate-400">{icon}</span>
        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[2px]">{title}</h3>
    </div>
    {children}
  </div>
);

const Field = ({ label, ...props }) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
    <input {...props} className="input-modern" />
  </div>
);

const FieldSelect = ({ label, children, ...props }) => (
  <div className="space-y-1 w-full">
    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
    <select {...props} className="input-modern">{children}</select>
  </div>
);

export default CertificadoSection;
