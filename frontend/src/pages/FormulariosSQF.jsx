import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './FormulariosSQF.css'; // <-- Importamos tus estilos originales

const N8N_WEBHOOKS = {
    client: 'https://n8n.rbgct.cloud/webhook/clientes-crud',
    contract: 'https://n8n.rbgct.cloud/webhook/contratos-crud',
    billing: 'https://n8n.rbgct.cloud/webhook/flujo_Facturacion_SQF',
};

const generateId = (prefix) => {
    return `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
};

export default function FormulariosSQF() {
    const navigate = useNavigate();
    
    // ==========================================
    // ESTADOS (Reemplazan las variables de app.js)
    // ==========================================
    
    const [activeSection, setActiveSection] = useState('clients');
    const [clients, setClients] = useState([]);
    const [contracts, setContracts] = useState([]);
    
    // Toggles de la UI original
    const [showClientForm, setShowClientForm] = useState(false);
    const [showContractForm, setShowContractForm] = useState(false);
    
    // Estado dinámico para Facturación (Las 3 áreas)
    const [billingAreas, setBillingAreas] = useState([{ id: 1, centro: '', concepto: '', valor: '' }]);
    const [billingReqType, setBillingReqType] = useState('facturacion');

    // Notificaciones (Toast original)
    const [toast, setToast] = useState({ show: false, type: '', title: '', message: '' });

    // ==========================================
    // INICIALIZACIÓN (Equivalente al DOMContentLoaded)
    // ==========================================
    useEffect(() => {
        loadDataFromWebhooks();
    }, []);

    const loadDataFromWebhooks = async () => {
        try {
            const clientsRes = await fetch(N8N_WEBHOOKS.client, { headers: { 'Accept': 'application/json' } });
            if (clientsRes.ok) setClients(await clientsRes.json());
        } catch (e) { console.warn('Error cargando clientes', e); }

        try {
            const contractsRes = await fetch(N8N_WEBHOOKS.contract, { headers: { 'Accept': 'application/json' } });
            if (contractsRes.ok) setContracts(await contractsRes.json());
        } catch (e) { console.warn('Error cargando contratos', e); }
    };

    const showToast = (type, title, message) => {
        setToast({ show: true, type, title, message });
        setTimeout(() => setToast({ show: false, type: '', title: '', message: '' }), 6000);
    };

    // ==========================================
    // LÓGICA DE ENVÍO (app.js handleSubmit)
    // ==========================================
    const handleClientSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('id', generateId('CLI'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        try {
            await fetch(N8N_WEBHOOKS.client, { method: 'POST', mode: 'no-cors', body: formData });
            showToast('success', 'Cliente Creado', 'La información se envió a n8n.');
            form.reset();
            setShowClientForm(false);
            loadDataFromWebhooks();
        } catch (error) {
            showToast('error', 'Error', 'Ocurrió un error al conectar con n8n.');
        }
    };

    const handleContractSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('id', generateId('CTR'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        try {
            await fetch(N8N_WEBHOOKS.contract, { method: 'POST', mode: 'no-cors', body: formData });
            showToast('success', 'Contrato Creado', 'La información se envió a n8n.');
            form.reset();
            setShowContractForm(false);
            loadDataFromWebhooks();
        } catch (error) {
            showToast('error', 'Error', 'Ocurrió un error al conectar con n8n.');
        }
    };

    // ==========================================
    // MANEJO DE ÁREAS DINÁMICAS (Facturación)
    // ==========================================
    const addAreaBlock = () => {
        if (billingAreas.length >= 3) {
            showToast('error', 'Límite', 'Solo se pueden agregar hasta 3 áreas.');
            return;
        }
        setBillingAreas([...billingAreas, { id: billingAreas.length + 1, centro: '', concepto: '', valor: '' }]);
    };

    const removeAreaBlock = (idToRemove) => {
        setBillingAreas(billingAreas.filter(area => area.id !== idToRemove).map((area, index) => ({ ...area, id: index + 1 })));
    };

    // Formateador de moneda original
    const formatCurrency = (e) => {
        let value = e.target.value.replace(/\D/g, '');
        if (value === '') { e.target.value = ''; return; }
        e.target.value = new Intl.NumberFormat('es-CO').format(parseInt(value, 10));
    };

    return (
        <div className="app-wrapper"> {/* Contenedor para aislar de la intranet */}
            
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
                                <button type="button" className="btn-close" onClick={() => setShowClientForm(false)}>✕</button>
                            </div>
                            <form id="client-form" onSubmit={handleClientSubmit}>
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
                                        <input type="text" name="name" className="form-input" required />
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
                                        <label className="form-label required">RUT del Cliente</label>
                                        <input type="file" name="rutFile" accept=".pdf,.jpg,.png" className="form-input" required />
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
                        <div className="list-header">
                            <h2 className="list-title">Clientes Registrados</h2>
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
                                        <tr key={i}>
                                            <td className="td-wrap"><strong>{c.name}</strong></td>
                                            <td>{c.document}</td>
                                            <td>{c.email}</td>
                                            <td>{c.phone}</td>
                                        </tr>
                                    ))}
                                    {clients.length === 0 && <tr><td colSpan="4">No hay clientes registrados aún.</td></tr>}
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
                        <button className="btn-primary btn-new" onClick={() => setShowContractForm(!showContractForm)}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="btn-icon"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                            Nuevo Contrato
                        </button>
                    </div>

                    {showContractForm && (
                        <div className="form-card">
                            <div className="form-card-header">
                                <h2 className="form-card-title">Información del Contrato</h2>
                                <button type="button" className="btn-close" onClick={() => setShowContractForm(false)}>✕</button>
                            </div>
                            <form id="contract-form" onSubmit={handleContractSubmit}>
                                <div className="form-grid">
                                    <div className="form-group full-width">
                                        <label className="form-label required">Cliente Vinculado</label>
                                        <select name="clientName" className="form-input form-select" required>
                                            <option value="">Seleccione...</option>
                                            {clients.map((c, i) => <option key={i} value={c.name}>{c.name} ({c.document})</option>)}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Nombre del Contrato</label>
                                        <input type="text" name="name" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Valor del Contrato (COP)</label>
                                        <div className="input-currency-wrapper">
                                            <span className="currency-prefix">$</span>
                                            <input type="text" name="value" className="form-input currency-input" onInput={formatCurrency} required />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Fecha Inicio</label>
                                        <input type="date" name="startDate" className="form-input" required />
                                    </div>
                                    <div className="form-group">
                                        <label className="form-label required">Fecha Fin</label>
                                        <input type="date" name="endDate" className="form-input" required />
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
                        <div className="list-header">
                            <h2 className="list-title">Contratos Registrados</h2>
                        </div>
                        <div className="profile-scroll">
                            <table className="profile-table">
                                <thead>
                                    <tr>
                                        <th>Nombre del Contrato</th>
                                        <th>Cliente Vinculado</th>
                                        <th>Valor (COP)</th>
                                        <th>Vigencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {contracts.map((c, i) => (
                                        <tr key={i}>
                                            <td className="td-wrap"><strong>{c.name}</strong></td>
                                            <td>{c.clientName}</td>
                                            <td><span className="card-value">{c.valueFormatted}</span></td>
                                            <td>{c.startDate} a {c.endDate}</td>
                                        </tr>
                                    ))}
                                    {contracts.length === 0 && <tr><td colSpan="4">No hay contratos registrados.</td></tr>}
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
                            <p className="section-subtitle">Solicitudes de facturación y notas crédito.</p>
                        </div>
                    </div>

                    <div id="billing-content">
                        <div className="billing-step-card">
                            <h2 className="billing-step-title"><span className="step-pill">1</span> ¿Qué deseas solicitar?</h2>
                            <div className="radio-group radio-group-col">
                                <label className="radio-option">
                                    <input type="radio" name="billingReqType" value="facturacion" checked={billingReqType === 'facturacion'} onChange={(e) => setBillingReqType(e.target.value)} />
                                    <span className="radio-custom"></span>
                                    <span className="radio-text"><strong>Facturación</strong><small>Solicitud de factura</small></span>
                                </label>
                                <label className="radio-option">
                                    <input type="radio" name="billingReqType" value="nota-credito" checked={billingReqType === 'nota-credito'} onChange={(e) => setBillingReqType(e.target.value)} />
                                    <span className="radio-custom"></span>
                                    <span className="radio-text"><strong>Nota Crédito</strong><small>Aplicar nota crédito</small></span>
                                </label>
                            </div>
                        </div>

                        {billingReqType === 'facturacion' && (
                            <div className="form-card">
                                <div className="form-card-header">
                                    <h2 className="form-card-title">Solicitud de Facturación</h2>
                                </div>
                                <form>
                                    <div className="form-grid">
                                        <div className="form-group full-width">
                                            <label className="form-label required">Cliente / Razón Social</label>
                                            <input type="text" className="form-input" required />
                                        </div>
                                        <div className="form-group">
                                            <label className="form-label required">Empresa Facturadora</label>
                                            <select className="form-input form-select" required>
                                                <option value="GCT">GCT</option>
                                                <option value="GLT">GLT</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Áreas dinámicas exactas a tu app.js */}
                                    <div className="areas-section">
                                        <div className="areas-header">
                                            <h3 className="areas-title">Áreas de Facturación</h3>
                                            {billingAreas.length < 3 && (
                                                <button type="button" className="btn-add-area" onClick={addAreaBlock}>Agregar Área</button>
                                            )}
                                        </div>
                                        <div id="areas-container">
                                            {billingAreas.map((area, index) => (
                                                <div className="area-block" key={area.id}>
                                                    <div className="area-block-header">
                                                        <span className="area-block-label">{area.id}° Área – Centro de Costos</span>
                                                        {index > 0 && (
                                                            <button type="button" className="btn-remove-area" onClick={() => removeAreaBlock(area.id)}>✕ Eliminar</button>
                                                        )}
                                                    </div>
                                                    <div className="form-grid" style={{ gridTemplateColumns: '1fr 1.5fr 1fr' }}>
                                                        <div className="form-group">
                                                            <label className="form-label required">Centro</label>
                                                            <input type="text" className="form-input" required />
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label required">Concepto</label>
                                                            <input type="text" className="form-input" required />
                                                        </div>
                                                        <div className="form-group">
                                                            <label className="form-label required">Valor</label>
                                                            <div className="input-currency-wrapper"><span className="currency-prefix">$</span>
                                                                <input type="text" className="form-input currency-input" onInput={formatCurrency} required />
                                                            </div>
                                                        </div>
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
                        )}
                    </div>
                </section>

                {/* ========== SECTION: AUDITORÍA ========== */}
                <section className={`content-section ${activeSection === 'auditor' ? 'active' : ''}`}>
                    <div className="section-header">
                        <div>
                            <h1 className="section-title">Panel de Control de Auditoría</h1>
                            <p className="section-subtitle">Visualice y valide los procesos de creación.</p>
                        </div>
                    </div>
                    <div className="form-grid">
                        <div className="list-card p-6 text-center text-slate-500">
                            (Módulo en conexión con estado global)
                        </div>
                    </div>
                </section>

            </main>

            {/* TOAST ORIGINAL RECREADO EN REACT */}
            <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`} style={{ zIndex: 9999 }}>
                <div className="toast-content">
                    <div className="toast-title" style={{ fontWeight: 'bold' }}>{toast.title}</div>
                    <div className="toast-msg">{toast.message}</div>
                </div>
            </div>

        </div>
    );
}