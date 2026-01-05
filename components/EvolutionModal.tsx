import React, { useEffect, useState } from 'react';
import { X, History, Sparkles, Loader2, TrendingUp, TrendingDown, Minus, Trash2 } from 'lucide-react';
import { ExerciseRecord, ExerciseType, SPECIAL_EXERCISES } from '../types';
import { generateProgressInsight } from '../services/geminiService';

interface EvolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: ExerciseRecord[];
  exerciseType: ExerciseType;
  highlightLatestAsCurrent?: boolean; // Se true, marca o primeiro item como "AGORA"
  onDelete?: (recordId: string) => void;
  triggerConfirm?: (title: string, message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export const EvolutionModal: React.FC<EvolutionModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  exerciseType,
  highlightLatestAsCurrent = false,
  onDelete,
  triggerConfirm
}) => {
  const [comparisonInsight, setComparisonInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);

  // CORREÇÃO: Verificação mais robusta para detectar Composição Corporal, 
  // pois exerciseType pode vir como nome ("Composição Corporal") ou ID ("BODY_COMPOSITION")
  const lowerType = exerciseType.toLowerCase();
  const isBodyCompAnalysis = 
    exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION || 
    lowerType.includes('composição') || 
    lowerType.includes('corporal') || 
    lowerType.includes('biotipo') ||
    lowerType.includes('gordura');

  useEffect(() => {
    if (isOpen && history.length >= 2) {
      generateComparison();
    } else {
        setComparisonInsight(null);
    }
  }, [isOpen, history]);

  const generateComparison = async () => {
    setLoadingInsight(true);
    try {
      // Compara o mais recente (index 0) com o anterior (index 1)
      const latest = history[0];
      const previous = history[1];
      
      const insight = await generateProgressInsight(latest.result, previous.result, exerciseType);
      setComparisonInsight(insight);
    } catch (e) {
    } finally {
      setLoadingInsight(false);
    }
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };
  
  const handleDeleteClick = (recordId: string) => {
      if (!onDelete) return;

      if (triggerConfirm) {
          triggerConfirm(
              "Remover Registro",
              "Tem certeza que deseja remover esta análise do histórico permanentemente?",
              () => onDelete(recordId),
              true // isDestructive
          );
      } else {
          // Fallback if triggerConfirm is not provided (should not happen in updated App)
          if (confirm("Tem certeza que deseja remover esta análise do histórico?")) {
              onDelete(recordId);
          }
      }
  };

  if (!isOpen) return null;

  return (
    // Alteração de layout: fixed com overflow-y-auto garante que o modal seja rolável se for maior que a tela
    // e flex items-center min-h-screen garante centralização vertical correta
    <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in">
       <div className="flex min-h-screen items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 md:p-8 w-full max-w-2xl relative shadow-2xl flex flex-col">
            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 p-2">
              <X className="w-6 h-6" />
            </button>

            <div className="flex items-center gap-4 mb-6 border-b border-slate-800 pb-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-full">
                <History className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">Sua Evolução</h3>
                <p className="text-slate-400 text-sm">Histórico de {exerciseType}</p>
              </div>
            </div>

            {/* Latest AI Insight */}
            <div className="mb-6 bg-gradient-to-r from-slate-800 to-slate-800/50 p-5 rounded-2xl border border-slate-700/50 relative">
              <div className="absolute -top-3 -right-3">
                <Sparkles className="w-8 h-8 text-yellow-500 fill-yellow-500/20 animate-pulse" />
              </div>
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-2">Análise de Progresso (IA)</h4>
              {loadingInsight ? (
                <div className="flex items-center gap-2 text-slate-400 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" /> Comparando as últimas sessões...
                </div>
              ) : (
                <p className="text-white text-lg leading-relaxed font-medium">
                  "{comparisonInsight || (history.length <= 1 ? "Precisamos de pelo menos dois registros para comparar sua evolução." : "Análise indisponível.")}"
                </p>
              )}
            </div>

            {/* Comparison List */}
            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <History className="w-12 h-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhum histórico disponível.</p>
                </div>
              ) : (
                history.map((rec, index) => {
                  // Lógica de comparação visual com o item seguinte na lista (que é o anterior cronologicamente)
                  const previousRec = history[index + 1];
                  let scoreDiff = 0;
                  let isImprovement = false;
                  let isSame = true;

                  if (previousRec) {
                    scoreDiff = rec.result.score - previousRec.result.score;
                    isImprovement = scoreDiff > 0;
                    isSame = scoreDiff === 0;
                  }

                  // Se highlightLatestAsCurrent for true, o primeiro item (index 0) recebe destaque especial
                  const isCurrentSession = highlightLatestAsCurrent && index === 0;

                  return (
                    <div 
                      key={rec.id} 
                      className={`
                        p-4 rounded-xl flex flex-col gap-3 transition-colors border relative group
                        ${isCurrentSession 
                          ? 'bg-blue-600/10 border-blue-500/30 relative overflow-hidden' 
                          : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800'}
                      `}
                    >
                      {/* Delete Button - Positioned absolute top-right */}
                      {onDelete && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(rec.id); }}
                            className="absolute top-3 right-3 p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all opacity-100 md:opacity-0 group-hover:opacity-100 z-20"
                            title="Remover do histórico"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                      )}

                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                              <span className={`text-xs font-mono ${isCurrentSession ? 'text-blue-300 font-bold uppercase' : 'text-slate-500'}`}>
                                {isCurrentSession ? 'Resultado Atual' : new Date(rec.timestamp).toLocaleDateString()}
                              </span>
                              {/* Inline AGORA Badge */}
                              {isCurrentSession && <span className="px-1.5 py-0.5 bg-blue-600 text-[9px] text-white font-bold rounded uppercase">Agora</span>}
                          </div>

                          <div className="flex items-center gap-3 mt-1">
                            <span className={`text-xl font-bold ${isCurrentSession ? 'text-white' : 'text-slate-300'}`}>
                              {rec.result.score}
                            </span>
                            
                            {/* Badge só aparece se tiver um registro anterior para comparar */}
                            {previousRec && (
                                <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-bold border ${isImprovement ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : (isSame ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20')}`}>
                                    {isImprovement ? <TrendingUp className="w-3 h-3" /> : (isSame ? <Minus className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />)}
                                    {Math.abs(scoreDiff)} pts {isImprovement ? 'abaixo' : (isSame ? '' : 'acima')} de {new Date(previousRec.timestamp).toLocaleDateString()}
                                </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Stats (Reps/Fat%) - Added pr-10 to prevent overlap with Trash Icon */}
                        <div className="text-right mt-1 pr-10">
                          <span className={`block text-xl font-bold ${isCurrentSession ? 'text-white' : 'text-slate-400'}`}>
                            {rec.result.repetitions}{isBodyCompAnalysis && '%'}
                          </span>
                          <span className="text-xs text-slate-600 uppercase">{isBodyCompAnalysis ? '% Corporal' : 'Reps'}</span>
                        </div>
                      </div>
                      
                      {/* Feedback Específico Detalhado */}
                      <div className={`border-t pt-3 mt-1 grid grid-cols-2 gap-x-4 gap-y-2 ${isCurrentSession ? 'border-blue-500/30' : 'border-slate-700/50'}`}>
                        {rec.result.feedback.map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center text-xs">
                            <span className={`${isCurrentSession ? 'text-blue-200/80' : 'text-slate-500'}`}>{item.message}</span>
                            <span className={`font-bold ${getScoreTextColor(item.score)}`}>{item.score}</span>
                          </div>
                        ))}
                      </div>

                      {/* Feedback Texto Resumido */}
                      <p className="text-xs text-slate-500 italic mt-1 border-t border-slate-700/30 pt-2">
                          "{rec.result.formCorrection.substring(0, 80)}..."
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          </div>
       </div>
    </div>
  );
};