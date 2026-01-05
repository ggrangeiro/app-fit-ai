import React, { useState, useEffect } from 'react';
import { Loader2, ScanFace, UserCheck, Activity, BrainCircuit, Lightbulb, CheckCircle2, Circle, Scale, Ruler, FileText, ScanLine, Search, Microscope, Database, Zap, Sparkles } from 'lucide-react';
import { AppStep, ExerciseType, SPECIAL_EXERCISES } from '../types';

interface LoadingScreenProps {
  step: AppStep; // COMPRESSING or ANALYZING
  tip: string;
  exerciseType: ExerciseType;
  isTeacherMode?: boolean; // Nova prop para distinguir modo admin/personal
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
  { id: 3, label: "Identificação de Desvios", icon: Activity, duration: 2500 },
  { id: 4, label: "Gerando Relatório Postural", icon: FileText, duration: 3000 },
];

const FREE_MODE_STEPS = [
  { id: 1, label: "Reconhecimento de Padrão de Movimento", icon: Search, duration: 1500 },
  { id: 2, label: "Identificação do Exercício", icon: Database, duration: 2000 },
  { id: 3, label: "Análise de Segurança", icon: Zap, duration: 2500 },
  { id: 4, label: "Compilando Dicas Técnicas", icon: Lightbulb, duration: 3000 },
];

// NOVAS ETAPAS PARA MODO PROFESSOR (Mais técnico e "pro")
const TEACHER_ASSESSMENT_STEPS = [
  { id: 1, label: "Inicializando Protocolo Clínico", icon: FileText, duration: 1500 },
  { id: 2, label: "Segmentação Computacional Avançada", icon: ScanLine, duration: 2000 },
  { id: 3, label: "Inferência Biomecânica & Antropometria", icon: Microscope, duration: 2500 },
  { id: 4, label: "Compilando Laudo Técnico Profissional", icon: Activity, duration: 3000 },
];

const LoadingScreen: React.FC<LoadingScreenProps> = ({ step, tip, exerciseType, isTeacherMode = false }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Seleciona os passos baseados no tipo
  let steps = STANDARD_STEPS;
  if (isTeacherMode) {
      steps = TEACHER_ASSESSMENT_STEPS;
  } else if (exerciseType === SPECIAL_EXERCISES.BODY_COMPOSITION) {
      steps = BODY_COMP_STEPS;
  } else if (exerciseType === SPECIAL_EXERCISES.POSTURE) {
      steps = POSTURE_STEPS;
  } else if (exerciseType === SPECIAL_EXERCISES.FREE_MODE) {
      steps = FREE_MODE_STEPS;
  }

  useEffect(() => {
    // Se estiver comprimindo, não avança os passos visuais da análise
    if (step === AppStep.COMPRESSING) return;

    let timeout: ReturnType<typeof setTimeout>;
    if (currentStep < steps.length - 1) {
      timeout = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, steps[currentStep].duration);
    }
    return () => clearTimeout(timeout);
  }, [currentStep, step, steps]);

  const CurrentIcon = steps[currentStep].icon;

  // VISUALIZAÇÃO EXCLUSIVA PARA PROFESSORES (HUD/TERMINAL)
  if (isTeacherMode) {
      return (
          <div className="flex flex-col items-center justify-center w-full max-w-lg p-8 animate-fade-in relative bg-slate-900/80 border border-slate-700/50 rounded-3xl backdrop-blur-xl shadow-2xl">
              {/* Decorative Tech Elements */}
              <div className="absolute top-4 left-4 w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
              <div className="absolute top-4 right-4 text-[10px] text-indigo-400 font-mono">SYS.V.2.0</div>
              
              {/* Central Scanner */}
              <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                  <div className="absolute inset-0 border-[3px] border-slate-700 rounded-full"></div>
                  <div className="absolute inset-0 border-[3px] border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-2 border-[1px] border-indigo-500/30 rounded-full animate-ping"></div>
                  
                  <div className="relative z-10 bg-slate-800 p-5 rounded-full shadow-lg shadow-indigo-900/50 border border-slate-600">
                      <CurrentIcon className="w-10 h-10 text-indigo-400" />
                  </div>
              </div>

              {/* Progress Text */}
              <h2 className="text-xl font-bold text-white mb-1 font-mono tracking-wide text-center">
                  {step === AppStep.COMPRESSING ? 'OTIMIZANDO BUFFER...' : 'PROCESSANDO...'}
              </h2>
              <p className="text-sm text-indigo-300 mb-6 font-mono text-center opacity-80">
                  {steps[currentStep].label}
              </h2>

              {/* Simulated Terminal Log */}
              <div className="w-full bg-black/50 rounded-lg p-3 font-mono text-xs text-green-400/80 mb-4 border border-slate-700/50 h-24 overflow-hidden flex flex-col justify-end">
                  <div className="opacity-50">Initializing Neural Net... OK</div>
                  <div className="opacity-70">Loading Biomechanical Models... OK</div>
                  <div className="opacity-90">Detecting Human Keypoints...</div>
                  <div className="text-green-300 animate-pulse">> {steps[currentStep].label.toUpperCase()}...</div>
              </div>

              {/* Steps Indicator */}
              <div className="flex gap-1 w-full max-w-xs">
                  {steps.map((s, idx) => (
                      <div 
                          key={s.id} 
                          className={`h-1 flex-1 rounded-full transition-all duration-500 ${idx <= currentStep ? 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]' : 'bg-slate-700'}`}
                      ></div>
                  ))}
              </div>
          </div>
      );
  }

  // VISUALIZAÇÃO PADRÃO (ALUNO)
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-md p-8 animate-fade-in relative">
      
      {/* Scanner Visual Effect - Mais moderno e dinâmico */}
      <div className="relative w-28 h-28 mb-10 flex items-center justify-center">
         {/* Aneis pulsantes de fundo */}
         <div className="absolute inset-0 bg-blue-500/10 rounded-full animate-ping duration-[3s]"></div>
         <div className="absolute -inset-4 bg-indigo-500/5 rounded-full animate-pulse"></div>
         
         {/* Anéis giratórios "Tech" */}
         <div className="absolute inset-0 border-2 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent rounded-full animate-[spin_3s_linear_infinite]"></div>
         <div className="absolute inset-2 border-2 border-t-transparent border-r-cyan-400 border-b-transparent border-l-cyan-400 rounded-full animate-[spin_4s_linear_infinite_reverse] opacity-70"></div>
         
         {/* Ícone Central */}
         <div className="relative z-10 bg-slate-900 p-4 rounded-full border border-slate-700 shadow-2xl shadow-blue-900/50">
            <CurrentIcon className="w-10 h-10 text-white animate-pulse" />
         </div>
         
         {/* Scanner Line Effect */}
         <div className="absolute inset-0 rounded-full overflow-hidden opacity-50 pointer-events-none">
            <div className="w-full h-1/2 bg-gradient-to-b from-blue-500/0 to-blue-400/20 animate-scan border-b border-blue-400/40 blur-[1px]"></div>
         </div>
      </div>

      <h2 className="text-2xl font-bold text-white mb-2 text-center tracking-tight">
        {step === AppStep.COMPRESSING ? 'Otimizando Mídia...' : steps[currentStep].label}
      </h2>
      
      {/* Progress Bar Steps */}
      <div className="flex gap-2 mb-8 mt-2">
        {steps.map((s, idx) => (
          <div 
            key={s.id} 
            className={`h-1.5 rounded-full transition-all duration-700 ease-out ${idx <= currentStep ? 'w-10 bg-gradient-to-r from-blue-600 to-cyan-400 shadow-[0_0_10px_rgba(56,189,248,0.5)]' : 'w-2 bg-slate-700'}`}
          ></div>
        ))}
      </div>

      {/* Tip Box */}
      <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl flex items-start gap-4 max-w-sm w-full shadow-lg backdrop-blur-sm">
         <div className="p-2 bg-yellow-500/10 rounded-lg shrink-0 border border-yellow-500/20">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
         </div>
         <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1 tracking-wider">
               Dica de Treino
            </p>
            <p className="text-sm text-slate-200 leading-relaxed font-medium animate-text-shimmer bg-gradient-to-r from-slate-200 via-white to-slate-200 bg-clip-text text-transparent">
               "{tip}"
            </p>
         </div>
      </div>
    </div>
  );
};

export default LoadingScreen;