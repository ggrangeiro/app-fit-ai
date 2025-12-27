import React from 'react';
import { ExerciseType } from '../types';
import { CheckCircle2 } from 'lucide-react';

interface ExerciseCardProps {
  type: ExerciseType;
  imageUrl: string;
  selected: boolean;
  onClick: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ type, imageUrl, selected, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`
        group relative flex flex-col items-center justify-end p-4 rounded-3xl transition-all duration-300 h-64 w-full overflow-hidden
        ${selected 
          ? 'animate-selected-glow ring-2 ring-blue-400' 
          : 'hover:scale-[1.02] hover:shadow-xl'}
      `}
    >
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full">
        <img 
          src={imageUrl} 
          alt={type} 
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        {/* Overlay gradient - darker when not selected for better text contrast */}
        <div className={`absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent transition-opacity duration-300 ${selected ? 'opacity-90' : 'opacity-80 group-hover:opacity-70'}`} />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full flex flex-col items-center text-center">
        {selected && (
          <div className="mb-2 text-blue-400 animate-in zoom-in duration-300">
            <CheckCircle2 className="w-8 h-8 fill-blue-500/20" />
          </div>
        )}
        <span className={`font-bold text-xl tracking-wide transition-colors duration-300 ${selected ? 'text-white' : 'text-slate-100 group-hover:text-white'}`}>
          {type}
        </span>
      </div>
    </button>
  );
};

export default ExerciseCard;