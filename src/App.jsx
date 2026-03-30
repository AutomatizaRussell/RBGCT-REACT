import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Vistas principales
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';

// Componentes que se mostrarán dentro del Dashboard
import UserTable from './components/users/UserTable';
import CreateUserPage from './components/users/CreateUserPage';

function App() {
  return (
    <Router>
      <Routes>
        {/* 1. LOGIN: Independiente del resto del diseño */}
        <Route path="/" element={<Login />} />

        {/* 2. ADMIN: El contenedor principal */}
        {/* Al usar rutas anidadas, el AdminDashboard servirá de "marco" */}
        <Route path="/admin" element={<AdminDashboard />}>
          
          {/* Ruta por defecto dentro de /admin (Muestra la tabla) */}
          <Route index element={<UserTable />} />
          
          {/* Ruta específica: /admin/usuarios/nuevo */}
          <Route path="usuarios/nuevo" element={<CreateUserPage />} />
          
        </Route>

        {/* 3. COMODÍN: Redirección por seguridad */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}

export default App;