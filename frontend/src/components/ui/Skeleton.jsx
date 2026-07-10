/**
 * SkeletonScreen — reemplazo moderno de spinners de carga
 * Uso: <Skeleton type="card" /> | <Skeleton type="text" lines={3} /> | <Skeleton type="table" rows={5} />
 */
export default function Skeleton({ type = 'text', lines = 3, rows = 5, className = '' }) {
  const baseClass = 'rb-skeleton';

  if (type === 'card') {
    return (
      <div className={`${baseClass} rb-skeleton-card ${className}`} />
    );
  }

  if (type === 'text') {
    return (
      <div className={`space-y-3 ${className}`}>
        {<div className={`${baseClass} rb-skeleton-title`} />}
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className={`${baseClass} rb-skeleton-text`} style={{ width: `${70 + Math.random() * 30}%` }} />
        ))}
      </div>
    );
  }

  if (type === 'avatar') {
    return <div className={`${baseClass} rb-skeleton-avatar ${className}`} />;
  }

  if (type === 'table') {
    return (
      <div className={`space-y-2 ${className}`}>
        {<div className={`${baseClass} h-10 rounded-lg mb-4`} />}
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className={`${baseClass} h-14 rounded-xl`} />
        ))}
      </div>
    );
  }

  if (type === 'dashboard') {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <div key={i} className={`${baseClass} h-32 rounded-2xl`} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {<div className={`${baseClass} h-64 rounded-2xl`} />}
          {<div className={`${baseClass} h-64 rounded-2xl`} />}
        </div>
      </div>
    );
  }

  return <div className={`${baseClass} rb-skeleton-text ${className}`} />;
}
