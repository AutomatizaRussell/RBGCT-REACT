import { useState, useEffect } from 'react';
import { Database, AlertCircle, CheckCircle2, Info, Clock, RefreshCw, ExternalLink, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const N8nLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, ERROR, SUCCESS

  const fetchLogs = async () => {
    try {
      setLoading(true);
      let query = supabase
        .schema('rbgct')
        .from('n8n_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (filter !== 'ALL') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error cargando logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Suscripción en tiempo real para alertas nuevas
    const subscription = supabase
      .channel('n8n-realtime-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'rbgct', table: 'n8n_logs' }, (payload) => {
        setLogs(prev => [payload.new, ...prev].slice(0, 50));
      })
      .subscribe();

    return () => { supabase.removeChannel(subscription); };
  }, [filter]);

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* HEADER Y FILTROS */}
      <div className="flex justify-between items-center bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Database size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Monitoreo de n8n</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Estado de Automatizaciones</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
          <FilterButton active={filter === 'ALL'} onClick={() => setFilter('ALL')} label="Todos" />
          <FilterButton active={filter === 'ERROR'} onClick={() => setFilter('ERROR')} label="Errores" color="text-red-600" />
          <FilterButton active={filter === 'SUCCESS'} onClick={() => setFilter('SUCCESS')} label="Exitosos" color="text-emerald-600" />
          <div className="w-px h-6 bg-slate-200 mx-1" />
          <button onClick={fetchLogs} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* LISTA DE LOGS */}
      <div className="space-y-3">
        {loading && logs.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">Sincronizando con n8n...</div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border border-dashed border-slate-200 text-center">
            <Info className="mx-auto mb-4 text-slate-300" size={40} />
            <p className="text-slate-500 font-bold">No hay eventos registrados</p>
          </div>
        ) : (
          logs.map((log) => <LogCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
};

const LogCard = ({ log }) => {
  const isError = log.status === 'ERROR';
  
  return (
    <div className={`bg-white p-5 rounded-[24px] border transition-all hover:shadow-md flex items-center gap-6 ${isError ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}`}>
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isError ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
        {isError ? <AlertCircle size={22} /> : <CheckCircle2 size={22} />}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <h4 className="font-black text-sm text-slate-800 truncate">{log.workflow_name}</h4>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${isError ? 'bg-red-600 text-white' : 'bg-emerald-500 text-white'}`}>
            {log.status}
          </span>
        </div>
        <p className="text-xs text-slate-500 font-medium line-clamp-1">{log.message}</p>
      </div>

      <div className="text-right shrink-0 space-y-2">
        <div className="flex items-center justify-end gap-1.5 text-slate-400 font-bold text-[10px]">
          <Clock size={12} />
          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <button className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors">
          Detalles <ExternalLink size={10} />
        </button>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, label, color }) => (
  <button 
    onClick={onClick}
    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white shadow-sm text-slate-900' : `text-slate-400 hover:text-slate-600 ${color || ''}`
    }`}
  >
    {label}
  </button>
);

export default N8nLogs;