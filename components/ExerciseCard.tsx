import React from 'react';
import { ExerciseType } from '../types';
import { Activity, Dumbbell, PersonStanding } from 'lucide-react';

interface ExerciseCardProps {
  type: ExerciseType;
  selected: boolean;
  onClick: () => void;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ type, selected, onClick }) => {
  const getIcon = () => {
    switch (type) {
      case ExerciseType.SQUAT: return <PersonStanding className="w-8 h-8" />;
      case ExerciseType.PUSHUP: return <Activity className="w-8 h-8" />;
      case ExerciseType.LUNGE: return <Activity className="w-8 h-8" />;
      case ExerciseType.BURPEE: return <Activity className="w-8 h-8" />;
      default: return <Dumbbell className="w-8 h-8" />;
    }
  };

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center p-6 rounded-2xl transition-all duration-300 border-2
        ${selected 
          ? 'bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-900/50 scale-105' 
          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-slate-500'}
      `}
    >
      <div className="mb-4 p-3 bg-white/10 rounded-full">
        {getIcon()}
      </div>
      <span className="font-semibold text-lg text-center">{type}</span>
    </button>
  );
};

export default ExerciseCard;