import { useState, useEffect } from 'react';
import { 
  Settings, 
  ShieldCheck, 
  Zap, 
  Database, 
  Save, 
  RefreshCw, 
  Globe, 
  BellRing,
  Check,
  Loader2,
  AlertCircle,
  Wifi,
  WifiOff
} from 'lucide-react';

const SystemSettings = () => {
  const [activeSection, setActiveSection] = useState('general');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [n8nStatus, setN8nStatus] = useState('online');

  // Configuración General
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'Intranet GCT',
    allowedDomain: '@rbcol.co',
    emailNotifications: true,
    maintenanceMode: false
  });

  // Configuración de Seguridad
  const [securitySettings, setSecuritySettings] = useState({
    sessionExpiration: 60,
    require2FA: false,
    passwordMinLength: 8,
    maxLoginAttempts: 5
  });

  // Configuración n8n
  const [n8nSettings, setN8nSettings] = useState({
    webhookLogs: '',
    webhookAlerts: '',
    apiKey: '',
    autoSync: true
  });

  // Configuración Base de Datos
  const [dbSettings, setDbSettings] = useState({
    mainSchema: 'rbgct',
    auditSchema: 'audit_logs',
    backupEnabled: true,
    lastBackup: '2024-04-27 08:00:00'
  });

  // Cargar configuración guardada al iniciar
  useEffect(() => {
    const savedConfig = localStorage.getItem('rbgct_system_config');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        if (parsed.general) setGeneralSettings(parsed.general);
        if (parsed.security) setSecuritySettings(parsed.security);
        if (parsed.n8n) setN8nSettings(parsed.n8n);
        if (parsed.db) setDbSettings(parsed.db);
      } catch (e) {
        console.error('Error loading config:', e);
      }
    }
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    
    // Simular guardado en backend
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Guardar en localStorage
    const config = {
      general: generalSettings,
      security: securitySettings,
      n8n: n8nSettings,
      db: dbSettings,
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('rbgct_system_config', JSON.stringify(config));
    
    setSaving(false);
    setSaveMessage({ type: 'success', text: 'Configuración guardada exitosamente' });
    
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const testN8nConnection = async () => {
    setN8nStatus('testing');
    await new Promise(resolve => setTimeout(resolve, 1000));
    setN8nStatus(n8nSettings.webhookLogs ? 'online' : 'offline');
  };

  const reindexTables = async () => {
    alert('Re-indexación iniciada. Este proceso puede tardar varios minutos.');
  };

  return (
    <div className="animate-in fade-in duration-500 space-y-6">
      {/* HEADER PERSONALIZADO */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex justify-between items-center">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-[#001e33] rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-900/20">
            <Settings size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Ajustes del Sistema</h2>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.2em]">Configuración Global Russell Bedford</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {saveMessage && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm ${
              saveMessage.type === 'success' 
                ? 'bg-emerald-50 text-emerald-700' 
                : 'bg-red-50 text-red-700'
            }`}>
              <Check size={16} />
              {saveMessage.text}
            </div>
          )}
          <button 
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Save size={16} />
            )}
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* MENÚ DE NAVEGACIÓN LATERAL */}
        <div className="space-y-2">
          <NavButton 
            active={activeSection === 'general'} 
            onClick={() => setActiveSection('general')} 
            icon={<Globe size={18} />} 
            label="General" 
          />
          <NavButton 
            active={activeSection === 'security'} 
            onClick={() => setActiveSection('security')} 
            icon={<ShieldCheck size={18} />} 
            label="Seguridad" 
          />
          <NavButton 
            active={activeSection === 'n8n'} 
            onClick={() => setActiveSection('n8n')} 
            icon={<Zap size={18} />} 
            label="Integración n8n" 
          />
          <NavButton 
            active={activeSection === 'db'} 
            onClick={() => setActiveSection('db')} 
            icon={<Database size={18} />} 
            label="Base de Datos" 
          />
        </div>

        {/* ÁREA DE CONTENIDO DINÁMICO */}
        <div className="lg:col-span-3 bg-white rounded-[32px] border border-slate-100 p-10 shadow-sm min-h-[500px]">
          {activeSection === 'general' && <GeneralSettings settings={generalSettings} setSettings={setGeneralSettings} />}
          {activeSection === 'security' && <SecuritySettings settings={securitySettings} setSettings={setSecuritySettings} />}
          {activeSection === 'n8n' && <N8nSettings settings={n8nSettings} setSettings={setN8nSettings} n8nStatus={n8nStatus} testConnection={testN8nConnection} />}
          {activeSection === 'db' && <DatabaseSettings settings={dbSettings} setSettings={setDbSettings} onReindex={reindexTables} />}
        </div>
      </div>
    </div>
  );
};

/* --- SUBCOMPONENTES DE SECCIONES --- */

const GeneralSettings = ({ settings, setSettings }) => (
  <div className="space-y-8">
    <SectionHeader title="Información Corporativa" subtitle="Datos principales de la instancia Russell Bedford" />
    <div className="grid grid-cols-2 gap-6">
      <InputGroup 
        label="Nombre de la Plataforma" 
        placeholder="Intranet GCT"
        value={settings.platformName}
        onChange={(e) => setSettings({...settings, platformName: e.target.value})}
      />
      <InputGroup 
        label="Dominio Permitido" 
        placeholder="@rbcol.co"
        value={settings.allowedDomain}
        onChange={(e) => setSettings({...settings, allowedDomain: e.target.value})}
      />
    </div>
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
      <div>
        <h4 className="font-bold text-slate-800 text-sm">Notificaciones de Alerta</h4>
        <p className="text-xs text-slate-500">Enviar correos automáticos al administrador en fallos críticos.</p>
      </div>
      <Toggle 
        checked={settings.emailNotifications}
        onChange={() => setSettings({...settings, emailNotifications: !settings.emailNotifications})}
      />
    </div>
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
      <div>
        <h4 className="font-bold text-slate-800 text-sm">Modo Mantenimiento</h4>
        <p className="text-xs text-slate-500">Mostrar página de mantenimiento a usuarios no administradores.</p>
      </div>
      <Toggle 
        checked={settings.maintenanceMode}
        onChange={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
      />
    </div>
  </div>
);

const SecuritySettings = ({ settings, setSettings }) => (
  <div className="space-y-8">
    <SectionHeader title="Políticas de Seguridad" subtitle="Gestión de accesos y protección de datos" />
    <div className="space-y-4">
      <InputGroup 
        label="Expiración de Sesión (Minutos)" 
        type="number" 
        placeholder="60"
        value={settings.sessionExpiration}
        onChange={(e) => setSettings({...settings, sessionExpiration: parseInt(e.target.value) || 60})}
      />
      <InputGroup 
        label="Longitud Mínima de Contraseña" 
        type="number" 
        placeholder="8"
        value={settings.passwordMinLength}
        onChange={(e) => setSettings({...settings, passwordMinLength: parseInt(e.target.value) || 8})}
      />
      <InputGroup 
        label="Máximos Intentos de Login" 
        type="number" 
        placeholder="5"
        value={settings.maxLoginAttempts}
        onChange={(e) => setSettings({...settings, maxLoginAttempts: parseInt(e.target.value) || 5})}
      />
      <div className="p-6 border border-red-100 rounded-2xl bg-red-50/30">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-bold text-red-600 text-sm mb-2 flex items-center gap-2">
              <ShieldCheck size={16} /> Autenticación de Dos Factores (2FA)
            </h4>
            <p className="text-xs text-slate-500">Obligar a todos los administradores a usar 2FA para acceder al panel.</p>
          </div>
          <Toggle 
            checked={settings.require2FA}
            onChange={() => setSettings({...settings, require2FA: !settings.require2FA})}
          />
        </div>
        <button className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-white border border-red-200 px-4 py-2 rounded-lg hover:bg-red-600 hover:text-white transition-all">Configurar</button>
      </div>
    </div>
  </div>
);

const N8nSettings = ({ settings, setSettings, n8nStatus, testConnection }) => (
  <div className="space-y-8">
    <SectionHeader title="Conexión n8n" subtitle="Configura los Webhooks y llaves de automatización" />
    <div className="space-y-6">
      <InputGroup 
        label="Webhook de Registro de Logs" 
        placeholder="https://n8n.tu-instancia.com/webhook/..."
        value={settings.webhookLogs}
        onChange={(e) => setSettings({...settings, webhookLogs: e.target.value})}
      />
      <InputGroup 
        label="Webhook de Alertas" 
        placeholder="https://n8n.tu-instancia.com/webhook/alerts..."
        value={settings.webhookAlerts}
        onChange={(e) => setSettings({...settings, webhookAlerts: e.target.value})}
      />
      <InputGroup 
        label="API Key n8n" 
        type="password"
        placeholder="n8n_api_xxxxxxxxxx"
        value={settings.apiKey}
        onChange={(e) => setSettings({...settings, apiKey: e.target.value})}
      />
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
        <div className="flex items-center gap-3">
          {n8nStatus === 'online' ? (
            <Wifi size={18} className="text-emerald-500" />
          ) : n8nStatus === 'offline' ? (
            <WifiOff size={18} className="text-red-500" />
          ) : (
            <Loader2 size={18} className="text-slate-500 animate-spin" />
          )}
          <span className={`text-[10px] font-black uppercase tracking-widest ${
            n8nStatus === 'online' ? 'text-emerald-700' : 
            n8nStatus === 'offline' ? 'text-red-700' : 'text-slate-500'
          }`}>
            {n8nStatus === 'online' ? 'Servicio n8n en línea' : 
             n8nStatus === 'offline' ? 'Servicio n8n desconectado' : 'Probando conexión...'}
          </span>
        </div>
        <button 
          onClick={testConnection}
          className="text-xs font-bold text-[#001e33] hover:bg-slate-100 px-3 py-2 rounded-lg transition-colors"
        >
          Probar conexión
        </button>
      </div>
      <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div>
          <h4 className="font-bold text-slate-800 text-sm">Sincronización Automática</h4>
          <p className="text-xs text-slate-500">Enviar datos automáticamente a n8n.</p>
        </div>
        <Toggle 
          checked={settings.autoSync}
          onChange={() => setSettings({...settings, autoSync: !settings.autoSync})}
        />
      </div>
    </div>
  </div>
);

const DatabaseSettings = ({ settings, setSettings, onReindex }) => (
  <div className="space-y-8">
    <SectionHeader title="Estructura de Datos" subtitle="Control de esquemas y sincronización" />
    <div className="grid grid-cols-2 gap-6">
      <InputGroup 
        label="Esquema Principal" 
        placeholder="rbgct" 
        value={settings.mainSchema}
        disabled 
      />
      <InputGroup 
        label="Esquema de Auditoría" 
        placeholder="audit_logs"
        value={settings.auditSchema}
        onChange={(e) => setSettings({...settings, auditSchema: e.target.value})}
      />
    </div>
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between">
      <div>
        <h4 className="font-bold text-slate-800 text-sm">Backup Automático</h4>
        <p className="text-xs text-slate-500">Realizar copias de seguridad diarias.</p>
      </div>
      <Toggle 
        checked={settings.backupEnabled}
        onChange={() => setSettings({...settings, backupEnabled: !settings.backupEnabled})}
      />
    </div>
    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
      <p className="text-xs text-slate-500">Último backup: <span className="font-medium text-slate-700">{settings.lastBackup}</span></p>
    </div>
    <button 
      onClick={onReindex}
      className="flex items-center gap-2 text-slate-500 hover:text-[#001e33] font-bold text-xs transition-colors"
    >
      <RefreshCw size={14} /> Re-indexar base de datos SQLite
    </button>
  </div>
);

/* --- COMPONENTES UI REUTILIZABLES --- */

const NavButton = ({ active, onClick, icon, label }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${
      active 
        ? 'bg-[#001e33] text-white shadow-lg shadow-blue-900/10' 
        : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
    }`}
  >
    {icon} {label}
  </button>
);

const SectionHeader = ({ title, subtitle }) => (
  <div className="border-b border-slate-100 pb-4 mb-6">
    <h3 className="text-lg font-black text-slate-800 tracking-tight">{title}</h3>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{subtitle}</p>
  </div>
);

const InputGroup = ({ label, ...props }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input 
      {...props}
      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-[#001e33]/5 focus:border-[#001e33] outline-none transition-all disabled:opacity-50"
    />
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <div 
    onClick={onChange}
    className={`w-12 h-6 rounded-full relative cursor-pointer p-1 transition-colors ${
      checked ? 'bg-emerald-500' : 'bg-slate-200'
    }`}
  >
    <div className={`w-4 h-4 bg-white rounded-full shadow-sm shadow-black/10 transition-transform ${
      checked ? 'translate-x-6' : 'translate-x-0'
    }`} />
  </div>
);

export default SystemSettings;