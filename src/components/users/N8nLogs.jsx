import { useState, useEffect, useCallback } from 'react';
import {
  Zap, AlertCircle, CheckCircle2, Info, Clock,
  RefreshCw, Activity, WifiOff, Wifi
} from 'lucide-react';
import { n8nProxyExecutions, getN8nLogs } from '../../lib/db';

// Traduce el nombre del workflow/evento a algo legible
const EVENTO_LABELS = {
  bienvenida_nuevo_usuario: 'Bienvenida — nuevo usuario',
  nuevo_usuario_creado:     'Nuevo usuario creado',
  recuperacion_password:    'Recuperación de contraseña',
  webhook_generico:         'Webhook genérico',
  manual:                   'Ejecución manual',
  webhook:                  'Webhook',
  trigger:                  'Trigger automático',
  schedule:                 'Ejecución programada',
};

const labelEvento = (name, mode) =>
  EVENTO_LABELS[name] || EVENTO_LABELS[mode] || name || '—';

// Convierte ejecución de n8n a formato unificado
const fromN8nExec = (ex) => {
  const ok  = ex.status === 'success';
  const err = ex.status === 'error' || ex.status === 'crashed';
  let msg = '';
  if (ex.startedAt && ex.stoppedAt) {
    const secs = Math.round(
      (new Date(ex.stoppedAt) - new Date(ex.startedAt)) / 1000
    );
    msg = `Duración: ${secs}s`;
  }
  if (ex.mode) msg = msg ? `${msg} · Modo: ${ex.mode}` : `Modo: ${ex.mode}`;
  return {
    id:            `n8n-${ex.id}`,
    workflow_name: ex.workflowData?.name || `Workflow #${ex.workflowId || '?'}`,
    status:        ok ? 'SUCCESS' : err ? 'ERROR' : 'RUNNING',
    message:       msg || ex.status || '—',
    tipo_evento:   ex.mode,
    created_at:    ex.startedAt,
    source:        'n8n',
  };
};

// Convierte log de Django a formato unificado
const fromDjangoLog = (log) => ({
  id:            `dj-${log.id}`,
  workflow_name: log.workflow_name,
  status:        log.status,
  message:       log.message || '—',
  tipo_evento:   log.tipo_evento,
  created_at:    log.created_at,
  destinatario:  log.destinatario,
  source:        'django',
});

const N8nLogs = () => {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('ALL');
  const [errorMsg, setErrorMsg] = useState(null);
  const [source, setSource]     = useState('n8n'); // 'n8n' | 'django'

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      if (source === 'n8n') {
        const data    = await n8nProxyExecutions(filter, 50);
        const execs   = Array.isArray(data?.data) ? data.data
                      : Array.isArray(data) ? data : [];
        setLogs(execs.map(fromN8nExec));
      } else {
        const data    = await getN8nLogs(filter, 50);
        const results = Array.isArray(data) ? data : (data?.results || []);
        setLogs(results.map(fromDjangoLog));
      }
    } catch (err) {
      console.error('N8nLogs:', err);
      setErrorMsg(err.message || 'Error al cargar los logs');
    } finally {
      setLoading(false);
    }
  }, [filter, source]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Auto-refresh 30s
  useEffect(() => {
    const t = setInterval(fetchLogs, 30000);
    return () => clearInterval(t);
  }, [fetchLogs]);

  const ok  = logs.filter(l => l.status === 'SUCCESS').length;
  const err = logs.filter(l => l.status === 'ERROR').length;

  return (
    <div className="animate-in fade-in duration-500 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white p-6 rounded-[28px] border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Monitoreo de n8n</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
              {logs.length > 0
                ? `${logs.length} eventos · ${ok} exitosos · ${err} con error`
                : 'Historial de automatizaciones'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de fuente */}
          <div className="flex items-center bg-slate-50 p-1 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest">
            <button
              onClick={() => setSource('n8n')}
              className={`px-3 py-1.5 rounded-lg transition-all ${source === 'n8n' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span className="flex items-center gap-1"><Wifi size={11}/> n8n directo</span>
            </button>
            <button
              onClick={() => setSource('django')}
              className={`px-3 py-1.5 rounded-lg transition-all ${source === 'django' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <span className="flex items-center gap-1"><Activity size={11}/> Enviados</span>
            </button>
          </div>

          {/* Filtro de estado */}
          <div className="flex items-center bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
            <FilterBtn active={filter === 'ALL'}     onClick={() => setFilter('ALL')}     label="Todos" />
            <FilterBtn active={filter === 'ERROR'}   onClick={() => setFilter('ERROR')}   label="Errores"  color="text-red-600" />
            <FilterBtn active={filter === 'SUCCESS'} onClick={() => setFilter('SUCCESS')} label="Exitosos" color="text-emerald-600" />
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <button onClick={fetchLogs} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-900">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Descripción de fuente ── */}
      <div className={`px-5 py-3 rounded-2xl text-xs font-medium flex items-center gap-2 ${
        source === 'n8n' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-slate-50 text-slate-600 border border-slate-100'
      }`}>
        {source === 'n8n'
          ? <><Wifi size={13}/> Mostrando ejecuciones reales de n8n en <strong>n8n.rbgct.cloud</strong> (via proxy del backend)</>
          : <><Activity size={13}/> Mostrando webhooks que Django envió a n8n (registros internos)</>
        }
      </div>

      {/* ── KPIs ── */}
      {logs.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total',      count: logs.length, color: 'text-slate-700',   bg: 'bg-slate-50',   icon: <Activity size={15}/> },
            { label: 'Exitosos',   count: ok,          color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle2 size={15}/> },
            { label: 'Con error',  count: err,         color: 'text-red-600',     bg: 'bg-red-50',     icon: <AlertCircle size={15}/> },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm flex items-center gap-3">
              <div className={`p-2 rounded-xl ${s.bg} ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{s.label}</p>
                <p className={`text-2xl font-black ${s.color} leading-none`}>{s.count}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Lista ── */}
      <div className="space-y-3">
        {errorMsg ? (
          <ErrorState message={errorMsg} source={source} onRetry={fetchLogs} />
        ) : loading && logs.length === 0 ? (
          <div className="p-20 text-center text-slate-400 font-bold uppercase text-[10px] tracking-[0.2em]">
            {source === 'n8n' ? 'Consultando n8n...' : 'Cargando registros...'}
          </div>
        ) : logs.length === 0 ? (
          <div className="bg-white p-20 rounded-[32px] border border-dashed border-slate-200 text-center">
            <Info className="mx-auto mb-4 text-slate-300" size={40} />
            <p className="text-slate-700 font-bold text-sm mb-1">Sin registros</p>
            <p className="text-slate-400 text-xs max-w-xs mx-auto">
              {source === 'n8n'
                ? 'No hay ejecuciones de workflows en n8n todavía, o el filtro no tiene coincidencias.'
                : 'Django aún no ha enviado webhooks a n8n. Ocurre al crear usuarios o recuperar contraseñas.'}
            </p>
          </div>
        ) : (
          logs.map(log => <LogCard key={log.id} log={log} />)
        )}
      </div>
    </div>
  );
};

// ── Sub-componentes ───────────────────────────────────────────────────────────

const ErrorState = ({ message, source, onRetry }) => (
  <div className="bg-white p-16 rounded-[32px] border border-dashed border-slate-200 text-center">
    <WifiOff className="mx-auto mb-4 text-red-300" size={40} />
    <p className="text-slate-700 font-bold text-sm mb-1">
      {source === 'n8n' ? 'No se pudo consultar n8n' : 'Error cargando registros'}
    </p>
    <p className="text-slate-400 text-xs mb-4 max-w-sm mx-auto">{message}</p>
    <button onClick={onRetry} className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors">
      <RefreshCw size={12} /> Reintentar
    </button>
  </div>
);

const LogCard = ({ log }) => {
  const isError   = log.status === 'ERROR';
  const isRunning = log.status === 'RUNNING';
  const wfLabel   = labelEvento(log.workflow_name, log.tipo_evento);

  return (
    <div className={`bg-white p-5 rounded-[24px] border transition-all hover:shadow-md flex items-center gap-5 ${
      isError   ? 'border-red-100 bg-red-50/10' :
      isRunning ? 'border-blue-100 bg-blue-50/10' : 'border-slate-100'
    }`}>
      {/* Ícono */}
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
        isError   ? 'bg-red-100 text-red-600' :
        isRunning ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
      }`}>
        {isError   ? <AlertCircle size={20} /> :
         isRunning ? <Activity size={20} className="animate-pulse" /> :
                     <CheckCircle2 size={20} />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <h4 className="font-black text-sm text-slate-800 truncate">{wfLabel}</h4>
          <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
            isError   ? 'bg-red-600 text-white' :
            isRunning ? 'bg-blue-500 text-white' : 'bg-emerald-500 text-white'
          }`}>
            {log.status}
          </span>
          {log.tipo_evento && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
              {log.tipo_evento}
            </span>
          )}
          {log.source === 'django' && (
            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded bg-indigo-50 text-indigo-500">
              enviado por app
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 font-medium line-clamp-1">{log.message}</p>
        {log.destinatario && (
          <p className="text-[10px] text-slate-400 mt-0.5">{log.destinatario}</p>
        )}
      </div>

      {/* Hora */}
      <div className="text-right shrink-0">
        <div className="flex items-center justify-end gap-1 text-slate-400 font-bold text-[10px]">
          <Clock size={11} />
          {log.created_at
            ? new Date(log.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
            : '--:--'}
        </div>
        <p className="text-[9px] text-slate-400 mt-1">
          {log.created_at
            ? new Date(log.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
            : ''}
        </p>
      </div>
    </div>
  );
};

const FilterBtn = ({ active, onClick, label, color }) => (
  <button
    onClick={onClick}
    className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
      active ? 'bg-white shadow-sm text-slate-900' : `text-slate-400 hover:text-slate-600 ${color || ''}`
    }`}
  >
    {label}
  </button>
);

export default N8nLogs;
