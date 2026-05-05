const API_URL = 'http://localhost:8000/api';

// ── Token management ──────────────────────────────────────────────────────────

export const tokenStorage = {
  getAccess: () => localStorage.getItem('gct_access_token'),
  getRefresh: () => localStorage.getItem('gct_refresh_token'),
  set: (accessToken, refreshToken) => {
    localStorage.setItem('gct_access_token', accessToken);
    if (refreshToken) localStorage.setItem('gct_refresh_token', refreshToken);
  },
  clear: () => {
    localStorage.removeItem('gct_access_token');
    localStorage.removeItem('gct_refresh_token');
  },
};

let isRefreshing = false;
let refreshQueue = [];

async function runRefresh() {
  const refreshToken = tokenStorage.getRefresh();
  if (!refreshToken) throw new Error('Sin refresh token');

  const res = await fetch(`${API_URL}/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    tokenStorage.clear();
    throw new Error('Sesión expirada');
  }

  const data = await res.json();
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
  if (options.body && endpoint.includes('completar-datos') && !(options.body instanceof FormData)) {
    console.log('[API] Enviando a backend:', JSON.parse(options.body));
  }

  const accessToken = tokenStorage.getAccess();
  const isFormData = options.body instanceof FormData;
  
  const headers = {
    // Solo poner Content-Type si NO es FormData
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401 && retry) {
    const body = await response.json().catch(() => ({}));
    if (body.code === 'TOKEN_EXPIRED' || body.error === 'Token expirado') {
      try {
        const newToken = await refreshAccessToken();
        return fetchApi(endpoint, {
          ...options,
          headers: { ...options.headers, Authorization: `Bearer ${newToken}` },
        }, false);
      } catch {
        window.dispatchEvent(new Event('gct:session-expired'));
        throw new Error('Sesión expirada. Por favor inicia sesión nuevamente.');
      }
    }
    const error = body;
    throw new Error(error.error || 'No autorizado');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const msg = error.error || error.detail || error.message
      || (typeof error === 'object' ? Object.values(error).flat().join(' ') : null)
      || 'Error en la petición';
    throw new Error(msg);
  }

  if (response.status === 204) return null;

  return response.json();
};

// ── AUTH ──────────────────────────────────────────────────────────────────────

export const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Error en el login');
  }

  const data = await response.json();

  // Guardar tokens si el login fue exitoso y no requiere verificación
  if (data.accessToken && !data.requiere_verificacion) {
    tokenStorage.set(data.accessToken, data.refreshToken);
  }

  return data;
};

export const logout = () => {
  tokenStorage.clear();
};

// ── TAREAS ────────────────────────────────────────────────────────────────────

export const getAllTareas = () => fetchApi('/tareas/');

export const getTareasByRol = (userRole, userId, userAreaId) => {
  let params = `user_role=${userRole}&user_id=${userId}`;
  if (userAreaId) params += `&user_area_id=${userAreaId}`;
  return fetchApi(`/tareas/?${params}`);
};

export const getTareaById = (id) => fetchApi(`/tareas/${id}/`);

export const getTareasByEmpleado = (empleadoId) => fetchApi(`/tareas/?empleado_id=${empleadoId}`);

export const createTarea = (data, userRole, userAreaId) => fetchApi('/tareas/', {
  method: 'POST',
  body: JSON.stringify({ ...data, user_role: userRole, user_area_id: userAreaId }),
});

export const updateTareaEstado = (id, estado) => fetchApi(`/tareas/${id}/`, {
  method: 'PUT',
  body: JSON.stringify({ estado }),
});

export const updateTarea = (id, data) => fetchApi(`/tareas/${id}/`, {
  method: 'PUT',
  body: JSON.stringify(data),
});

export const deleteTarea = (id) => fetchApi(`/tareas/${id}/`, { method: 'DELETE' });

// ── EMPLEADOS ─────────────────────────────────────────────────────────────────

export const getAllEmpleados = () => fetchApi('/empleados/');

export const getEmpleadoById = (id) => fetchApi(`/empleados/${id}/`);

export const getEmpleadoByEmail = (email) =>
  fetchApi(`/empleados/by-email/?email=${encodeURIComponent(email)}`);

export const createEmpleado = (data) => fetchApi('/empleados/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateEmpleado = (id, data) => fetchApi(`/empleados/${id}/`, {
  method: 'PUT',
  body: JSON.stringify(data),
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

export const getAllAreas = () => fetchApi('/areas/');

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

export const getAllCargos = () => fetchApi('/cargos/');

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

export const getAllCursos = () => fetchApi('/cursos/');

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

// ── REGLAMENTO ────────────────────────────────────────────────────────────────

export const getAllReglamento = () => fetchApi('/reglamento/');

export const createReglamentoItem = (data) => fetchApi('/reglamento/', {
  method: 'POST',
  body: JSON.stringify(data),
});

export const updateReglamentoItem = (id, data) => fetchApi(`/reglamento/${id}/`, {
  method: 'PATCH',
  body: JSON.stringify(data),
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

// ── ACTIVIDAD ─────────────────────────────────────────────────────────────────

export const healthCheck = () => fetchApi('/health/');

export const getActividadReciente = () => fetchApi('/actividad-reciente/');

export const pingActividad = (email) =>
  fetchApi('/ping/', { method: 'POST', body: JSON.stringify({ email }) });

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
  fetchApi('/n8n-proxy/?action=status');

export const n8nProxyExecutions = (statusFilter, limit = 50) => {
  const params = new URLSearchParams({ action: 'executions', limit });
  if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter);
  return fetchApi(`/n8n-proxy/?${params}`);
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
