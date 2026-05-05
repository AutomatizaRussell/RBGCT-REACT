import { FileText, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function GestorPDF() {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/app/gestor-pdf')}
      className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all group"
      title="Gestor de PDFs"
    >
      <div className="p-1.5 bg-red-600 rounded-lg">
        <FileText size={16} className="text-white" />
      </div>
      <span className="text-sm font-medium text-slate-700 group-hover:text-red-600">
        Gestor PDF
      </span>
      <ChevronDown size={16} className="text-slate-400" />
    </button>
  );
}
