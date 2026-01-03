import React from 'react';
import { ExerciseType } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface ExerciseCardProps {
  type: ExerciseType;
  icon: React.ReactNode; // Alterado de imageUrl para icon
  selected: boolean;
  onClick: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ type, icon, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-center p-6 rounded-3xl transition-all duration-300 h-48 w-full overflow-hidden border
        ${selected 
          ? 'bg-blue-900/20 border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.3)] scale-[1.02]' 
          : 'bg-slate-800/40 border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:shadow-xl hover:-translate-y-1'}
      `}
    >
      {/* Background Decor: Grid Pattern & Gradient Glow */}
      <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
      
      <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-500 ${selected ? 'from-blue-600/20 via-transparent to-transparent opacity-100' : 'from-slate-700/20 via-transparent to-transparent opacity-0 group-hover:opacity-100'}`} />

      {/* Selection Checkmark Badge */}
      <div className={`absolute top-4 right-4 transition-all duration-300 ${selected ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>
        <div className="bg-blue-500 text-white rounded-full p-1 shadow-lg">
           <CheckCircle2 className="w-4 h-4" />
        </div>
      </div>

      {/* Main Icon Container */}
      <div className={`
        relative z-10 p-4 rounded-2xl mb-4 transition-all duration-300 shadow-lg
        ${selected 
          ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-blue-500/30 scale-110' 
          : 'bg-slate-700/50 text-slate-300 group-hover:bg-slate-700 group-hover:text-blue-400 group-hover:scale-110'}
      `}>
        {/* Clone element to force specific size styling if needed, otherwise render as is */}
        {React.isValidElement(icon) 
          ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-8 h-8 md:w-10 md:h-10" })
          : icon
        }
      </div>

      {/* Text Label */}
      <span className={`
        relative z-10 font-bold text-base md:text-lg tracking-tight text-center leading-tight transition-colors duration-300
        ${selected ? 'text-white' : 'text-slate-400 group-hover:text-white'}
      `}>
        {type}
      </span>
    </button>
  );
};

export default ExerciseCard;