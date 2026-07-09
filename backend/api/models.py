# Backward-compatibility shim — los modelos viven en sus propias apps con schema PostgreSQL.
# Las views y serializers de api/ importan desde aquí sin cambios.

from sistema.models import SuperAdmin, SuperAdminManager, ApiKey, Alerta, SolicitudesPassword, N8nLog
from empleados.models import (
    DatosArea, DatosCargo,
    Persona, DatosContacto, DatosAcademicos, Hijo,
    DatosEmpleado,
    MovimientoLaboral,
)
from contratos.models import (
    EntidadEPS, EntidadAFP, EntidadARL, CajaCompensacion,
    Contrato, ContratoRenovacion,
    AfiliacionSeguridadSocial,
)
from formacion.models import (
    Curso, CursoModulo, CursoContenido, CursoProgreso, CuestionarioIntento,
    CursoHistorial, NotificacionCurso,
    AsignacionFormacion, ExclusionFormacion,
    PlanOnboarding, PasoOnboarding, AsignacionOnboarding,
    ReglamentoItem,
)
from tareas.models import TareasCalendario, SugerenciaEmpleado

__all__ = [
    'SuperAdmin', 'SuperAdminManager', 'ApiKey', 'Alerta', 'SolicitudesPassword', 'N8nLog',
    'DatosArea', 'DatosCargo', 'Persona', 'DatosContacto', 'DatosAcademicos', 'Hijo',
    'DatosEmpleado', 'MovimientoLaboral',
    'EntidadEPS', 'EntidadAFP', 'EntidadARL', 'CajaCompensacion',
    'Contrato', 'ContratoRenovacion', 'AfiliacionSeguridadSocial',
    'Curso', 'CursoModulo', 'CursoContenido', 'CursoProgreso', 'CuestionarioIntento',
    'CursoHistorial', 'NotificacionCurso',
    'AsignacionFormacion', 'ExclusionFormacion',
    'PlanOnboarding', 'PasoOnboarding', 'AsignacionOnboarding',
    'ReglamentoItem',
    'TareasCalendario', 'SugerenciaEmpleado',
]
