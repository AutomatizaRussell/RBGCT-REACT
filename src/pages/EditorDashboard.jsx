import { useState } from 'react'; 
import { EditorSidebar } from '../components/layout/EditorSidebar'; // Importación correcta
import { useLocation, Outlet } from 'react-router-dom'; // Importamos Outlet
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  BarChart3, 
  Send,
  Eye
} from 'lucide-react';

const EditorDashboard = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const location = useLocation();

  const renderContent = () => {
    // Si la ruta es exactamente /editor, mostramos el dashboard
    // Si es /editor/biblioteca o algo más, mostramos el Outlet
    if (location.pathname === '/editor' || location.pathname === '/editor/') {
      return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
          {/* Métricas Editoriales */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <StatCard label="Artículos Pendientes" value="12" icon={<Clock size={18}/>} subtext="3 requieren revisión urgente" color="text-amber-600" />
            <StatCard label="Publicados hoy" value="08" icon={<CheckCircle size={18} className="text-emerald-600"/>} subtext="+2 que ayer" color="text-emerald-600" />
            <StatCard label="Vistas Totales" value="14.2k" icon={<Eye size={18}/>} subtext="Tendencia alcista" />
            <StatCard label="Tasa de Rechazo" value="1.5%" icon={<AlertCircle size={18}/>} subtext="Calidad de contenido óptima" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Revisión */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-100">
                <h3 className="font-bold text-lg text-[#001e33]">Cola de Redacción</h3>
                <button className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-[#001e33] transition-colors">Ver Todo el Flujo</button>
              </div>
              <div className="space-y-1">
                <ContentRow title="Nuevas tendencias en React 2026" author="Marcos Vera" status="Pendiente" time="Hace 10 min" />
                <ContentRow title="Guía de Tailwind v4: Novedades" author="Lucía Soler" status="En Revisión" time="Hace 45 min" />
                <ContentRow title="Optimización de imágenes con IA" author="Kevin Castro" status="Corregido" time="Hace 2 horas" />
              </div>
            </div>

            {/* Acciones Rápidas */}
            <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-100 rounded-xl"><BarChart3 size={20} /></div>
                 <h3 className="font-bold text-[#001e33]">Herramientas</h3>
              </div>
              <div className="space-y-3">
                <ActionButton label="Publicar Programados" icon={<Send size={14}/>} primary />
                <ActionButton label="Reporte Semanal" icon={<FileText size={14}/>} />
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Para cualquier otra sub-ruta (/editor/biblioteca, /editor/perfil)
    return <Outlet />;
  };

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans antialiased text-[#001e33]">
      {/* Corregido: Usamos el nombre correcto del componente importado */}
      <EditorSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-100 flex items-center justify-between px-10 shadow-sm relative z-10">
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Editor Workspace</p>
            <h2 className="text-xl font-black text-[#001e33] tracking-tight">
              {location.pathname === '/editor' ? 'Panel de Edición' : 
               location.pathname.includes('biblioteca') ? 'Biblioteca de Medios' : 'Mi Perfil'}
            </h2>
          </div>
        </header>

        <div className="p-10 overflow-auto flex-1">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

// --- COMPONENTES AUXILIARES (SE MANTIENEN IGUAL) ---

const StatCard = ({ label, value, icon, subtext, color = "text-[#001e33]" }) => (
  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 hover:border-slate-300 transition-all duration-300">
    <div className="flex-shrink-0 p-3 bg-slate-50 rounded-xl border border-slate-100 text-[#001e33]">{icon}</div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className={`text-2xl font-black tracking-tight ${color} leading-none my-1`}>{value}</p>
      <p className="text-[10px] text-slate-400 font-medium truncate">{subtext}</p>
    </div>
  </div>
);



const ContentRow = ({ title, author, status, time }) => (
  <div className="flex items-center justify-between py-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-3 rounded-2xl transition-colors">
    <div className="flex items-center gap-4">
      <div className="w-10 h-10 bg-[#001e33] text-white rounded-xl flex items-center justify-center">
        <FileText size={18} />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{title}</p>
        <p className="text-[10px] text-slate-400 font-bold uppercase">Autor: {author}</p>
      </div>
    </div>
    <div className="text-right">
      <p className={`text-[10px] font-bold uppercase ${
        status === 'Pendiente' ? 'text-amber-500' : status === 'En Revisión' ? 'text-blue-500' : 'text-emerald-600'
      }`}>{status}</p>
      <p className="text-[10px] text-slate-400 font-medium">{time}</p>
    </div>
  </div>
);

const ActionButton = ({ label, icon, primary }) => (
  <button className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
    primary ? 'bg-[#001e33] text-white hover:bg-slate-800' : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
  }`}>
    {icon} {label}
  </button>
);

export default EditorDashboard;