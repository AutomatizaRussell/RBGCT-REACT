import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Vistas principales
import Login from './pages/Login';
import CompleteProfile from './pages/CompleteProfile';
import VerifyCode from './pages/VerifyCode';
import AdminDashboard from './pages/AdminDashboard';
import Admin2Dashboard from './pages/Admin2Dashboard';
import UserDashboard from './pages/UserDashboard';
import EditorDashboard from './pages/EditorDashboard';
import GestorPDFPage from './pages/GestorPDFPage';

// Componentes comunes de Gestión de Usuarios
import UserTable from './components/users/UserTable';
import CreateUserPage from './components/users/CreateUserPage';

// Componentes de USUARIO
import AutoGestion from './components/users/AutoGestion'; 
import UserProfile from './components/users/UserProfile';
import ManualesCargo from './components/users/ManualesCargo';
import ComunicadosInternos from './components/users/ComunicadosInternos';

// Componentes de CURSOS
import EditorCursos from './components/editor/EditorCursos';
import EditorHistorial from './components/editor/EditorHistorial';

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
      <Router>
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
            <Route path="gestor-pdf" element={<GestorPDFPage />} />
          </Route>

          {/* 6. SEGURIDAD: Redirección por defecto */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;