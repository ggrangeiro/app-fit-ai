import React, { useState, useEffect } from 'react';
import { Loader2, ScanFace, UserCheck, Activity, BrainCircuit, Lightbulb, CheckCircle2, Circle, Scale, Ruler, FileText, ScanLine, Search } from 'lucide-react';
import { AppStep, ExerciseType, SPECIAL_EXERCISES } from '../types';

interface LoadingScreenProps {
  step: AppStep; // COMPRESSING or ANALYZING
  tip: string;
  exerciseType: ExerciseType;
}

// --- CONFIGURAÇÃO DOS PASSOS POR TIPO ---

const STANDARD_STEPS = [
  { id: 1, label: "Pré-processamento de Vídeo", icon: ScanFace, duration: 1500 },
  { id: 2, label: "Validando Contexto Humano", icon: UserCheck, duration: 2000 },
  { id: 3, label: "Mapeamento Biomecânico (32 pontos)", icon: Activity, duration: 2500 },
  { id: 4, label: "Gerando Análise Técnica & Feedback", icon: BrainCircuit, duration: 3000 },
];

const BODY_COMP_STEPS = [
  { id: 1, label: "Otimização de Imagem Corporal", icon: ScanFace, duration: 1500 },
  { id: 2, label: "Mapeamento de Silhueta", icon: UserCheck, duration: 2000 },
  { id: 3, label: "Análise Antropométrica Visual", icon: Scale, duration: 2500 },
  { id: 4, label: "Calculando Estimativa de Gordura %", icon: BrainCircuit, duration: 3000 },
];

const POSTURE_STEPS = [
  { id: 1, label: "Calibragem de Eixos Verticais", icon: Ruler, duration: 1500 },
  { id: 2, label: "Rastreamento Esquelético Estático", icon: ScanLine, duration: 2000 },
  { id: 3, label: "Detecção de Desvios e Assimetrias", icon: Search, duration: 2500 },
  { id: 4, label: "Compilando Relatório Ortopédico", icon: FileText, duration: 3000 },
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ step, tip, exerciseType }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Determinar qual configuração usar
  let currentSteps = STANDARD_STEPS;
  let headerTitle = "Processing";
  let headerSubtitle = "A inteligência artificial está analisando seu movimento.";

  if (exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION) {
    currentSteps = BODY_COMP_STEPS;
    headerTitle = "Body Scan";
    headerSubtitle = "A IA está calculando sua composição corporal.";
  } else if (exerciseType === SPECIAL_EXERCISES.POSTURE) {
    currentSteps = POSTURE_STEPS;
    headerTitle = "Posture Scan";
    headerSubtitle = "A IA está avaliando seu alinhamento postural.";
  }

  useEffect(() => {
    // Se estiver comprimindo, trava no passo 0
    if (step === AppStep.COMPRESSING) {
      setCurrentStepIndex(0);
      return;
    }

    // Se estiver analisando, inicia o ciclo
    let timer: ReturnType<typeof setTimeout>;
    
    const runSteps = (index: number) => {
      if (index >= currentSteps.length) return; // Fim

      setCurrentStepIndex(index);
      
      // O tempo para avançar depende do passo atual
      const duration = currentSteps[index].duration;
      
      timer = setTimeout(() => {
        runSteps(index + 1);
      }, duration);
    };

    // Começa do passo 1 (index 1) já que o 0 é processamento/compressão
    runSteps(1);

    return () => clearTimeout(timer);
  }, [step, currentSteps]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-lg mx-auto h-full min-h-[60vh] animate-fade-in relative">
       
       {/* CENTRAL SCANNER ANIMATION */}
       <div className="relative mb-10 w-48 h-48">
          {/* Outer Rotating Rings */}
          <div className="absolute inset-0 rounded-full border border-slate-700 border-t-blue-500 animate-spin transition-all duration-1000" style={{ animationDuration: '3s' }}></div>
          <div className="absolute inset-4 rounded-full border border-slate-700 border-b-indigo-500 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }}></div>
          
          {/* Inner Glow */}
          <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-xl animate-pulse"></div>

          {/* Central Image/Icon Container */}
          <div className="absolute inset-2 bg-slate-900 rounded-full flex items-center justify-center overflow-hidden border border-slate-700 shadow-2xl">
             {/* Scanner Line */}
             <div className="absolute w-full h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_15px_rgba(96,165,250,0.8)] z-20 animate-scan"></div>
             
             {/* Grid Background */}
             <div className="absolute inset-0 opacity-20 bg-[linear-gradient(rgba(59,130,246,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(59,130,246,0.5)_1px,transparent_1px)] bg-[size:20px_20px]"></div>

             {/* Dynamic Icon inside Scanner */}
             {exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION ? (
                <Scale className="w-16 h-16 text-blue-400 z-10 animate-pulse" />
             ) : exerciseType === SPECIAL_EXERCISES.POSTURE ? (
                <ScanLine className="w-16 h-16 text-blue-400 z-10 animate-pulse" />
             ) : (
                <BrainCircuit className="w-16 h-16 text-blue-400 z-10 animate-pulse" />
             )}
          </div>
       </div>

       {/* STATUS TEXT */}
       <div className="text-center mb-8 z-10">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center justify-center gap-2">
             FitAI <span className="text-blue-400">{headerTitle}</span>
             <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </h2>
          <p className="text-slate-400 text-sm">{headerSubtitle}</p>
       </div>

       {/* VALIDATION STEPS LIST */}
       <div className="w-full max-w-sm bg-slate-800/40 rounded-2xl border border-slate-700/50 p-6 backdrop-blur-sm mb-6">
          <div className="space-y-4">
             {currentSteps.map((s, idx) => {
                const isActive = idx === currentStepIndex;
                const isCompleted = idx < currentStepIndex;
                const isPending = idx > currentStepIndex;

                const Icon = s.icon;

                return (
                   <div key={s.id} className={`flex items-center gap-3 transition-all duration-500 ${isPending ? 'opacity-30' : 'opacity-100'}`}>
                      <div className={`
                         w-8 h-8 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300
                         ${isCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : ''}
                         ${isActive ? 'bg-blue-500/20 border-blue-500 text-blue-400 animate-pulse' : ''}
                         ${isPending ? 'bg-slate-800 border-slate-700 text-slate-600' : ''}
                      `}>
                         {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : (isActive ? <Loader2 className="w-4 h-4 animate-spin" /> : <Circle className="w-4 h-4" />)}
                      </div>
                      <div className="flex-1">
                         <p className={`text-sm font-medium ${isCompleted ? 'text-emerald-400' : (isActive ? 'text-white' : 'text-slate-500')}`}>
                            {s.label}
                         </p>
                      </div>
                      {isActive && <Icon className="w-4 h-4 text-blue-500 animate-bounce" />}
                   </div>
                );
             })}
          </div>
       </div>

       {/* TIP CARD */}
       <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700/50 rounded-xl p-4 w-full max-w-sm relative overflow-hidden shadow-lg animate-in slide-in-from-bottom-4 fade-in duration-700">
          <div className="absolute top-0 left-0 w-1 h-full bg-yellow-500"></div>
          <div className="flex items-start gap-3 text-left">
             <div className="p-1.5 bg-yellow-500/10 rounded-lg shrink-0">
               <Lightbulb className="w-4 h-4 text-yellow-400" />
             </div>
             <div>
               <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dica Técnica</span>
               <p className="text-slate-200 font-medium text-xs leading-relaxed">
                 "{tip}"
               </p>
             </div>
          </div>
       </div>

    </div>
  );
};

export default LoadingScreen;