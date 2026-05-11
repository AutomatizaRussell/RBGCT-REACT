import { useState, useEffect } from 'react';
import { Key, Plus, Copy, Eye, EyeOff, Trash2, Power, PowerOff, RefreshCw, Check, AlertCircle, Shield } from 'lucide-react';
import { getApiKeys, createApiKey, revokeApiKey, activateApiKey, deleteApiKey, verifyApiKey } from '../../lib/api';

const ApiKeyManager = () => {
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyData, setNewKeyData] = useState({ nombre: '', descripcion: '', permisos: { read: true, write: false, delete: false } });
  const [generatedKey, setGeneratedKey] = useState(null);
  const [showKey, setShowKey] = useState({});
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const fetchApiKeys = async () => {
    try {
      setLoading(true);
      const data = await getApiKeys();
      setApiKeys(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      setError('Error cargando API keys: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const handleCreate = async () => {
    if (!newKeyData.nombre.trim()) {
      setError('El nombre es requerido');
      return;
    }
    try {
      setActionLoading({ create: true });
      const result = await createApiKey(newKeyData);
      setGeneratedKey(result);
      setNewKeyData({ nombre: '', descripcion: '', permisos: { read: true, write: false, delete: false } });
      await fetchApiKeys();
    } catch (err) {
      setError('Error creando API key: ' + err.message);
    } finally {
      setActionLoading({ create: false });
    }
  };

  const handleRevoke = async (id) => {
    if (!confirm('¿Estás seguro de revocar esta API key? Las integraciones que la usen dejarán de funcionar.')) return;
    try {
      setActionLoading({ [id]: true });
      await revokeApiKey(id);
      await fetchApiKeys();
    } catch (err) {
      setError('Error revocando: ' + err.message);
    } finally {
      setActionLoading({ [id]: false });
    }
  };

  const handleActivate = async (id) => {
    try {
      setActionLoading({ [id]: true });
      await activateApiKey(id);
      await fetchApiKeys();
    } catch (err) {
      setError('Error activando: ' + err.message);
    } finally {
      setActionLoading({ [id]: false });
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar permanentemente? Esta acción no se puede deshacer.')) return;
    try {
      setActionLoading({ [id]: true });
      await deleteApiKey(id);
      await fetchApiKeys();
    } catch (err) {
      setError('Error eliminando: ' + err.message);
    } finally {
      setActionLoading({ [id]: false });
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleShowKey = (id) => {
    setShowKey(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getPermisosLabel = (permisos) => {
    if (!permisos) return 'Solo lectura';
    const parts = [];
    if (permisos.read) parts.push('Lectura');
    if (permisos.write) parts.push('Escritura');
    if (permisos.delete) parts.push('Eliminación');
    return parts.join(', ') || 'Sin permisos';
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setGeneratedKey(null);
    setError(null);
    setCopied(false);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-[#001e33] flex items-center gap-2">
            <Key className="w-5 h-5" />
            Gestión de API Keys
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Crea y gestiona claves de API para automatizaciones externas (n8n, scripts, integraciones)
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#001e33] text-white rounded-xl text-xs font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors shadow-lg"
        >
          <Plus size={16} />
          Nueva API Key
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertCircle size={18} />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <XIcon size={14} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
          </div>
        ) : apiKeys.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">No hay API keys creadas</p>
            <p className="text-xs text-slate-400 mt-1">Crea una para empezar a usar automatizaciones</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">API Key</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Permisos</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Uso</th>
                  <th className="text-left px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Creada</th>
                  <th className="text-right px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-sm text-[#001e33]">{key.nombre}</p>
                        {key.descripcion && (
                          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[200px]">{key.descripcion}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                          {key.key_visible || '••••••••••••'}
                        </code>
                        <span className="text-[10px] text-slate-400 italic">Solo visible al crear</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded-full">
                        {getPermisosLabel(key.permisos)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {key.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                          <Power size={12} /> Activa
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
                          <PowerOff size={12} /> Revocada
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-xs text-slate-600">
                        <p>{key.uso_count || 0} usos</p>
                        {key.last_used_at && (
                          <p className="text-slate-400">Último: {formatDate(key.last_used_at)}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500">{formatDate(key.created_at)}</span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {key.is_active ? (
                          <button
                            onClick={() => handleRevoke(key.id)}
                            disabled={actionLoading[key.id]}
                            className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title="Revocar"
                          >
                            <PowerOff size={16} />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleActivate(key.id)}
                            disabled={actionLoading[key.id]}
                            className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Reactivar"
                          >
                            <Power size={16} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(key.id)}
                          disabled={actionLoading[key.id]}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            {generatedKey ? (
              /* Success View - Show Generated Key */
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Key className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-bold text-[#001e33]">¡API Key Creada!</h3>
                  <p className="text-sm text-slate-500 mt-1">
                    Copia esta clave ahora. No podrás verla completa de nuevo.
                  </p>
                </div>

                <div className="bg-slate-900 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <code className="text-emerald-400 font-mono text-sm break-all flex-1">
                      {showKey['new'] ? generatedKey.key : '•'.repeat(32)}
                    </code>
                    <button
                      onClick={() => toggleShowKey('new')}
                      className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showKey['new'] ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button
                    onClick={() => copyToClipboard(generatedKey.key)}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {copied ? <><Check size={16} /> Copiado</> : <><Copy size={16} /> Copiar API Key</>}
                  </button>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-800">Importante</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Guarda esta clave en un lugar seguro. Por seguridad, solo se muestra completa al crearla.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={closeModal}
                  className="w-full py-3 bg-[#001e33] hover:bg-slate-800 text-white rounded-xl text-sm font-bold uppercase tracking-wider transition-colors"
                >
                  Entendido
                </button>
              </div>
            ) : (
              /* Create Form */
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-[#001e33]">Nueva API Key</h3>
                  <button onClick={closeModal} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                    <XIcon size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Nombre *
                    </label>
                    <input
                      type="text"
                      value={newKeyData.nombre}
                      onChange={(e) => setNewKeyData({ ...newKeyData, nombre: e.target.value })}
                      placeholder="Ej: Integración n8n"
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
                      Descripción
                    </label>
                    <textarea
                      value={newKeyData.descripcion}
                      onChange={(e) => setNewKeyData({ ...newKeyData, descripcion: e.target.value })}
                      placeholder="Para qué se usará esta API key..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-[#001e33] focus:ring-2 focus:ring-[#001e33]/10 outline-none text-sm resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                      Permisos
                    </label>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={newKeyData.permisos.read}
                          onChange={(e) => setNewKeyData({ ...newKeyData, permisos: { ...newKeyData.permisos, read: e.target.checked } })}
                          className="w-4 h-4 accent-[#001e33]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#001e33]">Lectura</p>
                          <p className="text-xs text-slate-500">Permite consultar datos (GET)</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={newKeyData.permisos.write}
                          onChange={(e) => setNewKeyData({ ...newKeyData, permisos: { ...newKeyData.permisos, write: e.target.checked } })}
                          className="w-4 h-4 accent-[#001e33]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#001e33]">Escritura</p>
                          <p className="text-xs text-slate-500">Permite crear y modificar datos (POST, PUT, PATCH)</p>
                        </div>
                      </label>
                      <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={newKeyData.permisos.delete}
                          onChange={(e) => setNewKeyData({ ...newKeyData, permisos: { ...newKeyData.permisos, delete: e.target.checked } })}
                          className="w-4 h-4 accent-[#001e33]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#001e33]">Eliminación</p>
                          <p className="text-xs text-slate-500">Permite eliminar datos (DELETE)</p>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={closeModal}
                    className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={actionLoading.create || !newKeyData.nombre.trim()}
                    className="flex-1 py-3 bg-[#001e33] text-white rounded-xl text-sm font-bold uppercase tracking-wider hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading.create ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'Crear API Key'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const XIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default ApiKeyManager;
