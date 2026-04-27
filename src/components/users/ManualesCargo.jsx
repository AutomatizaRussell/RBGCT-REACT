import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  FileText,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Search,
  CalendarDays
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const ManualesCargo = () => {
  const { empleadoData } = useAuth();
  const [manuales, setManuales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busqueda, setBusqueda] = useState('');

  // Manuales de ejemplo (luego se cargarán de la BD)
  const manualesEjemplo = [
    {
      id: 1,
      titulo: 'Manual de Procedimientos - Revisoría Fiscal',
      descripcion: 'Procedimientos estándar para revisión fiscal y auditoría',
      categoria: 'Procedimientos',
      area: 'Revisoría Fiscal',
      fecha_actualizacion: '2026-03-15',
      archivo_url: '#',
      tamano: '2.5 MB'
    },
    {
      id: 2,
      titulo: 'Manual de Inducción - Nuevos Colaboradores',
      descripcion: 'Guía completa para la integración de nuevos empleados',
      categoria: 'Inducción',
      area: 'Todos',
      fecha_actualizacion: '2026-02-20',
      archivo_url: '#',
      tamano: '5.1 MB'
    },
    {
      id: 3,
      titulo: 'Políticas de Seguridad de la Información',
      descripcion: 'Normas y procedimientos de seguridad informática',
      categoria: 'Seguridad',
      area: 'Todos',
      fecha_actualizacion: '2026-01-10',
      archivo_url: '#',
      tamano: '1.8 MB'
    },
    {
      id: 4,
      titulo: 'Manual de Contabilidad - Procesos de Cierre',
      descripcion: 'Procedimientos para cierre mensual y anual',
      categoria: 'Procedimientos',
      area: 'Contabilidad',
      fecha_actualizacion: '2026-03-01',
      archivo_url: '#',
      tamano: '3.2 MB'
    },
    {
      id: 5,
      titulo: 'Código de Ética y Conducta',
      descripcion: 'Lineamientos éticos y de comportamiento organizacional',
      categoria: 'Legal',
      area: 'Todos',
      fecha_actualizacion: '2026-01-05',
      archivo_url: '#',
      tamano: '890 KB'
    }
  ];

  useEffect(() => {
    fetchManuales();
  }, []);

  const fetchManuales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Por ahora usamos datos de ejemplo
      // TODO: Conectar con tabla manuales_cargo cuando se cree
      /*
      const { data, error: supabaseError } = await supabase
        .schema('rbgct')
        .from('manuales_cargo')
        .select('*')
        .order('fecha_actualizacion', { ascending: false });

      if (supabaseError) throw supabaseError;
      setManuales(data || []);
      */
      
      // Simulación de carga
      setTimeout(() => {
        setManuales(manualesEjemplo);
        setLoading(false);
      }, 800);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar los manuales');
      setLoading(false);
    }
  };

  const manualesFiltrados = manuales.filter(manual => 
    manual.titulo.toLowerCase().includes(busqueda.toLowerCase()) ||
    manual.descripcion.toLowerCase().includes(busqueda.toLowerCase()) ||
    manual.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Cargando manuales...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <AlertCircle size={24} className="text-red-500" />
          <p className="text-sm text-red-600">{error}</p>
          <button 
            onClick={fetchManuales}
            className="text-xs font-bold text-indigo-600 uppercase hover:underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#001e33]">Manuales de Cargo</h3>
          <p className="text-xs text-slate-500 mt-1">
            Documentación y procedimientos de la empresa
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchManuales}
            className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-indigo-600 uppercase transition-colors"
          >
            <RefreshCw size={14} />
            Actualizar
          </button>
        </div>
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar manuales..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Lista de Manuales */}
      <div className="space-y-4">
        {manualesFiltrados.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center">
            <BookOpen size={48} className="text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-[#001e33] mb-2">No se encontraron manuales</h4>
            <p className="text-sm text-slate-500">Intenta con otra búsqueda.</p>
          </div>
        ) : (
          manualesFiltrados.map((manual) => (
            <div 
              key={manual.id}
              className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                    <FileText size={24} className="text-indigo-600" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-base font-bold text-[#001e33]">{manual.titulo}</h4>
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase">
                      {manual.categoria}
                    </span>
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">
                      {manual.area}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-3">{manual.descripcion}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      Actualizado: {new Date(manual.fecha_actualizacion).toLocaleDateString('es-ES')}
                    </span>
                    <span className="flex items-center gap-1">
                      <Download size={12} />
                      {manual.tamano}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center">
                  <a
                    href={manual.archivo_url}
                    className="flex items-center gap-2 px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink size={14} />
                    Ver
                  </a>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManualesCargo;
