import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// =====================================================================
// SUB-COMPONENTE: PESTAÑA DE CLIENTES
// =====================================================================
const TabClientes = ({ clients, setClients, isLoading }) => {
    const [formData, setFormData] = useState({
        clientType: 'juridica',
        name: '',
        document: '',
        email: '',
        phone: '',
        address: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        
        if (!formData.name || !formData.document) {
            alert("Por favor, completa el nombre y el documento.");
            return;
        }

        const nuevoCliente = {
            id: `CLI-TEMP-${Date.now()}`,
            ...formData,
            createdAt: new Date().toISOString(),
            source: 'local'
        };

        setClients([nuevoCliente, ...clients]);
        
        // TODO: En el paso final, aquí enviaremos el POST para guardar.
        alert("Cliente registrado exitosamente en la plataforma.");
        
        setFormData({
            clientType: 'juridica', name: '', document: '', email: '', phone: '', address: ''
        });
    };

    return (
        <div className="space-y-8">
            {/* Formulario de Creación */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h2 className="text-xl font-bold text-slate-800">Registrar Nuevo Cliente</h2>
                    <p className="text-sm text-slate-500">Ingresa los datos para habilitar contratos y facturación.</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de Cliente *</label>
                            <select 
                                name="clientType" 
                                value={formData.clientType} 
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="juridica">Persona Jurídica (Empresa)</option>
                                <option value="natural">Persona Natural</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Nombre / Razón Social *</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleChange}
                                required
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej. Russell Bedford GCT"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">NIT / Cédula *</label>
                            <input 
                                type="text" 
                                name="document" 
                                value={formData.document} 
                                onChange={handleChange}
                                required
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej. 900123456-7"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Correo Electrónico</label>
                            <input 
                                type="email" 
                                name="email" 
                                value={formData.email} 
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="contacto@empresa.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                            <input 
                                type="text" 
                                name="phone" 
                                value={formData.phone} 
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Dirección Física</label>
                            <input 
                                type="text" 
                                name="address" 
                                value={formData.address} 
                                onChange={handleChange}
                                className="w-full rounded-lg border-slate-300 border p-2.5 text-sm focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                        <button 
                            type="submit" 
                            className="bg-blue-800 text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors shadow-sm"
                        >
                            Guardar Cliente
                        </button>
                    </div>
                </form>
            </div>

            {/* Listado de Clientes con estado de Carga */}
            <div>
                <h3 className="text-lg font-bold text-slate-800 mb-4">Directorio de Clientes ({clients.length})</h3>
                
                {isLoading ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <div className="inline-block animate-spin w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                        <p className="text-slate-500 font-medium">Sincronizando con n8n...</p>
                    </div>
                ) : clients.length === 0 ? (
                    <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl p-8 text-center">
                        <p className="text-slate-500">No hay clientes registrados aún.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {clients.map((client, index) => (
                            <div key={client.id || index} className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-slate-800 text-base line-clamp-1" title={client.name}>
                                        {client.name}
                                    </h4>
                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${client.source === 'historico' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-700'}`}>
                                        {client.clientType || 'N/A'}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-600 space-y-1">
                                    <p><span className="font-medium">Doc:</span> {client.document}</p>
                                    <p className="truncate" title={client.email}><span className="font-medium">Email:</span> {client.email || 'N/A'}</p>
                                    <p><span className="font-medium">Tel:</span> {client.phone || 'N/A'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

// =====================================================================
// PLACEHOLDERS
// =====================================================================
const TabContratos = () => <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">Formulario de Contratos (Siguiente paso...)</div>;
const TabFacturacion = () => <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">Módulo de Facturación (Siguiente paso...)</div>;
const TabAuditor = () => <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">Panel Auditor (Siguiente paso...)</div>;


// =====================================================================
// COMPONENTE PRINCIPAL
// =====================================================================
export default function FormulariosSQF() {
    const [activeTab, setActiveTab] = useState('clientes');
    const navigate = useNavigate();

    // Estados globales
    const [clients, setClients] = useState([]);
    const [isLoadingClients, setIsLoadingClients] = useState(true);
    const [contracts, setContracts] = useState([]);
    const [billingRequests, setBillingRequests] = useState([]);

    // Petición dinámica a n8n (Reemplaza el archivo JSON estático)
    useEffect(() => {
        const fetchClientsFromN8n = async () => {
            try {
                // Endpoint original de tu app.js
                const response = await fetch('https://n8n.rbgct.cloud/webhook/clientes-crud');
                
                if (response.ok) {
                    const data = await response.json();
                    setClients(data);
                } else {
                    console.error('Error en la respuesta de n8n:', response.status);
                }
            } catch (error) {
                console.error('Error de red intentando conectar con n8n:', error);
            } finally {
                setIsLoadingClients(false);
            }
        };

        fetchClientsFromN8n();
    }, []);

    const tabs = [
        { id: 'clientes', label: 'Gestión de Clientes' },
        { id: 'contratos', label: 'Creación de Contratos' },
        { id: 'facturacion', label: 'Facturación / Nota Crédito' },
        { id: 'auditor', label: 'Panel Auditor' },
    ];

    return (
        <div className="container mx-auto px-4 md:px-8 py-8 max-w-7xl">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        Módulo de Operaciones SQF
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Gestión de clientes, contratos e independencia de facturación.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin2')}
                    className="mt-4 md:mt-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-150"
                >
                    Volver al Dashboard
                </button>
            </div>

            {/* Pestañas de Navegación */}
            <div className="mb-8 border-b border-slate-200">
                <nav className="flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 font-medium text-sm transition-all duration-200 border-b-2 whitespace-nowrap ${
                                activeTab === tab.id
                                    ? 'border-blue-700 text-blue-800'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Renderizado de la Pestaña Activa */}
            <div className="transition-opacity duration-200">
                {activeTab === 'clientes' && (
                    <TabClientes 
                        clients={clients} 
                        setClients={setClients} 
                        isLoading={isLoadingClients} 
                    />
                )}
                {activeTab === 'contratos' && <TabContratos />}
                {activeTab === 'facturacion' && <TabFacturacion />}
                {activeTab === 'auditor' && <TabAuditor />}
            </div>
        </div>
    );
}