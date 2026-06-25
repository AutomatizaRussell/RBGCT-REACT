// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN DE UTILIDADES - Herramientas de conversión
// Disponible para: Admin2, Usuario, Editor
// ─────────────────────────────────────────────────────────────────────────────

import { useLocation } from 'react-router-dom';
import { LimpiadorMetadatos, ConvertidorArchivos, GestorPDF } from '.';

export default function UtilidadesSection() {
  // El gestor de PDF vive en una ruta por dashboard. Admin2 usa su ruta protegida;
  // el resto de roles (usuario/editor) usan /app/gestor-pdf, accesible para todos.
  const { pathname } = useLocation();
  const gestorPdfPath = pathname.startsWith('/admin') ? '/admin/gestor-pdf' : '/app/gestor-pdf';

  return (
    <div className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap gap-3">
        <LimpiadorMetadatos />
        <ConvertidorArchivos />
        <GestorPDF to={gestorPdfPath} />
      </div>
    </div>
  );
}
