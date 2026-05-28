import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FormulariosSQF() {
    const [activeTab, setActiveTab] = useState('clientes');
    const navigate = useNavigate();

    const tabs = [
        { id: 'clientes', label: 'Gestión de Clientes' },
        { id: 'contratos', label: 'Creación de Contratos' },
        { id: 'facturacion', label: 'Facturación / Nota Crédito' },
        { id: 'auditor', label: 'Panel Auditor' },
    ];

    return (
        <div className="container mx-auto px-6 py-8">
            {/* Cabecera */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b border-gray-200 pb-6 mb-6">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 tracking-tight">
                        Formularios SQF
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Área exclusiva para Gerentes.
                    </p>
                </div>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-4 md:mt-0 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors duration-150"
                >
                    ← Volver atrás
                </button>
            </div>

            {/* Pestañas de Navegación */}
            <div className="mb-6 border-b border-gray-200">
                <nav className="flex space-x-4" aria-label="Tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-2.5 font-medium text-sm transition-all duration-200 border-b-2 -mb-px ${
                                activeTab === tab.id
                                    ? 'border-blue-700 text-blue-700'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Contenedor donde irán los formularios más adelante */}
            <div className="p-6 bg-white rounded-lg shadow-sm border border-gray-100">
                <p className="text-gray-500">
                    Aquí cargaremos el formulario de: <span className="font-bold text-blue-700">{activeTab}</span>
                </p>
            </div>
        </div>
    );
}