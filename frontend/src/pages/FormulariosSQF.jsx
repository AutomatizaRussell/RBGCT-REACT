import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Users, FileText, Receipt, ShieldCheck,
  ClipboardList, ChevronRight, Clock, AlertCircle,
} from 'lucide-react';

const TABS = [
  {
    id: 'clientes',
    label: 'Gestión de Clientes',
    icon: Users,
    color: 'blue',
    descripcion: 'Registro, actualización y seguimiento de clientes activos e inactivos.',
    acciones: [
      { titulo: 'Nuevo cliente', desc: 'Registrar un cliente en el sistema', estado: 'proximamente' },
      { titulo: 'Actualizar datos', desc: 'Modificar información de un cliente existente', estado: 'proximamente' },
      { titulo: 'Cambiar estado', desc: 'Activar o inactivar un cliente', estado: 'proximamente' },
    ],
  },
  {
    id: 'contratos',
    label: 'Creación de Contratos',
    icon: FileText,
    color: 'emerald',
    descripcion: 'Generación y gestión de contratos de servicios con clientes.',
    acciones: [
      { titulo: 'Nuevo contrato', desc: 'Crear un contrato de servicios', estado: 'proximamente' },
      { titulo: 'Renovación', desc: 'Renovar o prorrogar un contrato vigente', estado: 'proximamente' },
      { titulo: 'Terminar contrato', desc: 'Registrar terminación de un contrato', estado: 'proximamente' },
    ],
  },
  {
    id: 'facturacion',
    label: 'Facturación / Nota Crédito',
    icon: Receipt,
    color: 'amber',
    descripcion: 'Emisión de facturas, notas crédito y seguimiento de pagos.',
    acciones: [
      { titulo: 'Emitir factura', desc: 'Generar factura para un cliente', estado: 'proximamente' },
      { titulo: 'Nota crédito', desc: 'Crear una nota crédito sobre una factura', estado: 'proximamente' },
      { titulo: 'Estado de cuenta', desc: 'Consultar saldo y pagos de un cliente', estado: 'proximamente' },
    ],
  },
  {
    id: 'auditor',
    label: 'Panel Auditor',
    icon: ShieldCheck,
    color: 'violet',
    descripcion: 'Revisión y trazabilidad de operaciones para control interno.',
    acciones: [
      { titulo: 'Log de operaciones', desc: 'Ver historial de acciones realizadas', estado: 'proximamente' },
      { titulo: 'Reporte de inconsistencias', desc: 'Detectar y reportar anomalías', estado: 'proximamente' },
      { titulo: 'Auditoría de contratos', desc: 'Verificar contratos y cláusulas', estado: 'proximamente' },
    ],
  },
];

const COLOR = {
  blue:    { tab: 'bg-blue-600 text-white',   badge: 'bg-blue-50 text-blue-700 border-blue-100',   icon: 'bg-blue-100 text-blue-600',   ring: 'focus:ring-blue-500/20 focus:border-blue-500'   },
  emerald: { tab: 'bg-emerald-600 text-white', badge: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: 'bg-emerald-100 text-emerald-600', ring: 'focus:ring-emerald-500/20 focus:border-emerald-500' },
  amber:   { tab: 'bg-amber-500 text-white',   badge: 'bg-amber-50 text-amber-700 border-amber-100',   icon: 'bg-amber-100 text-amber-600',   ring: 'focus:ring-amber-500/20 focus:border-amber-500'   },
  violet:  { tab: 'bg-violet-600 text-white',  badge: 'bg-violet-50 text-violet-700 border-violet-100',  icon: 'bg-violet-100 text-violet-600',  ring: 'focus:ring-violet-500/20 focus:border-violet-500'  },
};

export default function FormulariosSQF() {
  const [activeTab, setActiveTab] = useState('clientes');
  const navigate = useNavigate();

  const tab = TABS.find(t => t.id === activeTab);
  const c = COLOR[tab.color];
  const Icon = tab.icon;

  return (
    <div className="min-h-screen bg-[#f8fafc]">

      {/* Header */}
      <div className="bg-[#001e33] text-white px-8 py-6 shadow-xl">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <ClipboardList size={18} className="text-blue-300" />
                <span className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">Área de Gerencia</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight">Formularios SQF</h1>
              <p className="text-sm text-white/50 mt-0.5">Sistema de Gestión de Calidad y Facturación</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-xl border border-white/10 text-xs text-white/60">
            <Clock size={12} />
            Acceso restringido — Solo gerentes
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-8">
          {TABS.map(t => {
            const TIcon = t.icon;
            const active = t.id === activeTab;
            const tc = COLOR[t.color];
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all shadow-sm ${
                  active ? tc.tab + ' shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                <TIcon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Panel principal */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">

          {/* Cabecera del panel */}
          <div className="px-8 py-6 border-b border-slate-100 flex items-center gap-4">
            <div className={`p-3 rounded-2xl ${c.icon}`}>
              <Icon size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#001e33]">{tab.label}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{tab.descripcion}</p>
            </div>
            <span className={`ml-auto flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${c.badge}`}>
              <AlertCircle size={11} />
              En desarrollo
            </span>
          </div>

          {/* Acciones */}
          <div className="p-8 grid gap-4">
            {tab.acciones.map((a, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors cursor-default"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black ${c.icon}`}>
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-[#001e33]">{a.titulo}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{a.desc}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 bg-slate-200 text-slate-500 rounded-lg text-[10px] font-bold uppercase tracking-wide">
                    Próximamente
                  </span>
                  <ChevronRight size={16} className="text-slate-300" />
                </div>
              </div>
            ))}
          </div>

          {/* Footer informativo */}
          <div className="px-8 py-5 bg-slate-50 border-t border-slate-100">
            <p className="text-xs text-slate-400 text-center">
              Los formularios de esta sección están en construcción. Contacta al equipo de desarrollo para más información.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
