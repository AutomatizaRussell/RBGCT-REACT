import { useState, useEffect } from 'react';
import { getAllEmpleados, enviarCertificadoEmpleo } from '../../lib/api';
import { FileText, Printer, User, RefreshCw, Send, CheckCircle, AlertCircle } from 'lucide-react';

// ─── Helpers ────────────────────────────────────────────────────────────────

const hoy = () => {
  const d = new Date();
  return d.toLocaleDateString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
};

// ─── Componente principal ────────────────────────────────────────────────────

const CertificadoSection = () => {
  const [empleados, setEmpleados]     = useState([]);
  const [loadingEmp, setLoadingEmp]   = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);
  const [areaFiltro, setAreaFiltro]     = useState('');
  const [emailDestino, setEmailDestino] = useState('');
  const [enviando, setEnviando]         = useState(false);
  const [envioStatus, setEnvioStatus]   = useState(null); // 'ok' | 'error' | null

  // Campos que vienen del formulario (externos)
  const [form, setForm] = useState({
    fecha:               hoy(),
    consecutivo:         '',
    destinatario:        '',
    tipo_contrato:       '',
    salario:             '',
    ingresos_adicionales: '',
    // Firma
    firmante_nombre:     '',
    firmante_cc:         '',
    firmante_cargo:      '',
  });

  // ── Carga empleados ────────────────────────────────────────────────────────
  useEffect(() => {
    getAllEmpleados()
      .then(data => setEmpleados(Array.isArray(data) ? data : data.results || []))
      .catch(() => setEmpleados([]))
      .finally(() => setLoadingEmp(false));
  }, []);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

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
  const cargo       = emp?.nombre_cargo             || '[CARGO]';
  const fechaIngreso= emp?.fecha_ingreso
    ? new Date(emp.fecha_ingreso + 'T00:00:00').toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })
    : '[FECHA DE INGRESO]';

  const handlePrint = () => window.print();

  const handleEnviarCorreo = async () => {
    if (!emailDestino.trim()) return;
    setEnviando(true);
    setEnvioStatus(null);
    try {
      await enviarCertificadoEmpleo({
        email_destino:        emailDestino.trim(),
        nombre_empleado:      nombreEmp,
        tipo_documento:       tipoDoc,
        numero_documento:     numDoc,
        cargo,
        fecha_ingreso:        fechaIngreso,
        tipo_contrato:        form.tipo_contrato,
        salario:              form.salario,
        ingresos_adicionales: form.ingresos_adicionales,
        destinatario:         form.destinatario,
        fecha:                form.fecha,
        consecutivo:          form.consecutivo,
        firmante_nombre:      form.firmante_nombre,
        firmante_cc:          form.firmante_cc,
        firmante_cargo:       form.firmante_cargo,
      });
      setEnvioStatus('ok');
    } catch {
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
                <div><span className="font-semibold">Cargo:</span> {cargo}</div>
                <div><span className="font-semibold">Ingreso:</span> {fechaIngreso}</div>
              </div>
            )}
          </div>

          {/* Campos externos */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Encabezado</p>
            <Field label="Fecha" name="fecha"         value={form.fecha}         onChange={handleChange} />
            <Field label="Consecutivo" name="consecutivo" value={form.consecutivo} onChange={handleChange} placeholder="Ej: AD-26-151" />
            <Field label="Destinatario" name="destinatario" value={form.destinatario} onChange={handleChange} placeholder="Ej: AV VILLAS" />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cuerpo</p>
            <Field label="Tipo de contrato" name="tipo_contrato" value={form.tipo_contrato} onChange={handleChange} placeholder="Ej: término indefinido" />
            <Field label="Salario (en texto)" name="salario" value={form.salario} onChange={handleChange} placeholder="Ej: TRES MILLONES ($3.000.000)" />
            <FieldArea label="Ingresos adicionales" name="ingresos_adicionales" value={form.ingresos_adicionales} onChange={handleChange} placeholder="Ej: auxilio de transporte por $200.000..." />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Firma</p>
            <Field label="Nombre del firmante" name="firmante_nombre" value={form.firmante_nombre} onChange={handleChange} />
            <Field label="C.C. firmante" name="firmante_cc" value={form.firmante_cc} onChange={handleChange} />
            <Field label="Cargo firmante" name="firmante_cargo" value={form.firmante_cargo} onChange={handleChange} placeholder="Ej: Representante Legal" />
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
              <li>Destinatario</li>
              <li>Nombre completo del empleado <span className="text-amber-500">(auto)</span></li>
              <li>Tipo de documento <span className="text-amber-500">(auto)</span></li>
              <li>Número de documento <span className="text-amber-500">(auto)</span></li>
              <li>Cargo <span className="text-amber-500">(auto)</span></li>
              <li>Fecha de ingreso <span className="text-amber-500">(auto)</span></li>
              <li>Tipo de contrato</li>
              <li>Salario mensual</li>
              <li>Ingresos adicionales</li>
              <li>Nombre del firmante</li>
              <li>C.C. del firmante</li>
              <li>Cargo del firmante</li>
            </ol>
          </div>
        </div>

        {/* ── Panel derecho: previsualización ─────────────────────────────── */}
        <div className="flex-1 overflow-auto pb-6">
          <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} />
        </div>
      </div>

      {/* Versión solo para impresión */}
      <div className="solo-print">
        <Certificado form={form} nombreEmp={nombreEmp} tipoDoc={tipoDoc} numDoc={numDoc} cargo={cargo} fechaIngreso={fechaIngreso} />
      </div>
    </>
  );
};

// ─── Sub-componente: el certificado en sí ────────────────────────────────────

const Certificado = ({ form, nombreEmp, tipoDoc, numDoc, cargo, fechaIngreso }) => {
  const val = (v, placeholder) => v?.trim() || placeholder;

  return (
    <div className="certificado-preview bg-white rounded-2xl shadow border border-slate-100 p-10 max-w-2xl mx-auto text-[#1a1a1a] font-serif relative overflow-hidden" style={{ minHeight: '800px' }}>

      {/* Barra lateral derecha decorativa */}
      <div className="absolute right-0 top-0 bottom-0 w-8 bg-[#001e33] flex flex-col items-center justify-end pb-4 gap-1">
        <span className="text-white text-[7px] font-sans tracking-widest" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', whiteSpace: 'nowrap', opacity: 0.6 }}>
          GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S · NIT 900.930.391-1 · MEDELLÍN, COLOMBIA
        </span>
      </div>

      {/* Contenido (con margen derecho por la barra) */}
      <div className="mr-10">

        {/* Encabezado: logo + fecha + consecutivo */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <p className="text-sm text-slate-600">
              Medellín, {val(form.fecha, '[FECHA]')}
            </p>
          </div>
          <div className="text-right">
            <div className="inline-block bg-slate-100 px-3 py-1 rounded text-xs font-bold text-slate-600 tracking-widest">
              {val(form.consecutivo, 'AD-XX-XXX')}
            </div>
            {/* Logo texto Russell Bedford */}
            <div className="mt-2">
              <p className="text-xl font-black text-[#001e33] leading-none tracking-tighter">RUSSELL</p>
              <p className="text-sm text-slate-500 font-light tracking-widest">BEDFORD</p>
              <p className="text-[9px] text-slate-400 tracking-wider">taking you further</p>
            </div>
          </div>
        </div>

        {/* Destinatario */}
        <div className="mb-6">
          <p className="text-sm text-slate-700">Señores</p>
          <p className="font-bold text-sm text-[#001e33] uppercase">
            {val(form.destinatario, '[NOMBRE DEL DESTINATARIO]')}.
          </p>
          <p className="text-sm text-slate-600">Medellín</p>
        </div>

        {/* Cuerpo */}
        <div className="text-sm leading-relaxed space-y-4 text-justify">
          <p>
            Certificamos que{' '}
            <strong className="text-[#001e33]">
              {nombreEmp} identificado(a)
            </strong>{' '}
            con {tipoDoc} No.{' '}
            <strong>{numDoc}</strong>, labora en{' '}
            <strong>GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S</strong>{' '}
            con Nit. <strong>900.930.391-1</strong>, desde el{' '}
            {fechaIngreso}, con contrato a{' '}
            <strong>{val(form.tipo_contrato, '[TIPO DE CONTRATO]')}</strong>,
            desempeñando el cargo de{' '}
            <strong className="uppercase">{cargo}</strong>.
          </p>

          {(form.salario || form.ingresos_adicionales) && (
            <p>
              Devenga un salario mensual de{' '}
              <strong>
                {val(form.salario, '[SALARIO EN LETRAS Y CIFRAS]')}
              </strong>
              {form.ingresos_adicionales
                ? <>, {form.ingresos_adicionales}.</>
                : '.'}
            </p>
          )}

          <p>
            La presente certificación se expide a solicitud del interesado(a)
            para los fines que estime convenientes.
          </p>
        </div>

        {/* Cierre */}
        <p className="mt-8 text-sm text-slate-700">Cordialmente,</p>

        {/* Firma */}
        <div className="mt-12 border-t border-slate-300 pt-3 w-56">
          <p className="font-bold text-sm text-[#001e33] uppercase">
            {val(form.firmante_nombre, '[NOMBRE DEL FIRMANTE]')}
          </p>
          {form.firmante_cc && (
            <p className="text-xs text-slate-600">C.C. {form.firmante_cc}</p>
          )}
          <p className="text-xs text-slate-600">
            {val(form.firmante_cargo, '[CARGO DEL FIRMANTE]')}
          </p>
          <p className="text-xs font-semibold text-slate-700 mt-0.5">
            GLT GESTIÓN LEGAL Y TRIBUTARIA S.A.S
          </p>
        </div>

      </div>
    </div>
  );
};

// ─── Inputs reutilizables ────────────────────────────────────────────────────

const Field = ({ label, name, value, onChange, placeholder }) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">{label}</label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
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

export default CertificadoSection;
