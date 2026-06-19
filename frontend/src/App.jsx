import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataCacheProvider } from './context/DataCacheContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
// Vistas públicas (carga inmediata: son la puerta de entrada)
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import VerifyCode from './pages/VerifyCode';

// Dashboards y secciones pesadas: lazy por ruta para no cargar
// recharts/jspdf/xlsx/pdfjs en el bundle inicial del login.
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const Admin2Dashboard = lazy(() => import('./pages/Admin2Dashboard'));
const UserDashboard = lazy(() => import('./pages/UserDashboard'));
const EditorDashboard = lazy(() => import('./pages/EditorDashboard'));
const GestorPDFPage = lazy(() => import('./pages/GestorPDFPage'));

const UserTable = lazy(() => import('./components/users/UserTable'));
const CreateUserPage = lazy(() => import('./components/users/CreateUserPage'));
const AutoGestion = lazy(() => import('./components/users/AutoGestion'));
const UserProfile = lazy(() => import('./components/users/UserProfile'));
const ManualesCargo = lazy(() => import('./components/users/ManualesCargo'));
const ComunicadosInternos = lazy(() => import('./components/users/ComunicadosInternos'));
const MisClientes = lazy(() => import('./components/users/MisClientes'));
const MisClienteDetalle = lazy(() => import('./components/users/MisClienteDetalle'));
const EditorCursos = lazy(() => import('./components/editor/EditorCursos'));
const EditorHistorial = lazy(() => import('./components/editor/EditorHistorial'));

// Fallback mientras carga el chunk de la ruta
const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="w-10 h-10 border-4 border-[#001871]/20 border-t-[#001871] rounded-full animate-spin" />
  </div>
);


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

            {/* 3. RUTA DE SUPER ADMINISTRADOR (Control Total) */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute allowedRoles={['superadmin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserTable />} />
              <Route path="usuarios/nuevo" element={<CreateUserPage />} />
            </Route>

            {/* 3. RUTA DE ADMINISTRADOR NORMAL (Gestión Operativa) */}
            <Route
              path="/admin2"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin']}>
                  <Admin2Dashboard />
                </ProtectedRoute>
              }
            >
              <Route index element={<UserTable />} />
              <Route path="usuarios/nuevo" element={<CreateUserPage />} />
            </Route>

            {/* Herramientas standalone para admin2 (sin shell del dashboard) */}
            <Route
              path="/admin2/gestor-pdf"
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

            {/* 5. RUTA DE EMPLEADO (Portal Usuario) */}
            <Route
              path="/app"
              element={
                <ProtectedRoute allowedRoles={['superadmin', 'admin', 'editor', 'usuario']}>
                  <UserDashboard />
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