/**
 * Input — input moderno con bottom border animado y label flotante
 */
export default function Input({
  label,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  disabled = false,
  className = '',
  ...props
}) {
  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-xs font-semibold text-[#64748b] uppercase tracking-wider mb-2">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        disabled={disabled}
        placeholder={placeholder}
        className={`
          w-full px-4 py-3
          bg-white rounded-xl
          border-2 border-[#e2e8f0]
          text-sm text-[#1e293b]
          placeholder:text-[#94a3b8]
          transition-all duration-200
          focus:outline-none focus:border-[#001871] focus:shadow-[0_4px_12px_-4px_rgba(0,24,113,0.08)]
          hover:border-[#cbd5e1]
          disabled:bg-[#f1f5f9] disabled:cursor-not-allowed
          ${error ? 'border-red-400 focus:border-red-400' : ''}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium">{error}</p>
      )}
    </div>
  );
}
