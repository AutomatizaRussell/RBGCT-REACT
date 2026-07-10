/**
 * Card — tarjeta moderna con más aire, bordes redondeados, sombras
 */
export default function Card({
  children,
  className = '',
  padding = 'p-6',
  hover = true,
  ...props
}) {
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-rb-sm
        ${padding}
        ${hover ? 'rb-hover-lift' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
