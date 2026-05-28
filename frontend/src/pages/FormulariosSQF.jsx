import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Webhooks originales de n8n
const N8N_WEBHOOKS = {
    client: 'https://n8n.rbgct.cloud/webhook/clientes-crud',
    contract: 'https://n8n.rbgct.cloud/webhook/contratos-crud',
    billing: 'https://n8n.rbgct.cloud/webhook/flujo_Facturacion_SQF',
};

// Generador de IDs
const generateId = (prefix) => {
    return `${prefix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Date.now().toString().slice(-4)}`;
};

export default function FormulariosSQF() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('clientes');
    
    // Estados Globales
    const [clients, setClients] = useState([]);
    const [contracts, setContracts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [toast, setToast] = useState(null);

    // Carga inicial de datos desde n8n
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [clientsRes, contractsRes] = await Promise.all([
                fetch(N8N_WEBHOOKS.client, { headers: { 'Accept': 'application/json' } }).catch(() => null),
                fetch(N8N_WEBHOOKS.contract, { headers: { 'Accept': 'application/json' } }).catch(() => null)
            ]);

            if (clientsRes && clientsRes.ok) {
                const clientsData = await clientsRes.json();
                if (Array.isArray(clientsData)) setClients(clientsData);
            }
            if (contractsRes && contractsRes.ok) {
                const contractsData = await contractsRes.json();
                if (Array.isArray(contractsData)) setContracts(contractsData);
            }
        } catch (error) {
            console.error("Error cargando datos de n8n:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const showMessage = (msg, type = 'success') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    // =====================================================================
    // MANEJADORES DE ENVÍO (Sustituyen a app.js)
    // =====================================================================
    const handleClientSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('id', generateId('CLI'));
        formData.append('createdAt', new Date().toISOString());
        formData.append('status', 'Pendiente de revisión');

        try {
            await fetch(N8N_WEBHOOKS.client, { method: 'POST', mode: 'no-cors', body: formData });
            showMessage('Cliente registrado exitosamente en n8n.');
            form.reset();
            loadData();
        } catch (err) {
            showMessage('Error al guardar el cliente.', 'error');
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
            showMessage('Contrato registrado exitosamente en n8n.');
            form.reset();
            loadData();
        } catch (err) {
            showMessage('Error al guardar el contrato.', 'error');
        }
    };

    const handleBillingSubmit = async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        formData.append('id', generateId('BIL'));
        formData.append('tipoSolicitud', 'Facturación');
        formData.append('createdAt', new Date().toISOString());

        try {
            await fetch(N8N_WEBHOOKS.billing, { method: 'POST', mode: 'no-cors', body: formData });
            showMessage('Solicitud de facturación enviada a n8n.');
            form.reset();
        } catch (err) {
            showMessage('Error al enviar la facturación.', 'error');
        }
    };

    // =====================================================================
    // RENDERIZADO DE PESTAÑAS
    // =====================================================================
    
    // 1. PESTAÑA CLIENTES
    const renderClientes = () => (
        <div className="space-y-8 animate-fade-in">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Cliente</h2>
                    <p className="text-sm text-slate-500">Ingresa los datos fiscales y de contacto.</p>
                </div>
                
                <form onSubmit={handleClientSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-2">Tipo de Contribuyente *</label>
                            <div className="flex gap-4">
                                <label className="flex-1 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-all">
                                    <input type="radio" name="clientType" value="juridica" defaultChecked className="hidden peer" />
                                    <div className="peer-checked:text-blue-800">
                                        <div className="font-bold">Persona Jurídica</div>
                                        <div className="text-xs text-slate-500">NIT de empresa</div>
                                    </div>
                                </label>
                                <label className="flex-1 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-blue-500 hover:bg-slate-50 transition-all">
                                    <input type="radio" name="clientType" value="natural" className="hidden peer" />
                                    <div className="peer-checked:text-blue-800">
                                        <div className="font-bold">Persona Natural</div>
                                        <div className="text-xs text-slate-500">Cédula de ciudadanía</div>
                                    </div>
                                </label>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">NIT Empresa / Documento *</label>
                            <input type="text" name="document" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" placeholder="Ej: 900.123.456-7" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre o Razón Social *</label>
                            <input type="text" name="name" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Contacto de Pagos *</label>
                            <input type="text" name="contactName" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo de Facturación *</label>
                            <input type="email" name="email" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Dirección del Cliente *</label>
                            <input type="text" name="address" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-colors" />
                        </div>

                        {/* File Uploads adaptados al estilo intranet */}
                        <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                                <label className="cursor-pointer block">
                                    <span className="font-bold text-blue-800 text-sm block mb-1">Subir RUT *</span>
                                    <span className="text-xs text-slate-500 block mb-3">PDF, JPG, PNG - Max 10MB</span>
                                    <input type="file" name="rutFile" required className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-800 hover:file:bg-blue-100" />
                                </label>
                            </div>
                            <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:bg-slate-50 transition-colors">
                                <label className="cursor-pointer block">
                                    <span className="font-bold text-slate-700 text-sm block mb-1">Cámara de Comercio *</span>
                                    <span className="text-xs text-slate-500 block mb-3">PDF, JPG, PNG - Max 10MB</span>
                                    <input type="file" name="camaraFile" required className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" />
                                </label>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" className="bg-blue-800 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
                            Registrar Cliente
                        </button>
                    </div>
                </form>
            </div>

            {/* Listado de Clientes */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-slate-800">Directorio de Clientes ({clients.length})</h3>
                    <button onClick={loadData} className="text-sm text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-2">
                        {isLoading ? 'Sincronizando...' : '⟳ Refrescar'}
                    </button>
                </div>
                <div className="p-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="pb-3 font-semibold">Cliente</th>
                                <th className="pb-3 font-semibold">Documento</th>
                                <th className="pb-3 font-semibold">Correo</th>
                                <th className="pb-3 font-semibold">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            {clients.map((client, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                    <td className="py-4 font-semibold text-slate-800">{client.name}</td>
                                    <td className="py-4">{client.document}</td>
                                    <td className="py-4">{client.email}</td>
                                    <td className="py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${client.status === 'Validado' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                                            {client.status || 'Pendiente'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {clients.length === 0 && !isLoading && (
                                <tr><td colSpan="4" className="text-center py-8 text-slate-500">No hay clientes sincronizados.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // 2. PESTAÑA CONTRATOS
    const renderContratos = () => (
        <div className="space-y-8 animate-fade-in">
            {clients.length === 0 && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3">
                    <span className="text-amber-600 font-bold text-xl">!</span>
                    <div>
                        <h4 className="font-bold text-amber-900 text-sm">No hay clientes disponibles</h4>
                        <p className="text-xs text-amber-700 mt-1">Debes registrar al menos un cliente en la pestaña anterior para poder asignarle un contrato.</p>
                    </div>
                </div>
            )}

            <div className={`bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 ${clients.length === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Contrato</h2>
                    <p className="text-sm text-slate-500">Vincula un contrato a un cliente existente.</p>
                </div>
                
                <form onSubmit={handleContractSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente Vinculado *</label>
                            <select name="clientName" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500 bg-slate-50">
                                <option value="">Selecciona un cliente de la lista...</option>
                                {clients.map((c, i) => <option key={i} value={c.name}>{c.name} - {c.document}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Contrato *</label>
                            <select name="contractType" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500">
                                <option value="Mensual">Mensual (Facturación recurrente fija)</option>
                                <option value="Proyecto">Proyecto (Alcance definido)</option>
                                <option value="Horas trabajadas">Horas Trabajadas</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre del Contrato *</label>
                            <input type="text" name="name" required placeholder="Ej: Auditoría Financiera 2026" className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Valor del Contrato (COP) *</label>
                            <input type="number" name="value" required placeholder="Ej: 5000000" className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Inicio *</label>
                            <input type="date" name="startDate" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Finalización *</label>
                            <input type="date" name="endDate" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Gerente a Cargo *</label>
                            <input type="text" name="manager" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4 border-t border-slate-100">
                        <button type="submit" className="bg-blue-800 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-md">
                            Guardar Contrato
                        </button>
                    </div>
                </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-100 bg-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Contratos Registrados ({contracts.length})</h3>
                </div>
                <div className="p-6 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b-2 border-slate-200 text-slate-500 text-xs uppercase tracking-wider">
                                <th className="pb-3 font-semibold">Contrato</th>
                                <th className="pb-3 font-semibold">Cliente</th>
                                <th className="pb-3 font-semibold">Vigencia</th>
                                <th className="pb-3 font-semibold">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-slate-700">
                            {contracts.map((c, i) => (
                                <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="py-4 font-semibold text-slate-800">{c.name}</td>
                                    <td className="py-4">{c.clientName}</td>
                                    <td className="py-4">{c.startDate} a {c.endDate}</td>
                                    <td className="py-4">
                                        <button onClick={() => setActiveTab('facturacion')} className="bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-800 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors">
                                            Facturar →
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    // 3. PESTAÑA FACTURACIÓN
    const renderFacturacion = () => (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 animate-fade-in">
            <div className="mb-6 border-b border-slate-100 pb-4">
                <h2 className="text-xl font-bold text-slate-800">Solicitud de Facturación / Nota Crédito</h2>
                <p className="text-sm text-slate-500">Envía peticiones directas al área financiera.</p>
            </div>
            
            <form onSubmit={handleBillingSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">¿Qué deseas solicitar? *</label>
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="reqType" value="facturacion" defaultChecked className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-slate-700">Facturación Normal</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" name="reqType" value="nota-credito" className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500" />
                                <span className="text-sm font-medium text-slate-700">Nota Crédito</span>
                            </label>
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Cliente / Razón Social *</label>
                        <input type="text" name="clientName" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Empresa Facturadora *</label>
                        <select name="company" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500">
                            <option value="GCT">Russell Bedford GCT</option>
                            <option value="GLT">GLT</option>
                            <option value="PROFIT">PROFIT</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Valor a Facturar (COP) *</label>
                        <input type="number" name="valor" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Concepto / Motivo *</label>
                        <textarea name="concepto" rows="3" required className="w-full rounded-lg border-slate-300 border p-3 text-sm focus:ring-2 focus:ring-blue-100 focus:border-blue-500"></textarea>
                    </div>
                </div>
                
                <div className="flex justify-end pt-4 border-t border-slate-100">
                    <button type="submit" className="bg-emerald-600 text-white px-8 py-3 rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-md">
                        Enviar a Finanzas
                    </button>
                </div>
            </form>
        </div>
    );

    // =====================================================================
    // ESTRUCTURA PRINCIPAL DE LA VISTA
    // =====================================================================
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
            
            {/* Header adaptado al estilo intranet */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Operaciones SQF</h1>
                    <p className="text-slate-500 mt-1 text-sm">Gestión integral de clientes, contratos y facturación corporativa.</p>
                </div>
                <button onClick={() => navigate('/admin2')} className="inline-flex items-center justify-center px-4 py-2 bg-slate-100 border border-slate-200 text-slate-700 text-sm font-semibold rounded-xl hover:bg-slate-200 transition-colors">
                    ← Volver al Dashboard
                </button>
            </div>

            {/* Pestañas de Navegación con Tailwind */}
            <div className="flex overflow-x-auto space-x-2 mb-8 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 w-fit">
                {[
                    { id: 'clientes', label: '1. Clientes' },
                    { id: 'contratos', label: '2. Contratos' },
                    { id: 'facturacion', label: '3. Facturación' },
                    { id: 'auditor', label: 'Panel Auditor' }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all duration-200 ${
                            activeTab === tab.id
                                ? 'bg-white text-blue-800 shadow-sm border border-slate-200/60'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Renderizado Condicional */}
            <div className="min-h-[50vh]">
                {activeTab === 'clientes' && renderClientes()}
                {activeTab === 'contratos' && renderContratos()}
                {activeTab === 'facturacion' && renderFacturacion()}
                {activeTab === 'auditor' && (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center">
                        <h3 className="text-lg font-bold text-slate-700 mb-2">Panel de Auditoría</h3>
                        <p className="text-slate-500 text-sm">Esta vista mostrará la consolidación de métricas en la próxima versión.</p>
                    </div>  
                )}
            </div>

            {/* Toast Notification Minimalista */}
            {toast && (
                <div className={`fixed bottom-6 right-6 px-6 py-4 rounded-xl shadow-lg font-bold text-sm text-white animate-fade-in-up z-50 ${toast.type === 'error' ? 'bg-red-600' : 'bg-slate-800'}`}>
                    {toast.msg}
                </div>
            )}

        </div>
    );
}