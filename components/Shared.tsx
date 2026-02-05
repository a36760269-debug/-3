import React from 'react';

export const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white p-6 rounded-2xl shadow-sm border border-slate-100 ${className}`}>
    {children}
  </div>
);

export const SectionTitle = ({ title, icon: Icon }: { title: string, icon?: any }) => (
  <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2 mb-6">
    {Icon && <Icon className="text-teal-600" size={28} />}
    <span>{title}</span>
  </h2>
);

export const Button = ({ children, onClick, variant = 'primary', className = "", disabled = false }: any) => {
  const baseStyle = "px-4 py-2 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 active:scale-95";
  const variants = {
    primary: "bg-teal-600 text-white hover:bg-teal-700 shadow-lg shadow-teal-600/20",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-50 text-red-600 hover:bg-red-100",
    outline: "border-2 border-slate-200 text-slate-600 hover:border-slate-300"
  };
  return (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`${baseStyle} ${variants[variant as keyof typeof variants]} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};
