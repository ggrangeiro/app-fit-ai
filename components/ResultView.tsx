import React, { useEffect, useState } from 'react';
import { AnalysisResult, ExerciseType, ExerciseRecord, SPECIAL_EXERCISES } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircle, Repeat, Activity, Trophy, Sparkles, User, ArrowLeft, MessageCircleHeart, Scale, Utensils, Printer, Loader2, X, AlertTriangle, ThumbsUp, Info, Dumbbell, History, Share2, Download } from 'lucide-react';
import MuscleMap from './MuscleMap';
import { generateDietPlan, generateWorkoutPlan } from '../services/geminiService';
import { EvolutionModal } from './EvolutionModal';

interface ResultViewProps {
  result: AnalysisResult;
  exercise: ExerciseType;
  history: ExerciseRecord[];
  onReset: () => void;
  onSave?: () => void;
  onDeleteRecord?: (recordId: string) => void;
  isHistoricalView?: boolean; // New prop to control button visibility
}

export const ResultView: React.FC<ResultViewProps> = ({ result, exercise, history, onReset, onSave, onDeleteRecord, isHistoricalView = false }) => {
  const [saved, setSaved] = useState(false);
  
  // Diet Plan State
  const [showDietForm, setShowDietForm] = useState(false);
  const [dietLoading, setDietLoading] = useState(false);
  const [dietPlanHtml, setDietPlanHtml] = useState<string | null>(null);
  const [dietFormData, setDietFormData] = useState({
    weight: '',
    height: '',
    goal: 'emagrecer',
    gender: 'masculino'
  });

  // Workout Plan State
  const [showWorkoutForm, setShowWorkoutForm] = useState(false);
  const [workoutLoading, setWorkoutLoading] = useState(false);
  const [workoutPlanHtml, setWorkoutPlanHtml] = useState<string | null>(null);
  const [workoutFormData, setWorkoutFormData] = useState({
    weight: '',
    height: '',
    goal: 'hipertrofia',
    level: 'iniciante',
    frequency: '4',
    observations: '',
    gender: 'masculino'
  });

  // History / Evolution State
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const isHighPerformance = result.score > 80;
  const isPostureAnalysis = exercise === SPECIAL_EXERCISES.POSTURE;
  const isBodyCompAnalysis = exercise === SPECIAL_EXERCISES.BODY_COMPOSITION;
  const isFreeMode = exercise === SPECIAL_EXERCISES.FREE_MODE;
  
  // Nome amigável do exercício
  const exerciseDisplayName = isBodyCompAnalysis 
    ? 'Avaliação Corporal' 
    : (isFreeMode 
        ? (result.identifiedExercise || 'Exercício Livre') 
        : exercise);

  useEffect(() => {
    if (onSave && !saved) {
      onSave();
      setSaved(true);
    }
  }, [onSave, saved]);

  // Pre-fill gender if detected by AI
  useEffect(() => {
    if (result.gender) {
      const detectedGender = result.gender.toLowerCase().includes('fem') ? 'feminino' : 'masculino';
      setDietFormData(prev => ({ ...prev, gender: detectedGender }));
      setWorkoutFormData(prev => ({ ...prev, gender: detectedGender }));
    }
  }, [result.gender]);

  const handleGenerateDiet = async (e: React.FormEvent) => {
    e.preventDefault();
    setDietLoading(true);
    try {
      const planHtml = await generateDietPlan(dietFormData, result);
      setDietPlanHtml(planHtml);
      setShowDietForm(false);
    } catch (error) {
      alert("Erro ao gerar dieta. Tente novamente.");
    } finally {
      setDietLoading(false);
    }
  };

  const handleGenerateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkoutLoading(true);
    try {
      const planHtml = await generateWorkoutPlan(workoutFormData, result);
      setWorkoutPlanHtml(planHtml);
      setShowWorkoutForm(false);
    } catch (error) {
      alert("Erro ao gerar treino. Tente novamente.");
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    // Construção do Texto Rico
    const dateStr = new Date().toLocaleDateString();
    
    // Métrica principal (Reps ou Gordura)
    const metricLabel = isBodyCompAnalysis ? '⚖️ Gordura Estimada' : '🔄 Repetições';
    const metricValue = `${result.repetitions}${isBodyCompAnalysis ? '%' : ''}`;

    // Listas formatadas
    let strengthsText = "";
    if (result.strengths && result.strengths.length > 0) {
      strengthsText = `\n✅ *Mandou bem:*\n${result.strengths.slice(0, 3).map(s => `• ${s}`).join('\n')}\n`;
    }

    let improvementsText = "";
    if (result.improvements && result.improvements.length > 0) {
      improvementsText = `\n⚠️ *Ajustes Técnicos:*\n${result.improvements.slice(0, 3).map(i => `• ${i.instruction}`).join('\n')}\n`;
    }

    const shareText = 
`📊 *Relatório FitAI Analyzer*
📅 ${dateStr}

🏋️ *${exerciseDisplayName}*
🏆 Score Técnico: ${result.score}/100
${metricLabel}: ${metricValue}
${strengthsText}${improvementsText}
💡 *Dica de Mestre:*
"${result.formCorrection}"

🚀 _Analise seus treinos com Inteligência Artificial!_`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Meu Resultado no FitAI',
          text: shareText,
        });
      } catch (err) {
        console.log('User closed share dialog');
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        alert('Resumo detalhado copiado para a área de transferência!');
      } catch (err) {
        alert('Não foi possível compartilhar neste dispositivo.');
      }
    }
  };

  const scoreData = [
    { 
      name: 'Score', 
      value: result.score, 
      fill: isHighPerformance ? '#fbbf24' : (result.score > 40 ? '#facc15' : '#f87171')
    }
  ];

  const getScoreMessage = (score: number) => {
    if (score >= 90) return isPostureAnalysis || isBodyCompAnalysis ? "Excelente!" : "Execução de Elite!";
    if (score >= 70) return "Muito Bom!";
    if (score >= 50) return isPostureAnalysis ? "Atenção Moderada" : "Caminho Certo";
    return "Precisa de Ajustes";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const renderStatsBox = () => {
    if (isPostureAnalysis) {
      return (
        <>
            <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-1">
              <Activity className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold text-white print:text-black">Check-up</span>
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Status da Análise</span>
        </>
      );
    }

    if (isBodyCompAnalysis) {
      return (
        <>
            <div className="p-3 bg-violet-500/20 text-violet-400 rounded-full mb-1">
              <Scale className="w-6 h-6" />
            </div>
            <span className="text-4xl font-bold text-white print:text-black">{result.repetitions}%</span>
            <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Gordura Estimada</span>
            {result.gender && (
               <span className="text-[10px] text-slate-500 mt-1 uppercase font-bold bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700 print:border-slate-300 print:bg-slate-100">
                 {result.gender}
               </span>
            )}
        </>
      );
    }

    return (
      <>
          <div className="p-3 bg-blue-500/20 text-blue-400 rounded-full mb-1">
            <Repeat className="w-6 h-6" />
          </div>
          <span className="text-4xl font-bold text-white print:text-black">{result.repetitions}</span>
          <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Repetições Válidas</span>
      </>
    );
  };

  const renderGeneratedPlan = (htmlContent: string, title: string, icon: React.ReactNode, onClose: () => void, isDiet: boolean) => (
    <div className="w-full max-w-7xl mx-auto animate-fade-in pb-10">
      <style>{`
        #generated-plan-container ::-webkit-scrollbar { width: 8px; }
        #generated-plan-container ::-webkit-scrollbar-track { background: #f1f5f9; }
        #generated-plan-container ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        #generated-plan-content { font-family: 'Plus Jakarta Sans', sans-serif; color: #1e293b; }
        @media print {
          body * { visibility: hidden; }
          #generated-plan-container, #generated-plan-container * { visibility: visible; }
          #generated-plan-container { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white; box-shadow: none; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex items-center justify-between mb-6 no-print">
         <button onClick={onClose} className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar aos Resultados
         </button>
         <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold shadow-lg transition-all">
            <Printer className="w-5 h-5" /> Imprimir Plano
         </button>
      </div>

      <div className="bg-slate-50 rounded-3xl p-6 md:p-10 shadow-2xl text-slate-900 min-h-[80vh]" id="generated-plan-container">
         <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl shadow-lg text-white ${isDiet ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-600/20'}`}>
                 {icon}
              </div>
              <div>
                <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{title}</h2>
                <div className="flex items-center gap-2 text-slate-500 text-sm mt-1">
                  <Sparkles className="w-4 h-4 text-yellow-500" />
                  <span>Personalizado via IA</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 text-sm bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
              <div className="px-4 py-2 bg-slate-100 rounded-lg">
                 <span className="block text-xs text-slate-500 uppercase font-bold">Objetivo</span>
                 <span className="font-bold text-slate-900 capitalize">
                    {isDiet ? dietFormData.goal.replace('_', ' ') : workoutFormData.goal.replace('_', ' ')}
                 </span>
              </div>
              <div className="px-4 py-2 bg-slate-100 rounded-lg">
                 <span className="block text-xs text-slate-500 uppercase font-bold">Perfil</span>
                 <span className="font-bold text-slate-900">
                    {isDiet ? dietFormData.weight : workoutFormData.weight}kg • {isDiet ? dietFormData.height : workoutFormData.height}cm
                 </span>
              </div>
            </div>
         </div>
         
         <div id="generated-plan-content" className="w-full" dangerouslySetInnerHTML={{ __html: htmlContent }} />
         
         <div className="mt-10 text-center text-slate-400 text-xs border-t border-slate-200 pt-6">
            <p>Este plano é uma sugestão gerada por inteligência artificial e não substitui o acompanhamento de um profissional de educação física ou nutricionista.</p>
         </div>
      </div>
    </div>
  );

  if (dietPlanHtml) {
    return renderGeneratedPlan(dietPlanHtml, "Plano Nutricional", <Utensils className="w-8 h-8" />, () => setDietPlanHtml(null), true);
  }

  if (workoutPlanHtml) {
    return renderGeneratedPlan(workoutPlanHtml, "Plano de Treino", <Dumbbell className="w-8 h-8" />, () => setWorkoutPlanHtml(null), false);
  }

  // Prepara o histórico para o modal, garantindo que o item atual esteja visível se já foi salvo/incluso
  // No ResultView, assumimos que 'history' já contém o resultado atual (foi atualizado no App.tsx após salvar)
  // Portanto, passamos highlightLatestAsCurrent={true} para que o modal saiba tratar o index 0 como "Agora".
  
  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-10">
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .glass-panel { background: white !important; border: 1px solid #ddd !important; box-shadow: none !important; color: black !important; }
          .no-print, button { display: none !important; }
          .text-white { color: black !important; }
          .text-slate-200, .text-slate-300, .text-slate-400 { color: #333 !important; }
          .bg-slate-900, .bg-slate-800, .bg-slate-700 { background: white !important; border: 1px solid #eee !important; }
          h2, h3, span { text-shadow: none !important; }
          .absolute.inset-0 { display: none !important; } /* Hide backgrounds */
          .print:text-black { color: black !important; }
          /* Ensure charts and maps are visible */
          svg { filter: none !important; }
        }
      `}</style>

      {/* HISTORY / EVOLUTION MODAL */}
      <EvolutionModal 
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        history={history}
        exerciseType={exercise}
        highlightLatestAsCurrent={true}
        onDelete={onDeleteRecord} 
      />

      {/* Modal Form for Diet */}
      {showDietForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl">
             <button onClick={() => setShowDietForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
               <X className="w-6 h-6" />
             </button>
             
             <div className="flex flex-col items-center mb-6">
               <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-full mb-3">
                 <Utensils className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold text-white">Montar Dieta</h3>
               <p className="text-slate-400 text-center text-sm">A IA usará sua análise corporal para criar o cardápio ideal.</p>
             </div>

             <form onSubmit={handleGenerateDiet} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Peso (kg)</label>
                    <input type="number" required step="0.1" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={dietFormData.weight} onChange={e => setDietFormData({...dietFormData, weight: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Altura (cm)</label>
                    <input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      value={dietFormData.height} onChange={e => setDietFormData({...dietFormData, height: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sexo Biológico</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={dietFormData.gender} onChange={e => setDietFormData({...dietFormData, gender: e.target.value})}>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Objetivo</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none"
                    value={dietFormData.goal} onChange={e => setDietFormData({...dietFormData, goal: e.target.value})}>
                    <option value="emagrecer">Emagrecer (Perder Gordura)</option>
                    <option value="ganhar_massa">Hipertrofia (Ganhar Massa)</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="definicao">Definição Muscular</option>
                  </select>
                </div>
                <button type="submit" disabled={dietLoading} className="w-full mt-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  {dietLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {dietLoading ? "Gerando..." : "Gerar Dieta"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* Modal Form for Workout */}
      {showWorkoutForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
             <button onClick={() => setShowWorkoutForm(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
               <X className="w-6 h-6" />
             </button>
             
             <div className="flex flex-col items-center mb-6">
               <div className="p-3 bg-blue-600/20 text-blue-400 rounded-full mb-3">
                 <Dumbbell className="w-8 h-8" />
               </div>
               <h3 className="text-2xl font-bold text-white">Montar Treino</h3>
               <p className="text-slate-400 text-center text-sm">Treino personalizado baseado nas correções biomecânicas da sua análise.</p>
             </div>

             <form onSubmit={handleGenerateWorkout} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Peso (kg)</label>
                    <input type="number" required step="0.1" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={workoutFormData.weight} onChange={e => setWorkoutFormData({...workoutFormData, weight: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Altura (cm)</label>
                    <input type="number" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                      value={workoutFormData.height} onChange={e => setWorkoutFormData({...workoutFormData, height: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Sexo Biológico</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.gender} onChange={e => setWorkoutFormData({...workoutFormData, gender: e.target.value})}>
                    <option value="masculino">Masculino</option>
                    <option value="feminino">Feminino</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Objetivo</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.goal} onChange={e => setWorkoutFormData({...workoutFormData, goal: e.target.value})}>
                    <option value="hipertrofia">Hipertrofia (Crescer)</option>
                    <option value="definicao">Definição (Secar)</option>
                    <option value="emagrecimento">Emagrecimento (Perder Peso)</option>
                    <option value="forca">Força Pura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Nível de Experiência</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.level} onChange={e => setWorkoutFormData({...workoutFormData, level: e.target.value})}>
                    <option value="iniciante">Iniciante (Começando agora)</option>
                    <option value="intermediario">Intermediário (Já treina)</option>
                    <option value="avancado">Avançado (Atleta/Experiente)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dias por Semana</label>
                  <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none"
                    value={workoutFormData.frequency} onChange={e => setWorkoutFormData({...workoutFormData, frequency: e.target.value})}>
                    <option value="2">2 dias</option>
                    <option value="3">3 dias</option>
                    <option value="4">4 dias</option>
                    <option value="5">5 dias</option>
                    <option value="6">6 dias</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Observações / Limitações</label>
                  <textarea 
                    rows={3}
                    placeholder="Ex: Tenho condromalácia no joelho esquerdo, prefiro treinos curtos, sinto dor no ombro..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-sm"
                    value={workoutFormData.observations}
                    onChange={e => setWorkoutFormData({...workoutFormData, observations: e.target.value})}
                  />
                  <p className="text-[10px] text-slate-500 mt-1">A IA usará isso para adaptar ou remover exercícios.</p>
                </div>

                <button type="submit" disabled={workoutLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  {workoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {workoutLoading ? "Gerando..." : "Gerar Treino"}
                </button>
             </form>
          </div>
        </div>
      )}

      <div className="glass-panel rounded-[2rem] p-6 md:p-10 shadow-2xl relative overflow-hidden">
        
        {/* Confetti / Celebration Background Effect */}
        {isHighPerformance && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-30 no-print">
             <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(251,191,36,0.15),transparent_70%)] animate-pulse" />
          </div>
        )}
        
        {/* Share / Print Buttons (Top Right) - Only visible on screen */}
        <div className="absolute top-6 right-6 flex items-center gap-3 no-print z-30">
            <button 
                onClick={handlePrint}
                className="p-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-full transition-all shadow-lg border border-slate-600/50"
                title="Imprimir ou Salvar PDF"
            >
                <Printer className="w-5 h-5" />
            </button>
            <button 
                onClick={handleShare}
                className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-full transition-all shadow-lg shadow-blue-900/20 border border-blue-500/50"
                title="Compartilhar Resultado"
            >
                <Share2 className="w-5 h-5" />
            </button>
        </div>

        {/* Header */}
        <div className="text-center mb-10 relative z-10">
          <span className="px-4 py-1.5 rounded-full bg-slate-700/50 text-slate-300 text-sm font-medium border border-slate-600/50 print:border-slate-300 print:text-slate-600">
            Relatório Biomecânico
          </span>
          <h2 className="text-3xl md:text-4xl font-bold mt-4 text-white print:text-black">
            {isBodyCompAnalysis 
                ? 'Avaliação Corporal Detalhada' 
                : (isFreeMode 
                    ? `${result.identifiedExercise || 'Exercício'} - Análise Livre (Sem histórico)` 
                    : `Análise de ${exercise}`)}
          </h2>
          <p className="text-slate-400 mt-2 text-sm print:text-slate-600">{new Date().toLocaleDateString()} • FitAI Analyzer</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 relative z-10">
          
          {/* Main Score Column (Left) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className={`
              bg-slate-900/40 rounded-3xl p-8 border border-slate-700/50 flex flex-col items-center justify-center relative overflow-hidden transition-all duration-1000
              ${isHighPerformance ? 'shadow-[0_0_40px_rgba(251,191,36,0.15)] border-yellow-500/30' : ''}
              print:shadow-none print:border-slate-300 print:bg-white
            `}>
              {/* Decorative Trophy or Sparkles */}
              <div className="absolute top-0 right-0 p-4 opacity-10 no-print">
                <Trophy className={`w-32 h-32 ${isHighPerformance ? 'text-yellow-400' : 'text-white'}`} />
              </div>
              
              <h3 className={`text-lg font-medium mb-2 print:text-black ${isHighPerformance ? 'text-yellow-100' : 'text-slate-300'}`}>
                {isPostureAnalysis ? 'Alinhamento Global' : (isBodyCompAnalysis ? 'Índice de Composição' : 'Score Técnico')}
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
                    text-5xl font-bold tracking-tighter print:text-black
                    ${isHighPerformance 
                      ? 'text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 via-yellow-400 to-yellow-200 animate-text-shimmer drop-shadow-lg' 
                      : 'text-white'}
                  `}>
                    {result.score}
                  </span>
                  <span className={`text-xs font-bold uppercase tracking-wider mt-1 print:text-black ${isHighPerformance ? 'text-yellow-400' : 'text-slate-400'}`}>
                    {getScoreMessage(result.score)}
                  </span>
                </div>
              </div>

               {/* Segmentation Score List */}
               <div className="w-full mt-4 space-y-2">
                 {result.feedback.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-slate-400 border-b border-slate-800 pb-1 print:text-black print:border-slate-200">
                       <span>{item.message}</span>
                       <span className={getScoreTextColor(item.score)}>{item.score}/100</span>
                    </div>
                 ))}
               </div>
            </div>

            <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col items-center justify-center gap-2 print:bg-white print:border-slate-300">
                 {renderStatsBox()}
            </div>
            
            {!isFreeMode && (
                <button 
                    onClick={() => setShowHistoryModal(true)}
                    disabled={!history || history.length === 0}
                    className="w-full py-3 px-4 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl font-bold flex items-center justify-center gap-2 transition-all border border-indigo-500/30 disabled:opacity-70 disabled:cursor-not-allowed no-print"
                >
                    <History className="w-4 h-4" />
                    <span>Comparar Evolução</span>
                </button>
            )}
            
            {/* ACTION BUTTONS (Only for Body Composition) */}
            {isBodyCompAnalysis && (
              <div className="flex flex-col gap-3 no-print">
                  <button 
                    onClick={() => setShowDietForm(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] border border-emerald-500/30 text-sm"
                  >
                    <Utensils className="w-4 h-4" /> 
                    <span>Gerar Dieta</span>
                  </button>
                  <button 
                    onClick={() => setShowWorkoutForm(true)}
                    className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl shadow-lg font-bold flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] border border-blue-500/30 text-sm"
                  >
                    <Dumbbell className="w-4 h-4" /> 
                    <span>Gerar Treino</span>
                  </button>
              </div>
            )}

          </div>

          {/* Details Column (Middle) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="flex flex-col h-full gap-6">
              
              {/* Pontos Fortes */}
              {result.strengths && result.strengths.length > 0 && (
                <div className="bg-emerald-900/10 rounded-3xl p-6 border border-emerald-500/20 print:bg-white print:border-emerald-200">
                   <h3 className="text-lg font-bold mb-4 flex items-center gap-3 text-emerald-400 print:text-emerald-700">
                    <ThumbsUp className="w-5 h-5" /> Pontos Fortes
                  </h3>
                  <ul className="space-y-3">
                    {result.strengths.map((strength, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                        <span className="text-slate-200 text-sm leading-relaxed print:text-black">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ajustes Necessários */}
              <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 flex-grow print:bg-white print:border-slate-300">
                <h3 className="text-lg font-bold mb-5 flex items-center gap-3 text-white border-b border-slate-700/50 pb-4 print:text-black print:border-slate-200">
                  <AlertTriangle className="text-yellow-400 w-5 h-5" /> 
                  {isBodyCompAnalysis ? 'Recomendações' : 'Ajustes Técnicos'}
                </h3>
                
                {result.improvements ? (
                   <div className="space-y-4 overflow-y-auto max-h-[500px] pr-2 custom-scrollbar">
                     {result.improvements.map((item, index) => (
                       <div key={index} className="bg-slate-800/30 rounded-xl p-4 border-l-4 border-l-yellow-500 border-t border-r border-b border-slate-700/30 hover:bg-slate-800/50 transition-colors print:bg-slate-50 print:border-slate-200 print:text-black">
                          <h4 className="text-white font-bold text-sm mb-2 flex items-center gap-2 print:text-black">
                             {item.instruction}
                          </h4>
                          <div className="flex items-start gap-2 text-xs text-slate-400 bg-black/20 p-2 rounded-lg print:bg-transparent print:text-slate-700 print:p-0">
                             <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                             <p className="leading-relaxed">{item.detail}</p>
                          </div>
                       </div>
                     ))}
                   </div>
                ) : (
                  // Fallback para análises antigas
                   <ul className="space-y-4 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                    {result.feedback.filter(f => f.score < 70).map((item, index) => (
                      <li key={index} className="flex flex-col gap-2 p-4 bg-slate-800/30 rounded-xl">
                         <span className="text-slate-200 font-medium text-sm">{item.message}</span>
                         <span className="text-xs text-red-400">Pontuação baixa detectada nesta região. Reveja a execução.</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>

          {/* Muscle Map & Correction (Right) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
             {/* Muscle Map Card */}
             <div className="bg-slate-900/40 rounded-3xl p-6 border border-slate-700/50 flex flex-col relative overflow-hidden print:bg-white print:border-slate-300">
                <div className="absolute top-0 right-0 p-3 opacity-5 no-print">
                   <Activity className="w-24 h-24 text-blue-500" />
                </div>
                <h3 className="text-lg font-bold mb-2 flex items-center gap-3 text-white z-10 print:text-black">
                  <User className="text-blue-400 w-5 h-5" /> {isBodyCompAnalysis ? 'Regiões em Destaque' : 'Anatomia da Ativação'}
                </h3>
                <div className="flex-grow flex flex-col items-center">
                   <MuscleMap muscles={result.muscleGroups} />
                   <div className="flex flex-wrap justify-center gap-1.5 mt-2 z-10">
                    {result.muscleGroups.map((muscle, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-500/10 text-blue-300 rounded-full text-[10px] font-bold border border-blue-500/20 uppercase tracking-wide print:text-blue-800 print:bg-blue-100 print:border-blue-200">
                        {muscle}
                      </span>
                    ))}
                  </div>
                </div>
             </div>

             {/* Correction Card */}
             <div className="bg-gradient-to-br from-indigo-600/20 to-blue-600/20 rounded-3xl p-6 border border-indigo-500/30 relative overflow-hidden flex-1 flex flex-col justify-center print:bg-white print:border-indigo-200">
                <div className="absolute top-0 right-0 p-4 opacity-10 no-print">
                  <MessageCircleHeart className="w-24 h-24 text-indigo-400" />
                </div>
                <h3 className="text-sm font-bold mb-3 flex items-center gap-2 text-indigo-300 uppercase tracking-wider relative z-10 print:text-indigo-800">
                  <MessageCircleHeart className="w-4 h-4" /> 
                  {isPostureAnalysis ? 'Resumo Postural' : (isBodyCompAnalysis ? 'Conclusão' : 'Dica de Mestre')}
                </h3>
                <p className="text-white font-medium text-lg leading-relaxed relative z-10 print:text-black">
                  "{result.formCorrection}"
                </p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 no-print">
           <button 
            onClick={onReset}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-5 rounded-2xl transition-all text-lg tracking-wide flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> {isHistoricalView ? 'Fechar Detalhes' : 'Voltar ao Menu'}
          </button>
          
          {!isHistoricalView && (
            <button 
              onClick={onReset}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-xl shadow-blue-900/20 text-lg tracking-wide hover:scale-[1.01] flex items-center justify-center gap-2"
            >
              <Repeat className="w-5 h-5" /> Nova Análise
            </button>
          )}
        </div>
      </div>
    );
  }
};