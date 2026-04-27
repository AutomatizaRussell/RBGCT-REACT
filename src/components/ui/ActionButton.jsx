import React from 'react';

export const ActionButton = ({ label, icon, primary, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${
      primary ? 'bg-[#001e33] text-white hover:bg-slate-800' : 'bg-slate-100 text-[#001e33] hover:bg-slate-200 border border-slate-200'
    }`}
  >
    {icon} {label}
  </button>
);

export default ActionButton;
