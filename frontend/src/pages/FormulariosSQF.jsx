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
    // ESTADOS GLOBALES (Equivalente al let state = {})
    // ==========================================
    const [activeSection, setActiveSection] = useState('clients');
    const [clients, setClients] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [selectedClientForContract, setSelectedClientForContract] = useState(null);
    const [billingRequests, setBillingRequests] = useState([]);

    // Controles de Vistas
    const [showClientForm, setShowClientForm] = useState(false);
    const [showContractForm, setShowContractForm] = useState(false);
    
    // Modal NIT
    const [isNitModalOpen, setIsNitModalOpen] = useState(false);
    const [nitLookupValue, setNitLookupValue] = useState('');
    const [nitLookupResult, setNitLookupResult] = useState(null); // null, 'found', 'error'

    // Formulario de Facturación dinámico
    const [billingReqType, setBillingReqType] = useState('facturacion');
    const [billingType, setBillingType] = useState('Servicio nuevo');
    const [billingClientType, setBillingClientType] = useState('Cliente nuevo');
    const [saleType, setSaleType] = useState('');
    const [serviceType, setServiceType] = useState('');
    const [origin, setOrigin] = useState('');
    const [billingAreas, setBillingAreas] = useState([{ id: 1, centro: '', concepto: '', valor: '' }]);

    // Modal Auditor
    const [auditorModalItem, setAuditorModalItem] = useState(null);
    const [auditorModalType, setAuditorModalType] = useState('');

    // Notificaciones
    const [toast, setToast] = useState({ show: false, type: '', title: '', message: '' });

    // ==========================================
    // EFECTOS E INICIALIZACIÓN
    // ==========================================
    useEffect(() => {
        loadDataFromWebhooks();
    }, []);

    const loadDataFromWebhooks = async () => {
        try {
            const clientsRes = await fetch(N8N_WEBHOOKS.client, { headers: { 'Accept': 'application/json' } });
            if (clientsRes.ok) {
                const data = await clientsRes.json();
                const extracted = Array.isArray(data) ? data : (data.data || []);
                setClients(extracted);
            }
        } catch (e) { console.warn('Error loading clients from webhook:', e); }

        try {
            const contractsRes = await fetch(N8N_WEBHOOKS.contract, { headers: { 'Accept': 'application/json' } });
            if (contractsRes.ok) {
                const data = await contractsRes.json();
                const extracted = Array.isArray(data) ? data : (data.data || []);
                setContracts(extracted);
            }
        } catch (e) { console.warn('Error loading contracts from webhook:', e); }
    };

    const showToastMsg = (type, title, message) => {
        setToast({ show: true, type, title, message });
        setTimeout(() => setToast({ show: false, type: '', title: '', message: '' }), 6000);
    };

    // Formateador de moneda original
    const formatCurrencyInput = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') { e.target.value = ''; return; }
        e.target.value = new Intl.NumberFormat('es-CO').format(parseInt(value, 10));
    };

    // Formateador de vista
    const formatCurrencyDisplay = (val) => {
        if (!val) return '$ 0';
        const num = typeof val === 'string' ? parseInt(val.replace(/\D/g, ''), 10) : val;
        return isNaN(num) ? val : `$ ${new Intl.NumberFormat('es-CO').format(num)}`;
    };

    // ==========================================
    // LÓGICA DE MODALES Y FORMULARIOS
    // ==========================================
    const triggerLookup = () => {
        if (!nitLookupValue.trim()) {
            setNitLookupResult('empty');
            return;
        }
        // Lógica original (Deduplicación simple)
        const found = clients.find(c => String(c.document).replace(/\D/g, '') === String(nitLookupValue).replace(/\D/g, ''));
        if (found) {
            setNitLookupResult({ type: 'found', client: found });
        } else {
            setNitLookupResult({ type: 'error' });
        }
    };

    const startContractForClient = (client) => {
        setSelectedClientForContract(client);
        setIsNitModalOpen(false);
        setNitLookupValue('');
        setNitLookupResult(null);
        setShowContractForm(true);
    };

    // Áreas de facturación
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

    // Actualizar áreas dinámicas
    const updateArea = (id, field, value) => {
        setBillingAreas(billingAreas.map(area => area.id === id ? { ...area, [field]: value } : area));
    };

    // ==========================================
    // ENVÍO DE DATOS A N8N (Replica exacta de app.js)
    // ==========================================
    const handleClientSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        
        // Agregar campos calculados
        formData.append('id', generateId('CLI'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        try {
            await fetch(N8N_WEBHOOKS.client, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Cliente Creado', 'La información se envió a n8n y el cliente fue registrado.');
            form.reset();
            setShowClientForm(false);
            setTimeout(loadDataFromWebhooks, 1000);
        } catch (error) {
            showToastMsg('error', 'Error de Conexión', 'Ocurrió un error al conectar con n8n.');
        }
    };

    const handleContractSubmit = async (e) => {
        e.preventDefault();
        if (!selectedClientForContract) {
            showToastMsg('error', 'Error', 'Debe seleccionar un cliente validado primero.');
            return;
        }

        const form = e.target;
        const formData = new FormData(form);
        formData.append('id', generateId('CTR'));
        formData.append('clientId', selectedClientForContract.id);
        formData.append('clientName', selectedClientForContract.name);
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        // Formateo del valor crudo
        const rawValue = formData.get('value').replace(/\D/g, '');
        formData.set('value', parseInt(rawValue || '0', 10));

        try {
            await fetch(N8N_WEBHOOKS.contract, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Contrato Creado', 'La información se envió a n8n y el contrato fue registrado.');
            form.reset();
            setSelectedClientForContract(null);
            setShowContractForm(false);
            setTimeout(loadDataFromWebhooks, 1000);
        } catch (error) {
            showToastMsg('error', 'Error de Conexión', 'Ocurrió un error al conectar con n8n.');
        }
    };

    const handleBillingSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);

        formData.append('id', generateId('BIL'));
        formData.append('tipoSolicitud', billingReqType === 'facturacion' ? 'Facturación' : 'Nota Crédito');
        formData.append('createdAt', new Date().toISOString());
        formData.append('areas', JSON.stringify(billingAreas)); // Enviar áreas como JSON string

        try {
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });
            showToastMsg('success', 'Solicitud Enviada', `La solicitud de ${billingReqType} fue enviada a n8n.`);
            form.reset();
            setBillingAreas([{ id: 1, centro: '', concepto: '', valor: '' }]);
        } catch (error) {
            showToastMsg('error', 'Error de Conexión', 'Ocurrió un error al conectar con n8n.');
        }
    };

    // ==========================================
    // RENDERIZADO DEL COMPONENTE
    // ==========================================
    return (
        <div className="sqf-wrapper">
            
            {/* ===================== HEADER ORIGINAL ===================== */}
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

                    <nav className="main-nav" role="navigation">
                        <div role="tablist" className="nav-tablist">
                            <button className={`nav-btn ${activeSection === 'clients' ? 'active' : ''}`} onClick={() => setActiveSection('clients')}>
                                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
                                Clientes
                            </button>
                            <button className={`nav-btn ${activeSection === 'contracts' ? 'active' : ''}`} onClick={() => setActiveSection('contracts')}>
                                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                                Contratos
                            </button>
                            <button className={`nav-btn ${activeSection === 'billing' ? 'active' : ''}`} onClick={() => setActiveSection('billing')}>
                                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2" /><line x1="1" y1="10" x2="23" y2="10" /></svg>
                                Facturación
                            </button>
                            <button className={`nav-btn ${activeSection === 'auditor' ? 'active' : ''}`} onClick={() => setActiveSection('auditor')}>
                                <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
                                Auditoría
                            </button>
                            {/* Botón añadido para integrarse con la intranet */}
                            <button className="nav-btn" onClick={() => navigate('/admin2')} style={{ marginLeft: '6px', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '14px' }}>
                                ← Volver
                            </button>
                        </div>
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
                        <button className="btn-primary btn-new" onClick={() => setShowClientForm(!showClientForm)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Nuevo Cliente
                        </button>
                    </div>

                    {showClientForm && (
                        <div className="form-card">
                            <div className="form-card-header">
                                <h2 className="form-card-title">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="form-card-icon"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                                    Información del Cliente
                                </h2>
                                <button className="btn-close" onClick={() => setShowClientForm(false)}>✕</button>
                            </div>
                            <form onSubmit={handleClientSubmit}>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="form-label required">Tipo de Contribuyente</label>
                                        <div className="radio-group">
                                            <label className="radio-option">
                                                <input type="radio" name="clientType" value="natural" defaultChecked />
                                                <span className="radio-custom"></span>
                                                <span className="radio-text"><strong>Persona Natural</strong><small>Cédula de ciudadanía</small></span>
                                            </label>
                                            <label className="radio-option">
                                                <input type="radio" name="clientType" value="juridica" />
                                                <span className="radio-custom"></span>
                                                <span className="radio-text"><strong>Persona Jurídica</strong><small>NIT de empresa</small></span>
                                            </label>
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">NIT Empresa / Documento</label>
                                        <input type="text" name="document" className="form-input" placeholder="Ej: 900.123.456-7" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre o Razón Social</label>
                                        <input type="text" name="name" className="form-input" placeholder="Ej: Carlos Rodríguez Pérez" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre del Contacto de Pagos</label>
                                        <input type="text" name="contactName" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Cargo del Contacto</label>
                                        <input type="text" name="contactRole" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Grupo Económico</label>
                                        <input type="text" name="economicGroup" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Correo de Facturación</label>
                                        <input type="email" name="email" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Teléfono(s) de Contacto</label>
                                        <input type="tel" name="phone" className="form-input" required />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Dirección del Cliente</label>
                                        <input type="text" name="address" className="form-input" required />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Información Adicional <span className="label-optional">(opcional)</span></label>
                                        <textarea name="info" className="form-input form-textarea" rows="3"></textarea>
                                    </div>

                                    {/* Uploads originales (Adaptados a HTML estándar para evitar error del onClick nativo en React) */}
                                    <div className="form-group">
                                        <label className="form-label required">RUT del Cliente</label>
                                        <input type="file" name="rutFile" accept=".pdf,.jpg,.jpeg,.png" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Cámara de Comercio</label>
                                        <input type="file" name="camaraFile" accept=".pdf,.jpg,.jpeg,.png" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Composición Accionaria</label>
                                        <input type="file" name="composicionFile" accept=".pdf,.jpg,.jpeg,.png" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Estudio de Seguridad</label>
                                        <input type="file" name="estudioFile" accept=".pdf,.jpg,.jpeg,.png" className="form-input" required />
                                    </div>
                                </div>

                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowClientForm(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary btn-submit">
                                        <span className="btn-label">Registrar Cliente</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="list-card">
                        <div className="list-header" style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                            <h2 className="list-title">Clientes Registrados</h2>
                            <button onClick={loadDataFromWebhooks} className="btn-secondary" style={{padding: '6px 12px'}}>⟳ Refrescar</button>
                        </div>
                        <div className="profile-scroll">
                            <table className="profile-table">
                                <thead>
                                    <tr>
                                        <th>Cliente / Razón Social</th>
                                        <th>NIT / Documento</th>
                                        <th>Correo Electrónico</th>
                                        <th>Teléfono</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.map((c, i) => (
                                        <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }} style={{cursor: 'pointer'}}>
                                            <td className="td-wrap"><strong>{c.name || 'Sin Nombre'}</strong></td>
                                            <td>{c.document || '---'}</td>
                                            <td>{c.email || 'N/A'}</td>
                                            <td>{c.phone || 'N/A'}</td>
                                        </tr>
                                    ))}
                                    {clients.length === 0 && (
                                        <tr><td colSpan="4" className="empty-state">No hay clientes registrados o cargando...</td></tr>
                                    )}
                                </tbody>
                            </table>
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

                    {/* MODAL NIT ORIGINAL */}
                    <div className={`nit-modal ${isNitModalOpen ? '' : 'is-hidden'}`}>
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
                                        <input type="text" className="form-input lookup-input" placeholder="Ingrese NIT..." value={nitLookupValue} onChange={(e) => setNitLookupValue(e.target.value)} />
                                    </div>
                                    <button className="btn-primary btn-lookup" onClick={triggerLookup}>Buscar</button>
                                </div>

                                {nitLookupResult?.type === 'found' && (
                                    <div className="lookup-result success">
                                        <div><strong>✔ Cliente Encontrado:</strong> <br/> {nitLookupResult.client.name}</div>
                                        <button className="btn-primary" style={{width: '100%', marginTop: '10px'}} onClick={() => startContractForClient(nitLookupResult.client)}>Generar Contrato</button>
                                    </div>
                                )}
                                {nitLookupResult?.type === 'error' && (
                                    <div className="lookup-result error">
                                        <strong>✖ Cliente No Encontrado</strong>
                                        <p style={{marginTop: '5px', fontSize: '14px'}}>Asegúrese de escribirlo igual o registre el cliente primero.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* FORMULARIO DE CONTRATOS */}
                    {showContractForm && (
                        <div className="form-card">
                            <div className="form-card-header">
                                <h2 className="form-card-title">Información del Contrato para: {selectedClientForContract?.name}</h2>
                                <button className="btn-close" onClick={() => setShowContractForm(false)}>✕</button>
                            </div>
                            <form onSubmit={handleContractSubmit}>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="form-label required">Tipo de Contrato</label>
                                        <div className="radio-group radio-group-col">
                                            <label className="radio-option"><input type="radio" name="contractType" value="Mensual" defaultChecked /><span className="radio-custom"></span><span className="radio-text"><strong>Mensual</strong></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Proyecto" /><span className="radio-custom"></span><span className="radio-text"><strong>Proyecto</strong></span></label>
                                            <label className="radio-option"><input type="radio" name="contractType" value="Horas trabajadas" /><span className="radio-custom"></span><span className="radio-text"><strong>Horas Trabajadas</strong></span></label>
                                        </div>
                                    </div>

                                    <div className="form-group">
                                        <label className="form-label required">Grupo Económico</label>
                                        <input type="text" name="economicGroup" className="form-input" defaultValue={selectedClientForContract?.economicGroup || ''} required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre del Contrato</label>
                                        <input type="text" name="name" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Valor del Contrato (COP)</label>
                                        <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                            <input type="text" name="value" className="form-input currency-input" onInput={formatCurrencyInput} required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Fecha de Inicio</label>
                                        <input type="date" name="startDate" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Fecha de Finalización</label>
                                        <input type="date" name="endDate" className="form-input" required />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Gerente a Cargo</label>
                                        <input type="text" name="manager" className="form-input" defaultValue={selectedClientForContract?.contactName || ''} required />
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Servicio a Prestar</label>
                                        <textarea name="service" className="form-input form-textarea" rows="3" required></textarea>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label required">Cargos y Horas</label>
                                        <textarea name="roles" className="form-input form-textarea" rows="3" required></textarea>
                                    </div>
                                    <div className="form-group full-width">
                                        <label className="form-label">Notas Adicionales <span className="label-optional">(opcional)</span></label>
                                        <textarea name="notes" className="form-input form-textarea" rows="3"></textarea>
                                    </div>
                                </div>
                                <div className="form-actions">
                                    <button type="button" className="btn-secondary" onClick={() => setShowContractForm(false)}>Cancelar</button>
                                    <button type="submit" className="btn-primary btn-submit">Registrar Contrato</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="list-card">
                        <div className="list-header" style={{display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                            <h2 className="list-title">Contratos Registrados</h2>
                            <button onClick={loadDataFromWebhooks} className="btn-secondary" style={{padding: '6px 12px'}}>⟳ Refrescar</button>
                        </div>
                        <div className="profile-scroll">
                            <table className="profile-table">
                                <thead>
                                    <tr>
                                        <th>Nombre del Contrato</th>
                                        <th>Cliente Vinculado</th>
                                        <th>Tipo</th>
                                        <th>Valor (COP)</th>
                                        <th>Vigencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contracts.map((c, i) => (
                                        <tr key={i} onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }} style={{cursor: 'pointer'}}>
                                            <td className="td-wrap"><strong>{c.name || 'Sin Nombre'}</strong></td>
                                            <td>{c.clientName || '---'}</td>
                                            <td><span className="type-chip">{c.contractType || ''}</span></td>
                                            <td><span className="card-value">{c.valueFormatted || formatCurrencyDisplay(c.value)}</span></td>
                                            <td>{c.startDate} a {c.endDate}</td>
                                        </tr>
                                    ))}
                                    {contracts.length === 0 && <tr><td colSpan="5" className="empty-state">No hay contratos registrados.</td></tr>}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>

                {/* ========== SECTION: FACTURACIÓN ========== */}
                <section className={`content-section ${activeSection === 'billing' ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Facturación</h1>
                            <p className="section-subtitle">Solicitudes de facturación, notas crédito y servicios.</p>
                        </div>
                    </div>

                    <div id="billing-content">
                        <div className="billing-step-card">
                            <h2 className="billing-step-title"><span className="step-pill">1</span> ¿Qué deseas solicitar?</h2>
                            <div className="radio-group radio-group-col">
                                <label className="radio-option">
                                    <input type="radio" name="billingReqType" value="facturacion" checked={billingReqType === 'facturacion'} onChange={(e) => setBillingReqType(e.target.value)} />
                                    <span className="radio-custom"></span><span className="radio-text"><strong>Facturación</strong><small>Servicio nuevo o actual</small></span>
                                </label>
                                <label className="radio-option">
                                    <input type="radio" name="billingReqType" value="nota-credito" checked={billingReqType === 'nota-credito'} onChange={(e) => setBillingReqType(e.target.value)} />
                                    <span className="radio-custom"></span><span className="radio-text"><strong>Nota Crédito</strong><small>Aplicar a factura existente</small></span>
                                </label>
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
                                                <label className="radio-option"><input type="radio" name="billingType" value="Servicio nuevo" checked={billingType === 'Servicio nuevo'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" name="billingType" value="Servicio actual" checked={billingType === 'Servicio actual'} onChange={(e) => setBillingType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Servicio Actual</strong></span></label>
                                            </div>
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label required">Tipo de Cliente</label>
                                            <div className="radio-group radio-group-col">
                                                <label className="radio-option"><input type="radio" name="billingClientType" value="Cliente nuevo" checked={billingClientType === 'Cliente nuevo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Nuevo</strong></span></label>
                                                <label className="radio-option"><input type="radio" name="billingClientType" value="Cliente antiguo" checked={billingClientType === 'Cliente antiguo'} onChange={(e) => setBillingClientType(e.target.value)} /><span className="radio-custom"></span><span className="radio-text"><strong>Cliente Antiguo</strong></span></label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="form-card">
                                    <div className="form-card-header"><h2 className="form-card-title">Formulario de Solicitud</h2></div>
                                    <form onSubmit={handleBillingSubmit}>
                                        <div className="form-grid">
                                            <div className="form-group full-width">
                                                <label className="form-label required">Nombre del Cliente / Razón Social</label>
                                                <input type="text" name="clientName" className="form-input" required />
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label required">Empresa Facturadora</label>
                                                <select name="company" className="form-input form-select" required>
                                                    <option value="">Seleccione...</option>
                                                    <option value="GCT">GCT</option>
                                                    <option value="GLT">GLT</option>
                                                    <option value="PROFIT">PROFIT</option>
                                                </select>
                                            </div>
                                            <div className="form-group">
                                                <label className="form-label required">Tipo de Venta</label>
                                                <select name="saleType" className="form-input form-select" value={saleType} onChange={(e) => setSaleType(e.target.value)} required>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Nueva venta">Nueva venta</option>
                                                    <option value="Venta cruzada">Venta cruzada</option>
                                                </select>
                                            </div>
                                            {saleType === 'Venta cruzada' && (
                                                <div className="form-group full-width">
                                                    <label className="form-label required">Persona que Generó la Venta</label>
                                                    <input type="text" name="crossSalePerson" className="form-input" required />
                                                </div>
                                            )}
                                            <div className="form-group">
                                                <label className="form-label required">Tipo de Servicio</label>
                                                <select name="serviceType" className="form-input form-select" value={serviceType} onChange={(e) => setServiceType(e.target.value)} required>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Fee mensual">Fee mensual</option>
                                                    <option value="Proyecto">Proyecto</option>
                                                </select>
                                            </div>
                                            
                                            {serviceType === 'Fee mensual' && (
                                                <div className="form-group">
                                                    <label className="form-label required">Valor Mes</label>
                                                    <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                        <input type="text" name="valorMes" className="form-input currency-input" onInput={formatCurrencyInput} required />
                                                    </div>
                                                </div>
                                            )}
                                            {serviceType === 'Proyecto' && (
                                                <div className="form-group">
                                                    <label className="form-label required">Valor Proyecto 100%</label>
                                                    <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                        <input type="text" name="valorProyecto" className="form-input currency-input" onInput={formatCurrencyInput} required />
                                                    </div>
                                                </div>
                                            )}

                                            <div className="form-group">
                                                <label className="form-label required">Origen del Cliente</label>
                                                <select name="origin" className="form-input form-select" value={origin} onChange={(e) => setOrigin(e.target.value)} required>
                                                    <option value="">Seleccione...</option>
                                                    <option value="Cliente antiguo">Cliente antiguo</option>
                                                    <option value="Referido externo">Referido externo</option>
                                                    <option value="Página">Página</option>
                                                    <option value="No aplica">No aplica</option>
                                                </select>
                                            </div>
                                            
                                            {['Cliente antiguo', 'Referido externo'].includes(origin) && (
                                                <div className="form-group">
                                                    <label className="form-label required">Nombre del Referente</label>
                                                    <input type="text" name="originRef" className="form-input" required />
                                                </div>
                                            )}

                                            <div className="form-group full-width">
                                                <label className="form-label required">Persona Encargada del Cierre</label>
                                                <input type="text" name="closer" className="form-input" required />
                                            </div>
                                        </div>

                                        <div className="areas-section">
                                            <div className="areas-header">
                                                <h3 className="areas-title">Áreas de Facturación</h3>
                                                {billingAreas.length < 3 && (
                                                    <button type="button" className="btn-add-area" onClick={addAreaBlock}>+ Agregar Área</button>
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
                                                            <div className="form-group"><label className="form-label required">Centro</label><input type="text" className="form-input" value={area.centro} onChange={e => updateArea(area.id, 'centro', e.target.value)} required /></div>
                                                            <div className="form-group"><label className="form-label required">Concepto</label><input type="text" className="form-input" value={area.concepto} onChange={e => updateArea(area.id, 'concepto', e.target.value)} required /></div>
                                                            <div className="form-group"><label className="form-label required">Valor</label><div className="input-currency-wrapper"><span className="currency-prefix">$</span><input type="text" className="form-input currency-input" onInput={(e) => { formatCurrencyInput(e); updateArea(area.id, 'valor', e.target.value); }} required /></div></div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="form-actions">
                                            <button type="submit" className="btn-primary btn-submit">Enviar Solicitud</button>
                                        </div>
                                    </form>
                                </div>
                            </>
                        ) : (
                            <div className="form-card">
                                <div className="form-card-header"><h2 className="form-card-title">Solicitud de Nota Crédito</h2></div>
                                <form onSubmit={handleBillingSubmit}>
                                    <div className="form-grid">
                                        <div className="form-group full-width"><label className="form-label required">Nombre del Cliente / Razón Social</label><input type="text" name="ncClient" className="form-input" required /></div>
                                        <div className="form-group"><label className="form-label required"># Factura a Aplicar Nota</label><input type="text" name="ncInvoice" className="form-input" required /></div>
                                        <div className="form-group"><label className="form-label required">Valor a Aplicar</label><div className="input-currency-wrapper"><span className="currency-prefix">$</span><input type="text" name="ncValue" className="form-input currency-input" onInput={formatCurrencyInput} required /></div></div>
                                        <div className="form-group full-width"><label className="form-label required">Motivo de la Nota Crédito</label><textarea name="ncReason" className="form-input form-textarea" rows="3" required></textarea></div>
                                    </div>
                                    <div className="form-actions"><button type="submit" className="btn-primary btn-submit">Enviar Nota Crédito</button></div>
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
                            <p className="section-subtitle">Visualice las creaciones de clientes y contratos.</p>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="list-card">
                            <div className="list-header"><h2 className="list-title">Solicitudes de Clientes</h2></div>
                            <div className="auditor-list">
                                {clients.map((c, i) => (
                                    <div key={i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('client'); }}>
                                        <div className="auditor-card-header">
                                            <div><h4 className="auditor-item-title">{c.name}</h4><p className="auditor-item-subtitle">NIT: {c.document}</p></div>
                                            <span className={`status-badge ${c.status === 'Validado' ? 'validated' : 'pending'}`}>{c.status || 'Pendiente'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="list-card">
                            <div className="list-header"><h2 className="list-title">Solicitudes de Contratos</h2></div>
                            <div className="auditor-list">
                                {contracts.map((c, i) => (
                                    <div key={i} className="auditor-card" onClick={() => { setAuditorModalItem(c); setAuditorModalType('contract'); }}>
                                        <div className="auditor-card-header">
                                            <div><h4 className="auditor-item-title">{c.name}</h4><p className="auditor-item-subtitle">Cliente: {c.clientName}</p></div>
                                            <span className={`status-badge ${c.status === 'Validado' ? 'validated' : 'pending'}`}>{c.status || 'Pendiente'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

            </main>

            {/* MODAL DETALLE AUDITORIA */}
            <div className={`auditor-overlay ${auditorModalItem ? '' : 'is-hidden'}`} onClick={() => setAuditorModalItem(null)}>
                <div className="auditor-detail-modal" onClick={e => e.stopPropagation()}>
                    <div className="auditor-detail-header">
                        <h3>{auditorModalType === 'client' ? 'Detalle del Cliente' : 'Detalle del Contrato'}</h3>
                        <button className="auditor-detail-close" onClick={() => setAuditorModalItem(null)}>✕</button>
                    </div>
                    <div className="auditor-detail-body">
                        {auditorModalItem && Object.entries(auditorModalItem).map(([key, value]) => {
                            if (!value || typeof value === 'object') return null;
                            return (
                                <div className="detail-row" key={key}>
                                    <span className="detail-label">{key}</span>
                                    <span className="detail-value">{value}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* TOAST NOTIFICATIONS */}
            <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`} style={{ zIndex: 9999 }}>
                <div className="toast-content">
                    <div className="toast-title" style={{ fontWeight: 'bold' }}>{toast.title}</div>
                    <div className="toast-msg">{toast.message}</div>
                </div>
            </div>

        </div>
    );
}