import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormulariosSQF.css';
import { useAuth } from '../../../hooks/useAuth';
import { fetchApi } from '../../../lib/api';

const N8N_WEBHOOKS = {
    client: 'https://n8n.rbgct.cloud/webhook/clientes-crud',
    contract: 'https://n8n.rbgct.cloud/webhook/contratos-crud',
    billing: 'https://n8n.rbgct.cloud/webhook/flujo_Facturacion_SQF',
    datatable: 'https://n8n.rbgct.cloud/webhook/facturacion',
    pending: 'https://n8n.rbgct.cloud/webhook/Pendientes',
    contractsPending: 'https://n8n.rbgct.cloud/webhook/Contratos-pendientes',
};

const generateId = (prefix) => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${randomChars}-${timestamp}`;
};

const extractDataSafe = (rawData) => {
    try {
        if (!rawData) return [];
        if (Array.isArray(rawData)) return rawData;
        if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
        if (rawData[0] && Array.isArray(rawData[0].body)) return rawData[0].body;
        return [];
    } catch {
        return [];
    }
};

const calculateBusinessDaysDate = (startDate, businessDays) => {
    const date = new Date(startDate);
    let daysAdded = 0;

    while (daysAdded < businessDays) {
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();

        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
            daysAdded++;
        }
    }

    return date.toISOString().split('T')[0];
};

const BILLING_DESCRIPTIONS = [
  { name: '25% RADICACIÓN SALDO A FAVOR IVA BIM 02 2026', code: '76' },
  { name: '50% SOLICITUD SALDO A FAVOR DE RENTA AÑO 2025', code: '70' },
  { name: 'ACCOUNTING FEES', code: '38' },
  { name: 'ACEPTACIÓN DE FACTURAS', code: '26' },
  { name: 'ACEPTACIÓN DE FACTURAS', code: '43' },
  { name: 'AFILIACIONES', code: '30' },
  { name: 'ASESORÍA CONSULTORÍA ORGANIZACIONAL', code: '46' },
  { name: 'ASESORÍA DE NÓMINA', code: '5' },
  { name: 'ASESORÍA LEGAL PERMANENTE', code: '29' },
  { name: 'AUDITORÍA FINANCIERA CORTE 30 ABRIL 2026', code: '71' },
  { name: 'CONTABILIDAD ADMINISTRATIVA', code: '40' },
  { name: 'ELABORACIÓN DOCUMENTOS ELECTRÓNICOS Y FACTURAS DE VENTAS ELECTRÓNICAS', code: '37' },
  { name: 'ELABORACIÓN REPORTES FINANCIEROS ADICIONALES', code: '35' },
  { name: 'EXÁMENES MÉDICOS', code: '31' },
  { name: 'HONORARIOS CONTABILIDAD HUDSON INVERSIONES', code: '47' },
  { name: 'HONORARIOS CONTABILIDAD INVERSIONES OREGON', code: '48' },
  { name: 'HONORARIOS CONTABILIDAD INVERSIONES PORTOVENTO', code: '49' },
  { name: 'HONORARIOS CONTABILIDAD INVERSIONES RB', code: '10' },
  { name: 'HONORARIOS CONTABILIDAD INVERSIONES VESTA', code: '50' },
  { name: 'HONORARIOS DE AUDITORÍA EXTERNA', code: '33' },
  { name: 'HONORARIOS DE CONTABILIDAD', code: '44' },
  { name: 'HONORARIOS DE REVISORÍA FISCAL', code: '45' },
  { name: 'HONORARIOS DECLARACIÓN DE RENTA', code: '51' },
  { name: 'HONORARIOS MEDIOS MAGNÉTICOS', code: '52' },
  { name: 'HONORARIOS SG-SST', code: '41' },
  { name: 'INHOUSE CONTABLE Y TRIBUTARIO', code: '28' },
  { name: 'OFICIAL DE CUMPLIMIENTO', code: '39' },
  { name: 'OUTSOURCING CONTABLE Y TRIBUTARIO', code: '36' },
  { name: 'OUTSOURCING FINANCIERO', code: '27' },
  { name: 'SERVICIO CONTABLE', code: '53' },
  { name: 'TESORERÍA', code: '42' },
  { name: 'TESORERÍA Y FACTURACIÓN', code: '32' },
  { name: 'USO DE LICENCIA', code: '34' }
];
 

const CONTRACT_ROLES = [
    'Socio',
    'Gerente 1', 'Gerente 2', 'Gerente 3',
    'Senior 1', 'Senior 2', 'Senior 3',
    'Líder/Semi-Senior 1', 'Líder/Semi-Senior 2', 'Líder/Semi-Senior 3',
    'Analista/Asistente 1', 'Analista/Asistente 2', 'Analista/Asistente 3', 'Analista/Asistente 4',
];

const BILLING_CENTERS = {
    'REVISORIA FISCAL':      [{ label: 'REVISORIA FISCAL',          code: '01 - 0101' }, { label: 'AUDITORIA EXTERNA',            code: '01 - 0102' }],
    'CONTABILIDAD':          [{ label: 'CONTABILIDAD',              code: '02 - 0201' }, { label: 'RENTA MEDIOS CONTABILIDAD',    code: '02 - 0203' }],
    'IMPUESTOS':             [{ label: 'IMPUESTOS',                 code: '03 - 0301' }, { label: 'RENTA MEDIOS IMPUESTOS',       code: '03 - 0302' }],
    'BPO':                   [{ label: 'BPO',                       code: '04 - 0202' }],
    'LEGAL':                 [{ label: 'LEGAL',                     code: '06 - 0601' }],
    'FINANZAS':              [{ label: 'FINANZAS',                  code: '07 - 0701' }],
    'PROPIEDAD INTELECTUAL': [{ label: 'PROPIEDAD INTELECTUAL',     code: '08 - 0801' }],
    'ADMINISTRACIÓN':        [
        { label: 'ADMINISTRACION TI',      code: '99 - 0901' },
        { label: 'ADMINISTRACION MERCADEO', code: '99 - 1001' },
        { label: 'ADMINISTRACION 2',        code: '99 - 8888' },
        { label: 'ADMINISTRACIÓN',          code: '99 - 9999' },
    ],
};

// Permisos por sección del formulario (flags en DatosEmpleado)
const SQF_SECTIONS = [
    { id: 'clients', flag: 'acceso_sqf_clientes' },
    { id: 'contracts', flag: 'acceso_sqf_contratos' },
    { id: 'billing', flag: 'acceso_sqf_facturacion' },
    { id: 'auditor', flag: 'acceso_sqf_auditoria' },
];

export default function FormulariosSQF({ onBack }) {
    const navigate = useNavigate();
    const { user, empleadoData, isSuperAdmin, isAdmin } = useAuth();

    // Secciones visibles: admins ven todo; empleados 
    //  sus flags por sección.
    // Fallback legacy: localStorage anterior al despliegue sin los flags nuevos
    // pero con acceso general (se corrige solo cuando AuthContext sincroniza).
    const legacyAccess = Boolean(empleadoData?.acceso_formularios_sqf)
        && SQF_SECTIONS.every(s => empleadoData?.[s.flag] === undefined);
    const allowedSections = (isSuperAdmin || isAdmin || legacyAccess)
        ? SQF_SECTIONS.map(s => s.id)
        : SQF_SECTIONS.filter(s => Boolean(empleadoData?.[s.flag])).map(s => s.id);
    const canSee = (sectionId) => allowedSections.includes(sectionId);

    // ==========================================
    // ESTADOS GLOBALES
    // ==========================================
    const [activeSection, setActiveSection] = useState(allowedSections[0] || 'clients');

    // Si los permisos cambian (sync de AuthContext) y la sección activa deja
    // de estar permitida, reubicar en la primera permitida.
    useEffect(() => {
        if (allowedSections.length > 0 && !allowedSections.includes(activeSection)) {
            setActiveSection(allowedSections[0]);
        }
    }, [allowedSections.join('|'), activeSection]); // eslint-disable-line react-hooks/exhaustive-deps
    const [clients, setClients] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [pendingClients, setPendingClients] = useState([]);
    const [pendingContracts, setPendingContracts] = useState([]);
    const [pendingValidationNit, setPendingValidationNit] = useState(null);
    const [selectedClientForContract, setSelectedClientForContract] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [contractSearchQuery, setContractSearchQuery] = useState('');
    const [clientDateFrom, setClientDateFrom] = useState('');
    const [clientDateTo, setClientDateTo] = useState('');
    const [contractDateFrom, setContractDateFrom] = useState('');
    const [contractDateTo, setContractDateTo] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientDropdownQuery, setClientDropdownQuery] = useState('');

    const [showClientForm, setShowClientForm] = useState(false);
    const [showContractForm, setShowContractForm] = useState(false);
    
    const [isNitModalOpen, setIsNitModalOpen] = useState(false);
    const [nitLookupValue, setNitLookupValue] = useState('');
    const [nitLookupResult, setNitLookupResult] = useState(null);

    const [billingReqType, setBillingReqType] = useState('facturacion');
    const [billingModality, setBillingModality] = useState('');
    const [billingType, setBillingType] = useState('Servicio nuevo');
    const [billingClientType, setBillingClientType] = useState('Cliente nuevo');
    const [billingClientName, setBillingClientName] = useState('');
    const [billingCompany, setBillingCompany] = useState('');
    const [billingReference, setBillingReference] = useState('');
    const [billingClientDocument, setBillingClientDocument] = useState('');
    const [billingDueDate, setBillingDueDate] = useState('');
    const [billingObservations, setBillingObservations] = useState('');
    const [billingItems, setBillingItems] = useState([{ code: '', quantity: '1', unitPrice: '', description: '' }]);
    const [saleType, setSaleType] = useState('');
    const [crossSalePerson, setCrossSalePerson] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [billingValorMes, setBillingValorMes] = useState('');
    const [billingValorProyecto, setBillingValorProyecto] = useState('');
    const [billingMonthType, setBillingMonthType] = useState('');
    const [billingSellerDocument, setBillingSellerDocument] = useState('');
    const [origin, setOrigin] = useState('');
    const [originRef, setOriginRef] = useState('');
    const [billingCloser, setBillingCloser] = useState('');
    const [billingAreas, setBillingAreas] = useState([{ id: 1, centro: '', concepto: '', valor: '' }]);
    const [contractRoles, setContractRoles] = useState([{ id: 1, cargo: '', horas: '' }]);

    const [auditorModalItem, setAuditorModalItem] = useState(null);
    const [auditorModalType, setAuditorModalType] = useState('');

    const [toast, setToast] = useState({ show: false, type: '', title: '', message: '' });
    const [isSubmittingClient, setIsSubmittingClient] = useState(false);
    const [isSubmittingContract, setIsSubmittingContract] = useState(false);
    const [isSubmittingBilling, setIsSubmittingBilling] = useState(false);

    const rutRef = useRef(null);
    const camaraRef = useRef(null);
    const composicionRef = useRef(null);
    const estudioRef = useRef(null);
    const [rutFileName, setRutFileName] = useState('');
    const [camaraFileName, setCamaraFileName] = useState('');
    const [composicionFileName, setComposicionFileName] = useState('');
    const [estudioFileName, setEstudioFileName] = useState('');

    const [clientErrors, setClientErrors] = useState({});
    const [contractErrors, setContractErrors] = useState({});
    const [billingErrors, setBillingErrors] = useState({});
    const [ncErrors, setNcErrors] = useState({});

    // ==========================================
    // CARGA DE DATOS (PETICIONES SIMPLES ANTI-CORS)
    // ==========================================
    const refreshPendings = useCallback(async () => {
        try {
            let clientsData = null, contractsData = null;

            try {
                clientsData = await fetch(N8N_WEBHOOKS.pending);
                if (clientsData.ok) clientsData = await clientsData.json();
            } catch (e) {
                console.warn('Error obteniendo clientes pendientes:', e);
            }

            try {
                contractsData = await fetch(N8N_WEBHOOKS.contractsPending);
                if (contractsData.ok) contractsData = await contractsData.json();
            } catch (e) {
                console.warn('Error obteniendo contratos pendientes:', e);
            }

            const mappedPendingClients = [];
            const mappedPendingContracts = [];

            if (clientsData) {
                const rawClients = extractDataSafe(clientsData);
                (Array.isArray(rawClients) ? rawClients : []).forEach((p) => {
                    if (typeof p?.creado === 'boolean' && p.creado !== false) return;
                    const statusRaw = p?.status || p?.Estado || p?.estado || p?.Status || 'Pendiente';
                    const status = String(statusRaw || 'Pendiente');
                    const createdAt = p?.createdAt || p?.FechaCreacion || p?.fechaCreacion || p?.Fecha || '';
                    const updatedAt = p?.updatedAt || p?.FechaActualizacion || p?.fechaActualizacion || '';

                    mappedPendingClients.push({
                        id: p?.id || generateId('CLI-P'),
                        clientType: p?.clientType || (p?.Tipodocumento === 'NIT' ? 'juridica' : 'natural'),
                        document: p?.document || p?.Documento || '',
                        name: p?.name || p?.Nombre || '',
                        contactName: p?.contactName || p?.NombreContacto || '',
                        contactRole: p?.contactRole || p?.CargoContacto || '',
                        economicGroup: p?.economicGroup || p?.GrupoEconomico || '',
                        email: p?.email || p?.CorreoElectronico || '',
                        phone: p?.phone || p?.Telefono || '',
                        page: p?.page || p?.Pagina || '',
                        address: p?.address || '',
                        info: p?.info || '',
                        solicitante_nombre: p?.solicitante_nombre || p?.Solicitante || p?.solicitante || '',
                        solicitante_correo: p?.solicitante_correo || '',
                        solicitante_id: p?.solicitante_id || '',
                        createdAt,
                        updatedAt,
                        status,
                        source: p?.source || 'pendientes'
                    });
                });
            }

            if (contractsData) {
                const rawContracts = extractDataSafe(contractsData);
                (Array.isArray(rawContracts) ? rawContracts : []).forEach((p) => {
                    if (typeof p?.creado === 'boolean' && p.creado !== false) return;
                    const statusRaw = p?.status || p?.Estado || p?.estado || p?.Status || 'Pendiente';
                    const status = String(statusRaw || 'Pendiente');
                    const createdAt = p?.createdAt || p?.FechaCreacion || p?.fechaCreacion || p?.Fecha || '';
                    const updatedAt = p?.updatedAt || p?.FechaActualizacion || p?.fechaActualizacion || '';

                    const rawValueContract = p?.value ?? p?.Valor ?? p?.valor ?? (p?.PrecioMensual ?? p?.precioMensual) ?? '';
                    const parsedValueContract = (() => {
                        const numStr = String(rawValueContract || '').replace(/\D/g, '');
                        if (!numStr) return 0;
                        const num = parseInt(numStr, 10);
                        return Number.isFinite(num) ? num : 0;
                    })();

                    const clientDoc = (p?.clientDocument || p?.DocumentoCliente || p?.NIT || p?.Nit || '').toString().trim();
                    const cleanedClientDoc = (clientDoc === '—' || clientDoc === '--') ? '' : clientDoc;

                    mappedPendingContracts.push({
                        id: p?.id || generateId('CTR-P'),
                        contractType: p?.contractType || p?.TipoContrato || p?.tipoContrato || '',
                        clientId: p?.clientId || '',
                        clientName: p?.clientName || p?.Cliente || p?.NombreCliente || '',
                        clientDocument: cleanedClientDoc,
                        economicGroup: p?.economicGroup || p?.GrupoEconomico || p?.grupoEconomico || '',
                        name: p?.name || p?.Nombre || p?.NombreContrato || p?.Contrato || p?.NombreProyecto || p?.Proyecto || '',
                        value: parsedValueContract,
                        valueFormatted: p?.valueFormatted || p?.ValorFormateado || p?.PrecioMensual || p?.precioMensual || '',
                        startDate: p?.startDate ? String(p?.startDate).split('T')[0] : (p?.FechaInicio ? String(p?.FechaInicio).split('T')[0] : ''),
                        endDate: p?.endDate ? String(p?.endDate).split('T')[0] : (p?.FechaFin ? String(p?.FechaFin).split('T')[0] : ''),
                        manager: p?.manager || p?.Gerente || p?.Coordinador || '',
                        service: p?.service || p?.Servicio || '',
                        roles: p?.roles || p?.Posiciones || p?.Cargos || '',
                        notes: p?.notes || p?.Notas || p?.Observaciones || '',
                        solicitante_nombre: p?.solicitante_nombre || p?.Solicitante || p?.solicitante || '',
                        solicitante_correo: p?.solicitante_correo || '',
                        solicitante_id: p?.solicitante_id || '',
                        createdAt,
                        updatedAt,
                        status
                    });
                });
            }

            setPendingClients(mappedPendingClients);
            setPendingContracts(mappedPendingContracts);
        } catch (e) {
            console.error('Error en refreshPendings:', e);
            setPendingClients([]);
            setPendingContracts([]);
        }
    }, []);

    const loadDataFromWebhooks = useCallback(async () => {
        setIsLoading(true);
        
        await refreshPendings();

        try {
            // Petición GET completamente limpia, sin headers extraños que disparen bloqueos.
            const clientsRes = await fetch(N8N_WEBHOOKS.client);
            if (clientsRes.ok) {
                const data = await clientsRes.json();
                const rawClients = extractDataSafe(data);
                
                const mappedClients = rawClients.map(c => ({
                    id: c.id || generateId('CLI'),
                    clientType: c.clientType || (c.Tipodocumento === 'NIT' ? 'juridica' : 'natural'),
                    document: c.document || c.Documento || '',
                    name: c.name || c.Nombre || '',
                    contactName: c.contactName || c.NombreContacto || '',
                    contactRole: c.contactRole || c.CargoContacto || '',
                    economicGroup: c.economicGroup || c.GrupoEconomico || '',
                    email: c.email || c.CorreoElectronico || '',
                    phone: c.phone || c.Telefono || '',
                    address: c.address || '',
                    info: c.info || '',
                    createdAt: c.createdAt || '',
                    status: c.status || c.Estado || 'Validado',
                    source: c.source || '',
                    solicitante_nombre: c.solicitante_nombre || c.Solicitante || c.solicitante || ''
                }));
                setClients(mappedClients);
            }
        } catch (e) { console.error('Bloqueo CORS o Red en Clientes:', e); setClients([]); }

        try {
            const contractsRes = await fetch(N8N_WEBHOOKS.contract);
            if (contractsRes.ok) {
                const data = await contractsRes.json();
                const rawContracts = extractDataSafe(data);
                
                const mappedContracts = rawContracts.map(c => {
                    const clientDoc = (c.clientDocument || c.DocumentoCliente || c.NIT || c.Nit || '').toString().trim();
                    const cleanedClientDoc = (clientDoc === '—' || clientDoc === '--') ? '' : clientDoc;

                    return {
                        id: c.id || generateId('CTR'),
                        contractType: c.contractType || c.TipoContrato || '',
                        clientId: c.clientId || '',
                        clientName: c.clientName || c.Cliente || '',
                        clientDocument: cleanedClientDoc,
                        economicGroup: c.economicGroup || '',
                        name: c.name || c.Nombre || '',
                        value: c.value || (c.PrecioMensual ? parseInt(String(c.PrecioMensual).replace(/\D/g, '') || '0') : 0),
                        valueFormatted: c.valueFormatted || c.PrecioMensual || '',
                        startDate: c.startDate ? String(c.startDate).split('T')[0] : (c.FechaInicio ? String(c.FechaInicio).split('T')[0] : ''),
                        endDate: c.endDate ? String(c.endDate).split('T')[0] : (c.FechaFin ? String(c.FechaFin).split('T')[0] : ''),
                        manager: c.manager || c.Coordinador || '',
                        service: c.service || c.Servicio || '',
                        roles: c.roles || c.Posiciones || '',
                        notes: c.notes || '',
                        createdAt: c.createdAt || '',
                        status: c.status || c.Estado || 'Validado',
                        solicitante_nombre: c.solicitante_nombre || c.Solicitante || c.solicitante || ''
                    };
                });
                setContracts(mappedContracts);
            }
        } catch (e) { console.error('Bloqueo CORS o Red en Contratos:', e); setContracts([]); }
        
        setIsLoading(false);
    }, [refreshPendings]);

    useEffect(() => {
        loadDataFromWebhooks();
    }, [loadDataFromWebhooks]);

    const validClients = Array.isArray(clients) ? clients : [];
    const validContracts = Array.isArray(contracts) ? contracts : [];
    const auditClients = pendingClients.length > 0 ? pendingClients : validClients.filter(c => c?.status !== 'Validado');
    const auditContracts = pendingContracts;

    // ==========================================
    // FUNCIONES GLOBALES / UTILS
    // ==========================================
    const showToastMsg = (type, title, message) => {
        setToast({ show: true, type, title, message });
        setTimeout(() => setToast({ show: false, type: '', title: '', message: '' }), 6000);
    };

    const formatCurrency = (val) => {
        const numStr = String(val || '').replace(/\D/g, '');
        if (!numStr) return '';
        return new Intl.NumberFormat('es-CO').format(parseInt(numStr, 10));
    };

    const formatCurrencyInput = (e) => {
        e.target.value = formatCurrency(e.target.value);
    };

    const handleCurrencyChange = (e, setter) => { setter(formatCurrency(e.target.value)); };

    const formatCurrencyDisplay = (val) => {
        if (!val) return '$ 0';
        const numStr = String(val).replace(/\D/g, '');
        const num = parseInt(numStr, 10);
        return isNaN(num) ? val : `$ ${new Intl.NumberFormat('es-CO').format(num)}`;
    };

    const formatDateSafe = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(isoStr);
        return isNaN(d) ? String(isoStr) : d.toLocaleString('es-CO');
    };

    const getLoggedUserMeta = () => {
        const fullNameEmpleado = [
            empleadoData?.primer_nombre,
            empleadoData?.segundo_nombre,
            empleadoData?.primer_apellido,
            empleadoData?.segundo_apellido,
        ].filter(Boolean).join(' ').trim();

        const fullNameAdmin = [empleadoData?.nombre, empleadoData?.apellido].filter(Boolean).join(' ').trim()
            || [user?.nombre, user?.apellido].filter(Boolean).join(' ').trim();

        return {
            solicitante_nombre: fullNameEmpleado || fullNameAdmin || 'Usuario sin nombre',
            solicitante_correo: empleadoData?.correo_corporativo || empleadoData?.email || user?.email || '',
            solicitante_id: empleadoData?.id_empleado || user?.id || '',
        };
    };

    const appendLoggedUserMeta = (formData) => {
        const meta = getLoggedUserMeta();
        Object.entries(meta).forEach(([key, value]) => formData.append(key, String(value ?? '')));
    };

    // ==========================================
    // LÓGICA DE CLIENTES
    // ==========================================
    const resetClientForm = () => {
        setShowClientForm(false); setClientErrors({});
        setRutFileName(''); setCamaraFileName(''); setComposicionFileName(''); setEstudioFileName('');
        if (rutRef.current) rutRef.current.value = '';
        if (camaraRef.current) camaraRef.current.value = '';
        if (composicionRef.current) composicionRef.current.value = '';
        if (estudioRef.current) estudioRef.current.value = '';
    };

    const handleClientSubmit = async (e) => {
        e.preventDefault();
        setClientErrors({});
        const form = e.target;
        const formData = new FormData(form);
        let errors = {};
        let isValid = true;

        const reqFields = ['document', 'name', 'contactName', 'contactRole', 'economicGroup', 'email', 'phone', 'address'];
        reqFields.forEach(f => {
            if (!formData.get(f)?.trim()) { errors[f] = 'Este campo es requerido'; isValid = false; }
        });

        const email = formData.get('email');
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errors.email = 'Correo inválido'; isValid = false; }
        if (!rutRef.current?.files[0]) { errors.rutFile = 'El RUT es obligatorio'; isValid = false; }

        if (!isValid) { setClientErrors(errors); return; }

        setIsSubmittingClient(true);
        ['document', 'name', 'contactName', 'contactRole', 'economicGroup', 'address', 'info'].forEach(f => {
            const v = formData.get(f); if (v) formData.set(f, v.toUpperCase());
        });
        formData.append('id', generateId('CLI'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');
        appendLoggedUserMeta(formData);

        try {
            const res = await fetch(N8N_WEBHOOKS.client, { method: 'POST', body: formData });
            if (res.status === 409) {
                showToastMsg('error', 'Cliente Duplicado', 'El cliente ya se encuentra registrado.');
            } else if (!res.ok) {
                showToastMsg('error', 'Error', 'Ocurrió un error al registrar el cliente.');
            } else {
                showToastMsg('success', 'Cliente Creado', 'El cliente fue registrado exitosamente.');
                form.reset();
                resetClientForm();
                setTimeout(loadDataFromWebhooks, 1000);
            }
        } catch {
            showToastMsg('error', 'Error de Conexión', 'Ocurrió un error al conectar con n8n.');
        } finally {
            setIsSubmittingClient(false);
        }
    };

    const filteredClients = validClients.filter(c => 
        String(c?.name || '').toLowerCase().includes(String(clientSearchQuery).toLowerCase()) || 
        String(c?.document || '').toLowerCase().includes(String(clientSearchQuery).toLowerCase())
    );

    const filteredContracts = validContracts.filter(c => 
        String(c?.name || '').toLowerCase().includes(String(contractSearchQuery).toLowerCase()) || 
        String(c?.clientName || '').toLowerCase().includes(String(contractSearchQuery).toLowerCase())
    );

    const dropdownClients = validClients.filter(c => 
        String(c?.name || '').toLowerCase().includes(String(clientDropdownQuery).toLowerCase()) || 
        String(c?.document || '').toLowerCase().includes(String(clientDropdownQuery).toLowerCase())
    );

    // ==========================================
    // LÓGICA DE CONTRATOS Y MODAL NIT
    // ==========================================
    const triggerLookup = () => {
        if (!String(nitLookupValue).trim()) {
            setNitLookupResult({ type: 'empty' });
            return;
        }
        const cleanDoc = String(nitLookupValue).replace(/\D/g, '');
        const found = validClients.find(c => String(c?.document || '').replace(/\D/g, '') === cleanDoc);
        if (found) { setNitLookupResult({ type: 'found', client: found }); } 
        else { setNitLookupResult({ type: 'error' }); }
    };

    const startContractForClient = (client) => {
        setSelectedClientForContract(client);
        setIsNitModalOpen(false); setNitLookupValue(''); setNitLookupResult(null);
        setShowContractForm(true);
    };

    const resetContractForm = () => {
        setShowContractForm(false); setSelectedClientForContract(null);
        setClientDropdownQuery(''); setIsClientDropdownOpen(false); setContractErrors({});
        setContractRoles([{ id: 1, cargo: '', horas: '' }]);
    };

    const selectClientFromDropdown = (client) => {
        setSelectedClientForContract(client);
        setClientDropdownQuery(''); setIsClientDropdownOpen(false);
    };

    const handleContractSubmit = async (e) => {
        e.preventDefault();
        setContractErrors({});
        let errors = {};
        let isValid = true;

        if (!selectedClientForContract) { errors.client = 'Debe seleccionar un cliente'; isValid = false; }
        
        const form = e.target;
        const formData = new FormData(form);
        const reqFields = ['economicGroup', 'name', 'value', 'manager', 'service'];
        reqFields.forEach(f => {
            if (!formData.get(f)?.trim()) { errors[f] = 'Este campo es requerido'; isValid = false; }
        });

        const rolesValid = contractRoles.every(r => r.cargo.trim() && r.horas.toString().trim());
        if (!rolesValid) { errors.roles = 'Completa cargo y horas en todos los registros'; isValid = false; }

        const today = new Date().toISOString().split('T')[0];
        formData.append('startDate', today);
        formData.append('endDate', calculateBusinessDaysDate(today, 5));
        
        if (!isValid) { setContractErrors(errors); return; }

        setIsSubmittingContract(true);
        ['economicGroup', 'name', 'manager', 'service', 'notes'].forEach(f => {
            const v = formData.get(f); if (v) formData.set(f, v.toUpperCase());
        });
        formData.append('roles', JSON.stringify(contractRoles.map(r => ({ cargo: r.cargo.toUpperCase(), horas: r.horas }))));
        formData.append('id', generateId('CTR'));
        formData.append('clientId', selectedClientForContract.id);
        formData.append('clientName', selectedClientForContract.name.toUpperCase());
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');
        appendLoggedUserMeta(formData);
        
        const rawValue = String(formData.get('value') || '').replace(/\D/g, '');
        formData.set('value', parseInt(rawValue || '0', 10));
        formData.append('valueFormatted', `$ ${formatCurrency(rawValue)}`);

        try {
            await fetch(N8N_WEBHOOKS.contract, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Contrato Creado', 'El contrato fue registrado exitosamente.');
            form.reset();
            resetContractForm();
            setTimeout(loadDataFromWebhooks, 1000);
        } catch {
            showToastMsg('error', 'Error de Conexión', 'Ocurrió un error al conectar con n8n.');
        } finally {
            setIsSubmittingContract(false);
        }
    };

    // ==========================================
    // LÓGICA DE FACTURACIÓN
    // ==========================================
    const addAreaBlock = () => {
        if (billingAreas.length >= 3) {
            showToastMsg('error', 'Límite de Áreas', 'Solo se pueden agregar hasta 3 áreas de facturación.');
            return;
        }
        setBillingAreas([...billingAreas, { id: billingAreas.length + 1, centro: '', concepto: '', valor: '' }]);
    };

    const removeAreaBlock = (idToRemove) => {
        const newAreas = billingAreas.filter(area => area.id !== idToRemove).map((area, index) => ({ ...area, id: index + 1 }));
        setBillingAreas(newAreas);
    };

    const updateArea = (id, field, value) => {
        setBillingAreas(prev => prev.map(area => {
            if (area.id !== id) return area;
            if (field === 'centro') {
                setBillingReference('');
                return { ...area, centro: value, concepto: '' };
            }
            if (field === 'concepto') {
                const found = (BILLING_CENTERS[area.centro] || []).find(c => c.label === value);
                if (found) setBillingReference(found.code);
                return { ...area, concepto: value };
            }
            return { ...area, [field]: value };
        }));
    };

    const addContractRole = () => {
        setContractRoles(prev => [...prev, { id: prev.length + 1, cargo: '', horas: '' }]);
    };

    const removeContractRole = (idToRemove) => {
        if (contractRoles.length === 1) return;
        setContractRoles(prev =>
            prev.filter(r => r.id !== idToRemove).map((r, i) => ({ ...r, id: i + 1 }))
        );
    };

    const updateContractRole = (id, field, value) => {
        setContractRoles(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const resetBillingForm = () => {
        setBillingReqType('facturacion'); setBillingModality(''); setBillingType('Servicio nuevo'); setBillingClientType('Cliente nuevo');
        setBillingClientName(''); setBillingCompany(''); setSaleType(''); setCrossSalePerson('');
        setBillingReference(''); setBillingClientDocument(''); setBillingDueDate(''); setBillingObservations(''); setBillingItems([{ code: '', quantity: '1', unitPrice: '', description: '' }]);
        setServiceType(''); setBillingValorMes(''); setBillingValorProyecto('');
        setOrigin(''); setOriginRef(''); setBillingCloser(''); setBillingMonthType(''); setBillingSellerDocument('');
        setBillingAreas([{ id: 1, centro: '', concepto: '', valor: '' }]);
        setBillingErrors({}); setNcErrors({});
    };

    const sendContractToBilling = (contract) => {
        setActiveSection('billing');
        setBillingReqType('facturacion');
        setBillingType('Servicio actual');
        setBillingClientType('Cliente antiguo');

        const clientName = contract?.clientName || '';
        setBillingClientName(clientName);

        // Intentar obtener NIT de múltiples fuentes
        let clientNit = contract?.clientDocument || contract?.DocumentoCliente || contract?.NIT || contract?.Nit || '';

        // Si no viene en el contrato, buscar el cliente en la lista validada
        if (!clientNit || clientNit.trim() === '') {
            const matchedClient = validClients.find(c => {
                const cName = String(c?.name || '').toLowerCase().trim();
                const contractName = String(clientName || '').toLowerCase().trim();
                return cName === contractName;
            });
            if (matchedClient) {
                clientNit = matchedClient.document || '';
            }
        }

        setBillingClientDocument(clientNit || '');

        let sType = 'Otro';
        const cTypeStr = String(contract?.contractType || '');
        if (cTypeStr === 'Mensual' || cTypeStr.includes('Mensual')) sType = 'Fee mensual';
        else if (cTypeStr === 'Proyecto') sType = 'Proyecto';
        setServiceType(sType);

        const val = contract?.value ? formatCurrency(contract.value) : '';
        if (sType === 'Fee mensual') { setBillingValorMes(val); setBillingValorProyecto(''); }
        else { setBillingValorProyecto(val); setBillingValorMes(''); }

        setBillingCloser(contract?.manager || '');
        setBillingAreas([{ id: 1, centro: '', concepto: '', valor: val }]);
        setBillingReference('');
        setBillingMonthType('');
        setBillingSellerDocument('');

        showToastMsg('success-discrete', '', `Contrato "${contract?.name || ''}" cargado para facturar.`);
    };

    const handleBillingSubmit = async (e) => {
        e.preventDefault();
        setBillingErrors({});
        let errors = {};
        let isValid = true;

        if (!billingModality) { errors.billingModality = 'Requerido'; isValid = false; }
        if (!billingClientName.trim()) { errors.billingClientName = 'Requerido'; isValid = false; }
        if (!billingCompany) { errors.billingCompany = 'Requerido'; isValid = false; }
        if (!saleType) { errors.saleType = 'Requerido'; isValid = false; }
        if (saleType === 'Venta cruzada' && !crossSalePerson.trim()) { showToastMsg('error', 'Campo Faltante', 'Falta persona venta cruzada.'); isValid = false; }
        if (!serviceType) { errors.serviceType = 'Requerido'; isValid = false; }
        if (serviceType === 'Fee mensual' && !billingValorMes.trim()) { errors.billingValorMes = 'Requerido'; isValid = false; }
        if (serviceType === 'Proyecto' && !billingValorProyecto.trim()) { errors.billingValorProyecto = 'Requerido'; isValid = false; }
        if (!origin) { errors.origin = 'Requerido'; isValid = false; }
        if (['Cliente antiguo', 'Referido externo', 'Referido empleado'].includes(origin) && !originRef.trim()) { showToastMsg('error', 'Campo Faltante', 'Especifique el nombre del referente.'); isValid = false; }
        if (!billingCloser.trim()) { errors.billingCloser = 'Requerido'; isValid = false; }

        billingAreas.forEach(area => {
            if (!area.centro.trim() || !area.concepto.trim() || !area.valor.trim()) {
                showToastMsg('error', 'Campo Faltante', `Faltan datos en el área ${area.id}.`);
                isValid = false;
            }
        });

        if (!isValid) { setBillingErrors(errors); return; }

        setIsSubmittingBilling(true);
        // Build items array from billingItems state
        const parsedItems = (Array.isArray(billingItems) ? billingItems : []).map(it => {
            const code = String(it.code || '').trim();
            const quantity = parseInt(String(it.quantity || '').replace(/\D/g, '') || '0', 10) || 0;
            const unitPrice = parseInt(String(it.unitPrice || '').replace(/\D/g, '') || '0', 10) || 0;
            const description = String(it.description || '').trim();
            return { code, quantity, unitPrice, description, total: quantity * unitPrice };
        }).filter(it => it.code || it.quantity || it.unitPrice || it.description);

        const autoDueDate = calculateBusinessDaysDate(new Date().toISOString().split('T')[0], 3);

        const payload = {
            id: generateId('BIL'), tipoSolicitud: 'Facturación', billingType, billingClientType,
            billingModality, modalidad_facturacion: billingModality,
            clientName: billingClientName.toUpperCase(), company: billingCompany, saleType, crossSalePerson: saleType === 'Venta cruzada' ? crossSalePerson.toUpperCase() : '',
            serviceType,
            valorMes: parseInt(String(billingValorMes).replace(/\D/g, '') || '0', 10),
            valorProyecto: parseInt(String(billingValorProyecto).replace(/\D/g, '') || '0', 10),
            reference: billingReference || '',
            referencia: billingReference || '',
            clientDocument: billingClientDocument || '',
            nit: billingClientDocument || '',
            documento: billingClientDocument || '',
            dueDate: autoDueDate,
            fecha_vencimiento: autoDueDate,
            fechaVencimiento: autoDueDate,
            observations: billingObservations || '',
            observaciones: billingObservations || '',
            items: JSON.stringify(parsedItems),
            items_json: JSON.stringify(parsedItems),
            origin, originRef: ['Cliente antiguo', 'Referido externo', 'Referido empleado'].includes(origin) ? originRef.toUpperCase() : '',
            closer: billingCloser.toUpperCase(),
            mes_tipo: billingMonthType,
            mesCorrienteOVencido: billingMonthType,
            identificacion_vendedor: billingSellerDocument,
            sellerDocument: billingSellerDocument,
            areas: JSON.stringify(billingAreas.map(a => ({ ...a, centro: a.centro.toUpperCase(), concepto: a.concepto.toUpperCase(), valor: parseInt(String(a.valor).replace(/\D/g, ''), 10) }))),
            createdAt: new Date().toISOString(),
            ...getLoggedUserMeta(),
        };

        try {
            const formData = new FormData();
            Object.keys(payload).forEach(k => formData.append(k, payload[k]));
            parsedItems.forEach((item, index) => {
                formData.append(`items[${index}][code]`, item.code);
                formData.append(`items[${index}][quantity]`, String(item.quantity));
                formData.append(`items[${index}][unitPrice]`, String(item.unitPrice));
                formData.append(`items[${index}][description]`, item.description);
                formData.append(`items[${index}][total]`, String(item.total));
                formData.append(`items[${index}][codigo]`, item.code);
                formData.append(`items[${index}][cantidad]`, String(item.quantity));
                formData.append(`items[${index}][precio]`, String(item.unitPrice));
                formData.append(`items[${index}][descripcion]`, item.description);
                formData.append(`items[${index}][observaciones]`, billingObservations || '');
            });
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });

            const datatableForm = new FormData();
            datatableForm.append('id', payload.id);
            datatableForm.append('tipo_solicitud', payload.tipoSolicitud);
            datatableForm.append('created_at', payload.createdAt);
            datatableForm.append('status', 'Pendiente');
            datatableForm.append('solicitante_nombre', payload.solicitante_nombre);
            datatableForm.append('solicitante_correo', payload.solicitante_correo);
            datatableForm.append('solicitante_id', payload.solicitante_id);
            datatableForm.append('client_name', payload.clientName);
            datatableForm.append('billing_type', payload.billingType);
            datatableForm.append('billing_client_type', payload.billingClientType);
            datatableForm.append('billing_modality', payload.billingModality);
            datatableForm.append('company', payload.company);
            datatableForm.append('sale_type', payload.saleType);
            datatableForm.append('cross_sale_person', payload.crossSalePerson);
            datatableForm.append('service_type', payload.serviceType);
            datatableForm.append('valor_mes', payload.valorMes);
            datatableForm.append('valor_proyecto', payload.valorProyecto);
            datatableForm.append('origin', payload.origin);
            datatableForm.append('origin_ref', payload.originRef);
            datatableForm.append('closer', payload.closer);
            datatableForm.append('mes_tipo', payload.mes_tipo);
            datatableForm.append('mes_corriente_o_vencido', payload.mesCorrienteOVencido);
            datatableForm.append('identificacion_vendedor', payload.identificacion_vendedor);
            datatableForm.append('areas', payload.areas);
            datatableForm.append('reference', payload.reference);
            datatableForm.append('referencia', payload.referencia);
            datatableForm.append('nit', payload.nit);
            datatableForm.append('documento', payload.documento);
            datatableForm.append('client_document', payload.clientDocument);
            datatableForm.append('due_date', payload.dueDate);
            datatableForm.append('fecha_vencimiento', payload.fecha_vencimiento);
            datatableForm.append('observations', payload.observations);
            datatableForm.append('observaciones', payload.observaciones);
            datatableForm.append('fechaVencimiento', payload.fechaVencimiento);
            datatableForm.append('items', payload.items);
            datatableForm.append('items_json', payload.items_json);
            parsedItems.forEach((item, index) => {
                datatableForm.append(`items[${index}][code]`, item.code);
                datatableForm.append(`items[${index}][quantity]`, String(item.quantity));
                datatableForm.append(`items[${index}][unitPrice]`, String(item.unitPrice));
                datatableForm.append(`items[${index}][description]`, item.description);
                datatableForm.append(`items[${index}][total]`, String(item.total));
                datatableForm.append(`items[${index}][codigo]`, item.code);
                datatableForm.append(`items[${index}][cantidad]`, String(item.quantity));
                datatableForm.append(`items[${index}][precio]`, String(item.unitPrice));
                datatableForm.append(`items[${index}][descripcion]`, item.description);
                datatableForm.append(`items[${index}][observaciones]`, billingObservations || '');
            });
            datatableForm.append('nc_invoice', '');
            datatableForm.append('nc_value', 0);
            datatableForm.append('nc_reason', '');
            await fetch(N8N_WEBHOOKS.datatable, { method: 'POST', mode: 'no-cors', body: datatableForm });

            showToastMsg('success', 'Solicitud Enviada', 'La solicitud de facturación fue registrada.');
            resetBillingForm();
        } catch {
            showToastMsg('error', 'Error de Conexión', 'Error al enviar a n8n.');
        } finally {
            setIsSubmittingBilling(false);
        }
    };

    const handleNotaCreditoSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        let isValid = true;
        let errors = {};

        ['ncClient', 'ncInvoice', 'ncValue', 'ncReason'].forEach(f => {
            if (!formData.get(f)?.trim()) { errors[f] = 'Requerido'; isValid = false; }
        });

        if (!isValid) { setNcErrors(errors); return; }

        setIsSubmittingBilling(true);
        ['ncClient', 'ncInvoice', 'ncReason'].forEach(f => {
            const v = formData.get(f); if (v) formData.set(f, v.toUpperCase());
        });
        formData.append('id', generateId('NC'));
        formData.append('tipoSolicitud', 'Nota Crédito');
        formData.append('createdAt', new Date().toISOString());
        formData.set('ncValue', parseInt(String(formData.get('ncValue')).replace(/\D/g, '') || '0', 10));
        appendLoggedUserMeta(formData);

        try {
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });

            const meta = getLoggedUserMeta();
            const datatableForm = new FormData();
            datatableForm.append('id', formData.get('id'));
            datatableForm.append('tipo_solicitud', 'Nota Crédito');
            datatableForm.append('created_at', formData.get('createdAt'));
            datatableForm.append('status', 'Pendiente');
            datatableForm.append('solicitante_nombre', meta.solicitante_nombre);
            datatableForm.append('solicitante_correo', meta.solicitante_correo);
            datatableForm.append('solicitante_id', meta.solicitante_id);
            datatableForm.append('client_name', formData.get('ncClient'));
            datatableForm.append('nc_invoice', formData.get('ncInvoice'));
            datatableForm.append('nc_value', formData.get('ncValue'));
            datatableForm.append('nc_reason', formData.get('ncReason'));
            datatableForm.append('billing_type', '');
            datatableForm.append('billing_client_type', '');
            datatableForm.append('company', '');
            datatableForm.append('sale_type', '');
            datatableForm.append('cross_sale_person', '');
            datatableForm.append('service_type', '');
            datatableForm.append('valor_mes', 0);
            datatableForm.append('valor_proyecto', 0);
            datatableForm.append('origin', '');
            datatableForm.append('origin_ref', '');
            datatableForm.append('closer', '');
            datatableForm.append('areas', '');
            await fetch(N8N_WEBHOOKS.datatable, { method: 'POST', mode: 'no-cors', body: datatableForm });

            showToastMsg('success', 'Solicitud Enviada', 'La Nota Crédito fue enviada.');
            form.reset();
            resetBillingForm();
        } catch {
            showToastMsg('error', 'Error de Conexión', 'Error al enviar.');
        } finally {
            setIsSubmittingBilling(false);
        }
    };

    const markAsValidated = () => { showToastMsg('success', 'Validación Exitosa', 'El proceso ha sido marcado como validado.'); };

    const validateClientCreation = async (clientItem) => {
        const nombre = String(clientItem?.name || clientItem?.Nombre || '').trim();
        const nit = String(clientItem?.document || clientItem?.Documento || '').trim();

        if (!nombre || !nit) {
            showToastMsg('error', 'Datos incompletos', 'No se encontró el NIT y/o el nombre para validar la creación.');
            return;
        }

        const loggedUserMeta = getLoggedUserMeta();
        setPendingValidationNit(nit);
        try {
            await fetchApi('/n8n-proxy/?action=pendientes', {
                method: 'POST',
                body: JSON.stringify({
                    // Compatibilidad: algunos flujos esperan llaves en español/mayúsculas.
                    nit,
                    nombre,
                    Documento: nit,
                    Nombre: nombre,
                    solicitante_nombre: loggedUserMeta.solicitante_nombre,
                    solicitante_correo: loggedUserMeta.solicitante_correo,
                    solicitante_id: loggedUserMeta.solicitante_id,
                }),
            });
            showToastMsg('success', 'Validación enviada', 'Se envió la validación de creación.');

            setPendingClients((prev) => prev.filter((p) => String(p?.document || p?.Documento || '') !== nit));
            await refreshPendings();
        } catch (e) {
            showToastMsg('error', 'Error de Conexión', e?.message || 'No se pudo validar la creación.');
        } finally {
            setPendingValidationNit(null);
        }
    };

    const validateContractCreation = async (contractItem) => {
        const nombre = String(contractItem?.clientName || contractItem?.name || contractItem?.Nombre || '').trim();
        const nit = String(contractItem?.clientDocument || contractItem?.document || contractItem?.Documento || '').trim();

        if (!nombre) {
            showToastMsg('error', 'Datos incompletos', 'No se encontró el nombre del cliente para validar el contrato.');
            return;
        }

        const loggedUserMeta = getLoggedUserMeta();
        setPendingValidationNit(nit);
        try {
            const payload = new FormData();
            payload.append('nit', nit);
            payload.append('nombre', nombre);
            payload.append('documento', nit);
            payload.append('Documento', nit);
            payload.append('Nombre', nombre);
            payload.append('solicitante_nombre', loggedUserMeta.solicitante_nombre);
            payload.append('solicitante_correo', loggedUserMeta.solicitante_correo);
            payload.append('solicitante_id', loggedUserMeta.solicitante_id);

            await fetch(N8N_WEBHOOKS.contractsPending, {
                method: 'POST',
                mode: 'no-cors',
                body: payload,
            });

            showToastMsg('success', 'Validación enviada', 'Se envió la validación de contrato.');
            setPendingContracts((prev) => prev.filter((p) => String(p?.clientDocument || p?.document || p?.Documento || '') !== nit));
            await refreshPendings();
        } catch (e) {
            showToastMsg('error', 'Error de Conexión', e?.message || 'No se pudo validar el contrato.');
        } finally {
            setPendingValidationNit(null);
        }
    };

    const getSpanishFieldLabel = (key) => {
        const map = {
            id: 'ID',
            clientType: 'Tipo de cliente',
            document: 'Documento / NIT',
            clientDocument: 'Documento / NIT',
            name: 'Nombre',
            clientName: 'Cliente',
            contractType: 'Tipo de contrato',
            contactName: 'Nombre de contacto',
            contactRole: 'Cargo de contacto',
            economicGroup: 'Grupo económico',
            email: 'Correo electrónico',
            phone: 'Teléfono',
            address: 'Dirección',
            page: 'Página web',
            manager: 'Gerente a cargo',
            service: 'Servicio',
            roles: 'Cargos / roles',
            value: 'Valor',
            valueFormatted: 'Valor (formato)',
            startDate: 'Fecha inicio',
            endDate: 'Fecha fin',
            notes: 'Notas / observaciones',
            status: 'Estado',
            source: 'Fuente',
            solicitante_nombre: 'Solicitante',
            solicitante_correo: 'Correo solicitante',
            solicitante_id: 'ID solicitante',
            createdAt: 'Creado',
            updatedAt: 'Actualizado',
        };
        return map[key] || String(key);
    };

    // ==========================================
    // RENDERIZADO PRINCIPAL
    // ==========================================
    return (
        <div className="sqf-wrapper">
            {/* ===================== HEADER ===================== */}
            <header className="app-header">
                <div className="header-inner">
                    {/* Sin logo: el dashboard ya lo muestra y aquí desbordaba la barra */}
                    <nav className="main-nav" role="navigation" aria-label="Navegación principal">
                        {canSee('clients') && <button className={`nav-btn ${activeSection === 'clients' ? 'active' : ''}`} onClick={() => setActiveSection('clients')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg> Clientes
                        </button>}
                        {canSee('contracts') && <button className={`nav-btn ${activeSection === 'contracts' ? 'active' : ''}`} onClick={() => setActiveSection('contracts')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                            </svg> Contratos
                        </button>}
                        {canSee('auditor') && <button className={`nav-btn ${activeSection === 'auditor' ? 'active' : ''}`} onClick={() => setActiveSection('auditor')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg> Auditoría
                        </button>}
                        <button className="nav-btn" onClick={() => onBack ? onBack() : navigate('/admin2')} style={{ marginLeft: '8px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            ← Volver
                        </button>
                    </nav>
                </div>
            </header>

            <main className="app-main">
                
                {/* ========== SECTION: CLIENTES ========== */}
                <section className={`content-section ${activeSection === 'clients' && canSee('clients') ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Gestión de Clientes</h1>
                            <p className="section-subtitle">Registre y administre los clientes de la firma.</p>
                        </div>
                        <button className="btn-primary btn-new" onClick={() => { setShowClientForm(!showClientForm); setClientErrors({}); }}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Nuevo Cliente
                        </button>
                    </div>

                    {showClientForm && (
                        <div className="form-card">
                            <div className="form-card-header">
                                <h2 className="form-card-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="form-card-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg> Información del Cliente
                                </h2>
                                <button className="btn-close" onClick={resetClientForm}>✕</button>
                            </div>
                            <form onSubmit={handleClientSubmit} noValidate>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="form-label required">Tipo de Contribuyente</label>
                                        <div className="radio-group">
                                            <label className="radio-option"><input type="radio" name="clientType" value="natural" defaultChecked /><span className="radio-custom"></span><span className="radio-text"><strong>Persona Natural</strong><small>Cédula de ciudadanía</small></span></label>
                                            <label className="radio-option"><input type="radio" name="clientType" value="juridica" /><span className="radio-custom"></span><span className="radio-text"><strong>Persona Jurídica</strong><small>NIT de empresa</small></span></label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">NIT Empresa / Documento</label>
                                        <input type="text" name="document" className="form-input" placeholder="Ej: 900.123.456-7" />
                                        <span className="field-error">{clientErrors.document}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre o Razón Social</label>
                                        <input type="text" name="name" className="form-input" placeholder="Ej: Carlos Rodríguez Pérez" />
                                        <span className="field-error">{clientErrors.name}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre del Contacto de Pagos</label>
                                        <input type="text" name="contactName" className="form-input" placeholder="Ej: María González" />
                                        <span className="field-error">{clientErrors.contactName}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Cargo del Contacto</label>
                                        <input type="text" name="contactRole" className="form-input" placeholder="Ej: Directora Financiera" />
                                        <span className="field-error">{clientErrors.contactRole}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Grupo Económico</label>
                                        <input type="text" name="economicGroup" className="form-input" placeholder="Ej: Grupo Empresarial XYZ" />
                                        <span className="field-error">{clientErrors.economicGroup}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Correo de Facturación</label>
                                        <input type="email" name="email" className="form-input" placeholder="facturacion@empresa.com" />
                                        <span className="field-error">{clientErrors.email}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Teléfono(s) de Contacto</label>
                                        <input type="tel" name="phone" className="form-input" placeholder="Ej: +57 601 123 4567" />
                                        <span className="field-error">{clientErrors.phone}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Dirección del Cliente</label>
                                        <input type="text" name="address" className="form-input" placeholder="Ej: Calle 93 #15-32, Bogotá D.C." />
                                        <span className="field-error">{clientErrors.address}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Información Adicional <span className="label-optional">(opcional)</span></label>
                                        <textarea name="info" className="form-input form-textarea" placeholder="Observaciones, condiciones especiales..." rows="3"></textarea>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">RUT del Cliente</label>
                                        <div className={`file-upload-zone file-upload-sm ${rutFileName ? 'has-file' : ''}`} onClick={() => rutRef.current.click()}>
                                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <p className="upload-text">{rutFileName || 'Clic o arrastre el RUT'}</p>
                                            <p className="upload-hint">PDF, JPG, PNG – Máx. 10 MB</p>
                                        </div>
                                        <input type="file" name="rutFile" ref={rutRef} className="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setRutFileName(e.target.files[0]?.name || '')} />
                                        <span className="field-error">{clientErrors.rutFile}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Cámara de Comercio</label>
                                        <div className={`file-upload-zone file-upload-sm ${camaraFileName ? 'has-file' : ''}`} onClick={() => camaraRef.current.click()}>
                                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <p className="upload-text">{camaraFileName || 'Clic o arrastre el documento'}</p>
                                            <p className="upload-hint">PDF, JPG, PNG – Máx. 10 MB</p>
                                        </div>
                                        <input type="file" name="camaraFile" ref={camaraRef} className="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setCamaraFileName(e.target.files[0]?.name || '')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Composición Accionaria</label>
                                        <div className={`file-upload-zone file-upload-sm ${composicionFileName ? 'has-file' : ''}`} onClick={() => composicionRef.current.click()}>
                                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <p className="upload-text">{composicionFileName || 'Clic o arrastre el documento'}</p>
                                            <p className="upload-hint">PDF, JPG, PNG – Máx. 10 MB</p>
                                        </div>
                                        <input type="file" name="composicionFile" ref={composicionRef} className="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setComposicionFileName(e.target.files[0]?.name || '')} />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Estudio de Seguridad</label>
                                        <div className={`file-upload-zone file-upload-sm ${estudioFileName ? 'has-file' : ''}`} onClick={() => estudioRef.current.click()}>
                                            <svg className="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
                                            <p className="upload-text">{estudioFileName || 'Clic o arrastre el documento'}</p>
                                            <p className="upload-hint">PDF, JPG, PNG – Máx. 10 MB</p>
                                        </div>
                                        <input type="file" name="estudioFile" ref={estudioRef} className="file-input-hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setEstudioFileName(e.target.files[0]?.name || '')} />
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={resetClientForm}>Cancelar</button>
                                    <button type="submit" className="btn-primary btn-submit" disabled={isSubmittingClient}>
                                        <span className="btn-label">{isSubmittingClient ? 'Guardando...' : 'Registrar Cliente'}</span>
                                        {isSubmittingClient && <span className="btn-spinner"></span>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="list-card">
                        <div className="list-header">
                            <h2 className="list-title">Clientes Registrados</h2>
                            <div className="search-box">
                                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input type="search" className="search-input" placeholder="Buscar cliente..." value={clientSearchQuery} onChange={(e) => setClientSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            {filteredClients.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    <p>{isLoading ? 'Cargando datos...' : 'No hay clientes registrados.'}</p>
                                </div>
                            ) : (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        <thead>
                                            <tr><th>Cliente / Razón Social</th><th>NIT / Documento</th><th>Correo Electrónico</th><th>Teléfono</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredClients.map((c, i) => (
                                                <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }} style={{ cursor: 'pointer' }} title="Haga clic para ver detalles">
                                                    <td className="td-wrap"><strong>{c?.name || ''}</strong> {c?.source === 'historico' && <span style={{ marginLeft: '5px', background: 'rgba(0,169,206,.12)', color: '#006e87', padding: '2px 6px', borderRadius: '50px', fontSize: '10px', fontWeight: '700' }} title="Cliente Histórico">H</span>}</td>
                                                    <td>{c?.document || ''}</td>
                                                    <td>{c?.email || ''}</td>
                                                    <td>{c?.phone || ''}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Histórico de clientes */}
                    <div className="list-card" style={{ marginTop: '28px' }}>
                        <div className="list-header">
                            <h2 className="list-title">Histórico de Clientes</h2>
                        </div>
                        <div style={{ padding: '0 24px' }}>
                            <div className="history-filter-row">
                                <label>Desde</label>
                                <input type="date" value={clientDateFrom} onChange={e => setClientDateFrom(e.target.value)} />
                                <label>Hasta</label>
                                <input type="date" value={clientDateTo} onChange={e => setClientDateTo(e.target.value)} />
                                {(clientDateFrom || clientDateTo) && (
                                    <button className="history-filter-clear" onClick={() => { setClientDateFrom(''); setClientDateTo(''); }}>
                                        Limpiar filtro
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            {validClients.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                    <p>Sin registros aún.</p>
                                </div>
                            ) : (
                                <div className="history-scroll-container">
                                    <table className="profile-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Cliente / Razón Social</th>
                                                <th>Solicitante</th>
                                                <th>Fecha de Solicitud</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...validClients]
                                                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                                                .filter(c => {
                                                    const d = c.createdAt?.slice(0, 10);
                                                    if (clientDateFrom && d < clientDateFrom) return false;
                                                    if (clientDateTo && d > clientDateTo) return false;
                                                    return true;
                                                })
                                                .map((c, i) => (
                                                    <tr key={i}>
                                                        <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                                        <td className="td-wrap"><strong>{c?.name || '—'}</strong></td>
                                                        <td>{c?.solicitante_nombre || '—'}</td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateSafe(c?.createdAt) || '—'}</td>
                                                        <td><span className={`status-badge ${c?.status === 'Validado' ? 'validated' : 'pending'}`}>{c?.status || '—'}</span></td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ========== SECTION: CONTRATOS ========== */}
                <section className={`content-section ${activeSection === 'contracts' && canSee('contracts') ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Gestión de Contratos</h1>
                            <p className="section-subtitle">Cree y administre contratos y proyectos asociados a clientes.</p>
                        </div>
                        <button className="btn-primary btn-new" onClick={() => setIsNitModalOpen(true)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Nuevo Contrato
                        </button>
                    </div>

                    {/* MODAL NIT */}
                    {isNitModalOpen && (
                        <div className="nit-modal">
                            <div className="nit-modal-overlay" onClick={() => setIsNitModalOpen(false)}></div>
                            <div className="nit-modal-dialog">
                                <div className="nit-modal-header">
                                    <h2 className="nit-modal-title">Verificar Cliente</h2>
                                    <button className="nit-modal-close" onClick={() => setIsNitModalOpen(false)}>✕</button>
                                </div>
                                <div className="lookup-body nit-modal-body">
                                    <p className="nit-modal-desc">Para generar un contrato, es obligatorio verificar primero la existencia del cliente asociado.</p>
                                    <div className="lookup-input-row nit-modal-input-row">
                                        <div className="lookup-input-wrapper">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lookup-input-icon"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                            <input type="text" className="form-input lookup-input" placeholder="Ingrese NIT o número..." value={nitLookupValue} onChange={(e) => { setNitLookupValue(e.target.value); setNitLookupResult(null); }} />
                                        </div>
                                        <button className="btn-primary btn-lookup" onClick={triggerLookup}>
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg> Buscar
                                        </button>
                                    </div>
                                    {nitLookupResult?.type === 'found' && (
                                        <div className="lookup-result success">
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                                <div><strong>✔ Cliente Encontrado:</strong> <br/> {nitLookupResult.client?.name || ''}</div>
                                                <button type="button" className="btn-primary" style={{ width: '100%', borderRadius: '6px', padding: '12px', fontWeight: '600' }} onClick={() => startContractForClient(nitLookupResult.client)}>Generar Contrato</button>
                                            </div>
                     . text, !exclu                   </div>
                                    )}
                                    {nitLookupResult?.type === 'error' && (
                                        <div className="lookup-result error">
                                            <strong>✖ Cliente No Encontrado</strong><p style={{ marginTop: '5px', fontSize: '14px' }}>Registre el cliente primero en el menú superior de Clientes.</p>
                                        </div>
                                    )}
                                    {nitLookupResult?.type === 'empty' && (
                                        <div className="lookup-result error">
                                            <strong>✖ Ingrese un documento válido.</strong>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* No clients warning */}
                    {validClients.length === 0 && !isLoading && (
                        <div className="alert-card alert-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <div><strong>No hay clientes registrados</strong><p>Debe registrar al menos un cliente antes de crear un contrato. {canSee('clients') && <button className="link-btn" onClick={() => setActiveSection('clients')}>Ir a Clientes →</button>}</p></div>
                        </div>
                    )}

                    {showContractForm && (
                        <div className="form-card">
                            <div className="form-card-header">
                                <h2 className="form-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="form-card-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg> Información del Contrato</h2>
                                <button className="btn-close" onClick={resetContractForm}>✕</button>
                            </div>
                            <form onSubmit={handleContractSubmit} noValidate>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="form-label required">Tipo de Contrato</label>
                                        <div className="radio-group radio-group-col">
                                            <label className="radio-option"><input type="radio" name="contractType" value="Mensual" defaultChecked /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual</strong><small>Facturación recurrente mensual fija</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Proyecto" /><span className="radio-custom"></span><span className="radio-text"><strong>Proyecto</strong><small>Alcance y entregables definidos</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Horas trabajadas" /><span className="radio-custom"></span><span className="radio-text"><strong>Horas Trabajadas</strong><small>Facturación por horas consumidas</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Mensual + horas" /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual + Horas</strong><small>Base fija más horas adicionales</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Horas trabajadas por cargo" /><span className="radio-custom"></span><span className="radio-text"><strong>Horas por Cargo</strong><small>Horas diferenciadas por tipo de cargo</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Cantidad vs Precio unitario" /><span className="radio-custom"></span><span className="radio-text"><strong>Cantidad vs. Precio Unitario</strong><small>Cantidad de unidades por precio</small></span></label>
                                        </div>
                                    </div>

                                    <div className="form-group full-width">
                                        <label className="form-label required">Cliente Vinculado</label>
                                        <div className="client-selector-wrapper">
                                            {!selectedClientForContract ? (
                                                <>
                                                    <input type="text" className="form-input" placeholder="Buscar cliente por nombre o documento..." value={clientDropdownQuery} onChange={(e) => setClientDropdownQuery(e.target.value)} onFocus={() => setIsClientDropdownOpen(true)} autoComplete="off" />
                                                    {isClientDropdownOpen && (
                                                        <div className="client-dropdown">
                                                            {dropdownClients.length > 0 ? dropdownClients.map(c => (
                                                                <div key={c.id} className="client-dropdown-item" onClick={() => selectClientFromDropdown(c)}>
                                                                    <div style={{ fontWeight: 500 }}>{c?.name || ''}</div>
                                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>NIT: {c?.document || ''}</div>
                                                                </div>
                                                            )) : <div className="dropdown-empty">No se encontraron clientes</div>}
                                                        </div>
                                                    )}
                                                </>
                                            ) : null}
                                        </div>
                                        <span className="field-error">{contractErrors.client}</span>
                                        {selectedClientForContract && (
                                            <div className="selected-client-badge">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="badge-avatar-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                                <span>{selectedClientForContract?.name} (NIT: {selectedClientForContract?.document})</span>
                                                <button type="button" className="badge-remove" onClick={() => setSelectedClientForContract(null)}>✕</button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">Grupo Económico</label>
                                        <input type="text" name="economicGroup" className="form-input" defaultValue={selectedClientForContract?.economicGroup || ''} />
                                        <span className="field-error">{contractErrors.economicGroup}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre del Contrato</label>
                                        <input type="text" name="name" className="form-input" placeholder="Ej: Auditoría Financiera 2026 – Q1" />
                                        <span className="field-error">{contractErrors.name}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Valor del Contrato (COP)</label>
                                        <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                            <input type="text" name="value" className="form-input currency-input" onInput={formatCurrencyInput} placeholder="0" />
                                        </div>
                                        <span className="field-error">{contractErrors.value}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Gerente a Cargo (Administrador del Cliente)</label>
                                        <input type="text" name="manager" className="form-input" defaultValue={selectedClientForContract?.contactName || ''} />
                                        <span className="field-error">{contractErrors.manager}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Servicio a Prestar</label>
                                        <textarea name="service" className="form-input form-textarea" rows="3"></textarea>
                                        <span className="field-error">{contractErrors.service}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <div className="areas-header">
                                            <span className="areas-title">Cargos y Horas Asignadas</span>
                                            <button type="button" className="btn-secondary" style={{ padding: '6px 14px', fontSize: '13px' }} onClick={addContractRole}>
                                                + Agregar cargo
                                            </button>
                                        </div>
                                        {contractRoles.map((role) => (
                                            <div key={role.id} className="area-block" style={{ marginBottom: '10px' }}>
                                                <div className="area-block-header">
                                                    <span className="area-block-label">Cargo {role.id}</span>
                                                    {contractRoles.length > 1 && (
                                                        <button type="button" className="btn-remove-area" onClick={() => removeContractRole(role.id)}>✕ Quitar</button>
                                                    )}
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                                    <div className="form-group">
                                                        <label className="form-label required">Cargo / Rol</label>
                                                        <select className="form-input form-select" value={role.cargo} onChange={(e) => updateContractRole(role.id, 'cargo', e.target.value)}>
                                                            <option value="">-- Seleccionar cargo --</option>
                                                            {CONTRACT_ROLES.map(c => <option key={c} value={c}>{c}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="form-group">
                                                        <label className="form-label required">Horas Asignadas</label>
                                                        <input type="number" min="1" className="form-input" placeholder="Ej: 40" value={role.horas} onChange={(e) => updateContractRole(role.id, 'horas', e.target.value)} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <span className="field-error">{contractErrors.roles}</span>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Notas Adicionales <span className="label-optional">(opcional)</span></label>
                                        <textarea name="notes" className="form-input form-textarea" rows="3"></textarea>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={resetContractForm}>Cancelar</button>
                                    <button type="submit" className="btn-primary btn-submit" disabled={isSubmittingContract}>
                                        <span className="btn-label">{isSubmittingContract ? 'Guardando...' : 'Registrar Contrato'}</span>
                                        {isSubmittingContract && <span className="btn-spinner"></span>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="list-card">
                        <div className="list-header">
                            <h2 className="list-title">Contratos Registrados</h2>
                            <div className="search-box">
                                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                                <input type="search" className="search-input" placeholder="Buscar contrato..." value={contractSearchQuery} onChange={(e) => setContractSearchQuery(e.target.value)} />
                            </div>
                        </div>
                        <div>
                            {filteredContracts.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                    <p>{isLoading ? 'Cargando contratos...' : 'No hay contratos registrados aún.'}</p>
                                </div>
                            ) : (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        <thead>
                                            <tr><th>Nombre del Contrato</th><th>Cliente Vinculado</th><th>Tipo</th><th>Valor (COP)</th><th>Vigencia</th><th>Acciones</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredContracts.map((c, i) => (
                                                <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }} style={{ cursor: 'pointer' }} title="Haga clic para ver detalles">
                                                    <td className="td-wrap"><strong>{c?.name || ''}</strong></td>
                                                    <td>{c?.clientName || ''}</td>
                                                    <td><span className="type-chip">{c?.contractType || ''}</span></td>
                                                    <td><span className="card-value">{c?.valueFormatted || formatCurrencyDisplay(c?.value)}</span></td>
                                                    <td>{c?.startDate || ''} a {c?.endDate || ''}</td>
                                                    <td>
                                                        {canSee('billing') && <button type="button" className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); sendContractToBilling(c); }} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                                            Enviar a Facturar
                                                        </button>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Histórico de contratos */}
                    <div className="list-card" style={{ marginTop: '28px' }}>
                        <div className="list-header">
                            <h2 className="list-title">Histórico de Contratos</h2>
                        </div>
                        <div style={{ padding: '0 24px' }}>
                            <div className="history-filter-row">
                                <label>Desde</label>
                                <input type="date" value={contractDateFrom} onChange={e => setContractDateFrom(e.target.value)} />
                                <label>Hasta</label>
                                <input type="date" value={contractDateTo} onChange={e => setContractDateTo(e.target.value)} />
                                {(contractDateFrom || contractDateTo) && (
                                    <button className="history-filter-clear" onClick={() => { setContractDateFrom(''); setContractDateTo(''); }}>
                                        Limpiar filtro
                                    </button>
                                )}
                            </div>
                        </div>
                        <div>
                            {validContracts.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                    <p>Sin registros aún.</p>
                                </div>
                            ) : (
                                <div className="history-scroll-container">
                                    <table className="profile-table">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Contrato / Proyecto</th>
                                                <th>Cliente</th>
                                                <th>Solicitante</th>
                                                <th>Fecha de Solicitud</th>
                                                <th>Estado</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {[...validContracts]
                                                .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
                                                .filter(c => {
                                                    const d = c.createdAt?.slice(0, 10);
                                                    if (contractDateFrom && d < contractDateFrom) return false;
                                                    if (contractDateTo && d > contractDateTo) return false;
                                                    return true;
                                                })
                                                .map((c, i) => (
                                                    <tr key={i}>
                                                        <td style={{ color: 'var(--color-text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                                        <td className="td-wrap"><strong>{c?.name || '—'}</strong></td>
                                                        <td>{c?.clientName || '—'}</td>
                                                        <td>{c?.solicitante_nombre || '—'}</td>
                                                        <td style={{ whiteSpace: 'nowrap' }}>{formatDateSafe(c?.createdAt) || '—'}</td>
                                                        <td><span className={`status-badge ${c?.status === 'Validado' ? 'validated' : 'pending'}`}>{c?.status || '—'}</span></td>
                                                    </tr>
                                                ))
                                            }
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ========== SECTION: FACTURACIÓN ========== */}
                <section className={`content-section ${activeSection === 'billing' && canSee('billing') ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Facturación</h1>
                            <p className="section-subtitle">Solicitudes de facturación, notas crédito y servicios nuevos o actuales.</p>
                        </div>
                    </div>

                    {validContracts.length === 0 && !isLoading && (
                        <div className="alert-card alert-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <div><strong>No hay contratos registrados</strong><p>Debe tener al menos un contrato activo antes de registrar una facturación. {canSee('contracts') && <button className="link-btn" onClick={() => setActiveSection('contracts')}>Ir a Contratos →</button>}</p></div>
                        </div>
                    )}

                    <div id="billing-content" className={validContracts.length === 0 ? 'is-hidden' : ''}>
                        <div className="billing-step-card">
                            <h2 className="billing-step-title"><span className="step-pill">1</span> ¿Qué deseas solicitar?</h2>
                            <div className="radio-group radio-group-col">
                                <label className="radio-option"><input type="radio" value="facturacion" checked={billingReqType === 'facturacion'} onChange={(e) => setBillingReqType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Facturación</strong><small>Solicitud de factura por servicio nuevo o actual</small></span></label>
                                <label className="radio-option"><input type="radio" value="nota-credito" checked={billingReqType === 'nota-credito'} onChange={(e) => setBillingReqType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Nota Crédito</strong><small>Aplicar nota crédito a una factura existente</small></span></label>
                            </div>
                        </div>

                        {billingReqType === 'facturacion' ? (
                            <>
                                <div className="billing-step-card">
                                    <h2 className="billing-step-title"><span className="step-pill">2</span> Modalidad de Facturación</h2>
                                    <div className="radio-group radio-group-col">
                                        <label className="radio-option"><input type="radio" value="Proyecto" checked={billingModality === 'Proyecto'} onChange={(e) => setBillingModality(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Proyecto</strong><small>Factura única vez</small></span></label>
                                        <label className="radio-option"><input type="radio" value="Mensual" checked={billingModality === 'Mensual'} onChange={(e) => setBillingModality(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual</strong><small>Se incluye en la facturación mensual</small></span></label>
                                    </div>
                                    <span className="field-error">{billingErrors.billingModality}</span>
                                </div>

                                <div className="billing-step-card">
                                    <h2 className="billing-step-title"><span className="step-pill">3</span> Detalles de la Facturación</h2>
                                    <div className="form-grid">
                                        <div className="form-group">
                                            <label className="form-label required">Tipo de Facturación</label>
                                            <div className="radio-group radio-group-col">
                                                <label className="radio-option"><input type="radio" value="Servicio nuevo" checked={billingType === 'Servicio nuevo'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Servicio actual" checked={billingType === 'Servicio actual'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Actual</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Otro" checked={billingType === 'Otro'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Otro</strong></span></label>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label required">Tipo de Cliente</label>
                                            <div className="radio-group radio-group-col">
                                                <label className="radio-option"><input type="radio" value="Cliente nuevo" checked={billingClientType === 'Cliente nuevo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Cliente antiguo" checked={billingClientType === 'Cliente antiguo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Antiguo</strong></span></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-card">
                                    <div className="form-card-header"><h2 className="form-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="form-card-icon"><rect x="1" y="4" width="22" height="16" rx="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg> Solicitud de Facturación</h2><button type="button" className="btn-close" onClick={resetBillingForm}>✕</button></div>
                                    <form onSubmit={handleBillingSubmit} noValidate>
                                        <div className="form-grid">
                                            <div className="form-group full-width">
                                                <label className="form-label required">Nombre del Cliente / Razón Social</label>
                                                <input type="text" className="form-input" value={billingClientName} onChange={(e) => setBillingClientName(e.target.value)} />
                                                <span className="field-error">{billingErrors.billingClientName}</span>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">NIT / Documento</label>
                                                <input type="text" className="form-input" value={billingClientDocument} onChange={(e) => setBillingClientDocument(e.target.value)} />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Referencia</label>
                                                <input type="text" className="form-input" value={billingReference} readOnly placeholder="Se completa al elegir concepto" style={{ background: '#f5f9ff', cursor: 'default', color: billingReference ? 'var(--color-text)' : 'var(--color-text-light)' }} />
                                            </div>
                                            <div className="form-group full-width">
                                                <label className="form-label">Observaciones</label>
                                                <textarea className="form-input form-textarea" rows={2} value={billingObservations} onChange={(e) => setBillingObservations(e.target.value)} />
                                            </div>
                                            <div className="form-group full-width">
                                                <label className="form-label">Items</label>
                                                <div className="items-table">
                                                    {billingItems.map((it, idx) => (
                                                        <div key={idx} className="item-row" style={{display: 'grid', gridTemplateColumns: '2fr 120px 40px', gap: '8px', alignItems: 'center', marginBottom: '8px'}}>
                                                            <select
                                                                className="form-input form-select"
                                                                value={it.description}
                                                                onChange={(e) => {
                                                                    const selectedDesc = e.target.value;
                                                                    const selectedItem = BILLING_DESCRIPTIONS.find(d => d.name === selectedDesc);
                                                                    const arr = [...billingItems];
                                                                    arr[idx] = {
                                                                        ...arr[idx],
                                                                        description: selectedDesc,
                                                                        code: selectedItem?.code || ''
                                                                    };
                                                                    setBillingItems(arr);
                                                                }}
                                                            >
                                                                <option value="">Seleccione descripción...</option>
                                                                {BILLING_DESCRIPTIONS.map((desc) => (
                                                                    <option key={desc.code} value={desc.name}>{desc.name}</option>
                                                                ))}
                                                            </select>
                                                            <div className="input-currency-wrapper" style={{margin: 0}}>
                                                                <span className="currency-prefix">$</span>
                                                                <input
                                                                    type="text"
                                                                    className="form-input currency-input"
                                                                    placeholder="Valor"
                                                                    value={it.unitPrice}
                                                                    onChange={(e) => {
                                                                        const arr = [...billingItems];
                                                                        arr[idx] = { ...arr[idx], unitPrice: formatCurrency(e.target.value), quantity: '1' };
                                                                        setBillingItems(arr);
                                                                    }}
                                                                />
                                                            </div>
                                                            <button type="button" className="btn-ghost" onClick={() => { setBillingItems(billingItems.filter((_,i) => i !== idx)); }} aria-label="Eliminar">✕</button>
                                                        </div>
                                                    ))}
                                                    <div style={{marginTop:8}}>
                                                        <button type="button" className="btn-secondary" onClick={() => setBillingItems([...billingItems, { code: '', quantity: '1', unitPrice: '', description: '' }])}>Agregar ítem</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label required">Empresa Facturadora</label>
                                                <select className="form-input form-select" value={billingCompany} onChange={(e) => setBillingCompany(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="GCT">GCT</option>
                                                    <option value="GLT">GLT</option>
                                                </select>
                                                <span className="field-error">{billingErrors.billingCompany}</span>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label">Mes corriente o vencido</label>
                                                <select className="form-input form-select" value={billingMonthType} onChange={(e) => setBillingMonthType(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="MES CORRIENTE">MES CORRIENTE</option>
                                                    <option value="MES VENCIDO">MES VENCIDO</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label required">Tipo de Venta</label>
                                                <select className="form-input form-select" value={saleType} onChange={(e) => setSaleType(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Nueva venta">Nueva venta</option>
                                                    <option value="Cambio de área">Cambio de área</option>
                                                    <option value="Reintegro de cliente retirado">Reintegro de cliente retirado</option>
                                                    <option value="Venta cruzada">Venta cruzada</option>
                                                </select>
                                                <span className="field-error">{billingErrors.saleType}</span>
                                            </div>
                                            
                                            {saleType === 'Venta cruzada' && (
                                                <div className="form-group full-width">
                                                    <label className="form-label required">Persona que Generó la Venta Cruzada</label>
                                                    <input type="text" className="form-input" value={crossSalePerson} onChange={(e) => setCrossSalePerson(e.target.value)} />
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label required">Tipo de Servicio</label>
                                                <select className="form-input form-select" value={serviceType} onChange={(e) => setServiceType(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Fee mensual">Fee mensual</option>
                                                    <option value="Proyecto">Proyecto</option>
                                                    <option value="Otro">Otro</option>
                                                </select>
                                                <span className="field-error">{billingErrors.serviceType}</span>
                                            </div>
                                            
                                            {serviceType === 'Fee mensual' && (
                                                <div className="form-group">
                                                    <label className="form-label required">Valor Mes (antes de IVA)</label>
                                                    <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                        <input type="text" className="form-input currency-input" value={billingValorMes} onChange={(e) => handleCurrencyChange(e, setBillingValorMes)} />
                                                    </div>
                                                    <span className="field-error">{billingErrors.billingValorMes}</span>
                                                </div>
                                            )}
                                            {(serviceType === 'Proyecto' || serviceType === 'Otro') && (
                                                <div className="form-group">
                                                    <label className="form-label required">Valor Proyecto 100% (antes de IVA)</label>
                                                    <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                        <input type="text" className="form-input currency-input" value={billingValorProyecto} onChange={(e) => handleCurrencyChange(e, setBillingValorProyecto)} />
                                                    </div>
                                                    <span className="field-error">{billingErrors.billingValorProyecto}</span>
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label required">Origen del Cliente</label>
                                                <select className="form-input form-select" value={origin} onChange={(e) => setOrigin(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Cliente antiguo">Cliente antiguo</option>
                                                    <option value="Referido externo">Referido externo</option>
                                                    <option value="Referido empleado">Referido empleado</option>
                                                    <option value="Página">Página</option>
                                                    <option value="No aplica">No aplica</option>
                                                </select>
                                                <span className="field-error">{billingErrors.origin}</span>
                                            </div>

                                            {['Cliente antiguo', 'Referido externo', 'Referido empleado'].includes(origin) && (
                                                <div className="form-group">
                                                    <label className="form-label required">Nombre Referente / Cliente Antiguo</label>
                                                    <input type="text" className="form-input" value={originRef} onChange={(e) => setOriginRef(e.target.value)} />
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label">Identificación del Vendedor</label>
                                                <input type="text" inputMode="numeric" className="form-input" placeholder="Ej: 1234567890" value={billingSellerDocument} onChange={(e) => setBillingSellerDocument(e.target.value.replace(/\D/g, ''))} />
                                            </div>
                                            <div className="form-group full-width">
                                                <label className="form-label required">Persona Encargada del Cierre de Negocio</label>
                                                <input type="text" className="form-input" value={billingCloser} onChange={(e) => setBillingCloser(e.target.value)} />
                                                <span className="field-error">{billingErrors.billingCloser}</span>
                                            </div>
                                        </div>

                                        <div className="areas-section">
                                            <div className="areas-header">
                                                <h3 className="areas-title">Áreas de Facturación</h3>
                                                {billingAreas.length < 3 && (
                                                    <button type="button" className="btn-add-area" onClick={addAreaBlock}>
                                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="icon-sm"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg> Agregar Área
                                                    </button>
                                                )}
                                            </div>
                                            <div id="areas-container">
                                                {billingAreas.map((area, index) => (
                                                    <div className="area-block" key={area.id}>
                                                        <div className="area-block-header">
                                                            <span className="area-block-label">{area.id}° Área – Centro de Costos</span>
                                                            {index > 0 && <button type="button" className="btn-remove-area" onClick={() => removeAreaBlock(area.id)}>✕ Eliminar</button>}
                                                        </div>
                                                        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1.5fr 1fr', padding: 0 }}>
                                                            <div className="form-group">
                                                                <label className="form-label required">Centro</label>
                                                                <select className="form-input form-select" value={area.centro} onChange={(e) => updateArea(area.id, 'centro', e.target.value)}>
                                                                    <option value="">-- Seleccionar --</option>
                                                                    {Object.keys(BILLING_CENTERS).map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="form-group">
                                                                <label className="form-label required">Concepto</label>
                                                                <select className="form-input form-select" value={area.concepto} onChange={(e) => updateArea(area.id, 'concepto', e.target.value)} disabled={!area.centro}>
                                                                    <option value="">-- Seleccionar --</option>
                                                                    {(BILLING_CENTERS[area.centro] || []).map(c => <option key={c.code} value={c.label}>{c.label}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="form-group"><label className="form-label required">Valor</label><div className="input-currency-wrapper"><span className="currency-prefix">$</span><input type="text" className="form-input currency-input" value={area.valor} onChange={(e) => updateArea(area.id, 'valor', formatCurrency(e.target.value))} /></div></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button type="button" className="btn-secondary" onClick={resetBillingForm}>Cancelar</button>
                                            <button type="submit" className="btn-primary btn-submit" disabled={isSubmittingBilling}>
                                                <span className="btn-label">{isSubmittingBilling ? 'Enviando...' : 'Enviar Solicitud'}</span>
                                                {isSubmittingBilling && <span className="btn-spinner"></span>}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="form-card">
                                <div className="form-card-header">
                                    <h2 className="form-card-title"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="form-card-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="12" y1="17" x2="8" y2="17" /><line x1="12" y1="13" x2="8" y2="13" /></svg> Solicitud de Nota Crédito</h2>
                                    <button type="button" className="btn-close" onClick={resetBillingForm}>✕</button>
                                </div>
                                <form onSubmit={handleNotaCreditoSubmit} noValidate>
                                    <div className="form-grid">
                                        <div className="form-group full-width"><label className="form-label required">Nombre del Cliente / Razón Social</label><input type="text" name="ncClient" className="form-input" /><span className="field-error">{ncErrors.ncClient}</span></div>
                                        <div className="form-group"><label className="form-label required"># Factura a Aplicar Nota</label><input type="text" name="ncInvoice" className="form-input" /><span className="field-error">{ncErrors.ncInvoice}</span></div>
                                        <div className="form-group"><label className="form-label required">Valor a Aplicar</label><div className="input-currency-wrapper"><span className="currency-prefix">$</span><input type="text" name="ncValue" className="form-input currency-input" onInput={formatCurrencyInput} /></div><span className="field-error">{ncErrors.ncValue}</span></div>
                                        <div className="form-group full-width"><label className="form-label required">Motivo de la Nota Crédito</label><textarea name="ncReason" className="form-input form-textarea" rows="3"></textarea><span className="field-error">{ncErrors.ncReason}</span></div>
                                    </div>
                                    <div className="form-actions">
                                        <button type="button" className="btn-secondary" onClick={resetBillingForm}>Cancelar</button>
                                        <button type="submit" className="btn-primary btn-submit" disabled={isSubmittingBilling}>
                                            <span className="btn-label">{isSubmittingBilling ? 'Enviando...' : 'Enviar Nota Crédito'}</span>
                                            {isSubmittingBilling && <span className="btn-spinner"></span>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}
                    </div>
                </section>

                {/* ========== SECTION: AUDITORÍA ========== */}
                <section className={`content-section ${activeSection === 'auditor' && canSee('auditor') ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Panel de Control de Auditoría</h1>
                            <p className="section-subtitle">Visualice y valide los procesos de creación de clientes y contratos.</p>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="list-card">
                            <div className="list-header"><h2 className="list-title">Solicitudes de Clientes</h2></div>
                            <div>
                                {auditClients.length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes nuevas de clientes.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {auditClients.map((c, i) => {
                                            const isPending = c?.status !== 'Validado';
                                            return (
                                                <div key={i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }}>
                                                    <div className="auditor-card-header">
                                                        <div><h4 className="auditor-item-title">{c?.name || ''}</h4><p className="auditor-item-subtitle">NIT: {c?.document || ''}</p></div>
                                                        <span className={`status-badge ${isPending ? 'pending' : 'validated'}`}>{c?.status || 'Pendiente'}</span>
                                                    </div>
                                                    <div className="auditor-card-footer">
                                                        <span className="auditor-date">Creado: {formatDateSafe(c?.createdAt)}</span>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-validate"
                                                                type="button"
                                                                disabled={pendingValidationNit === String(c?.document || c?.Documento || '')}
                                                                onClick={(e) => { e.stopPropagation(); validateClientCreation(c); }}
                                                            >
                                                                {pendingValidationNit === String(c?.document || c?.Documento || '') ? 'Validando...' : 'Validar creación'}
                                                            </button>
                                                        ) : (
                                                            <span className="validated-info">Validado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="list-card">
                            <div className="list-header"><h2 className="list-title">Solicitudes de Contratos</h2></div>
                            <div>
                                {auditContracts.length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes de contratos.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {auditContracts.map((c, i) => {
                                            const isPending = c?.status !== 'Validado';
                                            const clientDoc = c?.clientDocument || c?.document || '';
                                            const requester = c?.solicitante_nombre || c?.requestedBy || '';
                                            const contractName = c?.name || c?.Nombre || '';
                                            const contractType = c?.contractType || c?.TipoContrato || '';
                                            const service = c?.service || c?.Servicio || '';
                                            const clientName = c?.clientName || c?.Cliente || '';

                                            return (
                                                <div key={i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }}>
                                                    <div className="auditor-card-header">
                                                        <div>
                                                            <h4 className="auditor-item-title">{contractName}</h4>
                                                            <p className="auditor-item-subtitle">
                                                                <strong>{clientName}</strong>
                                                                {clientDoc ? ` · NIT: ${clientDoc}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className={`status-badge ${isPending ? 'pending' : 'validated'}`}>{c?.status || 'Pendiente'}</span>
                                                    </div>
                                                    <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', fontSize: '13px', color: '#666' }}>
                                                        {contractType && <div><strong>Tipo:</strong> {contractType}</div>}
                                                        {service && <div><strong>Servicio:</strong> {service}</div>}
                                                    </div>
                                                    <div className="auditor-card-footer">
                                                        <span className="auditor-date">Creado: {formatDateSafe(c?.createdAt)}</span>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-validate"
                                                                type="button"
                                                                disabled={pendingValidationNit === String(clientDoc)}
                                                                onClick={(e) => { e.stopPropagation(); validateContractCreation(c); }}
                                                            >
                                                                {pendingValidationNit === String(clientDoc) ? 'Validando...' : 'Validar'}
                                                            </button>
                                                        ) : (
                                                            <span className="validated-info">Validado</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* ========== MODAL DETALLE AUDITORÍA ========== */}
            {auditorModalItem && (
                <div className="auditor-overlay" onClick={() => setAuditorModalItem(null)}>
                    <div className="auditor-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="auditor-detail-header">
                            <h3>{auditorModalType === 'client' ? 'Detalle del Cliente' : 'Detalle del Contrato'}</h3>
                            <button className="auditor-detail-close" onClick={() => setAuditorModalItem(null)}>✕</button>
                        </div>
                        <div className="auditor-detail-body">
                            {Object.entries(auditorModalItem).map(([key, value]) => {
                                if (value === undefined || value === null || value === '' || typeof value === 'object') return null;
                                return (
                                    <div className="detail-row" key={key}>
                                        <span className="detail-label">{getSpanishFieldLabel(key)}</span>
                                        <span className="detail-value">{key.includes('Date') || key.includes('At') ? formatDateSafe(value) : String(value)}</span>
                                    </div>
                                );
                            })}
                        </div>
                        <div className="auditor-detail-footer">
                            <button type="button" className="btn-secondary" onClick={() => setAuditorModalItem(null)}>Cerrar</button>
                            {auditorModalItem?.status !== 'Validado' && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={pendingValidationNit === String(auditorModalItem?.clientDocument || auditorModalItem?.document || '')}
                                    onClick={() => {
                                        if (auditorModalType === 'client') {
                                            validateClientCreation(auditorModalItem);
                                        } else {
                                            validateContractCreation(auditorModalItem);
                                        }
                                        setAuditorModalItem(null);
                                    }}
                                >
                                    {pendingValidationNit === String(auditorModalItem?.clientDocument || auditorModalItem?.document || '') ? 'Validando...' : 'Validar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ========== TOAST GLOBAL ========== */}
            <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
                {toast.type === 'success-discrete' ? (
                    <div className="toast-content" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ width: '14px', height: '14px', flexShrink: 0, color: '#fff' }}><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span className="toast-msg" style={{ fontSize: '12px', fontWeight: '600', color: '#fff', margin: 0 }}>{toast.message}</span>
                    </div>
                ) : (
                    <>
                        {toast.type === 'success' && <svg viewBox="0 0 24 24" fill="none" className="toast-icon success" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                        {toast.type === 'error' && <svg viewBox="0 0 24 24" fill="none" className="toast-icon error" stroke="currentColor" strokeWidth="2" style={{ width: '24px', height: '24px' }}><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                        <div className="toast-content">
                            <div className="toast-title" style={{ fontWeight: 'bold' }}>{toast.title}</div>
                            <div className="toast-msg">{toast.message}</div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}
