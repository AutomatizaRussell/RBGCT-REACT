import { useState, useEffect } from 'react';
import { getAllEmpleados, enviarCertificadoEmpleo } from '../../lib/api';
import { Printer, User, RefreshCw, Send, CheckCircle, AlertCircle, FileText } from 'lucide-react';

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
  const [envioStatus, setEnvioStatus]   = useState(null);

  const [form, setForm] = useState({
    fecha: hoy(),
    consecutivo: '',
    destinatario: '',
    tipo_entidad: '',
    tipo_contrato: '',
    incluir_salario: 'Sí',
    salario: 'DOS MILLONES DE PESOS ($2.000.000)',
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
      salario: prefill.salario || 'DOS MILLONES DE PESOS ($2.000.000)',
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
  }, [prefill, empleados]);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value.toUpperCase() }));

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
    else if (v === 'GCT') setForm(prev => ({ ...prev, nombre_empresa: 'GCT RUSSELL BEDFORD', nit_empresa: '900.000.000-0' }));
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

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@600&display=swap" rel="stylesheet" />
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .certificado-preview {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>

      <div className="flex gap-6 h-full no-print bg-slate-50 p-6 overflow-hidden">
        {/* PANEL IZQUIERDO */}
        <div className="w-96 flex-shrink-0 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-[#001e33] rounded-lg text-white"><FileText size={20}/></div>
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

          <button onClick={handlePrint} className="w-full py-4 bg-[#001e33] hover:bg-[#002e4d] text-white rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl transition-all active:scale-95">
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

const Certificado = ({ form, nombreEmp, tipoDoc, numDoc, cargo, fechaIngreso, area }) => {
  const empresa = form.nombre_empresa || 'GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S';
  const fonts = {
    serif: '"Times New Roman", Times, serif',
    sans: 'Arial, sans-serif',
    signature: '"Dancing Script", cursive'
  };

  return (
    <div className="certificado-preview" style={{
      width: '210mm', minHeight: '297mm', padding: '25mm 25mm',
      backgroundColor: 'white', color: '#1a1a1a', fontFamily: fonts.serif,
      position: 'relative', fontSize: '12pt', lineHeight: '1.6'
    }}>
      {/* Membrete Minimalista */}
      <div style={{ borderBottom: '1.5pt solid #001e33', paddingBottom: '10pt', marginBottom: '30pt', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
            <h1 style={{ margin: 0, fontSize: '24pt', fontWeight: '900', fontFamily: fonts.sans, color: '#001e33' }}>RUSSELL BEDFORD</h1>
            <p style={{ margin: 0, fontSize: '9pt', fontFamily: fonts.sans, color: '#666', letterSpacing: '2pt' }}>GLOBAL NETWORK · QUALITY MATTERS</p>
        </div>
        <div style={{ textAlign: 'right', fontFamily: fonts.sans, fontSize: '9pt', color: '#444' }}>
            <p style={{ margin: 0, fontWeight: 'bold' }}>{form.consecutivo || 'REF: AD-2026'}</p>
            <p style={{ margin: 0 }}>Medellín, {form.fecha}</p>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: '0 5pt' }}>
        <h2 style={{ textAlign: 'center', textTransform: 'uppercase', fontSize: '14pt', letterSpacing: '3pt', borderBottom: '0.5pt solid #eee', paddingBottom: '10pt', marginBottom: '30pt' }}>Certificación Laboral</h2>

        <div style={{ marginBottom: '25pt' }}>
            <p style={{ margin: 0 }}>Señores:</p>
            <p style={{ margin: 0, fontWeight: 'bold', textTransform: 'uppercase' }}>{form.destinatario || 'A QUIEN INTERESE'}</p>
            <p style={{ margin: 0 }}>Ciudad</p>
        </div>

        <p style={{ textAlign: 'justify', marginBottom: '20pt' }}>
            La suscrita empresa <strong>{empresa}</strong>, con NIT <strong>{form.nit_empresa}</strong>, hace constar que el(la) señor(a) 
            <strong> {nombreEmp.toUpperCase()}</strong>, identificado(a) con {tipoDoc} No. <strong>{numDoc}</strong>, se encuentra vinculado(a) con nuestra organización 
            desde el <strong>{fechaIngreso}</strong>, mediante un contrato a <strong>{form.tipo_contrato || '[TIPO DE CONTRATO]'}</strong>, desempeñando actualmente 
            el cargo de <strong>{cargo}</strong>{area ? ` en el área de ${area.toUpperCase()}` : ''}.
        </p>

        {form.incluir_salario === 'Sí' && (
            <p style={{ textAlign: 'justify', marginBottom: '20pt' }}>
                Su remuneración mensual actual es de <strong>{form.salario}</strong>
                {form.auxilio_transporte === 'Sí' ? ', más auxilio de transporte legal vigente.' : '.'}
                {form.ingresos_adicionales && ` Adicionalmente percibe: ${form.ingresos_adicionales}.`}
            </p>
        )}

        <p style={{ textAlign: 'justify', marginBottom: '40pt' }}>
            Para constancia de lo anterior se firma en la ciudad de Medellín, a los {new Date().getDate()} días del mes de {new Date().toLocaleDateString('es-CO', {month: 'long'})} de {new Date().getFullYear()}.
        </p>

        <p style={{ marginBottom: '45pt' }}>Cordialmente,</p>

        {/* ÁREA DE FIRMA MEJORADA */}
        <div style={{ width: '300pt', borderTop: '1pt solid #000', position: 'relative', marginTop: '50pt' }}>
            {/* El nombre en cursiva actuando como firma */}
            <p style={{ 
                position: 'absolute', 
                top: '-45pt', 
                left: '10pt',
                fontFamily: fonts.signature, 
                fontSize: '28pt', 
                color: '#002e4d',
                opacity: 0.9
            }}>
                {form.firmante_nombre.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.substring(1)).join(' ')}
            </p>
            
            <p style={{ margin: '5pt 0 0', fontWeight: 'bold', fontSize: '11pt', textTransform: 'uppercase' }}>{form.firmante_nombre}</p>
            <p style={{ margin: 0, fontSize: '10pt' }}>{form.firmante_cargo}</p>
            <p style={{ margin: 0, fontSize: '10pt', fontWeight: 'bold' }}>{empresa}</p>
            <p style={{ margin: 0, fontSize: '9pt', color: '#666' }}>C.C. {form.firmante_cc}</p>
        </div>
      </div>

      {/* Pie de página */}
      <div style={{ position: 'absolute', bottom: '20mm', left: '25mm', right: '25mm', textAlign: 'center', borderTop: '0.5pt solid #eee', paddingTop: '10pt' }}>
          <p style={{ fontSize: '8pt', color: '#999', fontFamily: fonts.sans, margin: 0 }}>
              Esta certificación es válida sin sellos físicos según políticas internas de {empresa}. <br/>
              Medellín - Colombia · www.russellbedford.com.co
          </p>
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