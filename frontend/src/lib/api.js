const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
const DEFAULT_TIMEOUT_MS = 20000;

const fetchWithTimeout = async (url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La solicitud tardó demasiado. Intenta nuevamente.');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

const parseResponseBody = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

// ── Token management ──────────────────────────────────────────────────────────

// Acceso seguro a storage: Edge con Tracking Prevention puede bloquear localStorage
const _safeStorage = (() => {
  let _ls = null;
  const _ss = sessionStorage;
  try { localStorage.setItem('_gct_test', '1'); localStorage.removeItem('_gct_test'); _ls = localStorage; }
  catch { _ls = null; }
  return {
    get: (key) => { try { return (_ls || _ss).getItem(key); } catch { return _ss.getItem(key); } },
    set: (key, val) => { try { (_ls || _ss).setItem(key, val); } catch { _ss.setItem(key, val); } },
    remove: (key) => {
      try { if (_ls) _ls.removeItem(key); } catch {}
      try { _ss.removeItem(key); } catch {}
    },
  };
})();

export const tokenStorage = {
  _store: () => {
    try { return _safeStorage.get('gct_remember') === 'false' ? sessionStorage : (localStorage || sessionStorage); }
    catch { return sessionStorage; }
  },
  getAccess: () => _safeStorage.get('gct_access_token'),
  getRefresh: () => _safeStorage.get('gct_refresh_token'),
  set: (accessToken, refreshToken, remember) => {
    if (remember !== undefined) _safeStorage.set('gct_remember', remember ? 'true' : 'false');
    _safeStorage.set('gct_access_token', accessToken);
    if (refreshToken) _safeStorage.set('gct_refresh_token', refreshToken);
  },
  clear: () => {
    _safeStorage.remove('gct_access_token');
    _safeStorage.remove('gct_refresh_token');
    _safeStorage.remove('gct_remember');
  },
};

let isRefreshing = false;
let refreshQueue = [];

async function runRefresh() {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('Sin refresh token');

  const res = await fetchWithTimeout(`${API_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }, 15000);

  const data = await parseResponseBody(res);

  if (!res.ok) {
    tokenStorage.clear();
    throw new Error('Sesión expirada');
  }

  if (!data || typeof data !== 'object') {
    tokenStorage.clear();
    throw new Error('Respuesta inválida del servidor');
  }

  tokenStorage.set(data.accessToken, data.refreshToken);
  return data.accessToken;
}

async function refreshAccessToken() {
  if (isRefreshing) {
    return new Promise((resolve, reject) => {
      refreshQueue.push({ resolve, reject });
    });
  }

  isRefreshing = true;
  try {
    const token = await runRefresh();
    refreshQueue.forEach(p => p.resolve(token));
    return token;
  } catch (err) {
    refreshQueue.forEach(p => p.reject(err));
    throw err;
  } finally {
    isRefreshing = false;
    refreshQueue = [];
  }
}

// ── Core fetch helper ─────────────────────────────────────────────────────────

export const fetchApi = async (endpoint, options = {}, retry = true) => {
  const accessToken = tokenStorage.getAccess();
  const isFormData = options.body instanceof FormData;
  const { timeoutMs = DEFAULT_TIMEOUT_MS, noAuth = false, ...requestOptions } = options;
  
  const headers = {
    // Solo poner Content-Type si NO es FormData
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(!noAuth && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...requestOptions.headers,
  };

  const response = await fetchWithTimeout(`${API_URL}${endpoint}`, { ...requestOptions, headers }, timeoutMs);

  if (response.status === 401 && retry) {
    const body = await parseResponseBody(response);
    const bodyObj = typeof body === 'object' && body !== null ? body : {};
    if (
      body.code === 'TOKEN_EXPIRED' ||
      body.error === 'Token expirado' ||
      body.detail === 'Token expirado' ||
      body.detail?.code === 'TOKEN_EXPIRED'
    ) {
      try {
        const newToken = await refreshAccessToken();
        return fetchApi(endpoint, {
          ...requestOptions,
          timeoutMs,
          headers: { ...requestOptions.headers, Authorization: `Bearer ${newToken}` },
        }, false);
      } catch {
        window.dispatchEvent(new Event('gct:session-expired'));
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
    }
    throw new Error(bodyObj.error || 'No autorizado');
  }

  if (!response.ok) {
    const error = await parseResponseBody(response);
    if (response.status === 504) {
      throw new Error('El servidor tardó demasiado en responder (504). Intenta de nuevo en unos segundos.');
    }
    const errorObj = typeof error === 'object' && error !== null ? error : {};
    const msg = errorObj.error || errorObj.detail || errorObj.message
      || (typeof errorObj === 'object' ? Object.values(errorObj).flat().join(' ') : null)
      || (typeof error === 'string' ? error : null)
      || 'Error en la petición';
    throw new Error(msg);
  }

  if (response.status === 204) return null;

  return parseResponseBody(response);
};

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const login = async (email, password, rememberMe = true) => {
  const response = await fetchWithTimeout(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  }, 18000);

  const data = await parseResponseBody(response);

  if (!response.ok) {
    if (response.status === 504) {
      throw new Error('El servidor está ocupado (504). Intenta nuevamente en unos segundos.');
    }
    const msg = (typeof data === 'object' && data !== null)
      ? (data.error || data.detail || data.message)
      : (typeof data === 'string' ? data : null);
    throw new Error(msg || 'Error en el login');
  }

  if (!data || typeof data !== 'object') {
    throw new Error('Respuesta inválida del servidor');
  }

  // Guardar tokens si el login fue exitoso y no requiere verificación
  if (data.accessToken && !data.requiere_verificacion) {
    tokenStorage.set(data.accessToken, data.refreshToken, rememberMe);
  }

  return data;
};

export const logout = () => {
  tokenStorage.clear();
};

// ── TAREAS ────────────────────────────────────────────────────────────────────

export const getAllTareas = () => fetchApi('/tareas/');
export const getResumenTareas = () => fetchApi('/tareas/resumen/');

export const getTareasByRol = () => fetchApi('/tareas/');

export const getTareaById = (id) => fetchApi(`/tareas/${id}/`);

export const getTareasByEmpleado = (empleadoId) => fetchApi(`/tareas/?empleado_id=${empleadoId}`);

export const createTarea = (data) => fetchApi('/tareas/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateTareaEstado = (id, estado) => fetchApi(`/tareas/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify({ estado }),
});

export const updateTarea = (id, data) => fetchApi(`/tareas/${id}/`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteTarea = (id) => fetchApi(`/tareas/${id}/`, { method: 'DELETE' });

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────

export const getAllEmpleados = (options = {}) => fetchApi('/empleados/', options);

export const getEmpleadoById = (id) => fetchApi(`/empleados/${id}/`);

export const getEmpleadoByEmail = (email) =>
  fetchApi(`/empleados/by-email/?email=${encodeURIComponent(email)}`);

export const createEmpleado = (data) => fetchApi('/empleados/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateEmpleado = (id, data) => fetchApi(`/empleados/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const actualizarMiContacto = (data) => fetchApi('/mi-contacto/', {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const actualizarMiPersona = (data) => fetchApi('/mi-persona/', {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const getMiOrganigrama = () => fetchApi('/mi-organigrama/');
export const getHistorialEmpleado = (id) => fetchApi(`/empleados/${id}/historial/`);
export const getMiProgresoCurso = (cursoId) => fetchApi(`/cursos/${cursoId}/mi-progreso/`);
export const marcarProgresoCurso = (cursoId, contenidoId) => fetchApi(`/cursos/${cursoId}/marcar-progreso/`, {
  method: 'POST',
  body: JSON.stringify({ contenido_id: contenidoId }),
});
export const enviarRespuestasCuestionario = (contenidoId, data) => fetchApi(`/curso-contenido/${contenidoId}/enviar-respuestas/`, {
  method: 'POST',
  body: JSON.stringify(data),
});
export const getMisIntentosCuestionario = (contenidoId) => fetchApi(`/curso-contenido/${contenidoId}/mis-intentos/`);
export const getResultadosCuestionario  = (contenidoId) => fetchApi(`/curso-contenido/${contenidoId}/resultados/`);
export const getMisAcademicos = () => fetchApi('/mis-academicos/');
export const crearDatoAcademico = (data, diploma = null) => {
  if (diploma) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => v != null && fd.append(k, String(v)));
    fd.append('diploma', diploma);
    return fetchApi('/mis-academicos/', { method: 'POST', body: fd });
  }
  return fetchApi('/mis-academicos/', { method: 'POST', body: JSON.stringify(data) });
};
export const actualizarDatoAcademico = (id, data, diploma = null) => {
  if (diploma) {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => v != null && fd.append(k, String(v)));
    fd.append('diploma', diploma);
    return fetchApi(`/mis-academicos/${id}/`, { method: 'PATCH', body: fd });
  }
  return fetchApi(`/mis-academicos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });
};
export const eliminarDatoAcademico = (id) => fetchApi(`/mis-academicos/${id}/`, {
  method: 'DELETE',
});

export const cambiarEstadoEmpleado = (id, estado) =>
  fetchApi(`/empleados/${id}/cambiar_estado/`, {
    method: 'POST',
    body: JSON.stringify({ estado }),
  });

export const deleteEmpleado = (id) => fetchApi(`/empleados/${id}/`, { method: 'DELETE' });

// ── ALERTAS ───────────────────────────────────────────────────────────────────

export const registrarIntentoRecuperacion = (email) =>
  fetchApi('/registrar-intento-recuperacion/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

export const getAlertasRecuperacion = () => fetchApi('/alertas-recuperacion/');

export const atenderAlerta = (alertaId) =>
  fetchApi(`/alertas-recuperacion/${alertaId}/atender/`, { method: 'POST' });

export const eliminarAlerta = (alertaId) =>
  fetchApi(`/alertas-recuperacion/${alertaId}/eliminar/`, { method: 'DELETE' });

// ── RECUPERACIÓN DE CONTRASEÑA (NUEVO FLUJO CON N8N) ────────────────────────────

// Paso 1: Solicitar código de recuperación (envía email vía n8n)
export const solicitarRecuperacionPassword = (email) =>
  fetchApi('/recuperar-password/', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });

// Paso 2: Verificar código recibido por email
export const verificarCodigoRecuperacion = (email, codigo) =>
  fetchApi('/verificar-codigo-recuperacion/', {
    method: 'POST',
    body: JSON.stringify({ email, codigo }),
  });

// Paso 3: Restablecer contraseña con token temporal
export const restablecerPassword = (token, nuevaPassword) =>
  fetchApi('/restablecer-password/', {
    method: 'POST',
    body: JSON.stringify({ token, nueva_password: nuevaPassword }),
  });

// ── AREAS ─────────────────────────────────────────────────────────────────────

export const getAllAreas = (options = {}) => fetchApi('/areas/', options);

export const createArea = (data) => fetchApi('/areas/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateArea = (id, data) => fetchApi(`/areas/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const deleteArea = (id) => fetchApi(`/areas/${id}/`, { method: 'DELETE' });

// ── CARGOS ────────────────────────────────────────────────────────────────────

export const getAllCargos = (options = {}) => fetchApi('/cargos/', options);

export const createCargo = (data) => fetchApi('/cargos/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateCargo = (id, data) => fetchApi(`/cargos/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const deleteCargo = (id) => fetchApi(`/cargos/${id}/`, { method: 'DELETE' });

// ── CURSOS ────────────────────────────────────────────────────────────────────

export const getAllCursos = (page = 1, pageSize = 50) =>
  fetchApi(`/cursos/?page=${page}&page_size=${pageSize}`);

export const createCurso = (data) => fetchApi('/cursos/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateCurso = (id, data) => fetchApi(`/cursos/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const deleteCurso = (id) => fetchApi(`/cursos/${id}/`, { method: 'DELETE' });

export const getContenidosByCurso = (cursoId) => fetchApi(`/curso-contenido/?curso_id=${cursoId}`);

export const createCursoContenido = (data) => {
  if (data instanceof FormData) {
    const accessToken = tokenStorage.getAccess();
    return fetch(`${API_URL}/curso-contenido/`, {
      method: 'POST',
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
      body: data,
    }).then(async r => {
      if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(e.error || 'Error subiendo archivo'); }
      return r.json();
    });
  }
  return fetchApi('/curso-contenido/', { method: 'POST', body: JSON.stringify(data) });
};

export const updateCursoContenido = (id, data) => fetchApi(`/curso-contenido/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const deleteCursoContenido = (id) => fetchApi(`/curso-contenido/${id}/`, { method: 'DELETE' });

export const getCursoHistorial = (limit = 100) => fetchApi(`/curso-historial/?limit=${limit}`);

export const getNotificacionesCursos = () => fetchApi('/notificaciones-cursos/');
export const marcarNotificacionCursoLeida = (id) => fetchApi(`/notificaciones-cursos/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify({ leida: true }),
});
export const marcarTodasNotificacionesCursosLeidas = () => fetchApi('/notificaciones-cursos/marcar-todas-leidas/', {
  method: 'POST',
  body: JSON.stringify({}),
});
export const toggleEncargadoCursos = (idEmpleado, valor) => fetchApi('/toggle-encargado-cursos/', {
  method: 'POST',
  body: JSON.stringify({ id_empleado: idEmpleado, valor }),
});

export const getMiProgresoGlobal = () => fetchApi('/cursos/mi-progreso-global/');

// ── Asignaciones de Formación (tabla de usuarios) ─────────────────────────────
export const getCursosPorArea = (areaId) =>
  fetchApi(`/cursos/por-area/?area_id=${areaId}`);

export const getResumenAreaFormacion = (areaId) =>
  fetchApi(`/asignaciones-formacion/resumen-area/?area_id=${areaId}`);

export const toggleExclusionFormacion = (empleadoId, cursoId) =>
  fetchApi('/asignaciones-formacion/toggle-exclusion/', {
    method: 'POST',
    body: JSON.stringify({ empleado_id: empleadoId, curso_id: cursoId }),
  });

export const toggleAsignacionFormacion = (empleadoId, cursoId) =>
  fetchApi('/asignaciones-formacion/toggle/', {
    method: 'POST',
    body: JSON.stringify({ empleado_id: empleadoId, curso_id: cursoId }),
  });

export const batchAsignarFormacion = (cursoId, empleadoIds) =>
  fetchApi('/asignaciones-formacion/batch-asignar/', {
    method: 'POST',
    body: JSON.stringify({ curso_id: cursoId, empleado_ids: empleadoIds }),
  });

export const reordenarCursos = (orden) => fetchApi('/cursos/reordenar/', {
  method: 'POST',
  body: JSON.stringify(orden),
});

export const reordenarContenidos = (orden) => fetchApi('/curso-contenido/reordenar/', {
  method: 'POST',
  body: JSON.stringify(orden),
});

// ── ONBOARDING ────────────────────────────────────────────────────────────────

export const getAllPlanesOnboarding = () => fetchApi('/planes-onboarding/');

export const createPlanOnboarding = (data) => fetchApi('/planes-onboarding/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updatePlanOnboarding = (id, data) => fetchApi(`/planes-onboarding/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
});

export const deletePlanOnboarding = (id) => fetchApi(`/planes-onboarding/${id}/`, { method: 'DELETE' });

export const agregarPasoOnboarding = (planId, data) => fetchApi(`/planes-onboarding/${planId}/pasos/`, {
  method: 'POST',
  body: JSON.stringify(data),
});

export const eliminarPasoOnboarding = (planId, pasoId) =>
  fetchApi(`/planes-onboarding/${planId}/pasos/${pasoId}/`, { method: 'DELETE' });

export const reordenarPasosOnboarding = (planId, pasos) =>
  fetchApi(`/planes-onboarding/${planId}/reordenar/`, {
    method: 'POST',
    body: JSON.stringify({ pasos }),
  });

export const getResumenAreaOnboarding = (areaId) =>
  fetchApi(`/planes-onboarding/resumen-area/?area_id=${areaId}`);

export const toggleAsignacionOnboarding = (empleadoId, planId) =>
  fetchApi('/planes-onboarding/toggle/', {
    method: 'POST',
    body: JSON.stringify({ empleado_id: empleadoId, plan_id: planId }),
  });

export const batchAsignarOnboarding = (planId, empleadoIds) =>
  fetchApi('/planes-onboarding/batch-asignar/', {
    method: 'POST',
    body: JSON.stringify({ plan_id: planId, empleado_ids: empleadoIds }),
  });

export const getMisOnboardings = () => fetchApi('/planes-onboarding/mis-planes/');

export const exportarCalificaciones = (cursoId) =>
  fetchApi(`/cursos/${cursoId}/exportar-calificaciones/`);

// ── REGLAMENTO ────────────────────────────────────────────────────────────────

export const getAllReglamento = () => fetchApi('/reglamento/');

export const createReglamentoItem = (data) => {
  const isFormData = data instanceof FormData;
  return fetchApi('/reglamento/', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  });
};

export const updateReglamentoItem = (id, data) => fetchApi(`/reglamento/${id}/`, {
  method: 'PATCH',
  body: data instanceof FormData ? data : JSON.stringify(data),
});

export const deleteReglamentoItem = (id) => fetchApi(`/reglamento/${id}/`, { method: 'DELETE' });

export const moverReglamentoItem = (id, direccion) => fetchApi(`/reglamento/${id}/mover/`, {
  method: 'POST',
  body: JSON.stringify({ direccion }),
});

// ── SUPERADMINS ───────────────────────────────────────────────────────────────

export const getSuperAdminByEmail = (email) =>
  fetchApi(`/superadmins/?email=${encodeURIComponent(email)}`);

// ── CREAR USUARIOS ────────────────────────────────────────────────────────────

export const crearUsuarioSuperAdmin = (adminEmail, adminPassword, userData) =>
  fetchApi('/crear-usuario/', {
    method: 'POST',
    body: JSON.stringify({ admin_email: adminEmail, admin_password: adminPassword, ...userData }),
  });

// ── COMPLETAR DATOS ───────────────────────────────────────────────────────────

export const completarDatosEmpleado = (empleadoId, password, datos) =>
  fetchApi('/completar-datos/', {
    method: 'POST',
    body: JSON.stringify({ empleado_id: empleadoId, password, ...datos }),
  });

// ── HABILITAR EDICIÓN ─────────────────────────────────────────────────────────

export const habilitarEdicionDatos = (adminEmail, adminPassword, empleadoId = null, habilitar = true) =>
  fetchApi('/habilitar-edicion/', {
    method: 'POST',
    body: JSON.stringify({ admin_email: adminEmail, admin_password: adminPassword, empleado_id: empleadoId, habilitar }),
  });

// ── HABILITAR EDICIÓN MASIVA (SuperAdmin) ────────────────────────────────────

export const habilitarEdicionMasivaSuperAdmin = (adminEmail, adminPassword, habilitar = true) =>
  fetchApi('/habilitar-edicion-masiva/', {
    method: 'POST',
    body: JSON.stringify({ admin_email: adminEmail, admin_password: adminPassword, habilitar }),
  });

// ── SUGERENCIAS DE EMPLEADOS ─────────────────────────────────────────────────

export const enviarSugerencia = (sugerencia) =>
  fetchApi('/sugerencias/', { method: 'POST', body: JSON.stringify({ sugerencia }) });

export const getMisSugerencias = () => fetchApi('/sugerencias/mias/');

export const confirmarSugerenciaVista = (id) =>
  fetchApi(`/sugerencias/${id}/vista/`, { method: 'POST' });

// Admin: listado (filtros: { empleado_id, pendientes })
export const getSugerencias = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/sugerencias/listado/${q ? `?${q}` : ''}`);
};

export const recibirSugerencia = (id) =>
  fetchApi(`/sugerencias/${id}/recibir/`, { method: 'POST' });

// ── ACTIVIDAD ─────────────────────────────────────────────────────────────────

export const healthCheck = () => fetchApi('/health/');

export const getActividadReciente = () => fetchApi('/actividad-reciente/');

export const pingActividad = () =>
  fetchApi('/ping/', {
    method: 'POST',
  });

// ── CONTRASEÑA ────────────────────────────────────────────────────────────────

export const actualizarPasswordEmpleado = (empleadoId, nuevaPassword, adminEmail, adminPassword) =>
  fetchApi(`/empleados/${empleadoId}/actualizar-password/`, {
    method: 'POST',
    body: JSON.stringify({ nueva_password: nuevaPassword, admin_email: adminEmail, admin_password: adminPassword }),
  });

// ── N8N ───────────────────────────────────────────────────────────────────────

export const getN8nLogs = (statusFilter, limit = 50) => {
  const params = new URLSearchParams({ limit });
  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
  return fetchApi(`/n8n-logs/?${params}`);
};

// Proxy server-side: Django consulta n8n directamente (sin CORS)
export const n8nProxyStatus = () =>
  fetchApi('/n8n-proxy/?action=status', { timeoutMs: 8000 });

export const getClientesSQF = () =>
  fetchApi('/n8n-proxy/?action=clientes_sqf', { timeoutMs: 15000 });

export const n8nProxyExecutions = (statusFilter, limit = 50) => {
  const params = new URLSearchParams({ action: 'executions', limit });
  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
  return fetchApi(`/n8n-proxy/?${params}`, { timeoutMs: 10000 });
};

// ── INTRANET (SharePoint vía n8n) ────────────────────────────────────────────

/**
 * Descarga un archivo de SharePoint a través del proxy n8n autenticado.
 * @param {'contratos'|'reglamento'|'clientes'|'cursos'|'datos_academicos'} tipo
 * @param {string} archivo  Nombre exacto del archivo en SharePoint (ej: "contrato.pdf")
 * @returns {Promise<Blob>}
 */
export const descargarArchivoIntranet = async (tipo, archivo) => {
  const accessToken = tokenStorage.getAccess();
  const r = await fetch(`${API_URL}/descargar-archivo/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    body: JSON.stringify({ tipo, archivo }),
  });
  if (!r.ok) {
    const err = await r.json().catch(() => ({}));
    throw new Error(err.error || `Error ${r.status} al descargar archivo`);
  }
  return r.blob();
};

// ── MARKITDOWN ──────────────────────────────────────────────────────────────

export const convertirArchivoMarkdown = (formData) =>
  fetchApi('/convertir-markdown/', {
    method: 'POST',
    body: formData,
    // No enviar Content-Type, dejar que el navegador ponga el boundary correcto para FormData
  });

// ── API KEYS (SuperAdmin) ───────────────────────────────────────────────────

export const getApiKeys = (isActive = null) => {
  const params = new URLSearchParams();
  if (isActive !== null) params.set('is_active', isActive);
  return fetchApi(`/api-keys/?${params}`);
};

export const createApiKey = (data) =>
  fetchApi('/api-keys/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateApiKey = (id, data) =>
  fetchApi(`/api-keys/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });

export const deleteApiKey = (id) =>
  fetchApi(`/api-keys/${id}/`, { method: 'DELETE' });

export const revokeApiKey = (id) =>
  fetchApi(`/api-keys/${id}/revoke/`, { method: 'POST' });

export const activateApiKey = (id) =>
  fetchApi(`/api-keys/${id}/activate/`, { method: 'POST' });

export const verifyApiKey = (key) =>
  fetchApi('/api-keys/verify/', {
    method: 'POST',
    body: JSON.stringify({ key }),
  });

// ── Módulo Contratos ──────────────────────────────────────────────────────────

export const getEntidadesEPS  = () => fetchApi('/entidades-eps/?activas=true');
export const getEntidadesAFP  = () => fetchApi('/entidades-afp/?activas=true');
export const getEntidadesARL  = () => fetchApi('/entidades-arl/?activas=true');
export const getCajasCompensacion = () => fetchApi('/cajas-compensacion/?activas=true');

// Admin: académicos de cualquier empleado
export const getAcademicosEmpleado = (empleadoId) =>
  fetchApi(`/empleados/${empleadoId}/academicos/`);

export const crearAcademicoEmpleado = (empleadoId, data, diplomaFile) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v); });
  if (diplomaFile) fd.append('diploma', diplomaFile);
  const accessToken = tokenStorage.getAccess();
  return fetch(`${API_URL}/empleados/${empleadoId}/academicos/`, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: fd,
  }).then(async r => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(JSON.stringify(e)); }
    return r.json();
  });
};

export const actualizarAcademicoEmpleado = (empleadoId, pk, data, diplomaFile) => {
  const fd = new FormData();
  Object.entries(data).forEach(([k, v]) => { if (v !== null && v !== undefined && v !== '') fd.append(k, v); });
  if (diplomaFile) fd.append('diploma', diplomaFile);
  const accessToken = tokenStorage.getAccess();
  return fetch(`${API_URL}/empleados/${empleadoId}/academicos/${pk}/`, {
    method: 'PATCH',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: fd,
  }).then(async r => {
    if (!r.ok) { const e = await r.json().catch(() => ({})); throw new Error(JSON.stringify(e)); }
    return r.json();
  });
};

export const eliminarAcademicoEmpleado = (empleadoId, pk) =>
  fetchApi(`/empleados/${empleadoId}/academicos/${pk}/`, { method: 'DELETE' });

export const getContratos = (params = {}) => {
  const q = new URLSearchParams();
  if (params.empleado_id) q.set('empleado_id', params.empleado_id);
  if (params.estado)      q.set('estado', params.estado);
  if (params.tipo)        q.set('tipo_contrato', params.tipo);
  return fetchApi(`/contratos/?${q}`);
};

export const getContratoActivo = (empleadoId) =>
  fetchApi(`/contratos/activo/${empleadoId}/`);

export const createContrato = (data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') form.append(k, v);
  });
  return fetchApi('/contratos/', { method: 'POST', body: form, });
};

export const updateContrato = (id, data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') form.append(k, v);
  });
  return fetchApi(`/contratos/${id}/`, { method: 'PATCH', body: form, });
};

export const terminarContrato = (id, data) =>
  fetchApi(`/contratos/${id}/terminar/`, {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const renovarContrato = (id, data) => {
  const form = new FormData();
  Object.entries(data).forEach(([k, v]) => {
    if (v !== null && v !== undefined && v !== '') form.append(k, v);
  });
  return fetchApi(`/contratos/${id}/renovar/`, { method: 'POST', body: form, });
};

export const getAfiliacionSS = (empleadoId) =>
  fetchApi(`/afiliaciones-ss/empleado/${empleadoId}/`);

export const getAllAfiliacionesSS = (options = {}) =>
  fetchApi('/afiliaciones-ss/', options);

export const createAfiliacionSS = (data) =>
  fetchApi('/afiliaciones-ss/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

export const updateAfiliacionSS = (id, data) =>
  fetchApi(`/afiliaciones-ss/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });


// ── CRM Clientes ──────────────────────────────────────────────────────────────
// Todas las llamadas CRM usan fetchApi con el prefijo /clientes/
// para compartir el mismo manejo de tokens, retry y errores.

export const getClientesStats = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/clientes/empresas/stats/${q ? '?' + q : ''}`);
};

export const getMisClientes = (empleadoId) => {
  const q = empleadoId ? `?empleado_id=${empleadoId}` : '';
  return fetchApi(`/clientes/empresas/mis_clientes/${q}`);
};

export const getEmpresas = (params = {}) => {
  const q = new URLSearchParams(params).toString();
  return fetchApi(`/clientes/empresas/${q ? '?' + q : ''}`);
};

export const getEmpresa = (id) => fetchApi(`/clientes/empresas/${id}/`);

export const createEmpresa = (data) =>
  fetchApi('/clientes/empresas/', { method: 'POST', body: JSON.stringify(data) });

export const updateEmpresa = (id, data) =>
  fetchApi(`/clientes/empresas/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteEmpresa = (id) =>
  fetchApi(`/clientes/empresas/${id}/`, { method: 'DELETE' });

export const getEmpresaPorAreas  = (id) => fetchApi(`/clientes/empresas/${id}/por_areas/`);
export const getEmpresaContactos = (id) => fetchApi(`/clientes/empresas/${id}/contactos/`);
export const getEmpresaServicios = (id) => fetchApi(`/clientes/empresas/${id}/servicios/`);
export const getEmpresaEquipo    = (id) => fetchApi(`/clientes/empresas/${id}/equipo/`);
export const getEmpresaDocumentos = (id) => fetchApi(`/clientes/empresas/${id}/documentos/`);
export const getEmpresaBitacora  = (id) => fetchApi(`/clientes/empresas/${id}/bitacora/`);

export const createContacto = (data) =>
  fetchApi('/clientes/contactos/', { method: 'POST', body: JSON.stringify(data) });

export const updateContacto = (id, data) =>
  fetchApi(`/clientes/contactos/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteContacto = (id) =>
  fetchApi(`/clientes/contactos/${id}/`, { method: 'DELETE' });

export const createServicio = (data) =>
  fetchApi('/clientes/servicios/', { method: 'POST', body: JSON.stringify(data) });

export const updateServicio = (id, data) =>
  fetchApi(`/clientes/servicios/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteServicio = (id) =>
  fetchApi(`/clientes/servicios/${id}/`, { method: 'DELETE' });

export const createAsignacion = (data) =>
  fetchApi('/clientes/asignaciones/', { method: 'POST', body: JSON.stringify(data) });

export const updateAsignacion = (id, data) =>
  fetchApi(`/clientes/asignaciones/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteAsignacion = (id) =>
  fetchApi(`/clientes/asignaciones/${id}/`, { method: 'DELETE' });

export const createDocumentoCliente = (data) => {
  const formData = data instanceof FormData ? data : (() => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => v != null && fd.append(k, v));
    return fd;
  })();
  return fetchApi('/clientes/documentos/', { method: 'POST', body: formData });
};

export const deleteDocumentoCliente = (id) =>
  fetchApi(`/clientes/documentos/${id}/`, { method: 'DELETE' });

export const createBitacora = (data) =>
  fetchApi('/clientes/bitacora/', { method: 'POST', body: JSON.stringify(data) });

export const updateBitacora = (id, data) =>
  fetchApi(`/clientes/bitacora/${id}/`, { method: 'PATCH', body: JSON.stringify(data) });

export const deleteBitacora = (id) =>
  fetchApi(`/clientes/bitacora/${id}/`, { method: 'DELETE' });

// ── CERTIFICADO DE EMPLEO ─────────────────────────────────────────────────
export const enviarCertificadoEmpleo = (data) =>
  fetchApi('/enviar-certificado/', {
    method: 'POST',
    body: JSON.stringify(data),
  });

// ── SOLICITUDES DE CERTIFICADO (json temporal) ────────────────────────────
export const crearSolicitudCert = (data) =>
  fetchApi('/solicitudes-cert/crear/', { method: 'POST', body: JSON.stringify(data) });

export const getSolicitudesCert = () => fetchApi('/solicitudes-cert/');

export const atenderSolicitudCert = (id, accion) =>
  fetchApi(`/solicitudes-cert/${id}/atender/`, { method: 'PATCH', body: JSON.stringify({ accion }) });

export const getCertPermisosBackend = () => fetchApi('/cert-permisos/');

export const setCertPermisoBackend = (id_empleado, value) =>
  fetchApi('/cert-permisos/set/', { method: 'POST', body: JSON.stringify({ id_empleado, value }) });
