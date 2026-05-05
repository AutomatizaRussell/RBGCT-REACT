// ─────────────────────────────────────────────────────────────────────────────
// SECCIÓN DE UTILIDADES - Herramientas de conversión
// Disponible para: Admin2, Usuario, Editor
// ─────────────────────────────────────────────────────────────────────────────

import { LimpiadorMetadatos, ConvertidorArchivos, GestorPDF } from '../tools';

export default function UtilidadesSection() {
  return (
    <div className="w-full max-w-none space-y-4">
      <div className="flex flex-wrap gap-3">
        <LimpiadorMetadatos />
        <ConvertidorArchivos />
        <GestorPDF />
      </div>
    </div>
  );
}
