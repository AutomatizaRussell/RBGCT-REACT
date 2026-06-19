import { createContext, useState, useEffect } from 'react';
import { login as apiLogin, logout as apiLogout, completarDatosEmpleado, pingActividad, tokenStorage, getEmpleadoById } from '../lib/api';

const AuthContext = createContext(null);

// Mapeo de id_permisos a nombres de rol
// SuperAdmin es especial (tabla superadmin), no usa id_permisos
const ROLE_MAP = {
  1: 'admin',      // Admin (puede haber varios)
  2: 'editor',     // Editor
  3: 'usuario'     // Usuario normal
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [empleadoData, setEmpleadoData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar sesión desde el storage correcto al iniciar
  useEffect(() => {
    const checkSession = () => {
      try {
        const accessToken = tokenStorage.getAccess();
        const store = tokenStorage._store();
        const savedUser = store.getItem('gct_user');
        const savedEmpleado = store.getItem('gct_empleado');
        const savedRole = store.getItem('gct_role');

        if (!accessToken || !savedUser || !savedEmpleado) {
          // Sin token válido: limpiar todo
          tokenStorage.clear();
          const s = tokenStorage._store();
          s.removeItem('gct_user');
          s.removeItem('gct_empleado');
          s.removeItem('gct_role');
          s.removeItem('gct_primer_login');
          return;
        }

        // Verificar que el token no esté expirado (sin llamar al servidor)
        try {
          const [, payloadB64] = accessToken.split('.');
          const payload = JSON.parse(atob(payloadB64));
          if (payload.exp * 1000 < Date.now()) {
            // Token expirado: el refresh se intentará en la primera llamada protegida
            console.log('[AUTH] Access token expirado, se renovará en próxima petición');
          }
        } catch {
          // Token malformado
          tokenStorage.clear();
          return;
        }

        setUser(JSON.parse(savedUser));
        setEmpleadoData(JSON.parse(savedEmpleado));
        setUserRole(savedRole || 'usuario');
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Escuchar evento de sesión expirada (emitido por api.js cuando el refresh falla)
    const onExpired = () => {
      setUser(null);
      setUserRole(null);
      setEmpleadoData(null);
      localStorage.clear();
    };
    window.addEventListener('gct:session-expired', onExpired);
    return () => window.removeEventListener('gct:session-expired', onExpired);
  }, []);

  // Refrescar datos del empleado al cargar sesión para evitar permisos desactualizados en localStorage.
  useEffect(() => {
    const syncEmpleado = async () => {
      if (!user || userRole === 'superadmin' || !empleadoData?.id_empleado) return;
      try {
        const freshEmpleado = await getEmpleadoById(empleadoData.id_empleado);
        if (!freshEmpleado || typeof freshEmpleado !== 'object') return;
        setEmpleadoData(freshEmpleado);
        localStorage.setItem('gct_empleado', JSON.stringify(freshEmpleado));
      } catch (error) {
        console.warn('[AUTH] No se pudo refrescar perfil del empleado:', error);
      }
    };

    syncEmpleado();
  }, [user, userRole, empleadoData?.id_empleado]);

  // Heartbeat: mantener sesión activa enviando ping cada 5 minutos
  useEffect(() => {
    if (!user) return;

    const sendPing = async () => {
      try {
        await pingActividad();
      } catch (error) {
        console.warn('[HEARTBEAT]', error.message);
      }
    };

    // Enviar ping inmediatamente al montar
    sendPing();

    // Enviar ping cada 5 minutos (300000 ms)
    const interval = setInterval(sendPing, 300000);

    return () => clearInterval(interval);
  }, [user]);

  const login = async (email, password, rememberMe = true) => {
    try {
      const result = await apiLogin(email, password, rememberMe);
      const store = tokenStorage._store();

      if (result.type === 'superadmin') {
        const userData = {
          id: result.user.id,
          email: result.user.email,
          nombre: result.user.nombre,
          apellido: result.user.apellido,
        };

        setUser(userData);
        setUserRole('superadmin');
        setEmpleadoData({ ...result.user, id_permisos: 1 });

        store.setItem('gct_user', JSON.stringify(userData));
        store.setItem('gct_empleado', JSON.stringify({ ...result.user, id_permisos: 1 }));
        store.setItem('gct_role', 'superadmin');

        return { user: userData };

      } else if (result.type === 'empleado') {
        if (result.requiere_verificacion) {
          return {
            user: null,
            requiereVerificacion: true,
            empleadoData: result.user,
            mensaje: result.mensaje,
          };
        }

        const userData = {
          id: result.user.id_empleado,
          email: result.user.correo_corporativo,
        };
        const role = ROLE_MAP[result.user.id_permisos] || 'usuario';

        setUser(userData);
        setEmpleadoData(result.user);
        setUserRole(role);

        store.setItem('gct_user', JSON.stringify(userData));
        store.setItem('gct_empleado', JSON.stringify(result.user));
        store.setItem('gct_role', role);

        const necesitaCompletarDatos = result.user.primer_login || !result.user.datos_completados;
        store.setItem('gct_primer_login', necesitaCompletarDatos ? 'true' : 'false');

        return { user: userData, primerLogin: necesitaCompletarDatos, empleadoData: result.user };
      }
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  };

  const logout = async () => {
    apiLogout();          // limpia tokens JWT del localStorage
    setUser(null);
    setUserRole(null);
    setEmpleadoData(null);
    localStorage.clear();
    sessionStorage.clear();
  };

  // Función para completar datos del empleado (primer login o edición habilitada)
  const completarDatos = async (datos) => {
    try {
      if (!empleadoData || !empleadoData.id_empleado) {
        throw new Error('No hay datos de empleado');
      }
      
      // Preparar datos a enviar
      const datosAEnviar = {
        primer_nombre: datos.primer_nombre,
        segundo_nombre: datos.segundo_nombre,
        primer_apellido: datos.primer_apellido,
        segundo_apellido: datos.segundo_apellido,
        apodo: datos.apodo,
        tipo_documento: datos.tipo_documento,
        numero_documento: datos.numero_documento,
        lugar_expedicion: datos.lugar_expedicion || null,
        fecha_expedicion: datos.fecha_expedicion || null,
        correo_personal: datos.correo_personal,
        telefono: datos.telefono,
        telefono_emergencia: datos.telefono_emergencia,
        nombre_contacto_emergencia: datos.nombre_contacto_emergencia,
        parentesco_emergencia: datos.parentesco_emergencia,
        fecha_nacimiento: datos.fecha_nacimiento,
        fecha_ingreso: datos.fecha_ingreso || null,
        direccion: datos.direccion,
        sexo: datos.sexo,
        tipo_sangre: datos.tipo_sangre,
        area_id: datos.area_id,
        cargo_id: datos.cargo_id
      };
      
      // Agregar nueva contraseña si se proporcionó (solo en primer login)
      if (datos.nueva_password) {
        datosAEnviar.nueva_password = datos.nueva_password;
      }
      
      // En primer login NO se requiere contraseña. Solo si es edición posterior.
      const password = datos.password || null;
      
      const result = await completarDatosEmpleado(
        empleadoData.id_empleado,
        password,
        datosAEnviar
      );
      
      // Actualizar estado local - revocar permiso de edición después de usarlo
      const updatedEmpleadoData = { 
        ...empleadoData, 
        ...datosAEnviar,
        primer_login: false,
        datos_completados: true,
        permitir_edicion_datos: false  // Revocar permiso después de actualizar
      };
      
      setEmpleadoData(updatedEmpleadoData);
      localStorage.setItem('gct_empleado', JSON.stringify(updatedEmpleadoData));
      localStorage.setItem('gct_primer_login', 'false');
      
      return result;
    } catch (error) {
      console.error('Error completando datos:', error);
      throw error;
    }
  };

  // Verificar si el usuario necesita completar datos o tiene permiso para editar
  const needsProfileCompletion = () => {
    if (!empleadoData) return false;
    // Necesita completar datos si es primer login, no ha completado datos, o el admin le dio permiso de edición
    return empleadoData.primer_login || 
           !empleadoData.datos_completados || 
           empleadoData.permitir_edicion_datos;
  };

  // Función para setear empleadoData después de verificación de código
  // data puede incluir accessToken y refreshToken si el endpoint los retorna
  const setEmpleadoDataVerify = (data, tokens = {}) => {
    if (tokens.accessToken) {
      tokenStorage.set(tokens.accessToken, tokens.refreshToken);
    }
    const userData = { id: data.id_empleado, email: data.correo_corporativo };
    const role = ROLE_MAP[data.id_permisos] || 'usuario';
    setEmpleadoData(data);
    setUser(userData);
    setUserRole(role);
    localStorage.setItem('gct_empleado', JSON.stringify(data));
    localStorage.setItem('gct_user', JSON.stringify(userData));
    localStorage.setItem('gct_role', role);
  };

  // Funciones helper para verificar permisos
  const isSuperAdmin = userRole === 'superadmin';
  const isAdmin = userRole === 'admin';      // Admin (id_permisos=1)
  const isEditor = userRole === 'editor';    // Editor (id_permisos=2)
  const isUsuario = userRole === 'usuario';  // Usuario (id_permisos=3)
  
  // Jerarquía: SuperAdmin > Admin > Editor > Usuario
  // SuperAdmin puede TODO (único, no es empleado)
  // Admin puede gestionar usuarios activos (varios admins permitidos)
  // Editor puede editar pero no gestionar seguridad
  // Usuario solo puede ver su propia información
  
  // Ver gestión de personal: SuperAdmin, Admin y Editor
  const canViewUserManagement = isSuperAdmin || isAdmin || isEditor;
  
  // Editar usuarios activos: SuperAdmin, Admin y Editor
  const canEditUsers = isSuperAdmin || isAdmin || isEditor;
  
  // Cambiar roles: SuperAdmin y Admin
  const canChangeRoles = isSuperAdmin || isAdmin;
  
  // Reactivar usuarios inactivos: Solo SuperAdmin
  const canReactivateUsers = isSuperAdmin;
  
  // Eliminar usuarios: Solo SuperAdmin
  const canDeleteUsers = isSuperAdmin;
  
  // Ver usuarios inactivos: Solo SuperAdmin
  const canViewInactiveUsers = isSuperAdmin;
  
  // Desactivar usuarios: SuperAdmin y Admin (Editor NO puede desactivar)
  const canDeactivateUsers = isSuperAdmin || isAdmin;

  // Solo SuperAdmin puede crear usuarios
  const canCreateUsers = isSuperAdmin;

  const value = {
    user,
    userRole,
    empleadoData,
    loading,
    login,
    logout,
    completarDatos,
    needsProfileCompletion,
    isAuthenticated: !!user,
    setEmpleadoDataVerify,
    // Roles
    isSuperAdmin,
    isAdmin,
    isEditor,
    isUsuario,
    // Permisos específicos
    canViewUserManagement,
    canEditUsers,
    canChangeRoles,
    canReactivateUsers,
    canDeleteUsers,
    canViewInactiveUsers,
    canDeactivateUsers,
    canCreateUsers
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
