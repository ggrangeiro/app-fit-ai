import React from 'react';
import { AnalysisResult, ExerciseType } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircle, AlertTriangle, Repeat, Activity, Trophy } from 'lucide-react';

interface ResultViewProps {
  result: AnalysisResult;
  exercise: ExerciseType;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, exercise, onReset }) => {
  
  const scoreData = [
    { name: 'Score', value: result.score, fill: result.score > 70 ? '#4ade80' : result.score > 40 ? '#facc15' : '#f87171' }
  ];

  const getScoreMessage = (score: number) => {
    if (score >= 90) return "Execução de Elite!";
    if (score >= 70) return "Muito Bom!";
    if (score >= 50) return "Caminho Certo";
    return "Precisa de Ajustes";
  };

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in pb-10">
      <div className="glass-panel rounded-[2rem] p-6 md:p-10 shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-10">
          <span className="px-4 py-1.5 rounded-full bg-slate-700/50 text-slate-300 text-sm font-medium border border-slate-600/50">
            Relatório de Performance
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 text-white">Análise de {exercise}</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
          
          {/* Main Score Column */}
          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Trophy className="w-32 h-32 text-white" />
              </div>
              
              <h3 className="text-lg font-medium text-slate-300 mb-2">Pontuação Técnica</h3>
              <div className="h-64 w-full relative z-10">
                <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    innerRadius="75%" 
                    outerRadius="100%" 
                    barSize={24} 
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
                  <span className="text-6xl font-bold text-white tracking-tighter">{result.score}</span>
                  <span className="text-sm font-medium text-slate-400 uppercase tracking-wider mt-1">{getScoreMessage(result.score)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center justify-center gap-2">
                 <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-1">
                  <Repeat className="w-6 h-6" />
                </div>
                <span className="text-3xl font-bold text-white">{result.repetitions}</span>
                <span className="text-xs text-slate-400 uppercase font-semibold">Repetições</span>
              </div>
              <div className="bg-slate-900/40 rounded-2xl p-5 border border-slate-700/50 flex flex-col items-center justify-center text-center">
                 <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-full mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {result.muscleGroups.slice(0, 2).map((muscle, idx) => (
                    <span key={idx} className="px-2 py-1 bg-slate-700/50 text-slate-200 rounded text-[10px] font-bold border border-slate-600/30">
                      {muscle}
                    </span>
                  ))}
                  {result.muscleGroups.length > 2 && (
                     <span className="px-2 py-1 bg-slate-700/50 text-slate-200 rounded text-[10px] font-bold border border-slate-600/30">+{result.muscleGroups.length - 2}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Details Column */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            <div className="bg-slate-900/40 rounded-3xl p-8 border border-slate-700/50 h-full">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-3 text-white border-b border-slate-700/50 pb-4">
                <CheckCircle className="text-emerald-400 w-6 h-6" /> Pontos de Análise
              </h3>
              <ul className="space-y-4">
                {result.feedback.map((item, index) => (
                  <li key={index} className="flex gap-4 p-3 hover:bg-slate-800/50 rounded-xl transition-colors">
                    <div className="mt-1 min-w-[24px]">
                       <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center border border-blue-500/30 text-blue-400 text-xs font-bold">
                         {index + 1}
                       </div>
                    </div>
                    <span className="text-slate-300 leading-relaxed text-sm md:text-base">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-amber-500/10 rounded-3xl p-8 border border-amber-500/20 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-4 opacity-5">
                <AlertTriangle className="w-24 h-24 text-amber-500" />
              </div>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-3 text-amber-400 relative z-10">
                <AlertTriangle className="w-6 h-6" /> Correção Principal
              </h3>
              <p className="text-slate-200 leading-relaxed relative z-10 text-lg">
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