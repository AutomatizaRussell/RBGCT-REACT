import clsx from 'clsx'

/**
 * Helper central para componer clases CSS.
 *
 * Intención:
 * - Evitar plantillas largas con muchos ternarios.
 * - Estandarizar composición de clases Tailwind.
 * - Permitir variantes visuales limpias durante el rediseño global.
 */
export function cn(...classes) {
  return clsx(classes)
}