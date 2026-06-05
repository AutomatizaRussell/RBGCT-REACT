import React from 'react'

/**
 * ErrorBoundary para DevPreview.
 *
 * Intención:
 * - Evitar que un componente roto tumbe toda la galería visual.
 * - Mostrar qué componente falló para corregir props, mocks o dependencias.
 *
 * Restricción:
 * - Solo debe usarse en desarrollo visual.
 * - No reemplaza manejo real de errores en producción.
 */
export default class PreviewErrorBoundary extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      hasError: false,
      error: null,
    }
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[DevPreview] Error renderizando componente:', {
      componentName: this.props.name,
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">
          <p className="font-semibold text-red-700">
            Falló el componente: {this.props.name}
          </p>

          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg bg-white p-3 text-xs text-red-600">
            {String(this.state.error?.message || this.state.error)}
          </pre>
        </div>
      )
    }

    return this.props.children
  }
}
