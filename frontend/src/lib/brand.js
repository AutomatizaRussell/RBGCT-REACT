/**
 * Tokens de marca migrados desde la plataforma Next.js.
 *
 * Fuente visual:
 * - Plataforma de Revisoría / Caracterización / Impulsa.
 *
 * Intención:
 * - Centralizar colores corporativos.
 * - Evitar hexadecimales repetidos.
 * - Facilitar la migración visual global de React/Vite.
 */
export const BRAND = {
  navy: '#001871',
  lightBlue: '#00a9ce',
  purple: '#981d97',
  teal: '#00bfb3',
  orange: '#ed8b00',
  card: '#f8fafc',
  text: '#1e293b',
  border: '#dce3e8',
}

/**
 * Patrones visuales reutilizables.
 *
 * No reemplazan componentes UI, pero sirven como punto común
 * para mantener consistencia mientras se migra toda la interfaz.
 */
export const RB_STYLES = {
  page: 'min-h-screen bg-slate-100 text-slate-900',
  shell: 'mx-auto w-full max-w-[1500px] px-6 py-6',
  card: 'rounded-2xl border border-slate-200 bg-white shadow-sm',
  cardSoft: 'rounded-2xl border border-slate-200 bg-[#f8fafc] shadow-sm',
  sectionTitle: 'text-sm font-extrabold uppercase tracking-widest text-[#001871]',
  mutedText: 'text-sm text-slate-500',
}