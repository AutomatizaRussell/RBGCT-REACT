import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Loader2 } from 'lucide-react';

const getDefaultRoute = (role) => {
  switch (role) {
    case 'superadmin': return '/admin';
    case 'admin': return '/admin2';
    case 'editor': return '/editor';
    case 'usuario': return '/app';
    default: return '/';
  }
};

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { userRole, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f1f5f9]">
        <div className="flex flex-col items-center text-slate-400">
          <Loader2 className="animate-spin mb-4" size={40} />
          <p className="font-bold uppercase tracking-widest text-[10px]">Verificando acceso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    const defaultRoute = getDefaultRoute(userRole);
    return <Navigate to={defaultRoute} replace />;
  }

  return children;
};

export default ProtectedRoute;
