import React from 'react';
import { AnalysisResult, ExerciseType } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircle, AlertTriangle, Repeat, Activity, Trophy, Sparkles, User } from 'lucide-react';
import MuscleMap from './MuscleMap';

interface ResultViewProps {
  result: AnalysisResult;
  exercise: ExerciseType;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, exercise, onReset }) => {
  
  const isHighPerformance = result.score > 80;

  const scoreData = [
    { 
      name: 'Score', 
      value: result.score, 
      fill: isHighPerformance ? '#fbbf24' : (result.score > 40 ? '#facc15' : '#f87171') // Gold for high score
    }
  ];

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Execução de Elite!";
    if (score >= 70) return "Muito Bom!";
    if (score >= 50) return "Caminho Certo";
    return "Precisa de Ajustes";
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-10">
      <div className="glass-panel rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Confetti / Celebration Background Effect */}
        {isHighPerformance && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-30">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.15),transparent_70%)] animate-pulse" />
          </div>
        )}

        {/* Header */}
        <div className="text-center mb-10 relative z-10">
          <span className="px-4 py-1.5 rounded-full bg-slate-700/50 text-slate-300 text-sm font-medium border border-slate-600/50">
            Relatório de Performance
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 text-white">Análise de {exercise}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 relative z-10">
          
          {/* Main Score Column (Left) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`
              bg-slate-900/40 rounded-3xl p-8 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000
              ${isHighPerformance ? 'shadow-[0_0_40px_rgba(251,191,36,0.15)] border-yellow-500/30' : ''}
            `}>
              {/* Decorative Trophy or Sparkles */}
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className={`w-32 h-32 ${isHighPerformance ? 'text-yellow-400' : 'text-white'}`} />
              </div>
              
              {isHighPerformance && (
                <>
                  <div className="absolute top-6 left-6 animate-float" style={{ animationDelay: '0s' }}>
                    <Sparkles className="w-6 h-6 text-yellow-300 fill-yellow-300/50" />
                  </div>
                  <div className="absolute bottom-10 right-8 animate-float" style={{ animationDelay: '1.5s' }}>
                    <Sparkles className="w-4 h-4 text-emerald-400 fill-emerald-400/50" />
                  </div>
                  <div className="absolute top-1/3 right-4 animate-float" style={{ animationDelay: '0.5s' }}>
                     <div className="w-2 h-2 rounded-full bg-white blur-[1px]" />
                  </div>
                </>
              )}
              
              <h3 className={`text-lg font-medium mb-2 ${isHighPerformance ? 'text-yellow-100' : 'text-slate-300'}`}>
                Pontuação Técnica
              </h3>
              
              <div className="h-56 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    innerRadius="75%" 
                    outerRadius="100%" 
                    barSize={20} 
                    data={scoreData} 
                    startAngle={90} 
                    endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#1e293b' }}
                      dataKey="value"
                      cornerRadius={100}
                    />
                  </RadialBarChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`
                    text-5xl font-bold tracking-tighter
                    ${isHighPerformance 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 animate-text-shimmer drop-shadow-lg' 
                      : 'text-white'}
                  `}>
                    {result.score}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider mt-1 ${isHighPerformance ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {getScoreMessage(result.score)}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col items-center justify-center gap-2">
                 <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-1">
                  <Repeat className="w-6 h-6" />
                </div>
                <span className="text-4xl font-bold text-white">{result.repetitions}</span>
                <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Repetições Válidas</span>
            </div>
          </div>

          {/* Details Column (Middle) - Feedback */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 h-full">
              <h3 className="text-lg font-bold mb-5 flex items-center gap-3 text-white border-b border-slate-700/50 pb-4">
                <CheckCircle className="text-emerald-400 w-5 h-5" /> Detalhes da Execução
              </h3>
              <ul className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                {result.feedback.map((item, index) => (
                  <li key={index} className="flex flex-col gap-2 p-4 bg-slate-800/30 rounded-xl hover:bg-slate-800/50 transition-colors border border-slate-700/30">
                    <div className="flex justify-between items-start gap-3">
                      <span className="text-slate-200 font-medium leading-relaxed text-sm flex-1">
                        {item.message}
                      </span>
                      <span className={`font-bold text-sm ${getScoreTextColor(item.score)}`}>
                        {item.score}
                      </span>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full h-1 bg-slate-700/50 rounded-full overflow-hidden mt-1">
                      <div 
                        className={`h-full ${getScoreColor(item.score)} transition-all duration-1000 ease-out`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Muscle Map & Correction (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
             {/* Muscle Map Card */}
             <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5">
                   <Activity className="w-24 h-24 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-3 text-white z-10">
                  <User className="text-blue-400 w-5 h-5" /> Anatomia da Ativação
                </h3>
                <div className="flex-grow flex flex-col items-center">
                   <MuscleMap muscles={result.muscleGroups} />
                   <div className="flex flex-wrap justify-center gap-1.5 mt-2 z-10">
                    {result.muscleGroups.map((muscle, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full text-[10px] font-bold border border-blue-500/20 uppercase tracking-wide">
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
             </div>

             {/* Correction Card */}
             <div className="bg-amber-500/10 rounded-3xl p-6 border border-amber-500/20 relative overflow-hidden flex-1">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                  <AlertTriangle className="w-24 h-24 text-amber-500" />
                </div>
                <h3 className="text-lg font-bold mb-3 flex items-center gap-3 text-amber-400 relative z-10">
                  <AlertTriangle className="w-5 h-5" /> Correção Principal
                </h3>
                <p className="text-slate-200 leading-relaxed relative z-10 text-sm md:text-base">
                  {result.formCorrection}
                </p>
            </div>
          </div>
        </div>

        <button 
          onClick={onReset}
          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 text-lg tracking-wide hover:scale-[1.01]"
        >
          Analisar Novo Exercício
        </button>
      </div>
    </div>
  );
};

export default ResultView;