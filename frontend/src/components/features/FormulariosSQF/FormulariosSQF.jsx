import { useState, useEffect, useRef, useCallback } from 'react';
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

const CONTRACT_ROLES = [
    'Socio',
    'Gerente 1', 'Gerente 2', 'Gerente 3',
    'Senior 1', 'Senior 2', 'Senior 3',
    'Líder/Semi-Senior 1', 'Líder/Semi-Senior 2', 'Líder/Semi-Senior 3',
    'Analista/Asistente 1', 'Analista/Asistente 2', 'Analista/Asistente 3', 'Analista/Asistente 4',
];

const CENTROS_FACTURACION = {
    'REVISORIA FISCAL': {
        codigoCentro: '01 - 0101',
        productos: [
            { codigo: '500', concepto: 'RF- HONORARIOS REVISORÍA FISCAL' }
        ],
    },
    'AUDITORIA EXTERNA': {
        codigoCentro: '01 - 0102',
        productos: [
            { codigo: '600', concepto: 'AE- HONORARIOS AUDITORÍA EXTERNA' },
            { codigo: '601', concepto: 'AE- HONORARIOS AUDITORÍA FINANCIERA' },
            { codigo: '602', concepto: 'AE- DICTAMEN PERICIAL' }
        ],
    },
    'CONTABILIDAD': {
        codigoCentro: '02 - 0201',
        productos: [
            { codigo: '700', concepto: 'CONT- HONORARIOS CONTABILIDAD' },
            { codigo: '701', concepto: 'CONT- HONORARIOS REVISORÍA FISCAL' },
            { codigo: '702', concepto: 'CONT- OUTSOURCING CONTABLE Y TRIBUTARIO' },
            { codigo: '703', concepto: 'CONT- USO DE LICENCIA' },
            { codigo: '704', concepto: 'CONT- ELABORACION REPORTES FINANCIEROS ADICIONALES' },
            { codigo: '705', concepto: 'CONT- CONTABILIDAD ADMINISTRATIVA' },
            { codigo: '706', concepto: 'CONT- INHOUSE CONTABLE Y TRIBUTARIO' },
            { codigo: '707', concepto: 'CONT- HONORARIOS CONTABILIDAD HUDSON INVERSIONES' },
            { codigo: '708', concepto: 'CONT- HONORARIOS CONTABILIDAD INVERSIONES OREGON' },
            { codigo: '709', concepto: 'CONT- HONORARIOS CONTABILIDAD INVERSIONES PORTOVENTO' },
            { codigo: '710', concepto: 'CONT- HONORARIOS CONTABILIDAD INVERSIONES VESTA' },
            { codigo: '711', concepto: 'CONT- HONORARIOS CONTABILIDAD INVERSIONES RB' },
            { codigo: '712', concepto: 'CONT- ELABORACION DE DOCUMENTOS ELECTRONICOS Y FACTURAS DE VENTA ELECTRONICAS' },
            { codigo: '713', concepto: 'CONT- HONORARIOS MEDIOS MAGNETICOS' },
            { codigo: '714', concepto: 'CONT- HONORARIOS DECLARACIÓN RENTA' },
            { codigo: '715', concepto: 'CONT- SALDO A FAVOR EN IVA' },
            { codigo: '716', concepto: 'CONT- SALDO A FAVOR EN RENTA' },
            { codigo: '717', concepto: 'CONT- OUTSOURCING CONTABLE Y TRIBUTARIO PN' },
            { codigo: '718', concepto: 'CONT- HONORARIOS CONTABILIDAD PN' }
        ],
    },
    'BPO': {
        codigoCentro: '04 - 0202',
        productos: [
            { codigo: '800', concepto: 'BPO- ASESORÍA NÓMINA' },
            { codigo: '801', concepto: 'BPO- AFILIACIONES' },
            { codigo: '802', concepto: 'BPO- TESORERÍA Y FACTURACIÓN' },
            { codigo: '803', concepto: 'BPO- TESORERÍA' },
            { codigo: '804', concepto: 'BPO- ACEPTACIÓN DE FACTURAS' },
            { codigo: '805', concepto: 'BPO- HONORARIOS SG-SST.' }
        ],
    },
    'SERVICIOS LEGALES': {
        codigoCentro: '06 - 0601',
        productos: [
            { codigo: '900', concepto: 'LEG- ASESORÍA LEGAL' },
            { codigo: '901', concepto: 'LEG- OFICIAL DE CUMPLIMIENTO' },
            { codigo: '902', concepto: 'LEG- HONORARIOS REVISORÍA FISCAL' },
            { codigo: '903', concepto: 'LEG- SECRETARIA CORPORATIVA' },
            { codigo: '904', concepto: 'LEG- DOMICILIO FISCAL' },
            { codigo: '905', concepto: 'LEG- REPRESENTACIÓN LEGAL' }
        ],
    },
    'IMPUESTOS': {
        codigoCentro: '03 - 0301',
        productos: [
            { codigo: '1000', concepto: 'IMP- ASESORÍA TRIBUTRIA' },
            { codigo: '1001', concepto: 'IMP- HONORARIOS MEDIOS MAGNETICOS' },
            { codigo: '1002', concepto: 'IMP- HONORARIOS DECLARACIÓN RENTA' },
            { codigo: '1003', concepto: 'IMP- SALDO A FAVOR EN IVA' },
            { codigo: '1004', concepto: 'IMP- SALDO A FAVOR EN RENTA' },
            { codigo: '1005', concepto: 'IMP- PRECIOS DE TRANSFERENCIA' },
            { codigo: '1006', concepto: 'IMP- IMPUESTO AL PATRIMONIO' }
        ],
    },
    'CONSULTORIA FINANCIERA': {
        codigoCentro: '07 - 0701',
        productos: [
            { codigo: '1100', concepto: 'FIN- OUTSOURCING FINANCIERO' },
            { codigo: '1101', concepto: 'FIN- PRECIOS DE TRANSFERENCIA' },
            { codigo: '1102', concepto: 'FIN- DICTAMEN PERICIAL' }
        ],
    },
    'ADMON': {
        codigoCentro: '99 - 0901',
        productos: [
            { codigo: '1200', concepto: 'ADMON- HONORARIOS CONTABILIDAD' },
            { codigo: '1201', concepto: 'ADMON- COMISIÓN' }
        ],
    },
};

const GERENTES = [
    'David López Castaño',
    'Sara López Castaño',
    'Nelson Eduardo Giraldo',
    'Zulima López Arango',
    'Erica Maria Vergara',
    'Sandra Milena Pineda',
    'Esneider López Caicedo',
    'Karol viviana osorio Cuartas',
    'Juan Guillermo Castaño Jimenez',
    'Francy Milena Rico Areiza',
    'Norbey Granada Grajales',
    'Jose Felipe López Méndez',
    'Daniel Vélez Mesa',
    'Verónica Sánchez Fernández',
    'Paula Jimena Tejeiro Cardenas',
    'Manuel Alejandro Ramirez Carrasquilla',
    'Mayra Alejandra Jaramillo Velásquez',
    'Raúl Bernando Acosta Zapata',
];

const SERVICE_TYPES = [
    { code: '0101', label: 'FEE MENSUAL',        seller: '1152469759' },
    { code: '0202', label: 'PROYECTO',            seller: '1037671038' },
    { code: '0303', label: 'FEE MENSUAL CRUZADO', seller: '1000920646' },
    { code: '0404', label: 'PROYECTO CRUZADO',    seller: '1000633655' },
];

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
    const [pendingValidationId, setPendingValidationId] = useState(null);
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

    const [billingReqType, setBillingReqType] = useState('');
    const [billingModality, setBillingModality] = useState('');
    const [billingType, setBillingType] = useState('');
    const [billingClientType, setBillingClientType] = useState('');
    const [billingClientName, setBillingClientName] = useState('');
    const [billingCompany, setBillingCompany] = useState('');
    const [billingClientDocument, setBillingClientDocument] = useState('');
    const [billingObservations, setBillingObservations] = useState('');
    const [saleType, setSaleType] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [billingValorMes, setBillingValorMes] = useState('');
    const [billingMonthType, setBillingMonthType] = useState('');
    const [billingSellerDocument, setBillingSellerDocument] = useState('');
    const [origin, setOrigin] = useState('');
    const [originRef, setOriginRef] = useState('');
    const [billingCloser, setBillingCloser] = useState('');
    const [billingAreas, setBillingAreas] = useState([{ id: 1, centro: '', concepto: '', valor: '', codigoCentro: '', codigoProducto: '' }]);
    const [contractRoles, setContractRoles] = useState([{ id: 1, cargo: '', horas: '' }]);
    const [crossSalePersonName, setCrossSalePersonName] = useState('');

    const isCrossSale = saleType === 'Venta cruzada' || ['0303', '0404'].includes(serviceType);
    const billingAreasTotal = billingAreas.reduce((sum, a) => sum + (parseInt(String(a.valor).replace(/\D/g, '') || '0', 10)), 0);
    const isBillingStep2Complete = Boolean(billingType && billingClientType);
    const isBillingStep3Complete = Boolean(billingModality);

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

    useEffect(() => {
        if (!isCrossSale) {
            setCrossSalePersonName('');
        }
    }, [isCrossSale]);

    useEffect(() => {
        if (saleType === 'Venta cruzada' && !['0303', '0404'].includes(serviceType)) {
            setServiceType('');
            setBillingSellerDocument('');
        }
    }, [saleType]); // eslint-disable-line react-hooks/exhaustive-deps

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
                    documentDv: c.documentDv || c.DV || c.Dv || c.DigitoVerificacion || '',
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

    const formatDateOnly = (isoStr) => {
        if (!isoStr) return '';
        const d = new Date(`${isoStr}T00:00:00`);
        return isNaN(d) ? String(isoStr) : d.toLocaleDateString('es-CO');
    };

    const getVigenciaStatus = (endDate) => {
        if (!endDate) return { label: 'Indefinida', className: 'indefinida' };
        const end = new Date(`${endDate}T00:00:00`);
        if (isNaN(end)) return { label: 'Indefinida', className: 'indefinida' };
        const diffDays = Math.ceil((end - new Date()) / 86400000);
        if (diffDays < 0) return { label: 'Vencido', className: 'vencido' };
        if (diffDays <= 30) return { label: 'Por vencer', className: 'por-vencer' };
        return { label: 'Vigente', className: 'vigente' };
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

        const reqFields = ['clientType', 'document', 'name', 'contactName', 'contactRole', 'economicGroup', 'email', 'phone', 'address'];
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
    
    // Primero evaluamos el estado HTTP
    if (res.status === 409) {
        // Extraemos explícitamente el JSON que envió n8n
        const data = await res.json();
        
        // Ahora sí podemos leer el estado interno desde el 'data' extraído
        if (data.internal_status === 'pending_validation') {
            showToastMsg('error', 'Cliente ya registrado', 'El cliente ya se encuentra registrado, pero actualmente está pendiente de validación.');
        } else {
            showToastMsg('error', 'Cliente Duplicado', 'El cliente ya se encuentra registrado.');
        }
    }
    else if (!res.ok) {
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
    const formatNitDv = (client) => {
        const doc = client?.document || '';
        const dv = client?.documentDv || '';
        return dv ? `${doc}-${dv}` : doc;
    };

    const normalizeForSearch = (str) => String(str || '')
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

    const levenshteinDistance = (a, b) => {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const row = Array.from({ length: n + 1 }, (_, j) => j);
        for (let i = 1; i <= m; i++) {
            let prevDiag = row[0];
            row[0] = i;
            for (let j = 1; j <= n; j++) {
                const temp = row[j];
                row[j] = a[i - 1] === b[j - 1] ? prevDiag : 1 + Math.min(prevDiag, row[j], row[j - 1]);
                prevDiag = temp;
            }
        }
        return row[n];
    };

    const wordSimilarity = (a, b) => {
        const maxLen = Math.max(a.length, b.length);
        return maxLen ? 1 - (levenshteinDistance(a, b) / maxLen) : 0;
    };

    const scoreClientNameMatch = (query, client) => {
        const name = normalizeForSearch(client?.name);
        if (!name) return 0;
        if (name === query) return 100;
        if (name.startsWith(query)) return 85;
        if (name.includes(query)) return 65;

        const queryWords = query.split(' ').filter(Boolean);
        const nameWords = name.split(' ').filter(Boolean);
        if (queryWords.length === 0 || nameWords.length === 0) return 0;

        // Mejor coincidencia por palabra (exacta, prefijo, substring o similitud tipo-tolerante),
        // en vez de comparar la consulta contra el nombre completo: así una errata en una sola
        // palabra no se diluye entre el resto de palabras del nombre (p. ej. razones sociales largas).
        const perWordScores = queryWords.map((qw) => {
            let best = 0;
            nameWords.forEach((nw) => {
                if (nw === qw) best = Math.max(best, 1);
                else if (nw.startsWith(qw) || nw.includes(qw)) best = Math.max(best, 0.85);
                else best = Math.max(best, wordSimilarity(qw, nw));
            });
            return best;
        });

        const avgScore = perWordScores.reduce((sum, s) => sum + s, 0) / perWordScores.length;
        return avgScore >= 0.5 ? avgScore * 60 : 0;
    };

    const findBestClientMatches = (rawQuery, clients) => {
        const cleanDoc = String(rawQuery).replace(/\D/g, '');
        if (cleanDoc.length >= 5) {
            const exactDoc = clients.find((c) => {
                const doc = String(c?.document || '').replace(/\D/g, '');
                return doc && (doc === cleanDoc || cleanDoc.startsWith(doc));
            });
            if (exactDoc) return [{ client: exactDoc, score: 100 }];
        }
        const query = normalizeForSearch(rawQuery);
        if (!query) return [];
        return clients
            .map(client => ({ client, score: scoreClientNameMatch(query, client) }))
            .filter(m => m.score >= 30)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);
    };

    const triggerLookup = () => {
        if (!String(nitLookupValue).trim()) {
            setNitLookupResult({ type: 'empty' });
            return;
        }
        const matches = findBestClientMatches(nitLookupValue, validClients);
        if (matches.length === 0) {
            setNitLookupResult({ type: 'error' });
            return;
        }
        const isConfident = matches.length === 1 || (matches[0].score - (matches[1]?.score || 0) >= 25 && matches[0].score >= 65);
        if (isConfident) {
            setNitLookupResult({ type: 'found', client: matches[0].client });
        } else {
            setNitLookupResult({ type: 'multiple', matches: matches.map(m => m.client) });
        }
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
        const reqFields = ['contractType', 'economicGroup', 'name', 'value', 'manager', 'service'];
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
        setBillingAreas([...billingAreas, { id: billingAreas.length + 1, centro: '', concepto: '', valor: '', codigoCentro: '', codigoProducto: '' }]);
    };

    const removeAreaBlock = (idToRemove) => {
        const newAreas = billingAreas.filter(area => area.id !== idToRemove).map((area, index) => ({ ...area, id: index + 1 }));
        setBillingAreas(newAreas);
    };

    const updateArea = (id, field, value) => {
        setBillingAreas(prev => prev.map(area => {
            if (area.id !== id) return area;
            if (field === 'centro') {
                return { ...area, centro: value, concepto: '', valor: value ? '0' : '', codigoCentro: CENTROS_FACTURACION[value]?.codigoCentro || '', codigoProducto: '' };
            }
            if (field === 'concepto') {
                const found = (CENTROS_FACTURACION[area.centro]?.productos || []).find(p => p.concepto === value);
                return { ...area, concepto: value, codigoProducto: found?.codigo || '' };
            }
            return { ...area, [field]: value };
        }));
    };

    const handleServiceTypeChange = (value) => {
        setServiceType(value);
        const found = SERVICE_TYPES.find(s => s.code === value);
        setBillingSellerDocument(found ? found.seller : '');
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
        setBillingReqType(''); setBillingModality(''); setBillingType(''); setBillingClientType('');
        setBillingClientName(''); setBillingCompany(''); setSaleType('');
        setBillingClientDocument(''); setBillingObservations('');
        setServiceType(''); setBillingValorMes('');
        setOrigin(''); setOriginRef(''); setBillingCloser(''); setBillingMonthType(''); setBillingSellerDocument('');
        setCrossSalePersonName('');
        setBillingAreas([{ id: 1, centro: '', concepto: '', valor: '', codigoCentro: '', codigoProducto: '' }]);
        setBillingErrors({}); setNcErrors({});
    };

    const sendContractToBilling = (contract) => {
        setActiveSection('billing');
        setBillingReqType('');

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

        setServiceType('');
        setBillingSellerDocument('');
        setBillingValorMes('');

        setBillingCloser(contract?.manager || '');
        setBillingAreas([{ id: 1, centro: '', concepto: '', valor: '', codigoCentro: '', codigoProducto: '' }]);
        setBillingMonthType('');

        showToastMsg('success-discrete', '', `Contrato "${contract?.name || ''}" cargado para facturar.`);
    };

    const handleBillingSubmit = async (e) => {
        e.preventDefault();
        setBillingErrors({});
        let errors = {};
        let isValid = true;
        const failRequired = (key) => { errors[key] = 'Requerido'; isValid = false; };

        if (!billingModality) failRequired('billingModality');
        if (!billingType) failRequired('billingType');
        if (!billingClientType) failRequired('billingClientType');
        if (!billingClientName.trim()) failRequired('billingClientName');
        if (!billingCompany) failRequired('billingCompany');
        if (!saleType) failRequired('saleType');
        if (!serviceType) failRequired('serviceType');
        if (isCrossSale && !crossSalePersonName.trim()) failRequired('crossSalePersonName');
        if (['0101', '0303'].includes(serviceType) && !billingValorMes.trim()) failRequired('billingValorMes');
        if (!origin) failRequired('origin');
        if (['Referido externo', 'Referido empleado'].includes(origin) && !originRef.trim()) { showToastMsg('error', 'Campo Faltante', 'Especifique el nombre del referente.'); isValid = false; }
        if (!billingMonthType) failRequired('billingMonthType');
        if (!billingSellerDocument.trim()) failRequired('billingSellerDocument');
        if (!billingCloser.trim()) failRequired('billingCloser');

        billingAreas.forEach(area => {
            const valorNumerico = parseInt(String(area.valor).replace(/\D/g, '') || '0', 10);
            if (!area.centro.trim() || !area.concepto.trim() || !area.valor.trim() || valorNumerico <= 0) {
                showToastMsg('error', 'Campo Faltante', `Falta ingresar el valor del área ${area.id}.`);
                isValid = false;
            }
        });

        if (!isValid) { setBillingErrors(errors); return; }

        setIsSubmittingBilling(true);
        const autoDueDate = calculateBusinessDaysDate(new Date().toISOString().split('T')[0], 3);

        const payload = {
            id: generateId('BIL'), tipoSolicitud: 'Facturación', billingType, billingClientType,
            billingModality, modalidad_facturacion: billingModality,
            clientName: billingClientName.toUpperCase(),
            company: billingCompany,
            saleType,
            crossSalePerson: isCrossSale ? crossSalePersonName.toUpperCase() : '',
            serviceType,
            valorMes: parseInt(String(billingValorMes).replace(/\D/g, '') || '0', 10),
            clientDocument: billingClientDocument || '',
            nit: billingClientDocument || '',
            documento: billingClientDocument || '',
            dueDate: autoDueDate,
            fecha_vencimiento: autoDueDate,
            fechaVencimiento: autoDueDate,
            observations: billingObservations || '',
            observaciones: billingObservations || '',
            origin, originRef: ['Referido externo', 'Referido empleado'].includes(origin) ? originRef.toUpperCase() : '',
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
            datatableForm.append('origin', payload.origin);
            datatableForm.append('origin_ref', payload.originRef);
            datatableForm.append('closer', payload.closer);
            datatableForm.append('mes_tipo', payload.mes_tipo);
            datatableForm.append('mes_corriente_o_vencido', payload.mesCorrienteOVencido);
            datatableForm.append('identificacion_vendedor', payload.identificacion_vendedor);
            datatableForm.append('areas', payload.areas);
            datatableForm.append('nit', payload.nit);
            datatableForm.append('documento', payload.documento);
            datatableForm.append('client_document', payload.clientDocument);
            datatableForm.append('due_date', payload.dueDate);
            datatableForm.append('fecha_vencimiento', payload.fecha_vencimiento);
            datatableForm.append('observations', payload.observations);
            datatableForm.append('observaciones', payload.observaciones);
            datatableForm.append('fechaVencimiento', payload.fechaVencimiento);
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
            datatableForm.append('billing_categoria', '');
            datatableForm.append('billing_concepto', '');
            datatableForm.append('billing_codigo_concepto', '');
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

    const validateClientCreation = async (clientItem) => {
        const nombre = String(clientItem?.name || clientItem?.Nombre || '').trim();
        const nit = String(clientItem?.document || clientItem?.Documento || '').trim();

        if (!nombre || !nit) {
            showToastMsg('error', 'Datos incompletos', 'No se encontró el NIT y/o el nombre para validar la creación.');
            return;
        }

        const loggedUserMeta = getLoggedUserMeta();
        setPendingValidationId(clientItem?.id);
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

            // Se filtra por id (no por NIT): dos solicitudes pendientes pueden compartir
            // el mismo NIT o venir sin NIT, y filtrar por ese valor borraba de la lista
            // local cualquier otra solicitud que calzara, no solo la que se validó.
            setPendingClients((prev) => prev.filter((p) => p?.id !== clientItem?.id));
            await refreshPendings();
        } catch (e) {
            showToastMsg('error', 'Error de Conexión', e?.message || 'No se pudo validar la creación.');
        } finally {
            setPendingValidationId(null);
        }
    };

    const validateContractCreation = async (contractItem) => {
        const nombre = String(contractItem?.clientName || contractItem?.name || contractItem?.Nombre || '').trim();
        const nit = String(contractItem?.clientDocument || contractItem?.document || contractItem?.Documento || '').trim();

        if (!nombre || !nit) {
            showToastMsg('error', 'Datos incompletos', 'No se encontró el NIT del cliente para validar el contrato. Verifique el cliente asociado antes de validar.');
            return;
        }

        const loggedUserMeta = getLoggedUserMeta();
        setPendingValidationId(contractItem?.id);
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
            // Se filtra por id, no por NIT: varios contratos pendientes pueden compartir
            // el NIT del mismo cliente, o venir sin NIT, y antes eso hacía que "Validar"
            // hiciera desaparecer de la lista TODOS los que calzaran, no solo el elegido.
            setPendingContracts((prev) => prev.filter((p) => p?.id !== contractItem?.id));
            await refreshPendings();
        } catch (e) {
            showToastMsg('error', 'Error de Conexión', e?.message || 'No se pudo validar el contrato.');
        } finally {
            setPendingValidationId(null);
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

    const FIELD_ICON_CATEGORY = {
        id: 'tag', clientType: 'tag', contractType: 'tag', solicitante_id: 'tag',
        document: 'idcard', clientDocument: 'idcard',
        contactName: 'user', manager: 'user', solicitante_nombre: 'user',
        contactRole: 'briefcase', service: 'briefcase', roles: 'briefcase',
        economicGroup: 'layers', source: 'layers',
        email: 'mail', solicitante_correo: 'mail',
        phone: 'phone',
        address: 'pin',
        page: 'globe',
        value: 'dollar', valueFormatted: 'dollar',
        startDate: 'calendar', endDate: 'calendar', createdAt: 'calendar', updatedAt: 'calendar',
        notes: 'notes',
    };

    const renderFieldIcon = (key) => {
        const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2' };
        switch (FIELD_ICON_CATEGORY[key] || 'info') {
            case 'tag':
                return <svg {...common}><path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2.59 12.58a2 2 0 0 1 0-2.83l7.17-7.17a2 2 0 0 1 2.83 0l8 8a2 2 0 0 1 0 2.83z" /><circle cx="7.5" cy="7.5" r="1.5" /></svg>;
            case 'idcard':
                return <svg {...common}><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="6" y1="9" x2="10" y2="9" /><line x1="6" y1="13" x2="14" y2="13" /><line x1="15" y1="9" x2="18" y2="9" /></svg>;
            case 'user':
                return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
            case 'briefcase':
                return <svg {...common}><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" /></svg>;
            case 'layers':
                return <svg {...common}><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
            case 'mail':
                return <svg {...common}><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 6-10 7L2 6" /></svg>;
            case 'phone':
                return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
            case 'pin':
                return <svg {...common}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
            case 'globe':
                return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>;
            case 'dollar':
                return <svg {...common}><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>;
            case 'calendar':
                return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
            case 'notes':
                return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
            default:
                return <svg {...common}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
        }
    };

    const getInitials = (fullName) => {
        const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
        if (parts.length === 0) return '?';
        return (parts[0][0] + (parts[1]?.[0] || '')).toUpperCase();
    };

    const renderStepPill = (number, isComplete) => (
        <span className={`step-pill ${isComplete ? 'complete' : ''}`}>
            {isComplete ? '✓' : number}
        </span>
    );

    const renderSkeletonRows = (columnCount, rows = 4) => (
        Array.from({ length: rows }).map((_, i) => (
            <tr key={`skeleton-${i}`}>
                {Array.from({ length: columnCount }).map((__, j) => (
                    <td key={j}><div className="loading-skeleton skeleton-bar" style={{ width: `${60 + ((i + j) % 3) * 12}%` }}></div></td>
                ))}
            </tr>
        ))
    );

    const renderColGroup = (widths) => (
        <colgroup>
            {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
        </colgroup>
    );

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
                                            <label className="radio-option"><input type="radio" name="clientType" value="natural" /><span className="radio-custom"></span><span className="radio-text"><strong>Persona Natural</strong><small>Cédula de ciudadanía</small></span></label>
                                            <label className="radio-option"><input type="radio" name="clientType" value="juridica" /><span className="radio-custom"></span><span className="radio-text"><strong>Persona Jurídica</strong><small>NIT de empresa</small></span></label>
                                        </div>
                                        <span className="field-error">{clientErrors.clientType}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">NIT Empresa / Documento</label>
                                        <div className="doc-dv-grid">
                                            <input type="text" name="document" className="form-input" placeholder="Ej: 900.123.456" />
                                            <input type="text" name="documentDv" className="form-input" placeholder="DV" maxLength="1" inputMode="numeric" />
                                        </div>
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
                            {isLoading ? (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        {renderColGroup(['32%', '16%', '34%', '18%'])}
                                        <thead>
                                            <tr><th>Cliente / Razón Social</th><th>NIT / Documento</th><th>Correo Electrónico</th><th>Teléfono</th></tr>
                                        </thead>
                                        <tbody>{renderSkeletonRows(4)}</tbody>
                                    </table>
                                </div>
                            ) : filteredClients.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                                    <p>No hay clientes registrados.</p>
                                </div>
                            ) : (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        {renderColGroup(['32%', '16%', '34%', '18%'])}
                                        <thead>
                                            <tr><th>Cliente / Razón Social</th><th>NIT / Documento</th><th>Correo Electrónico</th><th>Teléfono</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredClients.map((c, i) => (
                                                <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }} style={{ cursor: 'pointer' }} title="Haga clic para ver detalles">
                                                    <td className="td-wrap">
                                                        <div className="table-identity">
                                                            <span className="table-avatar">{getInitials(c?.name)}</span>
                                                            <span><strong>{c?.name || ''}</strong> {c?.source === 'historico' && <span className="type-chip historico" title="Cliente Histórico">H</span>}</span>
                                                        </div>
                                                    </td>
                                                    <td className="td-truncate" title={c?.document || ''}>{c?.document || ''}</td>
                                                    <td className="td-truncate" title={c?.email || ''}>{c?.email || ''}</td>
                                                    <td className="td-truncate" title={c?.phone || ''}>{c?.phone || ''}</td>
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
                                        {renderColGroup(['6%', '30%', '26%', '20%', '18%'])}
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
                                                        <td className="td-muted">{i + 1}</td>
                                                        <td className="td-wrap"><strong>{c?.name || '—'}</strong></td>
                                                        <td className="td-truncate" title={c?.solicitante_nombre || ''}>{c?.solicitante_nombre || '—'}</td>
                                                        <td className="td-nowrap">{formatDateSafe(c?.createdAt) || '—'}</td>
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
                                    <p className="nit-modal-desc">Para generar un contrato, es obligatorio verificar primero la existencia del cliente asociado. Puede buscar por NIT o por nombre.</p>
                                    <div className="lookup-input-row nit-modal-input-row">
                                        <div className="lookup-input-wrapper">
                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="lookup-input-icon"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></svg>
                                            <input type="text" className="form-input lookup-input" placeholder="Ingrese NIT o nombre del cliente..." value={nitLookupValue} onChange={(e) => { setNitLookupValue(e.target.value); setNitLookupResult(null); }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); triggerLookup(); } }} />
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
                                        </div>
                                    )}
                                    {nitLookupResult?.type === 'multiple' && (
                                        <div className="lookup-result multiple">
                                            <strong>Varias coincidencias, seleccione el cliente correcto:</strong>
                                            <div className="lookup-match-list">
                                                {nitLookupResult.matches.map((c) => (
                                                    <button type="button" key={c.id} className="lookup-match-item" onClick={() => startContractForClient(c)}>
                                                        <span className="table-avatar">{getInitials(c?.name)}</span>
                                                        <span className="lookup-match-info">
                                                            <strong>{c?.name || ''}</strong>
                                                            <small>NIT: {formatNitDv(c)}</small>
                                                        </span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {nitLookupResult?.type === 'error' && (
                                        <div className="lookup-result error">
                                            <strong>✖ Cliente No Encontrado</strong><p style={{ marginTop: '5px', fontSize: '14px' }}>Registre el cliente primero en el menú superior de Clientes.</p>
                                        </div>
                                    )}
                                    {nitLookupResult?.type === 'empty' && (
                                        <div className="lookup-result error">
                                            <strong>✖ Ingrese un NIT o nombre válido.</strong>
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
                                            <label className="radio-option"><input type="radio" name="contractType" value="Mensual" /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual</strong><small>Facturación recurrente mensual fija</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Proyecto" /><span className="radio-custom"></span><span className="radio-text"><strong>Proyecto</strong><small>Alcance y entregables definidos</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Horas trabajadas" /><span className="radio-custom"></span><span className="radio-text"><strong>Horas Trabajadas</strong><small>Facturación por horas consumidas</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Mensual + horas" /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual + Horas</strong><small>Base fija más horas adicionales</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Horas trabajadas por cargo" /><span className="radio-custom"></span><span className="radio-text"><strong>Horas por Cargo</strong><small>Horas diferenciadas por tipo de cargo</small></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Cantidad vs Precio unitario" /><span className="radio-custom"></span><span className="radio-text"><strong>Cantidad vs. Precio Unitario</strong><small>Cantidad de unidades por precio</small></span></label>
                                        </div>
                                        <span className="field-error">{contractErrors.contractType}</span>
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
                                                                    <div style={{ fontSize: '0.8rem', color: '#666' }}>NIT: {formatNitDv(c)}</div>
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
                                                <span>{selectedClientForContract?.name} (NIT: {formatNitDv(selectedClientForContract)})</span>
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
                                        <label className="form-label required">Gerente a Cargo</label>
                                        <select name="manager" className="form-input form-select" defaultValue="">
                                          <option value="">-- Seleccionar gerente --</option>
                                          {GERENTES.map((g) => <option key={g} value={g}>{g}</option>)}
                                        </select>
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
                                                <div className="role-fields-grid">
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
                            {isLoading ? (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        {renderColGroup(['22%', '18%', '12%', '14%', '18%', '16%'])}
                                        <thead>
                                            <tr><th>Nombre del Contrato</th><th>Cliente Vinculado</th><th>Tipo</th><th>Valor (COP)</th><th>Vigencia</th><th>Acciones</th></tr>
                                        </thead>
                                        <tbody>{renderSkeletonRows(6)}</tbody>
                                    </table>
                                </div>
                            ) : filteredContracts.length === 0 ? (
                                <div className="empty-state">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" className="empty-icon"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
                                    <p>No hay contratos registrados aún.</p>
                                </div>
                            ) : (
                                <div className="profile-scroll history-scroll-container">
                                    <table className="profile-table">
                                        {renderColGroup(['22%', '18%', '12%', '14%', '18%', '16%'])}
                                        <thead>
                                            <tr><th>Nombre del Contrato</th><th>Cliente Vinculado</th><th>Tipo</th><th>Valor (COP)</th><th>Vigencia</th><th>Acciones</th></tr>
                                        </thead>
                                        <tbody>
                                            {filteredContracts.map((c, i) => (
                                                <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }} style={{ cursor: 'pointer' }} title="Haga clic para ver detalles">
                                                    <td className="td-wrap"><strong>{c?.name || ''}</strong></td>
                                                    <td className="td-truncate" title={c?.clientName || ''}>{c?.clientName || ''}</td>
                                                    <td><span className="type-chip">{c?.contractType || ''}</span></td>
                                                    <td><span className="card-value">{c?.valueFormatted || formatCurrencyDisplay(c?.value)}</span></td>
                                                    <td className="td-nowrap">
                                                        {c?.startDate ? (
                                                            <div className="vigencia-cell">
                                                                <span className="vigencia-range">
                                                                    <span>{formatDateOnly(c.startDate)}</span>
                                                                    <span className="vigencia-sep">–</span>
                                                                    <span>{c?.endDate ? formatDateOnly(c.endDate) : 'Indefinida'}</span>
                                                                </span>
                                                                <span className={`status-badge ${getVigenciaStatus(c?.endDate).className}`}>{getVigenciaStatus(c?.endDate).label}</span>
                                                            </div>
                                                        ) : '—'}
                                                    </td>
                                                    <td>
                                                        {canSee('billing') && <button type="button" className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); sendContractToBilling(c); }}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="btn-icon"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
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
                                        {renderColGroup(['5%', '22%', '20%', '20%', '18%', '15%'])}
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
                                                        <td className="td-muted">{i + 1}</td>
                                                        <td className="td-wrap"><strong>{c?.name || '—'}</strong></td>
                                                        <td className="td-truncate" title={c?.clientName || ''}>{c?.clientName || '—'}</td>
                                                        <td className="td-truncate" title={c?.solicitante_nombre || ''}>{c?.solicitante_nombre || '—'}</td>
                                                        <td className="td-nowrap">{formatDateSafe(c?.createdAt) || '—'}</td>
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
                            <h2 className="billing-step-title">{renderStepPill(1, Boolean(billingReqType))} ¿Qué deseas solicitar?</h2>
                            <div className="radio-group radio-group-col">
                                <label className="radio-option"><input type="radio" value="facturacion" checked={billingReqType === 'facturacion'} onChange={(e) => setBillingReqType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Facturación</strong><small>Solicitud de factura por servicio nuevo o actual</small></span></label>
                                <label className="radio-option"><input type="radio" value="nota-credito" checked={billingReqType === 'nota-credito'} onChange={(e) => setBillingReqType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Nota Crédito</strong><small>Aplicar nota crédito a una factura existente</small></span></label>
                            </div>
                        </div>

                        {billingReqType === 'facturacion' ? (
                            <>
                                <div className={`billing-step-card ${!isBillingStep2Complete ? 'current' : ''}`}>
                                    <h2 className="billing-step-title">{renderStepPill(2, isBillingStep2Complete)} Detalles de la Facturación</h2>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label className="form-label required">Tipo de Facturación</label>
                                            <div className="radio-group radio-group-col">
                                                <label className="radio-option"><input type="radio" value="Servicio nuevo" checked={billingType === 'Servicio nuevo'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Servicio actual" checked={billingType === 'Servicio actual'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Actual</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Otro" checked={billingType === 'Otro'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Otro</strong></span></label>
                                            </div>
                                            <span className="field-error">{billingErrors.billingType}</span>
                                        </div>
                                        <div className="form-group full-width">
                                            <label className="form-label required">Tipo de Cliente</label>
                                            <div className="radio-group radio-group-col">
                                                <label className="radio-option"><input type="radio" value="Cliente nuevo" checked={billingClientType === 'Cliente nuevo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" value="Cliente antiguo" checked={billingClientType === 'Cliente antiguo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Antiguo</strong></span></label>
                                            </div>
                                            <span className="field-error">{billingErrors.billingClientType}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`billing-step-card ${isBillingStep2Complete && !isBillingStep3Complete ? 'current' : ''}`}>
                                    <h2 className="billing-step-title">{renderStepPill(3, isBillingStep3Complete)} Modalidad de Facturación</h2>
                                    <div className="radio-group radio-group-col">
                                        <label className="radio-option"><input type="radio" value="Proyecto" checked={billingModality === 'Proyecto'} onChange={(e) => setBillingModality(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Proyecto</strong><small>Factura única vez</small></span></label>
                                        <label className="radio-option"><input type="radio" value="Mensual" checked={billingModality === 'Mensual'} onChange={(e) => setBillingModality(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual</strong><small>Se incluye en la facturación mensual</small></span></label>
                                    </div>
                                    <span className="field-error">{billingErrors.billingModality}</span>
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
                                            <div className="form-group full-width">
                                                <label className="form-label">Observaciones</label>
                                                <textarea className="form-input form-textarea" rows={2} value={billingObservations} onChange={(e) => setBillingObservations(e.target.value)} />
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
                                                <label className="form-label required">Mes corriente o vencido</label>
                                                <select className="form-input form-select" value={billingMonthType} onChange={(e) => setBillingMonthType(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="MES CORRIENTE">MES CORRIENTE</option>
                                                    <option value="MES VENCIDO">MES VENCIDO</option>
                                                </select>
                                                <span className="field-error">{billingErrors.billingMonthType}</span>
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

                                            {isCrossSale && (
                                                <>
                                                    <div className="form-group">
                                                        <label className="form-label required">Persona que generó la venta cruzada</label>
                                                        <input
                                                            type="text"
                                                            className="form-input"
                                                            value={crossSalePersonName}
                                                            onChange={(e) => setCrossSalePersonName(e.target.value)}
                                                        />
                                                        <span className="field-error">{billingErrors.crossSalePersonName}</span>
                                                    </div>
                                                </>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label required">Tipo de Servicio</label>
                                                <select className="form-input form-select" value={serviceType} onChange={(e) => handleServiceTypeChange(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    {(saleType === 'Venta cruzada'
                                                        ? SERVICE_TYPES.filter(s => ['0303', '0404'].includes(String(s.code)))
                                                        : SERVICE_TYPES
                                                    ).map(s => (
                                                        <option key={s.code} value={s.code}>{s.code} {s.label}</option>
                                                    ))}
                                                    {saleType !== 'Venta cruzada' && <option value="Otro">Otro</option>}
                                                </select>
                                                <span className="field-error">{billingErrors.serviceType}</span>
                                            </div>

                                            {['0101', '0303'].includes(serviceType) && (
                                                <div className="form-group">
                                                    <label className="form-label required">Valor Mes (antes de IVA)</label>
                                                    <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                        <input type="text" className="form-input currency-input" value={billingValorMes} onChange={(e) => handleCurrencyChange(e, setBillingValorMes)} />
                                                    </div>
                                                    <span className="field-error">{billingErrors.billingValorMes}</span>
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

                                            {['Referido externo', 'Referido empleado'].includes(origin) && (
                                                <div className="form-group">
                                                    <label className="form-label required">Nombre Referente / Cliente Antiguo</label>
                                                    <input type="text" className="form-input" value={originRef} onChange={(e) => setOriginRef(e.target.value)} />
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label required">Identificación del Vendedor</label>
                                                <input
                                                    type="text" inputMode="numeric" className="form-input"
                                                    placeholder="Ej: 1234567890"
                                                    value={billingSellerDocument}
                                                    onChange={(e) => setBillingSellerDocument(e.target.value.replace(/\D/g, ''))}
                                                    readOnly={SERVICE_TYPES.some(s => s.code === serviceType)}
                                                    style={SERVICE_TYPES.some(s => s.code === serviceType) ? { background: '#f5f9ff', cursor: 'default' } : undefined}
                                                />
                                                <span className="field-error">{billingErrors.billingSellerDocument}</span>
                                            </div>
                                            <div className="form-group full-width">
                                                <label className="form-label required">Gerente Encargado del Cierre de Negocio</label>
                                                <select className="form-input form-select" value={billingCloser} onChange={(e) => setBillingCloser(e.target.value)}>
                                                    <option value="">-- Seleccionar gerente --</option>
                                                    {GERENTES.map((g) => <option key={g} value={g}>{g}</option>)}
                                                </select>
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
                                                        <div className="area-fields-grid">
                                                            <div className="form-group">
                                                                <label className="form-label required">Centro de costos</label>
                                                                <select className="form-input form-select" value={area.centro} onChange={(e) => updateArea(area.id, 'centro', e.target.value)}>
                                                                    <option value="">-- Seleccionar --</option>
                                                                    {Object.keys(CENTROS_FACTURACION).map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="form-group">
                                                                <label className="form-label required">Concepto</label>
                                                                <select className="form-input form-select" value={area.concepto} onChange={(e) => updateArea(area.id, 'concepto', e.target.value)} disabled={!area.centro}>
                                                                    <option value="">-- Seleccionar --</option>
                                                                    {(CENTROS_FACTURACION[area.centro]?.productos || []).map(p => <option key={p.codigo} value={p.concepto}>{p.concepto}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="form-group"><label className="form-label required">Valor</label><div className="input-currency-wrapper"><span className="currency-prefix">$</span><input type="text" className="form-input currency-input" value={area.valor} onChange={(e) => updateArea(area.id, 'valor', formatCurrency(e.target.value))} /></div></div>
                                                            <div className="form-group">
                                                                <label className="form-label">Código Centro / Producto</label>
                                                                <input type="text" className="form-input" value={area.codigoCentro && area.codigoProducto ? `${area.codigoCentro} / ${area.codigoProducto}` : (area.codigoCentro || '')} readOnly placeholder="Se completa al elegir concepto" style={{ background: '#f5f9ff', cursor: 'default', color: area.codigoProducto ? 'var(--color-text)' : 'var(--color-text-light)' }} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="areas-subtotal">Subtotal áreas: <strong>{formatCurrencyDisplay(billingAreasTotal)}</strong></div>
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
                        ) : billingReqType === 'nota-credito' ? (
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
                        ) : (
                            <div className="billing-step-card">
                                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', margin: 0 }}>Selecciona una opción arriba para continuar.</p>
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
                    <div className="auditor-columns">
                        <div className="list-card">
                            <div className="list-header"><h2 className="list-title">Solicitudes de Clientes <span className="count-badge">{auditClients.length}</span></h2></div>
                            <div>
                                {auditClients.length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes nuevas de clientes.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {auditClients.map((c, i) => {
                                            const isPending = c?.status !== 'Validado';
                                            return (
                                                <div key={c?.id || i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }}>
                                                    <div className="auditor-card-header">
                                                        <div className="auditor-card-heading"><h4 className="auditor-item-title">{c?.name || ''}</h4><p className="auditor-item-subtitle">NIT: {c?.document || ''}</p></div>
                                                        <span className={`status-badge ${isPending ? 'pending' : 'validated'}`}>{c?.status || 'Pendiente'}</span>
                                                    </div>
                                                    <div className="auditor-card-footer">
                                                        <span className="auditor-date">Creado: {formatDateSafe(c?.createdAt)}</span>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-validate"
                                                                type="button"
                                                                disabled={pendingValidationId === c?.id}
                                                                onClick={(e) => { e.stopPropagation(); validateClientCreation(c); }}
                                                            >
                                                                {pendingValidationId === c?.id ? 'Validando...' : 'Validar creación'}
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
                            <div className="list-header"><h2 className="list-title">Solicitudes de Contratos <span className="count-badge">{auditContracts.length}</span></h2></div>
                            <div>
                                {auditContracts.length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes de contratos.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {auditContracts.map((c, i) => {
                                            const isPending = c?.status !== 'Validado';
                                            const clientDoc = c?.clientDocument || c?.document || '';
                                            const contractName = c?.name || c?.Nombre || '';
                                            const contractType = c?.contractType || c?.TipoContrato || '';
                                            const service = c?.service || c?.Servicio || '';
                                            const clientName = c?.clientName || c?.Cliente || '';

                                            return (
                                                <div key={c?.id || i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }}>
                                                    <div className="auditor-card-header">
                                                        <div className="auditor-card-heading">
                                                            <h4 className="auditor-item-title">{contractName}</h4>
                                                            <p className="auditor-item-subtitle">
                                                                <strong>{clientName}</strong>
                                                                {clientDoc ? ` · NIT: ${clientDoc}` : ''}
                                                            </p>
                                                        </div>
                                                        <span className={`status-badge ${isPending ? 'pending' : 'validated'}`}>{c?.status || 'Pendiente'}</span>
                                                    </div>
                                                    <div className="auditor-card-details">
                                                        {contractType && <div><strong>Tipo:</strong> {contractType}</div>}
                                                        {service && <div><strong>Servicio:</strong> {service}</div>}
                                                    </div>
                                                    <div className="auditor-card-footer">
                                                        <span className="auditor-date">Creado: {formatDateSafe(c?.createdAt)}</span>
                                                        {isPending ? (
                                                            <button
                                                                className="btn-validate"
                                                                type="button"
                                                                disabled={pendingValidationId === c?.id}
                                                                onClick={(e) => { e.stopPropagation(); validateContractCreation(c); }}
                                                            >
                                                                {pendingValidationId === c?.id ? 'Validando...' : 'Validar'}
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
            {auditorModalItem && (() => {
                const modalName = auditorModalItem?.name || auditorModalItem?.clientName || (auditorModalType === 'client' ? 'Cliente' : 'Contrato');
                const modalDocument = auditorModalItem?.document || auditorModalItem?.clientDocument || '';
                const modalClientName = auditorModalType === 'contract' ? (auditorModalItem?.clientName || '') : '';
                const modalStatus = auditorModalItem?.status || 'Pendiente';
                const isModalValidated = modalStatus === 'Validado';
                return (
                <div className="auditor-overlay" onClick={() => setAuditorModalItem(null)}>
                    <div className="auditor-detail-modal" onClick={e => e.stopPropagation()}>
                        <div className="auditor-detail-header">
                            <div className="auditor-detail-identity">
                                <div className="auditor-detail-avatar">{getInitials(modalName)}</div>
                                <div className="auditor-detail-heading">
                                    <h3>{modalName}</h3>
                                    <div className="auditor-detail-meta">
                                        {modalClientName && <span className="auditor-detail-meta-item">{modalClientName}</span>}
                                        {modalDocument && <span className="auditor-detail-meta-item">NIT {modalDocument}</span>}
                                        <span className={`status-badge on-dark ${isModalValidated ? 'validated' : 'pending'}`}>{modalStatus}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="auditor-detail-close" onClick={() => setAuditorModalItem(null)}>✕</button>
                        </div>
                        <div className="auditor-detail-body">
                            <div className="detail-grid">
                                {Object.entries(auditorModalItem).map(([key, value]) => {
                                    if (value === undefined || value === null || value === '' || typeof value === 'object') return null;
                                    if (['name', 'clientName', 'status'].includes(key)) return null;
                                    return (
                                        <div className="detail-tile" key={key}>
                                            <span className="detail-tile-icon">{renderFieldIcon(key)}</span>
                                            <div className="detail-tile-body">
                                                <span className="detail-label">{getSpanishFieldLabel(key)}</span>
                                                <span className="detail-value">{key.includes('Date') || key.includes('At') ? formatDateSafe(value) : String(value)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        <div className="auditor-detail-footer">
                            <button type="button" className="btn-secondary" onClick={() => setAuditorModalItem(null)}>Cerrar</button>
                            {auditorModalItem?.status !== 'Validado' && (
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={pendingValidationId === auditorModalItem?.id}
                                    onClick={() => {
                                        if (auditorModalType === 'client') {
                                            validateClientCreation(auditorModalItem);
                                        } else {
                                            validateContractCreation(auditorModalItem);
                                        }
                                        setAuditorModalItem(null);
                                    }}
                                >
                                    {pendingValidationId === auditorModalItem?.id ? 'Validando...' : 'Validar'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                );
            })()}

            {/* ========== TOAST GLOBAL ========== */}
            <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
                {toast.type === 'success-discrete' ? (
                    <div className="toast-content">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="toast-icon"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        <span className="toast-msg">{toast.message}</span>
                    </div>
                ) : (
                    <>
                        {toast.type === 'success' && <svg viewBox="0 0 24 24" fill="none" className="toast-icon" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>}
                        {toast.type === 'error' && <svg viewBox="0 0 24 24" fill="none" className="toast-icon" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>}
                        <div className="toast-content">
                            <div className="toast-title">{toast.title}</div>
                            <div className="toast-msg">{toast.message}</div>
                        </div>
                    </>
                )}
            </div>

        </div>
    );
}