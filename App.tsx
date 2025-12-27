import React, { useState, useEffect } from 'react';
import { AppStep, ExerciseType, AnalysisResult } from './types';
import { analyzeVideo } from './services/geminiService';
import ExerciseCard from './components/ExerciseCard';
import ResultView from './components/ResultView';
import { Video, UploadCloud, Loader2, ArrowRight, Lightbulb, Sparkles } from 'lucide-react';

const EXERCISE_IMAGES: Record<ExerciseType, string> = {
  [ExerciseType.SQUAT]: "https://images.unsplash.com/photo-1574680096141-1cddd32e04ca?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.PUSHUP]: "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.LUNGE]: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=600&auto=format&fit=crop",
  [ExerciseType.BURPEE]: "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=600&auto=format&fit=crop", // Using a dynamic jump/crossfit image
  [ExerciseType.PLANK]: "https://images.unsplash.com/photo-1566241440091-ec10de8db2e1?q=80&w=600&auto=format&fit=crop"
};

const EXERCISE_TIPS: Record<ExerciseType, string[]> = {
  [ExerciseType.SQUAT]: [
    "Mantenha os calcanhares firmes no chão durante todo o movimento.",
    "Mantenha o peito estufado e a coluna neutra.",
    "Os joelhos devem seguir a direção da ponta dos pés.",
    "Desça até que suas coxas estejam pelo menos paralelas ao chão."
  ],
  [ExerciseType.PUSHUP]: [
    "Mantenha o corpo em linha reta, contraindo glúteos e abdômen.",
    "Os cotovelos devem apontar para trás, não para os lados (formato de seta).",
    "Desça até o peito quase tocar o chão.",
    "Evite deixar o quadril cair ou subir demais."
  ],
  [ExerciseType.LUNGE]: [
    "O joelho da frente não deve passar muito da ponta do pé.",
    "Mantenha o tronco vertical, não incline para frente.",
    "O joelho de trás deve quase tocar o chão.",
    "Concentre a força na perna da frente para subir."
  ],
  [ExerciseType.BURPEE]: [
    "Amorteça a queda ao entrar na posição de flexão.",
    "Mantenha o core ativado para proteger a lombar.",
    "Estenda completamente o corpo durante o salto final.",
    "Tente manter um ritmo constante na respiração."
  ],
  [ExerciseType.PLANK]: [
    "Alinhe cotovelos diretamente abaixo dos ombros.",
    "Contraia fortemente o abdômen e os glúteos.",
    "Não prenda a respiração, mantenha o fluxo constante.",
    "Mantenha o pescoço neutro, olhando para o chão."
  ]
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.SELECT_EXERCISE);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseType | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);

  // Rotate tips while analyzing
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (step === AppStep.ANALYZING) {
      interval = setInterval(() => {
        setCurrentTipIndex((prev) => {
          if (!selectedExercise) return 0;
          const totalTips = EXERCISE_TIPS[selectedExercise].length;
          return (prev + 1) % totalTips;
        });
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [step, selectedExercise]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { 
        setError("O vídeo deve ter menos de 20MB para esta demonstração.");
        return;
      }
      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setError(null);
    }
  };

  const handleAnalysis = async () => {
    if (!videoFile || !selectedExercise) return;

    setStep(AppStep.ANALYZING);
    setCurrentTipIndex(0); 
    try {
      const result = await analyzeVideo(videoFile, selectedExercise);
      setAnalysisResult(result);
      setStep(AppStep.RESULTS);
    } catch (err: any) {
      console.error(err);
      setError("Ocorreu um erro ao processar o vídeo. Tente novamente.");
      setStep(AppStep.UPLOAD_VIDEO);
    }
  };

  const resetApp = () => {
    setStep(AppStep.SELECT_EXERCISE);
    setSelectedExercise(null);
    setVideoFile(null);
    setVideoPreview(null);
    setAnalysisResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen flex flex-col font-[Plus Jakarta Sans]">
      {/* Modern Header */}
      <header className="sticky top-0 z-50 glass-panel border-b-0 border-b-slate-700/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-default">
            <div className="p-2 bg-blue-600 rounded-lg group-hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">FitAI <span className="text-blue-400 font-light">Analyzer</span></h1>
          </div>
          {step !== AppStep.SELECT_EXERCISE && (
            <button 
              onClick={resetApp} 
              className="px-4 py-2 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 transition-all"
            >
              Começar Novo
            </button>
          )}
        </div>
      </header>

      <main className="flex-grow flex items-center justify-center p-4 md:p-8">
        
        {/* Step 1: Select Exercise */}
        {step === AppStep.SELECT_EXERCISE && (
          <div className="w-full max-w-6xl animate-fade-in flex flex-col items-center">
            <div className="text-center mb-12 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-4 border border-blue-500/20">
                <Sparkles className="w-3 h-3" /> Inteligência Artificial
              </div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Eleve seu treino com <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Análise Profissional</span>
              </h2>
              <p className="text-slate-400 text-lg">
                Escolha um exercício abaixo e nossa IA irá analisar sua forma, contar repetições e sugerir melhorias instantaneamente.
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 w-full mb-12">
              {Object.values(ExerciseType).map((type) => (
                <ExerciseCard
                  key={type}
                  type={type}
                  imageUrl={EXERCISE_IMAGES[type]}
                  selected={selectedExercise === type}
                  onClick={() => setSelectedExercise(type)}
                />
              ))}
            </div>

            <button
              disabled={!selectedExercise}
              onClick={() => setStep(AppStep.UPLOAD_VIDEO)}
              className={`
                group flex items-center gap-3 px-10 py-5 rounded-full text-lg font-bold transition-all duration-300
                ${selectedExercise 
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-600/20 hover:shadow-blue-600/40 transform hover:-translate-y-1' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
              `}
            >
              Continuar para Upload 
              <ArrowRight className={`w-5 h-5 transition-transform ${selectedExercise ? 'group-hover:translate-x-1' : ''}`} />
            </button>
          </div>
        )}

        {/* Step 2: Upload Video */}
        {step === AppStep.UPLOAD_VIDEO && (
          <div className="w-full max-w-3xl animate-fade-in">
            <div className="glass-panel rounded-3xl p-8 md:p-12 shadow-2xl">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Vamos ver esse movimento</h2>
                <p className="text-slate-400">Carregue o vídeo executando: <span className="text-blue-400 font-semibold">{selectedExercise}</span></p>
              </div>
              
              <div className="mb-10">
                <label 
                  htmlFor="video-upload" 
                  className={`
                    group relative flex flex-col items-center justify-center w-full h-80 rounded-2xl cursor-pointer transition-all duration-300 overflow-hidden
                    ${videoFile 
                      ? 'bg-black border border-slate-700' 
                      : 'border-2 border-dashed border-slate-600 bg-slate-800/50 hover:bg-slate-800 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/10'}
                  `}
                >
                  {videoPreview ? (
                    <video 
                      src={videoPreview} 
                      className="h-full w-full object-contain" 
                      controls={false} 
                      autoPlay 
                      muted 
                      loop 
                    />
                  ) : (
                    <div className="flex flex-col items-center pt-5 pb-6 z-10 transition-transform duration-300 group-hover:scale-105">
                      <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-500/20 group-hover:text-blue-400 transition-colors">
                        <UploadCloud className="w-10 h-10 text-slate-300 group-hover:text-blue-400" />
                      </div>
                      <p className="mb-2 text-lg text-slate-200 font-medium">Arraste e solte ou clique</p>
                      <p className="text-sm text-slate-500">Suporta MP4, WebM (Max 20MB)</p>
                    </div>
                  )}
                  <input 
                    id="video-upload" 
                    type="file" 
                    accept="video/*" 
                    className="hidden" 
                    onChange={handleFileChange} 
                  />
                  
                  {videoFile && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                      <span className="bg-white/10 backdrop-blur px-4 py-2 rounded-full text-white font-medium border border-white/20">Alterar vídeo</span>
                    </div>
                  )}
                </label>
                {error && (
                  <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-200 text-center text-sm flex items-center justify-center gap-2">
                     ⚠️ {error}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => setStep(AppStep.SELECT_EXERCISE)}
                  className="px-8 py-4 rounded-xl font-semibold bg-transparent border border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-white transition-all"
                >
                  Voltar
                </button>
                <button
                  disabled={!videoFile}
                  onClick={handleAnalysis}
                  className={`
                    flex-1 px-8 py-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-lg
                    ${videoFile
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-blue-900/20 transform hover:-translate-y-0.5' 
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'}
                  `}
                >
                  {videoFile ? <Sparkles className="w-5 h-5" /> : null}
                  Iniciar Análise IA
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Analyzing */}
        {step === AppStep.ANALYZING && (
          <div className="text-center animate-fade-in w-full max-w-2xl mx-auto">
            <div className="relative inline-flex items-center justify-center mb-12">
              <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 blur-2xl animate-pulse"></div>
              <div className="relative bg-slate-900/80 rounded-full p-10 border border-blue-500/30 shadow-2xl shadow-blue-500/20">
                <Loader2 className="w-20 h-20 text-blue-400 animate-spin" />
              </div>
            </div>
            
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Analisando Biomecânica</h2>
            <p className="text-slate-400 text-lg mb-12 max-w-md mx-auto">
              Nossa IA está calculando os ângulos das suas articulações e a qualidade do movimento.
            </p>
            
            {selectedExercise && (
              <div className="glass-panel rounded-2xl p-8 relative overflow-hidden transition-all duration-700 hover:shadow-2xl hover:shadow-blue-900/10">
                 <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500"></div>
                 
                 <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                      <Lightbulb className="w-5 h-5" />
                    </div>
                    <span className="text-blue-300 font-semibold uppercase text-xs tracking-widest">
                       Dica Técnica: {selectedExercise.split('(')[0].trim()}
                    </span>
                 </div>
                 
                 <div className="min-h-[80px] flex items-center justify-center">
                   <p className="text-white text-xl md:text-2xl font-medium leading-relaxed animate-fade-in key={currentTipIndex}">
                      "{EXERCISE_TIPS[selectedExercise][currentTipIndex]}"
                   </p>
                 </div>
                 
                 <div className="flex justify-center gap-2 mt-6">
                    {EXERCISE_TIPS[selectedExercise].map((_, idx) => (
                      <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-500 ${idx === currentTipIndex ? 'w-8 bg-blue-500' : 'w-2 bg-slate-700'}`}
                      />
                    ))}
                 </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Results */}
        {step === AppStep.RESULTS && analysisResult && selectedExercise && (
          <ResultView 
            result={analysisResult} 
            exercise={selectedExercise} 
            onReset={resetApp} 
          />
        )}

      </main>
    </div>
  );
};

export default App;