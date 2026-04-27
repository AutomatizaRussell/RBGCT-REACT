import React, { useState, useEffect } from 'react';
import { 
  Megaphone, 
  CalendarDays, 
  UserCircle, 
  RefreshCw, 
  AlertCircle,
  Pin,
  Bell,
  ChevronRight,
  X
} from 'lucide-react';

const ComunicadosInternos = () => {
  const [comunicados, setComunicados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [comunicadoSeleccionado, setComunicadoSeleccionado] = useState(null);

  // Comunicados de ejemplo (luego se cargarán de la BD)
  const comunicadosEjemplo = [
    {
      id: 1,
      titulo: 'Nuevos Horarios de Verano 2026',
      contenido: 'A partir del 1 de abril, los horarios de verano entrarán en vigor. El horario será de lunes a viernes de 7:00 AM a 4:00 PM con una hora de almuerzo. Este horario se mantendrá hasta el 30 de junio.\n\nPor favor ajusten sus agendas y planifiquen sus actividades considerando este cambio.',
      autor: 'Dirección de Recursos Humanos',
      fecha_publicacion: '2026-03-25',
      categoria: 'Importante',
      prioridad: 'alta',
      fijado: true
    },
    {
      id: 2,
      titulo: 'Capacitación: Nueva Plataforma de Gestión',
      contenido: 'Invitamos a todo el personal a participar en la capacitación sobre la nueva plataforma de gestión de proyectos. La sesión se realizará el próximo martes 8 de abril a las 2:00 PM en el auditorio principal.\n\nTemas a cubrir:\n- Navegación básica\n- Creación de proyectos\n- Asignación de tareas\n- Reportes y métricas',
      autor: 'Departamento de TI',
      fecha_publicacion: '2026-03-20',
      categoria: 'Capacitación',
      prioridad: 'media',
      fijado: false
    },
    {
      id: 3,
      titulo: 'Cierre Mensual - Recordatorio',
      contenido: 'Recordamos a todos los colaboradores del área contable que el cierre mensual de marzo debe completarse antes del 5 de abril. Por favor verifiquen que toda la documentación esté al día.\n\nCualquier duda contactar a tesorería.',
      autor: 'Tesorería GCT',
      fecha_publicacion: '2026-03-28',
      categoria: 'Operativo',
      prioridad: 'alta',
      fijado: false
    },
    {
      id: 4,
      titulo: 'Celebración Día del Trabajo',
      contenido: 'El próximo 1 de mayo celebraremos el Día del Trabajo con un almuerzo especial para todo el personal.\n\nDetalles:\n- Hora: 12:30 PM\n- Lugar: Zona de cafetería\n- Dress code: Casual\n\n¡Los esperamos!',
      autor: 'Comité de Bienestar',
      fecha_publicacion: '2026-03-15',
      categoria: 'Bienestar',
      prioridad: 'baja',
      fijado: false
    },
    {
      id: 5,
      titulo: 'Actualización de Políticas de Seguridad',
      contenido: 'Se han actualizado las políticas de seguridad de la información. Todos los colaboradores deben leer y firmar el documento actualizado antes del 15 de abril.\n\nEl documento está disponible en la sección de Manuales de Cargo.',
      autor: 'Seguridad de la Información',
      fecha_publicacion: '2026-03-10',
      categoria: 'Seguridad',
      prioridad: 'alta',
      fijado: true
    }
  ];

  useEffect(() => {
    fetchComunicados();
  }, []);

  const fetchComunicados = async () => {
    try {
      setLoading(true);
      setError(null);

      // Por ahora usamos datos de ejemplo
      // TODO: Conectar con tabla comunicados_internos cuando se cree
      /*
      const { data, error: supabaseError } = await supabase
        .schema('rbgct')
        .from('comunicados_internos')
        .select('*')
        .order('fijado', { ascending: false })
        .order('fecha_publicacion', { ascending: false });

      if (supabaseError) throw supabaseError;
      setComunicados(data || []);
      */
      
      // Simulación de carga
      setTimeout(() => {
        setComunicados(comunicadosEjemplo);
        setLoading(false);
      }, 800);

    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar los comunicados');
      setLoading(false);
    }
  };

  const formatearFecha = (fechaStr) => {
    const fecha = new Date(fechaStr);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    if (fecha.toDateString() === hoy.toDateString()) {
      return 'Hoy';
    } else if (fecha.toDateString() === ayer.toDateString()) {
      return 'Ayer';
    } else {
      return fecha.toLocaleDateString('es-ES', { 
        day: 'numeric', 
        month: 'short',
        year: fecha.getFullYear() !== hoy.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  const getColorPrioridad = (prioridad) => {
    switch (prioridad) {
      case 'alta': return 'bg-red-50 text-red-600 border-red-200';
      case 'media': return 'bg-amber-50 text-amber-600 border-amber-200';
      case 'baja': return 'bg-blue-50 text-blue-600 border-blue-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw size={24} className="text-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Cargando comunicados...</p>
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
            onClick={fetchComunicados}
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
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
            <Megaphone size={20} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#001e33]">Comunicados Internos</h3>
            <p className="text-xs text-slate-500">
              {comunicados.filter(c => !c.leido).length} comunicados sin leer
            </p>
          </div>
        </div>
        <button
          onClick={fetchComunicados}
          className="flex items-center gap-2 text-[10px] font-bold text-slate-600 hover:text-indigo-600 uppercase transition-colors"
        >
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Lista de Comunicados */}
      <div className="space-y-3">
        {comunicados.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-12 shadow-sm text-center">
            <Bell size={48} className="text-slate-300 mx-auto mb-4" />
            <h4 className="text-lg font-bold text-[#001e33] mb-2">No hay comunicados</h4>
            <p className="text-sm text-slate-500">No hay comunicados internos en este momento.</p>
          </div>
        ) : (
          comunicados.map((comunicado) => (
            <div 
              key={comunicado.id}
              onClick={() => setComunicadoSeleccionado(comunicado)}
              className={`bg-white rounded-2xl border p-4 cursor-pointer hover:shadow-md transition-all ${
                comunicado.fijado 
                  ? 'border-indigo-200 bg-indigo-50/30' 
                  : 'border-slate-100'
              }`}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 pt-1">
                  {comunicado.fijado ? (
                    <Pin size={16} className="text-indigo-600" />
                  ) : (
                    <div className={`w-2 h-2 rounded-full ${
                      comunicado.prioridad === 'alta' ? 'bg-red-500' :
                      comunicado.prioridad === 'media' ? 'bg-amber-500' :
                      'bg-blue-500'
                    }`} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h4 className="text-sm font-bold text-[#001e33] line-clamp-1">
                      {comunicado.titulo}
                    </h4>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getColorPrioridad(comunicado.prioridad)}`}>
                      {comunicado.categoria}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-2 mb-2">
                    {comunicado.contenido}
                  </p>
                  <div className="flex items-center gap-4 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <UserCircle size={12} />
                      {comunicado.autor}
                    </span>
                    <span className="flex items-center gap-1">
                      <CalendarDays size={12} />
                      {formatearFecha(comunicado.fecha_publicacion)}
                    </span>
                  </div>
                </div>
                <div className="flex-shrink-0 flex items-center">
                  <ChevronRight size={16} className="text-slate-400" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de detalle */}
      {comunicadoSeleccionado && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setComunicadoSeleccionado(null)}
        >
          <div 
            className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {comunicadoSeleccionado.fijado && (
                  <Pin size={16} className="text-indigo-600" />
                )}
                <span className={`px-2 py-1 rounded text-[10px] font-bold border ${getColorPrioridad(comunicadoSeleccionado.prioridad)}`}>
                  {comunicadoSeleccionado.categoria}
                </span>
              </div>
              <button 
                onClick={() => setComunicadoSeleccionado(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <h2 className="text-xl font-bold text-[#001e33]">
                {comunicadoSeleccionado.titulo}
              </h2>
              
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <UserCircle size={14} />
                  {comunicadoSeleccionado.autor}
                </span>
                <span className="flex items-center gap-1">
                  <CalendarDays size={14} />
                  Publicado: {formatearFecha(comunicadoSeleccionado.fecha_publicacion)}
                </span>
              </div>

              <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-line">
                {comunicadoSeleccionado.contenido}
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-50 border-t border-slate-100 px-6 py-4 flex justify-end">
              <button
                onClick={() => setComunicadoSeleccionado(null)}
                className="px-4 py-2 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComunicadosInternos;
