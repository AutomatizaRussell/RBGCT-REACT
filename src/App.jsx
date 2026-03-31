import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Vistas principales
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard'; // Este es tu SUPER ADMIN
import Admin2Dashboard from './pages/Admin2Dashboard'; // Este es el ADMIN NORMAL
import UserDashboard from './pages/UserDashboard';
import EditorDashboard from './pages/EditorDashboard';

// Componentes comunes de Gestión de Usuarios
import UserTable from './components/users/UserTable';
import CreateUserPage from './components/users/CreateUserPage';

// Componentes de USUARIO
import AutoGestion from './components/users/AutoGestion'; 

// --- COMPONENTES LOCALES / PLACEHOLDERS ---
const MyProfile = () => <div className="p-8">Configuración de mi perfil...</div>;
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
    <Router>
      <Routes>
        {/* 1. LOGIN */}
        <Route path="/" element={<Login />} />

        {/* 2. RUTA DE SUPER ADMINISTRADOR (Control Total) */}
        <Route path="/admin" element={<AdminDashboard />}>
          <Route index element={<UserTable />} />
          <Route path="usuarios/nuevo" element={<CreateUserPage />} />
        </Route>

        {/* 3. RUTA DE ADMINISTRADOR NORMAL (Gestión Operativa) */}
        <Route path="/admin2" element={<Admin2Dashboard />}>
          <Route index element={<UserTable />} />
          <Route path="usuarios/nuevo" element={<CreateUserPage />} />
        </Route>

        {/* 4. RUTA DE EDITOR (Contenido) */}
        <Route path="/editor" element={<EditorDashboard />}>
          <Route index element={<ContentList />} />
          <Route path="biblioteca" element={<MediaLibrary />} />
          <Route path="perfil" element={<MyProfile />} />
        </Route>

        {/* 5. RUTA DE EMPLEADO (Portal Usuario) */}
        <Route path="/app" element={<UserDashboard />}>
          <Route index element={<WelcomeUser />} />
          <Route path="auto-gestion" element={<AutoGestion />} />
          <Route path="perfil" element={<MyProfile />} />
        </Route>

        {/* 6. SEGURIDAD: Redirección por defecto */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;