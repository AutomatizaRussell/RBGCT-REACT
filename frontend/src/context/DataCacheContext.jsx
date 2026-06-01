import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { getAllEmpleados, getAllAreas, getAllCargos } from '../lib/api';

const DataCacheContext = createContext(null);

const TTL_MS = 5 * 60 * 1000; // 5 minutos

export const DataCacheProvider = ({ children }) => {
  const [empleados, setEmpleados] = useState(null);
  const [areas,     setAreas]     = useState(null);
  const [cargos,    setCargos]    = useState(null);
  const [loadingEmpleados, setLoadingEmpleados] = useState(false);
  const [loadingAreas,     setLoadingAreas]     = useState(false);
  const [loadingCargos,    setLoadingCargos]    = useState(false);

  const tsRef = useRef({ empleados: 0, areas: 0, cargos: 0 });

  const fetchEmpleados = useCallback(async (force = false) => {
    if (!force && empleados && (Date.now() - tsRef.current.empleados) < TTL_MS) return empleados;
    setLoadingEmpleados(true);
    try {
      const data = await getAllEmpleados();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setEmpleados(list);
      tsRef.current.empleados = Date.now();
      return list;
    } catch { return empleados || []; }
    finally { setLoadingEmpleados(false); }
  }, [empleados]);

  const fetchAreas = useCallback(async (force = false) => {
    if (!force && areas && (Date.now() - tsRef.current.areas) < TTL_MS) return areas;
    setLoadingAreas(true);
    try {
      const data = await getAllAreas();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setAreas(list);
      tsRef.current.areas = Date.now();
      return list;
    } catch { return areas || []; }
    finally { setLoadingAreas(false); }
  }, [areas]);

  const fetchCargos = useCallback(async (force = false) => {
    if (!force && cargos && (Date.now() - tsRef.current.cargos) < TTL_MS) return cargos;
    setLoadingCargos(true);
    try {
      const data = await getAllCargos();
      const list = Array.isArray(data) ? data : (data?.results || []);
      setCargos(list);
      tsRef.current.cargos = Date.now();
      return list;
    } catch { return cargos || []; }
    finally { setLoadingCargos(false); }
  }, [cargos]);

  // Precarga silenciosa: lanza los 3 fetches en paralelo al montar
  const preload = useCallback(() => {
    fetchEmpleados();
    fetchAreas();
    fetchCargos();
  }, [fetchEmpleados, fetchAreas, fetchCargos]);

  // Invalida el caché (fuerza recarga en el próximo acceso)
  const invalidate = useCallback((key) => {
    if (!key || key === 'empleados') tsRef.current.empleados = 0;
    if (!key || key === 'areas')     tsRef.current.areas     = 0;
    if (!key || key === 'cargos')    tsRef.current.cargos    = 0;
  }, []);

  return (
    <DataCacheContext.Provider value={{
      empleados:        empleados || [],
      areas:            areas     || [],
      cargos:           cargos    || [],
      loadingEmpleados,
      loadingAreas,
      loadingCargos,
      fetchEmpleados,
      fetchAreas,
      fetchCargos,
      preload,
      invalidate,
    }}>
      {children}
    </DataCacheContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useDataCache = () => {
  const ctx = useContext(DataCacheContext);
  if (!ctx) throw new Error('useDataCache debe usarse dentro de DataCacheProvider');
  return ctx;
};
