import React from 'react';
import { KeyRound, Check } from 'lucide-react';

export const RecentUserRow = ({ name, time, role, action, isAlert, onMarkRead }) => (
  <div className={`flex items-center justify-between py-4 border-b border-slate-50 last:border-0 px-3 rounded-2xl transition-colors ${isAlert ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-slate-50'}`}>
    <div className="flex items-center gap-4">
      <div className={`w-10 h-10 ${isAlert ? 'bg-red-600' : 'bg-[#001e33]'} text-white rounded-xl flex items-center justify-center font-bold text-xs`}>
        {isAlert ? <KeyRound size={16}/> : name.charAt(0).toUpperCase()}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-800 tracking-tight">{name}</p>
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-500' : 'text-slate-400'}`}>{role}</p>
      </div>
    </div>
    <div className="flex items-center gap-4">
      <div className="text-right">
        <p className={`text-[10px] font-bold uppercase ${isAlert ? 'text-red-600' : 'text-emerald-600'}`}>{action}</p>
        <p className="text-[10px] text-slate-400 font-medium">{time}</p>
      </div>
      {isAlert && (
        <button 
          onClick={onMarkRead}
          className="p-2 bg-white text-red-600 border border-red-100 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
          title="Marcar como gestionada"
        >
          <Check size={14} />
        </button>
      )}
    </div>
  </div>
);

export default RecentUserRow;
