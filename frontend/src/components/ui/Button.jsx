/**
 * Button — botón moderno con gradiente sutil, texto blanco, rounded-full
 * Variantes: primary (azul→cyan), secondary (gris), danger (rojo)
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  onClick,
  type = 'button',
  className = '',
  ...props
}) {
  const sizeClasses = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
  };

  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#001871] to-[#00a9ce] text-white shadow-md hover:shadow-lg',
    secondary: 'bg-white text-[#1e293b] border border-[#dce3e8] shadow-sm hover:shadow-md hover:bg-[#f8fafc]',
    danger: 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md hover:shadow-lg',
    ghost: 'bg-transparent text-[#64748b] hover:bg-[#f1f5f9]',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center gap-2
        rounded-full font-semibold
        transition-all duration-200
        hover:scale-[1.02] active:scale-[0.98]
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${sizeClasses[size]}
        ${variantClasses[variant]}
        ${className}
      `}
      {...props}
    >
      {loading && (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
}
