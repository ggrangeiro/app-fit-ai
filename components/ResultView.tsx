import React from 'react';
import { AnalysisResult, ExerciseType } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircle, AlertTriangle, Repeat, Activity } from 'lucide-react';

interface ResultViewProps {
  result: AnalysisResult;
  exercise: ExerciseType;
  onReset: () => void;
}

const ResultView: React.FC<ResultViewProps> = ({ result, exercise, onReset }) => {
  
  const scoreData = [
    { name: 'Score', value: result.score, fill: result.score > 70 ? '#4ade80' : result.score > 40 ? '#facc15' : '#f87171' }
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 animate-fade-in">
      <div className="bg-slate-800 rounded-3xl p-8 shadow-2xl border border-slate-700">
        <h2 className="text-3xl font-bold text-center mb-2 text-white">Análise de {exercise}</h2>
        <p className="text-center text-slate-400 mb-8">Confira seu desempenho abaixo</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Score Circle */}
          <div className="flex flex-col items-center justify-center bg-slate-900/50 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 text-slate-200">Pontuação Técnica</h3>
            <div className="h-64 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  innerRadius="70%" 
                  outerRadius="100%" 
                  barSize={20} 
                  data={scoreData} 
                  startAngle={90} 
                  endAngle={-270}
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                  <text 
                    x="50%" 
                    y="50%" 
                    textAnchor="middle" 
                    dominantBaseline="middle" 
                    className="fill-white text-4xl font-bold"
                  >
                    {result.score}
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Key Stats */}
          <div className="grid grid-cols-1 gap-4">
            <div className="bg-slate-900/50 rounded-2xl p-6 flex items-center gap-4">
              <div className="p-4 bg-blue-500/20 text-blue-400 rounded-full">
                <Repeat className="w-8 h-8" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Repetições Válidas</p>
                <p className="text-3xl font-bold text-white">{result.repetitions}</p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-2xl p-6 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-2 text-slate-400">
                <Activity className="w-4 h-4" />
                <span className="text-sm">Músculos Ativados</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.muscleGroups.map((muscle, idx) => (
                  <span key={idx} className="px-3 py-1 bg-slate-700 text-slate-200 rounded-full text-xs font-medium border border-slate-600">
                    {muscle}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-slate-900/50 rounded-2xl p-6">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <CheckCircle className="text-green-400" /> Feedback Detalhado
            </h3>
            <ul className="space-y-3">
              {result.feedback.map((item, index) => (
                <li key={index} className="flex items-start gap-3 text-slate-300 text-sm">
                  <span className="block min-w-[6px] h-[6px] mt-1.5 rounded-full bg-blue-500"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-slate-900/50 rounded-2xl p-6 border-l-4 border-yellow-500">
            <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <AlertTriangle className="text-yellow-500" /> Correção de Postura
            </h3>
            <p className="text-slate-300 leading-relaxed text-sm">
              {result.formCorrection}
            </p>
          </div>
        </div>

        <button 
          onClick={onReset}
          className="w-full mt-8 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl transition-colors shadow-lg shadow-blue-900/20"
        >
          Analisar Novo Exercício
        </button>
      </div>
    </div>
  );
};

export default ResultView;