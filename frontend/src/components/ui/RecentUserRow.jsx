import React from 'react';
import { KeyRound, Check } from 'lucide-react';

export const RecentUserRow = ({ name, time, role, action, isAlert, onMarkRead, estado, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 px-3 rounded-2xl transition-colors cursor-pointer ${
      isAlert ? 'bg-red-50/50 hover:bg-red-50' :
      estado === 'en_linea' ? 'bg-emerald-50/30 hover:bg-emerald-50/50' :
      'hover:bg-slate-50'
    }`}
  >
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${isAlert ? 'bg-red-600' : estado === 'en_linea' ? 'bg-emerald-500' : 'bg-[#001e33]'} text-white rounded-xl flex items-center justify-center font-bold text-xs relative`}>
        {isAlert ? <KeyRound size={16}/> : name.charAt(0).toUpperCase()}
        {estado === 'en_linea' && (
          <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 border-2 border-white rounded-full"/>
        )}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{name}</p>
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-500' : estado === 'en_linea' ? 'text-emerald-600' : 'text-slate-400'}`}>{role}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-600' : action === 'En Línea' ? 'text-emerald-600' : 'text-slate-500'}`}>{action}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
      {isAlert && (
        <button
          onClick={e => { e.stopPropagation(); onMarkRead(); }}
          className="p-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          title="Marcar como gestionada"
        >
          <Check size={14}/>
        </button>
      )}
    </div>
  </div>
);

export default RecentUserRow;
