import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormulariosSQF.css';

const N8N_WEBHOOKS = {
    client: 'https://n8n.rbgct.cloud/webhook/clientes-crud',
    contract: 'https://n8n.rbgct.cloud/webhook/contratos-crud',
    billing: 'https://n8n.rbgct.cloud/webhook/flujo_Facturacion_SQF',
};

const generateId = (prefix) => {
    const randomChars = Math.random().toString(36).substring(2, 6).toUpperCase();
    const timestamp = Date.now().toString().slice(-4);
    return `${prefix}-${randomChars}-${timestamp}`;
};

export default function FormulariosSQF() {
    const navigate = useNavigate();

    // ==========================================
    // ESTADOS GLOBALES
    // ==========================================
    const [activeSection, setActiveSection] = useState('clients');
    const [clients, setClients] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [selectedClientForContract, setSelectedClientForContract] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    const [clientSearchQuery, setClientSearchQuery] = useState('');
    const [contractSearchQuery, setContractSearchQuery] = useState('');
    const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
    const [clientDropdownQuery, setClientDropdownQuery] = useState('');

    const [showClientForm, setShowClientForm] = useState(false);
    const [showContractForm, setShowContractForm] = useState(false);
    
    const [isNitModalOpen, setIsNitModalOpen] = useState(false);
    const [nitLookupValue, setNitLookupValue] = useState('');
    const [nitLookupResult, setNitLookupResult] = useState(null);

    const [billingReqType, setBillingReqType] = useState('facturacion');
    const [billingType, setBillingType] = useState('Servicio nuevo');
    const [billingClientType, setBillingClientType] = useState('Cliente nuevo');
    const [billingClientName, setBillingClientName] = useState('');
    const [billingCompany, setBillingCompany] = useState('');
    const [saleType, setSaleType] = useState('');
    const [crossSalePerson, setCrossSalePerson] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [billingValorMes, setBillingValorMes] = useState('');
    const [billingValorProyecto, setBillingValorProyecto] = useState('');
    const [origin, setOrigin] = useState('');
    const [originRef, setOriginRef] = useState('');
    const [billingCloser, setBillingCloser] = useState('');
    const [billingAreas, setBillingAreas] = useState([{ id: 1, centro: '', concepto: '', valor: '' }]);

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
    useEffect(() => {
        loadDataFromWebhooks();
    }, []);

    const extractDataSafe = (rawData) => {
        try {
            if (!rawData) return [];
            if (Array.isArray(rawData)) return rawData;
            if (rawData.data && Array.isArray(rawData.data)) return rawData.data;
            if (rawData[0] && Array.isArray(rawData[0].body)) return rawData[0].body;
            return [];
        } catch (e) { return []; }
    };

    const loadDataFromWebhooks = async () => {
        setIsLoading(true);
        
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
                    source: c.source || ''
                }));
                setClients(mappedClients);
            }
        } catch (e) { console.error('Bloqueo CORS o Red en Clientes:', e); setClients([]); }

        try {
            const contractsRes = await fetch(N8N_WEBHOOKS.contract);
            if (contractsRes.ok) {
                const data = await contractsRes.json();
                const rawContracts = extractDataSafe(data);
                
                const mappedContracts = rawContracts.map(c => ({
                    id: c.id || generateId('CTR'),
                    contractType: c.contractType || c.TipoContrato || '',
                    clientId: c.clientId || '',
                    clientName: c.clientName || c.Cliente || '',
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
                    status: c.status || c.Estado || 'Validado'
                }));
                setContracts(mappedContracts);
            }
        } catch (e) { console.error('Bloqueo CORS o Red en Contratos:', e); setContracts([]); }
        
        setIsLoading(false);
    };

    const validClients = Array.isArray(clients) ? clients : [];
    const validContracts = Array.isArray(contracts) ? contracts : [];

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
        formData.append('id', generateId('CLI'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        try {
            await fetch(N8N_WEBHOOKS.client, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Cliente Creado', 'La información se envió a n8n y el cliente fue registrado.');
            form.reset();
            resetClientForm();
            setTimeout(loadDataFromWebhooks, 1000);
        } catch (error) {
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
        const reqFields = ['economicGroup', 'name', 'value', 'startDate', 'endDate', 'manager', 'service', 'roles'];
        reqFields.forEach(f => {
            if (!formData.get(f)?.trim()) { errors[f] = 'Este campo es requerido'; isValid = false; }
        });

        if (!isValid) { setContractErrors(errors); return; }

        setIsSubmittingContract(true);
        formData.append('id', generateId('CTR'));
        formData.append('clientId', selectedClientForContract.id);
        formData.append('clientName', selectedClientForContract.name);
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');
        
        const rawValue = String(formData.get('value') || '').replace(/\D/g, '');
        formData.set('value', parseInt(rawValue || '0', 10));
        formData.append('valueFormatted', `$ ${formatCurrency(rawValue)}`);

        try {
            await fetch(N8N_WEBHOOKS.contract, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Contrato Creado', 'La información se envió a n8n y el contrato fue registrado.');
            form.reset();
            resetContractForm();
            setTimeout(loadDataFromWebhooks, 1000);
        } catch (error) {
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
        setBillingAreas(billingAreas.map(area => area.id === id ? { ...area, [field]: value } : area));
    };

    const resetBillingForm = () => {
        setBillingReqType('facturacion'); setBillingType('Servicio nuevo'); setBillingClientType('Cliente nuevo');
        setBillingClientName(''); setBillingCompany(''); setSaleType(''); setCrossSalePerson('');
        setServiceType(''); setBillingValorMes(''); setBillingValorProyecto('');
        setOrigin(''); setOriginRef(''); setBillingCloser('');
        setBillingAreas([{ id: 1, centro: '', concepto: '', valor: '' }]);
        setBillingErrors({}); setNcErrors({});
    };

    const sendContractToBilling = (contract) => {
        setActiveSection('billing');
        setBillingReqType('facturacion'); setBillingType('Servicio actual'); setBillingClientType('Cliente antiguo');
        setBillingClientName(contract?.clientName || '');
        
        let sType = 'Otro';
        const cTypeStr = String(contract?.contractType || '');
        if (cTypeStr === 'Mensual' || cTypeStr.includes('Mensual')) sType = 'Fee mensual';
        else if (cTypeStr === 'Proyecto') sType = 'Proyecto';
        setServiceType(sType);

        const val = contract?.value ? formatCurrency(contract.value) : '';
        if (sType === 'Fee mensual') { setBillingValorMes(val); setBillingValorProyecto(''); }
        else { setBillingValorProyecto(val); setBillingValorMes(''); }

        setBillingCloser(contract?.manager || '');
        setBillingAreas([{ id: 1, centro: 'Administración', concepto: contract?.name || '', valor: val }]);
        
        showToastMsg('success-discrete', '', `Contrato "${contract?.name || ''}" cargado para facturar.`);
    };

    const handleBillingSubmit = async (e) => {
        e.preventDefault();
        setBillingErrors({});
        let errors = {};
        let isValid = true;

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
        const payload = {
            id: generateId('BIL'), tipoSolicitud: 'Facturación', billingType, billingClientType,
            clientName: billingClientName, company: billingCompany, saleType, crossSalePerson: saleType === 'Venta cruzada' ? crossSalePerson : '',
            serviceType,
            valorMes: parseInt(String(billingValorMes).replace(/\D/g, '') || '0', 10),
            valorProyecto: parseInt(String(billingValorProyecto).replace(/\D/g, '') || '0', 10),
            origin, originRef: ['Cliente antiguo', 'Referido externo', 'Referido empleado'].includes(origin) ? originRef : '',
            closer: billingCloser,
            areas: JSON.stringify(billingAreas.map(a => ({ ...a, valor: parseInt(String(a.valor).replace(/\D/g, ''), 10) }))),
            createdAt: new Date().toISOString()
        };

        try {
            const formData = new FormData();
            Object.keys(payload).forEach(k => formData.append(k, payload[k]));
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Solicitud Enviada', 'La solicitud de facturación fue registrada en n8n.');
            resetBillingForm();
        } catch (error) {
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
        formData.append('id', generateId('NC'));
        formData.append('tipoSolicitud', 'Nota Crédito');
        formData.append('createdAt', new Date().toISOString());
        formData.set('ncValue', parseInt(String(formData.get('ncValue')).replace(/\D/g, '') || '0', 10));

        try {
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Solicitud Enviada', 'La Nota Crédito fue enviada a n8n.');
            form.reset();
            resetBillingForm();
        } catch (error) {
            showToastMsg('error', 'Error de Conexión', 'Error al enviar a n8n.');
        } finally {
            setIsSubmittingBilling(false);
        }
    };

    const markAsValidated = () => { showToastMsg('success', 'Validación Exitosa', 'El proceso ha sido marcado como validado.'); };

    // ==========================================
    // RENDERIZADO PRINCIPAL
    // ==========================================
    return (
        <div className="sqf-wrapper">
            {/* ===================== HEADER ===================== */}
            <header className="app-header">
                <div className="header-inner">
                    <div className="brand">
                        <div className="brand-logo">
                            <span className="logo-rb">RB</span>
                            <span className="logo-gct">GCT</span>
                        </div>
                        <div className="brand-text">
                            <span className="brand-name">Russell Bedford</span>
                            <span className="brand-tagline">taking you further</span>
                        </div>
                    </div>
                    <nav className="main-nav" role="navigation" aria-label="Navegación principal">
                        <button className={`nav-btn ${activeSection === 'clients' ? 'active' : ''}`} onClick={() => setActiveSection('clients')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                            </svg> Clientes
                        </button>
                        <button className={`nav-btn ${activeSection === 'contracts' ? 'active' : ''}`} onClick={() => setActiveSection('contracts')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                            </svg> Contratos
                        </button>
                        <button className={`nav-btn ${activeSection === 'billing' ? 'active' : ''}`} onClick={() => setActiveSection('billing')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" />
                            </svg> Facturación
                        </button>
                        <button className={`nav-btn ${activeSection === 'auditor' ? 'active' : ''}`} onClick={() => setActiveSection('auditor')} role="tab">
                            <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg> Auditoría
                        </button>
                        <button className="nav-btn" onClick={() => navigate('/admin2')} style={{ marginLeft: '8px', paddingLeft: '16px', borderLeft: '1px solid rgba(255,255,255,0.2)' }}>
                            ← Volver
                        </button>
                    </nav>
                </div>
            </header>

            <main className="app-main">
                
                {/* ========== SECTION: CLIENTES ========== */}
                <section className={`content-section ${activeSection === 'clients' ? 'active' : ''}`}>
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
                                <div className="profile-scroll">
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
                </section>

                {/* ========== SECTION: CONTRATOS ========== */}
                <section className={`content-section ${activeSection === 'contracts' ? 'active' : ''}`}>
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
                                    <button className="btn-reload nit-modal-reload" onClick={loadDataFromWebhooks} title="Recargar datos desde n8n">
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="reload-icon"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg> Sincronizar clientes con n8n
                                    </button>
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
                                        </div>
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
                            <div><strong>No hay clientes registrados</strong><p>Debe registrar al menos un cliente antes de crear un contrato. <button className="link-btn" onClick={() => setActiveSection('clients')}>Ir a Clientes →</button></p></div>
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
                                    <div className="form-group">
                                        <label className="form-label required">Fecha de Inicio</label>
                                        <input type="date" name="startDate" className="form-input" />
                                        <span className="field-error">{contractErrors.startDate}</span>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Fecha de Finalización</label>
                                        <input type="date" name="endDate" className="form-input" />
                                        <span className="field-error">{contractErrors.endDate}</span>
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
                                        <label className="form-label required">Cargos y Horas Asignadas</label>
                                        <textarea name="roles" className="form-input form-textarea" rows="3"></textarea>
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
                                <div className="profile-scroll">
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
                                                        <button type="button" className="btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); sendContractToBilling(c); }} style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '14px', height: '14px' }}><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                                            Enviar a Facturar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* ========== SECTION: FACTURACIÓN ========== */}
                <section className={`content-section ${activeSection === 'billing' ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Facturación</h1>
                            <p className="section-subtitle">Solicitudes de facturación, notas crédito y servicios nuevos o actuales.</p>
                        </div>
                    </div>

                    {validContracts.length === 0 && !isLoading && (
                        <div className="alert-card alert-warning">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="alert-icon"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                            <div><strong>No hay contratos registrados</strong><p>Debe tener al menos un contrato activo antes de registrar una facturación. <button className="link-btn" onClick={() => setActiveSection('contracts')}>Ir a Contratos →</button></p></div>
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
                                    <h2 className="billing-step-title"><span className="step-pill">2</span> Detalles de la Facturación</h2>
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
                                                <label className="form-label required">Empresa Facturadora</label>
                                                <select className="form-input form-select" value={billingCompany} onChange={(e) => setBillingCompany(e.target.value)}>
                                                    <option value="">Seleccione...</option>
                                                    <option value="GCT">GCT</option>
                                                    <option value="GLT">GLT</option>
                                                    <option value="PROFIT">PROFIT</option>
                                                    <option value="Líneas Familiares">Líneas Familiares</option>
                                                    <option value="Diseño Logístico">Diseño Logístico</option>
                                                </select>
                                                <span className="field-error">{billingErrors.billingCompany}</span>
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
                                                            <div className="form-group"><label className="form-label required">Centro</label><input type="text" className="form-input" value={area.centro} onChange={(e) => updateArea(area.id, 'centro', e.target.value)} /></div>
                                                            <div className="form-group"><label className="form-label required">Concepto</label><input type="text" className="form-input" value={area.concepto} onChange={(e) => updateArea(area.id, 'concepto', e.target.value)} /></div>
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
                <section className={`content-section ${activeSection === 'auditor' ? 'active' : ''}`}>
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
                                {validClients.filter(c => c?.source !== 'historico').length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes nuevas de clientes.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {validClients.filter(c => c?.source !== 'historico').map((c, i) => {
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
                                                            <button className="btn-validate" onClick={(e) => { e.stopPropagation(); markAsValidated(); }}>Validar</button>
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
                                {validContracts.length === 0 ? (
                                    <div className="empty-state"><p>No hay solicitudes de contratos.</p></div>
                                ) : (
                                    <div className="auditor-list">
                                        {validContracts.map((c, i) => {
                                            const isPending = c?.status !== 'Validado';
                                            return (
                                                <div key={i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }}>
                                                    <div className="auditor-card-header">
                                                        <div><h4 className="auditor-item-title">{c?.name || ''}</h4><p className="auditor-item-subtitle">Cliente: {c?.clientName || ''}</p></div>
                                                        <span className={`status-badge ${isPending ? 'pending' : 'validated'}`}>{c?.status || 'Pendiente'}</span>
                                                    </div>
                                                    <div className="auditor-card-footer">
                                                        <span className="auditor-date">Creado: {formatDateSafe(c?.createdAt)}</span>
                                                        {isPending ? (
                                                            <button className="btn-validate" onClick={(e) => { e.stopPropagation(); markAsValidated(); }}>Validar</button>
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
                                        <span className="detail-label">{key}</span>
                                        <span className="detail-value">{key.includes('Date') || key.includes('At') ? formatDateSafe(value) : String(value)}</span>
                                    </div>
                                );
                            })}
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