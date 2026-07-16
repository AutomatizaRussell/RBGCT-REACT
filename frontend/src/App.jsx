import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { fetchApi, tokenStorage } from './lib/api';
import { useAuth } from './hooks/useAuth';
import { AuthProvider } from './context/AuthContext';
import { DataCacheProvider } from './context/DataCacheContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
// Vistas públicas (carga inmediata: son la puerta de entrada)
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import VerifyCode from './pages/VerifyCode';

// Dashboards y secciones pesadas: lazy por ruta para no cargar
// recharts/jspdf/xlsx/pdfjs en el bundle inicial del login.
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const EmpleadoDashboard = lazy(() => import('./pages/EmpleadoDashboard'));
const EditorDashboard = lazy(() => import('./pages/EditorDashboard'));
const GestorPDFPage = lazy(() => import('./components/herramientas/GestorPDFPage'));
const PortalVacantes = lazy(() => import('./components/features/vacantes/PortalVacantes'));

const UserTable = lazy(() => import('./components/empleados/gestion/UserTable'));
const CreateUserPage = lazy(() => import('./components/empleados/gestion/CreateUserPage'));
const AutoGestion = lazy(() => import('./components/empleados/portal/AutoGestion'));
const UserProfile = lazy(() => import('./components/empleados/portal/UserProfile'));
const ManualesCargo = lazy(() => import('./components/formacion/portal/ManualesCargo'));
const ComunicadosInternos = lazy(() => import('./components/empleados/portal/ComunicadosInternos'));
const MisClientes = lazy(() => import('./components/empleados/portal/MisClientes'));
const MisClienteDetalle = lazy(() => import('./components/empleados/portal/MisClienteDetalle'));
const OrganigramaClientes = lazy(() => import('./components/clientes/OrganigramaClientes'));
const EditorCursos = lazy(() => import('./components/formacion/editor/EditorCursos'));
const EditorHistorial = lazy(() => import('./components/editor/EditorHistorial'));

// Fallback mientras carga el chunk de la ruta
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-[#001871]/20 border-t-[#001871] rounded-full animate-spin" />
  </div>
);


// --- CALLBACK MICROSOFT OAuth ---
const MicrosoftCallback = () => {
  const [status, setStatus] = useState('loading');
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const { setEmpleadoDataVerify } = useAuth();

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const msError = params.get('error');

    if (msError) { if (!cancelled) { setStatus('error'); setMsg('Microsoft canceló la autenticación.'); } return; }
    if (!code)    { if (!cancelled) { setStatus('error'); setMsg('No se recibió código de autorización.'); } return; }

    fetchApi('/auth/microsoft/', {
      method: 'POST',
      body: JSON.stringify({ code, redirect_uri: `${window.location.origin}/auth/microsoft/callback` }),
    })
      .then((res) => {
        if (cancelled) return;
        if (!res.access_token) {
          setStatus('error');
          setMsg(res.error || 'Tu cuenta de Microsoft no está registrada en GCT.');
          return;
        }

        tokenStorage.set(res.access_token, res.refresh_token, true);

        if (res.type === 'superadmin') {
          const userData = { id: res.user.id, email: res.user.email, nombre: res.user.nombre, apellido: res.user.apellido || '' };
          localStorage.setItem('gct_user', JSON.stringify(userData));
          localStorage.setItem('gct_empleado', JSON.stringify({ ...res.user, id_permisos: 1 }));
          localStorage.setItem('gct_role', 'superadmin');
          nav('/superadmin', { replace: true });
        } else {
          setEmpleadoDataVerify(res.user, { accessToken: res.access_token, refreshToken: res.refresh_token });
          localStorage.setItem('gct_primer_login', res.primer_login ? 'true' : 'false');
          const routes = { admin: '/admin', editor: '/editor' };
          nav(res.primer_login ? '/completar-perfil' : (routes[res.role] || '/app'), { replace: true });
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setStatus('error');
        setMsg(err.message || 'Error al procesar el inicio de sesión.');
      });

    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      {status === 'loading' && (
        <>
          <div className="w-10 h-10 border-4 border-[#001871]/20 border-t-[#001871] rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Verificando cuenta Microsoft...</p>
        </>
      )}
      {status === 'error' && (
        <div className="text-center max-w-sm px-6">
          <p className="text-red-600 font-semibold mb-3">{msg}</p>
          <button onClick={() => nav('/', { replace: true })} className="text-sm text-[#001871] underline">
            Volver al inicio de sesión
          </button>
        </div>
      )}
    </div>
  );
};

// --- COMPONENTES LOCALES / PLACEHOLDERS ---
const WelcomeUser = () => (
  <div className="p-8 text-slate-400 uppercase font-bold text-xs tracking-widest">
    Bienvenido al Portal. Selecciona una opción del menú.
  </div>
);

// Placeholders para Editor
const ContentList = () => <div className="p-8 font-bold text-slate-700">Listado de Artículos y Notas...</div>;
const MediaLibrary = () => <div className="p-8 font-bold text-slate-700">Biblioteca de Imágenes y Recursos...</div>;

function App() {
  return (
    <AuthProvider>
      <DataCacheProvider>
        <Router>
          <Suspense fallback={<RouteLoader />}>
          <Routes>

            {/* 1. LOGIN - Público */}
            <Route path="/" element={<Login />} />


            {/* 2. COMPLETAR PERFIL - Primer login */}
            <Route path="/completar-perfil" element={<CompleteProfile />} />

            {/* 2.5. VERIFICACIÓN DE CÓDIGO - Primer login */}
            <Route path="/verify-code" element={<VerifyCode />} />

            {/* 2.6. CALLBACK MICROSOFT OAuth */}
            <Route path="/auth/microsoft/callback" element={<MicrosoftCallback />} />

            {/* Portal de Vacantes - Público (candidatos externos, sin login) */}
            <Route path="/vacantes" element={<PortalVacantes />} />

            {/* 3. RUTA DE SUPER ADMINISTRADOR (Control Total) */}
            <Route
              path="/superadmin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <SuperAdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserTable />} />
              <Route path="usuarios/nuevo" element={<CreateUserPage />} />
            </Route>

            {/* 4. RUTA DE ADMINISTRADOR (Gestión Operativa) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserTable />} />
              <Route path="usuarios/nuevo" element={<CreateUserPage />} />
            </Route>

            {/* Herramientas standalone para admin (sin shell del dashboard) */}
            <Route
              path="/admin/gestor-pdf"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <GestorPDFPage />
                </ProtectedRoute>
              }
            />

            {/* 4. RUTA DE EDITOR (Contenido) */}
            <Route
              path="/editor"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor']}>
                  <EditorDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<ContentList />} />
              <Route path="biblioteca" element={<MediaLibrary />} />
              <Route path="tareas" element={<div />} />
              <Route path="cursos" element={<EditorCursos />} />
              <Route path="historial" element={<EditorHistorial />} />
              <Route path="herramientas" element={<div />} />
              <Route path="perfil" element={<UserProfile />} />
            </Route>

            {/* 6. RUTA DE EMPLEADO (Portal) */}
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor', 'usuario']}>
                  <EmpleadoDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<WelcomeUser />} />
              <Route path="auto-gestion" element={<AutoGestion />} />
              <Route path="perfil" element={<UserProfile />} />
              <Route path="manuales" element={<ManualesCargo />} />
              <Route path="comunicados" element={<ComunicadosInternos />} />
              <Route path="utilidades" element={<WelcomeUser />} />
              <Route path="sqf" element={<WelcomeUser />} />
              <Route path="gestor-pdf" element={<GestorPDFPage />} />
              <Route path="mis-clientes" element={<MisClientes />} />
              <Route path="clientes/organigrama" element={<OrganigramaClientes />} />
              <Route path="cliente/:id" element={<MisClienteDetalle />} />



            </Route>

            {/* 6. SEGURIDAD: Redirección por defecto */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
          </Suspense>
        </Router>
      </DataCacheProvider>
    </AuthProvider>
  );
}

export default App;