import { useState, useEffect } from 'react';
import { 
  getEmpleadoById, 
  getEmpleadoByEmail, 
  getAllTareas, 
  getTareasByEmpleado, 
  updateTareaEstado, 
  createTarea, 
  getAllAreas, 
  getAllEmpleados, 
  updateEmpleado 
} from '../lib/db';

export const useDatabase = () => {
  const [dbReady, setDbReady] = useState(true); // API REST siempre lista
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Wrapper async para operaciones
  const executeQuery = async (operation) => {
    setLoading(true);
    setError(null);
    try {
      const result = await operation();
      return result;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Funciones de API
  const tareas = {
    select: () => executeQuery(getAllTareas),
    selectByEmpleado: (idEmpleado) => executeQuery(() => getTareasByEmpleado(idEmpleado)),
    update: (id, data) => executeQuery(async () => {
      if (data.estado) {
        await updateTareaEstado(id, data.estado);
      }
      return { id, ...data };
    }),
    insert: (data) => executeQuery(() => createTarea(data)),
  };

  const empleados = {
    select: () => executeQuery(getAllEmpleados),
    selectById: (id) => executeQuery(() => getEmpleadoById(id)),
    selectByEmail: (email) => executeQuery(() => getEmpleadoByEmail(email)),
    update: (id, data) => executeQuery(() => updateEmpleado(id, data)),
  };

  const areas = {
    select: () => executeQuery(getAllAreas),
  };

  return {
    dbReady,
    loading,
    error,
    tareas,
    empleados,
    areas,
  };
};

export default useDatabase;
