import React, { useEffect, useState } from 'react';
import { AnalysisResult, ExerciseType, ExerciseRecord, SPECIAL_EXERCISES } from '../types';
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from 'recharts';
import { CheckCircle, Repeat, Activity, Trophy, Sparkles, User, ArrowLeft, MessageCircleHeart, Scale, Utensils, Printer, Loader2, X, AlertTriangle, ThumbsUp, Info, Dumbbell, History, Share2, Download, Lightbulb } from 'lucide-react';
import MuscleMap from './MuscleMap';
import { generateDietPlan, generateWorkoutPlan } from '../services/geminiService';
import { EvolutionModal } from './EvolutionModal';
import { ToastType } from './Toast';
import { apiService } from '../services/apiService';

interface ResultViewProps {
  result: AnalysisResult;
  exercise: ExerciseType;
  history: ExerciseRecord[];
  userId: string;
  onReset: () => void;
  onSave?: () => void;
  onDeleteRecord?: (recordId: string) => void;
  onWorkoutSaved?: () => void;
  onDietSaved?: () => void; 
  isHistoricalView?: boolean;
  showToast?: (message: string, type: ToastType) => void;
  triggerConfirm?: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export const ResultView: React.FC<ResultViewProps> = ({ 
  result, 
  exercise, 
  history, 
  userId, 
  onReset, 
  onSave, 
  onDeleteRecord, 
  onWorkoutSaved,
  onDietSaved,
  isHistoricalView = false,
  showToast = () => {}, 
  triggerConfirm = () => {} 
}) => {
  const [saved, setSaved] = useState(false);
  
  // Diet Plan State
  const [showDietForm, setShowDietForm] = useState(false);
  const [dietLoading, setDietLoading] = useState(false);
  const [dietPlanHtml, setDietPlanHtml] = useState<string | null>(null);
  const [dietFormData, setDietFormData] = useState({
    weight: '',
    height: '',
    goal: 'emagrecer',
    gender: 'masculino',
    observations: ''
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

  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const isHighPerformance = result.score > 80;
  const isPostureAnalysis = exercise === SPECIAL_EXERCISES.POSTURE;
  const isBodyCompAnalysis = exercise === SPECIAL_EXERCISES.BODY_COMPOSITION;
  
  // Verifica modo livre: Pelo ID constante OU se o exercício for a string "Análise Livre" OU se existe identifiedExercise
  const isFreeMode = exercise === SPECIAL_EXERCISES.FREE_MODE || exercise === 'Análise Livre' || !!result.identifiedExercise;
  
  // Título Dinâmico: Se for modo livre, usa o identificado pela IA
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
      
      // Usa apiService para garantir segurança com requesterId
      await apiService.createDiet(userId, planHtml, dietFormData.goal);
      if (onDietSaved) onDietSaved();
      
      setDietPlanHtml(planHtml);
      setShowDietForm(false);
      showToast("Dieta gerada com sucesso!", 'success');
    } catch (error) {
      showToast("Erro ao gerar dieta. Tente novamente.", 'error');
    } finally {
      setDietLoading(false);
    }
  };

  const handleGenerateWorkout = async (e: React.FormEvent) => {
    e.preventDefault();
    setWorkoutLoading(true);
    try {
      const planHtml = await generateWorkoutPlan(workoutFormData, result);
      
      // Usa apiService para garantir segurança com requesterId
      await apiService.createTraining(userId, planHtml, workoutFormData.goal);
      if (onWorkoutSaved) onWorkoutSaved();

      setWorkoutPlanHtml(planHtml);
      setShowWorkoutForm(false);
      showToast("Treino gerado com sucesso!", 'success');

    } catch (error) {
      showToast("Erro ao gerar treino. Tente novamente.", 'error');
    } finally {
      setWorkoutLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const dateStr = new Date().toLocaleDateString();
    
    const metricLabel = isBodyCompAnalysis ? '⚖️ Gordura Estimada' : '🔄 Repetições';
    const metricValue = `${result.repetitions}${isBodyCompAnalysis ? '%' : ''}`;

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
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        showToast('Resumo copiado para a área de transferência!', 'success');
      } catch (err) {
        showToast('Não foi possível compartilhar neste dispositivo.', 'error');
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
        triggerConfirm={triggerConfirm}
      />

      {/* Modal Form for Diet */}
      {showDietForm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md relative shadow-2xl max-h-[90vh] overflow-y-auto custom-scrollbar">
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
                
                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">Observações / Restrições</label>
                   <textarea 
                     rows={3}
                     placeholder="Ex: Sou vegano, tenho alergia a amendoim, faço jejum intermitente..."
                     className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-emerald-500 outline-none resize-none placeholder-slate-500 text-sm"
                     value={dietFormData.observations}
                     onChange={e => setDietFormData({...dietFormData, observations: e.target.value})}
                   />
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
                    <option value="hipertrofia">Hipertrofia</option>
                    <option value="emagrecimento">Emagrecimento</option>
                    <option value="definicao">Definição</option>
                  </select>
                </div>
                
                {/* NOVA GRID: NÍVEL E FREQUÊNCIA */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 ml-1">Nível</label>
                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={workoutFormData.level} onChange={e => setWorkoutFormData({...workoutFormData, level: e.target.value})}>
                            <option value="iniciante">Iniciante</option>
                            <option value="intermediario">Intermediário</option>
                            <option value="avancado">Avançado</option>
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-slate-400 ml-1">Frequência</label>
                        <select className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" value={workoutFormData.frequency} onChange={e => setWorkoutFormData({...workoutFormData, frequency: e.target.value})}>
                            <option value="1">1x na Semana</option>
                            <option value="2">2x na Semana</option>
                            <option value="3">3x na Semana</option>
                            <option value="4">4x na Semana</option>
                            <option value="5">5x na Semana</option>
                            <option value="6">6x na Semana</option>
                            <option value="7">Todos os dias</option>
                        </select>
                    </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-300 mb-1">Observações / Lesões</label>
                   <textarea 
                     rows={3}
                     placeholder="Ex: Tenho dor no joelho, quero focar em glúteos..."
                     className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none placeholder-slate-500 text-sm"
                     value={workoutFormData.observations}
                     onChange={e => setWorkoutFormData({...workoutFormData, observations: e.target.value})}
                   />
                </div>

                <button type="submit" disabled={workoutLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2">
                  {workoutLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  {workoutLoading ? "Gerando..." : "Gerar Treino"}
                </button>
             </form>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="glass-panel p-6 md:p-8 rounded-3xl mb-6 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
         {/* Background Decor */}
         <div className="absolute top-0 right-0 p-20 opacity-10 bg-gradient-to-br from-blue-500 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
         
         <div className="flex items-center gap-6 relative z-10 w-full md:w-auto">
             {!isHistoricalView && (
               <button onClick={onReset} className="p-3 bg-slate-800 rounded-2xl hover:bg-slate-700 transition-colors border border-slate-700 group no-print">
                 <ArrowLeft className="w-6 h-6 text-slate-400 group-hover:text-white" />
               </button>
             )}
             
             <div>
               <div className="flex items-center gap-2 mb-1">
                 {isFreeMode && <Sparkles className="w-4 h-4 text-yellow-400 animate-pulse" />}
                 <span className="text-blue-400 font-bold uppercase tracking-wider text-xs">Relatório de Análise</span>
               </div>
               {/* TÍTULO PRINCIPAL: Aqui usamos a variável dinâmica que contém o nome detectado */}
               <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight capitalize">
                 {exerciseDisplayName}
               </h1>
               <div className="flex items-center gap-2 mt-2 text-slate-400 text-sm">
                  <User className="w-4 h-4" /> 
                  <span>Aluno: {userId === 'guest' ? 'Visitante' : 'Atleta Registrado'}</span>
                  <span className="mx-2">•</span>
                  <span>{new Date().toLocaleDateString()}</span>
               </div>
             </div>
         </div>

         {/* Score Ring */}
         <div className="relative shrink-0 flex flex-col items-center">
            <div className="w-32 h-32 md:w-40 md:h-40 relative">
               <ResponsiveContainer width="100%" height="100%">
                  <RadialBarChart 
                    cx="50%" cy="50%" 
                    innerRadius="70%" outerRadius="100%" 
                    barSize={10} 
                    data={scoreData} 
                    startAngle={90} endAngle={-270}
                  >
                    <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
                    <RadialBar
                      background={{ fill: '#334155' }}
                      dataKey="value"
                      cornerRadius={10}
                    />
                  </RadialBarChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className={`text-3xl md:text-4xl font-bold ${getScoreTextColor(result.score)}`}>
                    {result.score}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Score Total</span>
               </div>
            </div>
            <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold border ${result.score >= 70 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (result.score > 40 ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}`}>
               {getScoreMessage(result.score)}
            </div>
         </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
         
         {/* Left Column: Stats & Actions */}
         <div className="space-y-6">
            
            {/* Quick Stats Card */}
            <div className="glass-panel p-6 rounded-3xl flex flex-col items-center justify-center text-center py-8 relative overflow-hidden group">
               <div className="absolute inset-0 bg-gradient-to-b from-transparent to-blue-900/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
               {renderStatsBox()}
            </div>

            {/* Muscle Map Card */}
            <div className="glass-panel p-6 rounded-3xl min-h-[300px] flex flex-col relative overflow-hidden">
               <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2 relative z-10">
                 <Activity className="w-5 h-5 text-blue-400" /> Ativação Muscular
               </h3>
               <div className="flex-grow flex items-center justify-center relative z-10">
                  <MuscleMap muscles={result.muscleGroups} />
               </div>
               
               {/* Background Grid */}
               <div className="absolute inset-0 opacity-10 bg-[linear-gradient(rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>
            </div>

            {/* Action Buttons */}
            {!isHistoricalView && (
              <div className="grid grid-cols-2 gap-3 no-print">
                 <button onClick={() => setShowDietForm(true)} className="p-4 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group">
                    <Utensils className="w-6 h-6 text-emerald-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-emerald-100">Gerar Dieta</span>
                 </button>
                 <button onClick={() => setShowWorkoutForm(true)} className="p-4 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all group">
                    <Dumbbell className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                    <span className="text-xs font-bold text-blue-100">Gerar Treino</span>
                 </button>
                 <button onClick={handleShare} className="col-span-2 p-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-2xl flex items-center justify-center gap-2 text-slate-300 hover:text-white transition-all">
                    <Share2 className="w-4 h-4" /> Compartilhar Resultado
                 </button>
                 
                 {history.length > 0 && (
                   <button 
                      onClick={() => setShowHistoryModal(true)} 
                      className="col-span-2 p-4 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 rounded-2xl flex items-center justify-center gap-2 text-indigo-200 transition-all"
                   >
                      <History className="w-4 h-4" /> Ver Evolução ({history.length})
                   </button>
                 )}
              </div>
            )}
         </div>

         {/* Middle & Right Column: Detailed Feedback */}
         <div className="lg:col-span-2 space-y-6">
            
            {/* Main Correction Card (Dica de Mestre) */}
            <div className="bg-gradient-to-r from-blue-900/40 to-slate-900/40 border border-blue-500/30 p-6 rounded-3xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-16 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3"></div>
               
               <h3 className="text-blue-300 font-bold text-lg mb-3 flex items-center gap-2">
                 <Lightbulb className="w-5 h-5 text-yellow-400" /> Dica de Mestre
               </h3>
               <p className="text-white text-lg leading-relaxed relative z-10 font-medium">
                 "{result.formCorrection}"
               </p>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {/* Strengths */}
               <div className="glass-panel p-6 rounded-3xl">
                  <h3 className="text-emerald-400 font-bold text-lg mb-4 flex items-center gap-2">
                    <ThumbsUp className="w-5 h-5" /> Pontos Fortes
                  </h3>
                  <ul className="space-y-3">
                     {result.strengths && result.strengths.length > 0 ? (
                        result.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                             <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                             <span>{str}</span>
                          </li>
                        ))
                     ) : (
                        <li className="text-slate-500 italic text-sm">Continue praticando para destacar seus pontos fortes!</li>
                     )}
                  </ul>
               </div>

               {/* Improvements */}
               <div className="glass-panel p-6 rounded-3xl border-red-500/10">
                  <h3 className="text-red-400 font-bold text-lg mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" /> Atenção
                  </h3>
                  <ul className="space-y-3">
                     {result.improvements && result.improvements.length > 0 ? (
                        result.improvements.map((imp, idx) => (
                          <li key={idx} className="flex items-start gap-3 text-slate-300 text-sm">
                             <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0"></div>
                             <div>
                               <span className="font-bold text-white block mb-0.5">{imp.instruction}</span>
                               <span className="text-xs text-slate-500">{imp.detail}</span>
                             </div>
                          </li>
                        ))
                     ) : (
                        <li className="text-slate-500 italic text-sm">Nenhum erro crítico detectado. Parabéns!</li>
                     )}
                  </ul>
               </div>
            </div>

            {/* Detailed Body Feedback (Table) */}
            <div className="glass-panel p-6 rounded-3xl">
               <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                 <MessageCircleHeart className="w-5 h-5 text-pink-400" /> Feedback Detalhado
               </h3>
               <div className="space-y-1">
                  {result.feedback.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-800/50 rounded-xl transition-colors border-b border-slate-700/30 last:border-0">
                       <div className="flex items-center gap-3">
                          <div className={`w-2 h-8 rounded-full ${getScoreTextColor(item.score).replace('text-', 'bg-')}`}></div>
                          <span className="text-slate-300 font-medium capitalize">{item.message}</span>
                       </div>
                       <div className="flex items-center gap-3">
                          <div className="w-24 h-1.5 bg-slate-700 rounded-full overflow-hidden hidden sm:block">
                             <div className={`h-full rounded-full ${getScoreTextColor(item.score).replace('text-', 'bg-')}`} style={{ width: `${item.score}%` }}></div>
                          </div>
                          <span className={`font-bold ${getScoreTextColor(item.score)}`}>{item.score}/100</span>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};